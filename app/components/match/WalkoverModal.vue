<script setup lang="ts">
import type { Fixture } from "~/types";

const open = defineModel<boolean>("open", { default: false });
const score = defineModel<number>("score", { default: 3 });

const props = defineProps<{
  fixture: Fixture | null;
  loading: boolean;
}>();

const emit = defineEmits<{
  confirm: [winner: "home" | "away"];
}>();

const homeName = computed(() => {
  return (
    props.fixture?.homeTeam?.customShortName ||
    props.fixture?.homeTeam?.customName ||
    "Home"
  );
});

const awayName = computed(() => {
  return (
    props.fixture?.awayTeam?.customShortName ||
    props.fixture?.awayTeam?.customName ||
    "Away"
  );
});
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-flag" class="w-5 h-5 text-error-500" />
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                Record Walkover
              </h3>
            </div>
            <UButton
              icon="i-heroicons-x-mark"
              variant="ghost"
              color="neutral"
              size="sm"
              @click="open = false;"
            />
          </div>
        </template>

        <div class="space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Select the team that wins by walkover. This will end the match and
            set the score to <span class="font-semibold">3-0</span> by default.
          </p>

          <UFormField label="Walkover score">
            <UInput
              v-model.number="score"
              type="number"
              :min="1"
              :max="99"
              icon="i-heroicons-trophy"
            />
          </UFormField>

          <div class="grid grid-cols-2 gap-3">
            <UButton
              color="primary"
              variant="soft"
              :label="`Home Walkover (${homeName})`"
              :loading="loading"
              @click="emit('confirm', 'home')"
            />
            <UButton
              color="warning"
              variant="soft"
              :label="`Away Walkover (${awayName})`"
              :loading="loading"
              @click="emit('confirm', 'away')"
            />
          </div>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
