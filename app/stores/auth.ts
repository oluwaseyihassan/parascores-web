import { defineStore } from 'pinia'
import type { User } from '../types'


export interface ApiResponse <T>{
    message: string
    data?: T | null
    success: boolean
    timestamp: string
    error?: number
}

export const useAuthStore = defineStore('auth', () => {
  const { extractErrorMessage } = useErrors()
  const user = ref<User | null>(null)
  const error = ref<string | null>(null)
  const loading = ref(false)
  const authLoading = ref(true) // Tracks initial authentication check
  const activeOrganizationId = ref<string | null>(null)

  const isAuthenticated = computed(() => !!user.value)
  const organizations = computed(() => user.value?.organizations || [])
  const isOrganizer = computed(() => organizations.value.length > 0)
  
  const currentOrganization = computed(() => {
    if (!isOrganizer.value) return null
    
    // 1. Try to find the explicitly active one
    if (activeOrganizationId.value) {
      const active = organizations.value.find(org => org.organizationId === activeOrganizationId.value)
      if (active?.organization) return active.organization
    }

    // 2. Fallback: Prioritize OWNER or ADMIN roles, then just the first one
    const primary = organizations.value.find(org => org.role === 'OWNER' || org.role === 'ADMIN')
    const fallback = primary?.organization || organizations.value[0]?.organization || null
    
    // Side effect: If no activeOrgId set, set it to the fallback's ID
    if (!activeOrganizationId.value && fallback) {
        activeOrganizationId.value = fallback.id
    }
    
    return fallback
  })

  function setUser(newUser: User | null) {
    user.value = newUser
  }


  async function login(email: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<User>>(`/auth/login`, {
        method: 'POST',
        body: { email, password },
      })
      if (response.data) {
        setUser(response.data)
      }
      return response
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Login failed:', error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

async function signup(email: string, password: string, name: string) {
    loading.value = true
    try {
      const response = await $api<ApiResponse<User>>(`/auth/signup`, {
        method: 'POST',
        body: { email, password, name },
      })

      return response
    } catch (error) {
      // console.log('Signup failed:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function fetchUser() {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<User>>(`/auth/profile`, {
        method: 'GET',
      })
      if (response.data) {
        setUser(response.data)
        
        // Initial active organization setup
        const cookie = useCookie('active_org_id')
        if (cookie.value) {
          activeOrganizationId.value = cookie.value
        }
      }
      
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Fetch user failed:', error.value)
    } finally {
      loading.value = false
      authLoading.value = false
    }
  }

  async function googleSignup(targetRedirectUrl?: string) {
    loading.value = true
    error.value = null
    const config = useRuntimeConfig()
    
    // Default redirect to the current host origin so they return to where they signed in from
    let redirect_url = import.meta.client 
      ? window.location.origin 
      : config.public.FRONT_END_URL

    if (targetRedirectUrl) {
      if (targetRedirectUrl.startsWith('http')) {
        redirect_url = targetRedirectUrl
      } else {
        const base = import.meta.client ? window.location.origin : config.public.FRONT_END_URL
        redirect_url = base + targetRedirectUrl
      }
    }
    try {
      return navigateTo(config.public.API_BASE_URL + `/auth/google?redirect_url=${encodeURIComponent(redirect_url)}`, {
          external: true
      })
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Google signup failed:', error.value)
    } finally {
      loading.value = false
    }
  }



  async function logout() {
    loading.value = true
    try {
      await $api<ApiResponse<User>>(`/auth/logout`, {
        method: 'GET',
      })
      setUser(null)
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Logout failed:', error.value)
    } finally {
      loading.value = false
    }
  }

  async function verifyEmail(token: string) {
    loading.value = true
    try {
      const response = await $api<ApiResponse<null>>(`/auth/verify-email?token=${token}`, {
        method: 'GET',
      })
      return response
    } catch (error: any) {
      throw error
    } finally {
      loading.value = false
    }
  }

  async function resendVerificationEmail(email: string) {
    loading.value = true
    try {
      const response = await $api<ApiResponse<null>>(`/auth/resend-verification`, {
        method: 'POST',
        body: { email },
      })
      return response
    } catch (error: any) {
      console.error('Resend verification failed:', error?.message || error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function forgotPassword(email: string) {
    loading.value = true
    try {
      const response = await $api<ApiResponse<null>>(`/auth/forgot-password`, {
        method: 'POST',
        body: { email },
      })
      return response
    } catch (error: any) {
      console.error('Forgot password failed:', error?.message || error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function resetPassword(token: string, password: string) {
    loading.value = true
    try {
      const response = await $api<ApiResponse<null>>(`/auth/reset-password`, {
        method: 'POST',
        body: { token, password },
      })
      return response
    } catch (error: any) {
      console.error('Reset password failed:', error?.message || error)
      throw error
    } finally {
      loading.value = false
    }
  }

  
  const updateUser = async (updates: Partial<User>) => {
    if (!user.value?.id) return
    
    loading.value = true
    try {
      const response = await $api<ApiResponse<User>>(`/users/${user.value.id}`, {
        method: 'PATCH',
        body: updates,
      })
      if (response.data) {
        setUser(response.data)
      }
      return response
    } catch (error: any) {
      console.error('Update user failed:', error?.message || error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const upgradeToOrganizer = async (data: { organization_name: string, phone: string, organization_logo?: string }) => {
    loading.value = true
    try {
      const response = await $api<ApiResponse<User>>(`/auth/upgrade-to-organizer`, {
        method: 'POST',
        body: data,
      })
      if (response.data) {
        setUser(response.data)
      }
      return response
    } catch (error: any) {
      console.error('Upgrade to organizer failed:', error?.message || error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const setActiveOrganization = (id: string, options?: { navigate?: boolean }) => {
    activeOrganizationId.value = id
    const cookie = useCookie('active_org_id')
    cookie.value = id
    
    // Refresh tournaments for the new context
    const tournamentStore = useTournamentStore()
    tournamentStore.fetchTournaments({ limit: 50 })

    // Redirect to home dashboard — unless the caller manages workspaces in
    // place (e.g. the organizations page) and opts out
    if (options?.navigate !== false) navigateTo('/')
  }

  // Switch the active org context without refetching or navigating
  const syncActiveOrganization = (id: string) => {
    if (activeOrganizationId.value === id) return
    activeOrganizationId.value = id
    const cookie = useCookie('active_org_id')
    cookie.value = id
  }

  return {
    user,
    loading,
    error,
    authLoading,
    isAuthenticated,
    organizations,
    isOrganizer,
    currentOrganization,
    setUser,
    login,
    signup,
    googleSignup,
    logout,
    fetchUser,
    verifyEmail,
    resendVerificationEmail,
    forgotPassword,
    resetPassword,
    updateUser,
    upgradeToOrganizer,
    activeOrganizationId,
    setActiveOrganization,
    syncActiveOrganization
  }
})
