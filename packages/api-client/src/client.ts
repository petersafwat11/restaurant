import {
  type AboutDataDto,
  AboutDataSchema,
  // Sprint 7
  type AcceptStaffInviteDto,
  AcceptStaffInviteSchema,
  type AddCartItemDto,
  AddCartItemSchema,
  type AddMenuItemImageDto,
  AddMenuItemImageSchema,
  type AddressDto,
  AddressListSchema,
  AddressSchema,
  // Sprint 8
  type AnalyticsBaseQuery,
  AnalyticsBaseQuerySchema,
  type AnalyticsOverviewDto,
  AnalyticsOverviewSchema,
  type ApplyCouponDto,
  ApplyCouponSchema,
  type AuditLogListDto,
  type AuditLogListQuery,
  AuditLogListQuerySchema,
  AuditLogListSchema,
  type AuthResponseDto,
  AuthResponseSchema,
  type AuthTokensDto,
  AuthTokensSchema,
  type AvailabilityQueryDto,
  AvailabilityResponseSchema,
  type CancelReservationDto,
  CancelReservationSchema,
  type CartDto,
  CartSchema,
  type ChangePasswordDto,
  ChangePasswordSchema,
  type ContactMessageDto,
  type ContactMessageListDto,
  type ContactMessageListQuery,
  ContactMessageListQuerySchema,
  ContactMessageListSchema,
  ContactMessageSchema,
  type CouponDto,
  CouponListSchema,
  type CreateAddressDto,
  CreateAddressSchema,
  type CreateContactMessageDto,
  CreateContactMessageSchema,
  type CreateCouponDto,
  CreateCouponSchema,
  type CreateCustomerNoteDto,
  CreateCustomerNoteSchema,
  type CreateExportDto,
  CreateExportSchema,
  type CreateMenuCategoryDto,
  CreateMenuCategorySchema,
  type CreateMenuItemDto,
  CreateMenuItemSchema,
  type CreateModifierGroupDto,
  CreateModifierGroupSchema,
  type CreateModifierOptionDto,
  CreateModifierOptionSchema,
  type CreateOrderDto,
  CreateOrderSchema,
  type CreatePaymentIntentDto,
  CreatePaymentIntentSchema,
  type CreatePromotionDto,
  CreatePromotionSchema,
  type CreateRefundDto,
  CreateRefundSchema,
  type CreateReservationDto,
  CreateReservationSchema,
  type CreateRestaurantDto,
  CreateRestaurantSchema,
  type CreateReviewDto,
  CreateReviewSchema,
  type CreateTableDto,
  CreateTableSchema,
  type CustomerDetailDto,
  CustomerDetailSchema,
  type CustomerListDto,
  type CustomerListQuery,
  CustomerListQuerySchema,
  CustomerListSchema,
  CustomerNoteSchema,
  type CustomerRetentionDto,
  type CustomerRetentionQuery,
  CustomerRetentionQuerySchema,
  CustomerRetentionSchema,
  type DeliveryZoneCheckQuery,
  DeliveryZoneCheckQuerySchema,
  type DeliveryZoneCheckResponseDto,
  DeliveryZoneCheckResponseSchema,
  type ExportDto,
  ExportListSchema,
  ExportSchema,
  type FavoriteDto,
  type FavoriteIdsDto,
  FavoriteIdsSchema,
  type FavoriteListDto,
  type FavoriteListQuery,
  FavoriteListQuerySchema,
  FavoriteListSchema,
  FavoriteSchema,
  type FeatureFlagAdminDto,
  FeatureFlagAdminSchema,
  type FeatureFlagListDto,
  FeatureFlagListSchema,
  type FeatureFlagsResolvedDto,
  FeatureFlagsResolvedSchema,
  type ForgotPasswordDto,
  ForgotPasswordSchema,
  type HolidayDto,
  HolidaySchema,
  type I18nMessagesDto,
  I18nMessagesSchema,
  type InviteStaffDto,
  InviteStaffSchema,
  type KitchenTicketDto,
  KitchenTicketsListSchema,
  type LandingDataDto,
  LandingDataSchema,
  type LoginDto,
  LoginSchema,
  type LoyaltyAccountDto,
  LoyaltyAccountSchema,
  type LoyaltyHistoryDto,
  type LoyaltyHistoryQuery,
  LoyaltyHistoryQuerySchema,
  LoyaltyHistorySchema,
  type LoyaltyRedeemQuoteDto,
  type LoyaltyRedeemQuoteRequest,
  LoyaltyRedeemQuoteRequestSchema,
  LoyaltyRedeemQuoteSchema,
  type MarketingQuery,
  MarketingQuerySchema,
  type MeDto,
  MeSchema,
  type MenuCategoryDto,
  MenuCategorySchema,
  type MenuItemDetailDto,
  MenuItemDetailSchema,
  type MenuItemDto,
  type MenuItemImageDto,
  MenuItemImageSchema,
  MenuItemSchema,
  type MenuTreeDto,
  MenuTreeSchema,
  type MergeCartDto,
  MergeCartSchema,
  type ModifierGroupDto,
  ModifierGroupSchema,
  type ModifierOptionDto,
  ModifierOptionSchema,
  type NotificationListDto,
  type NotificationListQuery,
  NotificationListQuerySchema,
  NotificationListSchema,
  type NotificationPreferenceDto,
  NotificationPreferenceSchema,
  type OperatingHoursDto,
  OperatingHoursListSchema,
  type OrderDto,
  type OrderListDto,
  type OrderListQuery,
  OrderListQuerySchema,
  OrderListSchema,
  OrderSchema,
  type OrderTrackingDto,
  OrderTrackingSchema,
  type OrdersByStatusDto,
  OrdersByStatusSchema,
  type OwnerReplyDto,
  OwnerReplySchema,
  type PaymentConfigDto,
  PaymentConfigSchema,
  type PaymentDto,
  type PaymentIntentResponseDto,
  PaymentIntentResponseSchema,
  type PaymentMethodsBreakdownDto,
  PaymentMethodsBreakdownSchema,
  PaymentSchema,
  type PresignUploadDto,
  PresignUploadSchema,
  type PresignedUploadResponseDto,
  PresignedUploadResponseSchema,
  type PromotionDto,
  PromotionListSchema,
  PromotionSchema,
  type ReferralListDto,
  type ReferralListQuery,
  ReferralListQuerySchema,
  ReferralListSchema,
  type ReferralMeDto,
  ReferralMeSchema,
  type RefreshDto,
  RefreshSchema,
  type RefundDto,
  RefundSchema,
  type RegisterDto,
  type RegisterPushTokenDto,
  RegisterPushTokenSchema,
  RegisterSchema,
  type ReorderDto,
  type ReorderItemsDto,
  ReorderItemsSchema,
  ReorderSchema,
  type RequestOtpDto,
  RequestOtpSchema,
  type ReservationDto,
  type ReservationListDto,
  type ReservationListQuery,
  ReservationListQuerySchema,
  ReservationListSchema,
  ReservationSchema,
  type ResetPasswordDto,
  ResetPasswordSchema,
  type RestaurantAdminDto,
  RestaurantAdminSchema,
  RestaurantListSchema,
  type RestaurantPublicDto,
  RestaurantPublicSchema,
  type RestaurantSettingsDto,
  RestaurantSettingsSchema,
  type RevenueTimeseriesPointDto,
  type RevenueTimeseriesQuery,
  RevenueTimeseriesQuerySchema,
  RevenueTimeseriesSchema,
  type ReviewDto,
  type ReviewListDto,
  type ReviewListQuery,
  ReviewListQuerySchema,
  ReviewListSchema,
  ReviewModerationSchema,
  ReviewSchema,
  type ReviewSummaryDto,
  ReviewSummarySchema,
  type SalesByDayOfWeekDto,
  SalesByDayOfWeekSchema,
  type SalesByHourDto,
  SalesByHourSchema,
  type SeatReservationDto,
  SeatReservationSchema,
  type SeoMetaDto,
  type SeoMetaQuery,
  SeoMetaQuerySchema,
  SeoMetaSchema,
  type SetCartLoyaltyDto,
  SetCartLoyaltySchema,
  type SetItemAvailabilityDto,
  SetItemAvailabilitySchema,
  type StaffListQuery,
  StaffListQuerySchema,
  StaffListSchema,
  type StaffMemberDto,
  StaffMemberSchema,
  type StructuredDataDto,
  StructuredDataSchema,
  type TableDto,
  TableListSchema,
  TableSchema,
  type TopItemDto,
  type TopItemsQuery,
  TopItemsQuerySchema,
  TopItemsSchema,
  type UnreadCountDto,
  UnreadCountSchema,
  type UpdateAddressDto,
  UpdateAddressSchema,
  type UpdateCartItemDto,
  UpdateCartItemSchema,
  type UpdateContactMessageDto,
  UpdateContactMessageSchema,
  type UpdateFeatureFlagDto,
  UpdateFeatureFlagSchema,
  type UpdateMenuCategoryDto,
  UpdateMenuCategorySchema,
  type UpdateMenuItemDto,
  UpdateMenuItemSchema,
  type UpdateModifierGroupDto,
  UpdateModifierGroupSchema,
  type UpdateModifierOptionDto,
  UpdateModifierOptionSchema,
  type UpdateNotificationPreferenceDto,
  UpdateNotificationPreferenceSchema,
  type UpdateOperatingHoursDto,
  UpdateOperatingHoursSchema,
  type UpdateOrderStatusDto,
  UpdateOrderStatusSchema,
  type UpdateProfileDto,
  UpdateProfileSchema,
  type UpdatePromotionDto,
  UpdatePromotionSchema,
  type UpdateReservationDto,
  UpdateReservationSchema,
  type UpdateRestaurantDto,
  UpdateRestaurantSchema,
  type UpdateRestaurantSettingsDto,
  UpdateRestaurantSettingsSchema,
  type UpdateStaffRoleDto,
  UpdateStaffRoleSchema,
  type UpdateTableDto,
  UpdateTableSchema,
  type ValidateCouponDto,
  type ValidateCouponResponseDto,
  ValidateCouponResponseSchema,
  ValidateCouponSchema,
  type VerifyEmailDto,
  VerifyEmailSchema,
  type VerifyOtpDto,
  VerifyOtpSchema,
} from '@repo/types';
import { z } from 'zod';
import { ApiError } from './errors';

export interface ApiClientOptions {
  baseUrl: string;
  getAccessToken?: () => string | null | undefined | Promise<string | null | undefined>;
  /** Called when a request returns 401 and no retry resolved it. */
  onUnauthorized?: () => void | Promise<void>;
  /**
   * Called when a 401 fires; should return a fresh access token or null.
   * The default implementation returns null (no auto-refresh).
   */
  refreshAccessToken?: () => Promise<string | null>;
  fetch?: typeof fetch;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  auth?: boolean;
  responseSchema?: z.ZodType<unknown>;
  /** If true, skip a 401-driven auto-refresh retry (used by refresh itself). */
  skipRefresh?: boolean;
  /** Extra headers (e.g. Idempotency-Key on POST /orders). */
  headers?: Record<string, string>;
  /** Return the raw response body as text (sitemap.xml / robots.txt). */
  raw?: boolean;
}

export function createApiClient(opts: ApiClientOptions) {
  const fetchImpl = opts.fetch ?? globalThis.fetch;
  if (!fetchImpl) throw new Error('No fetch implementation available');

  async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = buildUrl(opts.baseUrl, path, options.query);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (options.auth !== false && opts.getAccessToken) {
      const token = await opts.getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    if (options.headers) {
      for (const [k, v] of Object.entries(options.headers)) {
        headers[k] = v;
      }
    }

    const init: RequestInit = {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: 'include',
    };

    const res = await fetchImpl(url, init);

    if (res.status === 401 && !options.skipRefresh && opts.refreshAccessToken) {
      const newToken = await opts.refreshAccessToken();
      if (newToken) {
        headers.Authorization = `Bearer ${newToken}`;
        const retry = await fetchImpl(url, { ...init, headers });
        return handleResponse<T>(retry, options.responseSchema);
      }
      if (opts.onUnauthorized) await opts.onUnauthorized();
    } else if (res.status === 401 && opts.onUnauthorized) {
      await opts.onUnauthorized();
    }

    if (options.raw) {
      if (!res.ok) {
        let body: unknown;
        try {
          body = await res.json();
        } catch {
          body = { message: await res.text().catch(() => '') };
        }
        throw ApiError.fromResponse(res.status, body);
      }
      return (await res.text()) as T;
    }

    return handleResponse<T>(res, options.responseSchema);
  }

  // ---- auth -------------------------------------------------------------
  const auth = {
    register: (input: RegisterDto): Promise<AuthResponseDto> =>
      request('/auth/register', {
        method: 'POST',
        body: RegisterSchema.parse(input),
        auth: false,
        responseSchema: AuthResponseSchema,
      }),
    login: (input: LoginDto): Promise<AuthResponseDto> =>
      request('/auth/login', {
        method: 'POST',
        body: LoginSchema.parse(input),
        auth: false,
        responseSchema: AuthResponseSchema,
      }),
    refresh: (input: RefreshDto): Promise<AuthTokensDto> =>
      request('/auth/refresh', {
        method: 'POST',
        body: RefreshSchema.parse(input),
        auth: false,
        skipRefresh: true,
        responseSchema: AuthTokensSchema,
      }),
    logout: (): Promise<{ success: true }> =>
      request('/auth/logout', {
        method: 'POST',
        responseSchema: z.object({ success: z.literal(true) }),
      }),
    requestOtp: (input: RequestOtpDto): Promise<{ success: true }> =>
      request('/auth/request-otp', {
        method: 'POST',
        body: RequestOtpSchema.parse(input),
        auth: false,
        responseSchema: z.object({ success: z.literal(true) }),
      }),
    verifyOtp: (input: VerifyOtpDto): Promise<AuthResponseDto> =>
      request('/auth/verify-otp', {
        method: 'POST',
        body: VerifyOtpSchema.parse(input),
        auth: false,
        responseSchema: AuthResponseSchema,
      }),
    forgotPassword: (input: ForgotPasswordDto): Promise<{ success: true }> =>
      request('/auth/forgot-password', {
        method: 'POST',
        body: ForgotPasswordSchema.parse(input),
        auth: false,
        responseSchema: z.object({ success: z.literal(true) }),
      }),
    resetPassword: (input: ResetPasswordDto): Promise<{ success: true }> =>
      request('/auth/reset-password', {
        method: 'POST',
        body: ResetPasswordSchema.parse(input),
        auth: false,
        responseSchema: z.object({ success: z.literal(true) }),
      }),
    verifyEmail: (input: VerifyEmailDto): Promise<{ success: true }> =>
      request('/auth/verify-email', {
        method: 'POST',
        body: VerifyEmailSchema.parse(input),
        auth: false,
        responseSchema: z.object({ success: z.literal(true) }),
      }),
    me: (): Promise<MeDto> =>
      request('/auth/me', {
        method: 'GET',
        responseSchema: MeSchema,
      }),
  };

  // ---- users ------------------------------------------------------------
  const users = {
    updateProfile: (input: UpdateProfileDto): Promise<MeDto> =>
      request('/users/me', {
        method: 'PATCH',
        body: UpdateProfileSchema.parse(input),
        responseSchema: MeSchema,
      }),
    changePassword: (input: ChangePasswordDto): Promise<{ success: true }> =>
      request('/users/me/change-password', {
        method: 'POST',
        body: ChangePasswordSchema.parse(input),
        responseSchema: z.object({ success: z.literal(true) }),
      }),
  };

  // ---- addresses --------------------------------------------------------
  const addresses = {
    list: (): Promise<AddressDto[]> =>
      request('/addresses', {
        method: 'GET',
        responseSchema: AddressListSchema,
      }),
    create: (input: CreateAddressDto): Promise<AddressDto> =>
      request('/addresses', {
        method: 'POST',
        body: CreateAddressSchema.parse(input),
        responseSchema: AddressSchema,
      }),
    update: (id: string, input: UpdateAddressDto): Promise<AddressDto> =>
      request(`/addresses/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: UpdateAddressSchema.parse(input),
        responseSchema: AddressSchema,
      }),
    delete: (id: string): Promise<{ success: true }> =>
      request(`/addresses/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        responseSchema: z.object({ success: z.literal(true) }),
      }),
    setDefault: (id: string): Promise<AddressDto> =>
      request(`/addresses/${encodeURIComponent(id)}/default`, {
        method: 'POST',
        responseSchema: AddressSchema,
      }),
  };

  // ---- restaurants ------------------------------------------------------
  const restaurants = {
    list: (): Promise<RestaurantPublicDto[]> =>
      request('/restaurants', {
        method: 'GET',
        auth: false,
        responseSchema: RestaurantListSchema,
      }),
    bySlug: (slug: string): Promise<RestaurantPublicDto> =>
      request(`/restaurants/${encodeURIComponent(slug)}`, {
        method: 'GET',
        auth: false,
        responseSchema: RestaurantPublicSchema,
      }),
    create: (input: CreateRestaurantDto): Promise<RestaurantAdminDto> =>
      request('/restaurants', {
        method: 'POST',
        body: CreateRestaurantSchema.parse(input),
        responseSchema: RestaurantAdminSchema,
      }),
    update: (id: string, input: UpdateRestaurantDto): Promise<RestaurantAdminDto> =>
      request(`/restaurants/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: UpdateRestaurantSchema.parse(input),
        responseSchema: RestaurantAdminSchema,
      }),
    getHours: (id: string): Promise<OperatingHoursDto[]> =>
      request(`/restaurants/${encodeURIComponent(id)}/hours`, {
        method: 'GET',
        auth: false,
        responseSchema: OperatingHoursListSchema,
      }),
    updateHours: (id: string, input: UpdateOperatingHoursDto): Promise<OperatingHoursDto[]> =>
      request(`/restaurants/${encodeURIComponent(id)}/hours`, {
        method: 'PUT',
        body: UpdateOperatingHoursSchema.parse(input),
        responseSchema: OperatingHoursListSchema,
      }),
  };

  // ---- menu -------------------------------------------------------------
  const okSchema = z.object({ success: z.literal(true) });
  const menu = {
    getTree: (restaurantId: string): Promise<MenuTreeDto> =>
      request(`/restaurants/${encodeURIComponent(restaurantId)}/menu`, {
        method: 'GET',
        auth: false,
        responseSchema: MenuTreeSchema,
      }),
    getItem: (
      restaurantId: string,
      categorySlug: string,
      itemSlug: string,
    ): Promise<MenuItemDetailDto> =>
      request(
        `/restaurants/${encodeURIComponent(restaurantId)}/menu/categories/${encodeURIComponent(categorySlug)}/items/${encodeURIComponent(itemSlug)}`,
        { method: 'GET', auth: false, responseSchema: MenuItemDetailSchema },
      ),

    categories: {
      create: (input: CreateMenuCategoryDto): Promise<MenuCategoryDto> =>
        request('/menu/categories', {
          method: 'POST',
          body: CreateMenuCategorySchema.parse(input),
          responseSchema: MenuCategorySchema,
        }),
      update: (id: string, input: UpdateMenuCategoryDto): Promise<MenuCategoryDto> =>
        request(`/menu/categories/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: UpdateMenuCategorySchema.parse(input),
          responseSchema: MenuCategorySchema,
        }),
      delete: (id: string): Promise<{ success: true }> =>
        request(`/menu/categories/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          responseSchema: okSchema,
        }),
      reorder: (input: ReorderDto): Promise<{ success: true }> =>
        request('/menu/categories/reorder', {
          method: 'POST',
          body: ReorderSchema.parse(input),
          responseSchema: okSchema,
        }),
    },

    items: {
      create: (input: CreateMenuItemDto): Promise<MenuItemDto> =>
        request('/menu/items', {
          method: 'POST',
          body: CreateMenuItemSchema.parse(input),
          responseSchema: MenuItemSchema,
        }),
      update: (id: string, input: UpdateMenuItemDto): Promise<MenuItemDto> =>
        request(`/menu/items/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: UpdateMenuItemSchema.parse(input),
          responseSchema: MenuItemSchema,
        }),
      delete: (id: string): Promise<{ success: true }> =>
        request(`/menu/items/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          responseSchema: okSchema,
        }),
      setAvailability: (id: string, input: SetItemAvailabilityDto): Promise<MenuItemDto> =>
        request(`/menu/items/${encodeURIComponent(id)}/availability`, {
          method: 'POST',
          body: SetItemAvailabilitySchema.parse(input),
          responseSchema: MenuItemSchema,
        }),
      reorder: (input: ReorderItemsDto): Promise<{ success: true }> =>
        request('/menu/items/reorder', {
          method: 'POST',
          body: ReorderItemsSchema.parse(input),
          responseSchema: okSchema,
        }),
      addImage: (id: string, input: AddMenuItemImageDto): Promise<MenuItemImageDto> =>
        request(`/menu/items/${encodeURIComponent(id)}/images`, {
          method: 'POST',
          body: AddMenuItemImageSchema.parse(input),
          responseSchema: MenuItemImageSchema,
        }),
      removeImage: (id: string, imageId: string): Promise<{ success: true }> =>
        request(`/menu/items/${encodeURIComponent(id)}/images/${encodeURIComponent(imageId)}`, {
          method: 'DELETE',
          responseSchema: okSchema,
        }),
      reorderImages: (id: string, input: ReorderDto): Promise<{ success: true }> =>
        request(`/menu/items/${encodeURIComponent(id)}/images/reorder`, {
          method: 'POST',
          body: ReorderSchema.parse(input),
          responseSchema: okSchema,
        }),
    },

    modifierGroups: {
      create: (itemId: string, input: CreateModifierGroupDto): Promise<ModifierGroupDto> =>
        request(`/menu/items/${encodeURIComponent(itemId)}/modifier-groups`, {
          method: 'POST',
          body: CreateModifierGroupSchema.parse(input),
          responseSchema: ModifierGroupSchema,
        }),
      update: (id: string, input: UpdateModifierGroupDto): Promise<ModifierGroupDto> =>
        request(`/menu/modifier-groups/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: UpdateModifierGroupSchema.parse(input),
          responseSchema: ModifierGroupSchema,
        }),
      delete: (id: string): Promise<{ success: true }> =>
        request(`/menu/modifier-groups/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          responseSchema: okSchema,
        }),
    },

    modifierOptions: {
      create: (groupId: string, input: CreateModifierOptionDto): Promise<ModifierOptionDto> =>
        request(`/menu/modifier-groups/${encodeURIComponent(groupId)}/options`, {
          method: 'POST',
          body: CreateModifierOptionSchema.parse(input),
          responseSchema: ModifierOptionSchema,
        }),
      update: (id: string, input: UpdateModifierOptionDto): Promise<ModifierOptionDto> =>
        request(`/menu/modifier-options/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: UpdateModifierOptionSchema.parse(input),
          responseSchema: ModifierOptionSchema,
        }),
      delete: (id: string): Promise<{ success: true }> =>
        request(`/menu/modifier-options/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          responseSchema: okSchema,
        }),
    },
  };

  // ---- uploads ----------------------------------------------------------
  const uploads = {
    presign: (input: PresignUploadDto): Promise<PresignedUploadResponseDto> =>
      request('/uploads/presign', {
        method: 'POST',
        body: PresignUploadSchema.parse(input),
        responseSchema: PresignedUploadResponseSchema,
      }),
  };

  // ---- cart -------------------------------------------------------------
  const cart = {
    get: (params: { restaurantId: string; sessionKey?: string }): Promise<CartDto> =>
      request('/cart', {
        method: 'GET',
        auth: false,
        query: { restaurantId: params.restaurantId, sessionKey: params.sessionKey },
        responseSchema: CartSchema,
      }),
    addItem: (
      params: { restaurantId: string; sessionKey?: string },
      input: AddCartItemDto,
    ): Promise<CartDto> =>
      request('/cart/items', {
        method: 'POST',
        auth: false,
        query: { restaurantId: params.restaurantId, sessionKey: params.sessionKey },
        body: AddCartItemSchema.parse(input),
        responseSchema: CartSchema,
      }),
    updateItem: (
      cartItemId: string,
      params: { sessionKey?: string },
      input: UpdateCartItemDto,
    ): Promise<CartDto> =>
      request(`/cart/items/${encodeURIComponent(cartItemId)}`, {
        method: 'PATCH',
        auth: false,
        query: { sessionKey: params.sessionKey },
        body: UpdateCartItemSchema.parse(input),
        responseSchema: CartSchema,
      }),
    removeItem: (cartItemId: string, params: { sessionKey?: string }): Promise<CartDto> =>
      request(`/cart/items/${encodeURIComponent(cartItemId)}`, {
        method: 'DELETE',
        auth: false,
        query: { sessionKey: params.sessionKey },
        responseSchema: CartSchema,
      }),
    clear: (params: { restaurantId: string; sessionKey?: string }): Promise<CartDto> =>
      request('/cart', {
        method: 'DELETE',
        auth: false,
        query: { restaurantId: params.restaurantId, sessionKey: params.sessionKey },
        responseSchema: CartSchema,
      }),
    merge: (input: MergeCartDto): Promise<CartDto> =>
      request('/cart/merge', {
        method: 'POST',
        body: MergeCartSchema.parse(input),
        responseSchema: CartSchema,
      }),
    applyCoupon: (
      params: { restaurantId: string; sessionKey?: string },
      input: ApplyCouponDto,
    ): Promise<CartDto> =>
      request('/cart/coupon', {
        method: 'POST',
        auth: false,
        query: { restaurantId: params.restaurantId, sessionKey: params.sessionKey },
        body: ApplyCouponSchema.parse(input),
        responseSchema: CartSchema,
      }),
    removeCoupon: (params: { restaurantId: string; sessionKey?: string }): Promise<CartDto> =>
      request('/cart/coupon', {
        method: 'DELETE',
        auth: false,
        query: { restaurantId: params.restaurantId, sessionKey: params.sessionKey },
        responseSchema: CartSchema,
      }),
    setLoyalty: (params: { restaurantId: string }, input: SetCartLoyaltyDto): Promise<CartDto> =>
      request('/cart/loyalty', {
        method: 'PATCH',
        query: { restaurantId: params.restaurantId },
        body: SetCartLoyaltySchema.parse(input),
        responseSchema: CartSchema,
      }),
  };

  // ---- orders -----------------------------------------------------------
  const orders = {
    create: (input: CreateOrderDto, idempotencyKey: string): Promise<OrderDto> =>
      request('/orders', {
        method: 'POST',
        auth: false, // guest carts can create orders
        body: CreateOrderSchema.parse(input),
        headers: { 'Idempotency-Key': idempotencyKey },
        responseSchema: OrderSchema,
      }),
    list: (query?: OrderListQuery): Promise<OrderListDto> =>
      request('/orders', {
        method: 'GET',
        query: query
          ? (OrderListQuerySchema.parse(query) as Record<
              string,
              string | number | boolean | undefined
            >)
          : undefined,
        responseSchema: OrderListSchema,
      }),
    getById: (id: string): Promise<OrderDto> =>
      request(`/orders/${encodeURIComponent(id)}`, {
        method: 'GET',
        responseSchema: OrderSchema,
      }),
    getTracking: (id: string): Promise<OrderTrackingDto> =>
      request(`/orders/${encodeURIComponent(id)}/tracking`, {
        method: 'GET',
        responseSchema: OrderTrackingSchema,
      }),
    updateStatus: (id: string, input: UpdateOrderStatusDto): Promise<OrderDto> =>
      request(`/orders/${encodeURIComponent(id)}/status`, {
        method: 'POST',
        body: UpdateOrderStatusSchema.parse(input),
        responseSchema: OrderSchema,
      }),
  };

  // ---- kitchen ----------------------------------------------------------
  const kitchen = {
    tickets: (restaurantId: string): Promise<KitchenTicketDto[]> =>
      request('/kitchen/tickets', {
        method: 'GET',
        query: { restaurantId },
        responseSchema: KitchenTicketsListSchema,
      }),
  };

  // ---- promotions -------------------------------------------------------
  const promotions = {
    list: (active?: boolean): Promise<PromotionDto[]> =>
      request('/promotions', {
        method: 'GET',
        query: active === undefined ? undefined : { active: String(active) },
        responseSchema: PromotionListSchema,
      }),
    getById: (id: string): Promise<PromotionDto> =>
      request(`/promotions/${encodeURIComponent(id)}`, {
        method: 'GET',
        responseSchema: PromotionSchema,
      }),
    create: (input: CreatePromotionDto): Promise<PromotionDto> =>
      request('/promotions', {
        method: 'POST',
        body: CreatePromotionSchema.parse(input),
        responseSchema: PromotionSchema,
      }),
    update: (id: string, input: UpdatePromotionDto): Promise<PromotionDto> =>
      request(`/promotions/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: UpdatePromotionSchema.parse(input),
        responseSchema: PromotionSchema,
      }),
    delete: (id: string): Promise<{ success: true }> =>
      request(`/promotions/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        responseSchema: z.object({ success: z.literal(true) }),
      }),
    listCoupons: (promotionId: string): Promise<CouponDto[]> =>
      request(`/promotions/${encodeURIComponent(promotionId)}/coupons`, {
        method: 'GET',
        responseSchema: CouponListSchema,
      }),
    createCoupon: (promotionId: string, input: CreateCouponDto): Promise<CouponDto> =>
      request(`/promotions/${encodeURIComponent(promotionId)}/coupons`, {
        method: 'POST',
        body: CreateCouponSchema.parse(input),
        responseSchema: z.object({
          id: z.string(),
          promotionId: z.string(),
          code: z.string(),
          maxRedemptions: z.number().int().nullable(),
          perUserLimit: z.number().int().nullable(),
          redemptionsCount: z.number().int(),
        }),
      }),
  };

  // ---- coupons ----------------------------------------------------------
  const coupons = {
    delete: (id: string): Promise<{ success: true }> =>
      request(`/coupons/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        responseSchema: z.object({ success: z.literal(true) }),
      }),
    validate: (input: ValidateCouponDto): Promise<ValidateCouponResponseDto> =>
      request('/coupons/validate', {
        method: 'POST',
        auth: false,
        body: ValidateCouponSchema.parse(input),
        responseSchema: ValidateCouponResponseSchema,
      }),
  };

  // ---- payments ---------------------------------------------------------
  const payments = {
    getConfig: (): Promise<PaymentConfigDto> =>
      request('/payments/config', {
        method: 'GET',
        auth: false,
        responseSchema: PaymentConfigSchema,
      }),
    createIntent: (input: CreatePaymentIntentDto): Promise<PaymentIntentResponseDto> =>
      request('/payments/intent', {
        method: 'POST',
        body: CreatePaymentIntentSchema.parse(input),
        responseSchema: PaymentIntentResponseSchema,
      }),
    byOrderId: (orderId: string): Promise<PaymentDto | null> =>
      request(`/payments/by-order/${encodeURIComponent(orderId)}`, {
        method: 'GET',
        responseSchema: PaymentSchema.nullable(),
      }),
    refund: (paymentId: string, input: CreateRefundDto): Promise<RefundDto> =>
      request(`/payments/${encodeURIComponent(paymentId)}/refunds`, {
        method: 'POST',
        body: CreateRefundSchema.parse(input),
        responseSchema: RefundSchema,
      }),
  };

  // ---- reservations (Sprint 7) ----------------------------------------
  const reservations = {
    availability: (
      input: AvailabilityQueryDto,
    ): Promise<import('@repo/types').AvailabilityResponseDto> =>
      request('/reservations/availability', {
        method: 'GET',
        auth: false,
        query: { ...input } as Record<string, string | number | boolean | undefined>,
        responseSchema: AvailabilityResponseSchema,
      }),
    create: (input: CreateReservationDto): Promise<ReservationDto> =>
      request('/reservations', {
        method: 'POST',
        auth: false,
        body: CreateReservationSchema.parse(input),
        responseSchema: ReservationSchema,
      }),
    listMine: (): Promise<ReservationListDto> =>
      request('/reservations/me', {
        method: 'GET',
        responseSchema: ReservationListSchema,
      }),
    list: (q?: ReservationListQuery): Promise<ReservationListDto> =>
      request('/reservations', {
        method: 'GET',
        query: q
          ? (ReservationListQuerySchema.parse(q) as Record<
              string,
              string | number | boolean | undefined
            >)
          : undefined,
        responseSchema: ReservationListSchema,
      }),
    getById: (id: string): Promise<ReservationDto> =>
      request(`/reservations/${encodeURIComponent(id)}`, {
        method: 'GET',
        responseSchema: ReservationSchema,
      }),
    update: (id: string, input: UpdateReservationDto): Promise<ReservationDto> =>
      request(`/reservations/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: UpdateReservationSchema.parse(input),
        responseSchema: ReservationSchema,
      }),
    cancel: (id: string, input: CancelReservationDto): Promise<ReservationDto> =>
      request(`/reservations/${encodeURIComponent(id)}/cancel`, {
        method: 'POST',
        body: CancelReservationSchema.parse(input),
        responseSchema: ReservationSchema,
      }),
    seat: (id: string, input: SeatReservationDto): Promise<ReservationDto> =>
      request(`/reservations/${encodeURIComponent(id)}/seat`, {
        method: 'POST',
        body: SeatReservationSchema.parse(input),
        responseSchema: ReservationSchema,
      }),
    complete: (id: string): Promise<ReservationDto> =>
      request(`/reservations/${encodeURIComponent(id)}/complete`, {
        method: 'POST',
        responseSchema: ReservationSchema,
      }),
    noShow: (id: string): Promise<ReservationDto> =>
      request(`/reservations/${encodeURIComponent(id)}/no-show`, {
        method: 'POST',
        responseSchema: ReservationSchema,
      }),
    tables: {
      list: (restaurantId: string): Promise<TableDto[]> =>
        request(`/restaurants/${encodeURIComponent(restaurantId)}/tables`, {
          method: 'GET',
          auth: false,
          responseSchema: TableListSchema,
        }),
      create: (restaurantId: string, input: CreateTableDto): Promise<TableDto> =>
        request(`/restaurants/${encodeURIComponent(restaurantId)}/tables`, {
          method: 'POST',
          body: CreateTableSchema.parse(input),
          responseSchema: TableSchema,
        }),
      update: (id: string, input: UpdateTableDto): Promise<TableDto> =>
        request(`/tables/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: UpdateTableSchema.parse(input),
          responseSchema: TableSchema,
        }),
      delete: (id: string): Promise<{ success: true }> =>
        request(`/tables/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          responseSchema: z.object({ success: z.literal(true) }),
        }),
    },
  };

  // ---- reviews ---------------------------------------------------------
  const reviews = {
    create: (input: CreateReviewDto): Promise<ReviewDto> =>
      request('/reviews', {
        method: 'POST',
        body: CreateReviewSchema.parse(input),
        responseSchema: ReviewSchema,
      }),
    listMine: (): Promise<ReviewListDto> =>
      request('/reviews/me', {
        method: 'GET',
        responseSchema: ReviewListSchema,
      }),
    forRestaurant: (restaurantId: string, q?: ReviewListQuery): Promise<ReviewListDto> =>
      request(`/restaurants/${encodeURIComponent(restaurantId)}/reviews`, {
        method: 'GET',
        auth: false,
        query: q
          ? (ReviewListQuerySchema.parse(q) as Record<
              string,
              string | number | boolean | undefined
            >)
          : undefined,
        responseSchema: ReviewListSchema,
      }),
    listAdmin: (q?: ReviewListQuery): Promise<ReviewListDto> =>
      request('/admin/reviews', {
        method: 'GET',
        query: q
          ? (ReviewListQuerySchema.parse(q) as Record<
              string,
              string | number | boolean | undefined
            >)
          : undefined,
        responseSchema: ReviewListSchema,
      }),
    moderate: (id: string, isVisible: boolean): Promise<ReviewDto> =>
      request(`/admin/reviews/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: ReviewModerationSchema.parse({ isVisible }),
        responseSchema: ReviewSchema,
      }),
    hide: (id: string): Promise<ReviewDto> =>
      request(`/admin/reviews/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        responseSchema: ReviewSchema,
      }),
    reply: (id: string, input: OwnerReplyDto): Promise<ReviewDto> =>
      request(`/admin/reviews/${encodeURIComponent(id)}/reply`, {
        method: 'POST',
        body: OwnerReplySchema.parse(input),
        responseSchema: ReviewSchema,
      }),
    summary: (restaurantId: string): Promise<ReviewSummaryDto> =>
      request(`/restaurants/${encodeURIComponent(restaurantId)}/reviews/summary`, {
        method: 'GET',
        auth: false,
        responseSchema: ReviewSummarySchema,
      }),
  };

  // ---- notifications ---------------------------------------------------
  const notifications = {
    list: (q?: NotificationListQuery): Promise<NotificationListDto> =>
      request('/notifications', {
        method: 'GET',
        query: q
          ? (NotificationListQuerySchema.parse(q) as Record<
              string,
              string | number | boolean | undefined
            >)
          : undefined,
        responseSchema: NotificationListSchema,
      }),
    unreadCount: (): Promise<UnreadCountDto> =>
      request('/notifications/unread-count', {
        method: 'GET',
        responseSchema: UnreadCountSchema,
      }),
    markRead: (id: string): Promise<{ success: true }> =>
      request(`/notifications/${encodeURIComponent(id)}/read`, {
        method: 'POST',
      }),
    markAllRead: (): Promise<{ success: true; count: number }> =>
      request('/notifications/read-all', { method: 'POST' }),
    registerPushToken: (input: RegisterPushTokenDto): Promise<{ success: true }> =>
      request('/notifications/push-tokens', {
        method: 'POST',
        body: RegisterPushTokenSchema.parse(input),
      }),
    unregisterPushToken: (token: string): Promise<{ success: true }> =>
      request(`/notifications/push-tokens/${encodeURIComponent(token)}`, {
        method: 'DELETE',
      }),
    getPreferences: (): Promise<NotificationPreferenceDto> =>
      request('/notifications/preferences', {
        method: 'GET',
        responseSchema: NotificationPreferenceSchema,
      }),
    updatePreferences: (
      input: UpdateNotificationPreferenceDto,
    ): Promise<NotificationPreferenceDto> =>
      request('/notifications/preferences', {
        method: 'PATCH',
        body: UpdateNotificationPreferenceSchema.parse(input),
        responseSchema: NotificationPreferenceSchema,
      }),
  };

  // ---- loyalty ---------------------------------------------------------
  const loyalty = {
    me: (): Promise<LoyaltyAccountDto> =>
      request('/loyalty/me', {
        method: 'GET',
        responseSchema: LoyaltyAccountSchema,
      }),
    history: (q?: LoyaltyHistoryQuery): Promise<LoyaltyHistoryDto> =>
      request('/loyalty/me/history', {
        method: 'GET',
        query: q
          ? (LoyaltyHistoryQuerySchema.parse(q) as Record<
              string,
              string | number | boolean | undefined
            >)
          : undefined,
        responseSchema: LoyaltyHistorySchema,
      }),
    redeemQuote: (input: LoyaltyRedeemQuoteRequest): Promise<LoyaltyRedeemQuoteDto> =>
      request('/loyalty/redeem/quote', {
        method: 'POST',
        body: LoyaltyRedeemQuoteRequestSchema.parse(input),
        responseSchema: LoyaltyRedeemQuoteSchema,
      }),
  };

  // ---- favorites -------------------------------------------------------
  const favorites = {
    list: (q?: FavoriteListQuery): Promise<FavoriteListDto> =>
      request('/favorites', {
        method: 'GET',
        query: q
          ? (FavoriteListQuerySchema.parse(q) as Record<
              string,
              string | number | boolean | undefined
            >)
          : undefined,
        responseSchema: FavoriteListSchema,
      }),
    ids: (): Promise<FavoriteIdsDto> =>
      request('/favorites/ids', {
        method: 'GET',
        responseSchema: FavoriteIdsSchema,
      }),
    add: (menuItemId: string): Promise<FavoriteDto> =>
      request(`/favorites/${encodeURIComponent(menuItemId)}`, {
        method: 'PUT',
        responseSchema: FavoriteSchema,
      }),
    remove: (menuItemId: string): Promise<{ removed: boolean }> =>
      request(`/favorites/${encodeURIComponent(menuItemId)}`, {
        method: 'DELETE',
        responseSchema: z.object({ removed: z.boolean() }),
      }),
  };

  // ---- referrals -------------------------------------------------------
  const referrals = {
    me: (): Promise<ReferralMeDto> =>
      request('/referrals/me', {
        method: 'GET',
        responseSchema: ReferralMeSchema,
      }),
    list: (q?: ReferralListQuery): Promise<ReferralListDto> =>
      request('/referrals', {
        method: 'GET',
        query: q
          ? (ReferralListQuerySchema.parse(q) as Record<
              string,
              string | number | boolean | undefined
            >)
          : undefined,
        responseSchema: ReferralListSchema,
      }),
  };

  // ---- i18n ------------------------------------------------------------
  const i18n = {
    messages: (locale?: 'en' | 'ar'): Promise<I18nMessagesDto> =>
      request('/i18n/messages', {
        method: 'GET',
        auth: false,
        query: locale ? { locale } : undefined,
        responseSchema: I18nMessagesSchema,
      }),
  };

  // ---- feature flags ---------------------------------------------------
  const featureFlags = {
    resolved: (): Promise<FeatureFlagsResolvedDto> =>
      request('/feature-flags', {
        method: 'GET',
        auth: false,
        responseSchema: FeatureFlagsResolvedSchema,
      }),
    listAdmin: (): Promise<FeatureFlagListDto> =>
      request('/admin/feature-flags', {
        method: 'GET',
        responseSchema: FeatureFlagListSchema,
      }),
    update: (key: string, input: UpdateFeatureFlagDto): Promise<FeatureFlagAdminDto> =>
      request(`/admin/feature-flags/${encodeURIComponent(key)}`, {
        method: 'PATCH',
        body: UpdateFeatureFlagSchema.parse(input),
        responseSchema: FeatureFlagAdminSchema,
      }),
  };

  // ---- marketing -------------------------------------------------------
  const marketing = {
    landing: (q?: MarketingQuery): Promise<LandingDataDto> =>
      request('/marketing/landing', {
        method: 'GET',
        auth: false,
        query: q
          ? (MarketingQuerySchema.parse(q) as Record<string, string | number | boolean | undefined>)
          : undefined,
        responseSchema: LandingDataSchema,
      }),
    about: (q?: MarketingQuery): Promise<AboutDataDto> =>
      request('/marketing/about', {
        method: 'GET',
        auth: false,
        query: q
          ? (MarketingQuerySchema.parse(q) as Record<string, string | number | boolean | undefined>)
          : undefined,
        responseSchema: AboutDataSchema,
      }),
  };

  // ---- contact ---------------------------------------------------------
  const contact = {
    send: (input: CreateContactMessageDto): Promise<ContactMessageDto> =>
      request('/contact', {
        method: 'POST',
        auth: false,
        body: CreateContactMessageSchema.parse(input),
        responseSchema: ContactMessageSchema,
      }),
    list: (q?: ContactMessageListQuery): Promise<ContactMessageListDto> =>
      request('/admin/contact', {
        method: 'GET',
        query: q
          ? (ContactMessageListQuerySchema.parse(q) as Record<
              string,
              string | number | boolean | undefined
            >)
          : undefined,
        responseSchema: ContactMessageListSchema,
      }),
    updateStatus: (id: string, input: UpdateContactMessageDto): Promise<ContactMessageDto> =>
      request(`/admin/contact/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: UpdateContactMessageSchema.parse(input),
        responseSchema: ContactMessageSchema,
      }),
  };

  // ---- seo -------------------------------------------------------------
  const seo = {
    structuredData: (slug: string): Promise<StructuredDataDto> =>
      request(`/seo/structured-data/${encodeURIComponent(slug)}`, {
        method: 'GET',
        auth: false,
        responseSchema: StructuredDataSchema,
      }),
    sitemap: (): Promise<string> =>
      request('/seo/sitemap.xml', { method: 'GET', auth: false, raw: true }),
    robots: (): Promise<string> =>
      request('/seo/robots.txt', { method: 'GET', auth: false, raw: true }),
    meta: (q?: SeoMetaQuery): Promise<SeoMetaDto> =>
      request('/seo/meta', {
        method: 'GET',
        auth: false,
        query: q
          ? (SeoMetaQuerySchema.parse(q) as Record<string, string | number | boolean | undefined>)
          : undefined,
        responseSchema: SeoMetaSchema,
      }),
  };

  // ---- customers (admin) -----------------------------------------------
  const customers = {
    list: (q?: CustomerListQuery): Promise<CustomerListDto> =>
      request('/admin/customers', {
        method: 'GET',
        query: q
          ? (CustomerListQuerySchema.parse(q) as Record<
              string,
              string | number | boolean | undefined
            >)
          : undefined,
        responseSchema: CustomerListSchema,
      }),
    get: (id: string): Promise<CustomerDetailDto> =>
      request(`/admin/customers/${encodeURIComponent(id)}`, {
        method: 'GET',
        responseSchema: CustomerDetailSchema,
      }),
    addNote: (
      id: string,
      input: CreateCustomerNoteDto,
    ): Promise<import('@repo/types').CustomerNoteDto> =>
      request(`/admin/customers/${encodeURIComponent(id)}/notes`, {
        method: 'PATCH',
        body: CreateCustomerNoteSchema.parse(input),
        responseSchema: CustomerNoteSchema,
      }),
  };

  // ---- staff -----------------------------------------------------------
  const staff = {
    list: (q?: StaffListQuery): Promise<StaffMemberDto[]> =>
      request('/admin/staff', {
        method: 'GET',
        query: q
          ? (StaffListQuerySchema.parse(q) as Record<string, string | number | boolean | undefined>)
          : undefined,
        responseSchema: StaffListSchema,
      }),
    invite: (input: InviteStaffDto): Promise<{ token: string; expiresAt: string }> =>
      request('/admin/staff/invite', {
        method: 'POST',
        body: InviteStaffSchema.parse(input),
        responseSchema: z.object({ token: z.string(), expiresAt: z.string() }),
      }),
    acceptInvite: (input: AcceptStaffInviteDto): Promise<{ userId: string }> =>
      request('/staff/accept-invite', {
        method: 'POST',
        auth: false,
        body: AcceptStaffInviteSchema.parse(input),
        responseSchema: z.object({ userId: z.string() }),
      }),
    updateRole: (userId: string, input: UpdateStaffRoleDto): Promise<StaffMemberDto> =>
      request(`/admin/staff/${encodeURIComponent(userId)}/role`, {
        method: 'PATCH',
        body: UpdateStaffRoleSchema.parse(input),
        responseSchema: StaffMemberSchema,
      }),
    deactivate: (userId: string): Promise<{ success: true }> =>
      request(`/admin/staff/${encodeURIComponent(userId)}/deactivate`, {
        method: 'POST',
        responseSchema: z.object({ success: z.literal(true) }),
      }),
    reactivate: (userId: string): Promise<{ success: true }> =>
      request(`/admin/staff/${encodeURIComponent(userId)}/reactivate`, {
        method: 'POST',
        responseSchema: z.object({ success: z.literal(true) }),
      }),
  };

  // ---- settings --------------------------------------------------------
  const settings = {
    get: (restaurantId: string): Promise<RestaurantSettingsDto> =>
      request(`/admin/restaurants/${encodeURIComponent(restaurantId)}/settings`, {
        method: 'GET',
        responseSchema: RestaurantSettingsSchema,
      }),
    update: (
      restaurantId: string,
      input: UpdateRestaurantSettingsDto,
    ): Promise<RestaurantSettingsDto> =>
      request(`/admin/restaurants/${encodeURIComponent(restaurantId)}/settings`, {
        method: 'PATCH',
        body: UpdateRestaurantSettingsSchema.parse(input),
        responseSchema: RestaurantSettingsSchema,
      }),
    addHoliday: (restaurantId: string, input: HolidayDto): Promise<RestaurantSettingsDto> =>
      request(`/admin/restaurants/${encodeURIComponent(restaurantId)}/holidays`, {
        method: 'POST',
        body: HolidaySchema.parse(input),
        responseSchema: RestaurantSettingsSchema,
      }),
    removeHoliday: (restaurantId: string, date: string): Promise<RestaurantSettingsDto> =>
      request(
        `/admin/restaurants/${encodeURIComponent(restaurantId)}/holidays/${encodeURIComponent(date)}`,
        {
          method: 'DELETE',
          responseSchema: RestaurantSettingsSchema,
        },
      ),
    checkDeliveryZone: (
      restaurantId: string,
      q: DeliveryZoneCheckQuery,
    ): Promise<DeliveryZoneCheckResponseDto> =>
      request(`/admin/restaurants/${encodeURIComponent(restaurantId)}/delivery-zones/check`, {
        method: 'GET',
        auth: false,
        query: DeliveryZoneCheckQuerySchema.parse(q) as Record<
          string,
          string | number | boolean | undefined
        >,
        responseSchema: DeliveryZoneCheckResponseSchema,
      }),
  };

  // ---- analytics (Sprint 8) -------------------------------------------
  const analytics = {
    overview: (q: AnalyticsBaseQuery): Promise<AnalyticsOverviewDto> =>
      request('/analytics/overview', {
        method: 'GET',
        query: AnalyticsBaseQuerySchema.parse(q) as Record<
          string,
          string | number | boolean | undefined
        >,
        responseSchema: AnalyticsOverviewSchema,
      }),
    revenueTimeseries: (q: RevenueTimeseriesQuery): Promise<RevenueTimeseriesPointDto[]> =>
      request('/analytics/revenue-timeseries', {
        method: 'GET',
        query: RevenueTimeseriesQuerySchema.parse(q) as Record<
          string,
          string | number | boolean | undefined
        >,
        responseSchema: RevenueTimeseriesSchema,
      }),
    topItems: (q: TopItemsQuery): Promise<TopItemDto[]> =>
      request('/analytics/top-items', {
        method: 'GET',
        query: TopItemsQuerySchema.parse(q) as Record<
          string,
          string | number | boolean | undefined
        >,
        responseSchema: TopItemsSchema,
      }),
    ordersByStatus: (q: AnalyticsBaseQuery): Promise<OrdersByStatusDto> =>
      request('/analytics/orders-by-status', {
        method: 'GET',
        query: AnalyticsBaseQuerySchema.parse(q) as Record<
          string,
          string | number | boolean | undefined
        >,
        responseSchema: OrdersByStatusSchema,
      }),
    customerRetention: (q: CustomerRetentionQuery): Promise<CustomerRetentionDto> =>
      request('/analytics/customer-retention', {
        method: 'GET',
        query: CustomerRetentionQuerySchema.parse(q) as Record<
          string,
          string | number | boolean | undefined
        >,
        responseSchema: CustomerRetentionSchema,
      }),
    paymentMethods: (q: AnalyticsBaseQuery): Promise<PaymentMethodsBreakdownDto> =>
      request('/analytics/payment-methods', {
        method: 'GET',
        query: AnalyticsBaseQuerySchema.parse(q) as Record<
          string,
          string | number | boolean | undefined
        >,
        responseSchema: PaymentMethodsBreakdownSchema,
      }),
    salesByHour: (q: AnalyticsBaseQuery): Promise<SalesByHourDto> =>
      request('/analytics/sales-by-hour', {
        method: 'GET',
        query: AnalyticsBaseQuerySchema.parse(q) as Record<
          string,
          string | number | boolean | undefined
        >,
        responseSchema: SalesByHourSchema,
      }),
    salesByDayOfWeek: (q: AnalyticsBaseQuery): Promise<SalesByDayOfWeekDto> =>
      request('/analytics/sales-by-day-of-week', {
        method: 'GET',
        query: AnalyticsBaseQuerySchema.parse(q) as Record<
          string,
          string | number | boolean | undefined
        >,
        responseSchema: SalesByDayOfWeekSchema,
      }),
  };

  // ---- reports --------------------------------------------------------
  const reports = {
    createExport: (input: CreateExportDto): Promise<ExportDto> =>
      request('/reports/exports', {
        method: 'POST',
        body: CreateExportSchema.parse(input),
        responseSchema: ExportSchema,
      }),
    listExports: (): Promise<ExportDto[]> =>
      request('/reports/exports', {
        method: 'GET',
        responseSchema: ExportListSchema,
      }),
    getExport: (id: string): Promise<ExportDto> =>
      request(`/reports/exports/${encodeURIComponent(id)}`, {
        method: 'GET',
        responseSchema: ExportSchema,
      }),
    downloadUrl: (id: string): string =>
      `${opts.baseUrl.replace(/\/+$/, '')}/reports/exports/${encodeURIComponent(id)}/download`,
  };

  // ---- audit-log ------------------------------------------------------
  const audit = {
    list: (q?: AuditLogListQuery): Promise<AuditLogListDto> =>
      request('/admin/audit-log', {
        method: 'GET',
        query: q
          ? (AuditLogListQuerySchema.parse(q) as Record<
              string,
              string | number | boolean | undefined
            >)
          : undefined,
        responseSchema: AuditLogListSchema,
      }),
  };

  return {
    auth,
    users,
    addresses,
    restaurants,
    menu,
    uploads,
    cart,
    orders,
    kitchen,
    promotions,
    coupons,
    payments,
    reservations,
    reviews,
    notifications,
    loyalty,
    favorites,
    referrals,
    i18n,
    featureFlags,
    marketing,
    contact,
    seo,
    customers,
    staff,
    settings,
    analytics,
    reports,
    audit,
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

// ---------------------------------------------------------------------------

async function handleResponse<T>(res: Response, schema?: z.ZodType<unknown>): Promise<T> {
  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = { message: await res.text().catch(() => '') };
    }
    throw ApiError.fromResponse(res.status, body);
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json();
  if (schema) {
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      throw new ApiError(500, `Response failed schema validation: ${parsed.error.message}`);
    }
    return parsed.data as T;
  }
  return data as T;
}

function buildUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, string | number | boolean | undefined>,
): string {
  const trimmedBase = baseUrl.replace(/\/+$/, '');
  const trimmedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${trimmedBase}${trimmedPath}`;
  if (!query) return url;
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined) search.set(k, String(v));
  }
  const qs = search.toString();
  return qs ? `${url}?${qs}` : url;
}
