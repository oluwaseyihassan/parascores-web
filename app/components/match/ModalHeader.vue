<script setup lang="ts">
import { isFixtureLiveStatus } from "~/composables/useMatchTimer";
import { MatchTimerControlsKey } from "~/composables/match/useMatchTimerControls";
import type { Fixture } from "~/types";

defineProps<{
  fixture: Fixture | null;
  canShare: boolean;
  sharingMatch: boolean;
}>();

const emit = defineEmits<{
  close: [];
  share: [];
}>();

const { liveClock, isTimerPaused } = inject(MatchTimerControlsKey)!;
</script>

<template>
  <div class="mc-header">
    <div class="mc-header__left">
      <span class="mc-header__icon">
        <UIcon name="i-heroicons-adjustments-horizontal" class="w-3.5 h-3.5" />
      </span>
      <span class="mc-header__title">Match Control</span>
      <span
        v-if="fixture"
        class="mc-status-chip"
        :class="`mc-status-chip--${fixture.status.toLowerCase()}`"
      >
        <span class="mc-status-chip__dot" />
        {{ fixture.status }}
      </span>

      <!-- Live Clock Badge -->
      <span
        v-if="fixture && isFixtureLiveStatus(fixture.status)"
        class="mc-timer-badge ml-2"
        :class="{ 'mc-timer-badge--paused': isTimerPaused }"
      >
        <UIcon
          :name="isTimerPaused ? 'i-heroicons-pause-circle' : 'i-heroicons-clock'"
          class="w-3.5 h-3.5"
        />
        <span class="tabular-nums font-semibold">{{ liveClock }}</span>
        <span
          v-if="isTimerPaused"
          class="text-[9px] font-bold tracking-wider ml-1 opacity-75 animate-pulse"
          >PAUSED</span
        >
      </span>
    </div>
    <div class="mc-header__right">
      <button
        v-if="canShare"
        class="mc-header__share"
        :disabled="sharingMatch"
        @click="emit('share')"
        title="Share match"
      >
        <UIcon name="i-heroicons-share" class="w-4 h-4" />
      </button>
      <button class="mc-header__close" @click="emit('close')">
        <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>
