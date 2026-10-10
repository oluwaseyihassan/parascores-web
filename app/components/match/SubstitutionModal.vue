<script setup lang="ts">
import type { Fixture } from "~/types";

const open = defineModel<boolean>("open", { default: false });
const minute = defineModel<number | null>("minute", { default: null });
const playerOutId = defineModel<string | undefined>("playerOutId");
const playerInId = defineModel<string | undefined>("playerInId");

const props = defineProps<{
  fixture: Fixture | null;
  team: "home" | "away";
  outOptions: Array<{ label: string; value: string }>;
  inOptions: Array<{ label: string; value: string }>;
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
                name="i-heroicons-arrow-path"
                class="w-5 h-5 text-purple-500 shrink-0"
              />
              <h3
                class="text-lg font-semibold text-gray-900 dark:text-white shrink-0"
              >
                Record Substitution
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

          <!-- Player Out -->
          <UFormField label="Player Out (Leaving)">
            <USelect
              v-model="playerOutId"
              :items="outOptions"
              placeholder="Select player leaving..."
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <!-- Player In -->
          <UFormField label="Player In (Entering)">
            <USelect
              v-model="playerInId"
              :items="inOptions"
              placeholder="Select player entering..."
              value-key="value"
              :disabled="!playerOutId"
              class="w-full"
            />
          </UFormField>

          <p v-if="noPlayers" class="text-sm text-gray-500">
            No players registered for this team.
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
              label="Record Substitution"
              icon="i-heroicons-check"
              color="primary"
              :loading="loading"
              :disabled="!playerOutId || !playerInId || loading"
              @click="emit('confirm')"
            />
          </div>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
