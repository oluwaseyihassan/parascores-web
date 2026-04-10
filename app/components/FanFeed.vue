<template>
  <div class="min-h-full text-white overflow-x-hidden">
    <!-- Hero Section -->
    <header class="relative pt-12 pb-16 px-6 overflow-hidden">
      <!-- Background Accents -->
      <div class="absolute top-0 left-1/4 w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-[120px] pointer-events-none"></div>
      <div class="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-white/[0.02] rounded-full blur-[100px] pointer-events-none"></div>

      <div class="max-w-7xl mx-auto relative z-10">
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 mb-4 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <span class="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              YOUR PERSONAL FEED
            </div>
            <h1 class="text-4xl md:text-5xl font-bold tracking-tight">
              Good {{ greetingTime }}, <span class="text-emerald-400">{{ userName }}</span>
            </h1>
            <p class="text-gray-400 mt-3 text-lg max-w-2xl">
              Stay updated with live scores, upcoming matches, and trending tournaments from the communities you follow.
            </p>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-6 pb-24 space-y-16">
      <!-- Live Now Section -->
      <section v-if="liveMatches.length > 0 || loadingLive">
        <div class="flex items-center justify-between mb-8">
          <div class="flex items-center gap-3">
            <h2 class="text-2xl font-bold">Live Now</h2>
            <span class="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-wider">
              <span class="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
              {{ liveMatches.length }} Active
            </span>
          </div>
          <UButton variant="link" color="neutral" :to="toMain('/explore')" icon="i-heroicons-arrow-right" class="text-sm">
            View All
          </UButton>
        </div>

        <div v-if="loadingLive" class="flex gap-6 overflow-x-auto pb-4 hide-scrollbar">
          <div v-for="i in 3" :key="i" class="min-w-[320px] h-[180px] bg-white/5 rounded-2xl animate-pulse"></div>
        </div>

        <div v-else class="flex gap-6 overflow-x-auto pb-4 hide-scrollbar snap-x">
          <FanFeedCard 
            v-for="match in liveMatches" 
            :key="match.id"
            class="min-w-[320px] md:min-w-[380px] snap-start"
          >
            <div class="flex flex-col h-full">
              <div class="flex items-center justify-between mb-4">
                <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{{ match.tournament?.name }}</span>
                <span class="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-black italic">LIVE</span>
              </div>
              
              <div class="flex-1 flex flex-col justify-center gap-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <UAvatar :src="match.homeTeam?.logoUrl || undefined" :alt="match.homeTeam?.customName || undefined" size="sm" />
                    <span class="font-bold text-sm truncate max-w-[120px]">{{ match.homeTeam?.customName || 'TBD' }}</span>
                  </div>
                  <span class="text-2xl font-black text-white">{{ match.homeScore ?? 0 }}</span>
                </div>
                
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <UAvatar :src="match.awayTeam?.logoUrl || undefined" :alt="match.awayTeam?.customName || undefined" size="sm" />
                    <span class="font-bold text-sm truncate max-w-[120px]">{{ match.awayTeam?.customName || 'TBD' }}</span>
                  </div>
                  <span class="text-2xl font-black text-white">{{ match.awayScore ?? 0 }}</span>
                </div>
              </div>
              
              <div class="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-400">
                <span>{{ match.venue || 'No Venue' }}</span>
                <UButton :to="toTournament(match.tournament as any)" variant="link" color="success" size="xs" class="font-bold p-0">
                  Follow Stats
                </UButton>
              </div>
            </div>
          </FanFeedCard>
          
          <div v-if="liveMatches.length === 0" class="w-full py-12 flex flex-col items-center justify-center border border-white/5 bg-white/2 rounded-2xl">
            <UIcon name="i-heroicons-clock" class="w-8 h-8 text-gray-600 mb-2" />
            <p class="text-gray-500 text-sm italic">No matches live at the moment</p>
          </div>
        </div>
      </section>

      <!-- Results Stream -->
      <section v-if="recentResults.length > 0 || loadingRecent">
        <div class="flex items-center justify-between mb-8">
          <div class="flex items-center gap-3">
            <h2 class="text-2xl font-bold">Results Stream</h2>
            <span class="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
              <UIcon name="i-heroicons-clock" class="w-3 h-3" />
              Recent
            </span>
          </div>
        </div>

        <div v-if="loadingRecent" class="space-y-4">
          <div v-for="i in 4" :key="i" class="h-[100px] bg-white/5 rounded-2xl animate-pulse"></div>
        </div>

        <div v-else class="space-y-3">
          <NuxtLink
            v-for="match in recentResults"
            :key="match.id"
            :to="toTournament(match.tournament as any)"
            class="group block bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] hover:border-emerald-500/20 rounded-2xl p-5 transition-all duration-300"
          >
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{{ match.tournament?.name }}</span>
                <span v-if="match.roundName" class="text-[10px] text-gray-600">&middot; {{ match.roundName }}</span>
              </div>
              <span class="px-2 py-0.5 rounded bg-gray-500/20 text-gray-400 text-[10px] font-black">FT</span>
            </div>

            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <UAvatar :src="match.homeTeam?.logoUrl || undefined" :alt="match.homeTeam?.customName || undefined" size="sm" />
                <span class="font-bold text-sm truncate" :class="[(match.homeScore ?? 0) > (match.awayScore ?? 0) ? 'text-white' : 'text-gray-400']">{{ match.homeTeam?.customName || 'TBD' }}</span>
              </div>
              <div class="flex items-center gap-2 px-4 shrink-0">
                <span class="text-2xl font-black" :class="[(match.homeScore ?? 0) > (match.awayScore ?? 0) ? 'text-white' : 'text-gray-500']">{{ match.homeScore ?? 0 }}</span>
                <span class="text-gray-600 text-sm font-bold">-</span>
                <span class="text-2xl font-black" :class="[(match.awayScore ?? 0) > (match.homeScore ?? 0) ? 'text-white' : 'text-gray-500']">{{ match.awayScore ?? 0 }}</span>
              </div>
              <div class="flex items-center gap-3 flex-1 min-w-0 justify-end">
                <span class="font-bold text-sm truncate" :class="[(match.awayScore ?? 0) > (match.homeScore ?? 0) ? 'text-white' : 'text-gray-400']">{{ match.awayTeam?.customName || 'TBD' }}</span>
                <UAvatar :src="match.awayTeam?.logoUrl || undefined" :alt="match.awayTeam?.customName || undefined" size="sm" />
              </div>
            </div>

            <div v-if="match.homePenaltyScore != null || match.awayPenaltyScore != null" class="mt-2 text-center">
              <span class="text-[10px] text-yellow-400 font-bold uppercase">Penalties: {{ match.homePenaltyScore }} - {{ match.awayPenaltyScore }}</span>
            </div>

            <div class="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-500">
              <span>{{ formatTimeAgo(match.updated_at) }}</span>
              <span class="text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold">View Tournament &rarr;</span>
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
          <div v-for="i in 3" :key="i" class="h-[240px] bg-white/5 rounded-2xl animate-pulse"></div>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FanFeedCard 
            v-for="tournament in tournamentStore.followedTournaments" 
            :key="tournament.id"
            class="flex flex-col"
          >
            <div class="aspect-video mb-4 rounded-xl overflow-hidden bg-white/5 relative">
               <img 
                 v-if="tournament.bannerUrl" 
                 :src="tournament.bannerUrl" 
                 class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
               />
               <div v-else class="w-full h-full flex items-center justify-center text-white/5 font-black text-4xl">
                 {{ tournament.sport.toUpperCase() }}
               </div>
               
               <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
               
               <div class="absolute bottom-3 left-3 flex items-center gap-2">
                 <div class="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center border border-white/20 shadow-lg">
                   <UIcon name="i-heroicons-trophy" class="w-5 h-5 text-white" />
                 </div>
                 <span class="text-xs font-bold text-white shadow-sm">{{ tournament.sport }}</span>
               </div>
            </div>

            <h3 class="text-lg font-bold group-hover:text-emerald-400 transition-colors line-clamp-1 mb-2">
              {{ tournament.name }}
            </h3>
            
            <p class="text-gray-400 text-xs line-clamp-2 mb-4 flex-1">
              {{ tournament.description || 'Follow this tournament for live updates and fixtures.' }}
            </p>
            
            <div class="flex items-center justify-between mt-auto">
              <div class="flex items-center gap-1.5 text-[10px] text-gray-500">
                <UIcon name="i-heroicons-users" class="w-3.5 h-3.5" />
                <span>{{ tournament._count?.participants || 0 }} Teams</span>
              </div>
              <UButton :to="toTournament(tournament)" color="neutral" variant="soft" size="xs" class="rounded-lg">
                View Tournament
              </UButton>
            </div>
          </FanFeedCard>
        </div>
      </section>

      <!-- Trending Tournaments -->
      <section>
        <div class="flex items-center justify-between mb-8">
          <h2 class="text-2xl font-bold">Recommended Tournaments</h2>
          <UButton variant="link" color="neutral" :to="toMain('/explore')" icon="i-heroicons-magnifying-glass" class="text-sm">
            Explore More
          </UButton>
        </div>

        <div v-if="loadingTrending" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="i in 3" :key="i" class="h-[240px] bg-white/5 rounded-2xl animate-pulse"></div>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FanFeedCard 
            v-for="tournament in trendingTournaments" 
            :key="tournament.id"
            class="flex flex-col"
          >
            <div class="aspect-video mb-4 rounded-xl overflow-hidden bg-white/5 relative">
               <img 
                 v-if="tournament.bannerUrl" 
                 :src="tournament.bannerUrl" 
                 class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
               />
               <div v-else class="w-full h-full flex items-center justify-center text-white/5 font-black text-4xl">
                 {{ tournament.sport.toUpperCase() }}
               </div>
               
               <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
               
               <div class="absolute bottom-3 left-3 flex items-center gap-2">
                 <div class="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center border border-white/20 shadow-lg">
                   <UIcon name="i-heroicons-trophy" class="w-5 h-5 text-white" />
                 </div>
                 <span class="text-xs font-bold text-white shadow-sm">{{ tournament.sport }}</span>
               </div>
            </div>

            <h3 class="text-lg font-bold group-hover:text-emerald-400 transition-colors line-clamp-1 mb-2">
              {{ tournament.name }}
            </h3>
            
            <p class="text-gray-400 text-xs line-clamp-2 mb-4 flex-1">
              {{ tournament.description || 'No description available for this tournament.' }}
            </p>
            
            <div class="flex items-center justify-between mt-auto">
              <div class="flex items-center gap-1.5 text-[10px] text-gray-500">
                <UIcon name="i-heroicons-users" class="w-3.5 h-3.5" />
                <span>{{ tournament._count?.participants || 0 }} Teams</span>
              </div>
              <UButton :to="toTournament(tournament)" color="neutral" variant="soft" size="xs" class="rounded-lg">
                View Tournament
              </UButton>
            </div>
          </FanFeedCard>
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
const recentResults = ref<Fixture[]>([])
const trendingTournaments = ref<Tournament[]>([])
const loadingLive = ref(false)
const loadingRecent = ref(false)
const loadingTrending = ref(false)

// Computed
const greetingTime = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
})

const userName = computed(() => authStore.user?.name || 'Fan')

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

async function fetchRecentResults() {
  loadingRecent.value = true
  try {
    const res = await $publicApi<any>('/fixtures/recent?limit=10')
    recentResults.value = res.data || []
  } catch (err) {
    console.error('Failed to fetch recent results:', err)
  } finally {
    loadingRecent.value = false
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
    // Remove from live, add to recent results
    liveMatches.value = liveMatches.value.filter((m) => m.id !== updatedFixture.id)
    recentResults.value.unshift(updatedFixture)
    if (recentResults.value.length > 10) recentResults.value.pop()
  } else {
    // If status changed to something other than LIVE (e.g. CANCELLED), remove from live
    liveMatches.value = liveMatches.value.filter((m) => m.id !== updatedFixture.id)
  }
}

// Initial Load
onMounted(() => {
  fetchLiveMatches()
  fetchRecentResults()
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
