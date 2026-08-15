<script setup lang="ts">
import { MatchEventType } from "~/types";
import type { Fixture, Player } from "~/types";

const open = defineModel<boolean>("open", { default: false });
const type = defineModel<MatchEventType>("type", { required: true });
const playerId = defineModel<string | undefined>("playerId");
const minute = defineModel<number | null>("minute", { default: null });

const props = defineProps<{
  fixture: Fixture | null;
  team: "home" | "away";
  players: Player[];
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

const playerOptions = computed(() => {
  return props.players.map((p) => ({
    label: `${p.number ? `#${p.number} ` : ""}${p.name}`,
    value: p.id,
  }));
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
                name="i-heroicons-exclamation-triangle"
                class="w-5 h-5 text-warning-500 shrink-0"
              />
              <h3
                class="text-lg font-semibold text-gray-900 dark:text-white shrink-0"
              >
                Record Card
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
          <!-- Card Type -->
          <UFormField label="Card Type">
            <USelect
              v-model="type"
              :items="[
                { label: 'Yellow Card', value: 'YELLOW_CARD' },
                { label: 'Red Card', value: 'RED_CARD' },
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

          <!-- Player -->
          <UFormField label="Player">
            <USelect
              v-model="playerId"
              :items="playerOptions"
              placeholder="Select player..."
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <p v-if="players.length === 0" class="text-sm text-gray-500">
            No players registered for this team. You can still record a card
            event but cannot assign it to a player.
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
              label="Record Card"
              icon="i-heroicons-check"
              :color="type === 'YELLOW_CARD' ? 'warning' : 'error'"
              :loading="loading"
              @click="emit('confirm')"
            />
          </div>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
