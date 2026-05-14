import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Cart, CartItem, Prisma } from '@repo/db';
import type {
  AddCartItemDto,
  ApplyCouponDto,
  CartDto,
  CartItemDto,
  MergeCartDto,
  ModifierSnapshotEntry,
  UpdateCartItemDto,
} from '@repo/types';
import { Decimal, decimalToString, multiply, toDecimal } from '@repo/utils';
import { PrismaService } from '../prisma/prisma.service';
import { PromotionsService } from '../promotions/promotions.service';
import { calculateCartTotals } from './cart-pricing';
import { modifierFingerprint, resolveModifierSelections } from './modifier-validation';

interface CartIdentity {
  userId: string | null;
  sessionKey: string | null;
}

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly promotions: PromotionsService,
  ) {}

  async getCart(identity: CartIdentity, restaurantId: string): Promise<CartDto> {
    const cart = await this.findOrCreateCart(identity, restaurantId);
    return this.toDto(cart.id);
  }

  async addItem(
    identity: CartIdentity,
    restaurantId: string,
    dto: AddCartItemDto,
  ): Promise<CartDto> {
    const cart = await this.findOrCreateCart(identity, restaurantId);

    const item = await this.prisma.menuItem.findUnique({
      where: { id: dto.menuItemId },
      include: {
        modifierGroups: { include: { options: true } },
        category: { select: { restaurantId: true } },
      },
    });
    if (!item) throw new NotFoundException('Menu item not found');
    if (item.category.restaurantId !== restaurantId) {
      throw new BadRequestException('Menu item does not belong to this restaurant');
    }
    if (!item.isAvailable) {
      throw new BadRequestException('Menu item is not currently available');
    }

    const { snapshot, totalDelta } = resolveModifierSelections(item, dto.modifierSelections);
    const unitPrice = toDecimal(item.basePrice).plus(totalDelta);

    await this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        menuItemId: item.id,
        quantity: dto.quantity,
        unitPrice,
        modifierSnapshot: snapshot as unknown as Prisma.InputJsonValue,
        notes: dto.notes ?? null,
      },
    });

    return this.toDto(cart.id);
  }

  async updateItem(
    identity: CartIdentity,
    cartItemId: string,
    dto: UpdateCartItemDto,
  ): Promise<CartDto> {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true },
    });
    if (!cartItem) throw new NotFoundException('Cart item not found');
    this.assertCartOwnership(cartItem.cart, identity);

    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: cartItem.menuItemId },
      include: { modifierGroups: { include: { options: true } } },
    });
    if (!menuItem) throw new NotFoundException('Menu item no longer exists');

    let unitPrice: Decimal | undefined;
    let snapshot: ModifierSnapshotEntry[] | undefined;

    if (dto.modifierSelections) {
      const resolved = resolveModifierSelections(menuItem, dto.modifierSelections);
      snapshot = resolved.snapshot;
      unitPrice = toDecimal(menuItem.basePrice).plus(resolved.totalDelta);
    }

    await this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: {
        ...(dto.quantity !== undefined ? { quantity: dto.quantity } : {}),
        ...(unitPrice ? { unitPrice } : {}),
        ...(snapshot ? { modifierSnapshot: snapshot as unknown as Prisma.InputJsonValue } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes ?? null } : {}),
      },
    });

    return this.toDto(cartItem.cartId);
  }

  async removeItem(identity: CartIdentity, cartItemId: string): Promise<CartDto> {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true },
    });
    if (!cartItem) throw new NotFoundException('Cart item not found');
    this.assertCartOwnership(cartItem.cart, identity);

    await this.prisma.cartItem.delete({ where: { id: cartItemId } });
    return this.toDto(cartItem.cartId);
  }

  async clearCart(identity: CartIdentity, restaurantId: string): Promise<CartDto> {
    const cart = await this.findOrCreateCart(identity, restaurantId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { appliedCouponId: null },
    });
    return this.toDto(cart.id);
  }

  async applyCoupon(
    identity: CartIdentity,
    restaurantId: string,
    dto: ApplyCouponDto,
  ): Promise<CartDto> {
    const cart = await this.findOrCreateCart(identity, restaurantId);
    const totals = await this.computeRawTotals(cart.id);
    const result = await this.promotions.validate({
      code: dto.code,
      subtotal: totals.subtotal,
      userId: identity.userId ?? undefined,
      restaurantId,
    });
    if (!result.valid) {
      throw new BadRequestException(result.message);
    }
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { appliedCouponId: result.couponId },
    });
    return this.toDto(cart.id);
  }

  async removeCoupon(identity: CartIdentity, restaurantId: string): Promise<CartDto> {
    const cart = await this.findOrCreateCart(identity, restaurantId);
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { appliedCouponId: null },
    });
    return this.toDto(cart.id);
  }

  async mergeOnLogin(userId: string, dto: MergeCartDto): Promise<CartDto> {
    const guestCart = await this.prisma.cart.findUnique({
      where: { sessionKey: dto.sessionKey },
      include: { items: true },
    });
    if (!guestCart || guestCart.restaurantId !== dto.restaurantId) {
      // Nothing to merge — just return the user's existing cart.
      return this.getCart({ userId, sessionKey: null }, dto.restaurantId);
    }

    const userCart = await this.findOrCreateCart({ userId, sessionKey: null }, dto.restaurantId);

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.cartItem.findMany({
        where: { cartId: userCart.id },
      });
      const existingByFingerprint = new Map<string, CartItem>();
      for (const it of existing) {
        const key = `${it.menuItemId}|${modifierFingerprint(
          it.modifierSnapshot as unknown as ModifierSnapshotEntry[],
        )}`;
        existingByFingerprint.set(key, it);
      }

      for (const guestItem of guestCart.items) {
        const fingerprint = modifierFingerprint(
          guestItem.modifierSnapshot as unknown as ModifierSnapshotEntry[],
        );
        const key = `${guestItem.menuItemId}|${fingerprint}`;
        const match = existingByFingerprint.get(key);
        if (match) {
          await tx.cartItem.update({
            where: { id: match.id },
            data: { quantity: match.quantity + guestItem.quantity },
          });
        } else {
          await tx.cartItem.create({
            data: {
              cartId: userCart.id,
              menuItemId: guestItem.menuItemId,
              quantity: guestItem.quantity,
              unitPrice: guestItem.unitPrice,
              modifierSnapshot: guestItem.modifierSnapshot as Prisma.InputJsonValue,
              notes: guestItem.notes,
            },
          });
        }
      }

      // Move the coupon over if user's cart didn't already have one.
      if (!userCart.appliedCouponId && guestCart.appliedCouponId) {
        await tx.cart.update({
          where: { id: userCart.id },
          data: { appliedCouponId: guestCart.appliedCouponId },
        });
      }

      await tx.cart.delete({ where: { id: guestCart.id } });
    });

    return this.toDto(userCart.id);
  }

  // ---- Helpers -----------------------------------------------------------

  private async findOrCreateCart(identity: CartIdentity, restaurantId: string): Promise<Cart> {
    if (identity.userId) {
      const existing = await this.prisma.cart.findFirst({
        where: { userId: identity.userId, restaurantId },
      });
      if (existing) return existing;
      return this.prisma.cart.create({
        data: { userId: identity.userId, restaurantId },
      });
    }

    if (!identity.sessionKey) {
      throw new BadRequestException('Guest carts require a sessionKey');
    }

    const existing = await this.prisma.cart.findUnique({
      where: { sessionKey: identity.sessionKey },
    });
    if (existing) {
      if (existing.restaurantId !== restaurantId) {
        // Single guest cart per session key; rebinding to a new restaurant
        // means starting over.
        throw new ConflictException('Session is bound to a different restaurant cart');
      }
      return existing;
    }
    return this.prisma.cart.create({
      data: { sessionKey: identity.sessionKey, restaurantId },
    });
  }

  private assertCartOwnership(cart: Cart, identity: CartIdentity): void {
    const ownsByUser = identity.userId !== null && cart.userId === identity.userId;
    const ownsBySession = identity.sessionKey !== null && cart.sessionKey === identity.sessionKey;
    if (!ownsByUser && !ownsBySession) {
      throw new ForbiddenException('Not your cart');
    }
  }

  private async computeRawTotals(cartId: string): Promise<{ subtotal: string }> {
    const items = await this.prisma.cartItem.findMany({ where: { cartId } });
    const totals = calculateCartTotals({ items });
    return { subtotal: totals.subtotal };
  }

  private async toDto(cartId: string): Promise<CartDto> {
    const cart = await this.prisma.cart.findUniqueOrThrow({
      where: { id: cartId },
      include: {
        items: true,
        appliedCoupon: { include: { promotion: true } },
        user: { select: { id: true } },
      },
    });

    const restaurant = await this.prisma.restaurant.findUniqueOrThrow({
      where: { id: cart.restaurantId },
      select: { currency: true },
    });

    // Map cart items to DTOs with line totals.
    const menuItemIds = cart.items.map((it) => it.menuItemId);
    const menuItems = menuItemIds.length
      ? await this.prisma.menuItem.findMany({
          where: { id: { in: menuItemIds } },
          select: { id: true, name: true },
        })
      : [];
    const nameById = new Map(menuItems.map((m) => [m.id, m.name]));

    const itemDtos: CartItemDto[] = cart.items.map((it) => ({
      id: it.id,
      menuItemId: it.menuItemId,
      name: nameById.get(it.menuItemId) ?? 'Unavailable item',
      quantity: it.quantity,
      unitPrice: decimalToString(it.unitPrice.toString()),
      lineTotal: decimalToString(multiply(it.unitPrice, it.quantity)),
      modifierSnapshot: it.modifierSnapshot as unknown as ModifierSnapshotEntry[],
      notes: it.notes,
    }));

    let discountAmount: Decimal | undefined;
    let appliedCouponDto: CartDto['appliedCoupon'] = null;

    if (cart.appliedCoupon) {
      const subtotal = calculateCartTotals({ items: cart.items }).subtotal;
      const result = await this.promotions.validate({
        code: cart.appliedCoupon.code,
        subtotal,
        userId: cart.userId ?? undefined,
        restaurantId: cart.restaurantId,
      });
      if (result.valid) {
        discountAmount = toDecimal(result.discountAmount);
        appliedCouponDto = {
          id: cart.appliedCoupon.id,
          code: cart.appliedCoupon.code,
          discountAmount: result.discountAmount,
        };
      } else {
        // Coupon went stale — drop it silently so cart stays usable.
        await this.prisma.cart.update({
          where: { id: cart.id },
          data: { appliedCouponId: null },
        });
      }
    }

    const totals = calculateCartTotals({
      items: cart.items,
      discountAmount,
    });

    return {
      id: cart.id,
      restaurantId: cart.restaurantId,
      userId: cart.userId,
      sessionKey: cart.sessionKey,
      currency: restaurant.currency,
      items: itemDtos,
      appliedCoupon: appliedCouponDto,
      totals,
      updatedAt: cart.updatedAt.toISOString(),
    };
  }
}
