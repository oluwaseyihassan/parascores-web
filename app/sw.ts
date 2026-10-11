import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope

cleanupOutdatedCaches()

// Force immediate activation when a new service worker is installed
self.addEventListener('install', () => {
  self.skipWaiting()
})

// Claim all clients immediately when the service worker becomes active
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// self.__WB_MANIFEST is default injection point
precacheAndRoute(self.__WB_MANIFEST)


// Add custom push/notification click logic
self.addEventListener('push', (event) => {
  if (!event.data) return

  try {
    const data = event.data.json()
    const title = data.title || 'Live Match Update'
    const options = {
      body: data.body,
      icon: data.icon || '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: {
        url: data.url
      },
      tag: data.tag || 'match-update',
      renotify: true
    }

    event.waitUntil(self.registration.showNotification(title, options))
  } catch (err) {
    console.error('Error parsing push data:', err)
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const rawUrl = event.notification.data?.url || '/'
  const targetUrl = new URL(rawUrl, self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 1. Check if there is already a window open on the same origin
      for (const client of windowClients) {
        try {
          const clientUrl = new URL(client.url)
          if (clientUrl.origin === self.location.origin && 'focus' in client) {
            client.focus()
            if ('navigate' in client && client.url !== targetUrl) {
              return client.navigate(targetUrl)
            }
            return
          }
        } catch (err) {
          console.error('Error matching window client:', err)
        }
      }

      // 2. If no window open, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})
