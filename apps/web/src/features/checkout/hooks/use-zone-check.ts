'use client';

import { getApiClient } from '@/lib/api-client';
import type { DeliveryZoneCheckResponseDto } from '@repo/types';
import { useQuery } from '@tanstack/react-query';
import * as React from 'react';

interface GeoPoint {
  lat: number;
  lng: number;
}

const DEBOUNCE_MS = 250;

/**
 * Runs the public delivery-zone check whenever the pin lands. Debounced so
 * that dragging doesn't fire a request per pixel.
 */
export function useZoneCheck(point: GeoPoint | null) {
  const [debounced, setDebounced] = React.useState<GeoPoint | null>(point);

  React.useEffect(() => {
    if (!point) {
      setDebounced(null);
      return;
    }
    const t = setTimeout(() => setDebounced(point), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [point?.lat, point?.lng]);

  return useQuery<DeliveryZoneCheckResponseDto>({
    queryKey: ['zone-check', debounced?.lat, debounced?.lng],
    queryFn: () =>
      getApiClient().settings.checkDeliveryZone({
        lat: debounced!.lat,
        lng: debounced!.lng,
      }),
    enabled: Boolean(debounced),
    staleTime: 30_000,
  });
}
