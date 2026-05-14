import type { OrderStatus, OrderType } from '@repo/types';
import { describe, expect, it } from 'vitest';
import {
  type ActorRole,
  actorRoleFor,
  canTransition,
  legalTransitions,
} from '../order-state-machine';

const ALL_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
];

describe('order state machine', () => {
  describe('actorRoleFor', () => {
    it('picks the highest role', () => {
      expect(actorRoleFor(['owner', 'customer'])).toBe('owner');
      expect(actorRoleFor(['manager', 'kitchen'])).toBe('manager');
      expect(actorRoleFor(['cashier'])).toBe('cashier');
      expect(actorRoleFor(['kitchen'])).toBe('kitchen');
      expect(actorRoleFor([])).toBe('customer');
    });
  });

  describe('canTransition: legal paths', () => {
    it('PENDING → CONFIRMED by system', () => {
      expect(
        canTransition({ from: 'PENDING', to: 'CONFIRMED', actor: 'system', orderType: 'PICKUP' }),
      ).toEqual({ ok: true });
    });

    it('PENDING → CANCELLED by customer', () => {
      expect(
        canTransition({ from: 'PENDING', to: 'CANCELLED', actor: 'customer', orderType: 'PICKUP' }),
      ).toEqual({ ok: true });
    });

    it('CONFIRMED → PREPARING by kitchen', () => {
      expect(
        canTransition({
          from: 'CONFIRMED',
          to: 'PREPARING',
          actor: 'kitchen',
          orderType: 'PICKUP',
        }),
      ).toEqual({ ok: true });
    });

    it('READY → OUT_FOR_DELIVERY only for DELIVERY type', () => {
      expect(
        canTransition({
          from: 'READY',
          to: 'OUT_FOR_DELIVERY',
          actor: 'manager',
          orderType: 'DELIVERY',
        }),
      ).toEqual({ ok: true });
      const pickup = canTransition({
        from: 'READY',
        to: 'OUT_FOR_DELIVERY',
        actor: 'manager',
        orderType: 'PICKUP',
      });
      expect(pickup.ok).toBe(false);
    });

    it('READY → COMPLETED only for PICKUP/DINE_IN', () => {
      expect(
        canTransition({
          from: 'READY',
          to: 'COMPLETED',
          actor: 'cashier',
          orderType: 'PICKUP',
        }),
      ).toEqual({ ok: true });
      const delivery = canTransition({
        from: 'READY',
        to: 'COMPLETED',
        actor: 'cashier',
        orderType: 'DELIVERY',
      });
      expect(delivery.ok).toBe(false);
    });

    it('any post-payment status → REFUNDED by system', () => {
      for (const from of [
        'CONFIRMED',
        'PREPARING',
        'READY',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
      ] as const) {
        expect(
          canTransition({ from, to: 'REFUNDED', actor: 'system', orderType: 'PICKUP' }),
        ).toEqual({ ok: true });
      }
    });
  });

  describe('canTransition: illegal paths', () => {
    it('rejects same-state transitions', () => {
      const r = canTransition({
        from: 'CONFIRMED',
        to: 'CONFIRMED',
        actor: 'manager',
        orderType: 'PICKUP',
      });
      expect(r.ok).toBe(false);
    });

    it('kitchen cannot transition PENDING → CANCELLED', () => {
      const r = canTransition({
        from: 'PENDING',
        to: 'CANCELLED',
        actor: 'kitchen',
        orderType: 'PICKUP',
      });
      expect(r.ok).toBe(false);
    });

    it('non-system actors cannot REFUND', () => {
      const r = canTransition({
        from: 'CONFIRMED',
        to: 'REFUNDED',
        actor: 'owner',
        orderType: 'PICKUP',
      });
      expect(r.ok).toBe(false);
    });

    it('rejects post-payment cancellations', () => {
      const r = canTransition({
        from: 'CONFIRMED',
        to: 'CANCELLED',
        actor: 'owner',
        orderType: 'PICKUP',
      });
      expect(r.ok).toBe(false);
    });

    it('rejects refund from PENDING', () => {
      const r = canTransition({
        from: 'PENDING',
        to: 'REFUNDED',
        actor: 'system',
        orderType: 'PICKUP',
      });
      expect(r.ok).toBe(false);
    });
  });

  describe('exhaustive matrix sanity', () => {
    it('every (from, to) outside the legal-transitions list (or system REFUND) is rejected for `customer` actor', () => {
      const legal = new Set(legalTransitions().map((t) => `${t.from}|${t.to}`));
      const refundLegal = new Set(
        ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'].map(
          (s) => `${s}|REFUNDED`,
        ),
      );
      const orderTypes: OrderType[] = ['PICKUP', 'DELIVERY', 'DINE_IN'];
      const actors: ActorRole[] = ['customer'];

      for (const from of ALL_STATUSES) {
        for (const to of ALL_STATUSES) {
          if (from === to) continue;
          const key = `${from}|${to}`;
          if (legal.has(key) || refundLegal.has(key)) continue;
          for (const actor of actors) {
            for (const orderType of orderTypes) {
              const r = canTransition({ from, to, actor, orderType });
              expect(r.ok, `${from} → ${to} as ${actor}`).toBe(false);
            }
          }
        }
      }
    });
  });
});
