import { useState, useEffect, useRef, useCallback } from 'react';

/** Returns a debounced copy of `value` that only updates after `delayMs` of inactivity. */
export function useDebounce<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

/** Returns a debounced version of `fn` that fires only after `delayMs` of inactivity. */
export function useDebouncedCallback<T extends (...args: never[]) => unknown>(
  fn: T,
  delayMs = 400,
): T {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const fnRef = useRef(fn);
  fnRef.current = fn;

  return useCallback(
    ((...args) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => fnRef.current(...args), delayMs);
    }) as T,
    [delayMs],
  );
}
