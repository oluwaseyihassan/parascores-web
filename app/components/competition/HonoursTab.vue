<template>
  <div v-if="crownedEditions.length === 0" class="rounded-2xl p-12 text-center border-2 border-dashed border-subtle bg-white dark:bg-[#141414]">
    <div class="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
      <UIcon name="i-heroicons-trophy" class="w-7 h-7 text-amber-500" />
    </div>
    <h3 class="text-base font-bold text-heading">No champions crowned yet</h3>
    <p class="text-sm text-body mt-1 max-w-md mx-auto">
      Check back after an edition finishes to see the roll of honour and all-time title leaders.
    </p>
  </div>

  <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-6">
    <!-- Roll of Honour (Chronological) -->
    <div class="lg:col-span-7 order-2 lg:order-1">
      <div class="bg-white dark:bg-[#141414] border border-subtle rounded-2xl overflow-hidden shadow-sm">
        <div class="px-5 py-4 border-b border-subtle flex items-center justify-between">
          <div>
            <h2 class="text-sm font-bold text-heading">Roll of Honour</h2>
            <p class="text-xs text-muted mt-0.5">Champions by edition, most recent first</p>
          </div>
          <span class="text-xs font-semibold text-muted tabular-nums">
            {{ crownedEditions.length }} {{ crownedEditions.length === 1 ? 'title' : 'titles' }}
          </span>
        </div>

        <div class="divide-y divide-gray-100 dark:divide-white/[0.06]">
          <NuxtLink
            v-for="edition in crownedEditions"
            :key="edition.id"
            :to="toTournament(edition)"
            class="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
          >
            <div class="flex items-center gap-3.5 min-w-0">
              <span class="text-xs font-bold text-muted tabular-nums w-20 shrink-0 truncate">
                {{ getShortEditionLabel(edition) }}
              </span>
              <div class="w-8 h-8 rounded-full overflow-hidden bg-gray-100 dark:bg-white/5 border border-subtle flex items-center justify-center shrink-0">
                <img
                  v-if="edition.champion?.logoUrl"
                  :src="edition.champion.logoUrl"
                  :alt="edition.champion.name"
                  class="w-full h-full object-cover"
                />
                <UIcon v-else name="i-heroicons-trophy" class="w-4 h-4 text-amber-500" />
              </div>
              <div class="min-w-0">
                <p class="text-sm font-bold text-heading truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {{ edition.champion?.name }}
                </p>
                <p
                  v-if="edition.name && edition.name !== getShortEditionLabel(edition)"
                  class="text-xs text-muted truncate"
                >
                  {{ edition.name }}
                </p>
              </div>
            </div>

            <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-muted group-hover:text-heading shrink-0" />
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Most Titles Leaderboard -->
    <div class="lg:col-span-5 order-1 lg:order-2">
      <div class="bg-white dark:bg-[#141414] border border-subtle rounded-2xl overflow-hidden shadow-sm">
        <div class="px-5 py-4 border-b border-subtle">
          <h2 class="text-sm font-bold text-heading">Most Titles</h2>
          <p class="text-xs text-muted mt-0.5">All-time competition winners</p>
        </div>

        <div class="divide-y divide-gray-100 dark:divide-white/[0.06]">
          <div
            v-for="(entry, idx) in leaderboard"
            :key="entry.key"
            class="flex items-center justify-between gap-3 px-5 py-3.5"
          >
            <div class="flex items-center gap-3 min-w-0">
              <span
                class="w-6 h-6 rounded-full text-xs font-extrabold flex items-center justify-center shrink-0 tabular-nums"
                :class="rankClass(idx)"
              >
                {{ idx + 1 }}
              </span>
              <div class="w-8 h-8 rounded-full overflow-hidden bg-gray-100 dark:bg-white/5 border border-subtle flex items-center justify-center shrink-0">
                <img
                  v-if="entry.logoUrl"
                  :src="entry.logoUrl"
                  :alt="entry.name"
                  class="w-full h-full object-cover"
                />
                <span v-else class="text-xs font-bold text-body">
                  {{ entry.name.charAt(0).toUpperCase() }}
                </span>
              </div>
              <div class="min-w-0">
                <p class="text-sm font-bold text-heading truncate">{{ entry.name }}</p>
                <p class="text-[11px] text-muted truncate">{{ entry.editions.join(', ') }}</p>
              </div>
            </div>

            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-extrabold text-amber-600 dark:text-amber-400 tabular-nums shrink-0">
              <span>{{ entry.titles }}</span>
              <UIcon name="i-heroicons-trophy-solid" class="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CompetitionEdition } from '~/types'
import { getShortEditionLabel } from '~/utils/competition'

const props = defineProps<{
  seasons: CompetitionEdition[]
}>()

const { toTournament } = useHost()

const crownedEditions = computed(() =>
  props.seasons.filter((s) => !!s.champion),
)

const leaderboard = computed(() => {
  const map = new Map<
    string,
    { key: string; name: string; logoUrl: string | null; titles: number; editions: string[] }
  >()

  for (const edition of crownedEditions.value) {
    if (!edition.champion) continue
    const key = edition.champion.name.trim().toLowerCase()
    const existing = map.get(key)
    const label = getShortEditionLabel(edition)
    if (existing) {
      existing.titles += 1
      existing.editions.push(label)
      if (!existing.logoUrl && edition.champion.logoUrl) {
        existing.logoUrl = edition.champion.logoUrl
      }
    } else {
      map.set(key, {
        key,
        name: edition.champion.name,
        logoUrl: edition.champion.logoUrl || null,
        titles: 1,
        editions: [label],
      })
    }
  }

  return Array.from(map.values()).sort((a, b) => b.titles - a.titles || a.name.localeCompare(b.name))
})

function rankClass(idx: number): string {
  if (idx === 0) return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
  if (idx === 1) return 'bg-slate-400/15 text-slate-600 dark:text-slate-300 border border-slate-400/30'
  if (idx === 2) return 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30'
  return 'bg-gray-100 dark:bg-white/[0.06] text-body'
}
</script>
