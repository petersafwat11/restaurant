import { DISH_FLAG_TOKENS } from '@repo/ui';
import { describe, expect, it } from 'vitest';

describe('DISH_FLAG_TOKENS (W1 carry-over)', () => {
  it('gluten-free uses positive (olive), NOT info', () => {
    expect(DISH_FLAG_TOKENS['gluten-free'].token).toBe('positive');
  });

  it('vegetarian and vegan also use positive', () => {
    expect(DISH_FLAG_TOKENS.vegetarian.token).toBe('positive');
    expect(DISH_FLAG_TOKENS.vegan.token).toBe('positive');
  });

  it('spicy uses warning', () => {
    expect(DISH_FLAG_TOKENS.spicy.token).toBe('warning');
  });

  it('featured uses accent', () => {
    expect(DISH_FLAG_TOKENS.featured.token).toBe('accent');
  });
});
