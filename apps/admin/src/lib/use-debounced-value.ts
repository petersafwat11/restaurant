'use client';

import { useEffect, useState } from 'react';

/**
 * Returns `value` delayed by `ms` milliseconds. Subsequent updates within the
 * delay window reset the timer, so the returned value only "settles" after
 * input pauses. Use this to debounce server queries against fast-typed input.
 *
 * Default delay matches the plan's 300ms feel: long enough that mid-word
 * typing doesn't fire requests, short enough that a deliberate pause feels
 * responsive.
 */
export function useDebouncedValue<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);

  return debounced;
}
