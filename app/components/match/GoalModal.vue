<script setup lang="ts">
import { MatchEventType } from "~/types";
import type { Fixture } from "~/types";

const open = defineModel<boolean>("open", { default: false });
const type = defineModel<MatchEventType>("type", { required: true });
const minute = defineModel<number | null>("minute", { default: null });
const scorerId = defineModel<string | undefined>("scorerId");
const assisterId = defineModel<string | undefined>("assisterId");

const props = defineProps<{
  fixture: Fixture | null;
  team: "home" | "away";
  scorerOptions: Array<{ label: string; value: string }>;
  assisterOptions: Array<{ label: string; value: string; disabled?: boolean }>;
  noPlayers: boolean;
  loading: boolean;
}>();

const emit = defineEmits<{
  confirm: [];
}>();

const teamName = computed(() => {
  return props.team === "home"
    ? props.fixture?.homeTeam?.customShortName ||
        props.fixture?.homeTeam?.customName
    : props.fixture?.awayTeam?.customShortName ||
        props.fixture?.awayTeam?.customName;
});
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-4 min-w-0">
            <div class="flex items-center gap-2 min-w-0">
              <UIcon
                name="i-heroicons-trophy"
                class="w-5 h-5 text-green-500 shrink-0"
              />
              <h3
                class="text-lg font-semibold text-gray-900 dark:text-white shrink-0"
              >
                Record Goal
              </h3>
              <UBadge
                :color="team === 'home' ? 'primary' : 'warning'"
                variant="subtle"
                size="sm"
                class="min-w-0"
              >
                <span class="truncate max-w-[120px] sm:max-w-[200px] block">
                  {{ teamName }}
                </span>
              </UBadge>
            </div>
            <UButton
              icon="i-heroicons-x-mark"
              variant="ghost"
              color="neutral"
              size="sm"
              class="shrink-0"
              @click="open = false;"
            />
          </div>
        </template>

        <div class="space-y-4">
          <!-- Goal Type -->
          <UFormField label="Goal Type">
            <USelect
              v-model="type"
              :items="[
                { label: 'Normal Goal', value: 'GOAL' },
                { label: 'Penalty', value: 'PENALTY' },
                { label: 'Missed Penalty', value: 'MISSED_PENALTY' },
                { label: 'Own Goal', value: 'OWN_GOAL' },
              ]"
              class="w-full"
            />
          </UFormField>

          <!-- Minute -->
          <UFormField label="Minute (optional)">
            <UInput
              v-model.number="minute"
              type="number"
              placeholder="e.g. 45"
              icon="i-heroicons-clock"
              :min="0"
              :max="120"
            />
          </UFormField>

          <!-- Scorer -->
          <UFormField label="Goal Scorer (optional)">
            <USelect
              v-model="scorerId"
              :items="scorerOptions"
              placeholder="Select scorer..."
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <!-- Assister -->
          <UFormField
            v-if="type !== 'OWN_GOAL'"
            label="Assist By (optional)"
          >
            <USelect
              v-model="assisterId"
              :items="assisterOptions"
              placeholder="Select assister..."
              value-key="value"
              :disabled="!scorerId"
              class="w-full"
            />
          </UFormField>

          <p v-if="noPlayers" class="text-sm text-gray-500">
            No players registered for this team. You can still record the goal
            without player details.
          </p>

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-2">
            <UButton
              label="Cancel"
              variant="ghost"
              color="neutral"
              @click="open = false;"
            />
            <UButton
              label="Record Goal"
              icon="i-heroicons-check"
              color="success"
              :loading="loading"
              @click="emit('confirm')"
            />
          </div>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
