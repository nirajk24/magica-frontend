import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessageRow } from "@/components/chat/MessageRow";
import { timelineFromMessage } from "@/lib/timeline";
import { useUI } from "@/stores/ui";
import { renderWithProviders } from "../render";
import * as fixtures from "../msw/fixtures";

const PROMPT = (fixtures.detailedToolInvocation.input as { prompt: string }).prompt;

/** Expands the step groups. The rows inside open with their group, so the card needs no click. */
async function openToolCard(user: ReturnType<typeof userEvent.setup>) {
  renderWithProviders(<MessageRow message={fixtures.detailedAssistantMessage} />);

  for (const group of screen.getAllByRole("button", { name: /Completed \d+ step/ })) {
    await user.click(group);
  }
}

describe("the tool card's View more", () => {
  it("is a real control now that the panel exists", async () => {
    const user = userEvent.setup();
    await openToolCard(user);

    const link = screen.getByRole("button", { name: "View more" });

    expect(link).not.toHaveAttribute("aria-disabled");
  });

  it("only appears when there is more than the card shows", () => {
    const timeline = timelineFromMessage(fixtures.assistantMessage);
    const tool = timeline.tools.get(fixtures.TOOL_USE_ID);

    expect(Object.keys(tool?.input as object)).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "View more" })).not.toBeInTheDocument();
  });

  it("opens the detail panel", async () => {
    const user = userEvent.setup();
    await openToolCard(user);

    await user.click(screen.getByRole("button", { name: "View more" }));

    expect(
      screen.getByRole("dialog", { name: /Generating image detail/ }),
    ).toBeInTheDocument();
  });
});

describe("the tool detail panel", () => {
  it("shows the whole prompt the card truncates", async () => {
    const user = userEvent.setup();
    await openToolCard(user);
    await user.click(screen.getByRole("button", { name: "View more" }));

    const panel = screen.getByRole("dialog");

    expect(panel).toHaveTextContent(PROMPT);
  });

  it("shows every field, not the card's first five", async () => {
    const user = userEvent.setup();
    await openToolCard(user);
    await user.click(screen.getByRole("button", { name: "View more" }));

    const panel = screen.getByRole("dialog");

    for (const label of ["Tool:", "Model:", "Prompt:", "Size:", "Quality:", "Aspect Ratio:", "Resolution:"]) {
      expect(panel).toHaveTextContent(label);
    }
  });

  it("takes Model from the invocation, not from the tool input", async () => {
    const user = userEvent.setup();
    await openToolCard(user);
    await user.click(screen.getByRole("button", { name: "View more" }));

    expect(screen.getByRole("dialog")).toHaveTextContent(fixtures.SUB_MODEL_ID);
  });

  it("reports what the call cost", async () => {
    const user = userEvent.setup();
    await openToolCard(user);
    await user.click(screen.getByRole("button", { name: "View more" }));

    expect(screen.getByRole("dialog")).toHaveTextContent(/Credits used:\s*0\.0059M/);
  });

  it("maximizes, and the toggle then offers Restore", async () => {
    const user = userEvent.setup();
    await openToolCard(user);
    await user.click(screen.getByRole("button", { name: "View more" }));

    await user.click(screen.getByRole("button", { name: "Maximize" }));

    expect(screen.getByRole("button", { name: "Restore" })).toBeInTheDocument();
  });

  it("closes on its own control", async () => {
    const user = userEvent.setup();
    await openToolCard(user);
    await user.click(screen.getByRole("button", { name: "View more" }));

    await user.click(screen.getByRole("button", { name: "Close detail" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(useUI.getState().openPanel).toBeNull();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    await openToolCard(user);
    await user.click(screen.getByRole("button", { name: "View more" }));

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the input image the call was given", async () => {
    const user = userEvent.setup();
    await openToolCard(user);
    await user.click(screen.getByRole("button", { name: "View more" }));

    expect(screen.getByRole("dialog")).toHaveTextContent("Input Images:");
  });
});
