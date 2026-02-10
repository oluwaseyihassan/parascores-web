<script setup lang="ts">
import type { Tournament, Standing } from '~/types'

definePageMeta({
  layout: 'widget'
})

const route = useRoute()
const tournamentId = route.params.tournamentId as string
const theme = (route.query.theme as string) || 'dark'

// State
const tournament = ref<Tournament | null>(null)
const standings = ref<Standing[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

// Fetch data
const fetchData = async () => {
  loading.value = true
  error.value = null
  try {
    const [tournamentRes, standingsRes] = await Promise.all([
      $api<any>(`/tournaments/${tournamentId}`),
      $api<any>(`/tournaments/${tournamentId}/standings`)
    ])
    tournament.value = tournamentRes.data
    // Handle both direct array and nested { standings: [...] } response
    const standingsData = standingsRes.data as any
    standings.value = Array.isArray(standingsData) ? standingsData : (standingsData?.standings || [])
  } catch (e: any) {
    error.value = e.message || 'Failed to load standings'
    console.error('Widget error:', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
  // Auto-refresh every 60 seconds
  const interval = setInterval(fetchData, 60000)
  onUnmounted(() => clearInterval(interval))
})
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
            Standings
          </p>
        </div>
      </div>

      <!-- Standings Table -->
      <div v-if="standings.length > 0" class="rounded-lg border overflow-hidden" :class="theme === 'light' ? 'border-gray-200' : 'border-white/10'">
        <table class="w-full text-sm">
          <thead>
            <tr :class="theme === 'light' ? 'bg-gray-50 text-gray-500' : 'bg-gray-900 text-gray-400'">
              <th class="py-2 px-3 text-center w-10 font-medium text-xs">#</th>
              <th class="py-2 px-3 text-left font-medium text-xs">Team</th>
              <th class="py-2 px-2 text-center w-10 font-medium text-xs">P</th>
              <th class="py-2 px-2 text-center w-10 font-medium text-xs hidden sm:table-cell">W</th>
              <th class="py-2 px-2 text-center w-10 font-medium text-xs hidden sm:table-cell">D</th>
              <th class="py-2 px-2 text-center w-10 font-medium text-xs hidden sm:table-cell">L</th>
              <th class="py-2 px-2 text-center w-12 font-medium text-xs hidden md:table-cell">GD</th>
              <th class="py-2 px-3 text-center w-12 font-bold text-xs">Pts</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="(standing, index) in standings" 
              :key="standing.id || index"
              class="border-t transition-colors"
              :class="theme === 'light' ? 'border-gray-100 hover:bg-gray-50' : 'border-white/5 hover:bg-gray-900/50'"
            >
              <td class="py-2.5 px-3 text-center">
                <div 
                  class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mx-auto"
                  :class="[
                    (standing.position || index + 1) <= 4 
                      ? (theme === 'light' ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-900/30 text-indigo-400')
                      : (theme === 'light' ? 'text-gray-400' : 'text-gray-500')
                  ]"
                >
                  {{ standing.position || index + 1 }}
                </div>
              </td>
              <td class="py-2.5 px-3">
                <div class="flex items-center gap-2">
                  <div class="w-5 h-5 rounded-full overflow-hidden flex-shrink-0" :class="theme === 'light' ? 'bg-gray-100' : 'bg-gray-800'">
                    <img v-if="standing.participant?.logoUrl" :src="standing.participant.logoUrl" class="w-full h-full object-cover" />
                    <span v-else class="flex items-center justify-center w-full h-full text-[8px] font-bold">
                      {{ (standing.participant?.customName || 'T').charAt(0).toUpperCase() }}
                    </span>
                  </div>
                  <span class="font-medium truncate max-w-[120px] sm:max-w-[180px]">
                    {{ standing.participant?.customName || standing.participant?.user?.name || 'Unknown' }}
                  </span>
                </div>
              </td>
              <td class="py-2.5 px-2 text-center" :class="theme === 'light' ? 'text-gray-600' : 'text-gray-300'">{{ standing.played }}</td>
              <td class="py-2.5 px-2 text-center hidden sm:table-cell" :class="theme === 'light' ? 'text-gray-600' : 'text-gray-300'">{{ standing.wins }}</td>
              <td class="py-2.5 px-2 text-center hidden sm:table-cell" :class="theme === 'light' ? 'text-gray-600' : 'text-gray-300'">{{ standing.draws }}</td>
              <td class="py-2.5 px-2 text-center hidden sm:table-cell" :class="theme === 'light' ? 'text-gray-600' : 'text-gray-300'">{{ standing.losses }}</td>
              <td class="py-2.5 px-2 text-center hidden md:table-cell">
                <span :class="[
                  standing.goalDiff > 0 ? 'text-green-500' : standing.goalDiff < 0 ? 'text-red-500' : (theme === 'light' ? 'text-gray-400' : 'text-gray-500')
                ]">
                  {{ standing.goalDiff > 0 ? `+${standing.goalDiff}` : standing.goalDiff }}
                </span>
              </td>
              <td class="py-2.5 px-3 text-center font-bold">{{ standing.points }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty state -->
      <div v-else class="text-center py-12">
        <p class="text-sm" :class="theme === 'light' ? 'text-gray-400' : 'text-gray-500'">No standings available yet.</p>
      </div>
    </div>
  </div>
</template>
