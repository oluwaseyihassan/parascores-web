<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAdminStore } from '~/stores/admin'

definePageMeta({
  layout: 'admin'
})

const adminStore = useAdminStore()
const { loading, error } = storeToRefs(adminStore)

const payments = ref<any[]>([])
const summary = ref<any>(null)
const selectedStatus = ref('all')
const selectedType = ref('all')
const page = ref(1)
const limit = ref(20)
const total = ref(0)
const totalPages = ref(0)

const loadPaymentsData = async () => {
  try {
    const [paymentsData, summaryData] = await Promise.all([
      adminStore.fetchPayments({
        page: page.value,
        limit: limit.value,
        status: selectedStatus.value === 'all' ? undefined : selectedStatus.value,
        type: selectedType.value === 'all' ? undefined : selectedType.value
      }),
      adminStore.fetchPaymentsSummary()
    ])
    if (paymentsData) {
      payments.value = paymentsData.items
      total.value = paymentsData.total
      totalPages.value = paymentsData.pages
    }
    if (summaryData) {
      summary.value = summaryData
    }
  } catch (err) {
    console.error('Failed to load payments details:', err)
  }
}

watch([page, selectedStatus, selectedType], () => {
  loadPaymentsData()
})

onMounted(() => {
  loadPaymentsData()
})

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(val)
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div class="space-y-8 select-none">
    <!-- Title Section -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
      <div>
        <h1 class="text-3xl font-extrabold tracking-tight text-white">Payment Records</h1>
        <p class="text-sm text-slate-400 mt-1">Audit transactions, gross platform revenue metrics, and invoice items.</p>
      </div>
      <div class="flex items-center gap-3">
        <UButton
          size="sm"
          color="neutral"
          variant="outline"
          icon="i-heroicons-arrow-path"
          :loading="loading"
          @click="loadPaymentsData"
        >
          Refresh Ledger
        </UButton>
      </div>
    </div>

    <!-- Summary Metrics -->
    <div v-if="summary" class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-slate-950 border border-slate-850 rounded-3xl p-6 relative overflow-hidden">
        <div class="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl"></div>
        <span class="text-slate-400 text-xs font-bold uppercase tracking-wider">Gross Platform Revenue</span>
        <div class="text-3xl font-black text-white mt-3 tracking-tight">
          {{ formatCurrency(summary.total?.amount || 0) }}
        </div>
        <p class="text-xs text-slate-500 mt-1">Total completed charges: <strong class="text-white">{{ summary.total?.count || 0 }}</strong></p>
      </div>

      <div class="bg-slate-950 border border-slate-850 rounded-3xl p-6 relative overflow-hidden">
        <div class="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl"></div>
        <span class="text-slate-400 text-xs font-bold uppercase tracking-wider">Monthly Revenue (Mtd)</span>
        <div class="text-3xl font-black text-white mt-3 tracking-tight">
          {{ formatCurrency(summary.thisMonth?.amount || 0) }}
        </div>
        <p class="text-xs text-slate-500 mt-1">Completed charges this month: <strong class="text-white">{{ summary.thisMonth?.count || 0 }}</strong></p>
      </div>

      <div class="bg-slate-950 border border-slate-850 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between">
        <div class="absolute -top-12 -right-12 w-32 h-32 bg-violet-500/5 rounded-full blur-2xl"></div>
        <span class="text-slate-400 text-xs font-bold uppercase tracking-wider">Revenue Breakdown</span>
        <div class="mt-2 space-y-1.5 text-xs font-semibold text-slate-300">
          <div v-for="type in summary.byType" :key="type.type" class="flex justify-between items-center bg-slate-900/40 p-1.5 rounded-lg border border-slate-850">
            <span class="capitalize">{{ type.type?.toLowerCase() }}</span>
            <span class="text-white font-extrabold">{{ formatCurrency(type.amount) }} ({{ type.count }})</span>
          </div>
          <div v-if="!summary.byType || summary.byType.length === 0" class="text-slate-500 py-1">
            No categorized revenue recorded.
          </div>
        </div>
      </div>
    </div>

    <!-- Filters Section -->
    <div class="flex flex-col sm:flex-row gap-4 bg-slate-950 p-4 border border-slate-850 rounded-2xl">
      <div class="flex-1 flex gap-3">
        <select 
          v-model="selectedStatus"
          class="bg-slate-900 border border-slate-800 text-slate-200 text-sm font-semibold rounded-xl px-3.5 py-2 w-full sm:w-44 focus:ring-rose-500 focus:border-rose-500 focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
        </select>
        <select 
          v-model="selectedType"
          class="bg-slate-900 border border-slate-800 text-slate-200 text-sm font-semibold rounded-xl px-3.5 py-2 w-full sm:w-44 focus:ring-rose-500 focus:border-rose-500 focus:outline-none"
        >
          <option value="all">All Types</option>
          <option value="SUBSCRIPTION">Subscription</option>
          <option value="TOURNAMENT_REGISTRATION">Tournament Registration</option>
          <option value="PLAYER_CLAIM">Player Claim</option>
          <option value="TEAM_JOIN">Team Join</option>
        </select>
      </div>
    </div>

    <!-- Ledger Table -->
    <div class="bg-slate-950 border border-slate-850 rounded-3xl overflow-hidden shadow-xl">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-800/80 bg-slate-900/35">
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Transaction Ref</th>
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">User Customer</th>
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Context / Destination</th>
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Timestamp</th>
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Charge Type</th>
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
              <th class="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-400">Amount</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-900">
            <tr v-if="loading" v-for="n in 5" :key="n" class="animate-pulse">
              <td class="px-6 py-4.5"><div class="h-5 w-24 bg-slate-800 rounded"></div></td>
              <td class="px-6 py-4.5"><div class="h-5 w-40 bg-slate-800 rounded"></div></td>
              <td class="px-6 py-4.5"><div class="h-5 w-28 bg-slate-800 rounded"></div></td>
              <td class="px-6 py-4.5"><div class="h-5 w-24 bg-slate-800 rounded"></div></td>
              <td class="px-6 py-4.5"><div class="h-5 w-16 bg-slate-800 rounded"></div></td>
              <td class="px-6 py-4.5"><div class="h-5 w-14 bg-slate-800 rounded"></div></td>
              <td class="px-6 py-4.5"><div class="h-5 w-16 bg-slate-800 rounded ml-auto"></div></td>
            </tr>
            <tr v-else-if="payments.length === 0">
              <td colspan="7" class="px-6 py-12 text-center text-slate-500 text-sm">
                No payment transactions recorded matching your search.
              </td>
            </tr>
            <tr v-else v-for="pay in payments" :key="pay.id" class="hover:bg-slate-900/25 transition-colors">
              <td class="px-6 py-4 text-xs font-mono font-bold text-rose-500 select-all">
                {{ pay.paystackReference || 'no-ref' }}
              </td>
              <td class="px-6 py-4">
                <div class="flex flex-col min-w-0 text-xs font-semibold">
                  <span class="text-white font-extrabold truncate">{{ pay.user?.name || 'Anonymous User' }}</span>
                  <span class="text-slate-400 truncate mt-0.5">{{ pay.user?.email }}</span>
                </div>
              </td>
              <td class="px-6 py-4 text-xs font-semibold text-slate-300">
                <div v-if="pay.organization" class="flex flex-col">
                  <span class="text-[10px] text-slate-500 font-bold uppercase">Organization</span>
                  <span>{{ pay.organization.name }}</span>
                </div>
                <div v-else-if="pay.tournament" class="flex flex-col">
                  <span class="text-[10px] text-slate-500 font-bold uppercase">Tournament</span>
                  <span>{{ pay.tournament.name }}</span>
                </div>
                <div v-else class="text-slate-500">
                  General Platform
                </div>
              </td>
              <td class="px-6 py-4 text-xs font-semibold text-slate-400">
                {{ formatDate(pay.created_at) }}
              </td>
              <td class="px-6 py-4">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold border border-slate-700 bg-slate-800 text-slate-400 uppercase tracking-wider">
                  {{ pay.type }}
                </span>
              </td>
              <td class="px-6 py-4">
                <span 
                  class="px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider"
                  :class="[
                    pay.status === 'SUCCESS' || pay.status === 'COMPLETED' 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : pay.status === 'PENDING'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  ]"
                >
                  {{ pay.status }}
                </span>
              </td>
              <td class="px-6 py-4 text-right text-sm font-extrabold text-white">
                {{ formatCurrency(pay.amount) }}
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
  </div>
</template>
