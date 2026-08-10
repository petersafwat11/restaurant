import { Sidebar } from '@/components/shell/sidebar';
import { renderPage } from '@/test/render-page';
import { screen, waitFor } from '@testing-library/react';
import type { AnchorHTMLAttributes } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
  usePathname: () => '/',
}));

vi.mock('@/lib/api-client', () => ({
  getApiClient: () => ({
    restaurant: {
      get: vi.fn().mockResolvedValue({ name: 'Bistro Warszawa' }),
    },
  }),
}));

describe('Sidebar', () => {
  it('uses the restaurant name and shows only the localized staff role in its footer', async () => {
    renderPage(<Sidebar collapsed={false} onToggle={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('Bistro Warszawa')).toBeTruthy());
    expect(screen.getByText('Owner')).toBeTruthy();
    expect(screen.queryByText('Test Owner')).toBeNull();
    expect(screen.queryByText('Test Kitchen')).toBeNull();
  });
});
