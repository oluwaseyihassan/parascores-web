<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-12 bg-page transition-colors duration-300">
    <div class="w-full max-w-xl">
      <!-- Card -->
      <div class="relative">
        <!-- Glow effect behind card -->
        <div class="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-emerald-500/20 rounded-3xl blur-xl opacity-60 dark:opacity-40 pointer-events-none" />

        <UCard class="shadow-2xl relative !rounded-2xl">
          <!-- Header Section -->
          <div class="flex flex-col items-center mb-8 mt-2">
            <!-- Icon -->
            <div class="w-16 h-16 bg-gradient-to-tr from-emerald-600 to-teal-400 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-white/10 mb-5 transition-transform duration-500 hover:scale-105 hover:rotate-3">
              <UIcon name="i-heroicons-building-office-2-solid" class="w-8 h-8 text-white" />
            </div>

            <!-- Title -->
            <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-2 text-center">
              {{ authStore.isOrganizer ? 'New Organization' : 'Create Your Organization' }}
            </h1>
            <p class="text-gray-500 dark:text-gray-400 text-sm font-medium leading-relaxed max-w-sm mx-auto text-center">
              {{ authStore.isOrganizer 
                ? 'Add a new workspace to manage separate tournaments.' 
                : 'Set up your organization to start creating and managing tournaments.' 
              }}
            </p>
          </div>

          <!-- Stepper -->
          <div class="flex items-center justify-center gap-2 mb-8">
            <button
              v-for="s in totalSteps"
              :key="s"
              @click="s < step ? step = s : null"
              class="flex items-center gap-2 transition-all duration-300"
              :class="s <= step ? 'cursor-pointer' : 'cursor-default'"
            >
              <div 
                class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 border-2"
                :class="s === step 
                  ? 'bg-emerald-500 border-emerald-500 text-white scale-110 shadow-md shadow-emerald-500/30' 
                  : s < step 
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' 
                    : 'bg-transparent border-gray-300 dark:border-gray-600 text-gray-400'"
              >
                <UIcon v-if="s < step" name="i-heroicons-check" class="w-4 h-4" />
                <span v-else>{{ s }}</span>
              </div>
              <span 
                v-if="s < totalSteps" 
                class="w-8 h-0.5 rounded-full transition-colors duration-300"
                :class="s < step ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'"
              />
            </button>
          </div>

          <!-- Error Alert -->
          <UAlert
            v-if="error"
            icon="i-heroicons-exclamation-triangle"
            color="error"
            variant="subtle"
            :title="error"
            class="mb-6"
          />

          <!-- Step 1: Basics -->
          <div v-show="step === 1" class="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <!-- Organization Name -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Organization Name <span class="text-red-400">*</span>
              </label>
              <UInput
                v-model="state.organization_name"
                type="text"
                placeholder="e.g., Lagos Liga or Campus Sports Council"
                size="lg"
                class="w-full"
                input-class="bg-surface"
                :disabled="loading"
              />
            </div>

            <!-- Description -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Short Description
              </label>
              <UTextarea
                v-model="state.description"
                placeholder="What does your organization do? (e.g., We organize weekly football tournaments across Lagos)"
                :rows="3"
                size="lg"
                class="w-full"
                textarea-class="bg-surface"
                :disabled="loading"
              />
              <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Shown on your public organization page.</p>
            </div>

            <!-- Logo Upload -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Organization Logo
              </label>
              <div 
                class="relative border-2 border-dashed rounded-xl p-6 transition-all duration-200 cursor-pointer group"
                :class="dragOver 
                  ? 'border-emerald-500 bg-emerald-500/5' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-emerald-500/50 hover:bg-emerald-500/[0.02]'"
                @click="triggerLogoInput"
                @dragover.prevent="dragOver = true"
                @dragleave="dragOver = false"
                @drop.prevent="handleLogoDrop"
              >
                <input 
                  ref="logoInput" 
                  type="file" 
                  accept="image/*" 
                  class="hidden" 
                  @change="handleLogoChange" 
                />

                <div v-if="state.organization_logo" class="flex items-center gap-4">
                  <div class="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-emerald-500/30">
                    <img :src="state.organization_logo" class="w-full h-full object-cover" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-800 dark:text-gray-200">Logo uploaded</p>
                    <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Click or drop a new image to replace</p>
                  </div>
                  <UButton
                    size="xs"
                    color="error"
                    variant="ghost"
                    icon="i-heroicons-trash"
                    @click.stop="state.organization_logo = undefined"
                  />
                </div>

                <div v-else class="flex flex-col items-center text-center">
                  <div v-if="uploadingLogo" class="flex flex-col items-center gap-2">
                    <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-emerald-500 animate-spin" />
                    <p class="text-sm text-gray-500">Uploading...</p>
                  </div>
                  <template v-else>
                    <div class="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3 group-hover:bg-emerald-500/10 transition-colors">
                      <UIcon name="i-heroicons-arrow-up-tray" class="w-6 h-6 text-gray-400 group-hover:text-emerald-500 transition-colors" />
                    </div>
                    <p class="text-sm font-medium text-gray-600 dark:text-gray-300">
                      <span class="text-emerald-500">Click to upload</span> or drag and drop
                    </p>
                    <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">PNG, JPG or WEBP up to 5MB</p>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 2: Contact & Branding -->
          <div v-show="step === 2" class="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <!-- Contact Number -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                WhatsApp Number
                <span class="text-xs font-normal text-gray-400 dark:text-gray-500 ml-1">(optional)</span>
              </label>
              <UInput
                v-model="state.phone"
                type="tel"
                placeholder="+234 800 000 0000"
                size="lg"
                class="w-full"
                input-class="bg-surface"
                :disabled="loading"
                icon="i-heroicons-phone"
              />
              <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Visible to players for support queries. You can add this later.</p>
            </div>

            <!-- Brand Color -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Brand Color
                <span class="text-xs font-normal text-gray-400 dark:text-gray-500 ml-1">(optional)</span>
              </label>
              <div class="flex items-center gap-3">
                <div 
                  class="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer overflow-hidden flex-shrink-0 shadow-sm transition-transform hover:scale-105"
                  @click="($refs.colorPicker as HTMLInputElement)?.click()"
                >
                  <div 
                    class="w-full h-full" 
                    :style="{ backgroundColor: state.color || '#10b981' }"
                  />
                </div>
                <input 
                  ref="colorPicker"
                  type="color" 
                  v-model="state.color"
                  class="sr-only"
                />
                <UInput
                  v-model="state.color"
                  placeholder="#10b981"
                  size="lg"
                  class="flex-1"
                  input-class="bg-surface font-mono uppercase"
                  :disabled="loading"
                />
                <UButton
                  v-if="state.color"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-x-mark"
                  @click="state.color = undefined"
                />
              </div>
              <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Used as an accent color on your public pages.</p>
            </div>

            <!-- Preview Card -->
            <div class="mt-2">
              <label class="block text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-wider">Preview</label>
              <div class="border rounded-xl p-4 flex items-center gap-4 transition-colors border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div class="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center" :style="{ backgroundColor: (state.color || '#10b981') + '20' }">
                  <img v-if="state.organization_logo" :src="state.organization_logo" class="w-full h-full object-cover rounded-xl" />
                  <span v-else class="text-xl font-bold" :style="{ color: state.color || '#10b981' }">
                    {{ (state.organization_name || 'O').charAt(0).toUpperCase() }}
                  </span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {{ state.organization_name || 'Your Organization' }}
                  </p>
                  <p class="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                    {{ state.description || 'Organization description' }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Navigation -->
          <div class="mt-8 space-y-3">
            <!-- Step buttons -->
            <div class="flex gap-3">
              <UButton
                v-if="step > 1"
                size="xl"
                color="neutral"
                variant="outline"
                icon="i-heroicons-arrow-left"
                class="font-semibold"
                @click="step--"
                :disabled="loading"
              >
                Back
              </UButton>

              <UButton
                v-if="step < totalSteps"
                size="xl"
                block
                class="font-bold py-3 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 text-base flex-1"
                color="primary"
                trailing-icon="i-heroicons-arrow-right"
                @click="goToNextStep"
                :disabled="!canProceed"
              >
                Continue
              </UButton>

              <UButton
                v-else
                size="xl"
                block
                :loading="loading"
                class="font-bold py-3 shadow-xl shadow-emerald-500/20 transition-all duration-300 hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:translate-y-0 text-base flex-1"
                color="primary"
                icon="i-heroicons-rocket-launch"
                @click="handleCreate"
              >
                {{ authStore.isOrganizer ? 'Create Organization' : 'Launch Organization' }}
              </UButton>
            </div>

            <!-- Return link -->
            <div class="text-center pt-2">
              <UButton 
                size="sm"
                variant="ghost"
                color="neutral"
                icon="i-heroicons-arrow-left"
                class="hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                @click="navigateTo(authStore.isOrganizer ? '/' : frontendUrl, { external: true })"
              >
                {{ authStore.isOrganizer ? 'Return to Dashboard' : 'Return to Fan Portal' }}
              </UButton>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'auth',
})

const authStore = useAuthStore()
const { frontendUrl } = useHost()
const toast = useToast()

// Steps
const step = ref(1)
const totalSteps = 2

const state = reactive<{
  organization_name?: string
  description?: string
  organization_logo?: string
  phone?: string
  color?: string
}>({
  organization_name: undefined,
  description: undefined,
  organization_logo: undefined,
  phone: undefined,
  color: undefined,
})

const error = ref('')
const loading = ref(false)

// Step 1 validation
const canProceed = computed(() => {
  if (step.value === 1) {
    return (state.organization_name?.trim()?.length ?? 0) >= 2
  }
  return true
})

const goToNextStep = () => {
  if (!canProceed.value) return
  error.value = ''
  step.value++
}

// Logo upload
const logoInput = ref<HTMLInputElement | null>(null)
const uploadingLogo = ref(false)
const dragOver = ref(false)

const triggerLogoInput = () => {
  logoInput.value?.click()
}

const uploadLogo = async (file: File) => {
  uploadingLogo.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await $api<{success: boolean, data: { url: string }, message: string}>('/upload/image?folder=organization', {
      method: 'POST',
      body: formData
    })
    
    if (response.data?.url) {
      state.organization_logo = response.data.url
      toast.add({ title: 'Logo uploaded', color: 'success' })
    }
  } catch (err: any) {
    console.error('Logo upload failed:', err)
    error.value = 'Failed to upload logo: ' + (err.data?.message || err.message)
  } finally {
    uploadingLogo.value = false
  }
}

const handleLogoChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  await uploadLogo(file)
  // Reset so the same file can be re-selected
  target.value = ''
}

const handleLogoDrop = async (event: DragEvent) => {
  dragOver.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file && file.type.startsWith('image/')) {
    await uploadLogo(file)
  }
}

// Submit
const handleCreate = async () => {
  if (!state.organization_name?.trim() || state.organization_name.trim().length < 2) {
    error.value = 'Organization name must be at least 2 characters'
    step.value = 1
    return
  }

  error.value = ''
  loading.value = true
  
  try {
    const response = await $api<{success: boolean, message: string}>('/organizations', {
      method: 'POST',
      body: {
        name: state.organization_name.trim(),
        description: state.description?.trim() || undefined,
        phone: state.phone?.trim() || undefined,
        logoUrl: state.organization_logo || undefined,
        color: state.color || undefined,
      }
    })
    
    if (response?.success) {
      await authStore.fetchUser()
      
      toast.add({ 
        title: authStore.isOrganizer ? 'Organization created!' : 'Welcome Organizer! 🎉', 
        color: 'success' 
      })
      
      navigateTo('/')
    } else {
      error.value = response?.message || 'Failed to create organization. Please try again.'
    }
  } catch (err: any) {
    console.error('Create failed:', err)
    error.value = err.data?.message || err.message || 'An unexpected error occurred'
  } finally {
    loading.value = false
  }
}
</script>
