<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-12 bg-page transition-colors duration-300">
    <div class="w-full max-w-md">
      <!-- Card -->
      <UCard class="shadow-2xl">
        <!-- Success State - Check Your Email -->
        <template v-if="emailSent">
          <!-- Logo -->
          <div class="flex justify-center mb-2">
            <div class="w-14 h-14 bg-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
              <Icon name="heroicons:envelope-solid" class="w-8 h-8 text-white" />
            </div>
          </div>

          <div class="text-center py-4">
            <h1 class="text-2xl font-bold text-heading mb-2">Check Your Email</h1>
            <p class="text-muted text-sm mb-2">
              We've sent a password reset link to:
            </p>
            <p class="text-body font-medium mb-6">{{ submittedEmail }}</p>
            
            <UAlert
              icon="i-heroicons-information-circle"
              color="info"
              variant="subtle"
              title="Click the link in the email to reset your password"
              class="mb-6 text-left"
            />

            <!-- Resend Success Alert -->
            <UAlert
              v-if="resendSuccess"
              icon="i-heroicons-check-circle"
              color="success"
              variant="subtle"
              title="Reset email sent!"
              class="mb-6"
            />

            <!-- Resend Error Alert -->
            <UAlert
              v-if="resendError"
              icon="i-heroicons-exclamation-triangle"
              color="error"
              variant="subtle"
              :title="resendError"
              class="mb-6"
            />

            <div class="space-y-3">
              <UButton
                variant="green"
                size="lg"
                block
                :loading="resending"
                :disabled="resendCooldown > 0"
                @click="handleResendEmail"
              >
                <template v-if="resendCooldown > 0">
                  Resend in {{ resendCooldown }}s
                </template>
                <template v-else>
                  Resend Reset Email
                </template>
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

            <p class="text-center text-muted text-sm mt-6">
              Wrong email?
              <button 
                type="button"
                class="text-green-500 hover:text-green-600 dark:hover:text-green-400 font-medium transition-colors"
                @click="resetForm"
              >
                Try again
              </button>
            </p>
          </div>
        </template>

        <!-- Forgot Password Form -->
        <template v-else>
          <!-- Logo -->
          <div class="flex justify-center mb-2">
            <div class="w-14 h-14 bg-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-white">
                <rect x="2" y="6" width="20" height="12" rx="3" stroke="currentColor" stroke-width="2"/>
                <circle cx="8" cy="12" r="2" fill="currentColor"/>
                <circle cx="16" cy="12" r="2" fill="currentColor"/>
                <path d="M12 9V15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
          </div>

          <!-- Header -->
          <div class="text-center mb-8">
            <h1 class="text-2xl font-bold text-heading mb-2">Forgot Password?</h1>
            <p class="text-muted text-sm">Enter your email and we'll send you a reset link</p>
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
            @submit="handleForgotPassword"
          >
            <!-- Email -->
            <UFormField name="email" label="Email">
              <UInput
                v-model="state.email"
                type="email"
                placeholder="you@example.com"
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
              Send Reset Link
            </UButton>
          </UForm>

          <!-- Back to Login Link -->
          <p class="text-center text-muted text-sm mt-6">
            Remember your password?
            <NuxtLink to="/login" class="text-green-500 hover:text-green-600 dark:hover:text-green-400 font-medium transition-colors">
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
  path: '/forgot-password',
  layout: 'auth',
})

const authStore = useAuthStore()
const { loading } = storeToRefs(authStore)
const { forgotPassword } = authStore

const schema = z.object({
  email: z.string().email('Invalid email address')
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  email: undefined
})

const error = ref('')
const emailSent = ref(false)
const submittedEmail = ref('')

// Resend state
const resending = ref(false)
const resendSuccess = ref(false)
const resendError = ref('')
const resendCooldown = ref(0)
let cooldownInterval: ReturnType<typeof setInterval> | null = null

const handleForgotPassword = async (event: FormSubmitEvent<Schema>) => {
  error.value = ''
  
  try {
    const { email } = event.data
    const response = await forgotPassword(email)
    if (response?.success) {
      submittedEmail.value = email
      emailSent.value = true
      startCooldown()
    } else {
      error.value = response?.message || 'Failed to send reset email'
    }
  } catch (err: any) {
    console.error('Forgot password failed:', err?.message)
    error.value = err?.data?.message || err?.message || 'An unexpected error occurred'
  }
}

const handleResendEmail = async () => {
  if (resendCooldown.value > 0 || !submittedEmail.value) return
  
  resending.value = true
  resendSuccess.value = false
  resendError.value = ''
  
  try {
    const response = await forgotPassword(submittedEmail.value)
    if (response?.success) {
      resendSuccess.value = true
      startCooldown()
    } else {
      resendError.value = response?.message || 'Failed to send reset email'
    }
  } catch (err: any) {
    resendError.value = err?.data?.message || err?.message || 'Failed to send reset email'
  } finally {
    resending.value = false
  }
}

const startCooldown = () => {
  resendCooldown.value = 60
  if (cooldownInterval) clearInterval(cooldownInterval)
  cooldownInterval = setInterval(() => {
    resendCooldown.value--
    if (resendCooldown.value <= 0) {
      if (cooldownInterval) clearInterval(cooldownInterval)
    }
  }, 1000)
}

const resetForm = () => {
  emailSent.value = false
  submittedEmail.value = ''
  resendSuccess.value = false
  resendError.value = ''
  resendCooldown.value = 0
  if (cooldownInterval) clearInterval(cooldownInterval)
  state.email = undefined
}

onUnmounted(() => {
  if (cooldownInterval) clearInterval(cooldownInterval)
})
</script>
