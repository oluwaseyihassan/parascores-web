import type { InjectionKey, Ref } from "vue";
import { FixtureStage, FixtureStatus, MatchHalf } from "~/types";
import type { Fixture } from "~/types";
import {
  useMatchTimer,
  getMatchElapsedSeconds,
} from "~/composables/useMatchTimer";

export function useMatchTimerControls(options: {
  fixture: Ref<Fixture | null>;
  matchDuration: Ref<number>;
  updatingMatch: Ref<boolean>;
  updatingTime: Ref<boolean>;
  matchTimer: ReturnType<typeof useMatchTimer>;
  isScoreTiedOrAggregateTied: () => boolean;
  onFixtureUpdated: (fixture: Fixture) => void;
  onMatchEnded: () => void;
  closeModal: () => void;
  onError: (message: string | null) => void;
}) {
  const {
    fixture,
    matchDuration,
    updatingMatch,
    updatingTime,
    matchTimer,
    isScoreTiedOrAggregateTied,
    onFixtureUpdated,
    onMatchEnded,
    closeModal,
    onError,
  } = options;

  const fixtureStore = useFixtureStore();
  const { handleError, extractErrorMessage } = useErrors();

  const adjustedMinute = ref(1);
  const isEditingMinute = ref(false);

  // Local reactive clock for second-half detection
  const localNow = ref(Date.now());
  let localNowInterval: ReturnType<typeof setInterval> | undefined;
  onMounted(() => {
    localNowInterval = setInterval(() => {
      localNow.value = Date.now();
    }, 1000);
  });
  onUnmounted(() => {
    if (localNowInterval) clearInterval(localNowInterval);
  });

  const adjustTimerMaxMinutes = computed(() => {
    if (!fixture.value) return 90;
    const duration = fixture.value.matchDuration ?? 90;
    const htSeconds = (duration * 60) / 2;
    const baseElapsed = fixture.value.timerElapsedSeconds ?? 0;

    if (baseElapsed < htSeconds) {
      return Math.floor(htSeconds / 60);
    }
    return duration;
  });

  const liveClock = computed(() => {
    if (!fixture.value) return "";
    return matchTimer.formatClock(fixture.value);
  });

  const liveMinuteLabel = computed(() => {
    if (!fixture.value) return "";
    return matchTimer.formatMinuteLabel(fixture.value);
  });

  const isTimerRunning = computed(() => {
    return (
      (fixture.value?.status === FixtureStatus.LIVE ||
        fixture.value?.status === FixtureStatus.EXTRATIME) &&
      !!fixture.value?.timerIsRunning
    );
  });

  const isTimerPaused = computed(() => {
    return (
      (fixture.value?.status === FixtureStatus.LIVE ||
        fixture.value?.status === FixtureStatus.EXTRATIME) &&
      !fixture.value?.timerIsRunning
    );
  });

  const halftimeSeconds = computed(() => {
    return (matchDuration.value * 60) / 2;
  });

  const isHalftime = computed(() => {
    if (!fixture.value) return false;
    return (
      fixture.value.timerIsRunning === false &&
      fixture.value.timerElapsedSeconds === halftimeSeconds.value
    );
  });

  const isSecondHalf = computed(() => {
    if (!fixture.value) return false;
    if (fixture.value.half) {
      return (
        fixture.value.half === MatchHalf.SECOND_HALF ||
        fixture.value.half === MatchHalf.EXTRA_TIME
      );
    }
    localNow.value; // trigger re-evaluation every second
    const elapsed = getMatchElapsedSeconds(fixture.value) ?? 0;
    return elapsed >= halftimeSeconds.value;
  });

  const canEndNormalTime = computed(() => {
    if (!fixture.value) return false;
    if (fixture.value.status !== FixtureStatus.LIVE) return false;
    // Only offer end-of-normal-time for knockout stage matches
    if (
      fixture.value.stage !== FixtureStage.KNOCKOUT &&
      fixture.value.stage != null
    )
      return false;
    if (!isScoreTiedOrAggregateTied()) return false;
    const elapsed = matchTimer.getElapsedSeconds(fixture.value) ?? 0;
    return elapsed >= 90 * 60;
  });

  const canStartExtraTime = computed(() => {
    if (!fixture.value) return false;
    if (fixture.value.status !== FixtureStatus.NORMAL_TIME_ENDED) return false;
    // Only offer extra time for knockout stage matches
    if (
      fixture.value.stage !== FixtureStage.KNOCKOUT &&
      fixture.value.stage != null
    )
      return false;
    return isScoreTiedOrAggregateTied();
  });

  const startMatch = async () => {
    if (!fixture.value) return;

    updatingMatch.value = true;
    try {
      const now = new Date().toISOString();
      const updatePayload = {
        status: FixtureStatus.LIVE,
        homeScore: fixture.value.homeScore ?? 0,
        awayScore: fixture.value.awayScore ?? 0,
        timerStartedAt: now,
        timerElapsedSeconds: 0,
        timerIsRunning: true,
        half: MatchHalf.FIRST_HALF,
      };
      await fixtureStore.updateFixture(fixture.value.id, updatePayload);

      fixture.value = {
        ...fixture.value,
        ...updatePayload,
      };

      onFixtureUpdated(fixture.value);

      useToast().add({
        title: "Match Started",
        description: "The match is now live!",
        icon: "i-heroicons-play",
        color: "success",
      });
    } catch (error: any) {
      handleError(error, { title: "Failed to start match" });
    } finally {
      updatingMatch.value = false;
    }
  };

  const undoStartMatch = async () => {
    if (!fixture.value) return;

    updatingMatch.value = true;
    try {
      const updatePayload = {
        status: FixtureStatus.SCHEDULED,
        timerStartedAt: null,
        timerElapsedSeconds: 0,
        timerIsRunning: false,
      };
      await fixtureStore.updateFixture(fixture.value.id, updatePayload);

      fixture.value = {
        ...fixture.value,
        ...updatePayload,
      };

      onFixtureUpdated(fixture.value);

      useToast().add({
        title: "Match Un-started",
        description: "The match has been reverted to SCHEDULED.",
        icon: "i-heroicons-arrow-uturn-left",
        color: "warning",
      });
    } catch (error: any) {
      handleError(error, { title: "Failed to undo start" });
    } finally {
      updatingMatch.value = false;
    }
  };

  const pauseMatch = async () => {
    if (!fixture.value) return;

    updatingMatch.value = true;
    try {
      const currentElapsed =
        matchTimer.getElapsedSeconds(fixture.value) ?? 0;
      const updatePayload = {
        timerIsRunning: false,
        timerElapsedSeconds: currentElapsed,
      };
      await fixtureStore.updateFixture(fixture.value.id, updatePayload);

      fixture.value = {
        ...fixture.value,
        ...updatePayload,
      };

      onFixtureUpdated(fixture.value);

      useToast().add({
        title: "Match Paused",
        description: "The clock has been paused.",
        icon: "i-heroicons-pause",
        color: "warning",
      });
    } catch (error: any) {
      handleError(error, { title: "Failed to pause match" });
    } finally {
      updatingMatch.value = false;
    }
  };

  const resumeMatch = async () => {
    if (!fixture.value) return;

    updatingMatch.value = true;
    try {
      const now = new Date().toISOString();
      const updatePayload = {
        timerIsRunning: true,
        timerStartedAt: now,
      };
      await fixtureStore.updateFixture(fixture.value.id, updatePayload);

      fixture.value = {
        ...fixture.value,
        ...updatePayload,
      };

      onFixtureUpdated(fixture.value);

      useToast().add({
        title: "Match Resumed",
        description: "The clock has resumed.",
        icon: "i-heroicons-play",
        color: "success",
      });
    } catch (error: any) {
      handleError(error, { title: "Failed to resume match" });
    } finally {
      updatingMatch.value = false;
    }
  };

  const setHalftime = async () => {
    if (!fixture.value) return;

    updatingMatch.value = true;
    try {
      const htSeconds = halftimeSeconds.value;
      const updatePayload = {
        timerIsRunning: false,
        timerElapsedSeconds: htSeconds,
      };
      await fixtureStore.updateFixture(fixture.value.id, updatePayload);

      fixture.value = {
        ...fixture.value,
        ...updatePayload,
      };

      onFixtureUpdated(fixture.value);

      useToast().add({
        title: "Halftime",
        description: "Match set to halftime.",
        icon: "i-heroicons-clock",
        color: "warning",
      });
    } catch (error: any) {
      handleError(error, { title: "Failed to set halftime" });
    } finally {
      updatingMatch.value = false;
    }
  };

  const startSecondHalf = async () => {
    if (!fixture.value) return;

    updatingMatch.value = true;
    try {
      const now = new Date().toISOString();
      const htSeconds = halftimeSeconds.value;
      const updatePayload = {
        timerIsRunning: true,
        timerStartedAt: now,
        timerElapsedSeconds: htSeconds,
        half: MatchHalf.SECOND_HALF,
      };
      await fixtureStore.updateFixture(fixture.value.id, updatePayload);

      fixture.value = {
        ...fixture.value,
        ...updatePayload,
      };

      onFixtureUpdated(fixture.value);

      useToast().add({
        title: "Second Half Started",
        description: "The second half has kicked off!",
        icon: "i-heroicons-play",
        color: "success",
      });
    } catch (error: any) {
      handleError(error, { title: "Failed to start second half" });
    } finally {
      updatingMatch.value = false;
    }
  };

  const endNormalTime = async () => {
    if (!fixture.value) return;

    updatingMatch.value = true;
    try {
      const now = new Date().toISOString();
      const currentElapsed =
        matchTimer.getElapsedSeconds(fixture.value) ?? 90 * 60;
      const updatePayload = {
        status: FixtureStatus.NORMAL_TIME_ENDED,
        timerIsRunning: false,
        timerStartedAt: now,
        timerElapsedSeconds: currentElapsed,
        matchDuration: 90,
        half: MatchHalf.SECOND_HALF,
      };
      await fixtureStore.updateFixture(fixture.value.id, updatePayload);

      fixture.value = {
        ...fixture.value,
        ...updatePayload,
      };
      matchDuration.value = 90;

      onFixtureUpdated(fixture.value);

      useToast().add({
        title: "Normal Time Ended",
        description:
          "The match is tied after 90 minutes. Start extra time when ready.",
        icon: "i-heroicons-flag",
        color: "warning",
      });
    } catch (error: any) {
      handleError(error, { title: "Failed to end normal time" });
    } finally {
      updatingMatch.value = false;
    }
  };

  const startExtraTime = async () => {
    if (!fixture.value) return;

    updatingMatch.value = true;
    try {
      const now = new Date().toISOString();
      const updatePayload = {
        status: FixtureStatus.EXTRATIME,
        timerIsRunning: true,
        timerStartedAt: now,
        timerElapsedSeconds: 90 * 60,
        matchDuration: 120,
        half: MatchHalf.EXTRA_TIME,
      };
      await fixtureStore.updateFixture(fixture.value.id, updatePayload);

      fixture.value = {
        ...fixture.value,
        ...updatePayload,
      };
      matchDuration.value = 120;

      onFixtureUpdated(fixture.value);

      useToast().add({
        title: "Extra Time Started",
        description: "The match is now in extra time.",
        icon: "i-heroicons-clock",
        color: "warning",
      });
    } catch (error: any) {
      handleError(error, { title: "Failed to start extra time" });
    } finally {
      updatingMatch.value = false;
    }
  };

  const adjustMatchTimer = async () => {
    if (!fixture.value) return;

    updatingTime.value = true;
    try {
      const cappedMin = Math.min(
        adjustedMinute.value,
        adjustTimerMaxMinutes.value,
      );
      adjustedMinute.value = cappedMin;
      const targetSeconds = Math.max(0, cappedMin * 60);
      const now = new Date().toISOString();

      const updatePayload: any = {
        timerElapsedSeconds: targetSeconds,
      };

      // Set the half based on the adjusted minute (unless already in extra time / penalty shootout)
      const currentHalf = fixture.value.half;
      const halfTimeMinutes = (fixture.value.matchDuration ?? 90) / 2;
      if (
        currentHalf !== MatchHalf.EXTRA_TIME &&
        currentHalf !== MatchHalf.PENALTY_SHOOTOUT
      ) {
        updatePayload.half =
          cappedMin > halfTimeMinutes
            ? MatchHalf.SECOND_HALF
            : MatchHalf.FIRST_HALF;
      }

      // If clock is running, we must reset timerStartedAt to now so it accumulates from targetSeconds
      if (fixture.value.timerIsRunning) {
        updatePayload.timerStartedAt = now;
      }

      await fixtureStore.updateFixture(fixture.value.id, updatePayload);

      fixture.value = {
        ...fixture.value,
        ...updatePayload,
      };

      onFixtureUpdated(fixture.value!);

      useToast().add({
        title: "Clock Adjusted",
        description: `Clock running time has been set to ${cappedMin}:00.`,
        icon: "i-heroicons-clock",
        color: "success",
      });
    } catch (error: any) {
      handleError(error, { title: "Failed to adjust clock" });
    } finally {
      updatingTime.value = false;
      isEditingMinute.value = false;
    }
  };

  const endMatch = async () => {
    if (!fixture.value) return;

    updatingMatch.value = true;
    try {
      const homePen = fixture.value.homePenaltyScore;
      const awayPen = fixture.value.awayPenaltyScore;
      const penaltyData =
        isScoreTiedOrAggregateTied() && homePen != null && awayPen != null
          ? {
              homePenaltyScore: homePen,
              awayPenaltyScore: awayPen,
            }
          : {};

      const updatePayload = {
        status: FixtureStatus.COMPLETED,
        timerIsRunning: false,
        ...penaltyData,
      };
      await fixtureStore.updateFixture(fixture.value.id, updatePayload);

      fixture.value = {
        ...fixture.value,
        ...updatePayload,
      };
      onFixtureUpdated(fixture.value);
      onMatchEnded();
      closeModal();

      useToast().add({ title: "Match Ended", color: "success" });
    } catch (error: any) {
      onError(extractErrorMessage(error));
      handleError(error, { title: "Failed to end match" });
    } finally {
      updatingMatch.value = false;
    }
  };

  const reopenMatch = async () => {
    if (!fixture.value) return;

    updatingMatch.value = true;
    try {
      const now = new Date().toISOString();
      const updatePayload = {
        status: FixtureStatus.LIVE,
        timerStartedAt: now,
        timerIsRunning: true,
      };
      await fixtureStore.updateFixture(fixture.value.id, updatePayload);

      fixture.value = {
        ...fixture.value,
        ...updatePayload,
      };
      onFixtureUpdated(fixture.value);

      useToast().add({
        title: "Match Reopened",
        description: "The match has been set back to LIVE.",
        icon: "i-heroicons-arrow-path",
        color: "warning",
      });
    } catch (error: any) {
      handleError(error, { title: "Failed to reopen match" });
    } finally {
      updatingMatch.value = false;
    }
  };

  return {
    adjustedMinute,
    isEditingMinute,
    adjustTimerMaxMinutes,
    liveClock,
    liveMinuteLabel,
    isTimerRunning,
    isTimerPaused,
    halftimeSeconds,
    isHalftime,
    isSecondHalf,
    canEndNormalTime,
    canStartExtraTime,
    startMatch,
    undoStartMatch,
    pauseMatch,
    resumeMatch,
    setHalftime,
    startSecondHalf,
    endNormalTime,
    startExtraTime,
    adjustMatchTimer,
    endMatch,
    reopenMatch,
  };
}

export type MatchTimerControlsApi = ReturnType<typeof useMatchTimerControls>;

export const MatchTimerControlsKey: InjectionKey<MatchTimerControlsApi> =
  Symbol("match-timer-controls");
