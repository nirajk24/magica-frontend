"use client";

import { useAuth } from "@clerk/nextjs";
import { useMemo } from "react";
import { createApi } from "@/lib/api-client";

/**
 * Binds Clerk's `getToken` to the api-client. Components call this rather than importing the
 * client directly, which is what keeps the token fetched per-request instead of captured once.
 */
export function useApi() {
  const { getToken } = useAuth();
  return useMemo(() => createApi(() => getToken()), [getToken]);
}
