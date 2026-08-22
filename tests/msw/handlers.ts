import { http, HttpResponse } from "msw";
import type { ErrorCode } from "@/contracts";
import { env } from "@/lib/env";
import * as fixtures from "./fixtures";

const API = `${env.NEXT_PUBLIC_API_URL}/api/v1`;

/** The backend's `{ data }` / `{ error }` envelope. Every handler goes through these two. */
const ok = (data: unknown) => HttpResponse.json({ data });

const fail = (status: number, code: ErrorCode, message: string) =>
  HttpResponse.json({ error: { code, message, traceId: "req_fixture" } }, { status });

export const errors = {
  runAlreadyActive: () => fail(409, "RUN_ALREADY_ACTIVE", "A run is already active in this chat."),
  insufficientCredits: () => fail(402, "INSUFFICIENT_CREDITS", "Not enough credits to continue."),
  validation: () => fail(400, "VALIDATION_ERROR", "Some fields are invalid."),
  rateLimited: () => fail(429, "RATE_LIMITED", "Too many messages. Try again shortly."),
  notFound: () => fail(404, "NOT_FOUND", "No such chat."),
  internal: () => fail(500, "INTERNAL", "Something went wrong on our side."),
};

/**
 * The happy path for every Phase-1 route. Override per test with `server.use(...)`; the whole set is
 * derived from `fixtures`, so a contract change fails typecheck rather than a screen.
 */
export const handlers = [
  http.get(`${API}/health`, () => ok({ ok: true, env: "test", dbLatencyMs: 12 })),

  http.get(`${API}/chats`, () => ok(fixtures.chatsPage)),

  http.get(`${API}/chats/:chatId`, ({ params }) =>
    params.chatId === fixtures.CHAT_ID ? ok(fixtures.chatWithMessages) : errors.notFound(),
  ),

  http.post(`${API}/chats/:chatId/messages`, () => ok(fixtures.sendMessageResult)),

  http.get(`${API}/chats/:chatId/active-run`, () => ok(fixtures.activeRun)),

  http.get(`${API}/credits`, () => ok(fixtures.creditsPage)),

  http.post(`${API}/runs/:runId/cancel`, () => ok({ ok: true })),

  http.post(`${API}/messages/:messageId/retry`, () => ok(fixtures.retryResult)),
];

/** An idle chat: no run to recover, which is what a reload after completion looks like. */
export const noActiveRun = http.get(`${API}/chats/:chatId/active-run`, () => ok(null));

/** Cancel and retry, refusing. Both surface through the error toast rather than silently. */
export const cancelFails = http.post(`${API}/runs/:runId/cancel`, () => errors.internal());

export const retryFails = http.post(`${API}/messages/:messageId/retry`, () =>
  errors.runAlreadyActive(),
);
