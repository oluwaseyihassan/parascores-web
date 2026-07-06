import { ref, onMounted, onUnmounted } from 'vue'
import { useTournamentStore } from '~/stores/tournament'
import { useHost } from '~/composables/useHost'
import { FixtureStatus } from '~/types'

function isLiveStreamStatus(status: string) {
  return status === FixtureStatus.LIVE || status === FixtureStatus.EXTRATIME
}

// Singleton state
let eventSource: EventSource | null = null
let connectionCount = 0

// In-memory fixture cache to track changes/transitions
const fixtureCache = new Map<string, { status: string; homeScore: number; awayScore: number }>()

function handleBrowserNotification(payload: any) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  if (localStorage.getItem('parascores_notifications_enabled') !== 'true') return

  const { type, data } = payload
  if (type !== 'fixture_updated') return

  const fixture = data
  if (!fixture || !fixture.id || !fixture.tournament_id) return

  const tournamentStore = useTournamentStore()
  const isFollowed = tournamentStore.followedTournaments.some(t => t.id === fixture.tournament_id)
  if (!isFollowed) return

  const homeName = fixture.homeTeam?.customName || fixture.homeTeamPlaceholder || 'Home Team'
  const awayName = fixture.awayTeam?.customName || fixture.awayTeamPlaceholder || 'Away Team'
  const homeScore = fixture.homeScore ?? 0
  const awayScore = fixture.awayScore ?? 0

  const showNotification = (title: string, body: string) => {
    const notification = new Notification(title, {
      body,
      icon: 'https://res.cloudinary.com/djsnerfzp/image/upload/q_auto/f_auto/v1780327900/parascores-logo.png',
      tag: fixture.id // Dedup notifications for the same match
    })

    notification.onclick = () => {
      window.focus()
      const { toMain } = useHost()
      const slug = fixture.tournament?.customName || fixture.tournament_id
      window.location.href = toMain(`/t/${slug}/fixture/${fixture.id}`)
    }
  }

  // Check state transition
  const cached = fixtureCache.get(fixture.id)
  if (!cached) {
    fixtureCache.set(fixture.id, {
      status: fixture.status,
      homeScore,
      awayScore
    })
    
    // If we just loaded and it's already LIVE, show initial notification
    if (isLiveStreamStatus(fixture.status)) {
      showNotification(
        `⚽ Live Match: ${homeName} vs ${awayName}`,
        `This followed match is now LIVE! (Score: ${homeScore} - ${awayScore})`
      )
    }
    return
  }

  fixtureCache.set(fixture.id, {
    status: fixture.status,
    homeScore,
    awayScore
  })

  // 1. Kickoff: transition from not LIVE to LIVE
  if (!isLiveStreamStatus(cached.status) && isLiveStreamStatus(fixture.status)) {
    showNotification(
      `⚽ Kickoff: ${homeName} vs ${awayName}`,
      `The match has started and is now LIVE!`
    )
  }
  // 2. Goal: score increased while LIVE
  else if (isLiveStreamStatus(fixture.status) && (homeScore > cached.homeScore || awayScore > cached.awayScore)) {
    const homeDiff = homeScore - cached.homeScore
    const awayDiff = awayScore - cached.awayScore
    
    let scorerText = ''
    if (homeDiff > 0 && awayDiff > 0) {
      scorerText = 'Both teams scored!'
    } else if (homeDiff > 0) {
      scorerText = `${homeName} scored!`
    } else {
      scorerText = `${awayName} scored!`
    }

    showNotification(
      `⚽ GOAL! ${homeName} ${homeScore} - ${awayScore} ${awayName}`,
      scorerText
    )
  }
  // 3. Full-time: status transition to COMPLETED
  else if (cached.status !== 'COMPLETED' && fixture.status === 'COMPLETED') {
    showNotification(
      `🏁 Full Time: ${homeName} ${homeScore} - ${awayScore} ${awayName}`,
      `The match has finished.`
    )
  }
}

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
        
        // Handle browser notifications for followed tournaments
        handleBrowserNotification(payload)
      } catch (err) {
        console.error('[LiveStream] Failed to parse message', err)
      }
    }

    eventSource.onerror = (err) => {
      console.error('[LiveStream] Connection error', err)
      isConnected.value = false
      lastError.value = err
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
