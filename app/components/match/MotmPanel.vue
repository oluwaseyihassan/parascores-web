<script setup lang="ts">
import { MatchLineupsKey } from "~/composables/match/useMatchLineups";

const collapsed = defineModel<boolean>("collapsed", { default: false });

defineProps<{
  loadingPlayers: boolean;
}>();

const {
  motmPlayerOptions,
  motmDisplayName,
  selectedMotmModel,
  selectedManOfTheMatchPlayerId,
  savingMotm,
  saveManOfTheMatch,
  clearManOfTheMatch,
} = inject(MatchLineupsKey)!;
</script>

<template>
  <div class="mc-section">
    <div
      class="mc-section__head cursor-pointer"
      @click="collapsed = !collapsed"
    >
      <UIcon name="i-heroicons-star" class="w-3.5 h-3.5 text-amber-500" />
      <span>Man of the Match</span>
      <span v-if="motmDisplayName" class="mc-tag">{{
        motmDisplayName.name
      }}</span>
      <UIcon
        name="i-heroicons-chevron-down"
        class="w-4 h-4 ml-auto transition-transform"
        :class="{ 'rotate-180': collapsed }"
      />
    </div>
    <div v-show="collapsed" class="mc-section__body">
      <div
        v-if="loadingPlayers"
        class="flex items-center justify-center gap-2 py-6 text-sm text-gray-400"
      >
        <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
        Loading…
      </div>
      <div
        v-else-if="motmPlayerOptions.length === 0"
        class="py-6 text-center text-sm text-gray-400"
      >
        No players available to select.
      </div>
      <div v-else class="space-y-4">
        <UFormField label="Select Man of the Match">
          <USelect
            v-model="selectedMotmModel"
            :items="motmPlayerOptions"
            placeholder="Choose a player..."
            value-key="value"
            class="w-full"
          />
        </UFormField>
        <div class="flex items-center justify-end gap-2">
          <UButton
            v-if="selectedManOfTheMatchPlayerId"
            size="xs"
            color="warning"
            variant="soft"
            icon="i-heroicons-trash"
            label="Clear"
            :loading="savingMotm"
            @click="clearManOfTheMatch"
          />
          <UButton
            size="xs"
            color="success"
            variant="soft"
            icon="i-heroicons-check"
            label="Save"
            :loading="savingMotm"
            @click="saveManOfTheMatch"
          />
        </div>
      </div>
    </div>
  </div>
</template>
