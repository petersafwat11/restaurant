import { describe, expect, it } from 'vitest';
import { loadMessages } from './messages';

function leafPaths(obj: unknown, prefix = ''): string[] {
  if (typeof obj === 'string') return [prefix];
  if (obj && typeof obj === 'object') {
    return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
      leafPaths(v, prefix ? `${prefix}.${k}` : k),
    );
  }
  return [];
}

describe('loadMessages', () => {
  it('en and pl have identical key sets', () => {
    const en = leafPaths(loadMessages('en')).sort();
    const pl = leafPaths(loadMessages('pl')).sort();
    expect(pl).toEqual(en);
    expect(en.length).toBeGreaterThan(50);
  });

  it('PL is the default — appName resolves to Restauracja', () => {
    expect((loadMessages('pl').common as { appName: string }).appName).toBe('Restauracja');
  });

  it('shared.orderStatus enums are present in both locales', () => {
    const enStatus = (loadMessages('en').shared.orderStatus as Record<string, string>);
    const plStatus = (loadMessages('pl').shared.orderStatus as Record<string, string>);
    expect(enStatus.PENDING).toBe('Pending');
    expect(plStatus.PENDING).toBe('Oczekujące');
  });
});
