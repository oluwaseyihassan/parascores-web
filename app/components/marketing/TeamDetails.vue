<script setup lang="ts">
import type { Tournament, Participant, Fixture, Standing } from '~/types'

const { toMain, isManage } = useHost()

const props = defineProps<{
  tournamentId: string
  participantId: string
}>()

defineEmits(['back'])
const colorMode = useColorMode()
const widgetIsDark = inject<Ref<boolean> | null>('widgetIsDark', null)
const isDark = computed(() => widgetIsDark?.value ?? colorMode.value === 'dark')

const tournament = ref<Tournament | null>(null)
const participant = ref<Participant | null>(null)
const participantFixtures = ref<Fixture[]>([])
const standings = ref<Standing[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const activeTab = ref<'squad' | 'matches' | 'standings'>('squad')

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    const [tournamentRes, participantRes, fixturesRes, standingsRes] = await Promise.all([
      $publicApi<any>(`/tournaments/${props.tournamentId}`),
      $publicApi<any>(`/participants/${props.participantId}`),
      $publicApi<any>(`/fixtures/tournaments/${props.tournamentId}`).catch(() => null),
      $publicApi<any>(`/standings/tournament/${props.tournamentId}`).catch(() => null)
    ])
    
    tournament.value = tournamentRes?.data || tournamentRes
    participant.value = participantRes?.data || participantRes
    
    if (!participant.value) {
      error.value = 'Team not found'
    } else {
      // Filter fixtures for this team
      const allFixtures = fixturesRes?.data || fixturesRes || []
      if (Array.isArray(allFixtures)) {
        participantFixtures.value = allFixtures.filter(
          (f: Fixture) => f.homeTeamId === props.participantId || f.awayTeamId === props.participantId
        ).sort((a, b) => {
          if (!a.startTime) return 1
          if (!b.startTime) return -1
          return new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        })
      }

      // Parse standings
      const rawStandings = standingsRes?.data || standingsRes || []
      standings.value = Array.isArray(rawStandings) ? rawStandings : (rawStandings.standings || [])
    }
  } catch (e: any) {
    error.value = e.message || 'Failed to load team details'
    console.error('Team detail error:', e)
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

// Realtime Updates
useLiveStream()

if (typeof window !== 'undefined') {
  window.addEventListener('live-match-update', (e: Event) => {
    const customEvent = e as CustomEvent
    const { type, data } = customEvent.detail

    if (type === 'fixture_updated') {
      const targetIdx = participantFixtures.value.findIndex((f) => f.id === data.id)
      if (targetIdx !== -1) {
        participantFixtures.value[targetIdx] = { ...participantFixtures.value[targetIdx], ...data }
      }
    }
  })
}

// SEO
watchEffect(() => {
  if (participant.value && tournament.value) {
    const teamName = participant.value.customName || 'Team'
    useSeoMeta({
      title: `${teamName} — ${tournament.value.name} | ParaScores`,
      description: `View ${teamName}'s squad and matches in ${tournament.value.name}.`,
    })
  }
})

// Standings helpers — only show the group the current team is in
const teamGroup = computed(() => {
  const teamStanding = standings.value.find(s => s.participant_id === props.participantId)
  return teamStanding?.group || 'default'
})

const standingsByGroup = computed(() => {
  const group = teamGroup.value
  const groupStandings = standings.value
    .filter(s => (s.group || 'default') === group)
    .sort((a, b) => (a.position || 999) - (b.position || 999))
  return { [group]: groupStandings }
})

const hasStandings = computed(() => standings.value.length > 0)

const squadPlayers = computed(() => {
  return participant.value?.players?.filter(p => p.status === 'APPROVED' || p.status === 'PENDING') || []
})

// Helpers
function formatTime(dateStr?: string | null) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}
function formatFullDate(dateStr?: string | null) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
function getScoreBadgeClass(match: Fixture) {
  if (match.status !== 'COMPLETED' && match.status !== 'LIVE' && match.status !== 'EXTRATIME') return 'bg-white/5 text-white'
  
  const isHome = match.homeTeamId === props.participantId
  const isAway = match.awayTeamId === props.participantId
  
  if (!isHome && !isAway) return 'bg-white/5 text-white'
  
  const myScore = isHome ? (match.homeScore ?? 0) : (match.awayScore ?? 0)
  const oppScore = isHome ? (match.awayScore ?? 0) : (match.homeScore ?? 0)
  
  if (myScore > oppScore) return 'bg-emerald-600 text-white'
  if (myScore < oppScore) return 'bg-red-500 text-white'
  return 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
}

function getRoundName(match: Fixture) {
  const name = match.roundName || `Round ${match.round}`
  const legMatch = name.match(/Leg\s*(\d+)/i)
  if (legMatch) {
    const baseName = name.replace(/\s*([-–—]\s*)?Leg\s*\d+\s*$/i, '').trim()
    return `${baseName} (Leg ${legMatch[1]})`
  }
  return name
}

function getMatchAggregate(match: Fixture) {
  const isLive = match.status === 'LIVE' || match.status === 'NORMAL_TIME_ENDED' || match.status === 'EXTRATIME'
  if (match.status !== 'COMPLETED' && !isLive) return null
  if (!match.roundName || !/leg\s*2/i.test(match.roundName)) return null

  // Find Leg 1
  const leg1 = participantFixtures.value.find(f => 
    f.id !== match.id &&
    f.round === match.round &&
    /leg\s*1/i.test(f.roundName || '') &&
    ((f.homeTeamId === match.homeTeamId && f.awayTeamId === match.awayTeamId) ||
     (f.homeTeamId === match.awayTeamId && f.awayTeamId === match.homeTeamId))
  )

  const leg1IsLive = leg1 && (leg1.status === 'LIVE' || leg1.status === 'NORMAL_TIME_ENDED' || leg1.status === 'EXTRATIME')
  if (leg1 && (leg1.status === 'COMPLETED' || leg1IsLive)) {
    const leg1HomeScore = leg1.homeTeamId === match.homeTeamId ? (leg1.homeScore ?? 0) : (leg1.awayScore ?? 0)
    const leg1AwayScore = leg1.awayTeamId === match.awayTeamId ? (leg1.awayScore ?? 0) : (leg1.homeScore ?? 0)
    
    const aggHome = (match.homeScore ?? 0) + leg1HomeScore
    const aggAway = (match.awayScore ?? 0) + leg1AwayScore
    
    return `${aggHome} - ${aggAway} agg`
  }
  return null
}
</script>

<template>
  <div class="max-w-5xl mx-auto py-6 sm:py-8 px-4 sm:px-6 min-h-screen">
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center min-h-[60vh]">
      <div class="flex flex-col items-center gap-4">
        <div class="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <span class="text-sm font-medium text-black dark:text-gray-400">Loading team...</span>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex items-center justify-center min-h-[60vh]">
      <div class="text-center">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 class="text-lg font-bold mb-2 text-black dark:text-white">Team not found</h3>
        <p class="text-sm text-black dark:text-gray-400 mb-4">{{ error }}</p>
        <button @click="$emit('back')" class="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline transition-colors cursor-pointer">
          ← Back
        </button>
      </div>
    </div>

    <!-- Content -->
    <div v-else-if="participant && tournament">
      <!-- Team Header -->
      <section class="relative overflow-hidden transition-colors">
        <div>
          <!-- Header Top: Back button & Tournament pill -->
          <div class="flex items-center justify-between gap-3 mb-6">
            <button
              @click="$emit('back')"
              class="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-black dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer group"
            >
              <svg class="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back</span>
            </button>

            <!-- Tournament pill / link -->
            <NuxtLink
              v-if="tournament"
              :to="toMain(`/t/${tournament.customName || tournament.id}`)"
              :external="isManage"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-black dark:text-white bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 transition-colors shrink-0"
            >
              <img v-if="tournament.logoUrl" :src="tournament.logoUrl" :alt="tournament.name" class="w-4 h-4 rounded-full object-cover" />
              <UIcon v-else name="i-heroicons-trophy" class="w-3.5 h-3.5 text-emerald-500" />
              <span class="truncate max-w-[150px] sm:max-w-[200px]">{{ tournament.name }}</span>
            </NuxtLink>
          </div>

          <!-- Header info -->
          <div class="pb-6 flex flex-col items-center">
            <div class="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden mb-3 flex items-center justify-center ring-1 bg-gray-100 ring-gray-200 dark:bg-white/5 dark:ring-white/10 shadow-sm">
              <img v-if="participant.logoUrl" :src="participant.logoUrl" class="w-full h-full object-cover p-2" />
              <span v-else class="text-3xl font-bold text-black dark:text-gray-400">
                {{ (participant.customShortName || participant.customName || 'T').charAt(0).toUpperCase() }}
              </span>
            </div>
            <h1 class="text-2xl md:text-3xl font-extrabold transition-colors text-center text-black dark:text-white tracking-tight">
              {{ participant.customShortName || participant.customName || 'Unnamed Team' }}
            </h1>

            <div v-if="participant.team_id || participant.team?.id" class="mt-4 animate-in fade-in slide-in-from-top-1 duration-500 delay-200">
               <UButton 
                 :to="`/team/${participant.team_id || participant.team?.id}`" 
                 size="sm" 
                 variant="soft" 
                 color="neutral"
                 icon="i-heroicons-clock"
                 class="rounded-full px-5 font-bold shadow-sm hover:scale-105 active:scale-95 transition-all text-black dark:text-white"
               >
                 View Team Profile & History
               </UButton>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="mt-4 border-b border-gray-200 dark:border-white/[0.08]">
          <nav class="flex gap-8 justify-center sm:justify-start">
            <button
              @click="activeTab = 'squad'"
              class="pb-3 text-sm transition-colors duration-200 cursor-pointer relative"
              :class="activeTab === 'squad' ? 'font-bold text-black dark:text-white' : 'font-semibold text-black/70 hover:text-black dark:text-gray-400 dark:hover:text-gray-300'"
            >
              <span>Squad</span>
              <span v-if="activeTab === 'squad'" class="absolute bottom-0 left-0 right-0 h-[2.5px] bg-emerald-500 dark:bg-[#00e676] rounded-full"></span>
            </button>
            <button
              @click="activeTab = 'matches'"
              class="pb-3 text-sm transition-colors duration-200 cursor-pointer relative"
              :class="activeTab === 'matches' ? 'font-bold text-black dark:text-white' : 'font-semibold text-black/70 hover:text-black dark:text-gray-400 dark:hover:text-gray-300'"
            >
              <span>Matches</span>
              <span v-if="activeTab === 'matches'" class="absolute bottom-0 left-0 right-0 h-[2.5px] bg-emerald-500 dark:bg-[#00e676] rounded-full"></span>
            </button>
            <button
              v-if="hasStandings"
              @click="activeTab = 'standings'"
              class="pb-3 text-sm transition-colors duration-200 cursor-pointer relative"
              :class="activeTab === 'standings' ? 'font-bold text-black dark:text-white' : 'font-semibold text-black/70 hover:text-black dark:text-gray-400 dark:hover:text-gray-300'"
            >
              <span>Standings</span>
              <span v-if="activeTab === 'standings'" class="absolute bottom-0 left-0 right-0 h-[2.5px] bg-emerald-500 dark:bg-[#00e676] rounded-full"></span>
            </button>
          </nav>
        </div>
      </section>

      <!-- Details Content -->
      <section class="py-8">
        <!-- Squad Tab -->
        <div v-show="activeTab === 'squad'">
          <div :class="isDark ? 'bg-[#1a1a1a] border-white/[0.06]' : 'bg-white border-gray-200 shadow-sm'" class="border rounded-xl px-5 py-4">
            <h3 class="text-sm font-bold text-black dark:text-white mb-4 border-b pb-3" :class="isDark ? 'border-white/[0.06]' : 'border-gray-200'">Players</h3>
            
            <div v-if="squadPlayers.length === 0" class="py-12 text-center text-black dark:text-gray-400 text-sm font-medium">
              No players listed for this team.
            </div>
            
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <NuxtLink v-for="player in squadPlayers" :key="player.id" 
                   :to="toMain(`/player/${player.id}`)"
                   :external="isManage"
                   class="flex items-center gap-3 p-3 rounded-lg transition-colors border bg-gray-50 border-gray-200 dark:bg-white/5 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/[0.08] cursor-pointer group">
                <!-- Player Avatar Wrapper -->
                <div class="relative w-10 h-10 flex-shrink-0">
                  <!-- Cropped Avatar Container -->
                  <div class="w-full h-full rounded-full overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                    <img v-if="player.avatarUrl" :src="player.avatarUrl" class="w-full h-full object-cover" />
                    <span v-else class="text-sm font-bold text-black dark:text-gray-400 uppercase">
                      {{ player.name.charAt(0) }}
                    </span>
                  </div>
                  
                  <!-- Small Shirt Number Overlay -->
                  <span v-if="player.number" class="absolute -bottom-0.5 -right-0.5 bg-emerald-500 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white dark:border-[#1a1a1a] shadow-sm">
                    {{ player.number }}
                  </span>
                </div>
                <div class="flex flex-col overflow-hidden">
                  <div class="flex items-center gap-1.5 min-w-0">
                    <span class="text-sm font-bold truncate transition-colors text-black dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400">{{ player.name }}</span>
                    <UIcon
                      v-if="player.userId && player.status === 'APPROVED'"
                      name="i-heroicons-check-badge-solid"
                      class="w-3.5 h-3.5 text-blue-500 shrink-0"
                      title="Claimed & Verified Player"
                    />
                  </div>
                  <span class="text-[11px] font-semibold uppercase tracking-widest text-black/80 dark:text-gray-400">{{ player.position ? player.position.split('-')[0] : 'Unknown' }}</span>
                </div>
              </NuxtLink>
            </div>
          </div>
        </div>

        <!-- Matches Tab -->
        <div v-show="activeTab === 'matches'">
          <div :class="isDark ? 'bg-[#1a1a1a] border-white/[0.06]' : 'bg-white border-gray-200 shadow-sm'" class="border rounded-xl overflow-hidden">
            <div class="px-5 py-3.5 border-b" :class="isDark ? 'border-white/[0.06]' : 'border-gray-200'">
               <h3 class="text-sm font-bold text-black dark:text-white">Team Matches</h3>
            </div>
            
            <div v-if="participantFixtures.length === 0" class="py-12 text-center text-black dark:text-gray-400 text-sm font-medium">
              No matches found for this team.
            </div>
            
            <div v-else class="divide-y" :class="isDark ? 'divide-white/[0.04]' : 'divide-gray-200'">
              <NuxtLink v-for="match in participantFixtures" :key="match.id" :to="toMain(`/t/${tournament.customName || tournament.id}/fixture/${match.id}`)"
                   :external="isManage"
                  class="block p-4 md:p-5 transition-colors group"
                  :class="isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50'">
                
                <!-- Mobile: Date above match row -->
                <div class="sm:hidden flex items-center gap-2 mb-2.5">
                  <span class="text-[11px] uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400">{{ formatFullDate(match.startTime) }}</span>
                  <span class="text-[11px] text-black/40 dark:text-gray-600">·</span>
                  <span class="text-[11px] font-semibold text-black dark:text-gray-300">{{ formatTime(match.startTime) }}</span>
                  <span class="text-[11px] text-black/40 dark:text-gray-600">·</span>
                  <span class="text-[10px] font-bold text-black dark:text-gray-400 uppercase">{{ getRoundName(match) }}</span>
                  <span v-if="match.status === 'LIVE' || match.status === 'NORMAL_TIME_ENDED' || match.status === 'EXTRATIME'" class="ml-auto text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest animate-pulse">Live</span>
                </div>

                <div class="flex items-center gap-2 sm:gap-4">
                  <!-- Desktop: Date column -->
                  <div class="hidden sm:flex flex-col items-center justify-center text-center w-24 flex-shrink-0">
                     <span class="text-[11px] uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400">{{ formatFullDate(match.startTime) }}</span>
                     <span class="text-[13px] font-semibold text-black dark:text-gray-300">{{ formatTime(match.startTime) }}</span>
                     <span class="text-[10px] font-bold text-black dark:text-gray-400 uppercase tracking-tight mt-0.5">{{ getRoundName(match) }}</span>
                     <span v-if="match.status === 'LIVE' || match.status === 'NORMAL_TIME_ENDED' || match.status === 'EXTRATIME'" class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest animate-pulse">Live</span>
                  </div>
                  
                  <!-- Home -->
                  <div class="flex-1 flex justify-end items-center gap-1.5 sm:gap-3 min-w-0">
                    <span class="text-xs sm:text-sm font-semibold transition-colors truncate" :class="match.homeTeamId === participant?.id ? 'text-black dark:text-white font-bold' : 'text-black dark:text-neutral-400 font-medium'">
                      {{ match.homeTeam?.customShortName || match.homeTeam?.customName || match.homeTeamPlaceholder || 'Home' }}
                    </span>
                    <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center border bg-gray-100 border-gray-200 dark:bg-white/5 dark:border-white/5">
                      <img v-if="match.homeTeam?.logoUrl" :src="match.homeTeam.logoUrl" class="w-full h-full object-cover p-0.5" />
                      <span v-else class="text-[10px] text-black dark:text-gray-400 font-bold">{{ (match.homeTeam?.customShortName || match.homeTeam?.customName || 'H').charAt(0) }}</span>
                    </div>
                  </div>
                  
                  <!-- Score -->
                  <div class="flex-shrink-0 w-14 sm:w-20 text-center flex flex-col items-center justify-center">
                    <template v-if="match.status === 'COMPLETED' || match.status === 'LIVE' || match.status === 'NORMAL_TIME_ENDED' || match.status === 'EXTRATIME'">
                      <div class="inline-flex px-1.5 sm:px-2 py-1 rounded min-w-[42px] sm:min-w-[50px] justify-center text-xs sm:text-sm font-bold tracking-wider whitespace-nowrap" :class="getScoreBadgeClass(match)">
                         {{ match.homeScore ?? 0 }} - {{ match.awayScore ?? 0 }}
                      </div>
                      <div v-if="match.homePenaltyScore != null && match.awayPenaltyScore != null" class="text-[10px] sm:text-[11px] font-bold text-black dark:text-gray-400 mt-1 uppercase tracking-wider">
                        ({{ match.homePenaltyScore }}-{{ match.awayPenaltyScore }} p)
                      </div>
                      <div v-if="getMatchAggregate(match)" class="text-[9px] sm:text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 uppercase tracking-wider">
                        {{ getMatchAggregate(match) }}
                      </div>
                    </template>
                    <template v-else-if="match.status === 'CANCELLED'">
                      <span class="text-[10px] sm:text-xs text-red-500 font-bold">CANC</span>
                    </template>
                    <template v-else>
                      <span class="text-black dark:text-gray-400 text-xs sm:text-sm font-bold">- : -</span>
                    </template>
                  </div>
                  
                  <!-- Away -->
                  <div class="flex-1 flex justify-start items-center gap-1.5 sm:gap-3 min-w-0">
                    <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center border bg-gray-100 border-gray-200 dark:bg-white/5 dark:border-white/5">
                      <img v-if="match.awayTeam?.logoUrl" :src="match.awayTeam.logoUrl" class="w-full h-full object-cover p-0.5" />
                      <span v-else class="text-[10px] text-black dark:text-gray-400 font-bold">{{ (match.awayTeam?.customShortName || match.awayTeam?.customName || 'A').charAt(0) }}</span>
                    </div>
                    <span class="text-xs sm:text-sm font-semibold transition-colors truncate" :class="match.awayTeamId === participant?.id ? 'text-black dark:text-white font-bold' : 'text-black dark:text-neutral-400 font-medium'">
                      {{ match.awayTeam?.customShortName || match.awayTeam?.customName || match.awayTeamPlaceholder || 'Away' }}
                    </span>
                  </div>
                </div>
              </NuxtLink>
            </div>
          </div>
        </div>

        <!-- Standings Tab -->
        <div v-show="activeTab === 'standings'">
          <div v-for="(groupStandings, groupName) in standingsByGroup" :key="groupName" class="mb-6 last:mb-0">
            <div :class="isDark ? 'bg-[#1a1a1a] border-white/[0.06]' : 'bg-white border-gray-200 shadow-sm'" class="border rounded-xl overflow-hidden">
              <!-- Group Header -->
              <div class="px-5 py-3.5 border-b" :class="isDark ? 'border-white/[0.06]' : 'border-gray-200'">
                <h3 class="text-sm font-bold text-black dark:text-white">
                  Standings{{ groupName !== 'default' ? ` · ${groupName}` : '' }}
                </h3>
              </div>

              <!-- Table -->
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr :class="isDark ? 'border-white/[0.06]' : 'border-gray-200'" class="border-b bg-gray-50/50 dark:bg-white/[0.02]">
                      <th class="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-black dark:text-gray-400 w-8">#</th>
                      <th class="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-black dark:text-gray-400">Team</th>
                      <th class="text-center px-2 py-3 text-[11px] font-bold uppercase tracking-wider text-black dark:text-gray-400 hidden sm:table-cell">P</th>
                      <th class="text-center px-2 py-3 text-[11px] font-bold uppercase tracking-wider text-black dark:text-gray-400 hidden sm:table-cell">W</th>
                      <th class="text-center px-2 py-3 text-[11px] font-bold uppercase tracking-wider text-black dark:text-gray-400 hidden sm:table-cell">D</th>
                      <th class="text-center px-2 py-3 text-[11px] font-bold uppercase tracking-wider text-black dark:text-gray-400 hidden sm:table-cell">L</th>
                      <th class="text-center px-2 py-3 text-[11px] font-bold uppercase tracking-wider text-black dark:text-gray-400 hidden md:table-cell">GF</th>
                      <th class="text-center px-2 py-3 text-[11px] font-bold uppercase tracking-wider text-black dark:text-gray-400 hidden md:table-cell">GA</th>
                      <th class="text-center px-2 py-3 text-[11px] font-bold uppercase tracking-wider text-black dark:text-gray-400">GD</th>
                      <th class="text-center px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-black dark:text-gray-400">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(row, index) in groupStandings"
                      :key="row.id"
                      class="transition-colors border-b last:border-b-0 border-gray-100 dark:border-white/[0.03]"
                      :class="[
                        row.participant_id === participantId
                          ? 'bg-emerald-50 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/10 dark:ring-emerald-500/20'
                          : (index % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-gray-50/50 dark:bg-white/[0.02]')
                      ]"
                    >
                      <td class="px-4 py-3 text-center font-bold text-black dark:text-gray-400 text-xs">{{ row.position || index + 1 }}</td>
                      <td class="px-4 py-3">
                        <div class="flex items-center gap-2.5">
                          <div class="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center border bg-gray-100 border-gray-200 dark:bg-white/5 dark:border-white/10">
                            <img v-if="row.participant?.logoUrl" :src="row.participant.logoUrl" class="w-full h-full object-cover" />
                            <span v-else class="text-[9px] font-bold text-black dark:text-gray-400">{{ (row.participant?.customShortName || row.participant?.customName || '?').charAt(0) }}</span>
                          </div>
                          <span
                            class="font-semibold text-sm truncate max-w-[140px]"
                            :class="[
                              row.participant_id === participantId
                                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                                : 'text-black dark:text-gray-200'
                            ]"
                          >
                            {{ row.participant?.customShortName || row.participant?.customName || 'Unknown' }}
                          </span>
                        </div>
                      </td>
                       <td class="text-center px-2 py-3 hidden sm:table-cell text-black dark:text-gray-400 font-medium">{{ row.played }}</td>
                      <td class="text-center px-2 py-3 hidden sm:table-cell text-black dark:text-gray-400 font-medium">{{ row.wins }}</td>
                      <td class="text-center px-2 py-3 hidden sm:table-cell text-black dark:text-gray-400 font-medium">{{ row.draws }}</td>
                      <td class="text-center px-2 py-3 hidden sm:table-cell text-black dark:text-gray-400 font-medium">{{ row.losses }}</td>
                      <td class="text-center px-2 py-3 hidden md:table-cell text-black dark:text-gray-400 font-medium">{{ row.goalsFor }}</td>
                      <td class="text-center px-2 py-3 hidden md:table-cell text-black dark:text-gray-400 font-medium">{{ row.goalsAgainst }}</td>
                      <td class="text-center px-2 py-3 font-semibold" :class="row.goalDiff > 0 ? 'text-emerald-600 dark:text-emerald-400' : row.goalDiff < 0 ? 'text-red-500' : 'text-black dark:text-gray-500'">
                        {{ row.goalDiff > 0 ? '+' : '' }}{{ row.goalDiff }}
                      </td>
                       <td class="text-center px-4 py-3 font-bold text-black dark:text-white">{{ row.points }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

      </section>
    </div>
  </div>
</template>
