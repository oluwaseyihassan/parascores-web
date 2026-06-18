<script setup lang="ts">
import type { Tournament, Fixture } from '~/types'
import { FixtureStage, TournamentType } from '~/types'

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

const isBracketSupported = computed(() => {
  return tournament.value?.type === TournamentType.KNOCKOUT || tournament.value?.type === TournamentType.HYBRID
})

// Group fixtures by round for KnockoutBracket
const bracketFixturesByRound = computed(() => {
  const grouped: Record<number, Fixture[]> = {}
  
  if (!isBracketSupported.value) return grouped

  let bracketFixtures = fixtures.value
  if (tournament.value?.type === TournamentType.HYBRID) {
    bracketFixtures = fixtures.value.filter(f => f.stage === FixtureStage.KNOCKOUT)
  }

  for (const fixture of bracketFixtures) {
    const round = fixture.round || 1
    if (!grouped[round]) grouped[round] = []
    grouped[round].push(fixture)
  }
  return grouped
})

const rounds = computed(() => {
  return Object.keys(bracketFixturesByRound.value).map(Number).sort((a, b) => a - b)
})

// Build round name lookup from fixture data
const roundNameMap = computed(() => {
  const map: Record<number, string> = {}
  let bracketFixtures = fixtures.value
  if (tournament.value?.type === TournamentType.HYBRID) {
    bracketFixtures = fixtures.value.filter(f => f.stage === FixtureStage.KNOCKOUT)
  }
  for (const fixture of bracketFixtures) {
    const round = fixture.round || 1
    if (!map[round] && fixture.roundName) {
      map[round] = fixture.roundName.replace(/^Group\s+Stage\s*-\s*/i, '')
    }
  }
  return map
})

const getRoundDisplayName = (round: number, index: number, total: number) => {
  if (roundNameMap.value[round]) {
    return roundNameMap.value[round]
  }
  const remaining = total - index
  switch (remaining) {
    case 1: return 'Final'
    case 2: return 'Semi-Final'
    case 3: return 'Quarter-Final'
    case 4: return 'Round of 16'
    case 5: return 'Round of 32'
    default: return `Round ${index + 1}`
  }
}

// Fetch data
const fetchData = async () => {
  loading.value = true
  error.value = null
  try {
    const [tournamentRes, fixturesRes] = await Promise.all([
      $api<any>(`/tournaments/${tournamentId}`),
      $api<any>(`/fixtures/tournaments/${tournamentId}`)
    ])
    tournament.value = tournamentRes.data
    
    const fixturesData = fixturesRes.data
    if (fixturesData?.rounds) {
      fixtures.value = fixturesData.rounds.flatMap((r: any) => r.fixtures || [])
    } else if (Array.isArray(fixturesData)) {
      fixtures.value = fixturesData
    } else {
      fixtures.value = []
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

      <!-- Reused Bracket Component -->
      <div v-if="rounds.length > 0">
        <KnockoutBracket
          :fixtures-by-round="bracketFixturesByRound"
          :rounds="rounds"
          :get-round-display-name="(round, index, total) => getRoundDisplayName(round, index, total)"
          :two-legs-knockout="tournament?.twoLegsKnockout"
          :third-place-match="tournament?.thirdPlaceMatch"
          :readonly="true"
        />
      </div>

      <!-- Empty state -->
      <div v-else class="text-center py-12">
        <p class="text-sm" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
          {{ isBracketSupported ? 'No bracket data available yet.' : 'This tournament type does not support brackets.' }}
        </p>
      </div>
    </div>
  </div>
</template>
