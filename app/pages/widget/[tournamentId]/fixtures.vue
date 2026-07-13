<script setup lang="ts">
import type { Tournament, Fixture } from '~/types'
import { FixtureStatus, FixtureStage, TournamentType } from '~/types'

definePageMeta({
  layout: 'widget'
})

const route = useRoute()
const tournamentId = route.params.tournamentId as string

// Theme (injected from widget layout)
const isDark = inject<Ref<boolean>>('widgetIsDark', ref(true))

// State
const tournament = ref<Tournament | null>(null)
const fixtures = ref<Fixture[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

// Connect to Live Stream SSE for the widget
useLiveStream()

if (typeof window !== 'undefined') {
  window.addEventListener('live-match-update', (e: Event) => {
    const customEvent = e as CustomEvent
    const { type, data } = customEvent.detail

    if (type === 'fixture_updated') {
      const targetIdx = fixtures.value.findIndex((f) => f.id === data.id)
      if (targetIdx !== -1) {
        fixtures.value[targetIdx] = { ...fixtures.value[targetIdx], ...data }
      }
    }
  })
}

// Fetch data
const fetchData = async () => {
  loading.value = true
  error.value = null
  try {
    const [tournamentRes, fixturesRes] = await Promise.all([
      $api<any>(`/tournaments/${tournamentId}`),
      $api<any>(`/fixtures/tournaments/${tournamentId}`)
    ])
    tournament.value = tournamentRes.data
    
    // Handle API response: may be { rounds: [...] } or flat array
    const fixturesData = fixturesRes.data
    let allFixtures: Fixture[] = []
    if (fixturesData?.rounds) {
      allFixtures = fixturesData.rounds.flatMap((r: any) => r.fixtures || [])
    } else if (Array.isArray(fixturesData)) {
      allFixtures = fixturesData
    }
    fixtures.value = allFixtures
  } catch (e: any) {
    error.value = e.message || 'Failed to load tournament data'
    console.error('Widget error:', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})

// Group fixtures by stage then round (for hybrid tournaments)
const isHybrid = computed(() => tournament.value?.type === TournamentType.HYBRID)

const groupStageFixtures = computed(() => 
  fixtures.value.filter(f => f.stage === FixtureStage.GROUP_STAGE)
)
const knockoutStageFixtures = computed(() => 
  fixtures.value.filter(f => f.stage === FixtureStage.KNOCKOUT)
)

const groupedByRound = computed(() => {
  const source = isHybrid.value ? groupStageFixtures.value : fixtures.value
  return groupFixturesByRound(source)
})

const knockoutGroupedByRound = computed(() => {
  return groupFixturesByRound(knockoutStageFixtures.value)
})

function groupFixturesByRound(list: Fixture[]) {
  const grouped: Record<string, { name: string; fixtures: Fixture[] }> = {}
  for (const fixture of list) {
    const round = fixture.round || 1
    const name = fixture.roundName || `Round ${round}`
    const key = `${round}::${name}`
    if (!grouped[key]) {
      grouped[key] = {
        name,
        fixtures: []
      }
    }
    grouped[key].fixtures.push(fixture)
  }
  return grouped
}

const sortedRounds = computed(() => {
  return Object.keys(groupedByRound.value).sort((a, b) => {
    const aNum = parseInt(a.split('::')[0]!)
    const bNum = parseInt(b.split('::')[0]!)
    if (aNum !== bNum) return aNum - bNum
    const aName = a.split('::')[1] || ''
    const bName = b.split('::')[1] || ''
    if (aName.toLowerCase().includes('final') && !aName.toLowerCase().includes('third')) return 1
    if (bName.toLowerCase().includes('final') && !bName.toLowerCase().includes('third')) return -1
    return 0
  })
})

const sortedKnockoutRounds = computed(() => {
  return Object.keys(knockoutGroupedByRound.value).sort((a, b) => {
    const aNum = parseInt(a.split('::')[0]!)
    const bNum = parseInt(b.split('::')[0]!)
    if (aNum !== bNum) return aNum - bNum
    const aName = a.split('::')[1] || ''
    const bName = b.split('::')[1] || ''
    if (aName.toLowerCase().includes('final') && !aName.toLowerCase().includes('third')) return 1
    if (bName.toLowerCase().includes('final') && !bName.toLowerCase().includes('third')) return -1
    return 0
  })
})

const hasLiveFixtures = computed(() => fixtures.value.some(f => f.status === FixtureStatus.LIVE || f.status === FixtureStatus.NORMAL_TIME_ENDED || f.status === FixtureStatus.EXTRATIME))
const matchTimer = useMatchTimer(30000)

// Collapsible rounds
const collapsedRounds = ref<Record<string, boolean>>({})
function toggleRound(round: string) {
  collapsedRounds.value[round] = !collapsedRounds.value[round]
}

// Format time from startTime
function formatTime(dateStr?: string | null) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

// Format date for round headers
function formatDate(dateStr?: string | null) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="max-w-xl mx-auto px-2 py-4 font-sans text-xs">
    <div v-if="loading" class="flex items-center justify-center py-16">
      <div class="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
    <div v-else-if="error" class="text-center py-16">
      <p class="text-xs bg-red-500/10 text-red-500 font-medium inline-block px-4 py-2 rounded-lg border border-red-500/20">{{ error }}</p>
    </div>

    <div v-else>
      <div :class="isDark ? 'bg-zinc-900 border border-white/5 shadow-[0_0_15px_rgba(0,0,0,0.5)]' : 'bg-white shadow-sm border border-black/5'" class="rounded-2xl mb-5 overflow-hidden backdrop-blur-sm relative">
        <div class="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none"></div>
        <div class="flex items-center gap-4 px-5 py-3 relative z-10">
          <div :class="isDark ? 'bg-zinc-800 border-white/10' : 'bg-gray-100 border-black/5'" class="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 shadow-inner border">
            <img v-if="tournament?.logoUrl" :src="tournament.logoUrl" class="w-full h-full object-cover" />
            <span v-else class="flex items-center justify-center w-full h-full text-[13px] font-bold bg-gradient-to-br from-zinc-400 to-zinc-600 bg-clip-text text-transparent">
              {{ (tournament?.name || 'T').charAt(0) }}
            </span>
          </div>
          <div class="flex-1 min-w-0">
            <h2 :class="isDark ? 'text-white' : 'text-gray-900'" class="text-sm font-extrabold truncate tracking-tight">{{ tournament?.name }}</h2>
            <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-500">{{ tournament?.type?.replace(/_/g, ' ') }}</span>
              <span class="w-1 h-1 rounded-full bg-gray-500/50"></span>
              <span class="text-[11px] font-medium text-gray-500">{{ fixtures.length }} fixtures</span>
              <span v-if="hasLiveFixtures" class="ml-2 text-[9px] font-bold text-red-500 flex items-center gap-1 px-1 py-0.5 bg-red-500/10 rounded tracking-wider">
                <span class="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
                LIVE
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="fixtures.length > 0" class="space-y-4">
        <div v-if="isHybrid && groupStageFixtures.length > 0" class="flex items-center gap-2 px-2 mb-1">
          <div class="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
          <span class="text-[10.5px] font-bold uppercase tracking-widest" :class="isDark ? 'text-zinc-400' : 'text-gray-500'">Group Stage</span>
        </div>

        <div v-for="round in sortedRounds" :key="round" :class="isDark ? 'bg-zinc-900 border border-white/5 shadow-md' : 'bg-white border border-black/5 shadow-xs'" class="rounded-2xl overflow-hidden backdrop-blur-md">
          <button
            @click="toggleRound(round)"
            :class="[isDark ? 'hover:bg-white/5 border-white/5 text-zinc-300' : 'hover:bg-black/[0.02] border-black/5 text-gray-700', collapsedRounds[round] ? 'border-transparent' : 'border-b']"
            class="w-full flex items-center justify-between px-5 py-3 cursor-pointer select-none transition-colors border-b"
          >
            <h3 class="text-[10.5px] font-bold uppercase tracking-widest text-left">
              {{ groupedByRound[round]?.name }}
            </h3>
            <div :class="[isDark ? 'bg-white/5 text-zinc-400' : 'bg-black/5 text-gray-500']" class="p-1 rounded-full flex-shrink-0 ml-3">
              <svg
                class="w-3 h-3 transition-transform duration-300"
                :class="[collapsedRounds[round] ? '-rotate-90' : 'rotate-0']"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          <div
            class="round-content"
            :class="{ collapsed: collapsedRounds[round] }"
          >
            <div
              v-for="(fixture, i) in groupedByRound[round]?.fixtures"
              :key="fixture.id"
              :class="{ [isDark ? 'border-t border-white/5' : 'border-t border-black/5']: i > 0 }"
              class="transition-colors relative"
            >
              <!-- Card Header -->
              <div class="flex justify-between items-center text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-2 select-none px-5 pt-3">
                <span>
                  {{ fixture.venue || 'No venue' }}
                </span>
                <span>
                  <template v-if="fixture.status === FixtureStatus.LIVE || fixture.status === FixtureStatus.NORMAL_TIME_ENDED || fixture.status === FixtureStatus.EXTRATIME">
                      <span class="text-red-500 flex items-center gap-1 font-extrabold tracking-widest text-[9px]">
                        <span class="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.8)]"></span>
                      {{ matchTimer.formatMinuteLabel(fixture) || 'LIVE' }}
                    </span>
                  </template>
                  <template v-else-if="fixture.status === FixtureStatus.COMPLETED">
                    <span class="text-emerald-500 dark:text-emerald-400 font-extrabold tracking-widest">FT</span>
                  </template>
                  <template v-else-if="fixture.status === FixtureStatus.CANCELLED">
                    <span class="text-red-500 font-bold tracking-wider">CANC</span>
                  </template>
                  <template v-else-if="fixture.startTime">
                    <span>{{ formatDate(fixture.startTime) }}</span>
                  </template>
                </span>
              </div>

              <!-- Card Body -->
              <div class="flex items-center justify-between px-5 pb-3">
                <!-- Teams Side -->
                <div class="flex-1 space-y-2.5 min-w-0">
                  <!-- Home Team -->
                  <div class="flex items-center gap-2.5 min-w-0">
                    <div :class="isDark ? 'bg-gradient-to-br from-zinc-700 to-zinc-800 border-white/10' : 'bg-gradient-to-br from-gray-100 to-gray-200 border-black/5'" class="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 shadow-sm border">
                      <img v-if="fixture.homeTeam?.logoUrl" :src="fixture.homeTeam.logoUrl" class="w-full h-full object-cover" />
                      <span v-else class="flex items-center justify-center w-full h-full text-[8px] font-bold text-zinc-400">
                        {{ (fixture.homeTeam?.customShortName || fixture.homeTeam?.customName || 'H').charAt(0) }}
                      </span>
                    </div>
                    <span :class="isDark ? 'text-zinc-200 group-hover:text-white' : 'text-gray-800 group-hover:text-black'" class="text-[11.5px] font-semibold truncate transition-colors">
                      {{ fixture.homeTeam?.customShortName || fixture.homeTeam?.customName || fixture.homeTeamPlaceholder || 'TBD' }}
                    </span>
                  </div>

                  <!-- Away Team -->
                  <div class="flex items-center gap-2.5 min-w-0">
                    <div :class="isDark ? 'bg-gradient-to-br from-zinc-700 to-zinc-800 border-white/10' : 'bg-gradient-to-br from-gray-100 to-gray-200 border-black/5'" class="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 shadow-sm border">
                      <img v-if="fixture.awayTeam?.logoUrl" :src="fixture.awayTeam.logoUrl" class="w-full h-full object-cover" />
                      <span v-else class="flex items-center justify-center w-full h-full text-[8px] font-bold text-zinc-400">
                        {{ (fixture.awayTeam?.customShortName || fixture.awayTeam?.customName || 'A').charAt(0) }}
                      </span>
                    </div>
                    <span :class="isDark ? 'text-zinc-200 group-hover:text-white' : 'text-gray-800 group-hover:text-black'" class="text-[11.5px] font-semibold truncate transition-colors">
                      {{ fixture.awayTeam?.customShortName || fixture.awayTeam?.customName || fixture.awayTeamPlaceholder || 'TBD' }}
                    </span>
                  </div>
                </div>

                <!-- Score / Time Box -->
                <div class="flex items-center pl-4 border-l" :class="isDark ? 'border-white/5' : 'border-black/5'">
                  <div class="flex flex-col items-center justify-center min-w-[36px] text-center font-bold text-xs select-none">
                    <template v-if="fixture.status === FixtureStatus.LIVE || fixture.status === FixtureStatus.NORMAL_TIME_ENDED || fixture.status === FixtureStatus.EXTRATIME || fixture.status === FixtureStatus.COMPLETED">
                      <span :class="[fixture.status === FixtureStatus.LIVE || fixture.status === FixtureStatus.NORMAL_TIME_ENDED || fixture.status === FixtureStatus.EXTRATIME ? 'text-emerald-500' : isDark ? 'text-white' : 'text-gray-900']" class="font-black tabular-nums">{{ fixture.homeScore ?? 0 }}</span>
                      <span class="text-[9px] text-zinc-500 leading-none py-0.5">-</span>
                      <span :class="[fixture.status === FixtureStatus.LIVE || fixture.status === FixtureStatus.NORMAL_TIME_ENDED || fixture.status === FixtureStatus.EXTRATIME ? 'text-emerald-500' : isDark ? 'text-white' : 'text-gray-900']" class="font-black tabular-nums">{{ fixture.awayScore ?? 0 }}</span>
                    </template>
                    <template v-else-if="fixture.status === FixtureStatus.CANCELLED">
                      <span class="text-[9px] text-red-500 font-bold">CANC</span>
                    </template>
                    <template v-else>
                      <span class="text-[9px] font-bold uppercase whitespace-nowrap" :class="isDark ? 'text-zinc-400' : 'text-gray-500'">
                        {{ fixture.startTime ? formatTime(fixture.startTime) : 'VS' }}
                      </span>
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <template v-if="isHybrid && knockoutStageFixtures.length > 0">
          <div class="flex items-center gap-2 px-2 mt-4 mb-1">
            <div class="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
            <span class="text-[10.5px] font-bold uppercase tracking-widest" :class="isDark ? 'text-zinc-400' : 'text-gray-500'">Knockout Stage</span>
          </div>

          <div v-for="round in sortedKnockoutRounds" :key="'ko-' + round" :class="isDark ? 'bg-zinc-900/80 border border-white/5 shadow-md' : 'bg-white border border-black/5 shadow-xs'" class="rounded-2xl overflow-hidden backdrop-blur-md">
            <button
              @click="toggleRound('ko::' + round)"
              :class="[isDark ? 'hover:bg-white/5 border-white/5 text-zinc-300' : 'hover:bg-black/[0.02] border-black/5 text-gray-700', collapsedRounds['ko::' + round] ? 'border-transparent' : 'border-b']"
              class="w-full flex items-center justify-between px-5 py-3 cursor-pointer select-none transition-colors border-b"
            >
              <h3 class="text-[10.5px] font-bold uppercase tracking-widest text-left">
                {{ knockoutGroupedByRound[round]?.name }}
              </h3>
              <div :class="[isDark ? 'bg-white/5 text-zinc-400' : 'bg-black/5 text-gray-500']" class="p-1 rounded-full flex-shrink-0 ml-3">
                <svg
                  class="w-3 h-3 transition-transform duration-300"
                  :class="[collapsedRounds['ko::' + round] ? '-rotate-90' : 'rotate-0']"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            <div
              class="round-content"
              :class="{ collapsed: collapsedRounds['ko::' + round] }"
            >
              <div
                v-for="(fixture, i) in knockoutGroupedByRound[round]?.fixtures"
                :key="fixture.id"
                :class="{ [isDark ? 'border-t border-white/5' : 'border-t border-black/5']: i > 0 }"
                class="transition-colors relative"
              >
                <!-- Card Header -->
                <div class="flex justify-between items-center text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-2 select-none px-5 pt-3">
                  <span>
                    {{ fixture.venue || 'No venue' }}
                  </span>
                  <span>
                    <template v-if="fixture.status === FixtureStatus.LIVE || fixture.status === FixtureStatus.NORMAL_TIME_ENDED || fixture.status === FixtureStatus.EXTRATIME">
                      <span class="text-red-500 flex items-center gap-1 font-extrabold tracking-widest text-[9px]">
                        <span class="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.8)]"></span>
                        {{ matchTimer.formatMinuteLabel(fixture) || 'LIVE' }}
                      </span>
                    </template>
                    <template v-else-if="fixture.status === FixtureStatus.COMPLETED">
                      <span class="text-emerald-500 dark:text-emerald-400 font-extrabold tracking-widest">FT</span>
                    </template>
                    <template v-else-if="fixture.status === FixtureStatus.CANCELLED">
                      <span class="text-red-500 font-bold tracking-wider">CANC</span>
                    </template>
                    <template v-else-if="fixture.startTime">
                      <span>{{ formatDate(fixture.startTime) }}</span>
                    </template>
                  </span>
                </div>

                <!-- Card Body -->
                <div class="flex items-center justify-between px-5 pb-3">
                  <!-- Teams Side -->
                  <div class="flex-1 space-y-2.5 min-w-0">
                    <!-- Home Team -->
                    <div class="flex items-center gap-2.5 min-w-0">
                      <div :class="isDark ? 'bg-gradient-to-br from-zinc-700 to-zinc-800 border-white/10' : 'bg-gradient-to-br from-gray-100 to-gray-200 border-black/5'" class="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 shadow-sm border">
                        <img v-if="fixture.homeTeam?.logoUrl" :src="fixture.homeTeam.logoUrl" class="w-full h-full object-cover" />
                        <span v-else class="flex items-center justify-center w-full h-full text-[8px] font-bold text-zinc-400">
                          {{ (fixture.homeTeam?.customShortName || fixture.homeTeam?.customName || 'H').charAt(0) }}
                        </span>
                      </div>
                      <span :class="isDark ? 'text-zinc-200 group-hover:text-white' : 'text-gray-800 group-hover:text-black'" class="text-[11.5px] font-semibold truncate transition-colors">
                        {{ fixture.homeTeam?.customShortName || fixture.homeTeam?.customName || fixture.homeTeamPlaceholder || 'TBD' }}
                      </span>
                    </div>

                    <!-- Away Team -->
                    <div class="flex items-center gap-2.5 min-w-0">
                      <div :class="isDark ? 'bg-gradient-to-br from-zinc-700 to-zinc-800 border-white/10' : 'bg-gradient-to-br from-gray-100 to-gray-200 border-black/5'" class="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 shadow-sm border">
                        <img v-if="fixture.awayTeam?.logoUrl" :src="fixture.awayTeam.logoUrl" class="w-full h-full object-cover" />
                        <span v-else class="flex items-center justify-center w-full h-full text-[8px] font-bold text-zinc-400">
                          {{ (fixture.awayTeam?.customShortName || fixture.awayTeam?.customName || 'A').charAt(0) }}
                        </span>
                      </div>
                      <span :class="isDark ? 'text-zinc-200 group-hover:text-white' : 'text-gray-800 group-hover:text-black'" class="text-[11.5px] font-semibold truncate transition-colors">
                        {{ fixture.awayTeam?.customShortName || fixture.awayTeam?.customName || fixture.awayTeamPlaceholder || 'TBD' }}
                      </span>
                    </div>
                  </div>

                  <!-- Score / Time Box -->
                  <div class="flex items-center pl-4 border-l" :class="isDark ? 'border-white/5' : 'border-black/5'">
                    <div class="flex flex-col items-center justify-center min-w-[36px] text-center font-bold text-xs select-none">
                      <template v-if="fixture.status === FixtureStatus.LIVE || fixture.status === FixtureStatus.NORMAL_TIME_ENDED || fixture.status === FixtureStatus.EXTRATIME || fixture.status === FixtureStatus.COMPLETED">
                        <span :class="[fixture.status === FixtureStatus.LIVE || fixture.status === FixtureStatus.NORMAL_TIME_ENDED || fixture.status === FixtureStatus.EXTRATIME ? 'text-emerald-500' : isDark ? 'text-white' : 'text-gray-900']" class="font-black tabular-nums">{{ fixture.homeScore ?? 0 }}</span>
                        <span class="text-[9px] text-zinc-500 leading-none py-0.5">-</span>
                        <span :class="[fixture.status === FixtureStatus.LIVE || fixture.status === FixtureStatus.NORMAL_TIME_ENDED || fixture.status === FixtureStatus.EXTRATIME ? 'text-emerald-500' : isDark ? 'text-white' : 'text-gray-900']" class="font-black tabular-nums">{{ fixture.awayScore ?? 0 }}</span>
                      </template>
                      <template v-else-if="fixture.status === FixtureStatus.CANCELLED">
                        <span class="text-[9px] text-red-500 font-bold">CANC</span>
                      </template>
                      <template v-else>
                        <span class="text-[9px] font-bold uppercase whitespace-nowrap" :class="isDark ? 'text-zinc-400' : 'text-gray-500'">
                          {{ fixture.startTime ? formatTime(fixture.startTime) : 'VS' }}
                        </span>
                      </template>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <div v-if="fixtures.length === 0" :class="isDark ? 'bg-zinc-900/30 border-white/5' : 'bg-gray-50 border-black/5'" class="text-center py-20 rounded-2xl border backdrop-blur-sm">
        <div :class="isDark ? 'bg-white/5' : 'bg-black/5'" class="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg class="w-6 h-6 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
        </div>
        <p class="text-[13px] font-medium text-zinc-400">No fixtures found for this tournament.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.round-content {
  max-height: 2500px;
  overflow: hidden;
  transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
  opacity: 1;
}
.round-content.collapsed {
  max-height: 0;
  opacity: 0;
}
</style>
