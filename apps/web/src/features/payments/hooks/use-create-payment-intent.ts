'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { CreatePaymentIntentDto, PaymentIntentResponseDto } from '@repo/types';
import { useMutation } from '@tanstack/react-query';

export function useCreatePaymentIntent() {
  return useMutation<PaymentIntentResponseDto, ApiError, CreatePaymentIntentDto>({
    mutationFn: (input) => getApiClient().payments.createIntent(input),
    onError: (err) => notify('error', err.message),
  });
}
