import { describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { FadeImage } from "@/components/FadeImage";
import { renderWithProviders } from "../render";

/**
 * Generated media is the most-watched thing on screen, and the flash from nothing to full is the
 * most noticeable abruptness in the product.
 */
describe("FadeImage", () => {
  it("stays hidden until the image has decoded", () => {
    renderWithProviders(<FadeImage src="https://example.com/a.png" alt="poster" />);

    expect(screen.getByAltText("poster")).toHaveClass("opacity-0");
  });

  it("reveals on load", () => {
    renderWithProviders(<FadeImage src="https://example.com/a.png" alt="poster" />);

    fireEvent.load(screen.getByAltText("poster"));

    expect(screen.getByAltText("poster")).toHaveClass("opacity-100");
  });

  /** A failed image must show its broken state, not stay invisible and read as still loading. */
  it("reveals on error too", () => {
    renderWithProviders(<FadeImage src="https://example.com/missing.png" alt="poster" />);

    fireEvent.error(screen.getByAltText("poster"));

    expect(screen.getByAltText("poster")).toHaveClass("opacity-100");
  });
});
