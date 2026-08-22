import { describe, expect, it } from "vitest";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConnectionPill } from "@/components/chat/ConnectionPill";
import { MessageList } from "@/components/chat/MessageList";
import { useUI } from "@/stores/ui";
import { emitAtBottom, scrollToIndex } from "../virtuoso-mock";
import { renderWithProviders } from "../render";
import * as fixtures from "../msw/fixtures";

describe("the connection pill", () => {
  it("says nothing while the stream is healthy", () => {
    const { container } = renderWithProviders(<ConnectionPill connection="live" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("says it is reconnecting during the bounded retries", () => {
    renderWithProviders(<ConnectionPill connection="reconnecting" />);

    expect(screen.getByRole("status")).toHaveTextContent("Reconnecting");
  });

  it("says live updates are gone once it has fallen back to polling", () => {
    renderWithProviders(<ConnectionPill connection="polling" />);

    expect(screen.getByRole("status")).toHaveTextContent(/Live updates unavailable/);
  });
});

const items = [{ kind: "message", message: fixtures.userMessage }] as const;

describe("the jump-to-latest button", () => {
  it("stays hidden while the transcript is already at the bottom", () => {
    renderWithProviders(<MessageList items={items} />);

    act(() => emitAtBottom(true));

    expect(screen.queryByRole("button", { name: "Scroll to latest" })).not.toBeInTheDocument();
  });

  it("appears once the transcript is scrolled up", () => {
    renderWithProviders(<MessageList items={items} />);

    act(() => emitAtBottom(false));

    expect(screen.getByRole("button", { name: "Scroll to latest" })).toBeInTheDocument();
  });

  it("scrolls to the last row when clicked", async () => {
    const user = userEvent.setup();
    scrollToIndex.mockClear();

    renderWithProviders(<MessageList items={items} />);

    act(() => emitAtBottom(false));
    await user.click(screen.getByRole("button", { name: "Scroll to latest" }));

    expect(scrollToIndex).toHaveBeenCalledWith(
      expect.objectContaining({ index: items.length - 1, align: "end" }),
    );
  });
});

describe("the error toast", () => {
  it("renders nothing until something fails", () => {
    renderWithProviders(<div />);

    expect(screen.queryByRole("button", { name: "Dismiss" })).not.toBeInTheDocument();
  });

  it("carries the message and the trace id a bug report needs", () => {
    renderWithProviders(<div />);

    act(() =>
      useUI.getState().pushToast({ text: "That run couldn't be stopped.", traceId: "req_9" }),
    );

    expect(screen.getByText("That run couldn't be stopped.")).toBeInTheDocument();
    expect(screen.getByText("req_9")).toBeInTheDocument();
  });

  it("waits to be dismissed rather than vanishing on a timer", async () => {
    const user = userEvent.setup();
    renderWithProviders(<div />);

    act(() => useUI.getState().pushToast({ text: "Nope.", traceId: null }));

    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(screen.queryByText("Nope.")).not.toBeInTheDocument();
  });

  it("keeps only the most recent failures rather than stacking without limit", () => {
    renderWithProviders(<div />);

    act(() => {
      for (const text of ["one", "two", "three", "four"]) {
        useUI.getState().pushToast({ text, traceId: null });
      }
    });

    expect(screen.queryByText("one")).not.toBeInTheDocument();
    expect(screen.getByText("four")).toBeInTheDocument();
  });
});
