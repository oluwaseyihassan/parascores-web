<script setup lang="ts">
import type { Fixture } from '~/types'
import { useScoreUpdate } from '~/engines/_shared/useScoreUpdate'

const props = defineProps<{
  fixture: Fixture
  increments?: number[]
}>()

const emit = defineEmits<{
  'fixture-updated': [fixture: Fixture]
}>()

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
        :disabled="updating"
        @click="changeScore(side, points)"
      >
        <UIcon name="i-heroicons-plus" class="w-3.5 h-3.5" />
        <span>{{ points }}</span>
      </button>
      <button
        class="mc-btn mc-btn--minus"
        :disabled="updating || ((side === 'home' ? props.fixture.homeScore : props.fixture.awayScore) ?? 0) <= 0"
        @click="changeScore(side, -1)"
      >
        <UIcon name="i-heroicons-minus" class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</template>
