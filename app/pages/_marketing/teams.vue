<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useTeamStore } from '~/stores/team'
import { useToast } from '#imports'
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'

definePageMeta({
  middleware: [
    (to) => {
      const authStore = useAuthStore()
      if (!authStore.isAuthenticated) {
        return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
      }
    }
  ],
  layout: 'feed'
})

const teamStore = useTeamStore()
const toast = useToast()
const { handleError } = useErrors()

const showCreateModal = ref(false)
const editingTeam = ref<any>(null)

const formState = reactive({
  name: '',
  logoUrl: ''
})

// Claim Participant state
const showClaimModal = ref(false)
const claimCode = ref('')
const claimingParticipant = ref(false)
const selectedTeamForClaim = ref<any>(null)

const openClaim = (team: any) => {
  selectedTeamForClaim.value = team
  claimCode.value = ''
  showClaimModal.value = true
}

const handleClaimParticipant = async () => {
  if (!selectedTeamForClaim.value || !claimCode.value) return
  
  claimingParticipant.value = true
  try {
    await $api(`/teams/${selectedTeamForClaim.value.id}/claim-participant`, {
      method: 'POST',
      body: { code: claimCode.value }
    })
    toast.add({ title: 'Successfully linked team profile!', color: 'success' })
    showClaimModal.value = false
    claimCode.value = ''
    teamStore.loadMyTeams()
  } catch (err: any) {
    handleError(err, { title: 'Failed to claim participant' })
  } finally {
    claimingParticipant.value = false
  }
}

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
    toast.add({ title: 'Please select an image file', color: 'error' })
    return
  }
  
  if (file.size > 5 * 1024 * 1024) {
    toast.add({ title: 'Image must be less than 5MB', color: 'error' })
    return
  }
  
  logoFile.value = file
  logoPreview.value = URL.createObjectURL(file)
}

const removeLogo = () => {
  logoFile.value = null
  logoPreview.value = null
  formState.logoUrl = ''
  if (logoFileInput.value) {
    logoFileInput.value.value = ''
  }
}


const schema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters'),
  logoUrl: z.string().url('Must be a valid URL').optional().or(z.literal(''))
})

type Schema = z.output<typeof schema>

onMounted(() => {
  teamStore.loadMyTeams()
})

const openCreate = () => {
  editingTeam.value = null
  formState.name = ''
  formState.logoUrl = ''
  logoFile.value = null
  logoPreview.value = null
  showCreateModal.value = true
}


const openEdit = (team: any) => {
  editingTeam.value = team
  formState.name = team.name
  formState.logoUrl = team.logoUrl || ''
  logoFile.value = null
  logoPreview.value = team.logoUrl || null
  showCreateModal.value = true
}


const handleSubmit = async (event: FormSubmitEvent<Schema>) => {
  try {
    uploadingLogo.value = true
    let finalLogoUrl = formState.logoUrl

    if (logoFile.value) {
      const formData = new FormData()
      formData.append('file', logoFile.value)
      const uploadResponse = await $api<{success: boolean, data: { url: string }, message: string}>('/upload/image?folder=teams', {
        method: 'POST',
        body: formData
      })
      finalLogoUrl = uploadResponse.data.url
    }

    const payload = {
      ...event.data,
      logoUrl: finalLogoUrl
    }

    if (editingTeam.value) {
      await teamStore.updateTeam(editingTeam.value.id, payload)
      toast.add({ title: 'Team updated successfully', color: 'success' })
    } else {
      await teamStore.createTeam(payload)
      toast.add({ title: 'Team profile created', color: 'success' })
    }
    showCreateModal.value = false
  } catch (err) {
    handleError(err, { title: 'Action failed' })
  } finally {
    uploadingLogo.value = false
  }
}


useSeoMeta({
  title: 'My Teams | ParaScores',
  description: 'Manage your persistent team profiles on ParaScores.'
})
</script>

<template>
  <div class="max-w-4xl mx-auto px-6 py-12">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4 mb-10">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">My Team Profiles</h1>
        <p class="text-gray-600 dark:text-gray-400 text-sm">Create once, join many. Your persistent identities across ParaScores.</p>
      </div>
      <UButton 
        icon="i-heroicons-plus" 
        size="lg" 
        class="rounded-xl font-bold shadow-lg shadow-emerald-500/10"
        color="success"
        @click="openCreate"
      >
        Create Team
      </UButton>
    </div>

    <!-- Loading State -->
    <div v-if="teamStore.loading && teamStore.teams.length === 0" class="flex justify-center py-20">
      <UIcon name="i-heroicons-arrow-path" class="w-10 h-10 animate-spin text-emerald-500" />
    </div>

    <!-- Empty State -->
    <UCard v-else-if="teamStore.teams.length === 0" class="bg-white dark:bg-[#0A0A0A] border-gray-200 dark:border-white/5 shadow-sm text-center py-16">
      <div class="flex flex-col items-center">
        <div class="w-20 h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 text-emerald-500">
          <UIcon name="i-heroicons-user-group" class="w-10 h-10" />
        </div>
        <h3 class="text-xl font-bold text-gray-900 dark:text-white">No Team Profiles Yet</h3>
        <p class="text-sm text-gray-600 dark:text-gray-500 max-w-sm mt-2 mb-8">
          Create a team profile once and use it to register for any tournament on ParaScores without re-entering details.
        </p>
        <UButton size="lg" class="rounded-xl font-bold px-8" color="success" @click="openCreate">Create Your First Team</UButton>
      </div>
    </UCard>

    <!-- Teams List -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <UCard 
        v-for="team in teamStore.teams" 
        :key="team.id" 
        class="bg-white dark:bg-[#0A0A0A] border-gray-200 dark:border-white/5 shadow-sm hover:border-emerald-500/20 dark:hover:border-white/10 transition-all group overflow-hidden"
      >
        <div class="flex items-center gap-5">
          <UAvatar 
            v-if="team.logoUrl"
            :src="team.logoUrl" 
            :alt="team.name" 
            size="xl" 
            class="ring-4 ring-gray-50 dark:ring-white/5"
          />
          <UAvatar
            v-else
            :text="team.name.charAt(0).toUpperCase()"
            size="xl"
            class="bg-emerald-500 text-white font-bold ring-4 ring-gray-50 dark:ring-white/5"
          />
          
          <div class="flex-1 min-w-0">
            <h3 class="text-lg font-bold text-gray-900 dark:text-white truncate group-hover:text-emerald-500 transition-colors">{{ team.name }}</h3>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
              <p class="text-[10px] uppercase tracking-wider font-bold text-gray-500 flex items-center gap-1">
                <UIcon name="i-heroicons-calendar" class="w-3 h-3" />
                Since {{ new Date(team.created_at).toLocaleDateString() }}
              </p>
              <NuxtLink :to="`/team/${team.id}`" target="_blank" class="text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-1 group/link">
                Public Profile
                <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-2.5 h-2.5 transition-transform group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5" />
              </NuxtLink>
            </div>
          </div>

          <div class="flex items-center gap-1 shrink-0">
            <UButton 
              icon="i-heroicons-link" 
              color="neutral" 
              variant="soft" 
              size="sm"
              class="rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" 
              @click="openClaim(team)" 
              title="Link to Tournament"
            />
            <UButton 
              icon="i-heroicons-pencil-square" 
              color="neutral" 
              variant="ghost" 
              class="rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" 
              @click="openEdit(team)" 
            />
          </div>
        </div>
      </UCard>
    </div>

    <!-- Create/Edit Modal -->
    <UModal v-model:open="showCreateModal">
      <template #content>
        <UCard class="bg-white dark:bg-[#111] border-gray-200 dark:border-white/5 shadow-2xl">
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-xl font-bold text-gray-900 dark:text-white">
                {{ editingTeam ? 'Edit Team Profile' : 'New Team Profile' }}
              </h3>
              <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" @click="showCreateModal = false" />
            </div>
          </template>

          <UForm :schema="schema" :state="formState" @submit="handleSubmit" class="space-y-6 py-2">
            <UFormField label="Team Name" name="name" help="Visible to tournament organizers">
              <UInput v-model="formState.name" placeholder="e.g. Manchester United" size="lg" />
            </UFormField>

            <UFormField label="Team Logo" name="logoUrl" help="A crest or photo for your team">
              <div class="flex items-center gap-4">
                <div 
                  class="relative w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-white/5 cursor-pointer hover:border-emerald-500/50 transition-colors group"
                  @click="triggerLogoInput"
                >
                  <img v-if="logoPreview" :src="logoPreview" class="w-full h-full object-cover" />
                  <div v-else class="flex flex-col items-center text-gray-400 group-hover:text-emerald-500">
                    <UIcon name="i-heroicons-camera" class="w-8 h-8 mb-1" />
                    <span class="text-[10px] font-medium">Upload</span>
                  </div>
                  <div v-if="uploadingLogo" class="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-white" />
                  </div>
                </div>
                
                <div class="flex-1">
                  <input 
                    type="file" 
                    ref="logoFileInput" 
                    class="hidden" 
                    accept="image/*"
                    @change="handleLogoChange"
                  />
                  <div class="flex gap-2">
                    <UButton size="xs" variant="soft" color="neutral" @click="triggerLogoInput">
                      {{ logoPreview ? 'Change Photo' : 'Choose Photo' }}
                    </UButton>
                    <UButton v-if="logoPreview" size="xs" variant="ghost" color="error" @click="removeLogo">
                      Remove
                    </UButton>
                  </div>
                  <p class="text-[11px] text-gray-500 mt-2">JPG, PNG or GIF. Max 5MB.</p>
                </div>
              </div>
            </UFormField>


            <div class="flex justify-end gap-3 mt-8">
              <UButton variant="ghost" color="neutral" class="rounded-xl font-bold" @click="showCreateModal = false">Cancel</UButton>
              <UButton type="submit" color="success" :loading="teamStore.loading || uploadingLogo" class="rounded-xl font-bold px-6 shadow-lg shadow-emerald-500/20">
                {{ editingTeam ? 'Update Profile' : 'Create Profile' }}
              </UButton>
            </div>
          </UForm>
        </UCard>
      </template>
    </UModal>
    <!-- Claim Participant Modal -->
    <UModal v-model:open="showClaimModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-link" class="w-5 h-5 text-indigo-500" />
              <span class="font-semibold text-gray-900 dark:text-white">Link to Tournament</span>
            </div>
            <p class="text-sm text-gray-500 mt-2">
              Enter the 6-digit code provided by the tournament organizer to link <strong>{{ selectedTeamForClaim?.name }}</strong> to their tournament entry.
            </p>
          </template>

          <UFormField label="Link Code" name="claimCode">
            <UInput 
              v-model="claimCode" 
              placeholder="e.g. A1B2C3" 
              size="lg"
              class="font-mono text-center tracking-[0.2em]"
              maxlength="6"
              @keyup.enter="handleClaimParticipant"
            />
          </UFormField>

          <div class="flex justify-end gap-3 mt-6">
            <UButton color="neutral" variant="ghost" @click="showClaimModal = false">Cancel</UButton>
            <UButton 
              color="primary" 
              :loading="claimingParticipant"
              :disabled="!claimCode || claimCode.length < 6"
              @click="handleClaimParticipant"
            >
              Link Profile
            </UButton>
          </div>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
