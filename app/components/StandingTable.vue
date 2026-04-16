<script setup lang="ts">
import { type Standing } from '~/types'

const props = defineProps<{
  standings: Standing[]
  loading?: boolean
}>()

const columns = [
  { accessorKey: 'position', header: 'Pos', meta: { class: { th: 'w-8 sm:w-12 text-center px-1 sm:px-3 text-[11px] sm:text-xs', td: 'w-8 sm:w-12 text-center px-1 sm:px-3 text-xs sm:text-sm' } } },
  { accessorKey: 'participant', header: 'Team', meta: { class: { th: 'min-w-[100px] sm:min-w-[150px] px-1 sm:px-3 text-[11px] sm:text-xs', td: 'min-w-[100px] sm:min-w-[150px] px-1 sm:px-3' } } },
  { accessorKey: 'played', header: 'P', meta: { class: { th: 'w-6 sm:w-12 text-center px-0.5 sm:px-3 text-[11px] sm:text-xs', td: 'w-6 sm:w-12 text-center px-0.5 sm:px-3 text-xs sm:text-sm' } } },
  { accessorKey: 'wins', header: 'W', meta: { class: { th: 'w-6 sm:w-12 text-center px-0.5 sm:px-3 text-[11px] sm:text-xs', td: 'w-6 sm:w-12 text-center px-0.5 sm:px-3 text-xs sm:text-sm' } } },
  { accessorKey: 'draws', header: 'D', meta: { class: { th: 'w-6 sm:w-12 text-center px-0.5 sm:px-3 text-[11px] sm:text-xs', td: 'w-6 sm:w-12 text-center px-0.5 sm:px-3 text-xs sm:text-sm' } } },
  { accessorKey: 'losses', header: 'L', meta: { class: { th: 'w-6 sm:w-12 text-center px-0.5 sm:px-3 text-[11px] sm:text-xs', td: 'w-6 sm:w-12 text-center px-0.5 sm:px-3 text-xs sm:text-sm' } } },
  { accessorKey: 'goalDiff', header: 'GD', meta: { class: { th: 'w-8 sm:w-16 text-center px-0.5 sm:px-3 text-[11px] sm:text-xs', td: 'w-8 sm:w-16 text-center px-0.5 sm:px-3 text-xs sm:text-sm' } } },
  { accessorKey: 'points', header: 'Pts', meta: { class: { th: 'w-8 sm:w-12 text-center font-bold px-1 sm:px-3 text-[11px] sm:text-xs', td: 'w-8 sm:w-12 text-center font-bold px-1 sm:px-3 text-xs sm:text-sm' } } }
]

// Helper to cast row type in template slots
const getRow = (row: any) => row.original as Standing

// Safe data for UTable to prevent "not iterable" errors
const tableData = computed(() => {
  if (Array.isArray(props.standings)) return props.standings
  return []
})
</script>

<template>
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
          (getRow(row).position || row.index + 1) <= 4 ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-gray-500'
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
            :alt="getRow(row).participant?.customName || 'Team'"
            class="w-full h-full object-cover"
          />
          <span v-else class="text-[10px] font-medium text-gray-600 dark:text-gray-300">
            {{ (getRow(row).participant?.customName || 'T').charAt(0).toUpperCase() }}
          </span>
        </div>
        <span class="font-medium text-gray-900 dark:text-white truncate max-w-[150px] sm:max-w-[200px]">
          {{ getRow(row).participant?.customName || getRow(row).participant?.user?.name || 'Unknown' }}
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
</template>
