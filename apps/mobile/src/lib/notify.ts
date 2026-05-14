export type NotifyLevel = 'success' | 'error' | 'info' | 'warning';

export function notify(level: NotifyLevel, message: string): void {
  // biome-ignore lint/suspicious/noConsole: placeholder until UI toast lands
  console.log(`[notify:${level}] ${message}`);
}
