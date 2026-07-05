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
const selectedPremium = ref('all')
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
      sport: selectedSport.value === 'all' ? undefined : selectedSport.value,
      isPremium: selectedPremium.value === 'all' ? undefined : selectedPremium.value
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

watch([page, selectedSport, selectedPremium], () => {
  loadTournaments()
})

const triggerSearch = () => {
  page.value = 1
  loadTournaments()
}

onMounted(() => {
  loadTournaments()
})

// ─── Delete Logic ────────────────────────────────────────────
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

// ─── Pricing Modal Logic ─────────────────────────────────────
const isPricingModalOpen = ref(false)
const pricingTournament = ref<any>(null)
const pricingForm = reactive({
  tournamentPrice: null as number | null,
  paymentPerTeam: null as number | null,
})
const savingPricing = ref(false)

const openPricingModal = (t: any) => {
  pricingTournament.value = t
  // Convert from kobo (backend) to naira (display)
  pricingForm.tournamentPrice = t.tournamentPrice ? t.tournamentPrice / 100 : null
  pricingForm.paymentPerTeam = t.paymentPerTeam ? t.paymentPerTeam / 100 : null
  isPricingModalOpen.value = true
}

const savePricing = async () => {
  if (!pricingTournament.value) return
  savingPricing.value = true
  try {
    await adminStore.updateTournamentPricing(pricingTournament.value.id, {
      tournamentPrice: pricingForm.tournamentPrice,
      paymentPerTeam: pricingForm.paymentPerTeam,
    })
    useToast().add({
      title: 'Pricing Updated',
      description: `Pricing for "${pricingTournament.value.name}" has been saved successfully.`,
      color: 'success'
    })
    isPricingModalOpen.value = false
    loadTournaments()
  } catch (err) {
    useToast().add({
      title: 'Update Failed',
      description: 'Failed to save tournament pricing. Please try again.',
      color: 'error'
    })
  } finally {
    savingPricing.value = false
  }
}

// ─── Helpers ─────────────────────────────────────────────────
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(val)
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
          v-model="selectedPremium"
          class="bg-slate-900 border border-slate-800 text-slate-200 text-sm font-semibold rounded-xl px-3.5 py-2 focus:ring-rose-500 focus:border-rose-500 focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="true">Premium Only</option>
          <option value="false">Free Only</option>
        </select>
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
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Tournament Price</th>
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Per Team</th>
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
              <td class="px-6 py-4.5"><div class="h-5 w-20 bg-slate-800 rounded"></div></td>
              <td class="px-6 py-4.5"><div class="h-5 w-16 bg-slate-800 rounded"></div></td>
              <td class="px-6 py-4.5"><div class="h-8 w-20 bg-slate-800 rounded ml-auto"></div></td>
            </tr>
            <tr v-else-if="tournaments.length === 0">
              <td colspan="7" class="px-6 py-12 text-center text-slate-500 text-sm">
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
                <span 
                  v-if="t.tournamentPrice" 
                  class="text-sm font-extrabold text-emerald-400"
                >
                  {{ formatCurrency(t.tournamentPrice / 100) }}
                </span>
                <span v-else class="text-xs text-slate-600 italic">Not set</span>
              </td>
              <td class="px-6 py-4">
                <span 
                  v-if="t.paymentPerTeam" 
                  class="text-sm font-extrabold text-violet-400"
                >
                  {{ formatCurrency(t.paymentPerTeam / 100) }}
                </span>
                <span v-else class="text-xs text-slate-600 italic">Not set</span>
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
                <div class="flex items-center justify-end gap-1">
                  <UButton
                    size="sm"
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-currency-dollar"
                    @click="openPricingModal(t)"
                  />
                  <UButton
                    size="sm"
                    color="error"
                    variant="ghost"
                    icon="i-heroicons-trash"
                    @click="openDeleteConfirm(t)"
                  />
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

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="isDeleteModalOpen" title="Delete Tournament">
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
            @click="isDeleteModalOpen = false;"
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

    <!-- Pricing Configuration Modal -->
    <UModal v-model:open="isPricingModalOpen" title="Set Tournament Pricing">
      <template #body>
        <div class="space-y-5">
          <!-- Tournament info header -->
          <div class="flex items-center gap-3 bg-slate-900/50 rounded-xl p-3 border border-slate-800">
            <div class="w-9 h-9 rounded-lg bg-rose-950/30 border border-rose-900/30 text-rose-500 flex items-center justify-center font-bold text-xs shrink-0">
              {{ pricingTournament?.name?.charAt(0)?.toUpperCase() }}
            </div>
            <div class="min-w-0">
              <p class="text-sm font-extrabold text-white truncate">{{ pricingTournament?.name }}</p>
              <p class="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{{ pricingTournament?.sport }} · {{ pricingTournament?.type }}</p>
            </div>
          </div>

          <!-- Tournament Price -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Tournament Price (₦)
            </label>
            <p class="text-[11px] text-slate-500">The total price the tournament organizer should pay to use the platform.</p>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold">₦</span>
              <input
                v-model.number="pricingForm.tournamentPrice"
                type="number"
                min="0"
                step="100"
                placeholder="e.g. 5000"
                class="w-full bg-slate-900 border border-slate-800 text-white text-sm font-semibold rounded-xl pl-8 pr-4 py-2.5 placeholder-slate-600 focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          <!-- Payment Per Team -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Payment Per Team (₦)
            </label>
            <p class="text-[11px] text-slate-500">The amount each participating team should pay to register for this tournament.</p>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold">₦</span>
              <input
                v-model.number="pricingForm.paymentPerTeam"
                type="number"
                min="0"
                step="100"
                placeholder="e.g. 1000"
                class="w-full bg-slate-900 border border-slate-800 text-white text-sm font-semibold rounded-xl pl-8 pr-4 py-2.5 placeholder-slate-600 focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          <!-- Info note -->
          <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-400 flex items-start gap-2">
            <UIcon name="i-heroicons-information-circle" class="w-4 h-4 shrink-0 mt-0.5 text-slate-500" />
            <span>Leave a field empty or set to 0 to indicate no charge. Changes take effect immediately for new registrations.</span>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton
            color="neutral"
            variant="ghost"
            @click="isPricingModalOpen = false;"
          >
            Cancel
          </UButton>
          <UButton
            color="primary"
            variant="solid"
            icon="i-heroicons-check"
            :loading="savingPricing"
            @click="savePricing"
          >
            Save Pricing
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

