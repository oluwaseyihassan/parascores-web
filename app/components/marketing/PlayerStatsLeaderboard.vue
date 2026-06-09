<template>
  <div class="grid lg:grid-cols-2 gap-8">
    <!-- Top Scorers -->
    <div class="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/[0.06] shadow-sm rounded-2xl p-6 transition-colors">
      <div class="flex items-center gap-3 mb-6">
        <div class="p-2 bg-gray-100 dark:bg-white/5 rounded-xl">
          <UIcon name="i-mdi-soccer" class="w-6 h-6 text-gray-500 dark:text-gray-400" />
        </div>
        <h3 class="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Top Scorers</h3>
      </div>
      
      <div v-if="loading" class="space-y-4">
        <USkeleton v-for="i in 5" :key="i" class="h-14 w-full bg-white/5 rounded-xl" />
      </div>
      <div v-else-if="!stats?.topScorers?.length" class="text-center py-12">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 mb-4">
          <UIcon name="i-heroicons-no-symbol" class="w-6 h-6 text-gray-400" />
        </div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-1">No Goal Events</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">Scores will appear here once goals are recorded.</p>
      </div>
      <div v-else class="space-y-3">
        <NuxtLink v-for="item in rankedScorers" :key="item.player.id" 
             :to="toMain(`/player/${item.player.id}`)"
             :external="isManage"
             class="flex items-center gap-4 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-colors overflow-hidden">
          <div class="w-6 flex items-center justify-center font-bold text-sm shrink-0 text-gray-500 dark:text-gray-400">
            {{ item._rank }}
          </div>
          <!-- Player Avatar -->
          <div class="w-8 h-8 rounded-full overflow-hidden bg-gray-100 dark:bg-white/5 shrink-0 border border-gray-200 dark:border-white/10 flex items-center justify-center">
            <img v-if="item.player.avatarUrl" :src="item.player.avatarUrl" class="w-full h-full object-cover" />
            <div v-else class="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400 uppercase">
              {{ item.player.name.charAt(0) }}
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5 min-w-0">
              <span class="text-gray-900 dark:text-white font-medium truncate">{{ item.player.name }}</span>
              <UIcon
                v-if="item.player.userId && item.player.status === 'APPROVED'"
                name="i-heroicons-check-badge-solid"
                class="w-3.5 h-3.5 text-blue-500 shrink-0"
                title="Claimed & Verified Player"
              />
              <span v-if="item.player.number" class="text-xs text-gray-500 font-mono flex-shrink-0">#{{ item.player.number }}</span>
            </div>
            <div class="flex items-center gap-1.5 mt-0.5">
              <img v-if="item.teamLogoUrl" :src="item.teamLogoUrl" :alt="item.teamName" class="w-4 h-4 rounded-full object-cover bg-gray-100 dark:bg-white/5" />
              <div v-else class="w-4 h-4 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 text-[8px] font-bold text-gray-400 shrink-0">
                {{ item.teamName.charAt(0).toUpperCase() }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ item.teamName }}</div>
            </div>
          </div>
          <div class="text-xl font-bold text-gray-900 dark:text-white tabular-nums">{{ item.count }}</div>
        </NuxtLink>
      </div>
    </div>

    <!-- Top Assists -->
    <div class="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/[0.06] shadow-sm rounded-2xl p-6 transition-colors">
      <div class="flex items-center gap-3 mb-6">
        <div class="p-2 bg-gray-100 dark:bg-white/5 rounded-xl">
          <UIcon name="i-mdi-shoe-cleat" class="w-6 h-6 text-gray-500 dark:text-gray-400 -rotate-45 transform" />
        </div>
        <h3 class="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Top Assists</h3>
      </div>
      
      <div v-if="loading" class="space-y-4">
        <USkeleton v-for="i in 5" :key="i" class="h-14 w-full bg-white/5 rounded-xl" />
      </div>
      <div v-else-if="!stats?.topAssists?.length" class="text-center py-12">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 mb-4">
          <UIcon name="i-heroicons-no-symbol" class="w-6 h-6 text-gray-400" />
        </div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-1">No Assist Events</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">Assists will appear here once recorded.</p>
      </div>
      <div v-else class="space-y-3">
        <NuxtLink v-for="item in rankedAssists" :key="item.player.id" 
             :to="toMain(`/player/${item.player.id}`)"
             :external="isManage"
             class="flex items-center gap-4 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-colors overflow-hidden">
          <div class="w-6 flex items-center justify-center font-bold text-sm shrink-0 text-gray-500 dark:text-gray-400">
            {{ item._rank }}
          </div>
          <!-- Player Avatar -->
          <div class="w-8 h-8 rounded-full overflow-hidden bg-gray-100 dark:bg-white/5 shrink-0 border border-gray-200 dark:border-white/10 flex items-center justify-center">
            <img v-if="item.player.avatarUrl" :src="item.player.avatarUrl" class="w-full h-full object-cover" />
            <div v-else class="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400 uppercase">
              {{ item.player.name.charAt(0) }}
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5 min-w-0">
              <span class="text-gray-900 dark:text-white font-medium truncate">{{ item.player.name }}</span>
              <UIcon
                v-if="item.player.userId && item.player.status === 'APPROVED'"
                name="i-heroicons-check-badge-solid"
                class="w-3.5 h-3.5 text-blue-500 shrink-0"
                title="Claimed & Verified Player"
              />
              <span v-if="item.player.number" class="text-xs text-gray-500 font-mono flex-shrink-0">#{{ item.player.number }}</span>
            </div>
            <div class="flex items-center gap-1.5 mt-0.5">
              <img v-if="item.teamLogoUrl" :src="item.teamLogoUrl" :alt="item.teamName" class="w-4 h-4 rounded-full object-cover bg-gray-100 dark:bg-white/5" />
              <div v-else class="w-4 h-4 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 text-[8px] font-bold text-gray-400 shrink-0">
                {{ item.teamName.charAt(0).toUpperCase() }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ item.teamName }}</div>
            </div>
          </div>
          <div class="text-xl font-bold text-gray-900 dark:text-white tabular-nums">{{ item.count }}</div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PlayerStatsResponse } from '~/types'

const { toMain, isManage } = useHost()

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
