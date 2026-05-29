<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAdminStore } from '~/stores/admin'

definePageMeta({
  layout: 'admin'
})

const adminStore = useAdminStore()
const { loading, error } = storeToRefs(adminStore)

const health = ref<any>(null)

const loadHealth = async () => {
  try {
    const data = await adminStore.fetchHealth()
    if (data) {
      health.value = data
    }
  } catch (err) {
    console.error('Failed to load health metrics:', err)
  }
}

onMounted(() => {
  loadHealth()
})

const formatUptime = (sec: number) => {
  if (!sec) return '-'
  const d = Math.floor(sec / (3600 * 24))
  const h = Math.floor((sec % (3600 * 24)) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)

  const parts = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  parts.push(`${s}s`)
  return parts.join(' ')
}
</script>

<template>
  <div class="space-y-8 select-none">
    <!-- Title Section -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
      <div>
        <h1 class="text-3xl font-extrabold tracking-tight text-white">System Diagnostics</h1>
        <p class="text-sm text-slate-400 mt-1">Live health indicators, database latencies, and container memory configurations.</p>
      </div>
      <div class="flex items-center gap-3">
        <UButton
          size="sm"
          color="neutral"
          variant="outline"
          icon="i-heroicons-arrow-path"
          :loading="loading"
          @click="loadHealth"
        >
          Check System Status
        </UButton>
      </div>
    </div>

    <!-- Error State -->
    <UAlert
      v-if="error"
      title="Diagnostics Degraded"
      description="Could not complete raw queries against the API. The API service may be fully offline."
      color="error"
      variant="subtle"
      icon="i-heroicons-exclamation-triangle"
    />

    <!-- Health Overview Cards -->
    <div v-if="health" class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-slate-950 border border-slate-850 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between">
        <div>
          <span class="text-slate-500 text-[10px] font-bold uppercase tracking-wider">System Status</span>
          <div class="flex items-center gap-2 mt-2">
            <span class="w-3 h-3 rounded-full animate-pulse" :class="health.status === 'healthy' ? 'bg-emerald-500' : 'bg-rose-500'"></span>
            <span class="text-2xl font-black text-white capitalize">{{ health.status }}</span>
          </div>
        </div>
        <p class="text-xs text-slate-500 mt-4">API timestamp: <span class="text-slate-400 font-mono">{{ new Date(health.timestamp).toLocaleTimeString() }}</span></p>
      </div>

      <div class="bg-slate-950 border border-slate-850 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between">
        <div>
          <span class="text-slate-500 text-[10px] font-bold uppercase tracking-wider">API Uptime</span>
          <div class="text-2xl font-black text-white mt-2 font-mono">
            {{ formatUptime(health.uptime) }}
          </div>
        </div>
        <p class="text-xs text-slate-500 mt-4">Node Runtime: <span class="text-slate-400 font-semibold">{{ health.node || '-' }}</span></p>
      </div>

      <div class="bg-slate-950 border border-slate-850 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between">
        <div>
          <span class="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Database Connectivity</span>
          <div class="flex items-center gap-2 mt-2 text-2xl font-black text-white">
            <UIcon name="i-heroicons-circle-stack" class="w-6 h-6 text-sky-500 shrink-0" />
            <span class="capitalize">{{ health.database?.status || 'unknown' }}</span>
          </div>
        </div>
        <p class="text-xs text-slate-500 mt-4">Prisma Query Latency: <span class="text-sky-400 font-semibold font-mono">{{ health.database?.latency || '-' }}</span></p>
      </div>
    </div>

    <!-- Diagnostic Details -->
    <div v-if="health" class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Memory Allocation Metrics -->
      <div class="bg-slate-950 border border-slate-850 rounded-3xl p-6">
        <h3 class="text-base font-bold text-white mb-4 flex items-center gap-2">
          <UIcon name="i-heroicons-cpu-chip" class="w-5 h-5 text-rose-500" />
          API Memory Allocation
        </h3>
        <div class="space-y-4">
          <div>
            <div class="flex justify-between text-xs font-bold mb-1">
              <span class="text-slate-400">Heap Memory Used</span>
              <span class="text-white font-mono">{{ health.memory?.heapUsed || '-' }}</span>
            </div>
            <!-- Progress Bar -->
            <div class="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div class="h-full bg-rose-500 rounded-full" style="width: 45%"></div>
            </div>
          </div>

          <div>
            <div class="flex justify-between text-xs font-bold mb-1">
              <span class="text-slate-400">Heap Memory Total Available</span>
              <span class="text-white font-mono">{{ health.memory?.heapTotal || '-' }}</span>
            </div>
            <div class="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div class="h-full bg-indigo-500 rounded-full" style="width: 70%"></div>
            </div>
          </div>

          <div>
            <div class="flex justify-between text-xs font-bold mb-1">
              <span class="text-slate-400">Resident Set Size (RSS)</span>
              <span class="text-white font-mono">{{ health.memory?.rss || '-' }}</span>
            </div>
            <div class="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div class="h-full bg-sky-500 rounded-full" style="width: 30%"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Environment and Configuration -->
      <div class="bg-slate-950 border border-slate-850 rounded-3xl p-6">
        <h3 class="text-base font-bold text-white mb-4 flex items-center gap-2">
          <UIcon name="i-heroicons-cog-8-tooth" class="w-5 h-5 text-violet-500" />
          Runtime Environment Info
        </h3>
        <div class="divide-y divide-slate-900 text-xs font-semibold">
          <div class="flex justify-between py-3">
            <span class="text-slate-500">Node Environment</span>
            <span class="text-white uppercase tracking-wider">{{ health.environment }}</span>
          </div>
          <div class="flex justify-between py-3">
            <span class="text-slate-500">Service Deployment Mode</span>
            <span class="text-emerald-500">Monitored</span>
          </div>
          <div class="flex justify-between py-3">
            <span class="text-slate-500">Logging Stream</span>
            <span class="text-slate-300 font-mono">Console/Winston</span>
          </div>
          <div class="flex justify-between py-3">
            <span class="text-slate-500">Database Driver</span>
            <span class="text-slate-300 font-mono">Prisma / PostgreSQL</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
