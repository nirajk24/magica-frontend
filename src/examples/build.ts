import type { ChatWithMessages, ContentBlock, MessageDTO, ToolInvocationDTO } from "@/contracts";

/**
 * Builders for the example conversations.
 *
 * They exist so `chats.ts` reads as prose rather than as DTO literals — an example is edited far
 * more often than the shape it is written in, and a wall of `contentBlocks: [...]` makes the copy
 * the hardest part of the file to change.
 *
 * INVARIANT: what comes out is a real `ChatWithMessages`, the same type the API returns. The
 * renderers take DTOs, not database rows, so an example goes through the identical path as a live
 * chat — and a drifted shape fails to compile instead of rendering wrongly.
 */
const MODEL = { id: "openrouter/auto", name: "OpenRouter Auto", provider: "openrouter" } as const;

const CDN = "https://galaxy-prod.tlcdn.com";
const CDN_LEGACY = "https://galaxyai.tlcdn.com";
const IMG = `${CDN}/preview-assets/image/galaxymainsiteexamples/explore_ideas`;

/** The same plates the new-chat gallery serves, from the platform's own CDN. */
export const ART = {
  poster: `${IMG}/image_1787068820420__Swiss-Style_City_Poster.png?hsh=optimize`,
  cgi: `${IMG}/image_1781161277262__Luxury_CGI_Campaign_Poster.png?hsh=optimize`,
  streetwear: `${IMG}/image_1781006499012__Japanese_Streetwear_Editorial_Poster.png?hsh=optimize`,
  collage: `${IMG}/image_1781161277260__9-Pose_Lifestyle_Photo_Collage.png?hsh=optimize`,
  watercolour: `${IMG}/image_1781161254720__Watercolor_Ink_Portrait.png?hsh=optimize`,
  comic: `${CDN_LEGACY}/gen/image/galaxymainsiteexamples/explore_ideas/image_1781251211099_Giant_Comic-Book_Self_Portrait.png`,
} as const;

export type Generation = {
  prompt: string;
  image: keyof typeof ART;
  credits: number;
  seconds: number;
  /** An edit reuses an existing plate rather than inventing one, and costs less. */
  edit?: boolean;
};

export type AgentTurn = {
  /** Reasoning, shown behind the collapsed `Reasoned` row. */
  thinking?: string;
  /** What it says before the tools run. */
  lead?: string;
  steps?: string[];
  generations?: Generation[];
  /** The reply, after the tools. Markdown. */
  reply: string;
  failure?: string;
  feedback?: "like" | "dislike";
};

const micro = (credits: number) => Math.round(credits * 1_000_000).toString();

function invocation(id: string, index: number, generation: Generation): ToolInvocationDTO {
  return {
    id: `${id}-tool-${index}`,
    toolUseId: `${id}-call-${index}`,
    toolName: "gpt_image_2",
    subModelId: generation.edit ? "gpt-image-2-edit" : "gpt-image-2-text",
    display: { label: "Generating image", icon: "image" },
    status: "completed",
    input: { prompt: generation.prompt, size: "1024x1536", quality: "High", n: 1 },
    output: { images: [ART[generation.image]] },
    errorMessage: null,
    failureCode: null,
    creditUsed: micro(generation.credits),
    durationMs: generation.seconds * 1000,
  };
}

function blocksFor(id: string, turn: AgentTurn): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  let segment = 0;

  if (turn.thinking) blocks.push({ segment, type: "thinking", thinking: turn.thinking });
  if (turn.lead) blocks.push({ segment, type: "text", text: turn.lead });

  (turn.generations ?? []).forEach((generation, index) => {
    segment += 1;
    blocks.push({
      segment,
      type: "tool_use",
      id: `${id}-call-${index}`,
      name: "gpt_image_2",
      input: { prompt: generation.prompt },
    });
  });

  blocks.push({ segment: segment + 1, type: "text", text: turn.reply });

  return blocks;
}

export function conversation(a: {
  id: string;
  title: string;
  hoursAgo: number;
  favorite?: boolean;
  turns: { ask: string; agent: AgentTurn }[];
}): ChatWithMessages {
  // Stamped relative to render rather than frozen, so an example never reads as months old.
  const now = Date.now();
  const at = (offsetTurns: number) =>
    new Date(now - a.hoursAgo * 3_600_000 + offsetTurns * 60_000).toISOString();

  const messages: MessageDTO[] = [];

  a.turns.forEach((turn, index) => {
    const id = `${a.id}-${index}`;

    messages.push({
      id: `${id}-user`,
      role: "user",
      status: "success",
      content: turn.ask,
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
      createdAt: at(index * 2),
    });

    const generations = turn.agent.generations ?? [];
    const spent = generations.reduce((total, generation) => total + generation.credits, 0);

    messages.push({
      id: `${id}-agent`,
      role: "assistant",
      status: turn.agent.failure ? "failed" : "success",
      content: turn.agent.reply,
      contentBlocks: blocksFor(id, turn.agent),
      attachments: null,
      assets: generations.map((generation, index) => ({
        url: ART[generation.image],
        type: "image" as const,
        model: "gpt-image-2",
        creditUsed: micro(generation.credits),
        toolCallId: `${id}-call-${index}`,
      })),
      toolInvocations: generations.map((generation, index) =>
        invocation(id, index, generation),
      ),
      aiModel: MODEL,
      tokenUsage: { inputTokens: 420 + index * 180, outputTokens: 160 + index * 40 },
      creditUsed: micro(spent),
      feedback: turn.agent.feedback ?? null,
      errorMessage: turn.agent.failure ?? null,
      metadata: null,
      runId: `${id}-run`,
      createdAt: at(index * 2 + 1),
    });
  });

  return {
    chat: {
      id: a.id,
      title: a.title,
      isFavorite: a.favorite ?? false,
      modelId: "openrouter/auto",
      activePlan: null,
      createdAt: at(0),
      updatedAt: at(a.turns.length * 2),
    },
    messages,
    messagesNextCursor: null,
  };
}
