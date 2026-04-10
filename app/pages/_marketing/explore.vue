<template>
  <div class="min-h-full text-white">
    <!-- Hero Section -->
    <section class="relative pt-8 pb-12 overflow-x-hidden">
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
              class="w-full pl-10 pr-4 py-3 bg-[#0A0A0A] border border-white/10 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
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
                : 'bg-[#0A0A0A] border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
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
          <div v-for="i in 6" :key="i" class="bg-[#0A0A0A] border border-white/10 rounded-xl overflow-hidden animate-pulse">
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
          <TournamentCard
            v-for="(tournament, index) in filteredTournaments"
            :key="tournament.id"
            :tournament="tournament"
            :style="{ animationDelay: `${index * 50}ms` }"
          />
        </div>

        <!-- Load More -->
        <div v-if="hasMore && !loading" class="flex justify-center mt-12">
          <UButton
            color="success"
            variant="soft"
            class="px-10 py-3 rounded-full font-bold shadow-lg shadow-emerald-500/5"
            @click="loadMore"
          >
            Load More Tournaments
          </UButton>
        </div>

        <!-- Loading More Spinner -->
        <div v-if="loading && tournaments.length > 0" class="flex justify-center mt-12">
          <div class="flex items-center gap-3 text-emerald-400/80">
            <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin" />
            <span class="text-sm font-medium">Loading more...</span>
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
          :to="toMain('/signup')"
          class="inline-block px-8 py-4 text-base font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-all shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95"
        >
          Start Organizing
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { Tournament } from '~/types'

const { toMain, toTournament } = useHost()

definePageMeta({
  layout: 'feed'
})

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
