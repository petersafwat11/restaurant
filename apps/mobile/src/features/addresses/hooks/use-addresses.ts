import { getApiClient } from '@/lib/api-client';
import type { AddressDto } from '@repo/types';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { addressQueryKeys } from '../query-keys';

export function useAddresses(): UseQueryResult<AddressDto[]> {
  return useQuery<AddressDto[]>({
    queryKey: addressQueryKeys.all,
    queryFn: () => getApiClient().addresses.list(),
  });
}
