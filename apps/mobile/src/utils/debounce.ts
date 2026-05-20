/**
 * Lightweight debounce helpers for store-level API coalescing.
 */

export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  waitMs: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, waitMs);
  };
}

export function createKeyedDebouncer(waitMs: number) {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  return (key: string, fn: () => void) => {
    const existing = timers.get(key);
    if (existing) clearTimeout(existing);
    timers.set(
      key,
      setTimeout(() => {
        timers.delete(key);
        fn();
      }, waitMs),
    );
  };
}

export function clearKeyedDebouncer(timers: Map<string, ReturnType<typeof setTimeout>>) {
  timers.forEach((timer) => clearTimeout(timer));
  timers.clear();
}
