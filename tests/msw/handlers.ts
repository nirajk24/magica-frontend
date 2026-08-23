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

  http.post(`${API}/credits/top-up`, () => ok({ balance: fixtures.toppedUpBalance })),

  http.get(`${API}/credits/usage`, () => ok(fixtures.usagePage)),

  http.get(`${API}/llm/status`, () => ok(fixtures.llmStatus)),

  http.post(`${API}/runs/:runId/cancel`, () => ok({ ok: true })),

  http.post(`${API}/messages/:messageId/retry`, () => ok(fixtures.retryResult)),

  http.post(`${API}/waitpoints/:waitpointId/resolve`, () => ok({ ok: true })),

  http.patch(`${API}/chats/:chatId`, () => ok({ chat: fixtures.chat })),

  http.delete(`${API}/chats/:chatId`, () => ok({ ok: true })),

  http.patch(`${API}/messages/:messageId/feedback`, () => ok({ ok: true })),
];

/** A run parked on a waitpoint, one handler per kind. */
export const waitingOnPlan = http.get(`${API}/chats/:chatId/active-run`, () =>
  ok(fixtures.waitingOnPlan),
);

export const waitingOnQuestions = http.get(`${API}/chats/:chatId/active-run`, () =>
  ok(fixtures.waitingOnQuestions),
);

/** The waitpoint timed out server-side; the overlay must clear and say how to continue. */
export const waitpointExpired = http.post(`${API}/waitpoints/:waitpointId/resolve`, () =>
  fail(410, "WAITPOINT_EXPIRED", "This request has expired. Send a message to continue."),
);

/** An idle chat: no run to recover, which is what a reload after completion looks like. */
export const noActiveRun = http.get(`${API}/chats/:chatId/active-run`, () => ok(null));

/** The shared free-tier path refusing work, which cannot be produced on demand against a real backend. */
export const rateLimited = http.get(`${API}/llm/status`, () => ok(fixtures.rateLimitedLlmStatus));

/** Cancel and retry, refusing. Both surface through the error toast rather than silently. */
export const cancelFails = http.post(`${API}/runs/:runId/cancel`, () => errors.internal());

export const retryFails = http.post(`${API}/messages/:messageId/retry`, () =>
  errors.runAlreadyActive(),
);
