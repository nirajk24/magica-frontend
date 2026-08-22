import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessageRow } from "@/components/chat/MessageRow";
import { TurnOutcome } from "@/components/chat/TurnOutcome";
import { renderWithProviders } from "../render";
import * as fixtures from "../msw/fixtures";

describe("a failed turn", () => {
  it("keeps the partial output, the tool outcome and the error together", () => {
    renderWithProviders(<MessageRow message={fixtures.failedAssistantMessage} />);

    expect(screen.getByText("I'll generate that for you.")).toBeInTheDocument();
    expect(
      screen.getByText("That prompt was blocked. Try describing it differently."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(fixtures.failedAssistantMessage.errorMessage as string),
    ).toBeInTheDocument();
  });

  it("charges nothing for the tool that failed, so no credit chip is rendered", () => {
    renderWithProviders(<MessageRow message={fixtures.failedAssistantMessage} />);

    expect(screen.queryByText(/^0\./)).not.toBeInTheDocument();
  });

  it("offers a way forward", () => {
    renderWithProviders(<MessageRow message={fixtures.failedAssistantMessage} />);

    expect(screen.getByRole("button", { name: /retry/i })).toHaveAttribute(
      "aria-disabled",
      "false",
    );
  });

  it("falls back to its own copy when the server sent no message", () => {
    renderWithProviders(
      <TurnOutcome
        message={{ ...fixtures.failedAssistantMessage, errorMessage: null }}
        runActive={false}
        retrying={false}
      />,
    );

    expect(screen.getByText("This response failed to finish.")).toBeInTheDocument();
  });
});

describe("a cancelled turn", () => {
  it("says it was interrupted, derived from status rather than from the content", () => {
    renderWithProviders(<MessageRow message={fixtures.cancelledAssistantMessage} />);

    expect(screen.getByText("Response was interrupted")).toBeInTheDocument();
    expect(screen.queryByText(/Response stopped/)).not.toBeInTheDocument();
  });

  it("keeps the partial answer and the turn's cost on screen", () => {
    renderWithProviders(<MessageRow message={fixtures.cancelledAssistantMessage} />);

    expect(screen.getByText("I'll generate that for you.")).toBeInTheDocument();
    expect(screen.getByText(/0\.10M credits/)).toBeInTheDocument();
  });

  it("is retryable, which the reference is not — the brief requires it", () => {
    renderWithProviders(<MessageRow message={fixtures.cancelledAssistantMessage} />);

    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});

describe("a turn that succeeded", () => {
  it("says nothing about outcomes and offers no retry", () => {
    renderWithProviders(<MessageRow message={fixtures.assistantMessage} />);

    expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Response was interrupted")).not.toBeInTheDocument();
  });
});

describe("retry while another run holds the chat", () => {
  it("refuses and says why rather than sending a request that would 409", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    renderWithProviders(
      <TurnOutcome
        message={fixtures.failedAssistantMessage}
        runActive
        retrying={false}
        onRetry={onRetry}
      />,
    );

    const retry = screen.getByRole("button", { name: /retry/i });

    expect(retry).toHaveAttribute("aria-disabled", "true");

    await user.click(retry);

    expect(onRetry).not.toHaveBeenCalled();
  });

  it("names the reason on hover rather than looking merely broken", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <TurnOutcome
        message={fixtures.failedAssistantMessage}
        runActive
        retrying={false}
        onRetry={vi.fn()}
      />,
    );

    await user.hover(screen.getByRole("button", { name: /retry/i }));

    expect(await screen.findByRole("tooltip")).toHaveTextContent(/already in progress/i);
  });

  it("does not fire twice while a retry is already in flight", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    renderWithProviders(
      <TurnOutcome
        message={fixtures.failedAssistantMessage}
        runActive={false}
        retrying
        onRetry={onRetry}
      />,
    );

    await user.click(screen.getByRole("button", { name: /retry/i }));

    expect(onRetry).not.toHaveBeenCalled();
  });

  it("hands the failed assistant message's id to the retry route", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    renderWithProviders(
      <TurnOutcome
        message={fixtures.failedAssistantMessage}
        runActive={false}
        retrying={false}
        onRetry={onRetry}
      />,
    );

    await user.click(screen.getByRole("button", { name: /retry/i }));

    expect(onRetry).toHaveBeenCalledWith(fixtures.failedAssistantMessage.id);
  });
});
