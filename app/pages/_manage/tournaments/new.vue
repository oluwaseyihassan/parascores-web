<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { TournamentType, ParticipantType, Visibility, type Tournament } from '~/types'
import { CalendarDate, type DateValue } from '@internationalized/date'

definePageMeta({
  middleware: ['require-organizer'],
  layout: 'dashboard'
})

const tournamentStore = useTournamentStore()
const authStore = useAuthStore()
const router = useRouter()
const { handleError } = useErrors()

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
const error = ref<string | null>(null)

// Wizard state
const currentStep = ref(1)
const steps = [
  { step: 1, title: 'Identity', description: 'Name and branding', icon: 'i-heroicons-identification' },
  { step: 2, title: 'Structure', description: 'Format and type', icon: 'i-heroicons-trophy' },
  { step: 3, title: 'Logistics', description: 'Dates and visibility', icon: 'i-heroicons-calendar' },
  { step: 4, title: 'Review', description: 'Final check', icon: 'i-heroicons-check-badge' }
]

const nextStep = async () => {
  if (currentStep.value < steps.length) {
    // Basic validation for Step 1
    if (currentStep.value === 1) {
      if (!state.name || state.name.length < 3) {
        error.value = 'Tournament name is required (min 3 characters)'
        return
      }
      if (!state.sport) {
        error.value = 'Please select a sport'
        return
      }
      if (state.customName && nameAvailable.value === false) {
        error.value = 'Custom URL is already taken'
        return
      }
    }
    
    // Basic validation for Step 3
    if (currentStep.value === 3) {
      if (!state.start_date) {
        error.value = 'Start date is required'
        return
      }
      if (!state.end_date) {
        error.value = 'End date is required'
        return
      }
      if (!state.organization_id) {
        error.value = 'Organization selection is required'
        return
      }
    }

    error.value = null
    currentStep.value++
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const prevStep = () => {
  if (currentStep.value > 1) {
    error.value = null
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
    error.value = 'Please select an image file'
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    error.value = 'Image must be less than 5MB'
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
    error.value = 'Please select an image file'
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    error.value = 'Image must be less than 5MB'
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

// Min date for calendar (today)
const todayDate = new Date()
const minDate = new CalendarDate(todayDate.getFullYear(), todayDate.getMonth() + 1, todayDate.getDate())

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
  timezone: z.string().min(1, 'Timezone is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  maxParticipants: z.number().positive().optional().nullable(),
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
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  start_date: '',
  end_date: '',
  maxParticipants: null,
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
onMounted(() => {
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
  { label: 'League', value: TournamentType.LEAGUE, description: 'Classic league format' },
  { label: 'Round Robin', value: TournamentType.ROUND_ROBIN, description: 'Everyone plays everyone' },
  { label: 'Group Stage', value: TournamentType.GROUP, description: 'Multiple groups without knockout' },
  { label: 'Hybrid (Group + Knockout)', value: TournamentType.HYBRID, description: 'Group Stage followed by Knockout Stage' },
  { label: 'Friendly / Single Match', value: TournamentType.FRIENDLY, description: 'Single matches, friendly games' }
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

const popularSports = ['Football', 'Basketball', 'Tennis', 'Cricket', 'Rugby', 'Volleyball', 'Esports', 'Other']

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
  loading.value = true
  error.value = null
  
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
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center justify-between mb-4">
        <NuxtLink 
          to="/" 
          class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
          Back to Dashboard
        </NuxtLink>
        <span class="text-xs font-medium text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-md">
          Step {{ currentStep }} of {{ steps.length }}
        </span>
      </div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Create Tournament</h1>
      <p class="text-gray-500 mt-1">Set up a new league, cup, or competition</p>
    </div>

    <!-- Wizard Stepper -->
    <div class="mb-14">
      <div class="flex items-center justify-between relative px-2">
        <!-- Progress Line -->
        <div class="absolute top-1/2 left-5 right-5 h-0.5 bg-gray-200 dark:bg-gray-800 -translate-y-1/2 z-0"></div>
        <div 
          class="absolute top-1/2 left-5 h-0.5 bg-indigo-500 -translate-y-1/2 z-0 transition-all duration-500"
          :style="{ width: `calc(((currentStep - 1) / (steps.length - 1)) * (100% - 2.5rem))` }"
        ></div>

        <!-- Step Items -->
        <div 
          v-for="s in steps" 
          :key="s.step"
          class="relative z-10 flex flex-col items-center group"
          :class="s.step <= currentStep ? 'cursor-pointer' : 'cursor-default'"
          @click="s.step < currentStep ? currentStep = s.step : null"
        >
          <div 
            class="w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300"
            :class="[
              s.step === currentStep 
                ? 'bg-white dark:bg-gray-900 border-indigo-500 text-indigo-500 ring-4 ring-indigo-50 dark:ring-indigo-900/20 shadow-sm' 
                : s.step < currentStep
                  ? 'bg-indigo-500 border-indigo-500 text-white shadow-md'
                  : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-400'
            ]"
          >
            <UIcon v-if="s.step < currentStep" name="i-heroicons-check" class="w-6 h-6" />
            <UIcon v-else :name="s.icon" class="w-5 h-5" />
          </div>
          <div class="absolute top-12 whitespace-nowrap text-center">
            <p 
              class="text-[10px] uppercase tracking-wider font-bold transition-colors"
              :class="s.step <= currentStep ? 'text-gray-900 dark:text-white' : 'text-gray-400'"
            >
              {{ s.title }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Alert -->
    <UAlert 
      v-if="error" 
      color="error" 
      variant="soft"
      icon="i-heroicons-exclamation-circle"
      title="Action Required"
      :description="error"
      class="mb-6 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-sm"
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
            @click="error = null" 
          />
        </div>
      </template>
    </UAlert>

    <!-- Form -->
    <UForm :schema="schema" :state="state" @submit="onSubmit" class="space-y-8">
      
      <!-- STEP 1: IDENTITY -->
      <div v-if="currentStep === 1" class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-indigo-500" />
              <span class="font-medium">Tournament Branding</span>
            </div>
          </template>

          <div class="space-y-6">
            <!-- Logo Upload -->
            <div class="flex items-start gap-6">
              <input ref="logoFileInput" type="file" accept="image/*" class="hidden" @change="handleLogoChange" />
              <button 
                type="button"
                class="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 group bg-gray-50/50 dark:bg-gray-800/30 shadow-inner"
                @click="triggerLogoInput"
                :disabled="uploadingLogo"
              >
                <img v-if="state.logoUrl" :src="state.logoUrl" alt="Logo preview" class="w-full h-full object-cover" />
                <div v-else class="w-full h-full flex flex-col items-center justify-center text-gray-400 group-hover:text-indigo-500 transition-colors">
                  <UIcon name="i-heroicons-photo" class="w-10 h-10" />
                  <span class="text-xs mt-2 font-medium">Add Logo</span>
                </div>
                <div v-if="uploadingLogo" class="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-white animate-spin" />
                </div>
              </button>
              
              <div class="flex-1 pt-1">
                <p class="text-sm font-semibold text-gray-900 dark:text-white">Tournament Logo</p>
                <p class="text-xs text-gray-500 mt-1 leading-relaxed">Recommended: Square image, at least 400x400px for best quality across all devices.</p>
                <UButton v-if="state.logoUrl" size="xs" variant="ghost" color="error" icon="i-heroicons-trash" class="mt-3" @click="removeLogo">Remove</UButton>
              </div>
            </div>

            <!-- Banner Upload -->
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <p class="text-sm font-semibold text-gray-900 dark:text-white">Cover Banner</p>
                <UButton v-if="state.bannerUrl" size="xs" variant="ghost" color="error" icon="i-heroicons-trash" @click="removeBanner">Remove</UButton>
              </div>
              <input ref="bannerFileInput" type="file" accept="image/*" class="hidden" @change="handleBannerChange" />
              <button 
                type="button"
                class="relative w-full h-40 rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 group bg-gray-50/50 dark:bg-gray-800/30 shadow-inner"
                @click="triggerBannerInput"
                :disabled="uploadingBanner"
              >
                <img v-if="state.bannerUrl" :src="state.bannerUrl" alt="Banner preview" class="w-full h-full object-cover" />
                <div v-else class="w-full h-full flex flex-col items-center justify-center text-gray-400 group-hover:text-indigo-500 transition-colors">
                  <UIcon name="i-heroicons-photo" class="w-10 h-10" />
                  <span class="text-xs mt-2 font-medium">Add Cover Banner</span>
                </div>
                <div v-if="uploadingBanner" class="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-white animate-spin" />
                </div>
              </button>
            </div>

            <UFormField label="Tournament Name" name="name" required>
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
                <span v-if="checkingName" class="text-xs text-gray-400 flex items-center gap-1">
                  <UIcon name="i-heroicons-arrow-path" class="w-3 h-3 animate-spin shrink-0" />
                  <span>Checking availability...</span>
                </span>
                <span v-else-if="state.customName && !checkingName && nameAvailable === true" class="text-xs text-green-600 dark:text-green-400 flex items-start gap-1">
                  <UIcon name="i-heroicons-check-circle" class="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span class="break-all">
                    Available: parascores.com/t/{{ state.customName }}
                  </span>
                </span>
                <span v-else-if="nameAvailable === false" class="text-xs text-red-600 dark:text-red-400 flex items-start gap-1">
                  <UIcon name="i-heroicons-x-circle" class="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>This URL is already taken.</span>
                </span>
              </template>
            </UFormField>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormField label="Sport" name="sport" required>
                <USelect v-model="state.sport" :items="popularSports" placeholder="Select sport" class="w-full" />
              </UFormField>
              <UFormField label="Location" name="location">
                <UInput v-model="state.location" placeholder="e.g. London, UK" class="w-full" />
              </UFormField>
            </div>

            <UFormField label="Description" name="description">
              <UTextarea v-model="state.description" placeholder="Describe your tournament..." :rows="3" class="w-full" />
            </UFormField>
          </div>
        </UCard>
      </div>

      <!-- STEP 2: STRUCTURE -->
      <div v-if="currentStep === 2" class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-trophy" class="w-5 h-5 text-indigo-500" />
              <span class="font-medium">Tournament Format</span>
            </div>
          </template>

          <div class="space-y-8">
            <UFormField label="Tournament Type" name="type" required>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  v-for="opt in tournamentTypes"
                  :key="opt.value"
                  type="button"
                  @click="state.type = opt.value"
                  class="p-4 rounded-xl border-2 text-left transition-all group"
                  :class="[
                    state.type === opt.value
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 shadow-sm'
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                  ]"
                >
                  <div class="flex items-center justify-between mb-1">
                    <span class="font-bold text-gray-900 dark:text-white">{{ opt.label }}</span>
                    <UIcon v-if="state.type === opt.value" name="i-heroicons-check-circle" class="w-5 h-5 text-indigo-500" />
                  </div>
                  <p class="text-xs text-gray-500 leading-relaxed">{{ opt.description }}</p>
                </button>
              </div>
            </UFormField>

            <UFormField label="Participant Type" name="participantType" required>
              <div class="flex gap-4">
                <button
                  v-for="opt in participantTypes"
                  :key="opt.value"
                  type="button"
                  @click="state.participantType = opt.value"
                  class="flex-1 p-5 rounded-xl border-2 flex flex-col items-center gap-3 transition-all"
                  :class="[
                    state.participantType === opt.value
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 shadow-sm text-indigo-600 dark:text-indigo-400'
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 text-gray-400'
                  ]"
                >
                  <UIcon :name="opt.icon" class="w-10 h-10" />
                  <span class="font-bold uppercase tracking-wider text-xs">{{ opt.label }}</span>
                </button>
              </div>
            </UFormField>

            <div class="pt-6 border-t border-gray-100 dark:border-gray-800 space-y-6">
              <UFormField label="Max Participants" name="maxParticipants">
                <UInput v-model.number="state.maxParticipants" type="number" placeholder="Unlimited" :min="2" class="w-40" />
              </UFormField>

              <!-- Advanced Options -->
              <div v-if="[TournamentType.KNOCKOUT, TournamentType.HYBRID, TournamentType.ROUND_ROBIN, TournamentType.LEAGUE].some(t => t === state.type)" class="space-y-4">
                <p class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Format Configuration</p>
                
                <div v-if="state.type === TournamentType.KNOCKOUT || state.type === TournamentType.HYBRID" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                    <div>
                      <p class="text-sm font-medium text-gray-900 dark:text-white">Two-Legged Ties</p>
                      <p class="text-[10px] text-gray-500">Home & Away rounds</p>
                    </div>
                    <USwitch v-model="state.twoLegsKnockout" />
                  </div>
                  <div class="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                    <div>
                      <p class="text-sm font-medium text-gray-900 dark:text-white">Third-Place Match</p>
                      <p class="text-[10px] text-gray-500">Playoff for 3rd place</p>
                    </div>
                    <USwitch v-model="state.thirdPlaceMatch" />
                  </div>
                </div>

                <div v-if="[TournamentType.ROUND_ROBIN, TournamentType.LEAGUE, TournamentType.GROUP, TournamentType.HYBRID].includes(state.type as any)" class="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                  <div>
                    <p class="text-sm font-medium text-gray-900 dark:text-white">Double Round Robin</p>
                    <p class="text-[10px] text-gray-500">Each team plays twice</p>
                  </div>
                  <USwitch v-model="state.doubleRoundRobin" />
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <!-- STEP 3: LOGISTICS -->
      <div v-if="currentStep === 3" class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-calendar" class="w-5 h-5 text-indigo-500" />
              <span class="font-medium">Schedule & Organization</span>
            </div>
          </template>

          <div class="space-y-8">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <UFormField label="Start Date" name="start_date" required>
                <UPopover>
                  <UButton variant="outline" color="neutral" icon="i-heroicons-calendar" class="w-full justify-start py-2.5" :class="!startDate && 'text-gray-400'">
                    {{ formatDateDisplay(startDate) }}
                  </UButton>
                  <template #content><UCalendar v-model="startDate" :min-value="minDate" /></template>
                </UPopover>
              </UFormField>

              <UFormField label="End Date" name="end_date" required>
                <UPopover>
                  <UButton variant="outline" color="neutral" icon="i-heroicons-calendar" class="w-full justify-start py-2.5" :class="!endDate && 'text-gray-400'">
                    {{ formatDateDisplay(endDate) }}
                  </UButton>
                  <template #content><UCalendar v-model="endDate" :min-value="(startDate || minDate) as CalendarDate" /></template>
                </UPopover>
              </UFormField>
            </div>

            <UFormField label="Timezone" name="timezone" required>
              <USelect v-model="state.timezone" :items="timezones" value-key="value" option-label="label" class="w-full md:w-1/2" />
            </UFormField>

            <div class="pt-6 border-t border-gray-100 dark:border-gray-800 space-y-6">
              <UFormField label="Creating for Organization" name="organization_id" required>
                <USelect 
                  v-if="authStore.organizations.length > 1"
                  v-model="state.organization_id" 
                  :items="authStore.organizations.map((o: any) => ({ label: o.organization?.name, value: o.organization?.id }))"
                  class="w-full md:w-1/2"
                />
                <div v-else class="flex items-center gap-3 p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30">
                  <UIcon name="i-heroicons-building-office" class="w-5 h-5 text-indigo-500" />
                  <span class="text-sm font-medium text-indigo-900 dark:text-indigo-100">{{ authStore.currentOrganization?.name }}</span>
                </div>
              </UFormField>

              <UFormField label="Tournament Visibility" name="visibility" required>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    v-for="opt in visibilityOptions"
                    :key="opt.value"
                    type="button"
                    @click="state.visibility = opt.value"
                    class="p-4 rounded-xl border-2 text-left transition-all"
                    :class="[
                      state.visibility === opt.value
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 shadow-sm'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                    ]"
                  >
                    <div class="flex items-center gap-2 mb-1">
                      <UIcon :name="opt.icon" class="w-4 h-4" :class="state.visibility === opt.value ? 'text-indigo-500' : 'text-gray-400'" />
                      <span class="font-bold text-gray-900 dark:text-white text-sm">{{ opt.label }}</span>
                    </div>
                    <p class="text-[10px] text-gray-500 leading-tight">{{ opt.description }}</p>
                  </button>
                </div>
              </UFormField>

              <div class="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                <div>
                  <p class="text-sm font-medium text-gray-900 dark:text-white">Auto-Approve Registrations</p>
                  <p class="text-[10px] text-gray-500">Automatically accept all teams that join</p>
                </div>
                <USwitch v-model="state.autoApprove" />
              </div>

              <div class="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                <div>
                  <p class="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    Paid Registration
                  </p>
                  <p class="text-[10px] text-gray-500">Require teams to pay a registration fee to join</p>
                </div>
                <USwitch v-model="state.isPaidRegistration" />
              </div>

              <div v-if="state.isPaidRegistration" class="p-4 rounded-xl bg-gray-50/50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 space-y-4 animate-in fade-in duration-200">
                <UFormField label="Registration Fee (₦)" name="registrationFee" required>
                  <UInput 
                    v-model.number="state.registrationFee" 
                    type="number" 
                    placeholder="e.g. 5000" 
                    min="0"
                    class="w-full"
                    icon="i-heroicons-banknotes"
                  />
                </UFormField>
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <!-- STEP 4: REVIEW -->
      <div v-if="currentStep === 4" class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <UCard :ui="{ body: 'p-0 overflow-hidden' }">
          <!-- Banner Preview -->
          <div class="h-32 bg-gray-100 dark:bg-gray-800 relative">
            <img v-if="state.bannerUrl" :src="state.bannerUrl" class="w-full h-full object-cover" />
            <div v-else class="w-full h-full flex items-center justify-center text-gray-400"><UIcon name="i-heroicons-photo" class="w-8 h-8" /></div>
            
            <!-- Logo Floating -->
            <div class="absolute -bottom-6 left-6 w-20 h-20 rounded-2xl border-4 border-white dark:border-gray-900 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
              <img v-if="state.logoUrl" :src="state.logoUrl" class="w-full h-full object-cover" />
              <div v-else class="w-full h-full flex items-center justify-center text-gray-300"><UIcon name="i-heroicons-photo" class="w-6 h-6" /></div>
            </div>
          </div>

          <div class="pt-10 p-6 space-y-8">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <h2 class="text-xl font-bold text-gray-900 dark:text-white">{{ state.name }}</h2>
                <UBadge size="xs" color="primary" variant="subtle">{{ state.visibility }}</UBadge>
              </div>
              <p class="text-sm text-gray-500">{{ state.sport }} • {{ state.location || 'Online' }}</p>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <p class="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Type</p>
                <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ tournamentTypes.find(t => t.value === state.type)?.label }}</p>
              </div>
              <div class="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <p class="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Participants</p>
                <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ state.participantType === ParticipantType.TEAM ? 'Teams' : 'Individuals' }}</p>
              </div>
              <div class="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <p class="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Starts</p>
                <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ formatDateDisplay(startDate) }}</p>
              </div>
              <div class="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <p class="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Ends</p>
                <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ formatDateDisplay(endDate) }}</p>
              </div>
            </div>

            <div v-if="state.description" class="space-y-1">
              <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">Description</p>
              <p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{{ state.description }}</p>
            </div>

            <div class="p-4 rounded-xl bg-indigo-50/30 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/20 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                  <UIcon name="i-heroicons-building-office" class="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Creating under</p>
                  <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ authStore.organizations.find(o => o.organization?.id === state.organization_id)?.organization?.name || authStore.currentOrganization?.name }}</p>
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Navigation Footer (Sticky) -->
      <div class="sticky bottom-0 -mx-4 md:-mx-8 mt-8 p-4 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-t border-gray-200 dark:border-white/10 z-30">
        <div class="max-w-3xl mx-auto flex items-center justify-between">
          <UButton 
            v-if="currentStep > 1"
            label="Back" 
            variant="ghost" 
            color="neutral" 
            icon="i-heroicons-arrow-left"
            class="hover:bg-gray-100 dark:hover:bg-white/5"
            @click="prevStep" 
            :disabled="loading"
          />
          <div v-else></div> <!-- Spacer -->

          <div class="flex items-center gap-3">
            <UButton 
              v-if="currentStep < steps.length"
              label="Next Step" 
              color="primary" 
              trailing-icon="i-heroicons-arrow-right"
              class="px-8 py-2.5 font-bold"
              @click="nextStep"
            />
            <UButton 
              v-else
              type="submit"
              label="Create Tournament" 
              color="primary" 
              icon="i-heroicons-sparkles"
              class="px-8 py-2.5 font-bold"
              :loading="loading"
            />
          </div>
        </div>
      </div>
    </UForm>
  </div>
</template>
