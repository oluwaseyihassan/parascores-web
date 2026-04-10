<script setup lang="ts">
import type { Player } from '~/types'
import type { ApiResponse } from '~/stores/auth'

definePageMeta({
  layout: false
})

const { toMain } = useHost()
const route = useRoute()
const playerId = route.params.id as string

const player = ref<any | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// Theme
const isDark = true

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
  <div class="min-h-screen bg-[#0F0F0F] text-gray-200 font-sans flex items-center justify-center p-4">
    <!-- Simple Exit Button -->
    <div class="fixed top-8 right-8 z-50">
      <UButton
        :to="toMain('/explore')"
        icon="i-heroicons-x-mark"
        color="neutral"
        variant="ghost"
        class="rounded-full bg-[#1A1A1A] hover:bg-[#252525] border border-[#333]"
      />
    </div>

    <!-- Container -->
    <div class="w-full max-w-lg">
      
      <!-- Loading -->
      <div v-if="loading" class="bg-[#1A1A1A] border border-[#333] rounded-3xl p-20 flex flex-col items-center justify-center">
        <div class="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p class="text-sm text-gray-500 font-bold uppercase tracking-wider">Loading Profile</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="bg-[#1A1A1A] border border-red-500/20 p-12 rounded-3xl text-center">
        <UIcon name="i-heroicons-exclamation-circle" class="w-12 h-12 text-red-500 mb-4" />
        <h2 class="text-xl font-bold text-white mb-2">Error</h2>
        <p class="text-gray-400 mb-6">{{ error }}</p>
        <UButton :to="toMain('/explore')" color="neutral" variant="outline" class="rounded-xl border-[#333]">Go Back</UButton>
      </div>

      <!-- Player Profile Card (Normal) -->
      <div v-else-if="player" class="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[2rem] shadow-2xl overflow-hidden">
        
        <!-- Header -->
        <div class="p-8 pb-6 flex flex-col items-center text-center">
          <div class="w-28 h-28 rounded-full overflow-hidden bg-[#222] border-4 border-[#1A1A1A] ring-1 ring-[#333] mb-4 shadow-xl">
            <img v-if="player.avatarUrl" :src="player.avatarUrl" class="w-full h-full object-cover" />
            <div v-else class="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-600">
              {{ player.name.charAt(0) }}
            </div>
          </div>

          <h1 class="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            {{ player.name }}
            <span v-if="player.number" class="text-indigo-500">#{{ player.number }}</span>
          </h1>
          <p class="text-sm font-semibold text-gray-500 uppercase tracking-widest">
            {{ getPositionLabel(player.position) }}
          </p>
        </div>

        <!-- Stats Bar -->
        <div class="px-8 pb-8">
          <div class="grid grid-cols-4 gap-2 bg-[#222] p-2 rounded-2xl border border-[#333]">
            <div v-for="(val, label) in statsFromEvents" :key="label" class="text-center py-3 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A]">
              <span class="block text-lg font-bold text-white">{{ val }}</span>
              <span class="text-[9px] font-bold text-gray-600 uppercase tracking-tighter">{{ label.replace('Cards', '') }}</span>
            </div>
          </div>
        </div>

        <!-- Content Area -->
        <div class="px-8 pb-8 space-y-6 max-h-[400px] overflow-y-auto custom-scrollbar">
          
          <!-- Current Event -->
          <div v-if="player.participant?.tournament">
            <h3 class="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em] mb-3 px-1">Active Tournament</h3>
            <NuxtLink
              :to="`/t/${player.participant.tournament.customName || player.participant.tournament.id}`"
              class="flex items-center gap-4 p-4 bg-[#222] border border-[#333] hover:border-indigo-500/50 rounded-2xl group transition-all"
            >
              <div class="w-12 h-12 rounded-xl bg-white border border-[#222] p-1 shrink-0 overflow-hidden">
                <img v-if="player.participant.tournament.logoUrl" :src="player.participant.tournament.logoUrl" class="w-full h-full object-contain" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-white truncate">{{ player.participant.tournament.name }}</p>
                <p class="text-[11px] text-gray-500 font-bold uppercase tracking-wider">{{ player.participant.customName || 'Individual' }}</p>
              </div>
              <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-700 group-hover:text-indigo-500" />
            </NuxtLink>
          </div>

          <!-- History -->
          <div v-if="player.user?.player_profiles?.length && player.user.player_profiles.length > 1">
            <h3 class="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em] mb-3 px-1">Career Records</h3>
            <div class="space-y-2">
              <template v-for="profile in player.user.player_profiles" :key="profile.id">
                <NuxtLink
                  v-if="profile.id !== player.id"
                  :to="`/player/${profile.id}`"
                  class="flex items-center gap-3 p-3 bg-[#1A1A1A] border border-[#2A2A2A] hover:bg-[#222] rounded-xl transition-colors group"
                >
                  <div class="w-8 h-8 rounded-lg bg-white/5 border border-[#333] flex items-center justify-center shrink-0">
                    <img v-if="profile.participant?.tournament?.logoUrl" :src="profile.participant.tournament.logoUrl" class="w-full h-full object-contain p-1" />
                    <UIcon v-else name="i-heroicons-archive-box" class="w-4 h-4 text-gray-700" />
                  </div>
                  <div class="flex-1 min-w-0 text-xs">
                    <p class="font-bold text-gray-300 truncate group-hover:text-white">{{ profile.participant?.tournament?.name }}</p>
                    <p class="text-[10px] text-gray-600">{{ profile.participant?.customName }} <span v-if="profile.number">• #{{ profile.number }}</span></p>
                  </div>
                  <UIcon name="i-heroicons-chevron-right" class="w-3 h-3 text-gray-800" />
                </NuxtLink>
              </template>
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div class="p-6 bg-[#181818] border-t border-[#2A2A2A] flex items-center justify-between">
          <div class="flex items-center gap-2 grayscale opacity-50">
            <div class="w-6 h-6 rounded bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-black">P</div>
            <span class="text-[10px] font-bold uppercase tracking-widest text-gray-500 leading-none">ParaScores</span>
          </div>
          <span class="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Verified Profile</span>
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
  background: #333;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #444;
}
</style>
