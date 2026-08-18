import { OrderAlarmBanner } from '@/components/orders/order-alarm-banner';
import { OrderAlarmProvider, useOrderAlarm } from '@/providers/order-alarm-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { listOrdersMock, updateStatusMock } = vi.hoisted(() => ({
  listOrdersMock: vi.fn(),
  updateStatusMock: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({
  getApiClient: () => ({
    orders: {
      list: listOrdersMock,
      updateStatus: updateStatusMock,
    },
  }),
}));

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (
    selector: (s: {
      user: { id: string } | null;
      hasPermission: (k: string) => boolean;
    }) => unknown,
  ) => selector({ user: { id: 'user-1' }, hasPermission: () => true }),
}));

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/lib/realtime-client', () => ({
  getRealtimeClient: () => ({
    connect: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockResolvedValue(undefined),
    on: vi.fn().mockReturnValue(() => undefined),
  }),
}));

function renderWithProviders(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <OrderAlarmProvider>{ui}</OrderAlarmProvider>
    </QueryClientProvider>,
  );
}

function AlarmProbe() {
  const alarm = useOrderAlarm();
  return (
    <div>
      <output data-testid="pending-count">{alarm.pendingOrders.length}</output>
      <output data-testid="ringing-count">{alarm.activeRingingOrders.length}</output>
      <output data-testid="is-ringing">{String(alarm.isRinging)}</output>
      <output data-testid="is-muted">{String(alarm.isMuted)}</output>
      <button type="button" onClick={() => alarm.snoozeAll(5)}>
        snooze-all
      </button>
      <button type="button" onClick={() => alarm.setMuted(!alarm.isMuted)}>
        toggle-mute
      </button>
    </div>
  );
}

describe('OrderAlarmProvider & OrderAlarmBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    listOrdersMock.mockResolvedValue({
      items: [
        {
          id: 'ord-1',
          orderNumber: 'R-2026-0001',
          status: 'PENDING',
          type: 'DELIVERY',
          grandTotal: '55.00',
          currency: 'PLN',
          itemCount: 2,
          customerName: 'Jan Kowalski',
          createdAt: new Date().toISOString(),
        },
      ],
      total: 1,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('detects pending orders and marks them as actively ringing', async () => {
    renderWithProviders(
      <>
        <AlarmProbe />
        <OrderAlarmBanner />
      </>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('pending-count').textContent).toBe('1');
      expect(screen.getByTestId('ringing-count').textContent).toBe('1');
      expect(screen.getByTestId('is-ringing').textContent).toBe('true');
    });

    expect(screen.getByText('#R-2026-0001')).toBeDefined();
    expect(screen.getByRole('button', { name: /Confirm Order/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Snooze \(5m\)/i })).toBeDefined();
  });

  it('allows snoozing the alarm for 5 minutes and stops ringing', async () => {
    renderWithProviders(<AlarmProbe />);

    await waitFor(() => {
      expect(screen.getByTestId('is-ringing').textContent).toBe('true');
    });

    fireEvent.click(screen.getByRole('button', { name: 'snooze-all' }));

    await waitFor(() => {
      expect(screen.getByTestId('ringing-count').textContent).toBe('0');
      expect(screen.getByTestId('is-ringing').textContent).toBe('false');
    });
  });

  it('persists mute state in localStorage', async () => {
    renderWithProviders(<AlarmProbe />);

    await waitFor(() => {
      expect(screen.getByTestId('is-muted').textContent).toBe('false');
    });

    fireEvent.click(screen.getByRole('button', { name: 'toggle-mute' }));

    await waitFor(() => {
      expect(screen.getByTestId('is-muted').textContent).toBe('true');
    });

    expect(localStorage.getItem('admin.sound.muted')).toBe('true');
  });
});
