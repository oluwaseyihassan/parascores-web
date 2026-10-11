<script setup lang="ts">
import type { Fixture } from '~/types'
import { useScoreUpdate } from '~/engines/_shared/useScoreUpdate'

const props = defineProps<{
  fixture: Fixture
  tournament?: any
  updatingMatch?: boolean
  loadingPlayers?: boolean
}>()

const emit = defineEmits<{
  'fixture-updated': [fixture: Fixture]
}>()

const fixtureRef = computed(() => props.fixture)
const { changeScore, updating: scoreUpdating } = useScoreUpdate({
  fixture: fixtureRef as any,
  onFixtureUpdated: (f) => emit('fixture-updated', f),
})

const busy = computed(() => props.updatingMatch || scoreUpdating.value)

const homeName = computed(
  () =>
    props.fixture.homeTeam?.customShortName ||
    props.fixture.homeTeam?.customName ||
    props.fixture.homeTeam?.team?.name ||
    'Player 1',
)
const awayName = computed(
  () =>
    props.fixture.awayTeam?.customShortName ||
    props.fixture.awayTeam?.customName ||
    props.fixture.awayTeam?.team?.name ||
    'Player 2',
)

const homeScore = computed(() => props.fixture.homeScore ?? 0)
const awayScore = computed(() => props.fixture.awayScore ?? 0)
</script>

<template>
  <div class="grid grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
    <!-- Home / Player 1 -->
    <div class="flex flex-col items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/[0.06]">
      <div class="text-xs font-semibold text-gray-500 truncate max-w-full mb-1">
        {{ homeName }}
      </div>
      <div class="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tabular-nums my-1">
        {{ homeScore }}
      </div>
      <div class="flex items-center gap-1.5 mt-2">
        <UButton
          size="xs"
          variant="outline"
          color="neutral"
          icon="i-heroicons-minus"
          :disabled="busy || homeScore <= 0"
          @click="changeScore('home', -1)"
        />
        <UButton
          size="xs"
          color="primary"
          icon="i-heroicons-plus"
          label="+1"
          :disabled="busy"
          @click="changeScore('home', 1)"
        />
      </div>
    </div>

    <!-- Away / Player 2 -->
    <div class="flex flex-col items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/[0.06]">
      <div class="text-xs font-semibold text-gray-500 truncate max-w-full mb-1">
        {{ awayName }}
      </div>
      <div class="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tabular-nums my-1">
        {{ awayScore }}
      </div>
      <div class="flex items-center gap-1.5 mt-2">
        <UButton
          size="xs"
          variant="outline"
          color="neutral"
          icon="i-heroicons-minus"
          :disabled="busy || awayScore <= 0"
          @click="changeScore('away', -1)"
        />
        <UButton
          size="xs"
          color="primary"
          icon="i-heroicons-plus"
          label="+1"
          :disabled="busy"
          @click="changeScore('away', 1)"
        />
      </div>
    </div>
  </div>
</template>
