import type { ContentBlock, MessageDTO, ToolInvocationDTO } from "@/contracts";

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

export type TimelineSegment = {
  segment: number;
  /** Rows that belong inside the collapsible step group, in emission order. */
  rows: ContentBlock[];
  /** Text blocks, which the reference renders as prose below the group. */
  prose: ContentBlock[];
  /** The `N` in `Working · N steps`. */
  stepCount: number;
  streaming: boolean;
};

export type Timeline = {
  segments: TimelineSegment[];
  tools: ReadonlyMap<string, ToolView>;
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
  blocks: readonly ContentBlock[],
  streamingSegment: number | null = null,
): TimelineSegment[] {
  const bySegment = new Map<number, TimelineSegment>();

  for (const block of blocks) {
    let segment = bySegment.get(block.segment);
    if (!segment) {
      segment = {
        segment: block.segment,
        rows: [],
        prose: [],
        stepCount: 0,
        streaming: block.segment === streamingSegment,
      };
      bySegment.set(block.segment, segment);
    }

    if (block.type === "text") {
      segment.prose.push(block);
      continue;
    }

    if (COUNTS_AS_STEP.has(block.type)) segment.stepCount += 1;
    if (!HIDDEN_ROW.has(block.type)) segment.rows.push(block);
  }

  return [...bySegment.values()].sort((a, b) => a.segment - b.segment);
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

  return { segments: groupBlocks(blocks), tools };
}
