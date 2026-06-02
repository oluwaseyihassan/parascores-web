/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'

declare let self: ServiceWorkerGlobalScope

cleanupOutdatedCaches()

// self.__WB_MANIFEST is default injection point
precacheAndRoute(self.__WB_MANIFEST)

// Register navigation route fallback for SPA routing
try {
  registerRoute(
    new NavigationRoute(
      createHandlerBoundToURL('/'),
      {
        denylist: [/^\/api($|\/)/, /^\/_manage($|\/)/]
      }
    )
  )
} catch (e) {
  console.error('Failed to register navigation route:', e)
}

// Add custom push/notification click logic
self.addEventListener('push', (event) => {
  if (!event.data) return

  try {
    const data = event.data.json()
    const title = data.title || 'Live Match Update'
    const options = {
      body: data.body,
      icon: '/pwa-192x192.png',
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

  const urlToOpen = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window open with this URL
      for (const client of windowClients) {
        if (client.url.endsWith(urlToOpen) && 'focus' in client) {
          return client.focus()
        }
      }
      // If not, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen)
      }
    })
  )
})
