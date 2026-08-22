import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatScreen } from "@/components/chat/ChatScreen";
import { TemplateGallery } from "@/components/shell/TemplateGallery";
import { NEW_CHAT_ID } from "@/queries/use-chat";
import { TEMPLATES } from "@/templates/gallery";
import { useUI } from "@/stores/ui";
import { renderWithProviders } from "../render";

describe("the new-chat screen", () => {
  it("carries the reference's masthead copy and its own placeholder", async () => {
    renderWithProviders(<ChatScreen chatId={NEW_CHAT_ID} />);

    expect(screen.getByRole("heading", { name: "Your AI worker" })).toBeInTheDocument();
    expect(screen.getByText("Work at the speed of thought.")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Assign a task or ask anything..."),
    ).toBeInTheDocument();
  });

  it("prefills the composer from a template without sending it", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChatScreen chatId={NEW_CHAT_ID} />);

    const template = TEMPLATES[0]!;

    await user.click(screen.getByRole("button", { name: new RegExp(template.title) }));

    expect(screen.getByLabelText("Message")).toHaveValue(template.prompt);
    expect(useUI.getState().drafts[NEW_CHAT_ID]).toBe(template.prompt);
  });

  it("keeps the grid on screen after a pick, because it is a starting point and not a submit", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChatScreen chatId={NEW_CHAT_ID} />);

    const template = TEMPLATES[0]!;
    await user.click(screen.getByRole("button", { name: new RegExp(template.title) }));

    expect(screen.getByRole("tablist", { name: "Template categories" })).toBeInTheDocument();
  });
});

describe("the template gallery", () => {
  it("shows every template under All", () => {
    renderWithProviders(<TemplateGallery onPick={() => {}} />);

    expect(screen.getByRole("tab", { name: "All" })).toHaveAttribute("aria-selected", "true");
    for (const template of TEMPLATES) {
      expect(screen.getByText(template.title)).toBeInTheDocument();
    }
  });

  it("narrows to one category and back", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TemplateGallery onPick={() => {}} />);

    await user.click(screen.getByRole("tab", { name: "Image & Editing" }));

    const shown = TEMPLATES.filter((t) => t.category === "Image & Editing");
    const hidden = TEMPLATES.filter((t) => t.category !== "Image & Editing");

    for (const template of shown) expect(screen.getByText(template.title)).toBeInTheDocument();
    for (const template of hidden) {
      expect(screen.queryByText(template.title)).not.toBeInTheDocument();
    }

    await user.click(screen.getByRole("tab", { name: "All" }));

    expect(screen.getByText(hidden[0]!.title)).toBeInTheDocument();
  });

  it("hands the whole prompt back, not the card's one-line description", async () => {
    const user = userEvent.setup();
    let picked: string | null = null;

    renderWithProviders(<TemplateGallery onPick={(template) => (picked = template.prompt)} />);

    await user.click(screen.getByRole("button", { name: new RegExp(TEMPLATES[0]!.title) }));

    expect(picked).toBe(TEMPLATES[0]!.prompt);
  });
});
