'use client';

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
  DeliveryLocationPicker,
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
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';

const ORDER_TYPE_OPTIONS: RadioCardOption<OrderType>[] = [
  {
    id: 'DELIVERY',
    label: 'Delivery',
    description: '20–40 min',
    icon: <Truck size={22} strokeWidth={1.75} />,
  },
  {
    id: 'PICKUP',
    label: 'Pickup',
    description: 'Ready in 10–15 min',
    icon: <ShoppingBag size={22} strokeWidth={1.75} />,
    badge: 'No fee',
    badgeTone: 'positive',
  },
  {
    id: 'DINE_IN',
    label: 'Eat in',
    description: 'Order from your table',
    icon: <Utensils size={22} strokeWidth={1.75} />,
  },
];

const PAYMENT_OPTIONS: RadioCardOption<CheckoutPaymentMethod>[] = [
  {
    id: 'card',
    label: 'Card',
    description: 'Visa, Mastercard, Amex.',
    icon: <CreditCard size={22} strokeWidth={1.75} />,
  },
  {
    id: 'blik',
    label: 'BLIK',
    description: 'Enter the 6-digit code from your bank app.',
    icon: <span className="text-[12px] font-extrabold tracking-tight text-fg">BLIK</span>,
  },
  {
    id: 'cod',
    label: 'Cash on delivery',
    description: 'Pay the driver in cash when it arrives.',
    icon: <Banknote size={22} strokeWidth={1.75} />,
  },
];

// Mock promo store — wires to a future server endpoint. For now, in-memory.
const MOCK_PROMOS: Record<
  string,
  { discountPercent?: number; discountAmount?: string; label: string }
> = {
  BAKLAVA: { discountPercent: 15, label: '15% off — first order' },
  STUDENT: { discountAmount: '5.00', label: '5,00 zł off' },
};

function computeSummary(
  subtotal: string,
  orderType: OrderType,
  appliedPromo: AppliedPromo | null,
  tipAmount: string,
  deliveryFee: string,
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
      discountLabel = promo.label;
    }
  }
  const sub = Number.parseFloat(subtotal);
  const subAfter = sub - discountAmount;
  let deliveryAmount = 0;
  let deliveryLabel: string | undefined;
  if (orderType === 'PICKUP' || orderType === 'DINE_IN') {
    deliveryLabel = 'Free';
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
  const router = useRouter();
  const cartQuery = useCart();
  const createOrder = useCreateOrder();
  const user = useAuthStore((s) => s.user);
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

  const orderType = form.watch('orderType');
  const tipAmount = form.watch('tipAmount');
  const geoPoint = form.watch('address.geoPoint');
  const summary = React.useMemo(
    () => computeSummary(subtotal, orderType, appliedPromo, tipAmount, defaultDeliveryFee),
    [subtotal, orderType, appliedPromo, tipAmount, defaultDeliveryFee],
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
        setSubmitError('Drop a pin inside our delivery area to continue.');
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
    if (!found) return { ok: false as const, error: 'Code not valid.' };
    setAppliedPromo({ code, label: found.label });
    return { ok: true as const, label: found.label };
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    if (values.orderType === 'DELIVERY' && belowMinimum) {
      setSubmitError(`Minimum order for delivery is ${minOrderAmount} — add a bit more.`);
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
          setSubmitError('Please confirm your delivery address on the map.');
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
          throw new Error('Card form did not initialise. Please retry.');
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
      const msg = err instanceof Error ? err.message : 'Could not place your order.';
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
          title="Your cart is empty"
          description="Add something tasty before checking out."
          action={{ label: 'Browse menu', href: '/menu' }}
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
            ? { kind: 'error' as const, message: 'Could not check the address. Try again.' }
            : inZone
              ? { kind: 'in-zone' as const, zoneName: checkedZoneName ?? 'Delivery area' }
              : { kind: 'out-of-zone' as const };

  return (
    <Container className="py-12">
      <Link
        href="/menu"
        className="inline-flex items-center gap-1.5 text-small text-fg-muted transition-colors hover:text-accent"
      >
        <ArrowLeft size={14} /> Back to menu
      </Link>
      <h1
        className="mt-4 font-display text-h2 text-fg sm:text-h1"
        style={{ textWrap: 'balance' as React.CSSProperties['textWrap'] }}
      >
        Almost there.
      </h1>

      <div className="mt-10 grid gap-8 lg:grid-cols-[62fr_38fr]">
        <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
          {/* 1 — Order type */}
          <CheckoutSection
            step={1}
            title="How do you want it?"
            status={completedSteps[1] ? 'complete' : 'active'}
            summary={
              orderType === 'DELIVERY' ? 'Delivery' : orderType === 'PICKUP' ? 'Pickup' : 'Eat in'
            }
            onEdit={() => setCompletedSteps((s) => ({ ...s, 1: false }))}
          >
            <Controller
              name="orderType"
              control={form.control}
              render={({ field }) => (
                <RadioCardGroup
                  ariaLabel="Order type"
                  layout="horizontal"
                  options={ORDER_TYPE_OPTIONS.map((o) => ({
                    ...o,
                    badge:
                      o.id === 'DELIVERY'
                        ? `${defaultDeliveryFee} ${currency === 'PLN' ? 'zł' : currency}`
                        : o.badge,
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
              Continue
            </button>
          </CheckoutSection>

          {/* 2 — Contact */}
          <CheckoutSection
            step={2}
            title="Contact"
            status={sectionStatus(2, 1)}
            summary={`${form.watch('contact.name')} · +${form.watch('contact.phone')}`}
            onEdit={() => setCompletedSteps((s) => ({ ...s, 2: false }))}
            rightSlot={
              !user && (
                <Link href="/login" className="text-small text-accent hover:underline">
                  Already a customer? Sign in →
                </Link>
              )
            }
          >
            <FormField
              id="contact-name"
              label="Name"
              required
              size="lg"
              error={form.formState.errors.contact?.name?.message}
            >
              <input
                {...form.register('contact.name')}
                type="text"
                autoComplete="name"
                placeholder="Jan Kowalski"
                className="h-12 w-full rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 px-4 text-body text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
            </FormField>
            <FormField
              id="contact-phone"
              label="Phone"
              required
              size="lg"
              prefix="+48"
              helper="We'll text you when your order is on the way."
              error={form.formState.errors.contact?.phone?.message}
            >
              <input
                {...form.register('contact.phone')}
                type="tel"
                autoComplete="tel"
                placeholder="512 345 678"
              />
            </FormField>
            <FormField
              id="contact-email"
              label="Email"
              required
              size="lg"
              helper="For the receipt and order confirmation."
              error={form.formState.errors.contact?.email?.message}
            >
              <input
                {...form.register('contact.email')}
                type="email"
                autoComplete="email"
                placeholder="jan@example.com"
                className="h-12 w-full rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 px-4 text-body text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
            </FormField>
            <button
              type="button"
              onClick={() => continueFrom(2)}
              className="self-start rounded-button bg-accent px-5 py-2 text-small font-medium text-text-on-accent hover:bg-accent-hover"
            >
              Continue
            </button>
          </CheckoutSection>

          {/* 3 — Where + When */}
          <CheckoutSection
            step={3}
            title={
              orderType === 'DELIVERY'
                ? 'Where + When'
                : orderType === 'PICKUP'
                  ? 'When to pick up'
                  : 'Your table'
            }
            status={sectionStatus(3, 2)}
            onEdit={() => setCompletedSteps((s) => ({ ...s, 3: false }))}
          >
            {orderType === 'DELIVERY' && (
              <>
                <FormField
                  id="addr-line1"
                  label="Street + number"
                  required
                  size="lg"
                  error={form.formState.errors.address?.line1?.message}
                >
                  <input
                    {...form.register('address.line1')}
                    type="text"
                    autoComplete="street-address"
                    placeholder="ul. Marszałkowska 102"
                    className="h-12 w-full rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 px-4 text-body text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                  />
                </FormField>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FormField id="addr-apt" label="Apt / Floor" size="lg" helper="Optional">
                    <input
                      {...form.register('address.apartment')}
                      type="text"
                      autoComplete="address-line2"
                      placeholder="Apt 5B / Floor 3"
                      className="h-12 w-full rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 px-4 text-body text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                    />
                  </FormField>
                  <FormField
                    id="addr-city"
                    label="City"
                    required
                    size="lg"
                    error={form.formState.errors.address?.city?.message}
                  >
                    <input
                      {...form.register('address.city')}
                      type="text"
                      autoComplete="address-level2"
                      placeholder="Warszawa"
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
                    <span>
                      Sorry — we don't deliver to this spot yet. Pickup is still available.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        form.setValue('orderType', 'PICKUP');
                        setCompletedSteps((s) => ({ ...s, 1: true, 3: false }));
                      }}
                      className="self-start rounded-button border border-negative/50 px-3 py-1 text-small font-medium hover:bg-negative/20"
                    >
                      Switch to pickup
                    </button>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <span className="text-small font-medium text-fg">When</span>
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
                label="Table number"
                required
                size="lg"
                helper="Look for the number on your table, or scan the QR."
                error={form.formState.errors.tableNumber?.message}
              >
                <input
                  {...form.register('tableNumber')}
                  type="number"
                  min={1}
                  max={99}
                  placeholder="12"
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
              Continue
            </button>
          </CheckoutSection>

          {/* 4 — Notes (optional) — only unlocked after step 3 */}
          <CheckoutSection
            step={4}
            title="Anything else? (optional)"
            status={sectionStatus(4, 3)}
            onEdit={() => setCompletedSteps((s) => ({ ...s, 4: false }))}
          >
            <FormField
              id="order-notes"
              label=""
              size="md"
              helper="For the kitchen — 500 chars max."
            >
              <textarea
                {...form.register('orderNotes')}
                rows={3}
                maxLength={500}
                placeholder="Special instructions for the kitchen…"
                className="w-full rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 p-3 text-small text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
            </FormField>
            <button
              type="button"
              onClick={() => setCompletedSteps((s) => ({ ...s, 4: true }))}
              className="self-start rounded-button border border-border/[var(--border-strong-alpha)] bg-transparent px-5 py-2 text-small font-medium text-fg hover:bg-surface-warm/30"
            >
              {form.watch('orderNotes') ? 'Continue' : 'Skip'}
            </button>
          </CheckoutSection>

          {/* 5 — Payment */}
          <CheckoutSection
            step={5}
            title="Payment"
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
                    ariaLabel="Payment method"
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
              Continue
            </button>
          </CheckoutSection>

          {/* 6 — Tip — only unlocked after step 5 */}
          <CheckoutSection
            step={6}
            title="Add a tip for the team? (optional)"
            status={sectionStatus(6, 5)}
          >
            <Controller
              name="tipAmount"
              control={form.control}
              render={({ field }) => (
                <TipPicker
                  subtotal={subtotal}
                  value={field.value}
                  onChange={field.onChange}
                  currency={currency}
                />
              )}
            />
          </CheckoutSection>

          {orderType === 'DELIVERY' && belowMinimum && (
            <div
              role="alert"
              className="rounded-card border border-warning/30 bg-warning/10 p-3 text-small text-warning"
            >
              Minimum order for delivery is{' '}
              <span className="font-medium">
                {minOrderAmount} {currency === 'PLN' ? 'zł' : currency}
              </span>
              . Add a little more to your cart.
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
            promoInput={
              <PromoCodeInput
                applied={appliedPromo}
                onApply={handleApplyPromo}
                onRemove={() => setAppliedPromo(null)}
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
                      <Loader2 size={18} className="animate-spin" /> Placing order…
                    </>
                  ) : (
                    <>
                      Place order · {summary.total} {currency === 'PLN' ? 'zł' : currency}
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
                <p className="text-center text-[12px] text-fg-subtle">
                  By placing this order, you agree to our{' '}
                  <Link href="#" className="underline">
                    Terms
                  </Link>{' '}
                  and{' '}
                  <Link href="#" className="underline">
                    Privacy Policy
                  </Link>
                  .
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
