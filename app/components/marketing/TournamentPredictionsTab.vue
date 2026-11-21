<script setup lang="ts">
import type { Tournament, Fixture } from '~/types'
import { FixtureStatus } from '~/types'
import PredictionCard from '~/components/marketing/PredictionCard.vue'
import PredictionLeaderboard from '~/components/marketing/PredictionLeaderboard.vue'
import {
  isFixturePredictionLocked,
  getTournamentPredictionConfig,
  groupFixturesByRound,
  formatPredictionCountdown,
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
const nowMs = ref<number>(Date.now())
let countdownTimer: ReturnType<typeof setInterval> | null = null

const config = computed(() => getTournamentPredictionConfig(props.tournament))

// Load predictions on mount or when tournament changes
onMounted(async () => {
  countdownTimer = setInterval(() => {
    nowMs.value = Date.now()
  }, 1000)

  if (props.tournament) {
    await predictionStore.loadPredictions(props.tournament, props.fixtures)
  }
})

onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
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
  return footballFixtures.value.filter((f) =>
    !isFixturePredictionLocked(f, footballFixtures.value, nowMs.value),
  )
})

const closedOrCompletedFixtures = computed(() => {
  return footballFixtures.value.filter((f) =>
    isFixturePredictionLocked(f, footballFixtures.value, nowMs.value),
  )
})

const openRounds = computed(() =>
  groupFixturesByRound(openFixtures.value, footballFixtures.value, nowMs.value),
)

const closedRounds = computed(() =>
  groupFixturesByRound(closedOrCompletedFixtures.value, footballFixtures.value, nowMs.value).reverse(),
)

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

const myPredictionRounds = computed(() =>
  groupFixturesByRound(myPredictedFixtures.value, footballFixtures.value, nowMs.value),
)

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
    <!-- Header & Summary -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-white/[0.06]">
      <div>
        <h2 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          Match Predictions
        </h2>
        <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
          Predict match scores before kickoff and compete on the leaderboard.
        </p>
      </div>

      <!-- Quick Stats Pill Row -->
      <div class="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
        <div class="px-3.5 py-1.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 text-center shrink-0">
          <span class="block text-sm font-bold font-mono text-gray-900 dark:text-white">
            {{ openFixtures.length }}
          </span>
          <span class="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Open</span>
        </div>

        <div class="px-3.5 py-1.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 text-center shrink-0">
          <span class="block text-sm font-bold font-mono text-gray-900 dark:text-white">
            {{ userPredictions.length }}
          </span>
          <span class="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Picks</span>
        </div>

        <div class="px-3.5 py-1.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 text-center shrink-0">
          <span class="block text-sm font-bold font-mono text-emerald-500">
            {{ userEntry?.totalPoints ?? 0 }}
          </span>
          <span class="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Pts</span>
        </div>

        <div class="px-3.5 py-1.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 text-center shrink-0">
          <span class="block text-sm font-bold font-mono text-amber-500">
            {{ userEntry?.rank ? `#${userEntry.rank}` : '-' }}
          </span>
          <span class="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Rank</span>
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
    <div v-if="activeSubTab === 'predict'" class="space-y-6">
      <div v-if="openRounds.length === 0" class="p-12 text-center rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.06]">
        <UIcon name="i-heroicons-clock" class="w-10 h-10 mx-auto text-gray-400 mb-2" />
        <h3 class="font-bold text-gray-900 dark:text-white text-base">No Open Rounds to Predict</h3>
        <p class="text-xs text-gray-500 max-w-md mx-auto mt-1">
          Rounds lock once their first match kicks off. Check back soon for the next round of fixtures!
        </p>
      </div>

      <div v-else class="space-y-6">
        <section
          v-for="roundGroup in openRounds"
          :key="roundGroup.key"
          class="space-y-3"
        >
          <div class="flex items-center justify-between gap-3 px-1">
            <div class="flex items-center gap-2 min-w-0">
              <h3 class="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">
                {{ roundGroup.label }}
              </h3>
              <span class="text-xs font-medium text-gray-400 dark:text-gray-500 shrink-0">
                {{ roundGroup.fixtures.length }} {{ roundGroup.fixtures.length === 1 ? 'match' : 'matches' }}
              </span>
            </div>
            <span class="text-xs font-semibold tabular-nums text-emerald-500 dark:text-emerald-400 shrink-0">
              {{ formatPredictionCountdown(roundGroup.lockTimeMs, nowMs) }}
            </span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PredictionCard
              v-for="fixture in roundGroup.fixtures"
              :key="fixture.id"
              :fixture="fixture"
              :tournament="tournament"
              :prediction="predictionStore.getUserPrediction(tournament.id, fixture.id)"
              :stats="predictionStore.getFixtureStats(fixture.id)"
              :all-fixtures="footballFixtures"
              :grouped-by-round="true"
              :now-ms="nowMs"
              @saved="() => {}"
            />
          </div>
        </section>
      </div>

      <!-- Closed/Completed Rounds Section -->
      <div v-if="closedRounds.length > 0" class="pt-4 space-y-5">
        <div class="flex items-center gap-2 px-1">
          <UIcon name="i-heroicons-lock-closed" class="w-4 h-4 text-gray-400" />
          <h4 class="text-xs font-bold uppercase tracking-wider text-gray-400">
            Locked &amp; Completed Rounds
          </h4>
        </div>

        <section
          v-for="roundGroup in closedRounds"
          :key="`closed-${roundGroup.key}`"
          class="space-y-3"
        >
          <div class="flex items-center justify-between gap-3 px-1">
            <h5 class="text-sm font-bold text-gray-700 dark:text-gray-300 truncate">
              {{ roundGroup.label }}
            </h5>
            <span class="text-[11px] font-medium text-gray-400 shrink-0">
              Round Locked
            </span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PredictionCard
              v-for="fixture in roundGroup.fixtures"
              :key="fixture.id"
              :fixture="fixture"
              :tournament="tournament"
              :prediction="predictionStore.getUserPrediction(tournament.id, fixture.id)"
              :stats="predictionStore.getFixtureStats(fixture.id)"
              :all-fixtures="footballFixtures"
              :grouped-by-round="true"
              :now-ms="nowMs"
            />
          </div>
        </section>
      </div>
    </div>

    <!-- 2. MY PREDICTIONS VIEW -->
    <div v-else-if="activeSubTab === 'my'" class="space-y-6">
      <div v-if="myPredictionRounds.length === 0" class="p-12 text-center rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.06]">
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

      <template v-else>
        <section
          v-for="roundGroup in myPredictionRounds"
          :key="`my-${roundGroup.key}`"
          class="space-y-3"
        >
          <div class="flex items-center justify-between gap-3 px-1">
            <h3 class="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">
              {{ roundGroup.label }}
            </h3>
            <span
              class="text-xs font-semibold tabular-nums shrink-0"
              :class="roundGroup.isLocked ? 'text-gray-400' : 'text-emerald-500 dark:text-emerald-400'"
            >
              {{ roundGroup.isLocked ? 'Round Locked' : formatPredictionCountdown(roundGroup.lockTimeMs, nowMs) }}
            </span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PredictionCard
              v-for="fixture in roundGroup.fixtures"
              :key="fixture.id"
              :fixture="fixture"
              :tournament="tournament"
              :prediction="predictionStore.getUserPrediction(tournament.id, fixture.id)"
              :stats="predictionStore.getFixtureStats(fixture.id)"
              :all-fixtures="footballFixtures"
              :grouped-by-round="true"
              :now-ms="nowMs"
            />
          </div>
        </section>
      </template>
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
