<script setup lang="ts">
import { FixtureStatus } from "~/types";
import type { Fixture } from "~/types";
import { MatchTimerControlsKey } from "~/composables/match/useMatchTimerControls";
import { ConfirmModalKey } from "~/composables/match/useConfirmModal";
import { SportEngineKey } from "~/engines/types";

defineProps<{
  fixture: Fixture | null;
  updatingMatch: boolean;
  isLeg2: boolean;
  leg1Completed: boolean;
}>();

const {
  canStartExtraTime,
  startMatch,
  undoStartMatch,
  startExtraTime,
  endMatch,
  reopenMatch,
} = inject(MatchTimerControlsKey)!;

const { openConfirmModal } = inject(ConfirmModalKey)!;

const engine = inject(SportEngineKey);
// Halves-only extra time offer
const isHalvesTimer = computed(
  () => (engine?.value.capabilities.timer ?? "halves") === "halves",
);

// Undo Start applies to any started-but-not-completed match
const showUndoStart = (status: string) =>
  ["LIVE", "EXTRATIME", "NORMAL_TIME_ENDED"].includes(status);
</script>

<template>
  <!-- Footer = terminal/lifecycle actions only; clock controls live in the ClockBar -->
  <div v-if="fixture" class="mc-footer">
    <!-- Left: ghost recovery action -->
    <div class="mc-footer__group">
      <button
        v-if="showUndoStart(fixture.status)"
        class="mc-primary-btn mc-primary-btn--undo"
        :disabled="updatingMatch"
        @click="
          openConfirmModal({
            title: 'Undo Start',
            message:
              'Are you sure you want to undo the match start? This will revert the fixture to scheduled.',
            confirmLabel: 'Undo Start',
            confirmColor: 'warning',
            onConfirm: undoStartMatch,
          })
        "
      >
        <UIcon name="i-heroicons-arrow-uturn-left" class="w-4 h-4" />
        <span class="hidden sm:inline">Undo Start</span>
        <span class="sm:hidden">Undo</span>
      </button>
    </div>

    <!-- Right: terminal action(s) -->
    <div class="mc-footer__group">
      <template v-if="fixture.status === 'SCHEDULED' && fixture.startTime">
        <button
          v-if="!isLeg2 || leg1Completed"
          class="mc-primary-btn mc-primary-btn--start"
          :disabled="updatingMatch"
          @click="startMatch"
        >
          <UIcon name="i-heroicons-play" class="w-4 h-4" />
          <span>{{ updatingMatch ? "Starting…" : "Start Match" }}</span>
        </button>
        <UTooltip text="Complete Leg 1 first to unlock" v-else>
          <button class="mc-primary-btn mc-primary-btn--locked" disabled>
            <UIcon name="i-heroicons-lock-closed" class="w-4 h-4" />
            <span>Leg 1 Pending</span>
          </button>
        </UTooltip>
      </template>

      <button
        v-if="fixture.status === FixtureStatus.NORMAL_TIME_ENDED && isHalvesTimer && canStartExtraTime"
        class="mc-primary-btn mc-primary-btn--secondhalf"
        :disabled="updatingMatch"
        @click="
          openConfirmModal({
            title: 'Start Extra Time',
            message: 'Are you sure you want to start extra time?',
            confirmLabel: 'Start Extra Time',
            confirmColor: 'success',
            onConfirm: startExtraTime,
          })
        "
      >
        <UIcon name="i-heroicons-clock" class="w-4 h-4" />
        <span class="hidden sm:inline">Start Extra Time</span>
        <span class="sm:hidden">ET</span>
      </button>

      <button
        v-if="['LIVE', 'EXTRATIME', 'NORMAL_TIME_ENDED'].includes(fixture.status)"
        class="mc-primary-btn mc-primary-btn--end"
        :disabled="updatingMatch"
        @click="
          openConfirmModal({
            title: 'End Match',
            message:
              'Are you sure you want to end this match? This action cannot be undone.',
            confirmLabel: 'End Match',
            confirmColor: 'error',
            onConfirm: endMatch,
          })
        "
      >
        <UIcon name="i-heroicons-flag" class="w-4 h-4" />
        <span class="hidden sm:inline">{{
          updatingMatch ? 'Ending…' : 'End Match'
        }}</span>
        <span class="sm:hidden">{{ updatingMatch ? 'Ending…' : 'End' }}</span>
      </button>

      <button
        v-if="fixture.status === 'COMPLETED'"
        class="mc-primary-btn mc-primary-btn--reopen"
        :disabled="updatingMatch"
        @click="
          openConfirmModal({
            title: 'Reopen Match',
            message:
              'Are you sure you want to reopen this match? This will set it back to LIVE.',
            confirmLabel: 'Reopen Match',
            confirmColor: 'warning',
            onConfirm: reopenMatch,
          })
        "
      >
        <UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
        <span>{{ updatingMatch ? "Reopening…" : "Reopen Match" }}</span>
      </button>
    </div>
  </div>
</template>
