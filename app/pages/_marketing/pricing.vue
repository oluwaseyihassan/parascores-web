<template>
  <div class="bg-white dark:bg-[#0A0F1C] min-h-screen text-gray-900 dark:text-white pb-32 transition-colors">
    <!-- Hero Section -->
    <section class="relative pt-20 pb-12 overflow-hidden">
      <div class="max-w-7xl mx-auto px-6">
        <div class="text-center max-w-3xl mx-auto">
          <div class="inline-flex items-center gap-2 px-3 py-1.5 mb-8 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded">
            PRICING
          </div>
          <h1 class="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight mb-6 tracking-tight">
            Simple, transparent <span class="text-emerald-500">Pricing.</span>
          </h1>
          <p class="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-xl mx-auto font-medium">
            Tournaments designed to fit your scale. Start for free, upgrade when you need more power.
          </p>
        </div>
      </div>
    </section>

    <!-- Billing Toggle -->
    <section class="mb-16">
      <div class="flex items-center justify-center gap-4">
        <span :class="['text-sm font-bold transition-colors', !isYearly ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400']">Monthly</span>
        <UToggle v-model="isYearly" color="primary" size="lg" class="ui-emerald-500" />
        <span :class="['text-sm font-bold transition-colors flex items-center', isYearly ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400']">
          Yearly 
          <span class="ml-2 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 py-0.5 px-2 rounded-full uppercase tracking-wider">
            Save 20%
          </span>
        </span>
      </div>
    </section>

    <!-- Pricing Cards -->
    <section class="max-w-7xl mx-auto px-6 mb-32 relative">
      <!-- Glow Effect Behind Cards -->
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-96 bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none z-0"></div>
      
      <div class="grid lg:grid-cols-3 gap-8 relative z-10 items-start">
        <div v-for="tier in tiers" :key="tier.name" 
          :class="['bg-white dark:bg-[#111827] rounded-2xl p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl flex flex-col transition-colors', 
            tier.popular ? 'border-2 border-emerald-500 shadow-xl shadow-emerald-500/10 lg:-mt-4 relative' : 'border border-gray-200 dark:border-white/10 hover:border-emerald-500/30 relative mt-4 shadow-sm']">
          
          <div v-if="tier.popular" class="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-extrabold px-4 py-1 rounded-full uppercase tracking-wider shadow-lg">
            Most Popular
          </div>

          <h3 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">{{ tier.name }}</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-6 min-h-[40px] leading-relaxed font-medium">{{ tier.description }}</p>

          <div class="mb-6">
            <template v-if="tier.monthlyPrice === 'Custom'">
              <span class="text-4xl font-extrabold text-gray-900 dark:text-white">Custom</span>
            </template>
            <template v-else>
              <span class="text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight">${{ isYearly ? (tier.yearlyPrice as number) / 12 : tier.monthlyPrice }}</span>
              <span class="text-gray-500 dark:text-gray-400 font-bold ml-1">/mo</span>
              <div v-if="isYearly && (tier.monthlyPrice as number) > 0" class="text-sm text-emerald-600 dark:text-emerald-400 mt-2 font-bold">
                Billed ${{ tier.yearlyPrice }} yearly
              </div>
              <div v-else-if="(tier.monthlyPrice as number) > 0" class="text-sm text-gray-500 mt-2 opacity-0">
                Spacer
              </div>
            </template>
          </div>

          <UButton 
            block 
            size="lg" 
            :to="tier.name === 'Enterprise' ? '/contact' : '/auth/signup'"
            :class="[
              'font-bold mb-8 h-12 flex items-center justify-center transition-all duration-200 shadow-sm rounded-xl',
              tier.buttonColor === 'emerald' ? 'bg-emerald-500 hover:bg-emerald-600 text-white ring-0' : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10'
            ]"
          >
            {{ tier.buttonText }}
          </UButton>

          <div class="space-y-4 flex-grow border-t border-gray-100 dark:border-white/10 pt-6 mt-2">
            <div class="text-xs font-extrabold text-gray-400 dark:text-gray-500 tracking-widest uppercase">What's included:</div>
            <ul class="space-y-4">
              <li v-for="feature in tier.features" :key="feature" class="flex items-start gap-3">
                <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span class="text-sm text-gray-700 dark:text-gray-300 leading-tight font-medium">{{ feature }}</span>
              </li>
            </ul>
          </div>

        </div>
      </div>
    </section>

    <!-- FAQ Section -->
    <section class="max-w-4xl mx-auto px-6 relative z-10">
      <div class="text-center mb-16">
        <h2 class="text-3xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">Frequently Asked Questions</h2>
        <p class="text-gray-600 dark:text-gray-400 text-lg font-medium">Have another question? <NuxtLink to="/contact" class="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 font-bold underline underline-offset-4 transition-colors">Contact us</NuxtLink>.</p>
      </div>

      <div class="grid md:grid-cols-2 gap-6">
        <div v-for="(faq, i) in faqs" :key="i" class="bg-gray-50 dark:bg-[#111827] border border-gray-100 dark:border-white/5 rounded-xl p-6 hover:border-emerald-500/20 dark:hover:border-white/10 transition-colors shadow-sm">
          <h4 class="text-gray-900 dark:text-white font-bold mb-3 leading-snug">{{ faq.question }}</h4>
          <p class="text-gray-600 dark:text-gray-400 text-sm leading-relaxed font-medium">{{ faq.answer }}</p>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

useSeoMeta({
  title: 'Pricing - ParaScores',
  description: 'Simple, transparent pricing for tournament organizers of all sizes.',
  ogTitle: 'Pricing - ParaScores'
})

const isYearly = ref(true)

const tiers = [
  {
    name: 'Free',
    description: 'For casual organizers running small, community tournaments with a group of friends.',
    monthlyPrice: 0,
    yearlyPrice: 0,
    buttonText: 'Get Started for Free',
    buttonColor: 'gray',
    popular: false,
    features: [
      'Up to 3 active tournaments',
      'Max 32 participants per tournament',
      'Basic brackets and leaderboards',
      'Standard email support'
    ]
  },
  {
    name: 'Pro',
    description: 'For serious organizers running large-scale or frequent competitive events.',
    monthlyPrice: 15,
    yearlyPrice: 144, // 12/mo
    buttonText: 'Start Free 14-day Trial',
    buttonColor: 'emerald',
    popular: true,
    features: [
      'Unlimited active tournaments',
      'Unlimited participants',
      'Custom branding & logos',
      'Advanced statistics & analytics',
      'Priority email support',
      'API Access (read-only)'
    ]
  },
  {
    name: 'Enterprise',
    description: 'For organizations needing custom integrations, huge scale, and white-labeling.',
    monthlyPrice: 'Custom',
    yearlyPrice: 'Custom',
    buttonText: 'Contact Sales',
    buttonColor: 'gray',
    popular: false,
    features: [
      'Everything in Pro tier',
      'White-labeling options',
      'Dedicated Account Manager',
      'SLA Support guarantee',
      'Full API Access (Read/Write)',
      'Custom integrations'
    ]
  }
]

const faqs = [
  { 
    question: 'Can I switch from Monthly to Yearly later?', 
    answer: 'Yes! You can upgrade to a yearly plan at any time from your billing dashboard. We will automatically prorate the difference.' 
  },
  { 
    question: 'Do you offer a free trial for Pro?', 
    answer: 'Yes, we offer a generous 14-day free trial for the Pro plan so you can test out all the advanced features risk-free.' 
  },
  { 
    question: 'What payment methods do you accept?', 
    answer: 'We securely accept all major credit cards (Visa, Mastercard, Amex), PayPal, as well as Apple Pay and Google Pay.' 
  },
  { 
    question: 'Can I cancel my subscription?', 
    answer: 'Absolutely. You can cancel your subscription at any time. Your premium features will remain active until the end of your current billing cycle.' 
  }
]
</script>
