<script setup lang="ts">
import { storeToRefs } from 'pinia'

definePageMeta({
  layout: 'feed'
})

const authStore = useAuthStore()
const { user } = storeToRefs(authStore)
const { toMain } = useHost()
const { handleError } = useErrors()
const toast = useToast()

// Profile Logic
const isEditing = ref(false)
const updatingProfile = ref(false)
const name = ref(user.value?.name || '')

const handleUpdateProfile = async () => {
  if (!user.value) return
  updatingProfile.value = true
  try {
    const res = await $api<{success: boolean, data: any}>(`/users/${user.value.id}`, {
      method: 'PATCH',
      body: { name: name.value }
    })
    
    if (res.success) {
      await authStore.fetchUser()
      toast.add({ title: 'Profile updated', color: 'success' })
      isEditing.value = false
    }
  } catch (error: any) {
    handleError(error, { title: 'Update failed' })
  } finally {
    updatingProfile.value = false
  }
}

// Avatar logic
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)

const triggerUpload = () => fileInput.value?.click()

const handleAvatarChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

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

// Password Logic
const showPasswordModal = ref(false)
const changingPassword = ref(false)
const passwordState = reactive({
  current: '',
  new: '',
  confirm: ''
})

const handleChangePassword = async () => {
  if (passwordState.new !== passwordState.confirm) {
    handleError(new Error('Passwords do not match'), { title: 'Validation Error' })
    return
  }
  
  changingPassword.value = true
  try {
    await $api('/auth/change-password', {
      method: 'POST',
      body: {
        currentPassword: passwordState.current,
        newPassword: passwordState.new
      }
    })
    toast.add({ title: 'Password changed successfully', color: 'success' })
    showPasswordModal.value = false
  } catch (err: any) {
    handleError(err, { title: 'Change failed' })
  } finally {
    changingPassword.value = false
  }
}

const handleLogout = async () => {
  await authStore.logout()
  navigateTo(toMain('/login'))
}

useSeoMeta({
  title: 'Settings | ParaScores',
  description: 'Manage your account, profile, and preferences on ParaScores.'
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

    <!-- Header -->
    <div class="mb-10">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
      <p class="text-gray-600 dark:text-gray-400">Manage your profile and account security</p>
    </div>

    <div class="space-y-6">
      <!-- Profile Section -->
      <UCard class="bg-white dark:bg-[#0A0A0A] border-gray-200 dark:border-white/5 shadow-sm overflow-hidden transition-colors">
        <div class="flex flex-col sm:flex-row items-center gap-8 py-4">
          <!-- Avatar wrapper -->
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
              
              <div class="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <UIcon v-if="!uploading" name="i-heroicons-camera" class="w-8 h-8 text-white" />
                <UIcon v-else name="i-heroicons-arrow-path" class="w-8 h-8 text-white animate-spin" />
              </div>
            </button>
          </div>

          <!-- Info -->
          <div class="flex-1 text-center sm:text-left">
            <template v-if="!isEditing">
              <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-1">{{ user?.name }}</h2>
              <p class="text-sm text-gray-600 dark:text-gray-500 mb-4">{{ user?.email }}</p>
              <UButton 
                variant="soft" 
                color="neutral" 
                size="sm" 
                icon="i-heroicons-pencil-square"
                @click="isEditing = true;"
                class="rounded-xl font-bold"
              >
                Edit Name
              </UButton>
            </template>
            <div v-else class="space-y-4 max-w-sm">
              <UInput v-model="name" placeholder="Full Name" size="lg" />
              <div class="flex gap-2">
                <UButton color="success" size="sm" :loading="updatingProfile" @click="handleUpdateProfile">Save</UButton>
                <UButton variant="ghost" color="neutral" size="sm" @click="isEditing = false;">Cancel</UButton>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Account Actions -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Security -->
        <UCard class="bg-white dark:bg-[#0A0A0A] border-gray-200 dark:border-white/5 shadow-sm hover:border-emerald-500/20 dark:hover:border-white/10 transition-colors">
          <div class="flex flex-col h-full">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                <UIcon name="i-heroicons-shield-check" class="w-6 h-6" />
              </div>
              <h3 class="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-[11px]">Security</h3>
            </div>
            <p class="text-xs text-gray-600 dark:text-gray-500 mb-6 flex-1">Update your password to keep your account safe.</p>
            <UButton 
              v-if="user?.hasPassword"
              variant="outline" 
              color="neutral" 
              class="w-full justify-center rounded-xl font-bold"
              @click="showPasswordModal = true;"
            >
              Change Password
            </UButton>
            <div v-else class="text-[10px] text-gray-600 dark:text-gray-500 italic bg-gray-50 dark:bg-white/5 p-3 rounded-lg border border-gray-100 dark:border-white/5">
              You are signed in via a provider and don't have a direct password set.
            </div>
          </div>
        </UCard>

        <!-- Preferences -->
        <UCard class="bg-white dark:bg-[#0A0A0A] border-gray-200 dark:border-white/5 shadow-sm hover:border-emerald-500/20 dark:hover:border-white/10 transition-colors">
          <div class="flex flex-col h-full">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <UIcon name="i-heroicons-heart" class="w-6 h-6" />
              </div>
              <h3 class="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-[11px]">Preferences</h3>
            </div>
            <p class="text-xs text-gray-600 dark:text-gray-500 mb-6 flex-1">Manage the tournaments and teams you follow.</p>
            <UButton 
              to="/following" 
              variant="outline" 
              color="success" 
              class="w-full justify-center rounded-xl font-bold"
            >
              Managed Followed
            </UButton>
          </div>
        </UCard>
      </div>

      <!-- Danger Zone -->
      <div class="pt-8 border-t border-gray-200 dark:border-white/5">
        <UButton 
          variant="outline" 
          color="error" 
          icon="i-heroicons-arrow-right-on-rectangle"
          class="w-full sm:w-auto px-10 rounded-xl font-bold shadow-lg shadow-red-500/10"
          @click="handleLogout"
        >
          Sign Out
        </UButton>
      </div>
    </div>

    <!-- Password Modal -->
    <UModal v-model:open="showPasswordModal">
      <template #content>
        <UCard class="bg-white dark:bg-[#111] border-gray-200 dark:border-white/5">
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-bold text-gray-900 dark:text-white">Change Password</h3>
              <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" @click="showPasswordModal = false;" />
            </div>
          </template>

          <form @submit.prevent="handleChangePassword" class="space-y-4">
            <UFormField label="Current Password">
              <UInput v-model="passwordState.current" type="password" placeholder="••••••••" />
            </UFormField>
            <UFormField label="New Password">
              <UInput v-model="passwordState.new" type="password" placeholder="••••••••" />
            </UFormField>
            <UFormField label="Confirm New Password">
              <UInput v-model="passwordState.confirm" type="password" placeholder="••••••••" />
            </UFormField>

            <div class="pt-4 flex justify-end gap-3">
              <UButton variant="ghost" color="neutral" @click="showPasswordModal = false;">Cancel</UButton>
              <UButton type="submit" color="success" :loading="changingPassword">Update Password</UButton>
            </div>
          </form>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
/* Custom transitions if needed */
</style>
