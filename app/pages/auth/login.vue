<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-12 bg-page transition-colors duration-300">
    <div class="w-full max-w-md">
      <!-- Card -->
      <UCard class="shadow-2xl" >
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
            <NuxtLink to="/forgot-password" class="text-sm text-muted hover:text-indigo-500 transition-colors">
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
            variant="green"
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
          <NuxtLink :to="{ path: '/signup', query: $route.query }" class="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
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
        // Redirect handled by auth store or middleware usually, 
        // but if not, we might want to redirect here.
        // Assuming auth store or middleware handles redirection on success or user watcher.
        // Actually earlier conversation logs mentioned redirection logic issues, 
        // but typically login simply sets user.
        // If successful, we should probably redirect to dashboard if not already handled.
        // Checking auth.ts, it doesn't redirect.
        // I will add a redirect here to be safe and helpful.
        console.log('Login successful')
        const redirect = route.query.redirect as string | undefined
        const appRedirect = route.query.appRedirect as string | undefined
        const role = response.data?.role || 'USER'

        if (appRedirect && appRedirect.startsWith('/')) {
          navigateTo(`${dashboardUrl}${appRedirect}`, { external: true })
        } else if (redirect && redirect.startsWith('/')) {
          navigateTo(redirect)
        } else {
          if (role === 'ORGANIZER') {
            navigateTo(dashboardUrl || 'http://manage.lvh.me:3001', { external: true })
          } else {
            navigateTo('/')
          }
        }
    }
  } catch (err: any) {
    console.error('Login failed:', err?.message)
    error.value = err.message || 'An unexpected error occurred'
  }
}

const handleGoogleSignup = async () => {
    await googleSignup()
}
</script>
