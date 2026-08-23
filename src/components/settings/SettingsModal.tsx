"use client";

import {
  BookOpen,
  Bot,
  Brain,
  CreditCard,
  Keyboard,
  KeyRound,
  type LucideIcon,
  Plug,
  Settings2,
  SlidersHorizontal,
  User,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import { ApiKeysSection } from "@/components/settings/ApiKeysSection";

/** The query parameter that addresses the modal, so a section is linkable and survives a reload. */
export const SETTINGS_PARAM = "settings";

type Section = {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Absent means the section is not implemented and the row explains itself. */
  reason?: string;
};

/**
 * The rail, in the reference's order. Only API Keys is implemented; the rest are listed because
 * removing them would misrepresent the product, and each says why it does nothing.
 */
const SECTIONS: Section[] = [
  { id: "account", label: "Account", icon: User, reason: "Account settings aren't part of this build." },
  { id: "general", label: "General", icon: Settings2, reason: "General settings aren't part of this build." },
  { id: "billing", label: "Billing", icon: CreditCard, reason: "Credits are topped up from the sidebar in this build." },
  { id: "preferences", label: "Preferences", icon: SlidersHorizontal, reason: "Preferences aren't part of this build." },
  { id: "personalization", label: "Personalization", icon: Bot, reason: "Personalization isn't part of this build." },
  { id: "memory", label: "Memory", icon: Brain, reason: "Memory isn't part of this build." },
  { id: "integrations", label: "Integrations", icon: Plug, reason: "Integrations aren't part of this build." },
  { id: "api-keys", label: "API Keys", icon: KeyRound },
  { id: "resources", label: "Resources", icon: BookOpen, reason: "Resources aren't part of this build." },
  { id: "shortcuts", label: "Shortcuts", icon: Keyboard, reason: "The shortcut reference isn't part of this build." },
];

const IMPLEMENTED = new Set(SECTIONS.filter((section) => !section.reason).map((s) => s.id));

/**
 * The settings modal, addressed by `?settings=<section>` on whatever route is showing.
 *
 * Reading the section from the URL rather than component state is what makes it linkable, survive a
 * reload, and close with the back button — the same property the rest of the client is built on.
 */
export function SettingsModal() {
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get(SETTINGS_PARAM);
  const section = requested !== null && IMPLEMENTED.has(requested) ? requested : null;

  const close = useCallback(() => {
    const next = new URLSearchParams(params.toString());
    next.delete(SETTINGS_PARAM);
    const query = next.toString();
    router.replace(query === "" ? window.location.pathname : `${window.location.pathname}?${query}`, {
      scroll: false,
    });
  }, [params, router]);

  const select = (id: string) => {
    const next = new URLSearchParams(params.toString());
    next.set(SETTINGS_PARAM, id);
    router.replace(`${window.location.pathname}?${next.toString()}`, { scroll: false });
  };

  return (
    <Dialog open={requested !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent
        title="Settings"
        showTitle={false}
        className="flex h-[calc(100dvh-32px)] w-[980px] max-h-[560px] max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-2xl p-0"
      >
        {/* The rail is a fixed 260px beside a flexible pane, which on a phone leaves the pane about
            a hundred pixels wide. It is dropped below `md` rather than squeezed, and the close
            button it carries is repeated in the pane's own header. */}
        <nav aria-label="Settings sections" className="hidden w-[260px] flex-col gap-1 border-r border-border bg-panel-inset p-3 md:flex">
          <button
            type="button"
            onClick={close}
            aria-label="Close settings"
            className="mb-2 flex size-8 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-surface hover:text-fg"
          >
            <X className="size-4" strokeWidth={2.2} />
          </button>

          {SECTIONS.map((entry) => (
            <SectionRow
              key={entry.id}
              section={entry}
              active={entry.id === section}
              onSelect={() => select(entry.id)}
            />
          ))}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-end p-3 md:hidden">
            <button
              type="button"
              onClick={close}
              aria-label="Close settings"
              className="flex size-8 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-surface hover:text-fg"
            >
              <X className="size-4" strokeWidth={2.2} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
            {section === "api-keys" ? <ApiKeysSection /> : <UnknownSection />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SectionRow({
  section,
  active,
  onSelect,
}: {
  section: Section;
  active: boolean;
  onSelect: () => void;
}) {
  const Icon = section.icon;
  const shared =
    "flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors w-full";

  if (section.reason) {
    return (
      <Tooltip>
        <TooltipTrigger
          type="button"
          aria-disabled
          onClick={(event) => event.preventDefault()}
          className={cn(shared, "cursor-default text-fg-subtle")}
        >
          <Icon className="size-4 shrink-0" strokeWidth={2} />
          {section.label}
        </TooltipTrigger>
        <TooltipContent>{section.reason}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "page" : undefined}
      className={cn(shared, active ? "bg-surface text-fg" : "text-fg-muted hover:bg-surface hover:text-fg")}
    >
      <Icon className="size-4 shrink-0" strokeWidth={2} />
      {section.label}
    </button>
  );
}

/** Reached by typing an unimplemented section into the URL directly. */
function UnknownSection() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
      <p className="text-sm font-semibold text-fg">Not part of this build</p>
      <p className="max-w-[360px] text-sm text-fg-muted">
        API keys are the settings section this build implements.
      </p>
    </div>
  );
}
