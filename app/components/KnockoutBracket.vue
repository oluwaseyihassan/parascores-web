<script setup lang="ts">
import type { Fixture } from '~/types'
import { FixtureStatus } from '~/types'

interface Props {
  fixturesByRound: Record<number, Fixture[]>
  rounds: number[]
  getRoundDisplayName: (round: number) => string
  updatingMatch?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'start-match': [fixture: Fixture]
  'control-match': [fixture: Fixture]
}>()

// Fixture status colors
const statusColors: Record<FixtureStatus, 'info' | 'success' | 'warning' | 'neutral'> = {
  [FixtureStatus.SCHEDULED]: 'info',
  [FixtureStatus.LIVE]: 'warning',
  [FixtureStatus.COMPLETED]: 'success',
  [FixtureStatus.CANCELLED]: 'neutral'
}

// Get winner class for completed matches
const getTeamClass = (fixture: Fixture, isHome: boolean) => {
  if (fixture.status !== FixtureStatus.COMPLETED) return ''
  
  const homeScore = fixture.homeScore ?? 0
  const awayScore = fixture.awayScore ?? 0
  
  if (homeScore === awayScore) {
    // Check penalties
    const homePen = fixture.homePenaltyScore ?? 0
    const awayPen = fixture.awayPenaltyScore ?? 0
    
    if (homePen === awayPen) return ''
    
    if (isHome) {
      return homePen > awayPen ? 'bracket-winner' : 'bracket-loser'
    } else {
      return awayPen > homePen ? 'bracket-winner' : 'bracket-loser'
    }
  }
  
  if (isHome) {
    return homeScore > awayScore ? 'bracket-winner' : 'bracket-loser'
  } else {
    return awayScore > homeScore ? 'bracket-winner' : 'bracket-loser'
  }
}

// Get total matches in first round (used for grid)
const firstRoundMatches = computed(() => {
  if (props.rounds.length === 0) return 0
  return props.fixturesByRound[props.rounds[0]!]?.length || 0
})

// Get round abbreviation for labels


// Get placeholder label for unknown team (e.g., "QF1 Winner")
const getPlaceholderLabel = (fixture: Fixture, isHome: boolean): string => {
  if (isHome) {
    return fixture.homeTeamPlaceholder || 'TBD'
  } else {
    return fixture.awayTeamPlaceholder || 'TBD'
  }
}

// Get team name to display
const getTeamName = (fixture: Fixture, isHome: boolean) => {
  const team = isHome ? fixture.homeTeam : fixture.awayTeam
  
  if (team) {
    if (team.customName) return team.customName
    if (team.user?.name) return team.user.name
    if (team.user?.organization_name) return team.user.organization_name
  }
  
  return getPlaceholderLabel(fixture, isHome)
}

// Calculate which grid rows a match spans
const getMatchGridRow = (roundIndex: number, matchIndex: number) => {
  const span = Math.pow(2, roundIndex)
  const start = matchIndex * span * 2 + 1
  const end = start + span * 2
  return `${start} / ${end}`
}
</script>

<template>
  <div class="bracket-container">
    <div class="bracket-scroll">
      <!-- Headers row -->
      <div class="bracket-headers">
        <template v-for="(round, roundIndex) in rounds" :key="`header-${round}`">
          <div class="bracket-header">
            {{ getRoundDisplayName(round) }}
          </div>
          <div v-if="roundIndex < rounds.length - 1" class="header-spacer"></div>
        </template>
      </div>

      <!-- Bracket grid -->
      <div 
        class="bracket-grid"
        :style="{ '--total-rows': firstRoundMatches * 2 }"
      >
        <template v-for="(round, roundIndex) in rounds" :key="round">
          <!-- Matches column -->
          <div class="matches-column">
            <div 
              v-for="(fixture, matchIndex) in fixturesByRound[round]" 
              :key="fixture.id"
              class="match-cell"
              :style="{ gridRow: getMatchGridRow(roundIndex, matchIndex) }"
            >
              <div class="bracket-match">
                <!-- Home team -->
                <div 
                  class="bracket-team"
                  :class="getTeamClass(fixture, true)"
                >
                  <div class="bracket-team-info">
                    <span class="bracket-seed" v-if="fixture.homeTeam?.seed">
                      {{ fixture.homeTeam.seed }}
                    </span>
                    <div class="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden shrink-0" v-if="fixture.homeTeam?.logoUrl">
                      <img 
                        :src="fixture.homeTeam.logoUrl" 
                        class="w-full h-full object-cover"
                      />
                    </div>
                    <span class="bracket-team-name">
                      {{ getTeamName(fixture, true) }}
                    </span>
                  </div>
                  <span class="bracket-score">
                    <span v-if="fixture.homePenaltyScore !== null && fixture.homePenaltyScore !== undefined" class="text-xs font-normal text-gray-400 mr-1">
                      ({{ fixture.homePenaltyScore }})
                    </span>
                    {{ fixture.status === FixtureStatus.COMPLETED || fixture.status === FixtureStatus.LIVE 
                      ? (fixture.homeScore ?? 0) 
                      : '-' }}
                  </span>
                </div>
                
                <!-- Away team -->
                <div 
                  class="bracket-team"
                  :class="getTeamClass(fixture, false)"
                >
                  <div class="bracket-team-info">
                    <span class="bracket-seed" v-if="fixture.awayTeam?.seed">
                      {{ fixture.awayTeam.seed }}
                    </span>
                    <div class="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden shrink-0" v-if="fixture.awayTeam?.logoUrl">
                      <img 
                        :src="fixture.awayTeam.logoUrl" 
                        class="w-full h-full object-cover"
                      />
                    </div>
                    <span class="bracket-team-name">
                      {{ getTeamName(fixture, false) }}
                    </span>
                  </div>
                  <span class="bracket-score">
                    <span v-if="fixture.awayPenaltyScore !== null && fixture.awayPenaltyScore !== undefined" class="text-xs font-normal text-gray-400 mr-1">
                      ({{ fixture.awayPenaltyScore }})
                    </span>
                    {{ fixture.status === FixtureStatus.COMPLETED || fixture.status === FixtureStatus.LIVE 
                      ? (fixture.awayScore ?? 0) 
                      : '-' }}
                  </span>
                </div>
                
                <!-- Match status and actions -->
                <div class="bracket-status">
                  <!-- Start Match Button (for SCHEDULED) -->
                  <UButton 
                    v-if="fixture.status === FixtureStatus.SCHEDULED && fixture.homeTeamId && fixture.awayTeamId"
                    size="xs" 
                    color="success" 
                    variant="soft"
                    icon="i-heroicons-play"
                    :loading="updatingMatch"
                    @click.stop="emit('start-match', fixture)"
                  >
                    Start
                  </UButton>
                  
                  <!-- Control Match Button (for LIVE or COMPLETED) -->
                  <UButton 
                    v-if="fixture.status === FixtureStatus.LIVE || fixture.status === FixtureStatus.COMPLETED"
                    size="xs" 
                    color="warning" 
                    variant="soft"
                    icon="i-heroicons-adjustments-horizontal"
                    @click.stop="emit('control-match', fixture)"
                  >
                    Control
                  </UButton>
                  
                  <!-- Status Badge -->
                  <UBadge 
                    :color="statusColors[fixture.status]" 
                    variant="subtle" 
                    size="xs"
                  >
                    {{ fixture.status }}
                  </UBadge>
                </div>
              </div>
            </div>
          </div>

          <!-- Connector column (not after last round) -->
          <div 
            v-if="roundIndex < rounds.length - 1" 
            class="connector-column"
          >
            <div 
              v-for="(fixture, matchIndex) in fixturesByRound[round]" 
              :key="`conn-${fixture.id}`"
              class="connector-cell"
              :style="{ gridRow: getMatchGridRow(roundIndex, matchIndex) }"
              :class="{
                'connector-top': matchIndex % 2 === 0,
                'connector-bottom': matchIndex % 2 === 1
              }"
            >
              <svg class="connector-svg" preserveAspectRatio="none">
                <!-- Horizontal line from match -->
                <line 
                  x1="0" 
                  y1="50%" 
                  x2="50%" 
                  y2="50%" 
                  class="connector-line"
                />
                <!-- Vertical line -->
                <line 
                  v-if="matchIndex % 2 === 0"
                  x1="50%" 
                  y1="50%" 
                  x2="50%" 
                  y2="100%" 
                  class="connector-line"
                />
                <line 
                  v-else
                  x1="50%" 
                  y1="0" 
                  x2="50%" 
                  y2="50%" 
                  class="connector-line"
                />
                <!-- Horizontal line to next match (only for bottom of pair) -->
                <line 
                  v-if="matchIndex % 2 === 1"
                  x1="50%" 
                  y1="0" 
                  x2="100%" 
                  y2="0" 
                  class="connector-line"
                />
              </svg>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bracket-container {
  width: 100%;
  overflow-x: auto;
  padding: 1rem;
}

.bracket-scroll {
  min-width: fit-content;
}

.bracket-headers {
  display: flex;
  margin-bottom: 1rem;
}

.bracket-header {
  min-width: 200px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-gray-500);
  text-align: center;
  padding: 0.5rem;
  background: var(--color-gray-50);
  border-radius: 0.5rem;
}

.header-spacer {
  width: 48px;
  flex-shrink: 0;
}

:root.dark .bracket-header {
  background: var(--color-gray-800);
  color: var(--color-gray-400);
}

.bracket-grid {
  display: flex;
}

.matches-column {
  display: grid;
  grid-template-rows: repeat(var(--total-rows), 1fr);
  min-width: 200px;
  gap: 0;
}

.match-cell {
  display: flex;
  align-items: center;
  padding: 0.25rem 0;
}

.connector-column {
  display: grid;
  grid-template-rows: repeat(var(--total-rows), 1fr);
  width: 48px;
  flex-shrink: 0;
}

.connector-cell {
  position: relative;
}

.connector-svg {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

.connector-line {
  stroke: var(--color-gray-500);
  stroke-width: 2;
  fill: none;
}

:root.dark .connector-line {
  stroke: var(--color-gray-600);
}

.bracket-match {
  width: 100%;
  background: var(--color-gray-50);
  border: 1px solid var(--color-gray-200);
  border-radius: 0.5rem;
  overflow: hidden;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.bracket-match:hover {
  border-color: var(--color-primary-400);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

:root.dark .bracket-match {
  background: var(--color-gray-800);
  border-color: var(--color-gray-700);
}

:root.dark .bracket-match:hover {
  border-color: var(--color-primary-500);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.bracket-team {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--color-gray-200);
  transition: background-color 0.2s ease;
}

.bracket-team:last-of-type {
  border-bottom: none;
}

:root.dark .bracket-team {
  border-bottom-color: var(--color-gray-700);
}

.bracket-team-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.bracket-seed {
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--color-gray-400);
  background: var(--color-gray-200);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  flex-shrink: 0;
}

:root.dark .bracket-seed {
  background: var(--color-gray-700);
  color: var(--color-gray-400);
}

.bracket-team-name {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-gray-900);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 130px;
}

:root.dark .bracket-team-name {
  color: var(--color-white);
}

.bracket-score {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-gray-600);
  min-width: 1.5rem;
  text-align: center;
  flex-shrink: 0;
}

:root.dark .bracket-score {
  color: var(--color-gray-300);
}

/* Winner/Loser styling */
.bracket-winner {
  background: var(--color-success-50);
}

.bracket-winner .bracket-team-name {
  color: var(--color-success-700);
  font-weight: 600;
}

.bracket-winner .bracket-score {
  color: var(--color-success-700);
}

:root.dark .bracket-winner {
  background: rgba(34, 197, 94, 0.15);
}

:root.dark .bracket-winner .bracket-team-name,
:root.dark .bracket-winner .bracket-score {
  color: var(--color-success-400);
}

.bracket-loser {
  opacity: 0.6;
}

.bracket-loser .bracket-team-name {
  text-decoration: line-through;
}

.bracket-status {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem;
  background: var(--color-gray-100);
}

:root.dark .bracket-status {
  background: var(--color-gray-900);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .bracket-header,
  .matches-column {
    min-width: 160px;
  }
  
  .header-spacer,
  .connector-column {
    width: 32px;
  }
  
  .bracket-team {
    padding: 0.375rem 0.5rem;
  }
  
  .bracket-team-name {
    font-size: 0.75rem;
    max-width: 90px;
  }
  
  .bracket-score {
    font-size: 0.8125rem;
  }
}
</style>
