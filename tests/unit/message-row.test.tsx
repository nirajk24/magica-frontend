import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessageRow } from "@/components/chat/MessageRow";
import { env } from "@/lib/env";
import { server } from "../msw/setup";
import { renderWithProviders } from "../render";
import * as fixtures from "../msw/fixtures";

describe("MessageRow — user", () => {
  it("renders the prompt text", () => {
    renderWithProviders(<MessageRow chatId={fixtures.CHAT_ID} message={fixtures.userMessage} />);

    expect(screen.getByText(fixtures.userMessage.content)).toBeInTheDocument();
  });

  it("renders an attachment above the bubble text", () => {
    renderWithProviders(<MessageRow chatId={fixtures.CHAT_ID} message={fixtures.userMessageWithAttachment} />);

    const image = screen.getByRole("img", { name: fixtures.attachment.name });

    expect(image).toHaveAttribute("src", fixtures.attachment.url);
    expect(
      image.compareDocumentPosition(screen.getByText(fixtures.userMessageWithAttachment.content)),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("offers a copy affordance carrying the prompt", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MessageRow chatId={fixtures.CHAT_ID} message={fixtures.userMessage} />);

    await user.click(screen.getByRole("button", { name: "Copy" }));

    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
    await expect(window.navigator.clipboard.readText()).resolves.toBe(
      fixtures.userMessage.content,
    );
  });
});

describe("MessageRow — assistant", () => {
  it("renders the prose from the content blocks", () => {
    renderWithProviders(<MessageRow chatId={fixtures.CHAT_ID} message={fixtures.assistantMessage} />);

    expect(screen.getByText("I'll generate that for you.")).toBeInTheDocument();
    expect(screen.getByText("Here is your mountain at sunrise.")).toBeInTheDocument();
  });

  it("renders the generated asset with a download affordance", () => {
    renderWithProviders(<MessageRow chatId={fixtures.CHAT_ID} message={fixtures.assistantMessage} />);

    expect(screen.getByRole("link", { name: "Download image" })).toHaveAttribute(
      "href",
      fixtures.IMAGE_URL,
    );
  });

  it("shows the turn's credit total", () => {
    renderWithProviders(<MessageRow chatId={fixtures.CHAT_ID} message={fixtures.assistantMessage} />);

    expect(screen.getByText(/0\.0059M credits/)).toBeInTheDocument();
  });

  it("reports no token counts, which the reference shows nowhere", () => {
    renderWithProviders(<MessageRow chatId={fixtures.CHAT_ID} message={fixtures.assistantMessage} />);

    expect(screen.queryByText(/ in · /)).not.toBeInTheDocument();
  });

  it("omits the credit line for a turn that cost nothing", () => {
    renderWithProviders(<MessageRow chatId={fixtures.CHAT_ID} message={fixtures.failedAssistantMessage} />);

    expect(screen.queryByText(/credits$/)).not.toBeInTheDocument();
  });

  it("sends a like to the server and fills the thumb", async () => {
    let sent: { type?: string | null } | null = null;
    server.use(
      http.patch(`${env.NEXT_PUBLIC_API_URL}/api/v1/messages/:messageId/feedback`, async ({ request }) => {
        sent = (await request.json()) as { type?: string | null };
        return HttpResponse.json({ data: { ok: true } });
      }),
    );

    renderWithProviders(<MessageRow chatId={fixtures.CHAT_ID} message={fixtures.assistantMessage} />);

    await userEvent.click(screen.getByRole("button", { name: "Like" }));

    await waitFor(() => expect(sent).toEqual({ type: "like" }));
  });

  it("clears a verdict by pressing the active thumb again", async () => {
    let sent: { type?: string | null } | null = null;
    server.use(
      http.patch(`${env.NEXT_PUBLIC_API_URL}/api/v1/messages/:messageId/feedback`, async ({ request }) => {
        sent = (await request.json()) as { type?: string | null };
        return HttpResponse.json({ data: { ok: true } });
      }),
    );

    renderWithProviders(
      <MessageRow
        chatId={fixtures.CHAT_ID}
        message={{ ...fixtures.assistantMessage, feedback: "like" }}
      />,
    );

    const like = screen.getByRole("button", { name: "Like" });

    expect(like).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(like);

    await waitFor(() => expect(sent).toEqual({ type: null }));
  });

  it("falls back to the plain content when a message has no blocks", () => {
    renderWithProviders(
      <MessageRow chatId={fixtures.CHAT_ID} message={{ ...fixtures.assistantMessage, contentBlocks: null }} />,
    );

    expect(screen.getByText(/I'll generate that for you\./)).toHaveTextContent(
      "Here is your mountain at sunrise.",
    );
  });
});
