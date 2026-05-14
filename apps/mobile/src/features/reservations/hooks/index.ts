import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type {
  AvailabilityQueryDto,
  AvailabilityResponseDto,
  CancelReservationDto,
  CreateReservationDto,
  ReservationDto,
  ReservationListDto,
} from '@repo/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useReservationAvailability(input: AvailabilityQueryDto, enabled = true) {
  return useQuery<AvailabilityResponseDto>({
    queryKey: ['reservations', 'availability', input],
    queryFn: () => getApiClient().reservations.availability(input),
    enabled,
    staleTime: 30_000,
  });
}

export function useCreateReservation() {
  return useMutation<ReservationDto, ApiError, CreateReservationDto>({
    mutationFn: (input) => getApiClient().reservations.create(input),
    onError: (err) => notify('error', err.message),
  });
}

export function useMyReservations() {
  return useQuery<ReservationListDto>({
    queryKey: ['reservations', 'me'],
    queryFn: () => getApiClient().reservations.listMine(),
  });
}

export function useCancelReservation(id: string) {
  const qc = useQueryClient();
  return useMutation<ReservationDto, ApiError, CancelReservationDto>({
    mutationFn: (input) => getApiClient().reservations.cancel(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
    onError: (err) => notify('error', err.message),
  });
}
