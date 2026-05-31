<template>
  <header class="border-b border-white/10 sticky top-0 z-50 bg-[#070b10]">
    <div class="max-w-7xl mx-auto px-6">
      <div class="flex items-center justify-between h-16">
        <!-- Logo -->
        <NuxtLink to="/landing" class="flex items-center gap-2 group">
          <img src="https://res.cloudinary.com/djsnerfzp/image/upload/q_auto/f_auto/v1776229862/Screenshot_2026-04-15_060233_wexzxq.png" alt="ParaScores" class="h-8 w-auto object-contain" />
          <span class="font-black text-lg tracking-tighter text-white group-hover:text-emerald-400 transition-colors inline-block select-none">ParaScores</span>
        </NuxtLink>

        <!-- Desktop Navigation -->
        <nav class="hidden lg:flex items-center gap-1">
          <NuxtLink
            to="/widgets"
            class="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Widget Builder
          </NuxtLink>
          <NuxtLink
            to="/graphics"
            class="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Graphics Studio
          </NuxtLink>
          <NuxtLink
            to="/pricing"
            class="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Pricing
          </NuxtLink>
          <NuxtLink
            to="/contact"
            class="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Contact
          </NuxtLink>
        </nav>

        <!-- Auth Buttons -->
        <div class="hidden lg:flex items-center gap-3">
          <NuxtLink
            to="/login"
            class="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Log In
          </NuxtLink>
          <NuxtLink
            to="/signup"
            class="px-4 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded transition-colors"
          >
            GET STARTED
          </NuxtLink>
        </div>

        <!-- Mobile Menu Button -->
        <button
          class="lg:hidden p-2 text-gray-400 hover:text-white transition-colors"
          @click="mobileMenuOpen = !mobileMenuOpen"
          aria-label="Toggle menu"
        >
          <svg v-if="!mobileMenuOpen" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
          <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Mobile Menu -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-4"
    >
      <div v-if="mobileMenuOpen" class="lg:hidden bg-[#070b10] border-t border-white/10 px-6 py-4 absolute w-full animate-in fade-in slide-in-from-top-4 duration-200">
        <nav class="flex flex-col gap-2">
          <NuxtLink to="/widgets" class="px-4 py-2 text-gray-400 hover:text-white" @click="mobileMenuOpen = false">Widget Builder</NuxtLink>
          <NuxtLink to="/graphics" class="px-4 py-2 text-gray-400 hover:text-white" @click="mobileMenuOpen = false">Graphics Studio</NuxtLink>
          <NuxtLink to="/pricing" class="px-4 py-2 text-gray-400 hover:text-white" @click="mobileMenuOpen = false">Pricing</NuxtLink>
          <NuxtLink to="/contact" class="px-4 py-2 text-gray-400 hover:text-white" @click="mobileMenuOpen = false">Contact</NuxtLink>
        </nav>
        <div class="flex flex-col gap-2 mt-4 pt-4 border-t border-white/10">
          <NuxtLink to="/login" class="px-4 py-2 text-center text-gray-400 hover:text-white" @click="mobileMenuOpen = false">Log In</NuxtLink>
          <NuxtLink to="/signup" class="px-4 py-2 text-center font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded" @click="mobileMenuOpen = false">GET STARTED</NuxtLink>
        </div>
      </div>
    </Transition>
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const mobileMenuOpen = ref(false)
</script>
