<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { TournamentType } from '~/types'

definePageMeta({
  middleware: ['require-organizer'],
  layout: 'dashboard'
})

const tournamentStore = useTournamentStore()
const authStore = useAuthStore()
const { handleError } = useErrors()
const { tournaments, loading, pagination, hasMore, totalCount } = storeToRefs(tournamentStore)

// View mode state
const viewMode = useCookie<'grid' | 'list'>('tournament-view-mode', { default: () => 'grid' })

// Filter state
const filterStatus = ref<'all' | 'ongoing' | 'completed' | 'public'>('ongoing')
const filteredTournaments = computed(() => {
  if (!tournaments.value) return []
  let filtered = tournaments.value
  if (filterStatus.value === 'ongoing') {
    filtered = tournaments.value.filter(t => new Date(t.end_date) >= new Date())
  } else if (filterStatus.value === 'completed') {
    filtered = tournaments.value.filter(t => new Date(t.end_date) < new Date())
  } else if (filterStatus.value === 'public') {
    filtered = tournaments.value.filter(t => t.visibility === 'PUBLIC')
  }
  
  return [...filtered].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
})

const togglePin = async (tournament: any) => {
  try {
    const isPinned = !tournament.isPinned
    await tournamentStore.updateTournament(tournament.id, { isPinned })
    useToast().add({
      title: isPinned ? 'Tournament Pinned' : 'Tournament Unpinned',
      color: 'success'
    })
  } catch (err: any) {
    handleError(err, { title: 'Failed to update pin status' })
  }
}

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
    case TournamentType.KNOCKOUT: return 'red'
    case TournamentType.LEAGUE: return 'blue'
    case TournamentType.GROUP: return 'purple'
    case TournamentType.ROUND_ROBIN: return 'blue'
    case TournamentType.HYBRID: return 'orange'
    case TournamentType.FRIENDLY: return 'green'
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
    case TournamentType.KNOCKOUT: return 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30'
    case TournamentType.LEAGUE: return 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30'
    case TournamentType.ROUND_ROBIN: return 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30'
    case TournamentType.GROUP: return 'bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30'
    case TournamentType.HYBRID: return 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30'
    case TournamentType.FRIENDLY: return 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30'
    default: return 'bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-500/30'
  }
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
      <div class="flex items-center gap-3 self-start md:self-auto flex-wrap">
        <USelect
          v-model="filterStatus"
          :items="[
            { label: 'All Status', value: 'all' },
            { label: 'Ongoing', value: 'ongoing' },
            { label: 'Completed', value: 'completed' },
            { label: 'Public Only', value: 'public' }
          ]"
          class="w-[140px]"
          size="md"
          variant="outline"
        />
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
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <!-- Total -->
      <button 
        @click="filterStatus = 'all'"
        class="relative text-left overflow-hidden bg-white dark:bg-gray-900 border rounded-xl p-4 hover:-translate-y-0.5 transition-all duration-300 hover:shadow-md group min-h-[82px] flex flex-col justify-center cursor-pointer w-full focus:outline-none"
        :class="[
          filterStatus === 'all' 
            ? 'border-indigo-500 dark:border-indigo-500/80 ring-2 ring-indigo-500/20 shadow-md' 
            : 'border-gray-200 dark:border-white/[0.06] hover:border-indigo-500/30 dark:hover:shadow-indigo-500/5'
        ]"
      >
        <div class="relative z-10 pr-12">
          <p class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">Total Tournaments</p>
          <p class="text-2xl font-extrabold text-gray-900 dark:text-white mt-1 leading-none">{{ totalCount }}</p>
        </div>
        <div class="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl flex items-center justify-center border border-indigo-100/50 dark:border-indigo-900/30 group-hover:scale-105 transition-transform duration-300 z-10">
          <UIcon name="i-heroicons-trophy" class="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
        </div>
      </button>

      <!-- Active -->
      <button 
        @click="filterStatus = 'ongoing'"
        class="relative text-left overflow-hidden bg-white dark:bg-gray-900 border rounded-xl p-4 hover:-translate-y-0.5 transition-all duration-300 hover:shadow-md group min-h-[82px] flex flex-col justify-center cursor-pointer w-full focus:outline-none"
        :class="[
          filterStatus === 'ongoing' 
            ? 'border-emerald-500 dark:border-emerald-500/80 ring-2 ring-emerald-500/20 shadow-md' 
            : 'border-gray-200 dark:border-white/[0.06] hover:border-emerald-500/30 dark:hover:shadow-emerald-500/5'
        ]"
      >
        <div class="relative z-10 pr-12">
          <p class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">Active</p>
          <p class="text-2xl font-extrabold text-gray-900 dark:text-white mt-1 leading-none">
            {{ tournaments.filter(t => new Date(t.end_date) >= new Date()).length }}
          </p>
        </div>
        <div class="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl flex items-center justify-center border border-emerald-100/50 dark:border-emerald-900/30 group-hover:scale-105 transition-transform duration-300 z-10">
          <UIcon name="i-heroicons-play" class="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
        </div>
      </button>

      <!-- Completed -->
      <button 
        @click="filterStatus = 'completed'"
        class="relative text-left overflow-hidden bg-white dark:bg-gray-900 border rounded-xl p-4 hover:-translate-y-0.5 transition-all duration-300 hover:shadow-md group min-h-[82px] flex flex-col justify-center cursor-pointer w-full focus:outline-none"
        :class="[
          filterStatus === 'completed' 
            ? 'border-violet-500 dark:border-violet-500/80 ring-2 ring-violet-500/20 shadow-md' 
            : 'border-gray-200 dark:border-white/[0.06] hover:border-violet-500/30 dark:hover:shadow-violet-500/5'
        ]"
      >
        <div class="relative z-10 pr-12">
          <p class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">Completed</p>
          <p class="text-2xl font-extrabold text-gray-900 dark:text-white mt-1 leading-none">
            {{ tournaments.filter(t => new Date(t.end_date) < new Date()).length }}
          </p>
        </div>
        <div class="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-violet-50 dark:bg-violet-950/40 rounded-xl flex items-center justify-center border border-violet-100/50 dark:border-violet-900/30 group-hover:scale-105 transition-transform duration-300 z-10">
          <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-violet-500 dark:text-violet-400" />
        </div>
      </button>

      <!-- Public -->
      <button 
        @click="filterStatus = 'public'"
        class="relative text-left overflow-hidden bg-white dark:bg-gray-900 border rounded-xl p-4 hover:-translate-y-0.5 transition-all duration-300 hover:shadow-md group min-h-[82px] flex flex-col justify-center cursor-pointer w-full focus:outline-none"
        :class="[
          filterStatus === 'public' 
            ? 'border-blue-500 dark:border-blue-500/80 ring-2 ring-blue-500/20 shadow-md' 
            : 'border-gray-200 dark:border-white/[0.06] hover:border-blue-500/30 dark:hover:shadow-blue-500/5'
        ]"
      >
        <div class="relative z-10 pr-12">
          <p class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">Public</p>
          <p class="text-2xl font-extrabold text-gray-900 dark:text-white mt-1 leading-none">
            {{ tournaments.filter(t => t.visibility === 'PUBLIC').length }}
          </p>
        </div>
        <div class="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-blue-50 dark:bg-blue-950/40 rounded-xl flex items-center justify-center border border-blue-100/50 dark:border-blue-900/30 group-hover:scale-105 transition-transform duration-300 z-10">
          <UIcon name="i-heroicons-globe-alt" class="w-5 h-5 text-blue-500 dark:text-blue-400" />
        </div>
      </button>
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
      <div class="w-20 h-20 bg-indigo-50 dark:bg-indigo-950/40 rounded-full flex items-center justify-center mb-6">
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
      <!-- Filter Empty State -->
      <div v-if="filteredTournaments.length === 0" class="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-8 shadow-sm">
        <div class="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
          <UIcon name="i-heroicons-funnel" class="w-8 h-8 text-gray-400" />
        </div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">No tournaments found</h3>
        <p class="text-sm text-gray-500 max-w-sm">
          No tournaments fit the selected filter criteria. Try clicking on another stats card above.
        </p>
      </div>

      <div v-else>
        <!-- Grid View -->
        <div v-if="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="(tournament, index) in filteredTournaments" 
          :key="tournament.id" 
          class="relative group card-fade-in bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] rounded-xl flex flex-col hover:border-emerald-500/50 transition-all duration-300 hover:shadow-lg dark:hover:shadow-emerald-500/10 overflow-hidden"
          :style="{ animationDelay: `${index * 75}ms` }"
        >
          <!-- Pending Requests Badge -->
          <div 
            v-if="tournament.pendingRequestsCount && tournament.pendingRequestsCount > 0" 
            class="absolute top-3 left-3 z-30"
            title="Pending player join requests"
          >
            <UBadge color="error" variant="solid" size="md" class="rounded-full shadow-lg ring-2 ring-white dark:ring-gray-900 font-bold">
              {{ tournament.pendingRequestsCount }}
            </UBadge>
          </div>

          <!-- Banner -->
          <div class="h-28 w-full relative overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
            <img 
              v-if="tournament.bannerUrl" 
              :src="tournament.bannerUrl" 
              :alt="tournament.name" 
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
            />
            <div 
              v-else 
              class="w-full h-full bg-gray-200 dark:bg-gray-800/80 group-hover:scale-105 transition-transform duration-500" 
            ></div>
            
            <!-- Pin Button (Star) -->
            <button 
              @click.stop.prevent="togglePin(tournament)"
              class="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-all z-20"
              :class="tournament.isPinned ? 'text-amber-400' : 'text-white/80 hover:text-white'"
              :title="tournament.isPinned ? 'Unpin tournament' : 'Pin to top'"
            >
              <UIcon :name="tournament.isPinned ? 'i-heroicons-star-solid' : 'i-heroicons-star'" class="w-4 h-4 pointer-events-none" />
            </button>
          </div>

          <NuxtLink 
            :to="`/tournaments/${tournament.customName || tournament.id}`"
            class="flex flex-col flex-1 p-5 pt-8 relative focus:outline-none"
          >
            <!-- Logo overlaying the banner -->
            <div class="absolute -top-6 left-4 w-12 h-12 rounded-xl bg-white dark:bg-gray-900 flex items-center justify-center overflow-hidden border border-gray-200 dark:border-white/10 shadow-md shrink-0 z-10 p-0.5">
              <img 
                v-if="tournament.logoUrl" 
                :src="tournament.logoUrl" 
                :alt="tournament.name" 
                class="w-full h-full object-cover rounded-lg" 
              />
              <img 
                v-else 
                :src="PLACEHOLDER_LOGO" 
                alt="Placeholder" 
                class="w-full h-full object-cover rounded-lg" 
              />
            </div>

            <!-- Format & Sport Badges (Top Right of Content Area) -->
            <div class="absolute -top-6 right-4 flex flex-col items-end gap-1">
              <span :class="[
                'px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border shadow-sm',
                getTypeBadgeStyle(tournament.type)
              ]">
                {{ tournament.type.replace(/_/g, ' ') }}
              </span>
            </div>

            <!-- Content Area: Name -->
            <div class="flex-1 mt-2">
              <span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">
                {{ tournament.sport }}
              </span>
              <h3 class="font-bold text-base text-gray-900 dark:text-white group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                {{ tournament.name }}
              </h3>
            </div>

            <!-- Metadata Footer -->
            <div class="mt-5 pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-x-4 gap-y-2 text-xs text-gray-500 dark:text-gray-400 font-semibold">
              <div class="flex flex-wrap items-center gap-4">
                <div class="flex items-center gap-1.5">
                  <UIcon name="i-heroicons-calendar" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <span>{{ formatDate(tournament.start_date) }}</span>
                </div>
                <div v-if="tournament.location" class="flex items-center gap-1.5">
                  <UIcon name="i-heroicons-map-pin" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <span class="truncate max-w-[120px]">{{ tournament.location }}</span>
                </div>
              </div>
              
              <!-- Visibility Icon (Bottom Right) -->
              <div class="w-7 h-7 flex items-center justify-center bg-gray-100 dark:bg-white/5 rounded-md flex-shrink-0">
                <UIcon 
                  :name="getVisibilityIcon(tournament.visibility)" 
                  class="w-4 h-4 text-gray-500 dark:text-gray-400"
                  :title="tournament.visibility"
                />
              </div>
            </div>
          </NuxtLink>
        </div>
      </div>

      <!-- List View -->
      <div v-else-if="viewMode === 'list'" class="flex flex-col gap-3">
        <div 
          v-for="(tournament, index) in filteredTournaments" 
          :key="tournament.id" 
          class="group card-fade-in relative flex items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] rounded-xl hover:border-emerald-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5"
          :style="{ animationDelay: `${index * 50}ms` }"
        >
          <NuxtLink 
            :to="`/tournaments/${tournament.customName || tournament.id}`"
            class="flex flex-1 items-center gap-4 p-3 pr-2 focus:outline-none min-w-0"
          >
          <!-- Logo -->
          <UAvatar 
            :src="tournament.logoUrl || PLACEHOLDER_LOGO" 
            :alt="tournament.name"
            size="md"
            class="ring-1 ring-gray-200 dark:ring-gray-800"
          >
            <!-- Pending Requests Indicator for List View -->
            <template v-if="tournament.pendingRequestsCount && tournament.pendingRequestsCount > 0" #label>
              <div class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-900"></div>
            </template>
          </UAvatar>

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
            
            <div class="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 min-w-0">
              <div class="flex items-center gap-1 flex-shrink-0 whitespace-nowrap">
                <UIcon name="i-heroicons-calendar" class="w-3.5 h-3.5 flex-shrink-0" />
                <span>{{ formatDate(tournament.start_date) }}</span>
              </div>
              <div v-if="tournament.location" class="flex items-center gap-1 min-w-0">
                <UIcon name="i-heroicons-map-pin" class="w-3.5 h-3.5 flex-shrink-0" />
                <span class="truncate">{{ tournament.location }}</span>
              </div>
            </div>
          </div>

          <!-- Status/Icon -->
          <div class="flex items-center gap-3">
             <div class="bg-gray-100 flex items-center justify-center shrink-0 w-8 h-8 dark:bg-gray-800 rounded-lg">
                <UIcon 
                  :name="getVisibilityIcon(tournament.visibility)" 
                  class="w-4 h-4 text-gray-500" 
                />
             </div>
             <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors mr-2" />
          </div>
          </NuxtLink>
          
          <button
             @click.prevent="togglePin(tournament)"
             class="w-8 h-8 flex items-center justify-center shrink-0 mr-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors z-10"
             :class="tournament.isPinned ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-500' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'"
             :title="tournament.isPinned ? 'Unpin tournament' : 'Pin to top'"
          >
             <UIcon :name="tournament.isPinned ? 'i-heroicons-star-solid' : 'i-heroicons-star'" class="w-4 h-4 pointer-events-none" />
          </button>
        </div>
      </div>
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