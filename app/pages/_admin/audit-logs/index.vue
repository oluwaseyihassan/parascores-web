<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAdminStore } from '~/stores/admin'

definePageMeta({
  layout: 'admin'
})

const adminStore = useAdminStore()
const { loading, error } = storeToRefs(adminStore)

const logs = ref<any[]>([])
const page = ref(1)
const limit = ref(20)
const total = ref(0)
const totalPages = ref(0)
const selectedAction = ref('all')
const selectedEntityType = ref('all')

const actionOptions = [
  { value: 'USER_DELETE', label: 'User Deleted' },
  { value: 'USER_ROLE_UPDATE', label: 'User Role Updated' },
  { value: 'TOURNAMENT_DELETE', label: 'Tournament Deleted' },
  { value: 'TOURNAMENT_PRICING_UPDATE', label: 'Tournament Pricing Updated' },
  { value: 'ORGANIZATION_VERIFY', label: 'Organization Verification' },
  { value: 'ORGANIZATION_SUBSCRIPTION_UPDATE', label: 'Organization Subscription Updated' },
  { value: 'PLAYER_STATUS_UPDATE', label: 'Player Status Updated' },
]

const entityTypeOptions = [
  { value: 'USER', label: 'User' },
  { value: 'TOURNAMENT', label: 'Tournament' },
  { value: 'ORGANIZATION', label: 'Organization' },
  { value: 'PLAYER', label: 'Player' },
]

const loadLogs = async () => {
  try {
    const data = await adminStore.fetchAuditLogs({
      page: page.value,
      limit: limit.value,
      action: selectedAction.value === 'all' ? undefined : selectedAction.value,
      entityType: selectedEntityType.value === 'all' ? undefined : selectedEntityType.value,
    })
    if (data) {
      logs.value = data.items
      total.value = data.total
      totalPages.value = data.pages
    }
  } catch (err) {
    console.error('Failed to load audit logs:', err)
  }
}

watch([page, selectedAction, selectedEntityType], () => {
  loadLogs()
})

onMounted(() => {
  loadLogs()
})

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getActionColor = (action: string) => {
  switch (action) {
    case 'USER_DELETE':
    case 'TOURNAMENT_DELETE':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    case 'USER_ROLE_UPDATE':
    case 'ORGANIZATION_SUBSCRIPTION_UPDATE':
      return 'bg-violet-500/10 text-violet-400 border-violet-500/20'
    case 'ORGANIZATION_VERIFY':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    case 'TOURNAMENT_PRICING_UPDATE':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    case 'PLAYER_STATUS_UPDATE':
      return 'bg-sky-500/10 text-sky-400 border-sky-500/20'
    default:
      return 'bg-slate-800 text-slate-400 border-slate-700'
  }
}

const getActionLabel = (action: string) => {
  const option = actionOptions.find((o) => o.value === action)
  return option?.label || action.replace(/_/g, ' ')
}

const getEntityTypeIcon = (entityType: string) => {
  switch (entityType) {
    case 'USER':
      return 'i-heroicons-user'
    case 'TOURNAMENT':
      return 'i-heroicons-trophy'
    case 'ORGANIZATION':
      return 'i-heroicons-building-office-2'
    case 'PLAYER':
      return 'i-heroicons-user-group'
    default:
      return 'i-heroicons-squares-2x2'
  }
}
</script>

<template>
  <div class="space-y-8 select-none">
    <!-- Title Section -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
      <div>
        <h1 class="text-3xl font-extrabold tracking-tight text-white">Audit Logs</h1>
        <p class="text-sm text-slate-400 mt-1">Track every administrative action across the platform.</p>
      </div>
      <div class="text-slate-400 text-sm font-bold bg-slate-950 px-4 py-2 border border-slate-800 rounded-2xl">
        Total Logs: <span class="text-rose-500 font-extrabold">{{ total }}</span>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-4 bg-slate-950 p-4 border border-slate-850 rounded-2xl">
      <select
        v-model="selectedAction"
        class="bg-slate-900 border border-slate-800 text-slate-200 text-sm font-semibold rounded-xl px-3.5 py-2 w-full sm:w-56 focus:ring-rose-500 focus:border-rose-500 focus:outline-none"
      >
        <option value="all">All Actions</option>
        <option v-for="option in actionOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      <select
        v-model="selectedEntityType"
        class="bg-slate-900 border border-slate-800 text-slate-200 text-sm font-semibold rounded-xl px-3.5 py-2 w-full sm:w-48 focus:ring-rose-500 focus:border-rose-500 focus:outline-none"
      >
        <option value="all">All Entity Types</option>
        <option v-for="option in entityTypeOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </div>

    <!-- Logs Table -->
    <div class="bg-slate-950 border border-slate-850 rounded-3xl overflow-hidden shadow-xl">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-800/80 bg-slate-900/35">
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Timestamp</th>
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Admin</th>
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Action</th>
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Entity</th>
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Entity ID</th>
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Details</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-900">
            <tr v-if="loading" v-for="n in 5" :key="n" class="animate-pulse">
              <td class="px-6 py-4.5"><div class="h-5 w-32 bg-slate-800 rounded"></div></td>
              <td class="px-6 py-4.5"><div class="h-5 w-40 bg-slate-800 rounded"></div></td>
              <td class="px-6 py-4.5"><div class="h-5 w-28 bg-slate-800 rounded"></div></td>
              <td class="px-6 py-4.5"><div class="h-5 w-24 bg-slate-800 rounded"></div></td>
              <td class="px-6 py-4.5"><div class="h-5 w-32 bg-slate-800 rounded"></div></td>
              <td class="px-6 py-4.5"><div class="h-5 w-40 bg-slate-800 rounded"></div></td>
            </tr>
            <tr v-else-if="logs.length === 0">
              <td colspan="6" class="px-6 py-12 text-center text-slate-500 text-sm">
                No audit logs found.
              </td>
            </tr>
            <tr v-else v-for="log in logs" :key="log.id" class="hover:bg-slate-900/25 transition-colors">
              <td class="px-6 py-4 text-xs font-semibold text-slate-400">
                {{ formatDate(log.createdAt) }}
              </td>
              <td class="px-6 py-4">
                <div class="flex flex-col min-w-0 text-xs font-semibold">
                  <span class="text-white font-bold truncate">{{ log.actor?.name || 'Unknown' }}</span>
                  <span class="text-slate-500 truncate">{{ log.actor?.email }}</span>
                </div>
              </td>
              <td class="px-6 py-4">
                <span
                  class="px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider"
                  :class="getActionColor(log.action)"
                >
                  {{ getActionLabel(log.action) }}
                </span>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <UIcon :name="getEntityTypeIcon(log.entityType)" class="w-4 h-4 text-slate-500" />
                  {{ log.entityType }}
                </div>
              </td>
              <td class="px-6 py-4 text-xs font-mono text-slate-400 select-all">
                {{ log.entityId }}
              </td>
              <td class="px-6 py-4 text-xs text-slate-400">
                <span v-if="!log.metadata || Object.keys(log.metadata).length === 0">—</span>
                <code v-else class="font-mono text-[10px] bg-slate-900 px-2 py-1 rounded border border-slate-800">
                  {{ JSON.stringify(log.metadata) }}
                </code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="border-t border-slate-800/80 px-6 py-4 bg-slate-900/15 flex items-center justify-between">
        <span class="text-xs text-slate-500 font-semibold">
          Showing page {{ page }} of {{ totalPages }}
        </span>
        <div class="flex gap-2">
          <UButton
            size="sm"
            color="neutral"
            variant="outline"
            :disabled="page === 1"
            @click="page--;"
          >
            Previous
          </UButton>
          <UButton
            size="sm"
            color="neutral"
            variant="outline"
            :disabled="page === totalPages"
            @click="page++;"
          >
            Next
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
