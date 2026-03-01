<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { TournamentType, ParticipantType, Visibility, type Tournament } from '~/types'
import { CalendarDate, type DateValue } from '@internationalized/date'

definePageMeta({
  layout: 'dashboard'
})

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

const tournamentStore = useTournamentStore()
const router = useRouter()

const loading = ref(false)
const error = ref<string | null>(null)

// Logo upload state
const logoFileInput = ref<HTMLInputElement | null>(null)
const logoFile = ref<File | null>(null)
const logoPreview = ref<string | null>(null)
const uploadingLogo = ref(false)

const triggerLogoInput = () => {
  logoFileInput.value?.click()
}

const handleLogoChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    error.value = 'Please select an image file'
    return
  }
  
  // Validate file size (max 5MB)
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
const bannerPreview = ref<string | null>(null)
const uploadingBanner = ref(false)

const triggerBannerInput = () => {
  bannerFileInput.value?.click()
}

const handleBannerChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    error.value = 'Please select an image file'
    return
  }
  
  // Validate file size (max 5MB)
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
  autoApprove: z.boolean()
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
  autoApprove: true
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

// Options
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
    let logoUrl: string | undefined
    let bannerUrl: string | undefined
    
    // Upload logo if selected
    if (logoFile.value) {
      uploadingLogo.value = true
      try {
        const formData = new FormData()
        formData.append('file', logoFile.value)
        
        const uploadResponse = await $api<{success: boolean, data: { url: string, publicId: string }, message: string}>('/upload/image?folder=tournaments', {
          method: 'POST',
          body: formData
        })
        
        if (uploadResponse.data?.url) {
          logoUrl = uploadResponse.data.url
        }
      } finally {
        uploadingLogo.value = false
      }
    }
    
    // Upload banner if selected
    if (bannerFile.value) {
      uploadingBanner.value = true
      try {
        const formData = new FormData()
        formData.append('file', bannerFile.value)
        
        const uploadResponse = await $api<{success: boolean, data: { url: string, publicId: string }, message: string}>('/upload/image?folder=tournaments', {
          method: 'POST',
          body: formData
        })
        
        if (uploadResponse.data?.url) {
          bannerUrl = uploadResponse.data.url
        }
      } finally {
        uploadingBanner.value = false
      }
    }
    
    const response = await tournamentStore.createTournament({
      ...event.data,
      customName: event.data.customName || undefined,
      logoUrl,
      bannerUrl,
      scoringRules: {} // Default empty scoring rules
    } as Partial<Tournament>)
    
    if (response?.data) {
      await navigateTo(`/tournaments/${response.data.id}`)
    }
  } catch (err: any) {
    error.value = err?.data?.message || err?.message || 'Failed to create tournament'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <NuxtLink 
        to="/" 
        class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
      >
        <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
        Back to Dashboard
      </NuxtLink>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Create Tournament</h1>
      <p class="text-gray-500 mt-1">Set up a new league, cup, or competition</p>
    </div>

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
    <UForm :schema="schema" :state="state" @submit="onSubmit" class="space-y-8">
      
      <!-- Basic Info -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-indigo-500" />
            <span class="font-medium">Basic Information</span>
          </div>
        </template>

        <div class="space-y-4">
          <!-- Logo Upload -->
          <div class="flex items-start gap-4">
            <!-- Hidden file input -->
            <input 
              ref="logoFileInput"
              type="file" 
              accept="image/*"
              class="hidden"
              @change="handleLogoChange"
            />
            
            <!-- Logo Preview/Placeholder -->
            <button 
              type="button"
              class="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 group"
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
                <UIcon name="i-heroicons-photo" class="w-8 h-8" />
                <span class="text-xs mt-1">Add Logo</span>
              </div>
              
              <!-- Uploading indicator -->
              <div 
                v-if="uploadingLogo"
                class="absolute inset-0 bg-black/50 flex items-center justify-center"
              >
                <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 text-white animate-spin" />
              </div>
            </button>
            
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-900 dark:text-white">Tournament Logo</p>
              <p class="text-xs text-gray-500 mt-1">Recommended: Square image, at least 200x200px</p>
              <p class="text-xs text-gray-400 mt-0.5">Max file size: 5MB</p>
              
              <!-- Remove button -->
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
            <!-- Hidden file input -->
            <input 
              ref="bannerFileInput"
              type="file" 
              accept="image/*"
              class="hidden"
              @change="handleBannerChange"
            />
            
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-white">Tournament Banner</p>
                <p class="text-xs text-gray-500">Recommended: 1200x400px or similar wide format</p>
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
            
            <!-- Banner Preview/Placeholder -->
            <button 
              type="button"
              class="relative w-full h-32 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 group"
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
                <UIcon name="i-heroicons-photo" class="w-8 h-8" />
                <span class="text-xs mt-1">Add Banner</span>
              </div>
              
              <!-- Uploading indicator -->
              <div 
                v-if="uploadingBanner"
                class="absolute inset-0 bg-black/50 flex items-center justify-center"
              >
                <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 text-white animate-spin" />
              </div>
            </button>
          </div>

          <UFormField label="Tournament Name" name="name" required>
            <UInput 
              v-model="state.name" 
              placeholder="e.g. Premier Football League 2026"
              size="lg"
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
                <UIcon name="i-heroicons-arrow-path" class="w-3 h-3 animate-spin" />
                Checking availability...
              </span>
              <span v-else-if="nameAvailable === true" class="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <UIcon name="i-heroicons-check-circle" class="w-3 h-3" />
                Available! Your tournament will be at: <span class="font-medium">parascores.com/t/{{ state.customName }}</span>
              </span>
              <span v-else-if="nameAvailable === false" class="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <UIcon name="i-heroicons-x-circle" class="w-3 h-3" />
                This custom URL is already taken. Try another one.
              </span>
              <span v-else-if="nameCheckError" class="text-xs text-amber-600 dark:text-amber-400">
                {{ nameCheckError }}
              </span>
              <span v-else-if="state.customName" class="text-xs text-gray-500">
                Your tournament will be accessible at: <span class="font-medium text-indigo-500">parascores.com/t/{{ state.customName }}</span>
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
              <UInput 
                v-model="state.location" 
                placeholder="e.g. Lagos, Nigeria"
                icon="i-heroicons-map-pin"
                class="w-full"
              />
            </UFormField>
          </div>
        </div>
      </UCard>

      <!-- Tournament Format -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-trophy" class="w-5 h-5 text-indigo-500" />
            <span class="font-medium">Tournament Format</span>
          </div>
        </template>

        <div class="space-y-6">
          <UAlert
            icon="i-heroicons-question-mark-circle"
            color="primary"
            variant="subtle"
            title="Need help choosing?"
            description="Not sure what type of tournament to choose? Contact us let's help you choose."
          />

          <UFormField label="Tournament Type" name="type" required>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                v-for="opt in tournamentTypes"
                :key="opt.value"
                type="button"
                @click="state.type = opt.value"
                class="p-4 rounded-lg border-2 text-left transition-all"
                :class="[
                  state.type === opt.value
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                ]"
              >
                <p class="font-medium text-gray-900 dark:text-white">{{ opt.label }}</p>
                <p class="text-xs text-gray-500 mt-1">{{ opt.description }}</p>
              </button>
            </div>
          </UFormField>

          <UFormField label="Participant Type" name="participantType" required>
            <div class="flex gap-3">
              <button
                v-for="opt in participantTypes"
                :key="opt.value"
                type="button"
                @click="state.participantType = opt.value"
                class="flex-1 p-4 rounded-lg border-2 flex items-center gap-3 transition-all"
                :class="[
                  state.participantType === opt.value
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                ]"
              >
                <UIcon :name="opt.icon" class="w-5 h-5" />
                <span class="font-medium text-gray-900 dark:text-white">{{ opt.label }}</span>
              </button>
            </div>
          </UFormField>

          <UFormField label="Max Participants" name="maxParticipants">
            <UInput 
              v-model.number="state.maxParticipants" 
              type="number"
              placeholder="Leave empty for unlimited"
              :min="2"
              class="w-full md:w-1/2"
            />
          </UFormField>
        </div>
      </UCard>

      <!-- Schedule -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-calendar" class="w-5 h-5 text-indigo-500" />
            <span class="font-medium">Schedule</span>
          </div>
        </template>

        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField label="Start Date" name="start_date" required>
              <UPopover>
                <UButton 
                  variant="outline" 
                  color="neutral"
                  icon="i-heroicons-calendar"
                  class="w-full justify-start"
                  :class="!startDate && 'text-gray-400'"
                >
                  {{ formatDateDisplay(startDate) }}
                </UButton>
                <template #content>
                  <UCalendar 
                    v-model="startDate" 
                    :min-value="minDate"
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
                  class="w-full justify-start"
                  :class="!endDate && 'text-gray-400'"
                >
                  {{ formatDateDisplay(endDate) }}
                </UButton>
                <template #content>
                  <UCalendar 
                    v-model="endDate" 
                    :min-value="(startDate || minDate) as CalendarDate"
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
            />
          </UFormField>
        </div>
      </UCard>

      <!-- Visibility & Settings -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-cog-6-tooth" class="w-5 h-5 text-indigo-500" />
            <span class="font-medium">Visibility & Settings</span>
          </div>
        </template>

        <div class="space-y-6">
          <UFormField label="Visibility" name="visibility" required>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                v-for="opt in visibilityOptions"
                :key="opt.value"
                type="button"
                @click="state.visibility = opt.value"
                class="p-4 rounded-lg border-2 text-left transition-all"
                :class="[
                  state.visibility === opt.value
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                ]"
              >
                <div class="flex items-center gap-2 mb-1">
                  <UIcon :name="opt.icon" class="w-4 h-4 text-gray-400" />
                  <p class="font-medium text-gray-900 dark:text-white">{{ opt.label }}</p>
                </div>
                <p class="text-xs text-gray-500">{{ opt.description }}</p>
              </button>
            </div>
          </UFormField>

          <div class="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div>
              <p class="font-medium text-gray-900 dark:text-white">Auto-approve Participants</p>
              <p class="text-sm text-gray-500">Automatically approve new registrations</p>
            </div>
            <USwitch v-model="state.autoApprove" />
          </div>
        </div>
      </UCard>

      <!-- Submit -->
      <div class="flex items-center justify-end gap-3 pt-4">
        <UButton 
          label="Cancel" 
          variant="ghost" 
          color="neutral"
          size="lg"
          to="/"
        />
        <UButton 
          type="submit"
          label="Create Tournament" 
          icon="i-heroicons-plus"
          color="primary"
          size="lg"
          :loading="loading"
        />
      </div>
    </UForm>
  </div>
</template>
