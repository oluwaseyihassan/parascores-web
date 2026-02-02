<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-12 bg-page transition-colors duration-300">
    <div class="w-full max-w-md">
      <!-- Card -->
      <UCard class="shadow-2xl">
        <!-- Logo -->
        <div class="flex justify-center mb-2">
          <div class="w-14 h-14 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-white">
              <rect x="2" y="6" width="20" height="12" rx="3" stroke="currentColor" stroke-width="2"/>
              <circle cx="8" cy="12" r="2" fill="currentColor"/>
              <circle cx="16" cy="12" r="2" fill="currentColor"/>
              <path d="M12 9V15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading && !hasToken" class="text-center py-8">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-4">
            <Icon name="svg-spinners:ring-resize" class="w-8 h-8 text-indigo-600" />
          </div>
          <h1 class="text-2xl font-bold text-heading mb-2">Validating...</h1>
          <p class="text-muted text-sm">Please wait while we verify your reset link.</p>
        </div>

        <!-- Success State -->
        <div v-else-if="resetSuccess" class="text-center py-8">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-4">
            <Icon name="heroicons:check-circle-solid" class="w-10 h-10 text-indigo-600" />
          </div>
          <h1 class="text-2xl font-bold text-heading mb-2">Password Reset!</h1>
          <p class="text-muted text-sm mb-6">Your password has been successfully reset. You can now sign in with your new password.</p>
          
          <UButton
            variant="green"
            size="lg"
            block
            @click="navigateTo('/login')"
          >
            Go to Login
          </UButton>
        </div>

        <!-- No Token State -->
        <div v-else-if="!hasToken" class="text-center py-8">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 mb-4">
            <Icon name="heroicons:exclamation-triangle-solid" class="w-10 h-10 text-yellow-500" />
          </div>
          <h1 class="text-2xl font-bold text-heading mb-2">Invalid Link</h1>
          <p class="text-muted text-sm mb-6">This password reset link is invalid or has expired.</p>
          
          <div class="space-y-3">
            <UButton
              variant="green"
              size="lg"
              block
              @click="navigateTo('/forgot-password')"
            >
              Request New Reset Link
            </UButton>
            <UButton
              variant="outline"
              color="neutral"
              size="lg"
              block
              @click="navigateTo('/login')"
            >
              Back to Login
            </UButton>
          </div>
        </div>

        <!-- Reset Password Form -->
        <template v-else>
          <!-- Header -->
          <div class="text-center mb-8">
            <h1 class="text-2xl font-bold text-heading mb-2">Reset Password</h1>
            <p class="text-muted text-sm">Enter your new password below</p>
          </div>

          <!-- Error Alert -->
          <UAlert
            v-if="error"
            icon="i-heroicons-exclamation-triangle"
            color="error"
            variant="subtle"
            :title="error"
            class="mb-6"
          />

          <!-- Form -->
          <UForm 
            :schema="schema" 
            :state="state" 
            class="space-y-5" 
            @submit="handleResetPassword"
          >
            <!-- New Password -->
            <UFormField name="password" label="New Password">
              <UInput
                v-model="state.password"
                type="password"
                placeholder="••••••••"
                size="lg"
                class="w-full"
                input-class="bg-surface"
                :disabled="loading"
              />
              <p class="text-xs text-muted mt-2">Must be at least 8 characters</p>
            </UFormField>

            <!-- Confirm Password -->
            <UFormField name="confirmPassword" label="Confirm Password">
              <UInput
                v-model="state.confirmPassword"
                type="password"
                placeholder="••••••••"
                size="lg"
                class="w-full"
                input-class="bg-surface"
                :disabled="loading"
              />
            </UFormField>

            <!-- Submit Button -->
            <UButton
              type="submit"
              size="lg"
              block
              :loading="loading"
              class="font-semibold py-3"
              variant="green"
            >
              Reset Password
            </UButton>
          </UForm>

          <!-- Back to Login Link -->
          <p class="text-center text-muted text-sm mt-6">
            Remember your password?
            <NuxtLink to="/login" class="text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors">
              Sign in
            </NuxtLink>
          </p>
        </template>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'

definePageMeta({
  path: '/reset-password',
  layout: 'auth',
})

const route = useRoute()
const authStore = useAuthStore()
const { loading } = storeToRefs(authStore)
const { resetPassword } = authStore

const token = computed(() => route.query.token as string | undefined)
const hasToken = computed(() => !!token.value)

const schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password')
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  password: undefined,
  confirmPassword: undefined
})

const error = ref('')
const resetSuccess = ref(false)

const handleResetPassword = async (event: FormSubmitEvent<Schema>) => {
  error.value = ''
  
  if (!token.value) {
    error.value = 'Invalid reset token'
    return
  }
  
  try {
    const { password } = event.data
    const response = await resetPassword(token.value, password)
    if (response?.success) {
      resetSuccess.value = true
    } else {
      error.value = response?.message || 'Failed to reset password'
    }
  } catch (err: any) {
    console.error('Reset password failed:', err?.message)
    error.value = err?.data?.message || err?.message || 'An unexpected error occurred. The link may have expired.'
  }
}
</script>
