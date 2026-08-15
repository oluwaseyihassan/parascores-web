<script setup lang="ts">
import type { MatchEvent } from "~/types";

const open = defineModel<boolean>("open", { default: false });
const minute = defineModel<number | null>("minute", { default: null });
const playerId = defineModel<string | undefined>("playerId");
const relatedPlayerId = defineModel<string | undefined>("relatedPlayerId");

defineProps<{
  event: MatchEvent | null;
  playerOptions: Array<{ label: string; value: string }>;
  relatedOptions: Array<{ label: string; value: string; disabled?: boolean }>;
  loading: boolean;
}>();

const emit = defineEmits<{
  confirm: [];
}>();
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon
                name="i-heroicons-pencil"
                class="w-5 h-5 text-primary-500"
              />
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                Edit Event
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
          <!-- Minute (hidden for penalty shootout events) -->
          <UFormField
            v-if="!event?.metadata?.isPenaltyShootout"
            label="Minute (optional)"
          >
            <UInput
              v-model.number="minute"
              type="number"
              placeholder="e.g. 45"
              icon="i-heroicons-clock"
              :min="0"
              :max="120"
            />
          </UFormField>

          <!-- Scorer/Player -->
          <UFormField
            :label="
              event?.type === 'SUBSTITUTION'
                ? 'Player In (Entering)'
                : 'Player'
            "
          >
            <USelect
              v-model="playerId"
              :items="playerOptions"
              placeholder="Select player..."
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <!-- Assister/Related (hidden for penalty shootout events) -->
          <UFormField
            v-if="!event?.metadata?.isPenaltyShootout"
            :label="
              event?.type === 'SUBSTITUTION'
                ? 'Player Out (Leaving)'
                : 'Related Player / Assist (optional)'
            "
          >
            <USelect
              v-model="relatedPlayerId"
              :items="relatedOptions"
              placeholder="Select related player..."
              value-key="value"
              :disabled="!playerId"
              class="w-full"
            />
          </UFormField>

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-2">
            <UButton
              label="Cancel"
              variant="ghost"
              color="neutral"
              @click="open = false;"
            />
            <UButton
              label="Save Changes"
              icon="i-heroicons-check"
              color="primary"
              :loading="loading"
              @click="emit('confirm')"
            />
          </div>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
