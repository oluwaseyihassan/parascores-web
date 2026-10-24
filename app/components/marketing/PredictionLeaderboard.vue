<script setup lang="ts">
import type { Tournament } from '~/types'
import type { PredictionLeaderboardEntry } from '~/types/prediction'
import { getTournamentPredictionConfig } from '~/stores/prediction'

const props = withDefaults(
  defineProps<{
    tournament: Tournament
    leaderboard: PredictionLeaderboardEntry[]
    loading?: boolean
  }>(),
  {
    loading: false,
  },
)

const authStore = useAuthStore()
const config = computed(() => getTournamentPredictionConfig(props.tournament))
const searchQuery = ref('')
const rulesModalOpen = ref(false)

const filteredLeaderboard = computed(() => {
  if (!searchQuery.value.trim()) return props.leaderboard
  const q = searchQuery.value.toLowerCase().trim()
  return props.leaderboard.filter((entry) =>
    entry.user.name.toLowerCase().includes(q),
  )
})

// Current user's entry
const currentUserEntry = computed(() => {
  const uid = authStore.user?.id
  if (!uid) return null
  return props.leaderboard.find((entry) => entry.userId === uid) || null
})

// Top 3 Podium entries
const firstPlace = computed(() => props.leaderboard[0] || null)
const secondPlace = computed(() => props.leaderboard[1] || null)
const thirdPlace = computed(() => props.leaderboard[2] || null)
</script>

<template>
  <div class="space-y-6">
    <!-- Header / Rules & Stats banner -->
    <div
      class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-[#0d0d0d] border border-gray-200 dark:border-white/[0.08]"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500"
        >
          <UIcon name="i-heroicons-trophy" class="w-5 h-5" />
        </div>
        <div>
          <h3 class="font-bold text-sm sm:text-base text-gray-900 dark:text-white">
            Prediction Leaderboard
          </h3>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Points updated automatically after each match finishes
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
        <div class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/[0.03] px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/[0.06]">
          <span>Exact score: <strong class="text-gray-900 dark:text-white">{{ config.exactScorePoints }} pts</strong></span>
          <span class="text-gray-300 dark:text-white/20">·</span>
          <span>Outcome: <strong class="text-gray-900 dark:text-white">{{ config.correctResultPoints }} pt</strong></span>
        </div>

        <UButton
          size="xs"
          variant="ghost"
          color="neutral"
          icon="i-heroicons-information-circle"
          label="Rules"
          @click="rulesModalOpen = true"
        />
      </div>
    </div>

    <!-- Pinned User Rank Card (if user has participated) -->
    <div
      v-if="currentUserEntry"
      class="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.03] border border-emerald-500/30 flex items-center justify-between gap-4"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-full bg-emerald-500 text-gray-950 font-bold flex items-center justify-center font-mono text-base shadow-sm"
        >
          #{{ currentUserEntry.rank }}
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-sm text-gray-900 dark:text-white">Your Ranking</span>
            <UBadge size="xs" color="primary" variant="subtle">You</UBadge>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {{ currentUserEntry.exactScoresCount }} exact scores · {{ currentUserEntry.correctResultsCount }} correct outcomes ({{ currentUserEntry.accuracyRate }}% accuracy)
          </p>
        </div>
      </div>

      <div class="text-right">
        <span class="text-2xl font-black font-mono text-emerald-500">
          {{ currentUserEntry.totalPoints }}
        </span>
        <span class="block text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Points</span>
      </div>
    </div>

    <!-- Top 3 Podium (when >= 3 predictors) -->
    <div
      v-if="leaderboard.length >= 3"
      class="grid grid-cols-3 gap-2 sm:gap-4 items-end pt-6 pb-2"
    >
      <!-- 2nd Place -->
      <div
        v-if="secondPlace"
        class="flex flex-col items-center p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#0d0d0d] border border-gray-200 dark:border-white/[0.08] relative text-center"
      >
        <div
          class="w-7 h-7 rounded-full bg-slate-300 text-slate-800 font-bold text-xs flex items-center justify-center absolute -top-3 shadow-md border-2 border-white dark:border-[#0d0d0d]"
        >
          🥈 2
        </div>
        <div class="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center mb-2 mt-1">
          <img
            v-if="secondPlace.user.picture"
            :src="secondPlace.user.picture"
            :alt="secondPlace.user.name"
            class="w-full h-full rounded-full object-cover"
          />
          <UIcon v-else name="i-heroicons-user" class="w-6 h-6 text-gray-400" />
        </div>
        <p class="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white line-clamp-1">
          {{ secondPlace.user.name }}
        </p>
        <p class="text-base sm:text-lg font-bold font-mono text-slate-400 mt-0.5">
          {{ secondPlace.totalPoints }} pts
        </p>
        <span class="text-[10px] text-gray-400 font-mono">
          {{ secondPlace.exactScoresCount }} exact · {{ secondPlace.accuracyRate }}%
        </span>
      </div>

      <!-- 1st Place (Center, Elevated) -->
      <div
        v-if="firstPlace"
        class="flex flex-col items-center p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#121212] border-2 border-amber-500/40 relative text-center -translate-y-2 shadow-sm"
      >
        <div
          class="w-8 h-8 rounded-full bg-amber-400 text-amber-950 font-black text-sm flex items-center justify-center absolute -top-4 shadow-md border-2 border-white dark:border-[#0d0d0d]"
        >
          🥇 1
        </div>
        <div class="w-14 h-14 rounded-full bg-amber-400/20 border border-amber-500/30 flex items-center justify-center mb-2 mt-1 ring-2 ring-amber-400/40">
          <img
            v-if="firstPlace.user.picture"
            :src="firstPlace.user.picture"
            :alt="firstPlace.user.name"
            class="w-full h-full rounded-full object-cover"
          />
          <UIcon v-else name="i-heroicons-user" class="w-7 h-7 text-amber-500" />
        </div>
        <p class="font-bold text-sm sm:text-base text-gray-900 dark:text-white line-clamp-1">
          {{ firstPlace.user.name }}
        </p>
        <p class="text-xl sm:text-2xl font-black font-mono text-amber-500 mt-0.5">
          {{ firstPlace.totalPoints }} pts
        </p>
        <span class="text-[11px] text-amber-600 dark:text-amber-400/80 font-mono font-medium">
          {{ firstPlace.exactScoresCount }} exact · {{ firstPlace.accuracyRate }}% acc
        </span>
      </div>

      <!-- 3rd Place -->
      <div
        v-if="thirdPlace"
        class="flex flex-col items-center p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#0d0d0d] border border-gray-200 dark:border-white/[0.08] relative text-center"
      >
        <div
          class="w-7 h-7 rounded-full bg-amber-700 text-amber-100 font-bold text-xs flex items-center justify-center absolute -top-3 shadow-md border-2 border-white dark:border-[#0d0d0d]"
        >
          🥉 3
        </div>
        <div class="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center mb-2 mt-1">
          <img
            v-if="thirdPlace.user.picture"
            :src="thirdPlace.user.picture"
            :alt="thirdPlace.user.name"
            class="w-full h-full rounded-full object-cover"
          />
          <UIcon v-else name="i-heroicons-user" class="w-6 h-6 text-gray-400" />
        </div>
        <p class="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white line-clamp-1">
          {{ thirdPlace.user.name }}
        </p>
        <p class="text-base sm:text-lg font-bold font-mono text-amber-700 dark:text-amber-600 mt-0.5">
          {{ thirdPlace.totalPoints }} pts
        </p>
        <span class="text-[10px] text-gray-400 font-mono">
          {{ thirdPlace.exactScoresCount }} exact · {{ thirdPlace.accuracyRate }}%
        </span>
      </div>
    </div>

    <!-- Search filter input -->
    <div v-if="leaderboard.length > 5" class="flex justify-between items-center">
      <UInput
        v-model="searchQuery"
        placeholder="Search predictor..."
        icon="i-heroicons-magnifying-glass"
        size="sm"
        class="max-w-xs"
      />
      <span class="text-xs text-gray-500 font-mono">
        {{ filteredLeaderboard.length }} participants
      </span>
    </div>

    <!-- Full Leaderboard Table -->
    <div
      class="rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#0d0d0d] overflow-hidden"
    >
      <div v-if="loading" class="py-12 flex justify-center items-center">
        <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
      </div>

      <div
        v-else-if="filteredLeaderboard.length === 0"
        class="p-8 text-center text-gray-400"
      >
        <UIcon name="i-heroicons-trophy" class="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
        <p class="font-semibold text-gray-700 dark:text-gray-300 text-sm">No predictions yet</p>
        <p class="text-xs text-gray-500 mt-1">Be the first to predict an upcoming match and lead the table!</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/[0.06] text-xs font-semibold text-gray-500">
            <tr>
              <th class="py-3 px-4 w-12 text-center">#</th>
              <th class="py-3 px-4">Predictor</th>
              <th class="py-3 px-3 text-center">Exact (🎯)</th>
              <th class="py-3 px-3 text-center">Outcome (✅)</th>
              <th class="py-3 px-3 text-center">Accuracy</th>
              <th class="py-3 px-4 text-right">Points</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-white/[0.05]">
            <tr
              v-for="entry in filteredLeaderboard"
              :key="entry.userId"
              class="hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors"
              :class="[
                entry.userId === authStore.user?.id
                  ? 'bg-emerald-500/5 font-semibold text-emerald-950 dark:text-emerald-100'
                  : 'text-gray-900 dark:text-white',
              ]"
            >
              <!-- Rank -->
              <td class="py-3 px-4 text-center font-mono font-bold">
                <span
                  v-if="entry.rank === 1"
                  class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400/20 text-amber-500 text-xs"
                >🥇</span>
                <span
                  v-else-if="entry.rank === 2"
                  class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-400/20 text-slate-400 text-xs"
                >🥈</span>
                <span
                  v-else-if="entry.rank === 3"
                  class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/20 text-amber-600 text-xs"
                >🥉</span>
                <span v-else class="text-gray-400 text-xs">{{ entry.rank }}</span>
              </td>

              <!-- Predictor info -->
              <td class="py-3 px-4">
                <div class="flex items-center gap-2.5">
                  <div class="w-7 h-7 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                    <img
                      v-if="entry.user.picture"
                      :src="entry.user.picture"
                      :alt="entry.user.name"
                      class="w-full h-full object-cover"
                    />
                    <UIcon v-else name="i-heroicons-user" class="w-4 h-4 text-gray-400" />
                  </div>
                  <div class="flex items-center gap-1.5 truncate">
                    <span class="truncate font-medium">{{ entry.user.name }}</span>
                    <UBadge
                      v-if="entry.userId === authStore.user?.id"
                      size="xs"
                      color="primary"
                      variant="subtle"
                      class="shrink-0"
                    >
                      You
                    </UBadge>
                  </div>
                </div>
              </td>

              <!-- Exact Scores -->
              <td class="py-3 px-3 text-center font-mono text-gray-600 dark:text-gray-300">
                {{ entry.exactScoresCount }}
              </td>

              <!-- Correct Results -->
              <td class="py-3 px-3 text-center font-mono text-gray-600 dark:text-gray-300">
                {{ entry.correctResultsCount }}
              </td>

              <!-- Accuracy % -->
              <td class="py-3 px-3 text-center font-mono text-xs">
                <span
                  class="px-2 py-0.5 rounded-full"
                  :class="[
                    entry.accuracyRate >= 50
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                      : 'text-gray-400',
                  ]"
                >
                  {{ entry.accuracyRate }}%
                </span>
              </td>

              <!-- Total Points -->
              <td class="py-3 px-4 text-right font-mono font-bold text-base text-gray-900 dark:text-white">
                {{ entry.totalPoints }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Rules Modal -->
    <UModal v-model:open="rulesModalOpen" title="Prediction Rules & Scoring">
      <template #content>
        <div class="p-5 space-y-4">
          <div class="space-y-3">
            <div class="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <span class="text-xl">🎯</span>
              <div>
                <h4 class="font-bold text-sm text-gray-900 dark:text-white">
                  Exact Score: +{{ config.exactScorePoints }} Points
                </h4>
                <p class="text-xs text-gray-500 mt-0.5">
                  Awarded when both your predicted home and away goals match the final match score exactly (e.g. predicted 2-1 and match ends 2-1).
                </p>
              </div>
            </div>

            <div class="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <span class="text-xl">✅</span>
              <div>
                <h4 class="font-bold text-sm text-gray-900 dark:text-white">
                  Correct Outcome: +{{ config.correctResultPoints }} Points
                </h4>
                <p class="text-xs text-gray-500 mt-0.5">
                  Awarded when you correctly predict the match winner or a draw, even if the exact score is different (e.g. predicted 1-0 and match ends 3-1).
                </p>
              </div>
            </div>

            <div class="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.08]">
              <span class="text-xl">🔒</span>
              <div>
                <h4 class="font-bold text-sm text-gray-900 dark:text-white">
                  Lockout Timing
                </h4>
                <p class="text-xs text-gray-500 mt-0.5">
                  Predictions can be changed freely until the scheduled kickoff time. Once the match starts or goes LIVE, predictions are permanently locked.
                </p>
              </div>
            </div>
          </div>

          <div class="pt-2 text-right">
            <UButton color="primary" label="Got it" @click="rulesModalOpen = false" />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
