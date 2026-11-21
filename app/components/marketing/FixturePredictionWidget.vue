<script setup lang="ts">
import type { Tournament, Fixture } from '~/types'
import PredictionCard from '~/components/marketing/PredictionCard.vue'
import { getTournamentPredictionConfig } from '~/stores/prediction'

const props = defineProps<{
  tournament: Tournament
  fixture: Fixture
}>()

const predictionStore = usePredictionStore()
const fixtureStore = useFixtureStore()
const { toTournament } = useHost()

const fetchedFixtures = ref<Fixture[]>([])
const tournamentFixtures = computed<Fixture[]>(() => {
  const fromProp = (props.tournament as any)?.fixtures
  if (Array.isArray(fromProp) && fromProp.length) return fromProp
  const fromStore = fixtureStore.fixtures.filter((f) => f.tournament_id === props.tournament.id)
  if (fromStore.length) return fromStore
  if (fetchedFixtures.value.length) return fetchedFixtures.value
  return [props.fixture]
})

const config = computed(() => getTournamentPredictionConfig(props.tournament))
const isFootball = computed(
  () => (props.tournament.sport || '').toLowerCase() === 'football',
)
const isEnabled = computed(() => isFootball.value && config.value.enabled)

onMounted(async () => {
  if (isEnabled.value && props.tournament) {
    if (
      !((props.tournament as any)?.fixtures?.length) &&
      !fixtureStore.fixtures.some((f) => f.tournament_id === props.tournament.id)
    ) {
      try {
        const res = await $publicApi<{
          data?: { rounds?: { fixtures: Fixture[] }[] } | Fixture[]
        }>(`/fixtures/tournaments/${props.tournament.id}`)
        if (res?.data && 'rounds' in res.data && Array.isArray(res.data.rounds)) {
          fetchedFixtures.value = res.data.rounds.flatMap((r) => r.fixtures || [])
        } else if (Array.isArray(res?.data)) {
          fetchedFixtures.value = res.data
        }
      } catch {
        // Fallback to single fixture
      }
    }
    await predictionStore.loadPredictions(props.tournament, tournamentFixtures.value)
  }
})

const prediction = computed(() =>
  predictionStore.getUserPrediction(props.tournament.id, props.fixture.id),
)
const stats = computed(() =>
  predictionStore.getFixtureStats(props.fixture.id),
)

function goToTournamentPredictions() {
  navigateTo(toTournament({ id: props.tournament.customName || props.tournament.id }) + '?tab=predictions')
}
</script>

<template>
  <div v-if="isEnabled" class="max-w-xl mx-auto space-y-3">
    <div class="flex items-center justify-between px-1">
      <span class="text-xs font-semibold text-gray-500 dark:text-gray-400">
        Match Prediction
      </span>

      <UButton
        size="xs"
        variant="ghost"
        color="neutral"
        label="Leaderboard →"
        @click="goToTournamentPredictions"
      />
    </div>

    <PredictionCard
      :fixture="fixture"
      :tournament="tournament"
      :prediction="prediction"
      :stats="stats"
      :all-fixtures="tournamentFixtures"
    />
  </div>
</template>
