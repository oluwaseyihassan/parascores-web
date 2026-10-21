<script setup lang="ts">
import type { Fixture, FixtureMatchStats, TeamMatchStats } from '~/types'
import { resolveTeamStats, getEventCards } from '~/utils/matchStats'

const props = defineProps<{
  fixture: Fixture | null
  tournament?: any
}>()

const emit = defineEmits<{
  'stats-updated': [fixture: Fixture]
}>()

const fixtureStore = useFixtureStore()
const toast = useToast()
const { extractErrorMessage } = useErrors()

// Local stats state
const stats = reactive<FixtureMatchStats>({
  home: {
    possession: 50,
    shots: 0,
    shotsOnTarget: 0,
    corners: 0,
    fouls: 0,
    offsides: 0,
    saves: 0,
    passes: 0,
    yellowCards: 0,
    redCards: 0,
  },
  away: {
    possession: 50,
    shots: 0,
    shotsOnTarget: 0,
    corners: 0,
    fouls: 0,
    offsides: 0,
    saves: 0,
    passes: 0,
    yellowCards: 0,
    redCards: 0,
  },
})

const saving = ref(false)
const showLivePreview = ref(true)

// Initialize from fixture
function initStatsFromFixture() {
  if (!props.fixture) return
  const resolved = resolveTeamStats(props.fixture)
  Object.assign(stats.home, resolved.home)
  Object.assign(stats.away, resolved.away)
}

watch(() => props.fixture, () => {
  initStatsFromFixture()
}, { immediate: true, deep: true })

const eventCards = computed(() => getEventCards(props.fixture))

// Possession helpers
function updateHomePossession(val: number | string) {
  const num = Math.min(100, Math.max(0, Number(val) || 0))
  stats.home.possession = num
  stats.away.possession = 100 - num
}

function updateAwayPossession(val: number | string) {
  const num = Math.min(100, Math.max(0, Number(val) || 0))
  stats.away.possession = num
  stats.home.possession = 100 - num
}

function setPossessionPreset(homePct: number) {
  stats.home.possession = homePct
  stats.away.possession = 100 - homePct
}

// Stepper helpers
function adjustStat(team: 'home' | 'away', key: keyof TeamMatchStats, delta: number) {
  const current = Number(stats[team][key]) || 0
  const updated = Math.max(0, current + delta)
  stats[team][key] = updated
}

// Reset stats
function resetStats() {
  stats.home = {
    possession: 50,
    shots: 0,
    shotsOnTarget: 0,
    corners: 0,
    fouls: 0,
    offsides: 0,
    saves: 0,
    passes: 0,
    yellowCards: eventCards.value.homeYellow,
    redCards: eventCards.value.homeRed,
  }
  stats.away = {
    possession: 50,
    shots: 0,
    shotsOnTarget: 0,
    corners: 0,
    fouls: 0,
    offsides: 0,
    saves: 0,
    passes: 0,
    yellowCards: eventCards.value.awayYellow,
    redCards: eventCards.value.awayRed,
  }
  toast.add({
    title: 'Reset to defaults',
    description: 'Values reset. Click Save to apply.',
    color: 'neutral',
  })
}

// Save stats to fixture.config
async function saveStats() {
  if (!props.fixture?.id) return
  saving.value = true
  try {
    const existingConfig = props.fixture.config || {}
    const updatedConfig = {
      ...existingConfig,
      stats: {
        home: { ...stats.home },
        away: { ...stats.away },
      },
    }

    const res = await fixtureStore.updateFixture(props.fixture.id, {
      config: updatedConfig,
    })

    const updatedFixture = res?.data || {
      ...props.fixture,
      config: updatedConfig,
    }

    emit('stats-updated', updatedFixture)
    toast.add({
      title: 'Match statistics saved',
      description: 'Public match page updated with latest stats.',
      color: 'success',
    })
  } catch (err: any) {
    console.error('Failed to save stats:', err)
    toast.add({
      title: 'Failed to save statistics',
      description: extractErrorMessage(err) || 'An unexpected error occurred.',
      color: 'error',
    })
  } finally {
    saving.value = false
  }
}

const homeName = computed(() => {
  return (
    props.fixture?.homeTeam?.customShortName ||
    props.fixture?.homeTeam?.customName ||
    props.fixture?.homeTeamPlaceholder ||
    'Home'
  )
})

const awayName = computed(() => {
  return (
    props.fixture?.awayTeam?.customShortName ||
    props.fixture?.awayTeam?.customName ||
    props.fixture?.awayTeamPlaceholder ||
    'Away'
  )
})

const previewFixture = computed(() => {
  if (!props.fixture) return null
  return {
    ...props.fixture,
    config: {
      ...(props.fixture.config || {}),
      stats: {
        home: { ...stats.home },
        away: { ...stats.away },
      },
    },
  }
})
</script>

<template>
  <div class="space-y-4">
    <!-- Top Actions Bar -->
    <div class="flex items-center justify-between pb-1">
      <div>
        <h3 class="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <UIcon name="i-heroicons-chart-bar" class="w-4 h-4 text-emerald-500" />
          <span>Match Statistics</span>
        </h3>
        <p class="text-[11px] text-gray-500 dark:text-neutral-400">
          Enter match statistics for both teams to display on the public match page.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          size="xs"
          variant="ghost"
          color="neutral"
          icon="i-heroicons-arrow-path"
          label="Reset"
          :disabled="saving"
          @click="resetStats"
        />
        <UButton
          size="xs"
          color="primary"
          icon="i-heroicons-check"
          label="Save Statistics"
          :loading="saving"
          @click="saveStats"
        />
      </div>
    </div>

    <!-- Teams Legend Header -->
    <div class="bg-gray-50 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/[0.06] rounded-xl p-3">
      <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs font-bold">
        <!-- Home -->
        <div class="flex items-center gap-2 min-w-0">
          <div class="w-6 h-6 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
            <img
              v-if="fixture?.homeTeam?.logoUrl"
              :src="fixture.homeTeam.logoUrl"
              class="w-full h-full object-contain p-0.5"
            />
            <span v-else>{{ homeName.charAt(0) }}</span>
          </div>
          <span class="truncate text-gray-900 dark:text-white">{{ homeName }}</span>
          <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-semibold">Home</span>
        </div>

        <!-- Center Indicator -->
        <div class="text-[11px] font-semibold text-gray-400 uppercase tracking-widest px-2">
          VS
        </div>

        <!-- Away -->
        <div class="flex items-center justify-end gap-2 min-w-0">
          <span class="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-500 font-semibold">Away</span>
          <span class="truncate text-gray-900 dark:text-white text-right">{{ awayName }}</span>
          <div class="w-6 h-6 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-sky-500/10 text-sky-500 text-[10px] font-bold">
            <img
              v-if="fixture?.awayTeam?.logoUrl"
              :src="fixture.awayTeam.logoUrl"
              class="w-full h-full object-contain p-0.5"
            />
            <span v-else>{{ awayName.charAt(0) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 1. Ball Possession Section -->
    <div class="border border-gray-200/80 dark:border-white/[0.06] rounded-xl p-4 bg-white dark:bg-[#1f1f1f] shadow-sm">
      <div class="flex items-center justify-between mb-3">
        <label class="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
          <UIcon name="i-heroicons-clock" class="w-3.5 h-3.5 text-emerald-500" />
          <span>Ball Possession (%)</span>
        </label>
        <div class="flex gap-1">
          <button
            type="button"
            class="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-neutral-300 transition-colors cursor-pointer"
            @click="setPossessionPreset(50)"
          >
            50/50
          </button>
          <button
            type="button"
            class="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-neutral-300 transition-colors cursor-pointer"
            @click="setPossessionPreset(60)"
          >
            60/40
          </button>
          <button
            type="button"
            class="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-neutral-300 transition-colors cursor-pointer"
            @click="setPossessionPreset(70)"
          >
            70/30
          </button>
        </div>
      </div>

      <!-- Numeric inputs + slider -->
      <div class="grid grid-cols-[70px_1fr_70px] items-center gap-3">
        <!-- Home input -->
        <div>
          <div class="relative">
            <input
              type="number"
              min="0"
              max="100"
              :value="stats.home.possession"
              @input="updateHomePossession(($event.target as HTMLInputElement).value)"
              class="w-full text-center text-sm font-bold py-1.5 px-2 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <span class="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">%</span>
          </div>
        </div>

        <!-- Slider -->
        <div class="px-1">
          <input
            type="range"
            min="0"
            max="100"
            :value="stats.home.possession"
            @input="updateHomePossession(($event.target as HTMLInputElement).value)"
            class="w-full accent-emerald-500 cursor-pointer h-2 bg-gray-200 dark:bg-white/10 rounded-lg"
          />
        </div>

        <!-- Away input -->
        <div>
          <div class="relative">
            <input
              type="number"
              min="0"
              max="100"
              :value="stats.away.possession"
              @input="updateAwayPossession(($event.target as HTMLInputElement).value)"
              class="w-full text-center text-sm font-bold py-1.5 px-2 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            <span class="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. Attacking Stats Section -->
    <div class="border border-gray-200/80 dark:border-white/[0.06] rounded-xl overflow-hidden bg-white dark:bg-[#1f1f1f] shadow-sm">
      <div class="px-4 py-2.5 bg-gray-50/70 dark:bg-white/[0.02] border-b border-gray-200/80 dark:border-white/[0.06]">
        <h4 class="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
          <UIcon name="i-heroicons-fire" class="w-3.5 h-3.5 text-emerald-500" />
          <span>Attacking & General</span>
        </h4>
      </div>

      <div class="p-3 divide-y divide-gray-100 dark:divide-white/[0.04]">
        <!-- Shots -->
        <div class="py-2.5 grid grid-cols-[110px_1fr_110px] items-center gap-2">
          <!-- Home stepper -->
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-gray-600 dark:text-neutral-300 font-bold text-xs cursor-pointer"
              @click="adjustStat('home', 'shots', -1)"
            >
              -
            </button>
            <input
              type="number"
              min="0"
              v-model.number="stats.home.shots"
              class="w-10 text-center text-xs font-bold py-1 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white"
            />
            <button
              type="button"
              class="w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs cursor-pointer"
              @click="adjustStat('home', 'shots', 1)"
            >
              +
            </button>
          </div>

          <!-- Label -->
          <span class="text-xs font-semibold text-center text-gray-700 dark:text-neutral-300">
            Total Shots
          </span>

          <!-- Away stepper -->
          <div class="flex items-center justify-end gap-1">
            <button
              type="button"
              class="w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-gray-600 dark:text-neutral-300 font-bold text-xs cursor-pointer"
              @click="adjustStat('away', 'shots', -1)"
            >
              -
            </button>
            <input
              type="number"
              min="0"
              v-model.number="stats.away.shots"
              class="w-10 text-center text-xs font-bold py-1 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white"
            />
            <button
              type="button"
              class="w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-sky-600 dark:text-sky-400 font-bold text-xs cursor-pointer"
              @click="adjustStat('away', 'shots', 1)"
            >
              +
            </button>
          </div>
        </div>

        <!-- Shots on target -->
        <div class="py-2.5 grid grid-cols-[110px_1fr_110px] items-center gap-2">
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-gray-600 dark:text-neutral-300 font-bold text-xs cursor-pointer"
              @click="adjustStat('home', 'shotsOnTarget', -1)"
            >
              -
            </button>
            <input
              type="number"
              min="0"
              v-model.number="stats.home.shotsOnTarget"
              class="w-10 text-center text-xs font-bold py-1 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white"
            />
            <button
              type="button"
              class="w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs cursor-pointer"
              @click="adjustStat('home', 'shotsOnTarget', 1)"
            >
              +
            </button>
          </div>

          <span class="text-xs font-semibold text-center text-gray-700 dark:text-neutral-300">
            Shots on Target
          </span>

          <div class="flex items-center justify-end gap-1">
            <button
              type="button"
              class="w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-gray-600 dark:text-neutral-300 font-bold text-xs cursor-pointer"
              @click="adjustStat('away', 'shotsOnTarget', -1)"
            >
              -
            </button>
            <input
              type="number"
              min="0"
              v-model.number="stats.away.shotsOnTarget"
              class="w-10 text-center text-xs font-bold py-1 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white"
            />
            <button
              type="button"
              class="w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-sky-600 dark:text-sky-400 font-bold text-xs cursor-pointer"
              @click="adjustStat('away', 'shotsOnTarget', 1)"
            >
              +
            </button>
          </div>
        </div>

        <!-- Corners -->
        <div class="py-2.5 grid grid-cols-[110px_1fr_110px] items-center gap-2">
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-gray-600 dark:text-neutral-300 font-bold text-xs cursor-pointer"
              @click="adjustStat('home', 'corners', -1)"
            >
              -
            </button>
            <input
              type="number"
              min="0"
              v-model.number="stats.home.corners"
              class="w-10 text-center text-xs font-bold py-1 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white"
            />
            <button
              type="button"
              class="w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs cursor-pointer"
              @click="adjustStat('home', 'corners', 1)"
            >
              +
            </button>
          </div>

          <span class="text-xs font-semibold text-center text-gray-700 dark:text-neutral-300">
            Corner Kicks
          </span>

          <div class="flex items-center justify-end gap-1">
            <button
              type="button"
              class="w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-gray-600 dark:text-neutral-300 font-bold text-xs cursor-pointer"
              @click="adjustStat('away', 'corners', -1)"
            >
              -
            </button>
            <input
              type="number"
              min="0"
              v-model.number="stats.away.corners"
              class="w-10 text-center text-xs font-bold py-1 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white"
            />
            <button
              type="button"
              class="w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-sky-600 dark:text-sky-400 font-bold text-xs cursor-pointer"
              @click="adjustStat('away', 'corners', 1)"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. Distribution & Defending Section -->
    <div class="border border-gray-200/80 dark:border-white/[0.06] rounded-xl overflow-hidden bg-white dark:bg-[#1f1f1f] shadow-sm">
      <div class="px-4 py-2.5 bg-gray-50/70 dark:bg-white/[0.02] border-b border-gray-200/80 dark:border-white/[0.06]">
        <h4 class="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
          <UIcon name="i-heroicons-arrow-path-rounded-square" class="w-3.5 h-3.5 text-sky-500" />
          <span>Distribution & Defending</span>
        </h4>
      </div>

      <div class="p-3 divide-y divide-gray-100 dark:divide-white/[0.04]">
        <!-- Passes -->
        <div class="py-2.5 grid grid-cols-[110px_1fr_110px] items-center gap-2">
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-gray-600 dark:text-neutral-300 font-bold text-xs cursor-pointer"
              @click="adjustStat('home', 'passes', -10)"
              title="-10 passes"
            >
              -
            </button>
            <input
              type="number"
              min="0"
              v-model.number="stats.home.passes"
              class="w-12 text-center text-xs font-bold py-1 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white"
            />
            <button
              type="button"
              class="w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs cursor-pointer"
              @click="adjustStat('home', 'passes', 10)"
              title="+10 passes"
            >
              +
            </button>
          </div>

          <span class="text-xs font-semibold text-center text-gray-700 dark:text-neutral-300">
            Passes Completed
          </span>

          <div class="flex items-center justify-end gap-1">
            <button
              type="button"
              class="w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-gray-600 dark:text-neutral-300 font-bold text-xs cursor-pointer"
              @click="adjustStat('away', 'passes', -10)"
              title="-10 passes"
            >
              -
            </button>
            <input
              type="number"
              min="0"
              v-model.number="stats.away.passes"
              class="w-12 text-center text-xs font-bold py-1 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white"
            />
            <button
              type="button"
              class="w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-sky-600 dark:text-sky-400 font-bold text-xs cursor-pointer"
              @click="adjustStat('away', 'passes', 10)"
              title="+10 passes"
            >
              +
            </button>
          </div>
        </div>

        <!-- Goalkeeper saves -->
        <div class="py-2.5 grid grid-cols-[110px_1fr_110px] items-center gap-2">
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-gray-600 dark:text-neutral-300 font-bold text-xs cursor-pointer"
              @click="adjustStat('home', 'saves', -1)"
            >
              -
            </button>
            <input
              type="number"
              min="0"
              v-model.number="stats.home.saves"
              class="w-10 text-center text-xs font-bold py-1 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white"
            />
            <button
              type="button"
              class="w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs cursor-pointer"
              @click="adjustStat('home', 'saves', 1)"
            >
              +
            </button>
          </div>

          <span class="text-xs font-semibold text-center text-gray-700 dark:text-neutral-300">
            Goalkeeper Saves
          </span>

          <div class="flex items-center justify-end gap-1">
            <button
              type="button"
              class="w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-gray-600 dark:text-neutral-300 font-bold text-xs cursor-pointer"
              @click="adjustStat('away', 'saves', -1)"
            >
              -
            </button>
            <input
              type="number"
              min="0"
              v-model.number="stats.away.saves"
              class="w-10 text-center text-xs font-bold py-1 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white"
            />
            <button
              type="button"
              class="w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-sky-600 dark:text-sky-400 font-bold text-xs cursor-pointer"
              @click="adjustStat('away', 'saves', 1)"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 4. Discipline Section -->
    <div class="border border-gray-200/80 dark:border-white/[0.06] rounded-xl overflow-hidden bg-white dark:bg-[#1f1f1f] shadow-sm">
      <div class="px-4 py-2.5 bg-gray-50/70 dark:bg-white/[0.02] border-b border-gray-200/80 dark:border-white/[0.06]">
        <h4 class="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
          <UIcon name="i-heroicons-shield-exclamation" class="w-3.5 h-3.5 text-amber-500" />
          <span>Discipline & Fouls</span>
        </h4>
      </div>

      <div class="p-3 divide-y divide-gray-100 dark:divide-white/[0.04]">
        <!-- Fouls -->
        <div class="py-2.5 grid grid-cols-[110px_1fr_110px] items-center gap-2">
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-gray-600 dark:text-neutral-300 font-bold text-xs cursor-pointer"
              @click="adjustStat('home', 'fouls', -1)"
            >
              -
            </button>
            <input
              type="number"
              min="0"
              v-model.number="stats.home.fouls"
              class="w-10 text-center text-xs font-bold py-1 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white"
            />
            <button
              type="button"
              class="w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-xs cursor-pointer"
              @click="adjustStat('home', 'fouls', 1)"
            >
              +
            </button>
          </div>

          <span class="text-xs font-semibold text-center text-gray-700 dark:text-neutral-300">
            Fouls Committed
          </span>

          <div class="flex items-center justify-end gap-1">
            <button
              type="button"
              class="w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-gray-600 dark:text-neutral-300 font-bold text-xs cursor-pointer"
              @click="adjustStat('away', 'fouls', -1)"
            >
              -
            </button>
            <input
              type="number"
              min="0"
              v-model.number="stats.away.fouls"
              class="w-10 text-center text-xs font-bold py-1 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white"
            />
            <button
              type="button"
              class="w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-xs cursor-pointer"
              @click="adjustStat('away', 'fouls', 1)"
            >
              +
            </button>
          </div>
        </div>

        <!-- Offsides -->
        <div class="py-2.5 grid grid-cols-[110px_1fr_110px] items-center gap-2">
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-gray-600 dark:text-neutral-300 font-bold text-xs cursor-pointer"
              @click="adjustStat('home', 'offsides', -1)"
            >
              -
            </button>
            <input
              type="number"
              min="0"
              v-model.number="stats.home.offsides"
              class="w-10 text-center text-xs font-bold py-1 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white"
            />
            <button
              type="button"
              class="w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-xs cursor-pointer"
              @click="adjustStat('home', 'offsides', 1)"
            >
              +
            </button>
          </div>

          <span class="text-xs font-semibold text-center text-gray-700 dark:text-neutral-300">
            Offsides
          </span>

          <div class="flex items-center justify-end gap-1">
            <button
              type="button"
              class="w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-gray-600 dark:text-neutral-300 font-bold text-xs cursor-pointer"
              @click="adjustStat('away', 'offsides', -1)"
            >
              -
            </button>
            <input
              type="number"
              min="0"
              v-model.number="stats.away.offsides"
              class="w-10 text-center text-xs font-bold py-1 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white"
            />
            <button
              type="button"
              class="w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-xs cursor-pointer"
              @click="adjustStat('away', 'offsides', 1)"
            >
              +
            </button>
          </div>
        </div>

        <!-- Yellow Cards -->
        <div class="py-2.5 grid grid-cols-[110px_1fr_110px] items-center gap-2">
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-gray-600 dark:text-neutral-300 font-bold text-xs cursor-pointer"
              @click="adjustStat('home', 'yellowCards', -1)"
            >
              -
            </button>
            <input
              type="number"
              min="0"
              v-model.number="stats.home.yellowCards"
              class="w-10 text-center text-xs font-bold py-1 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 text-amber-500"
            />
            <button
              type="button"
              class="w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-xs cursor-pointer"
              @click="adjustStat('home', 'yellowCards', 1)"
            >
              +
            </button>
          </div>

          <div class="text-center">
            <div class="text-xs font-semibold text-gray-700 dark:text-neutral-300 flex items-center justify-center gap-1">
              <span class="w-2.5 h-3.5 bg-yellow-400 rounded-[1px] inline-block shadow-sm"></span>
              <span>Yellow Cards</span>
            </div>
            <div v-if="eventCards.homeYellow || eventCards.awayYellow" class="text-[10px] text-gray-400">
              Synced events: {{ eventCards.homeYellow }}H - {{ eventCards.awayYellow }}A
            </div>
          </div>

          <div class="flex items-center justify-end gap-1">
            <button
              type="button"
              class="w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-gray-600 dark:text-neutral-300 font-bold text-xs cursor-pointer"
              @click="adjustStat('away', 'yellowCards', -1)"
            >
              -
            </button>
            <input
              type="number"
              min="0"
              v-model.number="stats.away.yellowCards"
              class="w-10 text-center text-xs font-bold py-1 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 text-amber-500"
            />
            <button
              type="button"
              class="w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-xs cursor-pointer"
              @click="adjustStat('away', 'yellowCards', 1)"
            >
              +
            </button>
          </div>
        </div>

        <!-- Red Cards -->
        <div class="py-2.5 grid grid-cols-[110px_1fr_110px] items-center gap-2">
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-gray-600 dark:text-neutral-300 font-bold text-xs cursor-pointer"
              @click="adjustStat('home', 'redCards', -1)"
            >
              -
            </button>
            <input
              type="number"
              min="0"
              v-model.number="stats.home.redCards"
              class="w-10 text-center text-xs font-bold py-1 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 text-red-500"
            />
            <button
              type="button"
              class="w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-red-600 dark:text-red-400 font-bold text-xs cursor-pointer"
              @click="adjustStat('home', 'redCards', 1)"
            >
              +
            </button>
          </div>

          <div class="text-center">
            <div class="text-xs font-semibold text-gray-700 dark:text-neutral-300 flex items-center justify-center gap-1">
              <span class="w-2.5 h-3.5 bg-red-500 rounded-[1px] inline-block shadow-sm"></span>
              <span>Red Cards</span>
            </div>
            <div v-if="eventCards.homeRed || eventCards.awayRed" class="text-[10px] text-gray-400">
              Synced events: {{ eventCards.homeRed }}H - {{ eventCards.awayRed }}A
            </div>
          </div>

          <div class="flex items-center justify-end gap-1">
            <button
              type="button"
              class="w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-gray-600 dark:text-neutral-300 font-bold text-xs cursor-pointer"
              @click="adjustStat('away', 'redCards', -1)"
            >
              -
            </button>
            <input
              type="number"
              min="0"
              v-model.number="stats.away.redCards"
              class="w-10 text-center text-xs font-bold py-1 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 text-red-500"
            />
            <button
              type="button"
              class="w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-red-600 dark:text-red-400 font-bold text-xs cursor-pointer"
              @click="adjustStat('away', 'redCards', 1)"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Live Preview Accordion/Card -->
    <div class="border border-gray-200/80 dark:border-white/[0.06] rounded-xl overflow-hidden bg-white dark:bg-[#1f1f1f]">
      <button
        type="button"
        @click="showLivePreview = !showLivePreview"
        class="w-full px-4 py-2.5 flex items-center justify-between text-xs font-bold text-gray-700 dark:text-neutral-300 bg-gray-50/70 dark:bg-white/[0.02] hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
      >
        <div class="flex items-center gap-1.5">
          <UIcon name="i-heroicons-eye" class="w-3.5 h-3.5 text-emerald-500" />
          <span>Live Public Preview</span>
        </div>
        <UIcon
          :name="showLivePreview ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
          class="w-4 h-4 text-gray-400"
        />
      </button>

      <div v-show="showLivePreview" class="p-4 border-t border-gray-200/80 dark:border-white/[0.06]">
        <MarketingMatchStats
          :fixture="previewFixture"
          :tournament="tournament"
        />
      </div>
    </div>

    <!-- Bottom Save Button -->
    <div class="flex justify-end pt-2">
      <UButton
        color="primary"
        icon="i-heroicons-check"
        label="Save Match Statistics"
        :loading="saving"
        @click="saveStats"
      />
    </div>
  </div>
</template>
