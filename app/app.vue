<template>
  <UApp>
    <!-- <div class="fixed top-0 left-0 z-100 bg-black text-white p-4 opacity-90">
      <p>Is Logged In? {{ !!authStore.user }}</p>
      <pre>{{ authStore.user?.name }}</pre>
    </div> -->
    <NuxtLayout :name="layoutName">
      <NuxtPage />
    </NuxtLayout>
    <Analytics />
  </UApp>
</template>

<script setup lang="ts">
  import { Analytics } from '@vercel/analytics/nuxt'
  import type { LayoutKey } from '#build/types/layouts'
const authStore = useAuthStore()
const route = useRoute()

// 1. Hydrate User (Your existing code)
// We use callOnce to make sure this runs on the server to check cookies
await callOnce(async () => {
  try {
    await authStore.fetchUser()
  } catch(err) {
    console.log(err)
  }
})


// 2. Smart Layout Switching
// This checks the current route name/path to decide which layout to show
const layoutName = computed(() => {
  if (route.meta.layout) {
    return route.meta.layout as LayoutKey
  }
  // If the route is inside the _app folder, use 'dashboard' layout
  if (route.path.startsWith('/_app') || route.name?.toString().includes('_app')) {
    return 'dashboard' as LayoutKey
  }
  // Otherwise use 'marketing'
  return 'default' as LayoutKey
})
</script>