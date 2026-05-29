<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAdminStore } from '~/stores/admin'

definePageMeta({
  layout: 'admin'
})

const adminStore = useAdminStore()
const { loading, error } = storeToRefs(adminStore)

const organizations = ref<any[]>([])
const search = ref('')
const page = ref(1)
const limit = ref(20)
const total = ref(0)
const totalPages = ref(0)

const loadOrgs = async () => {
  try {
    const data = await adminStore.fetchOrganizations({
      page: page.value,
      limit: limit.value,
      search: search.value || undefined
    })
    if (data) {
      organizations.value = data.items
      total.value = data.total
      totalPages.value = data.pages
    }
  } catch (err) {
    console.error('Failed to load organizations:', err)
  }
}

watch(page, () => {
  loadOrgs()
})

const triggerSearch = () => {
  page.value = 1
  loadOrgs()
}

onMounted(() => {
  loadOrgs()
})

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
        <h1 class="text-3xl font-extrabold tracking-tight text-white">Registered Organizations</h1>
        <p class="text-sm text-slate-400 mt-1">Audit, monitor subscriptions, and verify tournament organizer organizations.</p>
      </div>
      <div class="text-slate-400 text-sm font-bold bg-slate-950 px-4 py-2 border border-slate-800 rounded-2xl">
        Total Organizations: <span class="text-rose-500 font-extrabold">{{ total }}</span>
      </div>
    </div>

    <!-- Filters and Search -->
    <div class="flex flex-col sm:flex-row gap-4 bg-slate-950 p-4 border border-slate-850 rounded-2xl">
      <div class="flex-1 relative">
        <UInput
          v-model="search"
          placeholder="Search by organization name or custom URL slug..."
          icon="i-heroicons-magnifying-glass"
          size="md"
          class="w-full"
          @keydown.enter="triggerSearch"
        />
      </div>
      <div class="shrink-0">
        <UButton
          color="primary"
          icon="i-heroicons-magnifying-glass"
          @click="triggerSearch"
        >
          Search
        </UButton>
      </div>
    </div>

    <!-- Organizations Table -->
    <div class="bg-slate-950 border border-slate-850 rounded-3xl overflow-hidden shadow-xl">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-800/80 bg-slate-900/35">
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Organization Name</th>
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Slug</th>
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Stat Totals</th>
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Verification</th>
              <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Subscription Plan</th>
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
            <tr v-else-if="organizations.length === 0">
              <td colspan="6" class="px-6 py-12 text-center text-slate-500 text-sm">
                No organizations registered matching your search criteria.
              </td>
            </tr>
            <tr v-else v-for="org in organizations" :key="org.id" class="hover:bg-slate-900/25 transition-colors group">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <UAvatar
                    v-if="org.logoUrl"
                    :src="org.logoUrl"
                    size="sm"
                  />
                  <div v-else class="w-8 h-8 rounded-lg bg-sky-950/20 border border-sky-900/30 text-sky-500 flex items-center justify-center font-bold text-xs">
                    {{ org.name.charAt(0).toUpperCase() }}
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="text-sm font-extrabold text-white truncate leading-none mb-1">{{ org.name }}</span>
                    <span class="text-[10px] text-slate-500 leading-none">ID: {{ org.id }}</span>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 text-xs font-mono text-slate-300">
                {{ org.slug }}
              </td>
              <td class="px-6 py-4 text-xs font-semibold text-slate-400">
                <div class="flex flex-col gap-0.5">
                  <span>Members: <span class="text-white font-extrabold">{{ org._count?.members || 0 }}</span></span>
                  <span>Tournaments: <span class="text-white font-extrabold">{{ org._count?.tournaments || 0 }}</span></span>
                </div>
              </td>
              <td class="px-6 py-4">
                <span 
                  class="px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider"
                  :class="org.isVerified ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-500 border-slate-700'"
                >
                  {{ org.isVerified ? 'Verified' : 'Standard' }}
                </span>
              </td>
              <td class="px-6 py-4">
                <span 
                  class="px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider"
                  :class="[
                    org.subscription?.plan === 'PRO' 
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  ]"
                >
                  {{ org.subscription?.plan || 'FREE' }}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <UButton
                  size="sm"
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-eye"
                  @click="navigateTo(`/organizations/${org.id}`)"
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
  </div>
</template>
