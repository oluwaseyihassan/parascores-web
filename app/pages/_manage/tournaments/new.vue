<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { TournamentType, ParticipantType, Visibility, type Tournament } from '~/types'
import { CalendarDate, type DateValue } from '@internationalized/date'
import { listEngines, resolveEngine } from '~/engines/registry'
import type { PayoutAccountStatus } from '~/stores/payment'

definePageMeta({
  middleware: ['require-organizer'],
  layout: 'dashboard'
})

useSeoMeta({ title: 'New Tournament — ParaScores' })

const tournamentStore = useTournamentStore()
const authStore = useAuthStore()
const paymentStore = usePaymentStore()
const router = useRouter()
const { handleError } = useErrors()

const payoutAccount = ref<PayoutAccountStatus | null>(null)
const showPayoutModal = ref(false)

function onPayoutSaved(status: PayoutAccountStatus | null) {
  payoutAccount.value = status
  showPayoutModal.value = false
}

const STORAGE_KEY = 'parascores_tournament_draft'

const isDirty = computed(() => {
  return state.name !== '' || state.sport !== '' || logoFile.value !== null || bannerFile.value !== null
})

onBeforeRouteLeave((to, from, next) => {
  if (isDirty.value && !loading.value) {
    const answer = window.confirm('You have unsaved changes. Do you really want to leave?')
    if (answer) next()
    else next(false)
  } else {
    next()
  }
})

const loading = ref(false)
const toast = useToast()
const error = ref<string | null>(null)

const setError = (msg: string | null) => {
  error.value = msg
  if (msg) {
    toast.add({
      title: 'Action Required',
      description: msg,
      color: 'error',
      icon: 'i-heroicons-exclamation-circle'
    })
  }
}

// Wizard state
const currentStep = ref(1)
const steps = [
  { step: 1, title: 'Identity', description: 'Name, sport & branding', icon: 'i-heroicons-identification' },
  { step: 2, title: 'Structure', description: 'Format & participants', icon: 'i-heroicons-trophy' },
  { step: 3, title: 'Logistics', description: 'Dates & visibility', icon: 'i-heroicons-calendar' },
  { step: 4, title: 'Review', description: 'Final check', icon: 'i-heroicons-check-badge' }
]

// Review-step edit links jump back to the owning step
const jumpTo = (step: number) => {
  currentStep.value = step
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const nextStepLabel = computed(() => {
  if (currentStep.value >= steps.length) return 'Create tournament'
  return `Next: ${steps[currentStep.value]?.title}`
})

watch(currentStep, () => {
  error.value = null
})

const nextStep = async () => {
  if (currentStep.value < steps.length) {
    // Basic validation for Step 1
    if (currentStep.value === 1) {
      if (!state.name || state.name.length < 3) {
        setError('Tournament name is required (min 3 characters)')
        return
      }
      if (!state.sport) {
        setError('Please select a sport')
        return
      }
      if (state.customName && nameAvailable.value === false) {
        setError('Custom URL is already taken')
        return
      }
    }

    // Basic validation for Step 2
    if (currentStep.value === 2) {
      if (state.maxParticipants === undefined || state.maxParticipants === null || state.maxParticipants as any === '') {
        setError('Max participants is required')
        return
      }
      if (typeof state.maxParticipants === 'number' && state.maxParticipants < 2) {
        setError('Must have at least 2 participants')
        return
      }
    }

    // Basic validation for Step 3
    if (currentStep.value === 3) {
      if (!state.start_date) {
        setError('Start date is required')
        return
      }
      if (!state.end_date) {
        setError('End date is required')
        return
      }
      if (!state.organization_id) {
        setError('Organization selection is required')
        return
      }
      if (state.isPaidRegistration && (state.registrationFee === null || state.registrationFee === undefined || state.registrationFee as any === '')) {
        setError('Registration fee is required')
        return
      }
      if (state.isPaidRegistration && typeof state.registrationFee === 'number' && state.registrationFee < 0) {
        setError('Registration fee must be positive')
        return
      }
    }

    currentStep.value++
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const logoFileInput = ref<HTMLInputElement | null>(null)
const logoFile = ref<File | null>(null)
const uploadingLogo = ref(false)

const triggerLogoInput = () => {
  logoFileInput.value?.click()
}

const handleLogoChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // Validate file
  if (!file.type.startsWith('image/')) {
    setError('Please select an image file')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    setError('Image must be less than 5MB')
    return
  }

  logoFile.value = file

  // Immediate upload
  uploadingLogo.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)

    const uploadResponse = await $api<{success: boolean, data: { url: string, publicId: string }, message: string}>('/upload/image?folder=tournaments', {
      method: 'POST',
      body: formData
    })

    if (uploadResponse.data?.url) {
      state.logoUrl = uploadResponse.data.url
    }
  } catch (err: any) {
    handleError(err, { title: 'Logo Upload Failed' })
  } finally {
    uploadingLogo.value = false
  }
}

const removeLogo = () => {
  logoFile.value = null
  state.logoUrl = ''
  if (logoFileInput.value) {
    logoFileInput.value.value = ''
  }
}

const bannerFileInput = ref<HTMLInputElement | null>(null)
const bannerFile = ref<File | null>(null)
const uploadingBanner = ref(false)

const triggerBannerInput = () => {
  bannerFileInput.value?.click()
}

const handleBannerChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // Validate file
  if (!file.type.startsWith('image/')) {
    setError('Please select an image file')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    setError('Image must be less than 5MB')
    return
  }

  bannerFile.value = file

  // Immediate upload
  uploadingBanner.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)

    const uploadResponse = await $api<{success: boolean, data: { url: string, publicId: string }, message: string}>('/upload/image?folder=tournaments', {
      method: 'POST',
      body: formData
    })

    if (uploadResponse.data?.url) {
      state.bannerUrl = uploadResponse.data.url
    }
  } catch (err: any) {
    handleError(err, { title: 'Banner Upload Failed' })
  } finally {
    uploadingBanner.value = false
  }
}

const removeBanner = () => {
  bannerFile.value = null
  state.bannerUrl = ''
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

// Date values for calendar (using shallowRef to preserve class instance types)
const startDate = shallowRef<DateValue | null>(null)
const endDate = shallowRef<DateValue | null>(null)


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

// Short date for the review stat chips
const formatDateShort = (date: DateValue | null) => {
  if (!date) return '—'
  return new Date(date.year, date.month - 1, date.day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

// Convert DateValue to ISO string for API
const dateToISOString = (date: DateValue | null): string => {
  if (!date) return ''
  // Create a date at midnight UTC and return full ISO string
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).toISOString()
}

// Watch date changes and update state
watch(startDate, (val) => {
  state.start_date = dateToISOString(val)

  // UX Improvement: If new Start Date is after current End Date, clear End Date
  if (val && endDate.value && val.compare(endDate.value) > 0) {
    endDate.value = null
  }
})

watch(endDate, (val) => {
  state.end_date = dateToISOString(val)
})

// Form schema
const schema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  customName: z.string()
    .min(3, 'Custom URL must be at least 3 characters')
    .max(60, 'Custom URL must be at most 60 characters')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Only lowercase letters, numbers, and hyphens allowed (e.g. my-tournament-2026)')
    .optional()
    .or(z.literal('')),
  description: z.string().optional(),
  sport: z.string().min(1, 'Sport is required'),
  type: z.nativeEnum(TournamentType),
  participantType: z.nativeEnum(ParticipantType),
  visibility: z.nativeEnum(Visibility),
  location: z.string().optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  timezone: z.string().min(1, 'Timezone is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  maxParticipants: z.number({ required_error: 'Max participants is required' }).int().min(2, 'Must have at least 2 participants'),
  autoApprove: z.boolean(),
  twoLegsKnockout: z.boolean().optional(),
  doubleRoundRobin: z.boolean().optional(),
  thirdPlaceMatch: z.boolean().optional(),
  organization_id: z.string().min(1, 'Organization is required'),
  logoUrl: z.string().optional(),
  bannerUrl: z.string().optional(),
  isPaidRegistration: z.boolean().optional(),
  registrationFee: z.number().min(0, 'Registration fee must be positive').optional().nullable()
})

type Schema = z.output<typeof schema>

// Form state
const state = reactive<Partial<Schema>>({
  name: '',
  customName: '',
  description: '',
  sport: '',
  type: TournamentType.ROUND_ROBIN,
  participantType: ParticipantType.TEAM,
  visibility: Visibility.PUBLIC,
  location: '',
  latitude: null,
  longitude: null,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  start_date: '',
  end_date: '',
  maxParticipants: undefined,
  autoApprove: false,
  twoLegsKnockout: false,
  doubleRoundRobin: false,
  thirdPlaceMatch: false,
  organization_id: authStore.currentOrganization?.id || '',
  logoUrl: '',
  bannerUrl: '',
  isPaidRegistration: false,
  registrationFee: null
})

const lastAutoGeneratedSlug = ref('')

// ─── AI draft (Paragee) — plain language → prefilled wizard ─────────────
const aiPrompt = ref('')
const aiDrafting = ref(false)
const aiFailed = ref(false)
const aiFields = ref<string[]>([]) // server-validated keys that were prefilled
const aiSummary = ref<string | null>(null) // prompt text once drafted (card collapses)
let preDraftSnapshot: { state: Record<string, any>; startDate: DateValue | null; endDate: DateValue | null } | null = null

const aiDraftCount = computed(() => aiFields.value.length)

async function draftWithAi() {
  const prompt = aiPrompt.value.trim()
  if (aiDrafting.value || prompt.length < 10) return
  aiDrafting.value = true
  aiFailed.value = false
  try {
    const res = await $api<{ data: { draft: Record<string, any>; fields: string[] } }>('/ai/tournament-draft', {
      method: 'POST',
      body: { organizationId: state.organization_id, prompt, timezone: state.timezone },
    })
    const { draft, fields } = res.data
    if (!fields.length) { aiFailed.value = true; return }
    preDraftSnapshot = { state: { ...state }, startDate: startDate.value, endDate: endDate.value }
    applyAiDraft(draft)
    aiFields.value = fields
    aiSummary.value = prompt
    toast.add({ title: 'Draft ready', description: `${fields.length} fields prefilled — review each step before creating`, color: 'success', icon: 'i-heroicons-sparkles' })
  } catch {
    aiFailed.value = true // form untouched — banner offers retry
  } finally {
    aiDrafting.value = false
  }
}

function applyAiDraft(d: Record<string, any>) {
  if (d.name) state.name = d.name // slug watcher fills customName + availability check fires
  if (d.description) state.description = d.description
  if (d.sport) {
    // map free text onto an engine label (FIFA/eFootball → Esports extra)
    const q = String(d.sport).toLowerCase().replace(/[^a-z0-9]/g, '')
    const engine = engineSports.find((e) => e.key === q || e.label.toLowerCase().replace(/[^a-z0-9]/g, '') === q)
    if (engine) state.sport = engine.label
    else if (/fifa|efootball|esport|pes|cod|valorant|rocketleague/.test(q)) state.sport = 'Esports'
    else if (extraSports.some((s) => s.toLowerCase() === String(d.sport).toLowerCase())) state.sport = extraSports.find((s) => s.toLowerCase() === String(d.sport).toLowerCase())!
  }
  if (d.type) state.type = d.type
  if (d.participantType) state.participantType = d.participantType
  if (d.visibility) state.visibility = d.visibility
  if (d.location) state.location = d.location
  if (d.startDate) { const [y, m, day] = d.startDate.split('-').map(Number); startDate.value = new CalendarDate(y, m, day) }
  if (d.endDate) { const [y, m, day] = d.endDate.split('-').map(Number); endDate.value = new CalendarDate(y, m, day) }
  if (d.maxParticipants) state.maxParticipants = d.maxParticipants
  if (d.twoLegsKnockout !== undefined) state.twoLegsKnockout = d.twoLegsKnockout
  if (d.doubleRoundRobin !== undefined) state.doubleRoundRobin = d.doubleRoundRobin
  if (d.thirdPlaceMatch !== undefined) state.thirdPlaceMatch = d.thirdPlaceMatch
  if (d.isPaidRegistration !== undefined) state.isPaidRegistration = d.isPaidRegistration
  if (d.registrationFee != null) state.registrationFee = d.registrationFee
}

function discardAiDraft() {
  if (preDraftSnapshot) {
    const { state: s, startDate: sd, endDate: ed } = preDraftSnapshot
    Object.assign(state, s)
    startDate.value = sd
    endDate.value = ed
  }
  aiFields.value = []
  aiSummary.value = null
  aiFailed.value = false
}

function editAiPrompt() {
  aiSummary.value = null // textarea returns with the prompt still in it
}


const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

watch(() => state.name, (newName) => {
  const slug = slugify(newName || '')
  if (!state.customName || state.customName === lastAutoGeneratedSlug.value) {
    state.customName = slug
    lastAutoGeneratedSlug.value = slug
  }
})

// Watch for custom name changes (must be after state declaration)
watch(() => state.customName, (val) => {
  // Reset state
  nameAvailable.value = null
  nameCheckError.value = null

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
      // Only update if the value hasn't changed while we were fetching
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
})

// Persistence logic
onMounted(async () => {
  const orgId = authStore.currentOrganization?.id
  if (orgId) {
    try {
      payoutAccount.value = await paymentStore.fetchPayoutAccount(orgId)
    } catch {
      // Silent fail — warning banner stays hidden
    }
  }

  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const data = JSON.parse(saved)
      if (data.state) {
        Object.assign(state, data.state)

        // Reconstruct date objects for the calendar
        if (state.start_date) {
          const d = new Date(state.start_date)
          startDate.value = new CalendarDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
        }
        if (state.end_date) {
          const d = new Date(state.end_date)
          endDate.value = new CalendarDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
        }

        if (state.customName && state.name && state.customName === slugify(state.name)) {
          lastAutoGeneratedSlug.value = state.customName
        }
      }
      if (data.currentStep) {
        currentStep.value = data.currentStep
      }
    } catch (e) {
      console.error('Failed to restore tournament draft', e)
    }
  }
})

// Auto-save on changes
watch([state, currentStep], () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    state,
    currentStep: currentStep.value
  }))
}, { deep: true })

// Options
const tournamentTypes = [
  { label: 'Knockout', value: TournamentType.KNOCKOUT, description: 'Single elimination bracket' },
  { label: 'League', value: TournamentType.LEAGUE, description: 'Classic league format with a table' },
  { label: 'Round Robin', value: TournamentType.ROUND_ROBIN, description: 'Everyone plays everyone' },
  { label: 'Group Stage', value: TournamentType.GROUP, description: 'Multiple groups without knockout' },
  { label: 'Hybrid (Group + Knockout)', value: TournamentType.HYBRID, description: 'Groups then knockout bracket' },
  { label: 'Friendly / Single Match', value: TournamentType.FRIENDLY, description: 'Single matches, friendly games' },
  { label: 'Race / Event Final', value: TournamentType.RACE, description: 'One race or event — all participants ranked by result (athletics, swimming)' }
]

const participantTypes = [
  { label: 'Teams', value: ParticipantType.TEAM, icon: 'i-heroicons-user-group' },
  { label: 'Individuals', value: ParticipantType.INDIVIDUAL, icon: 'i-heroicons-user' }
]

const visibilityOptions = [
  { label: 'Public', value: Visibility.PUBLIC, description: 'Anyone can view', icon: 'i-heroicons-globe-alt' },
  { label: 'Unlisted', value: Visibility.UNLISTED, description: 'Only with link', icon: 'i-heroicons-eye-slash' },
  { label: 'Private', value: Visibility.PRIVATE, description: 'Invite only', icon: 'i-heroicons-lock-closed' }
]

// Sport options come from the engine registry (registered engines get tailored
const engineSports = listEngines()
const extraSports = ['Cricket', 'Rugby', 'Other']

// Decorative tile icons per engine key (monogram fallback when unmapped)
const SPORT_ICONS: Record<string, string> = {
  basketball: 'i-lucide-volleyball',
  handball: 'i-lucide-volleyball',
  rugby: 'i-lucide-shield',
  volleyball: 'i-lucide-volleyball',
  tennis: 'i-lucide-activity',
  tabletennis: 'i-lucide-activity',
  badminton: 'i-lucide-activity',
  athletics: 'i-lucide-footprints',
  swimming: 'i-lucide-waves',
  cycling: 'i-lucide-bike',
  weightlifting: 'i-lucide-dumbbell',
  boxing: 'i-lucide-swords',
  judo: 'i-lucide-swords',
  taekwondo: 'i-lucide-swords',
  wrestling: 'i-lucide-swords',
  esports: 'i-lucide-gamepad-2',
}

const sportIcon = (key: string) => SPORT_ICONS[key] || null

const showSportMore = ref(false)
const isExtraSportSelected = computed(() => extraSports.includes(state.sport || ''))
watch(isExtraSportSelected, (v) => { if (v) showSportMore.value = true })

// Engine-driven creation surface: formats/options adapt to the selected sport
const creationEngine = computed(() => resolveEngine(state.sport))
const creation = computed(() => creationEngine.value.creation)

const availableTournamentTypes = computed(() => {
  if (!creation.value) return tournamentTypes
  return tournamentTypes.filter((t) => creation.value!.formats.includes(t.value))
})

// Reset the format when the sport change invalidates it; force participant type
watch(() => state.sport, () => {
  const c = creation.value
  if (!c) return
  if (!c.formats.includes(state.type as TournamentType)) {
    state.type = c.formats[0]
  }
  if (c.participantType) {
    state.participantType = c.participantType
  }
})

// Engine-unsupported options render disabled (with reason) instead of vanishing
const optionSupported = (key: 'twoLegs' | 'thirdPlaceMatch' | 'doubleRoundRobin') =>
  creation.value ? creation.value.options[key] : true

// Timezone options (common ones)
const timezones = [
  { label: 'UTC', value: 'UTC' },
  { label: 'Lagos (WAT)', value: 'Africa/Lagos' },
  { label: 'London (GMT/BST)', value: 'Europe/London' },
  { label: 'New York (EST)', value: 'America/New_York' },
  { label: 'Los Angeles (PST)', value: 'America/Los_Angeles' },
  { label: 'Tokyo (JST)', value: 'Asia/Tokyo' },
  { label: 'Sydney (AEST)', value: 'Australia/Sydney' }
]

// Submit handler
async function onSubmit(event: FormSubmitEvent<Schema>) {
  error.value = null
  loading.value = true

  try {
    const response = await tournamentStore.createTournament({
      ...event.data,
      customName: event.data.customName || undefined,
      isPaidRegistration: !!event.data.isPaidRegistration,
      registrationFee: event.data.isPaidRegistration && event.data.registrationFee
        ? Math.round(event.data.registrationFee * 100)
        : 0,
      scoringRules: { win: 3, draw: 1, loss: 0 } // Default scoring rules
    } as Partial<Tournament>)

    if (response?.data) {
      localStorage.removeItem(STORAGE_KEY)
      const urlId = response.data.customName || response.data.id
      await navigateTo(`/tournaments/${urlId}`)
    }
  } catch (err: any) {
    handleError(err, { title: 'Create Failed' })
    error.value = err?.message || 'Create Failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-6xl mx-auto">
    <!-- ── Draft with Paragee (AI) ─────────────────────────────── -->
    <div class="mb-5 rounded-2xl border border-indigo-400/30 dark:border-indigo-400/25 bg-gradient-to-b from-indigo-500/[0.06] via-indigo-500/[0.02] to-transparent overflow-hidden">
      <div class="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-indigo-400/15">
        <div class="flex items-center gap-2.5">
          <span class="w-6 h-6 rounded-lg flex items-center justify-center text-[11px]" style="background: linear-gradient(135deg,#312E81,#136332)">✨</span>
          <h2 class="text-[13.5px] font-extrabold text-heading">Draft with Paragee</h2>
        </div>
        <span class="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 dark:text-indigo-300 border border-indigo-500/25">AI · optional</span>
      </div>

      <!-- drafting -->
      <div v-if="aiDrafting" class="px-4 sm:px-5 py-4">
        <div class="flex items-center gap-2.5 text-[13px] text-body">
          <span class="flex items-end gap-0.5 h-3">
            <span class="w-1 h-1 rounded-full bg-indigo-400 animate-bounce"></span>
            <span class="w-1 h-1 rounded-full bg-indigo-400 animate-bounce [animation-delay:120ms]"></span>
            <span class="w-1 h-1 rounded-full bg-indigo-400 animate-bounce [animation-delay:240ms]"></span>
          </span>
          Paragee is drafting your tournament…
        </div>
        <div class="mt-3 space-y-2">
          <div class="h-2.5 rounded bg-indigo-500/10 animate-pulse"></div>
          <div class="h-2.5 rounded bg-indigo-500/10 animate-pulse w-2/3"></div>
        </div>
      </div>

      <!-- drafted: collapsed summary + banner -->
      <template v-else-if="aiSummary">
        <div class="flex items-center gap-3 px-4 sm:px-5 py-3 text-[12.5px] text-body">
          <q class="text-heading font-semibold truncate">{{ aiSummary }}</q>
          <button type="button" class="ml-auto shrink-0 text-[11.5px] font-bold text-indigo-500 dark:text-indigo-300 hover:underline" @click="editAiPrompt">Edit prompt ↺</button>
        </div>
        <div class="flex items-center gap-2.5 px-4 sm:px-5 py-2.5 bg-indigo-500/[0.08] border-t border-indigo-400/20 text-[12.5px] text-indigo-500 dark:text-indigo-300">
          <span>✨ <b class="text-heading">{{ aiDraftCount }} fields prefilled</b> — marked fields are AI suggestions. Nothing is created until you confirm.</span>
          <button type="button" class="ml-auto shrink-0 text-[11.5px] font-bold bg-indigo-500/10 border border-indigo-500/30 rounded-lg px-2.5 py-1 hover:bg-indigo-500/15" @click="discardAiDraft">Discard draft</button>
        </div>
      </template>

      <!-- idle -->
      <div v-else class="px-4 sm:px-5 py-4">
        <UTextarea
          v-model="aiPrompt"
          :rows="2"
          autoresize
          placeholder="Describe your tournament in plain language — “16-team FIFA knockout, best of 3 legs, Saturdays at 6pm, ₦5,000 entry, public”"
          class="w-full"
          :disabled="aiDrafting"
          @keydown.enter.meta.prevent="draftWithAi"
        />
        <div class="flex flex-wrap gap-1.5 mt-2.5">
          <button
            v-for="chip in ['8-team weekend knockout', 'Season-long league, 12 clubs', '32-player FIFA ladder, best of 3']"
            :key="chip"
            type="button"
            class="text-[11px] font-semibold text-indigo-500 dark:text-indigo-300 bg-indigo-500/[0.07] border border-indigo-500/25 rounded-full px-2.5 py-1 hover:bg-indigo-500/15 transition-colors"
            @click="aiPrompt = chip"
          >✨ {{ chip }}</button>
        </div>
        <div class="flex items-center justify-between gap-3 mt-3">
          <p class="text-[11px] text-muted leading-snug">Paragee fills every field it can infer — you review each step before anything is created. Nothing is submitted automatically.</p>
          <UButton
            type="button"
            size="sm"
            icon="i-heroicons-sparkles"
            label="Draft it"
            :loading="aiDrafting"
            :disabled="aiPrompt.trim().length < 10"
            class="shrink-0"
            @click="draftWithAi"
          />
        </div>
      </div>

      <!-- failure -->
      <div v-if="aiFailed && !aiDrafting" class="flex items-center gap-2.5 px-4 sm:px-5 py-2.5 bg-amber-500/[0.06] border-t border-amber-500/25 text-[12.5px] text-amber-600 dark:text-amber-400">
        ⚠️ Couldn't draft that — your form is untouched. Try rephrasing, or fill the fields manually.
        <button type="button" class="ml-auto shrink-0 text-[11.5px] font-bold bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1 hover:bg-amber-500/15" @click="draftWithAi">Retry</button>
      </div>
    </div>

    <!-- Wizard: vertical step rail + step content -->
    <div class="grid lg:grid-cols-[230px_minmax(0,1fr)] gap-4 items-start">

      <!-- Step rail -->
      <aside class="lg:sticky lg:top-4">
        <div class="bg-surface border border-subtle rounded-2xl p-3">
          <!-- Mobile: compact progress -->
          <div class="flex lg:hidden items-center gap-2 px-1">
            <span class="text-[11px] font-bold text-muted">Step {{ currentStep }} of {{ steps.length }}</span>
            <div class="flex-1 h-1.5 rounded-full bg-black/10 dark:bg-white/[0.08] overflow-hidden">
              <div class="h-full bg-emerald-500 transition-all duration-500" :style="{ width: `${(currentStep / steps.length) * 100}%` }"></div>
            </div>
            <span class="text-[11px] font-bold text-emerald-500">{{ steps[currentStep - 1]?.title }}</span>
          </div>

          <!-- Desktop: vertical steps -->
          <div class="hidden lg:block">
            <button
              v-for="s in steps"
              :key="s.step"
              type="button"
              class="w-full flex gap-3 px-2 py-2.5 text-left relative group"
              :class="s.step < currentStep ? 'cursor-pointer' : 'cursor-default'"
              :aria-current="s.step === currentStep ? 'step' : undefined"
              @click="s.step < currentStep ? jumpTo(s.step) : null"
            >
              <!-- connector -->
              <span
                v-if="s.step < steps.length"
                class="absolute left-[19px] top-[42px] bottom-0 w-0.5 transition-colors"
                :class="s.step < currentStep ? 'bg-emerald-500/50' : 'bg-black/10 dark:bg-white/[0.08]'"
              ></span>
              <span
                class="w-6 h-6 rounded-full flex items-center justify-center border-2 shrink-0 z-10 transition-all text-[11px] font-extrabold"
                :class="s.step < currentStep
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : s.step === currentStep
                    ? 'border-emerald-500 text-emerald-500 ring-4 ring-emerald-500/10 bg-surface'
                    : 'border-black/15 dark:border-white/[0.12] text-muted bg-surface'"
              >
                <UIcon v-if="s.step < currentStep" name="i-heroicons-check" class="w-3.5 h-3.5" />
                <template v-else>{{ s.step }}</template>
              </span>
              <span class="min-w-0">
                <span
                  class="block text-[12.5px] font-bold transition-colors"
                  :class="s.step <= currentStep ? 'text-heading' : 'text-muted'"
                >{{ s.title }}</span>
                <span class="block text-[10.5px] text-muted mt-0.5">{{ s.description }}</span>
              </span>
            </button>

            <div class="mt-2 mx-1 flex items-center gap-2 px-2.5 py-2 rounded-lg bg-black/[0.03] dark:bg-white/[0.04] border border-subtle text-[10.5px] text-muted">
              <UIcon name="i-heroicons-check" class="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              Draft autosaves to this device
            </div>
          </div>
        </div>
      </aside>

      <!-- Step content -->
      <div class="min-w-0">
        <!-- Error State -->
        <UAlert
          v-if="error"
          color="error"
          variant="soft"
          icon="i-heroicons-exclamation-circle"
          title="Action Required"
          :description="error"
          class="mb-4 rounded-2xl"
        >
          <template #description>
            <div class="flex items-center justify-between gap-3">
              <span class="flex-1">{{ error }}</span>
              <UButton
                size="xs"
                color="error"
                variant="ghost"
                icon="i-heroicons-x-mark"
                class="rounded-full"
                @click="error = null;"
              />
            </div>
          </template>
        </UAlert>

        <UForm :schema="schema" :state="state" @submit="onSubmit">

          <!-- ═══ STEP 1: IDENTITY ═══ -->
          <div v-if="currentStep === 1" class="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <!-- Branding -->
            <section class="bg-surface border border-subtle rounded-2xl overflow-hidden">
              <header class="flex items-center gap-2.5 px-4 py-3 border-b border-subtle">
                <span class="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <UIcon name="i-heroicons-photo" class="w-3.5 h-3.5" />
                </span>
                <h2 class="text-[13px] font-bold text-heading">Branding</h2>
                <span class="ml-auto text-[11px] text-muted">Optional — placeholders used otherwise</span>
              </header>
              <div class="p-4 flex flex-col sm:flex-row gap-3">
                <!-- Logo -->
                <input ref="logoFileInput" type="file" accept="image/*" class="hidden" @change="handleLogoChange" />
                <div class="flex sm:flex-col items-center gap-2 shrink-0">
                  <button
                    type="button"
                    class="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-dashed border-subtle hover:border-emerald-500/50 transition-all group bg-black/[0.02] dark:bg-white/[0.03]"
                    :class="{ 'border-solid': state.logoUrl }"
                    @click="triggerLogoInput"
                    :disabled="uploadingLogo"
                  >
                    <img v-if="state.logoUrl" :src="state.logoUrl" alt="Logo preview" class="w-full h-full object-cover" />
                    <div v-else class="w-full h-full flex flex-col items-center justify-center gap-1.5 text-muted group-hover:text-emerald-500 transition-colors">
                      <UIcon name="i-heroicons-photo" class="w-6 h-6" />
                      <span class="text-[10px] font-bold">Logo</span>
                    </div>
                    <div v-if="uploadingLogo" class="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 text-white animate-spin" />
                    </div>
                  </button>
                  <UButton v-if="state.logoUrl" size="xs" variant="ghost" color="error" icon="i-heroicons-trash" label="Remove" @click="removeLogo" />
                </div>
                <!-- Banner -->
                <input ref="bannerFileInput" type="file" accept="image/*" class="hidden" @change="handleBannerChange" />
                <div class="flex-1 flex flex-col gap-2">
                  <button
                    type="button"
                    class="relative flex-1 min-h-24 rounded-xl overflow-hidden border-2 border-dashed border-subtle hover:border-emerald-500/50 transition-all group bg-black/[0.02] dark:bg-white/[0.03]"
                    :class="{ 'border-solid': state.bannerUrl }"
                    @click="triggerBannerInput"
                    :disabled="uploadingBanner"
                  >
                    <img v-if="state.bannerUrl" :src="state.bannerUrl" alt="Banner preview" class="absolute inset-0 w-full h-full object-cover object-top" />
                    <div v-else class="w-full h-full min-h-24 flex flex-col items-center justify-center gap-1.5 text-muted group-hover:text-emerald-500 transition-colors">
                      <UIcon name="i-heroicons-photo" class="w-6 h-6" />
                      <span class="text-[10px] font-bold">Add cover banner</span>
                      <span class="text-[9.5px]">Wide image, 1600×400+</span>
                    </div>
                    <div v-if="uploadingBanner" class="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 text-white animate-spin" />
                    </div>
                  </button>
                  <div v-if="state.bannerUrl" class="flex justify-end">
                    <UButton size="xs" variant="ghost" color="error" icon="i-heroicons-trash" label="Remove" @click="removeBanner" />
                  </div>
                </div>
              </div>
            </section>

            <!-- Identity -->
            <section class="bg-surface border border-subtle rounded-2xl overflow-hidden">
              <header class="flex items-center gap-2.5 px-4 py-3 border-b border-subtle">
                <span class="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <UIcon name="i-heroicons-identification" class="w-3.5 h-3.5" />
                </span>
                <h2 class="text-[13px] font-bold text-heading">Identity</h2>
              </header>
              <div class="p-4 space-y-4">
<UFormField name="name" required>
<template #label>Tournament name <span v-if="aiFields.includes('name')" class="ml-1 text-[8.5px] font-extrabold px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 dark:text-indigo-300 border border-indigo-500/25 align-middle">✨ AI</span></template>
<UInput v-model="state.name" placeholder="e.g. Premier Football League 2026" size="lg" class="w-full" />
                </UFormField>

                <UFormField label="Custom URL" name="customName" hint="Personalized link for your tournament">
                  <UInput
                    v-model="state.customName"
                    placeholder="e.g. premier-league-2026"
                    icon="i-heroicons-link"
                    class="w-full"
                    :trailing-icon="checkingName ? 'i-heroicons-arrow-path' : nameAvailable === true ? 'i-heroicons-check-circle' : nameAvailable === false ? 'i-heroicons-x-circle' : undefined"
                    :color="nameAvailable === false ? 'error' : nameAvailable === true ? 'success' : undefined"
                  />
                  <template #description>
                    <span v-if="checkingName" class="text-xs text-muted flex items-center gap-1">
                      <UIcon name="i-heroicons-arrow-path" class="w-3 h-3 animate-spin shrink-0" />
                      <span>Checking availability...</span>
                    </span>
                    <span v-else-if="state.customName && !checkingName && nameAvailable === true" class="text-xs text-emerald-600 dark:text-emerald-400 flex items-start gap-1">
                      <UIcon name="i-heroicons-check-circle" class="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span class="break-all">Available: parascores.com/t/{{ state.customName }}</span>
                    </span>
                    <span v-else-if="nameAvailable === false" class="text-xs text-red-600 dark:text-red-400 flex items-start gap-1">
                      <UIcon name="i-heroicons-x-circle" class="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>This URL is already taken.</span>
                    </span>
                  </template>
                </UFormField>

                <!-- Sport: tile grid (drives Step 2 formats via the engine) -->
                <UFormField name="sport" required>
<template #label>Sport <span v-if="aiFields.includes('sport')" class="ml-1 text-[8.5px] font-extrabold px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 dark:text-indigo-300 border border-indigo-500/25 align-middle">✨ AI</span></template>
                  <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    <button
                      v-for="engine in engineSports"
                      :key="engine.key"
                      type="button"
                      class="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border text-center transition-all"
                      :class="state.sport === engine.label
                        ? 'border-emerald-500/50 bg-emerald-500/[0.08] text-emerald-600 dark:text-emerald-400'
                        : 'border-subtle bg-black/[0.02] dark:bg-white/[0.03] text-muted hover:border-white/[0.16] hover:text-heading'"
                      :aria-pressed="state.sport === engine.label"
                      @click="state.sport = engine.label"
                    >
                      <IconsSoccerBallIcon v-if="engine.key === 'football'" class="w-5 h-5" />
                      <UIcon v-else-if="sportIcon(engine.key)" :name="sportIcon(engine.key)!" class="w-5 h-5" />
                      <span v-else class="w-5 h-5 flex items-center justify-center text-[11px] font-extrabold">{{ engine.label.charAt(0) }}</span>
                      <span class="text-[11px] font-bold leading-tight">{{ engine.label }}</span>
                    </button>
                    <button
                      type="button"
                      class="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border text-center transition-all"
                      :class="isExtraSportSelected
                        ? 'border-emerald-500/50 bg-emerald-500/[0.08] text-emerald-600 dark:text-emerald-400'
                        : 'border-dashed border-subtle text-muted hover:border-white/[0.16] hover:text-heading'"
                      :aria-pressed="isExtraSportSelected"
                      @click="showSportMore = !showSportMore"
                    >
                      <UIcon name="i-heroicons-ellipsis-horizontal" class="w-5 h-5" />
                      <span class="text-[11px] font-bold leading-tight">{{ isExtraSportSelected ? state.sport : 'More…' }}</span>
                    </button>
                  </div>
                  <USelect
                    v-if="showSportMore"
                    v-model="state.sport"
                    :items="extraSports"
                    placeholder="Other sports…"
                    class="w-full sm:w-64 mt-2"
                  />
                  <p class="text-[10.5px] text-muted mt-1.5">The sport decides which formats Step 2 offers (engines drive this).</p>
                </UFormField>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <UFormField name="location">
<template #label>Location <span v-if="aiFields.includes('location')" class="ml-1 text-[8.5px] font-extrabold px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 dark:text-indigo-300 border border-indigo-500/25 align-middle">✨ AI</span></template>
                    <LocationSelect
                      v-model="state.location"
                      @coordinates="(coords) => { state.latitude = coords?.lat ?? null; state.longitude = coords?.lon ?? null }"
                    />
                  </UFormField>
                </div>

                <UFormField name="description">
<template #label>Description <span v-if="aiFields.includes('description')" class="ml-1 text-[8.5px] font-extrabold px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 dark:text-indigo-300 border border-indigo-500/25 align-middle">✨ AI</span></template>
                  <UTextarea v-model="state.description" placeholder="Describe your tournament..." :rows="3" class="w-full" />
                </UFormField>
              </div>
            </section>
          </div>

          <!-- ═══ STEP 2: STRUCTURE ═══ -->
          <div v-if="currentStep === 2" class="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <section class="bg-surface border border-subtle rounded-2xl overflow-hidden">
              <header class="flex items-center gap-2.5 px-4 py-3 border-b border-subtle">
                <span class="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <UIcon name="i-heroicons-trophy" class="w-3.5 h-3.5" />
                </span>
                <h2 class="text-[13px] font-bold text-heading">Format</h2>
                <span class="ml-auto text-[11px] text-muted">{{ creationEngine.label }} engine</span>
              </header>
              <div class="p-4 space-y-5">
                <UFormField name="type" required>
<template #label>Tournament type <span v-if="aiFields.includes('type')" class="ml-1 text-[8.5px] font-extrabold px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 dark:text-indigo-300 border border-indigo-500/25 align-middle">✨ AI</span></template>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      v-for="opt in availableTournamentTypes"
                      :key="opt.value"
                      type="button"
                      @click="state.type = opt.value"
                      class="p-3.5 rounded-xl border text-left transition-all"
                      :class="state.type === opt.value
                        ? 'border-emerald-500/50 bg-emerald-500/[0.07]'
                        : 'border-subtle bg-black/[0.02] dark:bg-white/[0.03] hover:border-white/[0.16]'"
                    >
                      <div class="flex items-center justify-between mb-1">
                        <span class="text-[13px] font-bold text-heading">{{ opt.label }}</span>
                        <UIcon v-if="state.type === opt.value" name="i-heroicons-check-circle" class="w-4.5 h-4.5 text-emerald-500" />
                      </div>
                      <p class="text-[11px] text-muted leading-relaxed">{{ opt.description }}</p>
                    </button>
                  </div>
                </UFormField>

                <UFormField name="participantType" required>
<template #label>Participants <span v-if="aiFields.includes('participantType')" class="ml-1 text-[8.5px] font-extrabold px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 dark:text-indigo-300 border border-indigo-500/25 align-middle">✨ AI</span></template>
                  <div class="grid grid-cols-2 gap-2">
                    <button
                      v-for="opt in participantTypes"
                      :key="opt.value"
                      type="button"
                      @click="state.participantType = opt.value"
                      :disabled="!!creation?.participantType && opt.value !== creation.participantType"
                      class="flex items-center gap-2.5 px-3.5 py-3 rounded-xl border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      :class="state.participantType === opt.value
                        ? 'border-emerald-500/50 bg-emerald-500/[0.08] text-emerald-600 dark:text-emerald-400'
                        : 'border-subtle bg-black/[0.02] dark:bg-white/[0.03] text-muted hover:border-white/[0.16] hover:text-heading'"
                    >
                      <UIcon :name="opt.icon" class="w-4.5 h-4.5" />
                      <span class="text-xs font-bold">{{ opt.label }}</span>
                    </button>
                  </div>
                  <p v-if="creation?.participantType" class="text-[11px] text-muted mt-1.5">
                    {{ creationEngine.label }} events are individual-based.
                  </p>
                </UFormField>
              </div>
            </section>

            <section class="bg-surface border border-subtle rounded-2xl overflow-hidden">
              <header class="flex items-center gap-2.5 px-4 py-3 border-b border-subtle">
                <span class="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <UIcon name="i-heroicons-adjustments-horizontal" class="w-3.5 h-3.5" />
                </span>
                <h2 class="text-[13px] font-bold text-heading">Limits &amp; options</h2>
              </header>
              <div class="p-4 space-y-3">
                <div class="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-subtle">
                  <div>
                    <p class="text-[13px] font-semibold text-heading">Max participants <span class="text-red-500">*</span> <span v-if="aiFields.includes('maxParticipants')" class="ml-1 text-[8.5px] font-extrabold px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 dark:text-indigo-300 border border-indigo-500/25 align-middle">✨ AI</span></p>
                    <p class="text-[10.5px] text-muted mt-0.5">Cap entries; leave room for late joiners</p>
                  </div>
                  <UFormField name="maxParticipants" class="shrink-0">
                    <UInput v-model.number="state.maxParticipants" type="number" placeholder="16" :min="2" class="w-28" />
                  </UFormField>
                </div>

                <template v-if="[TournamentType.KNOCKOUT, TournamentType.HYBRID, TournamentType.ROUND_ROBIN, TournamentType.LEAGUE, TournamentType.GROUP].some(t => t === state.type)">
                  <template v-if="state.type === TournamentType.KNOCKOUT || state.type === TournamentType.HYBRID">
                    <div
                      class="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-subtle"
                      :class="{ 'opacity-50': !optionSupported('twoLegs') }"
                      :title="!optionSupported('twoLegs') ? `Not available for ${creationEngine.label}` : undefined"
                    >
                      <div>
                        <p class="text-[13px] font-semibold text-heading">Two-legged ties</p>
                        <p class="text-[10.5px] text-muted mt-0.5">{{ optionSupported('twoLegs') ? 'Home & away rounds' : `Not available for ${creationEngine.label}` }}</p>
                      </div>
                      <USwitch v-model="state.twoLegsKnockout" :disabled="!optionSupported('twoLegs')" />
                    </div>
                    <div
                      class="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-subtle"
                      :class="{ 'opacity-50': !optionSupported('thirdPlaceMatch') }"
                      :title="!optionSupported('thirdPlaceMatch') ? `Not available for ${creationEngine.label}` : undefined"
                    >
                      <div>
                        <p class="text-[13px] font-semibold text-heading">Third-place match</p>
                        <p class="text-[10.5px] text-muted mt-0.5">{{ optionSupported('thirdPlaceMatch') ? 'Playoff for 3rd place' : `Not available for ${creationEngine.label}` }}</p>
                      </div>
                      <USwitch v-model="state.thirdPlaceMatch" :disabled="!optionSupported('thirdPlaceMatch')" />
                    </div>
                  </template>

                  <div
                    v-if="[TournamentType.ROUND_ROBIN, TournamentType.LEAGUE, TournamentType.GROUP, TournamentType.HYBRID].includes(state.type as any)"
                    class="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-subtle"
                    :class="{ 'opacity-50': !optionSupported('doubleRoundRobin') }"
                    :title="!optionSupported('doubleRoundRobin') ? `Not available for ${creationEngine.label}` : undefined"
                  >
                    <div>
                      <p class="text-[13px] font-semibold text-heading">Double round robin</p>
                      <p class="text-[10.5px] text-muted mt-0.5">{{ optionSupported('doubleRoundRobin') ? 'Each pairing plays home & away' : `Not available for ${creationEngine.label}` }}</p>
                    </div>
                    <USwitch v-model="state.doubleRoundRobin" :disabled="!optionSupported('doubleRoundRobin')" />
                  </div>
                </template>
              </div>
            </section>
          </div>

          <!-- ═══ STEP 3: LOGISTICS ═══ -->
          <div v-if="currentStep === 3" class="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <section class="bg-surface border border-subtle rounded-2xl overflow-hidden">
              <header class="flex items-center gap-2.5 px-4 py-3 border-b border-subtle">
                <span class="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <UIcon name="i-heroicons-calendar" class="w-3.5 h-3.5" />
                </span>
                <h2 class="text-[13px] font-bold text-heading">Schedule</h2>
              </header>
              <div class="p-4 space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <UFormField name="start_date" required>
<template #label>Start date <span v-if="aiFields.includes('startDate')" class="ml-1 text-[8.5px] font-extrabold px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 dark:text-indigo-300 border border-indigo-500/25 align-middle">✨ AI</span></template>
                    <UPopover>
                      <UButton variant="outline" color="neutral" icon="i-heroicons-calendar" class="w-full justify-start" :class="!startDate && 'text-muted'">
                        {{ formatDateDisplay(startDate) }}
                      </UButton>
                      <template #content><UCalendar v-model="startDate" /></template>
                    </UPopover>
                  </UFormField>

                  <UFormField name="end_date" required>
<template #label>End date <span v-if="aiFields.includes('endDate')" class="ml-1 text-[8.5px] font-extrabold px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 dark:text-indigo-300 border border-indigo-500/25 align-middle">✨ AI</span></template>
                    <UPopover>
                      <UButton variant="outline" color="neutral" icon="i-heroicons-calendar" class="w-full justify-start" :class="!endDate && 'text-muted'">
                        {{ formatDateDisplay(endDate) }}
                      </UButton>
                      <template #content><UCalendar v-model="endDate" :min-value="startDate as CalendarDate" /></template>
                    </UPopover>
                  </UFormField>
                </div>

                <UFormField label="Timezone" name="timezone" required>
                  <USelect v-model="state.timezone" :items="timezones" value-key="value" option-label="label" class="w-full sm:w-64" />
                </UFormField>
              </div>
            </section>

            <section class="bg-surface border border-subtle rounded-2xl overflow-hidden">
              <header class="flex items-center gap-2.5 px-4 py-3 border-b border-subtle">
                <span class="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <UIcon name="i-heroicons-building-office" class="w-3.5 h-3.5" />
                </span>
                <h2 class="text-[13px] font-bold text-heading">Organization &amp; access</h2>
              </header>
              <div class="p-4 space-y-4">
                <UFormField label="Creating for" name="organization_id" required>
                  <USelect
                    v-if="authStore.organizations.length > 1"
                    v-model="state.organization_id"
                    :items="authStore.organizations.map((o: any) => ({ label: o.organization?.name, value: o.organization?.id }))"
                    class="w-full sm:w-64"
                  />
                  <div v-else class="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 w-fit">
                    <UIcon name="i-heroicons-building-office" class="w-4 h-4 text-emerald-500" />
                    <span class="text-[13px] font-semibold text-heading">{{ authStore.currentOrganization?.name }}</span>
                  </div>
                </UFormField>

                <UFormField name="visibility" required>
<template #label>Visibility <span v-if="aiFields.includes('visibility')" class="ml-1 text-[8.5px] font-extrabold px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 dark:text-indigo-300 border border-indigo-500/25 align-middle">✨ AI</span></template>
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      v-for="opt in visibilityOptions"
                      :key="opt.value"
                      type="button"
                      @click="state.visibility = opt.value"
                      class="p-3.5 rounded-xl border text-left transition-all"
                      :class="state.visibility === opt.value
                        ? 'border-emerald-500/50 bg-emerald-500/[0.07]'
                        : 'border-subtle bg-black/[0.02] dark:bg-white/[0.03] hover:border-white/[0.16]'"
                    >
                      <div class="flex items-center gap-2 mb-1">
                        <UIcon :name="opt.icon" class="w-4 h-4" :class="state.visibility === opt.value ? 'text-emerald-500' : 'text-muted'" />
                        <span class="text-[13px] font-bold text-heading">{{ opt.label }}</span>
                      </div>
                      <p class="text-[10.5px] text-muted">{{ opt.description }}</p>
                    </button>
                  </div>
                </UFormField>

                <div class="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-subtle">
                  <div>
                    <p class="text-[13px] font-semibold text-heading">Auto-approve registrations</p>
                    <p class="text-[10.5px] text-muted mt-0.5">Accept teams without manual review</p>
                  </div>
                  <USwitch v-model="state.autoApprove" />
                </div>

                <div class="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-subtle">
                  <div>
                    <p class="text-[13px] font-semibold text-heading">Paid registration</p>
                    <p class="text-[10.5px] text-muted mt-0.5">Charge a fee to join</p>
                  </div>
                  <USwitch v-model="state.isPaidRegistration" />
                </div>

                <div v-if="state.isPaidRegistration" class="p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-subtle space-y-3 animate-in fade-in duration-200">
                  <div
                    v-if="payoutAccount && !payoutAccount.hasPayoutAccount"
                    class="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/[0.06] border border-amber-500/30"
                  >
                    <UIcon name="i-heroicons-exclamation-triangle" class="w-4.5 h-4.5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div class="flex-1 text-xs sm:text-sm text-amber-700 dark:text-amber-400">
                      <span class="font-semibold">Payout account required.</span>
                      Connect a bank account to receive registration fees directly before teams can pay.
                      <div class="mt-2">
                        <UButton
                          size="xs"
                          color="warning"
                          icon="i-heroicons-banknotes"
                          label="Set Up Payout Account"
                          @click="showPayoutModal = true"
                        />
                      </div>
                    </div>
                  </div>
                  <UFormField name="registrationFee" required>
<template #label>Registration fee (₦) <span v-if="aiFields.includes('registrationFee')" class="ml-1 text-[8.5px] font-extrabold px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 dark:text-indigo-300 border border-indigo-500/25 align-middle">✨ AI</span></template>
                    <UInput
                      v-model.number="state.registrationFee"
                      type="number"
                      placeholder="e.g. 5000"
                      min="0"
                      class="w-full sm:w-56"
                      icon="i-heroicons-banknotes"
                    />
                  </UFormField>
                </div>
              </div>
            </section>
          </div>

          <!-- ═══ STEP 4: REVIEW ═══ -->
          <div v-if="currentStep === 4" class="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <section class="bg-surface border border-subtle rounded-2xl overflow-hidden">
              <!-- Fan-page hero preview -->
              <div class="relative">
                <div class="h-24 sm:h-28 bg-black/[0.03] dark:bg-white/[0.03] relative overflow-hidden">
                  <img v-if="state.bannerUrl" :src="state.bannerUrl" class="w-full h-full object-cover object-top" />
                  <div v-else class="w-full h-full bg-gradient-to-br from-emerald-900/60 via-emerald-800/40 to-teal-800/50"></div>
                </div>
                <div class="absolute -bottom-6 left-4 w-16 h-16 rounded-2xl border-4 border-white dark:border-gray-900 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
                  <img v-if="state.logoUrl" :src="state.logoUrl" class="w-full h-full object-cover" />
                  <div v-else class="w-full h-full flex items-center justify-center bg-[#136332] text-white text-xl font-extrabold">
                    {{ state.name?.charAt(0)?.toUpperCase() || 'T' }}
                  </div>
                </div>
              </div>

              <div class="pt-9 p-4 sm:p-5">
                <div class="flex items-center gap-2 flex-wrap">
                  <h2 class="text-lg font-extrabold text-heading">{{ state.name || 'Untitled tournament' }}</h2>
                  <UBadge size="xs" color="primary" variant="subtle">{{ state.visibility }}</UBadge>
                </div>
                <p class="text-[12px] text-muted mt-1">
                  {{ state.sport }}<template v-if="state.location"> · {{ state.location }}</template>
                  <template v-if="state.customName"> · parascores.com/t/{{ state.customName }}</template>
                </p>

                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                  <div class="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-subtle">
                    <p class="text-[9px] uppercase tracking-widest text-muted font-extrabold mb-1">Format</p>
                    <p class="text-[13px] font-bold text-heading">{{ tournamentTypes.find(t => t.value === state.type)?.label }}</p>
                  </div>
                  <div class="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-subtle">
                    <p class="text-[9px] uppercase tracking-widest text-muted font-extrabold mb-1">Participants</p>
                    <p class="text-[13px] font-bold text-heading">{{ state.maxParticipants }} {{ state.participantType === ParticipantType.TEAM ? 'teams' : 'individuals' }}</p>
                  </div>
                  <div class="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-subtle">
                    <p class="text-[9px] uppercase tracking-widest text-muted font-extrabold mb-1">Starts</p>
                    <p class="text-[13px] font-bold text-heading">{{ formatDateShort(startDate) }}</p>
                  </div>
                  <div class="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-subtle">
                    <p class="text-[9px] uppercase tracking-widest text-muted font-extrabold mb-1">Ends</p>
                    <p class="text-[13px] font-bold text-heading">{{ formatDateShort(endDate) }}</p>
                  </div>
                </div>

                <div v-if="state.description" class="mt-4">
                  <p class="text-[10px] font-extrabold text-muted uppercase tracking-widest mb-1">Description</p>
                  <p class="text-[13px] text-body leading-relaxed whitespace-pre-wrap">{{ state.description }}</p>
                </div>

                <div class="flex items-center justify-between gap-3 flex-wrap mt-4 pt-3 border-t border-subtle">
                  <p class="text-[12px] text-muted">
                    Creating under <span class="font-bold text-heading">{{ authStore.organizations.find(o => o.organization?.id === state.organization_id)?.organization?.name || authStore.currentOrganization?.name }}</span><template v-if="state.isPaidRegistration && state.registrationFee"> · ₦{{ state.registrationFee.toLocaleString() }} registration fee</template>
                  </p>
                  <div class="flex items-center gap-3">
                    <button type="button" class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline" @click="jumpTo(1)">Edit identity</button>
                    <button type="button" class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline" @click="jumpTo(2)">Edit format</button>
                    <button type="button" class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline" @click="jumpTo(3)">Edit logistics</button>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <!-- Footer nav (sticky, floating) -->
          <div class="sticky bottom-4 mt-4 z-30">
            <div class="flex items-center justify-between gap-3 px-3.5 py-3 bg-surface/90 backdrop-blur-xl border border-subtle rounded-2xl shadow-lg shadow-black/5 dark:shadow-black/40">
              <UButton
                v-if="currentStep > 1"
                label="Back"
                variant="ghost"
                color="neutral"
                icon="i-heroicons-arrow-left"
                @click="prevStep"
                :disabled="loading"
              />
              <div v-else></div>

              <span class="hidden sm:flex items-center gap-1.5 text-[10.5px] font-semibold text-muted">
                <UIcon name="i-heroicons-check" class="w-3.5 h-3.5 text-emerald-500" />
                Draft saved
              </span>

              <UButton
                v-if="currentStep < steps.length"
                :label="nextStepLabel"
                color="primary"
                trailing-icon="i-heroicons-arrow-right"
                class="font-bold"
                @click="nextStep"
              />
              <UButton
                v-else
                type="submit"
                label="Create tournament"
                color="primary"
                icon="i-heroicons-sparkles"
                class="font-bold"
                :loading="loading"
              />
            </div>
          </div>
        </UForm>
      </div>
    </div>

    <PayoutSetupModal
      v-model:open="showPayoutModal"
      :org-id="authStore.currentOrganization?.id"
      @saved="onPayoutSaved"
    />
  </div>
</template>
