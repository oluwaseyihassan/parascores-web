<script setup lang="ts">
import { storeToRefs } from 'pinia'

definePageMeta({
  layout: 'dashboard'
})

const tournamentStore = useTournamentStore()
const authStore = useAuthStore()
const { tournaments, loading, pagination, hasMore, totalCount } = storeToRefs(tournamentStore)

// Fetch tournaments on mount
onMounted(async () => {
  await tournamentStore.fetchTournaments()
})

// Format date helper
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

// Get tournament type badge color
const getTypeBadgeColor = (type: string) => {
  switch (type) {
    case 'KNOCKOUT': return 'red'
    case 'LEAGUE': return 'blue'
    case 'ROUND_ROBIN': return 'green'
    default: return 'gray'
  }
}

// Get visibility icon
const getVisibilityIcon = (visibility: string) => {
  switch (visibility) {
    case 'PUBLIC': return 'i-heroicons-globe-alt'
    case 'PRIVATE': return 'i-heroicons-lock-closed'
    case 'UNLISTED': return 'i-heroicons-eye-slash'
    default: return 'i-heroicons-globe-alt'
  }
}

const PLACEHOLDER_LOGO = 'https://res.cloudinary.com/djsnerfzp/image/upload/v1769695792/parascores_logo_placeholder.png'
const PLACEHOLDER_BANNER = 'https://res.cloudinary.com/djsnerfzp/image/upload/v1769696842/parascores_banner_placeholder.png'

// Infinite Scroll
const loadMoreTrigger = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

onMounted(() => {
  observer = new IntersectionObserver((entries) => {
    const entry = entries[0]
    if (entry && entry.isIntersecting && hasMore.value && !loading.value) {
      tournamentStore.loadMore()
    }
  }, {
    rootMargin: '100px' // Trigger slightly before reaching the bottom
  })
  
  if (loadMoreTrigger.value) {
    observer.observe(loadMoreTrigger.value)
  }
})

onUnmounted(() => {
  if (observer) {
    observer.disconnect()
  }
})

// Watch for trigger element availability (e.g. if list changes from empty to having items)
watch(loadMoreTrigger, (el) => {
  if (el && observer) {
    observer.disconnect()
    observer.observe(el)
  }
})
</script>

<template>
  <div>
    <!-- Welcome Message -->
    <div class="mb-6">
      <h2 class="text-lg text-gray-500 dark:text-gray-400">
        Welcome back, <span class="text-emerald-500 font-medium">{{ authStore.user?.name || 'there' }}</span>
      </h2>
    </div>

    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">My Tournaments</h1>
        <p class="text-gray-500">Manage your leagues, cups, and competitions</p>
      </div>
      <UButton 
        label="Create Tournament" 
        icon="i-heroicons-plus"
        color="primary" 
        size="lg"
        to="/tournaments/new"
      />
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">Total Tournaments</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ totalCount }}</p>
          </div>
          <div class="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
            <UIcon name="i-heroicons-trophy" class="w-6 h-6 text-indigo-500" />
          </div>
        </div>
      </UCard>
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">Active</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ tournaments.filter(t => new Date(t.end_date) >= new Date()).length }}
            </p>
          </div>
          <div class="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <UIcon name="i-heroicons-play" class="w-6 h-6 text-green-500" />
          </div>
        </div>
      </UCard>
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">Completed</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ tournaments.filter(t => new Date(t.end_date) < new Date()).length }}
            </p>
          </div>
          <div class="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <UIcon name="i-heroicons-check-circle" class="w-6 h-6 text-gray-500" />
          </div>
        </div>
      </UCard>
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">Public</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ tournaments.filter(t => t.visibility === 'PUBLIC').length }}
            </p>
          </div>
          <div class="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <UIcon name="i-heroicons-globe-alt" class="w-6 h-6 text-blue-500" />
          </div>
        </div>
      </UCard>
    </div>

    <!-- Loading State -->
    <div v-if="loading && tournaments.length === 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <UCard v-for="i in 6" :key="i" class="animate-pulse">
        <div class="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
        <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      </UCard>
    </div>

    <!-- Empty State -->
    <UCard 
      v-else-if="!loading && tournaments.length === 0" 
      class="flex flex-col items-center justify-center py-16 text-center"
    >
      <div class="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mb-6">
        <UIcon name="i-heroicons-trophy" class="w-10 h-10 text-indigo-500" />
      </div>
      <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">No tournaments yet</h3>
      <p class="text-gray-500 max-w-md mx-auto mb-8">
        Create your first tournament to start managing leagues, cups, and competitions. 
        Add teams, schedule fixtures, and track scores all in one place.
      </p>
      <UButton 
        label="Create Your First Tournament" 
        icon="i-heroicons-plus"
        color="primary" 
        size="xl"
        to="/tournaments/new"
      />
    </UCard>

    <!-- Tournaments Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <NuxtLink 
        v-for="tournament in tournaments" 
        :key="tournament.id" 
        :to="`/tournaments/${tournament.id}`"
        class="group"
      >
        <UCard class="h-full transition-all duration-200 hover:shadow-lg hover:border-indigo-500/50 dark:hover:border-indigo-400/50">
          <!-- Tournament Banner/Logo -->
          <div class="relative h-32 -mx-4 -mt-4 mb-4 rounded-t-lg overflow-hidden">
            <img 
              :src="tournament.bannerUrl || PLACEHOLDER_BANNER" 
              :alt="tournament.name"
              class="w-full h-full object-cover opacity-70"
            />
            <div class="absolute inset-0 bg-black/50"></div>
            <div class="absolute bottom-3 left-4 right-4 flex items-end justify-between">
              <div 
                class="w-12 h-12 rounded-lg shadow-lg overflow-hidden"
              >
                <img :src="tournament.logoUrl || PLACEHOLDER_LOGO" :alt="tournament.name" class="w-full h-full object-cover" />
              </div>
              <UBadge size="sm" variant="solid">
                {{ tournament.type.replace('_', ' ') }}
              </UBadge>
            </div>
          </div>

          <!-- Tournament Info -->
          <div>
            <div class="flex items-start justify-between gap-2 mb-2">
              <h3 class="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-500 transition-colors line-clamp-1">
                {{ tournament.name }}
              </h3>
              <UIcon 
                :name="getVisibilityIcon(tournament.visibility)" 
                class="w-4 h-4 text-gray-400 shrink-0 mt-1"
                :title="tournament.visibility"
              />
            </div>
            
            <p v-if="tournament.description" class="text-sm text-gray-500 line-clamp-2 mb-3">
              {{ tournament.description }}
            </p>

            <div class="flex items-center gap-4 text-xs text-gray-400">
              <div class="flex items-center gap-1">
                <UIcon name="i-heroicons-calendar" class="w-3.5 h-3.5" />
                <span>{{ formatDate(tournament.start_date) }}</span>
              </div>
              <div class="flex items-center gap-1">
                <UIcon name="i-heroicons-map-pin" class="w-3.5 h-3.5" />
                <span>{{ tournament.location || tournament.sport }}</span>
              </div>
            </div>
          </div>
        </UCard>
      </NuxtLink>
    </div>


    <!-- Infinite Scroll Trigger -->
    <div ref="loadMoreTrigger" class="py-8 flex justify-center">
      <div v-if="loading && hasMore" class="flex flex-col items-center text-gray-400">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin mb-2" />
        <span class="text-sm">Loading more...</span>
      </div>
    </div>
  </div>
</template>