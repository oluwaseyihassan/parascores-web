<script setup lang="ts">
import type { Tournament, Fixture } from '~/types'
import { FixtureStatus, FixtureStage, TournamentType } from '~/types'

definePageMeta({
  layout: 'widget'
})

const route = useRoute()
const tournamentId = route.params.tournamentId as string

// Theme (injected from widget layout)
const isDark = inject<Ref<boolean>>('widgetIsDark', ref(true))

// State
const tournament = ref<Tournament | null>(null)
const fixtures = ref<Fixture[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

// Bracket computation
const rounds = ref<number[]>([])
const matchupsByRound = ref<Record<number, any[]>>({})

// Helper to get aggregate status
const getAggregateStatus = (fixtures: Fixture[]): FixtureStatus => {
  if (fixtures.some(f => f.status === FixtureStatus.LIVE)) return FixtureStatus.LIVE
  if (fixtures.every(f => f.status === FixtureStatus.COMPLETED)) return FixtureStatus.COMPLETED
  if (fixtures.some(f => f.status === FixtureStatus.SCHEDULED)) return FixtureStatus.SCHEDULED
  return FixtureStatus.CANCELLED
}

const buildBracket = () => {
  // For hybrid tournaments, only show knockout-stage fixtures
  let bracketFixtures = fixtures.value
  if (tournament.value?.type === TournamentType.HYBRID) {
    bracketFixtures = fixtures.value.filter(f => f.stage === FixtureStage.KNOCKOUT)
  }

  // Group fixtures by round
  const grouped: Record<number, Fixture[]> = {}
  for (const fixture of bracketFixtures) {
    const round = fixture.round || 1
    if (!grouped[round]) grouped[round] = []
    grouped[round].push(fixture)
  }
  
  // Sort rounds
  const sortedRounds = Object.keys(grouped).map(Number).sort((a, b) => a - b)
  rounds.value = sortedRounds
  
  // Group into Matchups (handle 2-leg ties and 3rd place match)
  const isTwoLegsKnockout = tournament.value?.twoLegsKnockout || false
  const hasThirdPlaceMatch = tournament.value?.thirdPlaceMatch || false
  const totalRounds = sortedRounds.length
  
  const matchupsGrouped: Record<number, any[]> = {}
  
  sortedRounds.forEach((round, roundIndex) => {
    const isFinalRound = roundIndex === totalRounds - 1
    const roundFixtures = grouped[round] || []
    
    // Sort fixtures by matchNumber to ensure correct ordering
    roundFixtures.sort((a, b) => a.matchNumber - b.matchNumber)
    
    const matchups: any[] = []
    
    if (isTwoLegsKnockout && !isFinalRound) {
      // Group by 2 for dual-leg matches
      for (let i = 0; i < roundFixtures.length; i += 2) {
        const f1 = roundFixtures[i]!
        const f2 = roundFixtures[i + 1]
        
        const legs = [f1]
        if (f2) legs.push(f2)
        
        matchups.push({
          id: f1.id,
          fixtures: legs,
          isThirdPlace: false,
          homeTeam: f1.homeTeam,
          awayTeam: f1.awayTeam,
          homeTeamPlaceholder: f1.homeTeamPlaceholder,
          awayTeamPlaceholder: f1.awayTeamPlaceholder,
          homeScore: legs.reduce((sum, f) => sum + (f.homeScore ?? 0), 0),
          awayScore: legs.reduce((sum, f) => sum + (f.awayScore ?? 0), 0),
          homePenaltyScore: f2?.homePenaltyScore ?? f1.homePenaltyScore,
          awayPenaltyScore: f2?.awayPenaltyScore ?? f1.awayPenaltyScore,
          status: getAggregateStatus(legs)
        })
      }
    } else {
      // Single leg or final round
      for (let i = 0; i < roundFixtures.length; i++) {
        const f = roundFixtures[i]!
        const isThirdPlace = isFinalRound && hasThirdPlaceMatch && i === 1
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
          status: f.status
        })
      }
    }
    
    matchupsGrouped[round] = matchups
  })

  matchupsByRound.value = matchupsGrouped

  // Build round name lookup from fixture data
  for (const fixture of bracketFixtures) {
    const round = fixture.round || 1
    if (!roundNameMap.value[round] && fixture.roundName) {
      roundNameMap.value[round] = fixture.roundName
    }
  }
}

// Round name lookup (from fixture data)
const roundNameMap = ref<Record<number, string>>({})

// Get round name: prefer fixture's roundName, then fallback to calculated
const getRoundName = (roundIndex: number, totalRounds: number) => {
  const round = rounds.value[roundIndex]
  if (round !== undefined && roundNameMap.value[round]) {
    return roundNameMap.value[round]
  }
  const remaining = totalRounds - roundIndex
  switch (remaining) {
    case 1: return 'Final'
    case 2: return 'Semi-Final'
    case 3: return 'Quarter-Final'
    case 4: return 'Round of 16'
    case 5: return 'Round of 32'
    default: return `Round ${roundIndex + 1}`
  }
}

// Get winner class for completed matches
const getTeamClass = (matchup: any, isHome: boolean) => {
  if (matchup.status !== FixtureStatus.COMPLETED) return ''
  const homeScore = matchup.homeScore ?? 0
  const awayScore = matchup.awayScore ?? 0
  
  let isWinner = false
  let isLoser = false
  
  if (homeScore === awayScore) {
    const homePen = matchup.homePenaltyScore ?? 0
    const awayPen = matchup.awayPenaltyScore ?? 0
    if (homePen !== awayPen) {
      isWinner = isHome ? homePen > awayPen : awayPen > homePen
      isLoser = isHome ? homePen < awayPen : awayPen < homePen
    }
  } else {
    isWinner = isHome ? homeScore > awayScore : awayScore > homeScore
    isLoser = isHome ? homeScore < awayScore : awayScore < homeScore
  }
  
  if (isWinner) return 'font-bold text-gray-900 dark:text-white'
  if (isLoser) return 'opacity-50'
  return ''
}

// Fetch data
const fetchData = async () => {
  loading.value = true
  error.value = null
  try {
    const tournamentRes = await $api<any>(`/tournaments/${tournamentId}`)
    tournament.value = tournamentRes.data
    
    if (tournament.value?.id) {
      const fixturesRes = await $api<any>(`/fixtures/tournaments/${tournament.value.id}`)
      // Handle API response: may be { rounds: [...] } or flat array
      const fixturesData = fixturesRes.data
      if (fixturesData?.rounds) {
        fixtures.value = fixturesData.rounds.flatMap((r: any) => r.fixtures || [])
      } else if (Array.isArray(fixturesData)) {
        fixtures.value = fixturesData
      } else {
        fixtures.value = []
      }
      buildBracket()
    }
  } catch (e: any) {
    error.value = e.message || 'Failed to load bracket'
    console.error('Widget error:', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="p-4">
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-12 text-red-400">
      <p class="text-sm">{{ error }}</p>
    </div>

    <!-- Content -->
    <div v-else>
      <!-- Tournament Header -->
      <div class="flex items-center gap-3 mb-6">
        <div class="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0" :class="isDark ? 'bg-gray-800' : 'bg-gray-100'">
          <img v-if="tournament?.logoUrl" :src="tournament.logoUrl" class="w-full h-full object-cover" />
          <div v-else class="w-full h-full flex items-center justify-center text-sm font-bold" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
            {{ (tournament?.name || 'T').charAt(0) }}
          </div>
        </div>
        <div>
          <h2 class="font-bold text-lg leading-tight">{{ tournament?.name }}</h2>
          <p class="text-xs" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
            Bracket
          </p>
        </div>
      </div>

      <!-- Bracket Display -->
      <div v-if="rounds.length > 0" class="overflow-x-auto pb-4">
        <div class="flex gap-6 min-w-max">
          <!-- Each Round -->
          <div v-for="(round, roundIndex) in rounds" :key="round" class="flex flex-col">
            <!-- Round Header -->
            <div class="text-center mb-4">
              <span class="text-xs font-semibold uppercase tracking-wider" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
                {{ getRoundName(roundIndex, rounds.length) }}
              </span>
            </div>

            <!-- Matches -->
            <div 
              class="flex flex-col justify-around flex-1 gap-4"
              :style="{ minHeight: `${(matchupsByRound[rounds[0] ?? 0]?.length || 1) * 80}px` }"
            >
              <div 
                v-for="matchup in matchupsByRound[round]" 
                :key="matchup.id"
                class="flex flex-col items-center"
              >
                <!-- 3rd Place Match Label -->
                <div v-if="matchup.isThirdPlace" class="text-[0.65rem] font-bold text-gray-500 uppercase tracking-wider text-center mt-6 mb-2">
                  3rd Place Play-off
                </div>
              
                <div
                  class="w-52 rounded-lg border overflow-hidden"
                  :class="isDark ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200 shadow-sm'"
                >
                  <!-- Home Team -->
                  <div 
                    class="flex items-center justify-between px-3 py-2 border-b"
                    :class="[
                      isDark ? 'border-white/5' : 'border-gray-100',
                      getTeamClass(matchup, true)
                    ]"
                  >
                    <div class="flex items-center gap-2 flex-1 min-w-0">
                      <div class="w-5 h-5 rounded-full overflow-hidden flex-shrink-0" :class="isDark ? 'bg-gray-800' : 'bg-gray-100'">
                        <img v-if="matchup.homeTeam?.logoUrl" :src="matchup.homeTeam.logoUrl" class="w-full h-full object-cover" />
                        <span v-else class="flex items-center justify-center w-full h-full text-[8px] font-bold">
                          {{ (matchup.homeTeam?.customName || 'TBD').charAt(0) }}
                        </span>
                      </div>
                      <span class="text-xs truncate">{{ matchup.homeTeam?.customName || 'TBD' }}</span>
                    </div>
                    <div class="flex items-center gap-1.5 flex-shrink-0">
                      <span v-if="matchup.fixtures.length > 1" class="text-[0.65rem] font-medium opacity-60 whitespace-nowrap">
                        ({{ matchup.fixtures.map((f: any) => f.status === 'COMPLETED' || f.status === 'LIVE' ? (f.homeScore ?? 0) : '-').join(', ') }})
                      </span>
                      <span 
                        class="text-sm font-bold min-w-[1.5rem] text-center inline-flex items-center justify-end"
                        :class="matchup.status === FixtureStatus.COMPLETED || matchup.status === FixtureStatus.LIVE ? '' : (isDark ? 'text-gray-600' : 'text-gray-300')"
                      >
                        <span v-if="matchup.homePenaltyScore !== null && matchup.homePenaltyScore !== undefined" class="text-[0.65rem] font-normal opacity-60 mr-1.5">
                          ({{ matchup.homePenaltyScore }})
                        </span>
                        {{ matchup.status === FixtureStatus.COMPLETED || matchup.status === FixtureStatus.LIVE ? (matchup.homeScore ?? 0) : '-' }}
                      </span>
                    </div>
                  </div>

                  <!-- Away Team -->
                  <div 
                    class="flex items-center justify-between px-3 py-2"
                    :class="getTeamClass(matchup, false)"
                  >
                    <div class="flex items-center gap-2 flex-1 min-w-0">
                      <div class="w-5 h-5 rounded-full overflow-hidden flex-shrink-0" :class="isDark ? 'bg-gray-800' : 'bg-gray-100'">
                        <img v-if="matchup.awayTeam?.logoUrl" :src="matchup.awayTeam.logoUrl" class="w-full h-full object-cover" />
                        <span v-else class="flex items-center justify-center w-full h-full text-[8px] font-bold">
                          {{ (matchup.awayTeam?.customName || 'TBD').charAt(0) }}
                        </span>
                      </div>
                      <span class="text-xs truncate">{{ matchup.awayTeam?.customName || 'TBD' }}</span>
                    </div>
                    <div class="flex items-center gap-1.5 flex-shrink-0">
                      <span v-if="matchup.fixtures.length > 1" class="text-[0.65rem] font-medium opacity-60 whitespace-nowrap">
                        ({{ matchup.fixtures.map((f: any) => f.status === 'COMPLETED' || f.status === 'LIVE' ? (f.awayScore ?? 0) : '-').join(', ') }})
                      </span>
                      <span 
                        class="text-sm font-bold min-w-[1.5rem] text-center inline-flex items-center justify-end"
                        :class="matchup.status === FixtureStatus.COMPLETED || matchup.status === FixtureStatus.LIVE ? '' : (isDark ? 'text-gray-600' : 'text-gray-300')"
                      >
                        <span v-if="matchup.awayPenaltyScore !== null && matchup.awayPenaltyScore !== undefined" class="text-[0.65rem] font-normal opacity-60 mr-1.5">
                          ({{ matchup.awayPenaltyScore }})
                        </span>
                        {{ matchup.status === FixtureStatus.COMPLETED || matchup.status === FixtureStatus.LIVE ? (matchup.awayScore ?? 0) : '-' }}
                      </span>
                    </div>
                  </div>

                  <!-- Status -->
                  <div v-if="matchup.status === FixtureStatus.LIVE" class="text-center py-1" :class="isDark ? 'bg-red-500/10' : 'bg-red-50'">
                    <span class="text-[10px] font-medium text-red-400">● LIVE</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="text-center py-12">
        <p class="text-sm" :class="isDark ? 'text-gray-500' : 'text-gray-400'">No bracket data available yet.</p>
      </div>
    </div>
  </div>
</template>
