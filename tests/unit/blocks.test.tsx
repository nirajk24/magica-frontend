import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ContentBlock, MessageDTO, ToolInvocationDTO } from "@/contracts";
import { Block, blockRenderers, cardFor, rendererFor, toolCardRenderers } from "@/components/blocks";
import { ToolCard } from "@/components/blocks/ToolCard";
import { MessageTimeline } from "@/components/chat/MessageTimeline";
import { timelineFromMessage, type ToolView } from "@/lib/timeline";
import { useUI } from "@/stores/ui";
import { renderWithProviders } from "../render";
import * as fixtures from "../msw/fixtures";

const NO_TOOLS = new Map<string, ToolView>();

const toolView = (over: Partial<ToolView> = {}): ToolView => ({
  id: "inv-1",
  toolUseId: fixtures.TOOL_USE_ID,
  toolName: "gpt_image_2",
  subModelId: null,
  display: { label: "Generating image", icon: "image" },
  status: "completed",
  input: { prompt: "a mountain at sunrise", quality: "Low", size: "1024x1024" },
  output: { images: [fixtures.IMAGE_URL] },
  errorMessage: null,
  creditUsed: "5880",
  durationMs: 8_412,
  resultUrls: [],
  resultSummary: null,
  ...over,
});

describe("the block registry", () => {
  it("has a renderer for every type the contract can produce", () => {
    const types: ContentBlock["type"][] = [
      "text",
      "thinking",
      "tool_use",
      "citations",
      "usage",
      "step_update",
    ];

    for (const type of types) expect(blockRenderers[type]).toBeDefined();
  });

  it("renders nothing and does not throw for a type it has never seen", () => {
    const block = { segment: 0, type: "hologram", spin: 3 } as unknown as ContentBlock;

    expect(rendererFor("hologram")).toBe(rendererFor("also-unknown"));
    expect(() => renderWithProviders(<Block block={block} tools={NO_TOOLS} />)).not.toThrow();
  });

  it.each<[string, ContentBlock, string]>([
    ["text", { segment: 0, type: "text", text: "hello there" }, "hello there"],
    [
      "thinking",
      { segment: 0, type: "thinking", thinking: "weighing it up", durationMs: 900 },
      "Reasoned",
    ],
    [
      "usage",
      { segment: 0, type: "usage", inputTokens: 412, outputTokens: 96 },
      "412 in · 96 out",
    ],
    [
      "citations",
      { segment: 0, type: "citations", items: [{ title: "A source", url: "https://x.test/a" }] },
      "A source",
    ],
    [
      "step_update",
      { segment: 0, type: "step_update", stepKey: "charizard_image", status: "in_progress" },
      "Step update — charizard_image: in_progress",
    ],
  ])("renders a %s block", (_type, block, expected) => {
    renderWithProviders(<Block block={block} tools={NO_TOOLS} />);

    expect(screen.getByText(expected)).toBeInTheDocument();
  });
});

describe("the reasoning row", () => {
  it("reads Thinking while the transcript is still arriving, and is open", () => {
    renderWithProviders(
      <Block
        block={{ segment: 0, type: "thinking", thinking: "partial wo" }}
        tools={NO_TOOLS}
        streaming
      />,
    );

    expect(screen.getByRole("button", { expanded: true })).toHaveTextContent("Thinking");
    expect(screen.getByText("partial wo")).toBeVisible();
  });

  it("reads Reasoned once closed, opens with its group, and shows no duration", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Block
        block={{ segment: 0, type: "thinking", thinking: "the whole thought", durationMs: 2_400 }}
        tools={NO_TOOLS}
      />,
    );

    const header = screen.getByRole("button", { expanded: true });

    expect(header).toHaveTextContent("Reasoned");
    expect(header).not.toHaveTextContent("2.4s");
    expect(screen.getByText("the whole thought")).toBeInTheDocument();

    await user.click(header);

    expect(screen.queryByText("the whole thought")).not.toBeInTheDocument();
  });
});

describe("the tool card registry", () => {
  it("maps the three Magica tools and both skill loaders", () => {
    for (const name of ["gpt_image_2", "crop_image", "merge_videos", "get_model_schema", "load_skill", "read_skill_asset"]) {
      expect(toolCardRenderers[name]).toBeDefined();
    }
  });

  it("falls back to the generic card for a tool it has never compiled against", () => {
    expect(cardFor("summon_dragon")).toBe(ToolCard);
  });

  it("renders an unknown tool from the registry's own label and does not throw", () => {
    renderWithProviders(
      <ToolCard tool={toolView({ toolName: "summon_dragon", display: { label: "Summoning", icon: "wyrm" } })} />,
    );

    expect(screen.getByText("Summoning")).toBeInTheDocument();
  });
});

describe("a tool card", () => {
  it("shows duration and the credit chip once completed", () => {
    renderWithProviders(<ToolCard tool={toolView()} />);

    expect(screen.getByText("8.4s")).toBeInTheDocument();
    expect(screen.getByText("0.0059M")).toBeInTheDocument();
  });

  it("charges nothing on a failed call, so no chip appears", () => {
    renderWithProviders(
      <ToolCard tool={toolView({ status: "failed", creditUsed: "0", errorMessage: "Blocked." })} />,
    );

    expect(screen.queryByText("0.00M")).not.toBeInTheDocument();
  });

  it("opens itself on failure and shows the provider's message", () => {
    renderWithProviders(
      <ToolCard
        tool={toolView({
          status: "failed",
          creditUsed: "0",
          errorMessage: "Error: 400 rejected by the safety system.",
        })}
      />,
    );

    expect(screen.getByText("Error: 400 rejected by the safety system.")).toBeInTheDocument();
  });

  it("renders the generated output from a provider-shaped result", async () => {
    renderWithProviders(<ToolCard tool={toolView()} />);

    expect(screen.getByRole("img", { name: "Output of Generating image" })).toHaveAttribute(
      "src",
      fixtures.IMAGE_URL,
    );
  });

  it("labels sanitized input rows in the reference's title case", async () => {
    renderWithProviders(
      <ToolCard tool={toolView({ input: { aspect_ratio: "16:9", image_url: "https://x.test/a.png" } })} />,
    );

    expect(screen.getByText("Aspect Ratio")).toBeInTheDocument();
    expect(screen.getByText("Image")).toBeInTheDocument();
  });

  it("renders a skill load as a one-line row with no expander", () => {
    renderWithProviders(
      <Block
        block={{ segment: 0, type: "tool_use", id: "call_s", name: "load_skill", input: {} }}
        tools={new Map([["call_s", toolView({ toolName: "load_skill", durationMs: 110 })]])}
      />,
    );

    expect(screen.getByText("Skill")).toBeInTheDocument();
    expect(screen.getByText("110ms")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("still renders a card when the invocation has not landed yet", () => {
    renderWithProviders(
      <Block
        block={{ segment: 0, type: "tool_use", id: "call_x", name: "merge_videos", input: {} }}
        tools={NO_TOOLS}
      />,
    );

    expect(screen.getByText("merge_videos")).toBeInTheDocument();
  });
});

describe("step groups", () => {
  it("collapses a finished turn to its header and counts the rows inside", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MessageTimeline timeline={timelineFromMessage(fixtures.assistantMessage)} />);

    const groups = screen.getAllByRole("button", { name: /Completed 1 step/ });

    expect(groups).toHaveLength(2);
    expect(screen.queryByText("Generating image")).not.toBeInTheDocument();

    await user.click(groups[1]!);

    expect(screen.getByText("Generating image")).toBeInTheDocument();
  });

  it("leaves prose outside the group, so it reads even while collapsed", () => {
    renderWithProviders(<MessageTimeline timeline={timelineFromMessage(fixtures.assistantMessage)} />);

    expect(screen.getByText("Here is your mountain at sunrise.")).toBeVisible();
  });

  it("opens a live segment and labels it Working", () => {
    const message: MessageDTO = {
      ...fixtures.assistantMessage,
      toolInvocations: [{ ...(fixtures.toolInvocation as ToolInvocationDTO), status: "running" }],
    };
    const timeline = timelineFromMessage(message);
    timeline.segments[1]!.streaming = true;

    renderWithProviders(<MessageTimeline timeline={timeline} />);

    expect(screen.getByRole("button", { name: /Working · 1 step/ })).toBeInTheDocument();
    expect(screen.getByText("Generating image")).toBeInTheDocument();
  });
});

describe("the timeline's colour hierarchy, sampled from the dark captures", () => {
  const classesOf = (text: string) => screen.getByText(text).className;

  it("mutes the reasoning label and leaves its transcript at full contrast", () => {
    renderWithProviders(
      <Block
        block={{ segment: 0, type: "thinking", thinking: "a thought", durationMs: 900 }}
        tools={NO_TOOLS}
      />,
    );

    expect(classesOf("Reasoned")).toContain("text-fg-muted");
  });

  it("does not mute a tool label", () => {
    renderWithProviders(<ToolCard tool={toolView()} />);

    expect(classesOf("Generating image")).not.toContain("text-fg-muted");
  });

  it("does not mute a duration", () => {
    renderWithProviders(<ToolCard tool={toolView()} />);

    expect(screen.getByText("8.4s").className).not.toContain("text-fg-muted");
  });

  it("drops the trailing newline models leave on reasoning, so the box fits its text", () => {
    renderWithProviders(
      <Block
        block={{ segment: 0, type: "thinking", thinking: "one line\n\n", durationMs: 900 }}
        tools={NO_TOOLS}
        streaming
      />,
    );

    expect(screen.getByText("one line").textContent).toBe("one line");
  });
});

describe("row anatomy measured off the reference", () => {
  it("circles the completed and failed glyphs", () => {
    const { unmount } = renderWithProviders(<ToolCard tool={toolView()} />);

    expect(screen.getByLabelText("Completed")).toHaveClass("lucide-circle-check");
    unmount();

    renderWithProviders(<ToolCard tool={toolView({ status: "failed", creditUsed: "0" })} />);

    expect(screen.getByLabelText("Failed")).toHaveClass("lucide-circle-x");
  });

  it("colours the skill bolt amber and the schema wrench blue, and nothing else", () => {
    renderWithProviders(
      <ToolCard tool={toolView({ display: { label: "Skill", icon: "skill" } })} />,
    );

    expect(document.querySelector(".text-amber")).not.toBeNull();
    expect(document.querySelector(".text-info")).toBeNull();
  });

  it("shows the generated output as a labelled row, after View more", async () => {
    renderWithProviders(
      <ToolCard
        tool={toolView({
          input: { tool: "generate", prompt: "p", size: "Auto", quality: "Low", n: 1, background: "Auto" },
        })}
      />,
    );

    const viewMore = screen.getByRole("button", { name: "View more" });
    const output = screen.getByText("Output");

    expect(viewMore.compareDocumentPosition(output)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("asks for the detail panel from View more rather than expanding the card itself", async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(
      <ToolCard
        tool={toolView({
          id: "inv_hidden",
          input: { a: "1", b: "2", c: "3", d: "4", e: "5", hidden: "6" },
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "View more" }));

    expect(useUI.getState().openPanel).toEqual({ type: "tool", invocationId: "inv_hidden" });
    expect(container).not.toHaveTextContent("Hidden");
  });

  it("names the sub-model that answered, which the input never records", async () => {
    renderWithProviders(
      <Block
        block={{ segment: 0, type: "tool_use", id: "call_m", name: "gpt_image_2", input: { prompt: "p" } }}
        tools={new Map([["call_m", toolView({ subModelId: "gpt-image-2-text" })]])}
      />,
    );

    expect(screen.getByText("Model")).toBeInTheDocument();
    expect(screen.getByText("gpt-image-2-text")).toBeInTheDocument();
  });
});
