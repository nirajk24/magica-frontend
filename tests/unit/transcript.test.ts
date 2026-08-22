import { describe, expect, it } from "vitest";
import type { ChatWithMessages, MessageDTO } from "@/contracts";
import { flattenMessagePages, selectTranscript } from "@/lib/transcript";
import * as fixtures from "../msw/fixtures";

const page = (messages: MessageDTO[], nextCursor: string | null = null): ChatWithMessages => ({
  chat: fixtures.chat,
  messages,
  messagesNextCursor: nextCursor,
});

describe("flattenMessagePages", () => {
  it("puts older pages first, because the cursor walks backwards in time", () => {
    const newest = page([fixtures.assistantMessage]);
    const older = page([fixtures.userMessage], "cursor");

    expect(flattenMessagePages([newest, older]).map((message) => message.id)).toEqual([
      fixtures.USER_MESSAGE_ID,
      fixtures.ASSISTANT_MESSAGE_ID,
    ]);
  });

  it("handles no pages at all", () => {
    expect(flattenMessagePages([])).toEqual([]);
  });
});

describe("selectTranscript", () => {
  it("shows user and assistant rows and hides prompt plumbing", () => {
    const system: MessageDTO = { ...fixtures.userMessage, id: "sys", role: "system" };
    const tool: MessageDTO = { ...fixtures.userMessage, id: "tool", role: "tool" };

    const visible = selectTranscript([fixtures.userMessage, system, tool, fixtures.assistantMessage]);

    expect(visible.map((message) => message.role)).toEqual(["user", "assistant"]);
  });

  it("hides the persisted streaming row while an overlay owns that run", () => {
    const streaming: MessageDTO = {
      ...fixtures.assistantMessage,
      status: "streaming",
      runId: fixtures.RUN_ID,
    };

    const visible = selectTranscript([fixtures.userMessage, streaming], {
      overlayRunId: fixtures.RUN_ID,
    });

    expect(visible.map((message) => message.id)).toEqual([fixtures.USER_MESSAGE_ID]);
  });

  it("keeps a streaming row that belongs to a different run", () => {
    const streaming: MessageDTO = {
      ...fixtures.assistantMessage,
      status: "streaming",
      runId: "another-run",
    };

    expect(selectTranscript([streaming], { overlayRunId: fixtures.RUN_ID })).toHaveLength(1);
  });

  it("keeps a finished row for the run the overlay owns, so handover has something to land on", () => {
    const visible = selectTranscript([fixtures.assistantMessage], {
      overlayRunId: fixtures.RUN_ID,
    });

    expect(visible).toHaveLength(1);
  });
});
