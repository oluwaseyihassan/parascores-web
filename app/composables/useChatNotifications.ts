import type { ComputedRef, Ref } from 'vue'
import type { ChatMessage } from '~/types'

export type ChatNotificationLevel = 'mentions' | 'all' | 'none'

export interface UseChatNotificationsOptions {
  tournamentId: Ref<string>
  tournamentName?: ComputedRef<string | undefined> | Ref<string | undefined>
  tournamentLogo?: ComputedRef<string | undefined> | Ref<string | undefined>
  viewerParticipantId?: Ref<string | null | undefined>
  viewerName?: ComputedRef<string | null | undefined> | Ref<string | null | undefined>
  isOrganizer?: ComputedRef<boolean> | Ref<boolean>
}

/**
 * Manages chat audio chimes, desktop browser notifications,
 * and user alert preferences (Mentions & Highlights, All, Muted).
 */
export function useChatNotifications(options: UseChatNotificationsOptions) {
  const toast = useToast()

  const level = ref<ChatNotificationLevel>('mentions')
  const soundEnabled = ref<boolean>(true)
  const permission = ref<NotificationPermission>('default')

  const isSupported = computed(() => {
    return import.meta.client && 'Notification' in window
  })

  // Load preferences for this tournament from localStorage
  function loadPreferences() {
    if (!import.meta.client) return

    const tId = toValue(options.tournamentId)
    const storedLevel = localStorage.getItem(`parascores_chat_notify_${tId}`) as ChatNotificationLevel | null
    if (storedLevel && ['mentions', 'all', 'none'].includes(storedLevel)) {
      level.value = storedLevel
    } else {
      level.value = 'mentions'
    }

    const storedSound = localStorage.getItem('parascores_chat_sound_enabled')
    if (storedSound !== null) {
      soundEnabled.value = storedSound === 'true'
    }

    if ('Notification' in window) {
      permission.value = Notification.permission
    }
  }

  // Watch tournamentId to reload preferences when switching rooms
  watch(
    () => toValue(options.tournamentId),
    () => {
      loadPreferences()
    },
    { immediate: true },
  )

  /**
   * Request browser notification permission with user feedback.
   */
  async function requestPermission(): Promise<NotificationPermission> {
    if (!import.meta.client || !('Notification' in window)) {
      toast.add({
        title: 'Notifications not supported',
        description: 'Your browser does not support desktop push notifications.',
        color: 'neutral',
      })
      return 'denied'
    }

    try {
      const result = await Notification.requestPermission()
      permission.value = result

      if (result === 'denied') {
        toast.add({
          title: 'Notifications blocked',
          description: 'Please enable notifications in your browser site settings to receive alerts while away.',
          color: 'warning',
        })
      }
      return result
    } catch {
      return 'denied'
    }
  }

  /**
   * Set user's notification preference level for this tournament.
   */
  async function setLevel(newLevel: ChatNotificationLevel) {
    level.value = newLevel
    if (import.meta.client) {
      const tId = toValue(options.tournamentId)
      localStorage.setItem(`parascores_chat_notify_${tId}`, newLevel)
    }

    if (newLevel === 'none') {
      toast.add({
        title: 'Chat notifications muted',
        description: 'You will not receive alerts for this room.',
        color: 'neutral',
      })
      return
    }

    // If enabling alerts but permission is default, ask for permission
    if (import.meta.client && 'Notification' in window && Notification.permission === 'default') {
      const perm = await requestPermission()
      if (perm === 'granted') {
        toast.add({
          title: newLevel === 'all' ? 'All chat notifications enabled' : 'Mentions & highlights enabled',
          color: 'success',
        })
      }
      return
    }

    if (permission.value === 'denied') {
      toast.add({
        title: 'Notifications are blocked',
        description: 'Browser permissions are blocked. Enable them in site settings to receive desktop banners.',
        color: 'warning',
      })
    } else {
      toast.add({
        title: newLevel === 'all' ? 'All chat notifications enabled' : 'Mentions & highlights enabled',
        color: 'success',
      })
    }
  }

  /**
   * Toggle gentle notification sound effect.
   */
  function toggleSound() {
    soundEnabled.value = !soundEnabled.value
    if (import.meta.client) {
      localStorage.setItem('parascores_chat_sound_enabled', String(soundEnabled.value))
    }

    if (soundEnabled.value) {
      playChime()
      toast.add({ title: 'Chat sound effects on', color: 'neutral' })
    } else {
      toast.add({ title: 'Chat sound effects muted', color: 'neutral' })
    }
  }

  /**
   * Plays a subtle, pleasant harmonic double-tone using Web Audio API.
   * Completely self-contained with no external mp3 assets or network requests.
   */
  function playChime() {
    if (!soundEnabled.value || !import.meta.client) return
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const now = ctx.currentTime

      // Tone 1: Soft A5 -> D6 harmonic
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(880, now)
      osc1.frequency.exponentialRampToValueAtTime(1174.66, now + 0.08)

      gain1.gain.setValueAtTime(0, now)
      gain1.gain.linearRampToValueAtTime(0.04, now + 0.015)
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.28)

      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.start(now)
      osc1.stop(now + 0.3)

      // Tone 2: Gentle E6 shimmer
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(1318.5, now + 0.06)

      gain2.gain.setValueAtTime(0, now + 0.06)
      gain2.gain.linearRampToValueAtTime(0.03, now + 0.08)
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.32)

      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start(now + 0.06)
      osc2.stop(now + 0.34)
    } catch {
      // AudioContext could be blocked by browser autoplay policy until user interaction
    }
  }

  // Rate limiter: prevent flooding the OS notification daemon
  let lastNotificationTime = 0

  /**
   * Evaluates whether an incoming message qualifies for alerting the user.
   */
  function evaluateMessage(message: ChatMessage, isOwn: boolean) {
    if (isOwn || level.value === 'none') {
      return { shouldAlert: false, isHighlight: false, title: '', body: '' }
    }

    const tName = toValue(options.tournamentName) || 'Tournament'
    const text = (message.text || '').toLowerCase()
    const vName = (toValue(options.viewerName) || '').trim().toLowerCase()
    const vPid = toValue(options.viewerParticipantId)
    const isOrg = !!toValue(options.isOrganizer)

    // Highlight triggers
    const isBroadcast = /@(everyone|all|here|room)\b/.test(text)
    const isOrgPing = isOrg && /@(organizer|admin|staff)\b/.test(text)
    const isNameMention = !!(vName && vName.length >= 2 && text.includes(`@${vName}`))
    const isReply = !!(
      message.replyTo &&
      vName &&
      message.replyTo.authorName.trim().toLowerCase() === vName
    )
    const isOrganizerPost = message.authorType === 'ORGANIZER'
    const p = message.cardPayload || {}
    const isScoreCard =
      message.cardType === 'SCORE_SUBMITTED' ||
      message.cardType === 'SCORE_CONFIRMED' ||
      message.cardType === 'SCORE_CONFLICT'
    const isMyMatch = !!(
      isScoreCard &&
      vPid &&
      (p.homeTeamId === vPid || p.awayTeamId === vPid || p.submittedParticipantId === vPid)
    )

    const isHighlight = isBroadcast || isOrgPing || isNameMention || isReply || isOrganizerPost || isMyMatch

    if (level.value === 'mentions' && !isHighlight) {
      return { shouldAlert: false, isHighlight: false, title: '', body: '' }
    }

    // Build notification titles & bodies
    let title = `💬 ${message.author.name} · ${tName}`
    if (isOrganizerPost) {
      title = `📢 Announcement · ${tName}`
    } else if (isNameMention || isBroadcast) {
      title = `💬 @${message.author.name} mentioned you`
    } else if (isReply) {
      title = `💬 @${message.author.name} replied to you`
    } else if (isMyMatch) {
      if (message.cardType === 'SCORE_CONFIRMED') {
        title = `✅ Match score confirmed · ${tName}`
      } else if (message.cardType === 'SCORE_CONFLICT') {
        title = `⚠️ Match score dispute · ${tName}`
      } else {
        title = `🎮 Match score report · ${tName}`
      }
    }

    let body = message.text || ''
    if (!body && isScoreCard) {
      if (message.cardType === 'SCORE_CONFIRMED') {
        body = 'A match result has been confirmed.'
      } else if (message.cardType === 'SCORE_CONFLICT') {
        body = 'A score dispute requires your attention.'
      } else {
        body = 'A match score submission requires your review.'
      }
    } else if (!body && message.cardType) {
      body = 'Shared a tournament update.'
    }

    if (body.length > 140) {
      body = `${body.slice(0, 137)}…`
    }

    return {
      shouldAlert: true,
      isHighlight,
      title,
      body,
    }
  }

  /**
   * Main notification trigger called when a realtime chat message arrives.
   */
  async function notifyMessage(message: ChatMessage, isOwn = false) {
    if (!import.meta.client) return

    const { shouldAlert, isHighlight, title, body } = evaluateMessage(message, isOwn)
    if (!shouldAlert) return

    const isTabActive = !document.hidden && document.hasFocus()

    // 1. Audio chime:
    // If tab is active, only chime for highlights/mentions to avoid noise.
    // If tab is backgrounded/inactive, chime for any qualifying message.
    if (!isTabActive || isHighlight) {
      playChime()
    }

    // 2. Desktop OS notification:
    // Only fire desktop notification if user is NOT actively looking at the tab
    if (isTabActive) return

    if (permission.value !== 'granted') return

    const now = Date.now()
    if (now - lastNotificationTime < 1000) return
    lastNotificationTime = now

    const tId = toValue(options.tournamentId)
    const optionsPayload: NotificationOptions & { renotify?: boolean } = {
      body,
      icon: toValue(options.tournamentLogo) || '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: `chat-${tId}-${message.id}`,
      data: {
        url: `/t/${tId}?tab=chat#chatmsg-${message.id}`,
        tournamentId: tId,
        messageId: message.id,
      },
      renotify: true,
    }

    // Prefer service worker showNotification for robust background clicks & PWA support
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready
        if (reg && 'showNotification' in reg) {
          await reg.showNotification(title, optionsPayload)
          return
        }
      } catch {
        // Fallback to standard window Notification
      }
    }

    try {
      const n = new Notification(title, optionsPayload)
      n.onclick = () => {
        window.focus()
        n.close()
        const el = document.getElementById(`chatmsg-${message.id}`)
        el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
    } catch {
      // Notification constructor blocked
    }
  }

  return {
    level,
    soundEnabled,
    permission,
    isSupported,
    setLevel,
    toggleSound,
    requestPermission,
    playChime,
    notifyMessage,
  }
}
