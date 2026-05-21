'use client';

import 'leaflet/dist/leaflet.css';

import L, { type LatLngExpression, type Map as LeafletMap } from 'leaflet';
import { Crosshair, Loader2, MapPin } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/cn';
import { MapSearchBox } from '../map-search-box';

export interface DeliveryLocationValue {
  lat: number;
  lng: number;
}

export interface DeliveryZoneShape {
  id: string;
  name: string;
  polygon: {
    type: 'Polygon';
    coordinates: [number, number][][]; // [lng, lat] outer ring first
  };
}

export type DeliveryLocationStatus =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'in-zone'; zoneName: string }
  | { kind: 'out-of-zone' }
  | { kind: 'error'; message: string };

export interface DeliveryLocationPickerProps {
  /** Zones to render as read-only colored fills. Customer can see where we deliver. */
  zones: DeliveryZoneShape[];
  /** Restaurant location — marker + initial map center. */
  center: DeliveryLocationValue;
  /** Current pin. `null` means no pin dropped yet. */
  value: DeliveryLocationValue | null;
  /** Fired when the customer drops/drags the pin or uses Locate-me. */
  onChange: (next: DeliveryLocationValue) => void;
  /** Status badge content driven by the parent (which runs the zone check). */
  status?: DeliveryLocationStatus;
  zoom?: number;
  height?: number;
  className?: string;
  /**
   * When false, the static yellow "Restaurant" reference dot is not rendered.
   * Use this when the draggable pin itself represents the restaurant (e.g. the
   * admin profile screen where the admin is setting the restaurant's own
   * coordinates). Defaults to true for customer-facing checkout.
   */
  showRestaurantMarker?: boolean;
}

const ZONE_FILL = 'rgba(127, 232, 200, 0.18)';
const ZONE_STROKE = 'rgba(127, 232, 200, 0.7)';

function ringToLatLngs(ring: [number, number][]): LatLngExpression[] {
  return ring.map(([lng, lat]) => [lat, lng]);
}

/**
 * Customer-facing map picker. Renders delivery-zone polygons as read-only
 * coverage fills, drops a single draggable pin, and exposes a Locate-me
 * button. Coordinate emission is throttled (200ms) so dragging doesn't
 * spam the parent's zone-check API.
 */
export function DeliveryLocationPicker({
  zones,
  center,
  value,
  onChange,
  status = { kind: 'idle' },
  zoom = 13,
  height = 360,
  className,
  showRestaurantMarker = true,
}: DeliveryLocationPickerProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<LeafletMap | null>(null);
  const pinRef = React.useRef<L.Marker | null>(null);
  const zonesRef = React.useRef<L.Polygon[]>([]);
  const onChangeRef = React.useRef(onChange);
  const [locating, setLocating] = React.useState(false);
  const [locateError, setLocateError] = React.useState<string | null>(null);

  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // One-time map init.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [value?.lat ?? center.lat, value?.lng ?? center.lng],
      zoom,
      zoomControl: true,
      attributionControl: true,
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(map);

    if (showRestaurantMarker) {
      L.circleMarker([center.lat, center.lng], {
        radius: 6,
        color: '#FBBF24',
        fillColor: '#FBBF24',
        fillOpacity: 0.95,
        weight: 2,
      })
        .addTo(map)
        .bindTooltip('Restaurant', { direction: 'top', offset: [0, -6] });
    }

    // Click anywhere → move pin.
    map.on('click', (e: L.LeafletMouseEvent) => {
      onChangeRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      pinRef.current = null;
      zonesRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render zones whenever the zones list changes.
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const layer of zonesRef.current) layer.remove();
    zonesRef.current = [];
    for (const z of zones) {
      const outer = z.polygon.coordinates[0];
      if (!outer || outer.length < 4) continue;
      const layer = L.polygon(ringToLatLngs(outer), {
        color: ZONE_STROKE,
        weight: 1.5,
        fillColor: ZONE_FILL,
        fillOpacity: 1,
        interactive: false,
      }).addTo(map);
      zonesRef.current.push(layer);
    }
  }, [zones]);

  // Render / move the pin when `value` changes.
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!value) {
      if (pinRef.current) {
        pinRef.current.remove();
        pinRef.current = null;
      }
      return;
    }
    if (!pinRef.current) {
      const icon = L.divIcon({
        className: 'dlp-pin',
        html:
          '<div style="transform:translate(-50%,-100%);">' +
          '<svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">' +
          '<path d="M14 0C6.27 0 0 6.27 0 14c0 9.5 12.5 21 13.1 21.5a1.2 1.2 0 0 0 1.8 0C15.5 35 28 23.5 28 14 28 6.27 21.73 0 14 0Z" fill="#7FE8C8" stroke="#0B0D12" stroke-width="1.5"/>' +
          '<circle cx="14" cy="14" r="5" fill="#0B0D12"/>' +
          '</svg></div>',
        iconSize: [28, 36],
        iconAnchor: [14, 36],
      });
      const marker = L.marker([value.lat, value.lng], {
        draggable: true,
        icon,
      }).addTo(map);
      marker.on('dragend', () => {
        const { lat, lng } = marker.getLatLng();
        onChangeRef.current({ lat, lng });
      });
      pinRef.current = marker;
    } else {
      pinRef.current.setLatLng([value.lat, value.lng]);
    }
  }, [value]);

  function handleLocateMe(): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocateError("Your browser doesn't support location.");
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        mapRef.current?.flyTo([next.lat, next.lng], 16, { duration: 0.6 });
        onChangeRef.current(next);
      },
      (err) => {
        setLocating(false);
        setLocateError(
          err.code === err.PERMISSION_DENIED
            ? 'Allow location access, or drag the pin manually.'
            : "Couldn't get your location — drag the pin manually.",
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div
        className="relative overflow-hidden rounded-card border border-border/[var(--border-alpha)]"
        style={{ height }}
      >
        <div ref={containerRef} className="absolute inset-0 cursor-crosshair" />

        {/* Search box (top-left) */}
        <div className="absolute left-3 top-3 z-[1000] w-[calc(100%-7.5rem)] sm:w-80">
          <MapSearchBox
            onPick={(r) => {
              mapRef.current?.flyTo([r.lat, r.lng], 17, { duration: 0.6 });
              onChangeRef.current({ lat: r.lat, lng: r.lng });
            }}
          />
        </div>

        {/* Locate-me button */}
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={locating}
          aria-label="Use my current location"
          className="absolute right-3 top-3 z-[1000] inline-flex h-9 items-center gap-1.5 rounded-button border border-border/[var(--border-strong-alpha)] bg-surface/95 px-3 text-small font-medium text-fg shadow-sm backdrop-blur transition-colors hover:bg-surface disabled:opacity-60"
        >
          {locating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Crosshair className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Locate me</span>
        </button>

        {/* Hint when no pin */}
        {!value && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-[1000] flex justify-center">
            <div className="pointer-events-auto inline-flex items-center gap-2 rounded-button border border-border/[var(--border-alpha)] bg-surface/95 px-3 py-1.5 text-small text-fg-muted shadow-sm backdrop-blur">
              <MapPin className="h-4 w-4" /> Click the map or use{' '}
              <span className="font-medium text-fg">Locate me</span> to drop a pin.
            </div>
          </div>
        )}
      </div>

      {/* Status badge */}
      <StatusBadge status={status} />

      {locateError && (
        <p role="alert" className="text-small text-negative">
          {locateError}
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: DeliveryLocationStatus }) {
  if (status.kind === 'idle') return null;
  const tone = {
    checking: 'border-border/[var(--border-alpha)] bg-surface-2 text-fg-muted',
    'in-zone': 'border-positive/30 bg-positive/10 text-positive',
    'out-of-zone': 'border-negative/30 bg-negative/10 text-negative',
    error: 'border-warning/30 bg-warning/10 text-warning',
  }[status.kind];
  const label = {
    checking: 'Checking delivery area…',
    'in-zone': `Delivers here${status.kind === 'in-zone' ? ` · ${status.zoneName}` : ''}`,
    'out-of-zone': "We don't deliver to this location yet.",
    error: status.kind === 'error' ? status.message : '',
  }[status.kind];

  return (
    <div
      role="status"
      className={cn(
        'inline-flex items-center gap-2 self-start rounded-button border px-3 py-1.5 text-small font-medium',
        tone,
      )}
    >
      {status.kind === 'checking' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {status.kind === 'in-zone' && (
        <span aria-hidden className="h-2 w-2 rounded-full bg-positive" />
      )}
      {status.kind === 'out-of-zone' && (
        <span aria-hidden className="h-2 w-2 rounded-full bg-negative" />
      )}
      <span>{label}</span>
    </div>
  );
}
