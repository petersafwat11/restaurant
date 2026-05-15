'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { ContactMessageDto, CreateContactMessageDto } from '@repo/types';
import { useMutation } from '@tanstack/react-query';

export function useSendContactMessage() {
  return useMutation<ContactMessageDto, ApiError, CreateContactMessageDto>({
    mutationFn: (input) => getApiClient().contact.send(input),
    onSuccess: () => notify('success', 'Message sent — we will be in touch'),
    onError: (err) => notify('error', err.message),
  });
}
