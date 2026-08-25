import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { ChatScreen } from "@/components/chat/ChatScreen";
import { env } from "@/lib/env";
import { NEW_CHAT_ID } from "@/queries/use-chat";
import * as fixtures from "../msw/fixtures";
import { server } from "../msw/setup";
import { renderWithProviders } from "../render";

const API = `${env.NEXT_PUBLIC_API_URL}/api/v1`;

describe("the first send on a new chat", () => {
  it("keeps the message on screen while the hop to the created chat is in flight", async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${API}/chats/:chatId/messages`, () =>
        HttpResponse.json({ data: fixtures.sendMessageResult }),
      ),
    );
    renderWithProviders(<ChatScreen chatId={NEW_CHAT_ID} />);

    await user.type(await screen.findByLabelText("Message"), "draw me a poster{Enter}");

    await vi.waitFor(() =>
      expect(window.location.pathname).toBe(`/chat/${fixtures.sendMessageResult.chatId}`),
    );

    expect(await screen.findByText(fixtures.userMessage.content)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Your AI worker" })).not.toBeInTheDocument();
  });
});
