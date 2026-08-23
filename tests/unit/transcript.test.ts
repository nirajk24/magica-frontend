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

  const streamingRow: MessageDTO = {
    ...fixtures.assistantMessage,
    status: "streaming",
    runId: fixtures.RUN_ID,
  };

  it("hides the persisted streaming row while an overlay is live", () => {
    const visible = selectTranscript([fixtures.userMessage, streamingRow], { liveOverlay: true });

    expect(visible.map((message) => message.id)).toEqual([fixtures.USER_MESSAGE_ID]);
  });

  /**
   * The default is what runs before `active-run` has answered. Assuming no overlay there paints the
   * half-written row for the seconds that request takes and then removes it, which is the reasoning
   * appearing and vanishing as a chat opens.
   */
  it("hides it by default, so an unanswered active-run cannot flash the row", () => {
    expect(selectTranscript([fixtures.userMessage, streamingRow])).toHaveLength(1);
  });

  it("shows it once active-run has confirmed nothing is running", () => {
    expect(selectTranscript([streamingRow], { liveOverlay: false })).toHaveLength(1);
  });

  it("keeps a finished row for the run the overlay owns, so handover has something to land on", () => {
    expect(selectTranscript([fixtures.assistantMessage], { liveOverlay: true })).toHaveLength(1);
  });
});
