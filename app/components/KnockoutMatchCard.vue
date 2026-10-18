<script setup lang="ts">
import type { Fixture } from '~/types'
import { FixtureStatus } from '~/types'

interface Props {
  matchup: any
  round?: number
  matchIndex?: number
  halfTitle?: string | null
  isTopHalf?: boolean | null
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
  isChampionshipFinal?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  round: 0,
  matchIndex: 0,
  halfTitle: null,
  isTopHalf: null,
  isArranging: false,
  selectedSlot: null,
  readonly: false,
  updatingMatch: false,
  isPlayoffFirstRound: false,
  isChampionshipFinal: false
})

const emit = defineEmits<{
  'slot-click': [round: number, matchIndex: number, isHome: boolean]
  'swap-home-away': [round: number, matchIndex: number]
  'start-match': [fixture: Fixture]
  'control-match': [fixture: Fixture]
  'enter-arrange': []
}>()

const getWinnerState = (matchup: any, isHome: boolean): 'winner' | 'loser' | 'none' => {
  if (matchup.status !== FixtureStatus.COMPLETED) return 'none'
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

const hasNoWinner = (matchup: any): boolean => {
  if (matchup.status !== FixtureStatus.COMPLETED) return false
  const homeScore = matchup.homeScore ?? 0
  const awayScore = matchup.awayScore ?? 0
  if (homeScore !== awayScore) return false
  const homePen = matchup.homePenaltyScore ?? 0
  const awayPen = matchup.awayPenaltyScore ?? 0
  return homePen === awayPen
}

const getTeamName = (matchup: any, isHome: boolean) => {
  const team = isHome ? matchup.homeTeam : matchup.awayTeam
  if (team) {
    return team.customShortName || team.customName || team.user?.name || 'TBD'
  }
  return isHome ? (matchup.homeTeamPlaceholder || 'TBD') : (matchup.awayTeamPlaceholder || 'TBD')
}

const isTeamKnown = (matchup: any, isHome: boolean) => {
  return isHome ? !!matchup.homeTeamId : !!matchup.awayTeamId
}

const getMatchTime = (matchup: any): string | null => {
  return matchup.fixtures?.[0]?.startTime || null
}

const getMatchVenue = (matchup: any): string | null => {
  return matchup.fixtures?.[0]?.venue || null
}

const formatMatchTime = (dateStr: string | null | undefined): string | null => {
  if (!dateStr) return null
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return null
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
      ' \u00b7 ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  } catch { return null }
}

const isSlotSelected = (round: number, matchIndex: number, isHome: boolean): boolean => {
  if (!props.selectedSlot) return false
  return (
    props.selectedSlot.round === round &&
    props.selectedSlot.matchIndex === matchIndex &&
    props.selectedSlot.isHome === isHome
  )
}

const hasFooter = (matchup: any) => {
  if (
    matchup.status === FixtureStatus.LIVE ||
    matchup.status === FixtureStatus.NORMAL_TIME_ENDED ||
    matchup.status === FixtureStatus.EXTRATIME ||
    matchup.status === FixtureStatus.COMPLETED ||
    hasNoWinner(matchup)
  ) {
    return true
  }

  if (!props.readonly) {
    if (matchup.fixtures.length === 1) {
      if (
        (matchup.status === FixtureStatus.SCHEDULED && matchup.homeTeamId && matchup.awayTeamId) ||
        matchup.status === FixtureStatus.LIVE ||
        matchup.status === FixtureStatus.NORMAL_TIME_ENDED ||
        matchup.status === FixtureStatus.EXTRATIME ||
        matchup.status === FixtureStatus.COMPLETED
      ) {
        return true
      }
    } else {
      if (
        matchup.fixtures.some(
          (leg: any) =>
            (leg.status === FixtureStatus.SCHEDULED && leg.homeTeamId && leg.awayTeamId) ||
            leg.status === FixtureStatus.LIVE ||
            leg.status === FixtureStatus.NORMAL_TIME_ENDED ||
            leg.status === FixtureStatus.EXTRATIME ||
            leg.status === FixtureStatus.COMPLETED
        )
      ) {
        return true
      }
    }
  }

  return false
}
</script>

<template>
  <div
    class="match-card"
    :class="{
      'match-card--live': matchup.status === FixtureStatus.LIVE || matchup.status === FixtureStatus.NORMAL_TIME_ENDED || matchup.status === FixtureStatus.EXTRATIME,
      'match-card--completed': matchup.status === FixtureStatus.COMPLETED,
      'match-card--top-half': isTopHalf === true,
      'match-card--bottom-half': isTopHalf === false,
      'match-card--final': isChampionshipFinal
    }"
  >
    <!-- Half Header / Path Badge -->
    <div v-if="halfTitle" class="match-half-header">
      <div class="flex items-center gap-1.5">
        <span
          class="half-dot"
          :class="isTopHalf === true ? 'half-dot--top' : isTopHalf === false ? 'half-dot--bottom' : 'bg-gray-400'"
        />
        <span
          class="half-title"
          :class="isTopHalf === true ? 'half-title--top' : isTopHalf === false ? 'half-title--bottom' : 'text-gray-500'"
        >
          {{ halfTitle }}
        </span>
      </div>
      <span v-if="isArranging" class="text-[9px] text-gray-400 font-mono">
        M{{ matchIndex + 1 }}
      </span>
    </div>

    <!-- Home team row -->
    <div
      class="team-row"
      :class="{
        'team-row--winner': getWinnerState(matchup, true) === 'winner',
        'team-row--loser': getWinnerState(matchup, true) === 'loser',
        'team-row--selectable': isArranging && matchup.status === FixtureStatus.SCHEDULED,
        'team-row--selected': isSlotSelected(round, matchIndex, true),
      }"
      @click="emit('slot-click', round, matchIndex, true)"
    >
      <div class="team-avatar">
        <img v-if="matchup.homeTeam?.logoUrl" :src="matchup.homeTeam.logoUrl" class="team-avatar__img" />
        <span v-else class="team-avatar__initial">
          {{ getTeamName(matchup, true).charAt(0).toUpperCase() }}
        </span>
      </div>
      <span class="team-name" :class="{ 'team-name--tbd': !isTeamKnown(matchup, true) }">
        {{ getTeamName(matchup, true) }}
      </span>

      <!-- Slot swap indicator when arranging -->
      <div v-if="isArranging && matchup.status === FixtureStatus.SCHEDULED" class="arrange-slot-icon">
        <UIcon
          v-if="isSlotSelected(round, matchIndex, true)"
          name="i-heroicons-check-circle"
          class="w-4 h-4 text-primary-500 animate-pulse"
        />
        <UIcon
          v-else-if="selectedSlot && selectedSlot.round === round"
          name="i-heroicons-arrows-right-left"
          class="w-3.5 h-3.5 text-amber-500"
        />
        <UIcon
          v-else
          name="i-heroicons-arrows-right-left"
          class="w-3 h-3 text-gray-400 opacity-30 hover:opacity-100"
        />
      </div>

      <!-- Standard score area -->
      <div v-else class="team-score-area">
        <span v-if="matchup.homeSubScores" class="sub-scores">
          {{ matchup.homeSubScores.map((s: any) => s !== null && s !== undefined ? s : '-').join(', ') }}
        </span>
        <span v-if="matchup.homePenaltyScore != null" class="pen-score">
          ({{ matchup.homePenaltyScore }})
        </span>
        <span
          class="score"
          :class="{
            'score--winner': getWinnerState(matchup, true) === 'winner',
            'score--active': matchup.status === FixtureStatus.LIVE || matchup.status === FixtureStatus.NORMAL_TIME_ENDED || matchup.status === FixtureStatus.EXTRATIME || matchup.status === FixtureStatus.COMPLETED,
          }"
        >
          {{ matchup.status === FixtureStatus.COMPLETED || matchup.status === FixtureStatus.LIVE || matchup.status === FixtureStatus.NORMAL_TIME_ENDED || matchup.status === FixtureStatus.EXTRATIME ? matchup.homeScore : '-' }}
        </span>
      </div>
    </div>

    <!-- Divider -->
    <div class="team-divider" />

    <!-- Away team row -->
    <div
      class="team-row"
      :class="{
        'team-row--winner': getWinnerState(matchup, false) === 'winner',
        'team-row--loser': getWinnerState(matchup, false) === 'loser',
        'team-row--selectable': isArranging && matchup.status === FixtureStatus.SCHEDULED,
        'team-row--selected': isSlotSelected(round, matchIndex, false),
      }"
      @click="emit('slot-click', round, matchIndex, false)"
    >
      <div class="team-avatar">
        <img v-if="matchup.awayTeam?.logoUrl" :src="matchup.awayTeam.logoUrl" class="team-avatar__img" />
        <span v-else class="team-avatar__initial">
          {{ getTeamName(matchup, false).charAt(0).toUpperCase() }}
        </span>
      </div>
      <span class="team-name" :class="{ 'team-name--tbd': !isTeamKnown(matchup, false) }">
        {{ getTeamName(matchup, false) }}
      </span>

      <!-- Slot swap indicator when arranging -->
      <div v-if="isArranging && matchup.status === FixtureStatus.SCHEDULED" class="arrange-slot-icon">
        <UIcon
          v-if="isSlotSelected(round, matchIndex, false)"
          name="i-heroicons-check-circle"
          class="w-4 h-4 text-primary-500 animate-pulse"
        />
        <UIcon
          v-else-if="selectedSlot && selectedSlot.round === round"
          name="i-heroicons-arrows-right-left"
          class="w-3.5 h-3.5 text-amber-500"
        />
        <UIcon
          v-else
          name="i-heroicons-arrows-right-left"
          class="w-3 h-3 text-gray-400 opacity-30 hover:opacity-100"
        />
      </div>

      <!-- Standard score area -->
      <div v-else class="team-score-area">
        <span v-if="matchup.awaySubScores" class="sub-scores">
          {{ matchup.awaySubScores.map((s: any) => s !== null && s !== undefined ? s : '-').join(', ') }}
        </span>
        <span v-if="matchup.awayPenaltyScore != null" class="pen-score">
          ({{ matchup.awayPenaltyScore }})
        </span>
        <span
          class="score"
          :class="{
            'score--winner': getWinnerState(matchup, false) === 'winner',
            'score--active': matchup.status === FixtureStatus.LIVE || matchup.status === FixtureStatus.NORMAL_TIME_ENDED || matchup.status === FixtureStatus.EXTRATIME || matchup.status === FixtureStatus.COMPLETED,
          }"
        >
          {{ matchup.status === FixtureStatus.COMPLETED || matchup.status === FixtureStatus.LIVE || matchup.status === FixtureStatus.NORMAL_TIME_ENDED || matchup.status === FixtureStatus.EXTRATIME ? matchup.awayScore : '-' }}
        </span>
      </div>
    </div>

    <!-- Match info: time & venue -->
    <div v-if="getMatchTime(matchup) || getMatchVenue(matchup)" class="match-info">
      <span v-if="getMatchTime(matchup)" class="match-info__item">
        <UIcon name="i-heroicons-calendar" class="match-info__icon" />
        {{ formatMatchTime(getMatchTime(matchup)) }}
      </span>
      <span v-if="getMatchVenue(matchup)" class="match-info__item">
        <UIcon name="i-heroicons-map-pin" class="match-info__icon" />
        {{ getMatchVenue(matchup) }}
      </span>
    </div>

    <!-- Footer: in arrange mode show Swap H/A button, otherwise normal actions -->
    <div v-if="isArranging && matchup.status === FixtureStatus.SCHEDULED" class="match-footer match-footer--arrange">
      <span class="text-[9px] text-gray-400 font-medium">Click team to swap</span>
      <button
        type="button"
        class="action-btn action-btn--edit"
        title="Swap Home/Away advantage"
        @click.stop="emit('swap-home-away', round, matchIndex)"
      >
        <UIcon name="i-heroicons-arrows-up-down" class="w-3 h-3" />
        <span>Swap H/A</span>
      </button>
    </div>

    <div v-else-if="hasFooter(matchup)" class="match-footer">
      <!-- Live indicator -->
      <div v-if="matchup.status === FixtureStatus.LIVE || matchup.status === FixtureStatus.NORMAL_TIME_ENDED || matchup.status === FixtureStatus.EXTRATIME" class="status-live">
        <span class="live-dot" />
        <span>{{ matchup.status === FixtureStatus.EXTRATIME ? 'ET' : matchup.status === FixtureStatus.NORMAL_TIME_ENDED ? 'FT' : 'Live' }}</span>
      </div>
      <div v-else-if="matchup.status === FixtureStatus.COMPLETED && !hasNoWinner(matchup)" class="status-done">
        <UIcon name="i-heroicons-check-circle" class="w-3 h-3" />
        <span>FT</span>
      </div>
      <div v-else-if="hasNoWinner(matchup)" class="status-warn">
        <UIcon name="i-heroicons-exclamation-triangle" class="w-3 h-3" />
        <span>No winner</span>
      </div>

      <!-- Actions -->
      <div v-if="!readonly" class="match-actions">
        <button
          v-if="round === 0 && isPlayoffFirstRound && matchup.status === FixtureStatus.SCHEDULED"
          class="action-btn action-btn--edit"
          title="Arrange playoff matchups"
          @click.stop="emit('enter-arrange')"
        >
          <UIcon name="i-heroicons-pencil-square" class="w-3 h-3" />
          Arrange
        </button>
        <template v-if="matchup.fixtures.length === 1">
          <button
            v-if="matchup.status === FixtureStatus.SCHEDULED && matchup.homeTeamId && matchup.awayTeamId"
            class="action-btn action-btn--start"
            :disabled="updatingMatch"
            @click.stop="emit('start-match', matchup.fixtures[0])"
          >
            <UIcon name="i-heroicons-play" class="w-3 h-3" />
            Start
          </button>
          <button
            v-else-if="matchup.status === FixtureStatus.LIVE || matchup.status === FixtureStatus.NORMAL_TIME_ENDED || matchup.status === FixtureStatus.EXTRATIME || matchup.status === FixtureStatus.COMPLETED"
            class="action-btn action-btn--control"
            @click.stop="emit('control-match', matchup.fixtures[0])"
          >
            <UIcon name="i-heroicons-adjustments-horizontal" class="w-3 h-3" />
            Control
          </button>
        </template>
        <template v-else>
          <template v-for="(leg, i) in matchup.fixtures" :key="leg.id">
            <button
              v-if="leg.status === FixtureStatus.SCHEDULED && leg.homeTeamId && leg.awayTeamId"
              class="action-btn action-btn--start"
              :disabled="updatingMatch"
              @click.stop="emit('start-match', leg)"
            >
              <UIcon name="i-heroicons-play" class="w-3 h-3" />
              L{{ (i as number) + 1 }}
            </button>
            <button
              v-else-if="leg.status === FixtureStatus.LIVE || leg.status === FixtureStatus.NORMAL_TIME_ENDED || leg.status === FixtureStatus.EXTRATIME || leg.status === FixtureStatus.COMPLETED"
              class="action-btn action-btn--control"
              @click.stop="emit('control-match', leg)"
            >
              <UIcon name="i-heroicons-adjustments-horizontal" class="w-3 h-3" />
              L{{ (i as number) + 1 }}
            </button>
            <span v-else class="action-btn action-btn--disabled">
              <UIcon name="i-heroicons-clock" class="w-3 h-3" />
              L{{ (i as number) + 1 }}
            </span>
          </template>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Match card ───────────────────────────────────────────── */
.match-card {
  width: 100%;
  min-width: 0;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s;
  position: relative;
}

.match-card:hover {
  border-color: #10b981;
  box-shadow: 0 0 0 1px rgba(16,185,129,0.15), 0 4px 16px rgba(0,0,0,0.08);
}

:root.dark .match-card {
  background: #141414;
  border-color: rgba(255,255,255,0.07);
}

:root.dark .match-card:hover {
  border-color: rgba(16,185,129,0.5);
  box-shadow: 0 0 0 1px rgba(16,185,129,0.12), 0 4px 20px rgba(0,0,0,0.4);
}

/* Championship Final golden glow */
.match-card--final {
  border: 1.5px solid #f59e0b !important;
  box-shadow: 0 0 15px rgba(245, 158, 11, 0.15), 0 4px 20px rgba(0,0,0,0.08);
}

:root.dark .match-card--final {
  border-color: #f59e0b !important;
  box-shadow: 0 0 20px rgba(245, 158, 11, 0.25), 0 6px 24px rgba(0,0,0,0.5);
}

/* Live: pulsing left border */
.match-card--live {
  border-left: 2px solid #f59e0b !important;
}

.match-card--live::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 2px;
  background: #f59e0b;
  box-shadow: 0 0 8px #f59e0b;
  animation: pulse-border 1.5s ease-in-out infinite;
}

@keyframes pulse-border {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* ── Half Badges and Path Styling ───────────────────────────── */
.match-card--top-half {
  border-left: 3px solid #0ea5e9;
}
.match-card--bottom-half {
  border-left: 3px solid #a855f7;
}

.match-half-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.25rem 0.6rem;
  border-bottom: 1px solid #f3f4f6;
  background: rgba(249, 250, 251, 0.7);
}

:root.dark .match-half-header {
  border-bottom-color: rgba(255, 255, 255, 0.05);
  background: rgba(255, 255, 255, 0.02);
}

.half-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.half-dot--top {
  background-color: #0ea5e9;
  box-shadow: 0 0 6px rgba(14, 165, 233, 0.5);
}
.half-dot--bottom {
  background-color: #a855f7;
  box-shadow: 0 0 6px rgba(168, 85, 247, 0.5);
}

.half-title {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.half-title--top {
  color: #0284c7;
}
:root.dark .half-title--top {
  color: #38bdf8;
}
.half-title--bottom {
  color: #9333ea;
}
:root.dark .half-title--bottom {
  color: #c084fc;
}

/* ── Team row ─────────────────────────────────────────────── */
.team-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.625rem;
  transition: background 0.15s;
}

.team-row:hover {
  background: #f9fafb;
}

:root.dark .team-row:hover {
  background: rgba(255,255,255,0.03);
}

.team-row--winner .team-name {
  font-weight: 600;
  color: #111827;
}

:root.dark .team-row--winner .team-name {
  color: #ffffff;
}

.team-row--loser .team-name {
  color: #9ca3af;
}

:root.dark .team-row--loser .team-name {
  color: #4b5563;
}

/* Arrange selectable / selected team slots */
.team-row--selectable {
  cursor: pointer;
}
.team-row--selectable:hover {
  background: rgba(16, 185, 129, 0.08) !important;
}

.team-row--selected {
  background: rgba(245, 158, 11, 0.15) !important;
  box-shadow: inset 0 0 0 1px #f59e0b;
}

.arrange-slot-icon {
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.team-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

:root.dark .team-avatar {
  background: #222;
  border-color: rgba(255,255,255,0.1);
}

.team-avatar__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.team-avatar__initial {
  font-size: 0.625rem;
  font-weight: 700;
  color: #6b7280;
  line-height: 1;
}

:root.dark .team-avatar__initial {
  color: #9ca3af;
}

.team-name {
  flex: 1;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

:root.dark .team-name {
  color: #d1d5db;
}

.team-name--tbd {
  color: #9ca3af;
  font-style: italic;
  font-weight: 400;
}

:root.dark .team-name--tbd {
  color: #4b5563;
}

.team-score-area {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

.sub-scores {
  font-size: 0.65rem;
  font-family: monospace;
  color: #9ca3af;
}

:root.dark .sub-scores {
  color: #6b7280;
}

.pen-score {
  font-size: 0.65rem;
  font-family: monospace;
  color: #9ca3af;
}

.score {
  min-width: 18px;
  text-align: right;
  font-size: 0.875rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #9ca3af;
}

:root.dark .score {
  color: #4b5563;
}

.score--active {
  color: #374151;
}

:root.dark .score--active {
  color: #d1d5db;
}

.score--winner {
  color: #10b981 !important;
  font-weight: 700;
}

/* ── Divider ──────────────────────────────────────────────── */
.team-divider {
  height: 1px;
  background: #f3f4f6;
}

:root.dark .team-divider {
  background: rgba(255,255,255,0.05);
}

/* ── Match info (time & venue) ────────────────────────────── */
.match-info {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.25rem 0.6rem;
  background: #f9fafb;
  border-top: 1px solid #f3f4f6;
}

:root.dark .match-info {
  background: rgba(255,255,255,0.02);
  border-top-color: rgba(255,255,255,0.04);
}

.match-info__item {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.575rem;
  font-weight: 500;
  color: #9ca3af;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.match-info__icon {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  opacity: 0.7;
}

/* ── Footer ───────────────────────────────────────────────── */
.match-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.25rem 0.625rem;
  background: #f9fafb;
  border-top: 1px solid #f3f4f6;
  min-height: 26px;
  gap: 0.5rem;
}

:root.dark .match-footer {
  background: rgba(255,255,255,0.02);
  border-top-color: rgba(255,255,255,0.04);
}

.match-footer--arrange {
  background: rgba(245, 158, 11, 0.05);
  border-top-color: rgba(245, 158, 11, 0.15);
}

.status-live {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #f59e0b;
}

.live-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #f59e0b;
  animation: pulse-dot 1s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.4); opacity: 0.6; }
}

.status-done {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.625rem;
  font-weight: 600;
  color: #9ca3af;
}

:root.dark .status-done {
  color: #4b5563;
}

.status-warn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.625rem;
  font-weight: 600;
  color: #f59e0b;
}

.match-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: auto;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.625rem;
  font-weight: 600;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.action-btn--start {
  background: #ecfdf5;
  color: #059669;
  border-color: #a7f3d0;
}
.action-btn--start:hover:not(:disabled) {
  background: #059669;
  color: #ffffff;
  border-color: #059669;
}
.action-btn--start:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
:root.dark .action-btn--start {
  background: rgba(16,185,129,0.1);
  color: #34d399;
  border-color: rgba(16,185,129,0.25);
}
:root.dark .action-btn--start:hover:not(:disabled) {
  background: #10b981;
  color: #ffffff;
}

.action-btn--control {
  background: #f0fdf4;
  color: #16a34a;
  border-color: #bbf7d0;
}
.action-btn--control:hover {
  background: #16a34a;
  color: #ffffff;
  border-color: #16a34a;
}
:root.dark .action-btn--control {
  background: rgba(22,163,74,0.1);
  color: #4ade80;
  border-color: rgba(22,163,74,0.25);
}
:root.dark .action-btn--control:hover {
  background: #22c55e;
  color: #ffffff;
}

.action-btn--edit {
  background: #eff6ff;
  color: #2563eb;
  border-color: #bfdbfe;
}
.action-btn--edit:hover {
  background: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
}
:root.dark .action-btn--edit {
  background: rgba(37,99,235,0.1);
  color: #60a5fa;
  border-color: rgba(37,99,235,0.25);
}
:root.dark .action-btn--edit:hover {
  background: #3b82f6;
  color: #ffffff;
}

.action-btn--disabled {
  background: #f3f4f6;
  color: #9ca3af;
  border-color: #e5e7eb;
  cursor: not-allowed;
}
:root.dark .action-btn--disabled {
  background: rgba(255,255,255,0.04);
  color: #4b5563;
  border-color: rgba(255,255,255,0.06);
}
</style>
