<script setup lang="ts">
import { storeToRefs } from 'pinia'

const route = useRoute()
const authStore = useAuthStore()
const { authLoading } = storeToRefs(authStore)

// Navigation items (Icon focused)
const links = [
  { label: 'Home', icon: 'i-heroicons-home', to: '/' },
  { label: 'Leagues', icon: 'i-heroicons-trophy', to: '/tournaments' },
  { label: 'Teams', icon: 'i-heroicons-user-group', to: '/teams' },
  { label: 'Live', icon: 'i-heroicons-signal', to: '/live', activeClass: 'text-red-500 animate-pulse' }
]

const colorMode = useColorMode()

const setTheme = (theme: 'light' | 'dark' | 'system') => {
  colorMode.preference = theme
}

const profileMenuItems = computed(() => [
  [{
    label: authStore.user?.name || 'User',
    avatar: authStore.user?.picture ? { src: authStore.user.picture } : { text: authStore.user?.name?.charAt(0).toUpperCase() },
    type: 'label',
    slot: 'account',
    disabled: true
  }],
  [{ label: 'My profile', icon: 'i-heroicons-user-circle', to: '/profile' }],
  [{
    label: 'Theme',
    icon: 'i-heroicons-paint-brush',
    children: [
      { 
        label: 'Light', 
        icon: colorMode.preference === 'light' ? 'i-heroicons-check' : 'i-heroicons-sun', 
        onSelect: () => setTheme('light'),
        active: colorMode.preference === 'light'
      },
      { 
        label: 'Dark', 
        icon: colorMode.preference === 'dark' ? 'i-heroicons-check' : 'i-heroicons-moon', 
        onSelect: () => setTheme('dark'),
        active: colorMode.preference === 'dark'
      },
      { 
        label: 'System', 
        icon: colorMode.preference === 'system' ? 'i-heroicons-check' : 'i-heroicons-computer-desktop', 
        onSelect: () => setTheme('system'),
        active: colorMode.preference === 'system'
      }
    ]
  }],
  [{ label: 'Log out', icon: 'i-heroicons-arrow-right-on-rectangle', onSelect: handleLogout }]
])

const handleLogout = async () => {
  await authStore.logout()
  navigateTo('http://lvh.me:3001/login', { external: true })
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans selection:bg-indigo-500/30">
    <AuthLoadingOverlay :show="authLoading" />
    
    <!-- Desktop Layout -->
    <div class="hidden md:flex h-screen overflow-hidden p-4 gap-4">

      <!-- Desktop Sidebar -->
      <nav class="flex flex-col justify-between w-16 bg-white/80 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-xl py-4 items-center z-50">
        
        <div class="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
           <UIcon name="i-heroicons-bolt-solid" class="w-6 h-6 text-white" />
        </div>

        <div class="flex flex-col gap-6 w-full px-2 mt-4">
          <NuxtLink 
            v-for="link in links" 
            :key="link.to" 
            :to="link.to"
            class="relative group flex items-center justify-center py-2 rounded-xl transition-all duration-300"
            :class="[
              route.path === link.to 
                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30' 
                : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-indigo-500'
            ]"
          >
            <UIcon :name="link.icon" class="w-6 h-6" />
            
            <span class="absolute left-14 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {{ link.label }}
            </span>
          </NuxtLink>
        </div>

        <div class="mt-auto">
          <UDropdownMenu :items="profileMenuItems">
            <UAvatar v-if="authStore.user?.picture" :src="authStore.user?.picture" size="sm" class="cursor-pointer ring-2 ring-transparent hover:ring-indigo-500 transition-all" />
            <UAvatar v-else :text="authStore.user?.name?.charAt(0).toUpperCase()" size="sm" class="cursor-pointer ring-2 ring-transparent hover:ring-indigo-500 transition-all" />
          </UDropdownMenu>
        </div>
      </nav>

      <!-- Desktop Main Content -->
      <main class="flex-1 flex flex-col relative h-full rounded-3xl overflow-hidden bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 shadow-sm">
        <div class="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
           <slot />
        </div>
      </main>

    </div>

    <!-- Mobile Layout -->
    <div class="md:hidden flex flex-col h-screen">
      
      <!-- Mobile Header -->
      <header class="flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 z-40">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-md shadow-indigo-500/20">
            <UIcon name="i-heroicons-bolt-solid" class="w-5 h-5 text-white" />
          </div>
          <span class="font-bold text-lg tracking-tight">ParaScores</span>
        </div>
        <UDropdownMenu :items="profileMenuItems">
          <UAvatar v-if="authStore.user?.picture" :src="authStore.user?.picture" size="sm" class="cursor-pointer ring-2 ring-transparent hover:ring-indigo-500 transition-all" />
          <UAvatar v-else :text="authStore.user?.name?.charAt(0).toUpperCase()" size="sm" class="cursor-pointer ring-2 ring-transparent hover:ring-indigo-500 transition-all" />
        </UDropdownMenu>
      </header>

      <!-- Mobile Main Content -->
      <main class="flex-1 overflow-y-auto p-4 pb-24 scroll-smooth bg-gray-50 dark:bg-gray-950">
        <slot />
      </main>

      <!-- Mobile Bottom Navigation -->
      <nav class="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-800 px-2 py-2 z-50 safe-area-pb">
        <div class="flex items-center justify-around">
          <NuxtLink 
            v-for="link in links" 
            :key="link.to" 
            :to="link.to"
            class="flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-all duration-200"
            :class="[
              route.path === link.to 
                ? 'text-indigo-500' 
                : 'text-gray-400 hover:text-indigo-500'
            ]"
          >
            <UIcon :name="link.icon" class="w-6 h-6" />
            <span class="text-xs mt-1 font-medium">{{ link.label }}</span>
          </NuxtLink>
        </div>
      </nav>

    </div>
  </div>
</template>

<style scoped>
/* Hide Scrollbar for cleaner look */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.3);
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(156, 163, 175, 0.5);
}
</style>