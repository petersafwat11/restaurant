'use client';

import {
  useAddresses,
  useCreateAddress,
  useDeleteAddress,
  useSetDefaultAddress,
} from '@/features/addresses/hooks';
import { useDeliveryZones } from '@/features/checkout/hooks/use-delivery-zones';
import { useZoneCheck } from '@/features/checkout/hooks/use-zone-check';
import { useRestaurant } from '@/features/restaurants/hooks/use-restaurant';
import { getZodErrorMap } from '@/lib/zod-error-map';
import { zodResolver } from '@hookform/resolvers/zod';
import { type CreateAddressDto, CreateAddressSchema } from '@repo/types';
import { EmptyState, FormField } from '@repo/ui';
import { MapPin, Plus, Star, Trash2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';

// Leaflet hard-requires `window` — load on the client only.
const DeliveryLocationPicker = dynamic(
  () => import('@repo/ui').then((m) => m.DeliveryLocationPicker),
  { ssr: false },
);

export default function AddressesPage() {
  const t = useTranslations('web.account.addresses');
  const tValidation = useTranslations('validation');
  const listQuery = useAddresses();
  const create = useCreateAddress();
  const setDefault = useSetDefaultAddress();
  const remove = useDeleteAddress();
  const restaurantQuery = useRestaurant();
  const zonesQuery = useDeliveryZones();
  const [addOpen, setAddOpen] = React.useState(false);

  const form = useForm<CreateAddressDto>({
    resolver: zodResolver(CreateAddressSchema, { errorMap: getZodErrorMap(tValidation) }),
    defaultValues: {
      label: '',
      line1: '',
      city: 'Warszawa',
      country: 'PL',
      geoPoint: undefined as unknown as { lat: number; lng: number },
    },
  });

  const geoPoint = form.watch('geoPoint');
  const zoneCheck = useZoneCheck(geoPoint ?? null);
  const inZone = zoneCheck.data?.matched === true;

  const pickerStatus = !geoPoint
    ? { kind: 'idle' as const }
    : zoneCheck.isFetching
      ? { kind: 'checking' as const }
      : zoneCheck.isError
        ? { kind: 'error' as const, message: t('picker.checkError') }
        : inZone
          ? {
              kind: 'in-zone' as const,
              zoneName: zoneCheck.data?.zone?.name ?? t('picker.deliveryAreaFallback'),
            }
          : { kind: 'out-of-zone' as const };

  const onAdd = form.handleSubmit(async (values) => {
    if (!inZone) {
      form.setError('geoPoint', {
        type: 'manual',
        message: t('picker.outOfZoneError'),
      });
      return;
    }
    const res = await create.mutateAsync(values).catch(() => null);
    if (res) {
      form.reset();
      setAddOpen(false);
    }
  });

  const addresses = listQuery.data ?? [];

  return (
    <section className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-h2 text-fg">{t('title')}</h1>
          <p className="mt-1 text-small text-fg-muted">{t('subtitle')}</p>
        </div>
        {!addOpen && (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-button bg-accent px-4 text-small font-medium text-text-on-accent hover:bg-accent-hover"
          >
            <Plus size={16} /> {t('actions.add')}
          </button>
        )}
      </header>

      {addOpen && (
        <form
          onSubmit={onAdd}
          className="flex flex-col gap-4 rounded-card border border-border/[var(--border-alpha)] bg-surface-2 p-5"
          noValidate
        >
          <FormField
            id="ad-label"
            label={t('fields.label.label')}
            size="lg"
            helper={t('fields.label.helper')}
          >
            <input
              {...form.register('label')}
              placeholder={t('fields.label.placeholder')}
              className="h-12 w-full rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 px-4 text-body text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </FormField>
          <FormField
            id="ad-line1"
            label={t('fields.line1.label')}
            required
            size="lg"
            error={form.formState.errors.line1?.message}
          >
            <input
              {...form.register('line1')}
              autoComplete="street-address"
              placeholder={t('fields.line1.placeholder')}
              className="h-12 w-full rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 px-4 text-body text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </FormField>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField
              id="ad-line2"
              label={t('fields.line2.label')}
              size="lg"
              helper={t('fields.line2.helper')}
            >
              <input
                {...form.register('line2')}
                autoComplete="address-line2"
                placeholder={t('fields.line2.placeholder')}
                className="h-12 w-full rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 px-4 text-body text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
            </FormField>
            <FormField
              id="ad-city"
              label={t('fields.city.label')}
              required
              size="lg"
              error={form.formState.errors.city?.message}
            >
              <input
                {...form.register('city')}
                className="h-12 w-full rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 px-4 text-body text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
            </FormField>
          </div>
          <Controller
            name="geoPoint"
            control={form.control}
            render={({ field, fieldState }) => (
              <>
                <DeliveryLocationPicker
                  zones={zonesQuery.data?.zones ?? []}
                  center={
                    restaurantQuery.data?.geoPoint ?? {
                      lat: 52.2297,
                      lng: 21.0122,
                    }
                  }
                  value={field.value ?? null}
                  onChange={(v) => {
                    form.clearErrors('geoPoint');
                    field.onChange(v);
                  }}
                  status={pickerStatus}
                  height={320}
                />
                {fieldState.error && (
                  <p role="alert" className="text-small text-negative">
                    {fieldState.error.message}
                  </p>
                )}
              </>
            )}
          />
          <input type="hidden" {...form.register('country')} value="PL" />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={create.isPending || !inZone || !geoPoint}
              className="inline-flex h-10 items-center rounded-button bg-accent px-5 text-small font-medium text-text-on-accent hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {create.isPending ? t('actions.saving') : t('actions.save')}
            </button>
            <button
              type="button"
              onClick={() => {
                form.reset();
                setAddOpen(false);
              }}
              className="inline-flex h-10 items-center rounded-button border border-border/[var(--border-strong-alpha)] bg-transparent px-5 text-small font-medium text-fg hover:bg-surface-warm/40"
            >
              {t('actions.cancel')}
            </button>
          </div>
        </form>
      )}

      {listQuery.isLoading ? (
        <p className="text-fg-muted">{t('loading')}</p>
      ) : addresses.length === 0 && !addOpen ? (
        <EmptyState
          size="lg"
          icon={<MapPin size={56} strokeWidth={1.25} />}
          title={t('empty.title')}
          description={t('empty.description')}
          action={{ label: t('actions.add'), onClick: () => setAddOpen(true) }}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {addresses.map((a) => (
            <li
              key={a.id}
              className="flex items-start gap-3 rounded-card border border-border/[var(--border-alpha)] bg-surface-2 p-4"
            >
              <div className="flex-1 leading-relaxed">
                <div className="flex items-center gap-2">
                  {a.label && <span className="font-medium text-fg">{a.label}</span>}
                  {a.isDefault && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/[0.10] px-2 py-0.5 text-[11px] font-medium text-accent">
                      <Star size={10} fill="currentColor" strokeWidth={0} /> {t('badges.default')}
                    </span>
                  )}
                </div>
                <div className="text-small text-fg">{a.line1}</div>
                <div className="text-small text-fg-muted">
                  {a.city}
                  {a.state ? `, ${a.state}` : ''}, {a.country}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {!a.isDefault && (
                  <button
                    type="button"
                    onClick={() => setDefault.mutate(a.id)}
                    className="text-small text-accent hover:underline"
                  >
                    {t('actions.setDefault')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove.mutate(a.id)}
                  aria-label={t('actions.deleteAria')}
                  className="grid h-9 w-9 place-items-center rounded-full text-fg-subtle transition-colors hover:bg-negative/10 hover:text-negative"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
