import { $fetch } from 'ofetch'

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

/**
 * Anonymous push subscription for event hubs — fans subscribe with one tap,
 * no account needed. Tied to the org via its event subdomain.
 */
export const useEventPush = (subdomain: Ref<string | null>) => {
  const supported = ref(false)
  const subscribed = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const apiBase = useRuntimeConfig().public.API_BASE_URL as string
  const storageKey = computed(() => `parascores_event_push_${subdomain.value}`)

  const init = async () => {
    if (!import.meta.client) return
    supported.value =
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      !!subdomain.value
    if (!supported.value) return

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      subscribed.value =
        !!subscription && localStorage.getItem(storageKey.value) === 'true'
    } catch {
      subscribed.value = false
    }
  }

  const subscribe = async () => {
    if (!supported.value || !subdomain.value) return
    loading.value = true
    error.value = null

    try {
      if (Notification.permission === 'denied') {
        throw new Error('Notifications are blocked — enable them in your browser settings.')
      }

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        throw new Error('Notification permission was not granted.')
      }

      const { key } = await $fetch<{ key: string }>(
        `${apiBase}/notifications/vapid-key`,
      )
      if (!key) throw new Error('Push is not configured on the server.')

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      })

      const subJson = subscription.toJSON()
      await $fetch(`${apiBase}/notifications/subscribe-event`, {
        method: 'POST',
        body: {
          endpoint: subJson.endpoint,
          p256dh: subJson.keys?.p256dh,
          auth: subJson.keys?.auth,
          subdomain: subdomain.value,
        },
      })

      localStorage.setItem(storageKey.value, 'true')
      subscribed.value = true
    } catch (err: any) {
      error.value = err.message || 'Failed to enable notifications'
      subscribed.value = false
    } finally {
      loading.value = false
    }
  }

  return { supported, subscribed, loading, error, init, subscribe }
}
