'use client';

import { usePageHeader } from '@/components/shell/page-title-context';
import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { RestaurantAdminDto, UpdateRestaurantDto } from '@repo/types';
import { EmptyState, PageSpinner, SettingsAnchorNav, SettingsSectionCard, Switch } from '@repo/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Compass, Mail, Palette, ShieldAlert, ToggleRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import * as React from 'react';

// Leaflet hard-requires `window` — load on the client only.
const DeliveryLocationPicker = dynamic(
  () => import('@repo/ui').then((m) => m.DeliveryLocationPicker),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-[360px] place-items-center rounded-card border border-border/[var(--border-alpha)] bg-surface text-small text-fg-muted">
        Loading map…
      </div>
    ),
  },
);

const DEFAULT_MAP_CENTER = { lat: 52.2297, lng: 21.0122 }; // Warsaw fallback

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
      { id: 'channels', label: t('nav.channels'), icon: <ToggleRight className="h-4 w-4" /> },
      { id: 'danger', label: t('nav.danger'), icon: <ShieldAlert className="h-4 w-4" /> },
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
    if (!initial || !draft) return;
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
          <Field
            label={t('identity.slugLabel')}
            hint={t('identity.slugHint')}
          >
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
            zones={[]}
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
        </SettingsSectionCard>

        <SettingsSectionCard
          id="danger"
          title={t('danger.title')}
          description={t('danger.description')}
          tone="danger"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-small text-fg">{t('danger.unpublishLabel')}</p>
              <p className="text-caption uppercase tracking-wider text-fg-subtle">
                {t('danger.unpublishHint')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => patch('isActive', false)}
              disabled={!draft.isActive}
              className="h-9 rounded-button border border-negative/40 px-4 text-small text-negative hover:bg-negative/10 disabled:opacity-50"
            >
              {t('danger.unpublishButton')}
            </button>
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
                disabled={update.isPending}
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
