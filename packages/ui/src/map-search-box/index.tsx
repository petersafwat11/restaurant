'use client';

import { Loader2, MapPin, Search, X } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/cn';

export interface MapSearchResult {
  lat: number;
  lng: number;
  label: string;
}

export interface MapSearchBoxProps {
  /** Called when the user picks a result. */
  onPick: (next: MapSearchResult) => void;
  /** Optional ISO-3166-1 alpha-2 country code to scope the search. Defaults to PL. */
  countryCode?: string;
  placeholder?: string;
  className?: string;
  /** Message shown when the geocoder request fails. Defaults to "Couldn't search — try again.". */
  errorMessage?: string;
  /** Message shown in the dropdown when there are zero matches. Defaults to "No matches.". */
  noResultsLabel?: React.ReactNode;
  /** Aria-label for the input. Defaults to "Search address". */
  inputAriaLabel?: string;
  /** Aria-label for the clear button. Defaults to "Clear search". */
  clearAriaLabel?: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  place_id: number;
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const DEBOUNCE_MS = 350;
const MIN_QUERY_LEN = 3;

/**
 * Address search box for embedding inside a Leaflet map. Calls the public
 * Nominatim (OpenStreetMap) geocoder — same data source as our tiles, no API
 * key, no metering. Debounced; respects Nominatim's 1-req/sec etiquette by
 * never firing while the user is still typing.
 */
export function MapSearchBox({
  onPick,
  countryCode = 'PL',
  placeholder = 'Search address or place…',
  className,
  errorMessage = "Couldn't search — try again.",
  noResultsLabel = 'No matches.',
  inputAriaLabel = 'Search address',
  clearAriaLabel = 'Clear search',
}: MapSearchBoxProps) {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<MapSearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeIdx, setActiveIdx] = React.useState(-1);
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    if (query.trim().length < MIN_QUERY_LEN) {
      setResults([]);
      setOpen(false);
      setError(null);
      return;
    }
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setLoading(true);
      setError(null);
      try {
        const url = new URL(NOMINATIM_URL);
        url.searchParams.set('q', query.trim());
        url.searchParams.set('format', 'json');
        url.searchParams.set('limit', '6');
        url.searchParams.set('addressdetails', '0');
        if (countryCode) url.searchParams.set('countrycodes', countryCode.toLowerCase());
        const res = await fetch(url.toString(), { signal: ac.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as NominatimResult[];
        const mapped: MapSearchResult[] = body.map((r) => ({
          lat: Number.parseFloat(r.lat),
          lng: Number.parseFloat(r.lon),
          label: r.display_name,
        }));
        setResults(mapped);
        setOpen(mapped.length > 0);
        setActiveIdx(-1);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError(errorMessage);
        setResults([]);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, countryCode, errorMessage]);

  // Close on outside click.
  React.useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  function commit(r: MapSearchResult): void {
    onPick(r);
    setQuery(r.label);
    setOpen(false);
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const pick = results[activeIdx >= 0 ? activeIdx : 0];
      if (pick) commit(pick);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div
      ref={wrapperRef}
      className={cn('pointer-events-auto relative w-full max-w-sm', className)}
    >
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          aria-label={inputAriaLabel}
          autoComplete="off"
          spellCheck={false}
          className="h-9 w-full rounded-button border border-border/[var(--border-strong-alpha)] bg-surface/95 pl-8 pr-9 text-small text-fg shadow-sm outline-none backdrop-blur placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
        {loading ? (
          <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-fg-subtle" />
        ) : query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
              setOpen(false);
            }}
            aria-label={clearAriaLabel}
            className="absolute right-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-fg-subtle hover:bg-surface-warm/40 hover:text-fg"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-[1000] max-h-72 overflow-auto rounded-card border border-border/[var(--border-strong-alpha)] bg-surface/95 py-1 shadow-lg backdrop-blur"
        >
          {error ? (
            <li className="px-3 py-2 text-small text-negative">{error}</li>
          ) : results.length === 0 ? (
            <li className="px-3 py-2 text-small text-fg-muted">{noResultsLabel}</li>
          ) : (
            results.map((r, i) => (
              <li key={`${r.lat},${r.lng},${i}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === activeIdx}
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => commit(r)}
                  className={cn(
                    'flex w-full items-start gap-2 px-3 py-2 text-left text-small text-fg',
                    i === activeIdx ? 'bg-accent-muted' : 'hover:bg-surface-warm/30',
                  )}
                >
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fg-subtle" />
                  <span className="line-clamp-2 leading-snug">{r.label}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
