<script setup lang="ts">
import type { Fixture } from '~/types'
import { useScoreUpdate } from '~/engines/_shared/useScoreUpdate'
import { isFixtureHalftime } from '~/composables/useMatchTimer'
import { MatchTimerControlsKey } from '~/composables/match/useMatchTimerControls'
import { ConfirmModalKey } from '~/composables/match/useConfirmModal'

const props = defineProps<{
  fixture: Fixture
  increments?: number[]
}>()

const emit = defineEmits<{
  'fixture-updated': [fixture: Fixture]
}>()

const timerControls = inject(MatchTimerControlsKey, null)
const confirmModal = inject(ConfirmModalKey, null)

const isHalftime = computed(
  () => timerControls?.isHalftime.value ?? isFixtureHalftime(props.fixture),
)

const fixtureRef = computed(() => props.fixture)

const { changeScore, updating } = useScoreUpdate({
  fixture: fixtureRef as any,
  onFixtureUpdated: (f) => emit('fixture-updated', f),
})

const increments = computed(() => props.increments ?? [1, 2, 3])

const handleScoreChange = (side: 'home' | 'away', points: number) => {
  if (isHalftime.value) {
    confirmModal?.openConfirmModal({
      title: 'Match is at Halftime',
      message:
        'Scores cannot be adjusted while the match is at halftime. Would you like to start the 2nd half now to resume scoring?',
      confirmLabel: 'Start 2nd Half',
      confirmColor: 'success',
      onConfirm: async () => {
        await timerControls?.startSecondHalf()
        changeScore(side, points)
      },
    })
    return
  }
  changeScore(side, points)
}
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
        @click="handleScoreChange(side, points)"
      >
        <UIcon name="i-heroicons-plus" class="w-3.5 h-3.5" />
        <span>{{ points }}</span>
      </button>
      <button
        class="mc-btn mc-btn--minus"
        :disabled="updating || ((side === 'home' ? props.fixture.homeScore : props.fixture.awayScore) ?? 0) <= 0"
        @click="handleScoreChange(side, -1)"
      >
        <UIcon name="i-heroicons-minus" class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</template>
