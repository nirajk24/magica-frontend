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
  it("offers all three modes", () => {
    renderToggle();

    for (const option of ["light", "dark", "system"]) {
      expect(screen.getByRole("button", { name: option })).toBeInTheDocument();
    }
  });

  it("marks the chosen mode as pressed", async () => {
    renderToggle();

    await userEvent.click(screen.getByRole("button", { name: "dark" }));

    expect(screen.getByRole("button", { name: "dark" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "light" })).toHaveAttribute("aria-pressed", "false");
  });

  it("puts the theme class on the document so every token flips at once", async () => {
    renderToggle();

    await userEvent.click(screen.getByRole("button", { name: "dark" }));

    expect(document.documentElement).toHaveClass("dark");
  });
});
