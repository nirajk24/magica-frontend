import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "next-themes";
import { ThemeToggle } from "@/components/ThemeToggle";

const renderToggle = () =>
  render(
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ThemeToggle />
    </ThemeProvider>,
  );

describe("ThemeToggle", () => {
  it("offers all three modes as named icon controls", () => {
    renderToggle();

    for (const option of ["System theme", "Light theme", "Dark theme"]) {
      expect(screen.getByRole("button", { name: option })).toBeInTheDocument();
    }
  });

  it("marks the chosen mode as pressed", async () => {
    renderToggle();

    await userEvent.click(screen.getByRole("button", { name: "Dark theme" }));

    expect(screen.getByRole("button", { name: "Dark theme" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Light theme" })).toHaveAttribute("aria-pressed", "false");
  });

  it("puts the theme class on the document so every token flips at once", async () => {
    renderToggle();

    await userEvent.click(screen.getByRole("button", { name: "Dark theme" }));

    expect(document.documentElement).toHaveClass("dark");
  });
});
