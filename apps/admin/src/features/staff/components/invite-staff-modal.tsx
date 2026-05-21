'use client';

import { useInviteStaff } from '@/features/staff/hooks';
import { STAFF_ROLE_KEYS, type StaffRoleKey } from '@repo/types';
import { ActionModal, Input, Label } from '@repo/ui';
import * as React from 'react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteStaffModal({ open, onOpenChange }: Props) {
  const invite = useInviteStaff();
  const { reset: resetInvite } = invite;
  const [email, setEmail] = React.useState('');
  const [roleKey, setRoleKey] = React.useState<StaffRoleKey>('cashier');
  const [token, setToken] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setEmail('');
      setRoleKey('cashier');
      setToken(null);
      resetInvite();
    }
  }, [open, resetInvite]);

  const canSubmit = /^\S+@\S+\.\S+$/.test(email) && !invite.isPending;

  function submit() {
    invite.mutate(
      { email, roleKey },
      {
        onSuccess: (res) => setToken(res.token),
      },
    );
  }

  return (
    <ActionModal
      open={open}
      onOpenChange={onOpenChange}
      title={token ? 'Invite sent' : 'Invite staff member'}
      description={
        token
          ? 'Share this single-use token with the invitee. They use it on /accept-invite.'
          : 'They will receive an email with a one-time link.'
      }
      primary={
        token
          ? { label: 'Done', onClick: () => onOpenChange(false) }
          : {
              label: invite.isPending ? 'Sending…' : 'Send invite',
              onClick: submit,
              disabled: !canSubmit,
              loading: invite.isPending,
            }
      }
      secondary={token ? undefined : { label: 'Cancel', onClick: () => onOpenChange(false) }}
    >
      {token ? (
        <div className="space-y-2">
          <Label>Token</Label>
          <div className="flex gap-2">
            <Input value={token} readOnly className="font-mono text-xs" />
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(token)}
              className="inline-flex h-9 items-center rounded-md bg-surface-2 px-3 text-xs text-fg-muted hover:text-fg"
            >
              Copy
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="person@example.com"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="invite-role">Role</Label>
            <select
              id="invite-role"
              value={roleKey}
              onChange={(e) => setRoleKey(e.target.value as StaffRoleKey)}
              className="h-9 w-full rounded-md border-hairline-strong bg-surface px-2 text-sm text-fg"
            >
              {STAFF_ROLE_KEYS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          {invite.error && <div className="text-xs text-negative">{invite.error.message}</div>}
        </div>
      )}
    </ActionModal>
  );
}
