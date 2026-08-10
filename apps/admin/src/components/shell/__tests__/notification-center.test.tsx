import { NotificationCenter } from '@/components/shell/notification-center';
import { renderPage } from '@/test/render-page';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  markRead: vi.fn(),
  markAllRead: vi.fn(),
  refetch: vi.fn(),
  routerPush: vi.fn(),
}));

vi.mock('@/features/notifications/hooks', () => ({
  useNotifications: () => ({
    data: {
      items: [
        {
          id: 'notification-1',
          type: 'new_order',
          title: 'New order R-2026-000001',
          body: 'Ada · Pickup · 2 items · 32.50 PLN',
          data: { orderId: 'order-1' },
          readAt: null,
          createdAt: '2026-08-10T12:30:00.000Z',
        },
      ],
      nextCursor: null,
      unreadCount: 1,
    },
    isLoading: false,
    isError: false,
    refetch: mocks.refetch,
  }),
  useMarkNotificationRead: () => ({ mutate: mocks.markRead, isPending: false }),
  useMarkAllNotificationsRead: () => ({ mutate: mocks.markAllRead, isPending: false }),
  useNotificationRealtime: vi.fn(),
}));

vi.mock('@/features/orders/hooks', () => ({ useRealtimeStatus: () => 'connected' }));
vi.mock('@/i18n/navigation', () => ({ useRouter: () => ({ push: mocks.routerPush }) }));

describe('NotificationCenter', () => {
  beforeEach(() => vi.clearAllMocks());

  it('opens from the bell and navigates an unread notification to its order', async () => {
    renderPage(<NotificationCenter userId="user-1" />);

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Notifications, 1 unread' }), {
      button: 0,
      ctrlKey: false,
    });

    const itemTitle = await screen.findByText('New order R-2026-000001');
    const item = itemTitle.closest('[role="menuitem"]');
    expect(item).not.toBeNull();
    fireEvent.click(item as HTMLElement);

    expect(mocks.markRead).toHaveBeenCalledWith('notification-1');
    expect(mocks.routerPush).toHaveBeenCalledWith('/orders/order-1');
  });

  it('marks every notification read from the responsive panel', async () => {
    renderPage(<NotificationCenter userId="user-1" />);

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Notifications, 1 unread' }), {
      button: 0,
      ctrlKey: false,
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Mark all read' }));

    expect(mocks.markAllRead).toHaveBeenCalledOnce();
    const menu = screen.getByRole('menu');
    expect(menu.className).toContain('w-[calc(100vw-1rem)]');
    expect(menu.className).toContain('sm:w-96');
  });
});
