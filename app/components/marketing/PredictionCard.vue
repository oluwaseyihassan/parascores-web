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

// Quick pick helpers
function setQuickResult(type: 'home' | 'draw' | 'away') {
  if (isLocked.value) return
  isEditing.value = true
  if (type === 'home') {
    homeScore.value = 2
    awayScore.value = 1
  } else if (type === 'draw') {
    homeScore.value = 1
    awayScore.value = 1
  } else {
    homeScore.value = 1
    awayScore.value = 2
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
        title: 'Prediction Saved!',
        description: `Predicted: ${homeTeamName.value} ${homeScore.value} - ${awayScore.value} ${awayTeamName.value}`,
        color: 'success',
        icon: 'i-heroicons-check-circle',
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
    class="relative rounded-2xl border transition-all overflow-hidden bg-white dark:bg-[#0d0d0d]"
    :class="[
      evaluation?.status === 'EXACT'
        ? 'border-amber-500/50 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30'
        : evaluation?.status === 'CORRECT_RESULT'
          ? 'border-emerald-500/40 shadow-md shadow-emerald-500/10'
          : isSaved && !isLocked
            ? 'border-emerald-500/30 dark:border-emerald-500/20'
            : 'border-gray-200 dark:border-white/[0.08]',
    ]"
  >
    <!-- Top banner / Round info & Lock status -->
    <div
      class="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/[0.05] text-xs"
    >
      <div class="flex items-center gap-2">
        <span class="font-medium text-gray-500 dark:text-gray-400">
          {{ fixture.roundName || `Round ${fixture.round}` }}
        </span>
        <span class="text-gray-300 dark:text-white/20">·</span>
        <span class="text-gray-500 dark:text-gray-400 font-mono">
          #{{ fixture.matchNumber }}
        </span>
      </div>

      <div class="flex items-center gap-1.5">
        <!-- Live status -->
        <span
          v-if="fixture.status === FixtureStatus.LIVE"
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 animate-pulse"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
          LIVE
        </span>

        <!-- Completed match -->
        <span
          v-else-if="fixture.status === FixtureStatus.COMPLETED"
          class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300"
        >
          Full Time
        </span>

        <!-- Countdown badge -->
        <span
          v-else
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
          :class="[
            isLocked
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
          ]"
        >
          <UIcon
            :name="isLocked ? 'i-heroicons-lock-closed' : 'i-heroicons-clock'"
            class="w-3.5 h-3.5"
          />
          {{ kickoffText }}
        </span>
      </div>
    </div>

    <!-- Match Teams & Score section -->
    <div class="p-4 sm:p-5">
      <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-4">
        <!-- Home Team -->
        <div class="flex flex-col items-center sm:items-end text-center sm:text-right">
          <div
            class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center p-2 mb-2 shadow-xs"
          >
            <img
              v-if="fixture.homeTeam?.logoUrl"
              :src="fixture.homeTeam.logoUrl"
              :alt="homeTeamName"
              class="w-full h-full object-contain"
            />
            <UIcon
              v-else
              name="i-heroicons-shield-check"
              class="w-6 h-6 text-gray-400"
            />
          </div>
          <p
            class="font-semibold text-sm sm:text-base text-gray-900 dark:text-white line-clamp-1"
          >
            {{ homeTeamName }}
          </p>
          <span
            v-if="fixture.status === FixtureStatus.COMPLETED || fixture.status === FixtureStatus.LIVE"
            class="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-mono"
          >
            Actual: {{ fixture.homeScore ?? 0 }}
          </span>
        </div>

        <!-- Center: Prediction Stepper or Result Display -->
        <div class="flex flex-col items-center justify-center px-2">
          <!-- Active Prediction Stepper (pre-match) -->
          <div v-if="!isLocked && isEditing" class="flex items-center gap-2 sm:gap-3">
            <!-- Home counter -->
            <div class="flex items-center bg-gray-100 dark:bg-[#1a1a1a] rounded-xl p-1 border border-gray-200 dark:border-white/10">
              <UButton
                size="xs"
                variant="ghost"
                color="neutral"
                icon="i-heroicons-minus"
                class="rounded-lg h-7 w-7 p-0 flex items-center justify-center"
                @click="adjustScore('home', -1)"
              />
              <span
                class="w-7 text-center font-bold text-base sm:text-lg font-mono text-gray-900 dark:text-white"
              >
                {{ homeScore }}
              </span>
              <UButton
                size="xs"
                variant="ghost"
                color="neutral"
                icon="i-heroicons-plus"
                class="rounded-lg h-7 w-7 p-0 flex items-center justify-center"
                @click="adjustScore('home', 1)"
              />
            </div>

            <span class="text-gray-400 font-bold text-sm">:</span>

            <!-- Away counter -->
            <div class="flex items-center bg-gray-100 dark:bg-[#1a1a1a] rounded-xl p-1 border border-gray-200 dark:border-white/10">
              <UButton
                size="xs"
                variant="ghost"
                color="neutral"
                icon="i-heroicons-minus"
                class="rounded-lg h-7 w-7 p-0 flex items-center justify-center"
                @click="adjustScore('away', -1)"
              />
              <span
                class="w-7 text-center font-bold text-base sm:text-lg font-mono text-gray-900 dark:text-white"
              >
                {{ awayScore }}
              </span>
              <UButton
                size="xs"
                variant="ghost"
                color="neutral"
                icon="i-heroicons-plus"
                class="rounded-lg h-7 w-7 p-0 flex items-center justify-center"
                @click="adjustScore('away', 1)"
              />
            </div>
          </div>

          <!-- Saved Static View (or Locked) -->
          <div v-else class="flex flex-col items-center">
            <div
              class="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gray-100 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10"
            >
              <span
                class="text-xl sm:text-2xl font-bold font-mono text-gray-900 dark:text-white"
              >
                {{ prediction ? prediction.homeScore : homeScore }}
              </span>
              <span class="text-gray-400 font-bold text-sm">-</span>
              <span
                class="text-xl sm:text-2xl font-bold font-mono text-gray-900 dark:text-white"
              >
                {{ prediction ? prediction.awayScore : awayScore }}
              </span>
            </div>
            <span class="text-[11px] text-gray-400 dark:text-gray-500 mt-1 font-medium">
              Your Prediction
            </span>
          </div>
        </div>

        <!-- Away Team -->
        <div class="flex flex-col items-center sm:items-start text-center sm:text-left">
          <div
            class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center p-2 mb-2 shadow-xs"
          >
            <img
              v-if="fixture.awayTeam?.logoUrl"
              :src="fixture.awayTeam.logoUrl"
              :alt="awayTeamName"
              class="w-full h-full object-contain"
            />
            <UIcon
              v-else
              name="i-heroicons-shield-check"
              class="w-6 h-6 text-gray-400"
            />
          </div>
          <p
            class="font-semibold text-sm sm:text-base text-gray-900 dark:text-white line-clamp-1"
          >
            {{ awayTeamName }}
          </p>
          <span
            v-if="fixture.status === FixtureStatus.COMPLETED || fixture.status === FixtureStatus.LIVE"
            class="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-mono"
          >
            Actual: {{ fixture.awayScore ?? 0 }}
          </span>
        </div>
      </div>

      <!-- Quick outcome presets (pre-kickoff when editing) -->
      <div
        v-if="!isLocked && isEditing"
        class="flex items-center justify-center gap-1.5 mt-4 pt-3 border-t border-gray-100 dark:border-white/[0.05]"
      >
        <button
          type="button"
          class="px-2.5 py-1 rounded-lg text-xs font-medium border border-gray-200 dark:border-white/10 hover:border-emerald-500/50 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-gray-600 dark:text-gray-300 transition-colors"
          @click="setQuickResult('home')"
        >
          1 · Home Win
        </button>
        <button
          type="button"
          class="px-2.5 py-1 rounded-lg text-xs font-medium border border-gray-200 dark:border-white/10 hover:border-emerald-500/50 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-gray-600 dark:text-gray-300 transition-colors"
          @click="setQuickResult('draw')"
        >
          X · Draw
        </button>
        <button
          type="button"
          class="px-2.5 py-1 rounded-lg text-xs font-medium border border-gray-200 dark:border-white/10 hover:border-emerald-500/50 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-gray-600 dark:text-gray-300 transition-colors"
          @click="setQuickResult('away')"
        >
          2 · Away Win
        </button>
      </div>

      <!-- Actions & Points Status -->
      <div class="mt-4 pt-3 border-t border-gray-100 dark:border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-3">
        <!-- Completed Match Award Banner -->
        <div v-if="evaluation" class="w-full sm:w-auto">
          <div
            v-if="evaluation.status === 'EXACT'"
            class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400"
          >
            <UIcon name="i-heroicons-sparkles" class="w-4 h-4 text-amber-500" />
            <span class="text-xs font-bold">
              🎯 Exact Score Hit! +{{ config.exactScorePoints }} pts
            </span>
          </div>
          <div
            v-else-if="evaluation.status === 'CORRECT_RESULT'"
            class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
          >
            <UIcon name="i-heroicons-check" class="w-4 h-4 text-emerald-500" />
            <span class="text-xs font-bold">
              ✅ Correct Result! +{{ config.correctResultPoints }} pts
            </span>
          </div>
          <div
            v-else-if="evaluation.status === 'INCORRECT'"
            class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-white/[0.05] text-gray-500 text-xs"
          >
            <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
            <span>Missed outcome · 0 pts</span>
          </div>
          <div
            v-else-if="evaluation.status === 'PENDING'"
            class="flex items-center gap-2 text-xs text-gray-400 font-medium"
          >
            <UIcon name="i-heroicons-lock-closed" class="w-3.5 h-3.5" />
            <span>Locked · Awaiting final score</span>
          </div>
        </div>

        <!-- Open state message if no completed score yet -->
        <div v-else-if="isLocked" class="text-xs text-gray-400 font-medium flex items-center gap-1.5">
          <UIcon name="i-heroicons-lock-closed" class="w-3.5 h-3.5" />
          <span>Match in progress or ended</span>
        </div>

        <div v-else-if="isSaved && !isEditing" class="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          <UIcon name="i-heroicons-check-circle" class="w-4 h-4" />
          <span>Prediction locked in! You can edit until kickoff.</span>
        </div>

        <div v-else class="text-xs text-gray-400">
          Earn <span class="font-bold text-gray-900 dark:text-white">{{ config.exactScorePoints }} pts</span> for exact score, <span class="font-bold text-gray-900 dark:text-white">{{ config.correctResultPoints }} pt</span> for outcome.
        </div>

        <!-- Buttons -->
        <div v-if="!isLocked" class="flex items-center gap-2 w-full sm:w-auto justify-end">
          <UButton
            v-if="isSaved && !isEditing"
            size="sm"
            variant="outline"
            color="neutral"
            icon="i-heroicons-pencil-square"
            label="Change"
            @click="isEditing = true"
          />

          <UButton
            v-if="isEditing"
            size="sm"
            color="primary"
            :loading="isSubmitting"
            icon="i-heroicons-check"
            :label="isSaved ? 'Update Prediction' : 'Save Prediction'"
            class="w-full sm:w-auto"
            @click="handleSavePrediction"
          />
        </div>
      </div>

      <!-- Community Consensus Bar -->
      <div v-if="stats && stats.totalPredictions > 0" class="mt-4 pt-3 border-t border-gray-100 dark:border-white/[0.05]">
        <div class="flex items-center justify-between text-[11px] text-gray-500 mb-1.5 font-medium">
          <span class="flex items-center gap-1">
            <UIcon name="i-heroicons-user-group" class="w-3.5 h-3.5 text-gray-400" />
            Community Consensus ({{ stats.totalPredictions }} predictions)
          </span>
          <span v-if="stats.mostPredictedScore">
            Most predicted: <strong class="text-gray-900 dark:text-white font-mono">{{ stats.mostPredictedScore.home }} - {{ stats.mostPredictedScore.away }}</strong>
          </span>
        </div>

        <!-- Segmented bar -->
        <div class="h-2 w-full rounded-full overflow-hidden flex bg-gray-100 dark:bg-white/[0.06]">
          <div
            :style="{ width: `${stats.homeWinPercentage}%` }"
            class="bg-emerald-500 h-full transition-all"
            :title="`Home Win: ${stats.homeWinPercentage}%`"
          ></div>
          <div
            :style="{ width: `${stats.drawPercentage}%` }"
            class="bg-amber-400 h-full transition-all"
            :title="`Draw: ${stats.drawPercentage}%`"
          ></div>
          <div
            :style="{ width: `${stats.awayWinPercentage}%` }"
            class="bg-indigo-500 h-full transition-all"
            :title="`Away Win: ${stats.awayWinPercentage}%`"
          ></div>
        </div>

        <div class="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 mt-1 font-mono">
          <span class="text-emerald-500 font-semibold">1: {{ stats.homeWinPercentage }}%</span>
          <span class="text-amber-500 font-semibold">X: {{ stats.drawPercentage }}%</span>
          <span class="text-indigo-400 font-semibold">2: {{ stats.awayWinPercentage }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>
