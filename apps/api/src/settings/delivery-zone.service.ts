import { Injectable } from '@nestjs/common';
import type { DeliveryZoneDto } from '@repo/types';

@Injectable()
export class DeliveryZoneService {
  /**
   * Point-in-polygon using ray casting (so we don't add @turf as a heavyweight
   * dep just for this; the existing implementation works for simple polygons
   * which is what the prompt scopes us to). Coordinates are [lng, lat].
   */
  findZone(zones: DeliveryZoneDto[], lat: number, lng: number): DeliveryZoneDto | null {
    for (const zone of zones) {
      for (const ring of zone.polygon.coordinates) {
        if (pointInRing(lng, lat, ring)) return zone;
      }
    }
    return null;
  }
}

function pointInRing(x: number, y: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (!a || !b) continue;
    const xi = a[0];
    const yi = a[1];
    const xj = b[0];
    const yj = b[1];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
