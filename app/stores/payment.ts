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

export interface PaymentVerifyResponse {
  payment: any
  subscription: Subscription
  tournament?: { id: string; isPremium: boolean }
}

export interface PaymentRecord {
  id: string
  organizationId: string
  tournamentId?: string | null
  amount: number
  currency: string
  status: 'PENDING' | 'SUCCESS' | 'FAILED'
  paystackReference: string
  plan?: string | null
  created_at: string
  tournament?: { id: string; name: string } | null
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
   * Initialize a tournament registration payment
   */
  async function initializeRegistration(data: {
    tournamentId: string
    teamId?: string
    customName?: string
    logoUrl?: string
    token: string
    callbackUrl: string
  }) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<PaymentInitResponse>>('/payments/initialize-registration', {
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
    verifyPayment,
    cancelSubscription,
    clearSubscription,
    fetchPaymentHistory,
  }
})
