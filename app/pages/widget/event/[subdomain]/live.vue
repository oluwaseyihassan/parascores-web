<script setup lang="ts">
import { $fetch } from 'ofetch'
import type { ApiResponse } from '~/stores/auth'
import type { EventHubLive, EventHubFixture } from '~/composables/useEventHub'
import { getMatchMinute } from '~/composables/useMatchTimer'

definePageMeta({
  layout: 'widget',
})

const route = useRoute()
const subdomain = route.params.subdomain as string
const accent = computed(() => (route.query.accent as string) || '#f5b32b')
const upcomingLimit = computed(() => Number(route.query.upcoming) || 5)

const isDark = inject<Ref<boolean>>('widgetIsDark', ref(true))

const live = ref<EventHubFixture[]>([])
const upcoming = ref<EventHubFixture[]>([])
const results = ref<EventHubFixture[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const apiBase = useRuntimeConfig().public.API_BASE_URL as string

const fetchData = async () => {
  try {
    const res = await $fetch<ApiResponse<EventHubLive>>(
      `${apiBase}/organizations/event-hub/${subdomain}/live`,
    )
    live.value = res.data?.live ?? []
    upcoming.value = (res.data?.upcoming ?? []).slice(0, upcomingLimit.value)
    results.value = (res.data?.results ?? []).slice(0, 3)
    error.value = null
  } catch (e: any) {
    error.value = e.message || 'Failed to load live scores'
  } finally {
    loading.value = false
  }
}

let refreshTimer: ReturnType<typeof setTimeout> | null = null
const onLiveUpdate = () => {
  if (refreshTimer) clearTimeout(refreshTimer)
  refreshTimer = setTimeout(fetchData, 500)
}

useLiveStream()

onMounted(() => {
  fetchData()
  window.addEventListener('live-match-update', onLiveUpdate)
})

onUnmounted(() => {
  window.removeEventListener('live-match-update', onLiveUpdate)
  if (refreshTimer) clearTimeout(refreshTimer)
})

const teamName = (t: EventHubFixture['homeTeam'], placeholder: string | null) =>
  t?.customShortName ?? t?.customName ?? t?.team?.name ?? placeholder ?? 'TBD'

const liveClock = (f: EventHubFixture) => {
  const minute = getMatchMinute(f as any)
  return minute != null ? `${minute}'` : 'LIVE'
}
</script>

<template>
  <div class="p-3 space-y-3">
    <div v-if="loading" class="text-center py-6 text-xs" :class="isDark ? 'text-white/40' : 'text-gray-500'">
      Loading…
    </div>
    <div v-else-if="error" class="text-center py-6 text-xs text-red-400">{{ error }}</div>

    <template v-else>
      <!-- Live now -->
      <div>
        <h3 class="text-xs font-black uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5" :class="isDark ? 'text-white' : 'text-gray-900'">
          <span v-if="live.length" class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
          Live Now
        </h3>
        <div v-if="live.length" class="space-y-1.5">
          <div
            v-for="f in live"
            :key="f.id"
            class="rounded-xl border px-3 py-2"
            :class="isDark ? 'border-red-500/30 bg-red-500/5' : 'border-red-200 bg-red-50'"
          >
            <div class="text-[9px] font-bold uppercase tracking-wider mb-1" :class="isDark ? 'text-white/40' : 'text-gray-500'">
              {{ f.tournament.name }}<span v-if="f.roundName"> · {{ f.roundName }}</span>
            </div>
            <div class="flex items-center gap-2 text-xs font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
              <span class="flex-1 truncate text-right">{{ teamName(f.homeTeam, f.homeTeamPlaceholder) }}</span>
              <span class="shrink-0 text-sm font-black">
                {{ f.homeScore ?? 0 }}–{{ f.awayScore ?? 0 }}
              </span>
              <span class="flex-1 truncate">{{ teamName(f.awayTeam, f.awayTeamPlaceholder) }}</span>
              <span class="w-8 text-right text-[10px] text-red-400 font-black shrink-0">{{ liveClock(f) }}</span>
            </div>
          </div>
        </div>
        <p v-else class="text-[11px] px-1" :class="isDark ? 'text-white/40' : 'text-gray-500'">
          No matches live right now.
        </p>
      </div>

      <!-- Upcoming -->
      <div v-if="upcoming.length">
        <h3 class="text-xs font-black uppercase tracking-wider mb-2 px-1" :class="isDark ? 'text-white' : 'text-gray-900'">
          Coming Up
        </h3>
        <div class="space-y-1.5">
          <div
            v-for="f in upcoming"
            :key="f.id"
            class="rounded-xl border px-3 py-2"
            :class="isDark ? 'border-white/10 bg-white/[0.03]' : 'border-gray-200 bg-gray-50'"
          >
            <div class="text-[9px] font-bold uppercase tracking-wider mb-1" :class="isDark ? 'text-white/40' : 'text-gray-500'">
              {{ f.tournament.name }}<span v-if="f.roundName"> · {{ f.roundName }}</span>
            </div>
            <div class="flex items-center gap-2 text-xs font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
              <span class="flex-1 truncate text-right">{{ teamName(f.homeTeam, f.homeTeamPlaceholder) }}</span>
              <span class="shrink-0 text-[10px] font-black" :style="{ color: accent }">
                {{ f.startTime ? new Date(f.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD' }}
              </span>
              <span class="flex-1 truncate">{{ teamName(f.awayTeam, f.awayTeamPlaceholder) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent results -->
      <div v-if="results.length">
        <h3 class="text-xs font-black uppercase tracking-wider mb-2 px-1" :class="isDark ? 'text-white' : 'text-gray-900'">
          Results
        </h3>
        <div class="space-y-1.5">
          <div
            v-for="f in results"
            :key="f.id"
            class="rounded-xl border px-3 py-2"
            :class="isDark ? 'border-white/10 bg-white/[0.03]' : 'border-gray-200 bg-gray-50'"
          >
            <div class="text-[9px] font-bold uppercase tracking-wider mb-1" :class="isDark ? 'text-white/40' : 'text-gray-500'">
              {{ f.tournament.name }}<span v-if="f.roundName"> · {{ f.roundName }}</span>
            </div>
            <div class="flex items-center gap-2 text-xs font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
              <span class="flex-1 truncate text-right">{{ teamName(f.homeTeam, f.homeTeamPlaceholder) }}</span>
              <span class="shrink-0 text-sm font-black">
                {{ f.homeScore ?? 0 }}–{{ f.awayScore ?? 0 }}
              </span>
              <span class="flex-1 truncate">{{ teamName(f.awayTeam, f.awayTeamPlaceholder) }}</span>
              <span class="w-8 text-right text-[10px] font-black shrink-0" :class="isDark ? 'text-white/40' : 'text-gray-500'">FT</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
