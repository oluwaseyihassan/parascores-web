<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'

definePageMeta({
  auth: false,
  layout: 'feed'
})

const route = useRoute()
const teamId = route.params.id as string

const loading = ref(true)
const error = ref<string | null>(null)
const team = ref<any>(null)

onMounted(async () => {
  try {
    const response = await $publicApi<{success: boolean, data: any}>(`/teams/public/${teamId}`)
    if (!response.success) {
      throw new Error('Data load unsuccessful')
    }
    team.value = response.data
  } catch (err: any) {
    console.error('Public Team API Error:', err)
    error.value = err.data?.message || err.message || 'Failed to load team profile'
  } finally {
    loading.value = false
  }
})

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric'
  })
}

const stats = computed(() => {
  if (!team.value?.participants) return { played: 0, wins: 0, goals: 0 }
  return team.value.participants.reduce((acc: any, p: any) => {
    const s = p.standings?.[0]
    if (s) {
      acc.played += s.played || 0
      acc.wins += s.wins || 0
      acc.goals += s.goalsFor || 0
    }
    return acc
  }, { played: 0, wins: 0, goals: 0 })
})
</script>

<template>
  <div class="max-w-3xl mx-auto py-10 px-4 sm:px-6 min-h-screen">
    <!-- Loading -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-24">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-emerald-500 mb-3" />
      <p class="text-sm text-gray-400">Loading team profile...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-24">
      <div class="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <UIcon name="i-heroicons-exclamation-triangle" class="w-7 h-7 text-red-500" />
      </div>
      <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-1">{{ error }}</h2>
      <p class="text-sm text-gray-500 mb-6">The team profile could not be loaded.</p>
      <UButton to="/explore" variant="soft" color="neutral" size="sm" class="rounded-lg">Explore Tournaments</UButton>
    </div>

    <!-- Team Profile -->
    <div v-else-if="team">
      <!-- Hero Card -->
      <div class="relative bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.06] p-8 mb-10 overflow-hidden">
        <!-- Subtle gradient accent -->
        <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500"></div>

        <div class="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <!-- Avatar -->
          <div class="shrink-0">
            <div class="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 dark:bg-white/[0.06] ring-1 ring-gray-200 dark:ring-white/[0.08]">
              <img v-if="team.logoUrl" :src="team.logoUrl" :alt="team.name" class="w-full h-full object-cover" />
              <div v-else class="w-full h-full flex items-center justify-center text-2xl font-black text-gray-400 dark:text-gray-600">
                {{ team.name?.charAt(0)?.toUpperCase() }}
              </div>
            </div>
          </div>

          <!-- Info -->
          <div class="flex-1 text-center sm:text-left min-w-0">
            <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white truncate">
              {{ team.name }}
            </h1>
            <div class="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-2 text-xs text-gray-500">
              <span class="flex items-center gap-1.5">
                <UIcon name="i-heroicons-calendar-days" class="w-3.5 h-3.5 text-gray-400" />
                Since {{ formatDate(team.created_at) }}
              </span>
              <span class="flex items-center gap-1.5">
                <UIcon name="i-heroicons-trophy" class="w-3.5 h-3.5 text-gray-400" />
                {{ team.participants?.length || 0 }} tournaments
              </span>
            </div>

            <!-- Stats Row -->
            <div class="flex items-center justify-center sm:justify-start gap-3 mt-5">
              <div class="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06]">
                <span class="text-lg font-bold text-gray-900 dark:text-white">{{ stats.played }}</span>
                <span class="text-[10px] font-semibold uppercase tracking-wider text-gray-400">played</span>
              </div>
              <div class="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/[0.06] border border-emerald-100 dark:border-emerald-500/[0.12]">
                <span class="text-lg font-bold text-emerald-600 dark:text-emerald-400">{{ stats.wins }}</span>
                <span class="text-[10px] font-semibold uppercase tracking-wider text-emerald-500/70">wins</span>
              </div>
              <div class="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/[0.06] border border-indigo-100 dark:border-indigo-500/[0.12]">
                <span class="text-lg font-bold text-indigo-600 dark:text-indigo-400">{{ stats.goals }}</span>
                <span class="text-[10px] font-semibold uppercase tracking-wider text-indigo-500/70">goals</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tournament History -->
      <div>
        <div class="flex items-center justify-between mb-5 px-1">
          <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Tournament History</h2>
          <span class="text-xs text-gray-400">{{ team.participants?.length || 0 }} total</span>
        </div>

        <div v-if="!team.participants || team.participants.length === 0" class="py-14 text-center rounded-2xl border border-dashed border-gray-200 dark:border-white/[0.06]">
          <UIcon name="i-heroicons-trophy" class="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p class="text-sm text-gray-500">No tournament records yet.</p>
        </div>

        <div v-else class="space-y-2.5">
          <NuxtLink 
            v-for="p in team.participants" 
            :key="p.id"
            :to="`/t/${p.tournament.customName || p.tournament.id}`"
            class="group flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.05] hover:border-emerald-300 dark:hover:border-emerald-500/30 hover:shadow-sm transition-all"
          >
            <!-- Tournament Logo -->
            <div class="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/[0.06] shrink-0 ring-1 ring-gray-200/50 dark:ring-white/[0.06]">
              <img v-if="p.tournament.logoUrl" :src="p.tournament.logoUrl" :alt="p.tournament.name" class="w-full h-full object-cover" />
              <div v-else class="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400 dark:text-gray-600">
                {{ p.tournament.name?.charAt(0)?.toUpperCase() }}
              </div>
            </div>
            
            <!-- Tournament Info -->
            <div class="flex-1 min-w-0">
              <h4 class="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {{ p.tournament.name }}
              </h4>
              <div class="flex items-center gap-2.5 mt-0.5">
                <span class="text-xs text-gray-400">{{ formatDate(p.tournament.start_date) }}</span>
                <span class="text-[8px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 font-semibold uppercase tracking-wider">
                  {{ p.tournament.sport }}
                </span>
              </div>
            </div>

            <!-- Results -->
            <div v-if="p.standings?.[0]" class="hidden sm:flex items-center gap-3 text-xs">
              <span class="text-gray-500">{{ p.standings[0].played }}P</span>
              <span class="font-semibold text-emerald-600 dark:text-emerald-400">{{ p.standings[0].wins }}W</span>
              <span class="font-bold text-gray-900 dark:text-white">{{ p.standings[0].points }}pts</span>
            </div>

            <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-emerald-500 shrink-0 transition-colors" />
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
