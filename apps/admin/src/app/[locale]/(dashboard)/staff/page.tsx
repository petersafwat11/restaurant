'use client';

import { usePageHeader } from '@/components/shell/page-title-context';
import { RequirePermission } from '@/features/auth/components';
import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { InviteStaffModal } from '@/features/staff/components';
import {
  useDeactivateStaff,
  useReactivateStaff,
  useStaff,
  useUpdateStaffRole,
} from '@/features/staff/hooks';
import { STAFF_ROLE_KEYS, type StaffMemberDto, type StaffRoleKey } from '@repo/types';
import { Button, type ColumnDef, DataTable, RelativeTime } from '@repo/ui';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

export default function StaffPage() {
  const t = useTranslations('admin.staff');
  const { has, user } = usePermissions();
  const [inviteOpen, setInviteOpen] = React.useState(false);

  const canWrite = has('staff:write');
  const currentUserId = user?.id;

  usePageHeader({
    title: t('title'),
    rightExtras: canWrite ? (
      <Button variant="primary" onClick={() => setInviteOpen(true)}>
        <Plus size={14} /> {t('invite')}
      </Button>
    ) : null,
  });

  const q = useStaff();
  const updateRole = useUpdateStaffRole();
  const deactivate = useDeactivateStaff();
  const reactivate = useReactivateStaff();
  const { mutate: mutateUpdateRole, isPending: isUpdatingRole } = updateRole;
  const { mutate: mutateDeactivate, isPending: isDeactivating } = deactivate;
  const { mutate: mutateReactivate, isPending: isReactivating } = reactivate;

  const rows = q.data ?? [];

  const columns = React.useMemo<ColumnDef<StaffMemberDto>[]>(
    () => [
      {
        id: 'name',
        header: t('columns.name'),
        cell: ({ row }) => {
          const r = row.original;
          const name = `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim() || t('missing');
          return (
            <div className="flex flex-col">
              <span className="text-fg">{name}</span>
              <span className="text-xs text-fg-subtle">{r.email}</span>
            </div>
          );
        },
      },
      {
        id: 'phone',
        header: t('columns.phone'),
        cell: ({ row }) => (
          <span className="tabular-nums text-fg-muted">{row.original.phone ?? t('missing')}</span>
        ),
      },
      {
        id: 'role',
        header: t('columns.role'),
        cell: ({ row }) => {
          const r = row.original;
          const role = (r.roleKeys[0] ?? 'cashier') as StaffRoleKey;
          const isSelf = r.id === currentUserId;
          if (!canWrite || isSelf) {
            return <span className="text-fg-muted">{t(`roles.${role}`)}</span>;
          }
          return (
            <select
              value={role}
              disabled={isUpdatingRole}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              onChange={(e) =>
                mutateUpdateRole({
                  userId: r.id,
                  input: { roleKey: e.target.value as StaffRoleKey },
                })
              }
              className="h-7 rounded-md border-hairline bg-surface px-2 text-xs text-fg-muted"
            >
              {STAFF_ROLE_KEYS.map((rk) => (
                <option key={rk} value={rk}>
                  {t(`roles.${rk}`)}
                </option>
              ))}
            </select>
          );
        },
      },
      {
        id: 'status',
        header: t('columns.status'),
        cell: ({ row }) => {
          const active = row.original.isActive;
          const verified = !!row.original.emailVerifiedAt;
          const label = !verified
            ? t('status.invited')
            : active
              ? t('status.active')
              : t('status.disabled');
          const cls = !verified
            ? 'bg-warning/[0.12] text-warning'
            : active
              ? 'bg-positive/[0.12] text-positive'
              : 'bg-fg-subtle/[0.12] text-fg-muted';
          return (
            <span className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] ${cls}`}>
              {label}
            </span>
          );
        },
      },
      {
        id: 'createdAt',
        header: t('columns.added'),
        cell: ({ row }) => <RelativeTime value={row.original.createdAt} />,
      },
      {
        id: 'actions',
        header: '',
        meta: { align: 'right' },
        cell: ({ row }) => {
          const r = row.original;
          const isSelf = r.id === currentUserId;
          if (!canWrite || isSelf) return null;
          return (
            <div
              className="flex justify-end gap-1"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              role="presentation"
            >
              {r.isActive ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isDeactivating}
                  onClick={() => mutateDeactivate(r.id)}
                  className="text-negative hover:text-negative"
                >
                  {t('actions.disable')}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isReactivating}
                  onClick={() => mutateReactivate(r.id)}
                >
                  {t('actions.enable')}
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [
      canWrite,
      currentUserId,
      mutateUpdateRole,
      isUpdatingRole,
      mutateDeactivate,
      isDeactivating,
      mutateReactivate,
      isReactivating,
      t,
    ],
  );

  return (
    <RequirePermission perm={['staff:read', 'staff:write']} mode="any">
      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.id}
        loading={q.isLoading}
        emptyState={<div className="text-sm text-fg-muted">{t('empty')}</div>}
      />
      <InviteStaffModal open={inviteOpen} onOpenChange={setInviteOpen} />
    </RequirePermission>
  );
}
