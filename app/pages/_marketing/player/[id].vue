<script setup lang="ts">
import type { Player } from '~/types'
import type { ApiResponse } from '~/stores/auth'

definePageMeta({
  layout: 'default'
})

const route = useRoute()
const playerId = route.params.id as string

const player = ref<Player | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const response = await $publicApi<ApiResponse<Player>>(`/players/${playerId}`)
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
  <div class="max-w-3xl mx-auto px-4 py-12">
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <UIcon name="i-heroicons-arrow-path" class="w-10 h-10 animate-spin text-gray-400" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-20">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <UIcon name="i-heroicons-x-circle" class="w-8 h-8 text-red-500" />
      </div>
      <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Player Not Found</h2>
      <p class="text-gray-500 mb-6">{{ error }}</p>
      <UButton to="/" variant="outline" color="neutral">Go Home</UButton>
    </div>

    <!-- Player Profile -->
    <div v-else-if="player">
      <!-- Profile Header -->
      <div class="flex flex-col items-center text-center mb-8">
        <!-- Avatar -->
        <div class="w-24 h-24 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 mb-4 ring-4 ring-white dark:ring-gray-900 shadow-xl flex items-center justify-center">
          <img
            v-if="player.avatarUrl"
            :src="player.avatarUrl"
            :alt="player.name"
            class="w-full h-full object-cover"
          />
          <span v-else class="text-3xl font-bold text-gray-400">
            {{ player.name.charAt(0).toUpperCase() }}
          </span>
        </div>

        <!-- Name & Number -->
        <div class="flex items-center gap-3 mb-2">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ player.name }}
          </h1>
          <span
            v-if="player.number"
            class="text-lg font-bold px-2.5 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
          >
            #{{ player.number }}
          </span>
        </div>

        <!-- Position Badge -->
        <UBadge
          v-if="player.position"
          :color="getPositionColor(player.position) as any"
          variant="subtle"
          size="lg"
        >
          {{ getPositionLabel(player.position) }}
        </UBadge>
      </div>

      <!-- Stats Cards -->
      <div v-if="player.matchEvents?.length" class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <UCard class="text-center">
          <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ statsFromEvents.goals }}</p>
          <p class="text-xs text-gray-500 mt-1">Goals</p>
        </UCard>
        <UCard class="text-center">
          <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ statsFromEvents.assists }}</p>
          <p class="text-xs text-gray-500 mt-1">Assists</p>
        </UCard>
        <UCard class="text-center">
          <p class="text-2xl font-bold text-amber-500">{{ statsFromEvents.yellowCards }}</p>
          <p class="text-xs text-gray-500 mt-1">Yellow Cards</p>
        </UCard>
        <UCard class="text-center">
          <p class="text-2xl font-bold text-red-500">{{ statsFromEvents.redCards }}</p>
          <p class="text-xs text-gray-500 mt-1">Red Cards</p>
        </UCard>
      </div>

      <!-- Tournament Info -->
      <UCard v-if="player.participant?.tournament">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-trophy" class="w-5 h-5 text-indigo-500" />
            <span class="font-medium">Tournament</span>
          </div>
        </template>
        <NuxtLink
          :to="`/t/${player.participant.tournament.id}`"
          class="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors p-2 -m-2"
        >
          <div
            v-if="player.participant.tournament.logoUrl"
            class="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0"
          >
            <img :src="player.participant.tournament.logoUrl" class="w-full h-full object-cover" />
          </div>
          <div>
            <p class="font-medium text-gray-900 dark:text-white">
              {{ player.participant.tournament.name }}
            </p>
            <p class="text-xs text-gray-500">
              Team: {{ player.participant.customName || 'Unknown' }}
            </p>
          </div>
          <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-400 ml-auto" />
        </NuxtLink>
      </UCard>
    </div>
  </div>
</template>
