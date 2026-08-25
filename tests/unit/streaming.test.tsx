import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import type { MessageDTO } from "@/contracts";
import { ChatScreen } from "@/components/chat/ChatScreen";
import { StreamingOverlay } from "@/components/chat/StreamingOverlay";
import { server } from "../msw/setup";
import { noActiveRun } from "../msw/handlers";
import { renderWithProviders } from "../render";
import * as fixtures from "../msw/fixtures";

describe("StreamingOverlay", () => {
  it("holds the pending row while the turn has published no blocks yet", () => {
    renderWithProviders(
      <StreamingOverlay
        metadata={{ ...fixtures.runMetadata, blocks: [] }}
        streamedText=""
      />,
    );

    expect(screen.getByText("Thinking")).toBeInTheDocument();
    expect(screen.queryByTestId("streaming-overlay")).not.toBeInTheDocument();
  });

  it("renders the prose the stream has delivered so far, mid-word", () => {
    renderWithProviders(
      <StreamingOverlay metadata={fixtures.runMetadata} streamedText={fixtures.streamedText} />,
    );

    expect(screen.getByText("I'll generate that for you.")).toBeInTheDocument();
    expect(screen.getByText("Here is your mountain at sun")).toBeInTheDocument();
  });

  it("streams the reasoning tail into an open Thinking row rather than an empty box", () => {
    renderWithProviders(
      <StreamingOverlay
        metadata={{
          ...fixtures.runMetadata,
          blocks: [{ segment: 0, type: "thinking" }],
          reasoningText: "The user wants a landscape ima",
        }}
        streamedText=""
      />,
    );

    expect(screen.getByRole("button", { name: /Thinking/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByText("The user wants a landscape ima")).toBeVisible();
  });

  it("shows a running tool card from the live invocation", () => {
    renderWithProviders(
      <StreamingOverlay metadata={fixtures.runMetadata} streamedText={fixtures.streamedText} />,
    );

    expect(screen.getByText("Generating image")).toBeInTheDocument();
    expect(screen.getByLabelText("Running")).toBeInTheDocument();
  });

  it("labels the live segment Working, and opens it", () => {
    renderWithProviders(
      <StreamingOverlay metadata={fixtures.runMetadata} streamedText={fixtures.streamedText} />,
    );

    expect(screen.getByRole("button", { name: /Working · 1 step/ })).toBeInTheDocument();
  });

  it("announces the streaming region to assistive technology", () => {
    const { container } = renderWithProviders(
      <StreamingOverlay metadata={fixtures.runMetadata} streamedText={fixtures.streamedText} />,
    );

    expect(container.querySelector('[aria-live="polite"]')).not.toBeNull();
  });

  it("renders a settled live invocation through the same card as a stored one", () => {
    const settled = fixtures.runMetadata.invocations.map((invocation) => ({
      ...invocation,
      state: "completed" as const,
      durationMs: 8_412,
    }));

    renderWithProviders(
      <StreamingOverlay
        metadata={{ ...fixtures.runMetadata, invocations: settled }}
        streamedText={fixtures.streamedText}
      />,
    );

    expect(screen.getByText("0.0059M")).toBeInTheDocument();
    expect(screen.getByText("8.4s")).toBeInTheDocument();
  });
});

describe("one authority renders a run", () => {
  const streamingRow: MessageDTO = {
    ...fixtures.assistantMessage,
    id: "01999f00-0000-7000-8000-0000000001ff",
    status: "streaming",
    content: "partial answer being written",
    contentBlocks: [{ segment: 0, type: "text", text: "partial answer being written" }],
    assets: null,
    runId: fixtures.RUN_ID,
  };

  it("hides the persisted partial while a run is active", async () => {
    server.use(
      fixtures.chatHandlerWith([fixtures.userMessage, streamingRow]),
    );

    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    expect(await screen.findByText(fixtures.userMessage.content)).toBeInTheDocument();
    expect(screen.queryByText("partial answer being written")).not.toBeInTheDocument();
  });

  it("shows the same row once the run is over, so nothing is lost at handover", async () => {
    server.use(noActiveRun, fixtures.chatHandlerWith([fixtures.userMessage, streamingRow]));

    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    expect(await screen.findByText("partial answer being written")).toBeInTheDocument();
  });
});

describe("a running tool card", () => {
  it("says what the tool was asked to do, from the metadata's truncated input", () => {
    renderWithProviders(
      <StreamingOverlay metadata={fixtures.runMetadata} streamedText={fixtures.streamedText} />,
    );

    expect(screen.getByText("a mountain at sunrise")).toBeInTheDocument();
    expect(screen.getByText("Prompt")).toBeInTheDocument();
  });
});
