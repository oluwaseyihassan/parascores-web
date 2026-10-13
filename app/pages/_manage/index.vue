<script setup lang="ts">
/**
 * Overview — redesigned manage home (see parascores-designs/ui/dashboard/REDESIGN.md),
 * adopted as the dashboard home at '/'. The previous tournaments list now lives
 * at /tournaments (_manage/tournaments/index.vue).
 */
import { storeToRefs } from 'pinia'
import { TournamentType, FixtureStatus } from '~/types'
import type { Fixture } from '~/types'

definePageMeta({
  middleware: ['require-organizer'],
  layout: 'dashboard'
})

useSeoMeta({ title: 'Overview — ParaScores' })

const tournamentStore = useTournamentStore()
const fixtureStore = useFixtureStore()
const authStore = useAuthStore()
const { handleError } = useErrors()
const { frontendUrl } = useHost()

const { tournaments, loading, totalCount } = storeToRefs(tournamentStore)
const { liveFixtures, loading: liveLoading } = storeToRefs(fixtureStore)

// Realtime score updates (same SSE hook as live.vue)
useLiveStream()

onMounted(async () => {
  await Promise.all([
    tournamentStore.fetchTournaments({ limit: 50 }),
    fixtureStore.fetchLiveFixtures(authStore.activeOrganizationId || undefined)
  ])
})

const userFirstName = computed(() => {
  if (!authStore.user?.name) return 'there'
  return authStore.user.name.trim().split(/\s+/)[0]
})

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
})

// ---------- Derived data ----------
const isTodayOrAfter = (date: string | Date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d.getTime() >= today.getTime()
}

const ongoingTournaments = computed(() => tournaments.value.filter(t => isTodayOrAfter(t.end_date)))
const pendingRequestsCount = computed(() =>
  tournaments.value.reduce((sum, t) => sum + (t.pendingRequestsCount || 0), 0)
)
const publicCount = computed(() => tournaments.value.filter(t => t.visibility === 'PUBLIC').length)
const attentionTournaments = computed(() =>
  tournaments.value.filter(t => (t.pendingRequestsCount || 0) > 0)
)

const situationLine = computed(() => {
  const parts: string[] = []
  const live = liveFixtures.value.length
  if (live > 0) parts.push(`${live} match${live > 1 ? 'es' : ''} live right now`)
  else parts.push('No matches live right now')
  if (pendingRequestsCount.value > 0) {
    parts.push(`${pendingRequestsCount.value} player${pendingRequestsCount.value > 1 ? 's' : ''} waiting for approval`)
  }
  return parts.join(' · ')
})

// ---------- Filters + cards ----------
type FilterKey = 'ongoing' | 'all' | 'completed' | 'public'
const filterStatus = ref<FilterKey>('ongoing')

const filteredTournaments = computed(() => {
  let filtered = tournaments.value
  if (filterStatus.value === 'ongoing') filtered = ongoingTournaments.value
  else if (filterStatus.value === 'completed') filtered = tournaments.value.filter(t => !isTodayOrAfter(t.end_date))
  else if (filterStatus.value === 'public') filtered = tournaments.value.filter(t => t.visibility === 'PUBLIC')

  return [...filtered].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
})

const liveTournamentIds = computed(() => new Set(liveFixtures.value.map(f => f.tournament_id)))

const togglePin = async (tournament: any) => {
  try {
    const isPinned = !tournament.isPinned
    await tournamentStore.updateTournament(tournament.id, { isPinned })
    useToast().add({ title: isPinned ? 'Tournament pinned' : 'Tournament unpinned', color: 'success' })
  } catch (err: any) {
    handleError(err, { title: 'Failed to update pin status' })
  }
}

const formatDateRange = (t: any) => {
  const opts = { month: 'short', day: 'numeric' } as const
  const start = new Date(t.start_date).toLocaleDateString('en-US', opts)
  const end = new Date(t.end_date).toLocaleDateString('en-US', { ...opts, year: 'numeric' })
  return `${start} – ${end}`
}

const formatTagColor = (type: string) => {
  switch (type) {
    case TournamentType.KNOCKOUT: return 'error'
    case TournamentType.GROUP:
    case TournamentType.HYBRID: return 'warning'
    case TournamentType.LEAGUE:
    case TournamentType.ROUND_ROBIN: return 'info'
    case TournamentType.FRIENDLY: return 'success'
    default: return 'neutral'
  }
}

// ---------- Live fixtures + match control ----------
const showMatchControlModal = ref(false)
const selectedFixture = ref<Fixture | null>(null)

const openMatchControl = (fixture: Fixture) => {
  selectedFixture.value = { ...fixture }
  showMatchControlModal.value = true
}

const refreshLive = async () => {
  await fixtureStore.fetchLiveFixtures(authStore.activeOrganizationId || undefined)
}

const handleFixtureUpdated = async (fixture: Fixture) => {
  selectedFixture.value = fixture
  await refreshLive()
}

const handleMatchEnded = async () => {
  await refreshLive()
}

const fixtureStatusLabel = (fixture: Fixture) => {
  if (fixture.status === FixtureStatus.EXTRATIME) return 'ET'
  if (fixture.status === FixtureStatus.NORMAL_TIME_ENDED) return 'FT'
  return 'LIVE'
}

const fixtureTourName = (fixture: Fixture) => (fixture as any).tournament?.name || 'Tournament'

const teamName = (side: 'home' | 'away', fixture: Fixture) => {
  const team = side === 'home' ? fixture.homeTeam : fixture.awayTeam
  return team?.customShortName || team?.customName || (side === 'home' ? 'Home' : 'Away')
}
const teamInitial = (side: 'home' | 'away', fixture: Fixture) =>
  teamName(side, fixture).charAt(0).toUpperCase()

// ---------- Quick actions ----------
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
        title: 'Practice tournament created',
        description: 'Sandbox mode — experiment freely. Data is temporary.',
        color: 'success',
        icon: 'i-heroicons-beaker',
      })
      await navigateTo(`/tournaments/${response.data.customName || response.data.id}`)
    }
  } catch (err: any) {
    handleError(err, { title: 'Failed to create practice tournament' })
  } finally {
    creatingPractice.value = false
  }
}

const copyFanLink = async () => {
  try {
    await navigator.clipboard.writeText(`${frontendUrl.value}/`)
    useToast().add({ title: 'Fan portal link copied', color: 'success', icon: 'i-heroicons-link' })
  } catch {
    handleError(null, { title: 'Could not copy link' })
  }
}
</script>

<template>
  <div class="flex flex-col gap-6 sm:gap-8 max-w-6xl mx-auto">
    <!-- Greeting -->
    <div>
      <h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
        {{ greeting }}, <span class="text-emerald-600 dark:text-emerald-400">{{ userFirstName }}</span>
      </h1>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ situationLine }}</p>
    </div>

    <!-- Stat chips -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <button
        class="flex items-center gap-3 text-left bg-white dark:bg-gray-900 border rounded-xl px-4 py-3.5 transition-all hover:-translate-y-0.5 hover:shadow-md border-gray-200 dark:border-white/[0.06]"
        :class="{ 'border-red-400 dark:border-red-500/50 ring-1 ring-red-500/20': liveFixtures.length > 0 }"
        @click="filterStatus = 'ongoing'"
      >
        <span class="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/30 flex items-center justify-center shrink-0">
          <span class="w-2.5 h-2.5 rounded-full bg-red-500" :class="liveFixtures.length > 0 ? 'animate-pulse' : ''"></span>
        </span>
        <span>
          <span class="block text-xl font-extrabold font-mono leading-none text-gray-900 dark:text-white">{{ liveFixtures.length }}</span>
          <span class="block text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-1">Live now</span>
        </span>
      </button>

      <button
        class="flex items-center gap-3 text-left bg-white dark:bg-gray-900 border rounded-xl px-4 py-3.5 transition-all hover:-translate-y-0.5 hover:shadow-md border-gray-200 dark:border-white/[0.06]"
        @click="filterStatus = 'all'"
      >
        <span class="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-center shrink-0">
          <UIcon name="i-heroicons-trophy" class="w-4.5 h-4.5 text-emerald-500" />
        </span>
        <span>
          <span class="block text-xl font-extrabold font-mono leading-none text-gray-900 dark:text-white">{{ totalCount }}</span>
          <span class="block text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-1">Tournaments</span>
        </span>
      </button>

      <button
        class="flex items-center gap-3 text-left bg-white dark:bg-gray-900 border rounded-xl px-4 py-3.5 transition-all hover:-translate-y-0.5 hover:shadow-md border-gray-200 dark:border-white/[0.06]"
        :class="{ 'opacity-60': pendingRequestsCount === 0 }"
      >
        <span class="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/30 flex items-center justify-center shrink-0">
          <UIcon name="i-heroicons-user-plus" class="w-4.5 h-4.5 text-amber-500" />
        </span>
        <span>
          <span class="block text-xl font-extrabold font-mono leading-none text-gray-900 dark:text-white">{{ pendingRequestsCount }}</span>
          <span class="block text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-1">Pending requests</span>
        </span>
      </button>

      <button
        class="flex items-center gap-3 text-left bg-white dark:bg-gray-900 border rounded-xl px-4 py-3.5 transition-all hover:-translate-y-0.5 hover:shadow-md border-gray-200 dark:border-white/[0.06]"
        @click="filterStatus = 'public'"
      >
        <span class="w-9 h-9 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100 dark:border-cyan-900/30 flex items-center justify-center shrink-0">
          <UIcon name="i-heroicons-globe-alt" class="w-4.5 h-4.5 text-cyan-500" />
        </span>
        <span>
          <span class="block text-xl font-extrabold font-mono leading-none text-gray-900 dark:text-white">{{ publicCount }}</span>
          <span class="block text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-1">Public pages</span>
        </span>
      </button>
    </div>

    <!-- Live + attention -->
    <div class="grid lg:grid-cols-[1.6fr_1fr] gap-4 items-start">
      <!-- Live now -->
      <section class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden">
        <header class="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/5">
          <h2 class="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Live now
            <span v-if="liveFixtures.length > 0" class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          </h2>
          <NuxtLink to="/live" class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">Live control →</NuxtLink>
        </header>

        <!-- loading -->
        <div v-if="liveLoading && liveFixtures.length === 0" class="p-5 space-y-3 animate-pulse">
          <div v-for="i in 2" :key="i" class="h-14 bg-gray-100 dark:bg-white/5 rounded-xl"></div>
        </div>

        <!-- empty -->
        <div v-else-if="liveFixtures.length === 0" class="px-5 py-10 text-center">
          <div class="w-12 h-12 mx-auto rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-3">
            <UIcon name="i-heroicons-signal-slash" class="w-6 h-6 text-gray-400" />
          </div>
          <p class="text-sm font-semibold text-gray-900 dark:text-white">Nothing live right now</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">When a match kicks off, it shows up here with one-tap control.</p>
        </div>

        <!-- live rows -->
        <div v-else>
          <div
            v-for="fixture in liveFixtures"
            :key="fixture.id"
            class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-5 py-3.5 border-b border-gray-100 dark:border-white/5 last:border-b-0 bg-red-50/40 dark:bg-red-500/[0.04] hover:bg-red-50 dark:hover:bg-red-500/[0.07] transition-colors"
          >
            <div class="flex items-center gap-2 shrink-0 w-16">
              <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              <span class="font-mono text-xs font-bold text-red-600 dark:text-red-400">{{ fixtureStatusLabel(fixture) }}</span>
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 text-sm">
                <span class="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-300 shrink-0 overflow-hidden">
                  <img v-if="fixture.homeTeam?.logoUrl" :src="fixture.homeTeam.logoUrl" class="w-full h-full object-cover" alt="" />
                  <template v-else>{{ teamInitial('home', fixture) }}</template>
                </span>
                <span class="font-semibold text-gray-900 dark:text-white truncate">{{ teamName('home', fixture) }}</span>
                <span class="font-mono font-bold text-gray-900 dark:text-white whitespace-nowrap px-1">
                  {{ fixture.homeScore ?? 0 }} - {{ fixture.awayScore ?? 0 }}
                </span>
                <span class="font-semibold text-gray-900 dark:text-white truncate">{{ teamName('away', fixture) }}</span>
                <span class="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-300 shrink-0 overflow-hidden">
                  <img v-if="fixture.awayTeam?.logoUrl" :src="fixture.awayTeam.logoUrl" class="w-full h-full object-cover" alt="" />
                  <template v-else>{{ teamInitial('away', fixture) }}</template>
                </span>
              </div>
              <p class="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 sm:pl-8">{{ fixtureTourName(fixture) }}</p>
            </div>

            <div class="flex items-center gap-2 shrink-0 pl-7 sm:pl-0">
              <UBadge color="warning" variant="soft" size="sm">Live</UBadge>
              <UButton
                size="xs"
                color="error"
                variant="soft"
                icon="i-heroicons-adjustments-horizontal"
                @click="openMatchControl(fixture)"
              >
                Control
              </UButton>
            </div>
          </div>
        </div>
      </section>

      <!-- Right column -->
      <div class="flex flex-col gap-4">
        <!-- Needs attention -->
        <section v-if="attentionTournaments.length > 0" class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden">
          <header class="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/5">
            <h2 class="text-sm font-bold text-gray-900 dark:text-white">Needs attention</h2>
            <UBadge color="warning" variant="soft" size="sm">{{ pendingRequestsCount }}</UBadge>
          </header>
          <div>
            <NuxtLink
              v-for="t in attentionTournaments"
              :key="t.id"
              :to="`/tournaments/${t.customName || t.id}`"
              class="flex items-center gap-3 px-5 py-3 border-b border-gray-100 dark:border-white/5 last:border-b-0 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors group"
            >
              <UAvatar :src="t.logoUrl || undefined" :text="t.name.charAt(0).toUpperCase()" size="sm" />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{{ t.name }}</p>
                <p class="text-[11px] text-gray-500 dark:text-gray-400">
                  {{ t.pendingRequestsCount }} player{{ t.pendingRequestsCount > 1 ? 's' : '' }} waiting for approval
                </p>
              </div>
              <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors" />
            </NuxtLink>
          </div>
        </section>

        <!-- Quick actions -->
        <section class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden">
          <header class="px-5 py-4 border-b border-gray-100 dark:border-white/5">
            <h2 class="text-sm font-bold text-gray-900 dark:text-white">Quick actions</h2>
          </header>
          <div class="grid grid-cols-2 gap-2.5 p-4">
            <UButton variant="outline" color="neutral" icon="i-heroicons-trophy" class="justify-start" to="/tournaments/new">New tournament</UButton>
            <UButton variant="outline" color="neutral" icon="i-heroicons-beaker" class="justify-start" :loading="creatingPractice" @click="handleCreatePractice">Practice</UButton>
            <UButton variant="outline" color="neutral" icon="i-heroicons-photo" class="justify-start" to="/widgets">Widgets</UButton>
            <UButton variant="outline" color="neutral" icon="i-heroicons-link" class="justify-start" @click="copyFanLink">Copy fan link</UButton>
          </div>
        </section>
      </div>
    </div>

    <!-- Tournaments -->
    <section>
      <div class="flex items-center justify-between gap-3 flex-wrap mb-4">
        <h2 class="text-base font-bold text-gray-900 dark:text-white">Your tournaments</h2>
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
      </div>

      <!-- loading skeletons -->
      <div v-if="loading && tournaments.length === 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 animate-pulse">
        <div v-for="i in 4" :key="i" class="h-40 bg-gray-100 dark:bg-white/5 rounded-2xl"></div>
      </div>

      <!-- empty -->
      <div v-else-if="!loading && tournaments.length === 0" class="flex flex-col items-center text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl px-6 py-14">
        <div class="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center mb-4">
          <UIcon name="i-heroicons-trophy" class="w-8 h-8 text-emerald-500" />
        </div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-1.5">No tournaments yet</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
          Create your first tournament — add teams, schedule fixtures, and publish a fan page before kickoff.
        </p>
        <UButton color="primary" icon="i-heroicons-plus" to="/tournaments/new">Create your first tournament</UButton>
      </div>

      <!-- filter empty -->
      <div v-else-if="filteredTournaments.length === 0" class="flex flex-col items-center text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl px-6 py-10">
        <UIcon name="i-heroicons-funnel" class="w-7 h-7 text-gray-400 mb-3" />
        <p class="text-sm font-semibold text-gray-900 dark:text-white">No tournaments in this filter</p>
        <p class="text-xs text-gray-500 mt-1">Try another filter above.</p>
      </div>

      <!-- cards -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div
          v-for="t in filteredTournaments"
          :key="t.id"
          class="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-4.5 hover:border-emerald-500/40 dark:hover:border-emerald-500/30 hover:-translate-y-0.5 hover:shadow-lg transition-all"
          :class="{ 'opacity-70': !isTodayOrAfter(t.end_date) }"
        >
          <span
            v-if="liveTournamentIds.has(t.id)"
            class="absolute -top-2.5 left-4 inline-flex items-center gap-1.5 bg-red-500 text-white text-[9px] font-extrabold tracking-widest uppercase px-2 py-0.5 rounded-full shadow-md"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
            Live now
          </span>

          <div class="flex items-start justify-between mb-3.5">
            <UAvatar :src="t.logoUrl || undefined" :text="t.name.charAt(0).toUpperCase()" size="lg" class="rounded-xl" />
            <button
              class="p-1 transition-all hover:scale-110"
              :class="t.isPinned ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600 hover:text-amber-400'"
              :title="t.isPinned ? 'Unpin' : 'Pin to top'"
              @click.prevent="togglePin(t)"
            >
              <UIcon :name="t.isPinned ? 'i-heroicons-star-solid' : 'i-heroicons-star'" class="w-4.5 h-4.5" />
            </button>
          </div>

          <NuxtLink :to="`/tournaments/${t.customName || t.id}`" class="block group">
            <h3 class="text-sm font-bold text-gray-900 dark:text-white leading-snug line-clamp-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {{ t.name }}
            </h3>
            <div class="flex flex-wrap gap-1.5 mt-2.5">
              <UBadge color="success" variant="soft" size="xs" class="capitalize">{{ t.sport }}</UBadge>
              <UBadge :color="formatTagColor(t.type)" variant="soft" size="xs">{{ t.type.replace(/_/g, ' ') }}</UBadge>
            </div>
            <div class="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-white/5 text-[11px] text-gray-500 dark:text-gray-400 font-medium">
              <span>{{ formatDateRange(t) }}</span>
              <UIcon name="i-heroicons-arrow-right" class="w-3.5 h-3.5 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Match control modal -->
    <MatchControl
      :fixture="selectedFixture"
      v-model:open="showMatchControlModal"
      @fixture-updated="handleFixtureUpdated"
      @match-ended="handleMatchEnded"
    />
  </div>
</template>
