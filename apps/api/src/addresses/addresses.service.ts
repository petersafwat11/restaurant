import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Prisma, UserAddress } from '@repo/db';
import type {
  AddressDto,
  CreateAddressDto,
  UpdateAddressDto,
} from '@repo/types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AddressesService {
  private readonly logger = new Logger(AddressesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<AddressDto[]> {
    const rows = await this.prisma.userAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map(toDto);
  }

  async create(userId: string, dto: CreateAddressDto): Promise<AddressDto> {
    const shouldBeDefault = dto.isDefault === true || (await this.countFor(userId)) === 0;

    return this.prisma.$transaction(async (tx) => {
      if (shouldBeDefault) {
        await tx.userAddress.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }
      const created = await tx.userAddress.create({
        data: {
          userId,
          label: dto.label ?? null,
          line1: dto.line1,
          line2: dto.line2 ?? null,
          city: dto.city,
          state: dto.state ?? null,
          country: dto.country,
          geoPoint: dto.geoPoint as Prisma.InputJsonValue,
          isDefault: shouldBeDefault,
        },
      });
      return toDto(created);
    });
  }

  async update(userId: string, id: string, dto: UpdateAddressDto): Promise<AddressDto> {
    await this.requireOwned(userId, id);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) {
        await tx.userAddress.updateMany({
          where: { userId, isDefault: true, NOT: { id } },
          data: { isDefault: false },
        });
      }
      const updated = await tx.userAddress.update({
        where: { id },
        data: {
          ...(dto.label !== undefined ? { label: dto.label } : {}),
          ...(dto.line1 !== undefined ? { line1: dto.line1 } : {}),
          ...(dto.line2 !== undefined ? { line2: dto.line2 } : {}),
          ...(dto.city !== undefined ? { city: dto.city } : {}),
          ...(dto.state !== undefined ? { state: dto.state } : {}),
          ...(dto.country !== undefined ? { country: dto.country } : {}),
          ...(dto.geoPoint !== undefined
            ? { geoPoint: dto.geoPoint as Prisma.InputJsonValue }
            : {}),
          ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
        },
      });
      return toDto(updated);
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.requireOwned(userId, id);
    await this.prisma.userAddress.delete({ where: { id } });
  }

  async setDefault(userId: string, id: string): Promise<AddressDto> {
    await this.requireOwned(userId, id);
    return this.prisma.$transaction(async (tx) => {
      await tx.userAddress.updateMany({
        where: { userId, isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
      const updated = await tx.userAddress.update({
        where: { id },
        data: { isDefault: true },
      });
      return toDto(updated);
    });
  }

  private async requireOwned(userId: string, id: string): Promise<void> {
    const row = await this.prisma.userAddress.findUnique({ where: { id } });
    if (!row || row.userId !== userId) throw new NotFoundException('Address not found');
  }

  private async countFor(userId: string): Promise<number> {
    return this.prisma.userAddress.count({ where: { userId } });
  }
}

function toDto(row: UserAddress): AddressDto {
  return {
    id: row.id,
    userId: row.userId,
    label: row.label,
    line1: row.line1,
    line2: row.line2,
    city: row.city,
    state: row.state,
    country: row.country,
    geoPoint: row.geoPoint as AddressDto['geoPoint'],
    isDefault: row.isDefault,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
