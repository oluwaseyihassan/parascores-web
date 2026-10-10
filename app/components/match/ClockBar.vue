<script setup lang="ts">
import { FixtureStatus } from "~/types";
import type { Fixture } from "~/types";
import { MatchTimerControlsKey } from "~/composables/match/useMatchTimerControls";
import { ConfirmModalKey } from "~/composables/match/useConfirmModal";
import { SportEngineKey } from "~/engines/types";

const props = defineProps<{
  fixture: Fixture | null;
  updatingMatch: boolean;
}>();

const {
  liveClock,
  isTimerPaused,
  isHalftime,
  isSecondHalf,
  adjustedMinute,
  isEditingMinute,
  adjustTimerMaxMinutes,
  updatingTime,
  pauseMatch,
  resumeMatch,
  setHalftime,
  startSecondHalf,
  endNormalTime,
} = inject(MatchTimerControlsKey)!;

const { openConfirmModal } = inject(ConfirmModalKey)!;

const engine = inject(SportEngineKey);
// Halves-only progression (halftime / second half / normal time)
const isHalvesTimer = computed(
  () => (engine?.value.capabilities.timer ?? "halves") === "halves",
);

// Pause/resume only makes sense while the clock concept is live
const showPauseControls = computed(() =>
  [FixtureStatus.LIVE, FixtureStatus.EXTRATIME].includes(
    props.fixture?.status as FixtureStatus,
  ),
);

const showAdjust = ref(false);

// The single next step of the match progression (normal time only)
const progression = computed(() => {
  if (!props.fixture || props.fixture.status !== FixtureStatus.LIVE) return null;
  if (!isHalvesTimer.value) return null;
  if (!isSecondHalf.value && !isHalftime.value) {
    return {
      label: "Halftime",
      shortLabel: "HT",
      icon: "i-heroicons-clock",
      color: "warning" as const,
      confirm: {
        title: "Halftime",
        message: "Are you sure you want to set the match to halftime?",
        confirmLabel: "Halftime",
        confirmColor: "warning" as const,
        onConfirm: setHalftime,
      },
    };
  }
  if (isHalftime.value) {
    return {
      label: "Start 2nd Half",
      shortLabel: "2nd Half",
      icon: "i-heroicons-forward",
      color: "success" as const,
      confirm: {
        title: "Start 2nd Half",
        message: "Are you sure you want to start the second half?",
        confirmLabel: "Start 2nd Half",
        confirmColor: "success" as const,
        onConfirm: startSecondHalf,
      },
    };
  }
  return {
    label: "End Normal Time",
    shortLabel: "End FT",
    icon: "i-heroicons-flag",
    color: "warning" as const,
    confirm: {
      title: "End Normal Time",
      message: "Are you sure you want to end normal time?",
      confirmLabel: "End Normal Time",
      confirmColor: "warning" as const,
      onConfirm: endNormalTime,
    },
  };
});
</script>

<template>
  <!-- Clock bar: pause/resume + running time + adjust + one progression step -->
  <div class="mc-clockbar">
    <button
      v-if="showPauseControls && fixture?.timerIsRunning"
      class="mc-clockbar__icon"
      :disabled="updatingMatch"
      title="Pause clock"
      aria-label="Pause clock"
      @click="
        openConfirmModal({
          title: 'Pause Clock',
          message: 'Are you sure you want to pause the match clock?',
          confirmLabel: 'Pause Clock',
          confirmColor: 'warning',
          onConfirm: pauseMatch,
        })
      "
    >
      <UIcon name="i-heroicons-pause" class="w-4 h-4" />
    </button>
    <button
      v-else-if="showPauseControls"
      class="mc-clockbar__icon"
      :disabled="updatingMatch"
      title="Resume clock"
      aria-label="Resume clock"
      @click="
        openConfirmModal({
          title: 'Resume Clock',
          message: 'Are you sure you want to resume the match clock?',
          confirmLabel: 'Resume Clock',
          confirmColor: 'success',
          onConfirm: resumeMatch,
        })
      "
    >
      <UIcon name="i-heroicons-play" class="w-4 h-4" />
    </button>

    <span class="mc-clockbar__time tabular-nums">{{ liveClock }}</span>

    <button
      class="mc-clockbar__adjust"
      :class="{ 'mc-clockbar__adjust--active': showAdjust }"
      @click="showAdjust = !showAdjust"
    >
      <UIcon name="i-heroicons-pencil" class="w-3 h-3" />
      <span>adjust</span>
    </button>

    <span class="mc-clockbar__spacer" />

    <button
      v-if="progression"
      class="mc-primary-btn"
      :class="progression.color === 'success'
        ? 'mc-primary-btn--secondhalf'
        : 'mc-primary-btn--halftime'"
      :disabled="updatingMatch"
      @click="openConfirmModal(progression.confirm)"
    >
      <UIcon :name="progression.icon" class="w-4 h-4" />
      <span class="hidden sm:inline">{{ progression.label }}</span>
      <span class="sm:hidden">{{ progression.shortLabel }}</span>
      <UIcon name="i-heroicons-arrow-right" class="w-3.5 h-3.5 opacity-70" />
    </button>

    <!-- Inline minute adjustment (absorbs the old timer-adjust box) -->
    <div v-if="showAdjust" class="mc-clockbar__adjust-form">
      <UInput
        type="number"
        v-model.number="adjustedMinute"
        min="0"
        :max="adjustTimerMaxMinutes"
        class="flex-1"
        size="xs"
        :disabled="updatingTime"
        @focus="isEditingMinute = true"
        @blur="isEditingMinute = false"
      />
      <UButton
        color="warning"
        variant="solid"
        size="xs"
        :loading="updatingTime"
        @click="adjustMatchTimer"
      >
        Apply
      </UButton>
    </div>
  </div>
</template>
