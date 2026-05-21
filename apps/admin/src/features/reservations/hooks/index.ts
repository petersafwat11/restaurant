'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type {
  AvailabilityQueryDto,
  AvailabilityResponseDto,
  CancelReservationDto,
  CreateReservationDto,
  CreateTableDto,
  MoveReservationDto,
  ReservationDto,
  ReservationListDto,
  ReservationListQuery,
  SeatReservationDto,
  TableDto,
  UpdateReservationDto,
  UpdateTableDto,
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

export function useReservationAvailability(input: AvailabilityQueryDto, enabled = true) {
  return useQuery<AvailabilityResponseDto>({
    queryKey: reservationKeys.availability(input),
    queryFn: () => getApiClient().reservations.availability(input),
    staleTime: 30_000,
    enabled,
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

export function useUpdateReservation(id: string) {
  const qc = useQueryClient();
  return useMutation<ReservationDto, ApiError, UpdateReservationDto>({
    mutationFn: (input) => getApiClient().reservations.update(id, input),
    onSuccess: (data) => {
      qc.setQueryData(reservationKeys.detail(id), data);
      qc.invalidateQueries({ queryKey: reservationKeys.all });
      notify('success', 'Reservation updated');
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

export function useMoveReservation(id: string) {
  const qc = useQueryClient();
  return useMutation<ReservationDto, ApiError, MoveReservationDto>({
    mutationFn: (input) => getApiClient().reservations.move(id, input),
    onSuccess: (data) => {
      qc.setQueryData(reservationKeys.detail(id), data);
      qc.invalidateQueries({ queryKey: reservationKeys.all });
      notify('success', 'Reservation moved');
    },
    onError: (err) => {
      // 409 from the conflict-check is a normal user signal, not a toast-worthy
      // error — surface inline. Other errors get the default toast.
      if (err.status !== 409) notify('error', err.message);
    },
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

export function useCreateTable() {
  const qc = useQueryClient();
  return useMutation<TableDto, ApiError, CreateTableDto>({
    mutationFn: (input) => getApiClient().reservations.tables.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reservationKeys.tables() });
      notify('success', 'Table added');
    },
    onError: (err) => notify('error', err.message),
  });
}

export function useUpdateTable(tableId: string) {
  const qc = useQueryClient();
  return useMutation<TableDto, ApiError, UpdateTableDto>({
    mutationFn: (input) => getApiClient().reservations.tables.update(tableId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reservationKeys.tables() });
      notify('success', 'Table updated');
    },
    onError: (err) => notify('error', err.message),
  });
}

export function useDeleteTable() {
  const qc = useQueryClient();
  return useMutation<{ success: true }, ApiError, string>({
    mutationFn: (tableId) => getApiClient().reservations.tables.delete(tableId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reservationKeys.tables() });
      notify('success', 'Table removed');
    },
    onError: (err) => notify('error', err.message),
  });
}
