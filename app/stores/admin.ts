import { defineStore } from 'pinia'
import type { ApiResponse } from './auth'

export interface AdminStats {
  usersCount: number
  tournamentsCount: number
  organizationsCount: number
  paymentsCount: number
  totalRevenue: number
}

export interface AdminUser {
  id: string
  name: string | null
  email: string
  role: string
  emailVerified: Date | null
  createdAt: string
  organizations?: any[]
  playerProfiles?: any[]
}

export interface AdminTournament {
  id: string
  name: string
  sport: string
  type: string
  status: string
  createdAt: string
  organization: {
    name: string
  }
  _count: {
    participants: number
  }
}

export interface AdminOrganization {
  id: string
  name: string
  slug: string
  verified: boolean
  createdAt: string
  _count: {
    members: number
    tournaments: number
  }
  members?: any[]
  tournaments?: any[]
}

export interface AdminPayment {
  id: string
  reference: string
  amount: number
  status: string
  type: string
  createdAt: string
  user: {
    name: string | null
    email: string
  }
}

export interface AdminPaymentSummary {
  totalRevenue: number
  byType: Record<string, number>
  monthly: Array<{ month: string; amount: number }>
}

export interface AdminPendingPlayer {
  id: string
  name: string
  status: string
  createdAt: string
  user: {
    name: string | null
    email: string
  }
  team: {
    name: string
  }
  tournament: {
    name: string
  }
}

export interface AdminHealth {
  status: 'UP' | 'DOWN'
  database: string
  uptime: number
  memory: {
    heapUsed: number
    rss: number
  }
}

export const useAdminStore = defineStore('admin', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ─── Stats ─────────────────────────────────────────────────
  async function fetchStats() {
    loading.value = true
    error.value = null
    try {
      const res = await $api<ApiResponse<any>>('/admin/stats', {
        method: 'GET',
      })
      const data = res.data
      return {
        usersCount: data?.counts?.users || 0,
        tournamentsCount: data?.counts?.tournaments || 0,
        organizationsCount: data?.counts?.organizations || 0,
        paymentsCount: data?.counts?.payments || 0,
        totalRevenue: (data?.revenue?.total || 0) / 100, // Convert from kobo/cents
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch stats'
      throw err
    } finally {
      loading.value = false
    }
  }

  // ─── Users ─────────────────────────────────────────────────
  async function fetchUsers(params: { page?: number; limit?: number; search?: string; role?: string } = {}) {
    loading.value = true
    error.value = null
    try {
      const query = new URLSearchParams()
      if (params.page) query.append('page', params.page.toString())
      if (params.limit) query.append('limit', params.limit.toString())
      if (params.search) query.append('search', params.search)
      if (params.role) query.append('role', params.role)

      const res = await $api<any>(
        `/admin/users?${query.toString()}`,
        { method: 'GET' }
      )
      return {
        items: res.data || [],
        total: res.pagination?.total || 0,
        pages: res.pagination?.totalPages || 0
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch users'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchUser(id: string) {
    loading.value = true
    error.value = null
    try {
      const res = await $api<ApiResponse<any>>(`/admin/users/${id}`, {
        method: 'GET',
      })
      const data = res.data
      if (data && data.payments) {
        data.payments = data.payments.map((p: any) => ({
          ...p,
          amount: p.amount / 100
        }))
      }
      return data
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch user'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteUser(id: string) {
    loading.value = true
    error.value = null
    try {
      const res = await $api<ApiResponse<any>>(`/admin/users/${id}`, {
        method: 'DELETE',
      })
      return res
    } catch (err: any) {
      error.value = err.message || 'Failed to delete user'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateUserRole(id: string, role: string) {
    loading.value = true
    error.value = null
    try {
      const res = await $api<ApiResponse<AdminUser>>(`/admin/users/${id}/role`, {
        method: 'PATCH',
        body: { role },
      })
      return res.data
    } catch (err: any) {
      error.value = err.message || 'Failed to update user role'
      throw err
    } finally {
      loading.value = false
    }
  }

  // ─── Tournaments ───────────────────────────────────────────
  async function fetchTournaments(params: { page?: number; limit?: number; search?: string; sport?: string; isPremium?: string } = {}) {
    loading.value = true
    error.value = null
    try {
      const query = new URLSearchParams()
      if (params.page) query.append('page', params.page.toString())
      if (params.limit) query.append('limit', params.limit.toString())
      if (params.search) query.append('search', params.search)
      if (params.sport) query.append('sport', params.sport)
      if (params.isPremium !== undefined) query.append('isPremium', params.isPremium)

      const res = await $api<any>(
        `/admin/tournaments?${query.toString()}`,
        { method: 'GET' }
      )
      return {
        items: res.data || [],
        total: res.pagination?.total || 0,
        pages: res.pagination?.totalPages || 0
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch tournaments'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchTournament(id: string) {
    loading.value = true
    error.value = null
    try {
      const res = await $api<ApiResponse<any>>(`/admin/tournaments/${id}`, {
        method: 'GET',
      })
      const data = res.data
      if (data && data.payments) {
        data.payments = data.payments.map((p: any) => ({
          ...p,
          amount: p.amount / 100
        }))
      }
      if (data) {
        data.tournamentPrice = data.tournamentPrice ? data.tournamentPrice / 100 : 0
        data.paymentPerTeam = data.paymentPerTeam ? data.paymentPerTeam / 100 : 0
        data.registrationFee = data.registrationFee ? data.registrationFee / 100 : 0
      }
      return data
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch tournament'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteTournament(id: string) {
    loading.value = true
    error.value = null
    try {
      const res = await $api<ApiResponse<any>>(`/admin/tournaments/${id}`, {
        method: 'DELETE',
      })
      return res
    } catch (err: any) {
      error.value = err.message || 'Failed to delete tournament'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateTournament(
    id: string,
    data: {
      name?: string
      customName?: string | null
      description?: string | null
      visibility?: 'PUBLIC' | 'PRIVATE' | 'UNLISTED'
      isPremium?: boolean
      isPinned?: boolean
      isPaidRegistration?: boolean
      registrationFee?: number
      tournamentPrice?: number
      paymentPerTeam?: number
      startDate?: string
      endDate?: string
      location?: string | null
      timezone?: string
      maxParticipants?: number | null
      sport?: string
      type?: 'LEAGUE' | 'KNOCKOUT' | 'ROUND_ROBIN' | 'GROUP' | 'HYBRID' | 'FRIENDLY'
      autoApprove?: boolean
      thirdPlaceMatch?: boolean
      twoLegsKnockout?: boolean
      doubleRoundRobin?: boolean
    }
  ) {
    loading.value = true
    error.value = null
    try {
      const payload: any = { ...data }
      if (payload.registrationFee !== undefined) {
        payload.registrationFee = Math.round(payload.registrationFee * 100)
      }
      if (payload.tournamentPrice !== undefined) {
        payload.tournamentPrice = Math.round(payload.tournamentPrice * 100)
      }
      if (payload.paymentPerTeam !== undefined) {
        payload.paymentPerTeam = Math.round(payload.paymentPerTeam * 100)
      }
      const res = await $api<ApiResponse<any>>(`/admin/tournaments/${id}`, {
        method: 'PATCH',
        body: payload,
      })
      return res.data
    } catch (err: any) {
      error.value = err.message || 'Failed to update tournament'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateTournamentPricing(id: string, data: { tournamentPrice?: number | null; paymentPerTeam?: number | null }) {
    loading.value = true
    error.value = null
    try {
      const body: any = {}
      if (data.tournamentPrice !== undefined) {
        body.tournamentPrice = data.tournamentPrice !== null ? Math.round(data.tournamentPrice * 100) : null
      }
      if (data.paymentPerTeam !== undefined) {
        body.paymentPerTeam = data.paymentPerTeam !== null ? Math.round(data.paymentPerTeam * 100) : null
      }
      const res = await $api<ApiResponse<any>>(`/admin/tournaments/${id}/pricing`, {
        method: 'PATCH',
        body,
      })
      return res.data
    } catch (err: any) {
      error.value = err.message || 'Failed to update tournament pricing'
      throw err
    } finally {
      loading.value = false
    }
  }

  // ─── Organizations ─────────────────────────────────────────
  async function fetchOrganizations(params: { page?: number; limit?: number; search?: string } = {}) {
    loading.value = true
    error.value = null
    try {
      const query = new URLSearchParams()
      if (params.page) query.append('page', params.page.toString())
      if (params.limit) query.append('limit', params.limit.toString())
      if (params.search) query.append('search', params.search)

      const res = await $api<any>(
        `/admin/organizations?${query.toString()}`,
        { method: 'GET' }
      )
      return {
        items: res.data || [],
        total: res.pagination?.total || 0,
        pages: res.pagination?.totalPages || 0
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch organizations'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchOrganization(id: string) {
    loading.value = true
    error.value = null
    try {
      const res = await $api<ApiResponse<any>>(`/admin/organizations/${id}`, {
        method: 'GET',
      })
      const data = res.data
      if (data && data.payments) {
        data.payments = data.payments.map((p: any) => ({
          ...p,
          amount: p.amount / 100
        }))
      }
      return data
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch organization'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateOrganizationVerification(id: string, isVerified: boolean) {
    loading.value = true
    error.value = null
    try {
      const res = await $api<ApiResponse<any>>(`/admin/organizations/${id}/verify`, {
        method: 'PATCH',
        body: { isVerified }
      })
      return res.data
    } catch (err: any) {
      error.value = err.message || 'Failed to update organization verification'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateOrganizationSubscription(
    id: string,
    data: { plan?: string; status?: string; currentPeriodEnd?: string }
  ) {
    loading.value = true
    error.value = null
    try {
      const res = await $api<ApiResponse<any>>(`/admin/organizations/${id}/subscription`, {
        method: 'PATCH',
        body: data
      })
      return res.data
    } catch (err: any) {
      error.value = err.message || 'Failed to update organization subscription'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateOrganizationEventHub(
    id: string,
    data: { subdomain?: string | null; brandConfig?: Record<string, any> }
  ) {
    loading.value = true
    error.value = null
    try {
      const res = await $api<ApiResponse<any>>(`/admin/organizations/${id}/event-hub`, {
        method: 'PATCH',
        body: data
      })
      return res.data
    } catch (err: any) {
      error.value = err.message || 'Failed to update event hub'
      throw err
    } finally {
      loading.value = false
    }
  }

  // ─── Payments ──────────────────────────────────────────────
  async function fetchPayments(params: { page?: number; limit?: number; status?: string; type?: string } = {}) {
    loading.value = true
    error.value = null
    try {
      const query = new URLSearchParams()
      if (params.page) query.append('page', params.page.toString())
      if (params.limit) query.append('limit', params.limit.toString())
      if (params.status) query.append('status', params.status)
      if (params.type) query.append('type', params.type)

      const res = await $api<any>(
        `/admin/payments?${query.toString()}`,
        { method: 'GET' }
      )
      return {
        items: (res.data || []).map((p: any) => ({
          ...p,
          amount: p.amount / 100
        })),
        total: res.pagination?.total || 0,
        pages: res.pagination?.totalPages || 0
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch payments'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchPaymentsSummary() {
    loading.value = true
    error.value = null
    try {
      const res = await $api<ApiResponse<any>>('/admin/payments/summary', {
        method: 'GET',
      })
      const data = res.data
      if (data) {
        if (data.total) data.total.amount = (data.total.amount || 0) / 100
        if (data.thisMonth) data.thisMonth.amount = (data.thisMonth.amount || 0) / 100
        if (data.byType) {
          data.byType = data.byType.map((t: any) => ({
            ...t,
            amount: (t.amount || 0) / 100
          }))
        }
      }
      return data
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch payments summary'
      throw err
    } finally {
      loading.value = false
    }
  }

  // ─── Players ───────────────────────────────────────────────
  async function fetchPendingPlayers(params: { page?: number; limit?: number } = {}) {
    loading.value = true
    error.value = null
    try {
      const query = new URLSearchParams()
      if (params.page) query.append('page', params.page.toString())
      if (params.limit) query.append('limit', params.limit.toString())

      const res = await $api<any>(
        `/admin/players/pending?${query.toString()}`,
        { method: 'GET' }
      )
      return {
        items: res.data || [],
        total: res.pagination?.total || 0,
        pages: res.pagination?.totalPages || 0
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch pending players'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updatePlayerStatus(id: string, status: 'APPROVED' | 'REJECTED') {
    loading.value = true
    error.value = null
    try {
      const res = await $api<ApiResponse<any>>(`/admin/players/${id}/status`, {
        method: 'PATCH',
        body: { status },
      })
      return res.data
    } catch (err: any) {
      error.value = err.message || 'Failed to update player status'
      throw err
    } finally {
      loading.value = false
    }
  }

  // ─── Health ────────────────────────────────────────────────
  async function fetchHealth() {
    loading.value = true
    error.value = null
    try {
      const res = await $api<ApiResponse<AdminHealth>>('/admin/health', {
        method: 'GET',
      })
      return res.data
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch health'
      throw err
    } finally {
      loading.value = false
    }
  }

  // ─── Audit Logs ────────────────────────────────────────────
  async function fetchAuditLogs(params: {
    page?: number
    limit?: number
    action?: string
    entityType?: string
    entityId?: string
    actorId?: string
  } = {}) {
    loading.value = true
    error.value = null
    try {
      const query = new URLSearchParams()
      if (params.page) query.append('page', params.page.toString())
      if (params.limit) query.append('limit', params.limit.toString())
      if (params.action) query.append('action', params.action)
      if (params.entityType) query.append('entityType', params.entityType)
      if (params.entityId) query.append('entityId', params.entityId)
      if (params.actorId) query.append('actorId', params.actorId)

      const res = await $api<any>(
        `/admin/audit-logs?${query.toString()}`,
        { method: 'GET' }
      )
      return {
        items: res.data || [],
        total: res.pagination?.total || 0,
        pages: res.pagination?.totalPages || 0
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch audit logs'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchRecentAuditLogs(limit: number = 10) {
    loading.value = true
    error.value = null
    try {
      const res = await $api<any>(
        `/admin/audit-logs/recent?limit=${limit}`,
        { method: 'GET' }
      )
      return res.data || []
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch recent audit logs'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    fetchStats,
    fetchUsers,
    fetchUser,
    deleteUser,
    updateUserRole,
    fetchTournaments,
    fetchTournament,
    deleteTournament,
    updateTournament,
    updateTournamentPricing,
    fetchOrganizations,
    fetchOrganization,
    updateOrganizationVerification,
    updateOrganizationSubscription,
    updateOrganizationEventHub,
    fetchPayments,
    fetchPaymentsSummary,
    fetchPendingPlayers,
    updatePlayerStatus,
    fetchHealth,
    fetchAuditLogs,
    fetchRecentAuditLogs,
  }
})
