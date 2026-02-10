<script setup lang="ts">
import type { Tournament, Fixture } from '~/types'
import { FixtureStatus } from '~/types'

definePageMeta({
  layout: 'widget'
})

const route = useRoute()
const tournamentId = route.params.tournamentId as string
const theme = (route.query.theme as string) || 'dark'
const limit = parseInt(route.query.limit as string) || 20

// State
const tournament = ref<Tournament | null>(null)
const fixtures = ref<Fixture[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

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
    fixtures.value = (fixturesRes.data || []).slice(0, limit)
  } catch (e: any) {
    error.value = e.message || 'Failed to load tournament data'
    console.error('Widget error:', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
  // Auto-refresh every 30 seconds for live data
  const interval = setInterval(fetchData, 30000)
  onUnmounted(() => clearInterval(interval))
})

// Fixture status helpers
const statusColors: Record<string, string> = {
  SCHEDULED: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  LIVE: 'text-red-400 bg-red-500/10 border-red-500/20',
  COMPLETED: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  CANCELLED: 'text-gray-400 bg-gray-500/10 border-gray-500/20'
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Group fixtures by status
const liveFixtures = computed(() => fixtures.value.filter(f => f.status === FixtureStatus.LIVE))
const scheduledFixtures = computed(() => fixtures.value.filter(f => f.status === FixtureStatus.SCHEDULED))
const completedFixtures = computed(() => fixtures.value.filter(f => f.status === FixtureStatus.COMPLETED))
</script>

<template>
  <div :class="theme === 'light' ? 'bg-white text-gray-900' : 'bg-gray-950 text-gray-100'" class="min-h-screen p-4">
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
        <div class="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0" :class="theme === 'light' ? 'bg-gray-100' : 'bg-gray-800'">
          <img v-if="tournament?.logoUrl" :src="tournament.logoUrl" class="w-full h-full object-cover" />
          <div v-else class="w-full h-full flex items-center justify-center text-sm font-bold" :class="theme === 'light' ? 'text-gray-400' : 'text-gray-500'">
            {{ (tournament?.name || 'T').charAt(0) }}
          </div>
        </div>
        <div>
          <h2 class="font-bold text-lg leading-tight">{{ tournament?.name }}</h2>
          <p class="text-xs" :class="theme === 'light' ? 'text-gray-500' : 'text-gray-400'">
            {{ tournament?.type?.replace('_', ' ') }} • {{ fixtures.length }} fixtures
          </p>
        </div>
      </div>

      <!-- Live Fixtures -->
      <div v-if="liveFixtures.length > 0" class="mb-6">
        <h3 class="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
          <span class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          Live Now
        </h3>
        <div class="space-y-2">
          <div 
            v-for="fixture in liveFixtures" 
            :key="fixture.id"
            class="rounded-lg border p-3"
            :class="theme === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-gray-900 border-white/10'"
          >
            <div class="flex items-center justify-between">
              <div class="flex-1 flex items-center gap-2">
                <div class="w-6 h-6 rounded-full overflow-hidden flex-shrink-0" :class="theme === 'light' ? 'bg-gray-200' : 'bg-gray-800'">
                  <img v-if="fixture.homeTeam?.logoUrl" :src="fixture.homeTeam.logoUrl" class="w-full h-full object-cover" />
                  <span v-else class="flex items-center justify-center w-full h-full text-[10px] font-bold">{{ (fixture.homeTeam?.customName || 'H').charAt(0) }}</span>
                </div>
                <span class="text-sm font-medium truncate max-w-[100px]">{{ fixture.homeTeam?.customName || 'TBD' }}</span>
              </div>
              <div class="flex items-center gap-3 px-4">
                <span class="text-xl font-bold min-w-[1.5rem] text-center">{{ fixture.homeScore ?? 0 }}</span>
                <span class="text-xs" :class="theme === 'light' ? 'text-gray-400' : 'text-gray-500'">-</span>
                <span class="text-xl font-bold min-w-[1.5rem] text-center">{{ fixture.awayScore ?? 0 }}</span>
              </div>
              <div class="flex-1 flex items-center gap-2 justify-end">
                <span class="text-sm font-medium truncate max-w-[100px] text-right">{{ fixture.awayTeam?.customName || 'TBD' }}</span>
                <div class="w-6 h-6 rounded-full overflow-hidden flex-shrink-0" :class="theme === 'light' ? 'bg-gray-200' : 'bg-gray-800'">
                  <img v-if="fixture.awayTeam?.logoUrl" :src="fixture.awayTeam.logoUrl" class="w-full h-full object-cover" />
                  <span v-else class="flex items-center justify-center w-full h-full text-[10px] font-bold">{{ (fixture.awayTeam?.customName || 'A').charAt(0) }}</span>
                </div>
              </div>
            </div>
            <div class="flex items-center justify-center mt-2">
              <span class="text-[10px] font-medium px-2 py-0.5 rounded-full border" :class="statusColors['LIVE']">
                ● LIVE
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Scheduled Fixtures -->
      <div v-if="scheduledFixtures.length > 0" class="mb-6">
        <h3 class="text-xs font-semibold uppercase tracking-wider mb-3" :class="theme === 'light' ? 'text-gray-500' : 'text-gray-400'">
          Upcoming
        </h3>
        <div class="space-y-2">
          <div 
            v-for="fixture in scheduledFixtures" 
            :key="fixture.id"
            class="rounded-lg border p-3"
            :class="theme === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-gray-900 border-white/10'"
          >
            <div class="flex items-center justify-between">
              <div class="flex-1 flex items-center gap-2">
                <div class="w-6 h-6 rounded-full overflow-hidden flex-shrink-0" :class="theme === 'light' ? 'bg-gray-200' : 'bg-gray-800'">
                  <img v-if="fixture.homeTeam?.logoUrl" :src="fixture.homeTeam.logoUrl" class="w-full h-full object-cover" />
                  <span v-else class="flex items-center justify-center w-full h-full text-[10px] font-bold">{{ (fixture.homeTeam?.customName || 'H').charAt(0) }}</span>
                </div>
                <span class="text-sm font-medium truncate max-w-[100px]">{{ fixture.homeTeam?.customName || 'TBD' }}</span>
              </div>
              <div class="px-4 text-center">
                <span class="text-xs" :class="theme === 'light' ? 'text-gray-400' : 'text-gray-500'">vs</span>
              </div>
              <div class="flex-1 flex items-center gap-2 justify-end">
                <span class="text-sm font-medium truncate max-w-[100px] text-right">{{ fixture.awayTeam?.customName || 'TBD' }}</span>
                <div class="w-6 h-6 rounded-full overflow-hidden flex-shrink-0" :class="theme === 'light' ? 'bg-gray-200' : 'bg-gray-800'">
                  <img v-if="fixture.awayTeam?.logoUrl" :src="fixture.awayTeam.logoUrl" class="w-full h-full object-cover" />
                  <span v-else class="flex items-center justify-center w-full h-full text-[10px] font-bold">{{ (fixture.awayTeam?.customName || 'A').charAt(0) }}</span>
                </div>
              </div>
            </div>
            <div v-if="fixture.startTime" class="text-center mt-2">
              <span class="text-[10px]" :class="theme === 'light' ? 'text-gray-400' : 'text-gray-500'">
                {{ formatDate(fixture.startTime) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Completed Fixtures -->
      <div v-if="completedFixtures.length > 0">
        <h3 class="text-xs font-semibold uppercase tracking-wider mb-3" :class="theme === 'light' ? 'text-gray-500' : 'text-gray-400'">
          Completed
        </h3>
        <div class="space-y-2">
          <div 
            v-for="fixture in completedFixtures" 
            :key="fixture.id"
            class="rounded-lg border p-3"
            :class="theme === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-gray-900 border-white/10'"
          >
            <div class="flex items-center justify-between">
              <div class="flex-1 flex items-center gap-2">
                <div class="w-6 h-6 rounded-full overflow-hidden flex-shrink-0" :class="theme === 'light' ? 'bg-gray-200' : 'bg-gray-800'">
                  <img v-if="fixture.homeTeam?.logoUrl" :src="fixture.homeTeam.logoUrl" class="w-full h-full object-cover" />
                  <span v-else class="flex items-center justify-center w-full h-full text-[10px] font-bold">{{ (fixture.homeTeam?.customName || 'H').charAt(0) }}</span>
                </div>
                <span class="text-sm font-medium truncate max-w-[100px]">{{ fixture.homeTeam?.customName || 'TBD' }}</span>
              </div>
              <div class="flex items-center gap-3 px-4">
                <span class="text-xl font-bold min-w-[1.5rem] text-center">{{ fixture.homeScore ?? 0 }}</span>
                <span class="text-xs" :class="theme === 'light' ? 'text-gray-400' : 'text-gray-500'">-</span>
                <span class="text-xl font-bold min-w-[1.5rem] text-center">{{ fixture.awayScore ?? 0 }}</span>
              </div>
              <div class="flex-1 flex items-center gap-2 justify-end">
                <span class="text-sm font-medium truncate max-w-[100px] text-right">{{ fixture.awayTeam?.customName || 'TBD' }}</span>
                <div class="w-6 h-6 rounded-full overflow-hidden flex-shrink-0" :class="theme === 'light' ? 'bg-gray-200' : 'bg-gray-800'">
                  <img v-if="fixture.awayTeam?.logoUrl" :src="fixture.awayTeam.logoUrl" class="w-full h-full object-cover" />
                  <span v-else class="flex items-center justify-center w-full h-full text-[10px] font-bold">{{ (fixture.awayTeam?.customName || 'A').charAt(0) }}</span>
                </div>
              </div>
            </div>
            <div class="flex items-center justify-center mt-2">
              <span class="text-[10px] font-medium px-2 py-0.5 rounded-full border" :class="statusColors['COMPLETED']">
                FT
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="fixtures.length === 0" class="text-center py-12">
        <p class="text-sm" :class="theme === 'light' ? 'text-gray-400' : 'text-gray-500'">No fixtures found for this tournament.</p>
      </div>
    </div>
  </div>
</template>
