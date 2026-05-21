<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-12 bg-page transition-colors duration-300">
    <div class="w-full max-w-md">
      <!-- Card -->
      <UCard class="shadow-2xl" >
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
          <h1 class="text-2xl font-bold text-heading mb-2">Welcome Back</h1>
          <p class="text-muted text-sm">Sign in to manage your tournaments</p>
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
          @submit="handleLogin"
        >
          <!-- Email -->
          <UFormField name="email" label="Email">
            <UInput
              v-model="state.email"
              type="email"
              placeholder="admin@parascores.com"
              size="lg"
              class="w-full"
              input-class="bg-surface"
              :disabled="loading"
            />
          </UFormField>

          <!-- Password -->
          <UFormField name="password" label="Password">
            <UInput
              v-model="state.password"
              type="password"
              placeholder="••••••••"
              size="lg"
              class="w-full"
              :disabled="loading"
            />
          </UFormField>

          <!-- Forgot Password -->
          <div class="flex justify-end">
            <NuxtLink to="/forgot-password" class="text-sm text-muted hover:text-emerald-500 transition-colors">
              Forgot password?
            </NuxtLink>
          </div>

          <!-- Submit Button -->
          <UButton
            type="submit"
            size="lg"
            block
            :loading="loading"
            class="font-semibold py-3"
            color="primary"
            variant="solid"
          >
            Login
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
          type="button"
          variant="outline"
          color="neutral"
          size="lg"
          block
          :disabled="loading"
          @click="handleGoogleSignup"
        >
          <template #leading>
            <Icon name="logos:google-icon" class="w-5 h-5" />
          </template>
          Continue with Google
        </UButton>

        <!-- Sign Up Link -->
        <p class="text-center text-gray-400 text-sm mt-6">
          Don't have an account?
          <NuxtLink :to="{ path: '/signup', query: $route.query }" class="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
            Sign up
          </NuxtLink>
        </p>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'

definePageMeta({
  path: '/login',
  layout: 'auth',
})
const dashboardUrl = useRuntimeConfig().public.DASHBOARD_URL
const route = useRoute()

const authStore = useAuthStore()
const { loading } = storeToRefs(authStore)
const { login, googleSignup } = authStore
const { extractErrorMessage, handleError } = useErrors()

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  email: undefined,
  password: undefined
})

const error = ref('')

const handleLogin = async (event: FormSubmitEvent<Schema>) => {
  error.value = ''
  
  try {
    const { email, password } = event.data
    const response = await login(email, password)
    console.log(response)
    if (!response?.success) {
      error.value = response?.message || 'Login failed'
    } else {
        // Redirect logic...
        console.log('Login successful')
        const appRedirect = route.query.appRedirect as string | undefined
        const redirect = route.query.redirect as string | undefined
        const router = useRouter()

        if (appRedirect && appRedirect.startsWith('/')) {
          // appRedirect comes from the manage.* subdomain — redirect back there
          window.location.href = `${dashboardUrl}${appRedirect}`
        } else if (redirect && redirect.startsWith('/')) {
          router.push(redirect)
        } else {
          router.push('/')
        }
    }
  } catch (err: any) {
    error.value = extractErrorMessage(err)
    handleError(err, { toast: false, title: 'Login failed' })
  }
}

const handleGoogleSignup = async () => {
    await googleSignup()
}
</script>
