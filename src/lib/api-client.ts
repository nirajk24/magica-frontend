import { z } from "zod";
import { ApiErrorEnvelope, Health, type ErrorCode } from "@/contracts";
import { env } from "@/lib/env";

/**
 * Carries the backend's contract error code so the UI can switch on it —
 * INSUFFICIENT_CREDITS opens the top-up CTA, RUN_ALREADY_ACTIVE is swallowed,
 * VALIDATION_ERROR renders field-level copy. `traceId` goes in the error toast so a
 * reported bug is traceable to a single request.
 */
export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly traceId: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type TokenSource = () => Promise<string | null>;

/**
 * The only `fetch` in this repo. Everything above it is a typed service call; everything
 * below it is HTTP.
 *
 * Auth is Bearer, never cookies: two repos means two origins, so a Clerk cookie set on this
 * domain is never sent to the backend. The token is fetched immediately before every request
 * because the JWT lives about a minute — caching it produces intermittent 401s that read as a
 * backend fault. Responses are `schema.parse`d rather than cast, so backend drift surfaces
 * here with a readable error instead of as `undefined` three components deep.
 *
 * The body is parsed defensively because not every response comes from `defineRoute`: an
 * unrouted path returns Next's HTML 404, and a proxy or cold start can return HTML too.
 * Reading `res.json()` unguarded would throw a SyntaxError and discard the status code, so a
 * plain 404 would surface as a parse failure instead of NOT_FOUND.
 */
export async function request<T>(
  path: string,
  init: RequestInit,
  schema: z.ZodType<T>,
  getToken: TokenSource,
): Promise<T> {
  const token = await getToken();

  const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/v1${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  const json: unknown = await res
    .json()
    .then((v: unknown) => v)
    .catch(() => null);

  if (!res.ok) {
    const parsed = ApiErrorEnvelope.safeParse(json);
    if (!parsed.success) {
      throw new ApiError("INTERNAL", `Request failed (${res.status}).`, "unknown");
    }
    const { code, message, traceId, details } = parsed.data.error;
    throw new ApiError(code, message, traceId, details);
  }

  return schema.parse((json as { data: unknown } | null)?.data);
}

/**
 * Typed service surface. Routes are added here as their backend phase lands, so a component
 * never names a URL and never sees an unparsed response.
 */
export function createApi(getToken: TokenSource) {
  return {
    getHealth: () => request("/health", {}, Health, getToken),
  };
}

export type Api = ReturnType<typeof createApi>;
