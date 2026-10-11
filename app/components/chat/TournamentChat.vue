<script setup lang="ts">
import type { ParageeBotFlags, ChatMessage, Fixture, Tournament } from '~/types'
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
    // optional fixtures & tournament for esports match HUD & direct score reporting
    fixtures?: any[]
    tournament?: Tournament | any | null
  }>(),
  {
    canModerate: false,
    parageeBot: null,
    members: () => [],
    viewerParticipantId: null,
    fixtures: () => [],
    tournament: null,
  },
)

const { handleError } = useErrors()
const toast = useToast()
const authStore = useAuthStore()
const route = useRoute()
const { allowsSelfReporting } = useTournamentFeatures(toRef(props, 'tournament'))

// Own messages go right: organizers own their ORGANIZER posts (manage),
// participants own messages authored as their participant identity (fan)
function isOwn(m: ChatMessage) {
  if (props.canPost === 'organizer') return m.authorType === 'ORGANIZER'
  if (props.canPost === 'participant') return !!props.viewerParticipantId && m.author.participantId === props.viewerParticipantId
  return false
}

// Notifications & audio chimes
const {
  level: notifyLevel,
  soundEnabled: notifySound,
  permission: notifyPermission,
  setLevel: setNotifyLevel,
  toggleSound: toggleNotifySound,
  notifyMessage,
} = useChatNotifications({
  tournamentId: toRef(props, 'tournamentId'),
  tournamentName: computed(() => props.tournament?.name),
  tournamentLogo: computed(() => props.tournament?.logoUrl),
  viewerParticipantId: toRef(props, 'viewerParticipantId'),
  viewerName: computed(() => {
    if (props.viewerParticipantId && props.members?.length) {
      const p = props.members.find((m) => m.id === props.viewerParticipantId)
      if (p) return p.name
    }
    return authStore.user?.name || null
  }),
  isOrganizer: computed(() => props.canPost === 'organizer'),
})

const notificationMenuItems = computed(() => [
  [
    {
      label: 'Notification preferences',
      type: 'label' as const,
      disabled: true,
    },
  ],
  [
    {
      label: 'Mentions & Highlights',
      icon: notifyLevel.value === 'mentions' ? 'i-heroicons-check' : 'i-heroicons-at-symbol',
      active: notifyLevel.value === 'mentions',
      onSelect: () => setNotifyLevel('mentions'),
    },
    {
      label: 'All messages',
      icon: notifyLevel.value === 'all' ? 'i-heroicons-check' : 'i-heroicons-chat-bubble-left-right',
      active: notifyLevel.value === 'all',
      onSelect: () => setNotifyLevel('all'),
    },
    {
      label: 'Mute notifications',
      icon: notifyLevel.value === 'none' ? 'i-heroicons-check' : 'i-heroicons-bell-slash',
      active: notifyLevel.value === 'none',
      onSelect: () => setNotifyLevel('none'),
    },
  ],
  [
    {
      label: notifySound.value ? 'Sound effects (On)' : 'Sound effects (Muted)',
      icon: notifySound.value ? 'i-heroicons-speaker-wave' : 'i-heroicons-speaker-x-mark',
      onSelect: () => toggleNotifySound(),
    },
  ],
])

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
} = useTournamentChat(toRef(props, 'tournamentId'), {
  onNewMessage: (msg) => {
    notifyMessage(msg, isOwn(msg))
  },
})

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

const quickChips = computed(() => {
  const chips: string[] = []
  if (viewerActiveFixture.value && viewerFixtureState.value !== 'awaitingOpponent' && props.canPost === 'participant') {
    chips.push('Submit score')
  }
  if (botActive.value && props.parageeBot?.quickChips) {
    chips.push('My next match', 'Current table', 'Top scorer', 'Rules')
  }
  return chips
})

// Composer hint: show slash command support when bot or self-reporting is active
const composerPlaceholder = computed(() => {
  if (props.canPost === 'organizer') return 'Post as Organizer — announcements get a gold rail…'
  return botActive.value || allowsSelfReporting.value
    ? 'Message the room… (Type / for commands · @ to mention)'
    : 'Message the room… (Enter to send · @ to mention)'
})

function askChip(label: string) {
  if (label === 'Submit score') {
    openSubmitModalForActive()
    return
  }
  draft.value = `@paragee ${label === 'Rules' ? 'rules' : label.toLowerCase()}`
  sendDraft()
}

async function sendDraft() {
  const trimmed = draft.value.trim()
  const matchCmd = availableSlashCommands.value.find((c) => c.cmd.toLowerCase() === trimmed.toLowerCase())
  if (matchCmd) {
    draft.value = ''
    closeSlash()
    matchCmd.action()
    return
  }
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

// ─── Slash command autocomplete ─────────────────────────
interface SlashCommand {
  cmd: string
  label: string
  desc: string
  icon: string
  action: () => void
}

const slashOpen = ref(false)
const slashIndex = ref(0)
const slashQuery = ref('')

const availableSlashCommands = computed<SlashCommand[]>(() => {
  const cmds: SlashCommand[] = [
    {
      cmd: '/next',
      label: '/next',
      desc: 'Next match countdown & opponent',
      icon: 'i-heroicons-clock',
      action: () => {
        draft.value = '@paragee my next match'
        sendDraft()
      },
    },
    {
      cmd: '/table',
      label: '/table',
      desc: 'Current standings table snapshot',
      icon: 'i-heroicons-table-cells',
      action: () => {
        draft.value = '@paragee current table'
        sendDraft()
      },
    },
    {
      cmd: '/topscorer',
      label: '/topscorer',
      desc: 'Top scorers leaderboard',
      icon: 'i-heroicons-chart-bar',
      action: () => {
        draft.value = '@paragee top scorer'
        sendDraft()
      },
    },
    {
      cmd: '/rules',
      label: '/rules',
      desc: 'Official tournament house rules',
      icon: 'i-heroicons-document-text',
      action: () => {
        draft.value = '@paragee rules'
        sendDraft()
      },
    },
  ]

  if (allowsSelfReporting.value) {
    cmds.unshift({
      cmd: '/score',
      label: '/score',
      desc: 'Submit or verify match score',
      icon: 'i-heroicons-trophy',
      action: () => {
        draft.value = ''
        if (viewerActiveFixture.value) {
          openSubmitModalForActive()
        } else {
          toast.add({ title: 'No active match found to submit score for', color: 'neutral' })
        }
      },
    })
  }

  const q = slashQuery.value.toLowerCase().trim()
  if (!q) return cmds
  return cmds.filter((c) => c.cmd.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q))
})

function executeSlash(c: SlashCommand) {
  closeSlash()
  c.action()
}

function closeSlash() {
  slashOpen.value = false
  slashQuery.value = ''
  slashIndex.value = 0
}

function onComposerKeydown(e: KeyboardEvent) {
  // slash command navigation takes precedence when slash menu is open
  if (slashOpen.value) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      slashIndex.value = (slashIndex.value + 1) % availableSlashCommands.value.length
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      slashIndex.value = (slashIndex.value - 1 + availableSlashCommands.value.length) % availableSlashCommands.value.length
      return
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      const c = availableSlashCommands.value[slashIndex.value]
      if (c) {
        e.preventDefault()
        executeSlash(c)
        return
      }
    }
    if (e.key === 'Escape') {
      e.stopPropagation()
      closeSlash()
      return
    }
  }

  // mention autocomplete navigation
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
    list.push({ id: 'paragee', name: 'paragee', sub: 'Tournament bot — schedule, table, top scorers, rules', bot: true })
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

  // Slash commands trigger when text begins with '/' without spaces
  if (val.startsWith('/') && !val.includes(' ') && !val.includes('\n')) {
    slashQuery.value = val.slice(1)
    slashOpen.value = availableSlashCommands.value.length > 0
    slashIndex.value = 0
    closeMention()
    return
  } else {
    closeSlash()
  }

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
    // First non-empty render after mount: open at latest message or jumped hash message
    if (!initialScrolled.value) {
      if (messages.value.length === 0) return
      initialScrolled.value = true
      if (route.hash && route.hash.startsWith('#chatmsg-')) {
        const targetId = route.hash.replace('#chatmsg-', '')
        nextTick(() => jumpTo(targetId))
      } else {
        scrollToBottom(true)
      }
      return
    }
    // live arrivals glide; prepends (load-earlier) are handled by the anchor
    if (!anchoring) scrollToBottom(false, true)
  },
)

watch(
  () => route.hash,
  (newHash) => {
    if (newHash && newHash.startsWith('#chatmsg-')) {
      const targetId = newHash.replace('#chatmsg-', '')
      jumpTo(targetId)
    }
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


function railClass(m: ChatMessage) {
  const own = isOwn(m)
  if (m.authorType === 'ORGANIZER') {
    return own
      ? 'bg-amber-500/[0.02] dark:bg-amber-400/[0.025] border-r-2 border-r-amber-500/40 dark:border-r-amber-400/40'
      : 'bg-amber-500/[0.02] dark:bg-amber-400/[0.025] border-l-2 border-l-amber-500/40 dark:border-l-amber-400/40'
  }
  if (m.authorType === 'BOT' || m.authorType === 'SYSTEM') {
    return 'bg-indigo-500/[0.015] dark:bg-indigo-400/[0.02] border-l-2 border-l-indigo-500/40 dark:border-l-indigo-400/40'
  }
  return own
    ? 'bg-primary-500/[0.015] dark:bg-primary-400/[0.02] border-r-2 border-r-primary-500/40 dark:border-r-primary-400/40'
    : 'border-l-2 border-l-transparent'
}

// Structured bot cards (cardType) — FIXTURE renders per the approved design;
// TABLE/STATS render as compact ranked rows; score-report cards land with
// the submissions phase
function fixtureCard(m: ChatMessage) {
  const p = m.cardPayload ?? {}
  return {
    fixtureId: p.fixtureId ?? null,
    homeTeamId: p.homeTeamId ?? null,
    awayTeamId: p.awayTeamId ?? null,
    label: p.round ?? 'Fixture',
    round: p.round ?? 'Fixture',
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
    submittedParticipantId: p.submittedParticipantId ?? null,
    homeTeamId: p.homeTeamId ?? null,
    awayTeamId: p.awayTeamId ?? null,
    evidenceAttached: !!p.evidenceAttached,
    evidenceUrl: p.evidenceUrl ?? null,
    by: p.by ?? 'players',
    href: p.href ?? null,
    claims: (p.claims ?? []) as { participantName: string; score: { home: number; away: number }; evidenceUrl?: string | null }[],
    fixtureId: p.fixtureId ?? null,
  }
}

const emit = defineEmits<{
  (e: 'review-dispute', fixtureId: string): void
  (e: 'enable-chat'): void
  (e: 'score-submitted', result: { state: string }): void
}>()

// Card hrefs are site paths; from the manage host they must become absolute
// main-site URLs (the marketing routes don't exist under manage.*)
const { toMain, isManage } = useHost()
const cardTo = (href: string | null) => (href ? toMain(href) : null)

// ─── Esports Score Submissions & Active Match HUD ──────────────────
interface Submission {
  id: string
  participantId: string
  participantName: string
  homeScore: number
  awayScore: number
  evidenceUrl?: string | null
  note?: string | null
  status: 'PENDING' | 'MATCHED' | 'CONFLICT' | 'APPLIED' | 'DISMISSED'
}

const internalFixtures = ref<any[]>([])
const loadedFixtures = computed(() => {
  if (props.fixtures && props.fixtures.length > 0) return props.fixtures
  return internalFixtures.value
})

async function ensureFixturesLoaded() {
  if (props.fixtures?.length || !props.tournamentId) return
  try {
    const res = await $api<{ success: boolean; data: any }>(`/tournaments/${props.tournamentId}/overview`)
    if (res.data?.fixtures) {
      internalFixtures.value = res.data.fixtures
    }
  } catch {
    // ignore
  }
}
onMounted(ensureFixturesLoaded)

const viewerOpenFixtures = computed(() => {
  if (!props.viewerParticipantId) return []
  return (loadedFixtures.value || []).filter((f: any) => {
    const isParticipant = f.homeTeamId === props.viewerParticipantId || f.awayTeamId === props.viewerParticipantId
    const isOpen = f.status !== 'COMPLETED' && f.status !== 'CANCELLED'
    return isParticipant && isOpen
  })
})

const activeFixtureIndex = ref(0)
const viewerActiveFixture = computed(() => {
  if (!allowsSelfReporting.value) return null
  if (!viewerOpenFixtures.value.length) return null
  const idx = Math.min(activeFixtureIndex.value, viewerOpenFixtures.value.length - 1)
  return viewerOpenFixtures.value[idx] || viewerOpenFixtures.value[0]
})

function cycleNextFixture() {
  if (viewerOpenFixtures.value.length <= 1) return
  activeFixtureIndex.value = (activeFixtureIndex.value + 1) % viewerOpenFixtures.value.length
  loadFixtureSubmissions()
}

const activeSubmissions = ref<Submission[]>([])
const loadingActiveSubmissions = ref(false)

async function loadFixtureSubmissions() {
  if (!viewerActiveFixture.value?.id) {
    activeSubmissions.value = []
    return
  }
  try {
    loadingActiveSubmissions.value = true
    const res = await $api<{ success: boolean; data: { submissions: Submission[] } }>(
      `/fixtures/${viewerActiveFixture.value.id}/score-submissions`,
    )
    activeSubmissions.value = res.data?.submissions || []
  } catch {
    activeSubmissions.value = []
  } finally {
    loadingActiveSubmissions.value = false
  }
}

watch(
  () => viewerActiveFixture.value?.id,
  () => {
    loadFixtureSubmissions()
  },
  { immediate: true },
)

// Watch incoming messages to refresh submission state when a score card arrives
watch(
  () => messages.value.length,
  () => {
    const latest = messages.value[messages.value.length - 1]
    if (
      latest &&
      (latest.cardType === 'SCORE_SUBMITTED' ||
        latest.cardType === 'SCORE_CONFIRMED' ||
        latest.cardType === 'SCORE_CONFLICT')
    ) {
      loadFixtureSubmissions()
    }
  },
)

const myActiveEntry = computed(() =>
  activeSubmissions.value.find(
    (s) => s.participantId === props.viewerParticipantId && (s.status === 'PENDING' || s.status === 'CONFLICT'),
  ),
)

const opponentActiveEntry = computed(() =>
  activeSubmissions.value.find(
    (s) => s.participantId !== props.viewerParticipantId && (s.status === 'PENDING' || s.status === 'CONFLICT'),
  ),
)

const activeHasConflict = computed(() =>
  activeSubmissions.value.some((s) => s.status === 'CONFLICT'),
)

const viewerFixtureState = computed<'none' | 'awaitingOpponent' | 'awaitingMe' | 'conflict'>(() => {
  if (activeHasConflict.value) return 'conflict'
  if (myActiveEntry.value && !opponentActiveEntry.value) return 'awaitingOpponent'
  if (!myActiveEntry.value && opponentActiveEntry.value) return 'awaitingMe'
  return 'none'
})

const isViewerHome = computed(() => {
  return viewerActiveFixture.value?.homeTeamId === props.viewerParticipantId
})

const activeHomeName = computed(() => {
  const f = viewerActiveFixture.value
  return f?.homeTeam?.customName ?? f?.homeTeam?.team?.name ?? 'Home'
})

const activeAwayName = computed(() => {
  const f = viewerActiveFixture.value
  return f?.awayTeam?.customName ?? f?.awayTeam?.team?.name ?? 'Away'
})

// Modals state
const scoreModalOpen = ref(false)
const scoreModalFixture = ref<any>(null)
const scoreModalPrefill = ref<{ home?: number | null; away?: number | null; note?: string } | null>(null)
const scoreModalMode = ref<'submit' | 'dispute' | 'edit'>('submit')

const proofLightboxOpen = ref(false)
const proofLightboxUrl = ref<string | null>(null)
const proofLightboxTitle = ref<string>('')

function openProof(url: string | null, title = 'Screenshot evidence') {
  if (!url) return
  proofLightboxUrl.value = url
  proofLightboxTitle.value = title
  proofLightboxOpen.value = true
}

function openSubmitModalForActive() {
  if (!viewerActiveFixture.value) return
  scoreModalFixture.value = viewerActiveFixture.value
  scoreModalMode.value = myActiveEntry.value ? 'edit' : 'submit'
  scoreModalPrefill.value = myActiveEntry.value
    ? { home: myActiveEntry.value.homeScore, away: myActiveEntry.value.awayScore, note: myActiveEntry.value.note || '' }
    : null
  scoreModalOpen.value = true
}

function openDisputeModalForActive() {
  if (!viewerActiveFixture.value) return
  scoreModalFixture.value = viewerActiveFixture.value
  scoreModalMode.value = 'dispute'
  scoreModalPrefill.value = opponentActiveEntry.value
    ? { home: opponentActiveEntry.value.homeScore, away: opponentActiveEntry.value.awayScore }
    : null
  scoreModalOpen.value = true
}

const quickConfirming = ref(false)
async function confirmOpponentScore() {
  if (!viewerActiveFixture.value?.id || !opponentActiveEntry.value) return
  quickConfirming.value = true
  try {
    const res = await $api<{ success: boolean; data: { state: string } }>(
      `/fixtures/${viewerActiveFixture.value.id}/score-submissions`,
      {
        method: 'POST',
        body: {
          homeScore: opponentActiveEntry.value.homeScore,
          awayScore: opponentActiveEntry.value.awayScore,
        },
      },
    )
    toast.add({
      title: 'Result confirmed ✅ Match verified!',
      color: 'success',
    })
    await loadFixtureSubmissions()
  } catch (err: any) {
    handleError(err, { title: 'Confirmation failed' })
  } finally {
    quickConfirming.value = false
  }
}

function getCardFixture(card: ReturnType<typeof scoreCard>) {
  if (!card.fixtureId) return null
  return (loadedFixtures.value || []).find((f: any) => f.id === card.fixtureId) || null
}

function isOpponentOfCard(m: ChatMessage) {
  if (!props.viewerParticipantId) return false
  const card = scoreCard(m)

  if (card.submittedParticipantId && (card.homeTeamId || card.awayTeamId)) {
    const isParticipant = props.viewerParticipantId === card.homeTeamId || props.viewerParticipantId === card.awayTeamId
    const isSubmitter = props.viewerParticipantId === card.submittedParticipantId
    return isParticipant && !isSubmitter
  }

  const f = getCardFixture(card)
  if (f) {
    const isParticipant = f.homeTeamId === props.viewerParticipantId || f.awayTeamId === props.viewerParticipantId
    const isSubmitter =
      (myActiveEntry.value && f.id === viewerActiveFixture.value?.id) ||
      card.submittedParticipantId === props.viewerParticipantId
    return isParticipant && !isSubmitter
  }

  return false
}

function isSubmitterOfCard(m: ChatMessage) {
  if (!props.viewerParticipantId) return false
  const card = scoreCard(m)
  if (card.submittedParticipantId) {
    return card.submittedParticipantId === props.viewerParticipantId
  }
  const f = getCardFixture(card)
  if (f && f.id === viewerActiveFixture.value?.id && myActiveEntry.value) {
    return true
  }
  return false
}

const cardConfirmingFixtureId = ref<string | null>(null)
async function confirmCardScore(card: ReturnType<typeof scoreCard>) {
  if (!card.fixtureId || !card.score) return
  cardConfirmingFixtureId.value = card.fixtureId
  try {
    const res = await $api<{ success: boolean; data: { state: string } }>(
      `/fixtures/${card.fixtureId}/score-submissions`,
      {
        method: 'POST',
        body: {
          homeScore: card.score.home,
          awayScore: card.score.away,
        },
      },
    )
    toast.add({
      title: 'Result confirmed ✅ Match verified!',
      color: 'success',
    })
    await loadFixtureSubmissions()
  } catch (err: any) {
    handleError(err, { title: 'Confirmation failed' })
  } finally {
    cardConfirmingFixtureId.value = null
  }
}

function disputeCardScore(card: ReturnType<typeof scoreCard>) {
  const f = getCardFixture(card) || {
    id: card.fixtureId,
    homeTeam: { customName: card.home },
    awayTeam: { customName: card.away },
    homeTeamId: card.homeTeamId,
    awayTeamId: card.awayTeamId,
    roundName: 'Match',
    round: 1,
  }
  scoreModalFixture.value = f
  scoreModalMode.value = 'dispute'
  scoreModalPrefill.value = card.score ? { home: card.score.home, away: card.score.away } : null
  scoreModalOpen.value = true
}

function openSubmitModalForCard(card: ReturnType<typeof scoreCard>) {
  const f = getCardFixture(card) || {
    id: card.fixtureId,
    homeTeam: { customName: card.home },
    awayTeam: { customName: card.away },
    homeTeamId: card.homeTeamId,
    awayTeamId: card.awayTeamId,
    roundName: 'Match',
    round: 1,
  }
  scoreModalFixture.value = f
  scoreModalMode.value = 'edit'
  scoreModalPrefill.value = card.score ? { home: card.score.home, away: card.score.away } : null
  scoreModalOpen.value = true
}

function canSubmitForFixtureCard(m: ChatMessage) {
  if (!props.viewerParticipantId) return false
  const p = m.cardPayload ?? {}
  if (p.homeTeamId === props.viewerParticipantId || p.awayTeamId === props.viewerParticipantId) {
    return true
  }
  const f = (loadedFixtures.value || []).find((x: any) => x.id === p.fixtureId)
  if (f && (f.homeTeamId === props.viewerParticipantId || f.awayTeamId === props.viewerParticipantId)) {
    return f.status !== 'COMPLETED' && f.status !== 'CANCELLED'
  }
  return false
}

function openSubmitModalForFixtureCard(m: ChatMessage) {
  const p = m.cardPayload ?? {}
  const card = fixtureCard(m)
  const f = (loadedFixtures.value || []).find((x: any) => x.id === p.fixtureId) || {
    id: p.fixtureId,
    homeTeam: { customName: card.home },
    awayTeam: { customName: card.away },
    homeTeamId: p.homeTeamId,
    awayTeamId: p.awayTeamId,
    roundName: card.round,
    round: 1,
  }
  scoreModalFixture.value = f
  scoreModalMode.value = 'submit'
  scoreModalPrefill.value = null
  scoreModalOpen.value = true
}

function onScoreModalSubmitted(result: { state: string }) {
  loadFixtureSubmissions()
  emit('score-submitted', result)
}
</script>

<template>
  <div
    class="bg-white dark:bg-[#111216] border border-gray-200 dark:border-white/[0.08] overflow-hidden flex flex-col shadow-sm"
    :class="fullscreen
      ? 'fixed inset-0 z-[60] rounded-none border-0' // above the mobile bottom nav (z-50)
      : 'rounded-2xl'"
  >
    <!-- header -->
    <div
      class="px-4 sm:px-5 py-3 border-b border-gray-200/80 dark:border-white/[0.06] bg-gray-50/50 dark:bg-[#14161b] flex items-center justify-between gap-3 flex-wrap"
      :class="fullscreen && 'max-w-3xl w-full mx-auto border-x-0'"
    >
      <div>
        <h2 class="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          💬 Tournament chat
        </h2>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Approved participants and organizers can post · everyone can read
        </p>
      </div>
      <div class="flex items-center gap-2 sm:gap-3 text-[11px] text-gray-400">
        <span class="flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]"></span>
          {{ online }} online
        </span>
        <span v-if="memberCount != null" class="hidden sm:inline">{{ memberCount }} members</span>
        <UDropdownMenu :items="notificationMenuItems" :content="{ align: 'end', side: 'bottom', sideOffset: 6 }">
          <UButton
            type="button"
            size="xs"
            variant="ghost"
            color="neutral"
            :class="notifyLevel === 'none' ? 'opacity-40 hover:opacity-100' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'"
            :icon="notifyLevel === 'none' ? 'i-heroicons-bell-slash' : (notifyLevel === 'all' ? 'i-heroicons-bell-alert' : 'i-heroicons-bell')"
            :title="notifyLevel === 'none' ? 'Chat notifications: Muted' : (notifyLevel === 'all' ? 'Chat notifications: All messages' : 'Chat notifications: Mentions & highlights')"
            :aria-label="notifyLevel === 'none' ? 'Chat notifications: Muted' : (notifyLevel === 'all' ? 'Chat notifications: All messages' : 'Chat notifications: Mentions & highlights')"
          />
        </UDropdownMenu>
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

    <!-- Active Esports Match HUD -->
    <div
      v-if="viewerActiveFixture && !isManage && !chatDisabled"
      class="border-b border-gray-200 dark:border-white/10 bg-gray-50/75 dark:bg-white/[0.02] px-4 py-2.5 sm:px-5 flex flex-wrap items-center justify-between gap-3 text-xs"
      :class="fullscreen && 'max-w-3xl w-full mx-auto border-x-0'"
    >
      <div class="flex items-center gap-2.5 min-w-0">
        <span class="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-200/70 dark:bg-white/10 text-xs shrink-0 font-mono">
          🎮
        </span>
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-extrabold text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {{ viewerActiveFixture.roundName || `Round ${viewerActiveFixture.round}` }}
            </span>
            <span
              v-if="viewerFixtureState === 'awaitingOpponent'"
              class="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full"
            >
              ⏳ Awaiting opponent
            </span>
            <span
              v-else-if="viewerFixtureState === 'awaitingMe'"
              class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full"
            >
              ⚡ Opponent reported
            </span>
            <span
              v-else-if="viewerFixtureState === 'conflict'"
              class="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full"
            >
              ⚠ Score mismatch
            </span>
          </div>
          <p class="font-bold text-gray-900 dark:text-white truncate mt-0.5">
            <span :class="isViewerHome ? 'underline decoration-gray-400 underline-offset-2' : ''">{{ activeHomeName }}</span>
            <span v-if="isViewerHome" class="text-[9px] font-bold text-gray-500 ml-0.5">(You)</span>
            <span class="mx-1 text-gray-400 font-normal">vs</span>
            <span :class="!isViewerHome ? 'underline decoration-gray-400 underline-offset-2' : ''">{{ activeAwayName }}</span>
            <span v-if="!isViewerHome" class="text-[9px] font-bold text-gray-500 ml-0.5">(You)</span>
          </p>
        </div>
      </div>

      <!-- Action buttons based on state -->
      <div class="flex items-center gap-2 shrink-0">
        <!-- Case 1: Opponent reported, awaiting viewer to confirm/dispute -->
        <template v-if="viewerFixtureState === 'awaitingMe'">
          <span class="font-mono font-bold text-gray-900 dark:text-white tabular-nums px-1 text-sm">
            {{ opponentActiveEntry?.homeScore }} – {{ opponentActiveEntry?.awayScore }}
          </span>
          <UButton
            size="xs"
            color="primary"
            icon="i-heroicons-check"
            :loading="quickConfirming"
            label="Confirm"
            @click="confirmOpponentScore"
          />
          <UButton
            size="xs"
            variant="outline"
            color="neutral"
            icon="i-heroicons-exclamation-triangle"
            label="Dispute"
            @click="openDisputeModalForActive"
          />
          <button
            v-if="opponentActiveEntry?.evidenceUrl"
            type="button"
            class="text-gray-500 hover:text-gray-900 dark:hover:text-white text-[11px] font-medium"
            @click="openProof(opponentActiveEntry.evidenceUrl, `${opponentActiveEntry.participantName}'s proof`)"
          >
            🖼 Proof
          </button>
        </template>

        <!-- Case 2: Viewer submitted, waiting for opponent -->
        <template v-else-if="viewerFixtureState === 'awaitingOpponent'">
          <span class="font-mono font-bold text-gray-900 dark:text-white tabular-nums px-1 text-sm">
            {{ myActiveEntry?.homeScore }} – {{ myActiveEntry?.awayScore }}
          </span>
          <UButton
            size="xs"
            variant="outline"
            color="neutral"
            icon="i-heroicons-pencil"
            label="Edit"
            @click="openSubmitModalForActive"
          />
        </template>

        <!-- Case 3: Conflict -->
        <template v-else-if="viewerFixtureState === 'conflict'">
          <span class="text-xs text-red-500 font-medium">Under admin review</span>
        </template>

        <!-- Case 4: Due (not submitted yet) -->
        <template v-else>
          <UButton
            size="xs"
            color="primary"
            icon="i-heroicons-trophy"
            label="Submit score"
            @click="openSubmitModalForActive"
          />
        </template>

        <!-- Multiple fixtures switcher if player has more than 1 open fixture -->
        <div v-if="viewerOpenFixtures.length > 1" class="relative">
          <button
            type="button"
            class="text-[11px] font-semibold text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-1 py-0.5"
            title="Switch match"
            @click="cycleNextFixture"
          >
            ({{ activeFixtureIndex + 1 }}/{{ viewerOpenFixtures.length }}) ↻
          </button>
        </div>
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
            class="group relative flex gap-3 px-4 sm:px-5 py-2.5 transition-colors duration-150"
            :class="[
              isOwn(m) && 'flex-row-reverse',
              railClass(m),
              flashId === m.id ? 'bg-primary-500/15 dark:bg-primary-400/20 ring-1 ring-primary-500/40' : 'hover:bg-gray-50/80 dark:hover:bg-white/[0.03]'
            ]"
          >
            <!-- avatar -->
            <span
              class="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden mt-0.5 ring-1 ring-black/5 dark:ring-white/10 shadow-xs"
              :class="[
                m.authorType === 'ORGANIZER' && 'ring-1 ring-amber-500/30 dark:ring-amber-400/30',
                (m.authorType === 'BOT' || m.authorType === 'SYSTEM') && 'ring-1 ring-indigo-500/30 dark:ring-indigo-400/30'
              ]"
              :style="m.authorType === 'BOT' || m.authorType === 'SYSTEM'
                ? { background: 'linear-gradient(135deg, #475569 0%, #4338ca 100%)' }
                : { background: avatarColor(m.author.name) }"
            >
              <img v-if="m.author.avatarUrl" :src="m.author.avatarUrl" class="w-full h-full object-cover" alt="" />
              <template v-else>{{ m.authorType === 'BOT' || m.authorType === 'SYSTEM' ? '✨' : initials(m.author.name) }}</template>
            </span>

            <div class="flex-1 min-w-0" :class="isOwn(m) && 'flex flex-col items-end'">
              <!-- message author header -->
              <div class="flex items-center gap-2 flex-wrap" :class="isOwn(m) && 'flex-row-reverse'">
                <span class="text-[13px] font-semibold text-gray-900 dark:text-white hover:underline cursor-pointer">
                  {{ isOwn(m) ? 'You' : m.author.name }}
                </span>

                <!-- Organizer badge -->
                <span
                  v-if="m.authorType === 'ORGANIZER'"
                  class="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400/90 border border-amber-500/20 dark:border-amber-400/20"
                >
                  <UIcon name="i-heroicons-shield-check" class="w-3 h-3 text-amber-500/80 dark:text-amber-400/80" />
                  Organizer
                </span>

                <!-- Bot badge -->
                <span
                  v-else-if="m.authorType === 'BOT'"
                  class="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-indigo-500/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400/90 border border-indigo-500/20 dark:border-indigo-400/20"
                >
                  <UIcon name="i-heroicons-sparkles" class="w-3 h-3 text-indigo-500/80 dark:text-indigo-400/80" />
                  AI · Paragee
                </span>

                <!-- Team badge -->
                <span
                  v-else-if="m.author.teamName"
                  class="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-300 border border-gray-200/80 dark:border-white/[0.08]"
                >
                  <UIcon name="i-heroicons-user-group" class="w-2.5 h-2.5 text-gray-400" />
                  {{ m.author.teamName }}
                </span>

                <span class="text-[11px] text-gray-400 dark:text-gray-500 font-normal tabular-nums">
                  {{ formatTime(m.createdAt) }}
                </span>
              </div>

              <!-- quoted reply -->
              <button
                v-if="m.replyTo"
                type="button"
                class="mt-1 mb-1.5 flex items-center gap-2 max-w-full text-left rounded-lg border-l-2 border-gray-400/50 dark:border-white/20 bg-gray-100/60 dark:bg-white/[0.03] px-2.5 py-1 hover:bg-gray-200/60 dark:hover:bg-white/[0.06] transition-colors group/reply cursor-pointer"
                :class="isOwn(m) && 'border-l-0 border-r-2 border-r-gray-400/50 dark:border-r-white/20 text-right'"
                title="Jump to original message"
                @click="jumpTo(m.replyTo!.id)"
              >
                <UIcon name="i-heroicons-arrow-uturn-left" class="w-3 h-3 text-gray-400 dark:text-gray-500 shrink-0 group-hover/reply:-translate-x-0.5 transition-transform" />
                <span class="min-w-0 flex-1">
                  <span class="block text-[11px] font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {{ m.replyTo.authorName }}
                  </span>
                  <span v-if="m.replyTo.deleted" class="block text-[11.5px] italic text-gray-400 dark:text-gray-500 truncate">
                    Original message was deleted
                  </span>
                  <span v-else class="block text-[11.5px] text-gray-500 dark:text-gray-400 truncate">
                    {{ m.replyTo.text }}
                  </span>
                </span>
              </button>

              <!-- message text -->
              <p
                class="text-[13.5px] leading-relaxed text-gray-800 dark:text-gray-200 mt-0.5 break-words whitespace-pre-wrap select-text font-normal"
                :class="isOwn(m) && 'text-right'"
              >
                <template v-for="(part, i) in textParts(m.text)" :key="i"><ChatMentionChip
                  v-if="part.mention"
                  :name="part.text.slice(1)"
                  :members="members"
                  :bot-enabled="!!parageeBot?.enabled"
                /><template v-else>{{ part.text }}</template></template>
              </p>

              <!-- structured card: fixture (Discord Embed style) -->
              <div
                v-if="m.cardType === 'FIXTURE' && m.cardPayload"
                class="mt-2 max-w-md rounded-xl border border-gray-200/80 dark:border-white/[0.08] border-l-2 border-l-primary-500/50 dark:border-l-primary-400/40 bg-gray-50/90 dark:bg-[#16181f] p-3.5 shadow-xs"
              >
                <p class="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                  <UIcon name="i-heroicons-calendar" class="w-3 h-3" />
                  {{ fixtureCard(m).label }}
                </p>
                <p class="text-sm font-bold text-gray-900 dark:text-white">
                  {{ fixtureCard(m).home }} <span class="font-mono text-xs text-gray-400 font-normal mx-1">vs</span> {{ fixtureCard(m).away }}
                </p>
                <p v-if="fixtureCard(m).meta" class="text-[11.5px] text-gray-500 dark:text-gray-400 mt-1">{{ fixtureCard(m).meta }}</p>
                <div class="flex items-center gap-2 mt-2.5 pt-2 border-t border-gray-200/60 dark:border-white/[0.06]">
                  <NuxtLink
                    v-if="fixtureCard(m).href"
                    :to="cardTo(fixtureCard(m).href)"
                    :external="isManage"
                    class="inline-flex items-center gap-1 text-[11.5px] font-bold text-gray-800 dark:text-gray-200 bg-gray-200/60 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1 hover:bg-gray-200 dark:hover:bg-white/15 transition-colors"
                  >View fixture →</NuxtLink>
                  <UButton
                    v-if="canSubmitForFixtureCard(m)"
                    size="xs"
                    color="primary"
                    icon="i-heroicons-trophy"
                    label="Submit score"
                    @click="openSubmitModalForFixtureCard(m)"
                  />
                </div>
              </div>

              <!-- ranked rows card: table / stats (Discord Embed style) -->
              <div
                v-if="(m.cardType === 'TABLE' || m.cardType === 'STATS') && m.cardPayload"
                class="mt-2 max-w-sm rounded-xl border border-gray-200/80 dark:border-white/[0.08] border-l-2 border-l-indigo-500/50 dark:border-l-indigo-400/40 bg-gray-50/90 dark:bg-[#16181f] p-3.5 shadow-xs"
              >
                <p class="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                  <UIcon :name="m.cardType === 'TABLE' ? 'i-heroicons-table-cells' : 'i-heroicons-chart-bar'" class="w-3 h-3" />
                  {{ rowsCard(m).title }}
                </p>
                <div
                  v-for="row in rowsCard(m).rows"
                  :key="row.rank ?? row.name"
                  class="flex items-center justify-between gap-3 py-1 text-[12.5px] hover:bg-black/[0.02] dark:hover:bg-white/[0.02] rounded px-1 transition-colors"
                >
                  <span class="flex items-center gap-2 min-w-0">
                    <span
                      class="font-mono font-bold w-4 text-center text-gray-500 dark:text-gray-400 text-xs"
                    >{{ row.rank }}</span>
                    <span class="font-semibold text-gray-900 dark:text-white truncate">{{ row.name }}</span>
                  </span>
                  <span class="font-mono font-bold text-gray-700 dark:text-gray-200 tabular-nums">{{ row.value }}</span>
                </div>
              </div>

              <!-- score submitted: awaiting opponent (Discord Embed style) -->
              <div
                v-if="m.cardType === 'SCORE_SUBMITTED' && m.cardPayload"
                class="mt-2 max-w-md rounded-xl border border-gray-200/80 dark:border-white/[0.08] border-l-2 border-l-amber-500/50 dark:border-l-amber-400/40 bg-gray-50/90 dark:bg-[#16181f] p-3.5 shadow-xs"
              >
                <div class="flex items-center justify-between gap-2 mb-1.5">
                  <p class="text-[10px] font-bold uppercase tracking-widest text-amber-600/90 dark:text-amber-400/80 flex items-center gap-1">
                    <span>⏳</span> Score submitted — awaiting opponent
                  </p>
                  <span
                    v-if="isOpponentOfCard(m)"
                    class="text-[9.5px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full"
                  >
                    Your response needed
                  </span>
                </div>
                <p class="text-sm font-bold text-gray-900 dark:text-white">
                  {{ scoreCard(m).submittedBy }} <span class="text-gray-400 font-normal text-xs">reports</span>
                  <span class="font-mono text-lg mx-1 tabular-nums font-bold text-gray-900 dark:text-white">{{ scoreCard(m).score?.home }} – {{ scoreCard(m).score?.away }}</span>
                  <span class="text-gray-400 font-normal text-xs"> in {{ scoreCard(m).home }} vs {{ scoreCard(m).away }}</span>
                </p>
                <p class="text-[11.5px] text-gray-500 dark:text-gray-400 mt-1">
                  {{ scoreCard(m).evidenceAttached ? 'Evidence attached 🖼 · ' : '' }}The opponent confirms or counter-reports with evidence.
                </p>

                <!-- Interactive opponent actions -->
                <div
                  v-if="isOpponentOfCard(m)"
                  class="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-gray-200/60 dark:border-white/[0.08]"
                >
                  <UButton
                    size="xs"
                    color="primary"
                    icon="i-heroicons-check"
                    :loading="cardConfirmingFixtureId === scoreCard(m).fixtureId"
                    :label="`Confirm ${scoreCard(m).score?.home}–${scoreCard(m).score?.away}`"
                    @click="confirmCardScore(scoreCard(m))"
                  />
                  <UButton
                    size="xs"
                    variant="outline"
                    color="neutral"
                    icon="i-heroicons-exclamation-triangle"
                    label="Dispute / Counter"
                    @click="disputeCardScore(scoreCard(m))"
                  />
                  <button
                    v-if="scoreCard(m).evidenceUrl"
                    type="button"
                    class="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-1.5 py-1"
                    @click="openProof(scoreCard(m).evidenceUrl, `${scoreCard(m).submittedBy}'s proof`)"
                  >
                    🖼 View proof
                  </button>
                </div>

                <!-- If viewer is the submitter -->
                <div
                  v-else-if="isSubmitterOfCard(m)"
                  class="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-gray-200/60 dark:border-white/[0.08] text-[11.5px] text-gray-500 dark:text-gray-400"
                >
                  <span>Your submission · awaiting opponent</span>
                  <div class="flex items-center gap-2">
                    <button
                      v-if="scoreCard(m).evidenceUrl"
                      type="button"
                      class="text-[11px] font-semibold text-gray-600 dark:text-gray-400 hover:underline"
                      @click="openProof(scoreCard(m).evidenceUrl, 'Your proof screenshot')"
                    >
                      🖼 Proof
                    </button>
                    <button
                      type="button"
                      class="text-[11px] font-semibold text-gray-800 dark:text-gray-200 hover:underline"
                      @click="openSubmitModalForCard(scoreCard(m))"
                    >
                      Edit score
                    </button>
                  </div>
                </div>

                <!-- Fallback link for third-party viewers -->
                <div v-else-if="scoreCard(m).href" class="mt-2 flex items-center gap-2 pt-2 border-t border-gray-200/60 dark:border-white/[0.08]">
                  <NuxtLink
                    :to="cardTo(scoreCard(m).href)"
                    :external="isManage"
                    class="inline-flex items-center gap-1 text-[11.5px] font-bold text-gray-800 dark:text-gray-200 bg-gray-200/60 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1 hover:bg-gray-200 dark:hover:bg-white/15 transition-colors"
                  >
                    View fixture →
                  </NuxtLink>
                  <button
                    v-if="scoreCard(m).evidenceUrl"
                    type="button"
                    class="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300 hover:underline px-1.5 py-1"
                    @click="openProof(scoreCard(m).evidenceUrl, `${scoreCard(m).submittedBy}'s proof`)"
                  >
                    🖼 Proof
                  </button>
                </div>
              </div>

              <!-- result confirmed (Discord Embed style) -->
              <div
                v-if="m.cardType === 'SCORE_CONFIRMED' && m.cardPayload"
                class="mt-2 max-w-md rounded-xl border border-gray-200/80 dark:border-white/[0.08] border-l-2 border-l-emerald-500/50 dark:border-l-emerald-400/40 bg-gray-50/90 dark:bg-[#16181f] p-3.5 shadow-xs"
              >
                <p class="text-[10px] font-bold uppercase tracking-widest text-emerald-600/90 dark:text-emerald-400/80 mb-1.5 flex items-center gap-1">
                  <span>✓</span> Result confirmed{{ scoreCard(m).by === 'organizer' ? ' by the organizer' : '' }}
                </p>
                <p class="text-sm font-bold text-gray-900 dark:text-white">
                  {{ scoreCard(m).home }}
                  <span class="font-mono text-lg font-bold text-gray-900 dark:text-white mx-1">{{ scoreCard(m).score?.home }} – {{ scoreCard(m).score?.away }}</span>
                  {{ scoreCard(m).away }}
                </p>
                <p class="text-[11.5px] text-gray-500 dark:text-gray-400 mt-1">{{ scoreCard(m).by === 'organizer' ? 'Verdict applied to the fixture.' : 'Both entries matched · fixture updated.' }}</p>
              </div>

              <!-- score conflict (Discord Embed style) -->
              <div
                v-if="m.cardType === 'SCORE_CONFLICT' && m.cardPayload"
                class="mt-2 max-w-md rounded-xl border border-gray-200/80 dark:border-white/[0.08] border-l-2 border-l-red-500/50 dark:border-l-red-400/40 bg-gray-50/90 dark:bg-[#16181f] p-3.5 shadow-xs"
              >
                <p class="text-[10px] font-bold uppercase tracking-widest text-red-600/90 dark:text-red-400/80 mb-2 flex items-center gap-1">
                  <span>⚠</span> Score conflict — under review
                </p>
                <div
                  v-for="claim in scoreCard(m).claims"
                  :key="claim.participantName"
                  class="flex items-center justify-between gap-3 py-1.5 text-[12.5px] border-t border-gray-200/60 dark:border-white/[0.06] first:border-t-0"
                >
                  <span class="text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <span>{{ claim.participantName }}'s entry</span>
                    <button
                      v-if="claim.evidenceUrl"
                      type="button"
                      class="text-[11px] font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white inline-flex items-center gap-0.5 ml-1"
                      @click="openProof(claim.evidenceUrl, `${claim.participantName}'s proof`)"
                    >
                      · 🖼 View proof
                    </button>
                  </span>
                  <span class="font-mono font-bold text-gray-900 dark:text-white tabular-nums">{{ claim.score.home }} – {{ claim.score.away }}</span>
                </div>
                <p class="text-[11.5px] text-gray-500 dark:text-gray-400 mt-2">Entries don't match — nothing is applied until the organizer decides.</p>
                <button
                  v-if="canModerate && scoreCard(m).fixtureId"
                  type="button"
                  class="mt-2 inline-flex items-center gap-1 text-[11.5px] font-bold text-gray-800 dark:text-gray-200 bg-gray-200/60 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1 hover:bg-gray-200 dark:hover:bg-white/15 transition-colors"
                  @click="emit('review-dispute', scoreCard(m).fixtureId!)"
                >Review dispute →</button>
              </div>

              <!-- reaction chips (Discord pill style) -->
              <div
                v-if="m.reactions?.length"
                class="flex flex-wrap gap-1.5 mt-2"
                :class="isOwn(m) && 'justify-end'"
              >
                <button
                  v-for="r in m.reactions"
                  :key="r.emoji"
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-0.5 text-[12px] transition-all cursor-pointer"
                  :class="r.mine
                    ? 'bg-primary-500/[0.08] dark:bg-primary-400/10 border-primary-500/30 dark:border-primary-400/30 text-primary-600 dark:text-primary-300 font-semibold shadow-xs hover:bg-primary-500/15'
                    : 'bg-gray-100/70 dark:bg-white/[0.04] border-gray-200 dark:border-white/[0.08] text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-200/60 dark:hover:bg-white/[0.08]'"
                  :disabled="!canPost"
                  :title="r.mine ? 'Remove your reaction' : 'React'"
                  @click="pickReaction(m, r.emoji)"
                >
                  <span class="text-sm leading-none">{{ r.emoji }}</span>
                  <span class="font-mono text-[11px] font-bold tabular-nums">{{ r.count }}</span>
                </button>
              </div>
            </div>

            <!-- Discord-style floating hover actions toolbar -->
            <div
              v-if="canModerate || canPost"
              class="absolute -top-3.5 hidden group-hover:flex items-center gap-0.5 bg-white/95 dark:bg-[#1a1c23]/95 backdrop-blur-md border border-gray-200/90 dark:border-white/10 rounded-lg p-0.5 shadow-md shadow-black/10 dark:shadow-black/50 z-20"
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
                  class="hover:text-amber-500 transition-colors"
                  @click.stop="toggleReactPicker(m.id)"
                />
                <!-- emoji picker -->
                <div
                  v-if="reactPickerFor === m.id"
                  class="absolute bottom-full mb-1.5 z-30 flex gap-1 bg-white dark:bg-[#1a1c23] border border-gray-200 dark:border-white/10 rounded-xl p-1.5 shadow-xl shadow-black/15 dark:shadow-black/60"
                  :class="isOwn(m) ? 'left-0' : 'right-0'"
                  @click.stop
                >
                  <button
                    v-for="e in REACTION_EMOJIS"
                    :key="e"
                    type="button"
                    class="w-8 h-8 rounded-lg text-[16px] hover:bg-gray-100 dark:hover:bg-white/10 hover:scale-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
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
                class="hover:text-primary-500 transition-colors"
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
                  class="hover:text-amber-500 transition-colors"
                  @click="setPin(m.id, pinned?.id !== m.id)"
                />
                <UButton
                  type="button"
                  size="xs"
                  variant="ghost"
                  color="error"
                  icon="i-heroicons-trash"
                  title="Delete"
                  class="hover:text-red-500 transition-colors"
                  @click="removeMessage(m.id)"
                />
              </template>
            </div>
          </div>

          <!-- Paragee thinking (LLM tier at work) — pinned to the end of the list -->
          <div
            v-if="botThinking"
            class="flex gap-3 px-4 sm:px-5 py-2.5 bg-indigo-500/[0.015] dark:bg-indigo-400/[0.02] border-l-2 border-l-indigo-500/40 dark:border-l-indigo-400/40"
            aria-live="polite"
          >
            <span
              class="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white mt-0.5 ring-1 ring-indigo-500/30 shadow-xs"
              style="background: linear-gradient(135deg, #475569 0%, #4338ca 100%)"
            >✨</span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-[13px] font-semibold text-gray-900 dark:text-white">Paragee</span>
                <span class="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-indigo-500/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400/90 border border-indigo-500/20 dark:border-indigo-400/20">
                  <UIcon name="i-heroicons-sparkles" class="w-3 h-3 text-indigo-500/80 dark:text-indigo-400/80" />
                  AI · Paragee
                </span>
              </div>
              <p class="text-[12.5px] text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                thinking
                <span class="flex items-end gap-1 h-3">
                  <span class="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce"></span>
                  <span class="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce [animation-delay:120ms]"></span>
                  <span class="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce [animation-delay:240ms]"></span>
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
              class="w-4 h-4 rounded-full shrink-0 overflow-hidden ring-2 ring-white dark:ring-gray-900 flex items-center justify-center text-[6.5px] font-bold text-white shadow-xs"
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
          <span class="font-medium text-gray-500 dark:text-gray-400">{{ typingText }}</span>
        </span>
      </div>

      <!-- quick-ask chips -->
      <div v-if="quickChips.length && canPost" class="flex gap-2 flex-wrap px-4 sm:px-5 pt-2 pb-1" :class="fullscreen && 'max-w-3xl w-full mx-auto'">
        <button
          v-for="chip in quickChips"
          :key="chip"
          type="button"
          class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-700 dark:text-gray-300 bg-gray-100/80 dark:bg-white/[0.05] border border-gray-200/80 dark:border-white/10 rounded-full px-3 py-1 hover:bg-gray-200/80 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/20 transition-all cursor-pointer shadow-xs active:scale-95"
          @click="askChip(chip)"
        >
          <span class="text-amber-500 text-xs">✨</span>
          <span>{{ chip }}</span>
        </button>
      </div>

      <!-- composer -->
      <div
        v-if="canPost"
        class="relative border-t border-gray-200/80 dark:border-white/[0.06] px-4 sm:px-5 py-3 flex items-end gap-2.5 flex-wrap bg-gray-50/60 dark:bg-[#13151b]"
        :class="fullscreen && 'max-w-3xl w-full mx-auto pb-[max(env(safe-area-inset-bottom),0.875rem)]'"
      >
        <!-- replying-to bar -->
        <div
          v-if="replyTarget"
          class="w-full flex items-center justify-between gap-2 rounded-lg border-l-2 border-gray-400/60 dark:border-white/20 bg-gray-100/70 dark:bg-white/[0.03] px-3 py-1.5 mb-1 text-xs"
        >
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <UIcon name="i-heroicons-arrow-uturn-left" class="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
            <span class="min-w-0 flex-1">
              <span class="block text-[11px] font-bold text-gray-900 dark:text-white">Replying to {{ replyTarget.author.name }}</span>
              <span class="block text-[11.5px] text-gray-500 dark:text-gray-400 truncate">{{ replyTarget.text }}</span>
            </span>
          </div>
          <UButton
            type="button"
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-heroicons-x-mark"
            title="Cancel reply"
            class="hover:bg-gray-200/60 dark:hover:bg-white/10"
            @click="cancelReply"
          />
        </div>
        <!-- Slash command autocomplete -->
        <div
          v-if="slashOpen"
          class="absolute bottom-full left-4 sm:left-5 mb-2 w-72 max-w-[calc(100%-2rem)] rounded-xl border border-gray-200/90 dark:border-white/[0.12] bg-white dark:bg-[#1b1d24] shadow-xl shadow-black/15 dark:shadow-black/60 overflow-hidden z-30"
        >
          <p class="px-3 py-1.5 text-[9.5px] font-extrabold uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-white/[0.06]">
            Commands
          </p>
          <button
            v-for="(c, i) in availableSlashCommands"
            :key="c.cmd"
            type="button"
            class="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors cursor-pointer"
            :class="i === slashIndex ? 'bg-gray-100 dark:bg-white/10' : 'hover:bg-gray-50 dark:hover:bg-white/[0.04]'"
            @mousedown.prevent="executeSlash(c)"
            @mouseenter="slashIndex = i"
          >
            <span
              class="w-6 h-6 rounded-lg shrink-0 flex items-center justify-center text-xs bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300"
            >
              <UIcon :name="c.icon" class="w-3.5 h-3.5" />
            </span>
            <span class="min-w-0">
              <span class="block text-[12.5px] font-semibold text-gray-900 dark:text-white truncate font-mono">{{ c.label }}</span>
              <span class="block text-[10.5px] text-gray-400 truncate">{{ c.desc }}</span>
            </span>
          </button>
        </div>

        <!-- @mention autocomplete -->
        <div
          v-if="mentionOpen"
          class="absolute bottom-full left-4 sm:left-5 mb-2 w-72 max-w-[calc(100%-2rem)] rounded-xl border border-gray-200/90 dark:border-white/[0.12] bg-white dark:bg-[#1b1d24] shadow-xl shadow-black/15 dark:shadow-black/60 overflow-hidden z-30"
        >
          <p class="px-3 py-1.5 text-[9.5px] font-extrabold uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-white/[0.06]">
            Mention
          </p>
          <button
            v-for="(m, i) in mentionMatches"
            :key="m.id"
            type="button"
            class="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors cursor-pointer"
            :class="i === mentionIndex ? 'bg-gray-100 dark:bg-white/10' : 'hover:bg-gray-50 dark:hover:bg-white/[0.04]'"
            @mousedown.prevent="selectMention(m)"
            @mouseenter="mentionIndex = i"
          >
            <span
              class="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[8.5px] font-bold text-white shadow-xs"
              :style="m.bot ? { background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)' } : { background: avatarColor(m.name) }"
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
          v-if="viewerActiveFixture && !isManage"
          type="button"
          size="xs"
          variant="ghost"
          color="neutral"
          icon="i-heroicons-trophy"
          title="Report match score"
          @click="openSubmitModalForActive"
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
      <!-- Esports Score Submit Modal -->
      <template v-if="allowsSelfReporting">
        <ChatScoreSubmitModal
          v-model:open="scoreModalOpen"
          :fixture="scoreModalFixture"
          :tournament="tournament"
          :viewer-participant-id="viewerParticipantId"
          :prefill="scoreModalPrefill"
          :mode="scoreModalMode"
          @submitted="onScoreModalSubmitted"
        />

        <!-- Screenshot Proof Lightbox Modal -->
        <ChatProofLightboxModal
          v-model:open="proofLightboxOpen"
          :image-url="proofLightboxUrl"
          :title="proofLightboxTitle"
        />
      </template>
    </template>
  </div>
</template>
