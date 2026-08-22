import { describe, expect, it } from "vitest";
import type { ContentBlock, MessageDTO } from "@/contracts";
import { groupBlocks, timelineFromMessage } from "@/lib/timeline";
import * as fixtures from "../msw/fixtures";

describe("groupBlocks", () => {
  it("splits text out as prose and keeps everything else as timeline rows", () => {
    const [first, second] = groupBlocks(fixtures.assistantBlocks);

    expect(first?.rows.map((row) => row.type)).toEqual(["thinking"]);
    expect(first?.prose.map((row) => row.type)).toEqual(["text"]);
    expect(second?.rows.map((row) => row.type)).toEqual(["tool_use", "usage"]);
    expect(second?.prose.map((row) => row.type)).toEqual(["text"]);
  });

  it("counts reasoning, tools and step updates as steps, but not usage", () => {
    const blocks: ContentBlock[] = [
      { segment: 0, type: "thinking", thinking: "…" },
      { segment: 0, type: "step_update", stepKey: "image", status: "in_progress" },
      { segment: 0, type: "tool_use", id: "call_1", name: "gpt_image_2", input: {} },
      { segment: 0, type: "usage", inputTokens: 10, outputTokens: 20 },
      { segment: 0, type: "text", text: "done" },
    ];

    expect(groupBlocks(blocks)[0]?.stepCount).toBe(3);
  });

  it("orders segments ascending even if the blocks arrive out of order", () => {
    const blocks: ContentBlock[] = [
      { segment: 2, type: "text", text: "last" },
      { segment: 0, type: "text", text: "first" },
    ];

    expect(groupBlocks(blocks).map((segment) => segment.segment)).toEqual([0, 2]);
  });

  it("marks only the streaming segment as streaming", () => {
    const segments = groupBlocks(fixtures.assistantBlocks, 1);

    expect(segments.map((segment) => segment.streaming)).toEqual([false, true]);
  });

  it("survives a block type it has never seen", () => {
    const blocks = [{ segment: 0, type: "hologram", spin: 3 }] as unknown as ContentBlock[];

    expect(groupBlocks(blocks)[0]?.rows).toHaveLength(1);
  });
});

describe("timelineFromMessage", () => {
  it("keys tool views by toolUseId so a card can find its invocation", () => {
    const timeline = timelineFromMessage(fixtures.assistantMessage);
    const tool = timeline.tools.get(fixtures.TOOL_USE_ID);

    expect(tool).toMatchObject({
      toolName: "gpt_image_2",
      status: "completed",
      creditUsed: "5880",
      durationMs: 8_412,
    });
  });

  it("folds a tool_result summary onto its invocation instead of rendering a row", () => {
    const message: MessageDTO = {
      ...fixtures.assistantMessage,
      contentBlocks: [
        ...fixtures.assistantBlocks,
        { segment: 1, type: "tool_result", toolUseId: fixtures.TOOL_USE_ID, summary: "1 image" },
      ],
    };

    const timeline = timelineFromMessage(message);

    expect(timeline.tools.get(fixtures.TOOL_USE_ID)?.resultSummary).toBe("1 image");
    expect(timeline.segments[1]?.rows.map((row) => row.type)).toEqual(["tool_use", "usage"]);
  });

  it("returns no segments for a message that has no blocks", () => {
    expect(timelineFromMessage(fixtures.userMessage).segments).toEqual([]);
  });
});
