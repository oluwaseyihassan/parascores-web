<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-12 bg-page transition-colors duration-300">
    <div class="w-full max-w-lg">
      <UCard class="shadow-2xl">
        <!-- Logo -->
        <div class="flex justify-center mb-4">
          <div class="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <UIcon name="i-heroicons-trophy-solid" class="w-10 h-10 text-white" />
          </div>
        </div>

        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-heading mb-2">Become an Organizer</h1>
          <p class="text-muted text-sm px-4">
            To create and manage tournaments, we need a few details about you and your organization.
          </p>
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

        <!-- Form -->
        <UForm 
          :schema="schema" 
          :state="state" 
          class="space-y-6" 
          @submit="handleUpgrade"
        >
          <!-- Organization Name -->
          <UFormField name="organization_name" label="Organization Name" required>
            <UInput
              v-model="state.organization_name"
              type="text"
              placeholder="e.g., OAU Sports Council or Lagos Liga"
              size="lg"
              class="w-full"
              input-class="bg-surface"
              :disabled="loading"
            />
          </UFormField>

          <!-- Contact Phone Number -->
          <UFormField name="phone" label="Contact Phone Number" required>
            <UInput
              v-model="state.phone"
              type="tel"
              placeholder="+234 800 000 0000"
              size="lg"
              class="w-full"
              input-class="bg-surface"
              :disabled="loading"
            />
            <p class="text-xs text-muted mt-1">Crucial for B2B sales and priority support.</p>
          </UFormField>

          <!-- Organization Logo -->
          <UFormField name="organization_logo" label="Organization Logo">
            <div class="flex items-center gap-4">
              <div class="relative w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center border border-gray-200 dark:border-gray-700">
                <img v-if="state.organization_logo" :src="state.organization_logo" class="w-full h-full object-cover" />
                <UIcon v-else name="i-heroicons-photo" class="w-8 h-8 text-gray-400" />
                <div v-if="uploadingLogo" class="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 text-white animate-spin" />
                </div>
              </div>
              
              <input 
                ref="logoInput" 
                type="file" 
                accept="image/*" 
                class="hidden" 
                @change="handleLogoChange" 
              />
              
              <UButton 
                size="sm" 
                color="neutral" 
                variant="outline" 
                icon="i-heroicons-arrow-up-tray" 
                label="Upload Logo" 
                @click="triggerLogoInput" 
                :disabled="uploadingLogo || loading" 
              />
            </div>
          </UFormField>

          <div class="pt-4 border-t border-gray-100 dark:border-white/10"></div>

          <!-- Submit Button -->
          <UButton
            type="submit"
            size="xl"
            block
            :loading="loading"
            class="font-semibold py-4"
            variant="green"
          >
            Complete Onboarding
          </UButton>
          
          <div class="text-center mt-4">
             <UButton 
                size="sm"
                variant="link"
                color="neutral"
                @click="navigateTo('/', { external: true })"
             >
                Return to Fan Portal
             </UButton>
          </div>
        </UForm>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'

definePageMeta({
  layout: 'auth',
})

const authStore = useAuthStore()
const toast = useToast()

const schema = z.object({
  organization_name: z.string().min(2, 'Organization name must be at least 2 characters'),
  phone: z.string().min(6, 'Please enter a valid phone number'),
  organization_logo: z.string().optional()
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  organization_name: undefined,
  phone: undefined,
  organization_logo: undefined
})

const error = ref('')
const loading = ref(false)

// Logo upload logic
const logoInput = ref<HTMLInputElement | null>(null)
const uploadingLogo = ref(false)

const triggerLogoInput = () => {
  logoInput.value?.click()
}

const handleLogoChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  uploadingLogo.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    
    // Using the same upload endpoint as profile.vue
    const response = await $api<{success: boolean, data: { url: string }, message: string}>('/upload/image?folder=organization', {
      method: 'POST',
      body: formData
    })
    
    if (response.data?.url) {
      state.organization_logo = response.data.url
      toast.add({ title: 'Logo uploaded successfully', color: 'success' })
    }
  } catch (err: any) {
    console.error('Logo upload failed:', err)
    error.value = 'Failed to upload logo: ' + (err.data?.message || err.message)
  } finally {
    uploadingLogo.value = false
  }
}

const handleUpgrade = async (event: FormSubmitEvent<Schema>) => {
  error.value = ''
  loading.value = true
  
  try {
    const { organization_name, phone, organization_logo } = event.data
    const response = await authStore.upgradeToOrganizer({
      organization_name,
      phone,
      organization_logo
    })
    
    if (response?.success) {
      toast.add({ title: 'Welcome Organizer!', color: 'success' })
      // Navigate to the dashboard index correctly after upgrading
      navigateTo('/')
    } else {
      error.value = response?.message || 'Failed to upgrade to Organizer. Please try again.'
    }
  } catch (err: any) {
    console.error('Upgrade failed:', err)
    error.value = err.data?.message || err.message || 'An unexpected error occurred'
  } finally {
    loading.value = false
  }
}
</script>
