<script setup lang="ts">
import type { ParageeBotFlags, ChatMessage } from '~/types'
import { REACTION_EMOJIS } from '~/types'

const props = withDefaults(
  defineProps<{
    tournamentId: string
    // 'organizer' = gold-rail org identity (manage), 'participant' = player, false = locked composer
    canPost: false | 'participant' | 'organizer'
    canModerate?: boolean
    joinUrl?: string // fan page: locked-state CTA target
    parageeBot?: ParageeBotFlags | null
    memberCount?: number
    // mentionable members (participants) — powers the @ autocomplete + hover cards
    members?: { id: string; name: string; teamName?: string | null; href?: string | null }[]
    // viewer's participant id — their messages render right-aligned
    viewerParticipantId?: string | null
  }>(),
  { canModerate: false, parageeBot: null, members: () => [], viewerParticipantId: null },
)

const {
  messages,
  pinned,
  online,
  loading,
  loadError,
  loadInitial,
  loadingMore,
  sending,
  nextCursor,
  chatDisabled,
  typingText,
  typingUsers,
  emitTyping,
  botThinking,
  loadMore,
  send,
  removeMessage,
  setPin,
  react,
} = useTournamentChat(toRef(props, 'tournamentId'))

const draft = ref('')
const listEl = ref<HTMLElement | null>(null)

// Fullscreen room (event screens / focus mode) — fixed overlay, ESC exits
const fullscreen = ref(false)
function toggleFullscreen() {
  fullscreen.value = !fullscreen.value
  if (import.meta.client) {
    document.documentElement.style.overflow = fullscreen.value ? 'hidden' : ''
  }
  if (fullscreen.value) nextTick(() => scrollToBottom(true))
}
function onEsc(e: KeyboardEvent) {
  if (e.key === 'Escape' && fullscreen.value) toggleFullscreen()
}
if (import.meta.client) window.addEventListener('keydown', onEsc)
onBeforeUnmount(() => {
  if (import.meta.client) {
    window.removeEventListener('keydown', onEsc)
    document.documentElement.style.overflow = ''
  }
})

const botActive = computed(() => !!props.parageeBot?.enabled)

const quickChips = computed(() =>
  botActive.value && props.parageeBot?.quickChips
    ? ['My next match', 'Current table', 'Top scorer', 'Rules']
    : [],
)

// Composer hint: only tease @paragee when the bot can actually answer
const composerPlaceholder = computed(() => {
  if (props.canPost === 'organizer') return 'Post as Organizer — announcements get a gold rail…'
  return botActive.value
    ? 'Message the room… (Enter to send · @ to mention · @paragee to ask the bot)'
    : 'Message the room… (Enter to send · @ to mention)'
})

function askChip(label: string) {
  draft.value = `@paragee ${label === 'Rules' ? 'what are the rules?' : label.toLowerCase()}?`
  sendDraft()
}

async function sendDraft() {
  const ok = await send(draft.value, replyTarget.value?.id ?? null)
  if (ok) {
    draft.value = ''
    replyTarget.value = null
    scrollToBottom(true, true)
  }
}

// ─── Reactions ─────────────────────────────────────────
const reactPickerFor = ref<string | null>(null)

function toggleReactPicker(id: string) {
  reactPickerFor.value = reactPickerFor.value === id ? null : id
}
function pickReaction(m: ChatMessage, emoji: string) {
  reactPickerFor.value = null
  react(m.id, emoji)
}

// ─── Quoted replies ─────────────────────────────────────
const replyTarget = ref<ChatMessage | null>(null)
const flashId = ref<string | null>(null)

function startReply(m: ChatMessage) {
  replyTarget.value = m
  nextTick(() => composerTextarea()?.focus())
}
function cancelReply() {
  replyTarget.value = null
}
// Jump to the quoted original (only reachable if it's in the loaded window)
function jumpTo(id: string) {
  const el = document.getElementById(`chatmsg-${id}`)
  if (!el) return
  el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  flashId.value = id
  setTimeout(() => { if (flashId.value === id) flashId.value = null }, 1200)
}

function onComposerKeydown(e: KeyboardEvent) {
  // mention autocomplete navigation takes precedence
  if (mentionOpen.value) {
    if (e.key === 'ArrowDown') { e.preventDefault(); mentionIndex.value = (mentionIndex.value + 1) % mentionMatches.value.length; return }
    if (e.key === 'ArrowUp') { e.preventDefault(); mentionIndex.value = (mentionIndex.value - 1 + mentionMatches.value.length) % mentionMatches.value.length; return }
    if (e.key === 'Enter' || e.key === 'Tab') {
      const m = mentionMatches.value[mentionIndex.value]
      if (m) { e.preventDefault(); selectMention(m); return }
    }
    if (e.key === 'Escape') { e.stopPropagation(); closeMention(); return }
  }
  if (e.key === 'Escape' && replyTarget.value) { cancelReply(); return }
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendDraft()
  }
}

// ─── @mention autocomplete ───────────────────────────────
interface MentionItem { id: string; name: string; sub?: string | null; bot?: boolean }

const composerEl = ref<any>(null)
const mentionOpen = ref(false)
const mentionIndex = ref(0)
const mentionQuery = ref('')
const mentionStart = ref(-1)

const mentionMatches = computed<MentionItem[]>(() => {
  const q = mentionQuery.value.toLowerCase().trim()
  const list: MentionItem[] = []
  if (props.parageeBot?.enabled && (!q || 'paragee'.includes(q))) {
    list.push({ id: 'paragee', name: 'paragee', sub: 'AI bot — fixtures, table, top scorer, rules', bot: true })
  }
  for (const m of props.members) {
    if (!q || m.name.toLowerCase().includes(q)) {
      list.push({ id: m.id, name: m.name, sub: m.teamName ?? null })
    }
  }
  return list.slice(0, 6)
})

function composerTextarea(): HTMLTextAreaElement | null {
  // Nuxt UI UTextarea exposes the native element as `textareaRef`
  const el = composerEl.value?.textareaRef
  return el instanceof HTMLTextAreaElement ? el : null
}

watch(draft, (val) => {
  emitTyping(!!val.trim())
  if (skipMentionWatch) { skipMentionWatch = false; return }
  const el = composerTextarea()
  const caret = el?.selectionStart ?? val.length
  const upto = val.slice(0, caret)
  const at = upto.lastIndexOf('@')
  // @ must start a token (start of text or after whitespace)
  if (at === -1 || (at > 0 && !/[\s]/.test(upto[at - 1]))) { closeMention(); return }
  const q = upto.slice(at + 1)
  if (q.length > 25 || /[@\n]/.test(q)) { closeMention(); return }
  mentionQuery.value = q
  mentionStart.value = at
  mentionOpen.value = mentionMatches.value.length > 0
  mentionIndex.value = 0
})

let skipMentionWatch = false
function selectMention(m: MentionItem) {
  const el = composerTextarea()
  const caret = el?.selectionStart ?? draft.value.length
  skipMentionWatch = true
  draft.value = `${draft.value.slice(0, mentionStart.value)}@${m.name} ${draft.value.slice(caret)}`
  closeMention()
  nextTick(() => {
    el?.focus()
    const pos = mentionStart.value + m.name.length + 2
    el?.setSelectionRange?.(pos, pos)
  })
}

function closeMention() {
  mentionOpen.value = false
  mentionQuery.value = ''
  mentionStart.value = -1
}

// ─── Scroll handling ─────────────────────────────────────
// Auto-scroll only when the viewer is already near the bottom.
// smooth = animated glide for live arrivals/jumps; initial open and
// load-earlier anchoring stay instant (a drift there feels broken)
function scrollToBottom(force = false, smooth = false) {
  nextTick(() => {
    const el = listEl.value
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160
    if (force || nearBottom) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  })
}

// FAB visibility: user has scrolled away from the latest message AND the
// chat card is actually on screen (viewport-fixed FAB must not float over
// other sections when the page is scrolled past the room)
const isNearBottom = ref(true)
const cardVisible = ref(true)
// Keep the FAB horizontally aligned with the chat card (not the viewport
// corner) — the card is centered on wide screens
const fabRight = ref(16)
function updateFabRight() {
  const el = listEl.value
  if (!el) return
  fabRight.value = Math.max(window.innerWidth - el.getBoundingClientRect().right + 16, 16)
}
let cardObserver: IntersectionObserver | null = null
function onListScroll() {
  const el = listEl.value
  if (!el) return
  isNearBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 160
}

// Prepend anchoring: older messages load above, so shift scrollTop by the
// added height — the message the viewer was reading stays exactly in place
async function loadOlderAnchored() {
  const el = listEl.value
  if (!el) return loadMore()
  const prevHeight = el.scrollHeight
  const prevTop = el.scrollTop
  anchoring = true // keep the length-watcher from gliding to bottom on prepend
  await loadMore()
  nextTick(() => {
    el.scrollTop = el.scrollHeight - prevHeight + prevTop
    anchoring = false
  })
}
let anchoring = false
watch(
  () => messages.value.length,
  () => {
    // First non-empty render after mount: always open at the latest message
    // (history arrives async, so the plain onMounted scroll fires on an empty list)
    if (!initialScrolled.value) {
      if (messages.value.length === 0) return
      initialScrolled.value = true
      scrollToBottom(true)
      return
    }
    // live arrivals glide; prepends (load-earlier) are handled by the anchor
    if (!anchoring) scrollToBottom(false, true)
  },
)
const initialScrolled = ref(false)

// bring the "Paragee is thinking…" row into view for people at the bottom
watch(botThinking, (v) => { if (v) scrollToBottom(false, true) })

onMounted(() => {
  scrollToBottom(true)
  // listEl may already be populated at mount (SSR hydration) or render later
  // (loading branch swaps) — attach once, whichever happens first
  cardObserver = new IntersectionObserver(
    (entries) => { cardVisible.value = entries[0]?.isIntersecting ?? true },
    { threshold: 0.05 },
  )
  let listAttached = false
  const attachList = (el: HTMLElement | null) => {
    if (!el || listAttached) return
    listAttached = true
    cardObserver?.observe(el)
    updateFabRight()
  }
  watch(listEl, attachList)
  attachList(listEl.value)
  window.addEventListener('resize', updateFabRight)
})
onUnmounted(() => {
  cardObserver?.disconnect()
  window.removeEventListener('resize', updateFabRight)
})

// ─── Display helpers ─────────────────────────────────────
function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  if (diff < 60_000) return 'now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`
  if (diff < 86_400_000) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Highlight @mentions without v-html (XSS-safe). Mentions resolve against the
// actual room roster (longest name first), so any display name works —
// lowercase, multi-word, punctuation ("@man u", "@Paragee Tester").
const mentionRe = computed(() => {
  const names = [...new Set(
    props.members.map((m) => m.name?.trim()).filter(Boolean) as string[],
  )]
  names.push('paragee', 'arena') // bot alias
  names.sort((a, b) => b.length - a.length)
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // (?!\S): don't match a name that's merely the prefix of a longer token
  return new RegExp(`@(?:${names.map(esc).join('|')})(?!\\S)|@[\\w.]+`, 'gi')
})
function textParts(text: string) {
  const parts: { text: string; mention: boolean }[] = []
  let last = 0
  for (const m of text.matchAll(mentionRe.value)) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index), mention: false })
    parts.push({ text: m[0], mention: true })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last), mention: false })
  return parts
}

const avatarColors = ['#374151', '#4B5563', '#1F2937', '#525252', '#404040', '#475569']
function avatarColor(name: string) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return avatarColors[h % avatarColors.length]
}

// Own messages go right: organizers own their ORGANIZER posts (manage),
// participants own messages authored as their participant identity (fan)
function isOwn(m: ChatMessage) {
  if (props.canPost === 'organizer') return m.authorType === 'ORGANIZER'
  if (props.canPost === 'participant') return !!props.viewerParticipantId && m.author.participantId === props.viewerParticipantId
  return false
}

function railClass(m: ChatMessage) {
  const own = isOwn(m)
  if (m.authorType === 'ORGANIZER') {
    return own
      ? 'bg-gray-100/70 dark:bg-white/[0.04] border-r-2 border-r-gray-400 dark:border-r-white/40'
      : 'bg-gray-100/70 dark:bg-white/[0.04] border-l-2 border-l-gray-400 dark:border-l-white/40'
  }
  if (m.authorType === 'BOT' || m.authorType === 'SYSTEM') {
    return 'bg-gray-50 dark:bg-white/[0.02] border-l-2 border-l-gray-300 dark:border-l-white/20'
  }
  return own ? 'bg-gray-50/50 dark:bg-white/[0.02] border-r-2 border-r-gray-300 dark:border-r-white/20' : ''
}

// Structured bot cards (cardType) — FIXTURE renders per the approved design;
// TABLE/STATS render as compact ranked rows; score-report cards land with
// the submissions phase
function fixtureCard(m: ChatMessage) {
  const p = m.cardPayload ?? {}
  return {
    label: p.round ?? 'Fixture',
    home: p.home ?? 'TBD',
    away: p.away ?? 'TBD',
    meta: p.meta ?? '',
    href: p.href ?? null,
  }
}

function rowsCard(m: ChatMessage) {
  const p = m.cardPayload ?? {}
  return {
    title: p.title ?? (m.cardType === 'TABLE' ? 'Table' : 'Stats'),
    rows: (p.rows ?? []) as { rank?: number; name: string; value: string }[],
  }
}

// Score-report cards (double-entry submissions)
function scoreCard(m: ChatMessage) {
  const p = m.cardPayload ?? {}
  return {
    home: p.home ?? 'TBD',
    away: p.away ?? 'TBD',
    score: p.score as { home: number; away: number } | undefined,
    submittedBy: p.submittedBy ?? '',
    evidenceAttached: !!p.evidenceAttached,
    by: p.by ?? 'players',
    href: p.href ?? null,
    claims: (p.claims ?? []) as { participantName: string; score: { home: number; away: number }; evidenceUrl?: string | null }[],
    fixtureId: p.fixtureId ?? null,
  }
}

const emit = defineEmits<{ (e: 'review-dispute', fixtureId: string): void; (e: 'enable-chat'): void }>()

// Card hrefs are site paths; from the manage host they must become absolute
// main-site URLs (the marketing routes don't exist under manage.*)
const { toMain, isManage } = useHost()
const cardTo = (href: string | null) => (href ? toMain(href) : null)
</script>

<template>
  <div
    class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] overflow-hidden flex flex-col"
    :class="fullscreen
      ? 'fixed inset-0 z-[60] rounded-none border-0' // above the mobile bottom nav (z-50)
      : 'rounded-2xl'"
  >
    <!-- header -->
    <div
      class="px-4 sm:px-5 py-3.5 border-b border-gray-100 dark:border-white/[0.06] flex items-center justify-between gap-3 flex-wrap"
      :class="fullscreen && 'max-w-3xl w-full mx-auto border-x-0'"
    >
      <div>
        <h2 class="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          💬 Tournament chat
        </h2>
        <p class="text-xs text-gray-500 mt-0.5">
          Approved participants and organizers can post · everyone can read
        </p>
      </div>
      <div class="flex items-center gap-3 text-[11px] text-gray-400">
        <span class="flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,.8)]"></span>
          {{ online }} online
        </span>
        <span v-if="memberCount != null">{{ memberCount }} members</span>
        <UButton
          type="button"
          size="xs"
          variant="ghost"
          color="neutral"
          :icon="fullscreen ? 'i-heroicons-arrows-pointing-in' : 'i-heroicons-arrows-pointing-out'"
          :title="fullscreen ? 'Exit full screen (Esc)' : 'Full screen'"
          :aria-label="fullscreen ? 'Exit full screen' : 'Full screen'"
          @click="toggleFullscreen"
        />
      </div>
    </div>

    <!-- disabled notice -->
    <div
      v-if="chatDisabled"
      class="m-4 p-6 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 text-center"
    >
      <UIcon name="i-heroicons-chat-bubble-left-right" class="w-8 h-8 mx-auto text-gray-400 mb-2" />
      <p class="text-sm font-semibold text-gray-900 dark:text-white">Chat is off for this tournament</p>
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {{ canModerate ? 'Enable it to give participants a room to coordinate — lobby codes, schedules, score reports.' : 'The organizer has disabled the chat for this tournament.' }}
      </p>
      <UButton
        v-if="canModerate"
        type="button"
        color="neutral"
        size="sm"
        icon="i-heroicons-bolt"
        label="Enable chat"
        class="mt-3 font-semibold"
        @click="emit('enable-chat')"
      />
    </div>

    <template v-else>
      <!-- pinned -->
      <div
        v-if="pinned"
        class="flex items-start gap-2.5 px-4 sm:px-5 py-3 bg-gray-50 dark:bg-white/[0.03] border-b border-gray-200 dark:border-white/10 text-[13px] leading-relaxed"
        :class="fullscreen && 'max-w-3xl w-full mx-auto'"
      >
        <span class="text-gray-400 shrink-0 mt-px">📌</span>
        <div class="text-gray-700 dark:text-gray-200">
          <b class="text-gray-900 dark:text-white">Pinned:</b> {{ pinned.text }}
        </div>
      </div>

      <!-- messages -->
      <div
        ref="listEl"
        class="flex-1 overflow-y-auto min-h-[220px] py-2"
        :class="[fullscreen ? 'max-w-3xl w-full mx-auto' : 'max-h-[520px]']"
        @scroll.passive="onListScroll"
      >
        <div v-if="loading" class="space-y-3 p-4">
          <USkeleton v-for="i in 4" :key="i" class="h-12 w-full rounded-xl bg-gray-100 dark:bg-white/5" />
        </div>

        <!-- load failure (transient API issues) — never leave skeletons hanging -->
        <div v-else-if="loadError" class="p-6 text-center">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-8 h-8 mx-auto text-gray-400 mb-2" />
          <p class="text-sm font-semibold text-gray-900 dark:text-white">Couldn't load the chat</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">The server didn't answer — it may be restarting.</p>
          <UButton
            type="button"
            size="sm"
            color="neutral"
            variant="soft"
            icon="i-heroicons-arrow-path"
            label="Retry"
            class="mt-3 font-semibold"
            :loading="loading"
            @click="loadInitial"
          />
        </div>

        <div
          v-else-if="messages.length === 0"
          class="text-center py-10 px-6"
        >
          <div class="inline-flex items-center justify-center w-11 h-11 rounded-full bg-gray-100 dark:bg-white/5 mb-3">
            <UIcon name="i-heroicons-chat-bubble-left-right" class="w-5 h-5 text-gray-400" />
          </div>
          <p class="text-sm font-medium text-gray-900 dark:text-white">No messages yet</p>
          <p class="text-xs text-gray-500 mt-1">Organizers usually kick things off with house rules or lobby details.</p>
        </div>

        <template v-else>
          <div v-if="nextCursor" class="px-4 pt-1 pb-2">
            <button
              type="button"
              class="text-[11px] font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:underline disabled:opacity-50"
              :disabled="loadingMore"
              @click="loadOlderAnchored"
            >
              {{ loadingMore ? 'Loading…' : 'Load earlier messages' }}
            </button>
          </div>

          <div
            v-for="m in messages"
            :key="m.id"
            :id="`chatmsg-${m.id}`"
            class="group relative flex gap-3 px-4 sm:px-5 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.025]"
            :class="[isOwn(m) && 'flex-row-reverse', railClass(m), flashId === m.id && 'bg-gray-200/60 dark:bg-white/[0.08]']"
          >
            <!-- avatar -->
            <span
              class="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden mt-0.5"
              :style="m.authorType === 'BOT' || m.authorType === 'SYSTEM'
                ? { background: '#4B5563' }
                : { background: avatarColor(m.author.name) }"
            >
              <img v-if="m.author.avatarUrl" :src="m.author.avatarUrl" class="w-full h-full object-cover" alt="" />
              <template v-else>{{ m.authorType === 'BOT' || m.authorType === 'SYSTEM' ? '✨' : initials(m.author.name) }}</template>
            </span>

            <div class="flex-1 min-w-0" :class="isOwn(m) && 'flex flex-col items-end'">
              <div class="flex items-baseline gap-2 flex-wrap" :class="isOwn(m) && 'flex-row-reverse'">
                <span class="text-[13px] font-bold text-gray-900 dark:text-white">{{ isOwn(m) ? 'You' : m.author.name }}</span>
                <span
                  v-if="m.authorType === 'ORGANIZER'"
                  class="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-white/10"
                >Organizer</span>
                <span
                  v-else-if="m.authorType === 'BOT'"
                  class="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-white/10"
                >AI · Paragee</span>
                <span
                  v-else-if="m.author.teamName"
                  class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/[0.08]"
                >{{ m.author.teamName }}</span>
                <span class="text-[10.5px] text-gray-400 dark:text-gray-500">{{ formatTime(m.createdAt) }}</span>
              </div>

              <!-- quoted reply -->
              <button
                v-if="m.replyTo"
                type="button"
                class="mt-0.5 mb-1 flex items-center gap-2 max-w-full text-left rounded-lg border-l-2 border-gray-400 dark:border-white/30 bg-gray-50 dark:bg-white/[0.03] px-2.5 py-1.5 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
                :class="isOwn(m) && 'border-l-0 border-r-2 text-right'"
                title="Jump to original message"
                @click="jumpTo(m.replyTo!.id)"
              >
                <UIcon name="i-heroicons-arrow-uturn-left" class="w-3 h-3 text-gray-400 shrink-0" />
                <span class="min-w-0">
                  <span class="block text-[10.5px] font-bold text-gray-900 dark:text-white truncate">{{ m.replyTo.authorName }}</span>
                  <span v-if="m.replyTo.deleted" class="block text-[11.5px] italic text-gray-400 dark:text-gray-500 truncate">Original message was deleted</span>
                  <span v-else class="block text-[11.5px] text-gray-500 dark:text-gray-400 truncate">{{ m.replyTo.text }}</span>
                </span>
              </button>

              <p
                class="text-[13px] leading-relaxed text-gray-700 dark:text-gray-300 mt-0.5 break-words whitespace-pre-wrap"
                :class="isOwn(m) && 'text-right'"
              >
                <template v-for="(part, i) in textParts(m.text)" :key="i"><ChatMentionChip
                  v-if="part.mention"
                  :name="part.text.slice(1)"
                  :members="members"
                  :bot-enabled="!!parageeBot?.enabled"
                /><template v-else>{{ part.text }}</template></template>
              </p>

              <!-- structured card (bot answers / score reports) -->
              <div
                v-if="m.cardType === 'FIXTURE' && m.cardPayload"
                class="mt-2 max-w-md rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] p-3.5"
              >
                <p class="text-[10px] font-extrabold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1.5">
                  {{ fixtureCard(m).label }}
                </p>
                <p class="text-sm font-bold text-gray-900 dark:text-white">
                  {{ fixtureCard(m).home }} <span class="font-mono text-xs text-gray-400 font-normal">vs</span> {{ fixtureCard(m).away }}
                </p>
                <p v-if="fixtureCard(m).meta" class="text-[11.5px] text-gray-500 mt-1">{{ fixtureCard(m).meta }}</p>
                <NuxtLink
                  v-if="fixtureCard(m).href"
                  :to="cardTo(fixtureCard(m).href)"
                  :external="isManage"
                  class="inline-flex items-center gap-1 mt-2 text-[11.5px] font-bold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1 hover:bg-gray-200 dark:hover:bg-white/15 transition-colors"
                >View fixture →</NuxtLink>
              </div>

              <!-- ranked rows card (table / top scorers) -->
              <div
                v-if="(m.cardType === 'TABLE' || m.cardType === 'STATS') && m.cardPayload"
                class="mt-2 max-w-sm rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] p-3.5"
              >
                <p class="text-[10px] font-extrabold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">
                  {{ rowsCard(m).title }}
                </p>
                <div
                  v-for="row in rowsCard(m).rows"
                  :key="row.rank ?? row.name"
                  class="flex items-center justify-between gap-3 py-1 text-[12.5px]"
                >
                  <span class="flex items-center gap-2 min-w-0">
                    <span
                      class="font-mono font-bold w-4 text-center text-gray-500 dark:text-gray-400"
                    >{{ row.rank }}</span>
                    <span class="font-semibold text-gray-900 dark:text-white truncate">{{ row.name }}</span>
                  </span>
                  <span class="font-mono font-bold text-gray-700 dark:text-gray-200 tabular-nums">{{ row.value }}</span>
                </div>
              </div>

              <!-- score submitted (awaiting opponent) -->
              <div
                v-if="m.cardType === 'SCORE_SUBMITTED' && m.cardPayload"
                class="mt-2 max-w-md rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] p-3.5"
              >
                <p class="text-[10px] font-extrabold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1.5">⏳ Score submitted — awaiting opponent</p>
                <p class="text-sm font-bold text-gray-900 dark:text-white">
                  {{ scoreCard(m).submittedBy }} <span class="text-gray-400 font-normal text-xs">reports</span>
                  <span class="font-mono text-lg mx-1">{{ scoreCard(m).score?.home }} – {{ scoreCard(m).score?.away }}</span>
                  <span class="text-gray-400 font-normal text-xs"> in {{ scoreCard(m).home }} vs {{ scoreCard(m).away }}</span>
                </p>
                <p class="text-[11.5px] text-gray-500 mt-1">
                  {{ scoreCard(m).evidenceAttached ? 'Evidence attached 🖼 · ' : '' }}The opponent submits their own score — if it matches, the result goes official.
                </p>
                <NuxtLink
                  v-if="scoreCard(m).href"
                  :to="cardTo(scoreCard(m).href)"
                  :external="isManage"
                  class="inline-flex items-center gap-1 mt-2 text-[11.5px] font-bold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1 hover:bg-gray-200 dark:hover:bg-white/15 transition-colors"
                >Submit your score →</NuxtLink>
              </div>

              <!-- result confirmed -->
              <div
                v-if="m.cardType === 'SCORE_CONFIRMED' && m.cardPayload"
                class="mt-2 max-w-md rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] p-3.5"
              >
                <p class="text-[10px] font-extrabold uppercase tracking-widest text-gray-600 dark:text-gray-400 mb-1.5">
                  ✓ Result confirmed{{ scoreCard(m).by === 'organizer' ? ' by the organizer' : '' }}
                </p>
                <p class="text-sm font-bold text-gray-900 dark:text-white">
                  {{ scoreCard(m).home }}
                  <span class="font-mono text-lg">{{ scoreCard(m).score?.home }} – {{ scoreCard(m).score?.away }}</span>
                  {{ scoreCard(m).away }}
                </p>
                <p class="text-[11.5px] text-gray-500 mt-1">{{ scoreCard(m).by === 'organizer' ? 'Verdict applied to the fixture.' : 'Both entries matched · fixture updated.' }}</p>
              </div>

              <!-- score conflict -->
              <div
                v-if="m.cardType === 'SCORE_CONFLICT' && m.cardPayload"
                class="mt-2 max-w-md rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] p-3.5"
              >
                <p class="text-[10px] font-extrabold uppercase tracking-widest text-gray-700 dark:text-gray-300 mb-2">⚠ Score conflict — under review</p>
                <div
                  v-for="claim in scoreCard(m).claims"
                  :key="claim.participantName"
                  class="flex items-center justify-between gap-3 py-1 text-[12.5px] border-t border-gray-100 dark:border-white/[0.06] first:border-t-0"
                >
                  <span class="text-gray-700 dark:text-gray-300">
                    {{ claim.participantName }}'s entry <span v-if="claim.evidenceUrl" class="text-gray-400">· 🖼</span>
                  </span>
                  <span class="font-mono font-bold text-gray-900 dark:text-white tabular-nums">{{ claim.score.home }} – {{ claim.score.away }}</span>
                </div>
                <p class="text-[11.5px] text-gray-500 mt-2">Entries don't match — nothing is applied until the organizer decides.</p>
                <button
                  v-if="canModerate && scoreCard(m).fixtureId"
                  type="button"
                  class="mt-2 inline-flex items-center gap-1 text-[11.5px] font-bold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1 hover:bg-gray-200 dark:hover:bg-white/15 transition-colors"
                  @click="emit('review-dispute', scoreCard(m).fixtureId!)"
                >Review dispute →</button>
              </div>

              <!-- reaction chips -->
              <div
                v-if="m.reactions?.length"
                class="flex flex-wrap gap-1.5 mt-1.5"
                :class="isOwn(m) && 'justify-end'"
              >
                <button
                  v-for="r in m.reactions"
                  :key="r.emoji"
                  type="button"
                  class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] transition-colors"
                  :class="r.mine
                    ? 'bg-gray-200 dark:bg-white/15 border-gray-400 dark:border-white/30 text-gray-900 dark:text-white font-semibold'
                    : 'bg-gray-50 dark:bg-white/[0.04] border-gray-200 dark:border-white/[0.08] text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-white/20'"
                  :disabled="!canPost"
                  :title="r.mine ? 'Remove your reaction' : 'React'"
                  @click="pickReaction(m, r.emoji)"
                >
                  <span>{{ r.emoji }}</span>
                  <span class="font-mono text-[10.5px] font-bold tabular-nums">{{ r.count }}</span>
                </button>
              </div>
            </div>

            <!-- hover actions: react + reply (anyone who can post) + moderation -->
            <div
              v-if="canModerate || canPost"
              class="absolute top-1.5 hidden group-hover:flex items-center gap-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-lg p-0.5 shadow-lg"
              :class="isOwn(m) ? 'left-3' : 'right-3'"
            >
              <div v-if="canPost" class="relative">
                <UButton
                  type="button"
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  icon="i-heroicons-face-smile"
                  title="React"
                  @click.stop="toggleReactPicker(m.id)"
                />
                <!-- emoji picker -->
                <div
                  v-if="reactPickerFor === m.id"
                  class="absolute bottom-full mb-1.5 z-20 flex gap-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl p-1 shadow-xl shadow-black/10 dark:shadow-black/50"
                  :class="isOwn(m) ? 'left-0' : 'right-0'"
                  @click.stop
                >
                  <button
                    v-for="e in REACTION_EMOJIS"
                    :key="e"
                    type="button"
                    class="w-7 h-7 rounded-lg text-[15px] hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                    @click="pickReaction(m, e)"
                  >{{ e }}</button>
                </div>
              </div>
              <UButton
                v-if="canPost"
                type="button"
                size="xs"
                variant="ghost"
                color="neutral"
                icon="i-heroicons-arrow-uturn-left"
                title="Reply"
                @click="startReply(m)"
              />
              <template v-if="canModerate">
                <UButton
                  type="button"
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  :icon="pinned?.id === m.id ? 'i-heroicons-bookmark-slash' : 'i-heroicons-bookmark'"
                  :title="pinned?.id === m.id ? 'Unpin' : 'Pin'"
                  @click="setPin(m.id, pinned?.id !== m.id)"
                />
                <UButton
                  type="button"
                  size="xs"
                  variant="ghost"
                  color="error"
                  icon="i-heroicons-trash"
                  title="Delete"
                  @click="removeMessage(m.id)"
                />
              </template>
            </div>
          </div>

          <!-- Paragee thinking (LLM tier at work) — pinned to the end of the list -->
          <div
            v-if="botThinking"
            class="flex gap-3 px-4 sm:px-5 py-2 bg-gray-50 dark:bg-white/[0.02] border-l-2 border-l-gray-300 dark:border-l-white/20"
            aria-live="polite"
          >
            <span
              class="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white mt-0.5"
              style="background: #4B5563"
            >✨</span>
            <div class="flex-1 min-w-0">
              <div class="flex items-baseline gap-2">
                <span class="text-[13px] font-bold text-gray-900 dark:text-white">Paragee</span>
                <span class="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-white/10">AI · Paragee</span>
              </div>
              <p class="text-[13px] text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
                thinking
                <span class="flex items-end gap-0.5 h-3">
                  <span class="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce"></span>
                  <span class="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce [animation-delay:120ms]"></span>
                  <span class="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce [animation-delay:240ms]"></span>
                </span>
              </p>
            </div>
          </div>
        </template>
      </div>

      <!-- typing indicator (fixed height — no layout shift) -->
      <div
        class="h-6 px-4 sm:px-5 flex items-center gap-2 text-[11px] text-gray-400 dark:text-gray-500 transition-opacity duration-200"
        :class="[fullscreen && 'max-w-3xl w-full mx-auto', typingText ? 'opacity-100' : 'opacity-0']"
        aria-live="polite"
      >
        <span v-if="typingText" class="flex items-center gap-1.5">
          <!-- stacked avatars (newest typer in front) -->
          <span class="flex items-center -space-x-1.5">
            <span
              v-for="u in typingUsers"
              :key="u.name"
              class="w-4 h-4 rounded-full shrink-0 overflow-hidden ring-2 ring-white dark:ring-gray-900 flex items-center justify-center text-[6.5px] font-bold text-white"
              :style="{ background: avatarColor(u.name) }"
              :title="u.name"
            >
              <img v-if="u.avatarUrl" :src="u.avatarUrl" class="w-full h-full object-cover" alt="" />
              <template v-else>{{ initials(u.name) }}</template>
            </span>
          </span>
          <span class="flex items-end gap-0.5 h-3">
            <span class="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce"></span>
            <span class="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce [animation-delay:120ms]"></span>
            <span class="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce [animation-delay:240ms]"></span>
          </span>
          {{ typingText }}
        </span>
      </div>

      <!-- quick-ask chips -->
      <div v-if="quickChips.length && canPost" class="flex gap-2 flex-wrap px-4 sm:px-5 pt-2.5" :class="fullscreen && 'max-w-3xl w-full mx-auto'">
        <button
          v-for="chip in quickChips"
          :key="chip"
          type="button"
          class="text-[11px] font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.05] border border-gray-200 dark:border-white/10 rounded-full px-3 py-1.5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
          @click="askChip(chip)"
        >✨ {{ chip }}</button>
      </div>

      <!-- composer -->
      <div
        v-if="canPost"
        class="relative border-t border-gray-100 dark:border-white/[0.06] px-4 sm:px-5 py-3.5 flex items-end gap-2.5 flex-wrap bg-gray-50/50 dark:bg-white/[0.015]"
        :class="fullscreen && 'max-w-3xl w-full mx-auto pb-[max(env(safe-area-inset-bottom),0.875rem)]'"
      >
        <!-- replying-to bar -->
        <div
          v-if="replyTarget"
          class="w-full flex items-center gap-2 rounded-lg border-l-2 border-gray-400 dark:border-white/30 bg-white dark:bg-white/[0.03] px-3 py-1.5"
        >
          <UIcon name="i-heroicons-arrow-uturn-left" class="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span class="min-w-0 flex-1">
            <span class="block text-[10.5px] font-bold text-gray-900 dark:text-white">Replying to {{ replyTarget.author.name }}</span>
            <span class="block text-[11.5px] text-gray-500 dark:text-gray-400 truncate">{{ replyTarget.text }}</span>
          </span>
          <UButton
            type="button"
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-heroicons-x-mark"
            title="Cancel reply"
            @click="cancelReply"
          />
        </div>
        <!-- @mention autocomplete -->
        <div
          v-if="mentionOpen"
          class="absolute bottom-full left-4 sm:left-5 mb-2 w-72 max-w-[calc(100%-2rem)] rounded-xl border border-gray-200 dark:border-white/[0.12] bg-white dark:bg-gray-800 shadow-xl shadow-black/10 dark:shadow-black/50 overflow-hidden z-20"
        >
          <p class="px-3 py-1.5 text-[9.5px] font-extrabold uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-white/[0.06]">
            Mention
          </p>
          <button
            v-for="(m, i) in mentionMatches"
            :key="m.id"
            type="button"
            class="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors"
            :class="i === mentionIndex ? 'bg-gray-100 dark:bg-white/10' : 'hover:bg-gray-50 dark:hover:bg-white/[0.04]'"
            @mousedown.prevent="selectMention(m)"
            @mouseenter="mentionIndex = i"
          >
            <span
              class="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[8.5px] font-bold text-white"
              :style="m.bot ? { background: '#4B5563' } : { background: avatarColor(m.name) }"
            >{{ m.bot ? '✨' : initials(m.name) }}</span>
            <span class="min-w-0">
              <span class="block text-[12.5px] font-semibold text-gray-900 dark:text-white truncate">@{{ m.name }}</span>
              <span v-if="m.sub" class="block text-[10.5px] text-gray-400 truncate">{{ m.sub }}</span>
            </span>
          </button>
        </div>

        <UTextarea
          ref="composerEl"
          v-model="draft"
          :placeholder="composerPlaceholder"
          :rows="1"
          autoresize
          :maxrows="4"
          class="flex-1"
          :disabled="sending"
          @keydown="onComposerKeydown"
        />
        <UButton
          type="button"
          color="primary"
          icon="i-heroicons-paper-airplane"
          :loading="sending"
          :disabled="!draft.trim()"
          @click="sendDraft"
        >Send</UButton>
      </div>

      <!-- locked composer -->
      <div
        v-else
        class="border-t border-gray-100 dark:border-white/[0.06] px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap bg-gray-50/50 dark:bg-white/[0.015]"
        :class="fullscreen && 'max-w-3xl w-full mx-auto'"
      >
        <div class="flex items-center gap-2.5 text-[12.5px] text-gray-500 dark:text-gray-400">
          <span class="w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center shrink-0">🔒</span>
          Only approved participants and organizers can post.
        </div>
        <UButton
          v-if="joinUrl"
          type="button"
          size="xs"
          variant="outline"
          color="neutral"
          label="Join tournament to chat"
          trailing-icon="i-heroicons-arrow-right"
          :to="joinUrl"
        />
      </div>

      <!-- scroll-to-bottom FAB — fixed to the viewport so it's reachable even when
           the card's bottom edge is below the fold; hidden when the card is off-screen -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-2"
      >
        <button
          v-if="!isNearBottom && cardVisible"
          type="button"
          class="fixed bottom-24 md:bottom-8 z-40 w-10 h-10 rounded-full bg-gray-900 dark:bg-white border border-gray-700 dark:border-gray-200 shadow-lg shadow-black/20 flex items-center justify-center text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          :style="{ right: `${fabRight}px` }"
          title="Scroll to latest messages"
          aria-label="Scroll to latest messages"
          @click="scrollToBottom(true, true)"
        >
          <UIcon name="i-heroicons-chevron-double-down" class="w-5 h-5" />
        </button>
      </Transition>
    </template>
  </div>
</template>
