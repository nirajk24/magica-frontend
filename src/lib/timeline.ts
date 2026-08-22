import type { ContentBlock, MessageDTO, RunMetadata, ToolInvocationDTO } from "@/contracts";

/**
 * One tool invocation, in the shape the cards read.
 *
 * INVARIANT: live and persisted invocations must normalise to this same type. A renderer that can
 * tell which source it is looking at has broken the equivalence that makes reload recovery one code
 * path instead of two.
 */
export type ToolView = {
  id: string;
  toolUseId: string;
  toolName: string;
  /** The provider sub-model that produced the output, when the tool used one. */
  subModelId: string | null;
  display: ToolInvocationDTO["display"];
  status: ToolInvocationDTO["status"];
  input: unknown;
  output: unknown;
  errorMessage: string | null;
  creditUsed: string | null;
  durationMs: number | null;
  resultUrls: string[];
  resultSummary: string | null;
};

/**
 * A block plus the one presentational bit that is not in the block itself.
 *
 * `streaming` is a row state, not a source discriminator — a persisted message can hold a partial
 * row too — so a renderer may read it without breaking the live/persisted equivalence.
 */
export type TimelineItem = { block: ContentBlock; streaming?: boolean };

export type TimelineSegment = {
  segment: number;
  /** Rows that belong inside the collapsible step group, in emission order. */
  rows: TimelineItem[];
  /** Text blocks, which the reference renders as prose below the group. */
  prose: TimelineItem[];
  /** The `N` in `Working · N steps`. */
  stepCount: number;
  streaming: boolean;
  /** Whether a tool in this segment failed, which is what keeps a finished group expanded. */
  failed: boolean;
};

export type Timeline = {
  segments: TimelineSegment[];
  tools: ReadonlyMap<string, ToolView>;
  /**
   * URLs this turn renders as media in its own right.
   *
   * Free models write result URLs into their prose however firmly the prompt forbids it, so prose
   * cannot be trusted to leave them out. Anything in here is dropped from the markdown, because it
   * is already on screen by construction.
   */
  assetUrls: ReadonlySet<string>;
};

const COUNTS_AS_STEP: ReadonlySet<ContentBlock["type"]> = new Set<ContentBlock["type"]>([
  "thinking",
  "tool_use",
  "step_update",
]);

/** `tool_result` is folded into its tool card, so it never renders as a row of its own. */
const HIDDEN_ROW: ReadonlySet<ContentBlock["type"]> = new Set<ContentBlock["type"]>(["tool_result"]);

function toolViewFromInvocation(invocation: ToolInvocationDTO): ToolView {
  return {
    id: invocation.id,
    toolUseId: invocation.toolUseId,
    toolName: invocation.toolName,
    subModelId: invocation.subModelId,
    display: invocation.display,
    status: invocation.status,
    input: invocation.input,
    output: invocation.output,
    errorMessage: invocation.errorMessage,
    creditUsed: invocation.creditUsed,
    durationMs: invocation.durationMs,
    resultUrls: [],
    resultSummary: null,
  };
}

/**
 * Groups blocks into the reference's `Working · N steps` segments.
 *
 * The rows/prose split is not a reordering: the orchestrator closes a segment on a text block, so
 * text is already last in its segment apart from the `usage` footer, and the captures render the
 * step group above the prose in every case.
 */
export function groupBlocks(
  items: readonly TimelineItem[],
  streamingSegment: number | null = null,
  tools: ReadonlyMap<string, ToolView> = new Map(),
): TimelineSegment[] {
  const bySegment = new Map<number, TimelineSegment>();

  for (const item of items) {
    const { block } = item;
    let segment = bySegment.get(block.segment);
    if (!segment) {
      segment = {
        segment: block.segment,
        rows: [],
        prose: [],
        stepCount: 0,
        streaming: block.segment === streamingSegment,
        failed: false,
      };
      bySegment.set(block.segment, segment);
    }

    if (block.type === "text") {
      segment.prose.push(item);
      continue;
    }

    if (block.type === "tool_use" && tools.get(block.id)?.status === "failed") {
      segment.failed = true;
    }

    if (COUNTS_AS_STEP.has(block.type)) segment.stepCount += 1;
    if (!HIDDEN_ROW.has(block.type)) segment.rows.push(item);
  }

  return [...bySegment.values()].sort((a, b) => a.segment - b.segment);
}

/**
 * The invocation behind an open detail panel, found across a chat's messages.
 *
 * The panel is rendered outside the virtualized list, so it cannot be handed the `ToolView` by the
 * card that opened it — the card unmounts as soon as it scrolls out of view. Only the id travels
 * through the store; the invocation itself is read back out of the cached messages.
 */
export function findToolView(
  messages: readonly MessageDTO[],
  invocationId: string,
): ToolView | null {
  for (const message of messages) {
    const invocation = message.toolInvocations.find((candidate) => candidate.id === invocationId);
    if (invocation) return toolViewFromInvocation(invocation);
  }

  return null;
}

/** The persisted half of the rendering model: a stored message becomes a timeline. */
export function timelineFromMessage(message: MessageDTO): Timeline {
  const tools = new Map<string, ToolView>(
    message.toolInvocations.map((invocation) => [
      invocation.toolUseId,
      toolViewFromInvocation(invocation),
    ]),
  );

  const blocks = message.contentBlocks ?? [];

  for (const block of blocks) {
    if (block.type !== "tool_result") continue;
    const tool = tools.get(block.toolUseId);
    if (tool && block.summary !== undefined) tool.resultSummary = block.summary;
  }

  return {
    segments: groupBlocks(blocks.map((block) => ({ block })), null, tools),
    tools,
    assetUrls: new Set((message.assets ?? []).map((asset) => asset.url)),
  };
}

/**
 * The live half of the rendering model: run metadata plus the text stream becomes the same
 * `Timeline` a stored message produces.
 *
 * `RunMetadata.blocks` carries structure only, so prose is cut out of `streamedText` by each text
 * block's `chars` and the open one takes the remainder. INVARIANT: only `text` blocks consume the
 * stream — reasoning travels as `reasoningText` — so counting anything else here shifts every later
 * block by the length of the thinking transcript.
 *
 * A thinking block is open when nothing follows it, which is why `reasoningText` lands on the last
 * one; earlier ones render as bare `Reasoned` rows until the persisted message fills them in.
 */
export function timelineFromRun(metadata: RunMetadata, streamedText: string): Timeline {
  const tools = new Map<string, ToolView>(
    metadata.invocations.map((invocation) => [
      invocation.toolUseId,
      {
        id: invocation.id,
        toolUseId: invocation.toolUseId,
        toolName: invocation.toolName,
        subModelId: invocation.subModelId ?? null,
        display: invocation.display,
        status: invocation.state,
        input: undefined,
        output: null,
        errorMessage: null,
        creditUsed: invocation.credits ?? null,
        durationMs: invocation.durationMs ?? null,
        resultUrls: invocation.resultUrls ?? [],
        resultSummary: null,
      },
    ]),
  );

  const lastIndex = metadata.blocks.length - 1;
  const items: TimelineItem[] = [];
  let offset = 0;

  metadata.blocks.forEach((projection, index) => {
    const segment = projection.segment;

    if (projection.type === "text") {
      const chars = projection.chars ?? 0;
      const text = projection.streaming
        ? streamedText.slice(offset)
        : streamedText.slice(offset, offset + chars);
      offset += chars;

      items.push({
        block: { segment, type: "text", text },
        ...(projection.streaming ? { streaming: true } : {}),
      });
      return;
    }

    if (projection.type === "thinking") {
      const open = index === lastIndex;

      items.push({
        block: { segment, type: "thinking", thinking: open ? (metadata.reasoningText ?? "") : "" },
        ...(open ? { streaming: true } : {}),
      });
      return;
    }

    if (projection.type === "tool_use" && projection.toolUseId) {
      items.push({
        block: {
          segment,
          type: "tool_use",
          id: projection.toolUseId,
          name: projection.name ?? "",
          input: undefined,
        },
      });
    }
  });

  const streamingSegment = metadata.blocks.at(-1)?.segment ?? null;

  return {
    segments: groupBlocks(items, streamingSegment, tools),
    tools,
    assetUrls: new Set(metadata.invocations.flatMap((invocation) => invocation.resultUrls ?? [])),
  };
}
