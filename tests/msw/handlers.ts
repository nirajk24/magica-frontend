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

  http.get(`${API}/credits/usage`, ({ request }) => {
    const url = new URL(request.url);
    const page = url.searchParams.get("from") ? fixtures.usagePreviousPage : fixtures.usagePage;
    const category = url.searchParams.get("category");
    if (!category) return ok(page);

    return ok({
      ...page,
      categories: page.categories.map((entry) =>
        entry.key === category
          ? { ...entry, records: fixtures.usageRecords[category] ?? [], truncated: false }
          : entry,
      ),
    });
  }),

  http.get(`${API}/llm/status`, () => ok(fixtures.llmStatus)),

  http.post(`${API}/runs/:runId/cancel`, () => ok({ ok: true })),

  http.post(`${API}/messages/:messageId/retry`, () => ok(fixtures.retryResult)),

  http.post(`${API}/waitpoints/:waitpointId/resolve`, () => ok({ ok: true })),

  http.patch(`${API}/chats/:chatId`, () => ok({ chat: fixtures.chat })),

  http.delete(`${API}/chats/:chatId`, () => ok({ ok: true })),

  http.patch(`${API}/messages/:messageId/feedback`, () => ok({ ok: true })),

  /** One signed assembly per requested file, in request order — the shape the client relies on. */
  http.post(`${API}/uploads/sign`, async ({ request }) => {
    const body = (await request.json()) as { files?: unknown[] };
    const count = body.files?.length ?? 0;

    return ok({
      assemblies: Array.from({ length: count }, (_, index) => ({
        params: `{"auth":{"key":"fixture"},"num_expected_upload_files":1,"file":${index}}`,
        signature: `sha384:fixture-signature-${index}`,
      })),
      expiresAt: fixtures.signUploadsResult.expiresAt,
    });
  }),

  /** Upsert on `assemblyId`: the reported file comes back as the attachment row it became. */
  http.post(`${API}/attachments`, async ({ request }) => {
    const report = (await request.json()) as {
      assemblyId: string;
      status: string;
      file: { name: string; contentType: string; size: number; url?: string; metadata?: unknown };
    };

    return ok({
      attachment: {
        ...fixtures.attachment,
        id: `attachment-${report.assemblyId}`,
        name: report.file.name,
        contentType: report.file.contentType,
        size: report.file.size,
        url: report.file.url ?? null,
        status: report.status,
        metadata: (report.file.metadata as Record<string, unknown> | undefined) ?? null,
      },
    });
  }),

  http.get(`${API}/attachments`, ({ request }) => {
    const source = new URL(request.url).searchParams.get("source");
    const { attachments } = fixtures.attachmentsPage;

    return ok({
      attachments: source
        ? attachments.filter((attachment) => attachment.source === source)
        : attachments,
      nextCursor: null,
    });
  }),

  http.patch(`${API}/attachments/:attachmentId`, async ({ params, request }) => {
    const { name } = (await request.json()) as { name: string };

    return ok({ attachment: { ...fixtures.attachment, id: String(params.attachmentId), name } });
  }),

  http.delete(`${API}/attachments/:attachmentId`, () => ok({ ok: true })),
  http.get(`${API}/api-keys`, () => ok(fixtures.apiKeysPage)),

  http.post(`${API}/api-keys`, () => ok(fixtures.createdApiKey)),

  http.delete(`${API}/api-keys/:apiKeyId`, () => ok({ ok: true })),

  http.get(`${API}/webhooks`, () => ok(fixtures.webhookEndpointsPage)),

  http.post(`${API}/webhooks`, () => ok(fixtures.createdWebhookEndpoint)),

  http.delete(`${API}/webhooks/:endpointId`, () => ok({ ok: true })),

  http.get(`${API}/webhooks/:endpointId/deliveries`, () => ok(fixtures.webhookDeliveriesPage)),
];

/** The upload quota refusing one file, which is field-specific so the composer can point at it. */
export const uploadQuotaExceeded = http.post(`${API}/uploads/sign`, () =>
  HttpResponse.json(
    {
      error: {
        code: "QUOTA_EXCEEDED",
        message: "That file is over the 0.5 GB per-file limit.",
        traceId: "req_fixture",
        details: { field: "files.0.size" },
      },
    },
    { status: 413 },
  ),
);

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

/** Key management refusing, so the create path's failure surfaces rather than silently no-opping. */
export const createKeyFails = http.post(`${API}/api-keys`, () => errors.internal());

/** An account with no keys and no endpoints — the empty states both cards must render. */
export const noApiKeys = http.get(`${API}/api-keys`, () => ok({ apiKeys: [] }));

export const noWebhookEndpoints = http.get(`${API}/webhooks`, () => ok({ endpoints: [] }));
