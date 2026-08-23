import { z } from "zod";
import {
  ActiveRun,
  ApiErrorEnvelope,
  ChatResponse,
  ChatWithMessages,
  ChatsPage,
  CreditsPage,
  Health,
  LlmStatus,
  Ok,
  SendMessage,
  SendMessageResult,
  TopUpResult,
  UsagePage,
  type Feedback,
  type TopUp,
  type ResolveWaitpoint,
  type UpdateChat,
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

/** The chat list's server-side filters. Omitted fields fall back to the contract's defaults. */
export type ChatsQueryInput = {
  cursor?: string;
  search?: string;
  filter?: "all" | "pinned";
};

/** The usage aggregation's window and drill-down. Omitted bounds mean the server's current period. */
export type UsageQueryInput = {
  from?: string;
  to?: string;
  category?: string;
};

function queryString(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const encoded = search.toString();

  return encoded ? `?${encoded}` : "";
}

/** Typed service surface. A component never names a URL or sees an unparsed response. */
export function createApi(getToken: TokenSource) {
  return {
    getHealth: () => request("/health", {}, Health, getToken),

    getChats: ({ cursor, search, filter }: ChatsQueryInput = {}) =>
      request(`/chats${queryString({ cursor, search, filter })}`, {}, ChatsPage, getToken),

    getCredits: () => request("/credits", {}, CreditsPage, getToken),

    getUsage: ({ from, to, category }: UsageQueryInput = {}) =>
      request(`/credits/usage${queryString({ from, to, category })}`, {}, UsagePage, getToken),

    topUp: (body: TopUp) =>
      request("/credits/top-up", { method: "POST", body: JSON.stringify(body) }, TopUpResult, getToken),

    getLlmStatus: () => request("/llm/status", {}, LlmStatus, getToken),

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

    resolveWaitpoint: (waitpointId: string, body: ResolveWaitpoint) =>
      request(
        `/waitpoints/${encodeURIComponent(waitpointId)}/resolve`,
        { method: "POST", body: JSON.stringify(body) },
        Ok,
        getToken,
      ),

    updateChat: (chatId: string, body: UpdateChat) =>
      request(
        `/chats/${encodeURIComponent(chatId)}`,
        { method: "PATCH", body: JSON.stringify(body) },
        ChatResponse,
        getToken,
      ),

    deleteChat: (chatId: string) =>
      request(`/chats/${encodeURIComponent(chatId)}`, { method: "DELETE" }, Ok, getToken),

    setFeedback: (messageId: string, body: Feedback) =>
      request(
        `/messages/${encodeURIComponent(messageId)}/feedback`,
        { method: "PATCH", body: JSON.stringify(body) },
        Ok,
        getToken,
      ),
  };
}

export type Api = ReturnType<typeof createApi>;
