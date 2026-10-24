<script setup lang="ts">
import type { Tournament, Fixture } from '~/types'
import { FixtureStatus } from '~/types'
import PredictionCard from '~/components/marketing/PredictionCard.vue'
import PredictionLeaderboard from '~/components/marketing/PredictionLeaderboard.vue'
import {
  isFixturePredictionLocked,
  getTournamentPredictionConfig,
} from '~/stores/prediction'

const props = defineProps<{
  tournament: Tournament
  fixtures: Fixture[]
}>()

const emit = defineEmits<{
  (e: 'open-fixture', fixtureId: string): void
}>()

const predictionStore = usePredictionStore()
const authStore = useAuthStore()
const { toMain } = useHost()

const activeSubTab = ref<'predict' | 'my' | 'leaderboard'>('predict')

const config = computed(() => getTournamentPredictionConfig(props.tournament))

// Load predictions on mount or when tournament changes
onMounted(async () => {
  if (props.tournament) {
    await predictionStore.loadPredictions(props.tournament, props.fixtures)
  }
})

watch(
  () => props.tournament?.id,
  async (newId) => {
    if (newId) {
      await predictionStore.loadPredictions(props.tournament, props.fixtures)
    }
  },
)

// Fixture filtering
const footballFixtures = computed(() => {
  return [...props.fixtures].sort((a, b) => {
    const timeA = a.startTime ? new Date(a.startTime).getTime() : 0
    const timeB = b.startTime ? new Date(b.startTime).getTime() : 0
    return timeA - timeB
  })
})

const openFixtures = computed(() => {
  return footballFixtures.value.filter((f) => !isFixturePredictionLocked(f))
})

const closedOrCompletedFixtures = computed(() => {
  return footballFixtures.value.filter((f) => isFixturePredictionLocked(f))
})

// User's predictions
const userPredictions = computed(() => {
  const all = predictionStore.predictionsByTournament[props.tournament.id] || []
  const uid = authStore.user?.id
  if (uid) {
    return all.filter((p) => p.userId === uid)
  }
  // guest mode
  return all.filter((p) => p.userId === 'guest')
})

const userPredictedFixtureIds = computed(
  () => new Set(userPredictions.value.map((p) => p.fixtureId)),
)

// Fixtures that the user has predicted
const myPredictedFixtures = computed(() => {
  return footballFixtures.value.filter((f) =>
    userPredictedFixtureIds.value.has(f.id),
  )
})

// Unpredicted open fixtures
const unpredictedOpenFixtures = computed(() => {
  return openFixtures.value.filter(
    (f) => !userPredictedFixtureIds.value.has(f.id),
  )
})

// Tournament Leaderboard data
const leaderboard = computed(() =>
  predictionStore.getLeaderboard(props.tournament.id),
)

// User stats summary
const userEntry = computed(() => {
  const uid = authStore.user?.id
  if (!uid) return null
  return leaderboard.value.find((e) => e.userId === uid) || null
})
</script>

<template>
  <div class="space-y-6 max-w-5xl mx-auto px-4 sm:px-6 py-6">
    <!-- Hero / Contest Summary -->
    <div
      class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 p-6 sm:p-8"
    >
      <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-3">
            <UIcon name="i-heroicons-sparkles" class="w-3.5 h-3.5" />
            Official Score Prediction Contest
          </div>
          <h2 class="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Predict &amp; Win
          </h2>
          <p class="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-2 max-w-xl">
            Predict match scores before kickoff, earn points for exact scores and correct outcomes, and compete on the tournament leaderboard!
          </p>
        </div>

        <!-- Quick Stats Pill Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 shrink-0">
          <div class="p-3 rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/10 text-center">
            <span class="block text-xl font-bold font-mono text-gray-900 dark:text-white">
              {{ openFixtures.length }}
            </span>
            <span class="text-[11px] text-gray-500 font-medium">Open Matches</span>
          </div>

          <div class="p-3 rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/10 text-center">
            <span class="block text-xl font-bold font-mono text-gray-900 dark:text-white">
              {{ userPredictions.length }}
            </span>
            <span class="text-[11px] text-gray-500 font-medium">Your Picks</span>
          </div>

          <div class="p-3 rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/10 text-center">
            <span class="block text-xl font-bold font-mono text-emerald-500">
              {{ userEntry?.totalPoints ?? 0 }}
            </span>
            <span class="text-[11px] text-gray-500 font-medium">Your Points</span>
          </div>

          <div class="p-3 rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-gray-200/60 dark:border-white/10 text-center">
            <span class="block text-xl font-bold font-mono text-amber-500">
              {{ userEntry?.rank ? `#${userEntry.rank}` : '-' }}
            </span>
            <span class="text-[11px] text-gray-500 font-medium">Rank</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Guest notification banner (if not logged in) -->
    <div
      v-if="!authStore.isAuthenticated"
      class="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-blue-900 dark:text-blue-100"
    >
      <div class="flex items-center gap-3">
        <UIcon name="i-heroicons-user-circle" class="w-6 h-6 text-blue-500 shrink-0" />
        <div>
          <p class="font-semibold">Playing as Guest</p>
          <p class="text-xs text-blue-700 dark:text-blue-300">
            Sign in to sync your predictions across devices, keep your leaderboard spot, and earn fan badges.
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <UButton
          size="xs"
          color="primary"
          label="Sign In"
          :to="toMain('/auth/login')"
        />
      </div>
    </div>

    <!-- Sub-tab selector -->
    <div class="flex items-center gap-2 border-b border-gray-200 dark:border-white/[0.08] pb-3">
      <button
        type="button"
        class="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all"
        :class="[
          activeSubTab === 'predict'
            ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5',
        ]"
        @click="activeSubTab = 'predict'"
      >
        <UIcon name="i-heroicons-bolt" class="w-4 h-4" />
        <span>Matches to Predict</span>
        <UBadge
          v-if="unpredictedOpenFixtures.length > 0"
          size="xs"
          color="primary"
          variant="solid"
          class="rounded-full px-1.5"
        >
          {{ unpredictedOpenFixtures.length }}
        </UBadge>
      </button>

      <button
        type="button"
        class="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all"
        :class="[
          activeSubTab === 'my'
            ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5',
        ]"
        @click="activeSubTab = 'my'"
      >
        <UIcon name="i-heroicons-check-circle" class="w-4 h-4" />
        <span>My Predictions</span>
        <span class="text-xs font-mono font-normal opacity-70">({{ userPredictions.length }})</span>
      </button>

      <button
        type="button"
        class="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all"
        :class="[
          activeSubTab === 'leaderboard'
            ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5',
        ]"
        @click="activeSubTab = 'leaderboard'"
      >
        <UIcon name="i-heroicons-trophy" class="w-4 h-4" />
        <span>Leaderboard</span>
      </button>
    </div>

    <!-- 1. PREDICT MATCHES VIEW -->
    <div v-if="activeSubTab === 'predict'" class="space-y-4">
      <div v-if="openFixtures.length === 0" class="p-12 text-center rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.06]">
        <UIcon name="i-heroicons-clock" class="w-10 h-10 mx-auto text-gray-400 mb-2" />
        <h3 class="font-bold text-gray-900 dark:text-white text-base">No Open Matches to Predict</h3>
        <p class="text-xs text-gray-500 max-w-md mx-auto mt-1">
          All upcoming matches are either currently underway, completed, or awaiting scheduling. Check back soon for the next round of fixtures!
        </p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PredictionCard
          v-for="fixture in openFixtures"
          :key="fixture.id"
          :fixture="fixture"
          :tournament="tournament"
          :prediction="predictionStore.getUserPrediction(tournament.id, fixture.id)"
          :stats="predictionStore.getFixtureStats(fixture.id)"
          @saved="() => {}"
        />
      </div>

      <!-- Closed/Completed Section if any -->
      <div v-if="closedOrCompletedFixtures.length > 0" class="pt-6">
        <div class="flex items-center gap-2 mb-3">
          <UIcon name="i-heroicons-lock-closed" class="w-4 h-4 text-gray-400" />
          <h4 class="text-xs font-bold uppercase tracking-wider text-gray-400">
            Locked &amp; Completed Matches
          </h4>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PredictionCard
            v-for="fixture in closedOrCompletedFixtures.slice(0, 4)"
            :key="fixture.id"
            :fixture="fixture"
            :tournament="tournament"
            :prediction="predictionStore.getUserPrediction(tournament.id, fixture.id)"
            :stats="predictionStore.getFixtureStats(fixture.id)"
          />
        </div>
      </div>
    </div>

    <!-- 2. MY PREDICTIONS VIEW -->
    <div v-else-if="activeSubTab === 'my'" class="space-y-4">
      <div v-if="myPredictedFixtures.length === 0" class="p-12 text-center rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.06]">
        <UIcon name="i-heroicons-pencil-square" class="w-10 h-10 mx-auto text-gray-400 mb-2" />
        <h3 class="font-bold text-gray-900 dark:text-white text-base">No Predictions Made Yet</h3>
        <p class="text-xs text-gray-500 max-w-md mx-auto mt-1 mb-4">
          Select open matches from the list to predict scores before kickoff and join the contest!
        </p>
        <UButton
          size="sm"
          color="primary"
          icon="i-heroicons-bolt"
          label="Browse Open Matches"
          @click="activeSubTab = 'predict'"
        />
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PredictionCard
          v-for="fixture in myPredictedFixtures"
          :key="fixture.id"
          :fixture="fixture"
          :tournament="tournament"
          :prediction="predictionStore.getUserPrediction(tournament.id, fixture.id)"
          :stats="predictionStore.getFixtureStats(fixture.id)"
        />
      </div>
    </div>

    <!-- 3. LEADERBOARD VIEW -->
    <div v-else-if="activeSubTab === 'leaderboard'">
      <PredictionLeaderboard
        :tournament="tournament"
        :leaderboard="leaderboard"
        :loading="predictionStore.loading"
      />
    </div>
  </div>
</template>
