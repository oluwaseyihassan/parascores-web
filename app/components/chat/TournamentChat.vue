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

// Feed activity filter: all, announcements only, match results & disputes only
const activeFilter = ref<'all' | 'announcements' | 'results'>('all')

const filteredMessages = computed(() => {
  if (activeFilter.value === 'announcements') {
    return messages.value.filter((m) => m.authorType === 'ORGANIZER' || !!m.pinnedAt)
  }
  if (activeFilter.value === 'results') {
    return messages.value.filter(
      (m) =>
        m.cardType === 'SCORE_SUBMITTED' ||
        m.cardType === 'SCORE_CONFIRMED' ||
        m.cardType === 'SCORE_CONFLICT',
    )
  }
  return messages.value
})

const announcementsCount = computed(
  () => messages.value.filter((m) => m.authorType === 'ORGANIZER' || !!m.pinnedAt).length,
)
const resultsCount = computed(
  () =>
    messages.value.filter(
      (m) =>
        m.cardType === 'SCORE_SUBMITTED' ||
        m.cardType === 'SCORE_CONFIRMED' ||
        m.cardType === 'SCORE_CONFLICT',
    ).length,
)

// Expandable house rules & info banner
const showRules = ref(false)

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
  if (props.canPost === 'organizer') return 'Broadcast official announcement to participants…'
  return botActive.value || allowsSelfReporting.value
    ? 'Report score, ask bot (/rules, /next, /table) or message organizers…'
    : 'Message tournament organizers or ask about rules…'
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

function openSlashMenu() {
  if (slashOpen.value) {
    closeSlash()
    return
  }
  closeMention()
  slashQuery.value = ''
  slashOpen.value = true
  slashIndex.value = 0
  nextTick(() => composerTextarea()?.focus())
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

// User has scrolled away from the latest message
const isNearBottom = ref(true)
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
    class="bg-page border border-subtle overflow-hidden flex flex-col shadow-xs"
    :class="fullscreen
      ? 'fixed inset-0 z-[60] rounded-none border-0' // above the mobile bottom nav (z-50)
      : 'rounded-2xl'"
  >
    <!-- LAYER 1: Header & Context -->
    <div
      class="px-4 sm:px-5 py-3 border-b border-subtle bg-surface flex items-center justify-between gap-3 flex-wrap"
      :class="fullscreen && 'max-w-3xl w-full mx-auto border-x-0'"
    >
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="w-8 h-8 rounded-lg bg-default border border-subtle flex items-center justify-center shrink-0 text-heading">
          <UIcon name="i-heroicons-bolt" class="w-4 h-4 text-heading" />
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <h2 class="text-sm font-semibold text-heading truncate">
              Match Hub
            </h2>
            <span class="inline-flex items-center gap-1.5 text-xs text-muted">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]"></span>
              <span>{{ online }} online</span>
            </span>
            <span v-if="memberCount != null" class="hidden sm:inline text-xs text-muted">· {{ memberCount }} members</span>
          </div>
          <p class="text-[11px] text-muted truncate">
            Official bulletins, score reports & live ops
          </p>
        </div>
      </div>

      <div class="flex items-center gap-1 sm:gap-1.5 text-xs">
        <UButton
          type="button"
          size="xs"
          :variant="showRules ? 'soft' : 'ghost'"
          :color="showRules ? 'primary' : 'neutral'"
          icon="i-heroicons-document-text"
          label="Rules"
          title="Official tournament rules & guidelines"
          @click="showRules = !showRules"
        />
        <UDropdownMenu :items="notificationMenuItems" :content="{ align: 'end', side: 'bottom', sideOffset: 6 }">
          <UButton
            type="button"
            size="xs"
            variant="ghost"
            color="neutral"
            :icon="notifyLevel === 'none' ? 'i-heroicons-bell-slash' : (notifyLevel === 'all' ? 'i-heroicons-bell-alert' : 'i-heroicons-bell')"
            :title="notifyLevel === 'none' ? 'Notifications: Muted' : (notifyLevel === 'all' ? 'Notifications: All activity' : 'Notifications: Mentions only')"
            :aria-label="notifyLevel === 'none' ? 'Notifications: Muted' : (notifyLevel === 'all' ? 'Notifications: All activity' : 'Notifications: Mentions only')"
          />
        </UDropdownMenu>
        <UButton
          type="button"
          size="xs"
          variant="ghost"
          color="neutral"
          :icon="fullscreen ? 'i-heroicons-arrows-pointing-in' : 'i-heroicons-arrows-pointing-out'"
          :title="fullscreen ? 'Exit full screen (Esc)' : 'Full screen focus'"
          :aria-label="fullscreen ? 'Exit full screen' : 'Full screen focus'"
          @click="toggleFullscreen"
        />
      </div>
    </div>

    <!-- Active Esports Match: Single Prominent Primary Action Card -->
    <div
      v-if="viewerActiveFixture && !isManage && !chatDisabled"
      class="border-b border-subtle bg-surface px-4 py-3 sm:px-5"
      :class="fullscreen && 'max-w-3xl w-full mx-auto border-x-0'"
    >
      <div class="p-3 sm:p-3.5 rounded-xl border border-subtle bg-default flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div class="min-w-0 flex items-start sm:items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-surface border border-subtle flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 text-heading">
            <UIcon name="i-heroicons-trophy" class="w-4 h-4 text-heading" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-[10px] font-bold uppercase tracking-wider text-muted">
                {{ viewerActiveFixture.roundName || `Round ${viewerActiveFixture.round}` }}
              </span>
              <UBadge
                v-if="viewerFixtureState === 'awaitingOpponent'"
                color="warning"
                variant="subtle"
                size="xs"
                label="Awaiting opponent"
              />
              <UBadge
                v-else-if="viewerFixtureState === 'awaitingMe'"
                color="primary"
                variant="subtle"
                size="xs"
                label="Opponent reported score"
              />
              <UBadge
                v-else-if="viewerFixtureState === 'conflict'"
                color="error"
                variant="subtle"
                size="xs"
                label="Score mismatch"
              />
              <UBadge
                v-else
                color="neutral"
                variant="subtle"
                size="xs"
                label="Ready to report"
              />
            </div>
            <p class="font-semibold text-sm text-heading truncate mt-0.5">
              <span :class="isViewerHome ? 'text-heading font-bold' : 'text-body'">{{ activeHomeName }}</span>
              <span v-if="isViewerHome" class="text-[10px] text-muted ml-0.5 font-medium">(You)</span>
              <span class="mx-1.5 text-muted font-normal text-xs">vs</span>
              <span :class="!isViewerHome ? 'text-heading font-bold' : 'text-body'">{{ activeAwayName }}</span>
              <span v-if="!isViewerHome" class="text-[10px] text-muted ml-0.5 font-medium">(You)</span>
            </p>
          </div>
        </div>

        <!-- Action buttons based on state: One clear primary CTA -->
        <div class="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <!-- Case 1: Opponent reported, awaiting viewer to confirm/dispute -->
          <template v-if="viewerFixtureState === 'awaitingMe'">
            <span class="font-mono font-bold text-heading tabular-nums px-1 text-sm">
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
            <UButton
              v-if="opponentActiveEntry?.evidenceUrl"
              size="xs"
              variant="ghost"
              color="neutral"
              icon="i-heroicons-photo"
              title="View opponent proof"
              @click="openProof(opponentActiveEntry.evidenceUrl, `${opponentActiveEntry.participantName}'s proof`)"
            />
          </template>

          <!-- Case 2: Viewer submitted, waiting for opponent -->
          <template v-else-if="viewerFixtureState === 'awaitingOpponent'">
            <span class="font-mono font-bold text-heading tabular-nums px-1 text-sm">
              {{ myActiveEntry?.homeScore }} – {{ myActiveEntry?.awayScore }}
            </span>
            <UButton
              size="xs"
              variant="outline"
              color="neutral"
              icon="i-heroicons-pencil-square"
              label="Edit"
              @click="openSubmitModalForActive"
            />
          </template>

          <!-- Case 3: Conflict -->
          <template v-else-if="viewerFixtureState === 'conflict'">
            <span class="text-xs text-error font-medium flex items-center gap-1">
              <UIcon name="i-heroicons-shield-exclamation" class="w-4 h-4 text-error" />
              Under admin review
            </span>
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
          <UButton
            v-if="viewerOpenFixtures.length > 1"
            size="xs"
            variant="ghost"
            color="neutral"
            :label="`${activeFixtureIndex + 1}/${viewerOpenFixtures.length}`"
            trailing-icon="i-heroicons-chevron-right"
            title="Next match"
            @click="cycleNextFixture"
          />
        </div>
      </div>
    </div>

    <!-- disabled notice -->
    <div
      v-if="chatDisabled"
      class="m-4 p-6 rounded-xl bg-surface border border-subtle text-center"
    >
      <UIcon name="i-heroicons-bolt-slash" class="w-8 h-8 mx-auto text-muted mb-2" />
      <p class="text-sm font-semibold text-heading">Match Hub is off for this tournament</p>
      <p class="text-xs text-muted mt-1">
        {{ canModerate ? 'Enable it to give participants a centralized hub to coordinate matches, check schedules, and submit scores.' : 'The organizer has disabled the Match Hub for this tournament.' }}
      </p>
      <UButton
        v-if="canModerate"
        type="button"
        color="neutral"
        size="sm"
        icon="i-heroicons-bolt"
        label="Enable Match Hub"
        class="mt-3 font-semibold"
        @click="emit('enable-chat')"
      />
    </div>

    <template v-else>
      <!-- Official House Rules Banner -->
      <div
        v-if="showRules"
        class="px-4 sm:px-5 py-3 border-b border-subtle bg-surface text-xs"
        :class="fullscreen && 'max-w-3xl w-full mx-auto'"
      >
        <div class="flex items-center justify-between gap-2 mb-1.5">
          <span class="font-semibold text-heading flex items-center gap-1.5 text-xs">
            <UIcon name="i-heroicons-document-text" class="w-4 h-4 text-muted" />
            Official Tournament Rules & Guidelines
          </span>
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-heroicons-x-mark"
            title="Close rules"
            @click="showRules = false"
          />
        </div>
        <p class="text-body leading-relaxed whitespace-pre-wrap text-xs">
          {{ tournament?.chatRules || tournament?.rules || 'No specific house rules posted. Be on time for scheduled fixtures and submit match results with screenshot proof.' }}
        </p>
      </div>

      <!-- Feed Filter Control -->
      <div
        class="px-4 sm:px-5 py-2 border-b border-subtle bg-surface flex items-center gap-1.5 overflow-x-auto hide-scrollbar text-xs"
        :class="fullscreen && 'max-w-3xl w-full mx-auto'"
      >
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          :class="activeFilter === 'all'
            ? 'bg-page text-heading shadow-xs font-semibold'
            : 'text-muted hover:text-heading'"
          @click="activeFilter = 'all'"
        >
          All Activity
          <span class="text-[10px] opacity-75 tabular-nums">({{ messages.length }})</span>
        </button>

        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          :class="activeFilter === 'announcements'
            ? 'bg-page text-heading shadow-xs font-semibold'
            : 'text-muted hover:text-heading'"
          @click="activeFilter = 'announcements'"
        >
          <UIcon name="i-heroicons-megaphone" class="w-3.5 h-3.5 text-amber-500" />
          Announcements
          <span v-if="announcementsCount" class="text-[10px] tabular-nums font-semibold">({{ announcementsCount }})</span>
        </button>

        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          :class="activeFilter === 'results'
            ? 'bg-page text-heading shadow-xs font-semibold'
            : 'text-muted hover:text-heading'"
          @click="activeFilter = 'results'"
        >
          <UIcon name="i-heroicons-trophy" class="w-3.5 h-3.5 text-emerald-500" />
          Match Results
          <span v-if="resultsCount" class="text-[10px] tabular-nums font-semibold">({{ resultsCount }})</span>
        </button>
      </div>

      <!-- pinned -->
      <div
        v-if="pinned && activeFilter !== 'results'"
        class="flex items-start gap-2.5 px-4 sm:px-5 py-2.5 bg-surface border-b border-subtle text-xs leading-relaxed"
        :class="fullscreen && 'max-w-3xl w-full mx-auto'"
      >
        <UIcon name="i-heroicons-bookmark-square" class="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div class="text-body flex-1 min-w-0">
          <b class="text-heading">Pinned:</b> {{ pinned.text }}
        </div>
      </div>

      <!-- LAYER 2: Activity Feed (The Hero) -->
      <div
        class="relative flex-1 min-h-0 flex flex-col"
        :class="fullscreen && 'max-w-3xl w-full mx-auto'"
      >
        <div
          ref="listEl"
          class="flex-1 overflow-y-auto min-h-[240px] py-2 bg-page"
          :class="!fullscreen && 'max-h-[520px]'"
          @scroll.passive="onListScroll"
        >
        <div v-if="loading" class="space-y-3 p-4">
          <USkeleton v-for="i in 4" :key="i" class="h-12 w-full rounded-xl bg-surface" />
        </div>

        <!-- load failure -->
        <div v-else-if="loadError" class="p-6 text-center">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-8 h-8 mx-auto text-muted mb-2" />
          <p class="text-sm font-semibold text-heading">Couldn't load activity</p>
          <p class="text-xs text-muted mt-1">The server didn't answer — it may be restarting.</p>
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
          v-else-if="filteredMessages.length === 0"
          class="text-center py-10 px-6"
        >
          <div class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-surface border border-subtle mb-3">
            <UIcon
              :name="activeFilter === 'announcements'
                ? 'i-heroicons-megaphone'
                : (activeFilter === 'results' ? 'i-heroicons-trophy' : 'i-heroicons-queue-list')"
              class="w-5 h-5 text-muted"
            />
          </div>
          <p class="text-sm font-medium text-heading">
            {{ activeFilter === 'announcements'
              ? 'No announcements yet'
              : (activeFilter === 'results' ? 'No match results reported yet' : 'No activity recorded yet') }}
          </p>
          <p class="text-xs text-muted mt-1 max-w-sm mx-auto">
            {{ activeFilter === 'announcements'
              ? 'Official announcements, round updates, and organizer broadcasts will appear here.'
              : (activeFilter === 'results'
                  ? 'Score submissions and verification logs will appear here as matches finish.'
                  : 'Official announcements and match score reports will appear here in real time.') }}
          </p>
        </div>

        <template v-else>
          <div v-if="nextCursor" class="px-4 pt-1 pb-2">
            <button
              type="button"
              class="text-xs font-semibold text-muted hover:text-heading hover:underline disabled:opacity-50 cursor-pointer"
              :disabled="loadingMore"
              @click="loadOlderAnchored"
            >
              {{ loadingMore ? 'Loading…' : 'Load earlier messages' }}
            </button>
          </div>

          <div
            v-for="m in filteredMessages"
            :key="m.id"
            :id="`chatmsg-${m.id}`"
            class="group relative flex gap-3 px-4 sm:px-5 py-2.5 transition-colors duration-150"
            :class="[
              isOwn(m) && 'flex-row-reverse',
              railClass(m),
              flashId === m.id ? 'bg-primary-500/10 ring-1 ring-primary-500/40' : 'hover:bg-surface/60'
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
                <span class="text-xs font-semibold text-heading hover:underline cursor-pointer">
                  {{ isOwn(m) ? 'You' : m.author.name }}
                </span>

                <!-- Organizer badge -->
                <UBadge
                  v-if="m.authorType === 'ORGANIZER'"
                  color="warning"
                  variant="subtle"
                  size="xs"
                  icon="i-heroicons-shield-check"
                  label="Organizer"
                />

                <!-- Bot badge -->
                <UBadge
                  v-else-if="m.authorType === 'BOT'"
                  color="primary"
                  variant="subtle"
                  size="xs"
                  icon="i-heroicons-sparkles"
                  label="Paragee"
                />

                <!-- Team badge -->
                <UBadge
                  v-else-if="m.author.teamName"
                  color="neutral"
                  variant="subtle"
                  size="xs"
                  icon="i-heroicons-user-group"
                  :label="m.author.teamName"
                />

                <span class="text-[11px] text-muted font-normal tabular-nums">
                  {{ formatTime(m.createdAt) }}
                </span>
              </div>

              <!-- quoted reply -->
              <button
                v-if="m.replyTo"
                type="button"
                class="mt-1 mb-1.5 flex items-center gap-2 max-w-full text-left rounded-lg border border-subtle bg-surface px-2.5 py-1 hover:bg-default transition-colors group/reply cursor-pointer"
                :class="isOwn(m) && 'text-right'"
                title="Jump to original message"
                @click="jumpTo(m.replyTo!.id)"
              >
                <UIcon name="i-heroicons-arrow-uturn-left" class="w-3 h-3 text-muted shrink-0 group-hover/reply:-translate-x-0.5 transition-transform" />
                <span class="min-w-0 flex-1">
                  <span class="block text-[11px] font-semibold text-heading truncate">
                    {{ m.replyTo.authorName }}
                  </span>
                  <span v-if="m.replyTo.deleted" class="block text-[11.5px] italic text-muted truncate">
                    Original message was deleted
                  </span>
                  <span v-else class="block text-[11.5px] text-muted truncate">
                    {{ m.replyTo.text }}
                  </span>
                </span>
              </button>

              <!-- message text -->
              <p
                class="text-[13px] leading-relaxed text-body mt-0.5 break-words whitespace-pre-wrap select-text font-normal"
                :class="isOwn(m) && 'text-right'"
              >
                <template v-for="(part, i) in textParts(m.text)" :key="i"><ChatMentionChip
                  v-if="part.mention"
                  :name="part.text.slice(1)"
                  :members="members"
                  :bot-enabled="!!parageeBot?.enabled"
                /><template v-else>{{ part.text }}</template></template>
              </p>

              <!-- structured card: fixture -->
              <div
                v-if="m.cardType === 'FIXTURE' && m.cardPayload"
                class="mt-2 max-w-md rounded-xl border border-subtle bg-surface p-3 shadow-2xs"
              >
                <p class="text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5 flex items-center gap-1.5">
                  <UIcon name="i-heroicons-calendar" class="w-3.5 h-3.5" />
                  {{ fixtureCard(m).label }}
                </p>
                <p class="text-sm font-semibold text-heading">
                  {{ fixtureCard(m).home }} <span class="font-mono text-xs text-muted font-normal mx-1">vs</span> {{ fixtureCard(m).away }}
                </p>
                <p v-if="fixtureCard(m).meta" class="text-xs text-muted mt-1">{{ fixtureCard(m).meta }}</p>
                <div class="flex items-center gap-2 mt-2.5 pt-2 border-t border-subtle">
                  <NuxtLink
                    v-if="fixtureCard(m).href"
                    :to="cardTo(fixtureCard(m).href)"
                    :external="isManage"
                    class="text-xs font-semibold text-heading hover:underline"
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

              <!-- ranked rows card: table / stats -->
              <div
                v-if="(m.cardType === 'TABLE' || m.cardType === 'STATS') && m.cardPayload"
                class="mt-2 max-w-sm rounded-xl border border-subtle bg-surface p-3 shadow-2xs"
              >
                <p class="text-[10px] font-bold uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
                  <UIcon :name="m.cardType === 'TABLE' ? 'i-heroicons-table-cells' : 'i-heroicons-chart-bar'" class="w-3.5 h-3.5" />
                  {{ rowsCard(m).title }}
                </p>
                <div
                  v-for="row in rowsCard(m).rows"
                  :key="row.rank ?? row.name"
                  class="flex items-center justify-between gap-3 py-1 text-xs hover:bg-default rounded px-1 transition-colors"
                >
                  <span class="flex items-center gap-2 min-w-0">
                    <span
                      class="font-mono font-bold w-4 text-center text-muted text-xs"
                    >{{ row.rank }}</span>
                    <span class="font-medium text-heading truncate">{{ row.name }}</span>
                  </span>
                  <span class="font-mono font-bold text-heading tabular-nums">{{ row.value }}</span>
                </div>
              </div>

              <!-- score submitted: awaiting opponent -->
              <div
                v-if="m.cardType === 'SCORE_SUBMITTED' && m.cardPayload"
                class="mt-2 max-w-md rounded-xl border border-subtle bg-surface p-3.5 shadow-2xs"
              >
                <div class="flex items-center justify-between gap-2 mb-1.5">
                  <p class="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <UIcon name="i-heroicons-clock" class="w-3.5 h-3.5" />
                    Score submitted — awaiting verification
                  </p>
                  <UBadge
                    v-if="isOpponentOfCard(m)"
                    color="warning"
                    variant="subtle"
                    size="xs"
                    label="Action required"
                  />
                </div>
                <p class="text-sm font-semibold text-heading">
                  {{ scoreCard(m).submittedBy }} <span class="text-muted font-normal text-xs">reports</span>
                  <span class="font-mono text-base mx-1 tabular-nums font-bold text-heading">{{ scoreCard(m).score?.home }} – {{ scoreCard(m).score?.away }}</span>
                  <span class="text-muted font-normal text-xs"> in {{ scoreCard(m).home }} vs {{ scoreCard(m).away }}</span>
                </p>
                <p class="text-xs text-muted mt-1">
                  {{ scoreCard(m).evidenceAttached ? 'Evidence attached · ' : '' }}The opponent confirms or counter-reports with evidence.
                </p>

                <!-- Interactive opponent actions -->
                <div
                  v-if="isOpponentOfCard(m)"
                  class="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-subtle"
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
                  <UButton
                    v-if="scoreCard(m).evidenceUrl"
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="i-heroicons-photo"
                    label="View proof"
                    @click="openProof(scoreCard(m).evidenceUrl, `${scoreCard(m).submittedBy}'s proof`)"
                  />
                </div>

                <!-- If viewer is the submitter -->
                <div
                  v-else-if="isSubmitterOfCard(m)"
                  class="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-subtle text-xs text-muted"
                >
                  <span>Your submission · awaiting opponent</span>
                  <div class="flex items-center gap-2">
                    <button
                      v-if="scoreCard(m).evidenceUrl"
                      type="button"
                      class="text-xs font-semibold text-body hover:underline flex items-center gap-1 cursor-pointer"
                      @click="openProof(scoreCard(m).evidenceUrl, 'Your proof screenshot')"
                    >
                      <UIcon name="i-heroicons-photo" class="w-3.5 h-3.5" />
                      Proof
                    </button>
                    <button
                      type="button"
                      class="text-xs font-semibold text-heading hover:underline cursor-pointer"
                      @click="openSubmitModalForCard(scoreCard(m))"
                    >
                      Edit score
                    </button>
                  </div>
                </div>

                <!-- Fallback link for third-party viewers -->
                <div v-else-if="scoreCard(m).href" class="mt-2 flex items-center gap-2 pt-2 border-t border-subtle">
                  <NuxtLink
                    :to="cardTo(scoreCard(m).href)"
                    :external="isManage"
                    class="text-xs font-semibold text-heading hover:underline"
                  >
                    View fixture →
                  </NuxtLink>
                  <button
                    v-if="scoreCard(m).evidenceUrl"
                    type="button"
                    class="text-xs font-semibold text-muted hover:text-heading cursor-pointer flex items-center gap-1"
                    @click="openProof(scoreCard(m).evidenceUrl, `${scoreCard(m).submittedBy}'s proof`)"
                  >
                    <UIcon name="i-heroicons-photo" class="w-3.5 h-3.5" />
                    Proof
                  </button>
                </div>
              </div>

              <!-- result confirmed -->
              <div
                v-if="m.cardType === 'SCORE_CONFIRMED' && m.cardPayload"
                class="mt-2 max-w-md rounded-xl border border-subtle bg-surface p-3.5 shadow-2xs"
              >
                <p class="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1.5 flex items-center gap-1">
                  <UIcon name="i-heroicons-check-circle" class="w-3.5 h-3.5" />
                  Result confirmed{{ scoreCard(m).by === 'organizer' ? ' by the organizer' : '' }}
                </p>
                <p class="text-sm font-semibold text-heading">
                  {{ scoreCard(m).home }}
                  <span class="font-mono text-base font-bold text-heading mx-1">{{ scoreCard(m).score?.home }} – {{ scoreCard(m).score?.away }}</span>
                  {{ scoreCard(m).away }}
                </p>
                <p class="text-xs text-muted mt-1">{{ scoreCard(m).by === 'organizer' ? 'Verdict applied to the fixture.' : 'Both entries matched · fixture updated.' }}</p>
              </div>

              <!-- score conflict -->
              <div
                v-if="m.cardType === 'SCORE_CONFLICT' && m.cardPayload"
                class="mt-2 max-w-md rounded-xl border border-subtle bg-surface p-3.5 shadow-2xs"
              >
                <p class="text-[10px] font-bold uppercase tracking-wider text-error mb-2 flex items-center gap-1">
                  <UIcon name="i-heroicons-exclamation-triangle" class="w-3.5 h-3.5" />
                  Score conflict — under review
                </p>
                <div
                  v-for="claim in scoreCard(m).claims"
                  :key="claim.participantName"
                  class="flex items-center justify-between gap-3 py-1.5 text-xs border-t border-subtle first:border-t-0"
                >
                  <span class="text-body flex items-center gap-1.5">
                    <span>{{ claim.participantName }}'s entry</span>
                    <button
                      v-if="claim.evidenceUrl"
                      type="button"
                      class="text-xs font-semibold text-muted hover:text-heading inline-flex items-center gap-0.5 ml-1 cursor-pointer"
                      @click="openProof(claim.evidenceUrl, `${claim.participantName}'s proof`)"
                    >
                      <UIcon name="i-heroicons-photo" class="w-3 h-3" />
                      Proof
                    </button>
                  </span>
                  <span class="font-mono font-bold text-heading tabular-nums">{{ claim.score.home }} – {{ claim.score.away }}</span>
                </div>
                <p class="text-xs text-muted mt-2">Entries don't match — nothing is applied until the organizer decides.</p>
                <div v-if="canModerate && scoreCard(m).fixtureId" class="mt-2.5 pt-2 border-t border-subtle">
                  <UButton
                    size="xs"
                    color="error"
                    variant="soft"
                    icon="i-heroicons-scale"
                    label="Review dispute"
                    @click="emit('review-dispute', scoreCard(m).fixtureId!)"
                  />
                </div>
              </div>

              <!-- reaction chips -->
              <div
                v-if="m.reactions?.length"
                class="flex flex-wrap gap-1 mt-2"
                :class="isOwn(m) && 'justify-end'"
              >
                <button
                  v-for="r in m.reactions"
                  :key="r.emoji"
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-lg border border-subtle bg-surface px-2 py-0.5 text-xs transition-all cursor-pointer"
                  :class="r.mine
                    ? 'bg-primary-500/10 border-primary-500/30 text-primary-500 font-semibold'
                    : 'text-body hover:text-heading hover:bg-default'"
                  :disabled="!canPost"
                  :title="r.mine ? 'Remove your reaction' : 'React'"
                  @click="pickReaction(m, r.emoji)"
                >
                  <span class="text-xs leading-none">{{ r.emoji }}</span>
                  <span class="font-mono text-[11px] font-bold tabular-nums">{{ r.count }}</span>
                </button>
              </div>
            </div>

            <!-- Floating hover actions toolbar -->
            <div
              v-if="canModerate || canPost"
              class="absolute -top-3.5 hidden group-hover:flex items-center gap-0.5 bg-page/95 backdrop-blur-md border border-subtle rounded-lg p-0.5 shadow-md z-20"
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
                  class="absolute bottom-full mb-1.5 z-30 flex gap-1 bg-page border border-subtle rounded-xl p-1.5 shadow-xl"
                  :class="isOwn(m) ? 'left-0' : 'right-0'"
                  @click.stop
                >
                  <button
                    v-for="e in REACTION_EMOJIS"
                    :key="e"
                    type="button"
                    class="w-8 h-8 rounded-lg text-[16px] hover:bg-surface hover:scale-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
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

          <!-- Paragee thinking -->
          <div
            v-if="botThinking"
            class="flex gap-3 px-4 sm:px-5 py-2.5 bg-surface border-l-2 border-l-primary-500"
            aria-live="polite"
          >
            <div class="w-8 h-8 rounded-full bg-primary-500/10 border border-primary-500/20 flex items-center justify-center shrink-0">
              <UIcon name="i-heroicons-sparkles" class="w-4 h-4 text-primary-500" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold text-heading">Paragee</span>
                <UBadge color="primary" variant="subtle" size="xs" label="AI Assistant" />
              </div>
              <p class="text-xs text-muted mt-0.5 flex items-center gap-1.5">
                Thinking
                <span class="flex items-end gap-0.5 h-3">
                  <span class="w-1 h-1 rounded-full bg-muted animate-bounce" />
                  <span class="w-1 h-1 rounded-full bg-muted animate-bounce [animation-delay:120ms]" />
                  <span class="w-1 h-1 rounded-full bg-muted animate-bounce [animation-delay:240ms]" />
                </span>
              </p>
            </div>
          </div>
        </template>
        </div>

        <!-- scroll-to-bottom FAB: anchored inside the feed area above the composer -->
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 translate-y-2 scale-90"
          enter-to-class="opacity-100 translate-y-0 scale-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0 scale-100"
          leave-to-class="opacity-0 translate-y-2 scale-90"
        >
          <button
            v-if="!isNearBottom"
            type="button"
            class="absolute bottom-2 right-3 sm:right-4 z-20 w-8 h-8 rounded-full bg-page/95 backdrop-blur-xs border border-subtle shadow-md hover:bg-surface flex items-center justify-center text-heading transition-all cursor-pointer hover:shadow-lg active:scale-95"
            title="Scroll to latest messages"
            aria-label="Scroll to latest messages"
            @click="scrollToBottom(true, true)"
          >
            <UIcon name="i-heroicons-chevron-double-down" class="w-4 h-4 text-heading" />
          </button>
        </Transition>
      </div>

      <!-- typing indicator -->
      <div
        class="h-6 px-4 sm:px-5 flex items-center gap-2 text-[11px] text-muted transition-opacity duration-200"
        :class="[fullscreen && 'max-w-3xl w-full mx-auto', typingText ? 'opacity-100' : 'opacity-0']"
        aria-live="polite"
      >
        <span v-if="typingText" class="flex items-center gap-1.5">
          <span class="flex items-end gap-0.5 h-3">
            <span class="w-1 h-1 rounded-full bg-muted animate-bounce" />
            <span class="w-1 h-1 rounded-full bg-muted animate-bounce [animation-delay:120ms]" />
            <span class="w-1 h-1 rounded-full bg-muted animate-bounce [animation-delay:240ms]" />
          </span>
          <span class="font-medium text-body">{{ typingText }}</span>
        </span>
      </div>

      <!-- LAYER 3: Composer / Task Bar -->
      <div
        v-if="canPost"
        class="relative border-t border-subtle px-4 sm:px-5 py-2.5 flex items-end gap-2 flex-wrap bg-surface"
        :class="fullscreen && 'max-w-3xl w-full mx-auto pb-[max(env(safe-area-inset-bottom),0.875rem)]'"
      >
        <!-- Organizer announcement banner -->
        <div
          v-if="canPost === 'organizer'"
          class="w-full flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 pb-0.5"
        >
          <UIcon name="i-heroicons-megaphone" class="w-3.5 h-3.5 text-amber-500" />
          <span>Official Organizer Broadcast (highlighted & pinned)</span>
        </div>

        <!-- replying-to bar -->
        <div
          v-if="replyTarget"
          class="w-full flex items-center justify-between gap-2 rounded-lg border border-subtle bg-default px-3 py-1.5 mb-1 text-xs"
        >
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <UIcon name="i-heroicons-arrow-uturn-left" class="w-3.5 h-3.5 text-muted shrink-0" />
            <span class="min-w-0 flex-1">
              <span class="block text-[11px] font-semibold text-heading truncate">Replying to {{ replyTarget.author.name }}</span>
              <span class="block text-[11.5px] text-muted truncate">{{ replyTarget.text }}</span>
            </span>
          </div>
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

        <!-- Slash command autocomplete menu -->
        <div
          v-if="slashOpen"
          class="absolute bottom-full left-4 sm:left-5 mb-2 w-72 max-w-[calc(100%-2rem)] rounded-xl border border-subtle bg-page shadow-xl overflow-hidden z-30"
        >
          <p class="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted border-b border-subtle">
            Commands
          </p>
          <button
            v-for="(c, i) in availableSlashCommands"
            :key="c.cmd"
            type="button"
            class="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors cursor-pointer"
            :class="i === slashIndex ? 'bg-surface' : 'hover:bg-surface/50'"
            @mousedown.prevent="executeSlash(c)"
            @mouseenter="slashIndex = i"
          >
            <span class="w-6 h-6 rounded-lg shrink-0 flex items-center justify-center text-xs bg-surface border border-subtle text-heading">
              <UIcon :name="c.icon" class="w-3.5 h-3.5" />
            </span>
            <span class="min-w-0">
              <span class="block text-xs font-semibold text-heading truncate font-mono">{{ c.label }}</span>
              <span class="block text-[10px] text-muted truncate">{{ c.desc }}</span>
            </span>
          </button>
        </div>

        <!-- @mention autocomplete menu -->
        <div
          v-if="mentionOpen"
          class="absolute bottom-full left-4 sm:left-5 mb-2 w-72 max-w-[calc(100%-2rem)] rounded-xl border border-subtle bg-page shadow-xl overflow-hidden z-30"
        >
          <p class="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted border-b border-subtle">
            Mention
          </p>
          <button
            v-for="(m, i) in mentionMatches"
            :key="m.id"
            type="button"
            class="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors cursor-pointer"
            :class="i === mentionIndex ? 'bg-surface' : 'hover:bg-surface/50'"
            @mousedown.prevent="selectMention(m)"
            @mouseenter="mentionIndex = i"
          >
            <span
              class="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[8.5px] font-bold text-white shadow-xs"
              :style="m.bot ? { background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)' } : { background: avatarColor(m.name) }"
            >{{ m.bot ? '✨' : initials(m.name) }}</span>
            <span class="min-w-0">
              <span class="block text-xs font-semibold text-heading truncate">@{{ m.name }}</span>
              <span v-if="m.sub" class="block text-[10px] text-muted truncate">{{ m.sub }}</span>
            </span>
          </button>
        </div>

        <!-- Slash command trigger button -->
        <UButton
          type="button"
          size="sm"
          variant="ghost"
          color="neutral"
          class="font-mono font-bold text-xs px-2 shrink-0"
          label="/"
          title="Commands (/score, /next, /table, /rules)"
          @click="openSlashMenu"
        />

        <UTextarea
          ref="composerEl"
          v-model="draft"
          :placeholder="composerPlaceholder"
          :rows="1"
          autoresize
          :maxrows="4"
          class="flex-1 min-w-0"
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
        class="border-t border-subtle px-4 sm:px-5 py-3 flex items-center justify-between gap-3 flex-wrap bg-surface"
        :class="fullscreen && 'max-w-3xl w-full mx-auto'"
      >
        <div class="flex items-center gap-2 text-xs text-muted">
          <UIcon name="i-heroicons-lock-closed" class="w-4 h-4 shrink-0" />
          <span>Only approved participants and organizers can submit scores and post updates.</span>
        </div>
        <UButton
          v-if="joinUrl"
          type="button"
          size="xs"
          variant="outline"
          color="neutral"
          label="Join tournament to participate"
          trailing-icon="i-heroicons-arrow-right"
          :to="joinUrl"
        />
      </div>



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
