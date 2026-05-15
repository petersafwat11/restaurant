import { describe, expect, it } from 'vitest';
import { FLAG_CATALOG } from './catalog';
import { evaluateAll, evaluateFlag, parseEnvOverrides, rolloutBucket } from './evaluate';

describe('feature-flags evaluate', () => {
  it('falls back to the catalog default', () => {
    expect(evaluateFlag('loyalty.redemption')).toBe(true);
    expect(evaluateFlag('soft_launch')).toBe(false);
  });

  it('env override beats DB row and default', () => {
    expect(
      evaluateFlag(
        'soft_launch',
        {},
        {
          envOverrides: { soft_launch: true },
          dbRows: [{ key: 'soft_launch', enabled: false, rolloutPercent: 0 }],
        },
      ),
    ).toBe(true);
  });

  it('DB row beats default', () => {
    expect(
      evaluateFlag(
        'marketing.new_landing',
        {},
        { dbRows: [{ key: 'marketing.new_landing', enabled: true, rolloutPercent: 100 }] },
      ),
    ).toBe(true);
  });

  it('percentage rollout is deterministic and sticky per subject', () => {
    const rows = [{ key: 'soft_launch', enabled: true, rolloutPercent: 50 }];
    const a = evaluateFlag('soft_launch', { subjectId: 'user-1' }, { dbRows: rows });
    const b = evaluateFlag('soft_launch', { subjectId: 'user-1' }, { dbRows: rows });
    expect(a).toBe(b);
    expect(rolloutBucket('user-1', 'soft_launch')).toBe(rolloutBucket('user-1', 'soft_launch'));
    // anonymous subjects are never in a partial rollout
    expect(evaluateFlag('soft_launch', {}, { dbRows: rows })).toBe(false);
  });

  it('parses env override strings', () => {
    const parsed = parseEnvOverrides('soft_launch=on, marketing.new_landing=0, bogus=on');
    expect(parsed.soft_launch).toBe(true);
    expect(parsed['marketing.new_landing']).toBe(false);
    expect('bogus' in parsed).toBe(false);
  });

  it('evaluateAll returns every catalog key', () => {
    const all = evaluateAll();
    expect(Object.keys(all).sort()).toEqual(Object.keys(FLAG_CATALOG).sort());
  });
});
