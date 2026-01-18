<template>
  <footer class="bg-card border-t border-subtle">
    <div class="max-w-7xl mx-auto px-6">
      <!-- Main Footer Content -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr] gap-8 lg:gap-12 py-14">
        <!-- Brand Section -->
        <div class="max-w-[280px] md:col-span-2 lg:col-span-1 lg:max-w-none">
          <div class="flex items-center gap-2.5 mb-4">
            <div class="w-7 h-7 text-green-600 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
                <rect x="2" y="6" width="20" height="12" rx="3" stroke="currentColor" stroke-width="2"/>
                <circle cx="8" cy="12" r="2" fill="currentColor"/>
                <circle cx="16" cy="12" r="2" fill="currentColor"/>
                <path d="M12 9V15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
            <span class="text-lg font-semibold text-heading tracking-tight">Parascores</span>
          </div>
          <p class="text-sm leading-relaxed text-muted">
            Empowering organizers with the tools they need to run world-class tournaments.
          </p>
        </div>

        <!-- Product Column -->
        <div class="flex flex-col">
          <h4 class="text-sm font-semibold text-heading mb-5 tracking-tight">Product</h4>
          <ul class="flex flex-col gap-3.5">
            <li>
              <a href="/#features" @click.prevent="scrollToSection('features')" class="text-sm text-muted hover:text-heading transition-colors duration-200">
                Features
              </a>
            </li>
            <li>
              <a href="/#pricing" @click.prevent="scrollToSection('pricing')" class="text-sm text-muted hover:text-heading transition-colors duration-200">
                Pricing
              </a>
            </li>
            <li>
              <NuxtLink to="/api" class="text-sm text-muted hover:text-heading transition-colors duration-200">
                API
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- Company Column -->
        <div class="flex flex-col">
          <h4 class="text-sm font-semibold text-heading mb-5 tracking-tight">Company</h4>
          <ul class="flex flex-col gap-3.5">
            <li>
              <NuxtLink to="/about" class="text-sm text-muted hover:text-heading transition-colors duration-200">
                About
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/careers" class="text-sm text-muted hover:text-heading transition-colors duration-200">
                Careers
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/blog" class="text-sm text-muted hover:text-heading transition-colors duration-200">
                Blog
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- Newsletter Section -->
        <div class="flex flex-col md:col-span-2 lg:col-span-1 max-w-[400px] lg:max-w-none">
          <h4 class="text-sm font-semibold text-heading mb-5 tracking-tight">Stay Updated</h4>
          <form @submit.prevent="handleSubscribe">
            <div class="flex items-center gap-2">
              <UInput 
                v-model="email" 
                type="email" 
                placeholder="Enter email" 
                required
                class="flex-1"
                input-class="bg-surface"
              />
              <UButton 
                type="submit" 
                color="primary"
                icon="i-heroicons-arrow-right-20-solid"
                square
                aria-label="Subscribe"
                class="flex-shrink-0"
              />
            </div>
          </form>
        </div>
      </div>

      <!-- Footer Bottom -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4 py-6 border-t border-subtle">
        <p class="text-[13px] text-muted">
          © {{ currentYear }} Parascores Inc. All rights reserved.
        </p>
        <nav class="flex items-center gap-6">
          <NuxtLink to="/privacy" class="text-[13px] text-muted hover:text-heading transition-colors duration-200">
            Privacy
          </NuxtLink>
          <NuxtLink to="/terms" class="text-[13px] text-muted hover:text-heading transition-colors duration-200">
            Terms
          </NuxtLink>
          <NuxtLink to="/security" class="text-[13px] text-muted hover:text-heading transition-colors duration-200">
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
    console.log('Subscribing:', email.value)
    // Here you would typically call an API to subscribe the user
    email.value = ''
  }
}

const scrollToSection = (sectionId: string) => {
  const element = document.getElementById(sectionId)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' })
  }
}
</script>
