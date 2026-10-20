<script setup lang="ts">
import { z } from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

const open = defineModel<boolean>("open", { default: false });

const route = useRoute();
const tournamentStore = useTournamentStore();
const { currentTournament: tournament } = storeToRefs(tournamentStore);
const { handleError } = useErrors();
const toast = useToast();

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

function suggestNextSeasonName(currentName?: string | null): string {
  if (!currentName) {
    const currentYear = new Date().getFullYear();
    return `${currentYear}/${currentYear + 1}`;
  }

  // Check pattern "2024/2025" or "2024-2025"
  const slashMatch = currentName.match(/^(\d{4})[/-](\d{4})$/);
  if (slashMatch) {
    const startYear = parseInt(slashMatch[1], 10);
    const endYear = parseInt(slashMatch[2], 10);
    const diff = endYear - startYear;
    return `${endYear}/${endYear + diff}`;
  }

  // Check pattern "2024"
  const singleYearMatch = currentName.match(/^(\d{4})$/);
  if (singleYearMatch) {
    const year = parseInt(singleYearMatch[1], 10);
    return `${year + 1}`;
  }

  // Check pattern "Season 2" or "Edition 3"
  const seasonNumMatch = currentName.match(/^(.*?)(\d+)$/);
  if (seasonNumMatch) {
    const prefix = seasonNumMatch[1];
    const num = parseInt(seasonNumMatch[2], 10);
    return `${prefix}${num + 1}`;
  }

  const currentYear = new Date().getFullYear();
  return `${currentYear}/${currentYear + 1}`;
}

watch(open, (isOpen) => {
  if (isOpen) {
    if (!seasonState.seasonName) {
      seasonState.seasonName = suggestNextSeasonName(
        tournament.value?.seasonName || tournament.value?.name,
      );
    }
    if (!seasonState.start_date) {
      const now = new Date();
      now.setDate(now.getDate() + 7);
      seasonState.start_date = now.toISOString().slice(0, 16);
    }
    if (!seasonState.end_date) {
      const end = new Date();
      end.setMonth(end.getMonth() + 3);
      seasonState.end_date = end.toISOString().slice(0, 16);
    }
  }
});

const handleStartSeason = async (event: FormSubmitEvent<any>) => {
  startingSeason.value = true;
  try {
    const res = await tournamentStore.startSeason(
      tournament.value?.id || tournamentId.value,
      event.data,
    );
    toast.add({
      title: "New season started successfully",
      description: "Followers have been carried over to this new edition.",
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
              name="i-heroicons-arrow-path-rounded-square"
              class="w-5 h-5 text-indigo-500"
            />
            <span class="font-semibold text-gray-900 dark:text-white">Start New Season</span>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
            This will create a new season edition copying rules, branding, and tournament configuration. Teams and fixtures will start fresh.
          </p>
        </template>

        <div class="p-3 mb-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-700 dark:text-indigo-300 flex items-start gap-2.5">
          <UIcon name="i-heroicons-sparkles" class="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
          <div>
            <p class="font-medium text-indigo-900 dark:text-indigo-200">Perpetual Competition Series</p>
            <p class="mt-0.5 text-indigo-700/80 dark:text-indigo-300/80">
              All followers and fans of this competition will automatically remain subscribed and receive updates when this new season begins.
            </p>
          </div>
        </div>

        <UForm
          :schema="seasonSchema"
          :state="seasonState"
          @submit="handleStartSeason"
          class="space-y-4"
        >
          <UFormField label="Season Name" name="seasonName" required>
            <UInput
              v-model="seasonState.seasonName"
              placeholder="e.g. 2025/2026 or Season 2"
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
