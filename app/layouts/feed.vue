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

const sidebarCollapsed = ref(false)

onMounted(() => {
  if (authStore.isAuthenticated && tournamentStore.followedTournaments.length === 0) {
    tournamentStore.fetchFollowedTournaments()
  }
})

const navLinks = computed(() => {
  const links : any[] = [
    { label: 'Feed', icon: 'i-heroicons-home', to: toMain('/') },
    { label: 'Explore', icon: 'i-heroicons-magnifying-glass', to: toMain('/explore') },
    { label: 'Following', icon: 'i-heroicons-heart', to: toMain('/following') },
  ]
  if (isAuthenticated.value) {
    links.push({ label: 'Dashboard', icon: 'i-heroicons-squares-2x2', to: toManage('/'), external: true, target: '_blank' })
  }
  return links
})

const profileMenuItems = computed(() => {
  const items: any[][] = [
    [{
      label: user.value?.name ? user.value.name.trim().split(/\s+/)[0] : 'Guest',
      avatar: user.value?.picture ? { src: user.value.picture } : { text: user.value?.name?.charAt(0).toUpperCase() || 'G' },
      type: 'label',
      disabled: true
    }],
    [{ label: 'Profile', icon: 'i-heroicons-user', to: '/profile' }, { label: 'My Teams', icon: 'i-heroicons-user-group', to: '/teams' }],
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

const themeIcon = computed(() => {
  switch (colorMode.value) {
    case 'light': return 'i-heroicons-sun'
    case 'dark': return 'i-heroicons-moon'
    default: return 'i-heroicons-computer-desktop'
  }
})

const themeOptions = [
  { label: 'Light', icon: 'i-heroicons-sun', onSelect: () => setTheme('light') },
  { label: 'Dark', icon: 'i-heroicons-moon', onSelect: () => setTheme('dark') },
  { label: 'System', icon: 'i-heroicons-computer-desktop', onSelect: () => setTheme('system') }
]
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 font-sans flex overflow-hidden selection:bg-emerald-500/30">
    <AuthLoadingOverlay :show="authLoading" />

    <!-- Left Sidebar (Desktop) -->
    <aside 
      :class="[sidebarCollapsed ? 'w-20 p-4' : 'w-72 p-6']"
      class="hidden lg:flex flex-col border-r border-gray-200 dark:border-white/[0.05] bg-white dark:bg-[#050505] h-screen overflow-y-auto hide-scrollbar shrink-0 transition-all duration-300 ease-in-out relative"
    >
      <div 
        class="flex items-center mb-8"
        :class="sidebarCollapsed ? 'flex-col gap-4' : 'justify-between'"
      >
        <NuxtLink to="/" class="flex items-center group overflow-hidden transition-all duration-300">
          <img src="https://res.cloudinary.com/djsnerfzp/image/upload/q_auto/f_auto/v1776229862/Screenshot_2026-04-15_060233_wexzxq.png" alt="ParaScores" :class="sidebarCollapsed ? 'h-6' : 'h-9'" class="w-auto object-contain" />
        </NuxtLink>
        <UButton 
          :icon="sidebarCollapsed ? 'i-heroicons-chevron-right' : 'i-heroicons-chevron-left'" 
          variant="ghost" 
          color="neutral" 
          size="sm"
          class="hover:bg-gray-100 dark:hover:bg-white/10 shrink-0"
          @click="sidebarCollapsed = !sidebarCollapsed" 
        />
      </div>

      <!-- Followed Tournaments Card -->
      <div class="bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.05] rounded-2xl flex-1 overflow-hidden flex flex-col min-h-0">
        <div 
          v-if="!sidebarCollapsed"
          class="p-4 border-b border-gray-200 dark:border-white/[0.05] bg-gray-100 dark:bg-[#080808]"
        >
           <h3 class="font-bold text-sm text-gray-900 dark:text-gray-300">Followed Tournaments</h3>
        </div>
        <div v-else class="p-3 border-b border-gray-200 dark:border-white/[0.05] flex justify-center">
           <UIcon name="i-heroicons-heart" class="w-5 h-5 text-emerald-500" />
        </div>
        
        <div class="flex-1 overflow-y-auto p-2 space-y-1 hide-scrollbar">
          <div v-if="tournamentStore.followedLoading" class="p-4 space-y-3">
             <div v-for="i in 3" :key="i" class="h-8 bg-white/5 rounded-lg animate-pulse"></div>
          </div>
          <div v-else-if="tournamentStore.followedTournaments.length === 0" 
               class="text-center"
               :class="sidebarCollapsed ? 'hidden' : 'p-6 mt-4'">
             <p class="text-xs text-gray-500 leading-relaxed">
               You aren't following any tournaments.
             </p>
          </div>
          <template v-else>
            <UTooltip 
              v-for="t in tournamentStore.followedTournaments"
              :key="t.id"
              :text="t.name"
              :content="{ side: 'right' }"
              :disabled="!sidebarCollapsed"
            >
              <NuxtLink
                :to="toTournament(t as any)"
                class="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-white/5 transition-colors group"
                :class="sidebarCollapsed ? 'justify-center' : ''"
              >
                <UAvatar :src="t.logoUrl || t.bannerUrl || undefined" :alt="t.name" size="sm" class="shrink-0 bg-gray-200 dark:bg-white/5" />
                <span v-if="!sidebarCollapsed" class="text-sm font-bold text-gray-600 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white truncate">
                  {{ t.name }}
                </span>
              </NuxtLink>
            </UTooltip>
          </template>
        </div>
      </div>

    </aside>

    <!-- Main Wrapper -->
    <div class="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-[#0a0a0a] relative">
      <!-- Top Bar -->
      <header class="h-14 border-b border-gray-200 dark:border-white/[0.05] bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl px-8 flex items-center justify-between sticky top-0 z-40">
        <div class="flex items-center gap-6 flex-1">
          <NuxtLink to="/" class="flex items-center gap-2 group shrink-0">
            <img src="https://res.cloudinary.com/djsnerfzp/image/upload/q_auto/f_auto/v1776229862/Screenshot_2026-04-15_060233_wexzxq.png" alt="ParaScores" class="h-7 w-auto object-contain" />
            <span class="font-black text-lg tracking-tighter text-gray-900 dark:text-white group-hover:text-emerald-500 transition-colors inline-block">ParaScores</span>
          </NuxtLink>
        </div>

        <div class="flex items-center gap-2">
           <!-- Theme Toggle (Visible to everyone) -->
           <UDropdownMenu :items="[themeOptions]" :content="{ align: 'end', side: 'bottom', sideOffset: 8 }">
             <UButton 
               variant="ghost" 
               color="neutral" 
               size="sm"
               :icon="themeIcon"
               class="rounded-xl"
             />
           </UDropdownMenu>

           <!-- User Profile -->
           <div>
             <div v-if="isAuthenticated" class="flex items-center">
               <UDropdownMenu :items="profileMenuItems" :content="{ align: 'end', side: 'bottom', sideOffset: 8 }">
                 <div>
                   <UAvatar 
                     v-if="user?.picture" 
                     :src="user.picture" 
                     size="sm" 
                     class="shrink-0 cursor-pointer"
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
      <nav class="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-gray-200 dark:border-white/[0.05] flex items-center z-50">
        <NuxtLink 
          v-for="link in navLinks" 
          :key="link.to" 
          :to="link.to"
          class="flex-1 flex flex-col items-center justify-center gap-1 h-full transition-colors min-w-0"
          :class="route.path === link.to ? 'text-emerald-400' : 'text-gray-500 hover:text-emerald-400/80'"
        >
          <UIcon :name="link.icon" class="w-6 h-6" />
          <span class="text-[10px] font-bold uppercase tracking-widest truncate max-w-full px-1">{{ link.label.split(' ')[0] }}</span>
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
