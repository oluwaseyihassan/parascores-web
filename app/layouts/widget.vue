<template>
  <div :class="isDark ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'" class="min-h-screen font-sans transition-colors duration-300">
    <slot />
    <!-- Bottom Bar: Theme Toggle + Powered by ParaScores -->
    <div class="fixed bottom-2 right-3 z-50 flex items-center gap-2">
      <!-- Theme Toggle -->
      <button
        @click="toggleTheme"
        :class="isDark ? 'bg-gray-900/90 border-white/10 text-gray-400 hover:text-white' : 'bg-white/90 border-gray-200 text-gray-500 hover:text-gray-800'"
        class="flex items-center justify-center w-7 h-7 rounded-full border backdrop-blur-sm transition-colors"
        :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
      >
        <!-- Sun icon (shown in dark mode) -->
        <svg v-if="isDark" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <!-- Moon icon (shown in light mode) -->
        <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      </button>
      <!-- Powered by ParaScores -->
      <a 
        href="https://parascores.com" 
        target="_blank" 
        rel="noopener noreferrer"
        :class="isDark ? 'bg-gray-900/90 border-white/10 text-gray-400 hover:text-white' : 'bg-white/90 border-gray-200 text-gray-500 hover:text-gray-800'"
        class="flex items-center gap-1.5 px-2.5 py-1 border rounded-full text-[10px] transition-colors backdrop-blur-sm"
      >
        <img src="https://res.cloudinary.com/djsnerfzp/image/upload/q_auto/f_auto/v1776229862/Screenshot_2026-04-15_060233_wexzxq.png" alt="ParaScores" class="h-3 w-auto object-contain" />
        Powered by ParaScores
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()

const theme = ref((route.query.theme as string) || 'dark')
const isDark = computed(() => theme.value === 'dark')

function toggleTheme() {
  theme.value = isDark.value ? 'light' : 'dark'
}

// Provide theme to all child widget pages
provide('widgetTheme', theme)
provide('widgetIsDark', isDark)
</script>
