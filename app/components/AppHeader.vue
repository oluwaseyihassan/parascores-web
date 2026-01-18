<template>
  <header class=" border-b border-white/[0.06] sticky top-0 z-50 backdrop-blur-md bg-opacity-90">
    <div class="max-w-7xl mx-auto px-6">
      <div class="flex items-center justify-between h-16">
        <!-- Logo -->
        <NuxtLink to="/" class="flex items-center gap-2.5 group">
          <div class="w-7 h-7 text-green-500 flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
              <rect x="2" y="6" width="20" height="12" rx="3" stroke="currentColor" stroke-width="2"/>
              <circle cx="8" cy="12" r="2" fill="currentColor"/>
              <circle cx="16" cy="12" r="2" fill="currentColor"/>
              <path d="M12 9V15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <span class="text-lg font-semibold text-white tracking-tight">Parascores</span>
        </NuxtLink>

        <!-- Desktop Navigation -->
        <nav class="hidden md:flex items-center gap-2">
          <UButton
            to="/#features"
            variant="ghost"
            color="neutral"
            class="text-sm"
            @click.prevent="scrollToSection('features')"
          >
            Features
          </UButton>
          <UButton
            to="/#pricing"
            variant="ghost"
            color="neutral"
            class="text-sm"
            @click.prevent="scrollToSection('pricing')"
          >
            Pricing
          </UButton>
          <UButton
            to="/about"
            variant="ghost"
            color="neutral"
            class="text-sm"
          >
            About
          </UButton>
          <UButton
            to="/blog"
            variant="ghost"
            color="neutral"
            class="text-sm"
          >
            Blog
          </UButton>
        </nav>

        <!-- Auth Buttons -->
        <div class="hidden md:flex items-center gap-3">
          <!-- Color Mode Toggle -->
          <UButton
            variant="ghost"
            color="neutral"
            square
            @click="toggleColorMode"
            :icon="colorMode.value === 'dark' ? 'i-heroicons-sun' : 'i-heroicons-moon'"
            aria-label="Toggle color mode"
          />
          
          <UButton
            to="/login"
            variant="ghost"
            color="neutral"
            class="font-medium"
          >
            Sign In
          </UButton>
          <UButton
            to="/signup"
            color="primary"
            class="font-medium"
          >
            Get Started
          </UButton>
        </div>

        <!-- Mobile Menu Button -->
        <UButton
          variant="ghost"
          color="neutral"
          class="md:hidden"
          square
          @click="mobileMenuOpen = !mobileMenuOpen"
          :icon="!mobileMenuOpen ? 'i-heroicons-bars-3' : 'i-heroicons-x-mark'"
          aria-label="Toggle menu"
        />
      </div>
    </div>

    <!-- Mobile Menu Dropdown (absolute overlay) -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-4"
    >
      <UCard 
        v-if="mobileMenuOpen" 
        class="md:hidden absolute z-50 left-0 right-0 top-full rounded-none border-t-0 border-x-0 border-b border-subtle shadow-xl"
      >
        <div class="max-w-7xl mx-auto">
          <nav class="flex flex-col gap-2">
            <UButton
              to="/#features"
              variant="ghost"
              color="neutral"
              block
              class="justify-start text-base"
              @click.prevent="scrollToSection('features'); mobileMenuOpen = false"
            >
              Features
            </UButton>
            <UButton
              to="/#pricing"
              variant="ghost"
              color="neutral"
              block
              class="justify-start text-base"
              @click.prevent="scrollToSection('pricing'); mobileMenuOpen = false"
            >
              Pricing
            </UButton>
            <UButton
              to="/about"
              variant="ghost"
              color="neutral"
              block
              class="justify-start text-base"
              @click="mobileMenuOpen = false"
            >
              About
            </UButton>
            <UButton
              to="/blog"
              variant="ghost"
              color="neutral"
              block
              class="justify-start text-base"
              @click="mobileMenuOpen = false"
            >
              Blog
            </UButton>
          </nav>
          
          <div class="flex flex-col gap-3 mt-6 pt-6 border-t border-subtle">
            <!-- Color Mode Toggle (Mobile) -->
            <UButton
              variant="ghost"
              color="neutral"
              block
              class="justify-start text-base"
              @click="toggleColorMode"
              :icon="colorMode.value === 'dark' ? 'i-heroicons-sun' : 'i-heroicons-moon'"
            >
              {{ colorMode.value === 'dark' ? 'Light Mode' : 'Dark Mode' }}
            </UButton>
            
            <UButton
              to="/login"
              variant="ghost"
              color="neutral"
              block
              class="justify-center text-base"
              @click="mobileMenuOpen = false"
            >
              Sign In
            </UButton>
            <UButton
              to="/signup"
              color="primary"
              block
              class="justify-center text-base"
              @click="mobileMenuOpen = false"
            >
              Get Started
            </UButton>
          </div>
        </div>
      </UCard>
    </Transition>

    <!-- Backdrop overlay -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div 
          v-if="mobileMenuOpen" 
          class="fixed inset-0 bg-black/50 md:hidden"
          @click="mobileMenuOpen = false"
        ></div>
      </Transition>
    </Teleport>
  </header>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const mobileMenuOpen = ref(false)

// Color mode
const colorMode = useColorMode()
const toggleColorMode = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

// Smooth scroll to section
const scrollToSection = (sectionId: string) => {
  const element = document.getElementById(sectionId)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' })
  }
}

// Lock body scroll when menu is open
watch(mobileMenuOpen, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})
</script>