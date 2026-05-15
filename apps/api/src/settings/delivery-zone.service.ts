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
      const rings = zone.polygon.coordinates;
      const outer = rings[0];
      if (!outer || !pointInRing(lng, lat, outer)) continue;
      // GeoJSON: ring[0] is the exterior, ring[1..] are holes. A point inside
      // a hole is OUTSIDE the polygon.
      const inHole = rings.slice(1).some((hole) => pointInRing(lng, lat, hole));
      if (!inHole) return zone;
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
