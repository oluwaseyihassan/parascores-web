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

const { handleError } = useErrors()

const fixtureRef = computed(() => props.fixture)
const { changeScore, updating } = useScoreUpdate({
  fixture: fixtureRef as any,
  onFixtureUpdated: (f) => emit('fixture-updated', f),
})

const increments = computed(() => props.increments ?? [1])

// Result control: Decision (points decide) or a stoppage (KO/TKO/DQ) where the
// winner is picked explicitly — a stoppage can end a bout level on points.
const RESULT_TYPES = [
  { value: 'DECISION', label: 'Decision' },
  { value: 'KO', label: 'KO' },
  { value: 'TKO', label: 'TKO' },
  { value: 'DQ', label: 'DQ' },
] as const

type ResultType = (typeof RESULT_TYPES)[number]['value']

const config = computed(() => (props.fixture.config ?? {}) as Record<string, any>)
const resultType = computed<ResultType>(() => config.value.resultType ?? 'DECISION')
const winnerId = computed<string | null>(() => config.value.winnerId ?? null)

const savingResult = ref(false)

const persistResult = async (type: ResultType, winner: string | null) => {
  savingResult.value = true
  try {
    const res = await $api<{ success: boolean; data?: Fixture }>(
      `/fixtures/${props.fixture.id}`,
      {
        method: 'PATCH',
        body: {
          config: {
            ...config.value,
            resultType: type,
            // undefined keys are dropped from the JSON payload → clears the field
            winnerId: type === 'DECISION' ? undefined : (winner ?? undefined),
          },
        },
      },
    )
    if (res.data) emit('fixture-updated', res.data)
  } catch (error: any) {
    handleError(error, { title: 'Failed to save result type' })
  } finally {
    savingResult.value = false
  }
}

const sideName = (side: 'home' | 'away') => {
  const team = side === 'home' ? props.fixture.homeTeam : props.fixture.awayTeam
  return team?.customShortName ?? team?.customName ?? team?.team?.name ?? (side === 'home' ? 'Home' : 'Away')
}

const sideId = (side: 'home' | 'away') =>
  side === 'home' ? props.fixture.homeTeamId : props.fixture.awayTeamId
</script>

<template>
  <div class="col-span-full w-full space-y-4">
    <!-- Point scoring per fighter -->
    <div class="grid grid-cols-2 gap-4">
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
            :disabled="updating || savingResult"
            @click="changeScore(side, points)"
          >
            <UIcon name="i-heroicons-plus" class="w-3.5 h-3.5" />
            <span>{{ points }}</span>
          </button>
          <button
            class="mc-btn mc-btn--minus"
            :disabled="updating || savingResult || ((side === 'home' ? props.fixture.homeScore : props.fixture.awayScore) ?? 0) <= 0"
            @click="changeScore(side, -1)"
          >
            <UIcon name="i-heroicons-minus" class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Result type -->
    <div class="text-center space-y-2">
      <div class="text-[10px] text-white/40 uppercase tracking-wider">How did it end?</div>
      <div class="flex justify-center gap-1.5 flex-wrap">
        <button
          v-for="rt in RESULT_TYPES"
          :key="rt.value"
          class="mc-btn text-xs px-3 py-1.5 rounded-lg border"
          :class="resultType === rt.value
            ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400'
            : 'bg-white/[0.03] border-white/10 text-white/50 hover:text-white'"
          :disabled="savingResult"
          @click="persistResult(rt.value, rt.value === 'DECISION' ? null : winnerId)"
        >
          {{ rt.label }}
        </button>
      </div>

      <!-- Stoppage winner (a KO/TKO/DQ can happen level on points) -->
      <div v-if="resultType !== 'DECISION'" class="space-y-1.5">
        <div class="text-[10px] text-white/40 uppercase tracking-wider">Winner</div>
        <div class="flex justify-center gap-1.5">
          <button
            v-for="side in (['home', 'away'] as const)"
            :key="side"
            class="mc-btn text-xs px-3 py-1.5 rounded-lg border"
            :class="winnerId === sideId(side)
              ? 'bg-amber-500/15 border-amber-500/50 text-amber-400'
              : 'bg-white/[0.03] border-white/10 text-white/50 hover:text-white'"
            :disabled="savingResult"
            @click="persistResult(resultType, sideId(side))"
          >
            {{ sideName(side) }}
          </button>
        </div>
        <p v-if="!winnerId" class="text-[10px] text-amber-400/80">
          Pick the winner — required to complete a stoppage.
        </p>
      </div>
    </div>
  </div>
</template>
