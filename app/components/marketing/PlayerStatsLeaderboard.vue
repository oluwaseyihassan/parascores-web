<template>
  <div class="grid lg:grid-cols-2 gap-8">
    <!-- Top Scorers -->
    <div class="bg-gray-900/40 border border-white/5 rounded-2xl p-6">
      <div class="flex items-center gap-3 mb-6">
        <div class="p-2 bg-emerald-500/10 rounded-xl">
          <UIcon name="i-mdi-soccer" class="w-6 h-6 text-emerald-400" />
        </div>
        <h3 class="text-xl font-bold text-white tracking-tight">Top Scorers</h3>
      </div>
      
      <div v-if="loading" class="space-y-4">
        <USkeleton v-for="i in 5" :key="i" class="h-14 w-full bg-white/5 rounded-xl" />
      </div>
      <div v-else-if="!stats?.topScorers?.length" class="text-center py-12">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5 mb-4">
          <UIcon name="i-heroicons-no-symbol" class="w-6 h-6 text-gray-400" />
        </div>
        <h3 class="text-lg font-medium text-white mb-1">No Goal Events</h3>
        <p class="text-sm text-gray-400">Scores will appear here once goals are recorded.</p>
      </div>
      <div v-else class="space-y-3">
        <div v-for="item in rankedScorers" :key="item.player.id" 
             class="flex items-center gap-4 p-3 rounded-xl bg-gray-800/30 border border-white/5 hover:bg-gray-800/50 transition-colors">
          <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0" 
               :class="item._rank === 1 ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30' : 
                       item._rank === 2 ? 'bg-slate-300/20 text-slate-300 ring-1 ring-slate-300/30' : 
                       item._rank === 3 ? 'bg-amber-700/20 text-amber-600 ring-1 ring-amber-700/30' : 
                       'bg-white/5 text-gray-400'">
            {{ item._rank }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-white font-medium truncate">{{ item.player.name }}</span>
              <span v-if="item.player.number" class="text-xs text-gray-500 font-mono">#{{ item.player.number }}</span>
            </div>
            <div class="flex items-center gap-1.5 mt-0.5">
              <img v-if="item.teamLogoUrl" :src="item.teamLogoUrl" :alt="item.teamName" class="w-4 h-4 rounded-full object-cover bg-white/5" />
              <div v-else class="w-4 h-4 flex items-center justify-center rounded-full bg-white/5 text-[8px] font-bold text-gray-500 shrink-0">
                {{ item.teamName.charAt(0).toUpperCase() }}
              </div>
              <div class="text-xs text-gray-400 truncate">{{ item.teamName }}</div>
            </div>
          </div>
          <div class="text-xl font-bold text-emerald-400 tabular-nums">{{ item.count }}</div>
        </div>
      </div>
    </div>

    <!-- Top Assists -->
    <div class="bg-gray-900/40 border border-white/5 rounded-2xl p-6">
      <div class="flex items-center gap-3 mb-6">
        <div class="p-2 bg-cyan-500/10 rounded-xl">
          <UIcon name="i-mdi-shoe-cleat" class="w-6 h-6 text-cyan-400 -rotate-45 transform" />
        </div>
        <h3 class="text-xl font-bold text-white tracking-tight">Top Assists</h3>
      </div>
      
      <div v-if="loading" class="space-y-4">
        <USkeleton v-for="i in 5" :key="i" class="h-14 w-full bg-white/5 rounded-xl" />
      </div>
      <div v-else-if="!stats?.topAssists?.length" class="text-center py-12">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5 mb-4">
          <UIcon name="i-heroicons-no-symbol" class="w-6 h-6 text-gray-400" />
        </div>
        <h3 class="text-lg font-medium text-white mb-1">No Assist Events</h3>
        <p class="text-sm text-gray-400">Assists will appear here once recorded.</p>
      </div>
      <div v-else class="space-y-3">
        <div v-for="item in rankedAssists" :key="item.player.id" 
             class="flex items-center gap-4 p-3 rounded-xl bg-gray-800/30 border border-white/5 hover:bg-gray-800/50 transition-colors">
          <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 bg-white/5 text-gray-400">
            {{ item._rank }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-white font-medium truncate">{{ item.player.name }}</span>
              <span v-if="item.player.number" class="text-xs text-gray-500 font-mono">#{{ item.player.number }}</span>
            </div>
            <div class="flex items-center gap-1.5 mt-0.5">
              <img v-if="item.teamLogoUrl" :src="item.teamLogoUrl" :alt="item.teamName" class="w-4 h-4 rounded-full object-cover bg-white/5" />
              <div v-else class="w-4 h-4 flex items-center justify-center rounded-full bg-white/5 text-[8px] font-bold text-gray-500 shrink-0">
                {{ item.teamName.charAt(0).toUpperCase() }}
              </div>
              <div class="text-xs text-gray-400 truncate">{{ item.teamName }}</div>
            </div>
          </div>
          <div class="text-xl font-bold text-cyan-400 tabular-nums">{{ item.count }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PlayerStatsResponse } from '~/types'

const props = defineProps<{
  stats: PlayerStatsResponse | null
  loading: boolean
}>()

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

const rankedScorers = computed(() => addRanks(props.stats?.topScorers || []))
const rankedAssists = computed(() => addRanks(props.stats?.topAssists || []))
</script>
