<script setup lang="ts">
import type { Fixture } from '~/types'
import { FixtureStatus } from '~/types'

interface Props {
  matchup: any
  round?: number
  matchIndex?: number
  isFinal?: boolean
  isArranging?: boolean
  selectedSlot?: {
    round: number
    matchIndex: number
    isHome: boolean
    teamId?: string | null
    team?: any
    placeholder?: string | null
  } | null
  readonly?: boolean
  updatingMatch?: boolean
  isPlayoffFirstRound?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  round: 0,
  matchIndex: 0,
  isFinal: false,
  isArranging: false,
  selectedSlot: null,
  readonly: false,
  updatingMatch: false,
  isPlayoffFirstRound: false
})

const emit = defineEmits<{
  'slot-click': [round: number, matchIndex: number, isHome: boolean]
  'swap-home-away': [round: number, matchIndex: number]
  'start-match': [fixture: Fixture]
  'control-match': [fixture: Fixture]
  'enter-arrange': []
}>()

const getWinnerState = (matchup: any, isHome: boolean): 'winner' | 'loser' | 'none' => {
  if (!matchup || matchup.status !== FixtureStatus.COMPLETED) return 'none'
  const homeScore = matchup.homeScore ?? 0
  const awayScore = matchup.awayScore ?? 0
  if (homeScore === awayScore) {
    const homePen = matchup.homePenaltyScore ?? 0
    const awayPen = matchup.awayPenaltyScore ?? 0
    if (homePen === awayPen) return 'none'
    return isHome ? (homePen > awayPen ? 'winner' : 'loser') : (awayPen > homePen ? 'winner' : 'loser')
  }
  return isHome ? (homeScore > awayScore ? 'winner' : 'loser') : (awayScore > homeScore ? 'winner' : 'loser')
}

// Generate concise 2-4 letter team code matching UEFA / FotMob style
const getTeamCode = (team: any, placeholder?: string | null): string => {
  const short = team?.customShortName?.trim()
  if (short) return short.toUpperCase()

  const rawName = (team?.customName || team?.user?.name || placeholder || '').trim()
  if (!rawName) return 'TBD'

  // If acronym or short word
  if (rawName.length <= 4 && !rawName.includes(' ')) {
    return rawName.toUpperCase()
  }

  const words = rawName.split(/[\s-]+/).filter(Boolean)
  if (words.length >= 3) {
    return (words[0]![0]! + words[1]![0]! + words[2]![0]!).toUpperCase()
  }
  if (words.length === 2) {
    return (words[0]!.slice(0, 2) + words[1]![0]!).toUpperCase()
  }
  return rawName.slice(0, 3).toUpperCase()
}

const homeCode = computed(() => getTeamCode(props.matchup?.homeTeam, props.matchup?.homeTeamPlaceholder))
const awayCode = computed(() => getTeamCode(props.matchup?.awayTeam, props.matchup?.awayTeamPlaceholder))

const homeWinner = computed(() => getWinnerState(props.matchup, true))
const awayWinner = computed(() => getWinnerState(props.matchup, false))

const isLive = computed(() => {
  const st = props.matchup?.status
  return st === FixtureStatus.LIVE || st === FixtureStatus.NORMAL_TIME_ENDED || st === FixtureStatus.EXTRATIME
})

const isCompleted = computed(() => props.matchup?.status === FixtureStatus.COMPLETED)

const isSlotSelected = (round: number, matchIndex: number, isHome: boolean): boolean => {
  if (!props.selectedSlot) return false
  return (
    props.selectedSlot.round === round &&
    props.selectedSlot.matchIndex === matchIndex &&
    props.selectedSlot.isHome === isHome
  )
}

const handleCardClick = () => {
  if (props.isArranging) return
  if (props.matchup?.fixtures?.[0]) {
    emit('control-match', props.matchup.fixtures[0])
  }
}

const handleSlotSelect = (isHome: boolean, event: MouseEvent) => {
  if (!props.isArranging) return
  event.stopPropagation()
  emit('slot-click', props.round, props.matchIndex, isHome)
}
</script>

<template>
  <div
    class="compact-match-card group relative select-none rounded-xl border transition-all duration-200"
    :class="[
      isFinal ? 'border-amber-500/30 bg-[#16171c] shadow-lg shadow-amber-500/5' : 'border-white/10 dark:border-white/10 bg-[#151619] hover:border-white/25 shadow',
      isLive ? 'ring-1 ring-emerald-500/50' : '',
      isArranging ? 'cursor-default' : 'cursor-pointer hover:scale-[1.02]'
    ]"
    @click="handleCardClick"
  >
    <!-- Teams & Logos Header -->
    <div class="flex items-center justify-between gap-1 p-2 pb-1">
      <!-- Home Team -->
      <div
        class="flex flex-1 flex-col items-center min-w-0"
        :class="{
          'cursor-pointer rounded-lg p-0.5 ring-2 ring-emerald-500/70 bg-emerald-500/10': isArranging && isSlotSelected(round, matchIndex, true),
          'cursor-pointer hover:bg-white/5 rounded-lg p-0.5': isArranging && matchup.status === FixtureStatus.SCHEDULED
        }"
        @click="handleSlotSelect(true, $event)"
      >
        <!-- Logo -->
        <div class="w-5 h-5 rounded-full overflow-hidden bg-white/5 flex items-center justify-center shrink-0 mb-1 border border-white/10">
          <img
            v-if="matchup.homeTeam?.logoUrl"
            :src="matchup.homeTeam.logoUrl"
            :alt="homeCode"
            class="w-full h-full object-cover"
          />
          <span v-else class="text-[9px] font-bold text-gray-300">
            {{ homeCode.charAt(0) }}
          </span>
        </div>
        <!-- Short Code -->
        <span
          class="text-[10px] font-bold tracking-tight truncate max-w-full"
          :class="[
            homeWinner === 'winner' ? 'text-white font-extrabold' : '',
            homeWinner === 'loser' ? 'text-gray-500 line-through opacity-60' : '',
            homeWinner === 'none' ? 'text-gray-200' : ''
          ]"
          :title="matchup.homeTeam?.customName || matchup.homeTeamPlaceholder || homeCode"
        >
          {{ homeCode }}
        </span>
      </div>

      <!-- Away Team -->
      <div
        class="flex flex-1 flex-col items-center min-w-0"
        :class="{
          'cursor-pointer rounded-lg p-0.5 ring-2 ring-emerald-500/70 bg-emerald-500/10': isArranging && isSlotSelected(round, matchIndex, false),
          'cursor-pointer hover:bg-white/5 rounded-lg p-0.5': isArranging && matchup.status === FixtureStatus.SCHEDULED
        }"
        @click="handleSlotSelect(false, $event)"
      >
        <!-- Logo -->
        <div class="w-5 h-5 rounded-full overflow-hidden bg-white/5 flex items-center justify-center shrink-0 mb-1 border border-white/10">
          <img
            v-if="matchup.awayTeam?.logoUrl"
            :src="matchup.awayTeam.logoUrl"
            :alt="awayCode"
            class="w-full h-full object-cover"
          />
          <span v-else class="text-[9px] font-bold text-gray-300">
            {{ awayCode.charAt(0) }}
          </span>
        </div>
        <!-- Short Code -->
        <span
          class="text-[10px] font-bold tracking-tight truncate max-w-full"
          :class="[
            awayWinner === 'winner' ? 'text-white font-extrabold' : '',
            awayWinner === 'loser' ? 'text-gray-500 line-through opacity-60' : '',
            awayWinner === 'none' ? 'text-gray-200' : ''
          ]"
          :title="matchup.awayTeam?.customName || matchup.awayTeamPlaceholder || awayCode"
        >
          {{ awayCode }}
        </span>
      </div>
    </div>

    <!-- Score Area -->
    <div class="px-2 pb-1.5 flex flex-col items-center justify-center">
      <!-- Live Indicator -->
      <div v-if="isLive" class="flex items-center gap-1 mb-0.5">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        <span class="text-[8px] font-black text-emerald-400 uppercase tracking-wider">Live</span>
      </div>

      <!-- Numbers -->
      <div
        v-if="isCompleted || isLive"
        class="text-xs font-black tracking-widest text-white leading-tight"
      >
        <span>{{ matchup.homeScore ?? 0 }}</span>
        <span class="text-gray-500 mx-1">-</span>
        <span>{{ matchup.awayScore ?? 0 }}</span>
      </div>
      <div v-else class="text-[11px] font-bold text-gray-500 tracking-wider">
        vs
      </div>

      <!-- Penalties subscript if any -->
      <div
        v-if="matchup.homePenaltyScore != null && matchup.awayPenaltyScore != null"
        class="text-[9px] font-semibold text-gray-400 -mt-0.5"
      >
        ({{ matchup.homePenaltyScore }} - {{ matchup.awayPenaltyScore }})
      </div>

      <!-- Grand Final Pill Badge -->
      <div
        v-if="isFinal"
        class="mt-1 px-2 py-0.5 rounded-full bg-amber-400 text-black text-[8px] font-black uppercase tracking-wider shadow-sm select-none"
      >
        FINAL
      </div>
    </div>

    <!-- Arrange Mode Swap H/A Button on hover -->
    <button
      v-if="isArranging && matchup.status === FixtureStatus.SCHEDULED"
      type="button"
      class="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-zinc-800 border border-white/20 text-gray-300 hover:text-white flex items-center justify-center shadow"
      title="Swap Home/Away"
      @click.stop="emit('swap-home-away', round, matchIndex)"
    >
      <UIcon name="i-heroicons-arrows-up-down" class="w-2.5 h-2.5" />
    </button>
  </div>
</template>

<style scoped>
.compact-match-card {
  width: 84px;
  min-width: 84px;
}

@media (min-width: 640px) {
  .compact-match-card {
    width: 92px;
    min-width: 92px;
  }
}
</style>
