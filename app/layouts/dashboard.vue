<script setup lang="ts">
/**
 * Dashboard shell — redesigned sidebar + topbar (see parascores-designs/ui/dashboard/REDESIGN.md).
 * Canonical layout for organizer dashboard (/manage).
 */
import { storeToRefs } from 'pinia'

const route = useRoute()
const authStore = useAuthStore()
const { authLoading } = storeToRefs(authStore)
const tournamentStore = useTournamentStore()
const { tournaments, totalCount } = storeToRefs(tournamentStore)
const fixtureStore = useFixtureStore()
const { liveFixtures } = storeToRefs(fixtureStore)
const { frontendUrl } = useHost()

onMounted(async () => {
  if (authStore.user) {
    await tournamentStore.fetchTournaments({ limit: 50 })
    await fixtureStore.fetchLiveFixtures(authStore.activeOrganizationId || undefined)
  }
})

// Refresh live badge when switching orgs
watch(() => authStore.activeOrganizationId, async (orgId) => {
  if (orgId) await fixtureStore.fetchLiveFixtures(orgId)
})

const liveCount = computed(() => liveFixtures.value.length)
const liveTournamentIds = computed(() => new Set(liveFixtures.value.map(f => f.tournament_id)))

const isTodayOrAfter = (date: string | Date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d.getTime() >= today.getTime()
}

const tournamentStatus = (t: any) => {
  if (liveTournamentIds.value.has(t.id)) return 'live'
  if (isTodayOrAfter(t.end_date)) return 'ongoing'
  return 'done'
}

const sideTournaments = computed(() => {
  return [...tournaments.value]
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    .slice(0, 8)
})

// ---------- Primary nav ----------
const mainNav = computed(() => [
  { label: 'Overview', icon: 'i-heroicons-home', to: '/', exact: true },
  { label: 'Tournaments', icon: 'i-heroicons-trophy', to: '/tournaments', badge: totalCount.value || undefined },
  { label: 'Live Control', icon: 'i-heroicons-signal', to: '/live', live: true, badge: liveCount.value || undefined },
  { label: 'Widgets', icon: 'i-heroicons-squares-2x2', to: '/widgets' },
  { label: 'Organizations', icon: 'i-heroicons-building-office', to: '/organizations' },
])

const isActive = (link: any) => {
  if (link.exact) return route.path === link.to
  return route.path === link.to || route.path.startsWith(link.to + '/')
}

// ---------- Topbar ----------
const pageTitle = computed(() => {
  if (route.path === '/') return 'Overview'
  if (route.path === '/tournaments') return 'Tournaments'
  if (route.path.startsWith('/live')) return 'Live Control'
  if (route.path.startsWith('/widgets')) return 'Widgets'
  if (route.path.startsWith('/organizations')) return 'Organizations'
  if (route.path.startsWith('/billing')) return 'Billing & plan'
  if (route.path.startsWith('/tournaments/new')) return 'New tournament'
  if (route.path.endsWith('/graphics')) return 'Graphics Generator'
  if (route.path.startsWith('/tournaments/')) {
    const active = tournaments.value.find(t => route.path === `/tournaments/${t.customName || t.id}`)
    return active?.name || 'Tournament'
  }
  if (route.path.startsWith('/profile')) return 'My profile'
  return 'Dashboard'
})

const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

const colorMode = useColorMode()
const toggleTheme = () => {
  colorMode.preference = colorMode.preference === 'dark' ? 'light' : 'dark'
}

// ---------- Mobile ----------
const mobileMenuOpen = ref(false)

// Close the drawer on any navigation
watch(() => route.fullPath, () => { mobileMenuOpen.value = false })

const mobileLinks = computed(() => [
  { label: 'Overview', icon: 'i-heroicons-home', to: '/' },
  { label: 'Tournaments', icon: 'i-heroicons-trophy', to: '/tournaments' },
  { label: 'Live', icon: 'i-heroicons-signal', to: '/live', live: true }
])

// ---------- Menus (same behavior as dashboard.vue) ----------
const setTheme = (theme: 'light' | 'dark' | 'system') => {
  colorMode.preference = theme
}

const profileMenuItems = computed(() => [
  [{
    label: authStore.user?.name ? authStore.user.name.trim().split(/\s+/)[0] : 'User',
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
      { label: 'Light', icon: colorMode.preference === 'light' ? 'i-heroicons-check' : 'i-heroicons-sun', onSelect: () => setTheme('light'), active: colorMode.preference === 'light' },
      { label: 'Dark', icon: colorMode.preference === 'dark' ? 'i-heroicons-check' : 'i-heroicons-moon', onSelect: () => setTheme('dark'), active: colorMode.preference === 'dark' },
      { label: 'System', icon: colorMode.preference === 'system' ? 'i-heroicons-check' : 'i-heroicons-computer-desktop', onSelect: () => setTheme('system'), active: colorMode.preference === 'system' }
    ]
  }],
  [{ label: 'Log out', icon: 'i-heroicons-arrow-right-on-rectangle', onSelect: handleLogout }]
])

const orgMenuItems = computed(() => {
  return [
    authStore.organizations.map((orgMember) => ({
      label: orgMember.organization?.name || 'Organization',
      avatar: orgMember.organization?.logoUrl ? { src: orgMember.organization.logoUrl } : { text: orgMember.organization?.name?.charAt(0).toUpperCase() || 'O' },
      onSelect: () => authStore.setActiveOrganization(orgMember.organizationId),
      active: authStore.activeOrganizationId === orgMember.organizationId
    })),
    [
      { label: 'Manage Organizations', icon: 'i-heroicons-building-office', to: '/organizations' },
      { label: 'New Organization', icon: 'i-heroicons-plus', to: '/onboarding' }
    ]
  ]
})

const handleLogout = async () => {
  await authStore.logout()
  navigateTo(`${frontendUrl.value}/`, { external: true })
}
</script>

<template>
  <div class="min-h-screen bg-page text-heading font-sans">
    <AuthLoadingOverlay :show="authLoading" />

    <!-- ================= DESKTOP ================= -->
    <div class="hidden md:grid h-screen overflow-hidden" style="grid-template-columns: 244px 1fr;">

      <!-- Sidebar -->
      <aside class="flex flex-col h-full bg-default border-r border-subtle px-3.5 py-4">
        <!-- Brand -->
        <NuxtLink to="/" class="flex items-center gap-2.5 px-2 pb-4">
          <img src="https://res.cloudinary.com/djsnerfzp/image/upload/q_auto/f_auto/v1780327900/parascores-logo.png" alt="ParaScores" class="h-7 w-7 rounded-md object-contain" />
          <span class="font-extrabold tracking-wider text-sm text-heading">PARASCORES</span>
        </NuxtLink>

        <!-- Org switcher -->
        <template v-if="authStore.currentOrganization">
          <UDropdownMenu :items="orgMenuItems" :content="{ align: 'start', side: 'bottom', sideOffset: 8 }" :ui="{ content: 'w-72' }">
            <button class="w-full flex items-center gap-2.5 px-2.5 py-2 mb-4 rounded-xl bg-surface border border-subtle hover:border-white/[0.14] hover:bg-white/[0.04] transition-all text-left group">
              <UAvatar v-if="authStore.currentOrganization.logoUrl" :src="authStore.currentOrganization.logoUrl" size="xs" class="rounded-md" />
              <span v-else class="w-6.5 h-6.5 min-w-6.5 rounded-lg bg-[#136332] text-white text-[11px] font-extrabold flex items-center justify-center">
                {{ authStore.currentOrganization.name?.charAt(0).toUpperCase() }}
              </span>
              <span class="text-[13px] font-semibold text-heading leading-tight truncate">{{ authStore.currentOrganization.name }}</span>
              <UIcon name="i-heroicons-chevron-down" class="w-3.5 h-3.5 ml-auto text-muted group-hover:text-body transition-colors shrink-0" />
            </button>
          </UDropdownMenu>
        </template>

        <!-- Primary nav -->
        <p class="px-2 pb-1.5 text-[10px] font-bold tracking-[0.14em] text-muted">MANAGE</p>
        <nav class="flex flex-col gap-0.5">
          <NuxtLink
            v-for="link in mainNav"
            :key="link.to"
            :to="link.to"
            class="relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13.5px] font-medium transition-all"
            :class="isActive(link)
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-body hover:text-heading hover:bg-black/5 dark:hover:bg-white/5'"
          >
            <span
              v-if="isActive(link)"
              class="absolute -left-3.5 top-2 bottom-2 w-[3px] rounded-r bg-emerald-500"
            ></span>
            <span v-if="link.live" class="w-[18px] h-[18px] flex items-center justify-center shrink-0">
              <span class="w-[7px] h-[7px] rounded-full bg-red-500" :class="liveCount > 0 ? 'animate-pulse' : 'opacity-60'"></span>
            </span>
            <UIcon v-else :name="link.icon" class="w-[18px] h-[18px] shrink-0 opacity-90" />
            {{ link.label }}
            <span
              v-if="link.badge"
              class="ml-auto font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              :class="link.live
                ? 'bg-red-500/15 text-red-500 border border-red-500/40'
                : 'bg-black/5 dark:bg-white/[0.07] text-body'"
            >{{ link.live ? `${link.badge} LIVE` : link.badge }}</span>
          </NuxtLink>
        </nav>

        <!-- My tournaments -->
        <p class="px-2 pt-4 pb-1.5 text-[10px] font-bold tracking-[0.14em] text-muted">MY TOURNAMENTS</p>
        <div class="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-0.5 min-h-0">
          <NuxtLink
            v-for="t in sideTournaments"
            :key="t.id"
            :to="`/tournaments/${t.customName || t.id}`"
            class="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] text-body hover:text-heading hover:bg-black/5 dark:hover:bg-white/5 transition-all group"
          >
            <UAvatar v-if="t.logoUrl" :src="t.logoUrl" size="xs" class="rounded-md" />
            <span v-else class="w-6 h-6 min-w-6 rounded-md bg-[#136332] text-white text-[10px] font-extrabold flex items-center justify-center">
              {{ t.name.split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() }}
            </span>
            <span class="truncate">{{ t.name }}</span>
            <span
              class="ml-auto w-[7px] h-[7px] rounded-full shrink-0"
              :class="{
                'bg-red-500 animate-pulse': tournamentStatus(t) === 'live',
                'bg-emerald-400': tournamentStatus(t) === 'ongoing',
                'bg-gray-500': tournamentStatus(t) === 'done',
              }"
            ></span>
          </NuxtLink>
        </div>

        <!-- Sidebar footer -->
        <div class="pt-3 mt-2 border-t border-subtle flex flex-col gap-0.5">
          <NuxtLink
            to="/billing"
            class="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13.5px] font-medium text-body hover:text-heading hover:bg-black/5 dark:hover:bg-white/5 transition-all"
            :class="{ 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400': route.path.startsWith('/billing') }"
          >
            <UIcon name="i-heroicons-sparkles" class="w-[18px] h-[18px] opacity-90" />
            Billing &amp; plan
          </NuxtLink>

          <NuxtLink
            to="/profile"
            class="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13.5px] font-medium text-body hover:text-heading hover:bg-black/5 dark:hover:bg-white/5 transition-all"
            :class="{ 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400': route.path.startsWith('/profile') }"
          >
            <UIcon name="i-heroicons-cog-6-tooth" class="w-[18px] h-[18px] opacity-90" />
            Settings
          </NuxtLink>

          <UDropdownMenu :items="profileMenuItems" :content="{ align: 'start', side: 'top', sideOffset: 8 }">
            <button class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all text-left">
              <UAvatar v-if="authStore.user?.picture" :src="authStore.user.picture" size="sm" />
              <UAvatar v-else :text="authStore.user?.name?.charAt(0).toUpperCase()" size="sm" />
              <span class="min-w-0">
                <span class="block text-[13px] font-semibold text-heading truncate">{{ authStore.user?.name || 'Account' }}</span>
                <span class="block text-[11px] text-muted truncate">Owner</span>
              </span>
            </button>
          </UDropdownMenu>
        </div>
      </aside>

      <!-- Main column -->
      <div class="flex flex-col min-w-0 min-h-0 h-full">
        <!-- Topbar -->
        <header class="flex items-center gap-4 px-7 py-3.5 border-b border-subtle bg-page/75 backdrop-blur-xl z-40">
          <h1 class="text-base font-bold text-heading">{{ pageTitle }}</h1>

          <button class="hidden lg:flex items-center gap-2 ml-2 flex-1 max-w-sm px-3 py-2 rounded-lg bg-surface border border-subtle text-muted text-[13px] hover:border-white/[0.14] transition-all text-left">
            <UIcon name="i-heroicons-magnifying-glass" class="w-4 h-4" />
            <span class="flex-1">Search tournaments, teams, players…</span>
            <kbd class="font-mono text-[10px] border border-subtle rounded px-1.5 py-0.5 bg-page">⌘K</kbd>
          </button>

          <div class="ml-auto flex items-center gap-3">
            <span class="hidden xl:block text-[12.5px] text-muted">{{ todayLabel }}</span>
            <button
              class="w-9 h-9 flex items-center justify-center rounded-lg border border-subtle text-body hover:text-heading hover:bg-black/5 dark:hover:bg-white/5 transition-all"
              :title="colorMode.preference === 'dark' ? 'Switch to light' : 'Switch to dark'"
              @click="toggleTheme"
            >
              <UIcon :name="colorMode.preference === 'dark' ? 'i-heroicons-sun' : 'i-heroicons-moon'" class="w-4.5 h-4.5" />
            </button>
            <UButton color="primary" icon="i-heroicons-plus" to="/tournaments/new" class="font-semibold">New tournament</UButton>
          </div>
        </header>

        <!-- Page content -->
        <main class="flex-1 min-h-0 overflow-y-auto scroll-smooth p-5 md:p-7 bg-page">
          <slot />
        </main>
      </div>
    </div>

    <!-- ================= MOBILE ================= -->
    <div class="md:hidden flex flex-col h-screen">
      <header class="flex items-center justify-between px-4 py-3 bg-page/95 backdrop-blur-xl border-b border-subtle z-40">
        <div class="flex items-center gap-2.5 min-w-0">
          <img src="https://res.cloudinary.com/djsnerfzp/image/upload/q_auto/f_auto/v1780327900/parascores-logo.png" alt="ParaScores" class="h-7 w-7 rounded-md object-contain shrink-0" />
          <span class="font-bold text-sm text-heading truncate">{{ pageTitle }}</span>
        </div>
        <UDropdownMenu :items="profileMenuItems">
          <UAvatar v-if="authStore.user?.picture" :src="authStore.user?.picture" size="sm" class="cursor-pointer" />
          <UAvatar v-else :text="authStore.user?.name?.charAt(0).toUpperCase()" size="sm" class="cursor-pointer" />
        </UDropdownMenu>
      </header>

      <main class="flex-1 overflow-y-auto p-4 pb-24 scroll-smooth bg-page">
        <slot />
      </main>

      <nav class="fixed bottom-0 left-0 right-0 bg-page/95 backdrop-blur-xl border-t border-subtle z-50 safe-area-pb">
        <div class="flex items-center h-16 w-full">
          <NuxtLink
            v-for="link in mobileLinks"
            :key="link.to"
            :to="link.to"
            class="flex-1 flex flex-col items-center justify-center h-full gap-1 transition-all min-w-0"
            :class="isActive(link) ? 'text-emerald-500' : 'text-muted hover:text-heading'"
          >
            <span class="relative">
              <UIcon :name="link.icon" class="w-6 h-6" />
              <span v-if="link.live && liveCount > 0" class="absolute -top-0.5 -right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            </span>
            <span class="text-[10px] font-semibold truncate max-w-full px-1">{{ link.label }}</span>
          </NuxtLink>
          <!-- Menu: opens the sidebar drawer -->
          <button
            type="button"
            class="flex-1 flex flex-col items-center justify-center h-full gap-1 transition-all min-w-0"
            :class="mobileMenuOpen ? 'text-emerald-500' : 'text-muted hover:text-heading'"
            aria-label="Open menu"
            :aria-expanded="mobileMenuOpen"
            @click="mobileMenuOpen = true"
          >
            <UIcon name="i-heroicons-bars-3" class="w-6 h-6" />
            <span class="text-[10px] font-semibold">Menu</span>
          </button>
        </div>
      </nav>

      <!-- Sidebar drawer (mobile) — carries the full desktop sidebar -->
      <USlideover
        v-model:open="mobileMenuOpen"
        side="left"
        title="Navigation menu"
        :ui="{ content: 'w-[280px] max-w-[85vw] p-0 flex flex-col bg-surface border-r border-subtle divide-none' }"
      >
        <template #content>
          <div class="flex flex-col h-full min-h-0">
            <!-- Brand + close -->
            <div class="flex items-center justify-between px-3.5 py-3 border-b border-subtle">
              <span class="flex items-center gap-2">
                <img src="https://res.cloudinary.com/djsnerfzp/image/upload/q_auto/f_auto/v1780327900/parascores-logo.png" alt="ParaScores" class="h-6 w-6 rounded-md object-contain" />
                <span class="font-extrabold tracking-wider text-[11px] text-heading">PARASCORES</span>
              </span>
              <UButton
                variant="ghost"
                color="neutral"
                icon="i-heroicons-x-mark"
                size="xs"
                aria-label="Close menu"
                @click="mobileMenuOpen = false"
              />
            </div>

            <div class="flex-1 overflow-y-auto no-scrollbar min-h-0">
              <!-- Org switcher -->
              <div v-if="authStore.currentOrganization" class="px-3 pt-3">
                <UDropdownMenu :items="orgMenuItems" :content="{ align: 'start', side: 'bottom', sideOffset: 6 }" :ui="{ content: 'w-64' }">
                  <button class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-subtle hover:border-white/[0.14] transition-all text-left">
                    <UAvatar v-if="authStore.currentOrganization.logoUrl" :src="authStore.currentOrganization.logoUrl" size="xs" class="rounded-md" />
                    <span v-else class="w-6 h-6 min-w-6 rounded-md bg-[#136332] text-white text-[10px] font-extrabold flex items-center justify-center">
                      {{ authStore.currentOrganization.name?.charAt(0).toUpperCase() }}
                    </span>
                    <span class="text-[12.5px] font-semibold text-heading truncate flex-1">{{ authStore.currentOrganization.name }}</span>
                    <UIcon name="i-heroicons-chevron-down" class="w-3.5 h-3.5 text-muted shrink-0" />
                  </button>
                </UDropdownMenu>
              </div>

              <!-- Primary nav -->
              <p class="px-4 pt-4 pb-1.5 text-[9px] font-bold tracking-[0.14em] text-muted">MANAGE</p>
              <nav class="flex flex-col gap-0.5 px-2">
                <NuxtLink
                  v-for="link in mainNav"
                  :key="link.to"
                  :to="link.to"
                  class="relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all"
                  :class="isActive(link)
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                    : 'text-body hover:text-heading hover:bg-black/5 dark:hover:bg-white/5'"
                >
                  <span v-if="isActive(link)" class="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-emerald-500"></span>
                  <span v-if="link.live" class="w-[17px] h-[17px] flex items-center justify-center shrink-0">
                    <span class="w-[7px] h-[7px] rounded-full bg-red-500" :class="liveCount > 0 ? 'animate-pulse' : 'opacity-60'"></span>
                  </span>
                  <UIcon v-else :name="link.icon" class="w-[17px] h-[17px] shrink-0 opacity-90" />
                  {{ link.label }}
                  <span
                    v-if="link.badge"
                    class="ml-auto font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    :class="link.live
                      ? 'bg-red-500/15 text-red-500 border border-red-500/40'
                      : 'bg-black/5 dark:bg-white/[0.07] text-body'"
                  >{{ link.live ? `${link.badge} LIVE` : link.badge }}</span>
                </NuxtLink>
                <!-- Fan Portal (external — moved out of the bottom nav) -->
                <a
                  :href="`${frontendUrl}/`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-body hover:text-heading hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                >
                  <UIcon name="i-heroicons-globe-alt" class="w-[17px] h-[17px] shrink-0 opacity-90" />
                  Fan Portal
                  <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-3 h-3 ml-auto text-muted" />
                </a>
              </nav>

              <!-- My tournaments -->
              <p class="px-4 pt-4 pb-1.5 text-[9px] font-bold tracking-[0.14em] text-muted">MY TOURNAMENTS</p>
              <div class="flex flex-col gap-0.5 px-2 pb-2">
                <NuxtLink
                  v-for="t in sideTournaments"
                  :key="t.id"
                  :to="`/tournaments/${t.customName || t.id}`"
                  class="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12.5px] text-body hover:text-heading hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                >
                  <UAvatar v-if="t.logoUrl" :src="t.logoUrl" size="xs" class="rounded-md" />
                  <span v-else class="w-5 h-5 min-w-5 rounded-md bg-[#136332] text-white text-[9px] font-extrabold flex items-center justify-center">
                    {{ t.name.split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() }}
                  </span>
                  <span class="truncate flex-1">{{ t.name }}</span>
                  <span
                    class="w-[7px] h-[7px] rounded-full shrink-0"
                    :class="{
                      'bg-red-500 animate-pulse': tournamentStatus(t) === 'live',
                      'bg-emerald-400': tournamentStatus(t) === 'ongoing',
                      'bg-gray-500': tournamentStatus(t) === 'done',
                    }"
                  ></span>
                </NuxtLink>
              </div>
            </div>

            <!-- Drawer footer -->
            <div class="border-t border-subtle px-3 py-2.5 flex flex-col gap-0.5">
              <NuxtLink
                to="/billing"
                class="flex items-center gap-2.5 px-2 py-2 rounded-lg text-[13px] font-medium text-body hover:text-heading hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                :class="{ 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400': route.path.startsWith('/billing') }"
              >
                <UIcon name="i-heroicons-sparkles" class="w-[17px] h-[17px] opacity-90" />
                Billing &amp; plan
              </NuxtLink>

              <div class="flex items-center gap-2.5 px-2 py-2">
                <span class="flex-1 text-[13px] font-medium text-body">Theme</span>
                <span class="inline-flex items-center gap-0.5 bg-black/5 dark:bg-white/[0.07] rounded-lg p-0.5">
                  <button
                    type="button"
                    class="w-7 h-6 flex items-center justify-center rounded-md transition-colors"
                    :class="colorMode.preference === 'light' ? 'bg-emerald-500 text-white' : 'text-muted'"
                    aria-label="Light theme"
                    @click="setTheme('light')"
                  >
                    <UIcon name="i-heroicons-sun" class="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    class="w-7 h-6 flex items-center justify-center rounded-md transition-colors"
                    :class="colorMode.preference === 'dark' ? 'bg-emerald-500 text-white' : 'text-muted'"
                    aria-label="Dark theme"
                    @click="setTheme('dark')"
                  >
                    <UIcon name="i-heroicons-moon" class="w-3.5 h-3.5" />
                  </button>
                </span>
              </div>

              <div class="flex items-center gap-2.5 px-2 py-2">
                <UAvatar v-if="authStore.user?.picture" :src="authStore.user.picture" size="sm" />
                <UAvatar v-else :text="authStore.user?.name?.charAt(0).toUpperCase()" size="sm" />
                <span class="flex-1 min-w-0">
                  <span class="block text-[12.5px] font-semibold text-heading truncate">{{ authStore.user?.name || 'Account' }}</span>
                  <span class="block text-[10px] text-muted truncate">{{ authStore.currentOrganization?.name || 'No workspace' }}</span>
                </span>
                <UButton
                  variant="ghost"
                  color="neutral"
                  icon="i-heroicons-arrow-right-on-rectangle"
                  size="xs"
                  aria-label="Log out"
                  title="Log out"
                  @click="handleLogout"
                />
              </div>
            </div>
          </div>
        </template>
      </USlideover>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { scrollbar-width: none; }
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(156, 163, 175, 0.3); border-radius: 10px; }
</style>