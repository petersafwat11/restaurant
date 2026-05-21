'use client';

import { usePermissions } from '@/features/auth/hooks/use-permissions';
import {
  useAddContactNote,
  useContactNotes,
  useReplyToContact,
  useUpdateContactStatus,
} from '@/features/contact/hooks';
import { CONTACT_STATUSES, type ContactMessageDto, type ContactStatus } from '@repo/types';
import { Button, DetailDrawer, RelativeTime, Textarea } from '@repo/ui';
import * as React from 'react';

interface Props {
  message: ContactMessageDto | null;
  onOpenChange: (open: boolean) => void;
}

const STATUS_LABEL: Record<ContactStatus, string> = {
  new: 'New',
  read: 'Read',
  archived: 'Archived',
};

export function ContactDrawer({ message, onOpenChange }: Props) {
  const { has } = usePermissions();
  const update = useUpdateContactStatus();
  const notes = useContactNotes(message?.id ?? null);
  const addNote = useAddContactNote(message?.id ?? '');
  const reply = useReplyToContact(message?.id ?? '');
  const open = message !== null;
  const canHandle = has('contact:read');
  const canReply = has('contact:reply');
  const canNote = has('contact:notes');

  const [replyBody, setReplyBody] = React.useState('');
  const [noteBody, setNoteBody] = React.useState('');
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset only on message switch
  React.useEffect(() => {
    setReplyBody('');
    setNoteBody('');
  }, [message?.id]);

  const noteRows = notes.data ?? [];

  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      width={560}
      ariaLabel="Contact message"
      header={
        message && (
          <div className="px-6 py-4">
            <div className="text-h2-admin text-fg">{message.subject ?? '(no subject)'}</div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
              <span>{message.name}</span>
              <span className="text-fg-subtle">·</span>
              <a href={`mailto:${message.email}`} className="text-accent hover:underline">
                {message.email}
              </a>
              <span className="text-fg-subtle">·</span>
              <RelativeTime value={message.createdAt} />
            </div>
          </div>
        )
      }
      footer={
        message && (
          <div className="flex w-full flex-wrap items-center gap-2">
            {CONTACT_STATUSES.map((s) => (
              <Button
                key={s}
                variant={message.status === s ? 'primary' : 'ghost'}
                disabled={!canHandle || update.isPending || message.status === s}
                onClick={() => update.mutate({ id: message.id, input: { status: s } })}
              >
                Mark {STATUS_LABEL[s]}
              </Button>
            ))}
            <a
              href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject ?? ''}`)}`}
              className="ml-auto text-xs text-fg-subtle hover:text-fg"
            >
              Open in email client
            </a>
          </div>
        )
      }
    >
      {message && (
        <div className="space-y-4">
          <section>
            <div className="mb-1 text-caption-admin text-fg-subtle">Message</div>
            <div className="whitespace-pre-wrap rounded-md border-hairline bg-surface-2 p-3 text-sm text-fg">
              {message.message}
            </div>
          </section>
          {message.handledByUserId && (
            <section className="text-xs text-fg-subtle">
              Handled by {message.handledByUserId}
              {message.handledAt && (
                <>
                  {' '}
                  · <RelativeTime value={message.handledAt} />
                </>
              )}
            </section>
          )}

          <section>
            <div className="mb-1 text-caption-admin text-fg-subtle">Activity</div>
            {noteRows.length === 0 ? (
              <div className="rounded-md border-hairline bg-surface-2 p-3 text-xs text-fg-subtle">
                No notes or replies yet.
              </div>
            ) : (
              <ul className="space-y-2">
                {noteRows.map((n) => (
                  <li
                    key={n.id}
                    className={`rounded-md border-hairline p-3 text-sm ${
                      n.kind === 'REPLY' ? 'bg-accent/[0.06]' : 'bg-surface-2'
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between text-[11px] text-fg-subtle">
                      <span>{n.kind === 'REPLY' ? 'Reply sent' : 'Internal note'}</span>
                      <RelativeTime value={n.createdAt} />
                    </div>
                    <div className="whitespace-pre-wrap text-fg">{n.body}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {canReply && (
            <section>
              <div className="mb-1 text-caption-admin text-fg-subtle">Reply to customer</div>
              <Textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                rows={4}
                placeholder="Type your reply…"
              />
              <div className="mt-2 flex justify-end">
                <Button
                  variant="primary"
                  disabled={reply.isPending || replyBody.trim().length === 0}
                  onClick={() =>
                    reply.mutate({ body: replyBody.trim() }, { onSuccess: () => setReplyBody('') })
                  }
                >
                  {reply.isPending ? 'Sending…' : 'Send reply'}
                </Button>
              </div>
            </section>
          )}

          {canNote && (
            <section>
              <div className="mb-1 text-caption-admin text-fg-subtle">Internal note</div>
              <Textarea
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                rows={3}
                placeholder="Visible only to staff…"
              />
              <div className="mt-2 flex justify-end">
                <Button
                  variant="ghost"
                  disabled={addNote.isPending || noteBody.trim().length === 0}
                  onClick={() =>
                    addNote.mutate({ body: noteBody.trim() }, { onSuccess: () => setNoteBody('') })
                  }
                >
                  Add note
                </Button>
              </div>
            </section>
          )}
        </div>
      )}
    </DetailDrawer>
  );
}
