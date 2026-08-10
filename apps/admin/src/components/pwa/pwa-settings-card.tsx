'use client';

import { usePwa } from '@/components/pwa/pwa-provider';
import { useWebPush } from '@/components/pwa/use-web-push';
import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { notify } from '@/lib/notify';
import { Button, SettingsSectionCard } from '@repo/ui';
import {
  BellRing,
  CheckCircle2,
  Download,
  LoaderCircle,
  RefreshCw,
  Share2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

export function PwaSettingsCard() {
  const t = useTranslations('admin.settings.general.pwa');
  const { has } = usePermissions();
  const canReadOrders = has('order:read');
  const webPush = useWebPush();
  const {
    supported,
    online,
    isIos,
    isStandalone,
    installAvailable,
    updateReady,
    install,
    applyUpdate,
  } = usePwa();

  const status = isStandalone
    ? t('status.installed')
    : installAvailable
      ? t('status.ready')
      : isIos
        ? t('status.ios')
        : supported
          ? t('status.browserManaged')
          : t('status.unsupported');

  const pushStatus = t(`notifications.status.${webPush.state}`);

  const toggleWebPush = async () => {
    const enabling = !webPush.enabled;
    const succeeded = enabling ? await webPush.enable() : await webPush.disable();
    if (succeeded) {
      notify(
        'success',
        t(enabling ? 'notifications.toast.enabled' : 'notifications.toast.disabled'),
      );
    } else if (Notification.permission !== 'denied') {
      notify('error', t('notifications.toast.error'));
    }
  };

  return (
    <SettingsSectionCard
      id="pwa"
      title={t('title')}
      description={t('description')}
      className="xl:col-span-2"
      action={
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption-admin ${
            online ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'
          }`}
        >
          {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {online ? t('connection.online') : t('connection.offline')}
        </span>
      }
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-button bg-accent-muted text-accent">
            {isStandalone ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : isIos && !installAvailable ? (
              <Share2 className="h-5 w-5" />
            ) : (
              <Download className="h-5 w-5" />
            )}
          </div>
          <div>
            <p className="text-small text-fg">{status}</p>
            {isIos && !isStandalone && !installAvailable && (
              <p className="mt-1 text-caption-admin text-fg-subtle">{t('iosHelp')}</p>
            )}
          </div>
        </div>

        {installAvailable && !isStandalone && (
          <Button type="button" variant="primary" onClick={() => void install()}>
            <Download className="h-4 w-4" />
            {t('install')}
          </Button>
        )}
      </div>

      {updateReady && (
        <div className="flex flex-col gap-3 border-t border-border/[var(--border-alpha)] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-small text-fg-muted">{t('update.description')}</p>
          <Button type="button" variant="secondary" onClick={applyUpdate}>
            <RefreshCw className="h-4 w-4" />
            {t('update.action')}
          </Button>
        </div>
      )}

      {canReadOrders && (
        <div className="flex flex-col gap-3 border-t border-border/[var(--border-alpha)] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-button bg-accent-muted text-accent">
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <p className="text-small font-medium text-fg">{t('notifications.title')}</p>
              <p className="mt-1 text-caption-admin text-fg-subtle" aria-live="polite">
                {pushStatus}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant={webPush.enabled ? 'secondary' : 'primary'}
            disabled={
              webPush.busy ||
              webPush.state === 'unsupported' ||
              webPush.state === 'unconfigured' ||
              webPush.state === 'denied'
            }
            onClick={() => void toggleWebPush()}
          >
            {webPush.busy && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {t(webPush.enabled ? 'notifications.disable' : 'notifications.enable')}
          </Button>
        </div>
      )}

      <p className="border-t border-border/[var(--border-alpha)] pt-4 text-caption-admin text-fg-subtle">
        {t('privacy')}
      </p>
    </SettingsSectionCard>
  );
}
