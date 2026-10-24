<script setup lang="ts">
import type { Fixture, Tournament } from '~/types'
import { FixtureStatus } from '~/types'
import type { Prediction, FixturePredictionStats } from '~/types/prediction'
import {
  isFixturePredictionLocked,
  calculatePredictionPoints,
  getTournamentPredictionConfig,
} from '~/stores/prediction'

const props = withDefaults(
  defineProps<{
    fixture: Fixture
    tournament: Tournament
    prediction?: Prediction
    stats?: FixturePredictionStats
    compact?: boolean
  }>(),
  {
    prediction: undefined,
    stats: undefined,
    compact: false,
  },
)

const emit = defineEmits<{
  (e: 'saved', payload: { fixtureId: string; homeScore: number; awayScore: number }): void
}>()

const predictionStore = usePredictionStore()
const authStore = useAuthStore()
const toast = useToast()

const config = computed(() => getTournamentPredictionConfig(props.tournament))
const isLocked = computed(() => isFixturePredictionLocked(props.fixture))

// Score input states
const homeScore = ref<number>(props.prediction?.homeScore ?? 1)
const awayScore = ref<number>(props.prediction?.awayScore ?? 0)
const isSaved = ref<boolean>(!!props.prediction)
const isEditing = ref<boolean>(!props.prediction)
const isSubmitting = ref<boolean>(false)

watch(
  () => props.prediction,
  (newPred) => {
    if (newPred) {
      homeScore.value = newPred.homeScore
      awayScore.value = newPred.awayScore
      isSaved.value = true
      isEditing.value = false
    }
  },
  { immediate: true },
)

// Computed evaluation for completed matches
const evaluation = computed(() => {
  if (!props.prediction) return null
  return calculatePredictionPoints(props.prediction, props.fixture, config.value)
})

const selectedOutcome = computed<'home' | 'draw' | 'away'>(() => {
  if (homeScore.value > awayScore.value) return 'home'
  if (homeScore.value === awayScore.value) return 'draw'
  return 'away'
})

function selectOutcome(type: 'home' | 'draw' | 'away') {
  if (isLocked.value) return
  isEditing.value = true
  if (type === 'home') {
    if (homeScore.value <= awayScore.value) {
      homeScore.value = 2
      awayScore.value = 1
    }
  } else if (type === 'draw') {
    if (homeScore.value !== awayScore.value) {
      homeScore.value = 1
      awayScore.value = 1
    }
  } else {
    if (awayScore.value <= homeScore.value) {
      homeScore.value = 1
      awayScore.value = 2
    }
  }
}

function adjustScore(team: 'home' | 'away', delta: number) {
  if (isLocked.value) return
  isEditing.value = true
  if (team === 'home') {
    homeScore.value = Math.max(0, Math.min(20, homeScore.value + delta))
  } else {
    awayScore.value = Math.max(0, Math.min(20, awayScore.value + delta))
  }
}

// Countdown / Kickoff display
const kickoffText = computed(() => {
  if (!props.fixture.startTime) return 'Time TBA'
  const date = new Date(props.fixture.startTime)
  if (Number.isNaN(date.getTime())) return 'Time TBA'

  const now = Date.now()
  const diff = date.getTime() - now

  if (diff <= 0) {
    if (props.fixture.status === FixtureStatus.COMPLETED) return 'Full Time'
    if (props.fixture.status === FixtureStatus.LIVE) return 'Match Live'
    return 'Started'
  }

  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)

  if (hours < 24) {
    if (hours === 0) return `Locks in ${minutes}m`
    return `Locks in ${hours}h ${minutes}m`
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
})

const homeTeamName = computed(
  () =>
    props.fixture.homeTeam?.customName ||
    props.fixture.homeTeam?.customShortName ||
    props.fixture.homeTeamPlaceholder ||
    'Home Team',
)

const awayTeamName = computed(
  () =>
    props.fixture.awayTeam?.customName ||
    props.fixture.awayTeam?.customShortName ||
    props.fixture.awayTeamPlaceholder ||
    'Away Team',
)

const totalVotesFormatted = computed(() => {
  const count = props.stats?.totalPredictions ?? 0
  return count > 0 ? count.toLocaleString() : '0'
})

async function handleSavePrediction() {
  if (isLocked.value) {
    toast.add({
      title: 'Match locked',
      description: 'Predictions lock when the match begins.',
      color: 'warning',
    })
    return
  }

  isSubmitting.value = true
  try {
    const res = await predictionStore.savePrediction(
      props.tournament,
      props.fixture,
      homeScore.value,
      awayScore.value,
      [props.fixture],
    )

    if (res.success) {
      isSaved.value = true
      isEditing.value = false
      emit('saved', {
        fixtureId: props.fixture.id,
        homeScore: homeScore.value,
        awayScore: awayScore.value,
      })
      toast.add({
        title: 'Prediction Saved',
        description: `${homeTeamName.value} ${homeScore.value} - ${awayScore.value} ${awayTeamName.value}`,
        color: 'success',
      })
    } else {
      toast.add({
        title: 'Could not save',
        description: res.error || 'Failed to save prediction.',
        color: 'error',
      })
    }
  } catch (err: any) {
    toast.add({
      title: 'Error',
      description: err.message || 'Something went wrong',
      color: 'error',
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div
    class="rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#121212] overflow-hidden transition-all shadow-xs"
  >
    <!-- Top Meta Row -->
    <div
      class="flex items-center justify-between px-4 py-2.5 bg-gray-50/70 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/[0.05] text-xs text-gray-500 dark:text-gray-400"
    >
      <div class="flex items-center gap-1.5 font-medium truncate">
        <span>{{ fixture.roundName || `Round ${fixture.round}` }}</span>
        <span class="opacity-40">·</span>
        <span class="font-mono">#{{ fixture.matchNumber }}</span>
      </div>

      <div>
        <span
          v-if="fixture.status === FixtureStatus.LIVE"
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500/10 text-red-500"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
          LIVE
        </span>
        <span
          v-else-if="fixture.status === FixtureStatus.COMPLETED"
          class="text-[11px] font-medium text-gray-400"
        >
          Full Time
        </span>
        <span
          v-else
          class="text-[11px] font-medium"
          :class="isLocked ? 'text-gray-400' : 'text-emerald-500 dark:text-emerald-400'"
        >
          {{ kickoffText }}
        </span>
      </div>
    </div>

    <!-- Main Body: FotMob-style "Who will win?" -->
    <div class="p-4 sm:p-5">
      <h3 class="text-center font-bold text-sm sm:text-base text-gray-900 dark:text-white mb-3">
        Who will win?
      </h3>

      <!-- 3-Column Outcome Grid (Home / Draw / Away) -->
      <div class="grid grid-cols-3 gap-2 sm:gap-3 mb-3">
        <!-- 1. Home Column -->
        <button
          type="button"
          :disabled="isLocked"
          class="flex flex-col items-center justify-between p-3 rounded-xl border transition-all text-center"
          :class="[
            selectedOutcome === 'home'
              ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-500/10 ring-1 ring-emerald-500/40 text-emerald-600 dark:text-emerald-400'
              : 'border-gray-200 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.03] hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-800 dark:text-gray-200',
            isLocked ? 'cursor-default' : 'cursor-pointer'
          ]"
          @click="selectOutcome('home')"
        >
          <div class="w-10 h-10 rounded-full flex items-center justify-center p-1 mb-1.5 shrink-0">
            <img
              v-if="fixture.homeTeam?.logoUrl"
              :src="fixture.homeTeam.logoUrl"
              :alt="homeTeamName"
              class="w-full h-full object-contain"
            />
            <UIcon
              v-else
              name="i-heroicons-shield-check"
              class="w-7 h-7 text-gray-400"
            />
          </div>
          <span class="text-[11px] sm:text-xs font-semibold line-clamp-1 w-full mb-1">
            {{ homeTeamName }}
          </span>
          <span class="text-sm sm:text-base font-bold font-mono text-gray-900 dark:text-white">
            {{ stats?.homeWinPercentage ?? 45 }}%
          </span>
        </button>

        <!-- 2. Draw Column -->
        <button
          type="button"
          :disabled="isLocked"
          class="flex flex-col items-center justify-between p-3 rounded-xl border transition-all text-center"
          :class="[
            selectedOutcome === 'draw'
              ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-500/10 ring-1 ring-emerald-500/40 text-emerald-600 dark:text-emerald-400'
              : 'border-gray-200 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.03] hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-800 dark:text-gray-200',
            isLocked ? 'cursor-default' : 'cursor-pointer'
          ]"
          @click="selectOutcome('draw')"
        >
          <div class="w-10 h-10 rounded-full flex items-center justify-center mb-1.5 shrink-0">
            <span class="text-xl font-bold font-mono text-gray-400 dark:text-gray-500">X</span>
          </div>
          <span class="text-[11px] sm:text-xs font-semibold line-clamp-1 w-full mb-1">
            Draw
          </span>
          <span class="text-sm sm:text-base font-bold font-mono text-gray-900 dark:text-white">
            {{ stats?.drawPercentage ?? 25 }}%
          </span>
        </button>

        <!-- 3. Away Column -->
        <button
          type="button"
          :disabled="isLocked"
          class="flex flex-col items-center justify-between p-3 rounded-xl border transition-all text-center"
          :class="[
            selectedOutcome === 'away'
              ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-500/10 ring-1 ring-emerald-500/40 text-emerald-600 dark:text-emerald-400'
              : 'border-gray-200 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.03] hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-800 dark:text-gray-200',
            isLocked ? 'cursor-default' : 'cursor-pointer'
          ]"
          @click="selectOutcome('away')"
        >
          <div class="w-10 h-10 rounded-full flex items-center justify-center p-1 mb-1.5 shrink-0">
            <img
              v-if="fixture.awayTeam?.logoUrl"
              :src="fixture.awayTeam.logoUrl"
              :alt="awayTeamName"
              class="w-full h-full object-contain"
            />
            <UIcon
              v-else
              name="i-heroicons-shield-check"
              class="w-7 h-7 text-gray-400"
            />
          </div>
          <span class="text-[11px] sm:text-xs font-semibold line-clamp-1 w-full mb-1">
            {{ awayTeamName }}
          </span>
          <span class="text-sm sm:text-base font-bold font-mono text-gray-900 dark:text-white">
            {{ stats?.awayWinPercentage ?? 30 }}%
          </span>
        </button>
      </div>

      <!-- Total votes line (FotMob style) -->
      <p class="text-center text-xs text-gray-400 dark:text-gray-500 mb-3">
        Total votes: {{ totalVotesFormatted }}
      </p>

      <!-- Score adjustment & Save Action (Pre-kickoff) -->
      <div v-if="!isLocked" class="pt-3 border-t border-gray-100 dark:border-white/[0.05] space-y-3">
        <!-- Score stepper (when editing or setting score) -->
        <div v-if="isEditing" class="flex items-center justify-center gap-3">
          <span class="text-xs text-gray-500 font-medium mr-1">Score:</span>

          <!-- Home Counter -->
          <div class="inline-flex items-center bg-gray-100 dark:bg-white/[0.05] rounded-xl p-0.5 border border-gray-200 dark:border-white/10">
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              icon="i-heroicons-minus"
              class="w-7 h-7 p-0 flex items-center justify-center"
              @click="adjustScore('home', -1)"
            />
            <span class="w-7 text-center font-bold text-base font-mono text-gray-900 dark:text-white">
              {{ homeScore }}
            </span>
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              icon="i-heroicons-plus"
              class="w-7 h-7 p-0 flex items-center justify-center"
              @click="adjustScore('home', 1)"
            />
          </div>

          <span class="font-bold text-gray-400 text-sm">-</span>

          <!-- Away Counter -->
          <div class="inline-flex items-center bg-gray-100 dark:bg-white/[0.05] rounded-xl p-0.5 border border-gray-200 dark:border-white/10">
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              icon="i-heroicons-minus"
              class="w-7 h-7 p-0 flex items-center justify-center"
              @click="adjustScore('away', -1)"
            />
            <span class="w-7 text-center font-bold text-base font-mono text-gray-900 dark:text-white">
              {{ awayScore }}
            </span>
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              icon="i-heroicons-plus"
              class="w-7 h-7 p-0 flex items-center justify-center"
              @click="adjustScore('away', 1)"
            />
          </div>
        </div>

        <!-- Buttons -->
        <div v-if="isEditing">
          <UButton
            block
            size="md"
            color="primary"
            class="rounded-full font-semibold shadow-xs"
            :loading="isSubmitting"
            :label="isSaved ? 'Update Prediction' : 'Save Prediction'"
            @click="handleSavePrediction"
          />
        </div>

        <!-- Saved State Summary -->
        <div
          v-else
          class="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/10 text-xs"
        >
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-check-circle" class="w-4 h-4 text-emerald-500 shrink-0" />
            <span class="text-gray-700 dark:text-gray-300">
              Your prediction: <strong class="font-mono text-gray-900 dark:text-white">{{ homeScore }} - {{ awayScore }}</strong>
            </span>
          </div>

          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            label="Change"
            @click="isEditing = true"
          />
        </div>
      </div>

      <!-- Completed match evaluation banner -->
      <div
        v-else-if="evaluation"
        class="pt-3 border-t border-gray-100 dark:border-white/[0.05] flex items-center justify-between text-xs"
      >
        <span class="text-gray-500 font-medium">
          Actual: <strong class="font-mono text-gray-900 dark:text-white">{{ fixture.homeScore ?? 0 }} - {{ fixture.awayScore ?? 0 }}</strong>
          <span class="mx-1 text-gray-300 dark:text-white/20">·</span>
          Pick: <strong class="font-mono text-gray-900 dark:text-white">{{ homeScore }} - {{ awayScore }}</strong>
        </span>

        <UBadge
          v-if="evaluation.status === 'EXACT'"
          color="primary"
          variant="subtle"
          size="sm"
        >
          Exact Score (+{{ config.exactScorePoints }} pts)
        </UBadge>
        <UBadge
          v-else-if="evaluation.status === 'CORRECT_RESULT'"
          color="primary"
          variant="subtle"
          size="sm"
        >
          Correct Result (+{{ config.correctResultPoints }} pt)
        </UBadge>
        <UBadge
          v-else-if="evaluation.status === 'INCORRECT'"
          color="neutral"
          variant="subtle"
          size="sm"
        >
          Missed (0 pts)
        </UBadge>
      </div>

      <!-- Match Locked state (when in progress or no evaluation yet) -->
      <div
        v-else-if="isLocked"
        class="pt-3 border-t border-gray-100 dark:border-white/[0.05] text-center text-xs text-gray-400"
      >
        <span v-if="isSaved">
          Your prediction: <strong class="font-mono text-gray-900 dark:text-white">{{ homeScore }} - {{ awayScore }}</strong> (Locked)
        </span>
        <span v-else>
          Predictions closed for this match
        </span>
      </div>
    </div>
  </div>
</template>
