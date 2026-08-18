'use client';

import { useRouter } from '@/i18n/navigation';
import { useOrderAlarm } from '@/providers/order-alarm-provider';
import { Button, cn } from '@repo/ui';
import { AlertTriangle, Bell, BellOff, Check, Clock, Eye, Volume2 } from 'lucide-react';
import React, { useMemo } from 'react';

export function OrderAlarmBanner() {
  const router = useRouter();
  const {
    pendingOrders,
    activeRingingOrders,
    snoozedOrders,
    isMuted,
    isRinging,
    isAudioBlocked,
    setMuted,
    snoozeOrder,
    snoozeAll,
    confirmOrder,
    unlockAudio,
  } = useOrderAlarm();

  const primaryOrder = activeRingingOrders[0] ?? pendingOrders[0];
  const primaryOrderId = primaryOrder?.id;
  const snoozeRecord = primaryOrderId ? snoozedOrders[primaryOrderId] : undefined;
  const isSnoozed = Boolean(
    primaryOrderId && !activeRingingOrders.some((o) => o.id === primaryOrderId),
  );

  const minutesPending = useMemo(() => {
    if (!primaryOrder) return 0;
    const createdAtMs = new Date(primaryOrder.createdAt).getTime();
    return Math.max(0, Math.round((Date.now() - createdAtMs) / 60_000));
  }, [primaryOrder]);

  const snoozeRemainingSecs = useMemo(() => {
    if (!snoozeRecord) return 0;
    return Math.max(0, Math.round((snoozeRecord.reAlarmAt - Date.now()) / 1000));
  }, [snoozeRecord]);

  const isUrgent = minutesPending >= 5;

  if (!primaryOrder) {
    if (!isAudioBlocked) return null;
    return (
      <div className="w-full">
        <div className="flex items-center justify-between gap-3 bg-accent/15 px-4 py-2 text-xs font-medium text-accent border-b border-accent/20">
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 animate-bounce" />
            <span>
              Audio alerts are muted by browser autoplay policy. Click to enable live order sound
              ringing.
            </span>
          </div>
          <Button
            size="sm"
            variant="primary"
            className="h-7 px-2.5 text-xs"
            onClick={() => void unlockAudio()}
          >
            Enable Sound
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Autoplay Unlock Notice (if browser blocked initial audio context) */}
      {isAudioBlocked && (
        <div className="flex items-center justify-between gap-3 bg-accent/15 px-4 py-2 text-xs font-medium text-accent border-b border-accent/20">
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 animate-bounce" />
            <span>
              Audio alerts are muted by browser autoplay policy. Click to enable live order sound
              ringing.
            </span>
          </div>
          <Button
            size="sm"
            variant="primary"
            className="h-7 px-2.5 text-xs"
            onClick={() => void unlockAudio()}
          >
            Enable Sound
          </Button>
        </div>
      )}

      {/* Main Order Alert Banner */}
      <div
        className={cn(
          'relative z-30 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5 transition-all sm:px-6',
          isRinging && isUrgent
            ? 'border-negative/30 bg-negative/15 text-fg'
            : isRinging
              ? 'border-warning/30 bg-warning/15 text-fg'
              : 'border-hairline bg-surface text-fg-muted',
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          {/* Pulsing indicator icon */}
          <div
            className={cn(
              'grid h-8 w-8 shrink-0 place-items-center rounded-full transition-transform',
              isRinging && isUrgent
                ? 'animate-pulse bg-negative text-text-on-accent'
                : isRinging
                  ? 'animate-bounce bg-warning text-bg'
                  : 'bg-surface-2 text-fg-muted',
            )}
          >
            {isRinging ? (
              isUrgent ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <Bell className="h-4 w-4 animate-spin-slow" />
              )
            ) : (
              <Clock className="h-4 w-4" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-fg">
                {isUrgent
                  ? '⚠️ URGENT ACTION REQUIRED:'
                  : isRinging
                    ? '🔔 NEW ORDER ALERT:'
                    : '⏳ SNOOZED ORDER:'}
              </span>
              <span className="font-mono text-xs font-semibold text-fg">
                #{primaryOrder.orderNumber}
              </span>
              {pendingOrders.length > 1 && (
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-fg-subtle">
                  +{pendingOrders.length - 1} more pending
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-fg-subtle">
              <span>
                {primaryOrder.customerName ?? 'Guest'} · {primaryOrder.grandTotal}{' '}
                {primaryOrder.currency}
              </span>
              <span>•</span>
              <span className={cn(isUrgent && 'font-semibold text-negative')}>
                Placed {minutesPending === 0 ? 'just now' : `${minutesPending}m ago`}
              </span>
              {isSnoozed && snoozeRemainingSecs > 0 && (
                <>
                  <span>•</span>
                  <span className="text-accent">
                    Re-alarms in {Math.ceil(snoozeRemainingSecs / 60)}m
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Sound Mute Toggle */}
          <button
            type="button"
            onClick={() => setMuted(!isMuted)}
            title={isMuted ? 'Unmute order alerts' : 'Mute order alerts'}
            className="grid h-8 w-8 place-items-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg"
          >
            {isMuted ? <BellOff className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          {/* Snooze button (if ringing) */}
          {!isSnoozed && (
            <Button
              size="sm"
              variant="secondary"
              className="h-8 text-xs font-medium"
              onClick={() => snoozeOrder(primaryOrder.id, 5)}
            >
              <Clock className="mr-1.5 h-3.5 w-3.5" />
              Snooze (5m)
            </Button>
          )}

          {/* View Details button */}
          <Button
            size="sm"
            variant="secondary"
            className="h-8 text-xs font-medium"
            onClick={() => router.push(`/orders/${encodeURIComponent(primaryOrder.id)}`)}
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            View
          </Button>

          {/* Quick Accept/Confirm button */}
          <Button
            size="sm"
            variant="primary"
            className={cn(
              'h-8 text-xs font-semibold shadow-sm',
              isUrgent
                ? 'bg-negative hover:bg-negative/90'
                : 'bg-positive hover:bg-positive/90 text-white',
            )}
            onClick={() => void confirmOrder(primaryOrder)}
          >
            <Check className="mr-1.5 h-3.5 w-3.5" />
            Confirm Order
          </Button>
        </div>
      </div>
    </div>
  );
}
