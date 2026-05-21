import { toast } from 'sonner';

/**
 * Thin wrapper over sonner's toast API. Keep the (level, message) signature
 * stable so all hooks/components can call `notify(level, msg)` without caring
 * which library is underneath.
 */
export type NotifyLevel = 'success' | 'error' | 'info' | 'warning';

export function notify(level: NotifyLevel, message: string): void {
  switch (level) {
    case 'success':
      toast.success(message);
      return;
    case 'error':
      toast.error(message);
      return;
    case 'warning':
      toast.warning(message);
      return;
    default:
      toast(message);
      return;
  }
}
