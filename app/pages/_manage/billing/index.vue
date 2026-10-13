<script setup lang="ts">
import { storeToRefs } from 'pinia'
import type { PaymentRecord, PayoutAccountStatus, PayoutSummary } from '~/stores/payment'
import type { BillingPlan } from '~/types/billing'

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

// Plan & pricing state
const showCancelModal = ref(false)
const isYearly = ref(true)

// Tournament upgrade
const showTournamentSelector = ref(false)

const tournamentStore = useTournamentStore()
const { tournaments } = storeToRefs(tournamentStore)

// Payout account + earnings summary
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

const orgOptions = computed(() =>
  authStore.organizations.map((m) => ({
    label: m.organization?.name || 'Organization',
    value: m.organizationId,
  }))
)

function onPayoutSaved(status: PayoutAccountStatus | null) {
  payoutAccount.value = status
}

// Plan definitions
const plans = computed<BillingPlan[]>(() => [
  {
    name: 'Free',
    key: 'FREE',
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
    key: 'PER_TOURNAMENT',
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
    key: 'PRO',
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
    key: 'ENTERPRISE',
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

const route = useRoute()
const router = useRouter()

// Page tabs
const billingTabs = [
  { label: 'Earnings', value: 'earnings', slot: 'earnings', icon: 'i-heroicons-banknotes' },
  { label: 'Plan & Pricing', value: 'plans', slot: 'plans', icon: 'i-heroicons-sparkles' },
]

function resolveTab(tabParam?: unknown): string {
  const t = String(tabParam ?? '').toLowerCase()
  return t === 'plans' || t === 'plan' || t === 'pricing' ? 'plans' : 'earnings'
}

const activeTab = ref(resolveTab(route.query.tab))

watch(
  () => route.query.tab,
  (newTab) => {
    activeTab.value = resolveTab(newTab)
  }
)

function onTabChange(val: string | number) {
  let next = String(val)
  if (val === 0 || val === '0') next = 'earnings'
  else if (val === 1 || val === '1') next = 'plans'
  activeTab.value = next
  if (route.query.tab !== next) {
    router.replace({ query: { ...route.query, tab: next } })
  }
}

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
async function handleSubscribe(plan: BillingPlan) {
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

function canSubscribePlan(plan: BillingPlan) {
  if (plan.key === 'FREE' || plan.key === 'ENTERPRISE' || plan.key === 'PRO') return false
  if (plan.key === 'PER_TOURNAMENT') return true
  if (plan.key === currentPlan.value && isActive.value) return false
  return true
}

function handlePlanAction(plan: BillingPlan) {
  if (plan.key === 'PER_TOURNAMENT') {
    showTournamentSelector.value = true
  } else if (plan.key === 'ENTERPRISE') {
    // /contact only exists on the marketing (root) domain — go cross-subdomain
    return navigateTo(toMain('/contact?subject=Enterprise Inquiry'), { external: true })
  } else if (canSubscribePlan(plan)) {
    handleSubscribe(plan)
  }
}

// ─── Offline payments, exports & refunds ─────────────────

const isOwner = computed(() => {
  const orgId = authStore.currentOrganization?.id
  const membership = authStore.organizations.find((m) => m.organizationId === orgId)
  return membership?.role === 'OWNER'
})

// Retry failed/stuck instant payouts (OWNER only)
const retryingPayoutId = ref<string | null>(null)

// Refresh history + earnings without a full page reload
const refreshingHistory = ref(false)

async function handleRefreshHistory() {
  const orgId = authStore.currentOrganization?.id
  if (!orgId || refreshingHistory.value) return
  refreshingHistory.value = true
  try {
    await Promise.all([
      paymentStore.fetchPaymentHistory(orgId),
      loadPayoutAccount(orgId),
    ])
  } catch {
    // Keep existing data on failure
  } finally {
    refreshingHistory.value = false
  }
}

async function handleRetryPayout(p: PaymentRecord) {
  retryingPayoutId.value = p.id
  try {
    const res = await paymentStore.retryPayout(p.id)
    toast.add({
      title: 'Payout Retried',
      description: res.message,
      color: res.data?.payoutStatus === 'PROCESSING' ? 'success' : 'warning',
    })
    const orgId = authStore.currentOrganization?.id
    if (orgId) {
      paymentStore.fetchPaymentHistory(orgId).catch(() => {})
      loadPayoutAccount(orgId)
    }
  } catch (err: any) {
    handleError(err, { title: 'Payout Retry Failed' })
  } finally {
    retryingPayoutId.value = null
  }
}

// CSV settlement export
const exporting = ref(false)

async function handleExport(tournamentId?: string) {
  const orgId = authStore.currentOrganization?.id
  if (!orgId) return
  exporting.value = true
  try {
    await paymentStore.exportPaymentsCsv(orgId, tournamentId)
  } catch (err: any) {
    handleError(err, { title: 'Export Failed' })
  } finally {
    exporting.value = false
  }
}

// Refund modal
const showRefundModal = ref(false)
const refundTarget = ref<PaymentRecord | null>(null)

function openRefund(p: PaymentRecord) {
  refundTarget.value = p
  showRefundModal.value = true
}

// Offline payment modal
const showOfflineModal = ref(false)

// After a refund/offline record: refresh history + earnings
function onPaymentsChanged() {
  const orgId = authStore.currentOrganization?.id
  if (orgId) {
    paymentStore.fetchPaymentHistory(orgId).catch(() => {})
    loadPayoutAccount(orgId)
  }
}

// "Manage" on the current-plan card scrolls to the grid
const plansGridRef = ref<HTMLElement | null>(null)
function scrollToPlans() {
  plansGridRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <div class="max-w-6xl mx-auto">
    <!-- Page context line + org scope -->
    <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-muted">
        Earnings, payouts and subscription for
        <span class="font-semibold text-heading">{{ authStore.currentOrganization?.name }}</span>
      </p>
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

    <UTabs
      :model-value="activeTab"
      :items="billingTabs"
      variant="link"
      class="w-full"
      @update:model-value="onTabChange"
    >
      <!-- ═══ Earnings tab ═══ -->
      <template #earnings>
        <div class="mt-4 flex flex-col gap-3 pb-8">
          <BillingEarningsStats v-if="payoutSummary" :summary="payoutSummary" />

          <BillingPayoutAccountCard
            :payout-account="payoutAccount"
            :is-owner="isOwner"
            @saved="onPayoutSaved"
          />

          <BillingEarningsByTournament
            v-if="payoutSummary && payoutSummary.paymentCount > 0"
            :summary="payoutSummary"
          />

          <BillingPaymentHistoryCard
            :payments="paymentHistory"
            :tournaments="tournaments"
            :is-owner="isOwner"
            :refreshing="refreshingHistory"
            :exporting="exporting"
            :retrying-payout-id="retryingPayoutId"
            @refresh="handleRefreshHistory"
            @export="handleExport"
            @record="showOfflineModal = true"
            @refund="openRefund"
            @retry="handleRetryPayout"
          />
        </div>
      </template>

      <!-- ═══ Plan & pricing tab ═══ -->
      <template #plans>
        <div class="mt-4 pb-8">
          <BillingCurrentPlanCard
            :current-plan="currentPlan"
            :subscription="subscription"
            :is-pro="isPro"
            :is-active="isActive"
            :is-cancelled="isCancelled"
            :is-past-due="isPastDue"
            :org-name="authStore.currentOrganization?.name"
            @cancel="showCancelModal = true"
            @manage="scrollToPlans"
          />

          <!-- Billing period -->
          <div class="flex justify-center my-6">
            <div class="inline-flex items-center gap-1 bg-black/[0.03] dark:bg-white/[0.04] border border-subtle p-1 rounded-xl">
              <button
                type="button"
                class="px-4 py-1.5 rounded-lg text-[12.5px] font-bold transition-all"
                :class="!isYearly ? 'bg-emerald-500 text-white shadow-sm' : 'text-muted hover:text-heading'"
                :aria-pressed="!isYearly"
                @click="isYearly = false"
              >
                Monthly
              </button>
              <button
                type="button"
                class="px-4 py-1.5 rounded-lg text-[12.5px] font-bold transition-all inline-flex items-center gap-2"
                :class="isYearly ? 'bg-emerald-500 text-white shadow-sm' : 'text-muted hover:text-heading'"
                :aria-pressed="isYearly"
                @click="isYearly = true"
              >
                Yearly
                <span
                  class="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                  :class="isYearly ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'"
                >−20%</span>
              </button>
            </div>
          </div>

          <!-- Plan grid -->
          <div ref="plansGridRef" class="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 scroll-mt-24">
            <BillingPlanCard
              v-for="plan in plans"
              :key="plan.key"
              :plan="plan"
              :is-yearly="isYearly"
              :current-plan="currentPlan"
              :is-active="isActive"
              :subscribing="subscribing"
              :store-loading="loading"
              @action="handlePlanAction"
            />
          </div>
        </div>
      </template>
    </UTabs>

    <!-- Modals (all UModal) -->
    <BillingOfflinePaymentModal
      v-model:open="showOfflineModal"
      @recorded="onPaymentsChanged"
    />
    <BillingRefundModal
      v-model:open="showRefundModal"
      :payment="refundTarget"
      @refunded="onPaymentsChanged"
    />
    <BillingTournamentUpgradeModal v-model:open="showTournamentSelector" />
    <BillingCancelPlanModal v-model:open="showCancelModal" />
  </div>
</template>
