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
  <div v-if="isEnabled" class="space-y-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-sparkles" class="w-4 h-4 text-emerald-500" />
        <h3 class="text-sm font-bold text-gray-900 dark:text-white">
          Score Prediction Challenge
        </h3>
      </div>

      <UButton
        size="xs"
        variant="ghost"
        color="neutral"
        icon="i-heroicons-trophy"
        label="View Leaderboard"
        @click="goToTournamentPredictions"
      />
    </div>

    <PredictionCard
      :fixture="fixture"
      :tournament="tournament"
      :prediction="prediction"
      :stats="stats"
      compact
    />
  </div>
</template>
