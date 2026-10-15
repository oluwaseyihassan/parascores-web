<template>
  <NuxtLink
    :to="toTournament(tournament)"
    class="group relative bg-white dark:bg-[#0c111a] border border-gray-200 dark:border-white/[0.08] rounded-2xl p-3 sm:p-4 shadow-sm hover:border-emerald-500/50 dark:hover:border-emerald-500/40 hover:shadow-md dark:hover:shadow-emerald-950/20 transition-all duration-200 card-fade-in flex flex-row items-center gap-3.5 sm:gap-4 overflow-hidden"
  >
    <!-- Practice Badge (Top Right Corner) -->
    <span
      v-if="tournament.isPractice"
      class="absolute top-3 right-3 inline-flex items-center px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-500 z-20 shrink-0"
    >
      Practice
    </span>

    <!-- Left Media Thumbnail -->
    <div
      class="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-xl sm:rounded-2xl overflow-hidden relative shrink-0 bg-slate-950 border border-gray-200/60 dark:border-white/[0.06] flex items-center justify-center shadow-inner"
    >
      <!-- Background Banner / Photo -->
      <img
        v-if="tournament.bannerUrl"
        :src="tournament.bannerUrl"
        :alt="tournament.name"
        class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
      <!-- Fallback sporting gradient -->
      <div
        v-else
        class="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#101726] to-[#070b13] flex items-center justify-center"
      >
        <div class="absolute inset-0 opacity-20 bg-[radial-gradient(#34d399_1px,transparent_1px)] [background-size:12px_12px]"></div>
      </div>

      <!-- Scrim overlay on banner photo -->
      <div v-if="tournament.bannerUrl" class="absolute inset-0 bg-black/25"></div>

      <!-- Centered Crest / Logo Badge -->
      <div
        v-if="tournament.logoUrl"
        class="relative z-10 w-11 h-11 sm:w-13 sm:h-13 md:w-14 md:h-14 rounded-xl flex items-center justify-center p-1.5 transition-transform duration-300 group-hover:scale-105"
        :class="tournament.bannerUrl ? 'bg-black/40 backdrop-blur-md border border-white/15 shadow-lg' : ''"
      >
        <img
          :src="tournament.logoUrl"
          :alt="tournament.name"
          class="max-w-full max-h-full object-contain filter drop-shadow"
        />
      </div>
      <!-- Fallback Monogram when no logo and no banner -->
      <div
        v-else-if="!tournament.bannerUrl"
        class="relative z-10 w-11 h-11 sm:w-13 sm:h-13 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-lg"
      >
        <span class="text-xl sm:text-2xl font-black text-white drop-shadow">
          {{ tournament.name.charAt(0).toUpperCase() }}
        </span>
      </div>
    </div>

    <!-- Right Content Info -->
    <div class="flex flex-col justify-center flex-1 min-w-0 py-0.5">
      <!-- Date Range (Top) -->
      <div class="text-xs sm:text-[13px] text-gray-500 dark:text-[#8e9cae] font-medium leading-normal mb-1 sm:mb-1.5 truncate">
        {{ dateDisplay }}
      </div>

      <!-- Tournament Title (Middle) -->
      <h3
        class="text-base sm:text-lg lg:text-[19px] font-extrabold tracking-tight text-gray-900 dark:text-white leading-snug line-clamp-2 mb-2 sm:mb-2.5 group-hover:text-emerald-400 transition-colors"
      >
        {{ tournament.name }}
      </h3>

      <!-- Location Chip (Bottom) -->
      <div class="mt-auto">
        <div
          v-if="tournament.location"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.08] text-[11px] sm:text-xs font-medium text-gray-600 dark:text-[#94a3b8] max-w-full"
        >
          <UIcon name="i-heroicons-map-pin" class="w-3.5 h-3.5 text-gray-400 dark:text-gray-400 shrink-0" />
          <span class="truncate">{{ tournament.location }}</span>
        </div>
        <div
          v-else-if="tournament.organization"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.08] text-[11px] sm:text-xs font-medium text-gray-600 dark:text-[#94a3b8] max-w-full"
        >
          <UIcon name="i-heroicons-building-office-2" class="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span class="truncate">{{ tournament.organization.name }}</span>
        </div>
        <div
          v-else
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.08] text-[11px] sm:text-xs font-medium text-gray-600 dark:text-[#94a3b8] max-w-full"
        >
          <UIcon name="i-heroicons-trophy" class="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span class="capitalize">{{ tournament.sport }}</span>
        </div>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { Tournament } from '~/types'

const props = defineProps<{
  tournament: Tournament
}>()

const { toTournament } = useHost()

function parseDateParts(dateStr?: string | null): { year: number; month: number; day: number; monthName: string } | null {
  if (!dateStr) return null

  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match && match[1] && match[2] && match[3]) {
    const year = parseInt(match[1], 10)
    const month = parseInt(match[2], 10) - 1
    const day = parseInt(match[3], 10)
    const d = new Date(year, month, day, 12, 0, 0)
    const monthName = d.toLocaleDateString('en-US', { month: 'long' })
    return { year, month, day, monthName }
  }

  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return {
    year: d.getFullYear(),
    month: d.getMonth(),
    day: d.getDate(),
    monthName: d.toLocaleDateString('en-US', { month: 'long' })
  }
}

function formatDateRange(startDateStr?: string | null, endDateStr?: string | null): string {
  const start = parseDateParts(startDateStr)
  if (!start) return ''

  const end = parseDateParts(endDateStr)
  if (!end || (start.year === end.year && start.month === end.month && start.day === end.day)) {
    return `${start.monthName} ${start.day}, ${start.year}`
  }

  if (start.year === end.year) {
    return `${start.monthName} ${start.day} - ${end.monthName} ${end.day}, ${start.year}`
  }

  return `${start.monthName} ${start.day}, ${start.year} - ${end.monthName} ${end.day}, ${end.year}`
}

const dateDisplay = computed(() => {
  return formatDateRange(props.tournament.start_date, props.tournament.end_date)
})
</script>

<style scoped>
.card-fade-in {
  opacity: 0;
  animation: cardFadeUp 0.4s ease-out forwards;
}

@keyframes cardFadeUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
