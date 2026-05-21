<script setup lang="ts">
import { storeToRefs } from 'pinia'

const route = useRoute()
const authStore = useAuthStore()
const { authLoading } = storeToRefs(authStore)
const tournamentStore = useTournamentStore()
const { tournaments } = storeToRefs(tournamentStore)

// Fetch tournaments on mount
onMounted(async () => {
  if (authStore.user) {
    await tournamentStore.fetchTournaments({ limit: 50 })
  }
})

const config = useRuntimeConfig()
const frontendUrl = config.public.FRONT_END_URL

// Mobile links (Keep simple)
const mobileLinks = [
  { label: 'Home', icon: 'i-heroicons-home', to: '/' },
  { label: 'Organizations', icon: 'i-heroicons-building-office', to: '/organizations' },
  { label: 'Live', icon: 'i-heroicons-signal', to: '/live', activeClass: 'text-red-500 animate-pulse' },
  { label: 'Fan Portal', icon: 'i-heroicons-globe-alt', to: `${frontendUrl}/`, external: true, target: '_blank' }
]

// Desktop Sidebar links (Dynamic)
const sidebarLinks = computed(() => {
  const base = [{ label: 'Home', icon: 'i-heroicons-home', to: '/', avatar: undefined, activeClass: undefined }]
  
  const tourneys = tournaments.value.map(t => ({
    label: t.name,
    to: `/tournaments/${t.customName || t.id}`,
    icon: 'i-heroicons-trophy',
    avatar: t.logoUrl,
    activeClass: undefined
  }))

  return [
    ...base,
    ...tourneys,
    { label: 'Live', icon: 'i-heroicons-signal', to: '/live', activeClass: 'text-red-500 animate-pulse', avatar: undefined },
    { label: 'Fan Portal', icon: 'i-heroicons-globe-alt', to: `${frontendUrl}/`, external: true, target: '_blank', avatar: undefined }
  ]
})

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
  [{ label: 'My profile', icon: 'i-heroicons-user-circle', to: '/profile' },
   { label: 'Billing', icon: 'i-heroicons-credit-card', to: '/billing' }],
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
  navigateTo(`${frontendUrl}/`, { external: true })
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 font-sans selection:bg-indigo-500/30">
    <AuthLoadingOverlay :show="authLoading" />
    
    <!-- Desktop Layout -->
    <div class="hidden md:flex h-screen overflow-hidden p-4 gap-4">

      <!-- Desktop Sidebar -->
      <nav class="flex flex-col w-16 bg-white/80 dark:bg-white/5 dark:backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl shadow-xl py-4 items-center z-50">
        
        <div class="w-10 h-10 flex-shrink-0 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-6">
           <UIcon name="i-heroicons-bolt-20-solid" class="w-6 h-6 text-white" />
        </div>

        <!-- Organization Switcher -->
        <div class="flex flex-col gap-4 py-2 w-full px-2 border-b border-gray-100 dark:border-white/10 mb-6 pb-6">
          <UTooltip 
            v-for="orgMember in authStore.organizations" 
            :key="orgMember.organizationId" 
            :text="orgMember.organization?.name"
            :content="{ side: 'right' }"
          >
            <button
              @click="authStore.setActiveOrganization(orgMember.organizationId)"
              class="relative group flex-shrink-0 flex items-center justify-center h-10 w-10 mx-auto rounded-xl transition-all duration-300 overflow-hidden ring-2"
              :class="[
                authStore.activeOrganizationId === orgMember.organizationId
                  ? 'ring-indigo-500 scale-110 shadow-lg shadow-indigo-500/20' 
                  : 'ring-transparent hover:ring-gray-300 dark:hover:ring-white/20'
              ]"
            >
              <UAvatar 
                v-if="orgMember.organization?.logoUrl" 
                :src="orgMember.organization.logoUrl" 
                size="sm" 
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-xs font-bold uppercase text-gray-500">
                {{ orgMember.organization?.name?.charAt(0) }}
              </div>
            </button>
          </UTooltip>

          <!-- Manage Organizations Button -->
          <UTooltip text="Manage Organizations" :content="{ side: 'right' }">
            <NuxtLink
              to="/organizations"
              class="relative group flex-shrink-0 flex items-center justify-center h-10 w-10 mx-auto rounded-xl border border-gray-200 dark:border-white/10 text-gray-400 hover:border-indigo-500 hover:text-indigo-500 hover:bg-white dark:hover:bg-white/5 transition-all"
              :class="{ 'border-indigo-500 text-indigo-500 bg-white dark:bg-white/5': route.path === '/organizations' }"
            >
              <UIcon name="i-heroicons-building-office" class="w-5 h-5" />
            </NuxtLink>
          </UTooltip>

          <!-- Create Organization Button -->
          <UTooltip text="New Organization" :content="{ side: 'right' }">
            <NuxtLink
              to="/onboarding"
              class="relative group flex-shrink-0 flex items-center justify-center h-10 w-10 mx-auto rounded-xl border-2 border-dashed border-gray-200 dark:border-white/10 text-gray-400 hover:border-indigo-500 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all"
            >
              <UIcon name="i-heroicons-plus" class="w-5 h-5" />
            </NuxtLink>
          </UTooltip>
        </div>

        <div class="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar w-full px-2 flex flex-col gap-4">
           <!-- Add Tournament Button -->
          <UTooltip text="New Tournament" :content="{ side: 'right' }">
            <NuxtLink
              to="/tournaments/new"
              class="relative group flex-shrink-0 flex items-center justify-center py-2 h-10 w-10 mx-auto rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-green-500 transition-all"
            >
              <UIcon name="i-heroicons-plus-circle" class="w-6 h-6" />
            </NuxtLink>
          </UTooltip>
          <UTooltip 
            v-for="link in sidebarLinks" 
            :key="link.to" 
            :text="link.label"
            :content="{ side: 'right' }"
          >
            <NuxtLink 
              :to="link.to"
              class="relative group flex-shrink-0 flex items-center justify-center py-2 h-10 w-10 mx-auto rounded-xl transition-all duration-300"
              :class="[
                route.path === link.to || (link.to !== '/' && route.path.startsWith(link.to))
                  ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30' 
                  : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-indigo-500'
              ]"
            >
              <UAvatar 
                v-if="link.avatar" 
                :src="link.avatar" 
                size="xs" 
                class="w-6 h-6 ring-1 ring-white/20"
                :class="route.path.startsWith(link.to) ? 'ring-2 ring-white' : ''"
              />
              <UIcon v-else :name="link.icon" class="w-6 h-6" />
            </NuxtLink>
          </UTooltip>

         
        </div>

        <div class="mt-4 flex-shrink-0">
          <UDropdownMenu :items="profileMenuItems">
            <UAvatar v-if="authStore.user?.picture" :src="authStore.user?.picture" size="sm" class="cursor-pointer ring-2 ring-transparent hover:ring-indigo-500 transition-all" />
            <UAvatar v-else :text="authStore.user?.name?.charAt(0).toUpperCase()" size="sm" class="cursor-pointer ring-2 ring-transparent hover:ring-indigo-500 transition-all" />
          </UDropdownMenu>
        </div>
      </nav>

      <!-- Desktop Main Content -->
      <main class="flex-1 flex flex-col relative h-full rounded-3xl overflow-hidden bg-white/50 dark:bg-white/5 dark:backdrop-blur-md border border-gray-200 dark:border-white/10 shadow-sm">
        <!-- Dashboard Top Header -->
        <header class="hidden md:flex items-center justify-between px-8 py-4 border-b border-gray-200 dark:border-white/10 bg-white/30 dark:bg-transparent">
          <div class="flex items-center gap-3">
            <template v-if="authStore.currentOrganization">
              <UAvatar 
                v-if="authStore.currentOrganization.logoUrl" 
                :src="authStore.currentOrganization.logoUrl" 
                size="xs" 
                class="rounded-md"
              />
              <div v-else class="w-6 h-6 rounded bg-indigo-500/10 flex items-center justify-center text-[10px] font-bold text-indigo-500">
                {{ authStore.currentOrganization.name?.charAt(0) }}
              </div>
              <span class="font-bold text-gray-800 dark:text-white">
                {{ authStore.currentOrganization.name }}
              </span>
            </template>
            <div v-else class="flex items-center">
              <img src="https://res.cloudinary.com/djsnerfzp/image/upload/q_auto/f_auto/v1776229862/Screenshot_2026-04-15_060233_wexzxq.png" alt="ParaScores" class="h-7 w-auto object-contain" />
            </div>
          </div>
        </header>

        <div class="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
           <slot />
        </div>
      </main>

    </div>

    <!-- Mobile Layout -->
    <div class="md:hidden flex flex-col h-screen">
      
      <!-- Mobile Header -->
      <header class="flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-black/80 dark:backdrop-blur-xl border-b border-gray-200 dark:border-white/10 z-40">
        <div class="flex items-center gap-3">
          <template v-if="authStore.currentOrganization">
            <UAvatar 
              v-if="authStore.currentOrganization.logoUrl" 
              :src="authStore.currentOrganization.logoUrl" 
              size="xs" 
              class="rounded-md"
            />
            <div v-else class="w-6 h-6 rounded bg-indigo-500/10 flex items-center justify-center text-[10px] font-bold text-indigo-500">
              {{ authStore.currentOrganization.name?.charAt(0) }}
            </div>
            <span class="font-bold text-sm tracking-tight truncate max-w-[150px]">
              {{ authStore.currentOrganization.name }}
            </span>
          </template>
          <div v-else class="flex items-center">
            <img src="https://res.cloudinary.com/djsnerfzp/image/upload/q_auto/f_auto/v1776229862/Screenshot_2026-04-15_060233_wexzxq.png" alt="ParaScores" class="h-8 w-auto object-contain" />
          </div>
        </div>
        <UDropdownMenu :items="profileMenuItems">
          <UAvatar v-if="authStore.user?.picture" :src="authStore.user?.picture" size="sm" class="cursor-pointer ring-2 ring-transparent hover:ring-indigo-500 transition-all" />
          <UAvatar v-else :text="authStore.user?.name?.charAt(0).toUpperCase()" size="sm" class="cursor-pointer ring-2 ring-transparent hover:ring-indigo-500 transition-all" />
        </UDropdownMenu>
      </header>

      <!-- Mobile Main Content -->
      <main class="flex-1 overflow-y-auto p-4 pb-24 scroll-smooth bg-gray-50 dark:bg-black">
        <slot />
      </main>

      <!-- Mobile Bottom Navigation -->
      <nav class="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-black/80 dark:backdrop-blur-xl border-t border-gray-200 dark:border-white/10 px-2 py-2 z-50 safe-area-pb">
        <div class="flex items-center justify-around">
          <NuxtLink 
            v-for="link in mobileLinks" 
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