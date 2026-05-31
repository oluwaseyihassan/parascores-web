<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-12 bg-page transition-colors duration-300">
    <div class="w-full max-w-md">
      <!-- Card -->
      <UCard class="shadow-2xl">
        <!-- Success State - Check Your Email -->
        <template v-if="signupSuccess">
          <!-- Logo -->
          <div class="flex justify-center mb-2">
            <div class="w-14 h-14 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Icon name="heroicons:envelope-solid" class="w-8 h-8 text-white" />
            </div>
          </div>

          <div class="text-center py-4">
            <h1 class="text-2xl font-bold text-heading mb-2">Check Your Email</h1>
            <p class="text-muted text-sm mb-2">
              We've sent a verification link to:
            </p>
            <p class="text-body font-medium mb-6">{{ registeredEmail }}</p>
            
            <UAlert
              icon="i-heroicons-information-circle"
              color="info"
              variant="subtle"
              title="Click the link in the email to verify your account"
              class="mb-6 text-left"
            />

            <!-- Resend Success Alert -->
            <UAlert
              v-if="resendSuccess"
              icon="i-heroicons-check-circle"
              color="success"
              variant="subtle"
              title="Verification email sent!"
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
                color="primary"
                variant="solid"
                size="lg"
                block
                :loading="resending"
                :disabled="resendCooldown > 0"
                @click="handleResendVerification"
              >
                <template v-if="resendCooldown > 0">
                  Resend in {{ resendCooldown }}s
                </template>
                <template v-else>
                  Resend Verification Email
                </template>
              </UButton>

              <UButton
                variant="outline"
                color="neutral"
                size="lg"
                block
                @click="navigateTo({ path: '/login', query: $route.query })"
              >
                Go to Login
              </UButton>
            </div>

            <p class="text-center text-muted text-sm mt-6">
              Wrong email?
              <button 
                type="button"
                class="text-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors"
                @click="resetForm"
              >
                Sign up again
              </button>
            </p>
          </div>
        </template>

        <!-- Signup Form -->
        <template v-else>
          <!-- Logo -->
          <div class="flex justify-center mb-2">
            <div class="w-14 h-14 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
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
            <h1 class="text-2xl font-bold text-heading mb-2">Create Account</h1>
            <p class="text-muted text-sm">Start managing tournaments like a pro</p>
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
            @submit="handleSignup"
          >
            <!-- Name -->
            <UFormField name="name" label="Full Name" required>
              <UInput
                v-model="state.name"
                type="text"
                placeholder="John Doe"
                size="lg"
                class="w-full"
                input-class="bg-surface"
                :disabled="combinedLoading"
              />
            </UFormField>

            <!-- Email -->
            <UFormField name="email" label="Email" required>
              <UInput
                v-model="state.email"
                type="email"
                placeholder="you@example.com"
                size="lg"
                class="w-full"
                input-class="bg-surface"
                :disabled="combinedLoading"
              />
            </UFormField>

            <!-- Password -->
            <UFormField name="password" label="Password" required>
              <UInput
                v-model="state.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••"
                size="lg"
                class="w-full"
                input-class="bg-surface"
                :disabled="combinedLoading"
              >
                <template #trailing>
                  <button
                    type="button"
                    tabindex="-1"
                    class="text-muted hover:text-heading transition-colors focus:outline-none"
                    @click="showPassword = !showPassword"
                  >
                    <UIcon :name="showPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'" class="w-5 h-5" />
                  </button>
                </template>
              </UInput>
              <p class="text-xs text-muted mt-2">Must be at least 8 characters</p>
            </UFormField>

            <!-- Terms -->
            <UFormField name="acceptTerms">
              <div class="flex items-start gap-3">
                <UCheckbox 
                  v-model="state.acceptTerms"
                  :disabled="combinedLoading"
                />
                <label class="text-sm text-body">
                  I agree to the 
                  <NuxtLink to="/terms" class="text-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400">Terms of Service</NuxtLink>
                  and
                  <NuxtLink to="/privacy" class="text-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400">Privacy Policy</NuxtLink>
                </label>
              </div>
            </UFormField>

            <!-- Submit Button -->
            <UButton
              type="submit"
              color="primary"
              variant="solid"
              size="lg"
              block
              :loading="loading"
              :disabled="combinedLoading"
              class="font-semibold py-3"
            >
              Create Account
            </UButton>
          </UForm>

          <!-- Divider -->
          <div class="flex items-center gap-4 my-6">
            <div class="flex-1 h-px bg-gray-200 dark:bg-white/[0.08]"></div>
            <span class="text-xs text-muted uppercase">or continue with</span>
            <div class="flex-1 h-px bg-gray-200 dark:bg-white/[0.08]"></div>
          </div>

          <!-- Social Login -->
          <UButton
            variant="outline"
            color="neutral"
            size="lg"
            block
            :loading="googleLoading"
            :disabled="combinedLoading"
            @click="handleGoogleSignup"
            type="button"
          >
            <template #leading>
              <Icon name="logos:google-icon" class="w-5 h-5" />
            </template>
            Continue with Google
          </UButton>

          <!-- Login Link -->
          <p class="text-center text-muted text-sm mt-6">
            Already have an account?
            <NuxtLink :to="{ path: '/login', query: $route.query }" class="text-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors">
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
  path: '/signup',
  layout: 'auth',
})

const authStore = useAuthStore()
const { loading } = storeToRefs(authStore)
const googleLoading = ref(false)
const combinedLoading = computed(() => loading.value || googleLoading.value)
const { signup, googleSignup, resendVerificationEmail } = authStore
const { extractErrorMessage, handleError } = useErrors()
const route = useRoute()
const dashboardUrl = useRuntimeConfig().public.DASHBOARD_URL

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  acceptTerms: z.boolean().refine((value) => value === true, { message: 'You must accept the terms' })
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  name: undefined,
  email: undefined,
  password: undefined,
  acceptTerms: false
})

const error = ref('')
const showPassword = ref(false)
const signupSuccess = ref(false)
const registeredEmail = ref('')

// Resend verification state
const resending = ref(false)
const resendSuccess = ref(false)
const resendError = ref('')
const resendCooldown = ref(0)
let cooldownInterval: ReturnType<typeof setInterval> | null = null

const handleSignup = async (event: FormSubmitEvent<Schema>) => {
  error.value = ''
  
  try {
    const { name, email, password } = event.data
    const response = await signup(email, password, name)
    if (response?.success) {
      registeredEmail.value = email
      signupSuccess.value = true
    }
    if (!response?.success) {
      error.value = response?.message || 'Signup failed'
    }
  } catch (err: any) {
    error.value = extractErrorMessage(err)
    handleError(err, { toast: false, title: 'Signup failed' })
  }
}

const handleResendVerification = async () => {
  if (resendCooldown.value > 0 || !registeredEmail.value) return
  
  resending.value = true
  resendSuccess.value = false
  resendError.value = ''
  
  try {
    const response = await resendVerificationEmail(registeredEmail.value)
    if (response?.success) {
      resendSuccess.value = true
      startCooldown()
    } else {
      resendError.value = response?.message || 'Failed to resend verification email'
    }
  } catch (err: any) {
    resendError.value = extractErrorMessage(err)
    handleError(err, { toast: false, title: 'Resend verification failed' })
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
  signupSuccess.value = false
  registeredEmail.value = ''
  resendSuccess.value = false
  resendError.value = ''
  resendCooldown.value = 0
  if (cooldownInterval) clearInterval(cooldownInterval)
  state.name = undefined
  state.email = undefined
  state.password = undefined
  state.acceptTerms = false
}

const handleGoogleSignup = async () => {
  googleLoading.value = true
  try {
    const appRedirect = route.query.appRedirect as string | undefined
    const redirect = route.query.redirect as string | undefined
    
    let targetRedirect: string | undefined = undefined
    if (appRedirect) {
      targetRedirect = `${dashboardUrl}${appRedirect}`
    } else if (redirect) {
      targetRedirect = redirect
    }

    await googleSignup(targetRedirect)
  } catch (err) {
    googleLoading.value = false
  }
}

onUnmounted(() => {
  if (cooldownInterval) clearInterval(cooldownInterval)
})
</script>

