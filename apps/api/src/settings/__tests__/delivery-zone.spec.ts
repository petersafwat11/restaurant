import { describe, expect, it } from 'vitest';
import { DeliveryZoneService } from '../delivery-zone.service';

const square = (offset = 0) => ({
  id: `z${offset}`,
  name: `Zone ${offset}`,
  fee: '8.00',
  polygon: {
    type: 'Polygon' as const,
    coordinates: [
      [
        [0 + offset, 0 + offset] as [number, number],
        [10 + offset, 0 + offset] as [number, number],
        [10 + offset, 10 + offset] as [number, number],
        [0 + offset, 10 + offset] as [number, number],
        [0 + offset, 0 + offset] as [number, number],
      ],
    ],
  },
});

describe('DeliveryZoneService', () => {
  const svc = new DeliveryZoneService();

  it('returns null on empty zones', () => {
    expect(svc.findZone([], 1, 1)).toBeNull();
  });

  it('finds a containing zone', () => {
    expect(svc.findZone([square()], 5, 5)?.id).toBe('z0');
  });

  it('returns null when point outside all zones', () => {
    expect(svc.findZone([square()], 50, 50)).toBeNull();
  });

  it('checks zones in order and returns first hit', () => {
    expect(svc.findZone([square(0), square(5)], 7, 7)?.id).toBe('z0');
  });
});
