'use client';

import { usePermissions } from '@/features/auth/hooks/use-permissions';
import {
  useAddContactNote,
  useContactNotes,
  useReplyToContact,
  useUpdateContactStatus,
} from '@/features/contact/hooks';
import { CONTACT_STATUSES, type ContactMessageDto } from '@repo/types';
import { Button, DetailDrawer, RelativeTime, Textarea } from '@repo/ui';
import { useTranslations } from 'next-intl';
import * as React from 'react';

interface Props {
  message: ContactMessageDto | null;
  onOpenChange: (open: boolean) => void;
}

export function ContactDrawer({ message, onOpenChange }: Props) {
  const t = useTranslations('admin.contact');
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
      ariaLabel={t('drawer.ariaLabel')}
      header={
        message && (
          <div className="px-6 py-4">
            <div className="text-h2-admin text-fg">
              {message.subject ?? t('drawer.noSubject')}
            </div>
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
                {t('drawer.markStatus', { status: t(`drawer.status.${s}`) })}
              </Button>
            ))}
            <a
              href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject ?? ''}`)}`}
              className="ml-auto text-xs text-fg-subtle hover:text-fg"
            >
              {t('drawer.openInClient')}
            </a>
          </div>
        )
      }
    >
      {message && (
        <div className="space-y-4">
          <section>
            <div className="mb-1 text-caption-admin text-fg-subtle">
              {t('drawer.messageLabel')}
            </div>
            <div className="whitespace-pre-wrap rounded-md border-hairline bg-surface-2 p-3 text-sm text-fg">
              {message.message}
            </div>
          </section>
          {message.handledByUserId && (
            <section className="text-xs text-fg-subtle">
              {t('drawer.handledBy', { id: message.handledByUserId })}
              {message.handledAt && (
                <>
                  {' '}
                  · <RelativeTime value={message.handledAt} />
                </>
              )}
            </section>
          )}

          <section>
            <div className="mb-1 text-caption-admin text-fg-subtle">
              {t('drawer.activityLabel')}
            </div>
            {noteRows.length === 0 ? (
              <div className="rounded-md border-hairline bg-surface-2 p-3 text-xs text-fg-subtle">
                {t('drawer.activityEmpty')}
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
                      <span>{n.kind === 'REPLY' ? t('drawer.kind.reply') : t('drawer.kind.note')}</span>
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
              <div className="mb-1 text-caption-admin text-fg-subtle">
                {t('drawer.replyLabel')}
              </div>
              <Textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                rows={4}
                placeholder={t('drawer.replyPlaceholder')}
              />
              <div className="mt-2 flex justify-end">
                <Button
                  variant="primary"
                  disabled={reply.isPending || replyBody.trim().length === 0}
                  onClick={() =>
                    reply.mutate({ body: replyBody.trim() }, { onSuccess: () => setReplyBody('') })
                  }
                >
                  {reply.isPending ? t('drawer.replySending') : t('drawer.replySend')}
                </Button>
              </div>
            </section>
          )}

          {canNote && (
            <section>
              <div className="mb-1 text-caption-admin text-fg-subtle">
                {t('drawer.noteLabel')}
              </div>
              <Textarea
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                rows={3}
                placeholder={t('drawer.notePlaceholder')}
              />
              <div className="mt-2 flex justify-end">
                <Button
                  variant="ghost"
                  disabled={addNote.isPending || noteBody.trim().length === 0}
                  onClick={() =>
                    addNote.mutate({ body: noteBody.trim() }, { onSuccess: () => setNoteBody('') })
                  }
                >
                  {t('drawer.noteAdd')}
                </Button>
              </div>
            </section>
          )}
        </div>
      )}
    </DetailDrawer>
  );
}
