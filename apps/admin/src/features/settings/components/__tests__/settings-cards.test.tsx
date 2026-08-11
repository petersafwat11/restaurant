import { renderPage, resetTestState } from '@/test/render-page';
import { server } from '@/test/setup';
import type { RestaurantSettingsDto } from '@repo/types';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import { FinancialsSettingsCard } from '../financials-settings-card';
import { ReservationsSettingsCard } from '../reservations-settings-card';

const mockSettings: RestaurantSettingsDto = {
  taxRate: '0.0800',
  defaultDeliveryFee: '5.00',
  minOrderAmount: '15.00',
  deliveryRadiusKm: 7,
  holidayDates: [],
  reservationSlotMinutes: 90,
  reservationBufferMinutes: 15,
  timezone: 'UTC',
  currency: 'USD',
};

afterEach(() => resetTestState());

describe('FinancialsSettingsCard', () => {
  it('renders initial settings and calculates effective minimum', () => {
    renderPage(<FinancialsSettingsCard settings={mockSettings} />);

    expect(screen.getByDisplayValue('8')).toBeDefined();
    expect(screen.getByDisplayValue('5.00')).toBeDefined();
    expect(screen.getByDisplayValue('15.00')).toBeDefined();
    expect(screen.getByDisplayValue('7')).toBeDefined();
    expect(screen.getByText('$15.00')).toBeDefined();
  });

  it('handles percentage conversion and dirty state on edit', async () => {
    let capturedBody: unknown = null;
    server.use(
      http.patch(/\/admin\/restaurant\/settings/, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({
          ...mockSettings,
          taxRate: '0.0825',
        });
      }),
    );

    renderPage(<FinancialsSettingsCard settings={mockSettings} />);

    const saveButton = screen.getByRole('button', { name: /save changes/i }) as HTMLButtonElement;
    const discardButton = screen.getByRole('button', { name: /discard/i }) as HTMLButtonElement;

    expect(saveButton.disabled).toBe(true);
    expect(discardButton.disabled).toBe(true);

    // Edit tax rate to 8.25%
    const taxInput = screen.getByDisplayValue('8');
    fireEvent.change(taxInput, { target: { value: '8.25' } });

    expect(saveButton.disabled).toBe(false);
    expect(discardButton.disabled).toBe(false);

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(capturedBody).toEqual({
        taxRate: '0.0825',
        defaultDeliveryFee: '5.00',
        minOrderAmount: '15.00',
        deliveryRadiusKm: 7,
      });
    });
  });

  it('shows inline validation error and disables save on invalid input', () => {
    renderPage(<FinancialsSettingsCard settings={mockSettings} />);

    const taxInput = screen.getByDisplayValue('8');
    fireEvent.change(taxInput, { target: { value: '150' } }); // > 100%

    expect(screen.getByText(/tax rate must be between 0% and 100%/i)).toBeDefined();

    const saveButton = screen.getByRole('button', { name: /save changes/i }) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);
  });

  it('discards dirty changes when Discard button is clicked', () => {
    renderPage(<FinancialsSettingsCard settings={mockSettings} />);

    const minOrderInput = screen.getByDisplayValue('15.00');
    fireEvent.change(minOrderInput, { target: { value: '25.00' } });

    expect(screen.getByDisplayValue('25.00')).toBeDefined();

    const discardButton = screen.getByRole('button', { name: /discard/i });
    fireEvent.click(discardButton);

    expect(screen.getByDisplayValue('15.00')).toBeDefined();
  });
});

describe('ReservationsSettingsCard', () => {
  it('modifies draft state with steppers and submits patch', async () => {
    let capturedBody: unknown = null;
    server.use(
      http.patch(/\/admin\/restaurant\/settings/, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({
          ...mockSettings,
          reservationSlotMinutes: 120,
        });
      }),
    );

    renderPage(<ReservationsSettingsCard settings={mockSettings} />);

    const saveButton = screen.getByRole('button', { name: /save changes/i }) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);

    const increaseButtons = screen.getAllByRole('button', { name: /increase/i });
    const slotIncrease = increaseButtons.at(0);
    expect(slotIncrease).toBeDefined();
    if (slotIncrease) fireEvent.click(slotIncrease); // slot minutes +15 (90 -> 105)

    expect(saveButton.disabled).toBe(false);

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(capturedBody).toEqual({
        reservationSlotMinutes: 105,
        reservationBufferMinutes: 15,
      });
    });
  });
});
