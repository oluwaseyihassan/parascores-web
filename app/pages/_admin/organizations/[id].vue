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

const formatDateTimeLocal = (dateStr?: string) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const isUpdatingVerification = ref(false)
const isUpdatingSubscription = ref(false)
const isSubscriptionModalOpen = ref(false)
const subscriptionForm = reactive({
  plan: 'FREE',
  status: 'ACTIVE',
  currentPeriodEnd: ''
})

const openSubscriptionModal = () => {
  subscriptionForm.plan = org.value?.subscription?.plan || 'FREE'
  subscriptionForm.status = org.value?.subscription?.status || 'ACTIVE'
  subscriptionForm.currentPeriodEnd = formatDateTimeLocal(org.value?.subscription?.currentPeriodEnd)
  isSubscriptionModalOpen.value = true
}

const handleVerificationToggle = async () => {
  if (!org.value) return
  isUpdatingVerification.value = true
  try {
    const updated = await adminStore.updateOrganizationVerification(
      org.value.id,
      !org.value.isVerified
    )
    org.value.isVerified = updated.isVerified
    useToast().add({
      title: updated.isVerified ? 'Organization Verified' : 'Organization Unverified',
      description: `${org.value.name} has been ${updated.isVerified ? 'verified' : 'unverified'}.`,
      color: 'success'
    })
  } catch (err: any) {
    useToast().add({
      title: 'Action Failed',
      description: err.message || 'Failed to update verification status.',
      color: 'error'
    })
  } finally {
    isUpdatingVerification.value = false
  }
}

const saveSubscription = async () => {
  if (!org.value) return
  isUpdatingSubscription.value = true
  try {
    const payload: any = {
      plan: subscriptionForm.plan,
      status: subscriptionForm.status
    }
    if (subscriptionForm.currentPeriodEnd) {
      payload.currentPeriodEnd = new Date(subscriptionForm.currentPeriodEnd).toISOString()
    }
    const updated = await adminStore.updateOrganizationSubscription(org.value.id, payload)
    org.value.subscription = updated
    useToast().add({
      title: 'Subscription Updated',
      description: `Plan set to ${updated.plan} with status ${updated.status}.`,
      color: 'success'
    })
    isSubscriptionModalOpen.value = false
  } catch (err: any) {
    useToast().add({
      title: 'Update Failed',
      description: err.message || 'Failed to update subscription.',
      color: 'error'
    })
  } finally {
    isUpdatingSubscription.value = false
  }
}

const copiedField = ref<string | null>(null)

const copyToClipboard = async (value: string, field: string) => {
  if (!value) return
  try {
    await navigator.clipboard.writeText(value)
    copiedField.value = field
    setTimeout(() => {
      if (copiedField.value === field) copiedField.value = null
    }, 1500)
    useToast().add({
      title: 'Copied',
      description: `${field} copied to clipboard.`,
      color: 'success',
      icon: 'i-heroicons-clipboard-document-check'
    })
  } catch (err) {
    useToast().add({
      title: 'Copy Failed',
      description: 'Could not copy to clipboard.',
      color: 'error'
    })
  }
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
          <div class="flex items-center justify-center gap-2 mt-1">
            <span class="text-sm text-slate-500 font-mono">/orgs/{{ org.slug }}</span>
            <button
              class="text-slate-500 hover:text-emerald-400 transition"
              :class="copiedField === 'Org slug' ? 'text-emerald-400' : ''"
              @click="copyToClipboard(org.slug, 'Org slug')"
            >
              <UIcon :name="copiedField === 'Org slug' ? 'i-heroicons-clipboard-document-check' : 'i-heroicons-clipboard-document'" class="w-4 h-4" />
            </button>
          </div>

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
            <div class="flex flex-col gap-3">
              <UButton
                block
                size="sm"
                :color="org.isVerified ? 'error' : 'success'"
                variant="soft"
                :icon="org.isVerified ? 'i-heroicons-x-circle' : 'i-heroicons-check-badge'"
                :loading="isUpdatingVerification"
                @click="handleVerificationToggle"
              >
                {{ org.isVerified ? 'Revoke Verification' : 'Verify Organization' }}
              </UButton>
              <UButton
                block
                size="sm"
                color="primary"
                variant="outline"
                icon="i-heroicons-credit-card"
                @click="openSubscriptionModal"
              >
                Manage Subscription
              </UButton>
            </div>
          </div>

          <div class="w-full border-t border-slate-900 mt-6 pt-6 text-left space-y-4 text-xs font-semibold">
            <div class="flex justify-between items-center">
              <span class="text-slate-500">Org ID</span>
              <div class="flex items-center gap-2">
                <span class="text-slate-300 font-mono text-[10px] select-all">{{ org.id }}</span>
                <button
                  class="text-slate-500 hover:text-emerald-400 transition"
                  :class="copiedField === 'Org ID' ? 'text-emerald-400' : ''"
                  @click="copyToClipboard(org.id, 'Org ID')"
                >
                  <UIcon :name="copiedField === 'Org ID' ? 'i-heroicons-clipboard-document-check' : 'i-heroicons-clipboard-document'" class="w-4 h-4" />
                </button>
              </div>
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
            <div v-if="org.subscription?.stripeSubscriptionId" class="flex justify-between items-center">
              <span class="text-slate-500">Stripe ID</span>
              <div class="flex items-center gap-2">
                <span class="text-slate-300 font-mono select-all">{{ org.subscription?.stripeSubscriptionId }}</span>
                <button
                  class="text-slate-500 hover:text-emerald-400 transition"
                  :class="copiedField === 'Stripe ID' ? 'text-emerald-400' : ''"
                  @click="copyToClipboard(org.subscription?.stripeSubscriptionId, 'Stripe ID')"
                >
                  <UIcon :name="copiedField === 'Stripe ID' ? 'i-heroicons-clipboard-document-check' : 'i-heroicons-clipboard-document'" class="w-4 h-4" />
                </button>
              </div>
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

    <!-- Subscription Management Modal -->
    <UModal v-model:open="isSubscriptionModalOpen" title="Manage Organization Subscription">
      <template #body>
        <div class="space-y-5">
          <div class="bg-slate-900/50 rounded-xl p-3 border border-slate-800">
            <p class="text-sm font-bold text-white">{{ org.name }}</p>
            <p class="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
              Current: {{ org.subscription?.plan || 'FREE' }} · {{ org.subscription?.status || 'INACTIVE' }}
            </p>
          </div>

          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider">Subscription Plan</label>
            <select
              v-model="subscriptionForm.plan"
              class="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm font-semibold rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500 focus:outline-none"
            >
              <option value="FREE">Free</option>
              <option value="PER_TOURNAMENT">Per Tournament</option>
              <option value="PRO">Pro</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>
          </div>

          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider">Subscription Status</label>
            <select
              v-model="subscriptionForm.status"
              class="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm font-semibold rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500 focus:outline-none"
            >
              <option value="ACTIVE">Active</option>
              <option value="TRIALING">Trialing</option>
              <option value="PAST_DUE">Past Due</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Current Period End
              <span class="text-slate-500 font-normal normal-case ml-1">(optional)</span>
            </label>
            <input
              v-model="subscriptionForm.currentPeriodEnd"
              type="datetime-local"
              class="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm font-semibold rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500 focus:outline-none"
            />
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton
            color="neutral"
            variant="ghost"
            @click="isSubscriptionModalOpen = false"
          >
            Cancel
          </UButton>
          <UButton
            color="primary"
            variant="solid"
            icon="i-heroicons-check"
            :loading="isUpdatingSubscription"
            @click="saveSubscription"
          >
            Save Subscription
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
