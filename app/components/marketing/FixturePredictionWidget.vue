<script setup lang="ts">
import type { Tournament, Fixture } from '~/types'
import PredictionCard from '~/components/marketing/PredictionCard.vue'
import { getTournamentPredictionConfig } from '~/stores/prediction'

const props = defineProps<{
  tournament: Tournament
  fixture: Fixture
}>()

const predictionStore = usePredictionStore()
const { toTournament } = useHost()

const config = computed(() => getTournamentPredictionConfig(props.tournament))
const isFootball = computed(
  () => (props.tournament.sport || '').toLowerCase() === 'football',
)
const isEnabled = computed(() => isFootball.value && config.value.enabled)

onMounted(async () => {
  if (isEnabled.value && props.tournament) {
    await predictionStore.loadPredictions(props.tournament, [props.fixture])
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
    />
  </div>
</template>
