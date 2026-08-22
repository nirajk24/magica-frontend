import { z } from "zod";
import {
  ActiveRun,
  ApiErrorEnvelope,
  ChatWithMessages,
  Health,
  Ok,
  SendMessage,
  SendMessageResult,
  type ErrorCode,
} from "@/contracts";
import { env } from "@/lib/env";

/**
 * Carries the backend's contract error code, which is what the UI switches on:
 * INSUFFICIENT_CREDITS opens the top-up CTA, RUN_ALREADY_ACTIVE is swallowed, VALIDATION_ERROR
 * renders field-level copy. `traceId` belongs in the error toast.
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
 * The only `fetch` in this repo.
 *
 * INVARIANT: auth is Bearer, never cookies — the two repos are separate origins, so a Clerk
 * cookie set here never reaches the backend. The token must be fetched immediately before each
 * request; the JWT lives about a minute, so caching it produces intermittent 401s.
 *
 * Responses are parsed, not cast, so backend drift surfaces here rather than as `undefined` deep
 * in a component. The body parse is guarded because an unrouted path returns Next's HTML 404, and
 * an unguarded `res.json()` would throw and discard the status code.
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

  const json: unknown = await res.json().catch(() => null);

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

/** What a caller may send; the server applies the contract's defaults for anything omitted. */
export type SendMessageInput = z.input<typeof SendMessage>;

/** Typed service surface. A component never names a URL or sees an unparsed response. */
export function createApi(getToken: TokenSource) {
  return {
    getHealth: () => request("/health", {}, Health, getToken),

    getChat: (chatId: string, messagesCursor?: string) =>
      request(
        `/chats/${encodeURIComponent(chatId)}${
          messagesCursor ? `?messagesCursor=${encodeURIComponent(messagesCursor)}` : ""
        }`,
        {},
        ChatWithMessages,
        getToken,
      ),

    sendMessage: (chatId: string, body: SendMessageInput) =>
      request(
        `/chats/${encodeURIComponent(chatId)}/messages`,
        { method: "POST", body: JSON.stringify(body) },
        SendMessageResult,
        getToken,
      ),

    getActiveRun: (chatId: string) =>
      request(
        `/chats/${encodeURIComponent(chatId)}/active-run`,
        {},
        ActiveRun.nullable(),
        getToken,
      ),

    cancelRun: (runId: string) =>
      request(`/runs/${encodeURIComponent(runId)}/cancel`, { method: "POST" }, Ok, getToken),

    retryMessage: (messageId: string) =>
      request(
        `/messages/${encodeURIComponent(messageId)}/retry`,
        { method: "POST" },
        SendMessageResult,
        getToken,
      ),
  };
}

export type Api = ReturnType<typeof createApi>;
