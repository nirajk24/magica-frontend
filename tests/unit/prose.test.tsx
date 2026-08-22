import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import type { MessageDTO } from "@/contracts";
import { MessageRow } from "@/components/chat/MessageRow";
import { Markdown } from "@/components/chat/Markdown";
import { renderWithProviders } from "../render";
import * as fixtures from "../msw/fixtures";

const ASSET = fixtures.IMAGE_URL;

describe("prose that repeats an asset url", () => {
  it("drops a bare autolink to something already rendered below", () => {
    renderWithProviders(<Markdown suppressUrls={new Set([ASSET])}>{`Here you go: ${ASSET}`}</Markdown>);

    expect(screen.getByText(/Here you go:/)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("drops a markdown image of the same url", () => {
    renderWithProviders(
      <Markdown suppressUrls={new Set([ASSET])}>{`![a mountain](${ASSET})`}</Markdown>,
    );

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("keeps the words when a link has real text, and only loses the anchor", () => {
    renderWithProviders(
      <Markdown suppressUrls={new Set([ASSET])}>{`[your mountain](${ASSET})`}</Markdown>,
    );

    expect(screen.getByText("your mountain")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("leaves an unrelated link alone", () => {
    renderWithProviders(
      <Markdown suppressUrls={new Set([ASSET])}>{"See [the docs](https://x.test/docs)"}</Markdown>,
    );

    expect(screen.getByRole("link", { name: "the docs" })).toHaveAttribute(
      "href",
      "https://x.test/docs",
    );
  });

  it("shows the asset once when the model writes its url into the answer", () => {
    const message: MessageDTO = {
      ...fixtures.assistantMessage,
      contentBlocks: [
        { segment: 0, type: "text", text: `Here is your mountain: ${ASSET}` },
      ],
    };

    renderWithProviders(<MessageRow message={message} />);

    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Download image" })).toBeInTheDocument();
  });
});
