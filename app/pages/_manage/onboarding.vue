<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-12 bg-page transition-colors duration-300">
    <div class="w-full max-w-lg">
      <UCard class="shadow-2xl">
        <!-- Logo -->
        <div class="flex justify-center mb-6 mt-2">
          <div class="w-20 h-20 bg-gradient-to-tr from-emerald-600 to-teal-400 rounded-2xl flex items-center justify-center shadow-[0_0_40px_-10px] shadow-emerald-500/50 backdrop-blur-sm border border-white/10 dark:border-white/5 transition-transform duration-500 hover:scale-105">
            <UIcon name="i-heroicons-building-office-2-solid" class="w-10 h-10 text-white" />
          </div>
        </div>

        <!-- Header -->
        <div class="text-center mb-10">
          <h1 class="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-3">
            {{ authStore.isOrganizer ? 'Create Workspace' : 'Become an Organizer' }}
          </h1>
          <p class="text-gray-500 dark:text-gray-400 text-sm px-4 font-medium leading-relaxed max-w-sm mx-auto">
            {{ authStore.isOrganizer 
              ? 'Add another organization namespace to manage different sets of tournaments.' 
              : 'To create and manage tournaments, we need a few details about your organization.' 
            }}
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
          <UFormField name="phone" label="Public WhatsApp Number (For player support)" required>
            <UInput
              v-model="state.phone"
              type="tel"
              placeholder="+234 800 000 0000"
              size="lg"
              class="w-full"
              input-class="bg-surface"
              :disabled="loading"
            />
            <p class="text-xs text-muted mt-1">This number will be visible to players for support queries.</p>
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
            class="font-bold py-3.5 shadow-xl shadow-emerald-500/20 transition-all duration-300 hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:translate-y-0 text-base"
            color="primary"
          >
            {{ authStore.isOrganizer ? 'Create Organization' : 'Complete Onboarding' }}
          </UButton>
          
          <div class="text-center mt-6 mb-2">
             <UButton 
                size="sm"
                variant="ghost"
                color="neutral"
                icon="i-heroicons-arrow-left"
                class="hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                @click="navigateTo(authStore.isOrganizer ? '/' : useRuntimeConfig().public.FRONT_END_URL, { external: true })"
             >
                {{ authStore.isOrganizer ? 'Return to Dashboard' : 'Return to Fan Portal' }}
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
    
    const response = await $api<{success: boolean, message: string}>('/organizations', {
      method: 'POST',
      body: {
        name: organization_name,
        phone,
        logoUrl: organization_logo
      }
    })
    
    if (response?.success) {
      // Refetch user to get the new organization and role
      await authStore.fetchUser()
      
      toast.add({ 
        title: authStore.isOrganizer ? 'Organization created!' : 'Welcome Organizer!', 
        color: 'success' 
      })
      
      // Navigate to the dashboard index correctly after upgrading
      navigateTo('/')
    } else {
      error.value = response?.message || 'Failed to create organization. Please try again.'
    }
  } catch (err: any) {
    console.error('Upgrade failed:', err)
    error.value = err.data?.message || err.message || 'An unexpected error occurred'
  } finally {
    loading.value = false
  }
}
</script>
