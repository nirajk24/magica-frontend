import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Composer } from "@/components/chat/Composer";
import { useUI } from "@/stores/ui";
import { renderWithProviders } from "../render";

const CHAT_ID = "chat-1";

describe("Composer", () => {
  it("keeps the draft in the store, keyed by chat, so it survives a remount", async () => {
    const user = userEvent.setup();
    const { unmount } = renderWithProviders(
      <Composer chatId={CHAT_ID} onSubmit={vi.fn()} />,
    );

    await user.type(screen.getByLabelText("Message"), "half a thought");
    unmount();
    renderWithProviders(<Composer chatId={CHAT_ID} onSubmit={vi.fn()} />);

    expect(screen.getByLabelText("Message")).toHaveValue("half a thought");
  });

  it("does not leak a draft into another chat", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Composer chatId={CHAT_ID} onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText("Message"), "for chat one");

    expect(useUI.getState().drafts).toEqual({ [CHAT_ID]: "for chat one" });
  });

  it("sends on Enter", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(<Composer chatId={CHAT_ID} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Message"), "generate a mountain{Enter}");

    expect(onSubmit).toHaveBeenCalledWith({ content: "generate a mountain", planMode: false });
  });

  it("inserts a newline on Shift+Enter instead of sending", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(<Composer chatId={CHAT_ID} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Message"), "first{Shift>}{Enter}{/Shift}second");

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Message")).toHaveValue("first\nsecond");
  });

  it("refuses to send whitespace", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(<Composer chatId={CHAT_ID} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Message"), "   {Enter}");

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Send message" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("carries plan mode into the submission", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(<Composer chatId={CHAT_ID} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Plan mode" }));
    await user.type(screen.getByLabelText("Message"), "make me a poster{Enter}");

    expect(onSubmit).toHaveBeenCalledWith({ content: "make me a poster", planMode: true });
  });

  it("will not send while a run is active, and says why", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(<Composer chatId={CHAT_ID} runActive onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Message"), "queued up{Enter}");

    expect(onSubmit).not.toHaveBeenCalled();

    await user.hover(screen.getByRole("button", { name: "A run is already in progress" }));

    expect(await screen.findByRole("tooltip")).toHaveTextContent(/next phase/i);
  });

  it("explains the controls it does not implement yet", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Composer chatId={CHAT_ID} onSubmit={vi.fn()} />);

    const attach = screen.getByRole("button", { name: "Attach a file" });

    expect(attach).toHaveAttribute("aria-disabled", "true");

    await user.hover(attach);

    expect(await screen.findByRole("tooltip")).toHaveTextContent(/aren't part of this build/i);
  });

  it("uses the empty-state placeholder when given one", () => {
    renderWithProviders(
      <Composer
        chatId={CHAT_ID}
        placeholder="Assign a task or ask anything..."
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByPlaceholderText("Assign a task or ask anything...")).toBeInTheDocument();
  });
});
