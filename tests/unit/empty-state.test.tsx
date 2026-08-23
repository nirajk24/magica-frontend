import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatScreen } from "@/components/chat/ChatScreen";
import { TemplateGallery } from "@/components/shell/TemplateGallery";
import { NEW_CHAT_ID } from "@/queries/use-chat";
import { TEMPLATES, type Template } from "@/templates/gallery";
import { useUI } from "@/stores/ui";
import { renderWithProviders } from "../render";

/** jsdom leaves the media methods unimplemented, so calling one throws rather than no-ops. */
const play = vi.fn(() => Promise.resolve());
const pause = vi.fn();

HTMLMediaElement.prototype.play = play;
HTMLMediaElement.prototype.pause = pause;

beforeEach(() => {
  play.mockClear();
  pause.mockClear();
});

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
  it("shows a first page under All and reveals the rest on demand", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TemplateGallery onPick={() => {}} />);

    expect(screen.getByRole("tab", { name: "All" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(TEMPLATES[0]!.title)).toBeInTheDocument();

    const last = TEMPLATES[TEMPLATES.length - 1]!;
    expect(screen.queryByText(last.title), "the tail waits behind See more").not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /see more ideas/i }));

    for (const template of TEMPLATES) {
      expect(screen.getByText(template.title)).toBeInTheDocument();
    }
  });

  it("narrows to one category and back", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TemplateGallery onPick={() => {}} />);

    await user.click(screen.getByRole("tab", { name: "Image & Editing" }));

    const inCategory = (t: Template) => t.categories.includes("Image & Editing");
    const shown = TEMPLATES.filter(inCategory);
    const hidden = TEMPLATES.filter((t) => !inCategory(t));

    for (const template of shown) expect(screen.getByText(template.title)).toBeInTheDocument();
    for (const template of hidden) {
      expect(screen.queryByText(template.title)).not.toBeInTheDocument();
    }

    await user.click(screen.getByRole("tab", { name: "All" }));

    expect(screen.getByText(hidden[0]!.title)).toBeInTheDocument();
  });

  it("plays a card's clip only while the pointer is on it", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TemplateGallery onPick={() => {}} />);

    const clip = TEMPLATES.find((t) => t.clip)!;
    const card = screen.getByRole("button", { name: new RegExp(clip.title) });
    const video = card.querySelector("video")!;

    expect(video, "the clip is not fetched until asked for").toHaveAttribute("preload", "none");
    expect(video).toHaveAttribute("poster", clip.poster);

    await user.hover(card);
    expect(play).toHaveBeenCalled();

    await user.unhover(card);
    expect(pause).toHaveBeenCalled();
  });

  it("hands the whole prompt back, not the card's one-line description", async () => {
    const user = userEvent.setup();
    let picked: string | null = null;

    renderWithProviders(<TemplateGallery onPick={(template) => (picked = template.prompt)} />);

    await user.click(screen.getByRole("button", { name: new RegExp(TEMPLATES[0]!.title) }));

    expect(picked).toBe(TEMPLATES[0]!.prompt);
  });
});
