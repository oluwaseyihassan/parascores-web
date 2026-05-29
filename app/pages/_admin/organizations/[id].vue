<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAdminStore } from '~/stores/admin'

definePageMeta({
  layout: 'admin'
})

const route = useRoute()
const adminStore = useAdminStore()
const { loading, error } = storeToRefs(adminStore)

const org = ref<any>(null)

const loadOrg = async () => {
  try {
    const data = await adminStore.fetchOrganization(route.params.id as string)
    if (data) {
      org.value = data
    }
  } catch (err) {
    console.error('Failed to load organization detail:', err)
  }
}

onMounted(() => {
  loadOrg()
})

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

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(val)
}
</script>

<template>
  <div class="space-y-8 select-none">
    <!-- Back to organizations -->
    <div class="flex items-center gap-3">
      <NuxtLink to="/organizations" class="text-rose-500 hover:text-rose-400 text-sm font-semibold flex items-center gap-1">
        <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
        Back to Organizations
      </NuxtLink>
    </div>

    <!-- Error State -->
    <UAlert
      v-if="error"
      title="Failed to retrieve organization detailed view"
      description="The backend could not locate the organization ID requested."
      color="error"
      variant="subtle"
      icon="i-heroicons-exclamation-triangle"
    />

    <!-- Main Org Details -->
    <div v-if="org" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Left sidebar card -->
      <div class="space-y-6 lg:col-span-1">
        <div class="bg-slate-950 border border-slate-800 rounded-3xl p-6 flex flex-col items-center text-center">
          <UAvatar
            v-if="org.logoUrl"
            :src="org.logoUrl"
            size="lg"
            class="ring-4 ring-rose-600/30"
          />
          <div v-else class="w-20 h-20 rounded-full bg-slate-850 text-slate-400 border border-slate-800 flex items-center justify-center font-extrabold text-2xl">
            {{ org.name.charAt(0).toUpperCase() }}
          </div>

          <h2 class="text-lg font-bold text-white mt-4">{{ org.name }}</h2>
          <span class="text-sm text-slate-500 font-mono">/orgs/{{ org.slug }}</span>

          <div class="mt-4 flex items-center gap-2">
            <span 
              class="px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider"
              :class="org.isVerified ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-500 border-slate-700'"
            >
              {{ org.isVerified ? 'Verified Org' : 'Standard Org' }}
            </span>
            <span 
              class="px-2.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider"
              :class="org.subscription?.plan === 'PRO' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'"
            >
              {{ org.subscription?.plan || 'FREE PLAN' }}
            </span>
          </div>

          <div class="w-full border-t border-slate-900 mt-6 pt-6 text-left space-y-4 text-xs font-semibold">
            <div class="flex justify-between">
              <span class="text-slate-500">Org ID</span>
              <span class="text-slate-300 font-mono text-[10px] select-all">{{ org.id }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Created</span>
              <span class="text-slate-300">{{ formatDate(org.created_at) }}</span>
            </div>
          </div>
        </div>

        <!-- Subscription Overview -->
        <div class="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h3 class="text-sm font-bold text-white">Subscription & Billing</h3>
          <div class="space-y-3 text-xs font-semibold">
            <div class="flex justify-between">
              <span class="text-slate-500">Current Plan</span>
              <span class="text-slate-300 font-bold uppercase">{{ org.subscription?.plan || 'FREE' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Billing Uptime</span>
              <span 
                class="px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider"
                :class="org.subscription?.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-500 border-slate-700'"
              >
                {{ org.subscription?.status || 'INACTIVE' }}
              </span>
            </div>
            <div v-if="org.subscription?.stripeSubscriptionId" class="flex justify-between">
              <span class="text-slate-500">Stripe ID</span>
              <span class="text-slate-300 font-mono select-all">{{ org.subscription?.stripeSubscriptionId }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Detailed Information -->
      <div class="space-y-8 lg:col-span-2">
        <!-- Members List -->
        <div class="bg-slate-950 border border-slate-800 rounded-3xl p-6">
          <h3 class="text-base font-bold text-white mb-4 flex items-center gap-2">
            <UIcon name="i-heroicons-users" class="w-5 h-5 text-rose-500" />
            Organization Members
          </h3>
          <div v-if="!org.members || org.members.length === 0" class="text-center py-6 text-slate-500 text-sm">
            No active members associated with this organization.
          </div>
          <div v-else class="space-y-4">
            <div 
              v-for="m in org.members" 
              :key="m.id"
              class="flex items-center justify-between p-4 bg-slate-900/40 border border-slate-850 rounded-2xl group hover:border-slate-750 transition-colors cursor-pointer"
              @click="navigateTo(`/users/${m.user?.id}`)"
            >
              <div class="flex items-center gap-3">
                <UAvatar
                  v-if="m.user?.picture"
                  :src="m.user.picture"
                  size="xs"
                />
                <UAvatar
                  v-else
                  :text="m.user?.name?.charAt(0).toUpperCase() || m.user?.email?.charAt(0).toUpperCase()"
                  size="xs"
                  class="bg-slate-800 text-slate-300 font-bold"
                />
                <div class="flex flex-col">
                  <span class="text-sm font-bold text-white leading-none mb-1 group-hover:text-rose-400 transition-colors">{{ m.user?.name || 'Anonymous User' }}</span>
                  <span class="text-xs text-slate-500 leading-none">{{ m.user?.email }}</span>
                </div>
              </div>

              <div class="flex items-center gap-3">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold border border-slate-700 bg-slate-800 text-slate-400 uppercase">
                  {{ m.role || 'MEMBER' }}
                </span>
                <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-slate-650 group-hover:text-rose-500 transition-colors" />
              </div>
            </div>
          </div>
        </div>

        <!-- Tournaments Hosted -->
        <div class="bg-slate-950 border border-slate-800 rounded-3xl p-6">
          <h3 class="text-base font-bold text-white mb-4 flex items-center gap-2">
            <UIcon name="i-heroicons-trophy" class="w-5 h-5 text-amber-500" />
            Tournaments
          </h3>
          <div v-if="!org.tournaments || org.tournaments.length === 0" class="text-center py-6 text-slate-500 text-sm">
            This organization has not hosted any tournaments yet.
          </div>
          <div v-else class="space-y-4">
            <div 
              v-for="t in org.tournaments" 
              :key="t.id"
              class="flex items-center justify-between p-4 bg-slate-900/40 border border-slate-850 rounded-2xl group hover:border-slate-750 transition-colors cursor-pointer"
            >
              <div class="flex flex-col">
                <span class="text-sm font-bold text-white mb-1 group-hover:text-amber-500 transition-colors">{{ t.name }}</span>
                <span class="text-xs text-slate-500">
                  {{ t.sport }} • {{ t.type }} • Created {{ formatDate(t.created_at) }}
                </span>
              </div>

              <div class="flex items-center gap-3">
                <span 
                  v-if="t.isPremium"
                  class="px-2 py-0.5 rounded text-[10px] font-bold border bg-rose-500/10 text-rose-400 border-rose-500/20 uppercase"
                >
                  Premium
                </span>
                <span class="text-xs text-slate-400 font-semibold bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                  Participants: {{ t._count?.participants || 0 }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Payment logs specific to this Organization -->
        <div class="bg-slate-950 border border-slate-800 rounded-3xl p-6">
          <h3 class="text-base font-bold text-white mb-4 flex items-center gap-2">
            <UIcon name="i-heroicons-credit-card" class="w-5 h-5 text-emerald-500" />
            Billing Logs
          </h3>
          <div v-if="!org.payments || org.payments.length === 0" class="text-center py-6 text-slate-500 text-sm">
            No payments have been logged for this organization.
          </div>
          <div v-else class="space-y-4">
            <div 
              v-for="pay in org.payments" 
              :key="pay.id"
              class="flex items-center justify-between p-4 bg-slate-900/40 border border-slate-850 rounded-2xl"
            >
              <div class="flex flex-col">
                <span class="text-sm font-bold text-white leading-none mb-1 capitalize">{{ pay.type?.toLowerCase() }}</span>
                <span class="text-xs text-slate-500 mt-1 leading-none">{{ formatDate(pay.created_at) }}</span>
              </div>

              <div class="flex items-center gap-4">
                <span class="text-sm font-extrabold text-white">{{ formatCurrency(pay.amount) }}</span>
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
