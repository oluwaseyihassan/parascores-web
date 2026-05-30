<template>
  <div class="min-h-full text-gray-900 dark:text-white overflow-x-hidden">
    <!-- Hero Section -->
    <header class="relative pt-12 pb-16 px-6 overflow-hidden">
      <!-- Background Accents -->
      <div class="absolute top-0 left-1/4 w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-[120px] pointer-events-none"></div>
      <div class="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-white/[0.02] rounded-full blur-[100px] pointer-events-none"></div>

      <div class="max-w-7xl mx-auto relative z-10">
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>

            <h1 class="text-4xl md:text-5xl font-bold tracking-tight">
              Good {{ greetingTime }}, <span class="text-emerald-400">{{ userName }}</span>
            </h1>
            <p class="text-gray-600 dark:text-gray-400 mt-3 text-lg max-w-2xl">
              Stay updated with live scores, upcoming matches, and trending tournaments from the communities you follow.
            </p>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-6 pb-24 space-y-16">
      <!-- Live Now Section -->
      <section v-if="authStore.isAuthenticated && (filteredLive.length > 0 || loadingLive)">
        <div class="flex items-center justify-between mb-8">
          <div class="flex items-center gap-3">
            <h2 class="text-2xl font-bold">Live Now</h2>

          </div>
          <UButton variant="link" color="neutral" :to="toMain('/explore')" icon="i-heroicons-arrow-right" class="text-sm">
            View All
          </UButton>
        </div>

        <div v-if="loadingLive" class="flex gap-6 overflow-x-auto pb-4 hide-scrollbar">
          <div v-for="i in 3" :key="i" class="min-w-[320px] h-[180px] bg-white/5 rounded-2xl animate-pulse"></div>
        </div>

        <div v-else class="flex gap-6 overflow-x-auto pb-4 hide-scrollbar snap-x">
          <NuxtLink 
            v-for="match in filteredLive" 
            :key="match.id"
            :to="toMain(`/t/${match.tournament?.customName || match.tournament?.id}/fixture/${match.id}`)"
            class="min-w-[320px] md:min-w-[380px] snap-start group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-white/[0.05] bg-white dark:bg-[#0A0A0A] p-5 transition-[border-color] duration-300 hover:border-red-500/40 dark:hover:border-red-500/40 flex flex-col h-full"
          >
            <!-- Background Glow -->
            <div class="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-red-500/5 blur-3xl transition-opacity duration-500 group-hover:bg-red-500/10"></div>
            
            <div class="relative z-10 flex flex-col h-full">
              <div class="flex items-center justify-between mb-4">
                <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest truncate">{{ match.tournament?.customName || match.tournament?.name }}</span>
                <span class="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-black italic">LIVE</span>
              </div>
              
              <div class="flex-1 flex flex-col justify-center gap-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <UAvatar :src="match.homeTeam?.logoUrl || undefined" :alt="match.homeTeam?.customName || undefined" size="sm" />
                    <span class="font-bold text-sm truncate max-w-[120px] text-gray-900 dark:text-white">{{ match.homeTeam?.customName || 'TBD' }}</span>
                  </div>
                  <span class="text-2xl font-black text-gray-900 dark:text-white">{{ match.homeScore ?? 0 }}</span>
                </div>
                
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <UAvatar :src="match.awayTeam?.logoUrl || undefined" :alt="match.awayTeam?.customName || undefined" size="sm" />
                    <span class="font-bold text-sm truncate max-w-[120px] text-gray-900 dark:text-white">{{ match.awayTeam?.customName || 'TBD' }}</span>
                  </div>
                  <span class="text-2xl font-black text-gray-900 dark:text-white">{{ match.awayScore ?? 0 }}</span>
                </div>
              </div>
              
              <div class="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-[11px] text-gray-400">
                <div class="flex items-center gap-1.5 min-w-0">
                  <UIcon name="i-heroicons-map-pin" class="w-3 h-3 text-gray-500 shrink-0" />
                  <span class="truncate">{{ match.venue || 'No Venue' }}</span>
                </div>
                <UIcon name="i-heroicons-arrow-right" class="w-4 h-4 text-red-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-300 shrink-0" />
              </div>
            </div>
          </NuxtLink>
          
          <div v-if="filteredLive.length === 0" class="w-full py-12 flex flex-col items-center justify-center border border-white/5 bg-white/2 rounded-2xl">
            <UIcon name="i-heroicons-clock" class="w-8 h-8 text-gray-600 mb-2" />
            <p class="text-gray-500 text-sm italic">No matches live at the moment</p>
          </div>
        </div>
      </section>

      <!-- Upcoming Matches (from followed tournaments only) -->
      <section v-if="authStore.isAuthenticated && (filteredUpcoming.length > 0 || loadingUpcoming)">
        <div class="flex items-center justify-between mb-8">
          <div class="flex items-center gap-3">
            <h2 class="text-2xl font-bold">Upcoming Matches</h2>
            <span class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider">
              <UIcon name="i-heroicons-calendar" class="w-3 h-3" />
              Scheduled
            </span>
          </div>
        </div>

        <div v-if="loadingUpcoming" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-for="i in 4" :key="i" class="h-[180px] bg-white/5 rounded-2xl animate-pulse"></div>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NuxtLink
            v-for="match in filteredUpcoming"
            :key="match.id"
            :to="toTournament(match.tournament as any)"
            class="upcoming-card group relative overflow-hidden rounded-2xl bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-white/[0.05] hover:border-blue-500/30 transition-all duration-500"

          >
            <!-- Subtle gradient background -->
            <div class="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-blue-500/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div class="relative p-5">
              <!-- Header: Tournament + Countdown -->
              <div class="flex items-center justify-between mb-5">
                <div class="flex items-center gap-2 min-w-0">
                  <div class="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></div>
                  <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest truncate">{{ match.tournament?.customName || match.tournament?.name }}</span>
                  <span v-if="match.roundName" class="text-[10px] text-gray-600 shrink-0">&middot; {{ match.roundName }}</span>
                </div>
                <span class="shrink-0 ml-2 px-2.5 py-1 rounded-lg bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/20 text-blue-400 text-[10px] font-black tracking-wide">
                  {{ formatCountdown(match.startTime) }}
                </span>
              </div>

              <!-- Match: Teams VS -->
              <div class="flex items-center justify-between gap-3">
                <!-- Home Team -->
                <div class="flex-1 flex flex-col items-center gap-2.5 min-w-0">
                  <div class="relative">
                    <UAvatar 
                      :src="match.homeTeam?.logoUrl || undefined" 
                      :alt="match.homeTeam?.customName || undefined" 
                      size="lg" 
                      class="ring-2 ring-gray-100 dark:ring-white/10 group-hover:ring-blue-500/30 transition-all duration-300"
                    />
                  </div>
                  <span class="font-bold text-sm text-center text-gray-800 dark:text-gray-200 truncate max-w-full leading-tight">
                    {{ match.homeTeam?.customName || match.homeTeamPlaceholder || 'TBD' }}
                  </span>
                </div>

                <!-- VS Divider -->
                <div class="flex flex-col items-center gap-1 shrink-0 px-2">
                  <div class="w-px h-4 bg-gradient-to-b from-transparent via-gray-200 dark:via-white/10 to-transparent"></div>
                  <span class="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest">vs</span>
                  <div class="w-px h-4 bg-gradient-to-b from-transparent via-gray-200 dark:via-white/10 to-transparent"></div>
                </div>

                <!-- Away Team -->
                <div class="flex-1 flex flex-col items-center gap-2.5 min-w-0">
                  <div class="relative">
                    <UAvatar 
                      :src="match.awayTeam?.logoUrl || undefined" 
                      :alt="match.awayTeam?.customName || undefined" 
                      size="lg" 
                      class="ring-2 ring-gray-100 dark:ring-white/10 group-hover:ring-blue-500/30 transition-all duration-300"
                    />
                  </div>
                  <span class="font-bold text-sm text-center text-gray-800 dark:text-gray-200 truncate max-w-full leading-tight">
                    {{ match.awayTeam?.customName || match.awayTeamPlaceholder || 'TBD' }}
                  </span>
                </div>
              </div>

              <!-- Footer: Time + Venue -->
              <div class="mt-5 pt-3 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-gray-500">
                <div class="flex items-center gap-3 min-w-0">
                  <span v-if="match.startTime" class="flex items-center gap-1.5 shrink-0">
                    <UIcon name="i-heroicons-clock" class="w-3 h-3 text-gray-600" />
                    {{ formatMatchTime(match.startTime) }}
                  </span>
                  <span v-if="match.venue" class="flex items-center gap-1.5 truncate">
                    <UIcon name="i-heroicons-map-pin" class="w-3 h-3 text-gray-600 shrink-0" />
                    <span class="truncate">{{ match.venue }}</span>
                  </span>
                </div>
                <UIcon name="i-heroicons-arrow-right" class="w-4 h-4 text-blue-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-300 shrink-0" />
              </div>
            </div>
          </NuxtLink>
        </div>
      </section>

      <!-- Followed Tournaments Section -->
      <section v-if="authStore.isAuthenticated && (tournamentStore.followedTournaments.length > 0 || tournamentStore.followedLoading)" class="lg:hidden">
        <div class="flex items-center justify-between mb-8">
          <div class="flex items-center gap-3">
            <h2 class="text-2xl font-bold">Tournaments You Follow</h2>
            <UIcon name="i-heroicons-heart-solid" class="w-6 h-6 text-emerald-500" />
          </div>
        </div>

        <div v-if="tournamentStore.followedLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="i in 3" :key="i" class="h-[320px] bg-white/5 rounded-2xl animate-pulse"></div>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <NuxtLink
            v-for="tournament in tournamentStore.followedTournaments" 
            :key="tournament.id"
            :to="toTournament(tournament as any)"
            class="tournament-card group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-[#0A0A0A] transition-all duration-500 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1"
          >
            <!-- Banner -->
            <div class="relative h-44 overflow-hidden bg-gray-100 dark:bg-white/[0.03]">
              <img 
                v-if="tournament.bannerUrl" 
                :src="tournament.bannerUrl" 
                :alt="tournament.name"
                class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div v-else class="w-full h-full flex items-center justify-center">
                <span class="text-5xl font-black text-gray-200/60 dark:text-white/[0.04] tracking-widest uppercase select-none">
                  {{ tournament.sport.toUpperCase() }}
                </span>
              </div>

              <!-- Bottom fade -->
              <div class="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white dark:from-[#0A0A0A] to-transparent"></div>

              <!-- Sport pill -->
              <div class="absolute top-3 left-3">
                <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/10">
                  <div class="w-5 h-5 rounded-md overflow-hidden bg-emerald-500 flex items-center justify-center shrink-0">
                    <img v-if="tournament.logoUrl" :src="tournament.logoUrl" class="w-full h-full object-cover" />
                    <UIcon v-else name="i-heroicons-trophy" class="w-3 h-3 text-white" />
                  </div>
                  <span class="text-[10px] font-bold text-white/90 uppercase tracking-wider">{{ tournament.sport }}</span>
                </div>
              </div>

              <!-- Participants count pill -->
              <div class="absolute top-3 right-3">
                <div class="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 text-white/80">
                  <UIcon name="i-heroicons-users" class="w-3 h-3" />
                  <span class="text-[10px] font-bold">{{ tournament._count?.participants || 0 }}</span>
                </div>
              </div>
            </div>

            <!-- Content -->
            <div class="flex flex-col flex-1 px-5 pb-5 -mt-3 relative z-10">
              <h3 class="text-lg font-bold text-gray-900 dark:text-white group-hover:text-emerald-500 transition-colors line-clamp-1 mb-1.5">
                {{ tournament.name }}
              </h3>

              <p class="text-xs text-gray-500 dark:text-gray-500 line-clamp-2 mb-5 flex-1 leading-relaxed">
                {{ tournament.description || 'Follow this tournament for live updates and fixtures.' }}
              </p>

              <!-- Footer -->
              <div class="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-white/[0.05]">
                <div class="flex items-center gap-2">
                  <div v-if="tournament.organization?.logoUrl" class="w-5 h-5 rounded-md overflow-hidden bg-gray-100 dark:bg-white/5 shrink-0">
                    <img :src="tournament.organization.logoUrl" class="w-full h-full object-cover" />
                  </div>
                  <span class="text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-wider truncate max-w-[140px]">
                    {{ tournament.organization?.name || 'ParaScores' }}
                  </span>
                </div>

                <div class="flex items-center gap-1 text-emerald-500 text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <span>View</span>
                  <UIcon name="i-heroicons-arrow-right" class="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </NuxtLink>
        </div>
      </section>

      <!-- Trending Tournaments -->
      <section>
        <div class="flex items-center justify-between mb-8">
          <h2 class="text-2xl font-bold">Recommended Tournaments</h2>
          <UButton variant="link" color="neutral" :to="toMain('/explore')" icon="i-heroicons-magnifying-glass" class="text-sm">
            Explore
          </UButton>
        </div>

        <div v-if="loadingTrending" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="i in 3" :key="i" class="h-[320px] bg-white/5 rounded-2xl animate-pulse"></div>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <NuxtLink
            v-for="tournament in trendingTournaments" 
            :key="tournament.id"
            :to="toTournament(tournament)"
            class="tournament-card group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-[#0A0A0A] transition-all duration-500 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1"
          >
            <!-- Banner -->
            <div class="relative h-44 overflow-hidden bg-gray-100 dark:bg-white/[0.03]">
              <img 
                v-if="tournament.bannerUrl" 
                :src="tournament.bannerUrl" 
                :alt="tournament.name"
                class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div v-else class="w-full h-full flex items-center justify-center">
                <span class="text-5xl font-black text-gray-200/60 dark:text-white/[0.04] tracking-widest uppercase select-none">
                  {{ tournament.sport }}
                </span>
              </div>

              <!-- Bottom fade -->
              <div class="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white dark:from-[#0A0A0A] to-transparent"></div>

              <!-- Sport pill -->
              <div class="absolute top-3 left-3">
                <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/10">
                  <div class="w-5 h-5 rounded-md overflow-hidden bg-emerald-500 flex items-center justify-center shrink-0">
                    <img v-if="tournament.logoUrl" :src="tournament.logoUrl" class="w-full h-full object-cover" />
                    <UIcon v-else name="i-heroicons-trophy" class="w-3 h-3 text-white" />
                  </div>
                  <span class="text-[10px] font-bold text-white/90 uppercase tracking-wider">{{ tournament.sport }}</span>
                </div>
              </div>

              <!-- Participants count pill -->
              <div class="absolute top-3 right-3">
                <div class="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 text-white/80">
                  <UIcon name="i-heroicons-users" class="w-3 h-3" />
                  <span class="text-[10px] font-bold">{{ tournament._count?.participants || 0 }}</span>
                </div>
              </div>
            </div>

            <!-- Content -->
            <div class="flex flex-col flex-1 px-5 pb-5 -mt-3 relative z-10">
              <h3 class="text-lg font-bold text-gray-900 dark:text-white group-hover:text-emerald-500 transition-colors line-clamp-1 mb-1.5">
                {{ tournament.name }}
              </h3>

              <p class="text-xs text-gray-500 dark:text-gray-500 line-clamp-2 mb-5 flex-1 leading-relaxed">
                {{ tournament.description || 'No description available for this tournament.' }}
              </p>

              <!-- Footer -->
              <div class="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-white/[0.05]">
                <div class="flex items-center gap-2">
                  <div v-if="tournament.organization?.logoUrl" class="w-5 h-5 rounded-md overflow-hidden bg-gray-100 dark:bg-white/5 shrink-0">
                    <img :src="tournament.organization.logoUrl" class="w-full h-full object-cover" />
                  </div>
                  <span class="text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-wider truncate max-w-[140px]">
                    {{ tournament.organization?.name || 'ParaScores' }}
                  </span>
                </div>

                <div class="flex items-center gap-1 text-emerald-500 text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <span>View</span>
                  <UIcon name="i-heroicons-arrow-right" class="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </NuxtLink>
        </div>
      </section>

      <!-- Quick Actions / My Organizations Section -->
      <section v-if="authStore.isOrganizer">
        <div class="bg-white/[0.02] rounded-2xl p-8 border border-white/[0.05]">
          <div class="flex flex-col lg:flex-row items-center gap-8 text-center lg:text-left">
            <div class="p-6 rounded-2xl bg-white/5 border border-white/[0.05] shrink-0">
               <UIcon name="i-heroicons-rectangle-group" class="w-16 h-16 text-emerald-400" />
            </div>
            
            <div class="flex-1">
              <h2 class="text-2xl font-bold mb-2">Manage Your Workspace</h2>
              <p class="text-gray-400 text-lg">
                Quickly access your organizations, manage team invites, and update tournament settings.
              </p>
            </div>
            
            <div class="flex flex-wrap justify-center gap-4">
              <UButton 
                :to="toManage('/')" 
                color="success" 
                variant="solid" 
                size="lg" 
                class="px-8 rounded-xl font-bold"
              >
                 Dashboard
              </UButton>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import type { Tournament, Fixture } from '~/types'

const authStore = useAuthStore()
const tournamentStore = useTournamentStore()
const { toMain, toManage, toTournament } = useHost()

// Live Stream (SSE)
const { isConnected } = useLiveStream()

// State
const liveMatches = ref<Fixture[]>([])
const upcomingMatches = ref<Fixture[]>([])
const trendingTournaments = ref<Tournament[]>([])
const loadingLive = ref(false)
const loadingUpcoming = ref(false)
const loadingTrending = ref(false)

// Computed
const greetingTime = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
})

const userName = computed(() => {
  if (!authStore.user?.name) return 'Fan'
  return authStore.user.name.trim().split(/\s+/)[0]
})

// Filter live and upcoming to only followed tournaments
const followedIds = computed(() => new Set(tournamentStore.followedTournaments.map(t => t.id)))

const filteredLive = computed(() => {
  if (followedIds.value.size === 0) return []
  return liveMatches.value.filter(m => m.tournament_id && followedIds.value.has(m.tournament_id))
})

const filteredUpcoming = computed(() => {
  if (followedIds.value.size === 0) return []
  return upcomingMatches.value.filter(m => m.tournament_id && followedIds.value.has(m.tournament_id))
})

// Fetching
async function fetchLiveMatches() {
  loadingLive.value = true
  try {
    const res = await $publicApi<any>('/fixtures/live')
    liveMatches.value = res.data || []
  } catch (err) {
    console.error('Failed to fetch live matches:', err)
  } finally {
    loadingLive.value = false
  }
}

async function fetchUpcoming() {
  loadingUpcoming.value = true
  try {
    const res = await $publicApi<any>('/fixtures/upcoming?limit=8')
    upcomingMatches.value = res.data || []
  } catch (err) {
    console.error('Failed to fetch upcoming matches:', err)
  } finally {
    loadingUpcoming.value = false
  }
}

async function fetchTrendingTournaments() {
  loadingTrending.value = true
  try {
    const res = await $publicApi<any>('/tournaments/public?limit=3')
    trendingTournaments.value = res.data || []
  } catch (err) {
    console.error('Failed to fetch trending tournaments:', err)
  } finally {
    loadingTrending.value = false
  }
}

// Time ago helper
function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatCountdown(dateStr?: string | null) {
  if (!dateStr) return 'TBD'
  const diff = new Date(dateStr).getTime() - Date.now()
  if (diff <= 0) return 'Starting soon'
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `in ${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `in ${hours}h`
  const days = Math.floor(hours / 24)
  return `in ${days}d`
}

function formatMatchTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

// SSE: Listen for live match updates and hot-swap data
function handleLiveUpdate(event: Event) {
  const payload = (event as CustomEvent).detail
  if (!payload?.data) return

  const updatedFixture = payload.data as Fixture

  if (updatedFixture.status === 'LIVE') {
    // Update existing or add to live list
    const idx = liveMatches.value.findIndex((m) => m.id === updatedFixture.id)
    if (idx !== -1) {
      liveMatches.value[idx] = updatedFixture
    } else {
      liveMatches.value.unshift(updatedFixture)
    }
  } else if (updatedFixture.status === 'COMPLETED') {
    // Remove from live
    liveMatches.value = liveMatches.value.filter((m) => m.id !== updatedFixture.id)
  } else {
    // If status changed to something other than LIVE (e.g. CANCELLED), remove from live
    liveMatches.value = liveMatches.value.filter((m) => m.id !== updatedFixture.id)
  }
}

// Initial Load
onMounted(() => {
  fetchLiveMatches()
  fetchUpcoming()
  fetchTrendingTournaments()
  if (authStore.isAuthenticated && tournamentStore.followedTournaments.length === 0) {
    tournamentStore.fetchFollowedTournaments()
  }

  // Listen for SSE-dispatched events
  window.addEventListener('live-match-update', handleLiveUpdate)
})

onUnmounted(() => {
  window.removeEventListener('live-match-update', handleLiveUpdate)
})
</script>

<style scoped>
.bg-page {
  background-color: #0A0F1C;
}

.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

main > section {
  animation: fadeIn 0.8s ease-out forwards;
}

main > section:nth-child(2) {
  animation-delay: 0.1s;
}

main > section:nth-child(3) {
  animation-delay: 0.2s;
}
</style>
