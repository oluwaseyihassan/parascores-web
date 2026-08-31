<script setup lang="ts">
import { storeToRefs } from 'pinia'
import type { ApiResponse } from '~/stores/auth'
import type { PaymentRecord, PayoutAccountStatus, PayoutSummary } from '~/stores/payment'

definePageMeta({
  middleware: ['require-organizer'],
  layout: 'dashboard'
})

useSeoMeta({
  title: 'Billing - ParaScores',
  description: 'Manage your subscription and billing.',
})

const authStore = useAuthStore()
const paymentStore = usePaymentStore()
const { handleError } = useErrors()
const { toMain } = useHost()
const toast = useToast()
const config = useRuntimeConfig()

const { subscription, paymentHistory, loading, currentPlan, isActive, isPro, isCancelled, isPastDue } = storeToRefs(paymentStore)

// Cancel confirmation
const showCancelModal = ref(false)
const cancelling = ref(false)

// Billing toggle
const isYearly = ref(true)

// Tournament upgrade
const showTournamentSelector = ref(false)
const tournamentStore = useTournamentStore()
const { tournaments } = storeToRefs(tournamentStore)
const selectedTournamentId = ref('')
const upgradingTournament = ref(false)

// Payout account
const payoutAccount = ref<PayoutAccountStatus | null>(null)
const payoutSummary = ref<PayoutSummary | null>(null)

async function loadPayoutAccount(orgId: string) {
  try {
    payoutAccount.value = await paymentStore.fetchPayoutAccount(orgId)
  } catch {
    // Silent fail — section shows as not set up
  }
  try {
    payoutSummary.value = await paymentStore.fetchPayoutSummary(orgId)
  } catch {
    // Silent fail — summary stays hidden
  }
}

const showPayoutForm = ref(false)

const orgOptions = computed(() =>
  authStore.organizations.map((m) => ({
    label: m.organization?.name || 'Organization',
    value: m.organizationId,
  }))
)

function onPayoutSaved(status: PayoutAccountStatus | null) {
  payoutAccount.value = status
  showPayoutForm.value = false
}

function paymentLabel(payment: PaymentRecord) {
  if (payment.type === 'OFFLINE_REGISTRATION') {
    return payment.teamName ? `Offline · ${payment.teamName}` : 'Offline Registration'
  }
  if (payment.type === 'TOURNAMENT_REGISTRATION') {
    const base = payment.teamName ? `Registration · ${payment.teamName}` : 'Registration'
    return payment.metadata?.waived ? `${base} (waived)` : base
  }
  return payment.plan === 'PER_TOURNAMENT' ? 'Tournament Upgrade' : payment.plan === 'PRO' ? 'Pro Plan' : payment.plan || 'Payment'
}


// Plan definitions
const plans = computed(() => [
  {
    name: 'Free',
    key: 'FREE' as const,
    description: 'For casual organizers running small tournaments.',
    monthlyPrice: 0,
    yearlyPrice: 0,
    planType: null,
    amountInKobo: 0,
    features: [
      { text: 'Up to 3 active tournaments', tooltip: 'Create and run up to 3 tournaments simultaneously. Completed tournaments do not count against this limit.' },
      { text: 'Max 32 participants per tournament', tooltip: 'A maximum of 32 teams or players can join each tournament. Upgrade to Pro or Premium for unlimited participants.' },
      { text: 'Basic brackets and leaderboards', tooltip: 'Includes single-elimination, double-elimination, and league/round-robin bracket formats.' },
      { text: 'Standard email support', tooltip: 'Access to our help desk. We reply within 24-48 business hours.' }
    ]
  },
  {
    name: 'Per Tournament',
    key: 'PER_TOURNAMENT' as const,
    description: 'Upgrade a single tournament at ₦1,000 per team.',
    monthlyPrice: '₦1k/team',
    yearlyPrice: null,
    planType: 'PER_TOURNAMENT',
    amountInKobo: 0,
    oneTime: true,
    features: [
      { text: '₦1,000 per team pricing', tooltip: 'Upgrade fee is calculated as maxParticipants × ₦1,000. For example, a 16-team tournament costs ₦16,000.' },
      { text: 'Custom branding & logos', tooltip: 'Upload organization and tournament logos, and display your brand prominently on all public pages.' },
      { text: 'Advanced statistics for the tournament', tooltip: 'Unlock in-depth team/player performance tracking, player stats, and visual charts.' },
      { text: 'Priority email support', tooltip: 'Dedicated support queue. We guarantee a reply within 12 hours.' }
    ]
  },
  {
    name: 'Pro',
    key: 'PRO' as const,
    description: 'For serious organizers running large-scale events.',
    monthlyPrice: 5000,
    yearlyPrice: 48000,
    planType: isYearly.value ? 'PRO_YEARLY' : 'PRO_MONTHLY',
    // Amount in kobo — must match the plan amount in Paystack dashboard
    amountInKobo: isYearly.value ? 48000 * 100 : 5000 * 100,
    popular: true,
    features: [
      { text: 'Unlimited active tournaments', tooltip: 'Run as many simultaneous tournaments as you want without any restrictions.' },
      { text: 'Unlimited participants', tooltip: 'No limits on the number of participating teams/players across all your tournaments.' },
      { text: 'Custom branding & logos', tooltip: 'Upload organization and tournament logos, and display your brand prominently on all public pages.' },
      { text: 'Advanced statistics & analytics', tooltip: 'Unlock detailed analytics, top goalscorers/scorers tracking, and performance dashboards.' },
      { text: 'Priority email support', tooltip: 'Dedicated support queue. We guarantee a reply within 12 hours.' },
      { text: 'API Access (read-only)', tooltip: 'Query tournament results, fixtures, standings, and participant details programmatically.' }
    ]
  },
  {
    name: 'Enterprise',
    key: 'ENTERPRISE' as const,
    description: 'Custom integrations and white-labeling.',
    monthlyPrice: 'Custom',
    yearlyPrice: 'Custom',
    planType: null,
    amountInKobo: 0,
    features: [
      { text: 'Everything in Pro tier', tooltip: 'All capabilities of our Pro subscription plan included by default.' },
      { text: 'White-labeling options', tooltip: 'Remove ParaScores branding completely and run tournaments on your own custom domain.' },
      { text: 'Dedicated Account Manager', tooltip: 'Direct access to a technical account manager for setup, onboarding, and optimization help.' },
      { text: 'SLA Support guarantee', tooltip: 'Contractual service level agreement guaranteeing fast support response and uptime.' },
      { text: 'Full API Access (Read/Write)', tooltip: 'Create, update, and manage tournaments, fixtures, and scores programmatically via our REST API.' },
      { text: 'Custom integrations', tooltip: 'Sync scores and results directly to your existing internal database, custom apps, or websites.' }
    ]
  }
])

// Page tabs
const billingTabs = [
  { label: 'Earnings', value: 'earnings', slot: 'earnings', icon: 'i-heroicons-banknotes' },
  { label: 'Plan & Pricing', value: 'plans', slot: 'plans', icon: 'i-heroicons-sparkles' },
]

// Fetch subscription + payment history on mount
onMounted(async () => {
  if (authStore.currentOrganization?.id) {
    try {
      await paymentStore.fetchSubscription(authStore.currentOrganization.id)
    } catch (err) {
      // Silent fail — will show FREE tier
    }
    paymentStore.fetchPaymentHistory(authStore.currentOrganization.id).catch(() => {})
    loadPayoutAccount(authStore.currentOrganization.id)
  }
  await tournamentStore.fetchTournaments({ limit: 50 })
})

// Watch org changes
watch(() => authStore.currentOrganization?.id, async (newId) => {
  if (newId) {
    try {
      await paymentStore.fetchSubscription(newId)
    } catch (err) {
      // Silent fail
    }
    paymentStore.fetchPaymentHistory(newId).catch(() => {})
    tournamentStore.fetchTournaments({ limit: 50 }).catch(() => {})
    payoutAccount.value = null
    payoutSummary.value = null
    loadPayoutAccount(newId)
  }
})

// Subscribe to a plan
const subscribing = ref(false)
async function handleSubscribe(plan: typeof plans.value[0]) {
  if (!plan.planType || !authStore.currentOrganization?.id) return

  subscribing.value = true
  try {
    const dashboardUrl = config.public.DASHBOARD_URL || window.location.origin
    const callbackUrl = `${dashboardUrl}/billing/callback`

    const response = await paymentStore.initializePayment(
      authStore.currentOrganization.id,
      plan.planType,
      plan.amountInKobo,
      callbackUrl
    )

    if (response.data?.authorization_url) {
      // Redirect to Paystack checkout
      window.location.href = response.data.authorization_url
    }
  } catch (err: any) {
    handleError(err, { title: 'Payment Failed' })
  } finally {
    subscribing.value = false
  }
}

// Cancel subscription
async function handleCancelSubscription() {
  if (!authStore.currentOrganization?.id) return

  cancelling.value = true
  try {
    await paymentStore.cancelSubscription(authStore.currentOrganization.id)
    showCancelModal.value = false
    toast.add({
      title: 'Subscription Cancelled',
      description: 'Your subscription has been cancelled. Features remain active until the end of your billing period.',
      color: 'success',
    })
  } catch (err: any) {
    handleError(err, { title: 'Cancellation Failed' })
  } finally {
    cancelling.value = false
  }
}

// Helpers
function getButtonLabel(plan: typeof plans.value[0]) {
  if (plan.key === 'PRO') return 'Coming Soon'
  if (plan.key === currentPlan.value && isActive.value) return 'Current Plan'
  if (plan.key === 'FREE') return 'Free Forever'
  if (plan.key === 'ENTERPRISE') return 'Contact Sales'
  if (plan.key === 'PER_TOURNAMENT') return 'Select Tournament'
  return 'Upgrade Now'
}

function isCurrentPlan(plan: typeof plans.value[0]) {
  if (plan.key === 'PER_TOURNAMENT') return false
  return plan.key === currentPlan.value && isActive.value
}

function canSubscribe(plan: typeof plans.value[0]) {
  if (plan.key === 'FREE' || plan.key === 'ENTERPRISE' || plan.key === 'PRO') return false
  if (plan.key === 'PER_TOURNAMENT') return true
  if (isCurrentPlan(plan)) return false
  return true
}

function handlePlanAction(plan: typeof plans.value[0]) {
  if (plan.key === 'PER_TOURNAMENT') {
    selectedTournamentId.value = ''
    showTournamentSelector.value = true
  } else if (plan.key === 'ENTERPRISE') {
    // /contact only exists on the marketing (root) domain — go cross-subdomain
    return navigateTo(toMain('/contact?subject=Enterprise Inquiry'), { external: true })
  } else if (canSubscribe(plan)) {
    handleSubscribe(plan)
  }
}

function getTournamentUpgradePrice(maxParticipants: number | null | undefined): number {
  if (typeof maxParticipants !== 'number') return 25000
  return maxParticipants * 1000
}

const selectedTournamentUpgradePrice = computed(() => {
  if (!selectedTournamentId.value) return 0
  const t = tournaments.value.find(x => x.id === selectedTournamentId.value)
  if (!t) return 0
  return getTournamentUpgradePrice(t.maxParticipants)
})

async function handleTournamentUpgrade() {
  if (!authStore.currentOrganization?.id || !selectedTournamentId.value) return

  upgradingTournament.value = true
  try {
    const dashboardUrl = config.public.DASHBOARD_URL || window.location.origin
    const callbackUrl = `${dashboardUrl}/billing/callback`
    const feeInKobo = selectedTournamentUpgradePrice.value * 100

    const response = await paymentStore.initializePayment(
      authStore.currentOrganization.id,
      'PER_TOURNAMENT',
      feeInKobo,
      callbackUrl,
      selectedTournamentId.value
    )

    if (response.data?.authorization_url) {
      window.location.href = response.data.authorization_url
    }
  } catch (err: any) {
    handleError(err, { title: 'Upgrade Failed' })
  } finally {
    upgradingTournament.value = false
  }
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

// ─── Offline payments, exports & refunds ─────────────────

const isOwner = computed(() => {
  const orgId = authStore.currentOrganization?.id
  const membership = authStore.organizations.find((m) => m.organizationId === orgId)
  return membership?.role === 'OWNER'
})

function statusBadgeColor(status: string) {
  switch (status) {
    case 'SUCCESS': return 'success' as const
    case 'PENDING': return 'warning' as const
    case 'REFUNDED': return 'neutral' as const
    default: return 'error' as const
  }
}

// Offline payment recording
const showOfflineModal = ref(false)
const recordingOffline = ref(false)
const offlineForm = reactive({
  tournamentId: '',
  participantId: '',
  payerName: '',
  amount: null as number | null,
  method: 'CASH' as 'CASH' | 'BANK_TRANSFER' | 'OTHER',
  note: '',
})
const offlineParticipants = ref<any[]>([])
const loadingOfflineParticipants = ref(false)

const offlineTournamentOptions = computed(() =>
  tournaments.value
    .filter((t) => t.isPaidRegistration)
    .map((t) => ({ label: t.name, value: t.id }))
)

const offlineSelectedTournament = computed(() =>
  tournaments.value.find((t) => t.id === offlineForm.tournamentId)
)

const offlineParticipantOptions = computed(() =>
  offlineParticipants.value.map((p) => ({
    label: p.customName || p.team?.name || p.user?.name || 'Unnamed participant',
    value: p.id,
  }))
)

watch(() => offlineForm.tournamentId, async (id) => {
  offlineForm.participantId = ''
  offlineParticipants.value = []
  if (!id) return
  loadingOfflineParticipants.value = true
  try {
    const res = await $api<ApiResponse<any[]>>(`/participants/tournaments/${id}`, { method: 'GET' })
    offlineParticipants.value = res.data || []
  } catch {
    // Participant linking is optional — leave the list empty
  } finally {
    loadingOfflineParticipants.value = false
  }
})

function openOfflineModal() {
  Object.assign(offlineForm, {
    tournamentId: '',
    participantId: '',
    payerName: '',
    amount: null,
    method: 'CASH',
    note: '',
  })
  showOfflineModal.value = true
}

async function handleRecordOffline() {
  if (!offlineForm.tournamentId) return
  recordingOffline.value = true
  try {
    await paymentStore.recordOfflinePayment({
      tournamentId: offlineForm.tournamentId,
      participantId: offlineForm.participantId || undefined,
      payerName: offlineForm.payerName || undefined,
      amount: offlineForm.amount != null && offlineForm.amount > 0
        ? Math.round(offlineForm.amount * 100)
        : undefined,
      method: offlineForm.method,
      note: offlineForm.note || undefined,
    })
    showOfflineModal.value = false
    toast.add({ title: 'Offline Payment Recorded', color: 'success' })
    const orgId = authStore.currentOrganization?.id
    if (orgId) {
      paymentStore.fetchPaymentHistory(orgId).catch(() => {})
      loadPayoutAccount(orgId)
    }
  } catch (err: any) {
    handleError(err, { title: 'Failed to Record Payment' })
  } finally {
    recordingOffline.value = false
  }
}

// CSV settlement export
// NB: Select item values must not be empty strings (Reka UI throws) — 'all' is the sentinel
const exportTournamentId = ref('all')
const exporting = ref(false)

const exportTournamentOptions = computed(() => [
  { label: 'All tournaments', value: 'all' },
  ...tournaments.value.map((t) => ({ label: t.name, value: t.id })),
])

async function handleExport() {
  const orgId = authStore.currentOrganization?.id
  if (!orgId) return
  exporting.value = true
  try {
    await paymentStore.exportPaymentsCsv(orgId, exportTournamentId.value === 'all' ? undefined : exportTournamentId.value)
  } catch (err: any) {
    handleError(err, { title: 'Export Failed' })
  } finally {
    exporting.value = false
  }
}

// Refunds
const showRefundModal = ref(false)
const refundTarget = ref<PaymentRecord | null>(null)
const refundReason = ref('')
const refundManual = ref(false)
const refunding = ref(false)

function canRefund(p: PaymentRecord) {
  return isOwner.value
    && p.status === 'SUCCESS'
    && ['TOURNAMENT_REGISTRATION', 'OFFLINE_REGISTRATION'].includes(p.type || '')
    && p.amount > 0
}

function isOnlinePayment(p: PaymentRecord) {
  return p.type === 'TOURNAMENT_REGISTRATION' && !p.metadata?.waived
}

function openRefund(p: PaymentRecord) {
  refundTarget.value = p
  refundReason.value = ''
  refundManual.value = false
  showRefundModal.value = true
}

async function handleRefund() {
  if (!refundTarget.value) return
  refunding.value = true
  try {
    const res = await paymentStore.refundPayment(
      refundTarget.value.id,
      refundReason.value || undefined,
      refundManual.value || undefined
    )
    showRefundModal.value = false
    toast.add({
      title: 'Refund Processed',
      description: res.message,
      color: 'success',
    })
    const orgId = authStore.currentOrganization?.id
    if (orgId) {
      paymentStore.fetchPaymentHistory(orgId).catch(() => {})
      loadPayoutAccount(orgId)
    }
  } catch (err: any) {
    handleError(err, { title: 'Refund Failed' })
  } finally {
    refunding.value = false
  }
}

const statusColor = computed(() => {
  switch (subscription.value?.status) {
    case 'ACTIVE': return 'success'
    case 'TRIALING': return 'info'
    case 'PAST_DUE': return 'warning'
    case 'CANCELLED': return 'error'
    default: return 'neutral'
  }
})
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Billing</h1>
        <p class="text-gray-500 mt-1">
          Earnings, payouts and subscription for
          <span class="font-semibold text-gray-900 dark:text-white">{{ authStore.currentOrganization?.name }}</span>
        </p>
      </div>
      <USelect
        v-if="orgOptions.length > 1"
        :model-value="authStore.activeOrganizationId ?? undefined"
        :items="orgOptions"
        value-key="value"
        size="sm"
        class="w-52 shrink-0"
        @update:model-value="(id) => authStore.syncActiveOrganization(id as string)"
      />
    </div>

    <!-- Stat cards -->
    <div v-if="payoutSummary" class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-4 sm:p-5">
        <div class="flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
          <UIcon name="i-heroicons-banknotes" class="w-4 h-4 text-emerald-500" />
          <span>Net earned</span>
        </div>
        <p class="mt-2 text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          ₦{{ (payoutSummary.totalNet / 100).toLocaleString() }}
        </p>
        <p class="text-[11px] text-gray-400 mt-0.5">of ₦{{ (payoutSummary.totalGross / 100).toLocaleString() }} gross</p>
      </div>
      <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-4 sm:p-5">
        <div class="flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
          <UIcon name="i-heroicons-receipt-percent" class="w-4 h-4 text-indigo-500" />
          <span>Payments</span>
        </div>
        <p class="mt-2 text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          {{ payoutSummary.paymentCount }}
        </p>
        <p class="text-[11px] text-gray-400 mt-0.5">registration payment{{ payoutSummary.paymentCount === 1 ? '' : 's' }}</p>
      </div>
      <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-4 sm:p-5">
        <div class="flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
          <UIcon name="i-heroicons-wallet" class="w-4 h-4 text-amber-500" />
          <span>Collected offline</span>
        </div>
        <p class="mt-2 text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          ₦{{ (payoutSummary.offlineGross / 100).toLocaleString() }}
        </p>
        <p class="text-[11px] text-gray-400 mt-0.5">{{ payoutSummary.offlineCount }} payment{{ payoutSummary.offlineCount === 1 ? '' : 's' }} — no commission</p>
      </div>
      <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-4 sm:p-5">
        <div class="flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
          <UIcon name="i-heroicons-arrow-uturn-left" class="w-4 h-4 text-red-500" />
          <span>Refunded</span>
        </div>
        <p class="mt-2 text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          ₦{{ (payoutSummary.refundedAmount / 100).toLocaleString() }}
        </p>
        <p class="text-[11px] text-gray-400 mt-0.5">{{ payoutSummary.refundCount }} refund{{ payoutSummary.refundCount === 1 ? '' : 's' }}</p>
      </div>
    </div>

    <UTabs :items="billingTabs" default-value="earnings" class="w-full">
      <template #earnings>
        <div class="mt-6 space-y-6">

    <!-- Payout Account -->
    <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden shadow-sm">
      <div class="px-6 py-4 border-b border-gray-100 dark:border-white/[0.06] flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-banknotes" class="w-4.5 h-4.5 text-emerald-500" />
          <h3 class="text-sm font-bold text-gray-500">Payout Account</h3>
        </div>
        <UBadge
          :color="payoutAccount?.hasPayoutAccount ? 'success' : 'neutral'"
          variant="subtle"
          size="sm"
        >
          {{ payoutAccount?.hasPayoutAccount ? 'Active' : 'Not set up' }}
        </UBadge>
      </div>

      <div class="p-6 space-y-5">
        <p class="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          Connect a bank account to receive paid registration fees directly. Paystack settles funds to your account the next business day — ParaScores keeps only a {{ isPro ? 3 : 5 }}% platform commission{{ isPro ? ' (Pro rate)' : '' }}.
        </p>

        <div v-if="payoutAccount?.hasPayoutAccount" class="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/20">
          <UIcon name="i-heroicons-building-library" class="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <div class="min-w-0">
            <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">{{ payoutAccount.accountName }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              <template v-if="payoutAccount.bankName">{{ payoutAccount.bankName }} · </template>{{ payoutAccount.accountNumberMasked }}
            </p>
          </div>
        </div>

        <!-- Earnings Summary -->
        <div v-if="payoutSummary && payoutSummary.paymentCount > 0" class="rounded-xl border border-gray-200 dark:border-white/[0.06] overflow-hidden">
          <div class="px-4 py-3 bg-gray-50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/[0.06] flex items-center justify-between gap-3">
            <span class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Registration Earnings</span>
            <span class="text-xs text-gray-500 dark:text-gray-400">{{ payoutSummary.paymentCount }} payment{{ payoutSummary.paymentCount === 1 ? '' : 's' }}</span>
          </div>
          <div class="divide-y divide-gray-50 dark:divide-white/[0.04]">
            <div
              v-for="t in payoutSummary.tournaments"
              :key="t.id"
              class="px-4 py-2.5 flex items-center justify-between gap-3 text-sm"
            >
              <span class="text-gray-700 dark:text-gray-300 truncate">{{ t.name }}</span>
              <span class="text-gray-900 dark:text-white font-semibold shrink-0">
                ₦{{ (t.net / 100).toLocaleString() }}
                <span class="text-xs font-normal text-gray-400">net</span>
              </span>
            </div>
          </div>
          <div class="px-4 py-3 bg-gray-50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/[0.06] flex items-center justify-between gap-3">
            <span class="text-sm font-bold text-gray-900 dark:text-white">Total</span>
            <span class="text-sm font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
              ₦{{ (payoutSummary.totalNet / 100).toLocaleString() }}
              <span class="text-xs font-normal text-gray-400">of ₦{{ (payoutSummary.totalGross / 100).toLocaleString() }}</span>
            </span>
          </div>
          <div v-if="payoutSummary.offlineCount > 0" class="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-white/[0.06] flex items-center gap-1.5">
            <UIcon name="i-heroicons-banknotes" class="w-3.5 h-3.5" />
            <span>
              Includes <span class="font-semibold text-gray-900 dark:text-white">₦{{ (payoutSummary.offlineGross / 100).toLocaleString() }}</span>
              collected offline ({{ payoutSummary.offlineCount }} payment{{ payoutSummary.offlineCount === 1 ? '' : 's' }}) — no commission on offline income.
            </span>
          </div>
          <div v-if="payoutSummary.refundCount > 0" class="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-white/[0.06] flex items-center gap-1.5">
            <UIcon name="i-heroicons-arrow-uturn-left" class="w-3.5 h-3.5" />
            <span>
              <span class="font-semibold text-gray-900 dark:text-white">₦{{ (payoutSummary.refundedAmount / 100).toLocaleString() }}</span>
              refunded across {{ payoutSummary.refundCount }} payment{{ payoutSummary.refundCount === 1 ? '' : 's' }} (excluded from totals).
            </span>
          </div>
          <p class="px-4 py-2 text-[10px] text-gray-400 border-t border-gray-100 dark:border-white/[0.06]">
            Estimates after {{ payoutSummary.commissionPercent }}% commission on online payments, before Paystack fees. Settlements arrive the next business day.
          </p>
        </div>

        <div v-if="payoutAccount?.hasPayoutAccount && !showPayoutForm" class="flex justify-end">
          <UButton
            variant="outline"
            color="neutral"
            icon="i-heroicons-pencil-square"
            label="Change Payout Account"
            @click="showPayoutForm = true;"
          />
        </div>
        <PayoutAccountForm
          v-else-if="authStore.currentOrganization?.id"
          :org-id="authStore.currentOrganization.id"
          :initial-bank-code="payoutAccount?.bankCode"
          :is-update="!!payoutAccount?.hasPayoutAccount"
          @saved="onPayoutSaved"
        />
      </div>
    </div>

    <!-- Payment History -->
    <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden shadow-sm">
      <div class="px-6 py-4 border-b border-gray-100 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
        <h3 class="text-sm font-bold text-gray-500">Billing History</h3>
        <div class="flex flex-wrap items-center gap-2">
          <USelect
            v-model="exportTournamentId"
            :items="exportTournamentOptions"
            value-key="value"
            size="xs"
            class="w-40"
          />
          <UButton
            icon="i-heroicons-arrow-down-tray"
            label="Export CSV"
            size="xs"
            variant="outline"
            color="neutral"
            :loading="exporting"
            :disabled="paymentHistory.length === 0"
            @click="handleExport"
          />
          <UButton
            icon="i-heroicons-plus"
            label="Record Offline Payment"
            size="xs"
            color="primary"
            @click="openOfflineModal"
          />
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="paymentHistory.length === 0" class="p-8 text-center">
        <UIcon name="i-heroicons-document-text" class="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p class="text-sm text-gray-400">No payment history yet.</p>
        <p class="text-xs text-gray-400 mt-1">Invoices will appear here after your first payment.</p>
      </div>

      <!-- Payment List (Mobile: Cards) -->
      <div v-else>
        <div class="md:hidden divide-y divide-gray-100 dark:divide-white/[0.06]">
          <div
            v-for="payment in paymentHistory"
            :key="payment.id"
            class="px-5 py-4 flex items-start gap-3"
          >
            <div
              v-if="payment.teamLogoUrl"
              class="w-9 h-9 rounded-lg overflow-hidden shrink-0 mt-0.5 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5"
            >
              <img :src="payment.teamLogoUrl" :alt="payment.teamName || 'Team logo'" class="w-full h-full object-cover" />
            </div>
            <div
              v-else
              class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              :class="payment.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-500' : payment.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'"
            >
              <UIcon
                :name="payment.status === 'SUCCESS' ? 'i-heroicons-check-circle' : payment.status === 'PENDING' ? 'i-heroicons-clock' : 'i-heroicons-x-circle'"
                class="w-5 h-5"
              />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2">
                <span class="text-sm font-bold text-gray-900 dark:text-white truncate">
                  {{ paymentLabel(payment) }}
                </span>
                <span class="text-sm font-bold text-gray-900 dark:text-white shrink-0">
                  ₦{{ (payment.amount / 100).toLocaleString() }}
                </span>
              </div>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="text-xs text-gray-400">{{ formatDate(payment.created_at) }}</span>
                <span v-if="payment.tournament" class="text-xs text-gray-400 truncate">· {{ payment.tournament.name }}</span>
              </div>
              <div class="flex items-center gap-2 mt-1.5">
                <UBadge
                  :color="statusBadgeColor(payment.status)"
                  variant="subtle"
                  size="xs"
                >
                  {{ payment.status }}
                </UBadge>
                <UBadge v-if="payment.metadata?.waived" color="info" variant="subtle" size="xs">WAIVED</UBadge>
                <UBadge v-if="payment.type === 'OFFLINE_REGISTRATION'" color="neutral" variant="subtle" size="xs">OFFLINE</UBadge>
                <span class="text-[10px] text-gray-500 truncate">{{ payment.paystackReference }}</span>
              </div>
              <div v-if="canRefund(payment)" class="mt-2">
                <UButton
                  size="xs"
                  variant="ghost"
                  color="error"
                  icon="i-heroicons-arrow-uturn-left"
                  label="Refund"
                  @click="openRefund(payment)"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Payment Table (Desktop) -->
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-[10px] font-extrabold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-white/[0.06]">
                <th class="px-6 py-3">Date</th>
                <th class="px-6 py-3">Description</th>
                <th class="px-6 py-3">Amount</th>
                <th class="px-6 py-3">Status</th>
                <th class="px-6 py-3">Reference</th>
                <th class="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50 dark:divide-white/[0.04]">
              <tr v-for="payment in paymentHistory" :key="payment.id" class="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                <td class="px-6 py-3.5 whitespace-nowrap text-gray-600 dark:text-gray-300">
                  {{ formatDate(payment.created_at) }}
                </td>
                 <td class="px-6 py-3.5">
                   <div class="flex items-center gap-2">
                    <img
                      v-if="payment.teamLogoUrl"
                      :src="payment.teamLogoUrl"
                      :alt="payment.teamName || 'Team logo'"
                      class="w-6 h-6 rounded-md object-cover shrink-0 border border-gray-200 dark:border-white/10"
                    />
                    <span class="font-bold text-gray-900 dark:text-white">
                      {{ paymentLabel(payment) }}
                    </span>
                    <span v-if="payment.tournament" class="text-xs text-gray-400">
                      · {{ payment.tournament.name }}
                    </span>
                  </div>
                </td>
                <td class="px-6 py-3.5 whitespace-nowrap font-bold text-gray-900 dark:text-white">
                  ₦{{ (payment.amount / 100).toLocaleString() }}
                </td>
                <td class="px-6 py-3.5 whitespace-nowrap">
                  <UBadge
                    :color="statusBadgeColor(payment.status)"
                    variant="subtle"
                    size="xs"
                    class="font-bold uppercase tracking-wider text-[10px]"
                  >
                    {{ payment.status }}
                  </UBadge>
                  <UBadge v-if="payment.metadata?.waived" color="info" variant="subtle" size="xs" class="ml-1">WAIVED</UBadge>
                  <UBadge v-if="payment.type === 'OFFLINE_REGISTRATION'" color="neutral" variant="subtle" size="xs" class="ml-1">OFFLINE</UBadge>
                </td>
                <td class="px-6 py-3.5 whitespace-nowrap text-xs text-gray-400 font-mono">
                  {{ payment.paystackReference }}
                </td>
                <td class="px-6 py-3.5 whitespace-nowrap text-right">
                  <UButton
                    v-if="canRefund(payment)"
                    size="xs"
                    variant="ghost"
                    color="error"
                    icon="i-heroicons-arrow-uturn-left"
                    label="Refund"
                    @click="openRefund(payment)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

        </div>
      </template>

      <template #plans>
        <div class="mt-6 space-y-8">

    <!-- Current Plan Status Card -->
    <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6 shadow-sm">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <div 
            class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            :class="isPro ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-100 dark:bg-white/5 text-gray-500'"
          >
            <UIcon :name="isPro ? 'i-heroicons-bolt-solid' : 'i-heroicons-sparkles'" class="w-6 h-6" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-lg font-bold text-gray-900 dark:text-white">
                {{ currentPlan }} Plan
              </h3>
              <UBadge 
                v-if="subscription?.status" 
                :color="statusColor" 
                variant="subtle" 
                size="sm"
                class="uppercase font-bold tracking-wider text-[10px]"
              >
                {{ subscription.status }}
              </UBadge>
            </div>
            <p class="text-sm text-gray-500 mt-0.5">
              <template v-if="isPro && subscription?.currentPeriodEnd">
                Renews {{ formatDate(subscription.currentPeriodEnd) }}
              </template>
              <template v-else-if="isCancelled && subscription?.currentPeriodEnd">
                Active until {{ formatDate(subscription.currentPeriodEnd) }}
              </template>
              <template v-else-if="isPastDue">
                Payment failed — please update your payment method.
              </template>
              <template v-else>
                {{ authStore.currentOrganization?.name || 'Your organization' }}
              </template>
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <UButton
            v-if="isPro && isActive"
            label="Cancel Plan"
            color="error"
            variant="ghost"
            size="sm"
            icon="i-heroicons-x-mark"
            @click="showCancelModal = true;"
          />
        </div>
      </div>
    </div>

    <!-- Billing Toggle -->
    <div class="flex items-center justify-center gap-4 mb-8">
      <span :class="['text-sm font-bold transition-colors', !isYearly ? 'text-gray-900 dark:text-white' : 'text-gray-400']">Monthly</span>
      <UToggle v-model="isYearly" color="primary" size="lg" />
      <span :class="['text-sm font-bold transition-colors flex items-center gap-2', isYearly ? 'text-gray-900 dark:text-white' : 'text-gray-400']">
        Yearly
        <span class="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 py-0.5 px-2 rounded-full uppercase tracking-wider">
          Save 20%
        </span>
      </span>
    </div>

    <!-- Plan Cards -->
    <div class="grid md:grid-cols-2 xl:grid-cols-4 gap-6 mb-12">
      <div
        v-for="plan in plans"
        :key="plan.key"
        :class="[
          'relative bg-white dark:bg-gray-900 rounded-2xl p-6 transition-all duration-300 flex flex-col',
          plan.popular && !isCurrentPlan(plan) 
            ? 'border-2 border-emerald-500 shadow-lg shadow-emerald-500/10' 
            : isCurrentPlan(plan) 
              ? 'border-2 border-indigo-500 shadow-lg shadow-indigo-500/10' 
              : 'border border-gray-200 dark:border-white/[0.06] hover:border-emerald-500/30',
        ]"
      >
        <!-- Current Plan Badge -->
        <div 
          v-if="isCurrentPlan(plan)" 
          class="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[10px] font-extrabold px-4 py-1 rounded-full uppercase tracking-wider shadow-lg"
        >
          Current Plan
        </div>

        <!-- Popular Badge -->
        <div 
          v-else-if="plan.popular" 
          class="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-extrabold px-4 py-1 rounded-full uppercase tracking-wider shadow-lg"
        >
          Most Popular
        </div>

        <!-- One-Time Badge -->
        <div 
          v-else-if="plan.oneTime" 
          class="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[10px] font-extrabold px-4 py-1 rounded-full uppercase tracking-wider shadow-lg"
        >
          One-Time
        </div>

        <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-1">{{ plan.name }}</h3>
        <p class="text-sm text-gray-500 mb-5 min-h-[40px] leading-relaxed">{{ plan.description }}</p>

        <!-- Price -->
        <div class="mb-5">
          <template v-if="plan.monthlyPrice === 'Custom'">
            <span class="text-3xl font-extrabold text-gray-900 dark:text-white">Custom</span>
          </template>
          <template v-else-if="plan.oneTime">
            <span class="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              {{ typeof plan.monthlyPrice === 'number' ? `₦${(plan.monthlyPrice as number).toLocaleString()}` : `₦${plan.monthlyPrice}` }}
            </span>
            <span class="text-gray-500 font-bold ml-1">/tournament</span>
          </template>
          <template v-else>
            <span class="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              ₦{{ (isYearly && plan.yearlyPrice ? Math.round((plan.yearlyPrice as number) / 12) : plan.monthlyPrice).toLocaleString() }}
            </span>
            <span class="text-gray-500 font-bold ml-1">/mo</span>
            <div v-if="isYearly && (plan.monthlyPrice as number) > 0" class="text-sm text-emerald-500 mt-1 font-bold">
              Billed ₦{{ (plan.yearlyPrice as number).toLocaleString() }} yearly
            </div>
          </template>
        </div>

        <!-- CTA Button -->
        <UButton
          block
          size="lg"
          :disabled="isCurrentPlan(plan) || loading || subscribing || plan.key === 'PRO'"
          :loading="subscribing && canSubscribe(plan)"
          :color="canSubscribe(plan) ? 'primary' : 'neutral'"
          :variant="isCurrentPlan(plan) ? 'subtle' : 'solid'"
          class="font-bold mb-6 h-11 rounded-xl transition-all"
          @click="handlePlanAction(plan)"
        >
          {{ getButtonLabel(plan) }}
        </UButton>

        <!-- Features -->
        <div class="space-y-3 flex-grow border-t border-gray-100 dark:border-white/[0.06] pt-5">
          <div class="text-[10px] font-extrabold text-gray-400 tracking-widest uppercase">What's included:</div>
          <ul class="space-y-3">
            <li v-for="feature in plan.features" :key="feature.text" class="flex items-start gap-2.5">
              <UIcon name="i-heroicons-check-circle" class="w-4.5 h-4.5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <UTooltip :text="feature.tooltip" :content="{ side: 'top', align: 'center' }">
                <span class="text-sm text-gray-600 dark:text-gray-300 leading-tight border-b border-dashed border-gray-300 dark:border-white/10 cursor-help hover:text-emerald-500 transition-colors">{{ feature.text }}</span>
              </UTooltip>
            </li>
          </ul>
        </div>
      </div>
    </div>

        </div>
      </template>
    </UTabs>

    <!-- Record Offline Payment Modal -->
    <UModal v-model:open="showOfflineModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-4">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <UIcon name="i-heroicons-banknotes" class="w-5 h-5 text-emerald-500" />
                </div>
                <div class="min-w-0">
                  <h3 class="text-lg font-bold text-gray-900 dark:text-white">Record Offline Payment</h3>
                  <p class="text-xs text-gray-500">Log a registration fee collected by cash or bank transfer.</p>
                </div>
              </div>
              <UButton icon="i-heroicons-x-mark" variant="ghost" color="neutral" size="sm" class="shrink-0" @click="showOfflineModal = false" />
            </div>
          </template>

          <div v-if="offlineTournamentOptions.length === 0" class="py-4 text-center">
            <p class="text-sm text-gray-500">No tournaments with paid registration found.</p>
            <p class="text-xs text-gray-400 mt-1">Enable paid registration on a tournament first.</p>
          </div>

          <div v-else class="space-y-4">
            <UFormField label="Tournament" required>
              <USelect
                v-model="offlineForm.tournamentId"
                :items="offlineTournamentOptions"
                value-key="value"
                placeholder="Select tournament"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Link participant (optional)">
              <USelect
                v-model="offlineForm.participantId"
                :items="offlineParticipantOptions"
                value-key="value"
                :loading="loadingOfflineParticipants"
                :disabled="!offlineForm.tournamentId"
                placeholder="Walk-in / not linked"
                class="w-full"
              />
            </UFormField>

            <UFormField v-if="!offlineForm.participantId" label="Payer name (optional)">
              <UInput
                v-model="offlineForm.payerName"
                placeholder="e.g. University of Lagos"
                class="w-full"
              />
            </UFormField>

            <div class="grid grid-cols-2 gap-3">
              <UFormField label="Amount (₦)">
                <UInput
                  v-model.number="offlineForm.amount"
                  type="number"
                  min="0"
                  step="0.01"
                  :placeholder="offlineSelectedTournament ? String((offlineSelectedTournament.registrationFee ?? 0) / 100) : '0.00'"
                  class="w-full"
                />
                <template #hint>
                  <span v-if="offlineSelectedTournament">
                    Defaults to the fee: ₦{{ ((offlineSelectedTournament.registrationFee ?? 0) / 100).toLocaleString() }}
                  </span>
                </template>
              </UFormField>

              <UFormField label="Method" required>
                <USelect
                  v-model="offlineForm.method"
                  :items="[
                    { label: 'Cash', value: 'CASH' },
                    { label: 'Bank Transfer', value: 'BANK_TRANSFER' },
                    { label: 'Other', value: 'OTHER' },
                  ]"
                  value-key="value"
                  class="w-full"
                />
              </UFormField>
            </div>

            <UFormField label="Note (optional)">
              <UInput
                v-model="offlineForm.note"
                placeholder="e.g. Receipt #0012"
                class="w-full"
              />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton variant="ghost" color="neutral" label="Cancel" @click="showOfflineModal = false" />
              <UButton
                color="primary"
                icon="i-heroicons-check"
                label="Record Payment"
                :loading="recordingOffline"
                :disabled="!offlineForm.tournamentId"
                @click="handleRecordOffline"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Refund Payment Modal -->
    <UModal v-model:open="showRefundModal">
      <template #content>
        <UCard v-if="refundTarget">
          <template #header>
            <div class="flex items-center justify-between gap-4">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                  <UIcon name="i-heroicons-arrow-uturn-left" class="w-5 h-5 text-red-500" />
                </div>
                <div class="min-w-0">
                  <h3 class="text-lg font-bold text-gray-900 dark:text-white">Refund Payment</h3>
                  <p class="text-xs text-gray-500 truncate">{{ paymentLabel(refundTarget) }} · ₦{{ (refundTarget.amount / 100).toLocaleString() }}</p>
                </div>
              </div>
              <UButton icon="i-heroicons-x-mark" variant="ghost" color="neutral" size="sm" class="shrink-0" @click="showRefundModal = false" />
            </div>
          </template>

          <div class="mb-4 p-3 rounded-xl flex items-start gap-2.5 text-xs bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 text-gray-600 dark:text-gray-300">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <template v-if="refundTarget.type === 'OFFLINE_REGISTRATION'">
                This only marks the payment as refunded — return the money to the payer directly (cash/transfer).
              </template>
              <template v-else-if="refundManual">
                The payment is marked as refunded, but <span class="font-bold">you</span> return ₦{{ (refundTarget.amount / 100).toLocaleString() }} to the payer yourself (bank transfer/cash). Use this if the automatic refund fails because your unsettled payout balance is too low.
              </template>
              <template v-else>
                The full ₦{{ (refundTarget.amount / 100).toLocaleString() }} will be refunded to the payer via Paystack (3–10 business days). Paystack deducts refunds from your unsettled payout first.
              </template>
              This does <span class="font-bold">not</span> remove the team from the tournament — withdraw them separately if needed.
            </div>
          </div>

          <!-- Refund method (online payments only) -->
          <div v-if="isOnlinePayment(refundTarget)" class="mb-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              :class="[
                'p-3 rounded-xl border text-left transition-all',
                !refundManual
                  ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500'
                  : 'border-gray-200 dark:border-white/10 hover:border-emerald-500/40'
              ]"
              @click="refundManual = false"
            >
              <p class="text-sm font-semibold text-gray-900 dark:text-white">Automatic refund</p>
              <p class="text-[11px] text-gray-500 mt-0.5">Paystack returns the money to the payer's card/bank account.</p>
            </button>
            <button
              type="button"
              :class="[
                'p-3 rounded-xl border text-left transition-all',
                refundManual
                  ? 'border-amber-500 bg-amber-500/5 ring-1 ring-amber-500'
                  : 'border-gray-200 dark:border-white/10 hover:border-amber-500/40'
              ]"
              @click="refundManual = true"
            >
              <p class="text-sm font-semibold text-gray-900 dark:text-white">Manual refund</p>
              <p class="text-[11px] text-gray-500 mt-0.5">You return the money yourself; we just record it.</p>
            </button>
          </div>

          <UFormField label="Reason (optional)">
            <UInput
              v-model="refundReason"
              placeholder="e.g. Team withdrew before the draw"
              class="w-full"
            />
          </UFormField>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton variant="ghost" color="neutral" label="Cancel" @click="showRefundModal = false" />
              <UButton
                color="error"
                icon="i-heroicons-arrow-uturn-left"
                label="Confirm Refund"
                :loading="refunding"
                @click="handleRefund"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Tournament Selector Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showTournamentSelector"
          class="fixed inset-0 z-[100] flex items-center justify-center px-4"
          @click.self="showTournamentSelector = false"
        >
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showTournamentSelector = false" />

          <div class="relative w-full max-w-md rounded-2xl border p-6 shadow-2xl bg-white border-gray-200 dark:bg-gray-900 dark:border-white/10">
            <button
              class="absolute top-3 right-3 p-1.5 rounded-lg transition-colors hover:bg-gray-100 text-gray-500 dark:hover:bg-white/10"
              @click="showTournamentSelector = false"
            >
              <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
            </button>

            <div class="flex items-center gap-3 mb-5">
              <div class="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <UIcon name="i-heroicons-trophy" class="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 class="text-lg font-bold text-gray-900 dark:text-white">Upgrade Tournament</h3>
                <p class="text-xs text-gray-500">Select a tournament to upgrade with premium features.</p>
              </div>
            </div>

            <!-- Capacity Pricing Info Alert -->
            <div class="mb-4 p-3 rounded-xl flex items-start gap-2.5 text-xs bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 text-gray-600 dark:text-gray-300">
              <UIcon name="i-heroicons-information-circle" class="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span class="font-bold text-emerald-600 dark:text-emerald-400">₦1,000 per Team:</span>
                Pricing is calculated as max participants × ₦1,000. For example, a 16-team tournament costs ₦16,000.
              </div>
            </div>

            <div v-if="tournaments.length === 0" class="py-6 text-center">
              <UIcon name="i-heroicons-trophy" class="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p class="text-sm text-gray-500">No tournaments found.</p>
              <p class="text-xs text-gray-400 mt-1">Create a tournament first, then come back to upgrade it.</p>
            </div>

            <div v-else class="space-y-2 max-h-60 overflow-y-auto mb-5">
              <button
                v-for="t in tournaments"
                :key="t.id"
                :disabled="t.isPremium"
                @click="selectedTournamentId = t.id"
                :class="[
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left',
                  t.isPremium
                    ? 'opacity-50 cursor-not-allowed border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02]'
                    : selectedTournamentId === t.id
                      ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500'
                      : 'border-gray-200 dark:border-white/10 hover:border-emerald-500/40'
                ]"
              >
                <UAvatar v-if="t.logoUrl" :src="t.logoUrl" size="xs" class="rounded-md shrink-0" />
                <div v-else class="w-8 h-8 rounded-md bg-gray-100 dark:bg-white/10 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                  {{ t.name?.charAt(0) }}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-bold text-gray-900 dark:text-white truncate">{{ t.name }}</p>
                  <p class="text-xs text-gray-500">
                    {{ t.sport }} · {{ t.type }} · 
                    <span class="font-medium text-gray-600 dark:text-gray-400">
                      {{ typeof t.maxParticipants === 'number' ? `${t.maxParticipants} max` : 'Unlimited capacity' }}
                    </span>
                  </p>
                </div>
                <div v-if="!t.isPremium" class="text-right shrink-0 mr-1">
                  <span class="text-xs font-extrabold text-emerald-500 dark:text-emerald-400">
                    ₦{{ getTournamentUpgradePrice(t.maxParticipants).toLocaleString() }}
                  </span>
                </div>
                <UBadge v-if="t.isPremium" color="success" variant="subtle" size="xs" class="shrink-0">
                  Premium
                </UBadge>
                <UIcon 
                  v-else-if="selectedTournamentId === t.id" 
                  name="i-heroicons-check-circle-solid" 
                  class="w-5 h-5 text-emerald-500 shrink-0" 
                />
              </button>
            </div>

            <div class="flex items-center gap-3">
              <UButton
                label="Cancel"
                color="neutral"
                variant="soft"
                class="flex-1 font-bold"
                @click="showTournamentSelector = false;"
              />
              <UButton
                :label="selectedTournamentUpgradePrice ? `Pay ₦${selectedTournamentUpgradePrice.toLocaleString()} & Upgrade` : 'Select a Tournament'"
                color="primary"
                variant="solid"
                class="flex-1 font-bold bg-emerald-500 hover:bg-emerald-600"
                :disabled="!selectedTournamentId"
                :loading="upgradingTournament"
                @click="handleTournamentUpgrade"
              />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Cancel Confirmation Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showCancelModal"
          class="fixed inset-0 z-[100] flex items-center justify-center px-4"
          @click.self="showCancelModal = false"
        >
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showCancelModal = false" />

          <div class="relative w-full max-w-md rounded-2xl border p-6 shadow-2xl bg-white border-gray-200 dark:bg-gray-900 dark:border-white/10">
            <button
              class="absolute top-3 right-3 p-1.5 rounded-lg transition-colors hover:bg-gray-100 text-gray-500 dark:hover:bg-white/10"
              @click="showCancelModal = false"
            >
              <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
            </button>

            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-500" />
              </div>
              <h3 class="text-lg font-bold text-gray-900 dark:text-white">Cancel Subscription?</h3>
            </div>

            <p class="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              Are you sure you want to cancel your <strong>Pro</strong> subscription? 
              You'll keep access to Pro features until the end of your current billing period.
              After that, your account will revert to the Free plan.
            </p>

            <div class="flex items-center gap-3">
              <UButton
                label="Keep Plan"
                color="neutral"
                variant="soft"
                class="flex-1 font-bold"
                @click="showCancelModal = false;"
              />
              <UButton
                label="Cancel Plan"
                color="error"
                variant="solid"
                class="flex-1 font-bold"
                :loading="cancelling"
                @click="handleCancelSubscription"
              />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-active > div:last-child,
.modal-leave-active > div:last-child {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from > div:last-child {
  transform: scale(0.95);
  opacity: 0;
}
.modal-leave-to > div:last-child {
  transform: scale(0.95);
  opacity: 0;
}
</style>
