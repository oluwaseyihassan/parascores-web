<script setup lang="ts">
import { type Standing } from '~/types'

const props = defineProps<{
  standings: Standing[]
  loading?: boolean
}>()

const columns = [
  { accessorKey: 'position', header: 'Pos', meta: { class: { th: 'w-10 sm:w-12 text-center px-1 sm:px-3 text-[11px] sm:text-xs whitespace-nowrap shrink-0', td: 'w-10 sm:w-12 text-center px-1 sm:px-3 text-xs sm:text-sm whitespace-nowrap shrink-0' } } },
  { accessorKey: 'participant', header: 'Team', meta: { class: { th: 'w-full min-w-[140px] sm:min-w-[200px] px-1 sm:px-3 text-[11px] sm:text-xs', td: 'w-full min-w-[140px] sm:min-w-[200px] px-1 sm:px-3' } } },
  { accessorKey: 'played', header: 'P', meta: { class: { th: 'w-11 sm:w-14 text-center px-1 sm:px-3 text-[11px] sm:text-xs whitespace-nowrap shrink-0', td: 'w-11 sm:w-14 text-center px-1 sm:px-3 text-xs sm:text-sm whitespace-nowrap shrink-0' } } },
  { accessorKey: 'wins', header: 'W', meta: { class: { th: 'w-11 sm:w-14 text-center px-1 sm:px-3 text-[11px] sm:text-xs whitespace-nowrap shrink-0', td: 'w-11 sm:w-14 text-center px-1 sm:px-3 text-xs sm:text-sm whitespace-nowrap shrink-0' } } },
  { accessorKey: 'draws', header: 'D', meta: { class: { th: 'w-11 sm:w-14 text-center px-1 sm:px-3 text-[11px] sm:text-xs whitespace-nowrap shrink-0', td: 'w-11 sm:w-14 text-center px-1 sm:px-3 text-xs sm:text-sm whitespace-nowrap shrink-0' } } },
  { accessorKey: 'losses', header: 'L', meta: { class: { th: 'w-11 sm:w-14 text-center px-1 sm:px-3 text-[11px] sm:text-xs whitespace-nowrap shrink-0', td: 'w-11 sm:w-14 text-center px-1 sm:px-3 text-xs sm:text-sm whitespace-nowrap shrink-0' } } },
  { accessorKey: 'goalDiff', header: 'GD', meta: { class: { th: 'w-14 sm:w-18 text-center px-1 sm:px-3 text-[11px] sm:text-xs whitespace-nowrap shrink-0', td: 'w-14 sm:w-18 text-center px-1 sm:px-3 text-xs sm:text-sm whitespace-nowrap shrink-0' } } },
  { accessorKey: 'points', header: 'Pts', meta: { class: { th: 'w-12 sm:w-14 text-center font-bold px-1.5 sm:px-3 text-[11px] sm:text-xs whitespace-nowrap shrink-0', td: 'w-12 sm:w-14 text-center font-bold px-1.5 sm:px-3 text-xs sm:text-sm whitespace-nowrap shrink-0' } } }
]

// Helper to cast row type in template slots
const getRow = (row: any) => row.original as Standing

const tournamentStore = useTournamentStore()
const isChampionsLeague = computed(() => {
  return !!(tournamentStore.currentTournament?.unifiedStandings && tournamentStore.currentTournament?.hasKnockoutPlayoffs)
})

// Safe data for UTable to prevent "not iterable" errors
const tableData = computed(() => {
  if (Array.isArray(props.standings)) return props.standings
  return []
})
</script>

<template>
  <div class="w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    <UTable 
      :data="tableData" 
      :columns="columns"
      :loading="loading"
      class="w-full"
      :ui="{ tr: 'hover:bg-gray-50 dark:hover:bg-gray-800/50' }"
    >
      <!-- Position Column -->
      <template #position-cell="{ row }">
        <div 
          class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mx-auto"
          :class="[
            isChampionsLeague && (getRow(row).position || row.index + 1) <= 8
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 ring-1 ring-emerald-500/30 font-bold'
              : isChampionsLeague && (getRow(row).position || row.index + 1) <= 24
              ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 ring-1 ring-sky-500/30'
              : (getRow(row).position || row.index + 1) <= 4
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
              : 'text-gray-500'
          ]"
        >
          {{ getRow(row).position || row.index + 1 }}
        </div>
      </template>
  
      <!-- Team Column -->
      <template #participant-cell="{ row }">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
            <img
              v-if="getRow(row).participant?.logoUrl"
              :src="getRow(row).participant?.logoUrl || ''"
              :alt="getRow(row).participant?.customShortName || getRow(row).participant?.customName || 'Team'"
              class="w-full h-full object-cover"
            />
            <span v-else class="text-[10px] font-medium text-gray-600 dark:text-gray-300">
              {{ (getRow(row).participant?.customShortName || getRow(row).participant?.customName || 'T').charAt(0).toUpperCase() }}
            </span>
          </div>
          <span class="font-medium text-gray-900 dark:text-white truncate max-w-[100px] sm:max-w-[180px]">
            {{ getRow(row).participant?.customShortName || getRow(row).participant?.customName || getRow(row).participant?.user?.name || 'Unknown' }}
          </span>
        </div>
      </template>
      
      <!-- Pts Column (highlighted) -->
      <template #points-cell="{ row }">
        <span class="font-bold text-gray-900 dark:text-white">
          {{ getRow(row).points }}
        </span>
      </template>
      
      <!-- GD Column -->
      <template #goalDiff-cell="{ row }">
        <span 
          :class="[
            getRow(row).goalDiff > 0 ? 'text-green-600 dark:text-green-400' : 
            getRow(row).goalDiff < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500'
          ]"
        >
          {{ getRow(row).goalDiff > 0 ? `+${getRow(row).goalDiff}` : getRow(row).goalDiff }}
        </span>
      </template>
    </UTable>

    <!-- Champions League Qualification Legend -->
    <div v-if="isChampionsLeague" class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] pt-3 px-2 border-t border-gray-100 dark:border-white/[0.05] text-gray-500">
      <div class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-1 ring-emerald-500/30"></span>
        <span class="text-gray-700 dark:text-gray-300 font-medium">1–8: Direct Round of 16 (Bye)</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-full bg-sky-500 ring-1 ring-sky-500/30"></span>
        <span class="text-gray-700 dark:text-gray-300 font-medium">9–24: Knockout Play-offs</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-full bg-gray-400"></span>
        <span class="text-gray-400">25–36: Eliminated</span>
      </div>
    </div>
  </div>
</template>
