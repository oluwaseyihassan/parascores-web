<script setup lang="ts">
import { $fetch } from 'ofetch'
import type { ApiResponse } from '~/stores/auth'
import type { MedalTableRow } from '~/composables/useEventHub'

definePageMeta({
  layout: 'widget',
})

const route = useRoute()
const subdomain = route.params.subdomain as string
const accent = computed(() => (route.query.accent as string) || '#f5b32b')
const limit = computed(() => Number(route.query.limit) || 10)

const isDark = inject<Ref<boolean>>('widgetIsDark', ref(true))

const rows = ref<MedalTableRow[]>([])
const eventName = ref<string>('')
const loading = ref(true)
const error = ref<string | null>(null)

const apiBase = useRuntimeConfig().public.API_BASE_URL as string

const fetchData = async () => {
  try {
    const [orgRes, medalsRes] = await Promise.all([
      $fetch<ApiResponse<{ name: string }>>(`${apiBase}/organizations/event-hub/${subdomain}`),
      $fetch<ApiResponse<MedalTableRow[]>>(`${apiBase}/organizations/event-hub/${subdomain}/medals`),
    ])
    eventName.value = orgRes.data?.name ?? ''
    rows.value = (medalsRes.data ?? []).slice(0, limit.value)
    error.value = null
  } catch (e: any) {
    error.value = e.message || 'Failed to load medal table'
  } finally {
    loading.value = false
  }
}

// Refresh on live updates (a final completing changes the table)
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
</script>

<template>
  <div class="p-3">
    <div class="flex items-center justify-between mb-2 px-1">
      <h3 class="text-xs font-black uppercase tracking-wider" :class="isDark ? 'text-white' : 'text-gray-900'">
        🏅 Medal Table
      </h3>
      <span v-if="eventName" class="text-[9px] font-bold uppercase tracking-wider" :class="isDark ? 'text-white/40' : 'text-gray-500'">
        {{ eventName }}
      </span>
    </div>

    <div v-if="loading" class="text-center py-6 text-xs" :class="isDark ? 'text-white/40' : 'text-gray-500'">
      Loading…
    </div>
    <div v-else-if="error" class="text-center py-6 text-xs text-red-400">{{ error }}</div>
    <div v-else-if="!rows.length" class="text-center py-6 text-xs" :class="isDark ? 'text-white/40' : 'text-gray-500'">
      No institutions on the roster yet.
    </div>

    <div v-else class="rounded-xl overflow-hidden border" :class="isDark ? 'border-white/10' : 'border-gray-200'">
      <div
        v-for="(row, i) in rows"
        :key="row.rosterEntryId"
        class="flex items-center gap-2 px-3 py-2 text-xs"
        :class="[
          i % 2 === 0 ? (isDark ? 'bg-white/[0.03]' : 'bg-gray-50') : '',
          row.total > 0 && i === 0 ? 'font-extrabold' : '',
        ]"
        :style="row.total > 0 && i === 0 ? { background: `linear-gradient(90deg, ${accent}22, transparent)` } : {}"
      >
        <span class="w-5 font-black" :class="isDark ? 'text-white/50' : 'text-gray-400'">{{ i + 1 }}</span>
        <img v-if="row.logoUrl" :src="row.logoUrl" :alt="row.name" class="w-4 h-4 rounded object-contain">
        <span class="flex-1 font-bold truncate" :class="isDark ? 'text-white' : 'text-gray-900'">
          {{ row.shortName ?? row.name }}
        </span>
        <span class="w-8 text-center" :class="isDark ? 'text-white/60' : 'text-gray-600'">🥇 {{ row.gold }}</span>
        <span class="w-8 text-center" :class="isDark ? 'text-white/60' : 'text-gray-600'">🥈 {{ row.silver }}</span>
        <span class="w-8 text-center" :class="isDark ? 'text-white/60' : 'text-gray-600'">🥉 {{ row.bronze }}</span>
        <span class="w-8 text-right font-black" :style="row.total > 0 && i === 0 ? { color: accent } : {}">
          {{ row.total }}
        </span>
      </div>
    </div>
  </div>
</template>
