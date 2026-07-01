'use client';

import { usePageHeader } from '@/components/shell/page-title-context';
import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import {
  type RestaurantAdminDto,
  type UpdateRestaurantDto,
  getRestaurantLegalReadiness,
} from '@repo/types';
import { EmptyState, PageSpinner, SettingsAnchorNav, SettingsSectionCard, Switch } from '@repo/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Check,
  Compass,
  CreditCard,
  Landmark,
  Mail,
  Palette,
  Search,
  ToggleRight,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import * as React from 'react';

function MapLoadingFallback() {
  const t = useTranslations('admin.restaurant');
  return (
    <div className="grid h-[360px] place-items-center rounded-card border border-border/[var(--border-alpha)] bg-surface text-small text-fg-muted">
      {t('loadingMap')}
    </div>
  );
}

// Leaflet hard-requires `window` — load on the client only.
const DeliveryLocationPicker = dynamic(
  () => import('@repo/ui').then((m) => m.DeliveryLocationPicker),
  {
    ssr: false,
    loading: () => <MapLoadingFallback />,
  },
);

const DEFAULT_MAP_CENTER = { lat: 50.8478329, lng: 20.6231079 }; // Szef Donald, Ściegiennego (Kielce) fallback

const restaurantAdminKey = ['restaurant', 'admin'] as const;

interface FormState {
  name: string;
  slug: string;
  description: string;
  logoUrl: string;
  coverUrl: string;
  phone: string;
  email: string;
  timezone: string;
  currency: string;
  addrLine1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  lat: number | null;
  lng: number | null;
  isActive: boolean;
  acceptsReservations: boolean;
  acceptsDelivery: boolean;
  acceptsPickup: boolean;
  acceptsDineIn: boolean;
  // Indicative order-ready time ranges (minutes); null = not set. Min/Max are
  // set together with Min <= Max.
  estimatedDeliveryMinutesMin: number | null;
  estimatedDeliveryMinutesMax: number | null;
  estimatedPickupMinutesMin: number | null;
  estimatedPickupMinutesMax: number | null;
  // SEO / discovery
  cuisineRaw: string; // comma-separated input; split on submit
  priceRange: string; // schema.org priceRange — "$$" or a range like "20–40 zł"; '' = unset
  sameAsRaw: string; // one URL per line; split on submit
  // Legal entity (payment-provider readiness). '' = unset.
  legalName: string;
  nip: string;
  regon: string;
  krs: string;
  registryCourt: string;
  shareCapital: string;
  shareCapitalCurrency: string;
  registeredAddressSameAsTrading: boolean;
  regAddrLine1: string;
  regCity: string;
  regState: string;
  regZip: string;
  regCountry: string;
  // Payments & customer support
  supportEmail: string;
  supportPhone: string;
  complaintsEmail: string;
  privacyEmail: string;
  statementDescriptor: string;
}

function splitCsv(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Validates an estimated-time range pair. Returns the error kind, or null when
 * the pair is valid (both blank, or both set with min <= max). Mirrors the
 * server-side guard in `restaurants.service.update`.
 */
function rangeError(min: number | null, max: number | null): 'incomplete' | 'order' | null {
  if ((min === null) !== (max === null)) return 'incomplete';
  if (min !== null && max !== null && min > max) return 'order';
  return null;
}

function fromDto(r: RestaurantAdminDto): FormState {
  return {
    name: r.name,
    slug: r.slug,
    description: r.description ?? '',
    logoUrl: r.logoUrl ?? '',
    coverUrl: r.coverUrl ?? '',
    phone: r.phone,
    email: r.email,
    timezone: r.timezone,
    currency: r.currency,
    addrLine1: r.address.line1,
    city: r.address.city,
    state: r.address.state ?? '',
    zip: r.address.zip ?? '',
    country: r.address.country,
    lat: r.geoPoint?.lat ?? null,
    lng: r.geoPoint?.lng ?? null,
    isActive: r.isActive,
    acceptsReservations: r.acceptsReservations,
    acceptsDelivery: r.acceptsDelivery,
    acceptsPickup: r.acceptsPickup,
    acceptsDineIn: r.acceptsDineIn,
    estimatedDeliveryMinutesMin: r.estimatedDeliveryMinutesMin,
    estimatedDeliveryMinutesMax: r.estimatedDeliveryMinutesMax,
    estimatedPickupMinutesMin: r.estimatedPickupMinutesMin,
    estimatedPickupMinutesMax: r.estimatedPickupMinutesMax,
    cuisineRaw: r.servesCuisine.join(', '),
    priceRange: r.priceRange ?? '',
    sameAsRaw: r.sameAs.join('\n'),
    legalName: r.legal.legalName ?? '',
    nip: r.legal.nip ?? '',
    regon: r.legal.regon ?? '',
    krs: r.legal.krs ?? '',
    registryCourt: r.legal.registryCourt ?? '',
    shareCapital: r.legal.shareCapital ?? '',
    shareCapitalCurrency: r.legal.shareCapitalCurrency ?? '',
    registeredAddressSameAsTrading: r.legal.registeredAddressSameAsTrading,
    regAddrLine1: r.legal.registeredAddress?.line1 ?? '',
    regCity: r.legal.registeredAddress?.city ?? '',
    regState: r.legal.registeredAddress?.state ?? '',
    regZip: r.legal.registeredAddress?.zip ?? '',
    regCountry: r.legal.registeredAddress?.country ?? 'PL',
    supportEmail: r.legal.supportEmail ?? '',
    supportPhone: r.legal.supportPhone ?? '',
    complaintsEmail: r.legal.complaintsEmail ?? '',
    privacyEmail: r.legal.privacyEmail ?? '',
    statementDescriptor: r.legal.statementDescriptor ?? '',
  };
}

function diff(initial: FormState, current: FormState): UpdateRestaurantDto {
  const patch: UpdateRestaurantDto = {};
  const set = <K extends keyof UpdateRestaurantDto>(k: K, v: UpdateRestaurantDto[K]) => {
    patch[k] = v;
  };
  if (initial.name !== current.name) set('name', current.name);
  if (initial.description !== current.description) set('description', current.description || null);
  if (initial.logoUrl !== current.logoUrl) set('logoUrl', current.logoUrl || null);
  if (initial.coverUrl !== current.coverUrl) set('coverUrl', current.coverUrl || null);
  if (initial.phone !== current.phone) set('phone', current.phone);
  if (initial.email !== current.email) set('email', current.email);
  if (initial.timezone !== current.timezone) set('timezone', current.timezone);
  if (initial.currency !== current.currency) set('currency', current.currency);
  if (initial.isActive !== current.isActive) set('isActive', current.isActive);
  if (initial.acceptsReservations !== current.acceptsReservations)
    set('acceptsReservations', current.acceptsReservations);
  if (initial.acceptsDelivery !== current.acceptsDelivery)
    set('acceptsDelivery', current.acceptsDelivery);
  if (initial.acceptsPickup !== current.acceptsPickup) set('acceptsPickup', current.acceptsPickup);
  if (initial.acceptsDineIn !== current.acceptsDineIn) set('acceptsDineIn', current.acceptsDineIn);
  if (initial.estimatedDeliveryMinutesMin !== current.estimatedDeliveryMinutesMin)
    set('estimatedDeliveryMinutesMin', current.estimatedDeliveryMinutesMin);
  if (initial.estimatedDeliveryMinutesMax !== current.estimatedDeliveryMinutesMax)
    set('estimatedDeliveryMinutesMax', current.estimatedDeliveryMinutesMax);
  if (initial.estimatedPickupMinutesMin !== current.estimatedPickupMinutesMin)
    set('estimatedPickupMinutesMin', current.estimatedPickupMinutesMin);
  if (initial.estimatedPickupMinutesMax !== current.estimatedPickupMinutesMax)
    set('estimatedPickupMinutesMax', current.estimatedPickupMinutesMax);
  const addressChanged =
    initial.addrLine1 !== current.addrLine1 ||
    initial.city !== current.city ||
    initial.state !== current.state ||
    initial.zip !== current.zip ||
    initial.country !== current.country;
  if (addressChanged) {
    set('address', {
      line1: current.addrLine1,
      city: current.city,
      state: current.state || null,
      zip: current.zip || null,
      country: current.country,
    });
  }
  const geoChanged = initial.lat !== current.lat || initial.lng !== current.lng;
  if (geoChanged) {
    set(
      'geoPoint',
      current.lat !== null && current.lng !== null ? { lat: current.lat, lng: current.lng } : null,
    );
  }
  if (initial.cuisineRaw !== current.cuisineRaw) {
    set('servesCuisine', splitCsv(current.cuisineRaw));
  }
  if (initial.priceRange !== current.priceRange) {
    set('priceRange', current.priceRange === '' ? null : current.priceRange);
  }
  if (initial.sameAsRaw !== current.sameAsRaw) {
    set('sameAs', splitLines(current.sameAsRaw));
  }
  // Legal entity & support — send raw strings; the server normalizes/validates
  // (empty → null). NIP/REGON/KRS digit-strip + format-check happen server-side.
  if (initial.legalName !== current.legalName) set('legalName', current.legalName || null);
  if (initial.nip !== current.nip) set('nip', current.nip || null);
  if (initial.regon !== current.regon) set('regon', current.regon || null);
  if (initial.krs !== current.krs) set('krs', current.krs || null);
  if (initial.registryCourt !== current.registryCourt)
    set('registryCourt', current.registryCourt || null);
  if (initial.shareCapital !== current.shareCapital)
    set('shareCapital', current.shareCapital || null);
  if (initial.shareCapitalCurrency !== current.shareCapitalCurrency)
    set('shareCapitalCurrency', current.shareCapitalCurrency || null);
  if (initial.registeredAddressSameAsTrading !== current.registeredAddressSameAsTrading)
    set('registeredAddressSameAsTrading', current.registeredAddressSameAsTrading);
  // Registered address: stored only when it differs from the trading address.
  const regAddrChanged =
    initial.regAddrLine1 !== current.regAddrLine1 ||
    initial.regCity !== current.regCity ||
    initial.regState !== current.regState ||
    initial.regZip !== current.regZip ||
    initial.regCountry !== current.regCountry ||
    initial.registeredAddressSameAsTrading !== current.registeredAddressSameAsTrading;
  if (regAddrChanged) {
    set(
      'registeredAddress',
      current.registeredAddressSameAsTrading || !current.regAddrLine1
        ? null
        : {
            line1: current.regAddrLine1,
            city: current.regCity,
            state: current.regState || null,
            zip: current.regZip || null,
            country: current.regCountry,
          },
    );
  }
  if (initial.supportEmail !== current.supportEmail)
    set('supportEmail', current.supportEmail || null);
  if (initial.supportPhone !== current.supportPhone)
    set('supportPhone', current.supportPhone || null);
  if (initial.complaintsEmail !== current.complaintsEmail)
    set('complaintsEmail', current.complaintsEmail || null);
  if (initial.privacyEmail !== current.privacyEmail)
    set('privacyEmail', current.privacyEmail || null);
  if (initial.statementDescriptor !== current.statementDescriptor)
    set('statementDescriptor', current.statementDescriptor || null);
  return patch;
}

function Field({
  label,
  children,
  required,
  hint,
}: {
  label: string;
  required?: boolean;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: control passed via `children`
    <label className="block">
      <span className="mb-1 block text-caption uppercase tracking-wider text-fg-subtle">
        {label}
        {required && <span className="ml-1 text-negative">*</span>}
      </span>
      {children}
      {hint && <p className="mt-1 text-small text-fg-muted">{hint}</p>}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-9 w-full rounded-button border border-border/[var(--border-strong-alpha)] bg-transparent px-3 text-small text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 ${
        props.className ?? ''
      }`}
    />
  );
}

/** A min–max pair of minute inputs. Empty string maps to null (not set). */
function RangeInput({
  min,
  max,
  onMin,
  onMax,
  minLabel,
  maxLabel,
  minPlaceholder,
  maxPlaceholder,
}: {
  min: number | null;
  max: number | null;
  onMin: (v: number | null) => void;
  onMax: (v: number | null) => void;
  minLabel: string;
  maxLabel: string;
  minPlaceholder: string;
  maxPlaceholder: string;
}) {
  const toNum = (s: string) => (s === '' ? null : Number(s));
  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={1}
        max={600}
        aria-label={minLabel}
        placeholder={minPlaceholder}
        value={min ?? ''}
        onChange={(e) => onMin(toNum(e.target.value))}
      />
      <span aria-hidden className="text-fg-subtle">
        –
      </span>
      <Input
        type="number"
        min={1}
        max={600}
        aria-label={maxLabel}
        placeholder={maxPlaceholder}
        value={max ?? ''}
        onChange={(e) => onMax(toNum(e.target.value))}
      />
    </div>
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full resize-y rounded-button border border-border/[var(--border-strong-alpha)] bg-transparent px-3 py-2 text-small text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 ${
        props.className ?? ''
      }`}
    />
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (b: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <span className="block text-small text-fg">{label}</span>
        {description && (
          <span className="block text-caption uppercase tracking-wider text-fg-subtle">
            {description}
          </span>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export default function RestaurantProfilePage() {
  const t = useTranslations('admin.restaurant');
  usePageHeader({ title: t('title') });
  const NAV = React.useMemo(
    () => [
      { id: 'identity', label: t('nav.identity'), icon: <Building2 className="h-4 w-4" /> },
      { id: 'branding', label: t('nav.branding'), icon: <Palette className="h-4 w-4" /> },
      { id: 'contact', label: t('nav.contact'), icon: <Mail className="h-4 w-4" /> },
      { id: 'location', label: t('nav.location'), icon: <Compass className="h-4 w-4" /> },
      { id: 'discovery', label: t('nav.discovery'), icon: <Search className="h-4 w-4" /> },
      { id: 'channels', label: t('nav.channels'), icon: <ToggleRight className="h-4 w-4" /> },
      { id: 'legal', label: t('nav.legal'), icon: <Landmark className="h-4 w-4" /> },
      { id: 'payments', label: t('nav.payments'), icon: <CreditCard className="h-4 w-4" /> },
    ],
    [t],
  );
  const qc = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery<RestaurantAdminDto>({
    queryKey: restaurantAdminKey,
    queryFn: () => getApiClient().restaurant.getAdmin(),
  });
  const update = useMutation<RestaurantAdminDto, ApiError, UpdateRestaurantDto>({
    mutationFn: (input) => getApiClient().restaurant.update(input),
    onSuccess: (next) => {
      qc.setQueryData(restaurantAdminKey, next);
      notify('success', t('updated'));
    },
    onError: (err) => notify('error', err.message),
  });

  const initial = React.useMemo<FormState | null>(() => (data ? fromDto(data) : null), [data]);
  const [draft, setDraft] = React.useState<FormState | null>(initial);
  React.useEffect(() => setDraft(initial), [initial]);

  const dirty = React.useMemo(() => {
    if (!initial || !draft) return false;
    return Object.keys(diff(initial, draft)).length > 0;
  }, [initial, draft]);

  const deliveryRangeErr = draft
    ? rangeError(draft.estimatedDeliveryMinutesMin, draft.estimatedDeliveryMinutesMax)
    : null;
  const pickupRangeErr = draft
    ? rangeError(draft.estimatedPickupMinutesMin, draft.estimatedPickupMinutesMax)
    : null;
  const rangesValid = !deliveryRangeErr && !pickupRangeErr;

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (dirty && draft && initial) submit();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, draft, initial]);

  function patch<K extends keyof FormState>(k: K, v: FormState[K]) {
    setDraft((d) => (d ? { ...d, [k]: v } : d));
  }

  function submit() {
    if (!initial || !draft || !rangesValid) return;
    const payload = diff(initial, draft);
    if (Object.keys(payload).length === 0) return;
    update.mutate(payload);
  }

  if (isLoading || !draft || !initial) {
    return <PageSpinner label={t('loading')} />;
  }

  if (isError || !data) {
    return (
      <EmptyState
        title={t('errorTitle')}
        description={error?.message ?? t('errorDescriptionFallback')}
        action={{ label: t('retry'), onClick: () => refetch() }}
        size="lg"
      />
    );
  }

  // Live "payment provider readiness" against the current draft. Shares the same
  // helper the API/public-fail-safe use — it only reports unset factual fields,
  // never that the app verified an external registry.
  const readiness = getRestaurantLegalReadiness({
    legalName: draft.legalName || null,
    nip: draft.nip || null,
    regon: draft.regon || null,
    krs: draft.krs || null,
    registryCourt: draft.registryCourt || null,
    shareCapital: draft.shareCapital || null,
    shareCapitalCurrency: draft.shareCapitalCurrency || null,
    registeredAddress:
      draft.registeredAddressSameAsTrading || !draft.regAddrLine1
        ? null
        : {
            line1: draft.regAddrLine1,
            city: draft.regCity,
            state: draft.regState || null,
            zip: draft.regZip || null,
            country: draft.regCountry,
          },
    supportEmail: draft.supportEmail || null,
    supportPhone: draft.supportPhone || null,
    complaintsEmail: draft.complaintsEmail || null,
    privacyEmail: draft.privacyEmail || null,
    statementDescriptor: draft.statementDescriptor || null,
    registeredAddressSameAsTrading: draft.registeredAddressSameAsTrading,
  });

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[240px_1fr] pb-24">
      <aside className="sticky top-20 self-start xl:block">
        <SettingsAnchorNav items={NAV} />
      </aside>

      <div className="space-y-6">
        <SettingsSectionCard
          id="identity"
          title={t('identity.title')}
          description={t('identity.description')}
        >
          <Field label={t('identity.nameLabel')} required>
            <Input
              value={draft.name}
              maxLength={120}
              onChange={(e) => patch('name', e.target.value)}
            />
          </Field>
          <Field label={t('identity.slugLabel')} hint={t('identity.slugHint')}>
            <Input
              value={draft.slug}
              maxLength={80}
              onChange={(e) => patch('slug', e.target.value.toLowerCase())}
            />
          </Field>
          <Field label={t('identity.descriptionLabel')}>
            <Textarea
              value={draft.description}
              maxLength={2000}
              rows={3}
              onChange={(e) => patch('description', e.target.value)}
              placeholder={t('identity.descriptionPlaceholder')}
            />
          </Field>
        </SettingsSectionCard>

        <SettingsSectionCard
          id="branding"
          title={t('branding.title')}
          description={t('branding.description')}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label={t('branding.logoLabel')} hint={t('branding.logoHint')}>
              <Input
                value={draft.logoUrl}
                placeholder="https://…"
                onChange={(e) => patch('logoUrl', e.target.value)}
              />
            </Field>
            <Field label={t('branding.coverLabel')} hint={t('branding.coverHint')}>
              <Input
                value={draft.coverUrl}
                placeholder="https://…"
                onChange={(e) => patch('coverUrl', e.target.value)}
              />
            </Field>
          </div>
        </SettingsSectionCard>

        <SettingsSectionCard
          id="contact"
          title={t('contact.title')}
          description={t('contact.description')}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label={t('contact.phoneLabel')} required>
              <Input
                type="tel"
                value={draft.phone}
                onChange={(e) => patch('phone', e.target.value)}
              />
            </Field>
            <Field label={t('contact.emailLabel')} required>
              <Input
                type="email"
                value={draft.email}
                onChange={(e) => patch('email', e.target.value)}
              />
            </Field>
          </div>
          <Field label={t('contact.addressLineLabel')} required>
            <Input
              value={draft.addrLine1}
              maxLength={200}
              onChange={(e) => patch('addrLine1', e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Field label={t('contact.cityLabel')} required>
              <Input value={draft.city} onChange={(e) => patch('city', e.target.value)} />
            </Field>
            <Field label={t('contact.stateLabel')}>
              <Input value={draft.state} onChange={(e) => patch('state', e.target.value)} />
            </Field>
            <Field label={t('contact.zipLabel')}>
              <Input value={draft.zip} onChange={(e) => patch('zip', e.target.value)} />
            </Field>
            <Field label={t('contact.countryLabel')} required hint={t('contact.countryHint')}>
              <Input
                value={draft.country}
                maxLength={2}
                onChange={(e) => patch('country', e.target.value.toUpperCase())}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label={t('contact.timezoneLabel')}>
              <Input value={draft.timezone} onChange={(e) => patch('timezone', e.target.value)} />
            </Field>
            <Field label={t('contact.currencyLabel')} hint={t('contact.currencyHint')}>
              <Input
                value={draft.currency}
                maxLength={3}
                onChange={(e) => patch('currency', e.target.value.toUpperCase())}
              />
            </Field>
          </div>
        </SettingsSectionCard>

        <SettingsSectionCard
          id="location"
          title={t('location.title')}
          description={t('location.description')}
        >
          <DeliveryLocationPicker
            showRestaurantMarker={false}
            center={
              draft.lat !== null && draft.lng !== null
                ? { lat: draft.lat, lng: draft.lng }
                : DEFAULT_MAP_CENTER
            }
            value={
              draft.lat !== null && draft.lng !== null ? { lat: draft.lat, lng: draft.lng } : null
            }
            onChange={(next) => setDraft((d) => (d ? { ...d, lat: next.lat, lng: next.lng } : d))}
            height={360}
          />
          <div className="flex flex-wrap items-center justify-between gap-3 text-small text-fg-muted">
            <span>
              {draft.lat !== null && draft.lng !== null ? (
                <>
                  <span className="text-fg">{draft.lat.toFixed(6)}</span>,{' '}
                  <span className="text-fg">{draft.lng.toFixed(6)}</span>
                </>
              ) : (
                t('location.prompt')
              )}
            </span>
            {draft.lat !== null && draft.lng !== null && (
              <button
                type="button"
                onClick={() => setDraft((d) => (d ? { ...d, lat: null, lng: null } : d))}
                className="text-caption uppercase tracking-wider text-fg-subtle hover:text-fg"
              >
                {t('location.clear')}
              </button>
            )}
          </div>
        </SettingsSectionCard>

        <SettingsSectionCard
          id="discovery"
          title={t('discovery.title')}
          description={t('discovery.description')}
        >
          <Field label={t('discovery.cuisineLabel')} hint={t('discovery.cuisineHint')}>
            <Input
              value={draft.cuisineRaw}
              onChange={(e) => patch('cuisineRaw', e.target.value)}
              placeholder="Polish, Middle Eastern"
            />
          </Field>
          <Field label={t('discovery.priceRangeLabel')} hint={t('discovery.priceRangeHint')}>
            <Input
              value={draft.priceRange}
              onChange={(e) => patch('priceRange', e.target.value)}
              placeholder="20–40 zł"
            />
          </Field>
          <Field label={t('discovery.sameAsLabel')} hint={t('discovery.sameAsHint')}>
            <Textarea
              value={draft.sameAsRaw}
              rows={4}
              onChange={(e) => patch('sameAsRaw', e.target.value)}
              placeholder={'https://facebook.com/…\nhttps://instagram.com/…'}
            />
          </Field>
        </SettingsSectionCard>

        <SettingsSectionCard
          id="channels"
          title={t('channels.title')}
          description={t('channels.description')}
        >
          <ToggleRow
            label={t('channels.published')}
            description={t('channels.publishedHint')}
            checked={draft.isActive}
            onChange={(b) => patch('isActive', b)}
          />
          <ToggleRow
            label={t('channels.acceptsReservations')}
            description={t('channels.acceptsReservationsHint')}
            checked={draft.acceptsReservations}
            onChange={(b) => patch('acceptsReservations', b)}
          />
          <ToggleRow
            label={t('channels.acceptsDelivery')}
            checked={draft.acceptsDelivery}
            onChange={(b) => patch('acceptsDelivery', b)}
          />
          <ToggleRow
            label={t('channels.acceptsPickup')}
            checked={draft.acceptsPickup}
            onChange={(b) => patch('acceptsPickup', b)}
          />
          <ToggleRow
            label={t('channels.acceptsDineIn')}
            checked={draft.acceptsDineIn}
            onChange={(b) => patch('acceptsDineIn', b)}
          />
          <div className="grid grid-cols-1 gap-3 border-t border-border/[var(--border-alpha)] pt-4 md:grid-cols-2">
            <Field
              label={t('channels.estimatedDeliveryLabel')}
              hint={
                deliveryRangeErr ? (
                  <span className="text-negative">
                    {t(`channels.rangeError.${deliveryRangeErr}`)}
                  </span>
                ) : (
                  t('channels.estimatedTimeHint')
                )
              }
            >
              <RangeInput
                min={draft.estimatedDeliveryMinutesMin}
                max={draft.estimatedDeliveryMinutesMax}
                onMin={(v) => patch('estimatedDeliveryMinutesMin', v)}
                onMax={(v) => patch('estimatedDeliveryMinutesMax', v)}
                minLabel={t('channels.rangeMinAria')}
                maxLabel={t('channels.rangeMaxAria')}
                minPlaceholder={t('channels.rangeMinPlaceholder')}
                maxPlaceholder={t('channels.rangeMaxPlaceholder')}
              />
            </Field>
            <Field
              label={t('channels.estimatedPickupLabel')}
              hint={
                pickupRangeErr ? (
                  <span className="text-negative">
                    {t(`channels.rangeError.${pickupRangeErr}`)}
                  </span>
                ) : (
                  t('channels.estimatedTimeHint')
                )
              }
            >
              <RangeInput
                min={draft.estimatedPickupMinutesMin}
                max={draft.estimatedPickupMinutesMax}
                onMin={(v) => patch('estimatedPickupMinutesMin', v)}
                onMax={(v) => patch('estimatedPickupMinutesMax', v)}
                minLabel={t('channels.rangeMinAria')}
                maxLabel={t('channels.rangeMaxAria')}
                minPlaceholder={t('channels.rangeMinPlaceholder')}
                maxPlaceholder={t('channels.rangeMaxPlaceholder')}
              />
            </Field>
          </div>
        </SettingsSectionCard>

        <SettingsSectionCard
          id="legal"
          title={t('legal.title')}
          description={t('legal.description')}
        >
          <div className="rounded-card border border-border/[var(--border-strong-alpha)] bg-surface-2 p-3 text-small text-fg-muted">
            {t('legal.verifyWarning')}
          </div>
          <Field label={t('legal.legalNameLabel')} hint={t('legal.legalNameHint')}>
            <Input
              value={draft.legalName}
              maxLength={200}
              onChange={(e) => patch('legalName', e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label={t('legal.nipLabel')} hint={t('legal.nipHint')}>
              <Input
                value={draft.nip}
                inputMode="numeric"
                onChange={(e) => patch('nip', e.target.value)}
              />
            </Field>
            <Field label={t('legal.regonLabel')} hint={t('legal.regonHint')}>
              <Input
                value={draft.regon}
                inputMode="numeric"
                onChange={(e) => patch('regon', e.target.value)}
              />
            </Field>
            <Field label={t('legal.krsLabel')} hint={t('legal.krsHint')}>
              <Input
                value={draft.krs}
                inputMode="numeric"
                onChange={(e) => patch('krs', e.target.value)}
              />
            </Field>
          </div>
          <Field label={t('legal.registryCourtLabel')} hint={t('legal.registryCourtHint')}>
            <Input
              value={draft.registryCourt}
              maxLength={200}
              onChange={(e) => patch('registryCourt', e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label={t('legal.shareCapitalLabel')} hint={t('legal.shareCapitalHint')}>
              <Input
                value={draft.shareCapital}
                inputMode="decimal"
                placeholder="5000.00"
                onChange={(e) => patch('shareCapital', e.target.value)}
              />
            </Field>
            <Field label={t('legal.shareCapitalCurrencyLabel')}>
              <Input
                value={draft.shareCapitalCurrency}
                maxLength={3}
                placeholder="PLN"
                onChange={(e) => patch('shareCapitalCurrency', e.target.value.toUpperCase())}
              />
            </Field>
          </div>
          <ToggleRow
            label={t('legal.registeredSameLabel')}
            description={t('legal.registeredSameHint')}
            checked={draft.registeredAddressSameAsTrading}
            onChange={(b) => patch('registeredAddressSameAsTrading', b)}
          />
          {!draft.registeredAddressSameAsTrading && (
            <div className="grid grid-cols-1 gap-3 border-t border-border/[var(--border-alpha)] pt-4">
              <span className="text-caption uppercase tracking-wider text-fg-subtle">
                {t('legal.registeredAddressTitle')}
              </span>
              <Field label={t('contact.addressLineLabel')}>
                <Input
                  value={draft.regAddrLine1}
                  maxLength={200}
                  onChange={(e) => patch('regAddrLine1', e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <Field label={t('contact.cityLabel')}>
                  <Input value={draft.regCity} onChange={(e) => patch('regCity', e.target.value)} />
                </Field>
                <Field label={t('contact.stateLabel')}>
                  <Input
                    value={draft.regState}
                    onChange={(e) => patch('regState', e.target.value)}
                  />
                </Field>
                <Field label={t('contact.zipLabel')}>
                  <Input value={draft.regZip} onChange={(e) => patch('regZip', e.target.value)} />
                </Field>
                <Field label={t('contact.countryLabel')} hint={t('contact.countryHint')}>
                  <Input
                    value={draft.regCountry}
                    maxLength={2}
                    onChange={(e) => patch('regCountry', e.target.value.toUpperCase())}
                  />
                </Field>
              </div>
            </div>
          )}
        </SettingsSectionCard>

        <SettingsSectionCard
          id="payments"
          title={t('payments.title')}
          description={t('payments.description')}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label={t('payments.supportEmailLabel')}>
              <Input
                type="email"
                value={draft.supportEmail}
                onChange={(e) => patch('supportEmail', e.target.value)}
              />
            </Field>
            <Field label={t('payments.supportPhoneLabel')}>
              <Input
                type="tel"
                value={draft.supportPhone}
                onChange={(e) => patch('supportPhone', e.target.value)}
              />
            </Field>
            <Field
              label={t('payments.complaintsEmailLabel')}
              hint={t('payments.complaintsEmailHint')}
            >
              <Input
                type="email"
                value={draft.complaintsEmail}
                onChange={(e) => patch('complaintsEmail', e.target.value)}
              />
            </Field>
            <Field label={t('payments.privacyEmailLabel')}>
              <Input
                type="email"
                value={draft.privacyEmail}
                onChange={(e) => patch('privacyEmail', e.target.value)}
              />
            </Field>
          </div>
          <Field
            label={t('payments.statementDescriptorLabel')}
            hint={t('payments.statementDescriptorHint')}
          >
            <Input
              value={draft.statementDescriptor}
              maxLength={22}
              onChange={(e) => patch('statementDescriptor', e.target.value)}
            />
          </Field>
          <div className="border-t border-border/[var(--border-alpha)] pt-4">
            <span className="block text-small font-medium text-fg">
              {t('payments.readiness.title')}
            </span>
            {readiness.complete ? (
              <p className="mt-2 flex items-start gap-2 text-small text-fg-muted">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                {t('payments.readiness.complete')}
              </p>
            ) : (
              <div className="mt-2 space-y-1">
                <p className="text-small text-fg-muted">{t('payments.readiness.incompleteHint')}</p>
                <ul className="space-y-1">
                  {readiness.missing.map((key) => (
                    <li key={key} className="flex items-center gap-2 text-small text-fg-muted">
                      <X className="h-4 w-4 shrink-0 text-negative" />
                      {t(`payments.readiness.fields.${key}`)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </SettingsSectionCard>
      </div>

      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/[var(--border-alpha)] bg-surface/95 backdrop-blur">
          <div className="mx-auto flex max-w-page-max items-center justify-between gap-4 px-6 py-3">
            <p className="text-small text-fg-muted">
              {t.rich('saveBar.unsavedHint', {
                shortcut: () => (
                  <kbd className="rounded border border-border/[var(--border-alpha)] px-1 text-caption">
                    ⌘S
                  </kbd>
                ),
              })}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDraft(initial)}
                className="h-9 rounded-button px-3 text-small text-fg-muted hover:text-fg"
              >
                {t('saveBar.discard')}
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={update.isPending || !rangesValid}
                className="h-9 rounded-button bg-accent px-4 text-small font-medium text-bg hover:bg-accent-hover disabled:opacity-50"
              >
                {update.isPending ? t('saveBar.saving') : t('saveBar.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
