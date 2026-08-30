import type { InjectionKey } from "vue";

type ButtonColor =
  | "info"
  | "error"
  | "success"
  | "primary"
  | "secondary"
  | "warning"
  | "neutral";

export function useConfirmModal() {
  const showConfirmModal = ref(false);
  const confirmModalTitle = ref("");
  const confirmModalMessage = ref("");
  const confirmModalConfirmLabel = ref("");
  const confirmModalConfirmColor = ref<ButtonColor>("error");
  const confirmModalOnConfirm = ref<() => Promise<void>>(async () => {});

  const openConfirmModal = (options: {
    title: string;
    message: string;
    confirmLabel: string;
    confirmColor?: ButtonColor;
    onConfirm: () => Promise<void>;
  }) => {
    confirmModalTitle.value = options.title;
    confirmModalMessage.value = options.message;
    confirmModalConfirmLabel.value = options.confirmLabel;
    confirmModalConfirmColor.value = options.confirmColor || "error";
    confirmModalOnConfirm.value = options.onConfirm;
    showConfirmModal.value = true;
  };

  const handleConfirmModal = async () => {
    await confirmModalOnConfirm.value();
    showConfirmModal.value = false;
  };

  return {
    showConfirmModal,
    confirmModalTitle,
    confirmModalMessage,
    confirmModalConfirmLabel,
    confirmModalConfirmColor,
    openConfirmModal,
    handleConfirmModal,
  };
}

export type ConfirmModalApi = ReturnType<typeof useConfirmModal>;

export const ConfirmModalKey: InjectionKey<ConfirmModalApi> =
  Symbol("match-confirm-modal");
