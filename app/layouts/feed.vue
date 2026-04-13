<script setup lang="ts">
import { storeToRefs } from 'pinia'

const route = useRoute()
const authStore = useAuthStore()
const { authLoading, user, isAuthenticated } = storeToRefs(authStore)

const { toMain, toManage, toTournament, isManage } = useHost()

const tournamentStore = useTournamentStore()
const colorMode = useColorMode()

const setTheme = (theme: 'light' | 'dark' | 'system') => {
  colorMode.preference = theme
}

onMounted(() => {
  if (authStore.isAuthenticated && tournamentStore.followedTournaments.length === 0) {
    tournamentStore.fetchFollowedTournaments()
  }
})

const navLinks = computed(() => [
  { label: 'Feed', icon: 'i-heroicons-home', to: toMain('/') },
  { label: 'Explore', icon: 'i-heroicons-magnifying-glass', to: toMain('/explore') },
  { label: 'Following', icon: 'i-heroicons-heart', to: toMain('/following') },
])

const profileMenuItems = computed(() => {
  const items: any[][] = [
    [{
      label: user.value?.name || 'Guest',
      avatar: user.value?.picture ? { src: user.value.picture } : { text: user.value?.name?.charAt(0).toUpperCase() || 'G' },
      type: 'label',
      disabled: true
    }],
    [{ label: 'Profile', icon: 'i-heroicons-user', to: '/profile' }],
  ]

  // Add Player Profile link if user has player profiles
  const profiles = user.value?.player_profiles
  if (profiles && profiles.length > 0) {
    const firstPlayer = profiles[0]
    if (firstPlayer) {
      items[1]?.push({ 
        label: 'Player Profile', 
        icon: 'i-heroicons-identification', 
        to: toMain(`/player/${firstPlayer.id}`)
      })
    }
  }

  items.push([{
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
  }])
  items.push([{ label: 'Settings', icon: 'i-heroicons-cog-6-tooth', to: '/settings' }])
  items.push([{ label: 'Log out', icon: 'i-heroicons-arrow-right-on-rectangle', onSelect: handleLogout }])

  return items
})

async function handleLogout() {
  await authStore.logout()
  navigateTo(toMain('/'), { external: true })
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 font-sans flex overflow-hidden selection:bg-emerald-500/30">
    <AuthLoadingOverlay :show="authLoading" />

    <!-- Left Sidebar (Desktop) -->
    <aside class="hidden lg:flex flex-col w-72 border-r border-gray-200 dark:border-white/[0.05] bg-white dark:bg-[#050505] p-6 h-screen overflow-y-auto hide-scrollbar shrink-0">
      <div class="mb-8">
        <NuxtLink to="/" class="flex items-center gap-3 group">
          <div class="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform shrink-0">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-white">
              <rect x="2" y="6" width="20" height="12" rx="3" stroke="currentColor" stroke-width="2"/>
              <circle cx="8" cy="12" r="2" fill="currentColor"/>
              <circle cx="16" cy="12" r="2" fill="currentColor"/>
              <path d="M12 9V15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <span class="text-xl font-black tracking-tighter text-gray-900 dark:text-white">PARASCORES</span>
        </NuxtLink>
      </div>

      <!-- Followed Tournaments Card -->
      <div class="bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.05] rounded-2xl flex-1 overflow-hidden flex flex-col min-h-0">
        <div class="p-4 border-b border-gray-200 dark:border-white/[0.05] bg-gray-100 dark:bg-[#080808]">
           <h3 class="font-bold text-sm text-gray-900 dark:text-gray-300">Followed Tournaments</h3>
        </div>
        
        <div class="flex-1 overflow-y-auto p-2 space-y-1 hide-scrollbar">
          <div v-if="tournamentStore.followedLoading" class="p-4 space-y-3">
             <div v-for="i in 3" :key="i" class="h-8 bg-white/5 rounded-lg animate-pulse"></div>
          </div>
          <div v-else-if="tournamentStore.followedTournaments.length === 0" class="p-4 text-center mt-4">
             <p class="text-xs text-gray-500">You aren't following any tournaments.</p>
          </div>
          <NuxtLink
            v-else
            v-for="t in tournamentStore.followedTournaments"
            :key="t.id"
            :to="toTournament(t as any)"
            class="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-white/5 transition-colors group"
          >
            <UAvatar :src="t.logoUrl || t.bannerUrl || undefined" :alt="t.name" size="sm" class="shrink-0 bg-gray-200 dark:bg-white/5" />
            <span class="text-sm font-bold text-gray-600 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white truncate">{{ t.name }}</span>
          </NuxtLink>
        </div>
      </div>

    </aside>

    <!-- Main Wrapper -->
    <div class="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-black relative">
      <!-- Top Bar -->
      <header class="h-20 border-b border-gray-200 dark:border-white/[0.05] bg-white/80 dark:bg-black/80 backdrop-blur-xl px-8 flex items-center justify-between sticky top-0 z-40">
        <div class="flex items-center gap-6 flex-1">
          <div class="flex-1 max-w-xl">
            <div class="relative group">
              <UIcon name="i-heroicons-magnifying-glass" class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 transition-colors group-focus-within:text-emerald-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                class="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl pl-12 pr-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        </div>

        <div class="flex items-center gap-4">
           
           <!-- User Profile (All Screens) -->
           <div>
             <div v-if="isAuthenticated" class="flex items-center">
               <UDropdownMenu :items="profileMenuItems" :content="{ align: 'end', side: 'bottom', sideOffset: 8 }">
                 <div>
                   <UAvatar 
                     v-if="user?.picture" 
                     :src="user.picture" 
                     size="sm" 
                     class="ring-1 ring-emerald-500/30 shrink-0 cursor-pointer"
                   />
                   <UAvatar 
                     v-else 
                     :text="user?.name?.charAt(0).toUpperCase()" 
                     size="sm" 
                     class="bg-emerald-500/20 text-emerald-400 font-bold shrink-0 cursor-pointer"
                   />
                 </div>
               </UDropdownMenu>
             </div>
             <div v-else>
               <UButton :to="toMain('/login')" variant="soft" color="neutral" class="rounded-xl font-bold">
                  <span>Log In</span>
               </UButton>
             </div>
           </div>
        </div>
      </header>

      <!-- Scrollable Content -->
      <main class="flex-1 overflow-y-auto scroll-smooth">
        <slot />
        
        <!-- Mobile Bottom Nav Spacer -->
        <div class="h-24 lg:hidden"></div>
      </main>

      <!-- Mobile Bottom Nav -->
      <nav class="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-t border-gray-200 dark:border-white/[0.05] flex items-center justify-around px-4 z-50">
        <NuxtLink 
          v-for="link in navLinks" 
          :key="link.to" 
          :to="link.to"
          class="flex flex-col items-center gap-1 transition-colors"
          :class="route.path === link.to ? 'text-emerald-400' : 'text-gray-500'"
        >
          <UIcon :name="link.icon" class="w-6 h-6" />
          <span class="text-[10px] font-bold uppercase tracking-widest">{{ link.label.split(' ')[0] }}</span>
        </NuxtLink>
      </nav>
    </div>
  </div>
</template>

<style scoped>
/* Custom transitions and scrollbar */
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}

main::-webkit-scrollbar {
  width: 6px;
}
main::-webkit-scrollbar-track {
  background: transparent;
}
main::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.3);
  border-radius: 10px;
}
main::-webkit-scrollbar-thumb:hover {
  background: rgba(52, 211, 153, 0.2);
}
</style>
