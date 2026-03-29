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
        <div v-if="loading" class="text-center py-8">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-4">
            <Icon name="svg-spinners:ring-resize" class="w-8 h-8 text-indigo-600" />
          </div>
          <h1 class="text-2xl font-bold text-heading mb-2">Verifying Email...</h1>
          <p class="text-muted text-sm">Please wait while we verify your email address.</p>
        </div>

        <!-- Success State -->
        <div v-else-if="verified" class="text-center py-8">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-4">
            <Icon name="heroicons:check-circle-solid" class="w-10 h-10 text-indigo-600" />
          </div>
          <h1 class="text-2xl font-bold text-heading mb-2">Email Verified!</h1>
          <p class="text-muted text-sm mb-6">Your email has been successfully verified. You can now sign in to your account.</p>
          
          <UButton
            variant="green"
            size="lg"
            block
            @click="navigateTo({ path: '/login', query: route.query })"
          >
            Go to Login
          </UButton>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="text-center py-8">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
            <Icon name="heroicons:x-circle-solid" class="w-10 h-10 text-red-500" />
          </div>
          <h1 class="text-2xl font-bold text-heading mb-2">Verification Failed</h1>
          <p class="text-muted text-sm mb-6">{{ error }}</p>
          
          <div class="space-y-3">
            <UButton
              variant="green"
              size="lg"
              block
              @click="navigateTo({ path: '/signup', query: route.query })"
            >
              Back to Sign Up
            </UButton>
            <p class="text-center text-muted text-sm">
              Need a new verification link?
              <NuxtLink :to="{ path: '/signup', query: route.query }" class="text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors">
                Sign up again
              </NuxtLink>
            </p>
          </div>
        </div>

        <!-- No Token State -->
        <div v-else class="text-center py-8">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 mb-4">
            <Icon name="heroicons:exclamation-triangle-solid" class="w-10 h-10 text-yellow-500" />
          </div>
          <h1 class="text-2xl font-bold text-heading mb-2">Invalid Link</h1>
          <p class="text-muted text-sm mb-6">This verification link is invalid or has expired.</p>
          
          <UButton
            variant="green"
            size="lg"
            block
            @click="navigateTo({ path: '/signup', query: route.query })"
          >
            Back to Sign Up
          </UButton>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'auth',
})

const route = useRoute()
const authStore = useAuthStore()
const { loading } = storeToRefs(authStore)

const verified = ref(false)
const error = ref('')

onMounted(async () => {
  const token = route.query.token as string
  if (!token) {
    return
  }

  try {
    const response = await authStore.verifyEmail(token)
    console.log(response)
    if (response?.success) {
      verified.value = true
    } else {
      error.value = response?.message || 'Verification failed. Please try again.'
    }
  } catch (err: any) {
    console.log(err.message)
    error.value = err?.message || 'Verification failed. The link may have expired.'
  }
})
</script>
