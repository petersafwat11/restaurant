'use client';

import { useCartSessionKey } from '@/components/cart-session-provider';
import { useAddresses } from '@/features/addresses/hooks';
import { useApplyCoupon, useCart, useRemoveCoupon, useSetCartLoyalty } from '@/features/cart/hooks';
import { cartItemToDisplay } from '@/features/cart/to-display';
import { PaymentLogos } from '@/features/checkout/components/payment-logos';
import { StripePaymentForm } from '@/features/checkout/components/stripe-payment-form';
import { estimateEtaKey, estimatedRangeFor } from '@/features/checkout/estimate';
import { useCheckoutQuote } from '@/features/checkout/hooks/use-checkout-quote';
import { useFeatureFlag } from '@/features/feature-flags/hooks';
import { useLoyaltyAccount, useLoyaltyRedeemQuote } from '@/features/loyalty/hooks';
import { useCreateOrder } from '@/features/orders/hooks';
import { useRestaurant } from '@/features/restaurants/hooks/use-restaurant';
import { useAuthStore } from '@/stores/auth-store';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  type CheckoutFormInput,
  type CheckoutPaymentMethod,
  type OrderType,
  type PaymentMethodKind,
} from '@repo/types';
import { CheckoutFormSchema } from '@repo/types';
import {
  CheckoutSection,
  type CheckoutSectionStatus,
  Container,
  type DeliveryRow,
  EmptyState,
  FormField,
  type LoyaltyApplyResult,
  LoyaltyRedeemInput,
  OrderSummaryPanel,
  type PromoApplyResult,
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
import { formatMoney, isWithinRadiusKm } from '@repo/utils';
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

export function CheckoutApp() {
  const t = useTranslations('web.shop.checkout');
  // The indicative ETA strings (eta.*) live in the success-page namespace, which
  // is the single source so the order-type cards and the success page never
  // diverge. See features/checkout/estimate.ts.
  const tEta = useTranslations('web.shop.checkoutSuccess');
  const router = useRouter();
  const cartQuery = useCart();
  const createOrder = useCreateOrder();
  const user = useAuthStore((s) => s.user);
  // The API derives identity from either the authed user or a `sessionKey`
  // in the request body. For guests we forward the cart session cookie's
  // value so the server can resolve their cart and attach the order.
  const cartSessionKey = useCartSessionKey();
  // Saved addresses for the authed user. Empty (and disabled fetch) for guests.
  const addressesQuery = useAddresses();
  const restaurantQuery = useRestaurant();
  // Loyalty: balance + server-validated redemption. Auth-only — the query 401s
  // silently for guests, and the redeem UI is gated on `user` below.
  const loyaltyAccountQuery = useLoyaltyAccount();
  const redeemQuote = useLoyaltyRedeemQuote();
  const setCartLoyalty = useSetCartLoyalty();
  // Real coupon apply/remove — replaces the old client-side MOCK_PROMOS. Both
  // atomically swap the cart query/store with the API response, which busts the
  // checkout quote (keyed on cart.updatedAt) so totals re-fetch authoritatively.
  const applyCoupon = useApplyCoupon();
  const removeCoupon = useRemoveCoupon();

  const restaurant = restaurantQuery.data;

  const [appliedLoyalty, setAppliedLoyalty] = React.useState<{
    points: number;
    discountAmount: string;
  } | null>(null);
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
      acceptedTerms: false,
    },
  });

  // The auth store and /addresses/list both hydrate after first render, so the
  // form's `defaultValues` above land empty for an already-signed-in user.
  // Prefill any fields the user hasn't touched yet — manually edited values
  // (tracked via dirtyFields) are preserved.
  const hasPrefilledRef = React.useRef(false);
  React.useEffect(() => {
    if (!user) return;
    if (hasPrefilledRef.current) return;
    const dirty = form.formState.dirtyFields;
    const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    if (!dirty.contact?.name && fullName) form.setValue('contact.name', fullName);
    if (!dirty.contact?.phone && user.phone) form.setValue('contact.phone', user.phone);
    if (!dirty.contact?.email && user.email) form.setValue('contact.email', user.email);

    // Pre-select a saved address: prefer the user's default, otherwise the
    // first. Skip addresses without a geoPoint — the form requires one and
    // the user can drop a pin themselves on the map picker.
    const candidate =
      addressesQuery.data?.find((a) => a.isDefault) ?? addressesQuery.data?.[0] ?? null;
    if (candidate?.geoPoint && !dirty.address) {
      form.setValue('address', {
        line1: candidate.line1,
        apartment: candidate.line2 ?? undefined,
        city: candidate.city,
        country: candidate.country,
        geoPoint: candidate.geoPoint,
      });
    }
    // Mark prefilled only once both user and (if there are any) addresses have
    // resolved — that way we don't burn the ref before the address arrives.
    if (!addressesQuery.isLoading) hasPrefilledRef.current = true;
  }, [user, addressesQuery.data, addressesQuery.isLoading, form]);

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

  // Indicative ready-time, derived from the live restaurant config (same source
  // as the success page) rather than a hardcoded string.
  const etaDescription = React.useCallback(
    (type: OrderType) => {
      const eta = estimateEtaKey(estimatedRangeFor(restaurant, type), type);
      return tEta(eta.key, eta.values);
    },
    [tEta, restaurant],
  );

  const ORDER_TYPE_OPTIONS: RadioCardOption<OrderType>[] = React.useMemo(
    () => [
      {
        id: 'DELIVERY',
        label: t('sections.orderType.options.DELIVERY.label'),
        description: etaDescription('DELIVERY'),
        icon: <Truck size={22} strokeWidth={1.75} />,
      },
      {
        id: 'PICKUP',
        label: t('sections.orderType.options.PICKUP.label'),
        description: etaDescription('PICKUP'),
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
    [t, etaDescription],
  );

  // Online payments (card / BLIK via Stripe) are "ready" only when the
  // `payments.stripe_elements` flag is on AND the backend returned a publishable
  // key. Until then those methods are disabled and cash-on-delivery is the only
  // way to pay. This single flag drives every payment-method decision below.
  const onlinePaymentsReady = stripeElementsEnabled && !!stripeConfig?.publishableKey;

  const orderType = form.watch('orderType');
  const tipAmount = form.watch('tipAmount');
  const geoPoint = form.watch('address.geoPoint');

  // Server-authoritative price quote — the single source of every money value
  // shown in the summary. Re-quotes when orderType, tip, or the cart (items,
  // coupon, loyalty — all reflected in cart.updatedAt) change.
  const quoteQuery = useCheckoutQuote({
    orderType,
    tipAmount,
    cartVersion: cart?.updatedAt ?? '',
    enabled: !!cart && lines.length > 0,
  });
  const quote = quoteQuery.data;

  // Display rows derived from the quote strings — never recomputed client-side.
  const summary = React.useMemo(() => {
    const delivery: DeliveryRow =
      orderType === 'DELIVERY'
        ? { amount: quote?.deliveryFee ?? defaultDeliveryFee }
        : { label: t('free') };
    return {
      delivery,
      discount:
        cart?.appliedCoupon && quote
          ? { amount: quote.couponDiscount, label: cart.appliedCoupon.code }
          : undefined,
      loyaltyDiscount:
        appliedLoyalty && quote
          ? {
              amount: quote.loyaltyDiscount,
              label: t('loyalty.discountLabel', { points: appliedLoyalty.points }),
            }
          : undefined,
      // Falls back to the cart subtotal only until the first quote resolves; the
      // place-order CTA is disabled until `quote` is present.
      total: quote?.grandTotal ?? subtotal,
    };
  }, [quote, cart?.appliedCoupon, appliedLoyalty, orderType, defaultDeliveryFee, subtotal, t]);

  // ---- Loyalty redemption --------------------------------------------------
  const loyaltyBalance = user ? (loyaltyAccountQuery.data?.points ?? 0) : 0;
  // 1 point = 0.01 of the currency; the server also caps redemption at the
  // order subtotal, so mirror that ceiling for the input.
  const maxLoyaltyPoints = React.useMemo(
    () => Math.max(0, Math.min(loyaltyBalance, Math.floor(Number.parseFloat(subtotal) * 100))),
    [loyaltyBalance, subtotal],
  );

  const handleApplyLoyalty = async (points: number): Promise<LoyaltyApplyResult> => {
    try {
      const quote = await redeemQuote.mutateAsync({ points, subtotal });
      if (quote.appliablePoints <= 0) {
        return { ok: false, error: t('loyalty.cannotApply') };
      }
      await setCartLoyalty.mutateAsync({ points: quote.appliablePoints });
      setAppliedLoyalty({ points: quote.appliablePoints, discountAmount: quote.discountAmount });
      return { ok: true };
    } catch {
      return { ok: false, error: t('loyalty.error') };
    }
  };

  const handleRemoveLoyalty = () => {
    setAppliedLoyalty(null);
    setCartLoyalty.mutate({ points: 0 });
  };

  // Reflect any redemption intent already persisted on the cart (e.g. the user
  // set points, left, and came back) once — re-quoting to show the discount.
  const cartLoyaltyPoints = cart?.loyaltyPointsToRedeem ?? 0;
  const loyaltyHydratedRef = React.useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: one-shot hydration guarded by ref; stable mutation refs intentionally omitted.
  React.useEffect(() => {
    if (loyaltyHydratedRef.current || !user) return;
    if (cartLoyaltyPoints <= 0 || Number.parseFloat(subtotal) <= 0) return;
    loyaltyHydratedRef.current = true;
    (async () => {
      try {
        const quote = await redeemQuote.mutateAsync({ points: cartLoyaltyPoints, subtotal });
        if (quote.appliablePoints > 0) {
          setAppliedLoyalty({
            points: quote.appliablePoints,
            discountAmount: quote.discountAmount,
          });
          if (quote.appliablePoints !== cartLoyaltyPoints) {
            await setCartLoyalty.mutateAsync({ points: quote.appliablePoints }).catch(() => {});
          }
        }
      } catch {
        /* server re-validates at order creation */
      }
    })();
  }, [user, cartLoyaltyPoints, subtotal]);

  // If the subtotal changes while points are applied, re-quote and clamp so the
  // atomic server burn can't fail with a ConflictException at order creation.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally keyed on subtotal only; stable refs/values omitted to avoid a re-quote loop.
  React.useEffect(() => {
    if (!appliedLoyalty) return;
    let cancelled = false;
    (async () => {
      try {
        const quote = await redeemQuote.mutateAsync({ points: appliedLoyalty.points, subtotal });
        if (cancelled) return;
        if (quote.appliablePoints <= 0) {
          setAppliedLoyalty(null);
          await setCartLoyalty.mutateAsync({ points: 0 }).catch(() => {});
        } else if (
          quote.appliablePoints !== appliedLoyalty.points ||
          quote.discountAmount !== appliedLoyalty.discountAmount
        ) {
          setAppliedLoyalty({
            points: quote.appliablePoints,
            discountAmount: quote.discountAmount,
          });
          await setCartLoyalty.mutateAsync({ points: quote.appliablePoints }).catch(() => {});
        }
      } catch {
        /* leave as-is; server re-validates */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [subtotal]);

  // Is the dropped pin within the restaurant's delivery radius? Checked
  // client-side for instant feedback; the API re-checks on order creation.
  const restaurantGeo = restaurant?.geoPoint ?? null;
  const deliveryRadiusKm = restaurant?.deliveryRadiusKm;
  const inZone =
    geoPoint != null &&
    restaurantGeo != null &&
    deliveryRadiusKm != null &&
    isWithinRadiusKm(restaurantGeo, geoPoint, deliveryRadiusKm);
  const belowMinimum =
    orderType === 'DELIVERY' && Number.parseFloat(subtotal) < Number.parseFloat(minOrderAmount);

  // Payment methods, computed from provider readiness + order type:
  //  - card / BLIK are disabled (with a tooltip) until online payments are ready.
  //  - cash-on-delivery is relabelled per order type ("Cash on delivery" /
  //    "Pay at pickup" / "Pay at the table") and is the universal fallback while
  //    online payments are off (shown for every order type, no value cap). When
  //    online IS ready, COD reverts to its secondary role: delivery orders under
  //    100 only, so large/dine-in/pickup orders go through the card flow.
  const paymentOptions = React.useMemo<RadioCardOption<CheckoutPaymentMethod>[]>(() => {
    const codTypeKey =
      orderType === 'PICKUP' ? 'pickup' : orderType === 'DINE_IN' ? 'dineIn' : 'delivery';
    const options: RadioCardOption<CheckoutPaymentMethod>[] = [
      {
        id: 'card',
        label: t('sections.payment.options.card.label'),
        description: t('sections.payment.options.card.description'),
        icon: <CreditCard size={22} strokeWidth={1.75} />,
        disabled: !onlinePaymentsReady,
        disabledReason: onlinePaymentsReady ? undefined : t('sections.payment.comingSoon'),
      },
      {
        id: 'blik',
        label: t('sections.payment.options.blik.label'),
        description: t('sections.payment.options.blik.description'),
        icon: <span className="text-[12px] font-extrabold tracking-tight text-fg">BLIK</span>,
        disabled: !onlinePaymentsReady,
        disabledReason: onlinePaymentsReady ? undefined : t('sections.payment.comingSoon'),
      },
    ];
    const codVisible =
      !onlinePaymentsReady || (orderType === 'DELIVERY' && Number.parseFloat(summary.total) < 100);
    if (codVisible) {
      options.push({
        id: 'cod',
        label: t(`sections.payment.options.cod.${codTypeKey}.label`),
        description: t(`sections.payment.options.cod.${codTypeKey}.description`),
        icon: <Banknote size={22} strokeWidth={1.75} />,
      });
    }
    return options;
  }, [t, onlinePaymentsReady, orderType, summary.total]);

  // Keep the selected method valid: if it's disabled or hidden (e.g. online
  // payments aren't ready, or COD dropped off after the order type changed),
  // snap to the first selectable option (card when ready, else cash).
  const selectedMethod = form.watch('paymentMethod');
  React.useEffect(() => {
    const current = paymentOptions.find((o) => o.id === selectedMethod);
    if (current && !current.disabled) return;
    const firstSelectable = paymentOptions.find((o) => !o.disabled);
    if (firstSelectable && firstSelectable.id !== selectedMethod) {
      form.setValue('paymentMethod', firstSelectable.id, { shouldValidate: false });
    }
  }, [paymentOptions, selectedMethod, form]);

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
      // Block continue: must have a pin AND it must be within delivery range.
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

  // Real server-validated coupon apply/remove. The hooks swap the cart query
  // with the API response, which re-quotes the totals (keyed on cart.updatedAt).
  const handleApplyPromo = async (code: string): Promise<PromoApplyResult> => {
    try {
      const next = await applyCoupon.mutateAsync({ code });
      const applied = next.appliedCoupon;
      return {
        ok: true,
        label: applied
          ? t('promo.appliedLabel', { amount: formatMoney(applied.discountAmount, currency) })
          : undefined,
      };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : t('promo.notValid') };
    }
  };
  const handleRemovePromo = () => removeCoupon.mutate();

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    if (values.orderType === 'DELIVERY' && belowMinimum) {
      setSubmitError(t('errors.minOrderToast', { amount: formatMoney(minOrderAmount, currency) }));
      return;
    }
    // Only cash-on-delivery is finalized server-side at order creation (the
    // guest-safe path). Card/BLIK leave the order PENDING and are settled by
    // the Stripe Elements flow below — which only runs when it's actually ready.
    const isOnlineMethod = values.paymentMethod === 'card' || values.paymentMethod === 'blik';
    const paymentMethodForApi: PaymentMethodKind | undefined =
      values.paymentMethod === 'cod' ? 'COD' : undefined;

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
        paymentMethod: paymentMethodForApi,
        acceptedTermsAt: new Date().toISOString(),
        // Only send sessionKey for guests; signed-in users are identified by
        // the bearer token and don't need it.
        ...(user ? {} : cartSessionKey ? { sessionKey: cartSessionKey } : {}),
      });

      // Stripe Elements two-phase flow: order is now PENDING; PaymentIntent
      // mounts, user confirms inline, webhook flips Payment.status → PAID.
      // Only reachable when online payments are ready (card/BLIK enabled).
      if (onlinePaymentsReady && stripeConfig && isOnlineMethod) {
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
    orderType !== 'DELIVERY' || !geoPoint
      ? { kind: 'idle' as const }
      : inZone
        ? { kind: 'in-range' as const }
        : { kind: 'out-of-range' as const };

  // Place-order CTA: the label reflects the method (cash → "Place order",
  // card/BLIK → "Pay"), and the button is blocked if the selected method is
  // somehow disabled (defence in depth — selection is auto-corrected above).
  const selectedOption = paymentOptions.find((o) => o.id === selectedMethod);
  const selectedMethodUsable = !!selectedOption && !selectedOption.disabled;
  const ctaIsPayment = selectedMethod === 'card' || selectedMethod === 'blik';
  const ctaLabel = ctaIsPayment
    ? t('cta.payNow', { total: formatMoney(summary.total, currency) })
    : t('cta.placeOrderTotal', { total: formatMoney(summary.total, currency) });

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

      {user && (
        <output className="mt-5 inline-flex flex-wrap items-center gap-2 rounded-full border border-border/[var(--border-alpha)] bg-surface-elevated px-4 py-2 text-small text-fg-muted shadow-sm">
          <span className="relative grid h-2 w-2 place-items-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-positive opacity-60" />
            <span className="relative h-2 w-2 rounded-full bg-positive" />
          </span>
          <span>
            {t('signedInBanner.prefix')}{' '}
            <span className="font-semibold text-fg">
              {`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email}
            </span>
          </span>
          <span className="text-fg-subtle">·</span>
          <span className="text-fg-subtle">{t('signedInBanner.detail')}</span>
        </output>
      )}

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
                  render={({ field }) =>
                    restaurant?.geoPoint ? (
                      <DeliveryLocationPicker
                        radiusKm={restaurant.deliveryRadiusKm}
                        center={restaurant.geoPoint}
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
                    ) : (
                      <div className="h-[360px] animate-pulse rounded-card border border-border/[var(--border-alpha)] bg-surface" />
                    )
                  }
                />

                {/* Hidden country — defaulted to PL on first pin. */}
                <input type="hidden" {...form.register('address.country')} value="PL" />

                {!inZone && geoPoint && (
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
                        timezone={restaurant?.timezone}
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
                    timezone={restaurant?.timezone}
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
              disabled={orderType === 'DELIVERY' && (!geoPoint || !inZone)}
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
              render={({ field }) => (
                <RadioCardGroup
                  ariaLabel={t('sections.payment.ariaLabel')}
                  layout="vertical"
                  rowVariant
                  options={paymentOptions}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            {onlinePaymentsReady &&
              stripeConfig &&
              (selectedMethod === 'card' || selectedMethod === 'blik') && (
                <StripePaymentForm
                  publishableKey={stripeConfig.publishableKey}
                  orderId={createdOrderId}
                  submitRef={stripeSubmitRef}
                  methodKind={selectedMethod === 'blik' ? 'BLIK' : 'STRIPE_CARD'}
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
            loyaltyDiscount={summary.loyaltyDiscount}
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
                applied={
                  cart?.appliedCoupon
                    ? {
                        code: cart.appliedCoupon.code,
                        label: t('promo.appliedLabel', {
                          amount: formatMoney(
                            quote?.couponDiscount ?? cart.appliedCoupon.discountAmount,
                            currency,
                          ),
                        }),
                      }
                    : null
                }
                onApply={handleApplyPromo}
                onRemove={handleRemovePromo}
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
            loyaltyInput={
              user && loyaltyBalance > 0 ? (
                <LoyaltyRedeemInput
                  maxPoints={maxLoyaltyPoints}
                  applied={
                    appliedLoyalty
                      ? {
                          points: appliedLoyalty.points,
                          label: t('loyalty.applied', {
                            points: appliedLoyalty.points,
                            amount: formatMoney(appliedLoyalty.discountAmount, currency),
                          }),
                        }
                      : null
                  }
                  onApply={handleApplyLoyalty}
                  onRemove={handleRemoveLoyalty}
                  labels={{
                    trigger: t('loyalty.trigger'),
                    balanceLabel: t('loyalty.balance', { points: loyaltyBalance }),
                    placeholder: t('loyalty.placeholder'),
                    apply: t('loyalty.apply'),
                    applying: t('loyalty.applying'),
                    useMax: t('loyalty.useMax'),
                    inputAriaLabel: t('loyalty.inputAriaLabel'),
                    removeAriaLabel: t('loyalty.removeAriaLabel'),
                    invalid: t('loyalty.invalid'),
                  }}
                />
              ) : undefined
            }
            ctaSlot={
              <div className="flex flex-col gap-3">
                <label className="flex items-start gap-2 text-[12px] text-fg-muted">
                  <input
                    type="checkbox"
                    {...form.register('acceptedTerms')}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-border/[var(--border-strong-alpha)] accent-accent"
                  />
                  <span>
                    {t.rich('cta.terms', {
                      termsLink: (chunks) => (
                        <Link href="/terms" className="underline">
                          {chunks}
                        </Link>
                      ),
                      privacyLink: (chunks) => (
                        <Link href="/privacy" className="underline">
                          {chunks}
                        </Link>
                      ),
                    })}
                  </span>
                </label>
                {form.formState.errors.acceptedTerms && (
                  <p role="alert" className="text-[12px] text-negative">
                    {form.formState.errors.acceptedTerms.message}
                  </p>
                )}
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={
                    submitting ||
                    !selectedMethodUsable ||
                    (orderType === 'DELIVERY' && (!inZone || belowMinimum))
                  }
                  className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-button bg-accent text-[15px] font-medium text-text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> {t('cta.placing')}
                    </>
                  ) : (
                    <>
                      {ctaLabel}
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
                <PaymentLogos />
              </div>
            }
          />
        </div>
      </div>
    </Container>
  );
}
