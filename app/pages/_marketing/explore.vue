<template>
  <div class="bg-[#0A0F1C] text-white">
    <!-- Hero Section -->
    <section class="relative pt-20 pb-12 overflow-x-hidden">
      <!-- Background Glow -->
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div class="max-w-7xl mx-auto px-6 relative z-10">
        <!-- Badge -->
        <div class="inline-flex items-center gap-2 px-3 py-1.5 mb-6 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded">
          <span class="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
          EXPLORE
        </div>

        <!-- Headline -->
        <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-4">
          Discover <span class="text-emerald-400">Tournaments</span>
        </h1>
        <p class="text-lg text-gray-400 max-w-xl mb-10">
          Browse public competitions from organizers around the world. Follow live scores, view standings, and stay up to date.
        </p>

        <!-- Search & Filters -->
        <div class="flex flex-col sm:flex-row gap-4 mb-6">
          <!-- Search -->
          <div class="relative flex-1 max-w-md">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search tournaments..."
              class="w-full pl-10 pr-4 py-3 bg-[#111827] border border-white/10 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>
        </div>

        <!-- Type Filters -->
        <div class="flex flex-wrap gap-2">
          <button
            v-for="filter in typeFilters"
            :key="filter.value"
            :class="[
              'px-4 py-2 text-xs font-medium rounded-lg border transition-all duration-200',
              selectedType === filter.value
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                : 'bg-[#111827] border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
            ]"
            @click="selectedType = filter.value"
          >
            {{ filter.label }}
          </button>
        </div>
      </div>
    </section>

    <!-- Results Section -->
    <section class="pb-24">
      <div class="max-w-7xl mx-auto px-6">
        <!-- Results Count -->
        <div class="flex items-center justify-between mb-6">
          <p class="text-sm text-gray-500">
            <span v-if="!loading">{{ filteredTournaments.length }} tournament{{ filteredTournaments.length === 1 ? '' : 's' }} found</span>
            <span v-else>Loading...</span>
          </p>
        </div>

        <!-- Loading State -->
        <div v-if="loading && tournaments.length === 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="i in 6" :key="i" class="bg-[#111827] border border-white/10 rounded-xl overflow-hidden animate-pulse">
            <div class="h-36 bg-white/5"></div>
            <div class="p-5">
              <div class="h-4 bg-white/5 rounded w-3/4 mb-3"></div>
              <div class="h-3 bg-white/5 rounded w-1/2 mb-4"></div>
              <div class="flex gap-2">
                <div class="h-6 bg-white/5 rounded w-16"></div>
                <div class="h-6 bg-white/5 rounded w-20"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div
          v-else-if="!loading && filteredTournaments.length === 0"
          class="flex flex-col items-center justify-center py-20 text-center"
        >
          <div class="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mb-6">
            <svg class="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
          <h3 class="text-xl font-semibold mb-2">No tournaments found</h3>
          <p class="text-gray-400 max-w-md mb-6">
            <template v-if="searchQuery || selectedType !== 'ALL'">
              Try adjusting your search or filters to find what you're looking for.
            </template>
            <template v-else>
              There are no public tournaments available right now. Check back soon!
            </template>
          </p>
          <button
            v-if="searchQuery || selectedType !== 'ALL'"
            class="px-5 py-2.5 text-sm font-medium text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/10 transition-colors"
            @click="searchQuery = ''; selectedType = 'ALL'"
          >
            Clear Filters
          </button>
        </div>

        <!-- Tournament Grid -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <NuxtLink
            v-for="(tournament, index) in filteredTournaments"
            :key="tournament.id"
            :to="`/widget/${tournament.id}/fixtures`"
            class="group card-fade-in"
            :style="{ animationDelay: `${index * 75}ms` }"
          >
            <div class="bg-[#111827] border border-white/10 rounded-xl overflow-hidden hover:border-emerald-500/40 transition-all duration-300 hover:shadow-emerald-500/5 hover:shadow-xl">
              <!-- Banner -->
              <div class="relative h-40 overflow-hidden">
                <!-- Custom banner image -->
                <img
                  v-if="tournament.bannerUrl"
                  :src="tournament.bannerUrl"
                  :alt="tournament.name"
                  class="w-full h-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-all duration-700"
                />
                <!-- Dynamic gradient background when no banner -->
                <div
                  v-else
                  class="absolute inset-0 transition-all duration-700"
                  :style="{ background: getBannerGradient(tournament.type, index) }"
                >
                  <!-- Decorative circles -->
                  <div class="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10 bg-white"></div>
                  <div class="absolute -bottom-6 -left-6 w-24 h-24 rounded-full opacity-[0.07] bg-white"></div>
                  <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-44 rounded-full opacity-[0.04] bg-white"></div>
                </div>

                <!-- Overlay gradient -->
                <div class="absolute inset-0 bg-gradient-to-t from-[#111827] via-[#111827]/30 to-transparent"></div>
                <div class="absolute inset-0 bg-gradient-to-r from-[#111827]/20 to-transparent"></div>

                <!-- Logo (centered for no-banner, bottom-left for custom banner) -->
                <div :class="[
                  'absolute z-10',
                  tournament.bannerUrl ? 'bottom-3 left-4' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%]'
                ]">
                  <div :class="[
                    'rounded-xl overflow-hidden shadow-xl ring-1 ring-white/10',
                    tournament.bannerUrl ? 'w-10 h-10' : 'w-14 h-14'
                  ]">
                    <img
                      :src="tournament.logoUrl || PLACEHOLDER_LOGO"
                      :alt="tournament.name"
                      class="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <!-- Type Badge (frosted glass) -->
                <div class="absolute top-3 right-3 z-10">
                  <span :class="[
                    'px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md backdrop-blur-sm border',
                    getTypeBadgeClasses(tournament.type)
                  ]">
                    {{ formatType(tournament.type) }}
                  </span>
                </div>

                <!-- Sport pill (bottom right) -->
                <div class="absolute bottom-3 right-4 z-10">
                  <span class="px-2 py-0.5 text-[10px] font-medium text-white/70 bg-white/10 backdrop-blur-sm rounded-full">
                    {{ tournament.sport }}
                  </span>
                </div>
              </div>

              <!-- Info -->
              <div class="p-5">
                <h3 class="font-semibold text-white group-hover:text-emerald-400 transition-colors line-clamp-1 mb-1">
                  {{ tournament.name }}
                </h3>
                <p v-if="tournament.description" class="text-xs text-gray-500 line-clamp-2 mb-3">
                  {{ tournament.description }}
                </p>

                <!-- Meta -->
                <div class="flex items-center gap-4 text-[11px] text-gray-500">
                  <div class="flex items-center gap-1">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    {{ formatDate(tournament.start_date) }}
                  </div>
                  <div v-if="tournament.location" class="flex items-center gap-1">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    {{ tournament.location }}
                  </div>
                  <div class="flex items-center gap-1">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    {{ tournament.sport }}
                  </div>
                </div>

                <!-- Organizer -->
                <div v-if="tournament.organizer" class="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
                  <div class="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <span class="text-[9px] text-emerald-400 font-bold">
                      {{ tournament.organizer.name?.charAt(0)?.toUpperCase() || '?' }}
                    </span>
                  </div>
                  <span class="text-[11px] text-gray-500">by {{ tournament.organizer.name }}</span>
                </div>
              </div>
            </div>
          </NuxtLink>
        </div>

        <!-- Load More -->
        <div v-if="hasMore && !loading" class="flex justify-center mt-10">
          <button
            class="px-6 py-3 text-sm font-medium text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/10 transition-colors"
            @click="loadMore"
          >
            Load More Tournaments
          </button>
        </div>

        <!-- Loading More Spinner -->
        <div v-if="loading && tournaments.length > 0" class="flex justify-center mt-10">
          <div class="flex items-center gap-2 text-gray-400">
            <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="text-sm">Loading more...</span>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="py-20 border-t border-white/10">
      <div class="max-w-3xl mx-auto px-6 text-center">
        <h2 class="text-3xl md:text-4xl font-bold mb-4">
          Want to organize your own?
        </h2>
        <p class="text-gray-400 mb-8">
          Create tournaments, manage fixtures, generate graphics, and embed live widgets — all for free.
        </p>
        <NuxtLink
          to="/signup"
          class="inline-block px-8 py-4 text-base font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors"
        >
          Start Organizing
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { Tournament } from '~/types'

interface PaginatedResponse<T> {
  success: boolean
  message: string
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  timestamp: string
}

// SEO
useSeoMeta({
  title: 'Explore Tournaments | ParaScores',
  description: 'Browse public tournaments from organizers around the world. View live scores, standings, brackets, and more.',
  ogTitle: 'Explore Tournaments | ParaScores',
  ogDescription: 'Browse public tournaments from organizers around the world. View live scores, standings, brackets, and more.',
})

// Constants
const PLACEHOLDER_LOGO = 'https://res.cloudinary.com/djsnerfzp/image/upload/v1769695792/parascores_logo_placeholder.png'
const PLACEHOLDER_BANNER = 'https://res.cloudinary.com/djsnerfzp/image/upload/v1769696842/parascores_banner_placeholder.png'

// State
const tournaments = ref<Tournament[]>([])
const loading = ref(false)
const searchQuery = ref('')
const selectedType = ref('ALL')
const currentPage = ref(1)
const totalPages = ref(0)
const limit = 12

// Type filters
const typeFilters = [
  { label: 'All Types', value: 'ALL' },
  { label: 'Knockout', value: 'KNOCKOUT' },
  { label: 'Round Robin', value: 'ROUND_ROBIN' },
  { label: 'Group', value: 'GROUP' },
  { label: 'Hybrid', value: 'HYBRID' },
  { label: 'Friendly', value: 'FRIENDLY' },
]

// Computed
const hasMore = computed(() => currentPage.value < totalPages.value)

const filteredTournaments = computed(() => {
  let result = tournaments.value

  // Filter by type
  if (selectedType.value !== 'ALL') {
    result = result.filter(t => t.type === selectedType.value)
  }

  // Filter by search
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(t =>
      t.name.toLowerCase().includes(query) ||
      t.description?.toLowerCase().includes(query) ||
      t.sport?.toLowerCase().includes(query) ||
      t.location?.toLowerCase().includes(query)
    )
  }

  return result
})

// Fetch public tournaments
async function fetchPublicTournaments(page = 1, append = false) {
  loading.value = true
  try {
    const response = await $publicApi<PaginatedResponse<Tournament>>(
      `/tournaments/public?page=${page}&limit=${limit}`,
      { method: 'GET' }
    )
    if (response.data) {
      if (append) {
        tournaments.value = [...tournaments.value, ...response.data]
      } else {
        tournaments.value = response.data
      }
    }
    if (response.pagination) {
      currentPage.value = response.pagination.page
      totalPages.value = response.pagination.totalPages
    }
  } catch (err: any) {
    console.error('Failed to fetch public tournaments:', err)
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (!hasMore.value || loading.value) return
  await fetchPublicTournaments(currentPage.value + 1, true)
}

// Helpers
function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatType(type: string) {
  return type.replace(/_/g, ' ')
}

function getTypeBadgeClasses(type: string) {
  switch (type) {
    case 'KNOCKOUT': return 'bg-red-500/20 text-red-400 border-red-500/30'
    case 'ROUND_ROBIN': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    case 'GROUP': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    case 'HYBRID': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    case 'FRIENDLY': return 'bg-green-500/20 text-green-400 border-green-500/30'
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
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

// Fetch on mount
onMounted(() => {
  fetchPublicTournaments()
})
</script>

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
