<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { TournamentType, ParticipantType, Visibility, type Tournament } from '~/types'
import { resolveEngine, listEngines } from '~/engines/registry'
import { CalendarDate, parseDate, type DateValue } from '@internationalized/date'
import type { PayoutAccountStatus, DiscountCode } from '~/stores/payment'

const props = defineProps<{
  tournament: Tournament
}>()

const emit = defineEmits<{
  (e: 'open-tab', slot: string): void
  (e: 'qr'): void
}>()

const tournamentStore = useTournamentStore()
const paymentStore = usePaymentStore()
const { handleError, extractErrorMessage } = useErrors()

const loading = ref(false)
const error = ref<string | null>(null)

const payoutAccount = ref<PayoutAccountStatus | null>(null)
const showPayoutModal = ref(false)

function onPayoutSaved(status: PayoutAccountStatus | null) {
  payoutAccount.value = status
  showPayoutModal.value = false
}

// ─── Discount & waiver codes ─────────────────────────────
const toast = useToast()
const discountCodes = ref<DiscountCode[]>([])
const loadingDiscountCodes = ref(false)
const showDiscountModal = ref(false)
const savingDiscount = ref(false)
const discountError = ref<string | null>(null)
const deletingDiscountId = ref<string | null>(null)
const discountForm = reactive({
  code: '',
  type: 'PERCENT' as 'PERCENT' | 'FIXED' | 'WAIVER',
  value: null as number | null,
  maxUses: null as number | null,
  expiresAt: '',
})

async function loadDiscountCodes() {
  loadingDiscountCodes.value = true
  try {
    discountCodes.value = await paymentStore.fetchDiscountCodes(props.tournament.id)
  } catch {
    // Silent fail — section shows as empty
  } finally {
    loadingDiscountCodes.value = false
  }
}

function discountLabel(c: DiscountCode) {
  if (c.type === 'WAIVER') return 'Free registration'
  if (c.type === 'PERCENT') return `${c.value}% off`
  return `₦${(c.value / 100).toLocaleString()} off`
}

function openDiscountModal() {
  Object.assign(discountForm, {
    code: '',
    type: 'PERCENT',
    value: null,
    maxUses: null,
    expiresAt: '',
  })
  discountError.value = null
  showDiscountModal.value = true
}

const discountFormInvalid = computed(() => {
  if (!discountForm.code.trim()) return true
  if (discountForm.type === 'WAIVER') return false
  const v = discountForm.value
  if (v == null || v <= 0) return true
  if (discountForm.type === 'PERCENT' && v > 100) return true
  return false
})

// Why the create button is disabled — shown under the value field
const discountValueError = computed(() => {
  const v = discountForm.value
  if (discountForm.type === 'WAIVER' || v == null) return null
  if (discountForm.type === 'PERCENT' && (v < 1 || v > 100)) {
    return 'Enter a percentage between 1 and 100'
  }
  if (discountForm.type === 'FIXED' && v <= 0) {
    return 'Enter an amount greater than zero'
  }
  return null
})

async function handleCreateDiscount() {
  if (discountFormInvalid.value) return
  savingDiscount.value = true
  discountError.value = null
  try {
    await paymentStore.createDiscountCode(props.tournament.id, {
      code: discountForm.code.trim(),
      type: discountForm.type,
      value:
        discountForm.type === 'WAIVER'
          ? undefined
          : discountForm.type === 'FIXED'
            ? Math.round((discountForm.value ?? 0) * 100)
            : (discountForm.value ?? undefined),
      maxUses: discountForm.maxUses ?? undefined,
      expiresAt: discountForm.expiresAt || undefined,
    })
    showDiscountModal.value = false
    toast.add({ title: 'Discount Code Created', color: 'success' })
    await loadDiscountCodes()
  } catch (err: any) {
    discountError.value = extractErrorMessage(err)
  } finally {
    savingDiscount.value = false
  }
}

async function toggleDiscountActive(c: DiscountCode) {
  try {
    await paymentStore.updateDiscountCode(c.id, { isActive: !c.isActive })
    await loadDiscountCodes()
  } catch (err: any) {
    handleError(err, { title: 'Failed to Update Code' })
  }
}

async function handleDeleteDiscount(c: DiscountCode) {
  deletingDiscountId.value = c.id
  try {
    await paymentStore.deleteDiscountCode(c.id)
    toast.add({ title: 'Discount Code Deleted', color: 'success' })
    await loadDiscountCodes()
  } catch (err: any) {
    handleError(err, { title: 'Failed to Delete Code' })
  } finally {
    deletingDiscountId.value = null
  }
}

// Logo upload state
const logoFileInput = ref<HTMLInputElement | null>(null)
const logoFile = ref<File | null>(null)
const logoPreview = ref<string | null>(props.tournament.logoUrl || null)
const uploadingLogo = ref(false)

const triggerLogoInput = () => {
  logoFileInput.value?.click()
}

const handleLogoChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return

  if (!file.type.startsWith('image/')) {
    error.value = 'Please select an image file'
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    error.value = 'Image must be less than 5MB'
    return
  }

  logoFile.value = file
  logoPreview.value = URL.createObjectURL(file)
}

const removeLogo = () => {
  logoFile.value = null
  logoPreview.value = null
  if (logoFileInput.value) {
    logoFileInput.value.value = ''
  }
}

// Banner upload state
const bannerFileInput = ref<HTMLInputElement | null>(null)
const bannerFile = ref<File | null>(null)
const bannerPreview = ref<string | null>(props.tournament.bannerUrl || null)
const uploadingBanner = ref(false)

const triggerBannerInput = () => {
  bannerFileInput.value?.click()
}

const handleBannerChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return

  if (!file.type.startsWith('image/')) {
    error.value = 'Please select an image file'
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    error.value = 'Image must be less than 5MB'
    return
  }

  bannerFile.value = file
  bannerPreview.value = URL.createObjectURL(file)
}

const removeBanner = () => {
  bannerFile.value = null
  bannerPreview.value = null
  if (bannerFileInput.value) {
    bannerFileInput.value.value = ''
  }
}

// Custom name availability check
const checkingName = ref(false)
const nameAvailable = ref<boolean | null>(null)
const nameCheckError = ref<string | null>(null)
let nameCheckTimeout: ReturnType<typeof setTimeout> | null = null

const nameFormatRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// Date initialization helper
const parseDateString = (dateStr: string | null | undefined): DateValue | null => {
  if (!dateStr) return null
  try {
    // Parse the date part (YYYY-MM-DD)
    const datePart = dateStr.split('T')[0]
    if (!datePart) return null
    return parseDate(datePart)
  } catch (e) {
    console.warn('Failed to parse date:', dateStr)
    return null
  }
}

// Date values for calendar
const startDate = shallowRef<DateValue | null>(parseDateString(props.tournament.start_date))
const endDate = shallowRef<DateValue | null>(parseDateString(props.tournament.end_date))


// Format date for display
const formatDateDisplay = (date: DateValue | null) => {
  if (!date) return 'Select date'
  return new Date(date.year, date.month - 1, date.day).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

// Convert DateValue to ISO string for API
const dateToISOString = (date: DateValue | null): string => {
  if (!date) return ''
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).toISOString()
}

// Registration window: datetime-local input values ⇄ ISO strings
const isoToLocalInput = (iso: string | null | undefined): string => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
const localInputToISO = (val: string | null | undefined): string | null => {
  if (!val) return null
  const d = new Date(val)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

// Form schema
const schema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  customName: z.string()
    .min(3, 'Custom URL must be at least 3 characters')
    .max(60, 'Custom URL must be at most 60 characters')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Only lowercase letters, numbers, and hyphens allowed')
    .optional()
    .or(z.literal('')),
  seasonName: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  sport: z.string().min(1, 'Sport is required'),
  type: z.nativeEnum(TournamentType),
  participantType: z.nativeEnum(ParticipantType),
  visibility: z.nativeEnum(Visibility),
  location: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  timezone: z.string().min(1, 'Timezone is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  maxParticipants: z.number({ required_error: 'Max participants is required' }).int().min(2, 'Must have at least 2 participants'),
  autoApprove: z.boolean(),
  isPaidRegistration: z.boolean().optional(),
  registrationFee: z.number().min(0, 'Registration fee must be positive').optional().nullable(),
  registrationOpen: z.string().optional().nullable(),
  registrationClose: z.string().optional().nullable(),
  isPinned: z.boolean().optional(),
  twoLegsKnockout: z.boolean().optional(),
  doubleRoundRobin: z.boolean().optional(),
  thirdPlaceMatch: z.boolean().optional(),
  unifiedStandings: z.boolean().optional(),
  hasKnockoutPlayoffs: z.boolean().optional(),
  setsToWin: z.number().int().min(1).max(5).optional().nullable(),
  gamesPerSet: z.number().int().min(1).max(50).optional().nullable()
})

type Schema = z.output<typeof schema>

// Form state initialized with tournament data
const state = reactive<Partial<Schema>>({
  name: props.tournament.name,
  customName: props.tournament.customName || '',
  seasonName: props.tournament.seasonName || '',
  description: props.tournament.description || '',
  sport: props.tournament.sport,
  type: props.tournament.type,
  participantType: props.tournament.participantType,
  visibility: props.tournament.visibility,
  location: props.tournament.location || '',
  latitude: props.tournament.latitude ?? null,
  longitude: props.tournament.longitude ?? null,
  timezone: props.tournament.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
  start_date: props.tournament.start_date,
  end_date: props.tournament.end_date,
  maxParticipants: props.tournament.maxParticipants ?? undefined,
  autoApprove: props.tournament.autoApprove ?? false,
  isPaidRegistration: props.tournament.isPaidRegistration ?? false,
  registrationFee: props.tournament.registrationFee ? props.tournament.registrationFee / 100 : null,
  registrationOpen: isoToLocalInput(props.tournament.registrationOpen),
  registrationClose: isoToLocalInput(props.tournament.registrationClose),
  isPinned: props.tournament.isPinned ?? false,
  twoLegsKnockout: props.tournament.twoLegsKnockout ?? false,
  doubleRoundRobin: props.tournament.doubleRoundRobin ?? false,
  thirdPlaceMatch: props.tournament.thirdPlaceMatch ?? false,
  unifiedStandings: props.tournament.unifiedStandings ?? false,
  hasKnockoutPlayoffs: props.tournament.hasKnockoutPlayoffs ?? false,
  setsToWin: props.tournament.scoringRules?.setsToWin ?? null,
  gamesPerSet: props.tournament.scoringRules?.gamesPerSet ?? null
})


// Watch date changes and update state
watch(startDate, (val) => {
  state.start_date = dateToISOString(val)
  if (val && endDate.value && val.compare(endDate.value) > 0) {
    endDate.value = null
  }
})

watch(endDate, (val) => {
  state.end_date = dateToISOString(val)
})

// Watch for custom name changes
watch(() => state.customName, (val) => {
  nameAvailable.value = null
  nameCheckError.value = null

  // If it's the current custom name, it's automatically available
  if (val === props.tournament.customName) {
    nameAvailable.value = true
    return
  }

  if (nameCheckTimeout) clearTimeout(nameCheckTimeout)

  if (!val || val.length < 3) {
    checkingName.value = false
    return
  }

  if (!nameFormatRegex.test(val)) {
    checkingName.value = false
    return
  }

  checkingName.value = true

  nameCheckTimeout = setTimeout(async () => {
    try {
      const res = await $api<{ data: { available: boolean } }>(`/tournaments/check-name/${val}`, {
        method: 'GET',
      })
      if (state.customName === val) {
        nameAvailable.value = res.data.available
      }
    } catch (err: any) {
      if (state.customName === val) {
        nameCheckError.value = 'Could not check availability'
        nameAvailable.value = null
      }
    } finally {
      if (state.customName === val) {
        checkingName.value = false
      }
    }
  }, 500)
}, { immediate: true })

// Tournament Format Presets
const currentPresetId = computed(() => getPresetIdFromState(state.type, state.unifiedStandings))
const currentPreset = computed(() => getPresetById(currentPresetId.value))

const availablePresets = computed(() => {
  const c = resolveEngine(state.sport).creation
  if (!c) return TOURNAMENT_PRESETS
  return TOURNAMENT_PRESETS.filter((p) => {
    if (p.type === TournamentType.LEAGUE) {
      return c.formats.includes(TournamentType.LEAGUE) || c.formats.includes(TournamentType.ROUND_ROBIN)
    }
    return c.formats.includes(p.type)
  })
})

const applyTournamentPreset = (preset: TournamentPreset) => {
  state.type = preset.type
  state.unifiedStandings = preset.unifiedStandings
  state.hasKnockoutPlayoffs = preset.hasKnockoutPlayoffs ?? false
}

// Options for selects
const tournamentTypes = [
  { label: 'Knockout', value: TournamentType.KNOCKOUT, description: 'Single elimination bracket' },
  { label: 'Round Robin', value: TournamentType.ROUND_ROBIN, description: 'Everyone plays everyone' },
  { label: 'Group Stage (League)', value: TournamentType.GROUP, description: 'Groups without knockout stage' },
  { label: 'Hybrid (Group + Knockout)', value: TournamentType.HYBRID, description: 'Group Stage followed by Knockout Stage' },
  { label: 'Friendly / Single Match', value: TournamentType.FRIENDLY, description: 'Single matches, friendly games' },
  { label: 'Race / Event Final', value: TournamentType.RACE, description: 'One race or event — all participants ranked by result' }
]

const participantTypes = [
  { label: 'Teams', value: ParticipantType.TEAM, icon: 'i-heroicons-user-group' },
  { label: 'Individuals', value: ParticipantType.INDIVIDUAL, icon: 'i-heroicons-user' }
]

const visibilityOptions = [
  { label: 'Public', value: Visibility.PUBLIC, description: 'Listed on explore, indexed, shareable graphics', icon: 'i-heroicons-globe-alt' },
  { label: 'Unlisted', value: Visibility.UNLISTED, description: 'Anyone with the link can view; not listed', icon: 'i-heroicons-eye-slash' },
  { label: 'Private', value: Visibility.PRIVATE, description: 'Only members and invited participants', icon: 'i-heroicons-lock-closed' }
]

// Sport options come from the engine registry (currently restricted to Football and Esports);
// preserves existing sport if a tournament was created previously with another sport
const popularSports = computed(() => {
  const defaults = listEngines().map((e) => e.label)
  if (state.sport && !defaults.includes(state.sport)) {
    return [...defaults, state.sport]
  }
  return defaults
})

// Set-scoring config only applies to set-based sport engines (tennis, volleyball…)
const engineSetScoring = computed(() => {
  const engine = resolveEngine(state.sport)
  return engine.setScoring ?? null
})

// Engine-driven creation options: hide format toggles the sport doesn't support
const creationOption = (key: 'twoLegs' | 'thirdPlaceMatch' | 'doubleRoundRobin') => {
  const c = resolveEngine(state.sport).creation
  return c ? c.options[key] : true
}

// Table formats award points per result (win/draw/loss)
const isTableFormat = computed(() =>
  [TournamentType.ROUND_ROBIN, TournamentType.LEAGUE, TournamentType.GROUP, TournamentType.HYBRID].includes(state.type as any)
)

// ─── Scoring rules (points per result) ───────────────────
const pointsWin = ref(Number(props.tournament.scoringRules?.win ?? 3))
const pointsDraw = ref(Number(props.tournament.scoringRules?.draw ?? 1))
const pointsLoss = ref(Number(props.tournament.scoringRules?.loss ?? 0))

const pointsPresets = [
  { label: 'Football · 3-1-0', win: 3, draw: 1, loss: 0 },
  { label: '2-1-0', win: 2, draw: 1, loss: 0 },
  { label: 'Win only · 1-0-0', win: 1, draw: 0, loss: 0 },
]
const activePreset = computed(() =>
  pointsPresets.findIndex(p => p.win === pointsWin.value && p.draw === pointsDraw.value && p.loss === pointsLoss.value)
)
const applyPreset = (p: (typeof pointsPresets)[number]) => {
  pointsWin.value = p.win
  pointsDraw.value = p.draw
  pointsLoss.value = p.loss
}
const pointsPreview = computed(() => `→ 2 wins + 1 draw = ${2 * pointsWin.value + pointsDraw.value} pts`)

// ─── Score Predictions (Fan Engagement) ───────────────────
const isFootballSport = computed(() => (state.sport || props.tournament.sport || '').toLowerCase() === 'football')
const predictionEnabled = ref(props.tournament.scoringRules?.prediction?.enabled === true)
const predictionExactScorePoints = ref(Number(props.tournament.scoringRules?.prediction?.exactScorePoints ?? 3))
const predictionCorrectResultPoints = ref(Number(props.tournament.scoringRules?.prediction?.correctResultPoints ?? 1))

// ─── Registration window ─────────────────────────────────
const regWindowChip = computed(() => {
  const open = state.registrationOpen ? new Date(state.registrationOpen).getTime() : null
  const close = state.registrationClose ? new Date(state.registrationClose).getTime() : null
  if (!open && !close) return null
  const now = Date.now()
  if (close && now > close) {
    return { label: 'Registration closed', cls: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25' }
  }
  if (open && now < open) {
    const when = new Date(state.registrationOpen!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return { label: `Opens ${when}`, cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25' }
  }
  return { label: 'Registration open', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25' }
})

// ─── Visibility & sharing ────────────────────────────────
const runtimeConfig = useRuntimeConfig()
// Live fan page URL — based on the SAVED slug, not the unsaved edit
const fanPageUrl = computed(() => {
  const host = import.meta.client
    ? window.location.host
        .replace(/^manage-dev\./, window.location.host.includes('lvh.me') ? '' : 'dev.')
        .replace(/^manage\./, '')
    : 'parascores.com'
  const protocol = import.meta.dev ? 'http' : 'https'
  const baseUrl = runtimeConfig.public.siteUrl || `${protocol}://${host}`
  return `${baseUrl}/t/${props.tournament.customName || props.tournament.id}`
})
const fanPageDisplay = computed(() => fanPageUrl.value.replace(/^https?:\/\//, ''))

async function copyFanLink() {
  try {
    await navigator.clipboard.writeText(fanPageUrl.value)
    toast.add({ title: 'Link copied', color: 'success' })
  } catch {
    toast.add({ title: 'Could not copy link', color: 'error' })
  }
}

const widgetsHref = computed(() => `/widgets?t=${props.tournament.customName || props.tournament.id}`)

// Read-only structure chips (only when the detail payload carries counts)
const structureChips = computed(() => {
  const c = props.tournament._count
  if (!c) return []
  const chips: { label: string; cls: string }[] = []
  if (c.groups) chips.push({ label: `${c.groups} ${c.groups === 1 ? 'league table' : 'groups'}`, cls: 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-300 border-indigo-500/25' })
  if (c.participants) chips.push({ label: `${c.participants} ${props.tournament.participantType === ParticipantType.TEAM ? 'teams' : 'players'}`, cls: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border-cyan-500/25' })
  return chips
})

// ─── "Best of N" input in user terms (odd N); state stores setsToWin = (N+1)/2
const bestOfError = ref<string | null>(null)
const bestOfModel = computed<number | null>({
  get: () => (state.setsToWin ? state.setsToWin * 2 - 1 : null),
  set: (val) => {
    if (val == null || Number.isNaN(val)) {
      state.setsToWin = null
      bestOfError.value = null
      return
    }
    if (val % 2 === 0) {
      bestOfError.value = 'Best-of must be an odd number (1, 3, 5, 7…)'
      return
    }
    bestOfError.value = null
    state.setsToWin = (val + 1) / 2
  },
})

const timezones = [
  { label: 'UTC', value: 'UTC' },
  { label: 'Lagos (WAT)', value: 'Africa/Lagos' },
  { label: 'London (GMT/BST)', value: 'Europe/London' },
  { label: 'New York (EST)', value: 'America/New_York' },
  { label: 'Los Angeles (PST)', value: 'America/Los_Angeles' },
  { label: 'Tokyo (JST)', value: 'Asia/Tokyo' },
  { label: 'Sydney (AEST)', value: 'Australia/Sydney' }
]

// ─── Section rail + scrollspy ────────────────────────────
const sections = [
  { id: 'general', label: 'General', icon: 'i-heroicons-cog-6-tooth' },
  { id: 'branding', label: 'Branding', icon: 'i-heroicons-swatch' },
  { id: 'visibility', label: 'Visibility & sharing', icon: 'i-heroicons-globe-alt' },
  { id: 'format', label: 'Format & rules', icon: 'i-heroicons-trophy' },
  { id: 'registration', label: 'Registration', icon: 'i-heroicons-envelope' },
  { id: 'ownership', label: 'Season & ownership', icon: 'i-heroicons-arrows-right-left' },
  { id: 'danger', label: 'Danger zone', icon: 'i-heroicons-exclamation-triangle', danger: true },
]
const activeSection = ref('general')

function scrollToSection(id: string) {
  activeSection.value = id
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const navClass = (s: (typeof sections)[number]) => {
  if (activeSection.value === s.id) {
    return s.danger
      ? 'bg-red-500/10 text-red-600 dark:text-red-400 font-semibold'
      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
  }
  return s.danger
    ? 'text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/5'
    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.05] hover:text-gray-900 dark:hover:text-white'
}

// ─── Dirty tracking (sticky save bar) ────────────────────
const SNAP_KEYS = [
  'name', 'customName', 'seasonName', 'description', 'sport', 'type', 'participantType', 'visibility',
  'location', 'latitude', 'longitude', 'timezone', 'maxParticipants', 'autoApprove', 'isPaidRegistration',
  'registrationFee', 'registrationOpen', 'registrationClose', 'isPinned',
  'twoLegsKnockout', 'doubleRoundRobin', 'thirdPlaceMatch', 'unifiedStandings', 'hasKnockoutPlayoffs', 'setsToWin', 'gamesPerSet',
] as const

function buildSnapshot() {
  const o: Record<string, any> = {}
  for (const k of SNAP_KEYS) o[k] = (state as any)[k] ?? null
  o.start_date = dateToISOString(parseDateString(state.start_date))
  o.end_date = dateToISOString(parseDateString(state.end_date))
  o.points = [pointsWin.value, pointsDraw.value, pointsLoss.value]
  o.prediction = [predictionEnabled.value, predictionExactScorePoints.value, predictionCorrectResultPoints.value]
  o.logo = logoPreview.value
  o.banner = bannerPreview.value
  return JSON.stringify(o)
}

const savedSnapshot = ref('')

const dirtyKeys = computed<string[]>(() => {
  if (!savedSnapshot.value) return []
  try {
    const cur = JSON.parse(buildSnapshot())
    const sav = JSON.parse(savedSnapshot.value)
    return Object.keys(cur).filter((k) => JSON.stringify(cur[k]) !== JSON.stringify(sav[k]))
  } catch {
    return []
  }
})
const isDirty = computed(() => dirtyKeys.value.length > 0)
const dirtyCount = computed(() => dirtyKeys.value.length)

function discardChanges() {
  if (!savedSnapshot.value) return
  const sav = JSON.parse(savedSnapshot.value)
  for (const k of SNAP_KEYS) (state as any)[k] = sav[k] ?? undefined
  startDate.value = parseDateString(sav.start_date)
  endDate.value = parseDateString(sav.end_date)
  ;[pointsWin.value, pointsDraw.value, pointsLoss.value] = sav.points
  if (sav.prediction) {
    ;[predictionEnabled.value, predictionExactScorePoints.value, predictionCorrectResultPoints.value] = sav.prediction
  }
  logoFile.value = null
  logoPreview.value = sav.logo
  bannerFile.value = null
  bannerPreview.value = sav.banner
  bestOfError.value = null
}

let sectionObserver: IntersectionObserver | null = null

onMounted(async () => {
  savedSnapshot.value = buildSnapshot()

  if (import.meta.client) {
    sectionObserver = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) activeSection.value = e.target.id
        }
      },
      { rootMargin: '-20% 0px -70% 0px' },
    )
    for (const s of sections) {
      const el = document.getElementById(s.id)
      if (el) sectionObserver.observe(el)
    }
  }

  const orgId = props.tournament.organization_id
  if (orgId) {
    try {
      payoutAccount.value = await paymentStore.fetchPayoutAccount(orgId)
    } catch {
      // Silent fail — warning banner stays hidden
    }
  }
  if (props.tournament.isPaidRegistration) {
    loadDiscountCodes()
  }
})

onBeforeUnmount(() => sectionObserver?.disconnect())

// Submit handler
async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (bestOfError.value) {
    error.value = bestOfError.value
    return
  }
  loading.value = true
  error.value = null

  try {
    let logoUrl = props.tournament.logoUrl
    let bannerUrl = props.tournament.bannerUrl

    // Upload logo if a NEW file is selected
    if (logoFile.value) {
      uploadingLogo.value = true
      try {
        const formData = new FormData()
        formData.append('file', logoFile.value)

        const uploadResponse = await $api<{success: boolean, data: { url: string }, message: string}>('/upload/image?folder=tournaments', {
          method: 'POST',
          body: formData
        })

        if (uploadResponse.data?.url) {
          logoUrl = uploadResponse.data.url
        }
      } finally {
        uploadingLogo.value = false
      }
    } else if (logoPreview.value === null) {
      // User removed the logo
      logoUrl = null
    }

    // Upload banner if a NEW file is selected
    if (bannerFile.value) {
      uploadingBanner.value = true
      try {
        const formData = new FormData()
        formData.append('file', bannerFile.value)

        const uploadResponse = await $api<{success: boolean, data: { url: string }, message: string}>('/upload/image?folder=tournaments', {
          method: 'POST',
          body: formData
        })

        if (uploadResponse.data?.url) {
          bannerUrl = uploadResponse.data.url
        }
      } finally {
        uploadingBanner.value = false
      }
    } else if (bannerPreview.value === null) {
      // User removed the banner
      bannerUrl = null
    }

    // Merge set-scoring + points config into existing scoringRules (don't clobber other keys)
    const scoringRules = {
      ...(props.tournament.scoringRules ?? {}),
      win: pointsWin.value,
      draw: pointsDraw.value,
      loss: pointsLoss.value,
      prediction: {
        enabled: predictionEnabled.value,
        exactScorePoints: Math.max(1, Number(predictionExactScorePoints.value || 3)),
        correctResultPoints: Math.max(0, Number(predictionCorrectResultPoints.value || 1)),
      },
    }
    if (event.data.setsToWin) scoringRules.setsToWin = event.data.setsToWin
    if (event.data.gamesPerSet) scoringRules.gamesPerSet = event.data.gamesPerSet

    await tournamentStore.updateTournament(props.tournament.id, {
      ...event.data,
      customName: event.data.customName || null,
      seasonName: event.data.seasonName?.trim() || null,
      description: event.data.description || null,
      location: event.data.location || null,
      isPaidRegistration: !!event.data.isPaidRegistration,
      registrationFee: event.data.isPaidRegistration && event.data.registrationFee
        ? Math.round(event.data.registrationFee * 100)
        : 0,
      registrationOpen: localInputToISO(event.data.registrationOpen),
      registrationClose: localInputToISO(event.data.registrationClose),
      isPinned: !!event.data.isPinned,
      scoringRules,
      logoUrl,
      bannerUrl,
    } as unknown as Partial<Tournament>)

    useToast().add({
      title: 'Settings Updated',
      description: 'The tournament settings have been successfully updated.',
      color: 'success',
      icon: 'i-heroicons-check-circle'
    })
    savedSnapshot.value = buildSnapshot()
  } catch (err: any) {
    handleError(err, { title: 'Update Failed' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="w-full">
    <!-- Error Alert -->
    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-heroicons-exclamation-triangle"
      :title="error"
      class="mb-4 sm:mb-6"
      :close-button="{ icon: 'i-heroicons-x-mark', color: 'error', variant: 'link' }"
      @close="error = null"
    />

    <UForm :schema="schema" :state="state" @submit="onSubmit">
      <div class="grid gap-5 sm:gap-6 xl:grid-cols-[188px_minmax(0,1fr)] items-start max-w-[1060px]">

        <!-- ═══ SECTION RAIL ═══ -->
        <nav class="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 xl:mx-0 xl:px-0 xl:pb-0 xl:flex-col xl:overflow-visible xl:sticky xl:top-4">
          <button
            v-for="s in sections"
            :key="s.id"
            type="button"
            class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] whitespace-nowrap shrink-0 transition-all"
            :class="navClass(s)"
            @click="scrollToSection(s.id)"
          >
            <UIcon :name="s.icon" class="w-4 h-4 shrink-0 opacity-80" />
            {{ s.label }}
          </button>
        </nav>

        <!-- ═══ SECTIONS ═══ -->
        <div class="space-y-4 sm:space-y-6 min-w-0">

          <!-- 1 · GENERAL -->
          <section
            id="general"
            class="scroll-mt-28 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden"
          >
            <div class="px-4 sm:px-5 py-3.5 border-b border-gray-100 dark:border-white/[0.06]">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">General</h2>
              <p class="text-xs text-gray-500 mt-0.5">Identity, schedule, and where the tournament happens.</p>
            </div>
            <div class="p-4 sm:p-5 space-y-4">
              <UFormField label="Tournament name" name="name" required>
                <UInput
                  v-model="state.name"
                  placeholder="e.g. Premier Football League 2026"
                  size="md"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Public URL" name="customName">
                <UInput
                  v-model="state.customName"
                  placeholder="e.g. premier-league-2026"
                  icon="i-heroicons-link"
                  class="w-full"
                  :trailing-icon="checkingName ? 'i-heroicons-arrow-path' : nameAvailable === true ? 'i-heroicons-check-circle' : nameAvailable === false ? 'i-heroicons-x-circle' : undefined"
                  :color="nameAvailable === false ? 'error' : nameAvailable === true ? 'success' : undefined"
                />
                <template #description>
                  <span v-if="checkingName" class="text-xs text-gray-400 flex items-center gap-1">
                    <UIcon name="i-heroicons-arrow-path" class="w-3 h-3 animate-spin shrink-0" />
                    <span>Checking availability...</span>
                  </span>
                  <span v-else-if="nameAvailable === true && state.customName" class="text-xs text-green-600 dark:text-green-400 flex items-start gap-1">
                    <UIcon name="i-heroicons-check-circle" class="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span class="break-all">
                      parascores.com/t/<span class="font-medium">{{ state.customName }}</span> is available
                    </span>
                  </span>
                  <span v-else-if="nameAvailable === false" class="text-xs text-red-600 dark:text-red-400 flex items-start gap-1">
                    <UIcon name="i-heroicons-x-circle" class="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>This custom URL is already taken. Try another one.</span>
                  </span>
                  <span v-else-if="nameCheckError" class="text-xs text-amber-600 dark:text-amber-400">
                    {{ nameCheckError }}
                  </span>
                  <span v-else class="text-xs text-gray-400">
                    Lowercase letters, numbers, and hyphens only
                  </span>
                </template>
              </UFormField>

              <UFormField label="Season / Edition" name="seasonName" hint="e.g. 2025/2026, Season 1, Spring 2026">
                <UInput
                  v-model="state.seasonName"
                  placeholder="e.g. 2025/2026 or Season 1"
                  icon="i-heroicons-calendar"
                  size="md"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Description" name="description">
                <UTextarea
                  v-model="state.description"
                  placeholder="Describe your tournament..."
                  :rows="3"
                  class="w-full"
                />
              </UFormField>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <UFormField
                  label="Sport"
                  name="sport"
                  required
                  description="Set-based sports (tennis, volleyball…) unlock set scoring under Format & rules."
                >
                  <USelect
                    v-model="state.sport"
                    :items="popularSports"
                    placeholder="Select sport"
                    class="w-full"
                  />
                </UFormField>

                <UFormField label="Timezone" name="timezone" required>
                  <USelect
                    v-model="state.timezone"
                    :items="timezones"
                    value-key="value"
                    option-label="label"
                    class="w-full"
                  />
                </UFormField>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <UFormField label="Start date" name="start_date" required>
                  <UPopover>
                    <UButton
                      variant="outline"
                      color="neutral"
                      icon="i-heroicons-calendar"
                      size="sm"
                      class="w-full justify-start"
                      :class="!startDate && 'text-gray-400'"
                    >
                      {{ formatDateDisplay(startDate) }}
                    </UButton>
                    <template #content>
                      <UCalendar v-model="startDate" />
                    </template>
                  </UPopover>
                </UFormField>

                <UFormField label="End date" name="end_date" required>
                  <UPopover>
                    <UButton
                      variant="outline"
                      color="neutral"
                      icon="i-heroicons-calendar"
                      size="sm"
                      class="w-full justify-start"
                      :class="!endDate && 'text-gray-400'"
                    >
                      {{ formatDateDisplay(endDate) }}
                    </UButton>
                    <template #content>
                      <UCalendar
                        v-model="endDate"
                        :min-value="startDate as CalendarDate"
                      />
                    </template>
                  </UPopover>
                </UFormField>
              </div>

              <UFormField label="Location" name="location">
                <LocationSelect
                  v-model="state.location"
                  @coordinates="(coords) => { state.latitude = coords?.lat ?? null; state.longitude = coords?.lon ?? null }"
                />
              </UFormField>
            </div>
          </section>

          <!-- 2 · BRANDING -->
          <section
            id="branding"
            class="scroll-mt-28 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden"
          >
            <div class="px-4 sm:px-5 py-3.5 border-b border-gray-100 dark:border-white/[0.06]">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Branding</h2>
              <p class="text-xs text-gray-500 mt-0.5">Used on the fan page, social graphics, and widgets.</p>
            </div>
            <div class="p-4 sm:p-5 space-y-4">
              <!-- Logo -->
              <div>
                <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Logo</p>
                <input
                  ref="logoFileInput"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleLogoChange"
                />
                <div
                  v-if="logoPreview"
                  class="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03]"
                >
                  <div class="relative w-11 h-11 shrink-0">
                    <img
                      :src="logoPreview"
                      alt="Logo preview"
                      class="w-11 h-11 rounded-xl object-cover border border-gray-200 dark:border-white/10"
                    />
                    <div
                      v-if="uploadingLogo"
                      class="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center"
                    >
                      <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 text-white animate-spin" />
                    </div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-[13px] font-semibold text-gray-900 dark:text-white truncate">
                      {{ logoFile?.name || 'Current logo' }}
                    </p>
                    <p class="text-[11px] text-gray-500">Shown at 60px on the fan page header</p>
                  </div>
                  <UButton
                    type="button"
                    size="xs"
                    variant="ghost"
                    label="Replace"
                    :disabled="uploadingLogo"
                    @click="triggerLogoInput"
                  />
                  <UButton
                    type="button"
                    size="xs"
                    variant="ghost"
                    color="error"
                    icon="i-heroicons-trash"
                    :disabled="uploadingLogo"
                    @click="removeLogo"
                  />
                </div>
                <button
                  v-else
                  type="button"
                  class="w-full p-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-white/[0.12] hover:border-emerald-400 dark:hover:border-emerald-500/50 transition-colors text-center text-xs text-gray-500 dark:text-gray-400 group"
                  :disabled="uploadingLogo"
                  @click="triggerLogoInput"
                >
                  <UIcon name="i-heroicons-photo" class="w-6 h-6 mx-auto mb-1.5 text-gray-400 group-hover:text-emerald-500 transition-colors" />
                  Drop a logo, or click to upload
                  <span class="block text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Square image, at least 200×200</span>
                </button>
              </div>

              <!-- Banner -->
              <div>
                <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Banner</p>
                <input
                  ref="bannerFileInput"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleBannerChange"
                />
                <div
                  v-if="bannerPreview"
                  class="rounded-xl border border-gray-200 dark:border-white/[0.08] overflow-hidden"
                >
                  <div class="relative h-24">
                    <img
                      :src="bannerPreview"
                      alt="Banner preview"
                      class="w-full h-full object-cover object-top"
                    />
                    <div
                      v-if="uploadingBanner"
                      class="absolute inset-0 bg-black/50 flex items-center justify-center"
                    >
                      <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 text-white animate-spin" />
                    </div>
                  </div>
                  <div
                    class="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 dark:bg-white/[0.03]"
                  >
                    <p class="text-[11px] text-gray-500 truncate">
                      {{ bannerFile?.name || 'Current banner' }}
                    </p>
                    <div class="flex items-center gap-1 shrink-0">
                      <UButton
                        type="button"
                        size="xs"
                        variant="ghost"
                        label="Replace"
                        :disabled="uploadingBanner"
                        @click="triggerBannerInput"
                      />
                      <UButton
                        type="button"
                        size="xs"
                        variant="ghost"
                        color="error"
                        icon="i-heroicons-trash"
                        :disabled="uploadingBanner"
                        @click="removeBanner"
                      />
                    </div>
                  </div>
                </div>
                <button
                  v-else
                  type="button"
                  class="w-full p-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-white/[0.12] hover:border-emerald-400 dark:hover:border-emerald-500/50 transition-colors text-center text-xs text-gray-500 dark:text-gray-400 group"
                  :disabled="uploadingBanner"
                  @click="triggerBannerInput"
                >
                  <UIcon name="i-heroicons-photo" class="w-6 h-6 mx-auto mb-1.5 text-gray-400 group-hover:text-emerald-500 transition-colors" />
                  Drop a banner image, or click to upload
                  <span class="block text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">1600×400 recommended · blurred behind graphics</span>
                </button>
              </div>
            </div>
          </section>

          <!-- 3 · VISIBILITY & SHARING -->
          <section
            id="visibility"
            class="scroll-mt-28 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden"
          >
            <div class="px-4 sm:px-5 py-3.5 border-b border-gray-100 dark:border-white/[0.06]">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Visibility &amp; sharing</h2>
              <p class="text-xs text-gray-500 mt-0.5">Who can find the fan page, and where it lives.</p>
            </div>
            <div class="p-4 sm:p-5 space-y-3">
              <UFormField name="visibility">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    v-for="opt in visibilityOptions"
                    :key="opt.value"
                    type="button"
                    @click="state.visibility = opt.value"
                    class="p-3.5 rounded-xl border text-left transition-all"
                    :class="[
                      state.visibility === opt.value
                        ? 'border-emerald-500/60 bg-emerald-50 dark:bg-emerald-500/10 ring-1 ring-emerald-500/30'
                        : 'border-gray-200 dark:border-white/[0.08] hover:border-gray-300 dark:hover:border-white/[0.16]'
                    ]"
                  >
                    <div class="flex items-center gap-2 mb-1">
                      <UIcon
                        :name="opt.icon"
                        class="w-4 h-4 shrink-0"
                        :class="state.visibility === opt.value ? 'text-emerald-500' : 'text-gray-400'"
                      />
                      <p class="font-semibold text-[13px] text-gray-900 dark:text-white">{{ opt.label }}</p>
                    </div>
                    <p class="text-[11px] leading-snug text-gray-500">{{ opt.description }}</p>
                  </button>
                </div>
              </UFormField>

              <h3 class="pt-3 border-t border-gray-100 dark:border-white/[0.06] text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Fan page
              </h3>

              <div class="flex items-center gap-2 p-2.5 sm:p-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] flex-wrap">
                <span class="font-mono text-xs text-gray-600 dark:text-gray-300 flex-1 min-w-[160px] break-all">{{ fanPageDisplay }}</span>
                <div class="flex items-center gap-1 shrink-0">
                  <UButton type="button" size="xs" variant="ghost" icon="i-heroicons-clipboard" label="Copy link" @click="copyFanLink" />
                  <UButton type="button" size="xs" variant="ghost" icon="i-heroicons-qr-code" label="QR code" @click="emit('qr')" />
                  <UButton type="button" size="xs" variant="ghost" icon="i-heroicons-arrow-top-right-on-square" label="Open" :to="fanPageUrl" target="_blank" />
                </div>
              </div>

              <div class="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05]">
                <div class="flex-1 pr-3">
                  <p class="font-medium text-sm text-gray-900 dark:text-white">Pin tournament</p>
                  <p class="text-[11px] sm:text-xs text-gray-500 mt-0.5">Sorts first in your sidebar and tournament lists.</p>
                </div>
                <USwitch v-model="state.isPinned" />
              </div>

              <div class="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] flex-wrap">
                <div class="flex-1 min-w-0 pr-3">
                  <p class="font-medium text-sm text-gray-900 dark:text-white">Embeddable widgets</p>
                  <p class="text-[11px] sm:text-xs text-gray-500 mt-0.5">Standings, fixtures, and stats for your website or stream overlay.</p>
                </div>
                <UButton
                  type="button"
                  size="xs"
                  variant="ghost"
                  label="Configure widgets"
                  trailing-icon="i-heroicons-arrow-right"
                  :to="widgetsHref"
                />
              </div>
            </div>
          </section>

          <!-- 4 · FORMAT & RULES -->
          <section
            id="format"
            class="scroll-mt-28 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden"
          >
            <div class="px-4 sm:px-5 py-3.5 border-b border-gray-100 dark:border-white/[0.06]">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Format &amp; rules</h2>
              <p class="text-xs text-gray-500 mt-0.5">How the competition is structured and how points are awarded.</p>
            </div>
            <div class="p-4 sm:p-5 space-y-4 sm:space-y-5">
              <UAlert
                icon="i-heroicons-exclamation-triangle"
                color="warning"
                variant="subtle"
                title="Changing format may affect existing structure"
                description="If you have already generated fixtures or matches, changing the tournament type might lead to unexpected behavior."
              />

              <UFormField label="Tournament Format & Style" name="type" required>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  <button
                    v-for="preset in availablePresets"
                    :key="preset.id"
                    type="button"
                    @click="applyTournamentPreset(preset)"
                    class="p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between group"
                    :class="[
                      currentPresetId === preset.id
                        ? 'border-emerald-500/60 bg-emerald-50 dark:bg-emerald-500/10 ring-1 ring-emerald-500/30'
                        : 'border-gray-200 dark:border-white/[0.08] hover:border-gray-300 dark:hover:border-white/[0.16]'
                    ]"
                  >
                    <div>
                      <div class="flex items-start justify-between gap-1 mb-1">
                        <div class="flex items-center gap-1.5">
                          <UIcon :name="preset.icon" class="w-4 h-4 text-emerald-500 shrink-0" />
                          <span class="font-semibold text-[13px] text-gray-900 dark:text-white">{{ preset.label }}</span>
                        </div>
                        <UIcon
                          v-if="currentPresetId === preset.id"
                          name="i-heroicons-check-circle"
                          class="w-4 h-4 text-emerald-500 shrink-0"
                        />
                      </div>
                      <UBadge size="xs" variant="subtle" color="neutral" class="mb-1.5 text-[9.5px]">
                        {{ preset.tag }}
                      </UBadge>
                      <p class="text-[11px] leading-snug text-gray-500 mb-2">{{ preset.description }}</p>
                    </div>
                    <div class="pt-1.5 border-t border-gray-100 dark:border-white/[0.05] text-[10px] text-gray-400 dark:text-gray-500 truncate">
                      {{ preset.summary }}
                    </div>
                  </button>
                </div>
              </UFormField>

              <!-- Format Flow Preview -->
              <div class="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div class="flex items-center gap-2 shrink-0">
                  <UIcon :name="currentPreset.icon" class="w-4 h-4 text-emerald-500 shrink-0" />
                  <span class="text-xs font-semibold text-gray-900 dark:text-white">{{ currentPreset.label }} Flow:</span>
                </div>
                <div class="flex items-center gap-1.5 text-[11px] overflow-x-auto py-0.5">
                  <template v-for="(step, idx) in currentPreset.flowSteps" :key="step">
                    <span class="px-2 py-0.5 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium shadow-xs whitespace-nowrap border border-black/5 dark:border-white/5">
                      {{ step }}
                    </span>
                    <UIcon v-if="idx < currentPreset.flowSteps.length - 1" name="i-heroicons-chevron-right" class="w-3 h-3 text-gray-400 shrink-0" />
                  </template>
                </div>
              </div>

              <UFormField label="Participant Type" name="participantType" required>
                <div class="flex gap-2.5">
                  <button
                    v-for="opt in participantTypes"
                    :key="opt.value"
                    type="button"
                    @click="state.participantType = opt.value"
                    class="flex-1 p-3.5 rounded-xl border flex items-center gap-2.5 transition-all"
                    :class="[
                      state.participantType === opt.value
                        ? 'border-emerald-500/60 bg-emerald-50 dark:bg-emerald-500/10 ring-1 ring-emerald-500/30'
                        : 'border-gray-200 dark:border-white/[0.08] hover:border-gray-300 dark:hover:border-white/[0.16]'
                    ]"
                  >
                    <UIcon
                      :name="opt.icon"
                      class="w-4 h-4 shrink-0"
                      :class="state.participantType === opt.value ? 'text-emerald-500' : 'text-gray-400'"
                    />
                    <span class="font-semibold text-[13px] text-gray-900 dark:text-white">{{ opt.label }}</span>
                  </button>
                </div>
              </UFormField>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <UFormField label="Max Participants" name="maxParticipants" required>
                  <UInput
                    v-model.number="state.maxParticipants"
                    type="number"
                    placeholder="e.g. 16"
                    :min="2"
                    class="w-full"
                    size="sm"
                  />
                </UFormField>

                <div v-if="structureChips.length">
                  <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Current structure</p>
                  <div class="flex flex-wrap gap-1.5 pt-0.5">
                    <span
                      v-for="chip in structureChips"
                      :key="chip.label"
                      class="px-2.5 py-1 rounded-full text-[11px] font-semibold border"
                      :class="chip.cls"
                    >{{ chip.label }}</span>
                  </div>
                  <p class="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">Set by the fixture wizards so fixtures, groups, and standings stay consistent.</p>
                </div>
              </div>

              <!-- Scoring rules (table formats only) -->
              <div v-if="isTableFormat" class="space-y-3 pt-4 border-t border-gray-100 dark:border-white/[0.06]">
                <h3 class="font-semibold text-[13px] text-gray-900 dark:text-white">Scoring rules</h3>
                <div class="flex items-end gap-3 flex-wrap">
                  <div class="w-20">
                    <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Win</p>
                    <UInput v-model.number="pointsWin" type="number" min="0" size="sm" class="w-full text-center font-mono font-bold" />
                  </div>
                  <div class="w-20">
                    <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Draw</p>
                    <UInput v-model.number="pointsDraw" type="number" min="0" size="sm" class="w-full text-center font-mono font-bold" />
                  </div>
                  <div class="w-20">
                    <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Loss</p>
                    <UInput v-model.number="pointsLoss" type="number" min="0" size="sm" class="w-full text-center font-mono font-bold" />
                  </div>
                  <span class="font-mono text-xs text-gray-400 dark:text-gray-500 pb-2">{{ pointsPreview }}</span>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="(p, i) in pointsPresets"
                    :key="p.label"
                    type="button"
                    class="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                    :class="activePreset === i
                      ? 'border-emerald-500/60 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'border-gray-200 dark:border-white/[0.08] text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/[0.16]'"
                    @click="applyPreset(p)"
                  >{{ p.label }}</button>
                  <span
                    v-if="activePreset === -1"
                    class="px-3 py-1.5 rounded-full text-xs font-semibold border border-emerald-500/60 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  >Custom</span>
                </div>
                <p class="text-[11px] text-gray-400 dark:text-gray-500">Changing points does not rewrite history — recalculate standings to apply.</p>
              </div>

              <template v-if="state.type === TournamentType.KNOCKOUT || state.type === TournamentType.HYBRID">
                <div class="space-y-3 pt-4 border-t border-gray-100 dark:border-white/[0.06]">
                  <h3 class="font-semibold text-[13px] text-gray-900 dark:text-white">Knockout Options</h3>

                  <div v-if="creationOption('twoLegs')" class="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05]">
                    <div class="flex-1 pr-3">
                      <p class="font-medium text-sm text-gray-900 dark:text-white">Two-Legged Ties</p>
                      <p class="text-[11px] sm:text-xs text-gray-500 mt-0.5">Knockout rounds (except Final) will have Home and Away legs</p>
                    </div>
                    <USwitch v-model="state.twoLegsKnockout" />
                  </div>

                  <div v-if="creationOption('thirdPlaceMatch')" class="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05]">
                    <div class="flex-1 pr-3">
                      <p class="font-medium text-sm text-gray-900 dark:text-white">Third-Place Match</p>
                      <p class="text-[11px] sm:text-xs text-gray-500 mt-0.5">Generate a playoff match for semi-final losers</p>
                    </div>
                    <USwitch v-model="state.thirdPlaceMatch" />
                  </div>
                </div>
              </template>

              <template v-if="isTableFormat">
                <div class="space-y-3 pt-4 border-t border-gray-100 dark:border-white/[0.06]">
                  <h3 class="font-semibold text-[13px] text-gray-900 dark:text-white">Round Robin / Group Options</h3>

                  <div v-if="creationOption('doubleRoundRobin')" class="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05]">
                    <div class="flex-1 pr-3">
                      <p class="font-medium text-sm text-gray-900 dark:text-white">Double Round Robin</p>
                      <p class="text-[11px] sm:text-xs text-gray-500 mt-0.5">Teams will play each other twice (Home and Away)</p>
                    </div>
                    <USwitch v-model="state.doubleRoundRobin" />
                  </div>

                  <div v-if="[TournamentType.GROUP, TournamentType.HYBRID].includes(state.type as any)" class="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05]">
                    <div class="flex-1 pr-3">
                      <div class="flex items-center gap-1.5">
                        <p class="font-medium text-sm text-gray-900 dark:text-white">Unified League Table</p>
                        <UBadge size="xs" color="primary" variant="subtle">Champions League</UBadge>
                      </div>
                      <p class="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                        {{ state.unifiedStandings ? 'All teams share a single unified table (teams seeded in pots decide fixtures)' : 'Each group has its own separate table (traditional World Cup style)' }}
                      </p>
                    </div>
                    <USwitch v-model="state.unifiedStandings" />
                  </div>

                  <div v-if="[TournamentType.GROUP, TournamentType.HYBRID].includes(state.type as any) && state.unifiedStandings" class="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05]">
                    <div class="flex-1 pr-3">
                      <div class="flex items-center gap-1.5">
                        <p class="font-medium text-sm text-gray-900 dark:text-white">Knockout Play-off Round</p>
                        <UBadge size="xs" color="primary" variant="subtle">UEFA Format</UBadge>
                      </div>
                      <p class="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                        {{ state.hasKnockoutPlayoffs ? 'Seeds 1–8 get a bye directly to Round of 16; middle seeds (9–24) compete in a knockout play-off round.' : 'Straight seeded bracket without play-offs (e.g. 1 vs 16, 2 vs 15).' }}
                      </p>
                    </div>
                    <USwitch v-model="state.hasKnockoutPlayoffs" />
                  </div>
                </div>
              </template>

              <!-- Set scoring (only for set-based sport engines like tennis) -->
              <div v-if="engineSetScoring" class="space-y-3 pt-4 border-t border-gray-100 dark:border-white/[0.06]">
                <div class="flex items-center justify-between gap-3">
                  <h3 class="font-semibold text-[13px] text-gray-900 dark:text-white">Set scoring</h3>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-500 dark:text-indigo-300 border border-indigo-500/25">Set-based sports</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <UFormField
                    label="Match format"
                    name="setsToWin"
                    description="Best-of series length — must be odd (e.g. 3, 5, 7)"
                    :error="bestOfError || undefined"
                  >
                    <UInput
                      v-model.number="bestOfModel"
                      type="number"
                      :min="1"
                      :max="15"
                      :step="2"
                      placeholder="e.g. 3"
                      class="w-full"
                    />
                  </UFormField>

                  <UFormField label="Games per set" name="gamesPerSet" description="Points/games needed to win a set (6 for tennis, 11 for table tennis, 25 for volleyball)">
                    <UInput
                      v-model.number="state.gamesPerSet"
                      type="number"
                      :min="1"
                      :max="50"
                      class="w-full"
                    />
                  </UFormField>
                </div>
              </div>

              <!-- Score predictions (football tournaments) -->
              <div v-if="isFootballSport" class="space-y-3 pt-4 border-t border-gray-100 dark:border-white/[0.06]">
                <div class="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05]">
                  <div class="flex-1 pr-3">
                    <div class="flex items-center gap-1.5">
                      <p class="font-medium text-sm text-gray-900 dark:text-white">Fan Score Predictions</p>
                      <UBadge size="xs" color="primary" variant="subtle">Interactive</UBadge>
                    </div>
                    <p class="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                      Allow fans to predict scores before kickoff, earn points, and climb the tournament leaderboard.
                    </p>
                  </div>
                  <USwitch v-model="predictionEnabled" />
                </div>

                <div v-if="predictionEnabled" class="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Points for Exact Score</p>
                      <UInput
                        v-model.number="predictionExactScorePoints"
                        type="number"
                        min="1"
                        max="20"
                        size="sm"
                        class="w-full font-mono font-bold"
                      />
                      <span class="text-[10px] text-gray-400 mt-1 block">
                        Awarded when home and away scores match exactly (e.g. 2-1)
                      </span>
                    </div>

                    <div>
                      <p class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Points for Correct Outcome</p>
                      <UInput
                        v-model.number="predictionCorrectResultPoints"
                        type="number"
                        min="0"
                        max="10"
                        size="sm"
                        class="w-full font-mono font-bold"
                      />
                      <span class="text-[10px] text-gray-400 mt-1 block">
                        Awarded when the predicted winner or draw is correct
                      </span>
                    </div>
                  </div>

                  <div class="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium pt-1 border-t border-emerald-500/15">
                    → Fans predict 2-1: Final score 2-1 gets <strong>{{ predictionExactScorePoints }} pts</strong>. Final score 1-0 gets <strong>{{ predictionCorrectResultPoints }} pts</strong>.
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- 5 · REGISTRATION -->
          <section
            id="registration"
            class="scroll-mt-28 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden"
          >
            <div class="px-4 sm:px-5 py-3.5 border-b border-gray-100 dark:border-white/[0.06]">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Registration</h2>
              <p class="text-xs text-gray-500 mt-0.5">Who can join, when, and at what price.</p>
            </div>
            <div class="p-4 sm:p-5 space-y-3">
              <h3 class="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Registration window
              </h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <UFormField label="Opens" name="registrationOpen">
                  <UInput v-model="state.registrationOpen" type="datetime-local" class="w-full" size="sm" />
                </UFormField>
                <UFormField label="Closes" name="registrationClose">
                  <UInput v-model="state.registrationClose" type="datetime-local" class="w-full" size="sm" />
                </UFormField>
              </div>
              <div class="flex items-center gap-2 flex-wrap">
                <span
                  v-if="regWindowChip"
                  class="px-2.5 py-1 rounded-full text-[11px] font-semibold border"
                  :class="regWindowChip.cls"
                >{{ regWindowChip.label }}</span>
                <p class="text-[11px] text-gray-400 dark:text-gray-500">Leave dates blank to stay open indefinitely.</p>
              </div>

              <div class="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05]">
                <div class="flex-1 pr-3">
                  <p class="font-medium text-sm text-gray-900 dark:text-white">Auto-approve Join Requests</p>
                  <p class="text-[11px] sm:text-xs text-gray-500 mt-0.5">When enabled, players joining via invite link are added immediately. When disabled, you must manually approve each request.</p>
                </div>
                <USwitch v-model="state.autoApprove" />
              </div>

              <div class="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05]">
                <div class="flex-1 pr-3">
                  <p class="font-medium text-sm text-gray-900 dark:text-white">Paid Registration</p>
                  <p class="text-[11px] sm:text-xs text-gray-500 mt-0.5">Require teams to pay a registration fee to join.</p>
                </div>
                <USwitch v-model="state.isPaidRegistration" />
              </div>

              <div v-if="state.isPaidRegistration" class="p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] space-y-3 sm:space-y-4 animate-in fade-in duration-200">
                <div
                  v-if="payoutAccount && !payoutAccount.hasPayoutAccount"
                  class="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-500/30"
                >
                  <UIcon name="i-heroicons-exclamation-triangle" class="w-4.5 h-4.5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div class="flex-1 text-xs sm:text-sm text-amber-700 dark:text-amber-400">
                    <span class="font-semibold">Payout account required.</span>
                    Connect a bank account to receive registration fees directly before teams can pay.
                    <div class="mt-2">
                      <UButton
                        type="button"
                        size="xs"
                        color="warning"
                        icon="i-heroicons-banknotes"
                        label="Set Up Payout Account"
                        @click="showPayoutModal = true;"
                      />
                    </div>
                  </div>
                </div>
                <div
                  v-else-if="payoutAccount?.hasPayoutAccount"
                  class="flex items-center gap-2.5 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-xs sm:text-sm"
                >
                  <UIcon name="i-heroicons-check-circle" class="w-4.5 h-4.5 flex-shrink-0" />
                  <span>
                    <span class="font-semibold">Payout account connected</span>
                    <template v-if="payoutAccount.bankName">
                      · {{ payoutAccount.bankName }}<template v-if="payoutAccount.accountNumberMasked"> {{ payoutAccount.accountNumberMasked }}</template>
                    </template>
                  </span>
                </div>
                <UFormField label="Registration Fee (₦)" name="registrationFee" required>
                  <UInput
                    v-model.number="state.registrationFee"
                    type="number"
                    placeholder="e.g. 5000"
                    min="0"
                    class="w-full"
                    size="sm"
                    icon="i-heroicons-banknotes"
                  />
                </UFormField>
              </div>

              <!-- Discount & Waiver Codes -->
              <div v-if="state.isPaidRegistration" class="p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] space-y-3">
                <div class="flex items-center justify-between gap-3">
                  <div class="flex-1 pr-3">
                    <p class="font-medium text-sm text-gray-900 dark:text-white">Discount & Waiver Codes</p>
                    <p class="text-[11px] sm:text-xs text-gray-500 mt-0.5">Give selected teams a discount or free registration. Teams enter the code on the join page.</p>
                  </div>
                  <UButton
                    type="button"
                    size="xs"
                    icon="i-heroicons-plus"
                    label="New Code"
                    color="primary"
                    @click="openDiscountModal"
                  />
                </div>

                <div v-if="loadingDiscountCodes" class="flex items-center gap-2 py-2 text-xs text-gray-400">
                  <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
                  Loading codes...
                </div>
                <p v-else-if="discountCodes.length === 0" class="text-xs text-gray-400 py-1">No codes yet.</p>
                <div v-else class="divide-y divide-gray-100 dark:divide-white/[0.06]">
                  <div
                    v-for="c in discountCodes"
                    :key="c.id"
                    class="py-2.5 flex items-center justify-between gap-3"
                  >
                    <div class="min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="font-mono font-bold text-sm text-gray-900 dark:text-white">{{ c.code }}</span>
                        <UBadge color="primary" variant="subtle" size="xs">{{ discountLabel(c) }}</UBadge>
                      </div>
                      <p class="text-[11px] text-gray-400 mt-0.5">
                        Used {{ c.usedCount }}{{ c.maxUses ? ` / ${c.maxUses}` : '' }}
                        <template v-if="c.expiresAt">· expires {{ new Date(c.expiresAt).toLocaleDateString() }}</template>
                      </p>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                      <USwitch
                        :model-value="c.isActive"
                        size="sm"
                        @update:model-value="toggleDiscountActive(c)"
                      />
                      <UButton
                        type="button"
                        size="xs"
                        variant="ghost"
                        color="error"
                        icon="i-heroicons-trash"
                        :loading="deletingDiscountId === c.id"
                        @click="handleDeleteDiscount(c)"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div class="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] flex-wrap">
                <div class="flex-1 min-w-0 pr-3">
                  <p class="font-medium text-sm text-gray-900 dark:text-white">Invite links</p>
                  <p class="text-[11px] sm:text-xs text-gray-500 mt-0.5">Shareable links with usage limits and expiry — managed per team from Participants.</p>
                </div>
                <UButton
                  type="button"
                  size="xs"
                  variant="ghost"
                  label="Open Participants"
                  trailing-icon="i-heroicons-arrow-right"
                  @click="emit('open-tab', 'participants')"
                />
              </div>
            </div>
          </section>

          <!-- 6 · SEASON & OWNERSHIP (injected by parent page) -->
          <slot name="ownership" />

          <!-- 7 · DANGER ZONE (injected by parent page) -->
          <slot name="danger" />

          <!-- STICKY SAVE BAR (appears when there are unsaved changes) -->
          <div
            v-if="isDirty"
            class="sticky bottom-4 z-20 flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-white/[0.12] bg-white/95 dark:bg-[#0e0e0e]/90 backdrop-blur-md shadow-xl shadow-black/5 dark:shadow-black/50"
          >
            <span class="relative flex w-2 h-2 shrink-0">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
            </span>
            <p class="text-[13px] font-semibold text-gray-900 dark:text-white">
              {{ dirtyCount }} unsaved {{ dirtyCount === 1 ? 'change' : 'changes' }}
              <span class="font-normal text-gray-500 hidden sm:inline">· one save covers the whole tab</span>
            </p>
            <span class="flex-1"></span>
            <UButton
              type="button"
              variant="ghost"
              color="neutral"
              size="sm"
              label="Discard"
              :disabled="loading"
              @click="discardChanges"
            />
            <UButton
              type="submit"
              label="Save changes"
              icon="i-heroicons-check"
              color="primary"
              size="sm"
              :loading="loading"
            />
          </div>
        </div>
      </div>
    </UForm>

    <!-- Payout Account Setup Modal -->
    <PayoutSetupModal
      v-model:open="showPayoutModal"
      :org-id="tournament.organization_id"
      @saved="onPayoutSaved"
    />

    <!-- Create Discount Code Modal -->
    <UModal v-model:open="showDiscountModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-4">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <UIcon name="i-heroicons-ticket" class="w-5 h-5 text-emerald-500" />
                </div>
                <div class="min-w-0">
                  <h3 class="text-lg font-bold text-gray-900 dark:text-white">New Discount Code</h3>
                  <p class="text-xs text-gray-500 truncate">For {{ tournament.name }} · fee ₦{{ ((state.registrationFee ?? 0)).toLocaleString() }}</p>
                </div>
              </div>
              <UButton icon="i-heroicons-x-mark" variant="ghost" color="neutral" size="sm" class="shrink-0" @click="showDiscountModal = false" />
            </div>
          </template>

          <div class="space-y-4">
            <UFormField label="Code" required>
              <UInput
                v-model="discountForm.code"
                placeholder="e.g. HOST26"
                class="w-full uppercase"
                maxlength="32"
              />
            </UFormField>

            <UFormField label="Discount type" required>
              <USelect
                v-model="discountForm.type"
                :items="[
                  { label: 'Percent off', value: 'PERCENT' },
                  { label: 'Fixed amount off (₦)', value: 'FIXED' },
                  { label: 'Full waiver (free registration)', value: 'WAIVER' },
                ]"
                value-key="value"
                class="w-full"
              />
            </UFormField>

            <UFormField
              v-if="discountForm.type === 'PERCENT'"
              label="Percent off (1–100)"
              :error="discountValueError || undefined"
              required
            >
              <UInput
                v-model.number="discountForm.value"
                type="number"
                min="1"
                max="100"
                placeholder="e.g. 25"
                class="w-full"
              />
            </UFormField>

            <UFormField
              v-else-if="discountForm.type === 'FIXED'"
              label="Amount off (₦)"
              :error="discountValueError || undefined"
              required
            >
              <UInput
                v-model.number="discountForm.value"
                type="number"
                min="1"
                placeholder="e.g. 2000"
                class="w-full"
              />
            </UFormField>

            <div class="grid grid-cols-2 gap-3">
              <UFormField label="Max uses (optional)">
                <UInput
                  v-model.number="discountForm.maxUses"
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  class="w-full"
                />
              </UFormField>
              <UFormField label="Expires on (optional)">
                <UInput
                  v-model="discountForm.expiresAt"
                  type="date"
                  class="w-full"
                />
              </UFormField>
            </div>

            <!-- Inline error -->
            <div
              v-if="discountError"
              class="flex items-start gap-2.5 p-3 rounded-xl text-xs bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400"
            >
              <UIcon name="i-heroicons-exclamation-circle" class="w-4 h-4 shrink-0 mt-0.5" />
              <span>{{ discountError }}</span>
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton variant="ghost" color="neutral" label="Cancel" @click="showDiscountModal = false" />
              <UButton
                color="primary"
                icon="i-heroicons-check"
                label="Create Code"
                :loading="savingDiscount"
                :disabled="discountFormInvalid"
                @click="handleCreateDiscount"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
