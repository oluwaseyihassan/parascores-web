import { ref, onMounted, onUnmounted } from 'vue'

// Singleton state
let eventSource: EventSource | null = null
let connectionCount = 0

export function useLiveStream() {
  const isConnected = ref(false)
  const lastError = ref<Event | null>(null)

  const connect = () => {
    connectionCount++
    if (eventSource) {
      isConnected.value = eventSource.readyState === EventSource.OPEN
      return
    }

    const config = useRuntimeConfig()
    const url = `${config.public.API_BASE_URL}/fixtures/live/stream`

    eventSource = new EventSource(url)

    eventSource.onopen = () => {
      isConnected.value = true
      lastError.value = null
    }

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        // Dispatch a custom event on window so any store/component can listen
        window.dispatchEvent(new CustomEvent('live-match-update', { detail: payload }))
      } catch (err) {
        console.error('[LiveStream] Failed to parse message', err)
      }
    }

    eventSource.onerror = (err) => {
      console.error('[LiveStream] Connection error', err)
      isConnected.value = false
      lastError.value = err

      // Let EventSource automatically attempt to reconnect,
      // but we cap our count and log appropriately
    }
  }

  const disconnect = () => {
    connectionCount--
    if (connectionCount <= 0 && eventSource) {
      eventSource.close()
      eventSource = null
      isConnected.value = false
      connectionCount = 0
    }
  }

  // Auto connect/disconnect based on component lifecycle
  onMounted(() => {
    connect()
  })

  onUnmounted(() => {
    disconnect()
  })

  // Provide manual triggers if needed
  return {
    isConnected,
    lastError,
  }
}
