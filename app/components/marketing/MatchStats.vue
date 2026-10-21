<script setup lang="ts">
import type { Fixture, Tournament } from '~/types'
import { FixtureStatus } from '~/types'
import { resolveTeamStats } from '~/utils/matchStats'

const props = defineProps<{
  fixture: Fixture | null
  tournament?: Tournament | null
}>()

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

const resolved = computed(() => resolveTeamStats(props.fixture))
const homeStats = computed(() => resolved.value.home)
const awayStats = computed(() => resolved.value.away)
const hasStats = computed(() => resolved.value.hasRecordedStats)

// General stats
const generalMetrics = computed(() => [
  {
    key: 'shots',
    label: 'Total Shots',
    homeVal: homeStats.value.shots ?? 0,
    awayVal: awayStats.value.shots ?? 0,
    higherIsBetter: true,
  },
  {
    key: 'shotsOnTarget',
    label: 'Shots on Target',
    homeVal: homeStats.value.shotsOnTarget ?? 0,
    awayVal: awayStats.value.shotsOnTarget ?? 0,
    higherIsBetter: true,
  },
  {
    key: 'corners',
    label: 'Corner Kicks',
    homeVal: homeStats.value.corners ?? 0,
    awayVal: awayStats.value.corners ?? 0,
    higherIsBetter: true,
  },
])

// Distribution stats
const distributionMetrics = computed(() => [
  {
    key: 'passes',
    label: 'Passes Completed',
    homeVal: homeStats.value.passes ?? 0,
    awayVal: awayStats.value.passes ?? 0,
    higherIsBetter: true,
  },
  {
    key: 'saves',
    label: 'Goalkeeper Saves',
    homeVal: homeStats.value.saves ?? 0,
    awayVal: awayStats.value.saves ?? 0,
    higherIsBetter: true,
  },
])

// Discipline stats
const disciplineMetrics = computed(() => [
  {
    key: 'fouls',
    label: 'Fouls',
    homeVal: homeStats.value.fouls ?? 0,
    awayVal: awayStats.value.fouls ?? 0,
    higherIsBetter: false,
  },
  {
    key: 'offsides',
    label: 'Offsides',
    homeVal: homeStats.value.offsides ?? 0,
    awayVal: awayStats.value.offsides ?? 0,
    higherIsBetter: false,
  },
  {
    key: 'yellowCards',
    label: 'Yellow Cards',
    homeVal: homeStats.value.yellowCards ?? 0,
    awayVal: awayStats.value.yellowCards ?? 0,
    isCard: 'yellow' as const,
    higherIsBetter: false,
  },
  {
    key: 'redCards',
    label: 'Red Cards',
    homeVal: homeStats.value.redCards ?? 0,
    awayVal: awayStats.value.redCards ?? 0,
    isCard: 'red' as const,
    higherIsBetter: false,
  },
])

function calcPercentage(home: number, away: number): { homePct: number; awayPct: number } {
  const sum = (home || 0) + (away || 0)
  if (sum === 0) return { homePct: 50, awayPct: 50 }
  const homePct = Math.round((home / sum) * 100)
  return { homePct, awayPct: 100 - homePct }
}

const homeTeamName = computed(() => {
  return (
    props.fixture?.homeTeam?.customShortName ||
    props.fixture?.homeTeam?.customName ||
    props.fixture?.homeTeamPlaceholder ||
    'Home'
  )
})

const awayTeamName = computed(() => {
  return (
    props.fixture?.awayTeam?.customShortName ||
    props.fixture?.awayTeam?.customName ||
    props.fixture?.awayTeamPlaceholder ||
    'Away'
  )
})
</script>

<template>
  <div class="space-y-6">
    <!-- Empty state if no stats recorded -->
    <div
      v-if="!hasStats"
      class="border rounded-2xl p-8 sm:p-12 text-center transition-colors"
      :class="isDark ? 'bg-[#1a1a1a] border-white/[0.06]' : 'bg-white border-gray-200 shadow-sm'"
    >
      <div
        class="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 transition-colors"
        :class="isDark ? 'bg-white/[0.04] text-neutral-400' : 'bg-gray-100 text-gray-500'"
      >
        <UIcon name="i-heroicons-chart-bar" class="w-8 h-8 text-emerald-500" />
      </div>
      <h3
        class="text-base sm:text-lg font-bold mb-1.5"
        :class="isDark ? 'text-white' : 'text-gray-900'"
      >
        No Match Statistics Yet
      </h3>
      <p
        class="text-xs sm:text-sm max-w-md mx-auto"
        :class="isDark ? 'text-neutral-400' : 'text-gray-500'"
      >
        Head-to-head match statistics (possession, shots, passes, corners, and fouls) will be updated by the organizer during or after the match.
      </p>
    </div>

    <!-- Active Statistics View -->
    <div v-else class="space-y-5">
      <!-- Teams Header Pill -->
      <div
        class="border rounded-2xl p-4 sm:p-5 transition-colors"
        :class="isDark ? 'bg-[#1a1a1a] border-white/[0.06]' : 'bg-white border-gray-200 shadow-sm'"
      >
        <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <!-- Home Team -->
          <div class="flex items-center gap-2.5 min-w-0">
            <div
              class="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center ring-1"
              :class="isDark ? 'bg-white/5 ring-white/10' : 'bg-gray-100 ring-gray-200'"
            >
              <img
                v-if="fixture?.homeTeam?.logoUrl"
                :src="fixture.homeTeam.logoUrl"
                class="w-full h-full object-contain p-1"
              />
              <span v-else class="text-xs sm:text-sm font-bold text-gray-400 uppercase">
                {{ homeTeamName.charAt(0) }}
              </span>
            </div>
            <span
              class="text-xs sm:text-sm font-bold truncate"
              :class="isDark ? 'text-white' : 'text-gray-900'"
            >
              {{ homeTeamName }}
            </span>
          </div>

          <!-- Match Center Pill -->
          <div class="text-center px-2">
            <div
              v-if="fixture?.status === FixtureStatus.COMPLETED || fixture?.status === FixtureStatus.LIVE || fixture?.status === FixtureStatus.NORMAL_TIME_ENDED || fixture?.status === FixtureStatus.EXTRATIME"
              class="text-sm sm:text-base font-extrabold tracking-wider tabular-nums"
              :class="isDark ? 'text-white' : 'text-gray-900'"
            >
              {{ fixture.homeScore ?? 0 }} - {{ fixture.awayScore ?? 0 }}
            </div>
            <span
              v-else
              class="text-xs font-semibold text-gray-400 uppercase tracking-widest"
            >
              vs
            </span>
          </div>

          <!-- Away Team -->
          <div class="flex items-center justify-end gap-2.5 min-w-0">
            <span
              class="text-xs sm:text-sm font-bold truncate text-right"
              :class="isDark ? 'text-white' : 'text-gray-900'"
            >
              {{ awayTeamName }}
            </span>
            <div
              class="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center ring-1"
              :class="isDark ? 'bg-white/5 ring-white/10' : 'bg-gray-100 ring-gray-200'"
            >
              <img
                v-if="fixture?.awayTeam?.logoUrl"
                :src="fixture.awayTeam.logoUrl"
                class="w-full h-full object-contain p-1"
              />
              <span v-else class="text-xs sm:text-sm font-bold text-gray-400 uppercase">
                {{ awayTeamName.charAt(0) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Ball Possession Hero Card -->
      <div
        class="border rounded-2xl p-5 sm:p-6 transition-colors"
        :class="isDark ? 'bg-[#1a1a1a] border-white/[0.06]' : 'bg-white border-gray-200 shadow-sm'"
      >
        <div class="text-center mb-3">
          <span
            class="text-[11px] sm:text-xs font-bold uppercase tracking-wider"
            :class="isDark ? 'text-neutral-400' : 'text-gray-500'"
          >
            Ball Possession
          </span>
        </div>

        <!-- Big percentage numbers -->
        <div class="flex items-baseline justify-between mb-3 px-1">
          <div class="flex items-baseline gap-1">
            <span
              class="text-2xl sm:text-3xl font-black tabular-nums transition-colors"
              :class="
                (homeStats.possession ?? 50) >= (awayStats.possession ?? 50)
                  ? 'text-emerald-500 dark:text-[#00e676]'
                  : isDark ? 'text-neutral-400' : 'text-gray-600'
              "
            >
              {{ homeStats.possession ?? 50 }}%
            </span>
          </div>
          <div class="flex items-baseline gap-1">
            <span
              class="text-2xl sm:text-3xl font-black tabular-nums transition-colors"
              :class="
                (awayStats.possession ?? 50) > (homeStats.possession ?? 50)
                  ? 'text-sky-500 dark:text-sky-400'
                  : isDark ? 'text-neutral-400' : 'text-gray-600'
              "
            >
              {{ awayStats.possession ?? 50 }}%
            </span>
          </div>
        </div>

        <!-- Split Bar -->
        <div class="w-full h-3 rounded-full overflow-hidden flex bg-gray-100 dark:bg-white/[0.06] p-0.5 ring-1 ring-black/5 dark:ring-white/5">
          <div
            class="h-full rounded-l-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700 ease-out"
            :style="{ width: `${homeStats.possession ?? 50}%` }"
          />
          <div
            class="h-full rounded-r-full bg-gradient-to-r from-sky-400 to-sky-500 transition-all duration-700 ease-out"
            :style="{ width: `${awayStats.possession ?? 50}%` }"
          />
        </div>
      </div>

      <!-- General Match Stats -->
      <div
        class="border rounded-2xl overflow-hidden transition-colors"
        :class="isDark ? 'bg-[#1a1a1a] border-white/[0.06]' : 'bg-white border-gray-200 shadow-sm'"
      >
        <div class="px-5 py-3.5 border-b border-gray-100 dark:border-white/[0.06] flex items-center justify-between">
          <h4 class="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <UIcon name="i-heroicons-fire" class="w-4 h-4 text-emerald-500" />
            <span>Attacking & General</span>
          </h4>
        </div>

        <div class="p-4 sm:p-5 divide-y divide-gray-100 dark:divide-white/[0.04]">
          <div
            v-for="metric in generalMetrics"
            :key="metric.key"
            class="py-3 first:pt-1 last:pb-1 space-y-1.5"
          >
            <!-- Numbers & Label -->
            <div class="flex items-center justify-between text-xs sm:text-sm font-bold">
              <span
                class="tabular-nums w-12 text-left"
                :class="
                  metric.homeVal > metric.awayVal
                    ? 'text-emerald-500 dark:text-[#00e676]'
                    : isDark ? 'text-neutral-400' : 'text-gray-600'
                "
              >
                {{ metric.homeVal }}
              </span>
              <span class="text-xs font-semibold text-gray-500 dark:text-neutral-400 text-center flex-1">
                {{ metric.label }}
              </span>
              <span
                class="tabular-nums w-12 text-right"
                :class="
                  metric.awayVal > metric.homeVal
                    ? 'text-sky-500 dark:text-sky-400'
                    : isDark ? 'text-neutral-400' : 'text-gray-600'
                "
              >
                {{ metric.awayVal }}
              </span>
            </div>

            <!-- Comparison Bar -->
            <div class="grid grid-cols-2 gap-1.5 h-2">
              <!-- Home bar (fills from right to left toward center) -->
              <div class="w-full bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden flex justify-end">
                <div
                  class="h-full rounded-full transition-all duration-700 ease-out"
                  :class="metric.homeVal >= metric.awayVal && metric.homeVal > 0 ? 'bg-emerald-500' : 'bg-gray-400 dark:bg-neutral-600'"
                  :style="{ width: `${calcPercentage(metric.homeVal, metric.awayVal).homePct}%` }"
                />
              </div>

              <!-- Away bar (fills from left to right toward away) -->
              <div class="w-full bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden flex justify-start">
                <div
                  class="h-full rounded-full transition-all duration-700 ease-out"
                  :class="metric.awayVal >= metric.homeVal && metric.awayVal > 0 ? 'bg-sky-500' : 'bg-gray-400 dark:bg-neutral-600'"
                  :style="{ width: `${calcPercentage(metric.homeVal, metric.awayVal).awayPct}%` }"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Distribution & Defensive Stats -->
      <div
        class="border rounded-2xl overflow-hidden transition-colors"
        :class="isDark ? 'bg-[#1a1a1a] border-white/[0.06]' : 'bg-white border-gray-200 shadow-sm'"
      >
        <div class="px-5 py-3.5 border-b border-gray-100 dark:border-white/[0.06] flex items-center justify-between">
          <h4 class="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <UIcon name="i-heroicons-arrow-path-rounded-square" class="w-4 h-4 text-sky-500" />
            <span>Distribution & Defending</span>
          </h4>
        </div>

        <div class="p-4 sm:p-5 divide-y divide-gray-100 dark:divide-white/[0.04]">
          <div
            v-for="metric in distributionMetrics"
            :key="metric.key"
            class="py-3 first:pt-1 last:pb-1 space-y-1.5"
          >
            <!-- Numbers & Label -->
            <div class="flex items-center justify-between text-xs sm:text-sm font-bold">
              <span
                class="tabular-nums w-12 text-left"
                :class="
                  metric.homeVal > metric.awayVal
                    ? 'text-emerald-500 dark:text-[#00e676]'
                    : isDark ? 'text-neutral-400' : 'text-gray-600'
                "
              >
                {{ metric.homeVal }}
              </span>
              <span class="text-xs font-semibold text-gray-500 dark:text-neutral-400 text-center flex-1">
                {{ metric.label }}
              </span>
              <span
                class="tabular-nums w-12 text-right"
                :class="
                  metric.awayVal > metric.homeVal
                    ? 'text-sky-500 dark:text-sky-400'
                    : isDark ? 'text-neutral-400' : 'text-gray-600'
                "
              >
                {{ metric.awayVal }}
              </span>
            </div>

            <!-- Comparison Bar -->
            <div class="grid grid-cols-2 gap-1.5 h-2">
              <div class="w-full bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden flex justify-end">
                <div
                  class="h-full rounded-full transition-all duration-700 ease-out"
                  :class="metric.homeVal >= metric.awayVal && metric.homeVal > 0 ? 'bg-emerald-500' : 'bg-gray-400 dark:bg-neutral-600'"
                  :style="{ width: `${calcPercentage(metric.homeVal, metric.awayVal).homePct}%` }"
                />
              </div>
              <div class="w-full bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden flex justify-start">
                <div
                  class="h-full rounded-full transition-all duration-700 ease-out"
                  :class="metric.awayVal >= metric.homeVal && metric.awayVal > 0 ? 'bg-sky-500' : 'bg-gray-400 dark:bg-neutral-600'"
                  :style="{ width: `${calcPercentage(metric.homeVal, metric.awayVal).awayPct}%` }"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Discipline Stats -->
      <div
        class="border rounded-2xl overflow-hidden transition-colors"
        :class="isDark ? 'bg-[#1a1a1a] border-white/[0.06]' : 'bg-white border-gray-200 shadow-sm'"
      >
        <div class="px-5 py-3.5 border-b border-gray-100 dark:border-white/[0.06] flex items-center justify-between">
          <h4 class="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <UIcon name="i-heroicons-shield-exclamation" class="w-4 h-4 text-amber-500" />
            <span>Discipline</span>
          </h4>
        </div>

        <div class="p-4 sm:p-5 divide-y divide-gray-100 dark:divide-white/[0.04]">
          <div
            v-for="metric in disciplineMetrics"
            :key="metric.key"
            class="py-3 first:pt-1 last:pb-1 space-y-1.5"
          >
            <!-- Numbers & Label -->
            <div class="flex items-center justify-between text-xs sm:text-sm font-bold">
              <span
                class="tabular-nums w-12 text-left flex items-center gap-1.5"
                :class="
                  metric.homeVal > 0
                    ? metric.isCard === 'red' ? 'text-red-500' : metric.isCard === 'yellow' ? 'text-amber-500' : 'text-gray-900 dark:text-white'
                    : isDark ? 'text-neutral-400' : 'text-gray-500'
                "
              >
                <span
                  v-if="metric.isCard === 'yellow' && metric.homeVal > 0"
                  class="w-2.5 h-3.5 bg-yellow-400 rounded-[1px] inline-block shadow-sm"
                />
                <span
                  v-else-if="metric.isCard === 'red' && metric.homeVal > 0"
                  class="w-2.5 h-3.5 bg-red-500 rounded-[1px] inline-block shadow-sm"
                />
                {{ metric.homeVal }}
              </span>

              <span class="text-xs font-semibold text-gray-500 dark:text-neutral-400 text-center flex-1">
                {{ metric.label }}
              </span>

              <span
                class="tabular-nums w-12 text-right flex items-center justify-end gap-1.5"
                :class="
                  metric.awayVal > 0
                    ? metric.isCard === 'red' ? 'text-red-500' : metric.isCard === 'yellow' ? 'text-amber-500' : 'text-gray-900 dark:text-white'
                    : isDark ? 'text-neutral-400' : 'text-gray-500'
                "
              >
                {{ metric.awayVal }}
                <span
                  v-if="metric.isCard === 'yellow' && metric.awayVal > 0"
                  class="w-2.5 h-3.5 bg-yellow-400 rounded-[1px] inline-block shadow-sm"
                />
                <span
                  v-else-if="metric.isCard === 'red' && metric.awayVal > 0"
                  class="w-2.5 h-3.5 bg-red-500 rounded-[1px] inline-block shadow-sm"
                />
              </span>
            </div>

            <!-- Comparison Bar -->
            <div class="grid grid-cols-2 gap-1.5 h-2">
              <div class="w-full bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden flex justify-end">
                <div
                  class="h-full rounded-full transition-all duration-700 ease-out"
                  :class="
                    metric.isCard === 'red'
                      ? 'bg-red-500'
                      : metric.isCard === 'yellow'
                      ? 'bg-amber-400'
                      : metric.homeVal >= metric.awayVal && metric.homeVal > 0
                      ? 'bg-amber-500'
                      : 'bg-gray-400 dark:bg-neutral-600'
                  "
                  :style="{ width: `${calcPercentage(metric.homeVal, metric.awayVal).homePct}%` }"
                />
              </div>
              <div class="w-full bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden flex justify-start">
                <div
                  class="h-full rounded-full transition-all duration-700 ease-out"
                  :class="
                    metric.isCard === 'red'
                      ? 'bg-red-500'
                      : metric.isCard === 'yellow'
                      ? 'bg-amber-400'
                      : metric.awayVal >= metric.homeVal && metric.awayVal > 0
                      ? 'bg-amber-500'
                      : 'bg-gray-400 dark:bg-neutral-600'
                  "
                  :style="{ width: `${calcPercentage(metric.homeVal, metric.awayVal).awayPct}%` }"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
