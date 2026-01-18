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
      console.log(response)
      if (response.data) {
        setUser(response.data)
      }
      return response
    } catch (error) {
      console.log('Login failed:', error)
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
      console.log('Signup failed:', error)
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
      console.log(response)
      if (response.data) {
        setUser(response.data)
      }
      
    } catch (error) {
      console.log('Fetch user failed:', error)
    } finally {
      loading.value = false
    }
  }

  async function googleSignup() {
    loading.value = true
    const config = useRuntimeConfig()
    return navigateTo(config.public.API_BASE_URL + '/auth/google', {
        external: true
    })
  }



  async function logout() {
    loading.value = true
    try {
      await $api<ApiResponse<User>>(`/auth/logout`, {
        method: 'GET',
      })
      setUser(null)
    } catch (error) {
      console.log('Logout failed:', error)
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
      console.log('Resend verification failed:', error)
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
      console.log('Forgot password failed:', error)
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
      console.log('Reset password failed:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    loading,
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
    resetPassword
  }
})
