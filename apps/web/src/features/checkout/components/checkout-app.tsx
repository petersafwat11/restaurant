'use client';

import { useCartSessionKey } from '@/components/cart-session-provider';
import { useCart } from '@/features/cart/hooks';
import { cartItemToDisplay } from '@/features/cart/to-display';
import { PaymentLogos } from '@/features/checkout/components/payment-logos';
import { StripePaymentForm } from '@/features/checkout/components/stripe-payment-form';
import { useDeliveryZones } from '@/features/checkout/hooks/use-delivery-zones';
import { useZoneCheck } from '@/features/checkout/hooks/use-zone-check';
import { useFeatureFlag } from '@/features/feature-flags/hooks';
import { useCreateOrder } from '@/features/orders/hooks';
import { useRestaurant } from '@/features/restaurants/hooks/use-restaurant';
import { useAuthStore } from '@/stores/auth-store';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CHECKOUT_PAYMENT_METHODS,
  type CheckoutFormInput,
  type CheckoutPaymentMethod,
  type OrderType,
} from '@repo/types';
import { CheckoutFormSchema } from '@repo/types';
import {
  type AppliedPromo,
  CheckoutSection,
  type CheckoutSectionStatus,
  Container,
  type DeliveryRow,
  EmptyState,
  FormField,
  OrderSummaryPanel,
  PromoCodeInput,
  RadioCardGroup,
  type RadioCardOption,
  TimeSlotPicker,
  type TimeSlotValue,
  TipPicker,
} from '@repo/ui';
import dynamic from 'next/dynamic';

// Leaflet hard-requires `window` — load on the client only.
const DeliveryLocationPicker = dynamic(
  () => import('@repo/ui').then((m) => m.DeliveryLocationPicker),
  { ssr: false },
);
import { Link, useRouter } from '@/i18n/navigation';
import { formatMoney } from '@repo/utils';
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CreditCard,
  Loader2,
  ShoppingBag,
  Truck,
  Utensils,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';

// Mock promo store — wires to a future server endpoint. For now, in-memory.
// `labelKey` resolves via the `promo.mock.*` translation namespace.
const MOCK_PROMOS: Record<
  string,
  { discountPercent?: number; discountAmount?: string; labelKey: 'baklava' | 'student' }
> = {
  BAKLAVA: { discountPercent: 15, labelKey: 'baklava' },
  STUDENT: { discountAmount: '5.00', labelKey: 'student' },
};

function computeSummary(
  subtotal: string,
  orderType: OrderType,
  appliedPromo: AppliedPromo | null,
  tipAmount: string,
  deliveryFee: string,
  freeLabel: string,
) {
  let discountAmount = 0;
  let discountLabel: string | undefined;
  if (appliedPromo) {
    const promo = MOCK_PROMOS[appliedPromo.code];
    if (promo) {
      if (promo.discountPercent) {
        discountAmount = (Number.parseFloat(subtotal) * promo.discountPercent) / 100;
      } else if (promo.discountAmount) {
        discountAmount = Math.min(
          Number.parseFloat(promo.discountAmount),
          Number.parseFloat(subtotal),
        );
      }
      discountLabel = appliedPromo.label;
    }
  }
  const sub = Number.parseFloat(subtotal);
  const subAfter = sub - discountAmount;
  let deliveryAmount = 0;
  let deliveryLabel: string | undefined;
  if (orderType === 'PICKUP' || orderType === 'DINE_IN') {
    deliveryLabel = freeLabel;
  } else {
    deliveryAmount = Number.parseFloat(deliveryFee);
  }
  const total = (subAfter + deliveryAmount + Number.parseFloat(tipAmount || '0')).toFixed(2);
  const delivery: DeliveryRow = deliveryLabel
    ? { label: deliveryLabel }
    : { amount: deliveryAmount.toFixed(2) };
  return {
    discount:
      discountAmount > 0 && discountLabel
        ? { amount: discountAmount.toFixed(2), label: discountLabel }
        : undefined,
    delivery,
    total,
  };
}

export function CheckoutApp() {
  const t = useTranslations('web.shop.checkout');
  const router = useRouter();
  const cartQuery = useCart();
  const createOrder = useCreateOrder();
  const user = useAuthStore((s) => s.user);
  // The API derives identity from either the authed user or a `sessionKey`
  // in the request body. For guests we forward the cart session cookie's
  // value so the server can resolve their cart and attach the order.
  const cartSessionKey = useCartSessionKey();
  const restaurantQuery = useRestaurant();

  const restaurant = restaurantQuery.data;
  const zonesQuery = useDeliveryZones();

  const [appliedPromo, setAppliedPromo] = React.useState<AppliedPromo | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [createdOrderId, setCreatedOrderId] = React.useState<string | null>(null);
  const [stripeConfig, setStripeConfig] = React.useState<{ publishableKey: string } | null>(null);
  const stripeSubmitRef = React.useRef<(() => Promise<string | null>) | null>(null);
  const stripeElementsEnabled = useFeatureFlag('payments.stripe_elements');

  // Resolve the Stripe publishable key once on mount (server-side env decides).
  React.useEffect(() => {
    if (!stripeElementsEnabled) return;
    let mounted = true;
    (async () => {
      try {
        const apiClient = (await import('@/lib/api-client')).getApiClient();
        const cfg = await apiClient.payments.getConfig();
        if (!mounted || !cfg.stripePublishableKey) return;
        setStripeConfig({ publishableKey: cfg.stripePublishableKey });
      } catch {
        // Silently fall back to bare inputs.
      }
    })();
    return () => {
      mounted = false;
    };
  }, [stripeElementsEnabled]);

  const form = useForm<CheckoutFormInput>({
    resolver: zodResolver(CheckoutFormSchema),
    mode: 'onBlur',
    defaultValues: {
      orderType: 'DELIVERY',
      contact: {
        name: user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : '',
        phone: user?.phone ?? '',
        email: user?.email ?? '',
      },
      saveInfo: false,
      address: undefined,
      tableNumber: '',
      timeSlot: { kind: 'asap' },
      orderNotes: '',
      paymentMethod: 'card',
      tipAmount: '0.00',
    },
  });

  const cart = cartQuery.data;
  const lines = (cart?.items ?? []).map((i) => cartItemToDisplay(i));
  const subtotal = cart?.totals.subtotal ?? '0.00';
  const currency = cart?.currency ?? 'PLN';
  const defaultDeliveryFee = restaurant?.defaultDeliveryFee ?? '0.00';
  const minOrderAmount = restaurant?.minOrderAmount ?? '0.00';

  // Currency symbol for inline display (e.g. "12.50 zł"). Falls back to ISO.
  const currencySymbol = React.useMemo(() => {
    try {
      return t(`currencySymbol.${currency}` as never);
    } catch {
      return currency;
    }
  }, [t, currency]);

  const ORDER_TYPE_OPTIONS: RadioCardOption<OrderType>[] = React.useMemo(
    () => [
      {
        id: 'DELIVERY',
        label: t('sections.orderType.options.DELIVERY.label'),
        description: t('sections.orderType.options.DELIVERY.description'),
        icon: <Truck size={22} strokeWidth={1.75} />,
      },
      {
        id: 'PICKUP',
        label: t('sections.orderType.options.PICKUP.label'),
        description: t('sections.orderType.options.PICKUP.description'),
        icon: <ShoppingBag size={22} strokeWidth={1.75} />,
        badge: t('sections.orderType.options.PICKUP.badge'),
        badgeTone: 'positive',
      },
      {
        id: 'DINE_IN',
        label: t('sections.orderType.options.DINE_IN.label'),
        description: t('sections.orderType.options.DINE_IN.description'),
        icon: <Utensils size={22} strokeWidth={1.75} />,
      },
    ],
    [t],
  );

  const PAYMENT_OPTIONS: RadioCardOption<CheckoutPaymentMethod>[] = React.useMemo(
    () => [
      {
        id: 'card',
        label: t('sections.payment.options.card.label'),
        description: t('sections.payment.options.card.description'),
        icon: <CreditCard size={22} strokeWidth={1.75} />,
      },
      {
        id: 'blik',
        label: t('sections.payment.options.blik.label'),
        description: t('sections.payment.options.blik.description'),
        icon: <span className="text-[12px] font-extrabold tracking-tight text-fg">BLIK</span>,
      },
      {
        id: 'cod',
        label: t('sections.payment.options.cod.label'),
        description: t('sections.payment.options.cod.description'),
        icon: <Banknote size={22} strokeWidth={1.75} />,
      },
    ],
    [t],
  );

  const orderType = form.watch('orderType');
  const tipAmount = form.watch('tipAmount');
  const geoPoint = form.watch('address.geoPoint');
  const summary = React.useMemo(
    () =>
      computeSummary(subtotal, orderType, appliedPromo, tipAmount, defaultDeliveryFee, t('free')),
    [subtotal, orderType, appliedPromo, tipAmount, defaultDeliveryFee, t],
  );

  // Run the zone check whenever the pin moves. Throttled inside the hook.
  const zoneCheck = useZoneCheck(geoPoint ?? null);
  const inZone = zoneCheck.data?.matched === true;
  const checkedZoneName = zoneCheck.data?.zone?.name ?? null;
  const belowMinimum =
    orderType === 'DELIVERY' && Number.parseFloat(subtotal) < Number.parseFloat(minOrderAmount);

  // Section completion is derived: filled (no errors) = complete.
  const [completedSteps, setCompletedSteps] = React.useState<Record<number, boolean>>({});
  const sectionStatus = (step: number, requiresPrev?: number): CheckoutSectionStatus => {
    // Hard gating: render as 'pending' (collapsed, dim) when the prior step
    // isn't done yet. Optional steps (4, 6) gate on step 3 being complete.
    if (requiresPrev !== undefined && !completedSteps[requiresPrev]) return 'pending';
    const errorKey = ({ 2: 'contact', 3: 'address', 5: 'paymentMethod' } as const)[step];
    const hasError =
      errorKey && form.formState.errors[errorKey as keyof typeof form.formState.errors];
    if (hasError) return 'error';
    if (completedSteps[step]) return 'complete';
    return 'active';
  };

  const continueFrom = async (step: number) => {
    if (step === 3 && orderType === 'DELIVERY') {
      // Block continue: must have a pin AND it must be in-zone.
      const ok = await form.trigger(['address.line1', 'address.city', 'address.geoPoint'] as never);
      if (!ok) return;
      if (!inZone) {
        setSubmitError(t('sections.whereWhen.errors.needPinInZone'));
        return;
      }
      setSubmitError(null);
      setCompletedSteps((s) => ({ ...s, [step]: true }));
      return;
    }
    const fields: Record<number, (keyof CheckoutFormInput | string)[]> = {
      1: ['orderType'],
      2: ['contact.name', 'contact.phone', 'contact.email'],
      3: orderType === 'DINE_IN' ? ['tableNumber'] : [],
      5: ['paymentMethod'],
    };
    const ok = await form.trigger(fields[step] as never);
    if (ok) setCompletedSteps((s) => ({ ...s, [step]: true }));
  };

  const handleApplyPromo = async (code: string) => {
    await new Promise((r) => setTimeout(r, 400));
    const found = MOCK_PROMOS[code];
    if (!found) return { ok: false as const, error: t('promo.notValid') };
    const label = t(`promo.mock.${found.labelKey}`);
    setAppliedPromo({ code, label });
    return { ok: true as const, label };
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    if (values.orderType === 'DELIVERY' && belowMinimum) {
      setSubmitError(t('errors.minOrderToast', { amount: formatMoney(minOrderAmount, currency) }));
      return;
    }
    setSubmitting(true);
    try {
      // DELIVERY path:
      //  - Authenticated users save the address (so they can reuse it) and
      //    pass `deliveryAddressId` to /orders.
      //  - Guests pass an inline `deliveryAddress` — backend persists it
      //    onto the Order JSON without creating a UserAddress.
      let deliveryAddressId: string | undefined;
      let inlineDeliveryAddress:
        | {
            line1: string;
            line2?: string | null;
            city: string;
            state?: string | null;
            country: string;
            geoPoint: { lat: number; lng: number };
          }
        | undefined;
      if (values.orderType === 'DELIVERY') {
        if (!values.address || !values.address.geoPoint) {
          setSubmitError(t('errors.confirmAddress'));
          setSubmitting(false);
          return;
        }
        if (user) {
          const apiClient = (await import('@/lib/api-client')).getApiClient();
          const addr = await apiClient.addresses.create({
            line1: values.address.line1,
            line2: values.address.apartment ?? null,
            city: values.address.city,
            country: values.address.country,
            geoPoint: values.address.geoPoint,
          });
          deliveryAddressId = addr.id;
        } else {
          inlineDeliveryAddress = {
            line1: values.address.line1,
            line2: values.address.apartment ?? null,
            city: values.address.city,
            country: values.address.country,
            geoPoint: values.address.geoPoint,
          };
        }
      }
      const order = await createOrder.mutateAsync({
        type: values.orderType,
        deliveryAddressId: deliveryAddressId ?? null,
        deliveryAddress: inlineDeliveryAddress ?? null,
        pickupAt: values.timeSlot.kind === 'scheduled' ? values.timeSlot.iso : null,
        notes: values.orderNotes || null,
        tipAmount: values.tipAmount,
        // Only send sessionKey for guests; signed-in users are identified by
        // the bearer token and don't need it.
        ...(user ? {} : cartSessionKey ? { sessionKey: cartSessionKey } : {}),
      });

      // Stripe Elements two-phase flow: order is now PENDING; PaymentIntent
      // mounts, user confirms inline, webhook flips Payment.status → PAID.
      if (stripeElementsEnabled && stripeConfig && values.paymentMethod === 'card') {
        setCreatedOrderId(order.id);
        const deadline = Date.now() + 8000;
        while (!stripeSubmitRef.current && Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 100));
        }
        if (!stripeSubmitRef.current) {
          throw new Error(t('errors.stripeNotInit'));
        }
        const stripeErr = await stripeSubmitRef.current();
        if (stripeErr) {
          setSubmitError(stripeErr);
          setSubmitting(false);
          return;
        }
      }

      const tokenQuery = order.trackingToken ? `?t=${encodeURIComponent(order.trackingToken)}` : '';
      router.push(`/checkout/success/${order.id}${tokenQuery}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('errors.createOrderFallback');
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  });

  if (cartQuery.isSuccess && lines.length === 0) {
    return (
      <Container className="py-24">
        <EmptyState
          size="lg"
          icon={<ShoppingBag size={64} strokeWidth={1.25} />}
          title={t('empty.title')}
          description={t('empty.description')}
          action={{ label: t('empty.action'), href: '/menu' }}
        />
      </Container>
    );
  }

  const pickerStatus =
    orderType !== 'DELIVERY'
      ? { kind: 'idle' as const }
      : !geoPoint
        ? { kind: 'idle' as const }
        : zoneCheck.isFetching
          ? { kind: 'checking' as const }
          : zoneCheck.isError
            ? {
                kind: 'error' as const,
                message: t('sections.whereWhen.pickerStatus.errorMessage'),
              }
            : inZone
              ? {
                  kind: 'in-zone' as const,
                  zoneName: checkedZoneName ?? t('sections.whereWhen.pickerStatus.defaultZoneName'),
                }
              : { kind: 'out-of-zone' as const };

  return (
    <Container className="py-12">
      <Link
        href="/menu"
        className="inline-flex items-center gap-1.5 text-small text-fg-muted transition-colors hover:text-accent"
      >
        <ArrowLeft size={14} /> {t('backToMenu')}
      </Link>
      <h1
        className="mt-4 font-display text-h2 text-fg sm:text-h1"
        style={{ textWrap: 'balance' as React.CSSProperties['textWrap'] }}
      >
        {t('heading')}
      </h1>

      <div className="mt-10 grid gap-8 lg:grid-cols-[62fr_38fr]">
        <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
          {/* 1 — Order type */}
          <CheckoutSection
            step={1}
            title={t('sections.orderType.title')}
            status={completedSteps[1] ? 'complete' : 'active'}
            summary={t(`sections.orderType.summary.${orderType}`)}
            onEdit={() => setCompletedSteps((s) => ({ ...s, 1: false }))}
          >
            <Controller
              name="orderType"
              control={form.control}
              render={({ field }) => (
                <RadioCardGroup
                  ariaLabel={t('sections.orderType.ariaLabel')}
                  layout="horizontal"
                  options={ORDER_TYPE_OPTIONS.map((o) => ({
                    ...o,
                    badge:
                      o.id === 'DELIVERY' ? `${defaultDeliveryFee} ${currencySymbol}` : o.badge,
                    badgeTone: o.id === 'DELIVERY' ? undefined : o.badgeTone,
                  }))}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <button
              type="button"
              onClick={() => continueFrom(1)}
              className="self-start rounded-button bg-accent px-5 py-2 text-small font-medium text-text-on-accent hover:bg-accent-hover"
            >
              {t('continue')}
            </button>
          </CheckoutSection>

          {/* 2 — Contact */}
          <CheckoutSection
            step={2}
            title={t('sections.contact.title')}
            status={sectionStatus(2, 1)}
            summary={`${form.watch('contact.name')} · +${form.watch('contact.phone')}`}
            onEdit={() => setCompletedSteps((s) => ({ ...s, 2: false }))}
            rightSlot={
              !user && (
                <Link href="/login" className="text-small text-accent hover:underline">
                  {t('sections.contact.alreadyCustomer')}
                </Link>
              )
            }
          >
            <FormField
              id="contact-name"
              label={t('sections.contact.fields.name')}
              required
              size="lg"
              error={form.formState.errors.contact?.name?.message}
            >
              <input
                {...form.register('contact.name')}
                type="text"
                autoComplete="name"
                placeholder={t('sections.contact.fields.namePlaceholder')}
                className="h-12 w-full rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 px-4 text-body text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
            </FormField>
            <FormField
              id="contact-phone"
              label={t('sections.contact.fields.phone')}
              required
              size="lg"
              prefix="+48"
              helper={t('sections.contact.fields.phoneHelper')}
              error={form.formState.errors.contact?.phone?.message}
            >
              <input
                {...form.register('contact.phone')}
                type="tel"
                autoComplete="tel"
                placeholder={t('sections.contact.fields.phonePlaceholder')}
              />
            </FormField>
            <FormField
              id="contact-email"
              label={t('sections.contact.fields.email')}
              required
              size="lg"
              helper={t('sections.contact.fields.emailHelper')}
              error={form.formState.errors.contact?.email?.message}
            >
              <input
                {...form.register('contact.email')}
                type="email"
                autoComplete="email"
                placeholder={t('sections.contact.fields.emailPlaceholder')}
                className="h-12 w-full rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 px-4 text-body text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
            </FormField>
            <button
              type="button"
              onClick={() => continueFrom(2)}
              className="self-start rounded-button bg-accent px-5 py-2 text-small font-medium text-text-on-accent hover:bg-accent-hover"
            >
              {t('continue')}
            </button>
          </CheckoutSection>

          {/* 3 — Where + When */}
          <CheckoutSection
            step={3}
            title={
              orderType === 'DELIVERY'
                ? t('sections.whereWhen.delivery')
                : orderType === 'PICKUP'
                  ? t('sections.whereWhen.pickup')
                  : t('sections.whereWhen.dineIn')
            }
            status={sectionStatus(3, 2)}
            onEdit={() => setCompletedSteps((s) => ({ ...s, 3: false }))}
          >
            {orderType === 'DELIVERY' && (
              <>
                <FormField
                  id="addr-line1"
                  label={t('sections.whereWhen.address.line1')}
                  required
                  size="lg"
                  error={form.formState.errors.address?.line1?.message}
                >
                  <input
                    {...form.register('address.line1')}
                    type="text"
                    autoComplete="street-address"
                    placeholder={t('sections.whereWhen.address.line1Placeholder')}
                    className="h-12 w-full rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 px-4 text-body text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                  />
                </FormField>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FormField
                    id="addr-apt"
                    label={t('sections.whereWhen.address.apartment')}
                    size="lg"
                    helper={t('sections.whereWhen.address.apartmentHelper')}
                  >
                    <input
                      {...form.register('address.apartment')}
                      type="text"
                      autoComplete="address-line2"
                      placeholder={t('sections.whereWhen.address.apartmentPlaceholder')}
                      className="h-12 w-full rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 px-4 text-body text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                    />
                  </FormField>
                  <FormField
                    id="addr-city"
                    label={t('sections.whereWhen.address.city')}
                    required
                    size="lg"
                    error={form.formState.errors.address?.city?.message}
                  >
                    <input
                      {...form.register('address.city')}
                      type="text"
                      autoComplete="address-level2"
                      placeholder={t('sections.whereWhen.address.cityPlaceholder')}
                      className="h-12 w-full rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 px-4 text-body text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                    />
                  </FormField>
                </div>

                <Controller
                  name="address.geoPoint"
                  control={form.control}
                  render={({ field }) => (
                    <DeliveryLocationPicker
                      zones={zonesQuery.data?.zones ?? []}
                      center={restaurant?.geoPoint ?? { lat: 52.2297, lng: 21.0122 }}
                      value={field.value ?? null}
                      onChange={(v) => {
                        // Default country to PL when first pin drops.
                        if (!form.getValues('address.country')) {
                          form.setValue('address.country', 'PL', {
                            shouldValidate: false,
                          });
                        }
                        field.onChange(v);
                      }}
                      status={pickerStatus}
                      height={360}
                    />
                  )}
                />

                {/* Hidden country — defaulted to PL on first pin. */}
                <input type="hidden" {...form.register('address.country')} value="PL" />

                {!inZone && geoPoint && !zoneCheck.isFetching && (
                  <div
                    role="alert"
                    className="flex flex-col gap-2 rounded-card border border-negative/30 bg-negative/10 p-3 text-small text-negative sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span>{t('sections.whereWhen.outOfZone')}</span>
                    <button
                      type="button"
                      onClick={() => {
                        form.setValue('orderType', 'PICKUP');
                        setCompletedSteps((s) => ({ ...s, 1: true, 3: false }));
                      }}
                      className="self-start rounded-button border border-negative/50 px-3 py-1 text-small font-medium hover:bg-negative/20"
                    >
                      {t('sections.whereWhen.switchToPickup')}
                    </button>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <span className="text-small font-medium text-fg">
                    {t('sections.whereWhen.when')}
                  </span>
                  <Controller
                    name="timeSlot"
                    control={form.control}
                    render={({ field }) => (
                      <TimeSlotPicker
                        mode="delivery"
                        value={field.value as TimeSlotValue}
                        onChange={field.onChange}
                        earliestSlotMinutes={20}
                      />
                    )}
                  />
                </div>
              </>
            )}

            {orderType === 'PICKUP' && (
              <Controller
                name="timeSlot"
                control={form.control}
                render={({ field }) => (
                  <TimeSlotPicker
                    mode="pickup"
                    value={field.value as TimeSlotValue}
                    onChange={field.onChange}
                    earliestSlotMinutes={10}
                  />
                )}
              />
            )}

            {orderType === 'DINE_IN' && (
              <FormField
                id="table-num"
                label={t('sections.whereWhen.table.label')}
                required
                size="lg"
                helper={t('sections.whereWhen.table.helper')}
                error={form.formState.errors.tableNumber?.message}
              >
                <input
                  {...form.register('tableNumber')}
                  type="number"
                  min={1}
                  max={99}
                  placeholder={t('sections.whereWhen.table.placeholder')}
                  className="h-12 w-full rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 px-4 text-body text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                />
              </FormField>
            )}

            <button
              type="button"
              onClick={() => continueFrom(3)}
              disabled={orderType === 'DELIVERY' && (!geoPoint || !inZone || zoneCheck.isFetching)}
              className="self-start rounded-button bg-accent px-5 py-2 text-small font-medium text-text-on-accent hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('continue')}
            </button>
          </CheckoutSection>

          {/* 4 — Notes (optional) — only unlocked after step 3 */}
          <CheckoutSection
            step={4}
            title={t('sections.notes.title')}
            status={sectionStatus(4, 3)}
            onEdit={() => setCompletedSteps((s) => ({ ...s, 4: false }))}
          >
            <FormField id="order-notes" label="" size="md" helper={t('sections.notes.helper')}>
              <textarea
                {...form.register('orderNotes')}
                rows={3}
                maxLength={500}
                placeholder={t('sections.notes.placeholder')}
                className="w-full rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 p-3 text-small text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
            </FormField>
            <button
              type="button"
              onClick={() => setCompletedSteps((s) => ({ ...s, 4: true }))}
              className="self-start rounded-button border border-border/[var(--border-strong-alpha)] bg-transparent px-5 py-2 text-small font-medium text-fg hover:bg-surface-warm/30"
            >
              {form.watch('orderNotes') ? t('continue') : t('skip')}
            </button>
          </CheckoutSection>

          {/* 5 — Payment */}
          <CheckoutSection
            step={5}
            title={t('sections.payment.title')}
            status={sectionStatus(5, 4)}
            onEdit={() => setCompletedSteps((s) => ({ ...s, 5: false }))}
          >
            <Controller
              name="paymentMethod"
              control={form.control}
              render={({ field }) => {
                const visible = PAYMENT_OPTIONS.filter((o) => {
                  if (o.id === 'cod') {
                    return orderType === 'DELIVERY' && Number.parseFloat(summary.total) < 100;
                  }
                  return true;
                });
                return (
                  <RadioCardGroup
                    ariaLabel={t('sections.payment.ariaLabel')}
                    layout="vertical"
                    rowVariant
                    options={visible}
                    value={field.value}
                    onChange={field.onChange}
                  />
                );
              }}
            />
            {form.watch('paymentMethod') === 'card' && stripeConfig && stripeElementsEnabled && (
              <StripePaymentForm
                publishableKey={stripeConfig.publishableKey}
                orderId={createdOrderId}
                submitRef={stripeSubmitRef}
              />
            )}
            <button
              type="button"
              onClick={() => continueFrom(5)}
              className="self-start rounded-button bg-accent px-5 py-2 text-small font-medium text-text-on-accent hover:bg-accent-hover"
            >
              {t('continue')}
            </button>
          </CheckoutSection>

          {/* 6 — Tip — only unlocked after step 5 */}
          <CheckoutSection step={6} title={t('sections.tip.title')} status={sectionStatus(6, 5)}>
            <Controller
              name="tipAmount"
              control={form.control}
              render={({ field }) => (
                <TipPicker
                  subtotal={subtotal}
                  value={field.value}
                  onChange={field.onChange}
                  currency={currency}
                  labels={{
                    noTip: t('sections.tip.noTip'),
                    other: t('sections.tip.other'),
                    disclaimer: t('sections.tip.disclaimer'),
                    groupLabel: t('sections.tip.groupLabel'),
                  }}
                />
              )}
            />
          </CheckoutSection>

          {orderType === 'DELIVERY' && belowMinimum && (
            <div
              role="alert"
              className="rounded-card border border-warning/30 bg-warning/10 p-3 text-small text-warning"
            >
              {t('errors.minOrderInline', {
                amount: formatMoney(minOrderAmount, currency),
              })}
            </div>
          )}

          {submitError && (
            <div
              role="alert"
              className="rounded-card border border-negative/30 bg-negative/10 p-3 text-small text-negative"
            >
              {submitError}
            </div>
          )}
        </form>

        <div>
          <OrderSummaryPanel
            variant="sticky-rail"
            lines={lines}
            subtotal={subtotal}
            delivery={summary.delivery}
            discount={summary.discount}
            tip={tipAmount}
            total={summary.total}
            currency={currency}
            showEditCart={false}
            labels={{
              title: t('summary.title'),
              regionLabel: t('summary.regionLabel'),
              subtotal: t('summary.subtotal'),
              delivery: t('summary.delivery'),
              tip: t('summary.tip'),
              total: t('summary.total'),
              notePrefix: t('summary.notePrefix'),
              editCart: t('summary.editCart'),
              formatDiscount: (label) => t('summary.discount', { label }),
            }}
            promoInput={
              <PromoCodeInput
                applied={appliedPromo}
                onApply={handleApplyPromo}
                onRemove={() => setAppliedPromo(null)}
                labels={{
                  trigger: t('promo.trigger'),
                  placeholder: t('promo.placeholder'),
                  apply: t('promo.apply'),
                  applying: t('promo.applying'),
                  inputAriaLabel: t('promo.inputAriaLabel'),
                  removeAriaLabel: t('promo.removeAriaLabel'),
                }}
              />
            }
            ctaSlot={
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={submitting || (orderType === 'DELIVERY' && (!inZone || belowMinimum))}
                  className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-button bg-accent text-[15px] font-medium text-text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> {t('cta.placing')}
                    </>
                  ) : (
                    <>
                      {t('cta.placeOrderTotal', {
                        total: formatMoney(summary.total, currency),
                      })}
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
                <p className="text-center text-[12px] text-fg-subtle">
                  {t.rich('cta.terms', {
                    termsLink: (chunks) => (
                      <Link href="#" className="underline">
                        {chunks}
                      </Link>
                    ),
                    privacyLink: (chunks) => (
                      <Link href="#" className="underline">
                        {chunks}
                      </Link>
                    ),
                  })}
                </p>
                <PaymentLogos />
              </div>
            }
          />
        </div>
      </div>
    </Container>
  );
}
