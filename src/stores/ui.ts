import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  sidebarCollapsed: boolean;
  openPanel: { type: "tool"; invocationId: string } | null;
  stoppingRuns: string[];
  planModeChats: string[];
  toasts: Toast[];
  setDraft: (chatId: string, text: string) => void;
  clearDraft: (chatId: string) => void;
  togglePlanMode: (chatId: string) => void;
  toggleSidebar: () => void;
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
 */
export const useUI = create<UIState>()(
  persist(
    (set) => ({
      drafts: {},
      sidebarCollapsed: false,
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

      togglePlanMode: (chatId) =>
        set((s) => ({
          planModeChats: s.planModeChats.includes(chatId)
            ? s.planModeChats.filter((id) => id !== chatId)
            : [...s.planModeChats, chatId],
        })),

      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
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
