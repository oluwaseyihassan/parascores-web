<script setup lang="ts">
import type { Tournament, Standing } from '~/types'

definePageMeta({
  layout: 'widget'
})

const route = useRoute()
const tournamentId = route.params.tournamentId as string

// Theme (injected from widget layout)
const isDark = inject<Ref<boolean>>('widgetIsDark', ref(true))

// State
const tournament = ref<Tournament | null>(null)
const standings = ref<Standing[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

// Group standings by group name
const groupedStandings = computed(() => {
  const grouped: Record<string, Standing[]> = {}
  
  standings.value.forEach(standing => {
    const group = standing.group || 'default'
    if (!grouped[group]) grouped[group] = []
    grouped[group].push(standing)
  })
  
  // Sort each group by position
  Object.keys(grouped).forEach(key => {
    grouped[key]!.sort((a, b) => (a.position || 0) - (b.position || 0))
  })
  
  return grouped
})

const groupNames = computed(() => Object.keys(groupedStandings.value))
const hasMultipleGroups = computed(() => groupNames.value.length > 1 || (groupNames.value.length === 1 && groupNames.value[0] !== 'default'))

// Fetch data
const fetchData = async () => {
  loading.value = true
  error.value = null
  try {
    const [tournamentRes, standingsRes] = await Promise.all([
      $api<any>(`/tournaments/${tournamentId}`),
      $api<any>(`/standings/tournament/${tournamentId}`)
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
})
</script>

<template>
  <div class="p-4 text-xs">
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-12 text-red-400">
      <p class="text-xs">{{ error }}</p>
    </div>

    <!-- Content -->
    <div v-else>
      <!-- Tournament Header -->
      <div class="flex items-center gap-3 mb-5">
        <div class="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0" :class="isDark ? 'bg-gray-800' : 'bg-gray-100'">
          <img v-if="tournament?.logoUrl" :src="tournament.logoUrl" class="w-full h-full object-cover" />
          <div v-else class="w-full h-full flex items-center justify-center text-xs font-bold" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
            {{ (tournament?.name || 'T').charAt(0) }}
          </div>
        </div>
        <div>
          <h2 class="font-bold text-sm leading-tight text-gray-900 dark:text-white">{{ tournament?.name }}</h2>
          <p class="text-[10px]" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
            Standings
          </p>
        </div>
      </div>

      <!-- Grouped Standings -->
      <div v-if="standings.length > 0" class="space-y-5">
        <div v-for="groupName in groupNames" :key="groupName">
          <!-- Group Header -->
          <div v-if="hasMultipleGroups" class="flex items-center gap-1.5 mb-2">
            <div class="w-0.5 h-3 rounded-full bg-indigo-500"></div>
            <h3 class="text-[11px] font-bold uppercase tracking-wider" :class="isDark ? 'text-gray-200' : 'text-gray-700'">
              {{ groupName === 'default' ? 'Standings' : groupName }}
            </h3>
          </div>

          <!-- Standings Table -->
          <div class="rounded-lg border overflow-hidden" :class="isDark ? 'border-white/10' : 'border-gray-200'">
            <div class="overflow-x-auto w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <table class="w-full text-[11px]">
                <thead>
                  <tr :class="isDark ? 'bg-gray-900 text-gray-400' : 'bg-gray-50 text-gray-500'" class="border-b dark:border-white/5 border-gray-100">
                    <th class="py-1.5 px-2 text-center w-8 font-semibold text-[10px] whitespace-nowrap shrink-0">#</th>
                    <th class="py-1.5 px-2 text-left font-semibold text-[10px] w-full min-w-[120px] sm:min-w-[160px]">Team</th>
                    <th class="py-1.5 px-2 text-center w-8 font-semibold text-[10px] whitespace-nowrap shrink-0">P</th>
                    <th class="py-1.5 px-2 text-center w-8 font-semibold text-[10px] whitespace-nowrap shrink-0">W</th>
                    <th class="py-1.5 px-2 text-center w-8 font-semibold text-[10px] whitespace-nowrap shrink-0">D</th>
                    <th class="py-1.5 px-2 text-center w-8 font-semibold text-[10px] whitespace-nowrap shrink-0">L</th>
                    <th class="py-1.5 px-2 text-center w-10 font-semibold text-[10px] whitespace-nowrap shrink-0">GD</th>
                    <th class="py-1.5 px-2 text-center w-10 font-bold text-[10px] whitespace-nowrap shrink-0">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  <tr 
                    v-for="(standing, index) in groupedStandings[groupName]" 
                    :key="standing.id || index"
                    class="border-t transition-colors"
                    :class="isDark ? 'border-white/5 hover:bg-gray-900/50' : 'border-gray-100 hover:bg-gray-50'"
                  >
                    <td class="py-2 px-2 text-center whitespace-nowrap shrink-0">
                       <div 
                        class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium mx-auto"
                        :class="[
                          (standing.position || index + 1) <= 4 
                            ? (isDark ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-100 text-indigo-700')
                            : (isDark ? 'text-gray-500' : 'text-gray-400')
                        ]"
                      >
                        {{ standing.position || index + 1 }}
                      </div>
                    </td>
                    <td class="py-2 px-2 w-full min-w-[120px] sm:min-w-[160px]">
                      <div class="flex items-center gap-2">
                        <div class="w-4.5 h-4.5 rounded-full overflow-hidden flex-shrink-0" :class="isDark ? 'bg-gray-800' : 'bg-gray-100'">
                          <img v-if="standing.participant?.logoUrl" :src="standing.participant.logoUrl" class="w-full h-full object-cover" />
                          <span v-else class="flex items-center justify-center w-full h-full text-[7px] font-bold">
                            {{ (standing.participant?.customName || 'T').charAt(0).toUpperCase() }}
                          </span>
                        </div>
                        <span class="font-medium truncate max-w-[90px] sm:max-w-[160px]">
                          {{ standing.participant?.customName || standing.participant?.user?.name || 'Unknown' }}
                        </span>
                      </div>
                    </td>
                    <td class="py-2 px-2 text-center whitespace-nowrap shrink-0" :class="isDark ? 'text-gray-300' : 'text-gray-600'">{{ standing.played }}</td>
                    <td class="py-2 px-2 text-center whitespace-nowrap shrink-0" :class="isDark ? 'text-gray-300' : 'text-gray-600'">{{ standing.wins }}</td>
                    <td class="py-2 px-2 text-center whitespace-nowrap shrink-0" :class="isDark ? 'text-gray-300' : 'text-gray-600'">{{ standing.draws }}</td>
                    <td class="py-2 px-2 text-center whitespace-nowrap shrink-0" :class="isDark ? 'text-gray-300' : 'text-gray-600'">{{ standing.losses }}</td>
                    <td class="py-2 px-2 text-center whitespace-nowrap shrink-0">
                      <span :class="[
                         standing.goalDiff > 0 ? 'text-green-500' : standing.goalDiff < 0 ? 'text-red-500' : (isDark ? 'text-gray-500' : 'text-gray-400')
                      ]">
                        {{ standing.goalDiff > 0 ? `+${standing.goalDiff}` : standing.goalDiff }}
                      </span>
                    </td>
                    <td class="py-2 px-2 text-center font-bold whitespace-nowrap shrink-0">{{ standing.points }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="text-center py-12">
        <p class="text-xs" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
          {{ tournament?.type === 'FRIENDLY' || tournament?.type === 'KNOCKOUT' ? 'Standings are not supported for this tournament type.' : 'No standings available yet.' }}
        </p>
      </div>
    </div>
  </div>
</template>
