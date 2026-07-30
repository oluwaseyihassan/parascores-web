<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { TournamentType, ParticipantType, Visibility, type Tournament } from '~/types'
import { CalendarDate, parseDate, type DateValue } from '@internationalized/date'
import type { PayoutAccountStatus } from '~/stores/payment'

const props = defineProps<{
  tournament: Tournament
}>()

const tournamentStore = useTournamentStore()
const paymentStore = usePaymentStore()
const { handleError } = useErrors()

const loading = ref(false)
const error = ref<string | null>(null)

const payoutAccount = ref<PayoutAccountStatus | null>(null)
const showPayoutModal = ref(false)

function onPayoutSaved(status: PayoutAccountStatus | null) {
  payoutAccount.value = status
  showPayoutModal.value = false
}

onMounted(async () => {
  const orgId = props.tournament.organization_id
  if (!orgId) return
  try {
    payoutAccount.value = await paymentStore.fetchPayoutAccount(orgId)
  } catch {
    // Silent fail — warning banner stays hidden
  }
})

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

// Form schema
const schema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  customName: z.string()
    .min(3, 'Custom URL must be at least 3 characters')
    .max(60, 'Custom URL must be at most 60 characters')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Only lowercase letters, numbers, and hyphens allowed')
    .optional()
    .or(z.literal('')),
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
  twoLegsKnockout: z.boolean().optional(),
  doubleRoundRobin: z.boolean().optional(),
  thirdPlaceMatch: z.boolean().optional()
})

type Schema = z.output<typeof schema>

// Form state initialized with tournament data
const state = reactive<Partial<Schema>>({
  name: props.tournament.name,
  customName: props.tournament.customName || '',
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
  twoLegsKnockout: props.tournament.twoLegsKnockout ?? false,
  doubleRoundRobin: props.tournament.doubleRoundRobin ?? false,
  thirdPlaceMatch: props.tournament.thirdPlaceMatch ?? false
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

// Options for selects
const tournamentTypes = [
  { label: 'Knockout', value: TournamentType.KNOCKOUT, description: 'Single elimination bracket' },
  { label: 'Round Robin', value: TournamentType.ROUND_ROBIN, description: 'Everyone plays everyone' },
  { label: 'Group Stage (League)', value: TournamentType.GROUP, description: 'Groups without knockout stage' },
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
    
    await tournamentStore.updateTournament(props.tournament.id, {
      ...event.data,
      customName: event.data.customName || null,
      description: event.data.description || null,
      location: event.data.location || null,
      isPaidRegistration: !!event.data.isPaidRegistration,
      registrationFee: event.data.isPaidRegistration && event.data.registrationFee 
        ? Math.round(event.data.registrationFee * 100) 
        : 0,
      logoUrl,
      bannerUrl,
    } as unknown as Partial<Tournament>)
    
    useToast().add({
      title: 'Settings Updated',
      description: 'The tournament settings have been successfully updated.',
      color: 'success',
      icon: 'i-heroicons-check-circle'
    })
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
      class="mb-6"
      :close-button="{ icon: 'i-heroicons-x-mark', color: 'error', variant: 'link' }"
      @close="error = null"
    />

    <!-- Form -->
    <UForm :schema="schema" :state="state" @submit="onSubmit" class="space-y-6 sm:space-y-8">

      <!-- Basic Info -->
      <UCard :ui="{ header: 'px-3 py-2 sm:px-4 sm:py-3' }">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-information-circle" class="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" />
            <span class="font-medium text-sm sm:text-base">Basic Information</span>
          </div>
        </template>

        <div class="space-y-3 sm:space-y-4">
          <!-- Logo Upload -->
          <div class="flex items-start gap-3 sm:gap-4">
            <input
              ref="logoFileInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleLogoChange"
            />

            <button
              type="button"
              class="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 group"
              @click="triggerLogoInput"
              :disabled="uploadingLogo"
            >
              <img
                v-if="logoPreview"
                :src="logoPreview"
                alt="Logo preview"
                class="w-full h-full object-cover"
              />
              <div
                v-else
                class="w-full h-full flex flex-col items-center justify-center text-gray-400 group-hover:text-indigo-500 transition-colors"
              >
                <UIcon name="i-heroicons-photo" class="w-6 h-6 sm:w-8 sm:h-8" />
                <span class="text-[10px] sm:text-xs mt-1">Add Logo</span>
              </div>

              <div v-if="uploadingLogo" class="absolute inset-0 bg-black/50 flex items-center justify-center">
                <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 sm:w-6 sm:h-6 text-white animate-spin" />
              </div>
            </button>

            <div class="flex-1">
              <p class="text-sm font-medium text-gray-900 dark:text-white">Tournament Logo</p>
              <p class="text-[10px] sm:text-xs text-gray-500 mt-1">Recommended: Square image, at least 200x200px</p>

              <UButton
                v-if="logoPreview"
                size="xs"
                variant="ghost"
                color="error"
                icon="i-heroicons-trash"
                class="mt-2"
                :disabled="uploadingLogo"
                @click="removeLogo"
              >
                Remove
              </UButton>
            </div>
          </div>

          <!-- Banner Upload -->
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-white">Tournament Banner</p>
                <p class="text-[10px] sm:text-xs text-gray-500">Recommended: 1200x400px or similar wide format</p>
              </div>
              <UButton
                v-if="bannerPreview"
                size="xs"
                variant="ghost"
                color="error"
                icon="i-heroicons-trash"
                :disabled="uploadingBanner"
                @click="removeBanner"
              >
                Remove
              </UButton>
            </div>

            <button
              type="button"
              class="relative w-full h-24 sm:h-28 md:h-32 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 group"
              @click="triggerBannerInput"
              :disabled="uploadingBanner"
            >
              <img
                v-if="bannerPreview"
                :src="bannerPreview"
                alt="Banner preview"
                class="w-full h-full object-cover"
              />
              <div
                v-else
                class="w-full h-full flex flex-col items-center justify-center text-gray-400 group-hover:text-indigo-500 transition-colors"
              >
                <UIcon name="i-heroicons-photo" class="w-6 h-6 sm:w-8 sm:h-8" />
                <span class="text-[10px] sm:text-xs mt-1">Add Banner</span>
              </div>

              <div v-if="uploadingBanner" class="absolute inset-0 bg-black/50 flex items-center justify-center">
                <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 sm:w-6 sm:h-6 text-white animate-spin" />
              </div>
            </button>
          </div>

          <UFormField label="Tournament Name" name="name" required>
            <UInput
              v-model="state.name"
              placeholder="e.g. Premier Football League 2026"
              size="md"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Custom URL (optional)" name="customName" hint="Used in your public tournament link">
            <div class="relative">
              <UInput 
                v-model="state.customName" 
                placeholder="e.g. premier-league-2026"
                icon="i-heroicons-link"
                class="w-full"
                :trailing-icon="checkingName ? 'i-heroicons-arrow-path' : nameAvailable === true ? 'i-heroicons-check-circle' : nameAvailable === false ? 'i-heroicons-x-circle' : undefined"
                :color="nameAvailable === false ? 'error' : nameAvailable === true ? 'success' : undefined"
              />
            </div>
            <template #description>
              <span v-if="checkingName" class="text-xs text-gray-400 flex items-center gap-1">
                <UIcon name="i-heroicons-arrow-path" class="w-3 h-3 animate-spin shrink-0" />
                <span>Checking availability...</span>
              </span>
              <span v-else-if="nameAvailable === true" class="text-xs text-green-600 dark:text-green-400 flex items-start gap-1">
                <UIcon name="i-heroicons-check-circle" class="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span class="break-all">
                  Available! Your tournament is at: <span class="font-medium">parascores.com/t/{{ state.customName }}</span>
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

          <UFormField label="Description" name="description">
            <UTextarea 
              v-model="state.description" 
              placeholder="Describe your tournament..."
              :rows="3"
              class="w-full"
            />
          </UFormField>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField label="Sport" name="sport" required>
              <USelect 
                v-model="state.sport" 
                :items="popularSports"
                placeholder="Select sport"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Location" name="location">
              <LocationSelect
                v-model="state.location"
                @coordinates="(coords) => { state.latitude = coords?.lat ?? null; state.longitude = coords?.lon ?? null }"
              />
            </UFormField>
          </div>
        </div>
      </UCard>

      <!-- Tournament Format -->
      <UCard :ui="{ header: 'px-3 py-2 sm:px-4 sm:py-3' }">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-trophy" class="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" />
            <span class="font-medium text-sm sm:text-base">Tournament Format</span>
          </div>
        </template>

        <div class="space-y-4 sm:space-y-6">
          <UAlert
            icon="i-heroicons-exclamation-triangle"
            color="warning"
            variant="subtle"
            title="Changing format may affect existing structure"
            description="If you have already generated fixtures or matches, changing the tournament type might lead to unexpected behavior."
          />

          <UFormField label="Tournament Type" name="type" required>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">
              <button
                v-for="opt in tournamentTypes"
                :key="opt.value"
                type="button"
                @click="state.type = opt.value"
                class="p-3 sm:p-4 rounded-lg border-2 text-left transition-all"
                :class="[
                  state.type === opt.value
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                ]"
              >
                <p class="font-medium text-sm text-gray-900 dark:text-white">{{ opt.label }}</p>
                <p class="text-[10px] sm:text-xs text-gray-500 mt-1">{{ opt.description }}</p>
              </button>
            </div>
          </UFormField>

          <UFormField label="Participant Type" name="participantType" required>
            <div class="flex gap-2 sm:gap-3">
              <button
                v-for="opt in participantTypes"
                :key="opt.value"
                type="button"
                @click="state.participantType = opt.value"
                class="flex-1 p-3 sm:p-4 rounded-lg border-2 flex items-center gap-2 sm:gap-3 transition-all"
                :class="[
                  state.participantType === opt.value
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                ]"
              >
                <UIcon :name="opt.icon" class="w-4 h-4 sm:w-5 sm:h-5" />
                <span class="font-medium text-sm text-gray-900 dark:text-white">{{ opt.label }}</span>
              </button>
            </div>
          </UFormField>

          <UFormField label="Max Participants" name="maxParticipants" required>
            <UInput
              v-model.number="state.maxParticipants"
              type="number"
              placeholder="e.g. 16"
              :min="2"
              class="w-full md:w-1/2"
              size="sm"
            />
          </UFormField>

          <template v-if="state.type === TournamentType.KNOCKOUT || state.type === TournamentType.HYBRID">
             <div class="space-y-3 sm:space-y-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-800">
                <h3 class="font-medium text-sm sm:text-base text-gray-900 dark:text-white">Knockout Options</h3>

                <div class="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <div class="flex-1 pr-3">
                    <p class="font-medium text-sm text-gray-900 dark:text-white">Two-Legged Ties</p>
                    <p class="text-[11px] sm:text-sm text-gray-500">Knockout rounds (except Final) will have Home and Away legs</p>
                  </div>
                  <USwitch v-model="state.twoLegsKnockout" />
                </div>

                <div class="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <div class="flex-1 pr-3">
                    <p class="font-medium text-sm text-gray-900 dark:text-white">Third-Place Match</p>
                    <p class="text-[11px] sm:text-sm text-gray-500">Generate a playoff match for semi-final losers</p>
                  </div>
                  <USwitch v-model="state.thirdPlaceMatch" />
                </div>
             </div>
          </template>

          <template v-if="[TournamentType.ROUND_ROBIN, TournamentType.LEAGUE, TournamentType.GROUP, TournamentType.HYBRID].includes(state.type as any)">
             <div class="space-y-3 sm:space-y-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-800">
                <h3 class="font-medium text-sm sm:text-base text-gray-900 dark:text-white">Round Robin / Group Options</h3>

                <div class="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <div class="flex-1 pr-3">
                    <p class="font-medium text-sm text-gray-900 dark:text-white">Double Round Robin</p>
                    <p class="text-[11px] sm:text-sm text-gray-500">Teams will play each other twice (Home and Away)</p>
                  </div>
                  <USwitch v-model="state.doubleRoundRobin" />
                </div>
             </div>
          </template>
        </div>
      </UCard>

      <!-- Schedule -->
      <UCard :ui="{ header: 'px-3 py-2 sm:px-4 sm:py-3' }">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-calendar" class="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" />
            <span class="font-medium text-sm sm:text-base">Schedule</span>
          </div>
        </template>

        <div class="space-y-3 sm:space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <UFormField label="Start Date" name="start_date" required>
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
                  <UCalendar
                    v-model="startDate"
                  />
                </template>
              </UPopover>
            </UFormField>

            <UFormField label="End Date" name="end_date" required>
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

          <UFormField label="Timezone" name="timezone" required>
            <USelect
              v-model="state.timezone"
              :items="timezones"
              value-key="value"
              option-label="label"
              class="w-full md:w-1/2"
              size="sm"
            />
          </UFormField>
        </div>
      </UCard>

      <!-- Visibility & Settings -->
      <UCard :ui="{ header: 'px-3 py-2 sm:px-4 sm:py-3' }">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-cog-6-tooth" class="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" />
            <span class="font-medium text-sm sm:text-base">Visibility & Settings</span>
          </div>
        </template>

        <div class="space-y-4 sm:space-y-6">
          <UFormField label="Visibility" name="visibility" required>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">
              <button
                v-for="opt in visibilityOptions"
                :key="opt.value"
                type="button"
                @click="state.visibility = opt.value"
                class="p-3 sm:p-4 rounded-lg border-2 text-left transition-all"
                :class="[
                  state.visibility === opt.value
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                ]"
              >
                <div class="flex items-center gap-2 mb-1">
                  <UIcon :name="opt.icon" class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
                  <p class="font-medium text-sm text-gray-900 dark:text-white">{{ opt.label }}</p>
                </div>
                <p class="text-[10px] sm:text-xs text-gray-500">{{ opt.description }}</p>
              </button>
            </div>
          </UFormField>

          <div class="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div class="flex-1 pr-3">
              <p class="font-medium text-sm text-gray-900 dark:text-white">Auto-approve Join Requests</p>
              <p class="text-[11px] sm:text-sm text-gray-500">When enabled, players joining via invite link are added immediately. When disabled, you must manually approve each request.</p>
            </div>
            <USwitch v-model="state.autoApprove" />
          </div>

          <div class="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div class="flex-1 pr-3">
              <p class="font-medium text-sm text-gray-900 dark:text-white flex items-center gap-2">
                Paid Registration
              </p>
              <p class="text-[11px] sm:text-sm text-gray-500">Require teams to pay a registration fee to join.</p>
            </div>
            <USwitch v-model="state.isPaidRegistration" />
          </div>

          <div v-if="state.isPaidRegistration" class="p-3 sm:p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 space-y-3 sm:space-y-4 animate-in fade-in duration-200">
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
                    size="xs"
                    color="warning"
                    icon="i-heroicons-banknotes"
                    label="Set Up Payout Account"
                    @click="showPayoutModal = true;"
                  />
                </div>
              </div>
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
        </div>
      </UCard>


      <!-- Submit -->
      <div class="flex items-center justify-end gap-3 pt-2 sm:pt-4">
        <UButton
          type="submit"
          label="Save Settings"
          icon="i-heroicons-check"
          color="primary"
          size="md"
          :loading="loading"
        />
      </div>
    </UForm>

    <!-- Payout Account Setup Modal -->
    <PayoutSetupModal
      v-model:open="showPayoutModal"
      :org-id="tournament.organization_id"
      @saved="onPayoutSaved"
    />
  </div>
</template>
