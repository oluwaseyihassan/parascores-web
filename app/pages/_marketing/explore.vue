<template>
  <div class="min-h-full text-gray-900 dark:text-white transition-colors">
    <!-- Header & Discovery Toolbar -->
    <section class="pt-6 sm:pt-8 pb-6 border-b border-gray-200/80 dark:border-white/[0.06] mb-8">
      <div class="max-w-7xl mx-auto px-6">
        <!-- Top Row: Title & Stats -->
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              Explore Tournaments
            </h1>
            <p class="text-sm text-gray-500 dark:text-neutral-400 mt-1">
              Find live matches, brackets, and public competitions.
            </p>
          </div>

          <!-- Total Count Display -->
          <div class="text-xs font-semibold text-gray-500 dark:text-neutral-400 shrink-0">
            <span v-if="nearbyMode" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {{ totalCount }} within {{ nearbyRadiusKm }} km
            </span>
            <span v-else-if="!loading" class="tabular-nums">
              {{ totalCount }} tournament{{ totalCount === 1 ? '' : 's' }} available
            </span>
            <span v-else class="text-gray-400">Loading tournaments...</span>
          </div>
        </div>

        <!-- Toolbar: Search + Controls -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
          <!-- Search Input -->
          <div class="relative flex-1">
            <UIcon
              name="i-heroicons-magnifying-glass"
              class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-neutral-500 pointer-events-none"
            />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search by tournament name, location, or sport..."
              class="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-500/80 transition-colors shadow-2xs"
            />
            <button
              v-if="searchQuery"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
              @click="searchQuery = ''"
            >
              <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
            </button>
          </div>

          <!-- Near Me Toggle -->
          <div class="flex items-center gap-2 shrink-0">
            <button
              :disabled="locating"
              :class="[
                'inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-xl border transition-all duration-200 shadow-2xs',
                nearbyMode
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-white dark:bg-[#111111] border-gray-200 dark:border-white/10 text-gray-700 dark:text-neutral-300 hover:border-gray-300 dark:hover:border-white/20'
              ]"
              @click="toggleNearby"
            >
              <UIcon
                :name="locating ? 'i-heroicons-arrow-path' : 'i-heroicons-map-pin'"
                :class="['w-4 h-4', locating && 'animate-spin']"
              />
              {{ nearbyMode ? 'Near You' : 'Near Me' }}
            </button>

            <!-- Radius switcher when nearbyMode is active -->
            <div
              v-if="nearbyMode"
              class="inline-flex items-center p-0.5 rounded-lg bg-gray-100 dark:bg-[#161616] border border-gray-200 dark:border-white/10"
            >
              <button
                v-for="r in radiusOptions"
                :key="r"
                :class="[
                  'px-2.5 py-1 text-[11px] font-bold rounded-md transition-all',
                  nearbyRadiusKm === r
                    ? 'bg-white dark:bg-white/15 text-gray-900 dark:text-white shadow-2xs'
                    : 'text-gray-500 hover:text-gray-800 dark:text-neutral-400 dark:hover:text-white'
                ]"
                @click="nearbyRadiusKm = r"
              >
                {{ r }}km
              </button>
            </div>
          </div>
        </div>

        <!-- Format Filters Segmented Strip -->
        <div class="flex items-center justify-between gap-3 overflow-x-auto no-scrollbar pt-1">
          <div class="inline-flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-[#141414] border border-gray-200/80 dark:border-white/[0.06] shrink-0">
            <button
              v-for="filter in typeFilters"
              :key="filter.value"
              :class="[
                'px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all',
                selectedType === filter.value
                  ? 'bg-white dark:bg-white/10 text-gray-950 dark:text-white shadow-2xs font-bold'
                  : 'text-gray-500 hover:text-gray-900 dark:text-neutral-400 dark:hover:text-white'
              ]"
              @click="selectedType = filter.value"
            >
              {{ filter.label }}
            </button>
          </div>

          <!-- Quick Reset if filtered -->
          <button
            v-if="searchQuery || selectedType !== 'ALL' || nearbyMode"
            class="text-xs font-medium text-gray-500 hover:text-emerald-500 dark:text-neutral-400 dark:hover:text-emerald-400 transition-colors shrink-0 flex items-center gap-1.5"
            @click="clearFilters"
          >
            <UIcon name="i-heroicons-arrow-path" class="w-3.5 h-3.5" />
            Reset filters
          </button>
        </div>
      </div>
    </section>

    <!-- Results Section -->
    <section class="pb-24">
      <div class="max-w-7xl mx-auto px-6">

        <!-- Loading State -->
        <div v-if="loading && tournaments.length === 0" class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          <div
            v-for="i in 6"
            :key="i"
            class="bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-white/10 rounded-2xl p-3 sm:p-4 flex items-center gap-3.5 sm:gap-4 animate-pulse"
          >
            <div class="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-xl sm:rounded-2xl bg-gray-200 dark:bg-white/5 shrink-0"></div>
            <div class="flex-1 min-w-0 py-0.5">
              <div class="h-3.5 bg-gray-200 dark:bg-white/5 rounded w-2/5 mb-2.5"></div>
              <div class="h-5 sm:h-6 bg-gray-200 dark:bg-white/5 rounded w-3/4 mb-3"></div>
              <div class="h-6 bg-gray-200 dark:bg-white/5 rounded-md w-24"></div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div
          v-else-if="!loading && filteredTournaments.length === 0"
          class="flex flex-col items-center justify-center py-20 text-center"
        >
          <div class="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mb-6 shadow-sm">
            <svg class="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
          <h3 class="text-xl font-bold mb-2">No tournaments found</h3>
          <p class="text-gray-500 dark:text-gray-400 max-w-md mb-6">
            <template v-if="searchQuery || selectedType !== 'ALL'">
              Try adjusting your search or filters to find what you're looking for.
            </template>
            <template v-else>
              There are no public tournaments available right now. Check back soon!
            </template>
          </p>
          <button
            v-if="searchQuery || selectedType !== 'ALL'"
            class="px-5 py-2.5 text-sm font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/10 transition-colors"
            @click="clearFilters"
          >
            Clear Filters
          </button>
        </div>

        <!-- Tournament Grid -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          <TournamentCard
            v-for="tournament in filteredTournaments"
            :key="tournament.id"
            :tournament="tournament"
          />
        </div>

        <!-- Infinite scroll sentinel -->
        <div ref="scrollSentinel" class="h-1"></div>

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
    <section class="py-20 border-t border-gray-200 dark:border-white/10">
      <div class="max-w-3xl mx-auto px-6 text-center">
        <h2 class="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">
          Want to organize your own?
        </h2>
        <p class="text-gray-600 dark:text-gray-400 mb-8">
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

const { toMain } = useHost()

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

// State
const tournaments = ref<Tournament[]>([])
const loading = ref(false)
const searchQuery = ref('')
const selectedType = ref('ALL')
const currentPage = ref(1)
const totalPages = ref(0)
const totalCount = ref(0)
const limit = 12

// Debounce search input before hitting the API
const debouncedSearch = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(searchQuery, (val) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { debouncedSearch.value = val }, 400)
})

// Re-fetch from page 1 whenever search or type filter changes
watch([debouncedSearch, selectedType], () => {
  if (nearbyMode.value) return
  fetchPublicTournaments(1)
})

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
const hasMore = computed(() => !nearbyMode.value && currentPage.value < totalPages.value)
const filteredTournaments = computed(() => tournaments.value)

// Nearby (tournaments near me)
const nearbyMode = ref(false)
const nearbyRadiusKm = ref(50)
const radiusOptions = [50, 100, 250]
const locating = ref(false)
const userCoords = ref<{ lat: number; lon: number } | null>(null)

async function fetchNearbyTournaments() {
  if (!userCoords.value) return
  const params = new URLSearchParams({
    lat: String(userCoords.value.lat),
    lon: String(userCoords.value.lon),
    radius: String(nearbyRadiusKm.value),
    limit: '50',
  })
  const response = await $publicApi<PaginatedResponse<Tournament>>(
    `/tournaments/nearby?${params}`,
    { method: 'GET' }
  )
  tournaments.value = response.data || []
  totalCount.value = response.pagination?.total || 0
  currentPage.value = 1
  totalPages.value = 1

  console.log('[Nearby] Your location:', userCoords.value)
  console.table(
    tournaments.value.map((t: any) => ({
      name: t.name,
      location: t.location,
      lat: t.latitude,
      lon: t.longitude,
      distanceKm: t.distanceKm,
    }))
  )
}

async function toggleNearby() {
  if (nearbyMode.value) {
    nearbyMode.value = false
    fetchPublicTournaments(1)
    return
  }

  locating.value = true
  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
    )
    userCoords.value = { lat: position.coords.latitude, lon: position.coords.longitude }
    await fetchNearbyTournaments()
    nearbyMode.value = true
  } catch (err: any) {
    useToast().add({
      title: 'Location unavailable',
      description: 'Allow location access in your browser to see tournaments near you.',
      color: 'error',
    })
  } finally {
    locating.value = false
  }
}

watch(nearbyRadiusKm, () => {
  if (nearbyMode.value) fetchNearbyTournaments()
})

// Fetch public tournaments — search & type are sent to the API
async function fetchPublicTournaments(page = 1, append = false) {
  loading.value = true
  if (!append) tournaments.value = []
  try {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (debouncedSearch.value.trim()) params.set('search', debouncedSearch.value.trim())
    if (selectedType.value !== 'ALL') params.set('type', selectedType.value)

    const response = await $publicApi<PaginatedResponse<Tournament>>(
      `/tournaments/public?${params}`,
      { method: 'GET' }
    )
    if (response.data) {
      tournaments.value = append ? [...tournaments.value, ...response.data] : response.data
    }
    if (response.pagination) {
      currentPage.value = response.pagination.page
      totalPages.value = response.pagination.totalPages
      totalCount.value = response.pagination.total
    }
  } catch (err: any) {
    console.error('Failed to fetch public tournaments:', err)
  } finally {
    loading.value = false
  }
}

function clearFilters() {
  if (searchTimer) clearTimeout(searchTimer)
  searchQuery.value = ''
  debouncedSearch.value = ''
  selectedType.value = 'ALL'
  if (nearbyMode.value) {
    nearbyMode.value = false
    fetchPublicTournaments(1)
  }
}

// Infinite scroll
const scrollSentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

function setupObserver() {
  observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting && hasMore.value && !loading.value) {
      fetchPublicTournaments(currentPage.value + 1, true)
    }
  }, { rootMargin: '200px' })

  if (scrollSentinel.value) observer.observe(scrollSentinel.value)
}

onMounted(() => {
  fetchPublicTournaments()
  setupObserver()
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>

<style scoped>
</style>
