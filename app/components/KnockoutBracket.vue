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
  readonly?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'start-match': [fixture: Fixture]
  'control-match': [fixture: Fixture]
}>()

const getAggregateStatus = (fixtures: Fixture[]): FixtureStatus => {
  if (fixtures.some(f => f.status === FixtureStatus.LIVE)) return FixtureStatus.LIVE
  if (fixtures.every(f => f.status === FixtureStatus.COMPLETED)) return FixtureStatus.COMPLETED
  if (fixtures.some(f => f.status === FixtureStatus.SCHEDULED)) return FixtureStatus.SCHEDULED
  return FixtureStatus.CANCELLED
}

const matchupsByRound = computed(() => {
  const result: Record<number, any[]> = {}
  const totalRounds = props.rounds.length

  props.rounds.forEach((round, roundIndex) => {
    const isFinalRound = roundIndex === totalRounds - 1
    const roundFixtures = props.fixturesByRound[round] || []
    const matchups: any[] = []

    if (props.twoLegsKnockout && !isFinalRound) {
      // Group fixtures by their logical match pairing using matchNumber
      // Leg 1 = odd matchNumber, Leg 2 = even matchNumber. Both map to Math.ceil(matchNumber / 2)
      const matchupsMap = new Map<number, Fixture[]>()
      for (const f of roundFixtures) {
        // Fallback to matchNumber if missing (though it shouldn't be)
        const logicalMatchId = f.matchNumber ? Math.ceil(f.matchNumber / 2) : 1
        if (!matchupsMap.has(logicalMatchId)) matchupsMap.set(logicalMatchId, [])
        matchupsMap.get(logicalMatchId)!.push(f)
      }

      // Sort by logicalMatchId to maintain bracket ordering (top to bottom)
      const sortedLogicalIds = Array.from(matchupsMap.keys()).sort((a, b) => a - b)

      for (const logicalMatchId of sortedLogicalIds) {
        const fixtures = matchupsMap.get(logicalMatchId)!
        // Sort within group so Leg 1 comes first (lowest matchNumber)
        fixtures.sort((a, b) => a.matchNumber - b.matchNumber)
        
        const f1 = fixtures[0]!
        const f2 = fixtures[1] // Might be undefined if user deleted Leg 2
        
        matchups.push({
          id: f1.id,
          fixtures,
          isThirdPlace: false,
          homeTeam: f1.homeTeam,
          awayTeam: f1.awayTeam,
          homeTeamPlaceholder: f1.homeTeamPlaceholder,
          awayTeamPlaceholder: f1.awayTeamPlaceholder,
          homeScore: (f1.homeScore ?? 0) + (f2 ? (f2.awayScore ?? 0) : 0),
          awayScore: (f1.awayScore ?? 0) + (f2 ? (f2.homeScore ?? 0) : 0),
          homeSubScores: [f1.homeScore, f2 ? f2.awayScore : null],
          awaySubScores: [f1.awayScore, f2 ? f2.homeScore : null],
          homePenaltyScore: f2?.awayPenaltyScore ?? f1.homePenaltyScore,
          awayPenaltyScore: f2?.homePenaltyScore ?? f1.awayPenaltyScore,
          status: getAggregateStatus(fixtures),
          homeTeamId: f1.homeTeamId,
          awayTeamId: f1.awayTeamId
        })
      }
    } else {
      for (let i = 0; i < roundFixtures.length; i++) {
        const f = roundFixtures[i]!
        const roundName = (f.roundName || '').toLowerCase()
        const isThirdPlace = isFinalRound && props.thirdPlaceMatch && (
          roundName.includes('third') || roundName.includes('3rd') || (i === 1 && !roundName.includes('final'))
        )
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

const firstRoundMatches = computed(() => {
  if (props.rounds.length === 0) return 0
  return matchupsByRound.value[props.rounds[0]!]?.length || 0
})

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

const getMatchGridRow = (roundIndex: number, matchIndex: number) => {
  const span = Math.pow(2, roundIndex)
  const start = matchIndex * span * 2 + 1
  const end = start + span * 2
  return `${start} / ${end}`
}

const finalColumnOffset = computed(() => props.rounds.length - 1)

const COLUMN_WIDTH = 260
const CONNECTOR_WIDTH = 52

const gridColumns = computed(() =>
  props.rounds.map((_, i) => i < props.rounds.length - 1 ? `${COLUMN_WIDTH}px ${CONNECTOR_WIDTH}px` : `${COLUMN_WIDTH}px`).join(' ')
)

const scrollWidth = computed(() => {
  const cols = props.rounds.length
  const connectors = cols - 1
  return `${cols * COLUMN_WIDTH + connectors * CONNECTOR_WIDTH}px`
})

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

// Zoom logic
const scale = ref(1.0)
const zoomIn = () => {
  if (scale.value < 1.5) {
    scale.value = parseFloat((scale.value + 0.1).toFixed(1))
  }
}
const zoomOut = () => {
  if (scale.value > 0.6) {
    scale.value = parseFloat((scale.value - 0.1).toFixed(1))
  }
}
const resetZoom = () => {
  scale.value = 1.0
}
</script>

<template>
  <div class="relative w-full">
    <!-- Zoom Controls -->
    <div class="absolute top-0 right-4 z-40 flex items-center gap-1 rounded-lg border border-gray-200 bg-white/90 p-1 shadow-sm backdrop-blur dark:border-white/10 dark:bg-gray-900/90 text-xs select-none">
      <button
        @click="zoomOut"
        class="flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
        title="Zoom Out"
      >
        <UIcon name="i-heroicons-minus" class="w-3.5 h-3.5" />
      </button>
      <span class="text-[10px] font-bold text-gray-500 dark:text-gray-400 min-w-[28px] text-center">
        {{ Math.round(scale * 100) }}%
      </span>
      <button
        @click="zoomIn"
        class="flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
        title="Zoom In"
      >
        <UIcon name="i-heroicons-plus" class="w-3.5 h-3.5" />
      </button>
      <div class="w-px h-3 bg-gray-200 dark:bg-white/10 mx-1"></div>
      <button
        @click="resetZoom"
        class="px-1.5 py-0.5 rounded text-[9px] font-bold text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
        title="Reset Zoom"
      >
        Reset
      </button>
    </div>

    <div class="bracket-container">
      <div class="bracket-scroll" :style="{ zoom: scale }">
      <!-- Round headers — same grid template as the bracket so each header sits over its column -->
      <div
        class="bracket-headers"
        :style="{
          display: 'grid',
          gridTemplateColumns: gridColumns,
        }"
      >
        <template v-for="(round, roundIndex) in rounds" :key="`header-${round}`">
          <div class="bracket-header">
            <span>{{ getRoundDisplayName(round, roundIndex, rounds.length) }}</span>
          </div>
          <!-- Empty cell for the connector column -->
          <div v-if="roundIndex < rounds.length - 1" />
        </template>
      </div>

      <!-- Bracket grid -->
      <div
        class="bracket-grid"
        :style="{
          '--total-rows': firstRoundMatches * 2,
          display: 'grid',
          gridTemplateColumns: gridColumns,
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
                <div class="match-card" :class="{
                  'match-card--live': matchup.status === FixtureStatus.LIVE,
                  'match-card--completed': matchup.status === FixtureStatus.COMPLETED,
                }">
                  <!-- Home team row -->
                  <div class="team-row" :class="{
                    'team-row--winner': getWinnerState(matchup, true) === 'winner',
                    'team-row--loser': getWinnerState(matchup, true) === 'loser',
                  }">
                    <div class="team-avatar">
                      <img v-if="matchup.homeTeam?.logoUrl" :src="matchup.homeTeam.logoUrl" class="team-avatar__img" />
                      <span v-else class="team-avatar__initial">
                        {{ getTeamName(matchup, true).charAt(0).toUpperCase() }}
                      </span>
                    </div>
                    <span class="team-name" :class="{ 'team-name--tbd': !isTeamKnown(matchup, true) }">
                      {{ getTeamName(matchup, true) }}
                    </span>
                    <div class="team-score-area">
                      <span v-if="matchup.homeSubScores" class="sub-scores">
                        {{ matchup.homeSubScores.map((s: any) => s !== null && s !== undefined ? s : '-').join(', ') }}
                      </span>
                      <span v-if="matchup.homePenaltyScore != null" class="pen-score">
                        ({{ matchup.homePenaltyScore }})
                      </span>
                      <span class="score" :class="{
                        'score--winner': getWinnerState(matchup, true) === 'winner',
                        'score--active': matchup.status === FixtureStatus.LIVE || matchup.status === FixtureStatus.COMPLETED,
                      }">
                        {{ matchup.status === FixtureStatus.COMPLETED || matchup.status === FixtureStatus.LIVE ? matchup.homeScore : '-' }}
                      </span>
                    </div>
                  </div>

                  <!-- Divider -->
                  <div class="team-divider" />

                  <!-- Away team row -->
                  <div class="team-row" :class="{
                    'team-row--winner': getWinnerState(matchup, false) === 'winner',
                    'team-row--loser': getWinnerState(matchup, false) === 'loser',
                  }">
                    <div class="team-avatar">
                      <img v-if="matchup.awayTeam?.logoUrl" :src="matchup.awayTeam.logoUrl" class="team-avatar__img" />
                      <span v-else class="team-avatar__initial">
                        {{ getTeamName(matchup, false).charAt(0).toUpperCase() }}
                      </span>
                    </div>
                    <span class="team-name" :class="{ 'team-name--tbd': !isTeamKnown(matchup, false) }">
                      {{ getTeamName(matchup, false) }}
                    </span>
                    <div class="team-score-area">
                      <span v-if="matchup.awaySubScores" class="sub-scores">
                        {{ matchup.awaySubScores.map((s: any) => s !== null && s !== undefined ? s : '-').join(', ') }}
                      </span>
                      <span v-if="matchup.awayPenaltyScore != null" class="pen-score">
                        ({{ matchup.awayPenaltyScore }})
                      </span>
                      <span class="score" :class="{
                        'score--winner': getWinnerState(matchup, false) === 'winner',
                        'score--active': matchup.status === FixtureStatus.LIVE || matchup.status === FixtureStatus.COMPLETED,
                      }">
                        {{ matchup.status === FixtureStatus.COMPLETED || matchup.status === FixtureStatus.LIVE ? matchup.awayScore : '-' }}
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

                  <!-- Footer: status + actions -->
                  <div class="match-footer">
                    <!-- Live indicator -->
                    <div v-if="matchup.status === FixtureStatus.LIVE" class="status-live">
                      <span class="live-dot" />
                      <span>Live</span>
                    </div>
                    <div v-else-if="matchup.status === FixtureStatus.COMPLETED && !hasNoWinner(matchup)" class="status-done">
                      <UIcon name="i-heroicons-check-circle" class="w-3 h-3" />
                      <span>FT</span>
                    </div>
                    <div v-else-if="hasNoWinner(matchup)" class="status-warn">
                      <UIcon name="i-heroicons-exclamation-triangle" class="w-3 h-3" />
                      <span>No winner</span>
                    </div>
                    <div v-else class="status-sched">
                      <UIcon name="i-heroicons-clock" class="w-3 h-3" />
                      <span>Scheduled</span>
                    </div>

                    <!-- Actions -->
                    <div v-if="!readonly" class="match-actions">
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
                          v-else-if="matchup.status === FixtureStatus.LIVE || matchup.status === FixtureStatus.COMPLETED"
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
                            v-else-if="leg.status === FixtureStatus.LIVE || leg.status === FixtureStatus.COMPLETED"
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
              </div>
            </template>
          </div>

          <!-- Connector column: pair up matches and draw bracket arms -->
          <div v-if="roundIndex < rounds.length - 1" class="connector-column">
            <!-- Render one connector per PAIR of matches (every 2 matches) -->
            <template v-for="pairIndex in Math.ceil((matchupsByRound[round]?.length || 0) / 2)" :key="`conn-pair-${pairIndex}`">
              <div
                class="connector-pair"
                :style="{
                  gridRow: `${(pairIndex - 1) * Math.pow(2, roundIndex) * 4 + 1} / ${(pairIndex - 1) * Math.pow(2, roundIndex) * 4 + Math.pow(2, roundIndex) * 4 + 1}`
                }"
              >
                <svg class="connector-svg" viewBox="0 0 52 100" preserveAspectRatio="none">
                  <!-- Top match: horizontal right, then vertical down to midpoint -->
                  <path d="M 0 25 L 26 25 L 26 50" class="connector-line" />
                  <!-- Bottom match: horizontal right, then vertical up to midpoint -->
                  <path d="M 0 75 L 26 75 L 26 50" class="connector-line" />
                  <!-- Midpoint: horizontal line out to next round -->
                  <path d="M 26 50 L 52 50" class="connector-line" />
                </svg>
              </div>
            </template>
          </div>
        </template>
      </div>

      <!-- 3rd Place Play-off -->
      <div v-if="thirdPlaceMatchups.length > 0" class="third-place-section" :style="{ marginLeft: `${finalColumnOffset * (COLUMN_WIDTH + CONNECTOR_WIDTH)}px`, width: `${COLUMN_WIDTH}px` }">
        <div v-for="matchup in thirdPlaceMatchups" :key="matchup.id">
          <div class="third-place-label">
            <UIcon name="i-heroicons-trophy" class="w-3.5 h-3.5 text-amber-400" />
            3rd Place Play-off
          </div>
          <div class="match-card" :class="{
            'match-card--live': matchup.status === FixtureStatus.LIVE,
            'match-card--completed': matchup.status === FixtureStatus.COMPLETED,
          }">
            <div class="team-row" :class="{
              'team-row--winner': getWinnerState(matchup, true) === 'winner',
              'team-row--loser': getWinnerState(matchup, true) === 'loser',
            }">
              <div class="team-avatar">
                <img v-if="matchup.homeTeam?.logoUrl" :src="matchup.homeTeam.logoUrl" class="team-avatar__img" />
                <span v-else class="team-avatar__initial">{{ getTeamName(matchup, true).charAt(0).toUpperCase() }}</span>
              </div>
              <span class="team-name" :class="{ 'team-name--tbd': !isTeamKnown(matchup, true) }">{{ getTeamName(matchup, true) }}</span>
              <div class="team-score-area">
                <span v-if="matchup.homePenaltyScore != null" class="pen-score">({{ matchup.homePenaltyScore }})</span>
                <span class="score" :class="{
                  'score--winner': getWinnerState(matchup, true) === 'winner',
                  'score--active': matchup.status === FixtureStatus.LIVE || matchup.status === FixtureStatus.COMPLETED,
                }">
                  {{ matchup.status === FixtureStatus.COMPLETED || matchup.status === FixtureStatus.LIVE ? matchup.homeScore : '-' }}
                </span>
              </div>
            </div>
            <div class="team-divider" />
            <div class="team-row" :class="{
              'team-row--winner': getWinnerState(matchup, false) === 'winner',
              'team-row--loser': getWinnerState(matchup, false) === 'loser',
            }">
              <div class="team-avatar">
                <img v-if="matchup.awayTeam?.logoUrl" :src="matchup.awayTeam.logoUrl" class="team-avatar__img" />
                <span v-else class="team-avatar__initial">{{ getTeamName(matchup, false).charAt(0).toUpperCase() }}</span>
              </div>
              <span class="team-name" :class="{ 'team-name--tbd': !isTeamKnown(matchup, false) }">{{ getTeamName(matchup, false) }}</span>
              <div class="team-score-area">
                <span v-if="matchup.awayPenaltyScore != null" class="pen-score">({{ matchup.awayPenaltyScore }})</span>
                <span class="score" :class="{
                  'score--winner': getWinnerState(matchup, false) === 'winner',
                  'score--active': matchup.status === FixtureStatus.LIVE || matchup.status === FixtureStatus.COMPLETED,
                }">
                  {{ matchup.status === FixtureStatus.COMPLETED || matchup.status === FixtureStatus.LIVE ? matchup.awayScore : '-' }}
                </span>
              </div>
            </div>
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
            <div class="match-footer">
              <div v-if="matchup.status === FixtureStatus.LIVE" class="status-live"><span class="live-dot" /><span>Live</span></div>
              <div v-else-if="matchup.status === FixtureStatus.COMPLETED && !hasNoWinner(matchup)" class="status-done"><UIcon name="i-heroicons-check-circle" class="w-3 h-3" /><span>FT</span></div>
              <div v-else-if="hasNoWinner(matchup)" class="status-warn"><UIcon name="i-heroicons-exclamation-triangle" class="w-3 h-3" /><span>No winner</span></div>
              <div v-else class="status-sched"><UIcon name="i-heroicons-clock" class="w-3 h-3" /><span>Scheduled</span></div>
              <div v-if="!readonly" class="match-actions">
                <button
                  v-if="matchup.status === FixtureStatus.SCHEDULED && matchup.homeTeamId && matchup.awayTeamId"
                  class="action-btn action-btn--start"
                  :disabled="updatingMatch"
                  @click.stop="emit('start-match', matchup.fixtures[0])"
                >
                  <UIcon name="i-heroicons-play" class="w-3 h-3" />Start
                </button>
                <button
                  v-else-if="matchup.status === FixtureStatus.LIVE || matchup.status === FixtureStatus.COMPLETED"
                  class="action-btn action-btn--control"
                  @click.stop="emit('control-match', matchup.fixtures[0])"
                >
                  <UIcon name="i-heroicons-adjustments-horizontal" class="w-3 h-3" />Control
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<style scoped>
/* ── Layout ───────────────────────────────────────────────── */
.bracket-container {
  width: 100%;
  overflow-x: auto;
  padding: 1.25rem;
}

.bracket-scroll {
  display: inline-block;
}

/* ── Round headers ────────────────────────────────────────── */
.bracket-headers {
  margin-bottom: 1.25rem;
}

.bracket-header {
  display: flex;
  justify-content: center;
}

.bracket-header span {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #6b7280;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
}

:root.dark .bracket-header span {
  background: rgba(255,255,255,0.05);
  border-color: rgba(255,255,255,0.08);
  color: #9ca3af;
}


/* ── Grid ─────────────────────────────────────────────────── */
.bracket-grid {
  display: grid;
  width: 100%;
}

.matches-column {
  display: grid;
  grid-template-rows: repeat(var(--total-rows), 1fr);
  min-width: 0;
  overflow: hidden;
  gap: 0;
}

.match-cell {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 6px 0;
  min-width: 0;
  overflow: hidden;
}

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

/* Live: pulsing left border */
.match-card--live {
  border-left: 2px solid #f59e0b;
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

/* ── Team row ─────────────────────────────────────────────── */
.team-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.6rem;
  transition: background 0.15s;
  position: relative;
  min-width: 0;
  overflow: hidden;
}

.team-row--winner {
  background: rgba(16,185,129,0.06);
}


.team-row--loser {
  opacity: 0.38;
}

:root.dark .team-row--winner {
  background: rgba(16,185,129,0.08);
}

/* ── Team avatar ──────────────────────────────────────────── */
.team-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e5e7eb;
}

:root.dark .team-avatar {
  background: #1f2937;
  border-color: rgba(255,255,255,0.08);
}

.team-avatar__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.team-avatar__initial {
  font-size: 0.6rem;
  font-weight: 700;
  color: #6b7280;
}

/* ── Team name ────────────────────────────────────────────── */
.team-name {
  font-size: 0.725rem;
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

:root.dark .team-name {
  color: #f3f4f6;
}

.team-name--tbd {
  color: #9ca3af;
  font-weight: 400;
  font-style: italic;
}

/* ── Score area ───────────────────────────────────────────── */
.team-score-area {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

.sub-scores {
  font-size: 0.6rem;
  color: #9ca3af;
  font-weight: 500;
}

.pen-score {
  font-size: 0.6rem;
  color: #9ca3af;
  font-weight: 500;
}

.score {
  font-size: 0.775rem;
  font-weight: 700;
  color: #9ca3af;
  min-width: 1.25rem;
  text-align: center;
  background: #f9fafb;
  border: 1px solid #f3f4f6;
  border-radius: 5px;
  padding: 0.1rem 0.25rem;
  line-height: 1.4;
}

:root.dark .score {
  color: #6b7280;
  background: rgba(255,255,255,0.04);
  border-color: rgba(255,255,255,0.06);
}

.score--active {
  color: #374151;
}

:root.dark .score--active {
  color: #e5e7eb;
}

.score--winner {
  color: #059669 !important;
  background: rgba(16,185,129,0.08) !important;
  border-color: rgba(16,185,129,0.2) !important;
}

/* ── Team divider ─────────────────────────────────────────── */
.team-divider {
  height: 1px;
  background: #f3f4f6;
  margin: 0 0.6rem;
}

:root.dark .team-divider {
  background: rgba(255,255,255,0.05);
}

/* ── Match footer ─────────────────────────────────────────── */
.match-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.3rem 0.6rem;
  background: #f9fafb;
  border-top: 1px solid #f3f4f6;
  gap: 0.5rem;
}

:root.dark .match-footer {
  background: rgba(255,255,255,0.02);
  border-top-color: rgba(255,255,255,0.04);
}

/* status chips */
.status-live,
.status-done,
.status-warn,
.status-sched {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.status-live  { color: #f59e0b; }
.status-done  { color: #10b981; }
.status-warn  { color: #f59e0b; }
.status-sched { color: #6b7280; }

.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #f59e0b;
  animation: pulse-dot 1s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}

/* ── Action buttons ───────────────────────────────────────── */
.match-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.6rem;
  font-weight: 600;
  padding: 0.2rem 0.45rem;
  border-radius: 5px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  line-height: 1.4;
}

.action-btn--start {
  background: rgba(16,185,129,0.12);
  color: #059669;
  border-color: rgba(16,185,129,0.2);
}

.action-btn--start:hover:not(:disabled) {
  background: rgba(16,185,129,0.2);
}

.action-btn--control {
  background: rgba(245,158,11,0.12);
  color: #d97706;
  border-color: rgba(245,158,11,0.2);
}

.action-btn--control:hover {
  background: rgba(245,158,11,0.2);
}

.action-btn--disabled {
  background: rgba(107,114,128,0.08);
  color: #9ca3af;
  border-color: rgba(107,114,128,0.12);
  cursor: default;
}

/* ── Connectors ───────────────────────────────────────────── */
.connector-column {
  display: grid;
  grid-template-rows: repeat(var(--total-rows), 1fr);
  width: 52px;
  flex-shrink: 0;
}

.connector-pair {
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
  stroke: #e5e7eb;
  stroke-width: 1.5;
  fill: none;
  vector-effect: non-scaling-stroke;
}

:root.dark .connector-line {
  stroke: rgba(255,255,255,0.1);
}

/* ── 3rd place ────────────────────────────────────────────── */
.third-place-section {
  margin-top: 1rem;
  max-width: 260px;
}

.third-place-label {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #9ca3af;
  margin-bottom: 0.5rem;
}

/* ── Responsive ───────────────────────────────────────────── */
@media (max-width: 768px) {
  .team-name {
    font-size: 0.75rem;
  }
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
</style>
