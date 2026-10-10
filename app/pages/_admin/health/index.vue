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

const formatBytes = (bytes?: number) => {
  if (bytes === undefined || bytes === null) return '-'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let value = bytes
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  return `${value.toFixed(1)} ${units[i]}`
}

const formatPercent = (value?: number) => {
  if (value === undefined || value === null) return '-'
  return `${value}%`
}

const getStatusColor = (status: string) => {
  return status === 'up' ? 'bg-emerald-500' : 'bg-rose-500'
}

const getStatusTextColor = (status: string) => {
  return status === 'up' ? 'text-emerald-400' : 'text-rose-400'
}
</script>

<template>
  <div class="space-y-8 select-none">
    <!-- Title Section -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
      <div>
        <h1 class="text-3xl font-extrabold tracking-tight text-white">System Diagnostics</h1>
        <p class="text-sm text-slate-400 mt-1">Live health indicators, dependency statuses, and resource utilization.</p>
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
      description="Could not complete health check against the API. The API service may be fully offline."
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
            <span class="w-3 h-3 rounded-full animate-pulse" :class="health.status === 'healthy' ? 'bg-emerald-500' : health.status === 'degraded' ? 'bg-amber-500' : 'bg-rose-500'"></span>
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
            <span class="capitalize">{{ health.dependencies?.database?.status || 'unknown' }}</span>
          </div>
        </div>
        <p class="text-xs text-slate-500 mt-4">Prisma Query Latency: <span class="text-sky-400 font-semibold font-mono">{{ health.dependencies?.database?.latency !== undefined ? `${health.dependencies.database.latency}ms` : '-' }}</span></p>
      </div>
    </div>

    <!-- Dependency Status -->
    <div v-if="health && health.dependencies" class="bg-slate-950 border border-slate-850 rounded-3xl p-6">
      <h3 class="text-base font-bold text-white mb-4 flex items-center gap-2">
        <UIcon name="i-heroicons-server-stack" class="w-5 h-5 text-violet-500" />
        Dependency Status
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          v-for="(check, key) in health.dependencies"
          :key="key"
          class="bg-slate-900/40 border border-slate-850 rounded-2xl p-4 flex flex-col justify-between"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">{{ key }}</span>
            <span class="w-2 h-2 rounded-full" :class="getStatusColor(check.status)"></span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-lg font-black text-white capitalize">{{ check.status }}</span>
            <span v-if="check.latency !== undefined" class="text-xs text-slate-500 font-mono">{{ check.latency }}ms</span>
          </div>
          <p v-if="check.message" class="text-xs text-slate-500 mt-2 leading-tight">{{ check.message }}</p>
        </div>
      </div>
    </div>

    <!-- Diagnostic Details -->
    <div v-if="health" class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Memory Allocation Metrics -->
      <div class="bg-slate-950 border border-slate-850 rounded-3xl p-6">
        <h3 class="text-base font-bold text-white mb-4 flex items-center gap-2">
          <UIcon name="i-heroicons-cpu-chip" class="w-5 h-5 text-rose-500" />
          Memory Allocation
        </h3>
        <div class="space-y-5">
          <div v-if="health.memory">
            <div class="flex justify-between text-xs font-bold mb-1">
              <span class="text-slate-400">Heap Memory Used</span>
              <span class="text-white font-mono">{{ formatBytes(health.memory.heapUsed) }} / {{ formatBytes(health.memory.heapTotal) }}</span>
            </div>
            <div class="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                class="h-full bg-rose-500 rounded-full transition-all duration-500"
                :style="{ width: health.memory.heapTotal > 0 ? `${Math.round((health.memory.heapUsed / health.memory.heapTotal) * 100)}%` : '0%' }"
              ></div>
            </div>
          </div>

          <div v-if="health.memory">
            <div class="flex justify-between text-xs font-bold mb-1">
              <span class="text-slate-400">Resident Set Size (RSS)</span>
              <span class="text-white font-mono">{{ formatBytes(health.memory.rss) }}</span>
            </div>
            <div class="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                class="h-full bg-sky-500 rounded-full transition-all duration-500"
                :style="{ width: health.memory.systemTotal > 0 ? `${Math.round((health.memory.rss / health.memory.systemTotal) * 100)}%` : '0%' }"
              ></div>
            </div>
          </div>

          <div v-if="health.memory">
            <div class="flex justify-between text-xs font-bold mb-1">
              <span class="text-slate-400">System Memory Used</span>
              <span class="text-white font-mono">{{ formatPercent(health.memory.systemUsedPercent) }} ({{ formatBytes(health.memory.systemTotal - health.memory.systemFree) }} / {{ formatBytes(health.memory.systemTotal) }})</span>
            </div>
            <div class="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                class="h-full bg-indigo-500 rounded-full transition-all duration-500"
                :style="{ width: `${Math.min(health.memory.systemUsedPercent || 0, 100)}%` }"
              ></div>
            </div>
          </div>

          <div v-if="health.disk">
            <div class="flex justify-between text-xs font-bold mb-1">
              <span class="text-slate-400">Disk Usage</span>
              <span class="text-white font-mono">{{ formatPercent(health.disk.usedPercent) }} ({{ formatBytes(health.disk.total - health.disk.free) }} / {{ formatBytes(health.disk.total) }})</span>
            </div>
            <div class="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                class="h-full bg-amber-500 rounded-full transition-all duration-500"
                :style="{ width: `${Math.min(health.disk.usedPercent || 0, 100)}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Environment and Configuration -->
      <div class="bg-slate-950 border border-slate-850 rounded-3xl p-6">
        <h3 class="text-base font-bold text-white mb-4 flex items-center gap-2">
          <UIcon name="i-heroicons-cog-8-tooth" class="w-5 h-5 text-violet-500" />
          Runtime Environment
        </h3>
        <div class="divide-y divide-slate-900 text-xs font-semibold">
          <div class="flex justify-between py-3">
            <span class="text-slate-500">Node Environment</span>
            <span class="text-white uppercase tracking-wider">{{ health.environment }}</span>
          </div>
          <div class="flex justify-between py-3">
            <span class="text-slate-500">Platform</span>
            <span class="text-slate-300 font-mono">{{ health.platform || '-' }}</span>
          </div>
          <div class="flex justify-between py-3">
            <span class="text-slate-500">CPU Count</span>
            <span class="text-slate-300 font-mono">{{ health.cpuCount || '-' }}</span>
          </div>
          <div class="flex justify-between py-3">
            <span class="text-slate-500">Load Average</span>
            <span class="text-slate-300 font-mono">{{ health.loadAverage ? health.loadAverage.map((n: number) => n.toFixed(2)).join(', ') : '-' }}</span>
          </div>
          <div class="flex justify-between py-3">
            <span class="text-slate-500">Database Driver</span>
            <span class="text-slate-300 font-mono">Prisma / PostgreSQL</span>
          </div>
          <div class="flex justify-between py-3">
            <span class="text-slate-500">External APIs</span>
            <div class="flex items-center gap-2">
              <span class="capitalize" :class="getStatusTextColor(health.dependencies?.paystack?.status)">Paystack</span>
              <span class="text-slate-700">•</span>
              <span class="capitalize" :class="getStatusTextColor(health.dependencies?.resend?.status)">Resend</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
