<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAdminStore } from '~/stores/admin'

definePageMeta({
  layout: 'admin'
})

const adminStore = useAdminStore()
const { loading, error } = storeToRefs(adminStore)

const stats = ref<any>(null)
const recentUsers = ref<any[]>([])
const recentPayments = ref<any[]>([])
const recentActivity = ref<any[]>([])
const health = ref<any>(null)

const loadData = async () => {
  try {
    const [statsData, usersData, paymentsData, activityData, healthData] = await Promise.all([
      adminStore.fetchStats(),
      adminStore.fetchUsers({ limit: 5 }),
      adminStore.fetchPayments({ limit: 5 }),
      adminStore.fetchRecentAuditLogs(5),
      adminStore.fetchHealth()
    ])
    stats.value = statsData
    recentUsers.value = usersData?.items || []
    recentPayments.value = paymentsData?.items || []
    recentActivity.value = activityData || []
    health.value = healthData
  } catch (err: any) {
    console.error('Failed to load overview data:', err)
  }
}

onMounted(() => {
  loadData()
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
    year: 'numeric'
  })
}

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getActivityIcon = (action: string) => {
  switch (action) {
    case 'USER_DELETE':
    case 'TOURNAMENT_DELETE':
      return 'i-heroicons-trash'
    case 'USER_ROLE_UPDATE':
      return 'i-heroicons-shield-exclamation'
    case 'ORGANIZATION_VERIFY':
      return 'i-heroicons-check-badge'
    case 'ORGANIZATION_SUBSCRIPTION_UPDATE':
      return 'i-heroicons-credit-card'
    case 'TOURNAMENT_PRICING_UPDATE':
      return 'i-heroicons-currency-dollar'
    case 'PLAYER_STATUS_UPDATE':
      return 'i-heroicons-user-group'
    default:
      return 'i-heroicons-pencil-square'
  }
}

const getActivityColor = (action: string) => {
  switch (action) {
    case 'USER_DELETE':
    case 'TOURNAMENT_DELETE':
      return 'text-rose-500 bg-rose-950/30 border-rose-900/30'
    case 'USER_ROLE_UPDATE':
    case 'ORGANIZATION_SUBSCRIPTION_UPDATE':
      return 'text-violet-500 bg-violet-950/30 border-violet-900/30'
    case 'ORGANIZATION_VERIFY':
      return 'text-emerald-500 bg-emerald-950/30 border-emerald-900/30'
    case 'TOURNAMENT_PRICING_UPDATE':
      return 'text-amber-500 bg-amber-950/30 border-amber-900/30'
    case 'PLAYER_STATUS_UPDATE':
      return 'text-sky-500 bg-sky-950/30 border-sky-900/30'
    default:
      return 'text-slate-500 bg-slate-900 border-slate-800'
  }
}

const getActivityLabel = (action: string) => {
  const labels: Record<string, string> = {
    USER_DELETE: 'Deleted a user',
    USER_ROLE_UPDATE: 'Updated user role',
    TOURNAMENT_DELETE: 'Deleted a tournament',
    TOURNAMENT_PRICING_UPDATE: 'Updated tournament pricing',
    ORGANIZATION_VERIFY: 'Changed organization verification',
    ORGANIZATION_SUBSCRIPTION_UPDATE: 'Updated organization subscription',
    PLAYER_STATUS_UPDATE: 'Updated player status',
  }
  return labels[action] || action.replace(/_/g, ' ')
}

const getActivityEntityLink = (log: any) => {
  switch (log.entityType) {
    case 'USER':
      return `/users/${log.entityId}`
    case 'TOURNAMENT':
      return `/tournaments` // No detail page yet
    case 'ORGANIZATION':
      return `/organizations/${log.entityId}`
    case 'PLAYER':
      return `/players`
    default:
      return '/audit-logs'
  }
}
</script>

<template>
  <div class="space-y-8 select-none">
    <!-- Header Title -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
      <div>
        <h1 class="text-3xl font-extrabold tracking-tight text-white">Dashboard Overview</h1>
        <p class="text-sm text-slate-400 mt-1">Platform-wide statistics and live metrics control.</p>
      </div>
      <div class="flex items-center gap-3">
        <div 
          v-if="health"
          class="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border"
          :class="[
            health.status === 'UP' 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          ]"
        >
          <span class="w-2 h-2 rounded-full animate-ping" :class="health.status === 'UP' ? 'bg-emerald-400' : 'bg-rose-400'"></span>
          API Health: {{ health.status }}
        </div>
        <UButton
          size="sm"
          color="neutral"
          variant="outline"
          icon="i-heroicons-arrow-path"
          :loading="loading"
          @click="loadData"
        >
          Refresh Data
        </UButton>
      </div>
    </div>

    <!-- Error State -->
    <UAlert
      v-if="error"
      title="Failed to load dashboard metrics"
      description="There was an issue communicating with the administration endpoints. Please check API connectivity."
      color="error"
      variant="subtle"
      icon="i-heroicons-exclamation-triangle"
    />

    <!-- Quick Stats Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      <!-- Users Stats Card -->
      <div class="relative overflow-hidden bg-slate-950 border border-slate-800 rounded-3xl p-6 transition-all hover:border-slate-700 hover:shadow-lg hover:shadow-rose-950/10 group">
        <div class="absolute -top-12 -right-12 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-colors"></div>
        <div class="flex items-center justify-between">
          <span class="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Users</span>
          <div class="w-8 h-8 rounded-lg bg-rose-950/50 text-rose-500 flex items-center justify-center">
            <UIcon name="i-heroicons-users" class="w-5 h-5" />
          </div>
        </div>
        <div class="mt-4">
          <div class="text-3xl font-extrabold text-white tracking-tight">
            <template v-if="stats">{{ stats.usersCount }}</template>
            <template v-else><div class="h-8 w-16 bg-slate-800 rounded animate-pulse"></div></template>
          </div>
          <p class="text-slate-500 text-xs mt-1.5 flex items-center gap-1">
            <UIcon name="i-heroicons-arrow-trending-up" class="w-3.5 h-3.5 text-emerald-500" />
            Active platform profiles
          </p>
        </div>
      </div>

      <!-- Tournaments Stats Card -->
      <div class="relative overflow-hidden bg-slate-950 border border-slate-800 rounded-3xl p-6 transition-all hover:border-slate-700 hover:shadow-lg hover:shadow-rose-950/10 group">
        <div class="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors"></div>
        <div class="flex items-center justify-between">
          <span class="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Tournaments</span>
          <div class="w-8 h-8 rounded-lg bg-amber-950/50 text-amber-500 flex items-center justify-center">
            <UIcon name="i-heroicons-trophy" class="w-5 h-5" />
          </div>
        </div>
        <div class="mt-4">
          <div class="text-3xl font-extrabold text-white tracking-tight">
            <template v-if="stats">{{ stats.tournamentsCount }}</template>
            <template v-else><div class="h-8 w-16 bg-slate-800 rounded animate-pulse"></div></template>
          </div>
          <p class="text-slate-500 text-xs mt-1.5 flex items-center gap-1">
            <UIcon name="i-heroicons-arrow-trending-up" class="w-3.5 h-3.5 text-emerald-500" />
            Competitive events hosted
          </p>
        </div>
      </div>

      <!-- Organizations Stats Card -->
      <div class="relative overflow-hidden bg-slate-950 border border-slate-800 rounded-3xl p-6 transition-all hover:border-slate-700 hover:shadow-lg hover:shadow-rose-950/10 group">
        <div class="absolute -top-12 -right-12 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl group-hover:bg-sky-500/10 transition-colors"></div>
        <div class="flex items-center justify-between">
          <span class="text-slate-400 text-xs font-bold uppercase tracking-wider">Organizations</span>
          <div class="w-8 h-8 rounded-lg bg-sky-950/50 text-sky-500 flex items-center justify-center">
            <UIcon name="i-heroicons-building-office-2" class="w-5 h-5" />
          </div>
        </div>
        <div class="mt-4">
          <div class="text-3xl font-extrabold text-white tracking-tight">
            <template v-if="stats">{{ stats.organizationsCount }}</template>
            <template v-else><div class="h-8 w-16 bg-slate-800 rounded animate-pulse"></div></template>
          </div>
          <p class="text-slate-500 text-xs mt-1.5 flex items-center gap-1">
            <UIcon name="i-heroicons-check-circle" class="w-3.5 h-3.5 text-sky-500" />
            Registered tournament hosts
          </p>
        </div>
      </div>

      <!-- Revenue Stats Card -->
      <div class="relative overflow-hidden bg-slate-950 border border-slate-800 rounded-3xl p-6 transition-all hover:border-slate-700 hover:shadow-lg hover:shadow-rose-950/10 group">
        <div class="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors"></div>
        <div class="flex items-center justify-between">
          <span class="text-slate-400 text-xs font-bold uppercase tracking-wider">Gross Revenue</span>
          <div class="w-8 h-8 rounded-lg bg-emerald-950/50 text-emerald-500 flex items-center justify-center">
            <UIcon name="i-heroicons-banknotes" class="w-5 h-5" />
          </div>
        </div>
        <div class="mt-4">
          <div class="text-3xl font-extrabold text-white tracking-tight">
            <template v-if="stats">{{ formatCurrency(stats.totalRevenue) }}</template>
            <template v-else><div class="h-8 w-24 bg-slate-800 rounded animate-pulse"></div></template>
          </div>
          <p class="text-slate-500 text-xs mt-1.5 flex items-center gap-1">
            <span class="text-emerald-500 font-bold">{{ stats ? stats.paymentsCount : 0 }}</span>
            completed transactions
          </p>
        </div>
      </div>

      <!-- Paragee (AI bot) Stats Card -->
      <div class="relative overflow-hidden bg-slate-950 border border-slate-800 rounded-3xl p-6 transition-all hover:border-slate-700 hover:shadow-lg hover:shadow-indigo-950/10 group">
        <div class="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors"></div>
        <div class="flex items-center justify-between">
          <span class="text-slate-400 text-xs font-bold uppercase tracking-wider">Paragee Calls</span>
          <div class="w-8 h-8 rounded-lg bg-indigo-950/50 text-indigo-400 flex items-center justify-center">
            <UIcon name="i-heroicons-sparkles" class="w-5 h-5" />
          </div>
        </div>
        <div class="mt-4">
          <div class="text-3xl font-extrabold text-white tracking-tight tabular-nums">
            <template v-if="stats">{{ stats.parageeCalls }}</template>
            <template v-else><div class="h-8 w-16 bg-slate-800 rounded animate-pulse"></div></template>
          </div>
          <p class="text-slate-500 text-xs mt-1.5 flex items-center gap-1">
            <UIcon name="i-heroicons-chat-bubble-left-right" class="w-3.5 h-3.5 text-indigo-400" />
            AI answers served in tournament chats
          </p>
        </div>
      </div>
    </div>

    <!-- Main Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Recent Registrations -->
      <div class="bg-slate-950 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-users" class="w-5 h-5 text-rose-500" />
              <h2 class="text-lg font-bold text-white">Recent Users</h2>
            </div>
            <NuxtLink to="/users" class="text-xs text-rose-500 font-semibold hover:underline">View All</NuxtLink>
          </div>

          <div v-if="loading && recentUsers.length === 0" class="space-y-4">
            <div v-for="n in 5" :key="n" class="flex items-center justify-between py-2 border-b border-slate-900/50">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-full bg-slate-800 animate-pulse"></div>
                <div class="space-y-2">
                  <div class="h-4 w-28 bg-slate-800 rounded animate-pulse"></div>
                  <div class="h-3 w-40 bg-slate-800 rounded animate-pulse"></div>
                </div>
              </div>
              <div class="h-6 w-16 bg-slate-800 rounded animate-pulse"></div>
            </div>
          </div>

          <div v-else-if="recentUsers.length === 0" class="text-center py-8 text-slate-500 text-sm">
            No user signups found.
          </div>

          <div v-else class="divide-y divide-slate-900">
            <div 
              v-for="u in recentUsers" 
              :key="u.id" 
              class="flex items-center justify-between py-3 group hover:bg-slate-900/20 px-2 rounded-xl transition-colors cursor-pointer"
              @click="navigateTo(`/users/${u.id}`)"
            >
              <div class="flex items-center gap-3 min-w-0">
                <UAvatar
                  v-if="u.picture"
                  :src="u.picture"
                  size="xs"
                />
                <UAvatar
                  v-else
                  :text="u.name?.charAt(0).toUpperCase() || u.email.charAt(0).toUpperCase()"
                  size="xs"
                  class="bg-slate-800 text-slate-300"
                />
                <div class="flex flex-col min-w-0">
                  <span class="text-sm font-bold text-white truncate leading-snug">{{ u.name || 'Anonymous User' }}</span>
                  <span class="text-xs text-slate-500 truncate leading-snug">{{ u.email }}</span>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <span 
                  class="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border uppercase"
                  :class="[
                    u.role === 'SUPER_ADMIN' 
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                      : u.role === 'ORGANIZER'
                        ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                  ]"
                >
                  {{ u.role }}
                </span>
                <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Payments -->
      <div class="bg-slate-950 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-banknotes" class="w-5 h-5 text-emerald-500" />
              <h2 class="text-lg font-bold text-white">Recent Payments</h2>
            </div>
            <NuxtLink to="/payments" class="text-xs text-emerald-500 font-semibold hover:underline">View All</NuxtLink>
          </div>

          <div v-if="loading && recentPayments.length === 0" class="space-y-4">
            <div v-for="n in 5" :key="n" class="flex items-center justify-between py-2 border-b border-slate-900/50">
              <div class="space-y-2">
                <div class="h-4 w-28 bg-slate-800 rounded animate-pulse"></div>
                <div class="h-3 w-40 bg-slate-800 rounded animate-pulse"></div>
              </div>
              <div class="h-6 w-16 bg-slate-800 rounded animate-pulse"></div>
            </div>
          </div>

          <div v-else-if="recentPayments.length === 0" class="text-center py-8 text-slate-500 text-sm">
            No recent payments registered.
          </div>

          <div v-else class="divide-y divide-slate-900">
            <div 
              v-for="p in recentPayments" 
              :key="p.id" 
              class="flex items-center justify-between py-3 px-2 rounded-xl"
            >
              <div class="flex flex-col min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-bold text-white truncate leading-snug">{{ p.user?.name || p.user?.email || 'Guest User' }}</span>
                  <span class="text-[9px] text-slate-500 bg-slate-800 px-1 py-0.5 rounded font-mono truncate max-w-[120px]">{{ p.reference }}</span>
                </div>
                <span class="text-xs text-slate-500 mt-0.5">{{ formatDate(p.createdAt) }} • <span class="capitalize">{{ p.type?.toLowerCase() }}</span></span>
              </div>

              <div class="flex items-center gap-3">
                <span class="text-sm font-extrabold text-white">{{ formatCurrency(p.amount) }}</span>
                <span 
                  class="px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider"
                  :class="[
                    p.status === 'SUCCESS' || p.status === 'COMPLETED' 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : p.status === 'PENDING'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  ]"
                >
                  {{ p.status }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Admin Activity -->
    <div class="bg-slate-950 border border-slate-800 rounded-3xl p-6">
      <div class="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-clipboard-document-list" class="w-5 h-5 text-violet-500" />
          <h2 class="text-lg font-bold text-white">Recent Admin Activity</h2>
        </div>
        <NuxtLink to="/audit-logs" class="text-xs text-violet-500 font-semibold hover:underline">View All</NuxtLink>
      </div>

      <div v-if="loading && recentActivity.length === 0" class="space-y-4">
        <div v-for="n in 5" :key="n" class="flex items-center gap-4 py-3 border-b border-slate-900/50">
          <div class="w-9 h-9 rounded-lg bg-slate-800 animate-pulse"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 w-48 bg-slate-800 rounded animate-pulse"></div>
            <div class="h-3 w-32 bg-slate-800 rounded animate-pulse"></div>
          </div>
        </div>
      </div>

      <div v-else-if="recentActivity.length === 0" class="text-center py-8 text-slate-500 text-sm">
        No recent admin activity recorded.
      </div>

      <div v-else class="divide-y divide-slate-900">
        <div
          v-for="log in recentActivity"
          :key="log.id"
          class="flex items-center gap-4 py-3 px-2 rounded-xl hover:bg-slate-900/20 transition-colors cursor-pointer"
          @click="navigateTo(getActivityEntityLink(log))"
        >
          <div
            class="w-9 h-9 rounded-lg border flex items-center justify-center shrink-0"
            :class="getActivityColor(log.action)"
          >
            <UIcon :name="getActivityIcon(log.action)" class="w-5 h-5" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm font-bold text-white">{{ getActivityLabel(log.action) }}</span>
              <span class="text-[10px] text-slate-500 font-mono uppercase">{{ log.entityType }}: {{ log.entityId }}</span>
            </div>
            <div class="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span>by {{ log.actor?.name || 'Unknown' }}</span>
              <span>•</span>
              <span>{{ formatDateTime(log.createdAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
