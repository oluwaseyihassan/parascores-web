<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAdminStore } from '~/stores/admin'

definePageMeta({
  layout: 'admin'
})

const adminStore = useAdminStore()
const { loading, error } = storeToRefs(adminStore)

const players = ref<any[]>([])
const page = ref(1)
const limit = ref(20)
const total = ref(0)
const totalPages = ref(0)

const loadPendingPlayers = async () => {
  try {
    const data = await adminStore.fetchPendingPlayers({
      page: page.value,
      limit: limit.value
    })
    if (data) {
      players.value = data.items
      total.value = data.total
      totalPages.value = data.pages
    }
  } catch (err) {
    console.error('Failed to load pending player requests:', err)
  }
}

watch(page, () => {
  loadPendingPlayers()
})

onMounted(() => {
  loadPendingPlayers()
})

const handleStatusUpdate = async (id: string, name: string, status: 'APPROVED' | 'REJECTED') => {
  try {
    await adminStore.updatePlayerStatus(id, status)
    useToast().add({
      title: `Player Request ${status === 'APPROVED' ? 'Approved' : 'Rejected'}`,
      description: `Successfully processed request for player ${name}`,
      color: 'success'
    })
    loadPendingPlayers()
  } catch (err: any) {
    useToast().add({
      title: 'Action Failed',
      description: err.message || 'Failed to process player request.',
      color: 'error'
    })
  }
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}
</script>

<template>
  <div class="space-y-8 select-none">
    <!-- Title Section -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
      <div>
        <h1 class="text-3xl font-extrabold tracking-tight text-white">Pending Player Registrations</h1>
        <p class="text-sm text-slate-400 mt-1">Review, approve, or reject player join requests seeking competitive admission.</p>
      </div>
      <div class="text-slate-400 text-sm font-bold bg-slate-950 px-4 py-2 border border-slate-800 rounded-2xl">
        Total Pending: <span class="text-rose-500 font-extrabold">{{ total }}</span>
      </div>
    </div>

    <!-- Table of Pending Players -->
    <div class="bg-slate-950 border border-slate-850 rounded-3xl overflow-hidden shadow-xl">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-800/80 bg-slate-900/35">
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Player Name</th>
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Registered Team</th>
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Tournament Destination</th>
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Linked User Account</th>
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Requested Date</th>
              <th class="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-900">
            <tr v-if="loading" v-for="n in 5" :key="n" class="animate-pulse">
              <td class="px-6 py-4.5"><div class="h-5 w-32 bg-slate-800 rounded"></div></td>
              <td class="px-6 py-4.5"><div class="h-5 w-24 bg-slate-800 rounded"></div></td>
              <td class="px-6 py-4.5"><div class="h-5 w-40 bg-slate-800 rounded"></div></td>
              <td class="px-6 py-4.5"><div class="h-5 w-28 bg-slate-800 rounded"></div></td>
              <td class="px-6 py-4.5"><div class="h-5 w-20 bg-slate-800 rounded"></div></td>
              <td class="px-6 py-4.5"><div class="h-8 w-20 bg-slate-800 rounded ml-auto"></div></td>
            </tr>
            <tr v-else-if="players.length === 0">
              <td colspan="6" class="px-6 py-12 text-center text-slate-500 text-sm">
                No pending player registrations requiring approval at this time.
              </td>
            </tr>
            <tr v-else v-for="p in players" :key="p.id" class="hover:bg-slate-900/25 transition-colors">
              <td class="px-6 py-4 text-sm font-extrabold text-white">
                {{ p.name }}
              </td>
              <td class="px-6 py-4 text-sm text-slate-300 font-bold">
                {{ p.participant?.customName || 'Unassigned' }}
              </td>
              <td class="px-6 py-4 text-sm text-slate-400">
                {{ p.participant?.tournament?.name || 'Unassigned' }}
              </td>
              <td class="px-6 py-4">
                <div class="flex flex-col text-xs font-semibold">
                  <span class="text-white">{{ p.user?.name || 'Anonymous User' }}</span>
                  <span class="text-slate-500 mt-0.5">{{ p.user?.email }}</span>
                </div>
              </td>
              <td class="px-6 py-4 text-xs font-semibold text-slate-400">
                {{ formatDate(p.createdAt) }}
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <UButton
                    size="sm"
                    color="neutral"
                    variant="outline"
                    icon="i-heroicons-x-mark"
                    @click="handleStatusUpdate(p.id, p.name, 'REJECTED')"
                  >
                    Reject
                  </UButton>
                  <UButton
                    size="sm"
                    color="success"
                    variant="solid"
                    icon="i-heroicons-check"
                    @click="handleStatusUpdate(p.id, p.name, 'APPROVED')"
                  >
                    Approve
                  </UButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
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
            @click="page--"
          >
            Previous
          </UButton>
          <UButton
            size="sm"
            color="neutral"
            variant="outline"
            :disabled="page === totalPages"
            @click="page++"
          >
            Next
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
