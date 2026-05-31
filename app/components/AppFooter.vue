<template>
  <footer class="bg-[#070b10] border-t border-white/10">
    <div class="max-w-7xl mx-auto px-6">
      <!-- Main Footer Content -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1.2fr] gap-8 lg:gap-12 py-14">
        <!-- Brand Section -->
        <div class="max-w-[280px] md:col-span-2 lg:col-span-1 lg:max-w-none">
          <div class="mb-4">
            <img src="https://res.cloudinary.com/djsnerfzp/image/upload/q_auto/f_auto/v1776229862/Screenshot_2026-04-15_060233_wexzxq.png" alt="ParaScores" class="h-8 w-auto object-contain" />
          </div>
          <p class="text-sm leading-relaxed text-gray-400">
            Empowering organizers with the tools they need to run world-class tournaments.
          </p>
        </div>

        <!-- Product Column -->
        <div class="flex flex-col">
          <h4 class="text-sm font-semibold text-white mb-5 tracking-tight">Product</h4>
          <ul class="flex flex-col gap-3.5">
            <li>
              <NuxtLink to="/widgets" class="text-sm text-gray-400 hover:text-white transition-colors duration-200">
                Widget Builder
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/graphics" class="text-sm text-gray-400 hover:text-white transition-colors duration-200">
                Graphics Studio
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/pricing" class="text-sm text-gray-400 hover:text-white transition-colors duration-200">
                Pricing
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- Newsletter Section -->
        <div class="flex flex-col md:col-span-2 lg:col-span-1 max-w-[400px] lg:max-w-none">
          <h4 class="text-sm font-semibold text-white mb-5 tracking-tight">Stay Updated</h4>
          <form @submit.prevent="handleSubscribe">
            <div class="flex items-center gap-2">
              <input 
                v-model="email" 
                type="email" 
                placeholder="Enter email" 
                required
                class="flex-1 px-4 py-2 text-sm bg-[#111827] border border-white/10 rounded text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              />
              <button 
                type="submit" 
                class="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded transition-colors"
                aria-label="Subscribe"
              >
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Footer Bottom -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4 py-6 border-t border-white/10">
        <p class="text-[13px] text-gray-500">
          © {{ currentYear }} Parascores Inc. All rights reserved.
        </p>
        <nav class="flex items-center gap-6">
          <NuxtLink to="/privacy" class="text-[13px] text-gray-500 hover:text-white transition-colors duration-200">
            Privacy
          </NuxtLink>
          <NuxtLink to="/terms" class="text-[13px] text-gray-500 hover:text-white transition-colors duration-200">
            Terms
          </NuxtLink>
          <NuxtLink to="/security" class="text-[13px] text-gray-500 hover:text-white transition-colors duration-200">
            Security
          </NuxtLink>
        </nav>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const email = ref('')

const currentYear = computed(() => new Date().getFullYear())

const handleSubscribe = () => {
  if (email.value) {
    email.value = ''
  }
}
</script>
