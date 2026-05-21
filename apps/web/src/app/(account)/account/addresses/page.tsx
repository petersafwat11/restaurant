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
import { zodResolver } from '@hookform/resolvers/zod';
import { type CreateAddressDto, CreateAddressSchema } from '@repo/types';
import { DeliveryLocationPicker, EmptyState, FormField } from '@repo/ui';
import { MapPin, Plus, Star, Trash2 } from 'lucide-react';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';

export default function AddressesPage() {
  const listQuery = useAddresses();
  const create = useCreateAddress();
  const setDefault = useSetDefaultAddress();
  const remove = useDeleteAddress();
  const restaurantQuery = useRestaurant();
  const zonesQuery = useDeliveryZones();
  const [addOpen, setAddOpen] = React.useState(false);

  const form = useForm<CreateAddressDto>({
    resolver: zodResolver(CreateAddressSchema),
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
        ? { kind: 'error' as const, message: 'Could not check this address.' }
        : inZone
          ? {
              kind: 'in-zone' as const,
              zoneName: zoneCheck.data?.zone?.name ?? 'Delivery area',
            }
          : { kind: 'out-of-zone' as const };

  const onAdd = form.handleSubmit(async (values) => {
    if (!inZone) {
      form.setError('geoPoint', {
        type: 'manual',
        message: 'Pin must be inside our delivery area.',
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
          <h1 className="font-display text-h2 text-fg">Addresses</h1>
          <p className="mt-1 text-small text-fg-muted">Delivery addresses on your account.</p>
        </div>
        {!addOpen && (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-button bg-accent px-4 text-small font-medium text-text-on-accent hover:bg-accent-hover"
          >
            <Plus size={16} /> Add address
          </button>
        )}
      </header>

      {addOpen && (
        <form
          onSubmit={onAdd}
          className="flex flex-col gap-4 rounded-card border border-border/[var(--border-alpha)] bg-surface-2 p-5"
          noValidate
        >
          <FormField id="ad-label" label="Label" size="lg" helper="e.g. Home, Work">
            <input
              {...form.register('label')}
              placeholder="Home"
              className="h-12 w-full rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 px-4 text-body text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </FormField>
          <FormField
            id="ad-line1"
            label="Street + number"
            required
            size="lg"
            error={form.formState.errors.line1?.message}
          >
            <input
              {...form.register('line1')}
              autoComplete="street-address"
              placeholder="ul. Marszałkowska 102"
              className="h-12 w-full rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 px-4 text-body text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </FormField>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField id="ad-line2" label="Apt / Floor" size="lg" helper="Optional">
              <input
                {...form.register('line2')}
                autoComplete="address-line2"
                placeholder="Apt 5B / Floor 3"
                className="h-12 w-full rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 px-4 text-body text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
            </FormField>
            <FormField
              id="ad-city"
              label="City"
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
              {create.isPending ? 'Saving…' : 'Save address'}
            </button>
            <button
              type="button"
              onClick={() => {
                form.reset();
                setAddOpen(false);
              }}
              className="inline-flex h-10 items-center rounded-button border border-border/[var(--border-strong-alpha)] bg-transparent px-5 text-small font-medium text-fg hover:bg-surface-warm/40"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {listQuery.isLoading ? (
        <p className="text-fg-muted">Loading…</p>
      ) : addresses.length === 0 && !addOpen ? (
        <EmptyState
          size="lg"
          icon={<MapPin size={56} strokeWidth={1.25} />}
          title="No saved addresses"
          description="Save an address for faster delivery checkout."
          action={{ label: 'Add address', onClick: () => setAddOpen(true) }}
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
                      <Star size={10} fill="currentColor" strokeWidth={0} /> Default
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
                    Set default
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove.mutate(a.id)}
                  aria-label="Delete address"
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
