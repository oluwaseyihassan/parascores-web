<script setup lang="ts">
import { MatchScheduleKey } from "~/composables/match/useMatchSchedule";

const collapsed = defineModel<boolean>("collapsed", { default: false });

const venueStore = useVenueStore();

const {
  matchDateVal,
  matchTimeVal,
  matchVenue,
  matchDuration,
  updatingTime,
  formatDateDisplay,
  venueOptions,
  isUpdateDisabled,
  updateMatchTime,
} = inject(MatchScheduleKey)!;
</script>

<template>
  <div class="mc-section">
    <div
      class="mc-section__head cursor-pointer"
      @click="collapsed = !collapsed"
    >
      <UIcon
        name="i-heroicons-calendar"
        class="w-3.5 h-3.5 text-emerald-500"
      />
      <span>Schedule</span>
      <UIcon
        name="i-heroicons-chevron-down"
        class="w-4 h-4 ml-auto transition-transform"
        :class="{ 'rotate-180': collapsed }"
      />
    </div>
    <div v-show="collapsed" class="mc-section__body">
      <div class="flex flex-col sm:flex-row flex-wrap gap-2">
        <UPopover class="flex-1 min-w-0">
          <UButton
            variant="outline"
            color="neutral"
            icon="i-heroicons-calendar"
            class="w-full justify-start"
            :class="!matchDateVal && 'text-gray-400'"
            :disabled="updatingTime"
          >
            {{ formatDateDisplay(matchDateVal) }}
          </UButton>
          <template #content>
            <UCalendar v-model="matchDateVal" />
          </template>
        </UPopover>
        <UInput
          type="time"
          v-model="matchTimeVal"
          class="w-full sm:w-32"
          size="md"
          :disabled="updatingTime"
        />
        <USelect
          v-if="venueStore.venues.length"
          v-model="matchVenue"
          :items="venueOptions"
          value-key="value"
          placeholder="Select venue…"
          class="w-full sm:w-44"
          size="md"
          :disabled="updatingTime"
        />
      </div>
      <!-- Match Duration Slider -->
      <div
        class="mt-3 flex flex-col gap-1.5 p-3 rounded-lg bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04]"
      >
        <div
          class="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400"
        >
          <span>Match Duration</span>
          <span class="font-bold text-emerald-500 dark:text-emerald-400"
            >{{ matchDuration }} mins</span
          >
        </div>
        <input
          type="range"
          v-model.number="matchDuration"
          min="10"
          max="120"
          step="5"
          class="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          :disabled="updatingTime"
        />
      </div>
      <UButton
        color="primary"
        variant="solid"
        size="sm"
        :loading="updatingTime"
        :disabled="isUpdateDisabled"
        @click="updateMatchTime"
        class="mt-3 w-full sm:w-auto"
      >
        Update Schedule
      </UButton>
    </div>
  </div>
</template>
