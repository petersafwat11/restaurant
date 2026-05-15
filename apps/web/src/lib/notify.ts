/**
 * No-op notify helper. UI sprint will swap this for a real toast library.
 * Keep the signature stable: `notify(level, message)`.
 */
export type NotifyLevel = 'success' | 'error' | 'info' | 'warning';

export function notify(level: NotifyLevel, message: string): void {
  if (typeof window !== 'undefined') {
    // biome-ignore lint/suspicious/noConsole: placeholder
    console.log(`[notify:${level}] ${message}`);
  }
}
