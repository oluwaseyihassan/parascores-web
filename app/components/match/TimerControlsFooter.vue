<script setup lang="ts">
import { FixtureStatus } from "~/types";
import type { Fixture } from "~/types";
import { MatchTimerControlsKey } from "~/composables/match/useMatchTimerControls";
import { ConfirmModalKey } from "~/composables/match/useConfirmModal";

defineProps<{
  fixture: Fixture | null;
  updatingMatch: boolean;
  isLeg2: boolean;
  leg1Completed: boolean;
}>();

const {
  isHalftime,
  isSecondHalf,
  canStartExtraTime,
  startMatch,
  undoStartMatch,
  pauseMatch,
  resumeMatch,
  setHalftime,
  startSecondHalf,
  endNormalTime,
  startExtraTime,
  endMatch,
  reopenMatch,
} = inject(MatchTimerControlsKey)!;

const { openConfirmModal } = inject(ConfirmModalKey)!;
</script>

<template>
  <div v-if="fixture" class="mc-footer">
    <div class="mc-footer__primary">
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

      <!-- Live Match Timer Control Buttons -->
      <template v-if="['LIVE', 'EXTRATIME'].includes(fixture.status)">
        <div class="mc-action-group">
          <!-- Pause / Resume Clock -->
          <button
            v-if="fixture.timerIsRunning"
            class="mc-primary-btn mc-primary-btn--pause"
            :disabled="updatingMatch"
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
            <span class="hidden sm:inline">Pause Clock</span>
            <span class="sm:hidden">Pause</span>
          </button>
          <button
            v-else
            class="mc-primary-btn mc-primary-btn--resume"
            :disabled="updatingMatch"
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
            <span class="hidden sm:inline">Resume Clock</span>
            <span class="sm:hidden">Resume</span>
          </button>

          <!-- Halftime / Start 2nd Half / End Normal Time (only in normal time) -->
          <template v-if="fixture.status === FixtureStatus.LIVE">
            <button
              v-if="!isSecondHalf && !isHalftime"
              class="mc-primary-btn mc-primary-btn--halftime"
              :disabled="updatingMatch"
              @click="
                openConfirmModal({
                  title: 'Halftime',
                  message:
                    'Are you sure you want to set the match to halftime?',
                  confirmLabel: 'Halftime',
                  confirmColor: 'warning',
                  onConfirm: setHalftime,
                })
              "
            >
              <UIcon name="i-heroicons-clock" class="w-4 h-4" />
              <span class="hidden sm:inline">Halftime</span>
              <span class="sm:hidden">HT</span>
            </button>
            <button
              v-else-if="!isSecondHalf && isHalftime"
              class="mc-primary-btn mc-primary-btn--secondhalf"
              :disabled="updatingMatch"
              @click="
                openConfirmModal({
                  title: 'Start 2nd Half',
                  message: 'Are you sure you want to start the second half?',
                  confirmLabel: 'Start 2nd Half',
                  confirmColor: 'success',
                  onConfirm: startSecondHalf,
                })
              "
            >
              <UIcon name="i-heroicons-forward" class="w-4 h-4" />
              <span class="hidden sm:inline">Start 2nd Half</span>
              <span class="sm:hidden">2nd Half</span>
            </button>
            <button
              v-else-if="isSecondHalf"
              class="mc-primary-btn mc-primary-btn--halftime"
              :disabled="updatingMatch"
              @click="
                openConfirmModal({
                  title: 'End Normal Time',
                  message: 'Are you sure you want to end normal time?',
                  confirmLabel: 'End Normal Time',
                  confirmColor: 'warning',
                  onConfirm: endNormalTime,
                })
              "
            >
              <UIcon name="i-heroicons-flag" class="w-4 h-4" />
              <span class="hidden sm:inline">End Normal Time</span>
              <span class="sm:hidden">End FT</span>
            </button>
          </template>
        </div>

        <div class="mc-action-divider" role="separator" aria-hidden="true" />

        <div class="mc-action-group">
          <button
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
          <button
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
        </div>
      </template>

      <!-- Normal Time Ended Controls -->
      <template v-if="fixture.status === FixtureStatus.NORMAL_TIME_ENDED">
        <div class="mc-action-group">
          <button
            v-if="canStartExtraTime"
            class="mc-primary-btn mc-primary-btn--halftime"
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
        </div>

        <div class="mc-action-divider" role="separator" aria-hidden="true" />

        <div class="mc-action-group">
          <button
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
          <button
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
        </div>
      </template>

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
        <span>{{ updatingMatch ? 'Reopening…' : 'Reopen Match' }}</span>
      </button>
    </div>
  </div>
</template>
