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

function adjustScore(team: 'home' | 'away', delta: number) {
  if (isLocked.value || !isEditing.value) return
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

    <!-- Main Body: Teams + Vertical Score Steppers -->
    <div class="px-4 py-4 sm:px-5 sm:py-5">
      <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-4">
        <!-- Home Team -->
        <div class="flex flex-col items-center text-center gap-1.5 min-w-0">
          <div class="w-11 h-11 rounded-full overflow-hidden bg-gray-100 dark:bg-white/[0.06] border border-gray-200 dark:border-white/10 flex items-center justify-center shrink-0">
            <img
              v-if="fixture.homeTeam?.logoUrl"
              :src="fixture.homeTeam.logoUrl"
              :alt="homeTeamName"
              class="w-full h-full object-cover"
            />
            <span v-else class="text-xs font-black text-gray-500 dark:text-gray-300">
              {{ homeTeamName.charAt(0).toUpperCase() }}
            </span>
          </div>
          <span class="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-tight line-clamp-2 w-full">
            {{ homeTeamName }}
          </span>
        </div>

        <!-- Center Vertical Score Boxes -->
        <div class="flex items-center gap-2 sm:gap-2.5">
          <!-- Home Stepper -->
          <div class="flex flex-col items-center gap-1">
            <button
              v-if="!isLocked && isEditing"
              type="button"
              aria-label="Increase home score"
              class="w-11 h-6 rounded-md flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-bold text-base cursor-pointer transition-colors"
              @click="adjustScore('home', 1)"
            >
              +
            </button>
            <div
              class="w-11 h-11 sm:w-12 sm:h-12 rounded-xl border flex items-center justify-center text-xl font-black font-mono transition-colors"
              :class="!isLocked && isEditing
                ? 'bg-gray-50 dark:bg-white/[0.06] border-gray-200 dark:border-white/15 text-gray-900 dark:text-white'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'"
            >
              {{ homeScore }}
            </div>
            <button
              v-if="!isLocked && isEditing"
              type="button"
              aria-label="Decrease home score"
              class="w-11 h-6 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] font-bold text-base cursor-pointer transition-colors"
              @click="adjustScore('home', -1)"
            >
              −
            </button>
          </div>

          <span class="text-sm font-bold text-gray-400 dark:text-gray-500">:</span>

          <!-- Away Stepper -->
          <div class="flex flex-col items-center gap-1">
            <button
              v-if="!isLocked && isEditing"
              type="button"
              aria-label="Increase away score"
              class="w-11 h-6 rounded-md flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-bold text-base cursor-pointer transition-colors"
              @click="adjustScore('away', 1)"
            >
              +
            </button>
            <div
              class="w-11 h-11 sm:w-12 sm:h-12 rounded-xl border flex items-center justify-center text-xl font-black font-mono transition-colors"
              :class="!isLocked && isEditing
                ? 'bg-gray-50 dark:bg-white/[0.06] border-gray-200 dark:border-white/15 text-gray-900 dark:text-white'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'"
            >
              {{ awayScore }}
            </div>
            <button
              v-if="!isLocked && isEditing"
              type="button"
              aria-label="Decrease away score"
              class="w-11 h-6 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] font-bold text-base cursor-pointer transition-colors"
              @click="adjustScore('away', -1)"
            >
              −
            </button>
          </div>
        </div>

        <!-- Away Team -->
        <div class="flex flex-col items-center text-center gap-1.5 min-w-0">
          <div class="w-11 h-11 rounded-full overflow-hidden bg-gray-100 dark:bg-white/[0.06] border border-gray-200 dark:border-white/10 flex items-center justify-center shrink-0">
            <img
              v-if="fixture.awayTeam?.logoUrl"
              :src="fixture.awayTeam.logoUrl"
              :alt="awayTeamName"
              class="w-full h-full object-cover"
            />
            <span v-else class="text-xs font-black text-gray-500 dark:text-gray-300">
              {{ awayTeamName.charAt(0).toUpperCase() }}
            </span>
          </div>
          <span class="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-tight line-clamp-2 w-full">
            {{ awayTeamName }}
          </span>
        </div>
      </div>

      <!-- Thin Fan Split Bar (only shown once predictions exist) -->
      <div v-if="stats && stats.totalPredictions > 0" class="mt-4 space-y-1">
        <div class="flex justify-between text-[11px] font-medium text-gray-500 dark:text-gray-400 tabular-nums">
          <span>{{ homeTeamName }} {{ stats.homeWinPercentage }}%</span>
          <span>Draw {{ stats.drawPercentage }}%</span>
          <span>{{ awayTeamName }} {{ stats.awayWinPercentage }}%</span>
        </div>
        <div class="h-1.5 w-full rounded-full bg-gray-100 dark:bg-white/[0.06] overflow-hidden flex">
          <div class="bg-emerald-500 h-full transition-all" :style="{ width: `${stats.homeWinPercentage}%` }" />
          <div class="bg-gray-400/50 dark:bg-white/25 h-full transition-all" :style="{ width: `${stats.drawPercentage}%` }" />
          <div class="bg-blue-500/80 h-full transition-all" :style="{ width: `${stats.awayWinPercentage}%` }" />
        </div>
      </div>
    </div>

    <!-- Footer CTA / Evaluation -->
    <div class="px-4 py-3 border-t border-gray-100 dark:border-white/[0.05] flex items-center justify-between gap-3 text-xs">
      <!-- Pre-kickoff Editing -->
      <template v-if="!isLocked && isEditing">
        <span class="text-gray-500 dark:text-gray-400 truncate">
          <template v-if="stats && stats.totalPredictions > 0">{{ totalVotesFormatted }} picks · </template>{{ config.exactScorePoints }} pts exact
        </span>
        <UButton
          size="sm"
          color="primary"
          class="rounded-full font-bold px-5 shrink-0"
          :loading="isSubmitting"
          :label="isSaved ? 'Update' : 'Submit'"
          @click="handleSavePrediction"
        />
      </template>

      <!-- Pre-kickoff Saved -->
      <template v-else-if="!isLocked">
        <div class="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 min-w-0">
          <UIcon name="i-heroicons-check-circle-solid" class="w-4 h-4 text-emerald-500 shrink-0" />
          <span class="font-semibold text-emerald-600 dark:text-emerald-400">Saved</span>
          <span v-if="stats && stats.totalPredictions > 0" class="text-gray-400 dark:text-gray-500 truncate">
            · {{ totalVotesFormatted }} picks
          </span>
        </div>
        <UButton
          size="xs"
          variant="soft"
          color="neutral"
          class="rounded-full px-3.5 shrink-0"
          label="Change"
          @click="() => { isEditing = true }"
        />
      </template>

      <!-- Completed match evaluation -->
      <template v-else-if="evaluation">
        <span class="text-gray-500 dark:text-gray-400 font-medium truncate">
          Actual: <strong class="font-mono text-gray-900 dark:text-white">{{ fixture.homeScore ?? 0 }} - {{ fixture.awayScore ?? 0 }}</strong>
          <span class="mx-1 text-gray-300 dark:text-white/20">·</span>
          Pick: <strong class="font-mono text-gray-900 dark:text-white">{{ homeScore }} - {{ awayScore }}</strong>
        </span>

        <UBadge
          v-if="evaluation.status === 'EXACT'"
          color="primary"
          variant="subtle"
          size="sm"
          class="shrink-0"
        >
          Exact (+{{ config.exactScorePoints }} pts)
        </UBadge>
        <UBadge
          v-else-if="evaluation.status === 'CORRECT_RESULT'"
          color="primary"
          variant="subtle"
          size="sm"
          class="shrink-0"
        >
          Winner (+{{ config.correctResultPoints }} pt)
        </UBadge>
        <UBadge
          v-else-if="evaluation.status === 'INCORRECT'"
          color="neutral"
          variant="subtle"
          size="sm"
          class="shrink-0"
        >
          Missed (0 pts)
        </UBadge>
      </template>

      <!-- Locked without evaluation -->
      <template v-else>
        <span class="text-gray-400 w-full text-center">
          <template v-if="isSaved">
            Your prediction: <strong class="font-mono text-gray-900 dark:text-white">{{ homeScore }} - {{ awayScore }}</strong> (Locked)
          </template>
          <template v-else>
            Predictions closed for this match
          </template>
        </span>
      </template>
    </div>
  </div>
</template>
