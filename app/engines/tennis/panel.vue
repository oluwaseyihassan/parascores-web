<script setup lang="ts">
import type { Fixture } from '~/types'
import { useScoreUpdate } from '~/engines/_shared/useScoreUpdate'

const props = defineProps<{
  fixture: Fixture
  updatingMatch: boolean
  setsToWin?: number
  gamesPerSet?: number
}>()

const emit = defineEmits<{
  'fixture-updated': [fixture: Fixture]
}>()

const fixtureRef = computed(() => props.fixture)
const { updating: updatingQuickScore } = useScoreUpdate({
  fixture: fixtureRef as any,
  onFixtureUpdated: (f) => emit('fixture-updated', f),
})

const fixtureStore = useFixtureStore()
const { handleError } = useErrors()

const setsToWin = computed(() => props.setsToWin ?? 2)
const gamesPerSet = computed(() => props.gamesPerSet ?? 6)

// Completed sets, persisted on the fixture
const completedSets = computed(() => props.fixture.periodScores ?? { home: [], away: [] })

// Current set game score — local session state (persisted when the set completes)
const homeGames = ref(0)
const awayGames = ref(0)
const savingSet = ref(false)

const busy = computed(
  () => props.updatingMatch || updatingQuickScore.value || savingSet.value,
)

// Set is won at 6+ games with a 2-game margin (covers 6-4, 7-5) or 7-6 tiebreak
const setWonBy = computed<'home' | 'away' | null>(() => {
  const target = gamesPerSet.value
  const h = homeGames.value
  const a = awayGames.value
  if (h >= target && h - a >= 2) return 'home'
  if (a >= target && a - h >= 2) return 'away'
  return null
})

const setsWon = computed(() => ({
  home: props.fixture.homeScore ?? 0,
  away: props.fixture.awayScore ?? 0,
}))

const matchWonBy = computed<'home' | 'away' | null>(() => {
  if (setsWon.value.home >= setsToWin.value) return 'home'
  if (setsWon.value.away >= setsToWin.value) return 'away'
  return null
})

const recordSet = async (winner: 'home' | 'away') => {
  const fixture = props.fixture
  savingSet.value = true
  try {
    const payload = {
      periodScores: {
        home: [...completedSets.value.home, homeGames.value],
        away: [...completedSets.value.away, awayGames.value],
      },
      homeScore: setsWon.value.home + (winner === 'home' ? 1 : 0),
      awayScore: setsWon.value.away + (winner === 'away' ? 1 : 0),
    }
    const res = await fixtureStore.updateFixture(fixture.id, payload as any)
    homeGames.value = 0
    awayGames.value = 0
    emit('fixture-updated', (res as any)?.data ?? { ...fixture, ...payload })
  } catch (error: any) {
    handleError(error, { title: 'Failed to record set' })
  } finally {
    savingSet.value = false
  }
}

const undoLastSet = async () => {
  const fixture = props.fixture
  if (completedSets.value.home.length === 0) return
  savingSet.value = true
  try {
    const lastIndex = completedSets.value.home.length - 1
    const lastWinner =
      completedSets.value.home[lastIndex]! > completedSets.value.away[lastIndex]!
        ? 'home'
        : 'away'
    const payload = {
      periodScores: {
        home: completedSets.value.home.slice(0, -1),
        away: completedSets.value.away.slice(0, -1),
      },
      homeScore: setsWon.value.home - (lastWinner === 'home' ? 1 : 0),
      awayScore: setsWon.value.away - (lastWinner === 'away' ? 1 : 0),
    }
    const res = await fixtureStore.updateFixture(fixture.id, payload as any)
    emit('fixture-updated', (res as any)?.data ?? { ...fixture, ...payload })
  } catch (error: any) {
    handleError(error, { title: 'Failed to undo set' })
  } finally {
    savingSet.value = false
  }
}
</script>

<template>
  <div class="col-span-full w-full space-y-4">
    <!-- Set history -->
    <div v-if="completedSets.home.length" class="flex items-center justify-center gap-2 flex-wrap">
      <span
        v-for="(h, i) in completedSets.home"
        :key="i"
        class="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/5 border border-white/10"
      >
        Set {{ i + 1 }}: {{ h }}–{{ completedSets.away[i] }}
      </span>
      <button
        class="text-[10px] text-white/40 hover:text-white underline"
        :disabled="savingSet"
        @click="undoLastSet"
      >
        Undo last set
      </button>
    </div>

    <div v-if="matchWonBy" class="text-center text-xs font-bold text-amber-400">
      Match won on sets — end the match from the footer when ready.
    </div>

    <!-- Current set games -->
    <div class="grid grid-cols-2 gap-4">
      <div
        v-for="side in (['home', 'away'] as const)"
        :key="side"
        class="mc-ctrl-side"
      >
        <div class="text-center text-2xl font-black mb-1">
          {{ side === 'home' ? homeGames : awayGames }}
        </div>
        <div class="text-center text-[10px] text-white/40 uppercase tracking-wider mb-2">
          games · set {{ completedSets.home.length + 1 }}
        </div>
        <div class="mc-actions-more" style="display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center;">
          <button
            class="mc-btn mc-btn--goal mc-btn--large"
            :disabled="busy"
            @click="side === 'home' ? homeGames++ : awayGames++"
          >
            <UIcon name="i-heroicons-plus" class="w-3.5 h-3.5" />
            <span>Game</span>
          </button>
          <button
            class="mc-btn mc-btn--minus"
            :disabled="busy || (side === 'home' ? homeGames : awayGames) <= 0"
            @click="side === 'home' ? homeGames-- : awayGames--"
          >
            <UIcon name="i-heroicons-minus" class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Record set -->
    <div v-if="setWonBy" class="flex justify-center">
      <button
        class="mc-primary-btn mc-primary-btn--start"
        :disabled="savingSet"
        @click="recordSet(setWonBy)"
      >
        <UIcon name="i-heroicons-check-circle" class="w-4 h-4" />
        <span>Record Set {{ completedSets.home.length + 1 }} ({{ homeGames }}–{{ awayGames }})</span>
      </button>
    </div>
  </div>
</template>
