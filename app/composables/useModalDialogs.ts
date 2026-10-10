import type { InjectionKey } from "vue";

export interface ConfirmModalOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  color?: "primary" | "error" | "warning";
  onConfirm: () => Promise<void> | void;
}

export interface PromptModalOptions {
  title: string;
  label: string;
  initialValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (value: string) => Promise<void> | void;
}

/**
 * Shared confirmation/prompt dialog state for the tournament dashboard.
 * The page provides the API via ModalDialogsKey; any descendant component
 * (tabs, cards, modals) can inject it to open the dialogs, and the
 * TournamentConfirmDialog / TournamentPromptDialog components render them.
 */
export function useModalDialogs() {
  // Shared Confirmation Modal State
  const confirmModalState = reactive({
    isOpen: false,
    title: "",
    description: "",
    confirmLabel: "Confirm",
    cancelLabel: "Cancel",
    color: "primary" as "primary" | "error" | "warning",
    onConfirm: async () => {},
    loading: false,
  });

  const openConfirmModal = (options: ConfirmModalOptions) => {
    confirmModalState.title = options.title;
    confirmModalState.description = options.description;
    confirmModalState.confirmLabel = options.confirmLabel || "Confirm";
    confirmModalState.cancelLabel = options.cancelLabel || "Cancel";
    confirmModalState.color = options.color || "primary";
    confirmModalState.onConfirm = async () => {
      confirmModalState.loading = true;
      try {
        await options.onConfirm();
      } finally {
        confirmModalState.loading = false;
        confirmModalState.isOpen = false;
      }
    };
    confirmModalState.isOpen = true;
  };

  // Shared Prompt Modal State
  const promptModalState = reactive({
    isOpen: false,
    title: "",
    label: "",
    value: "",
    confirmLabel: "OK",
    cancelLabel: "Cancel",
    onConfirm: async (val: string) => {},
    loading: false,
  });

  const openPromptModal = (options: PromptModalOptions) => {
    promptModalState.title = options.title;
    promptModalState.label = options.label;
    promptModalState.value = options.initialValue || "";
    promptModalState.confirmLabel = options.confirmLabel || "OK";
    promptModalState.cancelLabel = options.cancelLabel || "Cancel";
    promptModalState.onConfirm = async (val: string) => {
      promptModalState.loading = true;
      try {
        await options.onConfirm(val);
      } finally {
        promptModalState.loading = false;
        promptModalState.isOpen = false;
      }
    };
    promptModalState.isOpen = true;
  };

  return {
    confirmModalState,
    openConfirmModal,
    promptModalState,
    openPromptModal,
  };
}

export type ModalDialogsApi = ReturnType<typeof useModalDialogs>;

export const ModalDialogsKey: InjectionKey<ModalDialogsApi> =
  Symbol("modal-dialogs");
