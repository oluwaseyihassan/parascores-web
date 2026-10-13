<script setup lang="ts">
/**
 * Tournaments — redesigned list page, served at /tournaments
 * (see parascores-designs/ui/dashboard/REDESIGN.md). Moved off the root path
 * when the Overview page became the dashboard home (/).
 * Rollback: restore from _manage/index.vue.bak (parent folder) or
 * `git checkout -- app/pages/_manage/tournaments/index.vue`.
 */
import { storeToRefs } from 'pinia'
import { TournamentType } from '~/types'

definePageMeta({
  middleware: ['require-organizer'],
  layout: 'dashboard'
})

const tournamentStore = useTournamentStore()
const fixtureStore = useFixtureStore()
const authStore = useAuthStore()
const { handleError } = useErrors()
const { tournaments, loading, pagination, hasMore, totalCount } = storeToRefs(tournamentStore)
const { liveFixtures } = storeToRefs(fixtureStore)

// Realtime live flags
useLiveStream()

// Practice (sandbox) tournament
const creatingPractice = ref(false)

async function handleCreatePractice() {
  const orgId = authStore.currentOrganization?.id
  if (!orgId) return
  creatingPractice.value = true
  try {
    const response = await $api<{ data: any }>('/tournaments/practice', {
      method: 'POST',
      body: { organizationId: orgId },
    })
    if (response.data) {
      useToast().add({
        title: 'Practice Tournament Created',
        description: 'Sandbox mode — experiment freely. Data is temporary.',
        color: 'success',
        icon: 'i-heroicons-beaker',
      })
      const urlId = response.data.customName || response.data.id
      await navigateTo(`/tournaments/${urlId}`)
    }
  } catch (err: any) {
    handleError(err, { title: 'Failed to create practice tournament' })
  } finally {
    creatingPractice.value = false
  }
}

// View mode state
const viewMode = useCookie<'grid' | 'list'>('tournament-view-mode', { default: () => 'grid' })
const communityBannerDismissed = useCookie<boolean>('community-banner-dismissed', { default: () => false, maxAge: 60 * 60 * 24 * 90 })

// Search + filter state
const searchQuery = ref('')
const filterStatus = ref<'all' | 'ongoing' | 'completed' | 'public'>('ongoing')

const isTodayOrAfter = (date: string | Date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d.getTime() >= today.getTime()
}

const filteredTournaments = computed(() => {
  if (!tournaments.value) return []
  let filtered = tournaments.value
  if (filterStatus.value === 'ongoing') {
    filtered = tournaments.value.filter(t => isTodayOrAfter(t.end_date))
  } else if (filterStatus.value === 'completed') {
    filtered = tournaments.value.filter(t => !isTodayOrAfter(t.end_date))
  } else if (filterStatus.value === 'public') {
    filtered = tournaments.value.filter(t => t.visibility === 'PUBLIC')
  }

  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    filtered = filtered.filter(t =>
      t.name.toLowerCase().includes(q) ||
      (t.location || '').toLowerCase().includes(q)
    )
  }

  return [...filtered].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
})

// Live flags from real fixture data
const liveTournamentIds = computed(() => new Set(liveFixtures.value.map(f => f.tournament_id)))
const ongoingCount = computed(() => tournaments.value.filter(t => isTodayOrAfter(t.end_date)).length)
const liveCount = computed(() => liveFixtures.value.length)

const headerSub = computed(() => {
  const parts = [`${totalCount.value} total`]
  parts.push(`${ongoingCount.value} ongoing`)
  if (liveCount.value > 0) parts.push(`${liveCount.value} with matches live right now`)
  return parts.join(' · ')
})

const togglePin = async (tournament: any) => {
  try {
    const isPinned = !tournament.isPinned
    await tournamentStore.updateTournament(tournament.id, { isPinned })
    useToast().add({
      title: isPinned ? 'Tournament pinned' : 'Tournament unpinned',
      color: 'success'
    })
  } catch (err: any) {
    handleError(err, { title: 'Failed to update pin status' })
  }
}

// Fetch tournaments + live fixtures on mount
onMounted(async () => {
  await Promise.all([
    tournamentStore.fetchTournaments(),
    fixtureStore.fetchLiveFixtures(authStore.activeOrganizationId || undefined)
  ])
})

// Format date helper
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const formatDateRange = (t: any) => {
  const opts = { month: 'short', day: 'numeric' } as const
  const start = new Date(t.start_date).toLocaleDateString('en-US', opts)
  const end = new Date(t.end_date).toLocaleDateString('en-US', { ...opts, year: 'numeric' })
  return `${start} – ${end}`
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

const getVisibilityChip = (visibility: string) => {
  switch (visibility) {
    case 'PUBLIC': return 'text-cyan-600 dark:text-cyan-400 border-cyan-500/30 bg-cyan-500/10'
    case 'PRIVATE': return 'text-gray-500 dark:text-gray-400 border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-white/5'
    case 'UNLISTED': return 'text-gray-500 dark:text-gray-400 border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-white/5'
    default: return 'text-gray-500 dark:text-gray-400 border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-white/5'
  }
}

// Brand format tags
const formatTagColor = (type: string) => {
  switch (type) {
    case TournamentType.KNOCKOUT: return 'text-red-600 dark:text-red-400 border-red-500/25 bg-red-500/10'
    case TournamentType.LEAGUE:
    case TournamentType.ROUND_ROBIN: return 'text-cyan-600 dark:text-cyan-400 border-cyan-500/25 bg-cyan-500/10'
    case TournamentType.GROUP: return 'text-indigo-600 dark:text-indigo-300 border-indigo-400/25 bg-indigo-400/10'
    case TournamentType.HYBRID: return 'text-amber-600 dark:text-amber-400 border-amber-400/25 bg-amber-400/10'
    case TournamentType.FRIENDLY: return 'text-emerald-600 dark:text-emerald-400 border-emerald-500/25 bg-emerald-500/10'
    default: return 'text-gray-500 dark:text-gray-400 border-gray-400/25 bg-gray-400/10'
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
    rootMargin: '100px'
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

watch(loadMoreTrigger, (el) => {
  if (el && observer) {
    observer.disconnect()
    observer.observe(el)
  }
})
</script>

<template>
  <div class="flex flex-col gap-5 sm:gap-6 max-w-6xl mx-auto">
    <!-- WhatsApp Community Banner (dismissible) -->
    <div
      v-if="!communityBannerDismissed"
      class="relative overflow-hidden border border-[#25D366]/20 bg-[#25D366]/[0.04] dark:bg-[#25D366]/[0.06] rounded-xl p-4 sm:p-5 transition-all duration-300 hover:border-[#25D366]/40 group"
    >
      <button
        @click="communityBannerDismissed = true"
        class="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors z-10"
        title="Dismiss"
      >
        <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
      </button>
      <a
        href="https://chat.whatsapp.com/FubVEhK2ONKLUdci1RlVuu"
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center gap-3 sm:gap-4 pr-6"
      >
        <div class="w-10 h-10 sm:w-11 sm:h-11 bg-[#25D366]/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
          <svg class="w-5 h-5 sm:w-6 sm:h-6 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-bold text-gray-900 dark:text-white text-sm">Join the Parascores Organizers Community</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 hidden sm:block">Connect with fellow organizers, get tips, and direct support from the team.</p>
        </div>
        <div class="hidden sm:flex items-center gap-1.5 text-[#25D366] font-semibold text-xs flex-shrink-0">
          <span>Join on WhatsApp</span>
          <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-3.5 h-3.5" />
        </div>
      </a>
    </div>

    <!-- Page header -->
    <div class="flex items-end justify-between gap-4 flex-wrap">
      <div>
          <h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Tournaments</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ headerSub }}</p>
      </div>
      <UButton
        label="Practice Mode"
        icon="i-heroicons-beaker"
        color="warning"
        variant="outline"
        size="sm"
        :loading="creatingPractice"
        @click="handleCreatePractice"
      />
    </div>

    <!-- Toolbar: search + filters + view toggle -->
    <div class="flex items-center gap-2.5 flex-wrap">
      <UInput
        v-model="searchQuery"
        icon="i-heroicons-magnifying-glass"
        placeholder="Search tournaments…"
        size="sm"
        class="w-full sm:w-64"
      />
      <div class="flex items-center gap-1.5">
        <button
          v-for="f in ([['all', 'All'], ['ongoing', 'Ongoing'], ['completed', 'Completed'], ['public', 'Public']] as const)"
          :key="f[0]"
          class="px-3 py-1.5 text-xs font-semibold rounded-full border transition-all"
          :class="filterStatus === f[0]
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
            : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white'"
          @click="filterStatus = f[0]"
        >
          {{ f[1] }}
        </button>
      </div>
      <div class="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 ml-auto">
        <UButton
          icon="i-heroicons-squares-2x2"
          color="neutral"
          variant="ghost"
          size="xs"
          :class="{ 'bg-white dark:bg-gray-700 shadow-sm text-emerald-600 dark:text-emerald-400': viewMode === 'grid' }"
          @click="viewMode = 'grid';"
        />
        <UButton
          icon="i-heroicons-list-bullet"
          color="neutral"
          variant="ghost"
          size="xs"
          :class="{ 'bg-white dark:bg-gray-700 shadow-sm text-emerald-600 dark:text-emerald-400': viewMode === 'list' }"
          @click="viewMode = 'list';"
        />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && tournaments.length === 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 animate-pulse">
      <div v-for="i in 6" :key="i" class="h-44 bg-gray-100 dark:bg-white/5 rounded-2xl"></div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!loading && tournaments.length === 0"
      class="flex flex-col items-center justify-center text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl px-6 py-14"
    >
      <div class="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center mb-4">
        <UIcon name="i-heroicons-trophy" class="w-8 h-8 text-emerald-500" />
      </div>
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-1.5">No tournaments yet</h3>
      <p class="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-6">
        Create your first tournament — add teams, schedule fixtures, and publish a fan page before kickoff.
      </p>
      <UButton label="Create Your First Tournament" icon="i-heroicons-plus" color="primary" size="md" to="/tournaments/new" />
    </div>

    <!-- Tournaments -->
    <div v-else>
      <!-- Filter/search empty state -->
      <div v-if="filteredTournaments.length === 0" class="flex flex-col items-center justify-center text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl px-6 py-10">
        <div class="w-14 h-14 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-3">
          <UIcon name="i-heroicons-funnel" class="w-6 h-6 text-gray-400" />
        </div>
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-1">No tournaments found</h3>
        <p class="text-xs text-gray-500 max-w-sm">Try another filter or clear the search.</p>
      </div>

      <div v-else>
        <!-- Grid View -->
        <div v-if="viewMode === 'grid'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <div
            v-for="tournament in filteredTournaments"
            :key="tournament.id"
            class="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-4.5 hover:border-emerald-500/40 dark:hover:border-emerald-500/30 hover:-translate-y-0.5 hover:shadow-lg transition-all flex flex-col"
            :class="{ 'opacity-70': !isTodayOrAfter(tournament.end_date) }"
          >
            <!-- Live flag -->
            <span
              v-if="liveTournamentIds.has(tournament.id)"
              class="absolute -top-2.5 left-4 inline-flex items-center gap-1.5 bg-red-500 text-white text-[9px] font-extrabold tracking-widest uppercase px-2 py-0.5 rounded-full shadow-md z-10"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              Live now
            </span>

            <div class="flex items-start justify-between mb-3.5">
              <UAvatar
                :src="tournament.logoUrl || undefined"
                :text="tournament.name.charAt(0).toUpperCase()"
                size="lg"
                class="rounded-xl"
              />
              <div class="flex items-center gap-1">
                <UBadge
                  v-if="tournament.pendingRequestsCount && tournament.pendingRequestsCount > 0"
                  color="warning"
                  variant="soft"
                  size="xs"
                  :title="`${tournament.pendingRequestsCount} pending join requests`"
                >
                  {{ tournament.pendingRequestsCount }} to approve
                </UBadge>
                <button
                  class="p-1 transition-all hover:scale-110"
                  :class="tournament.isPinned ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600 hover:text-amber-400'"
                  :title="tournament.isPinned ? 'Unpin tournament' : 'Pin to top'"
                  @click.prevent="togglePin(tournament)"
                >
                  <UIcon :name="tournament.isPinned ? 'i-heroicons-star-solid' : 'i-heroicons-star'" class="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            <NuxtLink :to="`/tournaments/${tournament.customName || tournament.id}`" class="flex flex-col flex-1 group focus:outline-none">
              <span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">{{ tournament.sport }}</span>
              <h3 class="text-sm font-bold text-gray-900 dark:text-white leading-snug line-clamp-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {{ tournament.name }}
              </h3>
              <div class="flex flex-wrap gap-1.5 mt-2.5">
                <span :class="['px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md border', formatTagColor(tournament.type)]">
                  {{ tournament.type.replace(/_/g, ' ') }}
                </span>
              </div>
              <div class="flex items-center justify-between mt-auto pt-3.5 mt-4 border-t border-gray-100 dark:border-white/5 text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                <span class="flex items-center gap-1.5">
                  <UIcon name="i-heroicons-calendar" class="w-3.5 h-3.5" />
                  {{ formatDateRange(tournament) }}
                </span>
                <span
                  class="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border"
                  :class="getVisibilityChip(tournament.visibility)"
                >
                  {{ tournament.visibility.toLowerCase() }}
                </span>
              </div>
            </NuxtLink>
          </div>
        </div>

        <!-- List View -->
        <div v-else-if="viewMode === 'list'" class="flex flex-col gap-2.5">
          <div
            v-for="tournament in filteredTournaments"
            :key="tournament.id"
            class="group relative flex items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] rounded-xl hover:border-emerald-500/40 transition-all hover:shadow-md"
          >
            <NuxtLink
              :to="`/tournaments/${tournament.customName || tournament.id}`"
              class="flex flex-1 items-center gap-3 sm:gap-4 p-3 pr-2 focus:outline-none min-w-0"
            >
              <div class="relative shrink-0">
                <UAvatar
                  :src="tournament.logoUrl || undefined"
                  :text="tournament.name.charAt(0).toUpperCase()"
                  size="sm"
                  class="ring-1 ring-gray-200 dark:ring-gray-800 rounded-lg"
                />
                <span v-if="liveTournamentIds.has(tournament.id)" class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse"></span>
                <span v-else-if="tournament.pendingRequestsCount && tournament.pendingRequestsCount > 0" class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-white dark:border-gray-900"></span>
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <h3 class="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {{ tournament.name }}
                  </h3>
                  <span :class="['flex-shrink-0 px-1.5 py-0.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider rounded border', formatTagColor(tournament.type)]">
                    {{ tournament.type.replace(/_/g, ' ') }}
                  </span>
                  <span v-if="liveTournamentIds.has(tournament.id)" class="flex-shrink-0 px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider rounded bg-red-500/10 text-red-500 border border-red-500/30">Live</span>
                </div>
                <div class="flex items-center gap-3 sm:gap-4 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 min-w-0">
                  <div class="flex items-center gap-1 flex-shrink-0 whitespace-nowrap">
                    <UIcon name="i-heroicons-calendar" class="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                    <span>{{ formatDate(tournament.start_date) }}</span>
                  </div>
                  <div v-if="tournament.location" class="flex items-center gap-1 min-w-0">
                    <UIcon name="i-heroicons-map-pin" class="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                    <span class="truncate">{{ tournament.location }}</span>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2 sm:gap-3">
                <div class="bg-gray-100 flex items-center justify-center shrink-0 w-7 h-7 sm:w-8 sm:h-8 dark:bg-gray-800 rounded-lg">
                  <UIcon :name="getVisibilityIcon(tournament.visibility)" class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500" />
                </div>
                <UIcon name="i-heroicons-chevron-right" class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 group-hover:text-emerald-500 transition-colors mr-1 sm:mr-2" />
              </div>
            </NuxtLink>

            <button
              @click.prevent="togglePin(tournament)"
              class="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center shrink-0 mr-2 sm:mr-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors z-10"
              :class="tournament.isPinned ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-500' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'"
              :title="tournament.isPinned ? 'Unpin tournament' : 'Pin to top'"
            >
              <UIcon :name="tournament.isPinned ? 'i-heroicons-star-solid' : 'i-heroicons-star'" class="w-3.5 h-3.5 sm:w-4 sm:h-4 pointer-events-none" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Infinite Scroll Trigger -->
    <div ref="loadMoreTrigger" class="py-6 flex justify-center">
      <div v-if="loading && hasMore" class="flex flex-col items-center text-gray-400">
        <UIcon name="i-heroicons-arrow-path" class="w-7 h-7 animate-spin mb-2" />
        <span class="text-sm">Loading more…</span>
      </div>
    </div>
  </div>
</template>
