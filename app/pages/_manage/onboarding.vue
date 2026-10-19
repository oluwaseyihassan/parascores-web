<script setup lang="ts">
/**
 * Onboarding — create-organization wizard in the split-shell design:
 * illustration panel left (pastel stadium art), dark form pane right with a
 * 3-segment progress bar. Steps: 1 Name → 2 Brand (all optional) → 3 Success.
 * Intentionally no auth middleware — this is the entry point for new users.
 */
definePageMeta({
  layout: 'auth',
})

useSeoMeta({ title: 'Create Organization — ParaScores' })

const authStore = useAuthStore()
const { frontendUrl } = useHost()
const toast = useToast()

// Steps (success screen is the third progress segment)
const step = ref(1)
const totalSteps = 3

const state = reactive<{
  organization_name?: string
  description?: string
  organization_logo?: string
  phone?: string
}>({
  organization_name: undefined,
  description: undefined,
  organization_logo: undefined,
  phone: undefined,
})

const error = ref('')
const loading = ref(false)
const showSuccess = ref(false)

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

// Illustration per phase (art lives in public/images/onboarding/)
const sceneSrc = computed(() =>
  step.value === 2 && !showSuccess.value
    ? '/images/onboarding/stadium-hero.png'
    : '/images/onboarding/arena.png'
)

const sceneCaption = computed(() => {
  if (showSuccess.value) {
    return {
      title: 'Kickoff awaits.',
      sub: 'Your workspace is live — the first whistle is yours to blow.',
    }
  }
  if (step.value === 2) {
    return {
      title: 'Your club, your colors.',
      sub: 'Logo, WhatsApp line and accent color — all skippable, all editable later.',
    }
  }
  return {
    title: 'Every match deserves a live crowd.',
    sub: 'Set up your organization and publish your first tournament tonight.',
  }
})

// Logo upload (validated on both click and drop paths)
const logoInput = ref<HTMLInputElement | null>(null)
const uploadingLogo = ref(false)
const dragOver = ref(false)

const triggerLogoInput = () => {
  logoInput.value?.click()
}

const validateImage = (file: File): boolean => {
  if (!file.type.startsWith('image/')) {
    toast.add({ title: 'Please select an image file', color: 'error' })
    return false
  }
  if (file.size > 5 * 1024 * 1024) {
    toast.add({ title: 'Image must be less than 5MB', color: 'error' })
    return false
  }
  return true
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
  if (!validateImage(file)) {
    target.value = ''
    return
  }
  await uploadLogo(file)
  // Reset so the same file can be re-selected
  target.value = ''
}

const handleLogoDrop = async (event: DragEvent) => {
  dragOver.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file && validateImage(file)) {
    await uploadLogo(file)
  }
}

// Normalize phone numbers (e.g. 09012345678 -> +2349012345678, strips spaces/dashes)
const normalizePhone = (val?: string): string | undefined => {
  if (!val) return undefined
  const cleaned = val.trim().replace(/[\s\-\(\)\.]/g, '')
  if (!cleaned) return undefined
  if (cleaned.startsWith('+')) return cleaned
  if (/^0[789][01]\d{8}$/.test(cleaned)) {
    return `+234${cleaned.slice(1)}`
  }
  if (/^0\d{10}$/.test(cleaned)) {
    return `+234${cleaned.slice(1)}`
  }
  if (/^234\d{10}$/.test(cleaned)) {
    return `+${cleaned}`
  }
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`
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
        phone: normalizePhone(state.phone),
        logoUrl: state.organization_logo || undefined,
      }
    })

    if (response?.success) {
      await authStore.fetchUser()

      toast.add({
        title: authStore.isOrganizer ? 'Organization created!' : 'Welcome Organizer!',
        color: 'success'
      })

      showSuccess.value = true
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

<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-10 bg-page transition-colors duration-300">
    <div class="w-full max-w-4xl">

      <!-- Split shell: illustration left, form pane right -->
      <div class="grid lg:grid-cols-[44%_56%] rounded-2xl border border-subtle overflow-hidden bg-surface shadow-2xl shadow-black/20">

        <!-- Illustration panel -->
        <div class="relative min-h-[190px] lg:min-h-[560px]">
          <img
            :src="sceneSrc"
            alt=""
            class="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div class="absolute left-5 right-5 bottom-4">
            <p class="text-[15px] font-extrabold text-white leading-snug drop-shadow-sm">{{ sceneCaption.title }}</p>
            <p class="text-[11.5px] text-white/75 mt-1 leading-relaxed drop-shadow-sm">{{ sceneCaption.sub }}</p>
          </div>
        </div>

        <!-- Form pane -->
        <div class="p-6 sm:p-8 lg:p-10 flex flex-col bg-surface">
          <!-- Brand -->
          <div class="flex items-center gap-2.5">
            <img src="https://res.cloudinary.com/djsnerfzp/image/upload/q_auto/f_auto/v1780327900/parascores-logo.png" alt="" class="w-6 h-6 rounded-md object-contain" />
            <span class="text-[12px] font-black tracking-[0.14em] text-heading">PARASCORES</span>
          </div>

          <!-- Progress (3 segments; success = all filled) -->
          <div class="flex gap-1.5 mt-5 mb-6" aria-hidden="true">
            <span
              v-for="seg in totalSteps"
              :key="seg"
              class="w-7 h-[3px] rounded-full transition-colors duration-300"
              :class="(showSuccess ? totalSteps : step) >= seg ? 'bg-emerald-500' : 'bg-black/10 dark:bg-white/[0.1]'"
            ></span>
          </div>

          <!-- Error Alert -->
          <UAlert
            v-if="error"
            icon="i-heroicons-exclamation-triangle"
            color="error"
            variant="subtle"
            :title="error"
            class="mb-5"
          />

          <!-- ═══ STEP 1: Name ═══ -->
          <template v-if="step === 1 && !showSuccess">
            <h1 class="text-2xl sm:text-[27px] font-extrabold tracking-tight text-heading leading-tight">
              Name your organization
            </h1>
            <p class="text-[13px] text-muted leading-relaxed mt-2">
              One organization per club, school, or league body. You can create or join more later.
            </p>

            <div class="mt-5 space-y-4">
              <div>
                <label class="block text-[12px] font-semibold text-muted mb-1.5">
                  Organization name <span class="text-red-400">*</span>
                </label>
                <UInput
                  v-model="state.organization_name"
                  type="text"
                  placeholder="e.g. OAU Sports Directorate"
                  size="lg"
                  class="w-full"
                  :disabled="loading"
                  autofocus
                  @keyup.enter="goToNextStep"
                />
              </div>

              <div>
                <label class="block text-[12px] font-semibold text-muted mb-1.5">
                  Description <span class="font-normal text-muted/70">— What is your organization about? (optional)</span>
                </label>
                <UInput
                  v-model="state.description"
                  type="text"
                  placeholder="e.g. Campus sports council organizing leagues and tournaments"
                  size="lg"
                  class="w-full"
                  :disabled="loading"
                  @keyup.enter="goToNextStep"
                />
                <p class="text-[10.5px] text-muted mt-1.5">Brief summary shown on your public organization page.</p>
              </div>
            </div>

            <UButton
              size="xl"
              block
              class="font-bold mt-6"
              color="primary"
              trailing-icon="i-heroicons-arrow-right"
              :disabled="!canProceed"
              @click="goToNextStep"
            >
              Continue
            </UButton>

            <div class="text-center mt-4">
              <UButton
                size="sm"
                variant="link"
                color="neutral"
                class="text-muted"
                @click="navigateTo(authStore.isOrganizer ? '/' : frontendUrl, { external: true })"
              >
                {{ authStore.isOrganizer ? 'Return to Dashboard' : 'Return to Fan Portal' }}
              </UButton>
            </div>
          </template>

          <!-- ═══ STEP 2: Contact & brand ═══ -->
          <template v-else-if="step === 2 && !showSuccess">
            <h1 class="text-2xl sm:text-[26px] font-extrabold tracking-tight text-heading leading-tight">
              Brand it, lightly
            </h1>
            <p class="text-[13px] text-muted leading-relaxed mt-2">
              Everything here is optional — you can do it later in workspace settings.
            </p>

            <div class="mt-5 space-y-4">
              <!-- Logo -->
              <div>
                <label class="block text-[12px] font-semibold text-muted mb-1.5">
                  Logo <span class="font-normal text-muted/70">(optional)</span>
                </label>
                <div
                  class="relative border-[1.5px] border-dashed rounded-xl px-4 py-4 transition-all cursor-pointer"
                  :class="dragOver
                    ? 'border-emerald-500 bg-emerald-500/5'
                    : 'border-subtle hover:border-emerald-500/50'"
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

                  <!-- Uploaded state -->
                  <div v-if="state.organization_logo" class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-lg overflow-hidden shrink-0 ring-2 ring-emerald-500/30">
                      <img :src="state.organization_logo" class="w-full h-full object-cover" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-[13px] font-semibold text-heading">Logo uploaded</p>
                      <p class="text-[11px] text-muted mt-0.5">Click or drop a new image to replace</p>
                    </div>
                    <UButton
                      size="xs"
                      color="error"
                      variant="ghost"
                      icon="i-heroicons-trash"
                      aria-label="Remove logo"
                      @click.stop="state.organization_logo = undefined"
                    />
                  </div>

                  <!-- Empty / uploading -->
                  <div v-else class="flex items-center gap-3 text-muted">
                    <UIcon
                      :name="uploadingLogo ? 'i-heroicons-arrow-path' : 'i-heroicons-arrow-up-tray'"
                      class="w-4.5 h-4.5 shrink-0"
                      :class="{ 'animate-spin': uploadingLogo }"
                    />
                    <p class="text-[12px]">
                      <template v-if="uploadingLogo">Uploading…</template>
                      <template v-else>
                        <span class="font-semibold text-emerald-600 dark:text-emerald-400">Click to upload</span>
                        or drop an image · PNG, JPG, WEBP up to 5MB
                      </template>
                    </p>
                  </div>
                </div>
              </div>

              <!-- WhatsApp -->
              <div>
                <label class="block text-[12px] font-semibold text-muted mb-1.5">
                  WhatsApp number <span class="font-normal text-muted/70">(optional)</span>
                </label>
                <UInput
                  v-model="state.phone"
                  type="tel"
                  placeholder="e.g. 09012345678 or +234 800 000 0000"
                  size="lg"
                  class="w-full"
                  icon="i-heroicons-phone"
                  :disabled="loading"
                />
                <p class="text-[10.5px] text-muted mt-1.5">Visible to players for support queries (accepts local 090... or international format).</p>
              </div>

              <!-- Live preview -->
              <div>
                <label class="block text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted mb-1.5">Preview</label>
                <div class="border border-subtle rounded-xl p-3.5 flex items-center gap-3 bg-black/[0.02] dark:bg-white/[0.02]">
                  <div
                    class="w-11 h-11 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-emerald-500/10 text-emerald-500"
                  >
                    <img v-if="state.organization_logo" :src="state.organization_logo" class="w-full h-full object-cover" />
                    <span v-else class="text-lg font-extrabold text-emerald-500">
                      {{ (state.organization_name || 'O').charAt(0).toUpperCase() }}
                    </span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-[13px] font-bold text-heading truncate">
                      {{ state.organization_name || 'Your Organization' }}
                    </p>
                    <p class="text-[11px] text-muted truncate mt-0.5">
                      {{ state.description || 'Organization description' }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex gap-2.5 mt-6">
              <UButton
                size="xl"
                color="neutral"
                variant="outline"
                icon="i-heroicons-arrow-left"
                class="font-semibold shrink-0"
                @click="step--"
                :disabled="loading"
              >
                Back
              </UButton>
              <UButton
                size="xl"
                block
                :loading="loading"
                class="font-bold"
                color="primary"
                icon="i-heroicons-rocket-launch"
                @click="handleCreate"
              >
                {{ authStore.isOrganizer ? 'Create Organization' : 'Launch Organization' }}
              </UButton>
            </div>
          </template>

          <!-- ═══ STEP 3: Success ═══ -->
          <template v-else-if="showSuccess">
            <h1 class="text-2xl sm:text-[26px] font-extrabold tracking-tight text-heading leading-tight">
              {{ state.organization_name }} is live
            </h1>
            <p class="text-[13px] text-muted leading-relaxed mt-2">
              Your organization is ready. Create your first tournament to get fixtures, standings and a public fan page going.
            </p>

            <UButton
              size="xl"
              block
              class="font-bold mt-6"
              color="primary"
              icon="i-heroicons-plus"
              @click="navigateTo('/tournaments/new')"
            >
              Create your first tournament
            </UButton>

            <div class="text-center mt-4 space-y-1">
              <div>
                <UButton
                  size="sm"
                  variant="link"
                  color="neutral"
                  class="text-muted"
                  @click="navigateTo('/')"
                >
                  Go to dashboard
                </UButton>
              </div>
              <div>
                <UButton
                  size="sm"
                  variant="link"
                  color="neutral"
                  class="text-muted"
                  to="https://chat.whatsapp.com/FubVEhK2ONKLUdci1RlVuu"
                  target="_blank"
                >
                  Join the organizers community on WhatsApp
                </UButton>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
