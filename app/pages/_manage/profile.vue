<script setup lang="ts">
definePageMeta({
  middleware: ['require-organizer'],
  layout: 'dashboard-v2'
})

useSeoMeta({ title: 'My Profile — ParaScores' })

const authStore = useAuthStore()
const { user } = storeToRefs(authStore)
const { handleError } = useErrors()
const toast = useToast()

// ── Avatar upload (click → preview → upload) ──────────────────
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const previewUrl = ref<string | null>(null)
const selectedFile = ref<File | null>(null)

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return

  // Validate file type
  if (!file.type.startsWith('image/')) {
    toast.add({ title: 'Please select an image file', color: 'error' })
    return
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    toast.add({ title: 'Image must be less than 5MB', color: 'error' })
    return
  }

  // Store file and create preview
  selectedFile.value = file
  previewUrl.value = URL.createObjectURL(file)
}

const cancelUpload = () => {
  selectedFile.value = null
  previewUrl.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const uploadPicture = async () => {
  if (!selectedFile.value) return

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    const response = await $api<{success: boolean, data: { url: string, publicId: string }, message: string}>('/upload/image?folder=profile', {
      method: 'POST',
      body: formData
    })

    if (response.data?.url) {
      // Update user in store
      authStore.setUser({ ...user.value!, picture: response.data.url })
      authStore.updateUser({ ...user.value!, picture: response.data.url })
    }

    // Clear selection
    cancelUpload()
  } catch (error) {
    handleError(error, { title: 'Upload failed', description: 'Failed to upload profile picture' })
  } finally {
    uploading.value = false
  }
}

// ── Edit profile (name only — the API has no email change path) ──
const isEditing = ref(false)
const updatingProfile = ref(false)
const editState = reactive({
  name: '',
})

const startEditing = () => {
  if (!user.value) return
  editState.name = user.value.name || ''
  isEditing.value = true
}

const cancelEditing = () => {
  isEditing.value = false
}

const handleUpdateProfile = async () => {
  if (!user.value) return
  updatingProfile.value = true
  try {
    // Update user name
    const userResponse = await $api<{success: boolean, data: any, message: string}>(`/users/${user.value.id}`, {
      method: 'PATCH',
      body: { name: editState.name }
    })

    if (userResponse.success) {
      await authStore.fetchUser()
      useToast().add({ title: 'Profile updated successfully', color: 'success' })
      isEditing.value = false
    }
  } catch (error: any) {
    handleError(error, { title: 'Failed to update profile' })
  } finally {
    updatingProfile.value = false
  }
}

// ── Change password ────────────────────────────────────────────
const showPasswordModal = ref(false)
const changingPassword = ref(false)
const passwordState = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const openPasswordModal = () => {
  passwordState.currentPassword = ''
  passwordState.newPassword = ''
  passwordState.confirmPassword = ''
  showPasswordModal.value = true
}

const handleChangePassword = async () => {
  if (passwordState.newPassword !== passwordState.confirmPassword) {
    handleError(new Error('New passwords do not match'), { title: 'Validation Error' })
    return
  }

  changingPassword.value = true
  try {
    await $api('/auth/change-password', {
      method: 'POST',
      body: {
        currentPassword: passwordState.currentPassword,
        newPassword: passwordState.newPassword
      }
    })

    useToast().add({ title: 'Password changed successfully', color: 'success' })
    showPasswordModal.value = false
  } catch (error: any) {
    handleError(error, { title: 'Failed to change password' })
  } finally {
    changingPassword.value = false
  }
}

// ── Display helpers ────────────────────────────────────────────
const roleBadgeClass = computed(() => {
  switch (user.value?.role) {
    case 'SUPER_ADMIN':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25'
    case 'ORGANIZER':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
    default:
      return 'bg-black/5 dark:bg-white/[0.08] text-muted border border-subtle'
  }
})

const memberSinceShort = computed(() => {
  if (!user.value?.created_at) return ''
  return new Date(user.value.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>

<template>
  <div class="max-w-2xl mx-auto flex flex-col gap-3">

    <!-- ═══ Profile hero ═══ -->
    <section class="bg-surface border border-subtle rounded-2xl overflow-hidden">
      <!-- View mode -->
      <div v-if="!isEditing" class="p-4 sm:p-5 flex items-center gap-4 flex-wrap">
        <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileChange" />

        <!-- Avatar + camera chip -->
        <div class="relative shrink-0 group">
          <button
            type="button"
            class="relative rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            :disabled="uploading"
            aria-label="Change profile photo"
            @click="triggerFileInput"
          >
            <UAvatar
              v-if="previewUrl || user?.picture"
              :src="previewUrl || user?.picture || ''"
              size="3xl"
              class="ring-2 ring-black/5 dark:ring-white/10"
            />
            <span
              v-else
              class="w-[72px] h-[72px] rounded-full bg-[#136332] text-white text-2xl font-extrabold flex items-center justify-center ring-2 ring-black/5 dark:ring-white/10"
            >
              {{ user?.name?.charAt(0).toUpperCase() }}
            </span>
            <span
              class="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-900 flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform"
            >
              <UIcon v-if="!uploading" name="i-heroicons-camera" class="w-3 h-3" />
              <UIcon v-else name="i-heroicons-arrow-path" class="w-3 h-3 animate-spin" />
            </span>
          </button>
        </div>

        <!-- Identity -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h2 class="text-base font-extrabold text-heading truncate">{{ user?.name }}</h2>
            <span
              class="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider"
              :class="roleBadgeClass"
            >
              {{ user?.role }}
            </span>
          </div>
          <p class="text-[12px] text-muted mt-0.5 truncate">{{ user?.email }}</p>
          <p v-if="memberSinceShort" class="text-[10.5px] text-muted mt-0.5">Member since {{ memberSinceShort }}</p>

          <!-- Inline upload confirm (file selected) -->
          <div v-if="selectedFile" class="flex items-center gap-2 mt-2.5">
            <span class="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">New photo selected</span>
            <UButton
              size="xs"
              color="primary"
              icon="i-heroicons-arrow-up-tray"
              label="Upload"
              :loading="uploading"
              @click="uploadPicture"
            />
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              label="Cancel"
              :disabled="uploading"
              @click="cancelUpload"
            />
          </div>
        </div>

        <UButton
          label="Edit profile"
          icon="i-heroicons-pencil-square"
          variant="outline"
          color="neutral"
          size="sm"
          class="font-bold shrink-0"
          @click="startEditing"
        />
      </div>

      <!-- Edit mode -->
      <div v-else>
        <header class="flex items-center gap-2.5 px-4 py-3 border-b border-subtle">
          <span class="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <UIcon name="i-heroicons-pencil-square" class="w-3.5 h-3.5" />
          </span>
          <h2 class="text-[13px] font-bold text-heading">Edit profile</h2>
        </header>
        <div class="p-4 sm:p-5 space-y-4">
          <UFormField label="Full name" name="name" required>
            <UInput v-model="editState.name" icon="i-heroicons-user" placeholder="Your name" class="w-full" />
          </UFormField>
          <UFormField label="Email" hint="Email can't be changed yet.">
            <UInput :model-value="user?.email" icon="i-heroicons-envelope" disabled class="w-full" />
          </UFormField>
          <div class="flex justify-end gap-2 pt-2">
            <UButton label="Cancel" variant="ghost" color="neutral" @click="cancelEditing" />
            <UButton label="Save changes" color="primary" icon="i-heroicons-check" class="font-bold" :loading="updatingProfile" @click="handleUpdateProfile" />
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ Account details ═══ -->
    <section class="bg-surface border border-subtle rounded-2xl overflow-hidden">
      <header class="flex items-center gap-2.5 px-4 py-3 border-b border-subtle">
        <span class="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
          <UIcon name="i-heroicons-clock" class="w-3.5 h-3.5" />
        </span>
        <h2 class="text-[13px] font-bold text-heading">Account details</h2>
      </header>
      <div class="px-4 sm:px-5 py-1.5">
        <div class="flex justify-between items-center py-2.5 border-b border-subtle text-[13px]">
          <span class="text-muted">User ID</span>
          <span class="text-heading font-mono text-xs">{{ user?.id?.slice(0, 8) }}…</span>
        </div>
        <div class="flex justify-between items-center py-2.5 border-b border-subtle text-[13px]">
          <span class="text-muted">Member since</span>
          <span class="text-heading font-semibold">{{ user?.created_at ? formatDate(user.created_at) : '—' }}</span>
        </div>
        <div class="flex justify-between items-center py-2.5 text-[13px]">
          <span class="text-muted">Last updated</span>
          <span class="text-heading font-semibold">{{ user?.updated_at ? formatDate(user.updated_at) : '—' }}</span>
        </div>
      </div>
    </section>

    <!-- ═══ Security ═══ -->
    <section class="bg-surface border border-subtle rounded-2xl overflow-hidden">
      <header class="flex items-center gap-2.5 px-4 py-3 border-b border-subtle">
        <span class="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
          <UIcon name="i-heroicons-lock-closed" class="w-3.5 h-3.5" />
        </span>
        <h2 class="text-[13px] font-bold text-heading">Security</h2>
      </header>
      <div class="p-4 sm:p-5 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p class="text-[13px] font-bold text-heading">Password</p>
          <p class="text-[11px] text-muted mt-0.5">Keep your account secure with a fresh password.</p>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            label="Change password"
            icon="i-heroicons-key"
            variant="outline"
            color="neutral"
            size="sm"
            class="font-bold"
            :disabled="!user?.hasPassword"
            @click="openPasswordModal"
          />
          <span v-if="!user?.hasPassword" class="text-[10px] text-muted">(OAuth only)</span>
        </div>
      </div>
    </section>

    <!-- ═══ Workspaces link ═══ -->
    <section class="bg-surface border border-subtle rounded-2xl overflow-hidden">
      <NuxtLink
        to="/organizations"
        class="flex items-center gap-3 px-4 py-3.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors group"
      >
        <span class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
          <UIcon name="i-heroicons-building-office" class="w-4 h-4" />
        </span>
        <span class="flex-1 min-w-0">
          <span class="block text-[13px] font-bold text-heading group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Manage workspaces</span>
          <span class="block text-[11px] text-muted mt-0.5">Organizations, members, branding &amp; social links</span>
        </span>
        <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-muted group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0" />
      </NuxtLink>
    </section>

    <!-- Password Modal -->
    <UModal v-model:open="showPasswordModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                  <UIcon name="i-heroicons-lock-closed" class="w-5 h-5 text-amber-500" />
                </div>
                <h3 class="text-base font-bold text-heading">Change Password</h3>
              </div>
              <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" class="-my-1" @click="showPasswordModal = false" />
            </div>
          </template>

          <UForm :state="passwordState" @submit="handleChangePassword" class="space-y-4">
            <UFormField label="Current password" name="currentPassword" required>
              <UInput v-model="passwordState.currentPassword" type="password" icon="i-heroicons-lock-closed" class="w-full" />
            </UFormField>

            <UFormField label="New password" name="newPassword" required>
              <UInput v-model="passwordState.newPassword" type="password" icon="i-heroicons-key" class="w-full" />
            </UFormField>

            <UFormField label="Confirm new password" name="confirmPassword" required>
              <UInput v-model="passwordState.confirmPassword" type="password" icon="i-heroicons-key" class="w-full" />
            </UFormField>

            <div class="flex justify-end gap-2 pt-2">
              <UButton label="Cancel" variant="ghost" color="neutral" @click="showPasswordModal = false" />
              <UButton type="submit" label="Update password" color="primary" class="font-bold" :loading="changingPassword" />
            </div>
          </UForm>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
