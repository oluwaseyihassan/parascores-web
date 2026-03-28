<script setup lang="ts">
import type { Tournament, Fixture, Standing, Participant, Sponsor, Social } from '~/types'
import { TournamentType, FixtureStatus, FixtureStage, ParticipantType } from '~/types'

definePageMeta({
  layout: 'widget'
})

const route = useRoute()
const tournamentId = route.params.id as string

// Theme (injected from widget layout)
const isDark = inject<Ref<boolean>>('widgetIsDark', ref(true))

// State
const tournament = ref<Tournament | null>(null)
const fixtures = ref<Fixture[]>([])
const standings = ref<Standing[]>([])
const participants = ref<Participant[]>([])
const sponsors = ref<Sponsor[]>([])
const socials = ref<Social[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
import MarketingFixtureDetails from '~/components/marketing/FixtureDetails.vue'
import MarketingTeamDetails from '~/components/marketing/TeamDetails.vue'
const activeTab = ref<'fixtures' | 'standings' | 'bracket' | 'info' | 'participants' | 'stats'>('info')
const selectedFixtureId = ref<string | null>(null)
const selectedParticipantId = ref<string | null>(null)

// Goal Flash state
const flashingFixtures = ref<Map<string, 'home' | 'away'>>(new Map())
const toastedScores = new Map<string, string>() // fixtureId -> "home-away" last toasted score
const toast = useToast()

// Player Stats state
const playerStats = ref<any>(null)
const playerStatsLoading = ref(false)

const loadPlayerStats = async () => {
  if (!tournamentId) return
  playerStatsLoading.value = true
  try {
    const res = await $publicApi<{success: boolean, data: any}>(`/tournaments/${tournamentId}/player-stats`)
    if (res.data) {
      playerStats.value = res.data
    }
  } catch (e) {
    console.error('Failed to load player stats:', e)
  } finally {
    playerStatsLoading.value = false
  }
}

watch(activeTab, () => {
  selectedFixtureId.value = null
  selectedParticipantId.value = null
})

// Establish Live Stream connection to receive realtime push notifications
useLiveStream()

function onLiveMatchUpdate(e: Event) {
  const customEvent = e as CustomEvent
  const { type, data } = customEvent.detail

  if (type === 'fixture_updated') {
    const targetIdx = fixtures.value.findIndex((f) => f.id === data.id)
    if (targetIdx !== -1) {
      const oldFixture = fixtures.value[targetIdx]
      if (!oldFixture) return
      const oldHome = oldFixture.homeScore ?? 0
      const oldAway = oldFixture.awayScore ?? 0
      const newHome = data.homeScore ?? 0
      const newAway = data.awayScore ?? 0

      // Detect goal: score increased
      const goalScored = newHome > oldHome || newAway > oldAway

      // Merge fixture data
      fixtures.value[targetIdx] = { ...oldFixture, ...data }

      // Trigger goal flash (deduplicate rapid SSE events)
      const scoreKey = `${newHome}-${newAway}`
      if (goalScored && toastedScores.get(data.id) !== scoreKey) {
        toastedScores.set(data.id, scoreKey)

        const homeName = data.homeTeam?.customName || oldFixture.homeTeam?.customName || 'Home'
        const awayName = data.awayTeam?.customName || oldFixture.awayTeam?.customName || 'Away'
        const scoringSide: 'home' | 'away' = newHome > oldHome ? 'home' : 'away'
        const scoringTeam = scoringSide === 'home' ? homeName : awayName

        // Add goal indicator
        const updatedMap = new Map(flashingFixtures.value)
        updatedMap.set(data.id, scoringSide)
        flashingFixtures.value = updatedMap

        // Remove goal indicator after 5s
        setTimeout(() => {
          const m = new Map(flashingFixtures.value)
          m.delete(data.id)
          flashingFixtures.value = m
        }, 5000)

        // Toast notification
        toast.add({
          id: `goal-${data.id}-${newHome}-${newAway}`,
          title: `⚽ GOAL! ${scoringTeam}`,
          description: `${homeName} ${newHome} - ${newAway} ${awayName}`,
          color: 'success',
          icon: 'i-mdi-soccer',
          duration: 10000
        })
      }
    }
  }
}

onMounted(() => {
  window.addEventListener('live-match-update', onLiveMatchUpdate)
})

onBeforeUnmount(() => {
  window.removeEventListener('live-match-update', onLiveMatchUpdate)
})

// Fetch data
async function fetchData() {
  loading.value = true
  error.value = null
  try {
    const response = await $publicApi<{
      success: boolean;
      data: {
        tournament: Tournament;
        participants: Participant[];
        fixtures: Fixture[];
        standings: any[];
        sponsors: Sponsor[];
        socials: Social[];
      }
    }>(`/tournaments/${tournamentId}/overview`).catch(() => null)
    
    if (response?.data) {
      tournament.value = response.data.tournament
      
      // Handle fixtures
      fixtures.value = response.data.fixtures || []
      
      // Handle standings
      standings.value = response.data.standings || []
      
      // Handle participants
      participants.value = response.data.participants || []
      
      // Handle sponsors
      sponsors.value = response.data.sponsors || []
      
      // Handle socials
      socials.value = response.data.socials || []
      
      // Load player stats if applicable
      if (tournament.value.participantType === ParticipantType.TEAM) {
        loadPlayerStats()
      }
    } else {
      error.value = 'Tournament not found'
    }
  } catch (err: any) {
    error.value = err?.message || 'Failed to load tournament'
    console.error('Fetch tournament failed:', err)
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

// SEO
watchEffect(() => {
  if (tournament.value) {
    useSeoMeta({
      title: `${tournament.value.name} | ParaScores`,
      description: tournament.value.description || `Follow ${tournament.value.name} live scores, fixtures, standings, and brackets.`,
      ogTitle: `${tournament.value.name} | ParaScores`,
      ogDescription: tournament.value.description || `Follow ${tournament.value.name} live scores, fixtures, standings, and brackets.`,
    })
  }
})

// Computed
const hasLiveFixtures = computed(() => fixtures.value.some(f => f.status === FixtureStatus.LIVE))

const isTeams = computed(() => tournament.value?.participantType === ParticipantType.TEAM)
const participantsTabName = computed(() => isTeams.value ? 'Teams' : 'Participants')

const isHybrid = computed(() => tournament.value?.type === TournamentType.HYBRID)
const showBracketTab = computed(() => {
  if (!tournament.value) return false
  return tournament.value.type === TournamentType.KNOCKOUT || tournament.value.type === TournamentType.HYBRID
})

// Fixtures grouped by round
const legFilter = ref<'ALL' | '1' | '2'>('ALL')

const filteredFixtures = computed(() => {
  if (legFilter.value === 'ALL') return fixtures.value
  return fixtures.value.filter(f => {
    if (tournament.value?.twoLegsKnockout) {
      if (legFilter.value === '1') return !f.roundName?.toLowerCase().includes('leg 2')
      if (legFilter.value === '2') return !f.roundName?.toLowerCase().includes('leg 1')
    }
    return true
  })
})

const groupStageFixtures = computed(() => filteredFixtures.value.filter(f => f.stage === FixtureStage.GROUP_STAGE))
const knockoutFixtures = computed(() => filteredFixtures.value.filter(f => f.stage === FixtureStage.KNOCKOUT))

function groupByRound(list: Fixture[]) {
  const grouped: Record<string, { name: string; fixtures: Fixture[] }> = {}
  for (const fixture of list) {
    const round = fixture.round || 1
    const name = fixture.roundName || `Round ${round}`
    // Use composite key so fixtures with different roundNames in the same round get separate groups
    const key = `${round}::${name}`
    if (!grouped[key]) {
      grouped[key] = { name, fixtures: [] }
    }
    grouped[key].fixtures.push(fixture)
  }
  return grouped
}

const fixturesByRound = computed(() => {
  if (isHybrid.value) return groupByRound(groupStageFixtures.value)
  return groupByRound(filteredFixtures.value)
})
const sortedRounds = computed(() => Object.keys(fixturesByRound.value).sort((a, b) => {
  const aNum = parseInt(a.split('::')[0]!)
  const bNum = parseInt(b.split('::')[0]!)
  if (aNum !== bNum) return aNum - bNum
  // Same round: put Final last so Third Place comes first
  const aName = a.split('::')[1] || ''
  const bName = b.split('::')[1] || ''
  if (aName.toLowerCase().includes('final') && !aName.toLowerCase().includes('third')) return 1
  if (bName.toLowerCase().includes('final') && !bName.toLowerCase().includes('third')) return -1
  return 0
}))

const knockoutByRound = computed(() => groupByRound(knockoutFixtures.value))
const knockoutRounds = computed(() => Object.keys(knockoutByRound.value).sort((a, b) => {
  const aNum = parseInt(a.split('::')[0]!)
  const bNum = parseInt(b.split('::')[0]!)
  if (aNum !== bNum) return aNum - bNum
  const aName = a.split('::')[1] || ''
  const bName = b.split('::')[1] || ''
  if (aName.toLowerCase().includes('final') && !aName.toLowerCase().includes('third')) return 1
  if (bName.toLowerCase().includes('final') && !bName.toLowerCase().includes('third')) return -1
  return 0
}))

// Standings grouped by group
const standingsByGroup = computed(() => {
  const grouped: Record<string, Standing[]> = {}
  standings.value.forEach(s => {
    const group = s.group || 'default'
    if (!grouped[group]) grouped[group] = []
    grouped[group].push(s)
  })
  Object.keys(grouped).forEach(key => {
    grouped[key]!.sort((a, b) => (a.position || 0) - (b.position || 0))
  })
  return grouped
})

// Bracket
const bracketFixtures = computed(() => {
  if (isHybrid.value) return knockoutFixtures.value
  return fixtures.value
})

const bracketData = computed(() => {
  const grouped: Record<number, Fixture[]> = {}
  for (const f of bracketFixtures.value) {
    const r = f.round || 1
    if (!grouped[r]) grouped[r] = []
    grouped[r].push(f)
  }
  
  const sortedRounds = Object.keys(grouped).map(Number).sort((a, b) => a - b)
  
  const isTwoLegsKnockout = tournament.value?.twoLegsKnockout || false
  const hasThirdPlaceMatch = tournament.value?.thirdPlaceMatch || false
  const totalRounds = sortedRounds.length
  
  const matchups: Record<number, any[]> = {}
  
  const getAggregateStatus = (legs: Fixture[]): FixtureStatus => {
    if (legs.some(f => f.status === FixtureStatus.LIVE)) return FixtureStatus.LIVE
    if (legs.every(f => f.status === FixtureStatus.COMPLETED)) return FixtureStatus.COMPLETED
    if (legs.some(f => f.status === FixtureStatus.SCHEDULED)) return FixtureStatus.SCHEDULED
    return FixtureStatus.CANCELLED
  }
  
  sortedRounds.forEach((round, roundIndex) => {
    const isFinalRound = roundIndex === totalRounds - 1
    const roundFixtures = grouped[round] || []
    roundFixtures.sort((a, b) => a.matchNumber - b.matchNumber)
    
    const roundMatchups: any[] = []
    
    if (isTwoLegsKnockout && !isFinalRound) {
      for (let i = 0; i < roundFixtures.length; i += 2) {
        const f1 = roundFixtures[i]!
        const f2 = roundFixtures[i + 1]
        const legs = [f1]
        if (f2) legs.push(f2)
        
        roundMatchups.push({
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
          status: getAggregateStatus(legs),
          roundName: f1.roundName
        })
      }
    } else {
      for (let i = 0; i < roundFixtures.length; i++) {
        const f = roundFixtures[i]!
        const isThirdPlace = isFinalRound && hasThirdPlaceMatch && i === 1
        roundMatchups.push({
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
          roundName: f.roundName
        })
      }
    }
    
    matchups[round] = roundMatchups
  })
  
  return { rounds: sortedRounds, matchups }
})

const bracketRounds = computed(() => bracketData.value.rounds)
const bracketMatchups = computed(() => bracketData.value.matchups)

// Collapsible rounds
const collapsedRounds = ref<Set<string>>(new Set())
function toggleRound(round: string) {
  const s = new Set(collapsedRounds.value)
  if (s.has(round)) s.delete(round)
  else s.add(round)
  collapsedRounds.value = s
}

// Helpers
function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function formatTime(dateStr?: string | null) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}
function formatTime24(dateStr?: string | null) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}
function formatType(type: string) {
  const map: Record<string, string> = {
    KNOCKOUT: 'Knockout', ROUND_ROBIN: 'Round Robin', GROUP: 'Group Stage',
    HYBRID: 'Hybrid', FRIENDLY: 'Friendly'
  }
  return map[type] || type
}
function getTypeBadgeClasses(type: string) {
  switch (type) {
    case 'KNOCKOUT': return 'bg-red-500/20 text-red-400 border-red-500/30'
    case 'ROUND_ROBIN': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    case 'GROUP': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    case 'HYBRID': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    case 'FRIENDLY': return 'bg-green-500/20 text-green-400 border-green-500/30'
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }
}
function getRoundDisplayName(roundIndex: number, totalRounds: number, roundName?: string | null) {
  if (roundName) return roundName
  const remaining = totalRounds - roundIndex
  switch (remaining) {
    case 1: return 'Final'
    case 2: return 'Semi-Final'
    case 3: return 'Quarter-Final'
    case 4: return 'Round of 16'
    default: return `Round ${roundIndex + 1}`
  }
}
function getTeamClass(matchup: any, isHome: boolean, isDark: boolean) {
  if (matchup.status !== FixtureStatus.COMPLETED) return isDark ? 'text-gray-200 group-hover:text-white' : 'text-gray-800 group-hover:text-gray-900'
  const hs = matchup.homeScore ?? 0
  const as = matchup.awayScore ?? 0
  
  let isWinner = false
  let isLoser = false
  
  if (hs === as) {
    const hp = matchup.homePenaltyScore ?? 0
    const ap = matchup.awayPenaltyScore ?? 0
    if (hp === ap) return 'font-medium text-gray-500' // True draw
    isWinner = isHome ? hp > ap : ap > hp
    isLoser = isHome ? hp < ap : ap < hp
  } else {
    isWinner = isHome ? hs > as : as > hs
    isLoser = isHome ? hs < as : as < hs
  }
  
  if (isWinner) return isDark ? 'font-bold text-white' : 'font-bold text-gray-900'
  if (isLoser) return 'font-medium text-gray-500'
  return 'font-medium text-gray-500'
}
function getScoreClass(matchup: any, isHome: boolean, isDark: boolean) {
  if (matchup.status !== FixtureStatus.COMPLETED) return isDark ? 'text-white' : 'text-gray-900'
  const hs = matchup.homeScore ?? 0
  const as = matchup.awayScore ?? 0
  
  let isWinner = false
  
  if (hs === as) {
    const hp = matchup.homePenaltyScore ?? 0
    const ap = matchup.awayPenaltyScore ?? 0
    if (hp !== ap) {
      isWinner = isHome ? hp > ap : ap > hp
    }
  } else {
    isWinner = isHome ? hs > as : as > hs
  }
  
  return isWinner ? (isDark ? 'font-bold text-white' : 'font-bold text-gray-900') : 'font-bold text-gray-500'
}

// Detect completed matches with no clear winner (tied with no decisive penalties)
function hasNoWinner(matchup: any): boolean {
  if (matchup.status !== FixtureStatus.COMPLETED) return false
  const homeScore = matchup.homeScore ?? 0
  const awayScore = matchup.awayScore ?? 0
  if (homeScore !== awayScore) return false
  // Scores are tied — check penalties
  const homePen = matchup.homePenaltyScore ?? 0
  const awayPen = matchup.awayPenaltyScore ?? 0
  return homePen === awayPen
}

function getTeamCards(fixture: any, isHome: boolean) {
  if (!fixture.matchEvents) return { yellow: 0, red: 0 }
  const teamId = isHome ? fixture.homeTeamId : fixture.awayTeamId
  if (!teamId) return { yellow: 0, red: 0 }
  
  let yellow = 0
  let red = 0
  for (const event of fixture.matchEvents) {
    if (event.participant_id === teamId) {
      if (event.type === 'YELLOW_CARD') yellow++
      if (event.type === 'RED_CARD') red++
    }
  }
  return { yellow, red }
}

</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center min-h-[60vh]">
      <div class="flex flex-col items-center gap-4">
        <div class="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <span class="text-sm text-gray-400">Loading tournament...</span>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex items-center justify-center min-h-[60vh]">
      <div class="text-center">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 class="text-lg font-semibold mb-2">Failed to load tournament</h3>
        <p class="text-sm text-gray-400 mb-4">{{ error }}</p>
        <NuxtLink to="/explore" class="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
          ← Back to Explore
        </NuxtLink>
      </div>
    </div>

    <!-- Content -->
    <div v-else-if="tournament">
      <!-- Hero Banner -->
      <section class="relative overflow-hidden">
        <!-- Banner Background -->
        <div class="absolute inset-0 h-64 md:h-80">
          <img
            v-if="tournament.bannerUrl"
            :src="tournament.bannerUrl"
            class="w-full h-full object-cover"
          />
          <div
            v-else
            class="w-full h-full"
            :style="{ background: 'linear-gradient(135deg, #0a1628 0%, #1a3050 40%, #0d1f35 100%)' }"
          ></div>
          <div class="absolute inset-0 bg-gradient-to-b from-[#0A0F1C]/40 via-[#0A0F1C]/70 to-[#0A0F1C]"></div>
        </div>

        <!-- Header Content -->
        <div class="relative max-w-5xl mx-auto px-6 pt-24 md:pt-32 pb-8">
          <!-- Back link -->
          <NuxtLink to="/explore" class="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-emerald-400 transition-colors mb-6">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Explore
          </NuxtLink>

          <div class="flex flex-col items-center text-center">
            <!-- Logo -->
            <div class="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden bg-white/10 backdrop-blur-md border border-white/20 flex-shrink-0 shadow-xl mb-4">
              <img v-if="tournament.logoUrl" :src="tournament.logoUrl" class="w-full h-full object-cover" />
              <span v-else class="flex items-center justify-center w-full h-full text-3xl font-bold text-white/60">
                {{ tournament.name.charAt(0).toUpperCase() }}
              </span>
            </div>

            <div class="max-w-2xl mx-auto flex flex-col items-center">
              <!-- Type Badge -->
              <span :class="['px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded border mb-3 inline-block', getTypeBadgeClasses(tournament.type)]">
                {{ formatType(tournament.type) }}
              </span>

              <!-- Name -->
              <h1 class="text-3xl md:text-5xl font-bold leading-tight mb-4 text-center" :class="isDark ? 'text-white' : 'text-gray-900'">
                {{ tournament.name }}
              </h1>

              <!-- Organizer -->
              <div v-if="tournament.organizer" class="flex items-center gap-2 mb-4 text-gray-400">
                <span class="text-sm">Hosted by</span>
                <img 
                  v-if="tournament.organizer.organization_logo" 
                  :src="tournament.organizer.organization_logo" 
                  class="w-5 h-5 rounded-full object-cover shrink-0" 
                />
                <span class="text-sm font-medium text-gray-200">
                  {{ tournament.organizer.organization_name || tournament.organizer.name }}
                </span>
                <UIcon
                  v-if="tournament.organizer.isVerified"
                  name="i-heroicons-check-badge-solid"
                  class="w-5 h-5 text-blue-400 shrink-0"
                  title="Verified Organizer"
                />
              </div>

              <!-- Live Indicator (Optional, can keep it here if live) -->
              <div v-if="hasLiveFixtures" class="flex items-center gap-1.5 text-red-400 text-sm font-semibold">
                <span class="w-2 h-2 bg-red-400 rounded-full animate-pulse"></span>
                Live Now
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Tabs -->
      <section class="border-b sticky top-0 z-20 backdrop-blur-md transition-colors" :class="isDark ? 'border-white/10 bg-gray-950/95' : 'border-gray-200 bg-gray-50/95'">
        <div class="w-full">
          <nav class="flex gap-1 -mb-px overflow-x-auto hide-scrollbar whitespace-nowrap px-6 md:justify-center md:px-0 max-w-5xl mx-auto">
            <button
              @click="activeTab = 'info'"
              :class="[
                'px-5 py-3.5 text-sm font-medium border-b-2 transition-all duration-200',
                activeTab === 'info'
                  ? 'text-emerald-400 border-emerald-400'
                  : 'text-gray-500 border-transparent hover:text-gray-300 hover:border-white/20'
              ]"
            >
              Info
            </button>
            <button
              @click="activeTab = 'fixtures'"
              :class="[
                'px-5 py-3.5 text-sm font-medium border-b-2 transition-all duration-200',
                activeTab === 'fixtures'
                  ? 'text-emerald-400 border-emerald-400'
                  : 'text-gray-500 border-transparent hover:text-gray-300 hover:border-white/20'
              ]"
            >
              Fixtures
              <span v-if="fixtures.length" class="ml-1.5 text-xs opacity-60">{{ fixtures.length }}</span>
            </button>
            <button
              v-if="standings.length > 0"
              @click="activeTab = 'standings'"
              :class="[
                'px-5 py-3.5 text-sm font-medium border-b-2 transition-all duration-200',
                activeTab === 'standings'
                  ? 'text-emerald-400 border-emerald-400'
                  : 'text-gray-500 border-transparent hover:text-gray-300 hover:border-white/20'
              ]"
            >
              Standings
            </button>
            <button
              v-if="showBracketTab"
              @click="activeTab = 'bracket'"
              :class="[
                'px-5 py-3.5 text-sm font-medium border-b-2 transition-all duration-200',
                activeTab === 'bracket'
                  ? 'text-emerald-400 border-emerald-400'
                  : 'text-gray-500 border-transparent hover:text-gray-300 hover:border-white/20'
              ]"
            >
              Bracket
            </button>
            <button
              v-if="participants.length > 0"
              @click="activeTab = 'participants'"
              :class="[
                'px-5 py-3.5 text-sm font-medium border-b-2 transition-all duration-200',
                activeTab === 'participants'
                  ? 'text-emerald-400 border-emerald-400'
                  : 'text-gray-500 border-transparent hover:text-gray-300 hover:border-white/20'
              ]"
            >
              {{ participantsTabName }}
            </button>
            <button
              v-if="isTeams"
              @click="activeTab = 'stats'"
              :class="[
                'px-5 py-3.5 text-sm font-medium border-b-2 transition-all duration-200',
                activeTab === 'stats'
                  ? 'text-emerald-400 border-emerald-400'
                  : 'text-gray-500 border-transparent hover:text-gray-300 hover:border-white/20'
              ]"
            >
               Player Stats
            </button>
          </nav>
        </div>
      </section>

      <!-- Tab Content -->
      <section class="max-w-5xl mx-auto px-4 py-8 relative min-h-[500px]">
        
        <div v-if="selectedFixtureId" class="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <MarketingFixtureDetails 
            :tournamentId="tournamentId" 
            :fixtureId="selectedFixtureId" 
            @back="selectedFixtureId = null" 
          />
        </div>

        <div v-else-if="selectedParticipantId" class="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <MarketingTeamDetails 
            :tournamentId="tournamentId" 
            :participantId="selectedParticipantId" 
            @back="selectedParticipantId = null" 
          />
        </div>

        <div v-show="!selectedFixtureId && !selectedParticipantId" class="animate-in fade-in duration-300">
          <!-- ====== FIXTURES TAB ====== -->
          <div v-if="activeTab === 'fixtures'">
            
            <!-- Filters & Controls -->
            <div v-if="tournament.twoLegsKnockout && fixtures.length > 0" class="flex justify-end mb-4">
              <div class="flex items-center gap-1.5">
                <UButton
                  size="sm"
                  :color="legFilter === 'ALL' ? 'primary' : 'neutral'"
                  :variant="legFilter === 'ALL' ? 'solid' : 'soft'"
                  label="All"
                  @click="legFilter = 'ALL'"
                />
                <UButton
                  size="sm"
                  :color="legFilter === '1' ? 'primary' : 'neutral'"
                  :variant="legFilter === '1' ? 'solid' : 'soft'"
                  label="Leg 1"
                  @click="legFilter = '1'"
                />
                <UButton
                  size="sm"
                  :color="legFilter === '2' ? 'primary' : 'neutral'"
                  :variant="legFilter === '2' ? 'solid' : 'soft'"
                  label="Leg 2"
                  @click="legFilter = '2'"
                />
              </div>
            </div>

            <div v-if="filteredFixtures.length === 0" class="text-center py-16">
            <p class="text-sm text-gray-500">No fixtures available for this filter.</p>
          </div>
          <div v-else class="space-y-4">
            <!-- Group Stage label for hybrid -->
            <div v-if="isHybrid && groupStageFixtures.length > 0" class="flex items-center gap-2 px-1 mb-1">
              <div class="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
              <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Group Stage</span>
            </div>

            <div v-for="round in sortedRounds" :key="round" :class="isDark ? 'bg-[#1a1a1a] border-white/[0.06]' : 'bg-white shadow-sm border-gray-100'" class="border rounded-xl overflow-hidden transition-colors">
              <!-- Round Header -->
              <button
                @click="toggleRound(round)"
                class="w-full flex items-center justify-between px-5 py-3 cursor-pointer select-none border-b"
                :class="collapsedRounds.has(round) ? 'border-transparent' : (isDark ? 'border-white/[0.06]' : 'border-gray-100')"
              >
                <h3 class="text-[12px] font-semibold uppercase tracking-wide text-gray-400">
                  {{ fixturesByRound[round]?.name }}
                </h3>
                <svg
                  class="w-4 h-4 text-gray-500 transition-transform duration-200"
                  :class="collapsedRounds.has(round) ? '-rotate-90' : 'rotate-0'"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <!-- Fixtures -->
              <div class="round-content" :class="{ collapsed: collapsedRounds.has(round) }">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  <button
                    type="button"
                    @click="selectedFixtureId = fixture.id"
                    v-for="(fixture, i) in fixturesByRound[round]?.fixtures"
                    :key="fixture.id"
                    class="rounded-xl border overflow-hidden transition-all group flex flex-col text-left focus:outline-none focus:ring-2 focus:ring-emerald-500/50 w-full"
                    :class="[isDark ? 'bg-[#1a1a1a] border-white/[0.08] hover:border-emerald-500/50' : 'bg-white border-gray-100 shadow-sm hover:border-emerald-500/30']"
                  >
                    <!-- Header -->
                    <div class="flex items-center justify-between px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider border-b transition-colors" :class="isDark ? 'bg-[#1a1a1a] border-white/[0.06] text-gray-400' : 'bg-gray-50 border-gray-100 text-gray-500'">
                      <span>
                        {{ fixture.group?.name || fixture.roundName || `Group ${round}` }}
                        <template v-if="fixture.venue">
                          <span class="mx-1.5 opacity-50">•</span>
                          {{ fixture.venue }}
                        </template>
                      </span>
                      <div class="flex items-center gap-2">
                        <template v-if="fixture.status === FixtureStatus.LIVE">
                          <span class="text-[9px] font-semibold text-red-500 flex items-center gap-1">
                            <span class="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_4px_rgba(239,68,68,0.5)]"></span>
                            LIVE
                          </span>
                        </template>
                        <template v-else-if="fixture.status === FixtureStatus.COMPLETED">
                          <span>FT</span>
                        </template>
                        <template v-else-if="fixture.status === FixtureStatus.CANCELLED">
                          <span class="text-red-400">CANC</span>
                        </template>
                        <template v-else>
                          <span v-if="fixture.startTime" class="text-gray-500">{{ formatTime24(fixture.startTime) }}</span>
                          <span v-else class="text-gray-500">TBD</span>
                        </template>
                      </div>
                    </div>
                    
                    <!-- Body -->
                    <div class="flex items-center justify-between p-3.5 flex-1 gap-4">
                      <!-- Teams -->
                      <div class="flex flex-col gap-3 min-w-0 flex-1">
                        <!-- Home -->
                        <div class="flex items-center gap-2.5 min-w-0">
                          <div class="w-6 h-6 md:w-7 md:h-7 rounded-full overflow-hidden flex-shrink-0" :class="isDark ? 'bg-white/10' : 'bg-gray-100 ring-1 ring-gray-200'">
                            <img v-if="fixture.homeTeam?.logoUrl" :src="fixture.homeTeam.logoUrl" class="w-full h-full object-cover p-0.5" />
                            <span v-else class="flex items-center justify-center w-full h-full text-[9px] md:text-[10px] font-bold text-gray-500 uppercase">
                              {{ (fixture.homeTeam?.customName || fixture.homeTeamPlaceholder || 'TBD').charAt(0) }}
                            </span>
                          </div>
                          <span class="text-[13px] truncate transition-colors" :class="getTeamClass(fixture, true, isDark)">
                            {{ fixture.homeTeam?.customName || fixture.homeTeamPlaceholder || 'TBD' }}
                          </span>
                          <div v-if="getTeamCards(fixture, true).red > 0" class="w-3 h-4 bg-red-500 rounded-[2px] flex items-center justify-center text-[10px] font-bold text-white shadow-sm shrink-0">
                            {{ getTeamCards(fixture, true).red }}
                          </div>
                          <div v-if="getTeamCards(fixture, true).yellow > 0" class="w-3 h-4 bg-yellow-400 rounded-[2px] flex items-center justify-center text-[10px] font-bold text-black shadow-sm shrink-0">
                            {{ getTeamCards(fixture, true).yellow }}
                          </div>
                          <span v-if="flashingFixtures.get(fixture.id) === 'home'" class="goal-text shrink-0 ml-1">GOAL!!!</span>
                        </div>
                        
                        <!-- Away -->
                        <div class="flex items-center gap-2.5 min-w-0">
                          <div class="w-6 h-6 md:w-7 md:h-7 rounded-full overflow-hidden flex-shrink-0" :class="isDark ? 'bg-white/10' : 'bg-gray-100 ring-1 ring-gray-200'">
                            <img v-if="fixture.awayTeam?.logoUrl" :src="fixture.awayTeam.logoUrl" class="w-full h-full object-cover p-0.5" />
                            <span v-else class="flex items-center justify-center w-full h-full text-[9px] md:text-[10px] font-bold text-gray-500 uppercase">
                              {{ (fixture.awayTeam?.customName || fixture.awayTeamPlaceholder || 'TBD').charAt(0) }}
                            </span>
                          </div>
                          <span class="text-[13px] truncate transition-colors" :class="getTeamClass(fixture, false, isDark)">
                            {{ fixture.awayTeam?.customName || fixture.awayTeamPlaceholder || 'TBD' }}
                          </span>
                          <div v-if="getTeamCards(fixture, false).red > 0" class="w-3 h-4 bg-red-500 rounded-[2px] flex items-center justify-center text-[10px] font-bold text-white shadow-sm shrink-0">
                            {{ getTeamCards(fixture, false).red }}
                          </div>
                          <div v-if="getTeamCards(fixture, false).yellow > 0" class="w-3 h-4 bg-yellow-400 rounded-[2px] flex items-center justify-center text-[10px] font-bold text-black shadow-sm shrink-0">
                            {{ getTeamCards(fixture, false).yellow }}
                          </div>
                          <span v-if="flashingFixtures.get(fixture.id) === 'away'" class="goal-text shrink-0 ml-1">GOAL!!!</span>
                        </div>
                      </div>

                      <!-- Score -->
                      <div class="flex flex-col items-center justify-center pl-4 border-l min-w-[2rem]" :class="isDark ? 'border-white/[0.06]' : 'border-gray-100'">
                        <template v-if="fixture.status === FixtureStatus.LIVE || fixture.status === FixtureStatus.COMPLETED">
                          <div class="flex flex-col items-center gap-3">
                            <span class="text-[14px] leading-none transition-colors" :class="getScoreClass(fixture, true, isDark)">{{ fixture.homeScore ?? 0 }}</span>
                            <span class="text-[14px] leading-none transition-colors" :class="getScoreClass(fixture, false, isDark)">{{ fixture.awayScore ?? 0 }}</span>
                          </div>
                        </template>
                        <template v-else>
                          <div class="flex flex-col items-center gap-3 text-gray-600">
                            <span class="text-[13px] font-bold leading-none">-</span>
                            <span class="text-[13px] font-bold leading-none">-</span>
                          </div>
                        </template>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <!-- Knockout fixtures for hybrid -->
            <template v-if="isHybrid && knockoutFixtures.length > 0">
              <div class="flex items-center gap-2 px-1 mt-3 mb-1">
                <div class="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Knockout Stage</span>
              </div>

              <div v-for="round in knockoutRounds" :key="'ko-' + round" :class="isDark ? 'bg-[#1a1a1a] border-white/[0.06]' : 'bg-white shadow-sm border-gray-100'" class="border rounded-xl overflow-hidden transition-colors">
                <button
                  @click="toggleRound('ko::' + round)"
                  class="w-full flex items-center justify-between px-5 py-3 cursor-pointer select-none border-b"
                  :class="collapsedRounds.has('ko::' + round) ? 'border-transparent' : (isDark ? 'border-white/[0.06]' : 'border-gray-100')"
                >
                  <h3 class="text-[12px] font-semibold uppercase tracking-wide text-gray-400">
                    {{ knockoutByRound[round]?.name }}
                  </h3>
                  <svg
                    class="w-4 h-4 text-gray-500 transition-transform duration-200"
                    :class="collapsedRounds.has('ko::' + round) ? '-rotate-90' : 'rotate-0'"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <div class="round-content" :class="{ collapsed: collapsedRounds.has('ko::' + round) }">
                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                    <button
                      type="button"
                      @click="selectedFixtureId = fixture.id"
                      v-for="(fixture, i) in knockoutByRound[round]?.fixtures"
                      :key="fixture.id"
                      class="rounded-xl border overflow-hidden transition-all group flex flex-col text-left focus:outline-none focus:ring-2 focus:ring-emerald-500/50 w-full"
                      :class="[isDark ? 'bg-[#1a1a1a] border-white/[0.08] hover:border-emerald-500/50' : 'bg-white border-gray-100 shadow-sm hover:border-emerald-500/30']"
                    >
                      <!-- Header -->
                      <div class="flex items-center justify-between px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider border-b transition-colors" :class="isDark ? 'bg-[#1a1a1a] border-white/[0.06] text-gray-400' : 'bg-gray-50 border-gray-100 text-gray-500'">
                        <span>
                          {{ fixture.group?.name || fixture.roundName || knockoutByRound[round]?.name || `Round ${round}` }}
                          <template v-if="fixture.venue">
                            <span class="mx-1.5 opacity-50">•</span>
                            {{ fixture.venue }}
                          </template>
                        </span>
                        <div class="flex items-center gap-2">
                          <template v-if="fixture.status === FixtureStatus.LIVE">
                            <span class="text-[9px] font-semibold text-red-500 flex items-center gap-1">
                              <span class="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_4px_rgba(239,68,68,0.5)]"></span>
                              LIVE
                            </span>
                          </template>
                          <template v-else-if="fixture.status === FixtureStatus.COMPLETED">
                            <span>FT</span>
                          </template>
                          <template v-else-if="fixture.status === FixtureStatus.CANCELLED">
                            <span class="text-red-400">CANC</span>
                          </template>
                          <template v-else>
                            <span v-if="fixture.startTime" class="text-gray-500">{{ formatTime24(fixture.startTime) }}</span>
                            <span v-else class="text-gray-500">TBD</span>
                          </template>
                        </div>
                      </div>
                      
                      <!-- Body -->
                      <div class="flex items-center justify-between p-3.5 flex-1 gap-4">
                        <!-- Teams -->
                        <div class="flex flex-col gap-3 min-w-0 flex-1">
                          <!-- Home -->
                          <div class="flex items-center gap-2.5 min-w-0">
                            <div class="w-6 h-6 md:w-7 md:h-7 rounded-full overflow-hidden flex-shrink-0" :class="isDark ? 'bg-white/10' : 'bg-gray-100 ring-1 ring-gray-200'">
                              <img v-if="fixture.homeTeam?.logoUrl" :src="fixture.homeTeam.logoUrl" class="w-full h-full object-cover p-0.5" />
                              <span v-else class="flex items-center justify-center w-full h-full text-[9px] md:text-[10px] font-bold text-gray-500 uppercase">
                                {{ (fixture.homeTeam?.customName || fixture.homeTeamPlaceholder || 'TBD').charAt(0) }}
                              </span>
                            </div>
                            <span class="text-[13px] truncate transition-colors" :class="getTeamClass(fixture, true, isDark)">
                              {{ fixture.homeTeam?.customName || fixture.homeTeamPlaceholder || 'TBD' }}
                            </span>
                            <span v-if="flashingFixtures.get(fixture.id) === 'home'" class="goal-text shrink-0">GOAL!!!</span>
                          </div>
                          
                          <!-- Away -->
                          <div class="flex items-center gap-2.5 min-w-0">
                            <div class="w-6 h-6 md:w-7 md:h-7 rounded-full overflow-hidden flex-shrink-0" :class="isDark ? 'bg-white/10' : 'bg-gray-100 ring-1 ring-gray-200'">
                              <img v-if="fixture.awayTeam?.logoUrl" :src="fixture.awayTeam.logoUrl" class="w-full h-full object-cover p-0.5" />
                              <span v-else class="flex items-center justify-center w-full h-full text-[9px] md:text-[10px] font-bold text-gray-500 uppercase">
                                {{ (fixture.awayTeam?.customName || fixture.awayTeamPlaceholder || 'TBD').charAt(0) }}
                              </span>
                            </div>
                            <span class="text-[13px] truncate transition-colors" :class="getTeamClass(fixture, false, isDark)">
                              {{ fixture.awayTeam?.customName || fixture.awayTeamPlaceholder || 'TBD' }}
                            </span>
                            <span v-if="flashingFixtures.get(fixture.id) === 'away'" class="goal-text shrink-0">GOAL!!!</span>
                          </div>
                        </div>

                        <!-- Score -->
                        <div class="flex flex-col items-center justify-center pl-4 border-l min-w-[2rem]" :class="isDark ? 'border-white/[0.06]' : 'border-gray-100'">
                          <template v-if="fixture.status === FixtureStatus.LIVE || fixture.status === FixtureStatus.COMPLETED">
                            <div class="flex flex-col items-center gap-3">
                              <span class="text-[14px] leading-none transition-colors" :class="getScoreClass(fixture, true, isDark)">{{ fixture.homeScore ?? 0 }}</span>
                              <span class="text-[14px] leading-none transition-colors" :class="getScoreClass(fixture, false, isDark)">{{ fixture.awayScore ?? 0 }}</span>
                            </div>
                          </template>
                          <template v-else>
                            <div class="flex flex-col items-center gap-3 text-gray-600">
                              <span class="text-[13px] font-bold leading-none">-</span>
                              <span class="text-[13px] font-bold leading-none">-</span>
                            </div>
                          </template>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- ====== STANDINGS TAB ====== -->
        <div v-else-if="activeTab === 'standings'">
          <div v-if="standings.length === 0" class="text-center py-16">
            <p class="text-sm text-gray-500">No standings available yet.</p>
          </div>
          <div v-else class="space-y-6 max-w-4xl mx-auto">
            <div v-for="(groupStandings, groupName) in standingsByGroup" :key="groupName">
              <div class="flex items-center justify-between mb-3 px-1">
                <h4 v-if="groupName !== 'default'" class="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {{ groupName }}
                </h4>
              </div>
              <div :class="isDark ? 'bg-[#1a1a1a] border-white/[0.06]' : 'bg-white shadow-sm border-gray-100'" class="border rounded-xl overflow-x-auto transition-colors">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b transition-colors" :class="isDark ? 'border-white/[0.06]' : 'border-gray-100'">
                      <th class="text-center w-8 md:w-10 min-w-[32px] md:min-w-[40px] px-2 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 sticky left-0 z-20" :class="isDark ? 'bg-[#1a1a1a]' : 'bg-white'">#</th>
                      <th class="text-left w-1/2 px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 sticky left-[32px] md:left-[40px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] md:shadow-none" :class="isDark ? 'bg-[#1a1a1a]' : 'bg-white'">Team</th>
                      <th class="text-center min-w-[44px] md:min-w-[50px] px-2 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">P</th>
                      <th class="text-center min-w-[44px] md:min-w-[50px] px-2 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">W</th>
                      <th class="text-center min-w-[44px] md:min-w-[50px] px-2 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">D</th>
                      <th class="text-center min-w-[44px] md:min-w-[50px] px-2 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">L</th>
                      <th class="text-center min-w-[44px] md:min-w-[50px] px-2 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">GF</th>
                      <th class="text-center min-w-[44px] md:min-w-[50px] px-2 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">GA</th>
                      <th class="text-center min-w-[44px] md:min-w-[50px] px-2 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">GD</th>
                      <th class="text-center min-w-[50px] md:min-w-[56px] px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-emerald-400">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr 
                      v-for="(standing, index) in groupStandings" 
                      :key="standing.id"
                      @click="selectedParticipantId = standing.participant_id"
                      class="border-t transition-colors cursor-pointer" :class="isDark ? 'border-white/[0.04] hover:bg-white/[0.04]' : 'border-gray-100 hover:bg-gray-100'"
                    >
                      <td class="text-center w-8 md:w-10 min-w-[32px] md:min-w-[40px] px-2 py-3 text-[13px] font-bold text-gray-500 sticky left-0 z-10" :class="[isDark ? 'bg-[#1a1a1a]' : 'bg-white']">{{ standing.position || index + 1 }}</td>
                      <td class="text-left w-[170px] md:w-auto min-w-[170px] px-3 py-3 sticky left-[32px] md:left-[40px] z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] md:shadow-none" :class="[isDark ? 'bg-[#1a1a1a]' : 'bg-white']">
                        <div class="flex items-center gap-2 md:gap-2.5">
                          <div class="w-5 h-5 md:w-6 md:h-6 rounded-full bg-white/10 overflow-hidden flex-shrink-0">
                            <img v-if="standing.participant?.logoUrl" :src="standing.participant.logoUrl" class="w-full h-full object-cover" />
                            <span v-else class="flex items-center justify-center w-full h-full text-[8px] md:text-[9px] font-bold text-gray-500">
                              {{ (standing.participant?.customName || 'T').charAt(0) }}
                            </span>
                          </div>
                          <span class="text-[12px] md:text-[13px] font-medium truncate max-w-[120px] sm:max-w-[150px] md:max-w-[200px]" :class="isDark ? 'text-gray-200' : 'text-gray-800'">{{ standing.participant?.customName || 'Unknown' }}</span>
                        </div>
                      </td>
                      <td class="text-center min-w-[44px] md:min-w-[50px] px-2 py-3 text-[12px] md:text-[13px] text-gray-400">{{ standing.played }}</td>
                      <td class="text-center min-w-[44px] md:min-w-[50px] px-2 py-3 text-[12px] md:text-[13px] text-gray-400">{{ standing.wins }}</td>
                      <td class="text-center min-w-[44px] md:min-w-[50px] px-2 py-3 text-[12px] md:text-[13px] text-gray-400">{{ standing.draws }}</td>
                      <td class="text-center min-w-[44px] md:min-w-[50px] px-2 py-3 text-[12px] md:text-[13px] text-gray-400">{{ standing.losses }}</td>
                      <td class="text-center min-w-[44px] md:min-w-[50px] px-2 py-3 text-[12px] md:text-[13px] text-gray-400">{{ standing.goalsFor }}</td>
                      <td class="text-center min-w-[44px] md:min-w-[50px] px-2 py-3 text-[12px] md:text-[13px] text-gray-400">{{ standing.goalsAgainst }}</td>
                      <td class="text-center min-w-[44px] md:min-w-[50px] px-2 py-3 text-[12px] md:text-[13px]" :class="standing.goalDiff > 0 ? 'text-emerald-400' : standing.goalDiff < 0 ? 'text-red-400' : 'text-gray-500'">
                        {{ standing.goalDiff > 0 ? '+' : '' }}{{ standing.goalDiff }}
                      </td>
                      <td class="text-center min-w-[50px] md:min-w-[56px] px-3 py-3 text-[12px] md:text-[13px] font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">{{ standing.points }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- ====== BRACKET TAB ====== -->
        <div v-else-if="activeTab === 'bracket'">
          <div v-if="bracketRounds.length === 0" class="text-center py-16">
            <p class="text-sm text-gray-500">No bracket data available yet.</p>
          </div>
          <div v-else class="overflow-x-auto pb-6">
            <div class="flex gap-8 min-w-max">
              <div v-for="(round, roundIndex) in bracketRounds" :key="round" class="flex flex-col">
                <!-- Round Header -->
                <div class="text-center mb-4">
                  <span class="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    {{ getRoundDisplayName(roundIndex, bracketRounds.length, bracketMatchups[round]?.[0]?.roundName) }}
                  </span>
                </div>

                <!-- Matches -->
                <div 
                  class="flex flex-col justify-around flex-1 gap-4"
                  :style="{ minHeight: `${(bracketMatchups[bracketRounds[0] ?? 0]?.length || 1) * 90}px` }"
                >
                  <div
                    v-for="matchup in bracketMatchups[round]"
                    :key="matchup.id"
                    class="flex flex-col items-center"
                  >
                    <!-- 3rd Place Match Label -->
                    <div v-if="matchup.isThirdPlace" class="text-[0.65rem] font-bold text-gray-400 uppercase tracking-wider text-center mt-6 mb-2">
                      3rd Place Play-off
                    </div>

                    <button
                      type="button"
                      @click="selectedFixtureId = matchup.id"
                      class="w-56 rounded-xl border overflow-hidden hover:border-emerald-500/30 transition-all group text-left focus:outline-none focus:ring-2 focus:ring-emerald-500/50" :class="isDark ? 'bg-gray-900 border-white/[0.08]' : 'bg-white border-gray-200 shadow-sm'"
                    >
                      <!-- Home -->
                      <div 
                        class="flex items-center justify-between px-3.5 py-2.5 border-b transition-colors" 
                        :class="[isDark ? 'border-white/[0.06]' : 'border-gray-100', getTeamClass(matchup, true, isDark)]"
                      >
                        <div class="flex items-center gap-2 flex-1 min-w-0">
                          <div class="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 transition-colors" :class="isDark ? 'bg-white/10' : 'bg-gray-100'">
                            <img v-if="matchup.homeTeam?.logoUrl" :src="matchup.homeTeam.logoUrl" class="w-full h-full object-cover" />
                            <span v-else class="flex items-center justify-center w-full h-full text-[8px] font-bold text-gray-500">
                              {{ (matchup.homeTeam?.customName || 'TBD').charAt(0) }}
                            </span>
                          </div>
                          <span class="text-xs truncate transition-colors" :class="isDark ? 'text-gray-200' : 'text-gray-800'">{{ matchup.homeTeam?.customName || 'TBD' }}</span>
                        </div>
                        <div class="flex items-center gap-1.5 flex-shrink-0">
                          <span v-if="matchup.fixtures.length > 1" class="text-[0.65rem] font-medium opacity-50 whitespace-nowrap">
                            ({{ matchup.fixtures.map((f: any) => f.status === 'COMPLETED' || f.status === 'LIVE' ? (f.homeScore ?? 0) : '-').join(', ') }})
                          </span>
                          <span 
                            class="text-sm font-bold min-w-[1.5rem] text-center inline-flex items-center justify-end"
                            :class="matchup.status === FixtureStatus.COMPLETED || matchup.status === FixtureStatus.LIVE ? 'text-white' : 'text-gray-600'"
                          >
                            <span v-if="matchup.homePenaltyScore !== null && matchup.homePenaltyScore !== undefined" class="text-[0.65rem] font-normal opacity-50 mr-1.5">
                              ({{ matchup.homePenaltyScore }})
                            </span>
                            {{ matchup.status === FixtureStatus.COMPLETED || matchup.status === FixtureStatus.LIVE ? (matchup.homeScore ?? 0) : '-' }}
                          </span>
                        </div>
                      </div>
                      <!-- Away -->
                      <div class="flex items-center justify-between px-3.5 py-2.5" :class="getTeamClass(matchup, false, isDark)">
                        <div class="flex items-center gap-2 flex-1 min-w-0">
                          <div class="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 transition-colors" :class="isDark ? 'bg-white/10' : 'bg-gray-100'">
                            <img v-if="matchup.awayTeam?.logoUrl" :src="matchup.awayTeam.logoUrl" class="w-full h-full object-cover" />
                            <span v-else class="flex items-center justify-center w-full h-full text-[8px] font-bold text-gray-500">
                              {{ (matchup.awayTeam?.customName || 'TBD').charAt(0) }}
                            </span>
                          </div>
                          <span class="text-xs truncate transition-colors" :class="isDark ? 'text-gray-200' : 'text-gray-800'">{{ matchup.awayTeam?.customName || 'TBD' }}</span>
                        </div>
                        <div class="flex items-center gap-1.5 flex-shrink-0">
                          <span v-if="matchup.fixtures.length > 1" class="text-[0.65rem] font-medium opacity-50 whitespace-nowrap">
                            ({{ matchup.fixtures.map((f: any) => f.status === 'COMPLETED' || f.status === 'LIVE' ? (f.awayScore ?? 0) : '-').join(', ') }})
                          </span>
                          <span 
                            class="text-sm font-bold min-w-[1.5rem] text-center inline-flex items-center justify-end"
                            :class="matchup.status === FixtureStatus.COMPLETED || matchup.status === FixtureStatus.LIVE ? 'text-white' : 'text-gray-600'"
                          >
                            <span v-if="matchup.awayPenaltyScore !== null && matchup.awayPenaltyScore !== undefined" class="text-[0.65rem] font-normal opacity-50 mr-1.5">
                              ({{ matchup.awayPenaltyScore }})
                            </span>
                            {{ matchup.status === FixtureStatus.COMPLETED || matchup.status === FixtureStatus.LIVE ? (matchup.awayScore ?? 0) : '-' }}
                          </span>
                        </div>
                      </div>
                      <!-- Status badges (Live / Warning) -->
                      <div v-if="matchup.status === FixtureStatus.LIVE" class="text-center py-1 bg-red-500/10 border-t border-red-500/20">
                        <span class="text-[10px] font-medium text-red-400">● LIVE</span>
                      </div>
                      <div v-else-if="hasNoWinner(matchup)" class="text-center py-1 bg-warning-500/10 border-t border-warning-500/20">
                        <span class="text-[10px] font-medium text-warning-500 flex items-center justify-center gap-1">
                          <UIcon name="i-heroicons-exclamation-triangle" class="w-3 h-3 animate-pulse" />
                          NO WINNER
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ====== PARTICIPANTS TAB ====== -->
        <div v-else-if="activeTab === 'participants'">
          <div v-if="participants.length === 0" class="text-center py-16">
            <p class="text-sm text-gray-500">No {{ participantsTabName.toLowerCase() }} available yet.</p>
          </div>
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              v-for="participant in participants"
              :key="participant.id"
              type="button"
              @click="selectedParticipantId = participant.id"
              :class="isDark ? 'bg-[#1a1a1a] border-white/[0.06] hover:bg-white/[0.02]' : 'bg-white shadow-sm border-gray-100 hover:bg-gray-50'"
              class="border rounded-xl p-4 flex flex-col gap-4 transition-colors hover:border-emerald-500/30 group text-left focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 transition-colors" :class="isDark ? 'bg-white/10' : 'bg-gray-100'">
                  <img v-if="participant.logoUrl" :src="participant.logoUrl" class="w-full h-full object-cover" />
                  <span v-else class="flex items-center justify-center w-full h-full text-lg font-bold text-gray-500">
                    {{ (participant.customName || 'P').charAt(0).toUpperCase() }}
                  </span>
                </div>
                <div class="flex-1 min-w-0">
                  <h4 class="text-base font-semibold truncate transition-colors" :class="isDark ? 'text-gray-200 group-hover:text-white' : 'text-gray-800 group-hover:text-gray-900'">
                    {{ participant.customName || 'Unknown' }}
                  </h4>
                </div>
              </div>
            </button>
          </div>
        </div>

        <!-- ====== STATS TAB ====== -->
        <div v-else-if="activeTab === 'stats'">
          <div class="max-w-4xl mx-auto">
            <MarketingPlayerStatsLeaderboard :stats="playerStats" :loading="playerStatsLoading" />
          </div>
        </div>

        <!-- ====== INFO TAB ====== -->
        <div v-else-if="activeTab === 'info'" class="">
          <div class="flex flex-col gap-6">


            <!-- About Section (First) -->
            <div v-if="tournament.description || (socials && socials.length > 0)" :class="isDark ? 'bg-[#1a1a1a] border-white/[0.06]' : 'bg-white border-gray-200 shadow-sm'" class="border rounded-xl overflow-hidden">
              <div class="px-5 py-3.5 border-b transition-colors flex items-center justify-between" :class="isDark ? 'border-white/[0.06]' : 'border-gray-100'">
                <h3 class="text-[12px] font-semibold uppercase tracking-wider text-gray-400">About</h3>
                
                <!-- Socials in Header -->
                <div v-if="socials && socials.length > 0" class="flex items-center gap-3">
                  <a
                    v-for="social in socials"
                    :key="social.id"
                    :href="social.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-gray-400 hover:text-emerald-400 transition-colors tooltip"
                    :title="social.handle || social.platform"
                  >
                    <SocialsTwitterIcon v-if="social.platform === 'twitter'" class="w-4 h-4" />
                    <SocialsInstagramIcon v-else-if="social.platform === 'instagram'" class="w-4 h-4" />
                    <SocialsWebIcon v-else-if="social.platform === 'website'" class="w-4 h-4" />
                    <UIcon v-else-if="social.platform === 'facebook'" name="i-simple-icons-facebook" class="w-4 h-4" />
                    <UIcon v-else-if="social.platform === 'youtube'" name="i-simple-icons-youtube" class="w-4 h-4" />
                    <UIcon v-else-if="social.platform === 'tiktok'" name="i-simple-icons-tiktok" class="w-4 h-4" />
                    <UIcon v-else-if="social.platform === 'discord'" name="i-simple-icons-discord" class="w-4 h-4" />
                    <UIcon v-else-if="social.platform === 'twitch'" name="i-simple-icons-twitch" class="w-4 h-4" />
                    <UIcon v-else name="i-heroicons-globe-alt" class="w-4 h-4" />
                  </a>
                </div>
              </div>
              <div v-if="tournament.description" class="p-5">
                <p class="text-sm leading-relaxed whitespace-pre-line" :class="isDark ? 'text-gray-300' : 'text-gray-600'">
                  {{ tournament.description }}
                </p>
              </div>
            </div>

            <div v-if="sponsors && sponsors.length > 0" :class="isDark ? 'bg-[#1a1a1a] border-white/[0.06]' : 'bg-white border-gray-200 shadow-sm'" class="border rounded-xl overflow-hidden mt-6">
              <div class="px-5 py-3.5 border-b transition-colors flex items-center gap-2" :class="isDark ? 'border-white/[0.06]' : 'border-gray-100'">
                <UIcon name="i-heroicons-building-office-2" class="w-4 h-4 text-gray-400" />
                <h3 class="text-[12px] font-semibold uppercase tracking-wider text-gray-400">Sponsors</h3>
              </div>
              <div class="p-8 flex flex-wrap justify-center items-center gap-8 sm:gap-12 md:gap-16">
                <template v-for="sponsor in sponsors" :key="sponsor.id">
                  <component
                    :is="sponsor.websiteUrl ? 'a' : 'div'"
                    :href="sponsor.websiteUrl || undefined"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="group flex flex-col items-center justify-center transition-transform duration-300"
                    :class="[sponsor.websiteUrl ? 'cursor-pointer hover:scale-105' : '']"
                  >
                    <div class="h-16 sm:h-20 lg:h-24 max-w-[160px] sm:max-w-[200px] flex items-center justify-center mb-0">
                      <img v-if="sponsor.logoUrl" :src="sponsor.logoUrl" :alt="sponsor.name" class="w-full h-full object-contain filter " :class="isDark ? 'brightness-90 group-hover:brightness-100 transition-all' : ''" />
                      <span v-else class="text-xl font-bold text-gray-400">{{ sponsor.name }}</span>
                    </div>
                  </component>
                </template>
              </div>
            </div>

            <!-- Tournament Info (Last) -->
            <div :class="isDark ? 'bg-[#1a1a1a] border-white/[0.06]' : 'bg-white border-gray-200 shadow-sm'" class="border rounded-xl overflow-hidden mt-6">
              <div class="px-5 py-3.5 border-b transition-colors" :class="isDark ? 'border-white/[0.06]' : 'border-gray-100'">
                <h3 class="text-[12px] font-semibold uppercase tracking-wider text-gray-400">Tournament Info</h3>
              </div>
              <div class="divide-y transition-colors" :class="isDark ? 'divide-white/[0.04]' : 'divide-gray-100'">
                <div class="flex items-center justify-between px-5 py-3">
                  <span class="text-sm text-gray-500">Dates</span>
                  <span class="text-sm transition-colors" :class="isDark ? 'text-gray-200' : 'text-gray-800'">{{ formatDate(tournament.start_date) }} — {{ formatDate(tournament.end_date) }}</span>
                </div>
                <div class="flex items-center justify-between px-5 py-3">
                  <span class="text-sm text-gray-500">Sport</span>
                  <span class="text-sm transition-colors capitalize" :class="isDark ? 'text-gray-200' : 'text-gray-800'">{{ tournament.sport }}</span>
                </div>
                <div class="flex items-center justify-between px-5 py-3">
                  <span class="text-sm text-gray-500">Type</span>
                  <span class="text-sm transition-colors" :class="isDark ? 'text-gray-200' : 'text-gray-800'">{{ formatType(tournament.type) }}</span>
                </div>
                <div v-if="tournament.location" class="flex items-center justify-between px-5 py-3">
                  <span class="text-sm text-gray-500">Location</span>
                  <span class="text-sm transition-colors" :class="isDark ? 'text-gray-200' : 'text-gray-800'">{{ tournament.location }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.fixture-row {
  transition: background-color 0.15s ease;
}
.fixture-row:hover {
  background-color: rgba(128, 128, 128, 0.06);
}
.round-content {
  max-height: 3000px;
  overflow: hidden;
  transition: max-height 0.35s ease, opacity 0.25s ease;
  opacity: 1;
}
.round-content.collapsed {
  max-height: 0;
  opacity: 0;
}

/* Goal Text Animation */
.goal-text {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: #ef4444;
  text-shadow: 0 0 6px rgba(239, 68, 68, 0.5);
  animation: goalTextPulse 1s ease-in-out infinite;
}
@keyframes goalTextPulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}
</style>
