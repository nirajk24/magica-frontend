import type {
  ActiveRun,
  ChatDTO,
  ChatWithMessages,
  ChatsPage,
  ContentBlock,
  CreditsPage,
  MessageDTO,
  RunMetadata,
  SendMessageResult,
  ToolInvocationDTO,
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
  display: { label: "Generating image", icon: "image" },
  status: "completed",
  input: { prompt: "a mountain at sunrise" },
  output: { images: [IMAGE_URL] },
  errorMessage: null,
  creditUsed: "5880",
  durationMs: 8_412,
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

export const activeRun: ActiveRun = {
  runId: RUN_ID,
  triggerRunId: TRIGGER_RUN_ID,
  status: "running",
  assistantMessageId: ASSISTANT_MESSAGE_ID,
  publicAccessToken: "pat_fixture_token",
  pendingWaitpoint: null,
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
      display: { label: "Generating image", icon: "image" },
      state: "running",
      credits: "5880",
    },
  ],
  assistantMessageId: ASSISTANT_MESSAGE_ID,
  servedModel: "google/gemma-4-31b-it:free",
};

/** The text the stream would have delivered for `runMetadata`, sliced by each block's `chars`. */
export const streamedText = "I'll generate that for you.Here is your mountain at sun";
