<script setup lang="ts">
import type { Player } from '~/types'
import type { ApiResponse } from '~/stores/auth'

definePageMeta({
  layout: 'feed'
})

const { toMain } = useHost()
const route = useRoute()
const playerId = route.params.id as string

const player = ref<any | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// Theme
const colorMode = useColorMode()

onMounted(async () => {
  try {
    const response = await $publicApi<{success: boolean, data: any}>(`/players/${playerId}`)
    if (response.data) {
      player.value = response.data
    }
  } catch (err: any) {
    error.value = err?.data?.message || err?.message || 'Player not found'
  } finally {
    loading.value = false
  }
})

const getPositionLabel = (pos: string | null | undefined) => {
  const map: Record<string, string> = {
    GK: 'Goalkeeper',
    DEF: 'Defender',
    MID: 'Midfielder',
    FWD: 'Forward',
  }
  return pos ? map[pos] || pos : 'Unknown'
}

const getPositionColor = (pos: string | null | undefined): string => {
  const map: Record<string, string> = {
    GK: 'warning',
    DEF: 'info',
    MID: 'success',
    FWD: 'error',
  }
  return pos ? map[pos] || 'neutral' : 'neutral'
}

// Count stats from match events
const statsFromEvents = computed(() => {
  if (!player.value?.matchEvents) return { goals: 0, assists: 0, yellowCards: 0, redCards: 0 }

  let goals = 0, assists = 0, yellowCards = 0, redCards = 0
  for (const event of player.value.matchEvents) {
    if (event.type === 'GOAL') goals++
    if (event.type === 'PENALTY') goals++
    if (event.type === 'ASSIST') assists++
    if (event.type === 'YELLOW_CARD') yellowCards++
    if (event.type === 'RED_CARD') redCards++
  }
  return { goals, assists, yellowCards, redCards }
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-12 flex justify-center">
    <!-- Container -->
    <div class="w-full max-w-lg">
      
      <!-- Loading -->
      <div v-if="loading" class="bg-gray-50 dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#333] rounded-3xl p-20 flex flex-col items-center justify-center transition-colors">
        <div class="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p class="text-[11px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest">Loading Profile</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="bg-white dark:bg-[#1A1A1A] border border-red-500/20 p-12 rounded-3xl text-center shadow-xl transition-colors">
        <UIcon name="i-heroicons-exclamation-circle" class="w-12 h-12 text-red-500 mb-4 mx-auto" />
        <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Error</h2>
        <p class="text-gray-600 dark:text-gray-400 mb-6 font-medium">{{ error }}</p>
        <UButton :to="toMain('/explore')" color="neutral" variant="outline" class="rounded-xl border-gray-200 dark:border-[#333] font-bold">Go Back</UButton>
      </div>

      <!-- Player Profile Card (Normal) -->
      <div v-else-if="player" class="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A] rounded-[2.5rem] shadow-2xl overflow-hidden transition-colors">
        
        <!-- Header -->
        <div class="px-8 pt-10 pb-6 flex flex-col items-center text-center">
          <div class="w-28 h-28 rounded-full overflow-hidden bg-gray-50 dark:bg-[#222] border-4 border-white dark:border-[#1A1A1A] ring-1 ring-gray-100 dark:ring-[#333] mb-4 shadow-xl transition-colors">
            <img v-if="player.avatarUrl" :src="player.avatarUrl" class="w-full h-full object-cover" />
            <div v-else class="w-full h-full flex items-center justify-center text-4xl font-black text-gray-300 dark:text-gray-600 uppercase">
              {{ player.name.charAt(0) }}
            </div>
          </div>

          <h1 class="text-3xl font-black text-gray-900 dark:text-white mb-2 flex items-center gap-2 tracking-tight">
            {{ player.name }}
            <span v-if="player.number" class="text-emerald-500 dark:text-emerald-400">#{{ player.number }}</span>
          </h1>
          <p class="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">
            {{ getPositionLabel(player.position) }}
          </p>
        </div>

        <!-- Stats Bar -->
        <div class="px-8 pb-8">
          <div class="grid grid-cols-4 gap-3 bg-gray-50 dark:bg-[#222] p-2 rounded-2xl border border-gray-100 dark:border-[#333] transition-colors">
            <div v-for="(val, label) in statsFromEvents" :key="label" class="text-center py-4 rounded-xl bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A] shadow-sm transition-all">
              <span class="block text-xl font-black text-gray-900 dark:text-white">{{ val }}</span>
              <span class="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{{ label.replace('Cards', '') }}</span>
            </div>
          </div>
        </div>

        <!-- Content Area -->
        <div class="px-8 pb-8 space-y-6 max-h-[400px] overflow-y-auto custom-scrollbar">
          
          <!-- Current Event -->
          <div v-if="player.participant?.tournament">
            <h3 class="text-[10px] font-black text-gray-400 dark:text-gray-500 mb-3 px-1 uppercase tracking-widest">Active Tournament</h3>
            <NuxtLink
              :to="`/t/${player.participant.tournament.customName || player.participant.tournament.id}`"
              class="flex items-center gap-4 p-4 bg-gray-50 dark:bg-[#222] border border-gray-100 dark:border-[#333] hover:border-emerald-500 dark:hover:border-emerald-500/50 rounded-2xl group transition-all"
            >
              <div class="w-12 h-12 rounded-xl bg-white border border-gray-100 dark:border-[#222] p-1 shrink-0 overflow-hidden">
                <img v-if="player.participant.tournament.logoUrl" :src="player.participant.tournament.logoUrl" class="w-full h-full object-contain" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-gray-900 dark:text-white truncate">{{ player.participant.tournament.name }}</p>
                <p class="text-[10px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest">{{ player.participant.customName || 'Individual' }}</p>
              </div>
              <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-300 dark:text-gray-700 group-hover:text-emerald-500" />
            </NuxtLink>
          </div>

          <!-- History -->
          <div v-if="player.user?.player_profiles?.length && player.user.player_profiles.length > 1">
            <h3 class="text-[10px] font-black text-gray-400 dark:text-gray-500 mb-3 px-1 uppercase tracking-widest">Career Records</h3>
            <div class="space-y-2">
              <template v-for="profile in player.user.player_profiles" :key="profile.id">
                <NuxtLink
                  v-if="profile.id !== player.id"
                  :to="`/player/${profile.id}`"
                  class="flex items-center gap-3 p-3 bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#2A2A2A] hover:bg-gray-50 dark:hover:bg-[#222] rounded-xl transition-all group"
                >
                  <div class="w-8 h-8 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-[#333] flex items-center justify-center shrink-0">
                    <img v-if="profile.participant?.tournament?.logoUrl" :src="profile.participant.tournament.logoUrl" class="w-full h-full object-contain p-1" />
                    <UIcon v-else name="i-heroicons-archive-box" class="w-4 h-4 text-gray-300 dark:text-gray-700" />
                  </div>
                  <div class="flex-1 min-w-0 text-[11px]">
                    <p class="font-bold text-gray-700 dark:text-gray-300 truncate group-hover:text-emerald-500 transition-colors">{{ profile.participant?.tournament?.name }}</p>
                    <p class="text-[10px] text-gray-400 dark:text-gray-600 font-bold">{{ profile.participant?.customName }} <span v-if="profile.number">• #{{ profile.number }}</span></p>
                  </div>
                  <UIcon name="i-heroicons-chevron-right" class="w-3 h-3 text-gray-200 dark:text-gray-800 group-hover:text-emerald-500 transition-colors" />
                </NuxtLink>
              </template>
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div class="p-6 bg-gray-50 dark:bg-[#181818] border-t border-gray-100 dark:border-[#2A2A2A] flex items-center justify-between transition-colors">
          <div class="flex items-center gap-2 grayscale opacity-50 dark:opacity-30">
            <div class="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center text-[10px] font-black text-white">P</div>
            <span class="text-[10px] font-black uppercase tracking-widest text-gray-500 leading-none">ParaScores</span>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 10px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: #333;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #d1d5db;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #444;
}
</style>
