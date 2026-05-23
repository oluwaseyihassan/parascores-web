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

useSeoMeta({
  title: 'My Profile | ParaScores',
  description: 'View and manage your ParaScores profile.'
})
</script>

<template>
  <div class="max-w-2xl mx-auto px-6 py-12">
    <!-- Header -->
    <div class="mb-10">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">My Profile</h1>
      <p class="text-gray-600 dark:text-gray-400">Your account overview</p>
    </div>

    <div class="space-y-6">
      <!-- Profile Card -->
      <UCard class="bg-white dark:bg-[#0A0A0A] border-gray-200 dark:border-white/5 shadow-sm overflow-hidden transition-colors">
        <div class="flex flex-col sm:flex-row items-center gap-8 py-4">
          <!-- Avatar -->
          <div class="relative group">
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
                <UButton variant="ghost" color="neutral" size="sm" @click="isEditing = false">Cancel</UButton>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Player Profiles Section -->
      <UCard
        v-if="playerProfiles.length > 0"
        class="bg-white dark:bg-[#0A0A0A] border-gray-200 dark:border-white/5 shadow-sm overflow-hidden transition-colors"
      >
        <div class="flex items-center gap-3 mb-5">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <UIcon name="i-heroicons-identification" class="w-6 h-6" />
          </div>
          <h3 class="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-[11px]">Player Profiles</h3>
        </div>

        <div class="space-y-2">
          <NuxtLink
            v-for="profile in playerProfiles"
            :key="profile.id"
            :to="toMain(`/player/${profile.id}`)"
            class="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group"
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
              <p class="font-bold text-sm text-gray-900 dark:text-white group-hover:text-emerald-500 transition-colors truncate">
                {{ profile.name }}
              </p>
              <p v-if="profile.participant?.tournament?.name" class="text-[10px] text-gray-400 dark:text-gray-600 font-bold truncate">
                {{ profile.participant.tournament.name }}
                <span v-if="profile.number"> • #{{ profile.number }}</span>
              </p>
            </div>

            <UIcon name="i-heroicons-arrow-right" class="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-emerald-500 transition-colors shrink-0" />
          </NuxtLink>
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
</template>
