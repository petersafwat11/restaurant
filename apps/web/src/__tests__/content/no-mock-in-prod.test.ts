/**
 * Phase H1/H4 — static guards over the web source tree.
 *
 * 1. (H1, hard fail) No production-rendered module may import the Szef Donald
 *    mock fixtures. The fixtures live under `__mocks__/` and must stay out of
 *    the production bundle. This is the regression backstop for "remove runtime
 *    mock fallbacks".
 *
 * 2. (H4, allowlist) External Unsplash imagery is only tolerated in the
 *    marketing section that still uses placeholder photography pending
 *    owner-supplied licensed assets (`hero.tsx`). Any other
 *    occurrence — e.g. a mock fixture creeping back into a rendered component —
 *    fails, and any NEW stock photo must be added to the allowlist consciously.
 *
 * These are filesystem scans, not renders, so they need no MSW handlers.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const WEB_SRC = join(__dirname, '..', '..');

/** Directories that are test/fixture-only and excluded from the prod scan. */
const EXCLUDED_DIRS = new Set(['__tests__', '__mocks__', 'node_modules', 'test']);

const SOURCE_EXT = /\.(ts|tsx)$/;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (EXCLUDED_DIRS.has(entry)) continue;
      out.push(...walk(full));
    } else if (SOURCE_EXT.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/** Production (non-test, non-fixture) source files under apps/web/src. */
const PROD_FILES = walk(WEB_SRC);

function toPosix(p: string): string {
  return relative(WEB_SRC, p).split(sep).join('/');
}

describe('no mock fixtures in production source (H1)', () => {
  it('finds production source files to scan', () => {
    // Guards against the walk silently returning nothing (wrong base path).
    expect(PROD_FILES.length).toBeGreaterThan(50);
  });

  it('no production module imports the Szef Donald mock fixtures', () => {
    // Match `from '@/lib/mock/...'`, `from '.../__mocks__/szef-donald'`, or any
    // szef-donald fixture import, in real (non-test) source.
    const importRe = /from\s+['"][^'"]*(?:lib\/mock|__mocks__\/szef-donald)[^'"]*['"]/;
    const offenders = PROD_FILES.filter((f) => importRe.test(readFileSync(f, 'utf8'))).map(toPosix);
    expect(offenders, `Mock fixtures imported by production code: ${offenders.join(', ')}`).toEqual(
      [],
    );
  });
});

describe('external/Unsplash imagery is allow-listed (H4)', () => {
  // Marketing sections that still use placeholder stock photos until the owner
  // uploads licensed assets (Phase H4 owner task). This list IS the registry of
  // imagery awaiting replacement — keep it SHRINKING, never growing.
  const UNSPLASH_ALLOWLIST = new Set(['features/landing/sections/hero.tsx']);

  it('only the allow-listed marketing sections reference images.unsplash.com', () => {
    const offenders = PROD_FILES.filter((f) =>
      readFileSync(f, 'utf8').includes('images.unsplash.com'),
    )
      .map(toPosix)
      .filter((rel) => !UNSPLASH_ALLOWLIST.has(rel));

    expect(
      offenders,
      `Unexpected Unsplash imagery (replace with licensed assets or allow-list): ${offenders.join(
        ', ',
      )}`,
    ).toEqual([]);
  });

  it('documents the allow-listed files as owner replacement TODOs', () => {
    // Sanity check that the allow-listed files actually still contain the URL,
    // so this list is pruned once the owner replaces the photography.
    const stillUsing = [...UNSPLASH_ALLOWLIST].filter((rel) =>
      readFileSync(join(WEB_SRC, rel), 'utf8').includes('images.unsplash.com'),
    );
    // If this fails because the set is empty, delete the allow-list entry.
    expect(stillUsing.length).toBe(UNSPLASH_ALLOWLIST.size);
  });
});
