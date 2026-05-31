<template>
  <Transition
    enter-active-class="transition-opacity duration-300"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-200"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="show"
      class="fixed inset-0 z-[9999] flex items-center justify-center bg-[#070b10]"
    >
      <div class="flex flex-col items-center gap-6">
        <!-- Logo -->
        <div class="w-16 h-16 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-pulse">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-white">
            <rect x="2" y="6" width="20" height="12" rx="3" stroke="currentColor" stroke-width="2"/>
            <circle cx="8" cy="12" r="2" fill="currentColor"/>
            <circle cx="16" cy="12" r="2" fill="currentColor"/>
            <path d="M12 9V15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        
        <!-- Loading indicator -->
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style="animation-delay: 0ms;"></div>
          <div class="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style="animation-delay: 150ms;"></div>
          <div class="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style="animation-delay: 300ms;"></div>
        </div>
        
        <!-- Text -->
        <p class="text-gray-400 text-sm font-medium tracking-wide">Loading...</p>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean
}>()
</script>
