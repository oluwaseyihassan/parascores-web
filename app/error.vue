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

// Simple and creative details for error categories using sports metaphors
const errorDetails = computed(() => {
  const status = props.error?.statusCode || 500
  
  if (status === 404) {
    return {
      badge: 'OFFSIDE',
      subtitle: 'Page Out of Bounds',
      description: "Oops! The page you are looking for has run offside or doesn't exist on the pitch.",
      icon: 'i-heroicons-map-pin-20-solid'
    }
  }
  
  if (status === 403) {
    return {
      badge: 'RED CARD',
      subtitle: 'Access Denied',
      description: "You don't have permission to play in this zone of the dashboard.",
      icon: 'i-heroicons-shield-exclamation-20-solid'
    }
  }
  
  if (status === 401) {
    return {
      badge: 'SUSPENDED',
      subtitle: 'Authentication Required',
      description: "You need to log in to access this page and continue the match.",
      icon: 'i-heroicons-user-minus-20-solid'
    }
  }

  return {
    badge: 'TECHNICAL FOUL',
    subtitle: 'Server Error',
    description: "The server suffered a minor injury. We're working on a quick substitution.",
    icon: 'i-heroicons-cpu-chip-20-solid'
  }
})
</script>

<template>
  <div class="min-h-screen bg-page flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden transition-colors duration-300">
    <div class="relative z-10 text-center max-w-md w-full mx-auto animate-fade-in-up">
      <!-- Brand Logo Header -->
      <div class="flex items-center gap-2 mb-12 justify-center select-none">
        <div class="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white">
            <rect x="2" y="6" width="20" height="12" rx="3" stroke="currentColor" stroke-width="2"/>
            <circle cx="8" cy="12" r="2" fill="currentColor"/>
            <circle cx="16" cy="12" r="2" fill="currentColor"/>
            <path d="M12 9V15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <span class="font-bold text-heading text-lg tracking-tight">ParaScores</span>
      </div>

      <!-- Large Code -->
      <div class="relative mb-4 select-none">
        <h1 class="text-9xl sm:text-[10rem] font-extrabold tracking-tighter leading-none bg-gradient-to-b from-gray-900 via-gray-800 to-gray-600 dark:from-white dark:via-gray-100 dark:to-gray-800 bg-clip-text text-transparent opacity-95">
          {{ error?.statusCode || 500 }}
        </h1>
      </div>

      <!-- Creative Sports Badge -->
      <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 dark:bg-white/[0.03] border border-subtle mb-6 select-none">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span class="text-[10px] font-extrabold tracking-widest text-heading uppercase">
          {{ errorDetails.badge }}
        </span>
        <span class="text-muted font-bold text-[10px]">•</span>
        <span class="text-[10px] font-semibold text-muted tracking-wider uppercase">
          {{ errorDetails.subtitle }}
        </span>
      </div>

      <!-- Description -->
      <p class="text-body text-sm sm:text-base leading-relaxed max-w-xs sm:max-w-sm mx-auto mb-10">
        {{ errorDetails.description }}
      </p>

      <!-- Action Buttons -->
      <div class="flex flex-col sm:flex-row gap-3 justify-center mb-10">
        <UButton
          size="lg"
          color="primary"
          class="font-semibold px-6 shadow-sm shadow-emerald-500/10 hover:shadow-md hover:shadow-emerald-500/20 transition-all duration-200"
          @click="handleError"
        >
          <template #leading>
            <UIcon name="i-heroicons-home-20-solid" class="w-4 h-4" />
          </template>
          Go Home
        </UButton>
        
        <UButton
          size="lg"
          variant="outline"
          color="neutral"
          class="font-semibold px-6 transition-all duration-200"
          @click="goBack"
        >
          <template #leading>
            <UIcon name="i-heroicons-arrow-left-20-solid" class="w-4 h-4" />
          </template>
          Go Back
        </UButton>
      </div>

      <!-- Technical error details (collapsible, placed neatly below buttons) -->
      <div v-if="error?.message && error.message !== errorDetails.subtitle" class="mb-10 text-left max-w-sm mx-auto">
        <details class="group bg-surface/20 border border-subtle rounded-xl overflow-hidden transition-all duration-300">
          <summary class="px-4 py-2 text-xs font-semibold text-muted hover:text-heading cursor-pointer list-none flex items-center justify-between transition-colors select-none">
            <span>Show Technical Details</span>
            <UIcon name="i-heroicons-chevron-down-20-solid" class="w-4 h-4 transform group-open:rotate-180 transition-transform duration-200" />
          </summary>
          <div class="px-4 py-3 border-t border-subtle bg-gray-50/50 dark:bg-black/20">
            <code class="text-xs font-mono text-red-500 dark:text-red-400 break-all leading-normal">
              {{ error.message }}
            </code>
          </div>
        </details>
      </div>

      <!-- Footer Quick Links -->
      <div class="pt-8 border-t border-subtle flex flex-col items-center gap-3">
        <div class="flex items-center gap-4 text-xs">
          <NuxtLink to="/" class="text-muted hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors flex items-center gap-1 font-medium">
            <UIcon name="i-heroicons-home-20-solid" class="w-3.5 h-3.5" />
            Home
          </NuxtLink>
          <span class="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-800"></span>
          <NuxtLink to="/login" class="text-muted hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors flex items-center gap-1 font-medium">
            <UIcon name="i-heroicons-arrow-right-on-rectangle-20-solid" class="w-3.5 h-3.5" />
            Login
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
