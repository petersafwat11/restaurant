import { getApiClient } from '@/lib/api-client';
import type { ApiError } from '@repo/api-client';
import type { FavoriteDto, FavoriteIdsDto, FavoriteListDto, FavoriteListQuery } from '@repo/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const favoriteKeys = {
  all: ['favorites'] as const,
  list: (q?: FavoriteListQuery) => ['favorites', 'list', q ?? {}] as const,
  ids: ['favorites', 'ids'] as const,
};

export function useFavorites(q?: FavoriteListQuery) {
  return useQuery<FavoriteListDto>({
    queryKey: favoriteKeys.list(q),
    queryFn: () => getApiClient().favorites.list(q),
  });
}

export function useFavoriteIds() {
  return useQuery<FavoriteIdsDto>({
    queryKey: favoriteKeys.ids,
    queryFn: () => getApiClient().favorites.ids(),
  });
}

export function useAddFavorite() {
  const qc = useQueryClient();
  return useMutation<FavoriteDto, ApiError, string>({
    mutationFn: (menuItemId) => getApiClient().favorites.add(menuItemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: favoriteKeys.all }),
  });
}

export function useRemoveFavorite() {
  const qc = useQueryClient();
  return useMutation<{ removed: boolean }, ApiError, string>({
    mutationFn: (menuItemId) => getApiClient().favorites.remove(menuItemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: favoriteKeys.all }),
  });
}
