<script setup lang="ts">
const route = useRoute()
const authStore = useAuthStore()

// Navigation items (Icon focused)
const links = [
  { label: 'Home', icon: 'i-heroicons-home', to: '/' },
  { label: 'Leagues', icon: 'i-heroicons-trophy', to: '/tournaments' },
  { label: 'Teams', icon: 'i-heroicons-user-group', to: '/teams' },
  { label: 'Live', icon: 'i-heroicons-signal', to: '/live', activeClass: 'text-red-500 animate-pulse' }
]

const handleLogout = async () => {
  await authStore.logout()
  navigateTo('/login')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] text-gray-900 dark:text-gray-100 font-sans selection:bg-green-500/30">
    
    <div class="flex h-screen overflow-hidden p-4 gap-4">

      <nav class="hidden md:flex flex-col justify-between w-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-3xl shadow-xl py-6 items-center z-50">
        
        <div class="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
           <UIcon name="i-heroicons-bolt-solid" class="w-6 h-6 text-white" />
        </div>

        <div class="flex flex-col gap-6 w-full px-2">
          <NuxtLink 
            v-for="link in links" 
            :key="link.to" 
            :to="link.to"
            class="relative group flex items-center justify-center w-full h-12 rounded-xl transition-all duration-300"
            :class="[
              route.path === link.to 
                ? 'bg-green-500 text-white shadow-md shadow-green-500/30' 
                : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-green-500'
            ]"
          >
            <UIcon :name="link.icon" class="w-6 h-6" />
            
            <span class="absolute left-14 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {{ link.label }}
            </span>
          </NuxtLink>
        </div>

        <div class="mt-auto">
          <UButton icon="i-heroicons-arrow-left-on-rectangle" label="" color="error" @click="handleLogout" />

          <UDropdown :items="[[{ label: 'Logout', icon: 'i-heroicons-arrow-left-on-rectangle', click: handleLogout }]]" :popper="{ placement: 'right-end' }">
             <UAvatar v-if="authStore.user?.picture" :src="authStore.user?.picture" size="sm" class="cursor-pointer ring-2 ring-transparent hover:ring-green-500 transition-all" />
             <UAvatar v-else :text="authStore.user?.name.charAt(0).toUpperCase()" size="sm" class="cursor-pointer ring-2 ring-transparent hover:ring-green-500 transition-all" />
          </UDropdown>
        </div>
      </nav>

      <main class="flex-1 flex flex-col relative h-full rounded-3xl overflow-hidden bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 shadow-sm backdrop-blur-sm">
        
        <header class="md:hidden flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-white/90 backdrop-blur">
          <div class="font-bold text-lg tracking-tight">ParaScores</div>
          <UButton icon="i-heroicons-bars-3" variant="ghost" color="primary" />
        </header>

        <div class="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
           <slot />
        </div>

      </main>

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