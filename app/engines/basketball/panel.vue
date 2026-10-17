<script setup lang="ts">
import type { Fixture } from '~/types'
import { useScoreUpdate } from '~/engines/_shared/useScoreUpdate'
import { isFixtureHalftime } from '~/composables/useMatchTimer'
import { MatchTimerControlsKey } from '~/composables/match/useMatchTimerControls'

const props = defineProps<{
  fixture: Fixture
  increments?: number[]
}>()

const emit = defineEmits<{
  'fixture-updated': [fixture: Fixture]
}>()

const timerControls = inject(MatchTimerControlsKey, null)
const isHalftime = computed(
  () => timerControls?.isHalftime.value ?? isFixtureHalftime(props.fixture),
)

const fixtureRef = computed(() => props.fixture)

const { changeScore, updating } = useScoreUpdate({
  fixture: fixtureRef as any,
  onFixtureUpdated: (f) => emit('fixture-updated', f),
})

const increments = computed(() => props.increments ?? [1, 2, 3])
</script>

<template>
  <div
    v-for="side in (['home', 'away'] as const)"
    :key="side"
    class="mc-ctrl-side"
  >
    <div class="mc-actions-more" style="display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center;">
      <button
        v-for="points in increments"
        :key="points"
        class="mc-btn mc-btn--goal mc-btn--large"
        :disabled="updating || isHalftime"
        :title="isHalftime ? 'Cannot update score during halftime' : undefined"
        @click="changeScore(side, points)"
      >
        <UIcon name="i-heroicons-plus" class="w-3.5 h-3.5" />
        <span>{{ points }}</span>
      </button>
      <button
        class="mc-btn mc-btn--minus"
        :disabled="updating || isHalftime || ((side === 'home' ? props.fixture.homeScore : props.fixture.awayScore) ?? 0) <= 0"
        :title="isHalftime ? 'Cannot update score during halftime' : undefined"
        @click="changeScore(side, -1)"
      >
        <UIcon name="i-heroicons-minus" class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</template>
