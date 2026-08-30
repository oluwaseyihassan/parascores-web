<script setup lang="ts">
import { MatchEventType, ParticipantType } from '~/types'
import type { Fixture } from '~/types'
import { useScoreUpdate } from '~/engines/_shared/useScoreUpdate'

const props = defineProps<{
  fixture: Fixture
  tournament?: any
  updatingMatch: boolean
  loadingPlayers: boolean
}>()

const emit = defineEmits<{
  'open-goal': [team: 'home' | 'away', type?: MatchEventType]
  'open-card': [team: 'home' | 'away']
  'open-sub': [team: 'home' | 'away']
  'fixture-updated': [fixture: Fixture]
}>()

const isIndividual = computed(
  () => props.tournament?.participantType === ParticipantType.INDIVIDUAL,
)

const fixtureRef = computed(() => props.fixture)
const { changeScore, updating: updatingQuickScore } = useScoreUpdate({
  fixture: fixtureRef as any,
  onFixtureUpdated: (f) => emit('fixture-updated', f),
})

const busy = computed(() => props.updatingMatch || updatingQuickScore.value)
</script>

<template>
  <!-- Home side column -->
  <div class="mc-ctrl-side">
    <button
      class="mc-btn mc-btn--goal mc-btn--large"
      :disabled="props.loadingPlayers || busy"
      @click="emit('open-goal', 'home')"
    >
      <UIcon name="i-heroicons-plus" class="w-3.5 h-3.5" />
      <span>Goal</span>
    </button>
    <button
      v-if="!isIndividual"
      class="mc-btn mc-btn--card mc-btn--large"
      :disabled="props.loadingPlayers || busy"
      @click="emit('open-card', 'home')"
    >
      <span class="card-icons">
        <span class="card-icon card-icon--yellow" />
        <span class="card-icon card-icon--red" />
      </span>
      <span>Card</span>
    </button>
    <button
      v-if="!isIndividual"
      class="mc-btn mc-btn--sub mc-btn--large"
      :disabled="props.loadingPlayers || busy"
      @click="emit('open-sub', 'home')"
    >
      <UIcon name="i-heroicons-arrow-path" class="w-3.5 h-3.5" />
      <span>Sub</span>
    </button>
    <!-- More actions -->
    <div class="mc-actions-more">
      <button
        class="mc-btn mc-btn--penalty"
        :disabled="props.loadingPlayers || busy"
        @click="emit('open-goal', 'home', MatchEventType.PENALTY)"
      >
        <IconsSoccerBallIcon class="w-3.5 h-3.5" />
        <span>Penalty</span>
      </button>
      <button
        class="mc-btn mc-btn--og"
        :disabled="props.loadingPlayers || busy"
        @click="emit('open-goal', 'home', MatchEventType.OWN_GOAL)"
      >
        <IconsSoccerBallIcon class="w-3.5 h-3.5" />
        <span>OG</span>
      </button>
      <button
        class="mc-btn mc-btn--miss"
        :disabled="props.loadingPlayers || busy"
        @click="emit('open-goal', 'home', MatchEventType.MISSED_PENALTY)"
      >
        <UIcon name="i-heroicons-x-circle" class="w-3.5 h-3.5" />
        <span>Missed Pen</span>
      </button>
    </div>
    <button
      v-if="isIndividual"
      class="mc-btn mc-btn--minus"
      :disabled="(props.fixture.homeScore ?? 0) <= 0 || busy"
      @click="changeScore('home', -1)"
    >
      <UIcon name="i-heroicons-minus" class="w-3.5 h-3.5" />
    </button>
  </div>

  <!-- Away side column -->
  <div class="mc-ctrl-side">
    <button
      class="mc-btn mc-btn--goal mc-btn--large"
      :disabled="props.loadingPlayers || busy"
      @click="emit('open-goal', 'away')"
    >
      <UIcon name="i-heroicons-plus" class="w-3.5 h-3.5" />
      <span>Goal</span>
    </button>
    <button
      v-if="!isIndividual"
      class="mc-btn mc-btn--card mc-btn--large"
      :disabled="props.loadingPlayers || busy"
      @click="emit('open-card', 'away')"
    >
      <span class="card-icons">
        <span class="card-icon card-icon--yellow" />
        <span class="card-icon card-icon--red" />
      </span>
      <span>Card</span>
    </button>
    <button
      v-if="!isIndividual"
      class="mc-btn mc-btn--sub mc-btn--large"
      :disabled="props.loadingPlayers || busy"
      @click="emit('open-sub', 'away')"
    >
      <UIcon name="i-heroicons-arrow-path" class="w-3.5 h-3.5" />
      <span>Sub</span>
    </button>
    <div class="mc-actions-more">
      <button
        class="mc-btn mc-btn--penalty"
        :disabled="props.loadingPlayers || busy"
        @click="emit('open-goal', 'away', MatchEventType.PENALTY)"
      >
        <IconsSoccerBallIcon class="w-3.5 h-3.5" />
        <span>Penalty</span>
      </button>
      <button
        class="mc-btn mc-btn--og"
        :disabled="props.loadingPlayers || busy"
        @click="emit('open-goal', 'away', MatchEventType.OWN_GOAL)"
      >
        <IconsSoccerBallIcon class="w-3.5 h-3.5" />
        <span>OG</span>
      </button>
      <button
        class="mc-btn mc-btn--miss"
        :disabled="props.loadingPlayers || busy"
        @click="emit('open-goal', 'away', MatchEventType.MISSED_PENALTY)"
      >
        <UIcon name="i-heroicons-x-circle" class="w-3.5 h-3.5" />
        <span>Missed Pen</span>
      </button>
    </div>
    <button
      v-if="isIndividual"
      class="mc-btn mc-btn--minus"
      :disabled="(props.fixture.awayScore ?? 0) <= 0 || busy"
      @click="changeScore('away', -1)"
    >
      <UIcon name="i-heroicons-minus" class="w-3.5 h-3.5" />
    </button>
  </div>
</template>
