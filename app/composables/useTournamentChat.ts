import { io, type Socket } from 'socket.io-client'
import type { ChatMessage, ChatSettings } from '~/types'

interface ChatListResponse {
  success: boolean
  data: {
    messages: ChatMessage[]
    pinned: ChatMessage | null
    nextCursor: string | null
  }
}

export interface UseTournamentChatOptions {
  onNewMessage?: (message: ChatMessage) => void
}

/**
 * Realtime tournament chat — one instance per room mount.
 * History via REST (cursor pagination), live updates via Socket.IO
 * (namespace /chat, cookie auth for posters, anonymous read-only on public rooms).
 */
export function useTournamentChat(
  tournamentId: Ref<string>,
  options?: UseTournamentChatOptions,
) {
  const runtimeConfig = useRuntimeConfig()
  const { handleError } = useErrors()
  const toast = useToast()

  const messages = ref<ChatMessage[]>([])
  const pinned = ref<ChatMessage | null>(null)
  const online = ref(0)
  const loading = ref(true)
  const loadError = ref(false)
  const loadingMore = ref(false)
  const sending = ref(false)
  const nextCursor = ref<string | null>(null)
  const joined = ref(false)
  const chatDisabled = ref(false) // server disabled the room while viewing

  // "Paragee is thinking…" while the LLM tier works (server clears on answer/failure)
  const botThinking = ref(false)
  let botThinkingTimer: ReturnType<typeof setTimeout> | null = null

  // Typing indicators: { userId: { name, avatarUrl, at } }, entries expire after 3.5s
  const typers = ref<Record<string, { name: string; avatarUrl: string | null; at: number }>>({})
  let typingPruneTimer: ReturnType<typeof setInterval> | null = null
  let lastTypingSent = 0

  let socket: Socket | null = null

  const wsBase = computed(() =>
    (runtimeConfig.public.API_BASE_URL as string).replace(/\/api\/?$/, ''),
  )

  // ─── REST ──────────────────────────────────────────────
  async function loadInitial() {
    loading.value = true
    loadError.value = false
    try {
      const res = await $api<ChatListResponse>(
        `/tournaments/${tournamentId.value}/chat-messages?limit=50`,
      )
      messages.value = res.data.messages
      pinned.value = res.data.pinned
      nextCursor.value = res.data.nextCursor
    } catch (err: any) {
      if (err?.statusCode === 404) chatDisabled.value = true
      else loadError.value = true // transient failure (API restart etc.) — show retry
      // 403 (private room, outsider) surfaces via the parent empty state too
      handleError(err, { silent: true })
    } finally {
      loading.value = false
    }
  }

  async function loadMore() {
    if (!nextCursor.value || loadingMore.value) return
    loadingMore.value = true
    try {
      const res = await $api<ChatListResponse>(
        `/tournaments/${tournamentId.value}/chat-messages?limit=50&cursor=${nextCursor.value}`,
      )
      messages.value = [...res.data.messages, ...messages.value]
      nextCursor.value = res.data.nextCursor
    } catch {
      // older history unavailable — keep current view
    } finally {
      loadingMore.value = false
    }
  }

  async function send(text: string, replyToId?: string | null) {
    const trimmed = text.trim()
    if (!trimmed || sending.value) return false
    sending.value = true
    try {
      await $api(`/tournaments/${tournamentId.value}/chat-messages`, {
        method: 'POST',
        body: { text: trimmed, ...(replyToId ? { replyToId } : {}) },
      })
      // The WS broadcast delivers the message (deduped by id)
      return true
    } catch (err: any) {
      handleError(err, { title: 'Message Not Sent' })
      return false
    } finally {
      sending.value = false
    }
  }

  async function removeMessage(id: string) {
    try {
      await $api(`/chat-messages/${id}`, { method: 'DELETE' })
      toast.add({ title: 'Message deleted', color: 'success' })
    } catch (err: any) {
      handleError(err, { title: 'Delete Failed' })
    }
  }

  async function setPin(id: string, pin: boolean) {
    try {
      const res = await $api<{ data: ChatMessage | null }>(`/chat-messages/${id}/pin`, { method: 'POST', body: { pin } })
      // apply from the response immediately — the socket broadcast then
      // confirms/syncs everyone (including us); never wait on the socket alone
      pinned.value = pin ? res.data : null
    } catch (err: any) {
      handleError(err, { title: pin ? 'Pin Failed' : 'Unpin Failed' })
    }
  }

  // ─── Reactions ───────────────────────────────────────────
  /** Merge a reaction summary into a message, preserving the viewer's own "mine" flags. */
  function applyReactions(messageId: string, summary: { emoji: string; count: number; mine?: boolean }[]) {
    messages.value = messages.value.map((m) => {
      if (m.id !== messageId) return m
      const prev = m.reactions ?? []
      return {
        ...m,
        reactions: summary
          .filter((r) => r.count > 0)
          .map((r) => ({
            emoji: r.emoji,
            count: r.count,
            mine: r.mine ?? prev.find((p) => p.emoji === r.emoji)?.mine ?? false,
          })),
      }
    })
  }

  async function react(messageId: string, emoji: string) {
    try {
      const res = await $api<{ data: { emoji: string; count: number; mine: boolean }[] }>(
        `/chat-messages/${messageId}/react`,
        { method: 'POST', body: { emoji } },
      )
      applyReactions(messageId, res.data)
    } catch (err: any) {
      handleError(err, { title: 'Reaction Failed' })
    }
  }

  async function saveSettings(payload: Partial<ChatSettings>) {
    const res = await $api<{ success: boolean; data: ChatSettings }>(
      `/tournaments/${tournamentId.value}/chat-settings`,
      { method: 'PATCH', body: payload },
    )
    return res.data
  }

  // ─── Socket ────────────────────────────────────────────
  function connect() {
    if (!import.meta.client || socket) return
    socket = io(`${wsBase.value}/chat`, {
      withCredentials: true, // sends the httpOnly access_token cookie
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', async () => {
      const ack = await socket!.emitWithAck('join', { tournamentId: tournamentId.value })
      joined.value = !!ack?.ok
    })

    socket.on('chat:new', (message: ChatMessage) => {
      if (messages.value.some((m) => m.id === message.id)) return
      messages.value.push(message)
      // the bot's answer landed — clear the thinking state
      if (message.authorType === 'BOT' || message.authorType === 'SYSTEM') botThinking.value = false
      options?.onNewMessage?.(message)
    })
    socket.on('chat:deleted', ({ id }: { id: string }) => {
      messages.value = messages.value.filter((m) => m.id !== id)
      if (pinned.value?.id === id) pinned.value = null
    })
    socket.on('chat:pinned', ({ message }: { message: ChatMessage | null }) => {
      pinned.value = message
    })
    socket.on('chat:reaction', ({ messageId, reactions }: { messageId: string; reactions: { emoji: string; count: number }[] }) => {
      applyReactions(messageId, reactions)
    })
    socket.on('chat:presence', ({ online: n }: { online: number }) => {
      online.value = n
    })
    socket.on('chat:settings', ({ chatEnabled }: { chatEnabled: boolean }) => {
      chatDisabled.value = !chatEnabled
    })
    socket.on('chat:typing', ({ userId, name, avatarUrl }: { userId: string; name: string; avatarUrl?: string | null }) => {
      if (!userId) return
      typers.value = { ...typers.value, [userId]: { name, avatarUrl: avatarUrl ?? null, at: Date.now() } }
    })
    socket.on('chat:botThinking', ({ state }: { state: boolean }) => {
      botThinking.value = state
      // safety net: never leave the indicator hanging if the answer event is missed
      if (botThinkingTimer) clearTimeout(botThinkingTimer)
      if (state) botThinkingTimer = setTimeout(() => { botThinking.value = false }, 20_000)
    })
  }

  /** Called on composer input — emits at most one typing ping per 2s. */
  function emitTyping(hasText: boolean) {
    if (!socket || !joined.value || !hasText) return
    const now = Date.now()
    if (now - lastTypingSent < 2000) return
    lastTypingSent = now
    socket.emit('typing', { tournamentId: tournamentId.value })
  }

  /** Active typers for the avatar stack (most recent first, max 4 shown). */
  const typingUsers = computed(() =>
    Object.values(typers.value)
      .sort((a, b) => b.at - a.at)
      .slice(0, 4)
      .map((t) => ({ name: t.name, avatarUrl: t.avatarUrl })),
  )

  /** "man u is typing…" / "man u and paragon are typing…" / "Several people…" */
  const typingText = computed(() => {
    const names = Object.values(typers.value).map((t) => t.name)
    if (names.length === 0) return ''
    if (names.length === 1) return `${names[0]} is typing…`
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`
    return 'Several people are typing…'
  })

  function disconnect() {
    if (!socket) return
    socket.emit('leave', { tournamentId: tournamentId.value })
    socket.disconnect()
    socket = null
    joined.value = false
  }

  onMounted(() => {
    loadInitial()
    connect()
    // expire typing entries that went quiet (sender stopped or sent)
    typingPruneTimer = setInterval(() => {
      const cutoff = Date.now() - 3500
      const entries = Object.entries(typers.value)
      if (entries.some(([, t]) => t.at < cutoff)) {
        typers.value = Object.fromEntries(entries.filter(([, t]) => t.at >= cutoff))
      }
    }, 1000)
  })
  onBeforeUnmount(() => {
    disconnect()
    if (typingPruneTimer) clearInterval(typingPruneTimer)
    if (botThinkingTimer) clearTimeout(botThinkingTimer)
  })

  return {
    messages,
    pinned,
    online,
    loading,
    loadingMore,
    sending,
    nextCursor,
    joined,
    chatDisabled,
    loadError,
    loadInitial,
    typers,
    typingText,
    typingUsers,
    emitTyping,
    botThinking,
    loadMore,
    send,
    removeMessage,
    setPin,
    react,
    saveSettings,
  }
}
