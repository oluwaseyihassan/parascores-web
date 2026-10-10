<script setup lang="ts">
import { storeToRefs } from 'pinia'

definePageMeta({
  layout: 'feed',
  middleware: ['require-auth']
})

const authStore = useAuthStore()
const { user, isAuthenticated } = storeToRefs(authStore)
const { toMain } = useHost()
const { handleError } = useErrors()
const toast = useToast()

// Avatar upload
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)

const triggerUpload = () => fileInput.value?.click()

const handleAvatarChange = async (event: Event) => {
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

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await $api<{success: boolean, data: { url: string }}>('/upload/image?folder=profile', {
      method: 'POST',
      body: formData
    })

    if (response.data?.url) {
      authStore.setUser({ ...user.value!, picture: response.data.url })
      await authStore.updateUser({ ...user.value!, picture: response.data.url })
      toast.add({ title: 'Profile picture updated', color: 'success' })
    }
  } catch (err) {
    handleError(err, { title: 'Upload failed' })
  } finally {
    uploading.value = false
  }
}

// Name editing
const isEditing = ref(false)
const editName = ref('')
const updatingProfile = ref(false)

const startEditing = () => {
  editName.value = user.value?.name || ''
  isEditing.value = true
}

const handleUpdateProfile = async () => {
  if (!user.value) return
  updatingProfile.value = true
  try {
    const res = await $api<{success: boolean, data: any}>(`/users/${user.value.id}`, {
      method: 'PATCH',
      body: { name: editName.value }
    })

    if (res.success) {
      await authStore.fetchUser()
      toast.add({ title: 'Name updated', color: 'success' })
      isEditing.value = false
    }
  } catch (error: any) {
    handleError(error, { title: 'Update failed' })
  } finally {
    updatingProfile.value = false
  }
}

// Format date
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Player profiles
const playerProfiles = computed(() => user.value?.player_profiles || [])

// Player claim state
const showClaimModal = ref(false)
const claimCode = ref('')
const claimingPlayer = ref(false)
const verifiedPlayer = ref<any | null>(null)
const verifyingCode = ref(false)

const openPlayerClaim = () => {
  claimCode.value = ''
  verifiedPlayer.value = null
  showClaimModal.value = true
}

const handleVerifyClaimCode = async () => {
  if (!claimCode.value || claimCode.value.length < 6) return
  verifyingCode.value = true
  try {
    const res = await $api<{ success: boolean; data: any }>('/players/verify-claim-code', {
      method: 'POST',
      body: { code: claimCode.value }
    })
    if (res.success && res.data) {
      verifiedPlayer.value = res.data
    }
  } catch (err: any) {
    handleError(err, { title: 'Failed to verify claim code' })
  } finally {
    verifyingCode.value = false
  }
}

const handleClaimPlayer = async () => {
  if (!verifiedPlayer.value || !claimCode.value) return
  claimingPlayer.value = true
  try {
    const res = await $api<{ success: boolean; data: any; message: string }>('/players/claim', {
      method: 'POST',
      body: { code: claimCode.value }
    })
    if (res?.success) {
      toast.add({ title: 'Successfully claimed player profile! 🎉', color: 'success' })
      showClaimModal.value = false
      verifiedPlayer.value = null
      claimCode.value = ''
      await authStore.fetchUser()
    } else {
      throw new Error('Failed to claim player profile')
    }
  } catch (err: any) {
    handleError(err, { title: 'Claim failed' })
  } finally {
    claimingPlayer.value = false
  }
}

const getPositionLabel = (pos: string | null | undefined) => {
  const map: Record<string, string> = {
    GK: 'Goalkeeper',
    DEF: 'Defender',
    MID: 'Midfielder',
    FWD: 'Forward',
  }
  const cat = pos ? pos.split('-')[0] : ''
  return cat ? map[cat] || cat : 'Unknown'
}

// Unlink state
const showUnlinkModal = ref(false)
const profileToUnlink = ref<any | null>(null)
const unlinkingPlayer = ref(false)

const confirmUnlink = (profile: any) => {
  profileToUnlink.value = profile
  showUnlinkModal.value = true
}

const handleUnlinkPlayer = async () => {
  if (!profileToUnlink.value) return
  unlinkingPlayer.value = true
  try {
    await $api(`/players/${profileToUnlink.value.id}/unlink-profile`, {
      method: 'POST'
    })
    toast.add({ title: 'Successfully unlinked player profile!', color: 'success' })
    showUnlinkModal.value = false
    profileToUnlink.value = null
    await authStore.fetchUser()
  } catch (err: any) {
    handleError(err, { title: 'Failed to unlink player profile' })
  } finally {
    unlinkingPlayer.value = false
  }
}

useSeoMeta({
  title: 'My Profile | ParaScores',
  description: 'View and manage your ParaScores profile.'
})
</script>

<template>
  <div class="max-w-2xl mx-auto px-6 py-12">
    <!-- Back Button -->
    <div class="mb-6">
      <UButton
        variant="ghost"
        color="neutral"
        size="sm"
        icon="i-heroicons-arrow-left"
        label="Back"
        @click="$router.back()"
      />
    </div>

    <!-- Profile Dashboard -->
    <div class="space-y-6">
      <!-- Header -->
      <div class="mb-10">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">My Profile</h1>
        <p class="text-gray-600 dark:text-gray-400">Your account overview</p>
      </div>
      <!-- Profile Card -->
      <UCard class="bg-white dark:bg-[#0A0A0A] border-gray-200 dark:border-white/5 shadow-sm overflow-hidden transition-colors">
        <div class="flex flex-col sm:flex-row items-center gap-8 py-4">
          <!-- Avatar -->
          <div class="relative group flex flex-col items-center">
            <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleAvatarChange" />
            <button
              @click="triggerUpload"
              class="relative rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ring-offset-white dark:ring-offset-[#0A0A0A]"
              :disabled="uploading"
            >
              <UAvatar
                v-if="user?.picture"
                :src="user.picture"
                size="3xl"
                class="ring-4 ring-gray-100 dark:ring-white/5"
              />
              <UAvatar
                v-else
                :text="user?.name?.charAt(0).toUpperCase()"
                size="3xl"
                class="bg-emerald-500 text-white font-bold text-3xl ring-4 ring-gray-100 dark:ring-white/5"
              />

              <div class="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <UIcon v-if="!uploading" name="i-heroicons-camera" class="w-8 h-8 text-white" />
                <UIcon v-else name="i-heroicons-arrow-path" class="w-8 h-8 text-white animate-spin" />
              </div>
            </button>
            <p class="text-[10px] text-gray-400 text-center mt-2 font-medium">Click to change</p>
          </div>

          <!-- Info -->
          <div class="flex-1 text-center sm:text-left">
            <template v-if="!isEditing">
              <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-1">{{ user?.name }}</h2>
              <p class="text-sm text-gray-600 dark:text-gray-500 mb-1">{{ user?.email }}</p>
              <p v-if="user?.created_at" class="text-xs text-gray-400 dark:text-gray-600 mb-4">
                Member since {{ formatDate(user.created_at) }}
              </p>
              <UButton
                variant="soft"
                color="neutral"
                size="sm"
                icon="i-heroicons-pencil-square"
                @click="startEditing"
                class="rounded-xl font-bold"
              >
                Edit Name
              </UButton>
            </template>
            <div v-else class="space-y-4 max-w-sm">
              <UInput v-model="editName" placeholder="Full Name" size="lg" />
              <div class="flex gap-2">
                <UButton color="success" size="sm" :loading="updatingProfile" @click="handleUpdateProfile">Save</UButton>
                <UButton variant="ghost" color="neutral" size="sm" @click="isEditing = false;">Cancel</UButton>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Player Profiles Section -->
      <UCard
        class="bg-white dark:bg-[#0A0A0A] border-gray-200 dark:border-white/5 shadow-sm overflow-hidden transition-colors"
      >
        <div class="flex items-center justify-between mb-5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <UIcon name="i-heroicons-identification" class="w-6 h-6" />
            </div>
            <h3 class="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-[11px]">Player Profiles</h3>
          </div>
          <UButton
            icon="i-heroicons-link"
            size="xs"
            color="success"
            variant="soft"
            class="rounded-xl font-bold"
            @click="openPlayerClaim"
          >
            Link Player Profile
          </UButton>
        </div>

        <div v-if="playerProfiles.length === 0" class="text-center py-6 text-gray-400">
          <p class="text-xs mb-4">You have not linked any player profiles to your account yet.</p>
          <UButton
            icon="i-heroicons-link"
            size="sm"
            color="success"
            class="rounded-xl font-bold px-4"
            @click="openPlayerClaim"
          >
            Link Player Profile
          </UButton>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="profile in playerProfiles"
            :key="profile.id"
            class="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group"
          >
            <NuxtLink
              :to="toMain(`/player/${profile.id}`)"
              class="flex items-center gap-4 flex-1 min-w-0"
            >
              <UAvatar
                v-if="profile.avatarUrl"
                :src="profile.avatarUrl"
                size="sm"
                class="ring-2 ring-gray-100 dark:ring-white/5"
              />
              <div
                v-else
                class="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-xs font-bold shrink-0"
              >
                {{ profile.name?.charAt(0).toUpperCase() }}
              </div>

              <div class="flex-1 min-w-0">
                <p class="font-bold text-sm text-gray-900 dark:text-white group-hover:text-emerald-500 transition-colors truncate font-medium">
                  {{ profile.name }}
                </p>
                <p v-if="profile.participant?.tournament?.name" class="text-[10px] text-gray-400 dark:text-gray-600 font-bold truncate">
                  {{ profile.participant.tournament.name }}
                  <span v-if="profile.number"> • #{{ profile.number }}</span>
                </p>
              </div>
            </NuxtLink>

            <UButton
              icon="i-heroicons-link-slash"
              size="xs"
              color="error"
              variant="ghost"
              class="rounded-xl opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
              @click="confirmUnlink(profile)"
            />
          </div>
        </div>
      </UCard>

      <!-- Quick Links Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Settings -->
        <UCard class="bg-white dark:bg-[#0A0A0A] border-gray-200 dark:border-white/5 shadow-sm hover:border-emerald-500/20 dark:hover:border-white/10 transition-colors">
          <div class="flex flex-col h-full">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                <UIcon name="i-heroicons-cog-6-tooth" class="w-6 h-6" />
              </div>
              <h3 class="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-[11px]">Settings</h3>
            </div>
            <p class="text-xs text-gray-600 dark:text-gray-500 mb-6 flex-1">Password, security and account preferences.</p>
            <UButton
              to="/settings"
              variant="outline"
              color="neutral"
              class="w-full justify-center rounded-xl font-bold"
            >
              Open Settings
            </UButton>
          </div>
        </UCard>

        <!-- My Teams -->
        <UCard class="bg-white dark:bg-[#0A0A0A] border-gray-200 dark:border-white/5 shadow-sm hover:border-emerald-500/20 dark:hover:border-white/10 transition-colors">
          <div class="flex flex-col h-full">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <UIcon name="i-heroicons-user-group" class="w-6 h-6" />
              </div>
              <h3 class="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-[11px]">My Teams</h3>
            </div>
            <p class="text-xs text-gray-600 dark:text-gray-500 mb-6 flex-1">Manage your persistent team profiles.</p>
            <UButton
              to="/teams"
              variant="outline"
              color="success"
              class="w-full justify-center rounded-xl font-bold"
            >
              View Teams
            </UButton>
          </div>
        </UCard>

        <!-- Following -->
        <UCard class="bg-white dark:bg-[#0A0A0A] border-gray-200 dark:border-white/5 shadow-sm hover:border-emerald-500/20 dark:hover:border-white/10 transition-colors">
          <div class="flex flex-col h-full">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                <UIcon name="i-heroicons-heart" class="w-6 h-6" />
              </div>
              <h3 class="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-[11px]">Following</h3>
            </div>
            <p class="text-xs text-gray-600 dark:text-gray-500 mb-6 flex-1">Tournaments and teams you follow.</p>
            <UButton
              to="/following"
              variant="outline"
              color="neutral"
              class="w-full justify-center rounded-xl font-bold"
            >
              Manage Following
            </UButton>
          </div>
        </UCard>
      </div>
    </div>
  </div>

  <!-- Claim Player Modal -->
  <UModal v-model:open="showClaimModal">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-link" class="w-5 h-5 text-indigo-500" />
            <span class="font-semibold text-gray-900 dark:text-white">Link Player Profile</span>
          </div>
          <p v-if="!verifiedPlayer" class="text-sm text-gray-500 mt-2">
            Enter the 6-digit code provided by the tournament organizer to link your user account to your player profile.
          </p>
          <p v-else class="text-sm text-gray-500 mt-2">
            Please verify the player details before making the verification payment.
          </p>
        </template>

        <!-- Phase 1: Enter code -->
        <div v-if="!verifiedPlayer" class="space-y-4">
          <UFormField label="Link Code" name="claimCode">
            <UInput 
              v-model="claimCode" 
              placeholder="e.g. A1B2C3" 
              size="lg"
              class="font-mono text-center tracking-[0.2em]"
              maxlength="6"
              @keyup.enter="handleVerifyClaimCode"
            />
          </UFormField>
          <div class="flex justify-end gap-3 mt-6">
            <UButton color="neutral" variant="ghost" @click="showClaimModal = false;">Cancel</UButton>
            <UButton 
              color="primary" 
              :loading="verifyingCode"
              :disabled="!claimCode || claimCode.length < 6"
              @click="handleVerifyClaimCode"
            >
              Verify Code
            </UButton>
          </div>
        </div>

        <!-- Phase 2: Show details & checkout button -->
        <div v-else class="space-y-6">
          <div class="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10 space-y-3">
            <div class="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-white/5">
              <span class="text-xs text-gray-400 font-bold uppercase tracking-wider">Player Name</span>
              <span class="text-sm font-black text-gray-900 dark:text-white">{{ verifiedPlayer.name }}</span>
            </div>
            <div v-if="verifiedPlayer.number" class="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-white/5">
              <span class="text-xs text-gray-400 font-bold uppercase tracking-wider">Shirt Number</span>
              <span class="text-sm font-black text-emerald-500 font-mono">#{{ verifiedPlayer.number }}</span>
            </div>
            <div v-if="verifiedPlayer.position" class="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-white/5">
              <span class="text-xs text-gray-400 font-bold uppercase tracking-wider">Position</span>
              <span class="text-sm font-black text-gray-900 dark:text-white">{{ getPositionLabel(verifiedPlayer.position) }}</span>
            </div>
            <div class="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-white/5">
              <span class="text-xs text-gray-400 font-bold uppercase tracking-wider">Team</span>
              <span class="text-sm font-black text-gray-900 dark:text-white truncate max-w-[180px]">{{ verifiedPlayer.teamName }}</span>
            </div>
            <div class="flex justify-between items-center py-1.5">
              <span class="text-xs text-gray-400 font-bold uppercase tracking-wider">Tournament</span>
              <span class="text-sm font-black text-gray-900 dark:text-white truncate max-w-[180px]">{{ verifiedPlayer.tournamentName }}</span>
            </div>
          </div>

          <div class="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex gap-3">
            <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <p class="text-xs text-emerald-700 dark:text-emerald-400 font-medium leading-relaxed">
              Claiming a profile is free. Confirm the details above are you, then link the profile to your account.
            </p>
          </div>

          <div class="flex justify-end gap-3">
            <UButton color="neutral" variant="ghost" @click="verifiedPlayer = null;" :disabled="claimingPlayer">Back</UButton>
            <UButton
              color="primary"
              :loading="claimingPlayer"
              @click="handleClaimPlayer"
            >
              Link Profile
            </UButton>
          </div>
        </div>
      </UCard>
    </template>
  </UModal>

  <!-- Unlink Profile Confirmation Modal -->
  <UModal v-model:open="showUnlinkModal">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-rose-500" />
            <span class="font-semibold text-gray-900 dark:text-white">Unlink Player Profile</span>
          </div>
          <p class="text-sm text-gray-500 mt-2">
            Are you sure you want to unlink <strong>{{ profileToUnlink?.name }}</strong> from your account? You will lose edit access to this player profile.
          </p>
        </template>

        <div class="flex justify-end gap-3 mt-4">
          <UButton color="neutral" variant="ghost" @click="showUnlinkModal = false;" :disabled="unlinkingPlayer">Cancel</UButton>
          <UButton 
            color="error" 
            :loading="unlinkingPlayer"
            @click="handleUnlinkPlayer"
          >
            Unlink Profile
          </UButton>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
