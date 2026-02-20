<script setup lang="ts">
import type { Tournament, Fixture, MatchEvent } from '~/types'
import { FixtureStatus, MatchEventType } from '~/types'

definePageMeta({
  layout: 'explore'
})

const route = useRoute()
const tournamentId = route.params.id as string
const fixtureId = route.params.fixtureId as string

// State
const tournament = ref<Tournament | null>(null)
const fixture = ref<Fixture | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// Fetch data
async function fetchData() {
  loading.value = true
  error.value = null
  try {
    const [tournamentRes, fixturesRes] = await Promise.all([
      $publicApi<any>(`/tournaments/public/${tournamentId}`),
      $publicApi<any>(`/tournaments/${tournamentId}/fixtures`)
    ])
    
    tournament.value = tournamentRes?.data || tournamentRes
    
    // Find the specific fixture from the list
    let allFixtures: Fixture[] = []
    const fixturesData = fixturesRes?.data || fixturesRes
    if (fixturesData?.rounds) {
      allFixtures = fixturesData.rounds.flatMap((r: any) => r.fixtures || [])
    } else if (Array.isArray(fixturesData)) {
      allFixtures = fixturesData
    }
    
    fixture.value = allFixtures.find(f => f.id === fixtureId) || null
    
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

const homeEvents = computed(() => events.value.filter(e => e.participant_id === fixture.value?.homeTeamId))
const awayEvents = computed(() => events.value.filter(e => e.participant_id === fixture.value?.awayTeamId))

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
        <h3 class="text-lg font-semibold mb-2 text-white">Match not found</h3>
        <p class="text-sm text-gray-400 mb-4">{{ error }}</p>
        <NuxtLink :to="`/tournaments/${tournamentId}`" class="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
          ← Back to Tournament
        </NuxtLink>
      </div>
    </div>

    <!-- Content -->
    <div v-else-if="fixture && tournament">
      <!-- Match Header -->
      <section class="relative overflow-hidden">
        <div class="absolute inset-0 h-full">
          <div class="w-full h-full" style="background: linear-gradient(135deg, #0a1628 0%, #0d1f35 50%, #0a1628 100%)"></div>
          <div class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0A0F1C]"></div>
        </div>

        <div class="relative max-w-3xl mx-auto px-6 pt-20 pb-10">
          <!-- Back + Tournament -->
          <NuxtLink :to="`/tournaments/${tournamentId}`" class="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-emerald-400 transition-colors mb-8">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {{ tournament.name }}
          </NuxtLink>

          <!-- Round info -->
          <div class="text-center mb-8">
            <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {{ fixture.roundName || `Round ${fixture.round}` }}
              <template v-if="fixture.matchNumber"> · Match {{ fixture.matchNumber }}</template>
            </span>
          </div>

          <!-- Match Card -->
          <div class="bg-[#111827]/80 backdrop-blur-md border border-white/[0.08] rounded-2xl p-6 md:p-8">
            <div class="flex items-center justify-between gap-4">
              <!-- Home Team -->
              <div class="flex-1 flex flex-col items-center text-center min-w-0">
                <div class="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-white/10 mb-3 flex-shrink-0">
                  <img v-if="fixture.homeTeam?.logoUrl" :src="fixture.homeTeam.logoUrl" class="w-full h-full object-cover" />
                  <span v-else class="flex items-center justify-center w-full h-full text-2xl font-bold text-gray-500">
                    {{ (fixture.homeTeam?.customName || 'H').charAt(0) }}
                  </span>
                </div>
                <span class="text-sm md:text-base font-semibold text-white truncate max-w-full">
                  {{ fixture.homeTeam?.customName || fixture.homeTeamPlaceholder || 'TBD' }}
                </span>
              </div>

              <!-- Score Center -->
              <div class="flex flex-col items-center px-4">
                <!-- Score - show for live/completed -->
                <template v-if="isLive || isCompleted">
                  <div class="flex items-center gap-3 mb-2">
                    <span class="text-4xl md:text-5xl font-bold text-white tabular-nums">{{ fixture.homeScore ?? 0 }}</span>
                    <span class="text-lg text-gray-600">-</span>
                    <span class="text-4xl md:text-5xl font-bold text-white tabular-nums">{{ fixture.awayScore ?? 0 }}</span>
                  </div>
                  <!-- Penalties -->
                  <div v-if="hasPenalties" class="text-xs text-gray-400 mb-2">
                    ({{ fixture.homePenaltyScore ?? 0 }} - {{ fixture.awayPenaltyScore ?? 0 }} pens)
                  </div>
                  <!-- Status badge -->
                  <div v-if="isLive" class="flex items-center gap-1.5 px-3 py-1 bg-red-500/15 border border-red-500/30 rounded-full">
                    <span class="w-2 h-2 bg-red-400 rounded-full animate-pulse"></span>
                    <span class="text-xs font-semibold text-red-400">LIVE</span>
                  </div>
                  <span v-else class="text-xs font-medium text-gray-500">Full Time</span>
                </template>
                <!-- Scheduled -->
                <template v-else-if="fixture.status === FixtureStatus.CANCELLED">
                  <span class="text-sm font-semibold text-gray-600">CANCELLED</span>
                </template>
                <template v-else>
                  <div class="text-center">
                    <span v-if="fixture.startTime" class="text-2xl font-bold text-white block">
                      {{ formatTime(fixture.startTime) }}
                    </span>
                    <span v-else class="text-2xl font-bold text-gray-600">vs</span>
                    <span v-if="fixture.startTime" class="text-[11px] text-gray-500 block mt-1">
                      {{ formatFullDate(fixture.startTime) }}
                    </span>
                  </div>
                </template>
              </div>

              <!-- Away Team -->
              <div class="flex-1 flex flex-col items-center text-center min-w-0">
                <div class="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-white/10 mb-3 flex-shrink-0">
                  <img v-if="fixture.awayTeam?.logoUrl" :src="fixture.awayTeam.logoUrl" class="w-full h-full object-cover" />
                  <span v-else class="flex items-center justify-center w-full h-full text-2xl font-bold text-gray-500">
                    {{ (fixture.awayTeam?.customName || 'A').charAt(0) }}
                  </span>
                </div>
                <span class="text-sm md:text-base font-semibold text-white truncate max-w-full">
                  {{ fixture.awayTeam?.customName || fixture.awayTeamPlaceholder || 'TBD' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Match Details -->
      <section class="max-w-3xl mx-auto px-6 py-8 space-y-6">

        <!-- Match Events Timeline -->
        <div v-if="events.length > 0" class="bg-[#111827] border border-white/[0.08] rounded-xl overflow-hidden">
          <div class="px-5 py-3.5 border-b border-white/[0.06]">
            <h3 class="text-[12px] font-semibold uppercase tracking-wider text-gray-400">Match Events</h3>
          </div>
          
          <div class="divide-y divide-white/[0.04]">
            <div 
              v-for="event in events" 
              :key="event.id"
              class="flex items-center px-5 py-3 hover:bg-white/[0.02] transition-colors"
            >
              <!-- Minute -->
              <div class="w-12 flex-shrink-0">
                <span v-if="event.minute != null" class="text-xs font-bold text-emerald-400 tabular-nums">{{ event.minute }}'</span>
              </div>

              <!-- Event content — positioned left or right based on team -->
              <div 
                class="flex-1 flex items-center gap-3"
                :class="event.participant_id === fixture.awayTeamId ? 'flex-row-reverse text-right' : ''"
              >
                <span class="text-lg flex-shrink-0">{{ getEventIcon(event.type) }}</span>
                <div class="min-w-0">
                  <p class="text-sm font-medium text-gray-200 truncate">
                    {{ event.player?.name || event.description || getEventLabel(event.type) }}
                  </p>
                  <p class="text-[11px] text-gray-500">
                    {{ getEventLabel(event.type) }}
                    <template v-if="event.relatedPlayer"> · {{ event.relatedPlayer.name }}</template>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- No Events Message -->
        <div v-else-if="isCompleted || isLive" class="bg-[#111827] border border-white/[0.08] rounded-xl px-5 py-8 text-center">
          <p class="text-sm text-gray-500">No match events recorded.</p>
        </div>

        <!-- Match Info -->
        <div class="bg-[#111827] border border-white/[0.08] rounded-xl overflow-hidden">
          <div class="px-5 py-3.5 border-b border-white/[0.06]">
            <h3 class="text-[12px] font-semibold uppercase tracking-wider text-gray-400">Match Info</h3>
          </div>
          <div class="divide-y divide-white/[0.04]">
            <div class="flex items-center justify-between px-5 py-3">
              <span class="text-sm text-gray-500">Tournament</span>
              <NuxtLink :to="`/tournaments/${tournamentId}`" class="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
                {{ tournament.name }}
              </NuxtLink>
            </div>
            <div class="flex items-center justify-between px-5 py-3">
              <span class="text-sm text-gray-500">Round</span>
              <span class="text-sm text-gray-200">{{ fixture.roundName || `Round ${fixture.round}` }}</span>
            </div>
            <div class="flex items-center justify-between px-5 py-3">
              <span class="text-sm text-gray-500">Match</span>
              <span class="text-sm text-gray-200">#{{ fixture.matchNumber }}</span>
            </div>
            <div v-if="fixture.startTime" class="flex items-center justify-between px-5 py-3">
              <span class="text-sm text-gray-500">Date & Time</span>
              <span class="text-sm text-gray-200">{{ formatFullDate(fixture.startTime) }} · {{ formatTime(fixture.startTime) }}</span>
            </div>
            <div v-if="fixture.stage" class="flex items-center justify-between px-5 py-3">
              <span class="text-sm text-gray-500">Stage</span>
              <span class="text-sm text-gray-200">{{ fixture.stage.replace(/_/g, ' ') }}</span>
            </div>
            <div v-if="fixture.group" class="flex items-center justify-between px-5 py-3">
              <span class="text-sm text-gray-500">Group</span>
              <span class="text-sm text-gray-200">{{ fixture.group.name }}</span>
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
      </section>
    </div>
  </div>
</template>
