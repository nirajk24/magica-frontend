import { http, HttpResponse } from "msw";
import { env } from "@/lib/env";
import type {
  ActivePlan,
  ActiveRun,
  ApiKeysPage,
  CreateApiKeyResult,
  CreateWebhookEndpointResult,
  UsagePage,
  WebhookDeliveriesPage,
  WebhookEndpointsPage,
  AttachmentDTO,
  ChatDTO,
  ChatWithMessages,
  ChatsPage,
  ContentBlock,
  CreditsPage,
  LlmStatus,
  MessageDTO,
  PlanApprovalPayload,
  QuestionsPayload,
  RunMetadata,
  SendMessageResult,
  AttachmentsPage,
  SignUploadsResult,
  ToolInvocationDTO,
  UsageCategory,
} from "@/contracts";

/**
 * Fixtures typed as the contracts, so a backend schema change breaks `pnpm typecheck` here rather
 * than surfacing as a wrong-looking screen. Never hand-shape a response — extend these.
 */

export const CHAT_ID = "01999f00-0000-7000-8000-000000000001";
export const RUN_ID = "01999f00-0000-7000-8000-000000000010";
export const TRIGGER_RUN_ID = "run_abc123";
export const USER_MESSAGE_ID = "01999f00-0000-7000-8000-000000000100";
export const ASSISTANT_MESSAGE_ID = "01999f00-0000-7000-8000-000000000101";
export const TOOL_USE_ID = "call_9f8e7d6c5b4a";
export const SUB_MODEL_ID = "gpt-image-2-text";
export const IMAGE_URL = "https://cdn.magica.com/fixtures/mountain.png";

export const chat: ChatDTO = {
  id: CHAT_ID,
  title: "Premium Scandinavian Stamp Sheet",
  isFavorite: false,
  modelId: "google/gemma-4-31b-it:free",
  activePlan: null,
  createdAt: "2026-08-22T10:00:00.000Z",
  updatedAt: "2026-08-22T10:02:14.000Z",
};

/**
 * A live upload. `expiresAt` is deliberately far in the future: the 24h window is real, and a
 * fixture pinned near the day it was written turns every attachment assertion into a time bomb.
 */
export const attachment: AttachmentDTO = {
  id: "01999f00-0000-7000-8000-000000000400",
  type: "image",
  source: "uploaded",
  url: "https://cdn.magica.com/fixtures/screenshot.png",
  name: "Screenshot-2026-08-21-at-2.png",
  contentType: "image/png",
  size: 1_363_148,
  status: "ready",
  metadata: { width: 1280, height: 720 },
  expiresAt: "2099-01-01T00:00:00.000Z",
  createdAt: "2026-08-22T09:59:00.000Z",
};

/** The same upload past its 24h temp-storage window: the URL is dead and the UI must say so. */
export const expiredAttachment: AttachmentDTO = {
  ...attachment,
  id: "01999f00-0000-7000-8000-000000000401",
  name: "Old-upload.png",
  expiresAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2025-12-31T00:00:00.000Z",
};

/** What a run produced: catalogued by the backend at finalize, so `size` is 0 — nothing reports it. */
export const generatedAttachment: AttachmentDTO = {
  id: "01999f00-0000-7000-8000-000000000402",
  type: "image",
  source: "generated",
  url: IMAGE_URL,
  name: "mountain.png",
  contentType: "image/png",
  size: 0,
  status: "ready",
  metadata: null,
  expiresAt: null,
  createdAt: "2026-08-22T10:02:14.000Z",
};

export const attachmentsPage: AttachmentsPage = {
  attachments: [generatedAttachment, attachment],
  nextCursor: null,
};

/** One signed assembly, which is what `/uploads/sign` answers per requested file. */
export const signUploadsResult: SignUploadsResult = {
  assemblies: [
    {
      params: '{"auth":{"key":"fixture"},"num_expected_upload_files":1}',
      signature: "sha384:fixture-signature",
    },
  ],
  expiresAt: "2099-01-01T00:00:00.000Z",
};

export const userMessage: MessageDTO = {
  id: USER_MESSAGE_ID,
  role: "user",
  status: "success",
  content: "Generate an image of a mountain at sunrise",
  contentBlocks: null,
  attachments: null,
  assets: null,
  toolInvocations: [],
  aiModel: null,
  tokenUsage: null,
  creditUsed: "0",
  feedback: null,
  errorMessage: null,
  metadata: null,
  runId: null,
  createdAt: "2026-08-22T10:00:00.000Z",
};

/** text → tool_use → text → usage: the interleaving the timeline has to get right. */
/** The reference renders a sent attachment above the bubble text, larger than a chip. */
export const userMessageWithAttachment: MessageDTO = {
  ...userMessage,
  id: "01999f00-0000-7000-8000-000000000103",
  content: "Can you turn this image to dark mode?",
  attachments: [attachment],
};

export const assistantBlocks: ContentBlock[] = [
  { segment: 0, type: "thinking", thinking: "The user wants a landscape image.", durationMs: 2_400 },
  { segment: 0, type: "text", text: "I'll generate that for you." },
  {
    segment: 1,
    type: "tool_use",
    id: TOOL_USE_ID,
    name: "gpt_image_2",
    input: { prompt: "a mountain at sunrise", quality: "Low", size: "1024x1024" },
  },
  { segment: 1, type: "text", text: "Here is your mountain at sunrise." },
  { segment: 1, type: "usage", inputTokens: 412, outputTokens: 96 },
];

export const toolInvocation: ToolInvocationDTO = {
  id: "01999f00-0000-7000-8000-000000000200",
  toolUseId: TOOL_USE_ID,
  toolName: "gpt_image_2",
  subModelId: SUB_MODEL_ID,
  display: { label: "Generating image", icon: "image" },
  status: "completed",
  input: { prompt: "a mountain at sunrise" },
  output: { images: [IMAGE_URL] },
  errorMessage: null,
  failureCode: null,
  creditUsed: "5880",
  durationMs: 8_412,
};

/**
 * A generation with the full field set the reference shows, so `View more` has something to hide.
 * The default `toolInvocation` carries one field and never crosses the card's five-row cut-off.
 */
export const detailedToolInvocation: ToolInvocationDTO = {
  ...toolInvocation,
  id: "01999f00-0000-7000-8000-000000000201",
  input: {
    tool: "generate",
    prompt:
      "Convert this app UI screenshot into a polished dark mode with extra visual flair, preserving exact layout, text content, and positioning of every element.",
    size: "Auto",
    quality: "High",
    aspect_ratio: "1:1",
    resolution: "1080p",
    image_url: "https://cdn.magica.com/fixtures/screenshot.png",
  },
};

export const assistantMessage: MessageDTO = {
  id: ASSISTANT_MESSAGE_ID,
  role: "assistant",
  status: "success",
  content: "I'll generate that for you.\n\nHere is your mountain at sunrise.",
  contentBlocks: assistantBlocks,
  attachments: null,
  assets: [{ url: IMAGE_URL, type: "image", model: "gpt_image_2", creditUsed: "5880" }],
  toolInvocations: [toolInvocation],
  aiModel: { id: "google/gemma-4-31b-it:free", name: "Gemma 4 31B", provider: "google" },
  tokenUsage: { inputTokens: 412, outputTokens: 96 },
  creditUsed: "5880",
  feedback: null,
  errorMessage: null,
  metadata: null,
  runId: RUN_ID,
  createdAt: "2026-08-22T10:02:14.000Z",
};

/** The same turn, with the generation carrying the full input the detail panel exists to show. */
export const detailedAssistantMessage: MessageDTO = {
  ...assistantMessage,
  id: "01999f00-0000-7000-8000-000000000105",
  contentBlocks: assistantBlocks.map((block) =>
    block.type === "tool_use" ? { ...block, input: detailedToolInvocation.input } : block,
  ),
  toolInvocations: [detailedToolInvocation],
};

export const failedAssistantMessage: MessageDTO = {
  ...assistantMessage,
  id: "01999f00-0000-7000-8000-000000000102",
  status: "failed",
  content: "I'll generate that for you.",
  contentBlocks: assistantBlocks.slice(0, 3),
  assets: null,
  toolInvocations: [
    {
      ...toolInvocation,
      status: "failed",
      output: null,
      errorMessage: "That prompt was blocked. Try describing it differently.",
      creditUsed: "0",
    },
  ],
  creditUsed: "0",
  errorMessage: "The model stopped responding partway through.",
};

/**
 * A turn the user stopped. The partial output and the tool that did finish are still there — the
 * only thing that marks it is `status`, never a `"(Response stopped)"` suffix in the content.
 */
export const cancelledAssistantMessage: MessageDTO = {
  ...assistantMessage,
  id: "01999f00-0000-7000-8000-000000000104",
  status: "cancelled",
  content: "I'll generate that for you.",
  contentBlocks: assistantBlocks.slice(0, 3),
  assets: null,
  errorMessage: null,
  creditUsed: "100000",
};

export const chatWithMessages: ChatWithMessages = {
  chat,
  messages: [userMessage, assistantMessage],
  messagesNextCursor: null,
};

export const chatsPage: ChatsPage = {
  chats: [chat, { ...chat, id: "01999f00-0000-7000-8000-000000000002", title: "Casual Greeting" }],
  nextCursor: null,
};

export const sendMessageResult: SendMessageResult = {
  chatId: CHAT_ID,
  userMessageId: USER_MESSAGE_ID,
  assistantMessageId: ASSISTANT_MESSAGE_ID,
  runId: RUN_ID,
  triggerRunId: TRIGGER_RUN_ID,
  publicAccessToken: "pat_fixture_token",
};

/** Retry answers with the same shape as send, which is why both share one success path. */
export const retryResult: SendMessageResult = {
  ...sendMessageResult,
  runId: "01999f00-0000-7000-8000-000000000011",
  triggerRunId: "run_retry456",
};

export const activeRun: ActiveRun = {
  runId: RUN_ID,
  triggerRunId: TRIGGER_RUN_ID,
  status: "running",
  assistantMessageId: ASSISTANT_MESSAGE_ID,
  publicAccessToken: "pat_fixture_token",
  pendingWaitpoint: null,
};

export const WAITPOINT_ID = "wp_fixture_1";

/**
 * A plan the agent proposed. Credit figures are the registry's own estimates, microcredits as
 * strings, exactly as the route serves them.
 */
export const planApprovalPayload: PlanApprovalPayload = {
  title: "Poster in three steps",
  overview: "Generate the artwork, crop it to a 4:5 poster, then refine the palette.",
  steps: [
    {
      key: "generate",
      title: "Generate the base image",
      description: "A mountain at sunrise, painterly, high detail.",
      tool: "gpt_image_2",
      subModelId: "gpt-image-2-text",
      estimatedCredits: "420000",
    },
    {
      key: "crop",
      title: "Crop to poster ratio",
      description: "Trim to a 4:5 vertical frame.",
      tool: "crop_image",
      subModelId: null,
      estimatedCredits: "11000",
    },
  ],
  estimatedTotal: "431000",
};

/** One question of each type, so a test can exercise the whole panel from one fixture. */
export const questionsPayload: QuestionsPayload = {
  message: "A few details before I spend credits:",
  questions: [
    { id: "style", type: "text", prompt: "Any style preferences?", required: true },
    {
      id: "refs",
      type: "image",
      prompt: "Reference images, if you have them",
      required: false,
      maxImages: 3,
    },
    {
      id: "ratio",
      type: "select",
      prompt: "Which aspect ratio?",
      required: true,
      allowOther: true,
      options: [
        { value: "4:5", label: "4:5 portrait", recommended: true },
        { value: "16:9", label: "16:9 landscape", recommended: false },
      ],
    },
  ],
};

/** A run parked on a plan-approval waitpoint, which reports `status: "waiting"`. */
export const waitingOnPlan: ActiveRun = {
  ...activeRun,
  status: "waiting",
  pendingWaitpoint: { id: WAITPOINT_ID, kind: "plan_approval", payload: planApprovalPayload },
};

/**
 * A plan mid-execution, as `Chat.activePlan` and `metadata.activePlan` both carry it: one step done
 * with its note, one in flight, one waiting — every visual state of the progress card at once.
 */
export const activePlan: ActivePlan = {
  title: "Poster in three steps",
  executionMode: "step_by_step",
  steps: [
    {
      key: "generate",
      title: "Generate the base image",
      estimatedCredits: "420000",
      status: "completed",
      note: "Generated at 1024x1536",
    },
    { key: "crop", title: "Crop to poster ratio", estimatedCredits: "11000", status: "in_progress" },
    { key: "refine", title: "Refine the palette", estimatedCredits: "160000", status: "pending" },
  ],
};

/** A run parked on a questions waitpoint. */
export const waitingOnQuestions: ActiveRun = {
  ...activeRun,
  status: "waiting",
  pendingWaitpoint: { id: WAITPOINT_ID, kind: "questions", payload: questionsPayload },
};

/** A healthy path. `limitedModel` is null until a limit is recorded; it never names a serving model. */
export const llmStatus: LlmStatus = { limitedModel: null, rateLimitedUntil: null };

export const rateLimitedLlmStatus: LlmStatus = {
  limitedModel: "nvidia/nemotron-3-super-120b-a12b:free",
  rateLimitedUntil: "2026-08-22T10:05:00.000Z",
};

/** What the fixture balance becomes after the default 20M top-up. */
export const toppedUpBalance = "49994120";

/** Per-tool spend for the usage overview: two tools and the signup grant, figures settled. */
export const usagePage: UsagePage = {
  from: "2026-08-21T00:00:00.000Z",
  to: "2026-09-20T00:00:00.000Z",
  totalDebited: "24970000",
  totalCredited: "30000000",
  records: 44,
  categories: [
    {
      key: "agent_chat",
      label: "AI Agent Chat",
      kind: "tool",
      debited: "4940000",
      credited: "0",
      count: 36,
      latestAt: "2026-08-23T03:49:21.000Z",
    },
    {
      key: "gpt_image_2",
      label: "AI Gpt Image 2",
      kind: "tool",
      debited: "80000",
      credited: "0",
      count: 6,
      latestAt: "2026-08-23T03:44:25.000Z",
    },
    {
      key: "credit_adjustment",
      label: "AI Credit Adjustment",
      kind: "adjustment",
      debited: "0",
      credited: "30000000",
      count: 1,
      latestAt: "2026-08-21T14:12:35.000Z",
    },
  ],
};

/** The drill-down's bounded record lists, keyed the way `?category` names them. */
export const usageRecords: Record<string, NonNullable<UsageCategory["records"]>> = {
  agent_chat: [
    {
      id: "01999f00-0000-7000-8000-000000000500",
      chatId: CHAT_ID,
      runId: RUN_ID,
      amount: "420000",
      estimated: null,
      adjustment: null,
      at: "2026-08-23T03:49:21.000Z",
    },
    {
      id: "01999f00-0000-7000-8000-000000000501",
      chatId: CHAT_ID,
      runId: null,
      amount: "80000",
      estimated: "100000",
      adjustment: "-20000",
      at: "2026-08-23T03:37:20.000Z",
    },
    {
      id: "01999f00-0000-7000-8000-000000000502",
      chatId: null,
      runId: null,
      amount: "40000",
      estimated: null,
      adjustment: null,
      at: "2026-08-22T22:48:57.000Z",
    },
  ],
  gpt_image_2: [
    {
      id: "01999f00-0000-7000-8000-000000000510",
      chatId: CHAT_ID,
      runId: RUN_ID,
      amount: "10000",
      estimated: null,
      adjustment: null,
      at: "2026-08-23T03:44:25.000Z",
    },
    {
      id: "01999f00-0000-7000-8000-000000000511",
      chatId: CHAT_ID,
      runId: null,
      amount: "5900",
      estimated: null,
      adjustment: null,
      at: "2026-08-23T01:08:20.000Z",
    },
  ],
  credit_adjustment: [
    {
      id: "01999f00-0000-7000-8000-000000000520",
      chatId: null,
      runId: null,
      amount: "30000000",
      estimated: null,
      adjustment: null,
      at: "2026-08-21T14:12:35.000Z",
    },
  ],
};

/** The window before the current one: nothing happened, which is what a fresh account's shows. */
export const usagePreviousPage: UsagePage = {
  from: "2026-07-22T00:00:00.000Z",
  to: "2026-08-21T00:00:00.000Z",
  totalDebited: "0",
  totalCredited: "0",
  records: 0,
  categories: [],
};

export const creditsPage: CreditsPage = {
  balance: "29994120",
  entries: [
    {
      id: "01999f00-0000-7000-8000-000000000300",
      type: "settle",
      amount: "-5880",
      runId: RUN_ID,
      createdAt: "2026-08-22T10:02:10.000Z",
    },
    {
      id: "01999f00-0000-7000-8000-000000000301",
      type: "signup_grant",
      amount: "30000000",
      runId: null,
      createdAt: "2026-08-22T09:00:00.000Z",
    },
  ],
  nextCursor: null,
};

/** A chat response carrying a specific message list, for tests about which rows are visible. */
export function chatHandlerWith(messages: MessageDTO[]) {
  return http.get(`${env.NEXT_PUBLIC_API_URL}/api/v1/chats/:chatId`, () =>
    HttpResponse.json({ data: { ...chatWithMessages, messages } }),
  );
}

/**
 * Mid-run realtime state. Not served over HTTP — `useRealtimeRun` talks to Trigger.dev, which MSW
 * cannot intercept, so the streaming overlay is driven by handing this to the hook directly.
 */
export const runMetadata: RunMetadata = {
  phase: "working",
  phaseStartedAt: 1_787_400_000_000,
  currentStep: "Generating image",
  stepsCompleted: 2,
  blocks: [
    { segment: 0, type: "thinking", chars: 31 },
    { segment: 0, type: "text", chars: 27 },
    { segment: 1, type: "tool_use", toolUseId: TOOL_USE_ID, name: "gpt_image_2" },
    { segment: 1, type: "text", streaming: true },
  ],
  reasoningText: "The user wants a landscape image.",
  invocations: [
    {
      id: toolInvocation.id,
      toolUseId: TOOL_USE_ID,
      toolName: "gpt_image_2",
      subModelId: SUB_MODEL_ID,
      display: { label: "Generating image", icon: "image" },
      state: "running",
      input: { tool: "generate", prompt: "a mountain at sunrise", size: "1024x1024" },
      credits: "5880",
    },
  ],
  assistantMessageId: ASSISTANT_MESSAGE_ID,
  servedModel: "google/gemma-4-31b-it:free",
};

/** The text the stream would have delivered for `runMetadata`, sliced by each block's `chars`. */
export const streamedText = "I'll generate that for you.Here is your mountain at sun";

export const apiKeysPage: ApiKeysPage = {
  apiKeys: [
    {
      id: "key_live",
      name: "production",
      fingerprint: "9f2c1a4e",
      rateLimitPerMinute: 100,
      rateLimitPerDay: 10000,
      expiresAt: null,
      createdAt: "2026-08-20T09:00:00.000Z",
      revokedAt: null,
    },
    {
      id: "key_dead",
      name: "laptop",
      fingerprint: "1b7d40aa",
      rateLimitPerMinute: null,
      rateLimitPerDay: null,
      expiresAt: null,
      createdAt: "2026-08-18T09:00:00.000Z",
      revokedAt: "2026-08-19T09:00:00.000Z",
    },
  ],
};

/**
 * The only response that ever carries the plaintext. Nothing may cache it.
 *
 * The value is deliberately all zeros: a realistic-looking random key in a public repository trips
 * secret scanners and makes a reviewer check whether it is live.
 */
export const createdApiKey: CreateApiKeyResult = {
  apiKey: {
    id: "key_new",
    name: "integration",
    fingerprint: "44ce90f1",
    rateLimitPerMinute: 100,
    rateLimitPerDay: 10000,
    expiresAt: null,
    createdAt: "2026-08-23T09:00:00.000Z",
    revokedAt: null,
  },
  key: "mk_live_example_not_a_real_key",
};

export const webhookEndpointsPage: WebhookEndpointsPage = {
  endpoints: [
    {
      id: "wh_1",
      url: "https://receiver.test/hooks/magica",
      events: ["agent.completed", "agent.failed"],
      createdAt: "2026-08-21T09:00:00.000Z",
    },
  ],
};

export const createdWebhookEndpoint: CreateWebhookEndpointResult = {
  endpoint: {
    id: "wh_2",
    url: "https://example.com/hooks/magica",
    events: ["agent.completed"],
    createdAt: "2026-08-23T09:00:00.000Z",
  },
  secret: "mgwh_example_not_a_real_secret",
};

export const webhookDeliveriesPage: WebhookDeliveriesPage = {
  deliveries: [
    {
      id: "dlv_1",
      event: "agent.completed",
      status: "delivered",
      attempts: 1,
      lastAttemptAt: "2026-08-23T09:05:00.000Z",
      createdAt: "2026-08-23T09:05:00.000Z",
    },
    {
      id: "dlv_2",
      event: "agent.failed",
      status: "failed",
      attempts: 3,
      lastAttemptAt: "2026-08-23T09:06:00.000Z",
      createdAt: "2026-08-23T09:06:00.000Z",
    },
  ],
};
