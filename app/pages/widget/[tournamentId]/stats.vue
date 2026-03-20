<script setup lang="ts">
import { computed } from 'vue'
import type { Tournament, PlayerStatsResponse } from '~/types'

definePageMeta({
  layout: 'widget'
})

const route = useRoute()
const tournamentId = route.params.tournamentId as string

// Theme (injected from widget layout)
const isDark = inject<Ref<boolean>>('widgetIsDark', ref(true))

// State
const tournament = ref<Tournament | null>(null)
const stats = ref<PlayerStatsResponse | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// Calculate tied ranks logic
const addRanks = (items: any[]) => {
  if (!items) return []
  let currentRank = 1
  let currentCount = -1
  return items.map((item, index) => {
    if (item.count !== currentCount) {
      currentRank = index + 1
      currentCount = item.count
    }
    return { ...item, _rank: currentRank }
  })
}

const rankedScorers = computed(() => addRanks(stats.value?.topScorers || []).slice(0, 10))
const rankedAssists = computed(() => addRanks(stats.value?.topAssists || []).slice(0, 10))

// Fetch data
const fetchData = async () => {
  loading.value = true
  error.value = null
  try {
    // 1. Fetch tournament by ID or customName
    const tournamentRes = await $api<any>(`/tournaments/${tournamentId}`)
    tournament.value = tournamentRes.data
    
    // 2. Fetch stats using the internal ID we just got
    if (tournament.value?.id) {
      const statsRes = await $api<any>(`/tournaments/${tournament.value.id}/player-stats`)
      stats.value = statsRes.data || statsRes
    }
  } catch (e: any) {
    error.value = e.message || 'Failed to load player stats'
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
  <div class="p-4" :class="isDark ? 'text-white' : 'text-gray-900'">
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-12 text-red-500">
      <p class="text-sm font-medium">{{ error }}</p>
    </div>

    <!-- Content -->
    <div v-else-if="tournament" class="space-y-6">
      
      <!-- Tournament Header -->
      <div class="flex items-center gap-3 mb-6">
        <div class="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0" :class="isDark ? 'bg-gray-800' : 'bg-gray-100'">
          <img v-if="tournament?.logoUrl" :src="tournament.logoUrl" class="w-full h-full object-cover" />
          <div v-else class="w-full h-full flex items-center justify-center text-sm font-bold" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
            {{ (tournament?.name || 'T').charAt(0) }}
          </div>
        </div>
        <div>
          <h2 class="font-bold text-lg leading-tight">{{ tournament?.name }}</h2>
          <p class="text-xs" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
            Player Statistics
          </p>
        </div>
      </div>

      <div class="grid sm:grid-cols-2 gap-6">
        <!-- Top Scorers -->
        <div class="rounded-xl border p-4 sm:p-5" :class="isDark ? 'bg-gray-900/40 border-white/10' : 'bg-white border-gray-200'">
          <div class="flex items-center gap-3 mb-4 sm:mb-6">
            <div class="p-2 rounded-lg" :class="isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'">
              <UIcon name="i-mdi-soccer" class="w-5 h-5 text-emerald-500" />
            </div>
            <h3 class="font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">Top Scorers</h3>
          </div>
          
          <div v-if="!stats?.topScorers?.length" class="text-center py-8">
            <p class="text-xs" :class="isDark ? 'text-gray-500' : 'text-gray-400'">No goals recorded yet.</p>
          </div>
          
          <div v-else class="space-y-2">
            <div v-for="item in rankedScorers" :key="item.player.id" 
                 class="flex items-center gap-3 p-2.5 rounded-lg border transition-colors"
                 :class="isDark ? 'bg-gray-800/30 border-white/5 hover:bg-gray-800/50' : 'bg-gray-50 border-gray-100/50 hover:bg-gray-100'">
              <div class="w-7 h-7 rounded-full flex items-center justify-center font-semibold text-xs shrink-0" 
                   :class="item._rank === 1 ? (isDark ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30' : 'bg-amber-50 text-amber-600 ring-1 ring-amber-200') : 
                           item._rank === 2 ? (isDark ? 'bg-slate-300/20 text-slate-300 ring-1 ring-slate-300/30' : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200') : 
                           item._rank === 3 ? (isDark ? 'bg-amber-700/20 text-amber-600 ring-1 ring-amber-700/30' : 'bg-orange-50 text-orange-700 ring-1 ring-orange-200') : 
                           (isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500')">
                {{ item._rank }}
              </div>
              
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5">
                  <span class="font-medium text-sm truncate" :class="isDark ? 'text-gray-100' : 'text-gray-800'">{{ item.player.name }}</span>
                  <span v-if="item.player.number" class="text-[10px] font-mono" :class="isDark ? 'text-gray-500' : 'text-gray-400'">#{{ item.player.number }}</span>
                </div>
                <div class="flex items-center gap-1 mt-0.5">
                  <img v-if="item.teamLogoUrl" :src="item.teamLogoUrl" :alt="item.teamName" class="w-3.5 h-3.5 rounded-full object-cover shrink-0" :class="isDark ? 'bg-white/5' : 'bg-gray-100'" />
                  <div class="text-[11px] truncate" :class="isDark ? 'text-gray-500' : 'text-gray-500'">{{ item.teamName }}</div>
                </div>
              </div>
              
              <div class="text-lg font-bold tabular-nums" :class="isDark ? 'text-emerald-400' : 'text-emerald-600'">{{ item.count }}</div>
            </div>
          </div>
        </div>

        <!-- Top Assists -->
        <div class="rounded-xl border p-4 sm:p-5" :class="isDark ? 'bg-gray-900/40 border-white/10' : 'bg-white border-gray-200'">
          <div class="flex items-center gap-3 mb-4 sm:mb-6">
            <div class="p-2 rounded-lg" :class="isDark ? 'bg-cyan-500/10' : 'bg-cyan-50'">
              <UIcon name="i-mdi-shoe-cleat" class="w-5 h-5 -rotate-45 transform" :class="isDark ? 'text-cyan-400' : 'text-cyan-500'" />
            </div>
            <h3 class="font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">Top Assists</h3>
          </div>
          
          <div v-if="!stats?.topAssists?.length" class="text-center py-8">
            <p class="text-xs" :class="isDark ? 'text-gray-500' : 'text-gray-400'">No assists recorded yet.</p>
          </div>
          
          <div v-else class="space-y-2">
            <div v-for="item in rankedAssists" :key="item.player.id" 
                 class="flex items-center gap-3 p-2.5 rounded-lg border transition-colors"
                 :class="isDark ? 'bg-gray-800/30 border-white/5 hover:bg-gray-800/50' : 'bg-gray-50 border-gray-100/50 hover:bg-gray-100'">
              <div class="w-7 h-7 rounded-full flex items-center justify-center font-semibold text-xs shrink-0" 
                   :class="isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'">
                {{ item._rank }}
              </div>
              
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5">
                  <span class="font-medium text-sm truncate" :class="isDark ? 'text-gray-100' : 'text-gray-800'">{{ item.player.name }}</span>
                  <span v-if="item.player.number" class="text-[10px] font-mono" :class="isDark ? 'text-gray-500' : 'text-gray-400'">#{{ item.player.number }}</span>
                </div>
                <div class="flex items-center gap-1 mt-0.5">
                  <img v-if="item.teamLogoUrl" :src="item.teamLogoUrl" :alt="item.teamName" class="w-3.5 h-3.5 rounded-full object-cover shrink-0" :class="isDark ? 'bg-white/5' : 'bg-gray-100'" />
                  <div class="text-[11px] truncate" :class="isDark ? 'text-gray-500' : 'text-gray-500'">{{ item.teamName }}</div>
                </div>
              </div>
              
              <div class="text-lg font-bold tabular-nums" :class="isDark ? 'text-cyan-400' : 'text-cyan-600'">{{ item.count }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
