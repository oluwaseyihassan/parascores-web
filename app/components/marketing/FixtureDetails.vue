<script setup lang="ts">
import { useRoute } from '#imports'
import type { Tournament, Fixture, MatchEvent } from '~/types'
import { FixtureStatus, MatchEventType } from '~/types'

const { toMain } = useHost()

const props = defineProps<{
  tournamentId: string
  fixtureId: string
}>()

defineEmits(['back'])
// Theme (injected from widget layout)
const isDark = inject<Ref<boolean>>('widgetIsDark', ref(true))

// State
const tournament = ref<Tournament | null>(null)
const fixture = ref<Fixture | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const activeTab = ref<'events' | 'info' | 'lineups'>('events')
const route = useRoute()
const isFullPage = computed(() => route.path.includes('/fixture/'))

// Establish Live Stream connection to receive realtime push notifications
useLiveStream()

// Listen to local streaming updates
if (typeof window !== 'undefined') {
  window.addEventListener('live-match-update', (e: Event) => {
    const customEvent = e as CustomEvent
    const { type, data } = customEvent.detail

    if (!fixture.value) return

    // Ensure update corresponds to this fixture
    if (type === 'fixture_updated' && data.id === fixture.value.id) {
      Object.assign(fixture.value, data)
    }

    // Match Events handling requires either this match id directly or by reading from the event
    if (type === 'event_added' || type === 'event_updated' || type === 'event_deleted') {
      const targetFixtureId = data.fixture_id || data.fixtureId
      if (targetFixtureId !== fixture.value.id) return

      if (!fixture.value.matchEvents) {
        fixture.value.matchEvents = []
      }

      const matchEvents = fixture.value.matchEvents as MatchEvent[]

      if (type === 'event_added') {
        matchEvents.push(data)
      } else if (type === 'event_updated') {
        const idx = matchEvents.findIndex((ev) => ev.id === data.id)
        if (idx !== -1) {
          matchEvents[idx] = data
        }
      } else if (type === 'event_deleted') {
        const deletedId = data.eventId
        const idx = matchEvents.findIndex((ev) => ev.id === deletedId)
        if (idx !== -1) {
          matchEvents.splice(idx, 1)
        }
      }
    }
  })
}

// Fetch data
async function fetchData() {
  loading.value = true
  error.value = null
  try {
    const [tournamentRes, fixtureRes] = await Promise.all([
      $publicApi<any>(`/tournaments/${props.tournamentId}`),
      $publicApi<any>(`/fixtures/${props.fixtureId}`)
    ])
    
    tournament.value = tournamentRes?.data || tournamentRes
    fixture.value = fixtureRes?.data || fixtureRes
    
    if (!fixture.value) {
      error.value = 'Fixture not found'
    }
  } catch (e: any) {
    error.value = e.message || 'Failed to load fixture'
    console.error('Fixture detail error:', e)
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

// SEO
watchEffect(() => {
  if (fixture.value && tournament.value) {
    const home = fixture.value.homeTeam?.customName || 'TBD'
    const away = fixture.value.awayTeam?.customName || 'TBD'
    useSeoMeta({
      title: `${home} vs ${away} — ${tournament.value.name} | ParaScores`,
      description: `${home} vs ${away} in ${tournament.value.name}. Follow live scores and match events.`,
      ogTitle: `${home} vs ${away} — ${tournament.value.name}`,
      ogDescription: `${home} vs ${away} in ${tournament.value.name}. Follow live scores and match events.`,
    })
  }
})

// Computed
const events = computed(() => {
  if (!fixture.value?.matchEvents) return []
  return [...fixture.value.matchEvents].sort((a, b) => (a.minute || 0) - (b.minute || 0))
})

const homeEvents = computed(() => events.value.filter(e => (e.participant_id === fixture.value?.homeTeamId || (e as any).participantId === fixture.value?.homeTeamId)))
const awayEvents = computed(() => events.value.filter(e => (e.participant_id === fixture.value?.awayTeamId || (e as any).participantId === fixture.value?.awayTeamId)))

const isCompleted = computed(() => fixture.value?.status === FixtureStatus.COMPLETED)
const isLive = computed(() => fixture.value?.status === FixtureStatus.LIVE)
const hasPenalties = computed(() => fixture.value?.homePenaltyScore != null || fixture.value?.awayPenaltyScore != null)

// Helpers
function formatTime(dateStr?: string | null) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}
function formatFullDate(dateStr?: string | null) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function getEventIcon(type: MatchEventType) {
  switch (type) {
    case MatchEventType.GOAL: return '⚽'
    case MatchEventType.OWN_GOAL: return '⚽'
    case MatchEventType.PENALTY: return '🎯'
    case MatchEventType.YELLOW_CARD: return '🟨'
    case MatchEventType.RED_CARD: return '🟥'
    case MatchEventType.SUBSTITUTION: return '🔄'
    case MatchEventType.ASSIST: return '👟'
    default: return '📋'
  }
}

function getEventLabel(type: MatchEventType) {
  switch (type) {
    case MatchEventType.GOAL: return 'Goal'
    case MatchEventType.OWN_GOAL: return 'Own Goal'
    case MatchEventType.PENALTY: return 'Penalty'
    case MatchEventType.YELLOW_CARD: return 'Yellow Card'
    case MatchEventType.RED_CARD: return 'Red Card'
    case MatchEventType.SUBSTITUTION: return 'Substitution'
    case MatchEventType.ASSIST: return 'Assist'
    default: return type
  }
}

function getPlayerGoals(playerId: string) {
  return events.value.filter(e => ['GOAL', 'PENALTY'].includes(e.type) && (e.playerId === playerId || e.player?.id === playerId)).length
}

function getPlayerAssists(playerId: string) {
  return events.value.filter(e => ['GOAL', 'PENALTY'].includes(e.type) && (e.relatedPlayerId === playerId || e.relatedPlayer?.id === playerId)).length
}

// Compute cumulative score for goal events to show the (1 - 0) format
const timelineEvents = computed(() => {
  let homeScore = 0
  let awayScore = 0
  const mapped = events.value.map(event => {
    let currentHomeScore = homeScore
    let currentAwayScore = awayScore
    let scoringTeam: 'home' | 'away' | null = null
    
    if (['GOAL', 'OWN_GOAL', 'PENALTY'].includes(event.type)) {
      const isHomeEventFlag = isHomeEvent(event)
      if (isHomeEventFlag) {
        homeScore++
        scoringTeam = 'home'
      } else {
        awayScore++
        scoringTeam = 'away'
      }
      currentHomeScore = homeScore
      currentAwayScore = awayScore
    }
    
    return {
      ...event,
      scoreAtTime: ['GOAL', 'OWN_GOAL', 'PENALTY'].includes(event.type) ? `${currentHomeScore} - ${currentAwayScore}` : '',
      currentHomeScore,
      currentAwayScore,
      scoringTeam
    }
  })
  
  // Optionally group them or just return the mapped array
  return mapped
})

const keyEventsSummary = computed(() => {
  const goalsAndReds = events.value.filter(e => 
    ['GOAL', 'OWN_GOAL', 'PENALTY', 'RED_CARD'].includes(e.type)
  ).sort((a, b) => (a.minute || 0) - (b.minute || 0))

  const homeEvents = goalsAndReds.filter(e => isHomeEvent(e))
  const awayEvents = goalsAndReds.filter(e => !isHomeEvent(e))
  
  const rows: { home: any | null, away: any | null }[] = []
  const maxRows = Math.max(homeEvents.length, awayEvents.length)
  for (let i = 0; i < maxRows; i++) {
    rows.push({
      home: homeEvents[i] || null,
      away: awayEvents[i] || null
    })
  }

  return rows
})

// Helper to determine if an event is home or away
const isHomeEvent = (event: any) => {
  return event.participant_id === fixture.value?.homeTeamId || event.participantId === fixture.value?.homeTeamId
}
</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center min-h-[60vh]">
      <div class="flex flex-col items-center gap-4">
        <div class="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <span class="text-sm text-gray-400">Loading match...</span>
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
        <h3 class="text-lg font-semibold mb-2" :class="isDark ? 'text-white' : 'text-gray-900'">Match not found</h3>
        <p class="text-sm text-gray-400 mb-4">{{ error }}</p>
        <button @click="$emit('back')" class="text-sm text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer">
          ← Back
        </button>
      </div>
    </div>

    <!-- Content -->
    <div v-else-if="fixture && tournament">
      <!-- Match Header -->
      <section class="relative overflow-hidden transition-colors" :class="isDark ? 'bg-[#1a1a1a] border-white/[0.06]' : 'bg-white border-gray-200'">
        <div class="relative max-w-3xl mx-auto px-6 pt-10 pb-0">
          <!-- Header Controls -->
          <div class="flex items-center justify-between mb-8">
            <!-- Back + Tournament -->
            <button @click="$emit('back')" class="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-emerald-400 transition-colors cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>

            <!-- Full Page Link -->
            <NuxtLink v-if="!isFullPage" :to="toMain(`/t/${tournament.customName || tournament.id}/fixture/${fixture.id}`)" class="inline-flex items-center gap-1.5 text-xs text-emerald-500 hover:text-emerald-400 transition-colors bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-full border border-emerald-500/20">
              View Full Match Page
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </NuxtLink>
          </div>

          <!-- Match Header (FotMob Style) -->
          <div class="pb-8">
            <!-- Round info -->
            <div class="text-center mb-6">
              <span class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                {{ fixture.roundName || `Round ${fixture.round}` }}<template v-if="fixture.matchNumber"> · Match {{ fixture.matchNumber }}</template>
              </span>
            </div>

            <!-- Scoreboard -->
            <div class="flex items-center justify-center max-w-xl mx-auto mb-6">
              <!-- Home Team -->
              <div class="flex-1 flex flex-col items-center text-center">
                <div class="w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden mb-2.5 flex-shrink-0 flex items-center justify-center ring-1 ring-white/10" :class="isDark ? 'bg-white/5' : 'bg-gray-100 ring-gray-200'">
                  <img v-if="fixture.homeTeam?.logoUrl" :src="fixture.homeTeam.logoUrl" class="w-full h-full object-cover p-1" />
                  <span v-else class="text-xl font-bold text-gray-400">
                    {{ (fixture.homeTeam?.customName || 'H').charAt(0) }}
                  </span>
                </div>
                <span class="text-[15px] font-bold transition-colors max-w-full truncate px-2" :class="isDark ? 'text-white' : 'text-gray-900'">
                  {{ fixture.homeTeam?.customName || fixture.homeTeamPlaceholder || 'TBD' }}
                </span>
              </div>

              <!-- Score Center -->
              <div class="flex-shrink-0 w-32 md:w-40 flex flex-col items-center justify-center px-2">
                <template v-if="isLive || isCompleted">
                  <div class="flex items-center justify-center gap-2 md:gap-3 mb-1">
                    <span class="text-[32px] md:text-[40px] font-bold tracking-tight leading-none transition-colors" :class="isDark ? 'text-white' : 'text-gray-900'">
                      {{ fixture.homeScore ?? 0 }} <span class="text-gray-500 font-normal mx-1">-</span> {{ fixture.awayScore ?? 0 }}
                    </span>
                  </div>
                  <div class="text-[13px] font-medium text-gray-400 mt-1 flex items-center justify-center gap-1.5">
                    <template v-if="isLive">
                      <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                      <span class="text-red-400">Live</span>
                    </template>
                    <span v-else>Full time</span>
                  </div>
                  <div v-if="hasPenalties" class="text-[11px] text-gray-500 mt-1">
                    ({{ fixture.homePenaltyScore ?? 0 }} - {{ fixture.awayPenaltyScore ?? 0 }} pens)
                  </div>
                </template>
                <template v-else-if="fixture.status === FixtureStatus.CANCELLED">
                  <span class="text-[32px] md:text-[40px] font-bold tracking-tight leading-none transition-colors" :class="isDark ? 'text-white' : 'text-gray-900'">-</span>
                  <span class="text-[13px] font-medium text-red-400 mt-2">Cancelled</span>
                </template>
                <template v-else>
                  <span v-if="fixture.startTime" class="text-2xl font-bold block mb-1 transition-colors" :class="isDark ? 'text-white' : 'text-gray-900'">
                    {{ formatTime(fixture.startTime) }}
                  </span>
                  <span v-else class="text-[32px] font-bold text-gray-600 block mb-1">-</span>
                  <span v-if="fixture.startTime" class="text-[12px] text-gray-400 block text-center">
                    {{ formatFullDate(fixture.startTime) }}
                  </span>
                </template>
              </div>

              <!-- Away Team -->
              <div class="flex-1 flex flex-col items-center text-center">
                <div class="w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden mb-2.5 flex-shrink-0 flex items-center justify-center ring-1 ring-white/10" :class="isDark ? 'bg-white/5' : 'bg-gray-100 ring-gray-200'">
                  <img v-if="fixture.awayTeam?.logoUrl" :src="fixture.awayTeam.logoUrl" class="w-full h-full object-cover p-1" />
                  <span v-else class="text-xl font-bold text-gray-400">
                    {{ (fixture.awayTeam?.customName || 'A').charAt(0) }}
                  </span>
                </div>
                <span class="text-[15px] font-bold transition-colors max-w-full truncate px-2" :class="isDark ? 'text-white' : 'text-gray-900'">
                  {{ fixture.awayTeam?.customName || fixture.awayTeamPlaceholder || 'TBD' }}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="max-w-3xl mx-auto px-6 mt-4">
          <nav class="flex gap-6 border-b transition-colors" :class="isDark ? 'border-white/[0.08]' : 'border-gray-200'">
            <button
              @click="activeTab = 'events'"
              class="pb-3 text-sm font-medium border-b-2 transition-colors duration-200"
              :class="activeTab === 'events' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-400 hover:text-gray-300'"
            >
              Match Events
            </button>
            <button
              @click="activeTab = 'info'"
              class="pb-3 text-sm font-medium border-b-2 transition-colors duration-200"
              :class="activeTab === 'info' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-400 hover:text-gray-300'"
            >
              Match Info
            </button>
            <button
              @click="activeTab = 'lineups'"
              class="pb-3 text-sm font-medium border-b-2 transition-colors duration-200"
              :class="activeTab === 'lineups' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-400 hover:text-gray-300'"
            >
              Lineups
            </button>
          </nav>
        </div>
      </section>

      <!-- Match Details Content -->
      <section class="max-w-3xl mx-auto px-4 py-8">
        <!-- Match Events Tab -->
        <div v-show="activeTab === 'events'">
          <div v-if="timelineEvents.length > 0" :class="isDark ? 'bg-[#1a1a1a] border-white/[0.06]' : 'bg-white border-gray-200 shadow-sm'" class="border rounded-xl  overflow-hidden relative pb-10">
            <div class="px-3 md:px-5 py-4 md:py-6 flex flex-col items-center">
              <h3 class="text-[14px] font-bold text-white mb-6 md:mb-8 relative z-10 z-[1]">Events</h3>
              
              <!-- Center Line (Removed) -->

              <div class="w-full flex flex-col relative z-10">
                <div 
                  v-for="(event, index) in timelineEvents" 
                  :key="event.id"
                  class="flex w-full items-center group transition-opacity duration-300 py-4 border-b last:border-b-0"
                  :class="isDark ? 'border-white/[0.06]' : 'border-gray-100'"
                >
                  <!-- Left Side (Home) -->
                  <div class="flex-1 flex justify-start md:justify-end text-right md:w-1/2 min-w-0" :class="isHomeEvent(event) ? 'order-2 md:order-1' : 'hidden md:flex order-1'">
                    <div v-if="isHomeEvent(event)" class="flex items-center gap-2 md:gap-3 min-w-0">
                      <div class="flex flex-col items-start md:items-end justify-center min-w-0">
                        <div class="flex items-center gap-1.5 flex-row md:flex-row-reverse min-w-0">
                          <!-- Event Icon (Left side has it on the right closest to center) -->
                          <div class="flex-shrink-0 w-5 h-5 md:w-6 md:h-6 flex items-center justify-center">
                            <IconsSoccerBallIcon v-if="['GOAL', 'PENALTY', 'OWN_GOAL'].includes(event.type)" class="w-4 h-4 md:w-5 md:h-5" :class="event.type === 'OWN_GOAL' ? 'text-red-500' : (isDark ? 'text-white' : 'text-gray-900')" />
                            <div v-else-if="event.type === 'YELLOW_CARD'" class="w-3 h-[14px] md:w-3.5 md:h-[18px] bg-yellow-400 rounded-[2px] shadow-sm"></div>
                            <div v-else-if="event.type === 'RED_CARD'" class="w-3 h-[14px] md:w-3.5 md:h-[18px] bg-red-500 rounded-[2px] shadow-sm"></div>
                            <div v-else-if="event.type === 'SUBSTITUTION'" class="flex items-center justify-center">
                              <UIcon name="i-heroicons-arrows-right-left" class="w-4 h-4 md:w-5 md:h-5 text-gray-400 transform rotate-90" />
                            </div>
                            <IconsAssistIcon v-else-if="event.type === 'ASSIST'" class="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                            <span v-else class="text-xs md:text-sm">{{ getEventIcon(event.type) }}</span>
                          </div>
                          
                          <!-- Event Details -->
                          <div class="flex flex-col items-start md:items-end min-w-0">
                            <p class="text-[13px] md:text-[14px] font-semibold tracking-tight transition-colors flex flex-wrap justify-start md:justify-end md:items-center gap-1 md:gap-1.5" :class="isDark ? 'text-white' : 'text-gray-900'">
                              <span v-if="event.type === 'SUBSTITUTION'" class="text-emerald-500 break-all min-w-0">{{ event.player?.name || 'Player In' }}</span>
                              <span v-else class="break-all min-w-0 text-left md:text-right">
                                {{ event.player?.name || event.participant?.customName || getEventLabel(event.type) }}
                                <span v-if="event.type === 'PENALTY'" class="text-xs text-gray-400 font-normal ml-0.5">(P)</span>
                                <span v-if="event.type === 'OWN_GOAL'" class="text-xs text-red-500 font-normal ml-0.5">(OG)</span>
                              </span>
                              
                              <!-- Score after goal -->
                              <span v-if="['GOAL', 'PENALTY', 'OWN_GOAL'].includes(event.type) && event.scoreAtTime" class="text-gray-500 ml-1">
                                (<span :class="event.scoringTeam === 'home' ? 'text-emerald-500' : ''">{{ event.currentHomeScore }}</span> - <span :class="event.scoringTeam === 'away' ? 'text-emerald-500' : ''">{{ event.currentAwayScore }}</span>)
                              </span>
                            </p>
                            
                            <!-- Subtitle / Assist / Sub Out -->
                            <p v-if="event.type === 'SUBSTITUTION'" class="text-[11px] md:text-[12px] text-red-500 font-medium tracking-tight">
                              {{ event.relatedPlayer?.name || 'Player Out' }}
                            </p>
                            <p v-else-if="['GOAL', 'PENALTY'].includes(event.type) && event.relatedPlayer" class="text-[12px] md:text-[13px] text-gray-400/80 flex items-center gap-1">
                              assist by {{ event.relatedPlayer.name }}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Center Minute Bubble -->
                  <div class="flex-shrink-0 md:w-12 flex justify-center items-center relative md:mx-0"
                       :class="isHomeEvent(event) ? 'order-1 md:order-2 w-8 mr-2 md:mr-0' : 'order-2 md:order-2 w-8 ml-2 md:ml-0'">
                    <div 
                      class="flex items-center justify-center text-[12px] md:text-[11px] font-bold z-10 transition-colors md:rounded-full md:w-8 md:h-8 md:shadow-sm"
                      :class="isDark ? 'text-gray-400 md:bg-white/10 md:text-gray-300 md:ring-1 md:ring-white/20' : 'text-gray-500 md:bg-gray-100 md:text-gray-600 md:ring-1 md:ring-gray-200'"
                    >
                      <span v-if="event.minute != null">{{ event.minute }}'</span>
                      <span v-else class="text-[10px] md:text-xs">
                        <UIcon name="i-heroicons-clock" class="w-3 h-3 md:w-3.5 md:h-3.5" />
                      </span>
                    </div>
                  </div>

                  <!-- Right Side (Away) -->
                  <div class="flex-1 flex justify-end md:justify-start text-left md:w-1/2 min-w-0" :class="!isHomeEvent(event) ? 'order-1 md:order-3' : 'hidden md:flex order-3'">
                    <div v-if="!isHomeEvent(event)" class="flex items-center gap-2 md:gap-3 min-w-0">
                      <div class="flex flex-col items-end md:items-start justify-center min-w-0">
                        <div class="flex items-center gap-1.5 flex-row-reverse md:flex-row min-w-0">
                          <!-- Event Icon -->
                          <div class="flex-shrink-0 w-5 h-5 md:w-6 md:h-6 flex items-center justify-center">
                            <IconsSoccerBallIcon v-if="['GOAL', 'PENALTY', 'OWN_GOAL'].includes(event.type)" class="w-4 h-4 md:w-5 md:h-5" :class="event.type === 'OWN_GOAL' ? 'text-red-500' : (isDark ? 'text-white' : 'text-gray-900')" />
                            <div v-else-if="event.type === 'YELLOW_CARD'" class="w-3 h-[14px] md:w-3.5 md:h-[18px] bg-yellow-400 rounded-[2px] shadow-sm"></div>
                            <div v-else-if="event.type === 'RED_CARD'" class="w-3 h-[14px] md:w-3.5 md:h-[18px] bg-red-500 rounded-[2px] shadow-sm"></div>
                            <div v-else-if="event.type === 'SUBSTITUTION'" class="flex items-center justify-center">
                              <UIcon name="i-heroicons-arrows-right-left" class="w-4 h-4 md:w-5 md:h-5 text-gray-400 transform rotate-90" />
                            </div>
                            <IconsAssistIcon v-else-if="event.type === 'ASSIST'" class="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                            <span v-else class="text-xs md:text-sm">{{ getEventIcon(event.type) }}</span>
                          </div>
                          
                          <!-- Event Details -->
                          <div class="flex flex-col items-end md:items-start min-w-0">
                            <p class="text-[13px] md:text-[14px] font-semibold tracking-tight transition-colors flex flex-wrap justify-end md:justify-start md:items-center gap-1 md:gap-1.5" :class="isDark ? 'text-white' : 'text-gray-900'">
                              <span v-if="event.type === 'SUBSTITUTION'" class="text-emerald-500 break-all min-w-0">{{ event.player?.name || 'Player In' }}</span>
                              <span v-else class="break-all min-w-0 text-right md:text-left">
                                {{ event.player?.name || event.participant?.customName || getEventLabel(event.type) }}
                                <span v-if="event.type === 'PENALTY'" class="text-xs text-gray-400 font-normal ml-0.5">(P)</span>
                                <span v-if="event.type === 'OWN_GOAL'" class="text-xs text-red-500 font-normal ml-0.5">(OG)</span>
                              </span>
                              
                              <!-- Score after goal -->
                              <span v-if="['GOAL', 'PENALTY', 'OWN_GOAL'].includes(event.type) && event.scoreAtTime" class="text-gray-500 ml-1">
                                (<span :class="event.scoringTeam === 'home' ? 'text-emerald-500' : ''">{{ event.currentHomeScore }}</span> - <span :class="event.scoringTeam === 'away' ? 'text-emerald-500' : ''">{{ event.currentAwayScore }}</span>)
                              </span>
                            </p>
                            
                            <!-- Subtitle / Assist / Sub Out -->
                            <p v-if="event.type === 'SUBSTITUTION'" class="text-[11px] md:text-[12px] text-red-500 font-medium tracking-tight">
                              {{ event.relatedPlayer?.name || 'Player Out' }}
                            </p>
                            <p v-else-if="['GOAL', 'PENALTY'].includes(event.type) && event.relatedPlayer" class="text-[12px] md:text-[13px] text-gray-400/80 flex items-center gap-1">
                              assist by {{ event.relatedPlayer.name }}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- End match fading effect at bottom -->
            <div class="absolute bottom-0 left-0 right-0 h-10 w-full" :class="isDark ? 'bg-gradient-to-t from-[#1a1a1a] to-transparent' : 'bg-gradient-to-t from-white to-transparent'"></div>
          </div>
          
          <!-- No Events Message -->
          <div v-else :class="isDark ? 'bg-[#1a1a1a] border-white/[0.06]' : 'bg-white border-gray-200 shadow-sm'" class="border rounded-xl px-5 py-12 flex flex-col items-center justify-center">
            <UIcon name="i-heroicons-clipboard-document-list" class="w-10 h-10 text-gray-400 mb-3 opacity-50" />
            <p class="text-sm font-medium text-gray-500">No match events recorded yet.</p>
          </div>
        </div>

        <!-- Lineups Tab -->
        <div v-show="activeTab === 'lineups'" class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Home Team Players -->
          <div :class="isDark ? 'bg-[#1a1a1a] border-white/[0.06]' : 'bg-white border-gray-200 shadow-sm'" class="border rounded-xl overflow-hidden self-start min-w-0">
            <div class="px-5 py-3.5 border-b transition-colors flex items-center justify-between" :class="isDark ? 'border-white/[0.06]' : 'border-gray-100'">
              <h3 class="text-[12px] font-semibold uppercase tracking-wider text-gray-400 truncate pr-4">
                {{ fixture.homeTeam?.customName || fixture.homeTeamPlaceholder || 'Home Team' }}
              </h3>
              <span class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">Lineup</span>
            </div>
            <div class="divide-y transition-colors" :class="isDark ? 'divide-white/[0.04]' : 'divide-gray-100'">
              <template v-if="fixture.homeTeam?.players?.length">
                <div v-for="player in fixture.homeTeam.players" :key="player.id" class="flex items-center px-5 py-3 transition-colors" :class="isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50'">
                  <span v-if="player.number" class="w-8 flex-shrink-0 text-sm font-bold text-gray-500">{{ player.number }}</span>
                  <span class="text-sm font-medium transition-colors flex-1 min-w-0 truncate pr-2" :class="isDark ? 'text-gray-200' : 'text-gray-800'" :title="player.name">{{ player.name }}</span>
                  <div v-if="getPlayerGoals(player.id) > 0 || getPlayerAssists(player.id) > 0" class="flex items-center ml-2.5 z-10 text-white flex-shrink-0">
                    <div v-if="getPlayerGoals(player.id) > 0" class="flex items-center -space-x-1.5">
                      <div v-for="i in getPlayerGoals(player.id)" :key="'goal-'+i" class="w-[14px] h-[14px] flex items-center justify-center rounded-full relative text-[10px]" :class="isDark ? 'ring-1 ring-gray-900 bg-gray-900' : 'ring-1 ring-white bg-white text-gray-900'">
                        <IconsSoccerBallIcon class="w-[10px] h-[10px]" />
                      </div>
                    </div>
                    <div v-if="getPlayerAssists(player.id) > 0" class="flex items-center -space-x-1.5" :class="{'ml-1': getPlayerGoals(player.id) > 0}">
                      <div v-for="i in getPlayerAssists(player.id)" :key="'assist-'+i" class="w-[14px] h-[14px] flex items-center justify-center rounded-full relative text-[10px]" :class="isDark ? 'ring-1 ring-gray-900 bg-gray-900' : 'ring-1 ring-white bg-white text-emerald-400'">
                        <IconsAssistIcon class="w-[10px] h-[10px]" />
                      </div>
                    </div>
                  </div>
                  <span v-if="player.position" class="ml-auto flex-shrink-0 pl-3 text-[11px] font-medium uppercase tracking-wider text-gray-400">{{ player.position }}</span>
                </div>
              </template>
              <div v-else class="px-5 py-8 text-center">
                <p class="text-sm text-gray-500">No players listed.</p>
              </div>
            </div>
          </div>

          <!-- Away Team Players -->
          <div :class="isDark ? 'bg-[#1a1a1a] border-white/[0.06]' : 'bg-white border-gray-200 shadow-sm'" class="border rounded-xl overflow-hidden self-start min-w-0">
            <div class="px-5 py-3.5 border-b transition-colors flex items-center justify-between" :class="isDark ? 'border-white/[0.06]' : 'border-gray-100'">
              <h3 class="text-[12px] font-semibold uppercase tracking-wider text-gray-400 truncate pr-4">
                {{ fixture.awayTeam?.customName || fixture.awayTeamPlaceholder || 'Away Team' }}
              </h3>
              <span class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">Lineup</span>
            </div>
            <div class="divide-y transition-colors" :class="isDark ? 'divide-white/[0.04]' : 'divide-gray-100'">
              <template v-if="fixture.awayTeam?.players?.length">
                <div v-for="player in fixture.awayTeam.players" :key="player.id" class="flex items-center px-5 py-3 transition-colors" :class="isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50'">
                  <span v-if="player.number" class="w-8 flex-shrink-0 text-sm font-bold text-gray-500">{{ player.number }}</span>
                  <span class="text-sm font-medium transition-colors flex-1 min-w-0 truncate pr-2" :class="isDark ? 'text-gray-200' : 'text-gray-800'" :title="player.name">{{ player.name }}</span>
                  <div v-if="getPlayerGoals(player.id) > 0 || getPlayerAssists(player.id) > 0" class="flex items-center ml-2.5 z-10 text-white flex-shrink-0">
                    <div v-if="getPlayerGoals(player.id) > 0" class="flex items-center -space-x-1.5">
                      <div v-for="i in getPlayerGoals(player.id)" :key="'goal-'+i" class="w-[14px] h-[14px] flex items-center justify-center rounded-full relative text-[10px]" :class="isDark ? 'ring-1 ring-gray-900 bg-gray-900' : 'ring-1 ring-white bg-white text-gray-900'">
                        <IconsSoccerBallIcon class="w-[10px] h-[10px]" />
                      </div>
                    </div>
                    <div v-if="getPlayerAssists(player.id) > 0" class="flex items-center -space-x-1.5" :class="{'ml-1': getPlayerGoals(player.id) > 0}">
                      <div v-for="i in getPlayerAssists(player.id)" :key="'assist-'+i" class="w-[14px] h-[14px] flex items-center justify-center rounded-full relative text-[10px]" :class="isDark ? 'ring-1 ring-gray-900 bg-gray-900' : 'ring-1 ring-white bg-white text-emerald-400'">
                        <IconsAssistIcon class="w-[10px] h-[10px]" />
                      </div>
                    </div>
                  </div>
                  <span v-if="player.position" class="ml-auto flex-shrink-0 pl-3 text-[11px] font-medium uppercase tracking-wider text-gray-400">{{ player.position }}</span>
                </div>
              </template>
              <div v-else class="px-5 py-8 text-center">
                <p class="text-sm text-gray-500">No players listed.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Match Info Tab -->
        <div v-show="activeTab === 'info'">
          <div :class="isDark ? 'bg-[#1a1a1a] border-white/[0.06]' : 'bg-white border-gray-200 shadow-sm'" class="border rounded-xl overflow-hidden">
            <div class="px-5 py-3.5 border-b transition-colors" :class="isDark ? 'border-white/[0.06]' : 'border-gray-100'">
              <h3 class="text-[12px] font-semibold uppercase tracking-wider text-gray-400">Match Info</h3>
            </div>
            <div class="divide-y transition-colors" :class="isDark ? 'divide-white/[0.04]' : 'divide-gray-100'">
              <div class="flex items-center justify-between px-5 py-3">
                <span class="text-sm text-gray-500">Tournament</span>
                <button @click="$emit('back')" class="text-sm text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer">
                  {{ tournament.name }}
                </button>
              </div>
              <div class="flex items-center justify-between px-5 py-3">
                <span class="text-sm text-gray-500">Round</span>
                <span class="text-sm transition-colors" :class="isDark ? 'text-gray-200' : 'text-gray-800'">{{ fixture.roundName || `Round ${fixture.round}` }}</span>
              </div>
              <div class="flex items-center justify-between px-5 py-3">
                <span class="text-sm text-gray-500">Match</span>
                <span class="text-sm transition-colors" :class="isDark ? 'text-gray-200' : 'text-gray-800'">#{{ fixture.matchNumber }}</span>
              </div>
              <div v-if="fixture.startTime" class="flex items-center justify-between px-5 py-3">
                <span class="text-sm text-gray-500">Date & Time</span>
                <span class="text-sm transition-colors" :class="isDark ? 'text-gray-200' : 'text-gray-800'">{{ formatFullDate(fixture.startTime) }} · {{ formatTime(fixture.startTime) }}</span>
              </div>
              <div v-if="fixture.stage" class="flex items-center justify-between px-5 py-3">
                <span class="text-sm text-gray-500">Stage</span>
                <span class="text-sm transition-colors" :class="isDark ? 'text-gray-200' : 'text-gray-800'">{{ fixture.stage.replace(/_/g, ' ') }}</span>
              </div>
              <div v-if="fixture.group" class="flex items-center justify-between px-5 py-3">
                <span class="text-sm text-gray-500">Group</span>
                <span class="text-sm transition-colors" :class="isDark ? 'text-gray-200' : 'text-gray-800'">{{ fixture.group.name }}</span>
              </div>
              <div class="flex items-center justify-between px-5 py-3">
                <span class="text-sm text-gray-500">Status</span>
                <span 
                  class="text-sm font-medium"
                  :class="{
                    'text-red-400': isLive,
                    'text-emerald-400': isCompleted,
                    'text-gray-400': !isLive && !isCompleted
                  }"
                >
                  {{ fixture.status }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
