<script setup lang="ts">
import { storeToRefs } from 'pinia'

definePageMeta({
  layout: 'dashboard'
})

const tournamentStore = useTournamentStore()
const authStore = useAuthStore()
const { tournaments, loading, pagination, hasMore, totalCount } = storeToRefs(tournamentStore)

// View mode state
const viewMode = useCookie<'grid' | 'list'>('tournament-view-mode', { default: () => 'grid' })

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

function getTypeBadgeStyle(type: string) {
  switch (type) {
    case 'KNOCKOUT': return 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30'
    case 'ROUND_ROBIN': return 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30'
    case 'GROUP': return 'bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30'
    case 'HYBRID': return 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30'
    case 'FRIENDLY': return 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30'
    default: return 'bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-500/30'
  }
}

function getBannerGradient(type: string, index: number) {
  const gradients: Record<string, string[]> = {
    KNOCKOUT: [
      'linear-gradient(135deg, #1a0a0a 0%, #4a1525 40%, #2d0a1a 100%)',
      'linear-gradient(135deg, #1a0505 0%, #501a2a 50%, #250810 100%)',
    ],
    ROUND_ROBIN: [
      'linear-gradient(135deg, #0a0e1a 0%, #152545 40%, #0a1530 100%)',
      'linear-gradient(135deg, #050a1a 0%, #1a3050 50%, #081020 100%)',
    ],
    GROUP: [
      'linear-gradient(135deg, #0f0a1a 0%, #2a1545 40%, #150a30 100%)',
      'linear-gradient(135deg, #0a051a 0%, #301a50 50%, #100820 100%)',
    ],
    HYBRID: [
      'linear-gradient(135deg, #1a0f0a 0%, #453015 40%, #301a0a 100%)',
      'linear-gradient(135deg, #1a0a05 0%, #50381a 50%, #201008 100%)',
    ],
    FRIENDLY: [
      'linear-gradient(135deg, #0a1a0f 0%, #15452a 40%, #0a3018 100%)',
      'linear-gradient(135deg, #051a0a 0%, #1a5030 50%, #082010 100%)',
    ],
  }
  const typeGradients = gradients[type] || [
    'linear-gradient(135deg, #0a0f1c 0%, #1a2540 40%, #0d1525 100%)',
    'linear-gradient(135deg, #0a101a 0%, #152035 50%, #0b1220 100%)',
  ]
  return typeGradients[index % typeGradients.length]
}

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
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white sm:truncate">My Tournaments</h1>
        <p class="text-gray-500">Manage your leagues, cups, and competitions</p>
      </div>
      <div class="flex items-center gap-3 self-start md:self-auto">
        <div class="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <UButton 
            icon="i-heroicons-squares-2x2" 
            color="neutral" 
            variant="ghost" 
            size="xs" 
            :class="{ 'bg-white dark:bg-gray-700 shadow-sm text-indigo-500': viewMode === 'grid' }"
            @click="viewMode = 'grid'" 
          />
          <UButton 
            icon="i-heroicons-list-bullet" 
            color="neutral" 
            variant="ghost" 
            size="xs"
            :class="{ 'bg-white dark:bg-gray-700 shadow-sm text-indigo-500': viewMode === 'list' }"
            @click="viewMode = 'list'" 
          />
        </div>
        <UButton 
          label="Create Tournament" 
          icon="i-heroicons-plus"
          color="primary" 
          size="lg"
          to="/tournaments/new"
        />
      </div>
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

    <!-- Tournaments View -->
    <div v-else>
      <!-- Grid View -->
      <div v-if="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <NuxtLink 
          v-for="(tournament, index) in tournaments" 
          :key="tournament.id" 
          :to="`/tournaments/${tournament.customName || tournament.id}`"
          class="group card-fade-in bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] rounded-xl p-5 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-lg dark:hover:shadow-emerald-500/10 flex flex-col"
          :style="{ animationDelay: `${index * 75}ms` }"
        >
          <!-- Header Row: Logo, Category/Format -->
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-3">
              <!-- Logo -->
              <div class="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center overflow-hidden border border-gray-200 dark:border-white/10 shrink-0">
                <img 
                  v-if="tournament.logoUrl" 
                  :src="tournament.logoUrl" 
                  :alt="tournament.name" 
                  class="w-full h-full object-cover" 
                />
                <img 
                  v-else 
                  :src="PLACEHOLDER_LOGO" 
                  alt="Placeholder" 
                  class="w-full h-full object-cover" 
                />
              </div>
            </div>
            
            <!-- Format & Sport Badges -->
            <div class="flex flex-col items-end gap-1.5 align-top mt-1">
              <span :class="[
                'px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border',
                getTypeBadgeStyle(tournament.type)
              ]">
                {{ tournament.type.replace(/_/g, ' ') }}
              </span>
              <span class="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                {{ tournament.sport }}
              </span>
            </div>
          </div>

          <!-- Content Area: Name -->
          <div class="flex-1 mt-1">
            <h3 class="font-semibold text-lg text-gray-900 dark:text-white group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
              {{ tournament.name }}
            </h3>
          </div>

          <!-- Metadata Footer -->
          <div class="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-x-4 gap-y-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
            <div class="flex flex-wrap items-center gap-4">
              <div class="flex items-center gap-1.5">
                <UIcon name="i-heroicons-calendar" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <span>{{ formatDate(tournament.start_date) }}</span>
              </div>
              <div v-if="tournament.location" class="flex items-center gap-1.5">
                <UIcon name="i-heroicons-map-pin" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <span class="truncate max-w-[150px]">{{ tournament.location }}</span>
              </div>
            </div>
            
            <!-- Visibility Icon (Bottom Right) -->
            <div class="p-1.5 bg-gray-100 dark:bg-white/5 rounded-md flex-shrink-0">
              <UIcon 
                :name="getVisibilityIcon(tournament.visibility)" 
                class="w-4 h-4 text-gray-500 dark:text-gray-400"
                :title="tournament.visibility"
              />
            </div>
          </div>
        </NuxtLink>
      </div>

      <!-- List View -->
      <div v-else-if="viewMode === 'list'" class="flex flex-col gap-3">
        <NuxtLink 
          v-for="(tournament, index) in tournaments" 
          :key="tournament.id" 
          :to="`/tournaments/${tournament.customName || tournament.id}`"
          class="group card-fade-in flex items-center gap-4 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] rounded-xl hover:border-emerald-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5"
          :style="{ animationDelay: `${index * 50}ms` }"
        >
          <!-- Logo -->
          <UAvatar 
            :src="tournament.logoUrl || PLACEHOLDER_LOGO" 
            :alt="tournament.name"
            size="md"
            class="ring-1 ring-gray-200 dark:ring-gray-800"
          />

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <h3 class="font-semibold text-gray-900 dark:text-white truncate group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">
                {{ tournament.name }}
              </h3>
              <span :class="[
                'flex-shrink-0 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border',
                getTypeBadgeStyle(tournament.type)
              ]">
                {{ tournament.type.replace(/_/g, ' ') }}
              </span>
            </div>
            
            <div class="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <div class="flex items-center gap-1">
                <UIcon name="i-heroicons-calendar" class="w-3.5 h-3.5" />
                <span>{{ formatDate(tournament.start_date) }}</span>
              </div>
              <div v-if="tournament.location" class="flex items-center gap-1">
                <UIcon name="i-heroicons-map-pin" class="w-3.5 h-3.5" />
                <span class="truncate max-w-[150px]">{{ tournament.location }}</span>
              </div>
            </div>
          </div>

          <!-- Status/Icon -->
          <div class="flex items-center gap-3">
             <div class="bg-gray-100 dark:bg-gray-800 p-1.5 rounded-lg">
                <UIcon 
                  :name="getVisibilityIcon(tournament.visibility)" 
                  class="w-4 h-4 text-gray-500" 
                />
             </div>
             <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors" />
          </div>
        </NuxtLink>
      </div>
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

<style scoped>
.card-fade-in {
  opacity: 0;
  animation: cardFadeUp 0.5s ease-out forwards;
}

@keyframes cardFadeUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>