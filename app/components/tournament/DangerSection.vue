<script setup lang="ts">
import { ModalDialogsKey } from "~/composables/useModalDialogs";

const route = useRoute();
const tournamentStore = useTournamentStore();
const { currentTournament: tournament } = storeToRefs(tournamentStore);
const { handleError } = useErrors();
const { openConfirmModal } = inject(ModalDialogsKey)!;

const tournamentId = computed(() => route.params.id as string);

// Delete Tournament logic
const deletingTournament = ref(false);

const handleDeleteTournament = () => {
  openConfirmModal({
    title: "Delete Tournament",
    description:
      "Are you absolutely sure you want to delete this tournament? This action cannot be undone and all data will be lost.",
    confirmLabel: "Delete Tournament",
    color: "error",
    onConfirm: async () => {
      deletingTournament.value = true;
      try {
        await tournamentStore.deleteTournament(
          tournament.value?.id || tournamentId.value,
        );
        useToast().add({
          title: "Tournament deleted successfully",
          color: "success",
        });
        await navigateTo("/");
      } catch (err: any) {
        handleError(err, { title: "Failed to delete tournament" });
      } finally {
        deletingTournament.value = false;
      }
    },
  });
};
</script>

<template>
  <section
    id="danger"
    class="scroll-mt-28 bg-white dark:bg-gray-900 border border-red-200 dark:border-red-500/25 rounded-2xl overflow-hidden"
  >
    <div
      class="px-4 sm:px-5 py-3.5 border-b border-red-100 dark:border-red-500/10"
    >
      <h2
        class="text-sm font-semibold text-red-600 dark:text-red-400"
      >
        Danger zone
      </h2>
      <p class="text-xs text-gray-500 mt-0.5">
        Irreversible actions — confirm modals required.
      </p>
    </div>
    <div class="p-4 sm:p-5">
      <div
        class="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div>
          <p
            class="text-sm font-medium text-gray-900 dark:text-white"
          >
            Delete tournament
          </p>
          <p class="text-xs text-gray-500 mt-0.5">
            Removes fixtures, standings, and stats
            permanently. There is no going back.
          </p>
        </div>
        <UButton
          type="button"
          color="error"
          variant="soft"
          size="sm"
          icon="i-heroicons-trash"
          label="Delete…"
          :loading="deletingTournament"
          class="shrink-0"
          @click="handleDeleteTournament"
        />
      </div>
    </div>
  </section>
</template>
