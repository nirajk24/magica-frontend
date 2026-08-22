"use client";

import { useEffect, useState } from "react";

/**
 * A value that settles rather than changing on every keystroke.
 *
 * A search box wired straight to a query key fires one request per character and races their
 * responses. Holding the value for `delayMs` of quiet makes each keystroke cost nothing and each
 * pause cost one request.
 */
export function useDebounced<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);

    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return settled;
}
