<template>
  <div class="bg-white dark:bg-[#070b10] min-h-screen text-gray-900 dark:text-white transition-colors">
    <!-- Hero Section -->
    <section class="relative pt-20 pb-16 overflow-hidden">
      <div class="max-w-7xl mx-auto px-6">
        <div class="text-center max-w-3xl mx-auto">
          <!-- Badge -->
          <div class="inline-flex items-center gap-2 px-3 py-1.5 mb-8 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded">
            GET IN TOUCH
          </div>

          <!-- Headline -->
          <h1 class="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight mb-6 tracking-tight">
            Let's <span class="text-emerald-500">Connect.</span>
          </h1>

          <!-- Subtitle -->
          <p class="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-xl mx-auto font-medium">
            Have a question about our tournament tools, pricing, or need custom enterprise features? Drop us a line—we're here to help.
          </p>
        </div>
      </div>
    </section>

    <!-- Main Content Array -->
    <section class="pb-32 relative">
      <div class="max-w-7xl mx-auto px-6">
        <div class="grid lg:grid-cols-5 gap-12 items-start justify-center max-w-5xl mx-auto">
          
          <!-- Left Column (Contact Info) -->
          <div class="lg:col-span-2 flex flex-col gap-8 order-2 lg:order-1">
            <div class="bg-gray-50 dark:bg-[#0c1017] border border-gray-100 dark:border-white/5 rounded-xl p-8 shadow-sm hover:border-emerald-500/30 transition-colors">
              <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-6">Contact Information</h3>
              
              <div class="flex flex-col gap-6">
                <!-- Email -->
                <div class="flex gap-4">
                  <div class="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <UIcon name="i-heroicons-envelope" class="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h4 class="text-sm font-bold text-gray-900 dark:text-gray-200 mb-1">Email Us</h4>
                    <p class="text-sm text-gray-600 dark:text-gray-400">admin@parascores.com</p>
                  </div>
                </div>

                <!-- Phone -->
                <div class="flex gap-4">
                  <div class="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <UIcon name="i-heroicons-phone" class="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h4 class="text-sm font-bold text-gray-900 dark:text-gray-200 mb-1">Call Us</h4>
                    <p class="text-sm text-gray-600 dark:text-gray-400">+2349069647066</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Social Links -->
            <div class="bg-gray-50 dark:bg-[#0c1017] border border-gray-100 dark:border-white/5 rounded-xl p-8 shadow-sm hover:border-emerald-500/30 transition-colors">
              <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-4">Follow Us</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-6 font-medium">Stay up to date with the latest features and community tournaments.</p>
              <div class="flex flex-wrap gap-4">
                <a href="https://x.com/parascores" target="_blank" rel="noopener noreferrer" class="w-10 h-10 bg-white dark:bg-[#0d1424] border border-gray-200 dark:border-white/10 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-emerald-500 hover:border-emerald-500/50 transition-all shadow-sm">
                  <SocialsTwitterIcon class="w-4 h-4" />
                </a>
                <a href="#" class="w-10 h-10 bg-white dark:bg-[#0d1424] border border-gray-200 dark:border-white/10 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-emerald-500 hover:border-emerald-500/50 transition-all shadow-sm">
                  <SocialsInstagramIcon class="w-4 h-4" />
                </a>
                <a href="#" class="w-10 h-10 bg-white dark:bg-[#0d1424] border border-gray-200 dark:border-white/10 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-emerald-500 hover:border-emerald-500/50 transition-all shadow-sm">
                  <UIcon name="i-simple-icons-discord" class="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          <!-- Right Column (Contact Form) -->
          <div class="lg:col-span-3 order-1 lg:order-2">
            <div class="bg-white dark:bg-[#0c1017] border border-gray-100 dark:border-white/5 rounded-xl p-6 md:p-8 relative overflow-hidden shadow-sm">
              <div class="absolute top-0 right-0 p-32 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none"></div>
              
              <h3 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">Send us a message</h3>
              
              <UForm :schema="schema" :state="state" @submit="onSubmit" class="space-y-6 relative z-10 premium-form">
                <div class="grid md:grid-cols-2 gap-6">
                  <UFormField label="Full Name" name="name" class="w-full">
                    <UInput v-model="state.name" placeholder="John Doe" size="lg" color="neutral" class="w-full" />
                  </UFormField>
                  <UFormField label="Email Address" name="email" class="w-full">
                    <UInput v-model="state.email" type="email" placeholder="john@example.com" size="lg" color="neutral" class="w-full" />
                  </UFormField>
                </div>

                <UFormField label="Subject" name="subject" class="w-full">
                  <UInput v-model="state.subject" placeholder="How can we help you?" size="lg" color="neutral" class="w-full" />
                </UFormField>

                <UFormField label="Message" name="message" class="w-full">
                  <UTextarea v-model="state.message" :rows="6" placeholder="Tell us more about your inquiry..." size="lg" color="neutral" class="w-full" />
                </UFormField>

                <div class="pt-2">
                  <UButton
                    type="submit"
                    :loading="status === 'pending'"
                    color="primary"
                    size="lg"
                    block
                    class="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-colors"
                  >
                    Send Message
                  </UButton>
                </div>
              </UForm>

            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* High-end design system for contact form inputs */
.premium-form :deep(input),
.premium-form :deep(textarea) {
  background-color: #070b10 !important; /* matches general page dark background */
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 0.75rem !important; /* rounded-xl */
  color: #ffffff !important;
  font-size: 0.95rem !important;
  width: 100% !important;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
}

.premium-form :deep(input) {
  padding-top: 0.875rem !important;
  padding-bottom: 0.875rem !important;
  padding-left: 1.25rem !important;
  padding-right: 1.25rem !important;
  height: auto !important;
}

.premium-form :deep(textarea) {
  padding-top: 1rem !important;
  padding-bottom: 1rem !important;
  padding-left: 1.25rem !important;
  padding-right: 1.25rem !important;
}

.premium-form :deep(input:focus),
.premium-form :deep(textarea:focus) {
  border-color: #10b981 !important; /* emerald-500 */
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15), 0 4px 12px -2px rgba(16, 185, 129, 0.05) !important;
  outline: none !important;
}

.premium-form :deep(input::placeholder),
.premium-form :deep(textarea::placeholder) {
  color: #6b7280 !important; /* text-gray-500 */
}

/* Force all input wrapper elements to full-width */
.premium-form :deep(.w-full),
.premium-form :deep(div.relative),
.premium-form :deep(.u-form-field) {
  width: 100% !important;
}

.premium-form :deep(label) {
  font-weight: 600 !important;
  font-size: 0.875rem !important;
  color: #374151 !important; /* dark grey in light mode */
  margin-bottom: 0.5rem !important;
  display: block !important;
}

.dark .premium-form :deep(label) {
  color: #e5e7eb !important; /* light grey in dark mode */
}

/* Light mode overrides */
.light .premium-form :deep(input),
.light .premium-form :deep(textarea) {
  background-color: #f9fafb !important;
  border: 1px solid #e5e7eb !important;
  color: #111827 !important;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
}

.light .premium-form :deep(input:focus),
.light .premium-form :deep(textarea:focus) {
  border-color: #10b981 !important;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1), 0 4px 12px -2px rgba(16, 185, 129, 0.05) !important;
}

.light .premium-form :deep(input::placeholder),
.light .premium-form :deep(textarea::placeholder) {
  color: #9ca3af !important;
}
</style>

<script setup lang="ts">
import { z } from 'zod'

import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'

// SEO
useSeoMeta({
  title: 'Contact Us - ParaScores',
  description: 'Get in touch with the ParaScores team for support, sales, or general inquiries.',
  ogTitle: 'Contact Us - ParaScores',
  ogDescription: 'Get in touch with the ParaScores team for support, sales, or general inquiries.',
})

const route = useRoute()
const { handleError } = useErrors()
const toast = useToast()

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Please enter a valid email address'),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(10, 'Message must be at least 10 characters long')
})

const state = reactive({
  name: '',
  email: '',
  subject: '',
  message: ''
})

onMounted(() => {
  if (route.query.subject) {
    state.subject = route.query.subject as string
  }
})

const status = ref<'idle' | 'pending'>('idle')

async function onSubmit(event: any) {
  status.value = 'pending'
  try {
    const response = await $publicApi<{ message: string, success: boolean }>('/contact', {
      method: 'POST',
      body: event.data
    })
    
    // Clear form on success
    state.name = ''
    state.email = ''
    state.subject = ''
    state.message = ''
    
    toast.add({
      title: 'Success!',
      description: response.message || 'We have received your message and will be in touch soon.',
      color: 'success',
      icon: 'i-heroicons-check-circle'
    })
  } catch (error: any) {
    handleError(error, { title: 'Submission Failed' })
  } finally {
    status.value = 'idle'
  }
}
</script>
