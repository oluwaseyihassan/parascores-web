<template>
  <UApp :toaster="{ position: 'top-center' }">
    <VitePwaManifest />
    <!-- <div class="fixed top-0 left-0 z-100 bg-black text-white p-4 opacity-90">
      <p>Is Logged In? {{ !!authStore.user }}</p>
      <pre>{{ authStore.user?.name }}</pre>
    </div> -->
    <NuxtLayout v-if="layoutName !== false" :name="layoutName">
      <NuxtPage />
    </NuxtLayout>
    <NuxtPage v-else />
    <Analytics />
  </UApp>
</template>

<script setup lang="ts">
  import { Analytics } from '@vercel/analytics/nuxt'
  import type { LayoutKey } from '#build/types/layouts'
const authStore = useAuthStore()
const route = useRoute()
const { handleError } = useErrors()

// 1. Hydrate User (Your existing code)
// We use callOnce to make sure this runs on the server to check cookies
await callOnce(async () => {
  try {
    await authStore.fetchUser()
  } catch(err) {
    handleError(err, { toast: false, title: 'Hydration failed' })
  }
})


// 2. Smart Layout Switching
// This checks the current route name/path to decide which layout to show
const layoutName = computed(() => {
  // If explicitly set to false, return false to let the page handle it
  if (route.meta.layout === false) {
    return false
  }
  
  if (route.meta.layout) {
    return route.meta.layout as LayoutKey
  }
  
  // If the route is inside the _app folder, use 'dashboard' layout
  if (route.path.startsWith('/_app') || route.name?.toString().includes('_app')) {
    return 'dashboard' as LayoutKey
  }
  // Otherwise use 'default'
  return 'default' as LayoutKey
})
</script>