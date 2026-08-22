import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatScreen } from "@/components/chat/ChatScreen";
import { env } from "@/lib/env";
import { server } from "../msw/setup";
import { errors } from "../msw/handlers";
import { renderWithProviders } from "../render";
import * as fixtures from "../msw/fixtures";

const CHATS = `${env.NEXT_PUBLIC_API_URL}/api/v1/chats`;

describe("ChatScreen", () => {
  it("renders the persisted conversation from REST", async () => {
    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    expect(await screen.findByText(fixtures.userMessage.content)).toBeInTheDocument();
    expect(screen.getByText("Here is your mountain at sunrise.")).toBeInTheDocument();
  });

  it("shows a spinner while the first page is in flight", () => {
    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
  });

  it("explains a chat that is not yours without leaking that it exists", async () => {
    renderWithProviders(<ChatScreen chatId="01999f00-0000-7000-8000-00000000dead" />);

    expect(await screen.findByText(/isn't yours/i)).toBeInTheDocument();
  });

  it("surfaces the traceId on an unexpected failure, so a bug report is actionable", async () => {
    server.use(http.get(`${CHATS}/:chatId`, () => errors.internal()));

    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    expect(await screen.findByText("req_fixture")).toBeInTheDocument();
  });

  it("never requests a chat that does not exist yet", async () => {
    renderWithProviders(<ChatScreen chatId="new" />);

    await waitFor(() => {
      expect(screen.queryByRole("status", { name: "Loading" })).not.toBeInTheDocument();
    });
    expect(screen.queryByText(/couldn't be loaded/i)).not.toBeInTheDocument();
  });

  it("walks backwards through history one cursor at a time", async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${CHATS}/:chatId`, ({ request }) => {
        const cursor = new URL(request.url).searchParams.get("messagesCursor");

        return HttpResponse.json({
          data: cursor
            ? { ...fixtures.chatWithMessages, messages: [fixtures.userMessageWithAttachment] }
            : { ...fixtures.chatWithMessages, messagesNextCursor: "older" },
        });
      }),
    );

    renderWithProviders(<ChatScreen chatId={fixtures.CHAT_ID} />);

    await user.click(await screen.findByRole("button", { name: "Load older messages" }));

    expect(
      await screen.findByText(fixtures.userMessageWithAttachment.content),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load older messages" })).not.toBeInTheDocument();
  });
});
