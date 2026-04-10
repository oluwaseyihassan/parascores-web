<script setup lang="ts">
definePageMeta({
  middleware: ['require-organizer'],
  layout: 'dashboard'
})

const authStore = useAuthStore()
const { user, currentOrganization } = storeToRefs(authStore)

// File upload
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
    alert('Please select an image file')
    return
  }
  
  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('Image must be less than 5MB')
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
    console.error('Upload failed:', error)
    alert('Failed to upload profile picture')
  } finally {
    uploading.value = false
  }
}

// Edit Profile
const isEditing = ref(false)
const updatingProfile = ref(false)
const editState = reactive({
  name: '',
  organization_name: '',
  organization_logo: '',
  organization_color: '',
  phone: ''
})

const startEditing = () => {
  if (!user.value) return
  editState.name = user.value.name || ''
  editState.organization_name = currentOrganization.value?.name || ''
  editState.organization_logo = currentOrganization.value?.logoUrl || ''
  editState.organization_color = currentOrganization.value?.color || '#3b82f6'
  editState.phone = currentOrganization.value?.phone || ''
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
    console.error('Update failed:', error)
    useToast().add({ 
      title: 'Failed to update profile', 
      description: error.data?.message || error.message, 
      color: 'error' 
    })
  } finally {
    updatingProfile.value = false
  }
}

// Organization Logo Upload
const orgLogoInput = ref<HTMLInputElement | null>(null)
const uploadingOrgLogo = ref(false)

const triggerOrgLogoInput = () => {
  orgLogoInput.value?.click()
}

const handleOrgLogoChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  uploadingOrgLogo.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await $api<{success: boolean, data: { url: string }, message: string}>('/upload/image?folder=organization', {
      method: 'POST',
      body: formData
    })
    
    if (response.data?.url) {
      editState.organization_logo = response.data.url
    }
  } catch (error) {
    console.error('Org logo upload failed:', error)
    useToast().add({ title: 'Failed to upload organization logo', color: 'error' })
  } finally {
    uploadingOrgLogo.value = false
  }
}

// Change Password
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
    useToast().add({ title: 'New passwords do not match', color: 'error' })
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
    console.error('Password change failed:', error)
    useToast().add({ 
      title: 'Failed to change password', 
      description: error.data?.message || error.message, 
      color: 'error' 
    })
  } finally {
    changingPassword.value = false
  }
}

// Format date for display
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
      <p class="text-gray-500">Manage your account information</p>
    </div>

    <!-- Profile Card -->
    <UCard>
      <!-- View Mode -->
      <div v-if="!isEditing">
        <div class="flex flex-col items-center sm:flex-row sm:items-start gap-6">
          <!-- Avatar with Upload -->
          <div class="flex-shrink-0 relative group">
            <!-- Hidden file input -->
            <input 
              ref="fileInput"
              type="file" 
              accept="image/*"
              class="hidden"
              @change="handleFileChange"
            />
            
            <!-- Clickable Avatar Container -->
            <button 
              type="button"
              class="relative rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              @click="triggerFileInput"
              :disabled="uploading"
            >
              <!-- Preview or Current Avatar -->
              <UAvatar 
                v-if="previewUrl || user?.picture" 
                :src="previewUrl || user?.picture || ''" 
                size="3xl" 
                class="ring-4 ring-gray-100 dark:ring-gray-800"
              />
              <UAvatar 
                v-else 
                :text="user?.name?.charAt(0).toUpperCase()" 
                size="3xl" 
                class="ring-4 ring-gray-100 dark:ring-gray-800 bg-indigo-500 text-white text-3xl"
              />
              
              <!-- Hover Overlay -->
              <div 
                class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                :class="{ 'opacity-100': uploading }"
              >
                <UIcon 
                  v-if="!uploading" 
                  name="i-heroicons-camera" 
                  class="w-8 h-8 text-white"
                />
                <UIcon 
                  v-else 
                  name="i-heroicons-arrow-path" 
                  class="w-8 h-8 text-white animate-spin"
                />
              </div>
            </button>
            
            <!-- Upload Actions (when file selected) -->
            <div v-if="selectedFile" class="flex gap-2 mt-3">
              <UButton 
                size="xs" 
                color="primary" 
                icon="i-heroicons-arrow-up-tray"
                :loading="uploading"
                @click="uploadPicture"
              >
                Upload
              </UButton>
              <UButton 
                size="xs" 
                variant="ghost" 
                color="neutral"
                :disabled="uploading"
                @click="cancelUpload"
              >
                Cancel
              </UButton>
            </div>
            
            <!-- Upload hint (when no file selected) -->
            <p v-else class="text-xs text-gray-400 text-center mt-2">Click to change</p>
          </div>

          <!-- User Info -->
          <div class="flex-1 text-center sm:text-left">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
              {{ user?.name }}
            </h2>
            <p class="text-gray-500 mt-1">{{ user?.email }}</p>
            
            <!-- Role Badge -->
            <div class="mt-3">
              <span 
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                :class="{
                  'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300': user?.role === 'SUPER_ADMIN',
                  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300': user?.role === 'ORGANIZER',
                  'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300': user?.role === 'USER'
                }"
              >
                {{ user?.role }}
              </span>
            </div>
          </div>
        </div>

        <!-- Divider -->
        <div class="border-t border-gray-200 dark:border-gray-800 my-6"></div>

        <!-- Account Details -->
        <div class="space-y-4">
          <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wider">Account Details</h3>
          
          <div class="grid gap-4">
            <div class="flex justify-between items-center py-2">
              <span class="text-gray-500">User ID</span>
              <span class="text-gray-900 dark:text-white font-mono text-sm">{{ user?.id?.slice(0, 8) }}...</span>
            </div>
            
            <div class="flex justify-between items-center py-2 border-t border-gray-100 dark:border-gray-800">
              <span class="text-gray-500">Member Since</span>
              <span class="text-gray-900 dark:text-white">{{ user?.created_at ? formatDate(user.created_at) : '-' }}</span>
            </div>
            
            <div class="flex justify-between items-center py-2 border-t border-gray-100 dark:border-gray-800">
              <span class="text-gray-500">Last Updated</span>
              <span class="text-gray-900 dark:text-white">{{ user?.updated_at ? formatDate(user.updated_at) : '-' }}</span>
            </div>
          </div>
        </div>

        <!-- Organizations Shortcut -->
        <div class="border-t border-gray-200 dark:border-gray-800 my-6"></div>
        <div class="flex items-center justify-between p-4 bg-indigo-50/30 dark:bg-indigo-500/5 rounded-2xl border border-indigo-500/20">
          <div>
            <h3 class="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest leading-none mb-1">Workspaces</h3>
            <p class="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Manage settings & team members</p>
          </div>
          <UButton 
            to="/organizations" 
            label="OPEN" 
            variant="solid" 
            color="primary" 
            icon="i-heroicons-arrow-right"
            trailing
            class="rounded-xl font-black text-[10px] px-6 shadow-lg shadow-indigo-500/20"
          />
        </div>
      </div>

      <!-- Edit Mode -->
      <div v-else>
        <div class="space-y-6">
          <UFormField label="Full Name" name="name" required>
            <UInput v-model="editState.name" icon="i-heroicons-user" placeholder="Your name" />
          </UFormField>

          <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <UButton label="Cancel" variant="ghost" color="neutral" @click="cancelEditing" />
            <UButton label="Save Changes" color="primary" icon="i-heroicons-check" :loading="updatingProfile" @click="handleUpdateProfile" />
          </div>
        </div>
      </div>
    </UCard>

    <!-- Actions -->
    <div class="mt-6 flex flex-col sm:flex-row gap-3">
      <UButton 
        v-if="!isEditing"
        label="Edit Profile" 
        icon="i-heroicons-pencil-square" 
        color="primary"
        @click="startEditing"
        class="flex-1 justify-center"
      />
      <UButton 
        v-if="!isEditing"
        label="Change Password" 
        icon="i-heroicons-key" 
        variant="outline"
        @click="openPasswordModal"
        :disabled="!user?.hasPassword"
        class="flex-1 justify-center"
      >
        <template #trailing v-if="!user?.hasPassword">
           <span class="text-[10px] text-gray-400">(OAuth only)</span>
        </template>
      </UButton>
    </div>

    <!-- Password Modal -->
    <UModal v-model:open="showPasswordModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-base font-semibold">Change Password</h3>
              <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" class="-my-1" @click="showPasswordModal = false" />
            </div>
          </template>

          <UForm :state="passwordState" @submit="handleChangePassword" class="space-y-4">
            <UFormField label="Current Password" name="currentPassword" required>
              <UInput v-model="passwordState.currentPassword" type="password" icon="i-heroicons-lock-closed" />
            </UFormField>
            
            <UFormField label="New Password" name="newPassword" required>
              <UInput v-model="passwordState.newPassword" type="password" icon="i-heroicons-key" />
            </UFormField>
            
            <UFormField label="Confirm New Password" name="confirmPassword" required>
              <UInput v-model="passwordState.confirmPassword" type="password" icon="i-heroicons-key" />
            </UFormField>

            <div class="flex justify-end gap-3 pt-4">
              <UButton label="Cancel" variant="ghost" color="neutral" @click="showPasswordModal = false" />
              <UButton type="submit" label="Update Password" color="primary" :loading="changingPassword" />
            </div>
          </UForm>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
