import { describe, expect, it } from "vitest";
import type { ContentBlock, MessageDTO } from "@/contracts";
import { groupBlocks, timelineFromMessage, timelineFromRun } from "@/lib/timeline";
import * as fixtures from "../msw/fixtures";

const items = (blocks: readonly ContentBlock[]) => blocks.map((block) => ({ block }));

describe("groupBlocks", () => {
  it("splits text out as prose and keeps everything else as timeline rows", () => {
    const [first, second] = groupBlocks(items(fixtures.assistantBlocks));

    expect(first?.rows.map((row) => row.block.type)).toEqual(["thinking"]);
    expect(first?.prose.map((row) => row.block.type)).toEqual(["text"]);
    expect(second?.rows.map((row) => row.block.type)).toEqual(["tool_use"]);
    expect(second?.prose.map((row) => row.block.type)).toEqual(["text"]);
  });

  it("counts reasoning, tools and step updates as steps, but not usage", () => {
    const blocks: ContentBlock[] = [
      { segment: 0, type: "thinking", thinking: "…" },
      { segment: 0, type: "step_update", stepKey: "image", status: "in_progress" },
      { segment: 0, type: "tool_use", id: "call_1", name: "gpt_image_2", input: {} },
      { segment: 0, type: "usage", inputTokens: 10, outputTokens: 20 },
      { segment: 0, type: "text", text: "done" },
    ];

    expect(groupBlocks(items(blocks))[0]?.stepCount).toBe(3);
  });

  it("orders segments ascending even if the blocks arrive out of order", () => {
    const blocks: ContentBlock[] = [
      { segment: 2, type: "text", text: "last" },
      { segment: 0, type: "text", text: "first" },
    ];

    expect(groupBlocks(items(blocks)).map((segment) => segment.segment)).toEqual([0, 2]);
  });

  it("marks only the streaming segment as streaming", () => {
    const segments = groupBlocks(items(fixtures.assistantBlocks), 1);

    expect(segments.map((segment) => segment.streaming)).toEqual([false, true]);
  });

  it("survives a block type it has never seen", () => {
    const blocks = [{ segment: 0, type: "hologram", spin: 3 }] as unknown as ContentBlock[];

    expect(groupBlocks(items(blocks))[0]?.rows).toHaveLength(1);
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
    expect(timeline.segments[1]?.rows.map((row) => row.block.type)).toEqual(["tool_use"]);
  });

  it("returns no segments for a message that has no blocks", () => {
    expect(timelineFromMessage(fixtures.userMessage).segments).toEqual([]);
  });
});

describe("timelineFromRun", () => {
  it("cuts each text block out of the stream by its own chars", () => {
    const timeline = timelineFromRun(fixtures.runMetadata, fixtures.streamedText);

    expect(timeline.segments[0]?.prose.map((item) => item.block)).toEqual([
      { segment: 0, type: "text", text: "I'll generate that for you." },
    ]);
  });

  it("gives the open block the remainder of the stream, mid-word", () => {
    const timeline = timelineFromRun(fixtures.runMetadata, fixtures.streamedText);
    const open = timeline.segments[1]?.prose.at(-1);

    expect(open?.streaming).toBe(true);
    expect(open?.block).toEqual({
      segment: 1,
      type: "text",
      text: "Here is your mountain at sun",
    });
  });

  it("does not let reasoning consume the stream, which would shift every later block", () => {
    const shifted = timelineFromRun(
      {
        ...fixtures.runMetadata,
        blocks: [
          { segment: 0, type: "thinking", chars: 31 },
          ...fixtures.runMetadata.blocks.slice(1),
        ],
      },
      fixtures.streamedText,
    );

    expect(shifted.segments[0]?.prose[0]?.block).toMatchObject({
      text: "I'll generate that for you.",
    });
  });

  it("streams the reasoning tail into the open thinking row", () => {
    const timeline = timelineFromRun(
      {
        ...fixtures.runMetadata,
        blocks: [{ segment: 0, type: "thinking" }],
        reasoningText: "The user wants a landscape",
      },
      "",
    );
    const row = timeline.segments[0]?.rows[0];

    expect(row?.streaming).toBe(true);
    expect(row?.block).toMatchObject({ thinking: "The user wants a landscape" });
  });

  it("leaves an earlier thinking row bare, because only the tail is live", () => {
    const timeline = timelineFromRun(fixtures.runMetadata, fixtures.streamedText);
    const row = timeline.segments[0]?.rows[0];

    expect(row?.streaming).toBeUndefined();
    expect(row?.block).toMatchObject({ type: "thinking", thinking: "" });
  });

  it("normalises live invocations into the same ToolView a stored message produces", () => {
    const timeline = timelineFromRun(fixtures.runMetadata, fixtures.streamedText);

    expect(timeline.tools.get(fixtures.TOOL_USE_ID)).toMatchObject({
      toolName: "gpt_image_2",
      status: "running",
      creditUsed: "5880",
      display: { label: "Generating image" },
    });
  });

  it("marks the newest segment as the streaming one", () => {
    const timeline = timelineFromRun(fixtures.runMetadata, fixtures.streamedText);

    expect(timeline.segments.map((segment) => segment.streaming)).toEqual([false, true]);
  });

  it("survives an empty stream and an empty projection", () => {
    const timeline = timelineFromRun({ ...fixtures.runMetadata, blocks: [] }, "");

    expect(timeline.segments).toEqual([]);
  });
});

describe("blocks that never become rows", () => {
  it("keeps token usage out of the step group, where a collapse would hide it", () => {
    const timeline = timelineFromMessage(fixtures.assistantMessage);
    const types = timeline.segments.flatMap((segment) =>
      segment.rows.map((row) => row.block.type),
    );

    expect(types).not.toContain("usage");
    expect(fixtures.assistantBlocks.some((block) => block.type === "usage")).toBe(true);
  });

  it("still counts a usage block as no step at all", () => {
    const timeline = timelineFromMessage(fixtures.assistantMessage);

    expect(timeline.segments.map((segment) => segment.stepCount)).toEqual([1, 1]);
  });

  it("collects the urls a stored turn already renders as assets", () => {
    expect([...timelineFromMessage(fixtures.assistantMessage).assetUrls]).toEqual([
      fixtures.IMAGE_URL,
    ]);
  });

  it("collects the urls a live turn has already produced", () => {
    const timeline = timelineFromRun(
      {
        ...fixtures.runMetadata,
        invocations: fixtures.runMetadata.invocations.map((invocation) => ({
          ...invocation,
          resultUrls: [fixtures.IMAGE_URL],
        })),
      },
      fixtures.streamedText,
    );

    expect([...timeline.assetUrls]).toEqual([fixtures.IMAGE_URL]);
  });
});
