<script setup lang="ts">
import type { Fixture } from "~/types";

interface FixtureGroup {
  value: string;
  label: string;
  round: number;
  roundName: string;
  dateLabel: string;
  hasLive: boolean;
  fixtures: Fixture[];
}

defineProps<{
  groups: FixtureGroup[];
  updatingMatch: boolean;
}>();

const emit = defineEmits<{
  start: [fixture: Fixture];
  control: [fixture: Fixture];
  delete: [fixture: Fixture];
  "add-fixture": [payload: { round: number; roundName: string }];
}>();
</script>

<template>
  <div>
    <div v-for="group in groups" :key="group.value" class="mb-6 last:mb-0">
      <!-- Group header: round label left, relative date right -->
      <div class="flex items-center justify-between gap-3 px-1 mb-1.5">
        <span
          class="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500"
        >
          {{ group.label }}
        </span>
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
            @click="
              emit('add-fixture', {
                round: group.round,
                roundName: group.roundName,
              })
            "
          >
            <UIcon name="i-heroicons-plus" class="w-3.5 h-3.5" />
            <span>Add fixture</span>
          </button>
          <span
            v-if="group.dateLabel"
            class="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400"
          >
            {{ group.dateLabel }}
          </span>
        </div>
      </div>

      <!-- Rows -->
      <div
        class="rounded-xl border border-gray-100 dark:border-white/[0.06] divide-y divide-gray-100 dark:divide-white/5 overflow-hidden"
      >
        <FixtureRow
          v-for="fixture in group.fixtures"
          :key="fixture.id"
          :fixture="fixture"
          :updating-match="updatingMatch"
          @start="(f) => emit('start', f)"
          @control="(f) => emit('control', f)"
          @delete="(f) => emit('delete', f)"
        />
        <div
          v-if="!group.fixtures.length"
          class="px-3 py-4 text-center text-xs text-gray-400 dark:text-gray-500"
        >
          No fixtures scheduled
        </div>
      </div>
    </div>
  </div>
</template>
