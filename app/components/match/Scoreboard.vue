<script setup lang="ts">
import { isFixtureLiveStatus } from "~/composables/useMatchTimer";
import { MatchTimerControlsKey } from "~/composables/match/useMatchTimerControls";
import { SportEngineKey } from "~/engines/types";
import type { Fixture } from "~/types";

const props = defineProps<{
  fixture: Fixture | null;
  swappingTeams: boolean;
  updatingMatch: boolean;
}>();

const emit = defineEmits<{
  swap: [];
}>();

const { liveClock, liveMinuteLabel, isTimerPaused } = inject(
  MatchTimerControlsKey,
)!;

const engine = inject(SportEngineKey);

// Period sports use the engine's own clock label (e.g. "Q2"); halves sports
// keep the football labels from the timer controls
const periodLabel = computed(() => {
  if (!props.fixture) return "";
  const e = engine?.value;
  if (e?.formatPeriodLabel) return e.formatPeriodLabel(props.fixture);
  return liveMinuteLabel.value;
});
</script>

<template>
  <div v-if="fixture" class="mc-scoreboard">
    <!-- Home team -->
    <div class="mc-team">
      <div class="mc-team__logo">
        <img
          v-if="fixture.homeTeam?.logoUrl"
          :src="fixture.homeTeam.logoUrl"
          class="w-full h-full object-cover"
        />
        <span v-else class="mc-team__initial">{{
          (
            fixture.homeTeam?.customShortName ||
            fixture.homeTeam?.customName ||
            "H"
          ).charAt(0)
        }}</span>
      </div>
      <span class="mc-team__name">{{
        fixture.homeTeam?.customShortName || fixture.homeTeam?.customName || "Home"
      }}</span>
    </div>

    <!-- Score -->
    <div class="mc-score-block">
      <div class="mc-score-numbers">
        <span class="mc-score-val">{{ fixture.homeScore ?? 0 }}</span>
        <span class="mc-score-sep">–</span>
        <span class="mc-score-val">{{ fixture.awayScore ?? 0 }}</span>
      </div>
      <div
        v-if="fixture.homePenaltyScore != null || fixture.awayPenaltyScore != null"
        class="mc-pen-badge"
      >
        <UIcon name="i-heroicons-bolt" class="w-2.5 h-2.5" />
        <span>{{ fixture.homePenaltyScore ?? 0 }} – {{ fixture.awayPenaltyScore ?? 0 }} pen</span>
      </div>
      <!-- Swap Teams Button -->
      <button
        class="mc-swap-btn"
        :disabled="swappingTeams || updatingMatch"
        @click="emit('swap')"
        title="Swap home and away"
      >
        <UIcon
          :name="
            swappingTeams
              ? 'i-heroicons-arrow-path'
              : 'i-heroicons-arrows-right-left'
          "
          :class="['w-3 h-3', swappingTeams && 'animate-spin']"
        />
        <span>Swap</span>
      </button>
      <div
        v-if="isFixtureLiveStatus(fixture.status)"
        class="mc-match-time mc-match-time--live"
        :class="{ 'mc-match-time--live-paused': isTimerPaused }"
      >
        <span class="mc-match-time__live-dot" />
        <span>{{ liveClock }}</span>
        <span class="text-[10px] opacity-75">({{ periodLabel }})</span>
      </div>
      <div v-else-if="fixture.startTime" class="mc-match-time">
        {{
          new Date(fixture.startTime).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          })
        }}
        ·
        {{
          new Date(fixture.startTime).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })
        }}
      </div>
    </div>

    <!-- Away team -->
    <div class="mc-team mc-team--away">
      <div class="mc-team__logo">
        <img
          v-if="fixture.awayTeam?.logoUrl"
          :src="fixture.awayTeam.logoUrl"
          class="w-full h-full object-cover"
        />
        <span v-else class="mc-team__initial">{{
          (
            fixture.awayTeam?.customShortName ||
            fixture.awayTeam?.customName ||
            "A"
          ).charAt(0)
        }}</span>
      </div>
      <span class="mc-team__name">{{
        fixture.awayTeam?.customShortName || fixture.awayTeam?.customName || "Away"
      }}</span>
    </div>
  </div>
</template>
