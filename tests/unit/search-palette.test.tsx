import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchPalette } from "@/components/shell/SearchPalette";
import { Sidebar } from "@/components/shell/Sidebar";
import { env } from "@/lib/env";
import { routerMock } from "../router-mock";
import { server } from "../msw/setup";
import { renderWithProviders } from "../render";
import * as fixtures from "../msw/fixtures";

const CHATS = `${env.NEXT_PUBLIC_API_URL}/api/v1/chats`;

const secondChat = { ...fixtures.chat, id: "chat-2", title: "Designing a Swiss poster" };

/** Two rows, so arrowing between them is a real move rather than a no-op on a single result. */
function twoChats() {
  return http.get(CHATS, () =>
    HttpResponse.json({ data: { chats: [fixtures.chat, secondChat], nextCursor: null } }),
  );
}

async function openPalette() {
  const user = userEvent.setup();
  renderWithProviders(
    <>
      <Sidebar />
      <SearchPalette />
    </>,
  );

  await user.click(screen.getByRole("button", { name: "Search" }));

  return user;
}

describe("the search palette", () => {
  it("opens from the sidebar's magnifier, which no longer refers people elsewhere", async () => {
    await openPalette();

    expect(await screen.findByRole("combobox", { name: "Search tasks" })).toBeInTheDocument();
  });

  it("opens from anywhere with the shortcut, not only from the control", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchPalette />);

    await user.keyboard("{Meta>}k{/Meta}");

    expect(await screen.findByRole("combobox", { name: "Search tasks" })).toBeInTheDocument();
  });

  it("closes on escape", async () => {
    const user = await openPalette();
    await screen.findByRole("combobox", { name: "Search tasks" });

    await user.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.queryByRole("combobox", { name: "Search tasks" })).not.toBeInTheDocument(),
    );
  });

  it("asks the server to search, because message content is not on this side", async () => {
    let asked: string | null = null;
    server.use(
      http.get(CHATS, ({ request }) => {
        asked = new URL(request.url).searchParams.get("search");
        return HttpResponse.json({ data: { chats: [], nextCursor: null } });
      }),
    );

    const user = await openPalette();
    await user.type(await screen.findByRole("combobox", { name: "Search tasks" }), "poster");

    await waitFor(() => expect(asked).toBe("poster"));
  });

  it("says a search found nothing, rather than showing an empty panel", async () => {
    server.use(http.get(CHATS, () => HttpResponse.json({ data: { chats: [], nextCursor: null } })));

    const user = await openPalette();
    await user.type(await screen.findByRole("combobox", { name: "Search tasks" }), "poster");

    expect(await screen.findByText(/no tasks match that search/i)).toBeInTheDocument();
  });
});

describe("keyboard navigation", () => {
  it("focuses the first result, so enter always has a target", async () => {
    server.use(twoChats());
    await openPalette();

    const rows = await screen.findAllByRole("option");

    expect(rows[0]).toHaveAttribute("aria-selected", "true");
    expect(rows[1]).toHaveAttribute("aria-selected", "false");
  });

  it("moves the focused row with the arrow keys", async () => {
    server.use(twoChats());
    const user = await openPalette();
    await screen.findAllByRole("option");

    await user.keyboard("{ArrowDown}");

    expect((await screen.findAllByRole("option"))[1]).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{ArrowUp}");

    expect((await screen.findAllByRole("option"))[0]).toHaveAttribute("aria-selected", "true");
  });

  it("stops at the ends rather than wrapping past them", async () => {
    server.use(twoChats());
    const user = await openPalette();
    await screen.findAllByRole("option");

    await user.keyboard("{ArrowUp}{ArrowUp}");

    expect((await screen.findAllByRole("option"))[0]).toHaveAttribute("aria-selected", "true");
  });

  it("opens the focused task on enter", async () => {
    server.use(twoChats());
    const user = await openPalette();
    await screen.findAllByRole("option");

    await user.keyboard("{ArrowDown}{Enter}");

    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith(`/chat/${secondChat.id}`));
  });

  it("starts a task on the chord the footer advertises", async () => {
    const user = await openPalette();
    await screen.findByRole("combobox", { name: "Search tasks" });

    await user.keyboard("{Meta>}{Shift>}o{/Shift}{/Meta}");

    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith("/chat"));
  });
});
