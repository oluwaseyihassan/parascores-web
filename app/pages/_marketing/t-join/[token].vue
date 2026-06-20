<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTournamentInviteStore } from '~/stores/tournamentInvite'
import { useAuthStore } from '~/stores/auth'
import { usePaymentStore } from '~/stores/payment'
import { useTeamStore } from '~/stores/team'
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'

definePageMeta({
  auth: false,
  layout: 'feed'
})

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const inviteStore = useTournamentInviteStore()
const teamStore = useTeamStore()

const token = route.params.token as string
const error = ref<string | null>(null)
const submitting = ref(false)
const successMessage = ref<string | null>(null)
const joinStatus = ref<string | null>(null)
const verifyingPayment = ref(false)
const verificationSuccess = ref(false)
const paymentStore = usePaymentStore()

const selectedTeamId = ref<string | 'new'>('new')
const formState = ref({
  customName: '',
  customShortName: '',
  logoUrl: ''
})

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
  
  if (!file.type.startsWith('image/')) {
    error.value = 'Please select an image file'
    return
  }
  
  if (file.size > 5 * 1024 * 1024) {
    error.value = 'Image must be less than 5MB'
    return
  }
  
  error.value = null
  logoFile.value = file
  logoPreview.value = URL.createObjectURL(file)
}

const removeLogo = () => {
  logoFile.value = null
  logoPreview.value = null
  formState.value.logoUrl = ''
  if (logoFileInput.value) {
    logoFileInput.value.value = ''
  }
}


const schema = z.object({
  customName: z.string().min(2, 'Team name must be at least 2 characters').optional().or(z.literal('')),
  customShortName: z.string().max(10, 'Short name must be 10 characters or less').optional().or(z.literal('')),
  logoUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  teamId: z.string().optional()
})

type Schema = z.output<typeof schema>

onMounted(async () => {
  if (!token) {
    error.value = 'Invalid invite link'
    return
  }

  const reference = route.query.reference as string
  if (reference) {
    verifyingPayment.value = true
    try {
      const res = await paymentStore.verifyPayment(reference)
      if (res?.success) {
        verificationSuccess.value = true
        successMessage.value = 'Registration Payment Verified! 🎉'
        joinStatus.value = 'CONFIRMED'
        
        // Fetch invite details to get tournament context for redirect
        await inviteStore.getInviteByToken(token)

        setTimeout(() => {
          if (invite.value?.tournament?.customName) {
            router.push(`/t/${invite.value.tournament.customName}`)
          } else if (invite.value?.tournament?.id) {
            router.push(`/t/${invite.value.tournament.id}`)
          }
        }, 3000)
      } else {
        error.value = 'Payment verification failed. Please contact support.'
      }
    } catch (err: any) {
      error.value = err.data?.message || 'Payment verification failed. Please contact support.'
    } finally {
      verifyingPayment.value = false
    }
    return
  }

  try {
    const promises: Promise<any>[] = [inviteStore.getInviteByToken(token)]
    if (authStore.isAuthenticated) {
      promises.push(teamStore.loadMyTeams())
    }
    await Promise.all(promises)
    
    // Auto-select first team if available
    const firstTeam = teamStore.teams[0]
    if (firstTeam) {
      selectedTeamId.value = firstTeam.id
    }
  } catch (err: any) {
    error.value = err.data?.message || 'Failed to load details'
  }
})

const invite = computed(() => inviteStore.currentInvite)
const myTeams = computed(() => teamStore.teams)

const handleJoin = async (event: FormSubmitEvent<Schema>) => {
  if (!authStore.isAuthenticated) {
    router.push(`/login?redirect=/t-join/${token}`)
    return
  }

  submitting.value = true
  error.value = null

  try {
    let teamId = selectedTeamId.value === 'new' ? undefined : selectedTeamId.value
    let finalLogoUrl = formState.value.logoUrl

    // If "New Team" is selected, handle logo upload if provided
    if (selectedTeamId.value === 'new') {
      if (logoFile.value) {
        uploadingLogo.value = true
        try {
          const formData = new FormData()
          formData.append('file', logoFile.value)
          const uploadResponse = await $api<{success: boolean, data: { url: string }, message: string}>('/upload/image?folder=teams', {
            method: 'POST',
            body: formData
          })
          finalLogoUrl = uploadResponse.data.url
        } finally {
          uploadingLogo.value = false
        }
      }

      // Create the team profile first
      const newTeam = await teamStore.createTeam({
        name: event.data.customName!,
        logoUrl: finalLogoUrl || undefined
      })
      teamId = newTeam.id
    }

      // Check if tournament requires paid registration
    if (invite.value?.tournament?.isPaidRegistration) {
      const callbackUrl = window.location.origin + window.location.pathname
      const response = await paymentStore.initializeRegistration({
        tournamentId: invite.value.tournament.id,
        teamId,
        customName: selectedTeamId.value === 'new' ? event.data.customName : undefined,
        customShortName: selectedTeamId.value === 'new' ? event.data.customShortName : undefined,
        logoUrl: selectedTeamId.value === 'new' ? finalLogoUrl : undefined,
        token,
        callbackUrl,
      })

      if (response?.data?.authorization_url) {
        window.location.href = response.data.authorization_url
        return
      } else {
        throw new Error('Failed to initialize registration checkout URL')
      }
    }

    const response = await inviteStore.acceptInvite(token, {
      teamId,
      customName: selectedTeamId.value === 'new' ? event.data.customName : undefined,
      customShortName: selectedTeamId.value === 'new' ? event.data.customShortName : undefined,
      logoUrl: selectedTeamId.value === 'new' ? finalLogoUrl : undefined
    })
    
    successMessage.value = response.message
    joinStatus.value = response.status

    setTimeout(() => {
      if (invite.value?.tournament?.customName) {
        router.push(`/t/${invite.value.tournament.customName}`)
      } else if (invite.value?.tournament?.id) {
        router.push(`/t/${invite.value.tournament.id}`)
      }
    }, 3000)
  } catch (err: any) {
    error.value = err.data?.message || err?.message || 'Failed to join tournament'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="py-12 px-4 max-w-4xl mx-auto">
    <div class="max-w-md mx-auto">
      <!-- Verifying Payment State -->
      <div v-if="verifyingPayment" class="text-center py-12 bg-white dark:bg-[#111] p-8 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm w-full">
        <UIcon name="i-heroicons-arrow-path" class="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-4" />
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Verifying Registration...</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Please do not close or refresh this page.</p>
      </div>

      <!-- Loading State -->
      <div v-else-if="inviteStore.loading" class="text-center py-12">
        <UIcon name="i-heroicons-arrow-path" class="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-4" />
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Loading invite...</h2>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-white dark:bg-[#111] p-8 rounded-2xl border border-red-500/20 text-center shadow-sm">
        <UIcon name="i-heroicons-exclamation-circle" class="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 class="text-xl font-bold text-gray-900 dark:text-white">Invalid Invite</h2>
        <p class="text-gray-500 dark:text-gray-400 mt-2">{{ error }}</p>
        <UButton to="/" class="mt-6" variant="ghost" color="neutral">Back to Home</UButton>
      </div>

      <!-- Valid Invite State -->
      <div v-else-if="invite && invite.isValid" class="space-y-6">
        <!-- Tournament Header -->
        <div class="text-center">
          <UAvatar 
            v-if="invite.tournament?.logoUrl"
            :src="invite.tournament.logoUrl"
            :alt="invite.tournament.name"
            size="3xl"
            class="mx-auto mb-4 ring-2 ring-emerald-500/20"
          />
          <UAvatar
            v-else
            :alt="invite.tournament?.name"
            size="3xl"
            class="mx-auto mb-4 bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-300"
          />
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Join {{ invite.tournament?.name }}
          </h2>
          
          <div v-if="invite.tournament?.isPaidRegistration" class="inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
            <UIcon name="i-heroicons-banknotes" class="w-4 h-4" />
            <span>Registration Fee: ₦{{ (((invite.tournament.registrationFee ?? 0) / 100)).toLocaleString() }}</span>
          </div>

          <p class="text-gray-500 dark:text-gray-400 text-sm mt-2">
            Fill in the details to register your team.
          </p>
        </div>

        <!-- Join Form Card -->
        <div class="bg-white dark:bg-[#111] rounded-2xl border border-gray-200 dark:border-white/10 p-6 sm:p-8 shadow-sm">
          <!-- Success State -->
          <div v-if="successMessage" class="text-center py-6 animate-in fade-in zoom-in duration-300">
            <UIcon name="i-heroicons-check-circle" class="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">{{ successMessage }}</h3>
            <p class="text-gray-500 text-sm mt-2">Redirecting you to the tournament page...</p>
          </div>

          <!-- The Form -->
          <UForm v-else :schema="schema" :state="formState" class="space-y-6" @submit="handleJoin">
            
            <UFormField v-if="authStore.isAuthenticated && myTeams.length > 0" label="Select Team" name="teamId">
              <USelect
                v-model="selectedTeamId"
                size="lg"
                class="rounded-xl"
                :items="[
                  ...myTeams.map(t => ({ label: t.name, value: t.id })),
                  { label: '+ Create New Team Profile', value: 'new' }
                ]"
              />
            </UFormField>

            <!-- New Team Section -->
            <div v-if="selectedTeamId === 'new'" class="space-y-6 pt-4 border-t border-gray-100 dark:border-white/5 animate-in fade-in duration-300">
              <UFormField label="New Team Name" name="customName">
                <UInput v-model="formState.customName" placeholder="Enter team name" size="lg" />
              </UFormField>

              <UFormField label="Short Name (Optional)" name="customShortName">
                <UInput v-model="formState.customShortName" placeholder="e.g. MUN" size="lg" :maxlength="10" />
              </UFormField>

              <UFormField label="Team Logo (Optional)" name="logoUrl">
                <div class="flex items-center gap-4">
                  <div 
                    class="relative w-16 h-16 rounded-xl border border-gray-200 dark:border-white/10 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-white/5 cursor-pointer"
                    @click="triggerLogoInput"
                  >
                    <img v-if="logoPreview" :src="logoPreview" class="w-full h-full object-cover" />
                    <UIcon v-else name="i-heroicons-camera" class="w-6 h-6 text-gray-400" />
                    <div v-if="uploadingLogo" class="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-white" />
                    </div>
                  </div>
                  
                  <div>
                    <input type="file" ref="logoFileInput" class="hidden" accept="image/*" @change="handleLogoChange" />
                    <UButton size="xs" variant="soft" color="neutral" @click="triggerLogoInput">
                      {{ logoPreview ? 'Change' : 'Upload' }}
                    </UButton>
                    <UButton v-if="logoPreview" size="xs" variant="ghost" color="error" @click="removeLogo" class="ml-2">
                      Remove
                    </UButton>
                  </div>
                </div>
              </UFormField>
            </div>

            <!-- Auth Help -->
            <div v-if="!authStore.isAuthenticated" class="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10 text-center">
              <p class="text-sm text-gray-600 dark:text-gray-400">Login is required to register.</p>
            </div>

            <UButton 
              type="submit" 
              block 
              size="lg" 
              :loading="submitting || uploadingLogo"
              color="primary"
              class="rounded-xl font-bold"
            >
              <template v-if="!authStore.isAuthenticated">
                Login to Join
              </template>
              <template v-else-if="invite.tournament?.isPaidRegistration">
                Pay ₦{{ (((invite.tournament.registrationFee ?? 0) / 100)).toLocaleString() }} & Register
              </template>
              <template v-else>
                {{ selectedTeamId === 'new' ? 'Register Team' : 'Join Tournament' }}
              </template>
            </UButton>
          </UForm>
        </div>
      </div>
    </div>
  </div>
</template>


