<script setup lang="ts">
import { ref, onMounted } from 'vue'

const { isInstalled, isIOSDevice, showInstallButton, install } = usePwaInstall()

const isDismissed = ref(true) // Start dismissed on SSR to prevent hydration mismatch
const showIOSModal = ref(false)

onMounted(() => {
  isDismissed.value = localStorage.getItem('parascores_pwa_dismissed') === 'true'
})

const handleInstall = async () => {
  if (isIOSDevice.value) {
    showIOSModal.value = true
  } else {
    await install()
  }
}

const dismissBanner = () => {
  localStorage.setItem('parascores_pwa_dismissed', 'true')
  isDismissed.value = true
}
</script>

<template>
  <div 
    v-if="showInstallButton && !isDismissed"
    class="relative m-6 mb-2 p-4 md:p-5 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 transition-all duration-300 shadow-sm border-emerald-500/15 bg-emerald-500/5 text-gray-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-white backdrop-blur-md"
  >
    <!-- Close Button -->
    <button 
      class="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
      @click="dismissBanner"
      aria-label="Dismiss banner"
    >
      <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
    </button>

    <!-- Content Area -->
    <div class="flex items-center gap-4 flex-1 pr-6">
      <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20">
        <img 
          src="https://res.cloudinary.com/djsnerfzp/image/upload/q_auto/f_auto/v1780327900/parascores-logo.png" 
          alt="ParaScores" 
          class="w-8 h-8 object-contain"
        />
      </div>
      <div>
        <h4 class="font-extrabold text-sm md:text-base tracking-tight">Install ParaScores App</h4>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 max-w-2xl leading-relaxed">
          Install the web app for a faster interface and live push notifications direct to your home screen!
        </p>
      </div>
    </div>

    <!-- Actions Area -->
    <div class="shrink-0 flex items-center gap-3">
      <UButton 
        color="success" 
        size="md"
        class="rounded-xl font-bold shadow-md shadow-emerald-500/10 px-5"
        @click="handleInstall"
      >
        Install Now
      </UButton>
    </div>

    <!-- iOS Install Instructions Modal -->
    <UModal v-model:open="showIOSModal">
      <template #content>
        <UCard class="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/5 shadow-2xl rounded-2xl overflow-hidden max-w-md">
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-device-phone-mobile" class="w-5 h-5 text-emerald-500" />
                <span class="font-bold text-gray-900 dark:text-white">Install on iOS</span>
              </div>
              <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" @click="showIOSModal = false" />
            </div>
          </template>

          <div class="space-y-6 py-4">
            <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Add ParaScores to your Home Screen to get a full app-like experience including real-time push alerts.
            </p>

            <div class="space-y-4">
              <!-- Step 1 -->
              <div class="flex gap-4 items-start">
                <div class="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-sm shrink-0">
                  1
                </div>
                <div>
                  <h4 class="font-bold text-sm text-gray-900 dark:text-white">Tap the Share Button</h4>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5 flex-wrap">
                    Tap Safari's share icon 
                    <span class="inline-flex items-center justify-center p-1 rounded bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                      <UIcon name="i-heroicons-share" class="w-4 h-4 text-emerald-500" />
                    </span>
                    in the menu bar.
                  </p>
                </div>
              </div>

              <!-- Step 2 -->
              <div class="flex gap-4 items-start">
                <div class="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-sm shrink-0">
                  2
                </div>
                <div>
                  <h4 class="font-bold text-sm text-gray-900 dark:text-white">Select Add to Home Screen</h4>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5 flex-wrap">
                    Scroll down and select 
                    <span class="font-semibold text-gray-800 dark:text-gray-200">'Add to Home Screen'</span>
                    <span class="inline-flex items-center justify-center p-1 rounded bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                      <UIcon name="i-heroicons-plus-box" class="w-4 h-4 text-emerald-500" />
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-4">
            <UButton 
              color="success" 
              class="rounded-xl font-bold px-6" 
              @click="showIOSModal = false"
            >
              Got it
            </UButton>
          </div>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
