<script setup lang="ts">
import { computed } from 'vue'
import type { NuxtError } from 'nuxt/app'
import { clearError } from 'nuxt/app'

const props = defineProps({
  error: Object as () => NuxtError,
})

const handleError = () => clearError({ redirect: '/' })
const goBack = () => {
  if (window.history.length > 1) {
    window.history.back()
  } else {
    clearError({ redirect: '/' })
  }
}

// Determine error type for better display
const errorInfo = computed(() => {
  const status = props.error?.statusCode || 500
  
  if (status === 404) {
    return {
      title: 'Page Not Found',
      description: "Oops! The page you're looking for doesn't exist or has been moved.",
      icon: 'i-heroicons-map-pin-20-solid',
      suggestion: 'Double-check the URL or navigate back to safety.'
    }
  }
  
  if (status === 403) {
    return {
      title: 'Access Denied',
      description: "You don't have permission to view this page.",
      icon: 'i-heroicons-lock-closed-20-solid',
      suggestion: 'Please sign in with an authorized account.'
    }
  }
  
  if (status === 401) {
    return {
      title: 'Authentication Required',
      description: 'You need to be logged in to access this page.',
      icon: 'i-heroicons-user-circle-20-solid',
      suggestion: 'Please sign in to continue.'
    }
  }

  if (status >= 500) {
    return {
      title: 'Server Error',
      description: "Something went wrong on our end. We're working on it!",
      icon: 'i-heroicons-server-20-solid',
      suggestion: 'Please try again later or contact support.'
    }
  }

  return {
    title: 'Something Went Wrong',
    description: 'An unexpected error occurred.',
    icon: 'i-heroicons-exclamation-triangle-20-solid',
    suggestion: 'Please try again or go back to the homepage.'
  }
})
</script>

<template>
  <div class="min-h-screen bg-page flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
    <!-- Background decoration -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute top-1/4 -left-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
      <div class="absolute bottom-1/4 -right-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl" />
    </div>
    
    <!-- Content -->
    <div class="relative z-10 text-center max-w-lg mx-auto">
      <!-- Error code with animated gradient -->
      <div class="relative mb-6">
        <h1 class="text-[120px] sm:text-[160px] font-black leading-none tracking-tight bg-gradient-to-br from-indigo-400 via-purple-500 to-pink-500 bg-clip-text text-transparent animate-pulse">
          {{ error?.statusCode || 500 }}
        </h1>
        <!-- Decorative ring -->
        <div class="absolute inset-0 flex items-center justify-center -z-10">
          <div class="w-40 h-40 rounded-full border-4 border-dashed border-gray-300 dark:border-gray-700 opacity-30 animate-spin" style="animation-duration: 20s;" />
        </div>
      </div>

      <!-- Icon -->
      <div class="flex justify-center mb-6">
        <div class="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/25 transform hover:scale-105 transition-transform duration-300">
          <UIcon :name="errorInfo.icon" class="w-8 h-8 text-white" />
        </div>
      </div>

      <!-- Error title and description -->
      <h2 class="text-2xl sm:text-3xl font-bold text-heading mb-3">
        {{ errorInfo.title }}
      </h2>
      <p class="text-muted text-base sm:text-lg mb-2">
        {{ errorInfo.description }}
      </p>
      <p class="text-muted/70 text-sm mb-8">
        {{ errorInfo.suggestion }}
      </p>

      <!-- Technical error message (collapsible) -->
      <div v-if="error?.message && error.message !== errorInfo.title" class="mb-8">
        <details class="text-left bg-surface rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <summary class="px-4 py-3 text-sm text-muted cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            Technical details
          </summary>
          <div class="px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
            <code class="text-xs text-red-500 dark:text-red-400 break-all">
              {{ error.message }}
            </code>
          </div>
        </details>
      </div>

      <!-- Action buttons -->
      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <UButton
          size="lg"
          variant="green"
          class="font-semibold px-6 shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300"
          @click="handleError"
        >
          <template #leading>
            <UIcon name="i-heroicons-home-20-solid" class="w-5 h-5" />
          </template>
          Go to Homepage
        </UButton>
        
        <UButton
          size="lg"
          variant="outline"
          color="neutral"
          class="font-medium px-6"
          @click="goBack"
        >
          <template #leading>
            <UIcon name="i-heroicons-arrow-left-20-solid" class="w-5 h-5" />
          </template>
          Go Back
        </UButton>
      </div>

      <!-- Helpful links -->
      <div class="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
        <p class="text-sm text-muted mb-4">Need help? Try these:</p>
        <div class="flex flex-wrap justify-center gap-4 text-sm">
          <NuxtLink to="/" class="text-indigo-500 hover:text-indigo-400 transition-colors flex items-center gap-1.5">
            <UIcon name="i-heroicons-home-20-solid" class="w-4 h-4" />
            Home
          </NuxtLink>
          <NuxtLink to="/login" class="text-indigo-500 hover:text-indigo-400 transition-colors flex items-center gap-1.5">
            <UIcon name="i-heroicons-arrow-right-on-rectangle-20-solid" class="w-4 h-4" />
            Login
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}
</style>
