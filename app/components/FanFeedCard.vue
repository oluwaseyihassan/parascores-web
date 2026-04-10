<template>
  <div 
    class="group relative overflow-hidden rounded-2xl border border-white/[0.05] bg-[#0A0A0A] p-5 transition-all duration-300 hover:border-emerald-500/50 hover:bg-[#0F0F0F] backdrop-blur-sm shadow-sm hover:shadow-emerald-500/10 flex flex-col h-full"
  >
    <!-- Background Gradient Glow -->
    <div class="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-emerald-500/5 blur-3xl transition-all duration-500 group-hover:bg-emerald-500/10"></div>
    
    <!-- Card Content -->
    <div class="relative z-10 flex flex-col h-full">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
// Simple wrapper component for premium looking feed cards
</script>

<style scoped>
/* Glassmorphism effect */
.backdrop-blur-sm {
  backdrop-filter: blur(8px);
}
</style>
