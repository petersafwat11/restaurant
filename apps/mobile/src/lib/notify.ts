export type NotifyLevel = 'success' | 'error' | 'info' | 'warning';

export function notify(level: NotifyLevel, message: string): void {
  console.log(`[notify:${level}] ${message}`);
}
