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
  const user = ref<User | null>(null)
  const loading = ref(false)
  const authLoading = ref(true) // Tracks initial authentication check

  const isAuthenticated = computed(() => !!user.value)

  function setUser(newUser: User | null) {
    user.value = newUser
  }


  async function login(email: string, password: string) {
    loading.value = true
    try {
      const response = await $api<ApiResponse<User>>(`/auth/login`, {
        method: 'POST',
        body: { email, password },
      })
      if (response.data) {
        setUser(response.data)
      }
      return response
    } catch (error: any) {
      console.error('Login failed:', error?.message || error)
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
    try {
      const response = await $api<ApiResponse<User>>(`/auth/profile`, {
        method: 'GET',
      })
      if (response.data) {
        setUser(response.data)
      }
      
    } catch (error: any) {
      console.error('Fetch user failed:', error?.message || 'Unknown error')
    } finally {
      loading.value = false
      authLoading.value = false
    }
  }

  async function googleSignup() {
    loading.value = true
    const config = useRuntimeConfig()
    const redirect_url = config.public.DASHBOARD_URL
    try {
      return navigateTo(config.public.API_BASE_URL + `/auth/google?redirect_url=${redirect_url}`, {
          external: true
      })
    } catch (error: any) {
      console.error('Google signup failed:', error?.message || error)
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
    } catch (error: any) {
      console.error('Logout failed:', error?.message || error)
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

  
  async function updateUser(updates: Partial<User>) {
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

  return {
    user,
    loading,
    authLoading,
    isAuthenticated,
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
    updateUser
  }
})
