<script setup lang="ts">
import type { Tournament, Participant, Fixture } from '~/types'

const props = defineProps<{
  tournamentId: string
  participantId: string
}>()

defineEmits(['back'])
const isDark = inject<Ref<boolean>>('widgetIsDark', ref(true))

const tournament = ref<Tournament | null>(null)
const participant = ref<Participant | null>(null)
const participantFixtures = ref<Fixture[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const activeTab = ref<'squad' | 'matches'>('squad')

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    const [tournamentRes, participantRes, fixturesRes] = await Promise.all([
      $publicApi<any>(`/tournaments/${props.tournamentId}`),
      $publicApi<any>(`/participants/${props.participantId}`),
      $publicApi<any>(`/fixtures/tournaments/${props.tournamentId}`).catch(() => null)
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
        // If it's pertinent to this team, update it
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
  if (match.status !== 'COMPLETED') return 'bg-white/5 text-white'
  
  const isHome = match.homeTeamId === props.participantId
  const isAway = match.awayTeamId === props.participantId
  
  if (!isHome && !isAway) return 'bg-white/5 text-white'
  
  const myScore = isHome ? (match.homeScore ?? 0) : (match.awayScore ?? 0)
  const oppScore = isHome ? (match.awayScore ?? 0) : (match.homeScore ?? 0)
  
  if (myScore > oppScore) return 'bg-emerald-600 text-white'
  if (myScore < oppScore) return 'bg-red-500 text-white'
  return 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
}
</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center min-h-[60vh]">
      <div class="flex flex-col items-center gap-4">
        <div class="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <span class="text-sm text-gray-400">Loading team...</span>
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
        <h3 class="text-lg font-semibold mb-2" :class="isDark ? 'text-white' : 'text-gray-900'">Team not found</h3>
        <p class="text-sm text-gray-400 mb-4">{{ error }}</p>
        <button @click="$emit('back')" class="text-sm text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer">
          ← Back
        </button>
      </div>
    </div>

    <!-- Content -->
    <div v-else-if="participant && tournament">
      <!-- Team Header -->
      <section class="relative overflow-hidden transition-colors" :class="isDark ? 'bg-transparent border-white/[0.06]' : 'bg-transparent border-gray-200'">
        <div class="relative max-w-5xl mx-auto px-6 pt-6 pb-0">
          <!-- Back button -->
          <button @click="$emit('back')" class="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-emerald-400 transition-colors mb-6 cursor-pointer">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Tournament
          </button>

          <!-- Header info -->
          <div class="pb-6 flex flex-col items-center">
            <div class="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden mb-3 flex items-center justify-center ring-1 ring-white/10" :class="isDark ? 'bg-white/5' : 'bg-gray-100 ring-gray-200'">
              <img v-if="participant.logoUrl" :src="participant.logoUrl" class="w-full h-full object-cover p-2" />
              <span v-else class="text-3xl font-bold text-gray-400">
                {{ (participant.customName || 'T').charAt(0).toUpperCase() }}
              </span>
            </div>
            <h1 class="text-xl md:text-2xl font-bold transition-colors text-center" :class="isDark ? 'text-white' : 'text-gray-900'">
              {{ participant.customName || 'Unnamed Team' }}
            </h1>
          </div>
        </div>

        <div class="max-w-5xl mx-auto px-6 mt-4">
          <nav class="flex gap-6 border-b transition-colors" :class="isDark ? 'border-white/[0.08]' : 'border-gray-200'">
            <button
              @click="activeTab = 'squad'"
              class="pb-3 text-sm font-medium border-b-2 transition-colors duration-200"
              :class="activeTab === 'squad' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-400 hover:text-gray-300'"
            >
              Squad
            </button>
            <button
              @click="activeTab = 'matches'"
              class="pb-3 text-sm font-medium border-b-2 transition-colors duration-200"
              :class="activeTab === 'matches' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-400 hover:text-gray-300'"
            >
              Matches
            </button>
          </nav>
        </div>
      </section>

      <!-- Details Content -->
      <section class="max-w-5xl mx-auto px-4 py-8">
        <!-- Squad Tab -->
        <div v-show="activeTab === 'squad'">
          <div :class="isDark ? 'bg-[#1a1a1a] border-white/[0.06]' : 'bg-white border-gray-200 shadow-sm'" class="border rounded-xl px-5 py-4">
            <h3 class="text-[12px] font-semibold uppercase tracking-wider text-gray-400 mb-4 border-b pb-3" :class="isDark ? 'border-white/[0.06]' : 'border-gray-100'">Players</h3>
            
            <div v-if="!participant.players || participant.players.length === 0" class="py-8 text-center text-gray-500 text-sm">
              No players listed for this team.
            </div>
            
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div v-for="player in participant.players" :key="player.id" 
                   class="flex items-center gap-3 p-3 rounded-lg transition-colors border"
                   :class="isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'">
                <div class="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {{ player.number || '?' }}
                </div>
                <div class="flex flex-col overflow-hidden">
                  <span class="text-sm font-semibold truncate transition-colors" :class="isDark ? 'text-white' : 'text-gray-900'">{{ player.name }}</span>
                  <span class="text-[11px] font-medium text-gray-400 uppercase tracking-widest">{{ player.position || 'Unknown' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Matches Tab -->
        <div v-show="activeTab === 'matches'">
          <div :class="isDark ? 'bg-[#1a1a1a] border-white/[0.06]' : 'bg-white border-gray-200 shadow-sm'" class="border rounded-xl overflow-hidden">
            <div class="px-5 py-3.5 border-b" :class="isDark ? 'border-white/[0.06]' : 'border-gray-100'">
               <h3 class="text-[12px] font-semibold uppercase tracking-wider text-gray-400">Team Matches</h3>
            </div>
            
            <div v-if="participantFixtures.length === 0" class="py-12 text-center text-gray-500 text-sm">
              No matches found for this team.
            </div>
            
            <div v-else class="divide-y" :class="isDark ? 'divide-white/[0.04]' : 'divide-gray-100'">
              <NuxtLink v-for="match in participantFixtures" :key="match.id" :to="`/t/${tournament.id}/fixture/${match.id}`"
                  class="flex items-center justify-between p-4 md:p-5 transition-colors group hover:bg-white/[0.02]"
                  :class="isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50'">
                
                <div class="flex items-center gap-4 flex-1">
                  <!-- Match Date -->
                  <div class="hidden sm:flex flex-col items-center justify-center text-center w-24">
                     <span class="text-[11px] uppercase tracking-wider font-bold text-emerald-500/80">{{ formatFullDate(match.startTime) }}</span>
                     <span class="text-[13px] text-gray-400 font-medium">{{ formatTime(match.startTime) }}</span>
                  </div>
                  
                  <!-- Home -->
                  <div class="flex-1 flex justify-end items-center gap-3">
                    <span class="text-sm font-semibold transition-colors truncate" :class="[match.homeTeamId === participant?.id ? (isDark ? 'text-white' : 'text-gray-900') : 'text-gray-500']">
                      {{ match.homeTeam?.customName || match.homeTeamPlaceholder || 'Home' }}
                    </span>
                    <div class="w-6 h-6 md:w-8 md:h-8 rounded-full overflow-hidden flex-shrink-0 bg-white/5 border border-white/5 flex items-center justify-center">
                      <img v-if="match.homeTeam?.logoUrl" :src="match.homeTeam.logoUrl" class="w-full h-full object-cover p-0.5" />
                      <span v-else class="text-[10px] text-gray-500 font-bold">{{ (match.homeTeam?.customName || 'H').charAt(0) }}</span>
                    </div>
                  </div>
                  
                  <!-- Score -->
                  <div class="flex-shrink-0 w-20 text-center">
                    <template v-if="match.status === 'COMPLETED' || match.status === 'LIVE'">
                      <div class="inline-flex px-2 py-1 rounded min-w-[50px] justify-center text-sm font-bold tracking-wider whitespace-nowrap" :class="getScoreBadgeClass(match)">
                         {{ match.homeScore ?? 0 }} - {{ match.awayScore ?? 0 }}
                      </div>
                    </template>
                    <template v-else-if="match.status === 'CANCELLED'">
                      <span class="text-xs text-red-500 font-bold">CANC</span>
                    </template>
                    <template v-else>
                      <span class="text-gray-500 text-sm font-bold">- : -</span>
                    </template>
                  </div>
                  
                  <!-- Away -->
                  <div class="flex-1 flex justify-start items-center gap-3">
                    <div class="w-6 h-6 md:w-8 md:h-8 rounded-full overflow-hidden flex-shrink-0 bg-white/5 border border-white/5 flex items-center justify-center">
                      <img v-if="match.awayTeam?.logoUrl" :src="match.awayTeam.logoUrl" class="w-full h-full object-cover p-0.5" />
                      <span v-else class="text-[10px] text-gray-500 font-bold">{{ (match.awayTeam?.customName || 'A').charAt(0) }}</span>
                    </div>
                    <span class="text-sm font-semibold transition-colors truncate" :class="[match.awayTeamId === participant?.id ? (isDark ? 'text-white' : 'text-gray-900') : 'text-gray-500']">
                      {{ match.awayTeam?.customName || match.awayTeamPlaceholder || 'Away' }}
                    </span>
                  </div>
                </div>
              </NuxtLink>
            </div>
          </div>
        </div>

      </section>
    </div>
  </div>
</template>
