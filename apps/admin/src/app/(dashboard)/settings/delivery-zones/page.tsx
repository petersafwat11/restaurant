'use client';

import { usePageHeader } from '@/components/shell/page-title-context';
import { useRestaurantSettings, useUpdateRestaurantSettings } from '@/features/settings/hooks';
import { getApiClient } from '@/lib/api-client';
import type { DeliveryZoneDto, PolygonGeoJson, RestaurantPublicDto } from '@repo/types';
import {
  ActionModal,
  EmptyState,
  InlineEdit,
  type MapZone,
  SettingsSectionCard,
  TwoPaneLayout,
} from '@repo/ui';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import * as React from 'react';

// Leaflet hard-requires `window` — load on the client only.
const PolygonMapEditor = dynamic(() => import('@repo/ui').then((m) => m.PolygonMapEditor), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

const COLORS = ['#7FE8C8', '#A78BFA', '#60A5FA', '#FBBF24', '#F87171'];

function colorForIndex(i: number): string {
  return COLORS[i % COLORS.length] ?? '#7FE8C8';
}

function MapSkeleton() {
  return (
    <div className="grid h-[480px] place-items-center rounded-card border border-border/[var(--border-alpha)] bg-surface text-small text-fg-muted">
      Loading map…
    </div>
  );
}

function newZoneId(): string {
  return `z_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export default function AdminDeliveryZonesPage() {
  usePageHeader({ title: 'Delivery zones' });
  const settings = useRestaurantSettings();
  const update = useUpdateRestaurantSettings();
  const restaurant = useQuery<RestaurantPublicDto>({
    queryKey: ['restaurant', 'public'],
    queryFn: () => getApiClient().restaurant.get(),
    staleTime: 5 * 60_000,
  });

  const zones = settings.data?.deliveryZones ?? [];
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<DeliveryZoneDto | null>(null);

  const center = React.useMemo(() => {
    const g = restaurant.data?.geoPoint;
    if (g) return { lat: g.lat, lng: g.lng };
    return { lat: 52.2297, lng: 21.0122 }; // Warsaw default
  }, [restaurant.data]);

  const mapZones: MapZone[] = React.useMemo(
    () =>
      zones.map((z, i) => ({
        id: z.id,
        name: z.name,
        color: colorForIndex(i),
        polygon: z.polygon as unknown as PolygonGeoJson,
      })),
    [zones],
  );

  function commitZones(next: DeliveryZoneDto[]) {
    update.mutate({ deliveryZones: next });
  }

  function handleDrawComplete(polygon: PolygonGeoJson) {
    const created: DeliveryZoneDto = {
      id: newZoneId(),
      name: `Zone ${zones.length + 1}`,
      polygon,
    };
    commitZones([...zones, created]);
    setSelectedId(created.id);
  }

  function handleZoneCommit(zoneId: string, polygon: PolygonGeoJson) {
    commitZones(zones.map((z) => (z.id === zoneId ? { ...z, polygon } : z)));
  }

  function renameZone(zoneId: string, name: string) {
    commitZones(zones.map((z) => (z.id === zoneId ? { ...z, name } : z)));
  }

  function deleteZone(zoneId: string) {
    commitZones(zones.filter((z) => z.id !== zoneId));
    if (selectedId === zoneId) setSelectedId(null);
    setPendingDelete(null);
  }

  if (settings.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <div className="h-96 animate-pulse rounded-card bg-surface" />
        <MapSkeleton />
      </div>
    );
  }

  if (settings.isError || !settings.data) {
    return (
      <EmptyState
        title="Couldn't load delivery zones"
        description={(settings.error as Error)?.message}
        action={{ label: 'Retry', onClick: () => settings.refetch() }}
        size="lg"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="inline-flex h-8 items-center gap-1 text-small text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" /> Settings
        </Link>
      </div>

      <p className="text-small text-fg-muted">
        Draw the polygons where you deliver. The flat delivery fee and minimum order live on the
        main{' '}
        <Link href="/settings" className="text-accent hover:underline">
          Settings
        </Link>{' '}
        page and apply to all zones.
      </p>

      <TwoPaneLayout
        leftWidth={320}
        left={
          <div className="space-y-4">
            <SettingsSectionCard
              id="zones-list"
              title="Zones"
              description="Click a zone to highlight it on the map."
              action={
                <button
                  type="button"
                  className="inline-flex h-8 items-center gap-1.5 rounded-button bg-accent px-3 text-small font-medium text-bg hover:bg-accent-hover"
                  onClick={() => setSelectedId(null)}
                >
                  <Plus className="h-3.5 w-3.5" /> New
                </button>
              }
            >
              {zones.length === 0 ? (
                <EmptyState
                  title="No delivery zones yet"
                  description="Click + New, then click on the map to add vertices. Double-click or press Enter to close the polygon."
                  size="sm"
                />
              ) : (
                <ul className="space-y-1">
                  {zones.map((z, i) => {
                    const active = z.id === selectedId;
                    return (
                      <li
                        key={z.id}
                        className={`rounded-button border p-3 transition-colors ${
                          active
                            ? 'border-accent/40 bg-accent-muted'
                            : 'border-border/[var(--border-alpha)] bg-surface-2/30 hover:border-border/[var(--border-strong-alpha)]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedId(z.id)}
                          className="flex w-full items-center gap-2 text-left"
                        >
                          <span
                            aria-hidden
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: colorForIndex(i) }}
                          />
                          <span className="flex-1">
                            <InlineEdit
                              value={z.name}
                              onCommit={(name) => renameZone(z.id, name)}
                              ariaLabel={`Rename ${z.name}`}
                            />
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingDelete(z);
                            }}
                            aria-label={`Remove ${z.name}`}
                            className="grid h-7 w-7 place-items-center rounded-button text-fg-subtle hover:bg-negative/10 hover:text-negative"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </button>
                        <p className="mt-2 text-caption uppercase tracking-wider text-fg-subtle">
                          {z.polygon.coordinates[0]?.length ?? 0} vertices
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </SettingsSectionCard>
          </div>
        }
        right={
          <PolygonMapEditor
            zones={mapZones}
            center={center}
            selectedZoneId={selectedId}
            onZoneSelect={setSelectedId}
            onDrawComplete={handleDrawComplete}
            onZoneCommit={handleZoneCommit}
            height={640}
          />
        }
      />

      <ActionModal
        open={Boolean(pendingDelete)}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Remove zone"
        description={
          pendingDelete
            ? `Remove "${pendingDelete.name}"? The polygon will be permanently deleted.`
            : ''
        }
        variant="destructive"
        primary={{
          label: 'Remove',
          loading: update.isPending,
          onClick: () => pendingDelete && deleteZone(pendingDelete.id),
        }}
        secondary={{
          label: 'Cancel',
          onClick: () => setPendingDelete(null),
        }}
      />
    </div>
  );
}
