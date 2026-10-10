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

const homeName = computed(
  () =>
    props.fixture.homeTeam?.customShortName ||
    props.fixture.homeTeam?.customName ||
    'Home',
)
const awayName = computed(
  () =>
    props.fixture.awayTeam?.customShortName ||
    props.fixture.awayTeam?.customName ||
    'Away',
)

// Rare scoring events collapse behind a per-side "more" toggle
const extrasHome = ref(false)
const extrasAway = ref(false)
</script>

<template>
  <!-- Home side column -->
  <div class="mc-deck__side">
    <div class="mc-deck__label">{{ homeName }}</div>
    <button
      class="mc-deck__goal"
      :disabled="props.loadingPlayers || busy"
      @click="emit('open-goal', 'home')"
    >
      <UIcon name="i-heroicons-plus" class="w-4 h-4" />
      <span>Goal</span>
    </button>
    <div v-if="!isIndividual" class="mc-deck__row">
      <button
        class="mc-deck__btn"
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
        class="mc-deck__btn"
        :disabled="props.loadingPlayers || busy"
        @click="emit('open-sub', 'home')"
      >
        <UIcon name="i-heroicons-arrow-path" class="w-3.5 h-3.5" />
        <span>Sub</span>
      </button>
    </div>
    <!-- Rare events -->
    <template v-if="!isIndividual">
      <button
        class="mc-deck__more"
        :aria-expanded="extrasHome"
        @click="extrasHome = !extrasHome"
      >
        <UIcon name="i-heroicons-ellipsis-horizontal" class="w-3.5 h-3.5" />
        <span>Pen · OG · Missed pen</span>
        <UIcon
          name="i-heroicons-chevron-down"
          class="w-3 h-3 transition-transform"
          :class="{ 'rotate-180': extrasHome }"
        />
      </button>
      <div v-show="extrasHome" class="mc-deck__extras">
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
    </template>
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
  <div class="mc-deck__side">
    <div class="mc-deck__label">{{ awayName }}</div>
    <button
      class="mc-deck__goal"
      :disabled="props.loadingPlayers || busy"
      @click="emit('open-goal', 'away')"
    >
      <UIcon name="i-heroicons-plus" class="w-4 h-4" />
      <span>Goal</span>
    </button>
    <div v-if="!isIndividual" class="mc-deck__row">
      <button
        class="mc-deck__btn"
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
        class="mc-deck__btn"
        :disabled="props.loadingPlayers || busy"
        @click="emit('open-sub', 'away')"
      >
        <UIcon name="i-heroicons-arrow-path" class="w-3.5 h-3.5" />
        <span>Sub</span>
      </button>
    </div>
    <!-- Rare events -->
    <template v-if="!isIndividual">
      <button
        class="mc-deck__more"
        :aria-expanded="extrasAway"
        @click="extrasAway = !extrasAway"
      >
        <UIcon name="i-heroicons-ellipsis-horizontal" class="w-3.5 h-3.5" />
        <span>Pen · OG · Missed pen</span>
        <UIcon
          name="i-heroicons-chevron-down"
          class="w-3 h-3 transition-transform"
          :class="{ 'rotate-180': extrasAway }"
        />
      </button>
      <div v-show="extrasAway" class="mc-deck__extras">
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
    </template>
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
