<script setup lang="ts">
import { storeToRefs } from 'pinia'

const route = useRoute()
const authStore = useAuthStore()
const { user } = storeToRefs(authStore)

const router = useRouter()

const handleLogout = async () => {
  await authStore.logout()
  const protocol = import.meta.dev ? 'http' : 'https'
  const host = window.location.host
  const rootHost = host.replace(/^(manage\.|admin\.|www\.)+/i, '')
  window.location.href = `${protocol}://${rootHost}/login`
}

const navLinks = [
  { label: 'Overview', icon: 'i-heroicons-squares-2x2', to: '/' },
  { label: 'Users', icon: 'i-heroicons-users', to: '/users' },
  { label: 'Tournaments', icon: 'i-heroicons-trophy', to: '/tournaments' },
  { label: 'Organizations', icon: 'i-heroicons-building-office-2', to: '/organizations' },
  { label: 'Payments', icon: 'i-heroicons-credit-card', to: '/payments' },
  { label: 'Pending Players', icon: 'i-heroicons-user-group', to: '/players' },
  { label: 'System Health', icon: 'i-heroicons-cpu-chip', to: '/health' },
]

const colorMode = useColorMode()

const setTheme = (theme: 'light' | 'dark' | 'system') => {
  colorMode.preference = theme
}

const profileMenuItems = computed(() => [
  [{
    label: authStore.user?.name ? authStore.user.name.trim().split(/\s+/)[0] : 'Admin',
    avatar: authStore.user?.picture ? { src: authStore.user.picture } : { text: authStore.user?.name?.charAt(0).toUpperCase() || 'A' },
    type: 'label',
    slot: 'account',
    disabled: true
  }],
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

const isMobileMenuOpen = ref(false)
</script>

<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans antialiased selection:bg-rose-500 selection:text-white">
    <!-- Top banner / visual distinction -->
    <div class="h-1 bg-gradient-to-r from-rose-600 via-red-500 to-orange-500 w-full"></div>

    <div class="flex flex-1 overflow-hidden h-[calc(100vh-4px)]">
      <!-- Desktop Sidebar -->
      <aside class="hidden md:flex flex-col w-64 bg-slate-950 border-r border-slate-800 p-4 shrink-0 justify-between">
        <div class="space-y-6">
          <!-- Logo / Branding -->
          <div class="flex items-center gap-3 px-2 py-1.5">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center shadow-lg shadow-rose-900/50 shrink-0">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white">
                <rect x="2" y="6" width="20" height="12" rx="3" stroke="currentColor" stroke-width="2"/>
                <circle cx="8" cy="12" r="2" fill="currentColor"/>
                <circle cx="16" cy="12" r="2" fill="currentColor"/>
                <path d="M12 9V15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="flex flex-col">
              <span class="font-extrabold text-white text-base tracking-tight leading-none">ParaScores</span>
              <span class="text-[10px] text-rose-500 font-semibold tracking-widest uppercase mt-0.5">Super Admin</span>
            </div>
          </div>

          <!-- Navigation Links -->
          <nav class="space-y-1">
            <NuxtLink
              v-for="link in navLinks"
              :key="link.to"
              :to="link.to"
              class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group"
              :class="[
                route.path === link.to || (link.to !== '/' && route.path.startsWith(link.to))
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              ]"
            >
              <UIcon
                :name="link.icon"
                class="w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-110"
                :class="route.path === link.to || (link.to !== '/' && route.path.startsWith(link.to)) ? 'text-white' : 'text-slate-500 group-hover:text-rose-500'"
              />
              <span>{{ link.label }}</span>
            </NuxtLink>
          </nav>
        </div>

        <!-- User / Settings Dropdown -->
        <div class="border-t border-slate-800 pt-4 mt-auto">
          <UDropdownMenu :items="profileMenuItems" :content="{ align: 'start', side: 'top', sideOffset: 8 }" class="w-full">
            <button class="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-900 transition-colors text-left group">
              <div class="flex items-center gap-3">
                <UAvatar
                  v-if="user?.picture"
                  :src="user?.picture"
                  size="sm"
                  class="ring-2 ring-rose-500/20 group-hover:ring-rose-500 transition-all"
                />
                <UAvatar
                  v-else
                  :text="user?.name?.charAt(0).toUpperCase() || 'A'"
                  size="sm"
                  class="ring-2 ring-rose-500/20 group-hover:ring-rose-500 transition-all bg-rose-950 text-rose-500 font-bold"
                />
                <div class="flex flex-col truncate max-w-[120px]">
                  <span class="text-sm font-bold text-white truncate leading-none mb-1">{{ user?.name || 'Admin User' }}</span>
                  <span class="text-[10px] text-slate-500 truncate leading-none">Super Admin</span>
                </div>
              </div>
              <UIcon name="i-heroicons-ellipsis-vertical" class="w-5 h-5 text-slate-500 group-hover:text-slate-300" />
            </button>
          </UDropdownMenu>
        </div>
      </aside>

      <!-- Main Area -->
      <div class="flex-1 flex flex-col min-w-0 bg-slate-900">
        <!-- Top bar (Mobile toggle & page title) -->
        <header class="md:hidden flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white">
                <rect x="2" y="6" width="20" height="12" rx="3" stroke="currentColor" stroke-width="2"/>
                <circle cx="8" cy="12" r="2" fill="currentColor"/>
                <circle cx="16" cy="12" r="2" fill="currentColor"/>
                <path d="M12 9V15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="flex flex-col">
              <span class="font-extrabold text-white text-sm leading-none">ParaScores</span>
              <span class="text-[8px] text-rose-500 font-bold uppercase tracking-wider mt-0.5">Admin</span>
            </div>
          </div>

          <UButton
            variant="ghost"
            color="neutral"
            size="sm"
            @click="isMobileMenuOpen = !isMobileMenuOpen;"
          >
            <UIcon :name="isMobileMenuOpen ? 'i-heroicons-x-mark' : 'i-heroicons-bars-3'" class="w-6 h-6 text-white" />
          </UButton>
        </header>

        <!-- Mobile Drawer -->
        <Transition
          enter-active-class="transition-opacity duration-200"
          leave-active-class="transition-opacity duration-200"
        >
          <div v-show="isMobileMenuOpen" class="md:hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm" @click="isMobileMenuOpen = false"></div>
        </Transition>

        <Transition
          enter-active-class="transition duration-300 ease-out transform"
          enter-from-class="-translate-x-full"
          enter-to-class="translate-x-0"
          leave-active-class="transition duration-200 ease-in transform"
          leave-from-class="translate-x-0"
          leave-to-class="-translate-x-full"
        >
          <div v-show="isMobileMenuOpen" class="md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 border-r border-slate-800 p-4 flex flex-col justify-between">
            <div class="space-y-6">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white">
                      <rect x="2" y="6" width="20" height="12" rx="3" stroke="currentColor" stroke-width="2"/>
                      <circle cx="8" cy="12" r="2" fill="currentColor"/>
                      <circle cx="16" cy="12" r="2" fill="currentColor"/>
                      <path d="M12 9V15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                  </div>
                  <span class="font-extrabold text-white text-sm">ParaScores Admin</span>
                </div>
                <UButton
                  variant="ghost"
                  color="neutral"
                  size="sm"
                  @click="isMobileMenuOpen = false;"
                >
                  <UIcon name="i-heroicons-x-mark" class="w-5 h-5 text-slate-400" />
                </UButton>
              </div>

              <nav class="space-y-1">
                <NuxtLink
                  v-for="link in navLinks"
                  :key="link.to"
                  :to="link.to"
                  class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                  :class="[
                    route.path === link.to || (link.to !== '/' && route.path.startsWith(link.to))
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                  ]"
                  @click="isMobileMenuOpen = false"
                >
                  <UIcon :name="link.icon" class="w-5 h-5 shrink-0" />
                  <span>{{ link.label }}</span>
                </NuxtLink>
              </nav>
            </div>

            <!-- Profile Info -->
            <div class="border-t border-slate-800 pt-4 mt-auto">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                  <UAvatar
                    v-if="user?.picture"
                    :src="user?.picture"
                    size="sm"
                  />
                  <UAvatar
                    v-else
                    :text="user?.name?.charAt(0).toUpperCase() || 'A'"
                    size="sm"
                    class="bg-rose-950 text-rose-500 font-bold"
                  />
                  <div class="flex flex-col truncate max-w-[120px]">
                    <span class="text-sm font-bold text-white truncate leading-none mb-1">{{ user?.name || 'Admin User' }}</span>
                    <span class="text-[10px] text-slate-500">Super Admin</span>
                  </div>
                </div>
              </div>
              <UButton
                block
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-heroicons-arrow-right-on-rectangle"
                @click="handleLogout"
              >
                Log Out
              </UButton>
            </div>
          </div>
        </Transition>

        <!-- Main Content Area -->
        <main class="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth select-none">
          <slot />
        </main>
      </div>
    </div>
  </div>
</template>
