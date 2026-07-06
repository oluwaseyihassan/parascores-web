<template>
  <div class="min-h-full text-gray-900 dark:text-white overflow-x-hidden">
    <!-- Hero Section -->
    <header class="relative pt-12 pb-16 px-6 overflow-hidden">
      <!-- Background Accents -->
      <div class="absolute top-0 left-1/4 w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-[120px] pointer-events-none"></div>
      <div class="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-white/[0.02] rounded-full blur-[100px] pointer-events-none"></div>

      <div class="max-w-7xl mx-auto relative z-10">
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>

            <h1 class="text-4xl md:text-5xl font-bold tracking-tight">
              Good {{ greetingTime }}, <span class="text-emerald-400">{{ userName }}</span>
            </h1>
            <p class="text-gray-600 dark:text-gray-400 mt-3 text-lg max-w-2xl">
              Stay updated with live scores, upcoming matches, and trending tournaments from the communities you follow.
            </p>
          </div>
        </div>
      </div>
    </header>

     <main class="max-w-7xl mx-auto px-6 pb-24 space-y-16">

      <!-- Match Feed (live + upcoming combined) -->
      <section v-if="authStore.isAuthenticated">
        <div class="flex items-center bg-gray-100 dark:bg-[#1A1A1A] rounded-full p-1 mb-4 border-0">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-heroicons-chevron-left"
            size="xs"
            class="rounded-full text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            @click="prevDate"
          />
          <!-- Calendar Picker -->
          <UPopover v-model:open="calendarOpen" class="flex-1">
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              class="w-full justify-center font-semibold text-gray-900 hover:bg-gray-200 dark:text-white dark:hover:bg-white/5 border-0 ring-0"
              :ui="{ trailingIcon: 'w-3 h-3' }"
              trailing-icon="i-heroicons-chevron-down"
            >
              {{ formatDateTab(selectedDate) }}
            </UButton>
            <template #content>
              <UCalendar
                v-model="selectedDateValue"
              >
                <template #day="{ day }">
                  <div class="flex flex-col items-center justify-center leading-none">
                    <span>{{ day.day }}</span>
                    <span
                        v-if="isDateHighlightable(day)"
                        class="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500"
                    />
                  </div>
                </template>
              </UCalendar>
              <div class="flex items-center justify-center px-3 py-2 border-t border-gray-100 dark:border-white/[0.06]">
                <UButton
                  color="primary"
                  size="sm"
                  @click="goToToday"
                >
                  Today
                </UButton>
              </div>
              <div class="flex items-center justify-center gap-2 px-3 py-2 border-t border-gray-100 dark:border-white/[0.06]">
                <span class="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span class="text-xs text-gray-500 dark:text-gray-400">Matchdays for tournaments you follow</span>
              </div>
            </template>
          </UPopover>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-heroicons-chevron-right"
            size="xs"
            class="rounded-full text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            @click="nextDate"
          />
        </div>

        <!-- Loading -->
        <div v-if="loadingMatches" class="space-y-4">
          <div v-for="i in 2" :key="i" class="rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-[#0A0A0A] p-4 h-32 animate-pulse"></div>
        </div>

        <!-- Empty -->
        <div v-else-if="filteredMatches.length === 0" class="py-12 flex flex-col items-center justify-center border border-gray-200 dark:border-white/[0.06] rounded-2xl bg-white dark:bg-[#0A0A0A]">
          <UIcon name="i-heroicons-calendar" class="w-8 h-8 text-gray-400 mb-2" />
          <p class="text-gray-500 text-sm">No matches for {{ formatDateTab(selectedDate) }}.</p>
        </div>

        <!-- Grouped Matches -->
        <UAccordion v-else v-model="openItems" :items="accordionItems" type="multiple" class="space-y-3 sm:space-y-4">
          <template #leading="{ item }">
            <img
              v-if="item.tournament?.logoUrl"
              :src="item.tournament.logoUrl"
              class="w-4 h-4 object-contain"
              :alt="item.tournament?.name || 'Tournament'"
            />
          </template>
          <template #default="{ item }">
            <span class="cursor-pointer hover:text-gray-900 dark:hover:text-white transition-colors" @click.stop="navigateToTournament(item.tournament)">
              {{ item.label }}
            </span>
          </template>
          <template v-for="item in accordionItems" :key="item.value" #[item.slot]>
            <div class="space-y-1">
              <!-- Matches -->
              <NuxtLink
                v-for="match in item.fixtures"
                :key="match.id"
                :to="toMain(`/t/${match.tournament?.customName || match.tournament?.id}/fixture/${match.id}`)"
                class="group flex flex-col px-3 py-2 sm:px-4 sm:py-3 border-b border-gray-100 dark:border-white/[0.05] last:border-b-0 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
              >
                <!-- Status label above names -->
                <div v-if="match.status === 'LIVE' || match.status === 'EXTRATIME' || match.status === 'COMPLETED'" class="text-center mb-0.5 sm:mb-1">
                  <span
                    v-if="match.status === 'LIVE' || match.status === 'EXTRATIME'"
                    class="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-red-500"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                    {{ matchTimer.formatMinuteLabel(match) }}
                  </span>
                  <span
                    v-else-if="match.status === 'COMPLETED'"
                    class="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-emerald-500"
                  >
                    FT
                  </span>
                </div>

                <div class="flex items-center gap-2 sm:gap-3">
                  <!-- Home Team -->
                  <div class="flex-1 flex items-center justify-end gap-1.5 sm:gap-2 min-w-0">
                    <span class="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate text-right max-w-[50%]">
                      {{ match.homeTeam?.customShortName || match.homeTeam?.customName || match.homeTeamPlaceholder || 'TBD' }}
                    </span>
                    <img
                      v-if="match.homeTeam?.logoUrl"
                      :src="match.homeTeam.logoUrl"
                      class="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover shrink-0"
                      :alt="match.homeTeam?.customShortName || match.homeTeam?.customName || 'Home'"
                    />
                    <span v-else class="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[8px] sm:text-[9px] font-bold bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 shrink-0">
                      {{ (match.homeTeam?.customShortName || match.homeTeam?.customName || 'H').charAt(0) }}
                    </span>
                  </div>

                  <!-- Center Score / Time -->
                  <div class="w-16 sm:w-20 shrink-0 text-center">
                    <div v-if="match.status === 'LIVE' || match.status === 'EXTRATIME' || match.status === 'COMPLETED'" class="text-xs sm:text-sm font-black text-gray-900 dark:text-white tabular-nums">
                      {{ match.homeScore ?? 0 }} - {{ match.awayScore ?? 0 }}
                    </div>
                    <div v-else class="text-xs sm:text-sm font-black text-gray-900 dark:text-white tabular-nums">
                      {{ formatMatchClock(match.startTime) }}
                    </div>
                  </div>

                  <!-- Away Team -->
                  <div class="flex-1 flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <img
                      v-if="match.awayTeam?.logoUrl"
                      :src="match.awayTeam.logoUrl"
                      class="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover shrink-0"
                      :alt="match.awayTeam?.customShortName || match.awayTeam?.customName || 'Away'"
                    />
                    <span v-else class="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[8px] sm:text-[9px] font-bold bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 shrink-0">
                      {{ (match.awayTeam?.customShortName || match.awayTeam?.customName || 'A').charAt(0) }}
                    </span>
                    <span class="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate max-w-[50%]">
                      {{ match.awayTeam?.customShortName || match.awayTeam?.customName || match.awayTeamPlaceholder || 'TBD' }}
                    </span>
                  </div>
                </div>
              </NuxtLink>
            </div>
          </template>
        </UAccordion>
      </section>

      <!-- Followed Tournaments Section -->
      <section v-if="authStore.isAuthenticated && (tournamentStore.followedTournaments.length > 0 || tournamentStore.followedLoading)" class="lg:hidden">
        <div class="flex items-center justify-between mb-8">
          <div class="flex items-center gap-3">
            <h2 class="text-2xl font-bold">Tournaments You Follow</h2>
            <UIcon name="i-heroicons-heart-solid" class="w-6 h-6 text-emerald-500" />
          </div>
        </div>

        <div v-if="tournamentStore.followedLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="i in 3" :key="i" class="h-[320px] bg-white/5 rounded-2xl animate-pulse"></div>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <NuxtLink
            v-for="tournament in tournamentStore.followedTournaments" 
            :key="tournament.id"
            :to="toTournament(tournament as any)"
            class="tournament-card group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-[#0A0A0A] transition-all duration-500 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1"
          >
            <!-- Banner -->
            <div class="relative h-44 overflow-hidden bg-gray-100 dark:bg-white/[0.03]">
              <img 
                v-if="tournament.bannerUrl" 
                :src="tournament.bannerUrl" 
                :alt="tournament.name"
                class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div v-else class="w-full h-full flex items-center justify-center">
                <span class="text-5xl font-black text-gray-200/60 dark:text-white/[0.04] tracking-widest uppercase select-none">
                  {{ tournament.sport.toUpperCase() }}
                </span>
              </div>

              <!-- Bottom fade -->
              <div class="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white dark:from-[#0A0A0A] to-transparent"></div>

              <!-- Sport pill -->
              <div class="absolute top-3 left-3">
                <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/10">
                  <div class="w-5 h-5 rounded-md overflow-hidden bg-emerald-500 flex items-center justify-center shrink-0">
                    <img v-if="tournament.logoUrl" :src="tournament.logoUrl" class="w-full h-full object-cover" />
                    <UIcon v-else name="i-heroicons-trophy" class="w-3 h-3 text-white" />
                  </div>
                  <span class="text-[10px] font-bold text-white/90 uppercase tracking-wider">{{ tournament.sport }}</span>
                </div>
              </div>

              <!-- Participants count pill -->
              <div class="absolute top-3 right-3">
                <div class="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 text-white/80">
                  <UIcon name="i-heroicons-users" class="w-3 h-3" />
                  <span class="text-[10px] font-bold">{{ tournament._count?.participants || 0 }}</span>
                </div>
              </div>
            </div>

            <!-- Content -->
            <div class="flex flex-col flex-1 px-5 pb-5 -mt-3 relative z-10">
              <h3 class="text-lg font-bold text-gray-900 dark:text-white group-hover:text-emerald-500 transition-colors line-clamp-1 mb-1.5">
                {{ tournament.name }}
              </h3>

              <p class="text-xs text-gray-500 dark:text-gray-500 line-clamp-2 mb-5 flex-1 leading-relaxed">
                {{ tournament.description || 'Follow this tournament for live updates and fixtures.' }}
              </p>

              <!-- Footer -->
              <div class="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-white/[0.05]">
                <div class="flex items-center gap-2">
                  <div v-if="tournament.organization?.logoUrl" class="w-5 h-5 rounded-md overflow-hidden bg-gray-100 dark:bg-white/5 shrink-0">
                    <img :src="tournament.organization.logoUrl" class="w-full h-full object-cover" />
                  </div>
                  <span class="text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-wider truncate max-w-[140px]">
                    {{ tournament.organization?.name || 'ParaScores' }}
                  </span>
                </div>

                <div class="flex items-center gap-1 text-emerald-500 text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <span>View</span>
                  <UIcon name="i-heroicons-arrow-right" class="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </NuxtLink>
        </div>
      </section>

      <!-- Trending Tournaments -->
      <section>
        <div class="flex items-center justify-between mb-8">
          <h2 class="text-2xl font-bold">Recommended Tournaments</h2>
          <UButton variant="link" color="neutral" :to="toMain('/explore')" icon="i-heroicons-magnifying-glass" class="text-sm">
            Explore
          </UButton>
        </div>

        <div v-if="loadingTrending" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="i in 3" :key="i" class="h-[320px] bg-white/5 rounded-2xl animate-pulse"></div>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <NuxtLink
            v-for="tournament in trendingTournaments" 
            :key="tournament.id"
            :to="toTournament(tournament)"
            class="tournament-card group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-[#0A0A0A] transition-all duration-500 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1"
          >
            <!-- Banner -->
            <div class="relative h-44 overflow-hidden bg-gray-100 dark:bg-white/[0.03]">
              <img 
                v-if="tournament.bannerUrl" 
                :src="tournament.bannerUrl" 
                :alt="tournament.name"
                class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div v-else class="w-full h-full flex items-center justify-center">
                <span class="text-5xl font-black text-gray-200/60 dark:text-white/[0.04] tracking-widest uppercase select-none">
                  {{ tournament.sport }}
                </span>
              </div>

              <!-- Bottom fade -->
              <div class="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white dark:from-[#0A0A0A] to-transparent"></div>

              <!-- Sport pill -->
              <div class="absolute top-3 left-3">
                <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/10">
                  <div class="w-5 h-5 rounded-md overflow-hidden bg-emerald-500 flex items-center justify-center shrink-0">
                    <img v-if="tournament.logoUrl" :src="tournament.logoUrl" class="w-full h-full object-cover" />
                    <UIcon v-else name="i-heroicons-trophy" class="w-3 h-3 text-white" />
                  </div>
                  <span class="text-[10px] font-bold text-white/90 uppercase tracking-wider">{{ tournament.sport }}</span>
                </div>
              </div>

              <!-- Participants count pill -->
              <div class="absolute top-3 right-3">
                <div class="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 text-white/80">
                  <UIcon name="i-heroicons-users" class="w-3 h-3" />
                  <span class="text-[10px] font-bold">{{ tournament._count?.participants || 0 }}</span>
                </div>
              </div>
            </div>

            <!-- Content -->
            <div class="flex flex-col flex-1 px-5 pb-5 -mt-3 relative z-10">
              <h3 class="text-lg font-bold text-gray-900 dark:text-white group-hover:text-emerald-500 transition-colors line-clamp-1 mb-1.5">
                {{ tournament.name }}
              </h3>

              <p class="text-xs text-gray-500 dark:text-gray-500 line-clamp-2 mb-5 flex-1 leading-relaxed">
                {{ tournament.description || 'No description available for this tournament.' }}
              </p>

              <!-- Footer -->
              <div class="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-white/[0.05]">
                <div class="flex items-center gap-2">
                  <div v-if="tournament.organization?.logoUrl" class="w-5 h-5 rounded-md overflow-hidden bg-gray-100 dark:bg-white/5 shrink-0">
                    <img :src="tournament.organization.logoUrl" class="w-full h-full object-cover" />
                  </div>
                  <span class="text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-wider truncate max-w-[140px]">
                    {{ tournament.organization?.name || 'ParaScores' }}
                  </span>
                </div>

                <div class="flex items-center gap-1 text-emerald-500 text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <span>View</span>
                  <UIcon name="i-heroicons-arrow-right" class="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </NuxtLink>
        </div>
      </section>

      <!-- Quick Actions / My Organizations Section -->
      <section v-if="authStore.isOrganizer">
        <div class="bg-white/[0.02] rounded-2xl p-8 border border-white/[0.05]">
          <div class="flex flex-col lg:flex-row items-center gap-8 text-center lg:text-left">
            <div class="p-6 rounded-2xl bg-white/5 border border-white/[0.05] shrink-0">
               <UIcon name="i-heroicons-rectangle-group" class="w-16 h-16 text-emerald-400" />
            </div>
            
            <div class="flex-1">
              <h2 class="text-2xl font-bold mb-2">Manage Your Workspace</h2>
              <p class="text-gray-400 text-lg">
                Quickly access your organizations, manage team invites, and update tournament settings.
              </p>
            </div>
            
            <div class="flex flex-wrap justify-center gap-4">
              <UButton 
                :to="toManage('/')" 
                color="success" 
                variant="solid" 
                size="lg" 
                class="px-8 rounded-xl font-bold"
              >
                 Dashboard
              </UButton>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import type { Tournament, Fixture } from '~/types'
import { CalendarDate, parseDate, type DateValue } from '@internationalized/date'

type DateRange = { start: DateValue; end: DateValue }

const authStore = useAuthStore()
const tournamentStore = useTournamentStore()
const { toMain, toManage, toTournament } = useHost()

// Live Stream (SSE)
const { isConnected } = useLiveStream()
const matchTimer = useMatchTimer()

// State
const matches = ref<Fixture[]>([])
const trendingTournaments = ref<Tournament[]>([])
const fixtureDates = ref<string[]>([])
const loadingMatches = ref(false)
const loadingTrending = ref(false)
const selectedDate = ref<string>(getTodayKey())
const selectedDateValue = ref<any>(null)
const calendarOpen = ref(false)

function getTodayKey() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

// Computed
const greetingTime = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
})

const userName = computed(() => {
  if (!authStore.user?.name) return 'Fan'
  return authStore.user.name.trim().split(/\s+/)[0]
})

// Filter live and upcoming to only followed tournaments
const followedIds = computed(() => new Set(tournamentStore.followedTournaments.map(t => t.id)))

function groupFixturesByTournament(list: any[]) {
  const grouped: Record<string, { tournament: any; fixtures: any[] }> = {}
  for (const match of list) {
    const tournamentId = match.tournament_id || 'unknown'
    if (!grouped[tournamentId]) {
      grouped[tournamentId] = {
        tournament: match.tournament,
        fixtures: []
      }
    }
    grouped[tournamentId].fixtures.push(match)
  }
  for (const key in grouped) {
    const group = grouped[key]
    if (!group) continue
    group.fixtures.sort((a, b) => {
      if (a.startTime && b.startTime) {
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      }
      if (a.startTime) return -1
      if (b.startTime) return 1
      return (a.matchNumber || 0) - (b.matchNumber || 0)
    })
  }
  return Object.values(grouped)
}

const filteredMatches = computed(() => {
  if (followedIds.value.size === 0) return matches.value
  return matches.value.filter(m => m.tournament_id && followedIds.value.has(m.tournament_id))
})

const matchesByTournament = computed(() => groupFixturesByTournament(filteredMatches.value))

const accordionItems = computed(() =>
  matchesByTournament.value.map((group, index) => ({
    label: group.tournament?.name || 'Tournament',
    value: `tournament-${index}`,
    slot: `tournament-${index}`,
    class: 'rounded-2xl border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-[#0A0A0A] overflow-hidden',
    ui: {
      header: 'px-3 py-1 sm:px-4 sm:py-1.5 bg-gray-50 dark:bg-white/[0.02]',
      label: 'text-[10px] sm:text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider',
      trigger: 'flex items-center gap-2',
      content: 'border-t border-gray-100 dark:border-white/[0.05] overflow-visible',
    },
    tournament: group.tournament,
    fixtures: group.fixtures,
  }))
)

const openItems = ref<string[]>([])

watch(accordionItems, (items) => {
  openItems.value = items.map(item => item.value)
}, { immediate: true })

// Date-based helpers
function getMatchDateKey(dateStr?: string | null) {
  if (!dateStr) return 'unknown'
  const d = new Date(dateStr)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateTab(dateKey: string) {
  const today = getTodayKey()
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowKey = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`

  if (dateKey === today) return 'Today'
  if (dateKey === tomorrowKey) return 'Tomorrow'

  const d = new Date(dateKey)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function isDateHighlightable(date: DateValue) {
  const dateKey = `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`
  return fixtureDates.value.includes(dateKey)
}

function goToToday() {
  const today = getTodayKey()
  selectedDate.value = today
  selectedDateValue.value = parseDate(today)
  calendarOpen.value = false
  fetchMatches()
}

function prevDate() {
  const d = new Date(selectedDate.value)
  d.setDate(d.getDate() - 1)
  selectedDate.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  selectedDateValue.value = parseDate(selectedDate.value)
  fetchMatches()
}

function nextDate() {
  const d = new Date(selectedDate.value)
  d.setDate(d.getDate() + 1)
  selectedDate.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  selectedDateValue.value = parseDate(selectedDate.value)
  fetchMatches()
}

function navigateToTournament(tournament: any) {
  if (!tournament) return
  navigateTo(toMain(`/t/${tournament.customName || tournament.id}`))
}

// Fetching
async function fetchMatches() {
  loadingMatches.value = true
  try {
    const res = await $publicApi<any>(`/fixtures/by-date?date=${selectedDate.value}`)
    matches.value = res.data || []
  } catch (err) {
    console.error('Failed to fetch matches:', err)
  } finally {
    loadingMatches.value = false
  }
}

async function fetchFixtureDates() {
  const ids = tournamentStore.followedTournaments.map(t => t.id).filter(Boolean)
  if (ids.length === 0) {
    fixtureDates.value = []
    return
  }
  try {
    const res = await $publicApi<any>(`/fixtures/dates?tournamentIds=${ids.join(',')}`)
    const utcDates = res.data || []
    fixtureDates.value = utcDates.map((utcDate: string) => {
      const d = new Date(`${utcDate}T00:00:00Z`)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    })
  } catch (err) {
    console.error('Failed to fetch fixture dates:', err)
  }
}

async function fetchTrendingTournaments() {
  loadingTrending.value = true
  try {
    const res = await $publicApi<any>('/tournaments/public?limit=3')
    trendingTournaments.value = res.data || []
  } catch (err) {
    console.error('Failed to fetch trending tournaments:', err)
  } finally {
    loadingTrending.value = false
  }
}

// Time ago helper
function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}



function formatCountdown(dateStr?: string | null) {
  if (!dateStr) return 'TBD'
  const diff = new Date(dateStr).getTime() - Date.now()
  if (diff <= 0) return 'Starting soon'
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `in ${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `in ${hours}h`
  const days = Math.floor(hours / 24)
  return `in ${days}d`
}

function formatMatchTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

function formatMatchDay(dateStr?: string | null) {
  if (!dateStr) return 'TBD'
  const date = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
  const matchDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (matchDay.getTime() === today.getTime()) return 'Today'
  if (matchDay.getTime() === tomorrow.getTime()) return 'Tomorrow'
  return date.toLocaleDateString('en-US', { weekday: 'short' })
}

function formatMatchClock(dateStr?: string | null) {
  if (!dateStr) return '--:--'
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

// SSE: Listen for live match updates and hot-swap data
function handleLiveUpdate(event: Event) {
  const payload = (event as CustomEvent).detail
  if (!payload?.data) return

  const updatedFixture = payload.data as Fixture
  const idx = matches.value.findIndex((m) => m.id === updatedFixture.id)

  if (idx !== -1) {
    matches.value[idx] = updatedFixture
  } else if (getMatchDateKey(updatedFixture.startTime) === selectedDate.value) {
    matches.value.push(updatedFixture)
  }
}

// Watch calendar selection and update date + refetch
watch(selectedDateValue, (value) => {
  if (!value || !('year' in value)) return
  selectedDate.value = `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`
  calendarOpen.value = false
  fetchMatches()
})

// Refetch fixture dates when followed tournaments change
watch(() => tournamentStore.followedTournaments.map(t => t.id).join(','), () => {
  fetchFixtureDates()
}, { immediate: true })

// Initial Load
onMounted(async () => {
  selectedDateValue.value = parseDate(selectedDate.value)
  fetchMatches()
  fetchTrendingTournaments()
  if (authStore.isAuthenticated && tournamentStore.followedTournaments.length === 0) {
    await tournamentStore.fetchFollowedTournaments()
  }
  fetchFixtureDates()

  // Listen for SSE-dispatched events
  window.addEventListener('live-match-update', handleLiveUpdate)
})

onUnmounted(() => {
  window.removeEventListener('live-match-update', handleLiveUpdate)
})
</script>

<style scoped>
.bg-page {
  background-color: #070b10;
}

.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

main > section {
  animation: fadeIn 0.8s ease-out forwards;
}

main > section:nth-child(2) {
  animation-delay: 0.1s;
}

main > section:nth-child(3) {
  animation-delay: 0.2s;
}
</style>
