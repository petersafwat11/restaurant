'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type {
  ContactMessageDto,
  ContactMessageListDto,
  ContactMessageListQuery,
  ContactNoteDto,
  ContactReplyDto,
  CreateContactNoteDto,
  UpdateContactMessageDto,
} from '@repo/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const contactKeys = {
  all: ['contact'] as const,
  list: (q?: ContactMessageListQuery) => ['contact', 'list', q ?? {}] as const,
  notes: (id: string) => ['contact', 'notes', id] as const,
};

export function useContactMessages(q?: ContactMessageListQuery) {
  return useQuery<ContactMessageListDto>({
    queryKey: contactKeys.list(q),
    queryFn: () => getApiClient().contact.list(q),
  });
}

const CONTACT_STATUS_LABELS: Record<string, string> = {
  new: 'new',
  read: 'read',
  archived: 'archived',
};

export function useUpdateContactStatus() {
  const qc = useQueryClient();
  return useMutation<ContactMessageDto, ApiError, { id: string; input: UpdateContactMessageDto }>({
    mutationFn: ({ id, input }) => getApiClient().contact.updateStatus(id, input),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: contactKeys.all });
      notify('success', `Marked as ${CONTACT_STATUS_LABELS[data.status] ?? data.status}`);
    },
    onError: (err) => notify('error', err.message),
  });
}

export function useContactNotes(id: string | null) {
  return useQuery<ContactNoteDto[]>({
    queryKey: contactKeys.notes(id ?? ''),
    queryFn: () => getApiClient().contact.listNotes(id ?? ''),
    enabled: Boolean(id),
  });
}

export function useAddContactNote(id: string) {
  const qc = useQueryClient();
  return useMutation<ContactNoteDto, ApiError, CreateContactNoteDto>({
    mutationFn: (input) => getApiClient().contact.addNote(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contactKeys.notes(id) });
      notify('success', 'Internal note added');
    },
    onError: (err) => notify('error', err.message),
  });
}

export function useReplyToContact(id: string) {
  const qc = useQueryClient();
  return useMutation<ContactNoteDto, ApiError, ContactReplyDto>({
    mutationFn: (input) => getApiClient().contact.reply(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contactKeys.notes(id) });
      qc.invalidateQueries({ queryKey: contactKeys.all });
      notify('success', 'Reply sent');
    },
    onError: (err) => notify('error', err.message),
  });
}
