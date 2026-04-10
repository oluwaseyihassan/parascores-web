<script setup lang="ts">
import type { Fixture } from '~/types'
import { FixtureStatus } from '~/types'

interface Props {
  fixturesByRound: Record<number, Fixture[]>
  rounds: number[]
  getRoundDisplayName: (round: number, index: number, total: number) => string
  updatingMatch?: boolean
  twoLegsKnockout?: boolean
  thirdPlaceMatch?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'start-match': [fixture: Fixture]
  'control-match': [fixture: Fixture]
}>()

// Fixture status colors
const statusColors: Record<string, 'info' | 'success' | 'warning' | 'neutral'> = {
  [FixtureStatus.SCHEDULED]: 'info',
  [FixtureStatus.LIVE]: 'warning',
  [FixtureStatus.COMPLETED]: 'success',
  [FixtureStatus.CANCELLED]: 'neutral'
}

const getAggregateStatus = (fixtures: Fixture[]): FixtureStatus => {
  if (fixtures.some(f => f.status === FixtureStatus.LIVE)) return FixtureStatus.LIVE
  if (fixtures.every(f => f.status === FixtureStatus.COMPLETED)) return FixtureStatus.COMPLETED
  if (fixtures.some(f => f.status === FixtureStatus.SCHEDULED)) return FixtureStatus.SCHEDULED
  return FixtureStatus.CANCELLED
}

// Group fixtures into Matchups (handles 2-legged ties)
const matchupsByRound = computed(() => {
  const result: Record<number, any[]> = {}
  
  const totalRounds = props.rounds.length
  
  props.rounds.forEach((round, roundIndex) => {
    const isFinalRound = roundIndex === totalRounds - 1
    const roundFixtures = props.fixturesByRound[round] || []
    
    const matchups: any[] = []
    
    if (props.twoLegsKnockout && !isFinalRound) {
      // Group by 2 for dual-leg matches
      for (let i = 0; i < roundFixtures.length; i += 2) {
        const f1 = roundFixtures[i]!
        const f2 = roundFixtures[i + 1]
        
        const fixtures = [f1]
        if (f2) fixtures.push(f2)
        
        matchups.push({
          id: f1.id,
          fixtures,
          isThirdPlace: false,
          homeTeam: f1.homeTeam,
          awayTeam: f1.awayTeam,
          homeTeamPlaceholder: f1.homeTeamPlaceholder,
          awayTeamPlaceholder: f1.awayTeamPlaceholder,
          // Aggregate scores accounting for home/away swap between legs
          // Leg 1: home=TeamA, away=TeamB. Leg 2: home=TeamB, away=TeamA
          // TeamA total = f1.homeScore + f2.awayScore
          // TeamB total = f1.awayScore + f2.homeScore
          homeScore: (f1.homeScore ?? 0) + (f2 ? (f2.awayScore ?? 0) : 0),
          awayScore: (f1.awayScore ?? 0) + (f2 ? (f2.homeScore ?? 0) : 0),
          // Sub-scores for display: [TeamA's goals in Leg1, TeamA's goals in Leg2]
          homeSubScores: [f1.homeScore, f2 ? f2.awayScore : null],
          awaySubScores: [f1.awayScore, f2 ? f2.homeScore : null],
          // Penalties happen in Leg 2, but Leg 2 home = Leg 1 away, so swap
          homePenaltyScore: f2?.awayPenaltyScore ?? f1.homePenaltyScore,
          awayPenaltyScore: f2?.homePenaltyScore ?? f1.awayPenaltyScore,
          status: getAggregateStatus(fixtures),
          homeTeamId: f1.homeTeamId,
          awayTeamId: f1.awayTeamId
        })
      }
    } else {
      // Single leg logic (or final round)
      for (let i = 0; i < roundFixtures.length; i++) {
        const f = roundFixtures[i]!
        const isThirdPlace = isFinalRound && props.thirdPlaceMatch && i === 1 // 2nd match in final round
        matchups.push({
          id: f.id,
          fixtures: [f],
          isThirdPlace,
          homeTeam: f.homeTeam,
          awayTeam: f.awayTeam,
          homeTeamPlaceholder: f.homeTeamPlaceholder,
          awayTeamPlaceholder: f.awayTeamPlaceholder,
          homeScore: f.homeScore ?? 0,
          awayScore: f.awayScore ?? 0,
          homePenaltyScore: f.homePenaltyScore,
          awayPenaltyScore: f.awayPenaltyScore,
          status: f.status,
          homeTeamId: f.homeTeamId,
          awayTeamId: f.awayTeamId
        })
      }
    }
    
    result[round] = matchups
  })
  
  return result
})

// Separate final round into main matchups and third-place matchups
const finalRoundMainMatchups = computed(() => {
  if (props.rounds.length === 0) return []
  const finalRound = props.rounds[props.rounds.length - 1]!
  return (matchupsByRound.value[finalRound] || []).filter((m: any) => !m.isThirdPlace)
})

const thirdPlaceMatchups = computed(() => {
  if (props.rounds.length === 0) return []
  const finalRound = props.rounds[props.rounds.length - 1]!
  return (matchupsByRound.value[finalRound] || []).filter((m: any) => m.isThirdPlace)
})

// Get total matchups in first round (used for grid scaling)
const firstRoundMatches = computed(() => {
  if (props.rounds.length === 0) return 0
  return matchupsByRound.value[props.rounds[0]!]?.length || 0
})

// Get winner class for completed matches
const getTeamClass = (matchup: any, isHome: boolean) => {
  if (matchup.status !== FixtureStatus.COMPLETED) return ''
  
  const homeScore = matchup.homeScore ?? 0
  const awayScore = matchup.awayScore ?? 0
  
  if (homeScore === awayScore) {
    // Check penalties
    const homePen = matchup.homePenaltyScore ?? 0
    const awayPen = matchup.awayPenaltyScore ?? 0
    
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

// Get placeholder label for unknown team (e.g., "QF1 Winner")
const getPlaceholderLabel = (matchup: any, isHome: boolean): string => {
  if (isHome) {
    return matchup.homeTeamPlaceholder || 'TBD'
  } else {
    return matchup.awayTeamPlaceholder || 'TBD'
  }
}

// Detect completed matches with no clear winner (tied with no decisive penalties)
const hasNoWinner = (matchup: any): boolean => {
  if (matchup.status !== FixtureStatus.COMPLETED) return false
  const homeScore = matchup.homeScore ?? 0
  const awayScore = matchup.awayScore ?? 0
  if (homeScore !== awayScore) return false
  // Scores are tied — check penalties
  const homePen = matchup.homePenaltyScore ?? 0
  const awayPen = matchup.awayPenaltyScore ?? 0
  return homePen === awayPen
}

// Get team name to display
const getTeamName = (matchup: any, isHome: boolean) => {
  const team = isHome ? matchup.homeTeam : matchup.awayTeam
  
  if (team) {
    if (team.customName) return team.customName
    if (team.user?.name) return team.user.name
  }
  
  return getPlaceholderLabel(matchup, isHome)
}

// Calculate which grid rows a match spans
const getMatchGridRow = (roundIndex: number, matchIndex: number) => {
  const span = Math.pow(2, roundIndex)
  const start = matchIndex * span * 2 + 1
  const end = start + span * 2
  return `${start} / ${end}`
}

// Get the number of columns before the final column (for third-place offset)
const finalColumnOffset = computed(() => {
  // Each round except the last has a matches-column + a connector-column
  // The last round just has a matches-column
  // So offset = (rounds.length - 1) rounds * (200px + 48px)
  return props.rounds.length - 1
})
</script>

<template>
  <div class="bracket-container">
    <div class="bracket-scroll">
      <!-- Headers row -->
      <div class="bracket-headers">
        <template v-for="(round, roundIndex) in rounds" :key="`header-${round}`">
          <div class="bracket-header">
            {{ getRoundDisplayName(round, roundIndex, rounds.length) }}
          </div>
          <div v-if="roundIndex < rounds.length - 1" class="header-spacer"></div>
        </template>
      </div>

      <!-- Bracket grid -->
      <div 
        class="bracket-grid"
        :style="{ 
          '--total-rows': firstRoundMatches * 2,
          display: 'grid',
          gridTemplateColumns: rounds.map((_, i) => i < rounds.length - 1 ? 'minmax(200px, 1fr) 48px' : 'minmax(200px, 1fr)').join(' '),
          gap: '0'
        }"
      >
        <template v-for="(round, roundIndex) in rounds" :key="round">
          <!-- Matches column -->
          <div class="matches-column">
            <template v-for="(matchup, matchIndex) in (roundIndex === rounds.length - 1 ? finalRoundMainMatchups : matchupsByRound[round])" :key="matchup.id">
              <div 
                class="match-cell"
                :style="{ gridRow: getMatchGridRow(roundIndex, matchIndex) }"
              >
                <div class="flex flex-col w-full self-center">
                  <div class="bracket-match">
                    <!-- Home team -->
                    <div 
                      class="bracket-team"
                      :class="getTeamClass(matchup, true)"
                    >
                      <div class="bracket-team-info">
                        <span class="bracket-seed" v-if="matchup.homeTeam?.seed">
                          {{ matchup.homeTeam.seed }}
                        </span>
                        <div class="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden shrink-0" v-if="matchup.homeTeam?.logoUrl">
                          <img 
                            :src="matchup.homeTeam.logoUrl" 
                            class="w-full h-full object-cover"
                          />
                        </div>
                        <span class="bracket-team-name">
                          {{ getTeamName(matchup, true) }}
                        </span>
                      </div>
                      <div class="flex items-center gap-2">
                        <span v-if="matchup.homeSubScores" class="text-[0.65rem] font-medium text-gray-400 dark:text-gray-500 whitespace-nowrap hidden sm:inline-block">
                          ({{ matchup.homeSubScores.map((s: any) => s !== null && s !== undefined ? s : '-').join(', ') }})
                        </span>
                        <span class="bracket-score">
                          <span v-if="matchup.homePenaltyScore !== null && matchup.homePenaltyScore !== undefined" class="text-xs font-normal text-gray-400 mr-1">
                            ({{ matchup.homePenaltyScore }})
                          </span>
                          {{ matchup.status === FixtureStatus.COMPLETED || matchup.status === FixtureStatus.LIVE 
                            ? matchup.homeScore 
                            : '-' }}
                        </span>
                      </div>
                    </div>
                    
                    <!-- Away team -->
                    <div 
                      class="bracket-team"
                      :class="getTeamClass(matchup, false)"
                    >
                      <div class="bracket-team-info">
                        <span class="bracket-seed" v-if="matchup.awayTeam?.seed">
                          {{ matchup.awayTeam.seed }}
                        </span>
                        <div class="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden shrink-0" v-if="matchup.awayTeam?.logoUrl">
                          <img 
                            :src="matchup.awayTeam.logoUrl" 
                            class="w-full h-full object-cover"
                          />
                        </div>
                        <span class="bracket-team-name">
                          {{ getTeamName(matchup, false) }}
                        </span>
                      </div>
                      <div class="flex items-center gap-2">
                        <span v-if="matchup.awaySubScores" class="text-[0.65rem] font-medium text-gray-400 dark:text-gray-500 whitespace-nowrap hidden sm:inline-block">
                          ({{ matchup.awaySubScores.map((s: any) => s !== null && s !== undefined ? s : '-').join(', ') }})
                        </span>
                        <span class="bracket-score">
                          <span v-if="matchup.awayPenaltyScore !== null && matchup.awayPenaltyScore !== undefined" class="text-xs font-normal text-gray-400 mr-1">
                            ({{ matchup.awayPenaltyScore }})
                          </span>
                          {{ matchup.status === FixtureStatus.COMPLETED || matchup.status === FixtureStatus.LIVE 
                            ? matchup.awayScore 
                            : '-' }}
                        </span>
                      </div>
                    </div>
                    
                    <!-- Match status and actions -->
                    <div class="bracket-status">
                      <!-- For dual legs: Show individual buttons? Better just control active match -->
                      <template v-if="matchup.fixtures.length === 1">
                        <UButton 
                          v-if="matchup.status === FixtureStatus.SCHEDULED && matchup.homeTeamId && matchup.awayTeamId"
                          size="xs" 
                          color="success" 
                          variant="soft"
                          icon="i-heroicons-play"
                          :loading="updatingMatch"
                          @click.stop="emit('start-match', matchup.fixtures[0])"
                        >
                          Start
                        </UButton>
                        
                        <UButton 
                          v-if="matchup.status === FixtureStatus.LIVE || matchup.status === FixtureStatus.COMPLETED"
                          size="xs" 
                          color="warning" 
                          variant="soft"
                          icon="i-heroicons-adjustments-horizontal"
                          @click.stop="emit('control-match', matchup.fixtures[0])"
                        >
                          Control
                        </UButton>
                      </template>
                      <template v-else>
                        <!-- Sub-controls for each leg if there are multiple legs -->
                        <div class="flex items-center gap-1 overflow-x-auto w-full justify-center px-1">
                          <template v-for="(leg, i) in matchup.fixtures" :key="leg.id">
                            <UButton 
                              v-if="leg.status === FixtureStatus.SCHEDULED && leg.homeTeamId && leg.awayTeamId"
                              size="xs" 
                              color="success" 
                              variant="soft"
                              icon="i-heroicons-play"
                              class="text-[10px] px-1.5 py-0.5 min-w-max"
                              :loading="updatingMatch"
                              @click.stop="emit('start-match', leg)"
                            >
                              Leg {{ (i as number) + 1 }}
                            </UButton>
                            <UButton 
                              v-else-if="leg.status === FixtureStatus.LIVE || leg.status === FixtureStatus.COMPLETED"
                              size="xs" 
                              color="warning" 
                              variant="soft"
                              icon="i-heroicons-adjustments-horizontal"
                              class="text-[10px] px-1.5 py-0.5 min-w-max"
                              @click.stop="emit('control-match', leg)"
                            >
                              Leg {{ (i as number) + 1 }}
                            </UButton>
                            <UButton 
                              v-else-if="leg.status === FixtureStatus.SCHEDULED"
                              size="xs" 
                              color="neutral" 
                              variant="soft"
                              icon="i-heroicons-clock"
                              class="text-[10px] px-1.5 py-0.5 min-w-max"
                              disabled
                            >
                              Leg {{ (i as number) + 1 }}
                            </UButton>
                          </template>
                        </div>
                      </template>
                      
                      <!-- Status Badge -->
                      <UBadge 
                        :color="hasNoWinner(matchup) ? 'warning' : statusColors[matchup.status]" 
                        variant="subtle" 
                        size="xs"
                        class="shrink-0"
                      >
                        <span v-if="hasNoWinner(matchup)" class="flex items-center gap-1">
                          <UIcon name="i-heroicons-exclamation-triangle" class="w-3 h-3 animate-pulse" />
                          NO WINNER
                        </span>
                        <span v-else>{{ matchup.status }}</span>
                      </UBadge>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- Connector column (not after last round) -->
          <div 
            v-if="roundIndex < rounds.length - 1" 
            class="connector-column"
          >
            <div 
              v-for="(matchup, matchIndex) in (roundIndex === rounds.length - 1 ? [] : matchupsByRound[round])" 
              :key="`conn-${matchup.id}`"
              class="connector-cell"
              :style="{ gridRow: getMatchGridRow(roundIndex, matchIndex) }"
            >
              <svg class="connector-svg" viewBox="0 0 48 100" preserveAspectRatio="none">
                <!-- Line from current match to the middle -->
                <path 
                  v-if="matchIndex % 2 === 0"
                  d="M 0 50 L 24 50 L 24 100" 
                  class="connector-line"
                />
                <path 
                  v-else
                  d="M 0 50 L 24 50 L 24 0 M 24 0 L 48 0" 
                  class="connector-line"
                />
              </svg>
            </div>
          </div>
        </template>
      </div>

      <!-- 3rd Place Play-off section (rendered below the bracket, aligned to the final column) -->
      <div v-if="thirdPlaceMatchups.length > 0" class="third-place-section" :style="{ '--offset-columns': finalColumnOffset }">
        <div v-for="matchup in thirdPlaceMatchups" :key="matchup.id" class="third-place-wrapper">
          <div class="text-[0.65rem] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center mb-2">
            3rd Place Play-off
          </div>
          <div class="bracket-match">
            <!-- Home team -->
            <div 
              class="bracket-team"
              :class="getTeamClass(matchup, true)"
            >
              <div class="bracket-team-info">
                <span class="bracket-seed" v-if="matchup.homeTeam?.seed">
                  {{ matchup.homeTeam.seed }}
                </span>
                <div class="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden shrink-0" v-if="matchup.homeTeam?.logoUrl">
                  <img 
                    :src="matchup.homeTeam.logoUrl" 
                    class="w-full h-full object-cover"
                  />
                </div>
                <span class="bracket-team-name">
                  {{ getTeamName(matchup, true) }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span v-if="matchup.homeSubScores" class="text-[0.65rem] font-medium text-gray-400 dark:text-gray-500 whitespace-nowrap hidden sm:inline-block">
                  ({{ matchup.homeSubScores.map((s: any) => s !== null && s !== undefined ? s : '-').join(', ') }})
                </span>
                <span class="bracket-score">
                  <span v-if="matchup.homePenaltyScore !== null && matchup.homePenaltyScore !== undefined" class="text-xs font-normal text-gray-400 mr-1">
                    ({{ matchup.homePenaltyScore }})
                  </span>
                  {{ matchup.status === FixtureStatus.COMPLETED || matchup.status === FixtureStatus.LIVE 
                    ? matchup.homeScore 
                    : '-' }}
                </span>
              </div>
            </div>
            
            <!-- Away team -->
            <div 
              class="bracket-team"
              :class="getTeamClass(matchup, false)"
            >
              <div class="bracket-team-info">
                <span class="bracket-seed" v-if="matchup.awayTeam?.seed">
                  {{ matchup.awayTeam.seed }}
                </span>
                <div class="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden shrink-0" v-if="matchup.awayTeam?.logoUrl">
                  <img 
                    :src="matchup.awayTeam.logoUrl" 
                    class="w-full h-full object-cover"
                  />
                </div>
                <span class="bracket-team-name">
                  {{ getTeamName(matchup, false) }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span v-if="matchup.awaySubScores" class="text-[0.65rem] font-medium text-gray-400 dark:text-gray-500 whitespace-nowrap hidden sm:inline-block">
                  ({{ matchup.awaySubScores.map((s: any) => s !== null && s !== undefined ? s : '-').join(', ') }})
                </span>
                <span class="bracket-score">
                  <span v-if="matchup.awayPenaltyScore !== null && matchup.awayPenaltyScore !== undefined" class="text-xs font-normal text-gray-400 mr-1">
                    ({{ matchup.awayPenaltyScore }})
                  </span>
                  {{ matchup.status === FixtureStatus.COMPLETED || matchup.status === FixtureStatus.LIVE 
                    ? matchup.awayScore 
                    : '-' }}
                </span>
              </div>
            </div>
            
            <!-- Match status and actions -->
            <div class="bracket-status">
              <template v-if="matchup.fixtures.length === 1">
                <UButton 
                  v-if="matchup.status === FixtureStatus.SCHEDULED && matchup.homeTeamId && matchup.awayTeamId"
                  size="xs" 
                  color="success" 
                  variant="soft"
                  icon="i-heroicons-play"
                  :loading="updatingMatch"
                  @click.stop="emit('start-match', matchup.fixtures[0])"
                >
                  Start
                </UButton>
                
                <UButton 
                  v-if="matchup.status === FixtureStatus.LIVE || matchup.status === FixtureStatus.COMPLETED"
                  size="xs" 
                  color="warning" 
                  variant="soft"
                  icon="i-heroicons-adjustments-horizontal"
                  @click.stop="emit('control-match', matchup.fixtures[0])"
                >
                  Control
                </UButton>
              </template>
              <template v-else>
                <div class="flex items-center gap-1 overflow-x-auto w-full justify-center px-1">
                  <template v-for="(leg, i) in matchup.fixtures" :key="leg.id">
                    <UButton 
                      v-if="leg.status === FixtureStatus.SCHEDULED && leg.homeTeamId && leg.awayTeamId"
                      size="xs" 
                      color="success" 
                      variant="soft"
                      icon="i-heroicons-play"
                      class="text-[10px] px-1.5 py-0.5 min-w-max"
                      :loading="updatingMatch"
                      @click.stop="emit('start-match', leg)"
                    >
                      Leg {{ (i as number) + 1 }}
                    </UButton>
                    <UButton 
                      v-else-if="leg.status === FixtureStatus.LIVE || leg.status === FixtureStatus.COMPLETED"
                      size="xs" 
                      color="warning" 
                      variant="soft"
                      icon="i-heroicons-adjustments-horizontal"
                      class="text-[10px] px-1.5 py-0.5 min-w-max"
                      @click.stop="emit('control-match', leg)"
                    >
                      Leg {{ (i as number) + 1 }}
                    </UButton>
                    <UButton 
                      v-else-if="leg.status === FixtureStatus.SCHEDULED"
                      size="xs" 
                      color="neutral" 
                      variant="soft"
                      icon="i-heroicons-clock"
                      class="text-[10px] px-1.5 py-0.5 min-w-max"
                      disabled
                    >
                      Leg {{ (i as number) + 1 }}
                    </UButton>
                  </template>
                </div>
              </template>
              
              <UBadge 
                :color="hasNoWinner(matchup) ? 'warning' : statusColors[matchup.status]" 
                variant="subtle" 
                size="xs"
                class="shrink-0"
              >
                <span v-if="hasNoWinner(matchup)" class="flex items-center gap-1">
                  <UIcon name="i-heroicons-exclamation-triangle" class="w-3 h-3 animate-pulse" />
                  NO WINNER
                </span>
                <span v-else>{{ matchup.status }}</span>
              </UBadge>
            </div>
          </div>
        </div>
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
  display: grid;
  width: 100%;
}

.third-place-section {
  margin-top: 0.75rem;
  /* Offset to align with the final column: skip (N-1) match columns and (N-1) connector columns */
  margin-left: calc(var(--offset-columns) * (200px + 48px));
  min-width: 200px;
  max-width: 200px;
}

.third-place-wrapper {
  display: flex;
  flex-direction: column;
}

.matches-column {
  display: grid;
  grid-template-rows: repeat(var(--total-rows), 1fr);
  min-width: 200px;
  gap: 0;
}

.match-cell {
  display: flex;
  flex-direction: column;
  justify-content: center;
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
  stroke: #4b5563; /* gray-600 */
  stroke-width: 2;
  fill: none;
  vector-effect: non-scaling-stroke;
}
:root.dark .connector-line {
  stroke: #9ca3af; /* gray-400 */
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
  max-width: 110px;
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
    min-width: 140px;
  }
  
  .header-spacer,
  .connector-column {
    width: 24px;
  }
  
  .bracket-team {
    padding: 0.375rem 0.5rem;
  }
  
  .bracket-team-name {
    font-size: 0.75rem;
    max-width: 75px;
  }
  
  .bracket-score {
    font-size: 0.8125rem;
  }
  
  .third-place-section {
    margin-left: calc(var(--offset-columns) * (140px + 24px));
    min-width: 140px;
    max-width: 140px;
  }
}
</style>
