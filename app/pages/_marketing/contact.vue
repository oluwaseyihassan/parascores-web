<template>
  <div class="bg-white dark:bg-[#0A0F1C] min-h-screen text-gray-900 dark:text-white transition-colors">
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
            <div class="bg-gray-50 dark:bg-[#111827] border border-gray-100 dark:border-white/10 rounded-xl p-8 shadow-sm hover:border-emerald-500/30 transition-colors">
              <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-6">Contact Information</h3>
              
              <div class="flex flex-col gap-6">
                <!-- Location -->
                <div class="flex gap-4">
                  <div class="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <UIcon name="i-heroicons-map-pin" class="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h4 class="text-sm font-bold text-gray-900 dark:text-gray-200 mb-1">Office</h4>
                    <p class="text-sm text-gray-600 dark:text-gray-400">123 Tournament Ave.<br />New York, NY 10012</p>
                  </div>
                </div>

                <!-- Email -->
                <div class="flex gap-4">
                  <div class="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <UIcon name="i-heroicons-envelope" class="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h4 class="text-sm font-bold text-gray-900 dark:text-gray-200 mb-1">Email Us</h4>
                    <p class="text-sm text-gray-600 dark:text-gray-400">support@parascores.com</p>
                  </div>
                </div>

                <!-- Phone -->
                <div class="flex gap-4">
                  <div class="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <UIcon name="i-heroicons-phone" class="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h4 class="text-sm font-bold text-gray-900 dark:text-gray-200 mb-1">Call Us</h4>
                    <p class="text-sm text-gray-600 dark:text-gray-400">+1 (555) 123-4567</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Social Links -->
            <div class="bg-gray-50 dark:bg-[#111827] border border-gray-100 dark:border-white/10 rounded-xl p-8 shadow-sm hover:border-emerald-500/30 transition-colors">
              <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-4">Follow Us</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-6 font-medium">Stay up to date with the latest features and community tournaments.</p>
              <div class="flex flex-wrap gap-4">
                <a href="#" class="w-10 h-10 bg-white dark:bg-[#0d1424] border border-gray-200 dark:border-white/10 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-emerald-500 hover:border-emerald-500/50 transition-all shadow-sm">
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
            <div class="bg-white dark:bg-[#111827] border border-gray-100 dark:border-white/10 rounded-xl p-6 md:p-8 relative overflow-hidden shadow-sm">
              <div class="absolute top-0 right-0 p-32 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none"></div>
              
              <h3 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">Send us a message</h3>
              
              <UForm :schema="schema" :state="state" @submit="onSubmit" class="space-y-6 relative z-10">
                <div class="grid md:grid-cols-2 gap-6">
                  <UFormField label="Full Name" name="name">
                    <UInput v-model="state.name" placeholder="John Doe" size="lg" color="neutral" />
                  </UFormField>
                  <UFormField label="Email Address" name="email">
                    <UInput v-model="state.email" type="email" placeholder="john@example.com" size="lg" color="neutral" />
                  </UFormField>
                </div>

                <UFormField label="Subject" name="subject">
                  <UInput v-model="state.subject" placeholder="How can we help you?" size="lg" color="neutral" />
                </UFormField>

                <UFormField label="Message" name="message">
                  <UTextarea v-model="state.message" :rows="6" placeholder="Tell us more about your inquiry..." size="lg" color="neutral" />
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

<script setup lang="ts">
import { z } from 'zod'

// SEO
useSeoMeta({
  title: 'Contact Us - ParaScores',
  description: 'Get in touch with the ParaScores team for support, sales, or general inquiries.',
  ogTitle: 'Contact Us - ParaScores',
  ogDescription: 'Get in touch with the ParaScores team for support, sales, or general inquiries.',
})

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
