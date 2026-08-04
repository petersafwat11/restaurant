'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type {
  CancelReservationDto,
  CreateReservationDto,
  ReservationDto,
  ReservationListDto,
  ReservationListQuery,
  SeatReservationDto,
  TableDto,
} from '@repo/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reservationKeys } from '../query-keys';

export function useReservations(q?: ReservationListQuery) {
  return useQuery<ReservationListDto>({
    queryKey: reservationKeys.list(q),
    queryFn: () => getApiClient().reservations.list(q),
  });
}

export function useReservation(id: string) {
  return useQuery<ReservationDto>({
    queryKey: reservationKeys.detail(id),
    queryFn: () => getApiClient().reservations.getById(id),
    enabled: Boolean(id),
  });
}

export function useCreateReservation() {
  const qc = useQueryClient();
  return useMutation<ReservationDto, ApiError, CreateReservationDto>({
    mutationFn: (input) => getApiClient().reservations.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reservationKeys.all });
      notify('success', 'Reservation booked');
    },
    onError: (err) => notify('error', err.message),
  });
}

export function useCancelReservation(id: string) {
  const qc = useQueryClient();
  return useMutation<ReservationDto, ApiError, CancelReservationDto>({
    mutationFn: (input) => getApiClient().reservations.cancel(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reservationKeys.all });
      notify('success', 'Reservation cancelled');
    },
    onError: (err) => notify('error', err.message),
  });
}

export function useSeatReservation(id: string) {
  const qc = useQueryClient();
  return useMutation<ReservationDto, ApiError, SeatReservationDto>({
    mutationFn: (input) => getApiClient().reservations.seat(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reservationKeys.all });
      notify('success', 'Guests seated');
    },
    onError: (err) => notify('error', err.message),
  });
}

export function useCompleteReservation(id: string) {
  const qc = useQueryClient();
  return useMutation<ReservationDto, ApiError, void>({
    mutationFn: () => getApiClient().reservations.complete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reservationKeys.all });
      notify('success', 'Reservation marked complete');
    },
    onError: (err) => notify('error', err.message),
  });
}

export function useNoShowReservation(id: string) {
  const qc = useQueryClient();
  return useMutation<ReservationDto, ApiError, void>({
    mutationFn: () => getApiClient().reservations.noShow(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reservationKeys.all });
      notify('success', 'Marked as no-show');
    },
    onError: (err) => notify('error', err.message),
  });
}

export function useTables() {
  return useQuery<TableDto[]>({
    queryKey: reservationKeys.tables(),
    queryFn: () => getApiClient().reservations.tables.list(),
  });
}
