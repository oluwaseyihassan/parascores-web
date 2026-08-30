<script setup lang="ts">
import type { Fixture } from '~/types'
import { useScoreUpdate } from '~/engines/_shared/useScoreUpdate'
import { SportEngineKey } from '~/engines/types'

const props = defineProps<{
  fixture: Fixture
  tournament?: any
  updatingMatch: boolean
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

// Resolution chain: fixture.config (per-match) → tournament.scoringRules → engine defaults
const engine = inject(SportEngineKey)
const engineSetDefaults = computed(() => engine?.value.setScoring)

const setsToWin = computed(() =>
  Number(props.fixture.config?.setsToWin)
  || Number(props.tournament?.scoringRules?.setsToWin)
  || engineSetDefaults.value?.setsToWin
  || 2,
)
const gamesPerSet = computed(() =>
  Number(props.fixture.config?.gamesPerSet)
  || Number(props.tournament?.scoringRules?.gamesPerSet)
  || engineSetDefaults.value?.gamesPerSet
  || 6,
)
// "Game" (tennis) vs "Point" (table tennis, volleyball)
const gameLabel = computed(() => engineSetDefaults.value?.gameLabel ?? 'Game')

// Per-fixture format override (e.g. best-of-5 final) — free input, odd values only
const savingConfig = ref(false)
const bestOfDraft = ref<number | null>(null)
const bestOfError = ref<string | null>(null)

watch(setsToWin, (v) => {
  bestOfDraft.value = v * 2 - 1
}, { immediate: true })

const applyBestOf = async () => {
  const bestOf = bestOfDraft.value
  if (bestOf == null || Number.isNaN(bestOf)) return
  if (bestOf % 2 === 0) {
    bestOfError.value = 'Must be odd'
    bestOfDraft.value = setsToWin.value * 2 - 1
    return
  }
  bestOfError.value = null
  await setFixtureSetsToWin((bestOf + 1) / 2)
}

const setFixtureSetsToWin = async (value: number) => {
  if (value === setsToWin.value && !props.fixture.config?.setsToWin) return
  savingConfig.value = true
  try {
    const config = { ...(props.fixture.config ?? {}) }
    const inheritedDefault =
      Number(props.tournament?.scoringRules?.setsToWin) ||
      engineSetDefaults.value?.setsToWin ||
      2
    if (inheritedDefault === value) {
      delete config.setsToWin // matches tournament/engine default: no override needed
    } else {
      config.setsToWin = value
    }
    const payload = { config }
    const res = await fixtureStore.updateFixture(props.fixture.id, payload as any)
    emit('fixture-updated', (res as any)?.data ?? { ...props.fixture, ...payload })
  } catch (error: any) {
    handleError(error, { title: 'Failed to update match format' })
  } finally {
    savingConfig.value = false
  }
}

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

const isCompleted = computed(() => props.fixture.status === 'COMPLETED')

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
    <!-- Per-match format override (not on completed matches) -->
    <div v-if="!isCompleted" class="flex items-center justify-center gap-2 text-[11px] text-white/50">
      <span>Best of</span>
      <input
        v-model.number="bestOfDraft"
        type="number"
        min="1"
        max="15"
        step="2"
        class="w-14 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-center text-white text-[11px] focus:outline-none focus:border-amber-500/50"
        :disabled="savingConfig"
        @change="applyBestOf"
      />
      <span v-if="bestOfError" class="text-red-400">{{ bestOfError }}</span>
    </div>

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

    <div v-if="matchWonBy && !isCompleted" class="text-center text-xs font-bold text-amber-400">
      Match won on sets — end the match from the footer when ready.
    </div>

    <!-- Completed matches: read-only -->
    <div v-if="isCompleted" class="text-center text-xs text-white/40">
      Match completed — reopen to adjust scores.
    </div>

    <!-- Current set games -->
    <template v-if="!isCompleted">
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
          {{ gameLabel.toLowerCase() }}s · set {{ completedSets.home.length + 1 }}
        </div>
        <div class="mc-actions-more" style="display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center;">
          <button
            class="mc-btn mc-btn--goal mc-btn--large"
            :disabled="busy"
            @click="side === 'home' ? homeGames++ : awayGames++"
          >
            <UIcon name="i-heroicons-plus" class="w-3.5 h-3.5" />
            <span>{{ gameLabel }}</span>
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
    </template>
  </div>
</template>
