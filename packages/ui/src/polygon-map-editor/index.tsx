'use client';

import 'leaflet/dist/leaflet.css';

import L, { type LatLngExpression, type Map as LeafletMap } from 'leaflet';
import { Pencil, Save, Trash2, X } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/cn';
import { MapSearchBox } from '../map-search-box';

// GeoJSON Polygon shape — mirrored from @repo/types/settings PolygonSchema.
export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: [number, number][][]; // [lng, lat] pairs, outer ring first
}

export interface MapZone {
  id: string;
  name: string;
  color?: string;
  polygon: GeoJsonPolygon;
}

export interface PolygonMapEditorProps {
  zones: MapZone[];
  center: { lat: number; lng: number };
  selectedZoneId?: string | null;
  zoom?: number;
  height?: number;
  /** Called with the polygon when the user finishes drawing/editing. */
  onZoneCommit?: (zoneId: string, polygon: GeoJsonPolygon) => void;
  /** Called when the user starts drawing a NEW zone. */
  onDrawComplete?: (polygon: GeoJsonPolygon) => void;
  onZoneSelect?: (id: string) => void;
  className?: string;
}

type Mode = 'view' | 'draw' | 'edit';

const DEFAULT_COLOR = 'var(--accent-hex, #7FE8C8)';

function ringToLatLngs(ring: [number, number][]): LatLngExpression[] {
  // GeoJSON is [lng, lat]; Leaflet wants [lat, lng].
  return ring.map(([lng, lat]) => [lat, lng]);
}

function latLngsToRing(latLngs: L.LatLng[]): [number, number][] {
  const ring = latLngs.map<[number, number]>((p) => [p.lng, p.lat]);
  // GeoJSON polygons must close the ring.
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
    ring.push(first);
  }
  return ring;
}

// Self-intersection check via a cheap O(n²) segment-pair sweep — good enough
// for hand-drawn delivery polygons (≤50 vertices).
function isSelfIntersecting(ring: [number, number][]): boolean {
  const pts = ring.slice(0, -1); // drop closing duplicate
  const n = pts.length;
  if (n < 4) return false;
  for (let i = 0; i < n; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % n]!;
    for (let j = i + 1; j < n; j++) {
      // Skip adjacent segments + the wraparound pair.
      if (Math.abs(i - j) <= 1 || (i === 0 && j === n - 1)) continue;
      const c = pts[j]!;
      const d = pts[(j + 1) % n]!;
      if (segmentsCross(a, b, c, d)) return true;
    }
  }
  return false;
}

function segmentsCross(
  a: [number, number],
  b: [number, number],
  c: [number, number],
  d: [number, number],
): boolean {
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  return o1 !== o2 && o3 !== o4;
}

function orient(p: [number, number], q: [number, number], r: [number, number]): number {
  const v = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1]);
  return v === 0 ? 0 : v > 0 ? 1 : -1;
}

/**
 * Polygon editor for delivery zones. Uses Leaflet via direct imports — the
 * consumer must wrap this with `next/dynamic({ ssr: false })` (Leaflet hard-
 * requires `window`). Tile source is the default OpenStreetMap layer; swap
 * via `tileUrl` if a different provider is needed in the future.
 *
 * Modes:
 * - `view`: pan/zoom only
 * - `draw`: click to add vertices, double-click (or button) to commit
 * - `edit`: existing polygon's vertices become draggable
 */
export function PolygonMapEditor({
  zones,
  center,
  selectedZoneId,
  zoom = 13,
  height = 480,
  onZoneCommit,
  onDrawComplete,
  onZoneSelect,
  className,
}: PolygonMapEditorProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<LeafletMap | null>(null);
  const drawingLayerRef = React.useRef<L.Polyline | null>(null);
  const drawingPointsRef = React.useRef<L.LatLng[]>([]);
  const polygonLayersRef = React.useRef<Map<string, L.Polygon>>(new Map());
  const editHandlesRef = React.useRef<L.CircleMarker[]>([]);
  const [mode, setMode] = React.useState<Mode>('view');
  const [error, setError] = React.useState<string | null>(null);

  // Init map exactly once.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom,
      zoomControl: true,
      attributionControl: true,
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(map);

    // Restaurant marker
    L.circleMarker([center.lat, center.lng], {
      radius: 6,
      color: '#7FE8C8',
      fillColor: '#7FE8C8',
      fillOpacity: 0.9,
      weight: 2,
    }).addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render zones whenever they change.
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const layer of polygonLayersRef.current.values()) {
      layer.remove();
    }
    polygonLayersRef.current.clear();

    for (const z of zones) {
      if (z.polygon.coordinates.length === 0) continue;
      const ring = z.polygon.coordinates[0];
      if (!ring || ring.length < 4) continue;
      const color = z.color ?? '#7FE8C8';
      const layer = L.polygon(ringToLatLngs(ring), {
        color,
        weight: 2,
        fillColor: color,
        fillOpacity: z.id === selectedZoneId ? 0.32 : 0.16,
      }).addTo(map);
      layer.on('click', () => onZoneSelect?.(z.id));
      polygonLayersRef.current.set(z.id, layer);
    }
  }, [zones, selectedZoneId, onZoneSelect]);

  // Edit handles for the selected zone when in edit mode.
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const h of editHandlesRef.current) h.remove();
    editHandlesRef.current = [];

    if (mode !== 'edit' || !selectedZoneId) return;
    const layer = polygonLayersRef.current.get(selectedZoneId);
    if (!layer) return;
    const latLngs = layer.getLatLngs()[0] as L.LatLng[];

    const mapBound: LeafletMap = map;
    const layerBound: L.Polygon = layer;
    latLngs.forEach((pt, i) => {
      const handle = L.circleMarker(pt, {
        radius: 5,
        color: '#7FE8C8',
        fillColor: '#0B0D12',
        fillOpacity: 1,
        weight: 2,
        bubblingMouseEvents: false,
      })
        .addTo(mapBound)
        .on('mousedown', (e: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e);
          mapBound.dragging.disable();
          function onMove(ev: L.LeafletMouseEvent): void {
            handle.setLatLng(ev.latlng);
            latLngs[i] = ev.latlng;
            layerBound.setLatLngs([latLngs]);
          }
          function onUp(): void {
            mapBound.dragging.enable();
            mapBound.off('mousemove', onMove);
            mapBound.off('mouseup', onUp);
            commitSelected(latLngs);
          }
          mapBound.on('mousemove', onMove);
          mapBound.on('mouseup', onUp);
        });
      editHandlesRef.current.push(handle);
    });

    function commitSelected(latLngs: L.LatLng[]) {
      const ring = latLngsToRing(latLngs);
      if (isSelfIntersecting(ring)) {
        setError('Polygon edges cross — drag a vertex to fix.');
        return;
      }
      setError(null);
      onZoneCommit?.(selectedZoneId!, { type: 'Polygon', coordinates: [ring] });
    }

    return () => {
      for (const h of editHandlesRef.current) h.remove();
      editHandlesRef.current = [];
    };
  }, [mode, selectedZoneId, onZoneCommit]);

  // Draw-mode click handler.
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (mode !== 'draw') return;

    drawingPointsRef.current = [];
    if (drawingLayerRef.current) {
      drawingLayerRef.current.remove();
      drawingLayerRef.current = null;
    }
    const line = L.polyline([], {
      color: '#7FE8C8',
      weight: 2,
      dashArray: '4 4',
    }).addTo(map);
    drawingLayerRef.current = line;

    const mapBound: LeafletMap = map;
    function onClick(e: L.LeafletMouseEvent) {
      drawingPointsRef.current.push(e.latlng);
      line.setLatLngs(drawingPointsRef.current);
      L.circleMarker(e.latlng, {
        radius: 3,
        color: '#7FE8C8',
        fillColor: '#0B0D12',
        fillOpacity: 1,
        weight: 2,
      }).addTo(mapBound);
    }

    function onDblClick(_e: L.LeafletMouseEvent): void {
      commitDrawing();
    }

    function commitDrawing() {
      const pts = drawingPointsRef.current;
      if (pts.length < 3) {
        setError('Need at least 3 points to close a polygon.');
        return;
      }
      const ring = latLngsToRing(pts);
      if (isSelfIntersecting(ring)) {
        setError('Polygon edges cross — try again.');
        return;
      }
      setError(null);
      onDrawComplete?.({ type: 'Polygon', coordinates: [ring] });
      setMode('view');
    }

    map.on('click', onClick);
    map.on('dblclick', onDblClick);
    map.doubleClickZoom.disable();

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        drawingPointsRef.current = [];
        line.setLatLngs([]);
        setMode('view');
      }
      if (e.key === 'Enter') commitDrawing();
    }
    window.addEventListener('keydown', onKey);

    return () => {
      map.off('click', onClick);
      map.off('dblclick', onDblClick);
      map.doubleClickZoom.enable();
      window.removeEventListener('keydown', onKey);
      if (drawingLayerRef.current) {
        drawingLayerRef.current.remove();
        drawingLayerRef.current = null;
      }
      drawingPointsRef.current = [];
    };
  }, [mode, onDrawComplete]);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-card border border-border/[var(--border-alpha)]',
        className,
      )}
      style={{ height }}
    >
      <div ref={containerRef} className="absolute inset-0" />

      {/* Search box (top-left) — pans the map to the picked location so the
          admin can frame an area before drawing. */}
      <div className="absolute left-3 top-3 z-[1000] w-[calc(100%-13rem)] sm:w-80">
        <MapSearchBox
          onPick={(r) => {
            mapRef.current?.flyTo([r.lat, r.lng], 16, { duration: 0.5 });
          }}
        />
      </div>

      <div className="pointer-events-none absolute right-3 top-3 z-[1000] flex flex-col gap-1">
        <div className="pointer-events-auto flex overflow-hidden rounded-button border border-border/[var(--border-strong-alpha)] bg-surface/90 shadow-sm backdrop-blur">
          <ToolbarButton
            label="View"
            active={mode === 'view'}
            onClick={() => setMode('view')}
            icon={<X className="h-4 w-4 rotate-45" aria-hidden />}
          />
          <ToolbarButton
            label="Draw"
            active={mode === 'draw'}
            onClick={() => setMode('draw')}
            icon={<Pencil className="h-4 w-4" />}
          />
          <ToolbarButton
            label="Edit"
            active={mode === 'edit'}
            disabled={!selectedZoneId}
            onClick={() => setMode('edit')}
            icon={<Save className="h-4 w-4" />}
          />
        </div>
        {mode === 'draw' && (
          <div className="pointer-events-auto rounded-button border border-border/[var(--border-alpha)] bg-surface/90 px-3 py-1.5 text-caption uppercase tracking-wider text-fg-muted backdrop-blur">
            Click to add — Enter or double-click to close — Esc to cancel
          </div>
        )}
        {mode === 'edit' && (
          <div className="pointer-events-auto rounded-button border border-border/[var(--border-alpha)] bg-surface/90 px-3 py-1.5 text-caption uppercase tracking-wider text-fg-muted backdrop-blur">
            Drag the dots to reshape
          </div>
        )}
        {error && (
          <div className="pointer-events-auto flex items-center gap-2 rounded-button border border-negative/40 bg-negative/10 px-3 py-1.5 text-small text-negative backdrop-blur">
            <Trash2 className="h-3.5 w-3.5" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolbarButton({
  label,
  active,
  onClick,
  icon,
  disabled,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 px-2.5 text-small font-medium transition-colors',
        active
          ? 'bg-accent-muted text-fg'
          : 'text-fg-muted hover:bg-surface-warm/30 hover:text-fg',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
