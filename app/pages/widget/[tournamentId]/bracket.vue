<script setup lang="ts">
import type { Tournament, Fixture } from '~/types'
import { FixtureStatus } from '~/types'

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
const fixturesByRound = ref<Record<number, Fixture[]>>({})

const buildBracket = () => {
  // Group fixtures by round
  const grouped: Record<number, Fixture[]> = {}
  for (const fixture of fixtures.value) {
    const round = fixture.round || 1
    if (!grouped[round]) grouped[round] = []
    grouped[round].push(fixture)
  }
  
  // Sort rounds
  const sortedRounds = Object.keys(grouped).map(Number).sort((a, b) => a - b)
  rounds.value = sortedRounds
  fixturesByRound.value = grouped
}

// Get round name based on total rounds and current round
const getRoundName = (roundIndex: number, totalRounds: number) => {
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
const getTeamClass = (fixture: Fixture, isHome: boolean) => {
  if (fixture.status !== FixtureStatus.COMPLETED) return ''
  const homeScore = fixture.homeScore ?? 0
  const awayScore = fixture.awayScore ?? 0
  const isWinner = isHome ? homeScore > awayScore : awayScore > homeScore
  const isLoser = isHome ? homeScore < awayScore : awayScore < homeScore
  if (isWinner) return 'font-bold'
  if (isLoser) return 'opacity-50'
  return ''
}

// Fetch data
const fetchData = async () => {
  loading.value = true
  error.value = null
  try {
    const [tournamentRes, fixturesRes] = await Promise.all([
      $api<any>(`/tournaments/${tournamentId}`),
      $api<any>(`/tournaments/${tournamentId}/fixtures`)
    ])
    tournament.value = tournamentRes.data
    fixtures.value = fixturesRes.data || []
    buildBracket()
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
              :style="{ minHeight: `${(fixturesByRound[rounds[0] ?? 0]?.length || 1) * 80}px` }"
            >
              <div 
                v-for="fixture in fixturesByRound[round]" 
                :key="fixture.id"
                class="w-52 rounded-lg border overflow-hidden"
                :class="isDark ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200 shadow-sm'"
              >
                <!-- Home Team -->
                <div 
                  class="flex items-center justify-between px-3 py-2 border-b"
                  :class="[
                    isDark ? 'border-white/5' : 'border-gray-100',
                    getTeamClass(fixture, true)
                  ]"
                >
                  <div class="flex items-center gap-2 flex-1 min-w-0">
                    <div class="w-5 h-5 rounded-full overflow-hidden flex-shrink-0" :class="isDark ? 'bg-gray-800' : 'bg-gray-100'">
                      <img v-if="fixture.homeTeam?.logoUrl" :src="fixture.homeTeam.logoUrl" class="w-full h-full object-cover" />
                      <span v-else class="flex items-center justify-center w-full h-full text-[8px] font-bold">
                        {{ (fixture.homeTeam?.customName || 'TBD').charAt(0) }}
                      </span>
                    </div>
                    <span class="text-xs truncate">{{ fixture.homeTeam?.customName || 'TBD' }}</span>
                  </div>
                  <span 
                    class="text-sm font-bold min-w-[1.5rem] text-center"
                    :class="fixture.status === FixtureStatus.COMPLETED || fixture.status === FixtureStatus.LIVE ? '' : (isDark ? 'text-gray-600' : 'text-gray-300')"
                  >
                    {{ fixture.status === FixtureStatus.COMPLETED || fixture.status === FixtureStatus.LIVE ? (fixture.homeScore ?? 0) : '-' }}
                  </span>
                </div>

                <!-- Away Team -->
                <div 
                  class="flex items-center justify-between px-3 py-2"
                  :class="getTeamClass(fixture, false)"
                >
                  <div class="flex items-center gap-2 flex-1 min-w-0">
                    <div class="w-5 h-5 rounded-full overflow-hidden flex-shrink-0" :class="isDark ? 'bg-gray-800' : 'bg-gray-100'">
                      <img v-if="fixture.awayTeam?.logoUrl" :src="fixture.awayTeam.logoUrl" class="w-full h-full object-cover" />
                      <span v-else class="flex items-center justify-center w-full h-full text-[8px] font-bold">
                        {{ (fixture.awayTeam?.customName || 'TBD').charAt(0) }}
                      </span>
                    </div>
                    <span class="text-xs truncate">{{ fixture.awayTeam?.customName || 'TBD' }}</span>
                  </div>
                  <span 
                    class="text-sm font-bold min-w-[1.5rem] text-center"
                    :class="fixture.status === FixtureStatus.COMPLETED || fixture.status === FixtureStatus.LIVE ? '' : (isDark ? 'text-gray-600' : 'text-gray-300')"
                  >
                    {{ fixture.status === FixtureStatus.COMPLETED || fixture.status === FixtureStatus.LIVE ? (fixture.awayScore ?? 0) : '-' }}
                  </span>
                </div>

                <!-- Status -->
                <div v-if="fixture.status === FixtureStatus.LIVE" class="text-center py-1" :class="isDark ? 'bg-red-500/10' : 'bg-red-50'">
                  <span class="text-[10px] font-medium text-red-400">● LIVE</span>
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
