<script setup lang="ts">
import { z } from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

const open = defineModel<boolean>("open", { default: false });

const route = useRoute();
const tournamentStore = useTournamentStore();
const { currentTournament: tournament } = storeToRefs(tournamentStore);
const { handleError } = useErrors();

const tournamentId = computed(() => route.params.id as string);

// Start New Season logic
const startingSeason = ref(false);
const seasonState = reactive({
  seasonName: "",
  start_date: "",
  end_date: "",
});
const seasonSchema = z.object({
  seasonName: z.string().min(1, "Season name is required"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
});

const handleStartSeason = async (event: FormSubmitEvent<any>) => {
  startingSeason.value = true;
  try {
    const res = await tournamentStore.startSeason(
      tournament.value?.id || tournamentId.value,
      event.data,
    );
    useToast().add({
      title: "New season started successfully",
      color: "success",
    });
    open.value = false;

    // Redirect to the new tournament season overview
    if (res.data?.id) {
      await navigateTo(`/tournaments/${res.data.id}`);
    }
  } catch (err: any) {
    handleError(err, { title: "Failed to start season" });
  } finally {
    startingSeason.value = false;
  }
};
</script>

<template>
  <!-- Start Season Modal -->
  <UModal v-model:open="open">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon
              name="i-heroicons-document-duplicate"
              class="w-5 h-5 text-indigo-500"
            />
            <span class="font-semibold">Start New Season</span>
          </div>
          <p class="text-sm text-gray-500 mt-2">
            This will create a new tournament copying the rules, format, logo,
            and settings of this tournament. Teams and fixtures will not be
            copied.
          </p>
        </template>

        <UForm
          :schema="seasonSchema"
          :state="seasonState"
          @submit="handleStartSeason"
          class="space-y-4"
        >
          <UFormField label="Season Name" name="seasonName" required>
            <UInput
              v-model="seasonState.seasonName"
              placeholder="e.g. 2024/2025 or Season 3"
            />
          </UFormField>

          <UFormField label="Start Date" name="start_date" required>
            <UInput type="datetime-local" v-model="seasonState.start_date" />
          </UFormField>

          <UFormField label="End Date" name="end_date" required>
            <UInput type="datetime-local" v-model="seasonState.end_date" />
          </UFormField>

          <div class="flex justify-end gap-2 pt-4">
            <UButton
              label="Cancel"
              variant="ghost"
              color="neutral"
              @click="open = false"
            />
            <UButton
              type="submit"
              label="Create Season"
              icon="i-heroicons-arrow-right"
              :loading="startingSeason"
            />
          </div>
        </UForm>
      </UCard>
    </template>
  </UModal>
</template>
