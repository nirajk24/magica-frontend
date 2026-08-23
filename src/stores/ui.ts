import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ModelId } from "@/contracts";

/**
 * An action that failed loudly enough to interrupt. `traceId` is the backend's, and it is rendered
 * so a report can be tied to a server log rather than described from memory.
 */
export type Toast = { id: string; text: string; traceId: string | null };

let toastSequence = 0;

/** Older toasts fall off rather than stacking without limit; failures arrive in small numbers. */
const MAX_TOASTS = 3;

type UIState = {
  drafts: Record<string, string>;
  modelByChat: Record<string, ModelId>;
  sidebarCollapsed: boolean;
  searchOpen: boolean;
  addCreditsOpen: boolean;
  filesOpen: boolean;
  previewFileKey: string | null;
  openPanel: { type: "tool"; invocationId: string } | null;
  stoppingRuns: string[];
  planModeChats: string[];
  toasts: Toast[];
  setDraft: (chatId: string, text: string) => void;
  clearDraft: (chatId: string) => void;
  setModel: (chatId: string, modelId: ModelId) => void;
  togglePlanMode: (chatId: string) => void;
  toggleSidebar: () => void;
  setSearchOpen: (open: boolean) => void;
  setAddCreditsOpen: (open: boolean) => void;
  setFilesOpen: (open: boolean) => void;
  setPreviewFile: (key: string | null) => void;
  setOpenPanel: (panel: UIState["openPanel"]) => void;
  markStopping: (runId: string) => void;
  clearStopping: (runId: string) => void;
  pushToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
};

/**
 * Browser-only state. Anything the server knows belongs in TanStack Query — a message list here
 * would go stale and never refetch.
 *
 * INVARIANT: `partialize` must list only the fields that should survive a reload. Without it, an
 * open tool panel, a stale "stopping" run or a plan-mode toggle meant for one send is restored from
 * localStorage.
 *
 * `modelByChat` is a choice the next send has not carried yet, so it is deliberately not persisted:
 * the server records the model on the chat as each send goes through, and a restored local override
 * would outrank that and quietly contradict what the chat is actually configured with.
 */
export const useUI = create<UIState>()(
  persist(
    (set) => ({
      drafts: {},
      modelByChat: {},
      sidebarCollapsed: false,
      searchOpen: false,
      addCreditsOpen: false,
      filesOpen: false,
      previewFileKey: null,
      openPanel: null,
      stoppingRuns: [],
      planModeChats: [],
      toasts: [],

      setDraft: (chatId, text) =>
        set((s) => ({ drafts: { ...s.drafts, [chatId]: text } })),

      clearDraft: (chatId) =>
        set((s) => {
          const drafts = { ...s.drafts };
          delete drafts[chatId];
          return { drafts };
        }),

      setModel: (chatId, modelId) =>
        set((s) => ({ modelByChat: { ...s.modelByChat, [chatId]: modelId } })),

      togglePlanMode: (chatId) =>
        set((s) => ({
          planModeChats: s.planModeChats.includes(chatId)
            ? s.planModeChats.filter((id) => id !== chatId)
            : [...s.planModeChats, chatId],
        })),

      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSearchOpen: (searchOpen) => set({ searchOpen }),
      setAddCreditsOpen: (addCreditsOpen) => set({ addCreditsOpen }),
      setFilesOpen: (filesOpen) => set({ filesOpen }),
      setPreviewFile: (previewFileKey) => set({ previewFileKey }),
      setOpenPanel: (openPanel) => set({ openPanel }),

      markStopping: (runId) =>
        set((s) => ({
          stoppingRuns: s.stoppingRuns.includes(runId)
            ? s.stoppingRuns
            : [...s.stoppingRuns, runId],
        })),

      clearStopping: (runId) =>
        set((s) => ({ stoppingRuns: s.stoppingRuns.filter((id) => id !== runId) })),

      pushToast: (toast) =>
        set((s) => ({
          toasts: [...s.toasts, { ...toast, id: `toast-${(toastSequence += 1)}` }].slice(
            -MAX_TOASTS,
          ),
        })),

      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: "magica-ui",
      partialize: (s) => ({ drafts: s.drafts, sidebarCollapsed: s.sidebarCollapsed }),
    },
  ),
);
