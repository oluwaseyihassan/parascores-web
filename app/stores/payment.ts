import { defineStore } from 'pinia'
import type { ApiResponse } from './auth'

export interface Subscription {
  id?: string
  organizationId: string
  plan: 'FREE' | 'PRO' | 'ENTERPRISE'
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'TRIALING'
  paystackCustomerCode?: string | null
  paystackSubscriptionCode?: string | null
  paystackPlanCode?: string | null
  currentPeriodStart?: string | null
  currentPeriodEnd?: string | null
  cancelledAt?: string | null
  trialEnd?: string | null
  created_at?: string
  updated_at?: string
}

export interface PaymentInitResponse {
  authorization_url: string
  access_code: string
  reference: string
}

export interface RegistrationInitResponse {
  authorization_url?: string
  access_code?: string
  reference?: string
  waived?: boolean
  participant?: any
}

export interface PaymentVerifyResponse {
  payment: any
  subscription?: Subscription
  tournament?: { id: string; isPremium: boolean }
  player?: any
  status?: string
}

export interface PaymentRecord {
  id: string
  organizationId: string
  tournamentId?: string | null
  amount: number
  currency: string
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED'
  paystackReference: string
  plan?: string | null
  type?: string | null
  teamName?: string | null
  teamLogoUrl?: string | null
  metadata?: {
    channel?: 'OFFLINE'
    method?: 'CASH' | 'BANK_TRANSFER' | 'OTHER'
    note?: string | null
    waived?: boolean
    discountCode?: string | null
    refundReason?: string | null
    [key: string]: any
  } | null
  created_at: string
  tournament?: { id: string; name: string } | null
}

export interface PaystackBank {
  id: number
  name: string
  code: string
  active: boolean
}

export interface PayoutAccountStatus {
  hasPayoutAccount: boolean
  bankCode?: string | null
  bankName?: string | null
  accountNumberMasked?: string | null
  accountName?: string | null
  createdAt?: string | null
}

export interface PayoutSummary {
  totalGross: number
  totalNet: number
  paymentCount: number
  commissionPercent: number
  offlineGross: number
  offlineCount: number
  refundedAmount: number
  refundCount: number
  tournaments: {
    id: string
    name: string
    count: number
    gross: number
    net: number
  }[]
}

export interface DiscountCode {
  id: string
  code: string
  tournament_id: string
  type: 'PERCENT' | 'FIXED' | 'WAIVER'
  value: number
  maxUses?: number | null
  usedCount: number
  expiresAt?: string | null
  isActive: boolean
  createdById: string
  created_at: string
  updated_at: string
}

export interface DiscountValidation {
  valid: boolean
  reason?: string
  type?: 'PERCENT' | 'FIXED' | 'WAIVER'
  value?: number
  originalAmount?: number
  finalAmount?: number
}

export const usePaymentStore = defineStore('payment', () => {
  const { extractErrorMessage } = useErrors()
  const subscription = ref<Subscription | null>(null)
  const paymentHistory = ref<PaymentRecord[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const currentPlan = computed(() => subscription.value?.plan || 'FREE')
  const isActive = computed(() => subscription.value?.status === 'ACTIVE' || subscription.value?.status === 'TRIALING')
  const isPro = computed(() => currentPlan.value === 'PRO' && isActive.value)
  const isEnterprise = computed(() => currentPlan.value === 'ENTERPRISE' && isActive.value)
  const isFree = computed(() => currentPlan.value === 'FREE')
  const isCancelled = computed(() => subscription.value?.status === 'CANCELLED')
  const isPastDue = computed(() => subscription.value?.status === 'PAST_DUE')

  /**
   * Fetch the current subscription for an organization
   */
  async function fetchSubscription(orgId: string) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<Subscription>>(`/payments/subscription/${orgId}`, {
        method: 'GET',
      })
      if (response.data) {
        subscription.value = response.data
      }
      return response
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Fetch subscription failed:', error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Initialize a payment — returns a Paystack checkout URL
   */
  async function initializePayment(orgId: string, planType: string, amount: number, callbackUrl?: string, tournamentId?: string) {
    loading.value = true
    error.value = null
    try {
      const body: Record<string, any> = {
        organizationId: orgId,
        planType,
        amount,
      }
      if (callbackUrl) body.callbackUrl = callbackUrl
      if (tournamentId) body.tournamentId = tournamentId

      const response = await $api<ApiResponse<PaymentInitResponse>>('/payments/initialize', {
        method: 'POST',
        body,
      })
      return response
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Initialize payment failed:', error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Initialize a tournament registration payment.
   * Returns a Paystack checkout URL — or `{ waived: true }` when a
   * waiver/100% discount code completes registration without payment.
   */
  async function initializeRegistration(data: {
    tournamentId: string
    teamId?: string
    customName?: string
    customShortName?: string
    logoUrl?: string
    token: string
    callbackUrl: string
    discountCode?: string
  }) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<RegistrationInitResponse>>('/payments/initialize-registration', {
        method: 'POST',
        body: data,
      })
      return response
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Initialize registration payment failed:', error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Initialize a player profile claim payment
   */
  async function initializePlayerClaim(data: {
    playerId: string
    code?: string
    callbackUrl: string
  }) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<PaymentInitResponse>>('/payments/initialize-player-claim', {
        method: 'POST',
        body: data,
      })
      return response
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Initialize player claim payment failed:', error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Initialize a team join invite payment
   */
  async function initializeTeamJoin(data: {
    token: string
    name: string
    number?: number
    position?: string
    avatarUrl?: string
    callbackUrl: string
  }) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<PaymentInitResponse>>('/payments/initialize-team-join', {
        method: 'POST',
        body: data,
      })
      return response
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Initialize team join payment failed:', error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Verify a payment after Paystack redirect
   */
  async function verifyPayment(reference: string) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<PaymentVerifyResponse>>(`/payments/verify/${reference}`, {
        method: 'GET',
      })
      if (response.data?.subscription) {
        subscription.value = response.data.subscription
      }
      return response
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Verify payment failed:', error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Cancel the current subscription
   */
  async function cancelSubscription(orgId: string) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<Subscription>>(`/payments/cancel/${orgId}`, {
        method: 'POST',
      })
      if (response.data) {
        subscription.value = response.data
      }
      return response
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Cancel subscription failed:', error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  function clearSubscription() {
    subscription.value = null
    paymentHistory.value = []
    error.value = null
  }

  /**
   * List banks supported for payout settlements
   */
  async function fetchPayoutBanks() {
    try {
      const response = await $api<ApiResponse<PaystackBank[]>>('/payments/payout/banks', {
        method: 'GET',
      })
      return response.data || []
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Fetch banks failed:', error.value)
      throw err
    }
  }

  /**
   * Resolve an account number to the account holder name
   */
  async function resolvePayoutAccount(accountNumber: string, bankCode: string) {
    try {
      const response = await $api<ApiResponse<{ account_number: string; account_name: string }>>(
        '/payments/payout/resolve-account',
        {
          method: 'GET',
          query: { accountNumber, bankCode },
        },
      )
      return response.data
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Resolve account failed:', error.value)
      throw err
    }
  }

  /**
   * Get the payout account status for an organization
   */
  async function fetchPayoutAccount(orgId: string) {
    try {
      const response = await $api<ApiResponse<PayoutAccountStatus>>(`/payments/payout-account/${orgId}`, {
        method: 'GET',
      })
      return response.data || null
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Fetch payout account failed:', error.value)
      throw err
    }
  }

  /**
   * Get registration earnings summary for an organization
   */
  async function fetchPayoutSummary(orgId: string) {
    try {
      const response = await $api<ApiResponse<PayoutSummary>>(`/payments/payout-summary/${orgId}`, {
        method: 'GET',
      })
      return response.data || null
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Fetch payout summary failed:', error.value)
      throw err
    }
  }

  /**
   * Create or update the payout account for an organization
   */
  async function setupPayoutAccount(orgId: string, data: { bankCode: string; accountNumber: string; businessName?: string }) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<PayoutAccountStatus & { commissionPercent?: number }>>(`/payments/payout-account/${orgId}`, {
        method: 'POST',
        body: data,
      })
      return response
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Setup payout account failed:', error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch payment history for an organization
   */
  async function fetchPaymentHistory(orgId: string) {
    try {
      const response = await $api<ApiResponse<PaymentRecord[]>>(`/payments/history/${orgId}`, {
        method: 'GET',
      })
      if (response.data) {
        paymentHistory.value = response.data
      }
      return response
    } catch (err: any) {
      console.error('Fetch payment history failed:', extractErrorMessage(err))
      throw err
    }
  }

  /**
   * Record a registration payment collected off-platform (cash/transfer)
   */
  async function recordOfflinePayment(data: {
    tournamentId: string
    participantId?: string
    payerName?: string
    amount?: number
    method: 'CASH' | 'BANK_TRANSFER' | 'OTHER'
    note?: string
  }) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<PaymentRecord>>('/payments/offline', {
        method: 'POST',
        body: data,
      })
      return response
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Record offline payment failed:', error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Download the CSV settlement report for an organization
   */
  async function exportPaymentsCsv(orgId: string, tournamentId?: string) {
    const blob = await $api<Blob>(`/payments/export/${orgId}`, {
      method: 'GET',
      query: tournamentId ? { tournamentId } : undefined,
      responseType: 'blob',
    })
    if (import.meta.client) {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `parascores-settlements${tournamentId ? `-${tournamentId}` : ''}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    }
  }

  /**
   * Discount codes (organizer management)
   */
  async function fetchDiscountCodes(tournamentId: string) {
    const response = await $api<ApiResponse<DiscountCode[]>>(`/payments/tournaments/${tournamentId}/discount-codes`, {
      method: 'GET',
    })
    return response.data || []
  }

  async function createDiscountCode(tournamentId: string, data: {
    code: string
    type: 'PERCENT' | 'FIXED' | 'WAIVER'
    value?: number
    maxUses?: number
    expiresAt?: string
  }) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<DiscountCode>>(`/payments/tournaments/${tournamentId}/discount-codes`, {
        method: 'POST',
        body: data,
      })
      return response
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Create discount code failed:', error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateDiscountCode(id: string, data: {
    isActive?: boolean
    maxUses?: number | null
    expiresAt?: string | null
  }) {
    const response = await $api<ApiResponse<DiscountCode>>(`/payments/discount-codes/${id}`, {
      method: 'PATCH',
      body: data,
    })
    return response
  }

  async function deleteDiscountCode(id: string) {
    const response = await $api<ApiResponse<null>>(`/payments/discount-codes/${id}`, {
      method: 'DELETE',
    })
    return response
  }

  /**
   * Preview a discount code on the join page
   */
  async function validateDiscountCode(tournamentId: string, code: string) {
    const response = await $api<ApiResponse<DiscountValidation>>('/payments/discount-codes/validate', {
      method: 'POST',
      body: { tournamentId, code },
    })
    return response.data
  }

  /**
   * Refund a registration payment (OWNER only).
   * `manual: true` records the refund without calling Paystack —
   * the organizer returns the money themselves.
   */
  async function refundPayment(paymentId: string, reason?: string, manual?: boolean) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<PaymentRecord>>(`/payments/refund/${paymentId}`, {
        method: 'POST',
        body: { reason, manual },
      })
      return response
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Refund payment failed:', error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    subscription,
    paymentHistory,
    loading,
    error,
    // Getters
    currentPlan,
    isActive,
    isPro,
    isEnterprise,
    isFree,
    isCancelled,
    isPastDue,
    // Actions
    fetchSubscription,
    initializePayment,
    initializeRegistration,
    initializePlayerClaim,
    initializeTeamJoin,
    verifyPayment,
    cancelSubscription,
    clearSubscription,
    fetchPaymentHistory,
    fetchPayoutBanks,
    resolvePayoutAccount,
    fetchPayoutAccount,
    fetchPayoutSummary,
    setupPayoutAccount,
    recordOfflinePayment,
    exportPaymentsCsv,
    fetchDiscountCodes,
    createDiscountCode,
    updateDiscountCode,
    deleteDiscountCode,
    validateDiscountCode,
    refundPayment,
  }
})
