import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { env } from "@/lib/env";
import { useChatTranscript } from "@/queries/use-chat";
import { server } from "../msw/setup";
import * as fixtures from "../msw/fixtures";

const API = `${env.NEXT_PUBLIC_API_URL}/api/v1`;

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("message history paging", () => {
  it("walks backwards one cursor at a time and keeps the order chronological", async () => {
    server.use(
      http.get(`${API}/chats/:chatId`, ({ request }) => {
        const cursor = new URL(request.url).searchParams.get("messagesCursor");

        return HttpResponse.json({
          data: cursor
            ? { ...fixtures.chatWithMessages, messages: [fixtures.userMessageWithAttachment] }
            : {
                ...fixtures.chatWithMessages,
                messages: [fixtures.userMessage, fixtures.assistantMessage],
                messagesNextCursor: "older",
              },
        });
      }),
    );

    const { result } = renderHook(() => useChatTranscript(fixtures.CHAT_ID), { wrapper });

    await waitFor(() => expect(result.current.messages).toHaveLength(2));
    expect(result.current.query.hasNextPage).toBe(true);

    await result.current.query.fetchNextPage();

    await waitFor(() => expect(result.current.messages).toHaveLength(3));
    expect(result.current.messages.map((message) => message.id)).toEqual([
      fixtures.userMessageWithAttachment.id,
      fixtures.USER_MESSAGE_ID,
      fixtures.ASSISTANT_MESSAGE_ID,
    ]);
    expect(result.current.query.hasNextPage).toBe(false);
  });

  it("never requests history for a chat that does not exist yet", async () => {
    server.use(
      http.get(`${API}/chats/:chatId`, () => {
        throw new Error("a chat with no id must not be fetched");
      }),
    );

    const { result } = renderHook(() => useChatTranscript("new"), { wrapper });

    await waitFor(() => expect(result.current.query.isPending).toBe(true));
    expect(result.current.messages).toEqual([]);
  });
});
