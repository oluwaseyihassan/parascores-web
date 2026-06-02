<template>
  <div class="min-h-full text-gray-900 dark:text-white transition-colors">
    <!-- Header Section -->
    <section class="relative pt-8 pb-8 overflow-x-hidden">
      <div class="max-w-5xl mx-auto px-6 relative z-10">


        <!-- Headline -->
        <h1 class="text-3xl md:text-4xl font-extrabold leading-tight mb-2 tracking-tight">
          Your <span class="text-emerald-500">Tournaments</span>
        </h1>
        <p class="text-base text-gray-600 dark:text-gray-400 max-w-lg mb-8">
          Manage the tournaments you're following. Unfollow any you no longer need.
        </p>

        <!-- Stats Bar -->
        <div class="flex items-center gap-6 text-sm">
          <div class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <UIcon name="i-heroicons-trophy" class="w-4 h-4 text-emerald-400" />
            <span v-if="!tournamentStore.followedLoading" class="font-medium">
              {{ tournamentStore.followedTournaments.length }} tournament{{ tournamentStore.followedTournaments.length === 1 ? '' : 's' }}
            </span>
            <span v-else class="font-medium">Loading...</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Content Section -->
    <section class="pb-24">
      <div class="max-w-5xl mx-auto px-6">
        <!-- Live Notifications Banner -->
        <div 
          v-if="authStore.isAuthenticated && !tournamentStore.followedLoading" 
          class="mb-6 p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
          :class="isDark ? 'border-white/[0.06] bg-[#141414]/50' : 'border-gray-200 bg-gray-50/80'"
        >
          <div class="flex items-start gap-3.5">
            <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <UIcon 
                :name="notificationsEnabled && notificationPermission === 'granted' ? 'i-heroicons-bell-alert-solid' : 'i-heroicons-bell-slash'" 
                class="w-5 h-5 text-emerald-500" 
              />
            </div>
            <div>
              <h4 class="font-bold text-sm text-gray-900 dark:text-white">Live Match Notifications</h4>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 max-w-xl">
                Get real-time browser alerts when games kickoff, score goals, or end for your followed tournaments.
              </p>
            </div>
          </div>
          <div class="flex items-center gap-3 self-end sm:self-center shrink-0">
            <span class="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              {{ notificationsEnabled && notificationPermission === 'granted' ? 'Enabled' : 'Disabled' }}
            </span>
            <USwitch 
              :model-value="notificationsEnabled && notificationPermission === 'granted'" 
              @update:model-value="toggleNotifications" 
              color="success" 
            />
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="tournamentStore.followedLoading" class="space-y-3">
          <div
            v-for="i in 4"
            :key="i"
            class="bg-white dark:bg-[#0A0A0A] border border-gray-100 dark:border-white/10 rounded-xl p-5 animate-pulse shadow-sm"
          >
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-gray-100 dark:bg-white/5 rounded-full shrink-0"></div>
              <div class="flex-1 space-y-2">
                <div class="h-4 bg-gray-100 dark:bg-white/5 rounded w-3/4"></div>
                <div class="h-3 bg-gray-100 dark:bg-white/5 rounded w-1/4"></div>
              </div>
              <div class="h-8 bg-gray-100 dark:bg-white/5 rounded-lg w-24"></div>
            </div>
          </div>
        </div>

        <!-- Not Authenticated -->
        <div
          v-else-if="!authStore.isAuthenticated"
          class="flex flex-col items-center justify-center py-20 text-center"
        >
          <div class="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mb-6">
            <UIcon name="i-heroicons-arrow-right-on-rectangle" class="w-10 h-10 text-emerald-400" />
          </div>
          <h3 class="text-xl font-bold mb-2">Sign in to see your followings</h3>
          <p class="text-gray-600 dark:text-gray-400 max-w-md mb-6">
            Log in to follow tournaments and get personalized updates.
          </p>
          <UButton :to="toMain('/login')" color="success" class="rounded-xl font-bold px-8 py-3">
            Log In
          </UButton>
        </div>

        <!-- Empty State -->
        <div
          v-else-if="tournamentStore.followedTournaments.length === 0"
          class="flex flex-col items-center justify-center py-20 text-center"
        >
          <div class="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mb-6">
            <UIcon name="i-heroicons-heart" class="w-10 h-10 text-emerald-400" />
          </div>
          <h3 class="text-xl font-bold mb-2">No followed tournaments</h3>
          <p class="text-gray-600 dark:text-gray-400 max-w-md mb-6">
            You haven't followed any tournaments yet. Explore public tournaments and follow the ones you love.
          </p>
          <UButton :to="toMain('/explore')" color="success" class="rounded-xl font-bold px-8 py-3">
            Explore Tournaments
          </UButton>
        </div>

        <!-- Tournament List -->
        <div v-else class="space-y-3">
          <TransitionGroup name="list">
            <div
              v-for="tournament in tournamentStore.followedTournaments"
              :key="tournament.id"
              class="group bg-white dark:bg-[#0A0A0A] border border-gray-100 dark:border-white/[0.06] rounded-xl p-4 md:p-5 shadow-sm hover:border-emerald-500/30 transition-all duration-300"
            >
              <div class="flex items-center gap-4">
                <!-- Tournament Logo -->
                <NuxtLink :to="toTournament(tournament)" class="shrink-0">
                  <div class="w-12 h-12 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center overflow-hidden border border-gray-100 dark:border-white/10 group-hover:border-emerald-500/30 transition-colors">
                    <img
                      v-if="tournament.logoUrl"
                      :src="tournament.logoUrl"
                      :alt="tournament.name"
                      class="w-full h-full object-cover"
                    />
                    <span v-else class="text-base font-bold text-gray-400 dark:text-white/60">
                      {{ tournament.name.charAt(0).toUpperCase() }}
                    </span>
                  </div>
                </NuxtLink>

                <!-- Tournament Info -->
                <NuxtLink :to="toTournament(tournament)" class="flex-1 min-w-0">
                  <h3 class="text-sm md:text-base font-bold text-gray-900 dark:text-white group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors truncate">
                    {{ tournament.name }}
                  </h3>
                  <div class="flex items-center gap-3 mt-1">
                    <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400/80 uppercase tracking-wide">
                      {{ tournament.sport }}
                    </span>
                    <span v-if="tournament.organization" class="text-xs text-gray-600 dark:text-gray-500 truncate max-w-[160px]">
                      {{ tournament.organization.name }}
                    </span>
                  </div>
                </NuxtLink>

                <!-- Actions -->
                <div class="flex items-center gap-2 shrink-0">
                  <UButton
                    :color="hoveredId === tournament.id ? 'error' : 'neutral'"
                    :variant="hoveredId === tournament.id ? 'solid' : 'soft'"
                    size="sm"
                    class="rounded-full px-4 font-bold shadow-sm transition-all duration-200"
                    :icon="hoveredId === tournament.id ? 'i-heroicons-x-mark' : 'i-heroicons-check'"
                    :loading="unfollowingId === tournament.id"
                    @mouseenter="hoveredId = tournament.id"
                    @mouseleave="hoveredId = null"
                    @click="handleUnfollow(tournament)"
                  >
                    {{ hoveredId === tournament.id ? 'Unfollow' : 'Following' }}
                  </UButton>
                </div>
              </div>
            </div>
          </TransitionGroup>
        </div>

      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { Tournament } from '~/types'

const { toMain, toTournament } = useHost()

definePageMeta({
  layout: 'feed',
})

useSeoMeta({
  title: 'Following | ParaScores',
  description: 'Manage the tournaments you follow on ParaScores. View updates and unfollow tournaments you no longer need.',
})

const authStore = useAuthStore()
const tournamentStore = useTournamentStore()
const toast = useToast()
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

const unfollowingId = ref<string | null>(null)
const hoveredId = ref<string | null>(null)
const notificationsEnabled = ref(false)
const notificationPermission = ref('default')

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

onMounted(async () => {
  if (authStore.isAuthenticated && tournamentStore.followedTournaments.length === 0) {
    tournamentStore.fetchFollowedTournaments()
  }
  if (typeof window !== 'undefined') {
    if ('Notification' in window) {
      notificationPermission.value = Notification.permission
    }
    if ('serviceWorker' in navigator && authStore.isAuthenticated) {
      try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        if (subscription) {
          notificationsEnabled.value = true
          localStorage.setItem('parascores_notifications_enabled', 'true')
        } else {
          notificationsEnabled.value = false
          localStorage.setItem('parascores_notifications_enabled', 'false')
        }
      } catch (err) {
        console.error('Failed to check service worker subscription:', err)
        notificationsEnabled.value = localStorage.getItem('parascores_notifications_enabled') === 'true'
      }
    } else {
      notificationsEnabled.value = localStorage.getItem('parascores_notifications_enabled') === 'true'
    }
  }
})

async function toggleNotifications(val: boolean) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    toast.add({ title: 'Not Supported', description: 'Browser notifications are not supported in this browser.', color: 'error' })
    return
  }

  if (val) {
    if (Notification.permission === 'denied') {
      toast.add({ 
        title: 'Notifications Blocked', 
        description: 'Please enable notifications in your browser settings to receive live match updates.', 
        color: 'error' 
      })
      return
    }

    try {
      const permission = await Notification.requestPermission()
      notificationPermission.value = permission

      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.ready
        const vapidResponse = await $publicApi<{ key: string }>('/notifications/vapid-key')
        const vapidPublicKey = vapidResponse.key

        if (!vapidPublicKey) {
          throw new Error('VAPID public key not configured on backend.')
        }

        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey)
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        })

        const subJson = subscription.toJSON()
        await $api('/notifications/subscribe', {
          method: 'POST',
          body: {
            endpoint: subJson.endpoint,
            p256dh: subJson.keys?.p256dh,
            auth: subJson.keys?.auth,
          },
        })

        localStorage.setItem('parascores_notifications_enabled', 'true')
        notificationsEnabled.value = true
        toast.add({ title: 'Notifications Enabled', description: 'You will now receive live alerts for followed tournaments!', color: 'success' })
      } else {
        localStorage.setItem('parascores_notifications_enabled', 'false')
        notificationsEnabled.value = false
      }
    } catch (err: any) {
      console.error('Failed to subscribe to push notifications:', err)
      localStorage.setItem('parascores_notifications_enabled', 'false')
      notificationsEnabled.value = false
      toast.add({ title: 'Subscription Failed', description: err.message || 'Could not register for push notifications.', color: 'error' })
    }
  } else {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await $api('/notifications/unsubscribe', {
          method: 'POST',
          body: {
            endpoint: subscription.endpoint,
          },
        })
        await subscription.unsubscribe()
      }
      localStorage.setItem('parascores_notifications_enabled', 'false')
      notificationsEnabled.value = false
      toast.add({ title: 'Notifications Disabled', description: 'Live alerts have been disabled.', color: 'neutral' })
    } catch (err: any) {
      console.error('Failed to unsubscribe:', err)
      toast.add({ title: 'Unsubscription Failed', description: err.message || 'Could not remove push subscription.', color: 'error' })
    }
  }
}

async function handleUnfollow(tournament: Tournament) {
  unfollowingId.value = tournament.id
  try {
    await tournamentStore.unfollowTournament(tournament.id)
  } catch (err) {
    console.error('Failed to unfollow:', err)
  } finally {
    unfollowingId.value = null
  }
}
</script>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}
.list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
