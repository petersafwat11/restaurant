'use client';

import { getApiClient } from '@/lib/api-client';
import type { ApiError } from '@repo/api-client';
import type { ValidateCouponDto, ValidateCouponResponseDto } from '@repo/types';
import { useMutation } from '@tanstack/react-query';

export function useValidateCoupon() {
  return useMutation<ValidateCouponResponseDto, ApiError, ValidateCouponDto>({
    mutationFn: (input) => getApiClient().coupons.validate(input),
  });
}
