<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAdminStore } from '~/stores/admin'

definePageMeta({
  layout: 'admin'
})

const adminStore = useAdminStore()
const { loading, error } = storeToRefs(adminStore)

const tournaments = ref<any[]>([])
const search = ref('')
const selectedSport = ref('all')
const page = ref(1)
const limit = ref(20)
const total = ref(0)
const totalPages = ref(0)

const loadTournaments = async () => {
  try {
    const data = await adminStore.fetchTournaments({
      page: page.value,
      limit: limit.value,
      search: search.value || undefined,
      sport: selectedSport.value === 'all' ? undefined : selectedSport.value
    })
    if (data) {
      tournaments.value = data.items
      total.value = data.total
      totalPages.value = data.pages
    }
  } catch (err) {
    console.error('Failed to load tournaments:', err)
  }
}

watch([page, selectedSport], () => {
  loadTournaments()
})

const triggerSearch = () => {
  page.value = 1
  loadTournaments()
}

onMounted(() => {
  loadTournaments()
})

const deleteTournamentId = ref<string | null>(null)
const deleteTournamentName = ref('')
const isDeleteModalOpen = ref(false)

const openDeleteConfirm = (t: any) => {
  deleteTournamentId.value = t.id
  deleteTournamentName.value = t.name
  isDeleteModalOpen.value = true
}

const performDelete = async () => {
  if (!deleteTournamentId.value) return
  try {
    await adminStore.deleteTournament(deleteTournamentId.value)
    useToast().add({
      title: 'Tournament Deleted',
      description: `Successfully deleted tournament "${deleteTournamentName.value}"`,
      color: 'success'
    })
    isDeleteModalOpen.value = false
    loadTournaments()
  } catch (err) {
    useToast().add({
      title: 'Action Failed',
      description: 'Failed to delete tournament.',
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

const getStatus = (startStr: string, endStr: string) => {
  const now = new Date()
  const start = new Date(startStr)
  const end = new Date(endStr)

  if (now < start) return 'UPCOMING'
  if (now > end) return 'COMPLETED'
  return 'ONGOING'
}
</script>

<template>
  <div class="space-y-8 select-none">
    <!-- Title Section -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
      <div>
        <h1 class="text-3xl font-extrabold tracking-tight text-white">All Tournaments</h1>
        <p class="text-sm text-slate-400 mt-1">Monitor, audit, and manage competitive events across all organizations.</p>
      </div>
      <div class="text-slate-400 text-sm font-bold bg-slate-950 px-4 py-2 border border-slate-800 rounded-2xl">
        Total Tournaments: <span class="text-rose-500 font-extrabold">{{ total }}</span>
      </div>
    </div>

    <!-- Filters and Search -->
    <div class="flex flex-col sm:flex-row gap-4 bg-slate-950 p-4 border border-slate-850 rounded-2xl">
      <div class="flex-1 relative">
        <UInput
          v-model="search"
          placeholder="Search by tournament name or custom slug..."
          icon="i-heroicons-magnifying-glass"
          size="md"
          class="w-full"
          @keydown.enter="triggerSearch"
        />
      </div>
      <div class="flex items-center gap-3 shrink-0">
        <select 
          v-model="selectedSport"
          class="bg-slate-900 border border-slate-800 text-slate-200 text-sm font-semibold rounded-xl px-3.5 py-2 focus:ring-rose-500 focus:border-rose-500 focus:outline-none"
        >
          <option value="all">All Sports</option>
          <option value="SOCCER">Soccer</option>
          <option value="BASKETBALL">Basketball</option>
          <option value="TENNIS">Tennis</option>
          <option value="VOLLEYBALL">Volleyball</option>
        </select>
        <UButton
          color="primary"
          icon="i-heroicons-magnifying-glass"
          @click="triggerSearch"
        >
          Apply
        </UButton>
      </div>
    </div>

    <!-- Tournaments Table -->
    <div class="bg-slate-950 border border-slate-850 rounded-3xl overflow-hidden shadow-xl">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-800/80 bg-slate-900/35">
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Tournament Name</th>
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Organization</th>
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Sport / Format</th>
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Uptime Details</th>
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
              <th class="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-900">
            <tr v-if="loading" v-for="n in 5" :key="n" class="animate-pulse">
              <td class="px-6 py-4.5"><div class="h-5 w-40 bg-slate-800 rounded"></div></td>
              <td class="px-6 py-4.5"><div class="h-5 w-24 bg-slate-800 rounded"></div></td>
              <td class="px-6 py-4.5"><div class="h-5 w-24 bg-slate-800 rounded"></div></td>
              <td class="px-6 py-4.5"><div class="h-5 w-20 bg-slate-800 rounded"></div></td>
              <td class="px-6 py-4.5"><div class="h-5 w-16 bg-slate-800 rounded"></div></td>
              <td class="px-6 py-4.5"><div class="h-8 w-10 bg-slate-800 rounded ml-auto"></div></td>
            </tr>
            <tr v-else-if="tournaments.length === 0">
              <td colspan="6" class="px-6 py-12 text-center text-slate-500 text-sm">
                No tournaments registered matching your search criteria.
              </td>
            </tr>
            <tr v-else v-for="t in tournaments" :key="t.id" class="hover:bg-slate-900/25 transition-colors group">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <UAvatar
                    v-if="t.logoUrl"
                    :src="t.logoUrl"
                    size="sm"
                  />
                  <div v-else class="w-8 h-8 rounded-lg bg-rose-950/20 border border-rose-900/30 text-rose-500 flex items-center justify-center font-bold text-xs">
                    {{ t.name.charAt(0).toUpperCase() }}
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="text-sm font-extrabold text-white truncate leading-none mb-1">{{ t.name }}</span>
                    <span class="text-xs text-slate-400 truncate leading-none">slug: {{ t.customName || t.id }}</span>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 text-sm font-bold text-slate-300">
                {{ t.organization?.name || 'No Org' }}
              </td>
              <td class="px-6 py-4">
                <div class="flex flex-col">
                  <span class="text-xs font-bold text-slate-200 uppercase tracking-wider">{{ t.sport }}</span>
                  <span class="text-[10px] text-slate-500 uppercase font-semibold mt-0.5">{{ t.type }}</span>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex flex-col text-xs text-slate-400 font-semibold gap-0.5">
                  <span>Start: {{ formatDate(t.start_date) }}</span>
                  <span>End: {{ formatDate(t.end_date) }}</span>
                </div>
              </td>
              <td class="px-6 py-4">
                <span 
                  class="px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider"
                  :class="[
                    getStatus(t.start_date, t.end_date) === 'ONGOING' 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : getStatus(t.start_date, t.end_date) === 'UPCOMING'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                  ]"
                >
                  {{ getStatus(t.start_date, t.end_date) }}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <UButton
                  size="sm"
                  color="error"
                  variant="ghost"
                  icon="i-heroicons-trash"
                  @click="openDeleteConfirm(t)"
                />
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

    <!-- Delete Confirmation Modal -->
    <UModal v-model="isDeleteModalOpen" title="Delete Tournament">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-slate-300">
            Are you sure you want to permanently delete the tournament <strong class="text-white">"{{ deleteTournamentName }}"</strong>?
          </p>
          <div class="bg-rose-950/20 border border-rose-900/30 rounded-xl p-3 text-xs text-rose-400 flex items-start gap-2">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 shrink-0 mt-0.5" />
            <span>This will delete all fixtures, standings, registrations, and matches associated with this tournament immediately. This process is fully irreversible.</span>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton
            color="neutral"
            variant="ghost"
            @click="isDeleteModalOpen = false"
          >
            Cancel
          </UButton>
          <UButton
            color="error"
            variant="solid"
            @click="performDelete"
          >
            Delete Tournament
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
