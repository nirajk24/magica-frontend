import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessageRow } from "@/components/chat/MessageRow";
import { renderWithProviders } from "../render";
import * as fixtures from "../msw/fixtures";

describe("MessageRow — user", () => {
  it("renders the prompt text", () => {
    renderWithProviders(<MessageRow message={fixtures.userMessage} />);

    expect(screen.getByText(fixtures.userMessage.content)).toBeInTheDocument();
  });

  it("renders an attachment above the bubble text", () => {
    renderWithProviders(<MessageRow message={fixtures.userMessageWithAttachment} />);

    const image = screen.getByRole("img", { name: fixtures.attachment.name });

    expect(image).toHaveAttribute("src", fixtures.attachment.url);
    expect(
      image.compareDocumentPosition(screen.getByText(fixtures.userMessageWithAttachment.content)),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("offers a copy affordance carrying the prompt", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MessageRow message={fixtures.userMessage} />);

    await user.click(screen.getByRole("button", { name: "Copy" }));

    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
    await expect(window.navigator.clipboard.readText()).resolves.toBe(
      fixtures.userMessage.content,
    );
  });
});

describe("MessageRow — assistant", () => {
  it("renders the prose from the content blocks", () => {
    renderWithProviders(<MessageRow message={fixtures.assistantMessage} />);

    expect(screen.getByText("I'll generate that for you.")).toBeInTheDocument();
    expect(screen.getByText("Here is your mountain at sunrise.")).toBeInTheDocument();
  });

  it("renders the generated asset with a download affordance", () => {
    renderWithProviders(<MessageRow message={fixtures.assistantMessage} />);

    expect(screen.getByRole("link", { name: "Download image" })).toHaveAttribute(
      "href",
      fixtures.IMAGE_URL,
    );
  });

  it("shows the turn's credit total", () => {
    renderWithProviders(<MessageRow message={fixtures.assistantMessage} />);

    expect(screen.getByText(/0\.0059M credits/)).toBeInTheDocument();
  });

  it("reports no token counts, which the reference shows nowhere", () => {
    renderWithProviders(<MessageRow message={fixtures.assistantMessage} />);

    expect(screen.queryByText(/ in · /)).not.toBeInTheDocument();
  });

  it("omits the credit line for a turn that cost nothing", () => {
    renderWithProviders(<MessageRow message={fixtures.failedAssistantMessage} />);

    expect(screen.queryByText(/credits$/)).not.toBeInTheDocument();
  });

  it("renders feedback controls as unavailable rather than wiring them to nothing", async () => {
    renderWithProviders(<MessageRow message={fixtures.assistantMessage} />);

    const like = screen.getByRole("button", { name: "Like" });

    expect(like).toHaveAttribute("aria-disabled", "true");

    await userEvent.hover(like);

    expect(await screen.findByRole("tooltip")).toHaveTextContent(/isn't wired up/i);
  });

  it("falls back to the plain content when a message has no blocks", () => {
    renderWithProviders(
      <MessageRow message={{ ...fixtures.assistantMessage, contentBlocks: null }} />,
    );

    expect(screen.getByText(/I'll generate that for you\./)).toHaveTextContent(
      "Here is your mountain at sunrise.",
    );
  });
});
