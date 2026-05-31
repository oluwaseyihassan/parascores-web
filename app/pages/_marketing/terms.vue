<template>
  <div class="bg-white dark:bg-[#070b10] min-h-screen text-gray-900 dark:text-white transition-colors">
    <!-- Hero Section -->
    <section class="relative pt-20 pb-16 overflow-hidden">
      <!-- Glow background -->
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-80 bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div class="max-w-7xl mx-auto px-6 relative z-10">
        <div class="text-center max-w-3xl mx-auto">
          <div class="inline-flex items-center gap-2 px-3 py-1.5 mb-6 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded">
            LEGAL & AGREEMENTS
          </div>
          <h1 class="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-4 tracking-tight">
            Terms of <span class="text-emerald-500">Service.</span>
          </h1>
          <p class="text-md text-gray-600 dark:text-gray-400 max-w-xl mx-auto font-medium">
            Last Updated: May 31, 2026. Please read these terms carefully before utilizing our tournament software and embedding widgets.
          </p>
        </div>
      </div>
    </section>

    <!-- Content Section -->
    <section class="pb-32">
      <div class="max-w-6xl mx-auto px-6">
        <div class="grid lg:grid-cols-[250px_1fr] gap-12 items-start">
          
          <!-- Sticky Navigation Sidebar -->
          <aside class="sticky top-24 hidden lg:block bg-gray-50/50 dark:bg-[#0c1017] border border-gray-100 dark:border-white/5 rounded-2xl p-6">
            <h3 class="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">On this page</h3>
            <nav class="flex flex-col gap-3">
              <a 
                v-for="item in navItems" 
                :key="item.id" 
                :href="`#${item.id}`" 
                class="text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
              >
                {{ item.title }}
              </a>
            </nav>
          </aside>

          <!-- Main Content -->
          <div class="bg-white dark:bg-[#0c1017] border border-gray-100 dark:border-white/5 rounded-2xl p-8 md:p-12 shadow-sm relative overflow-hidden">
            <div class="absolute top-0 right-0 p-32 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none"></div>

            <div class="space-y-12 relative z-10">
              <!-- Acceptance of Terms -->
              <div id="acceptance" class="scroll-mt-24">
                <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                  <span class="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                  1. Acceptance of Terms
                </h2>
                <div class="text-gray-600 dark:text-gray-300 leading-relaxed space-y-4">
                  <p>
                    By creating an account, subscribing, embedding tournament widgets, or utilizing any services provided by ParaScores ("we", "our", or "us"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not access or use the platform.
                  </p>
                  <p>
                    We reserve the right to update or modify these terms at any time without prior notice. The updated version will be indicated by the "Last Updated" date at the top. Continued use of our platform after updates indicates your acceptance of the revised terms.
                  </p>
                </div>
              </div>

              <!-- Account Registration -->
              <div id="accounts" class="scroll-mt-24">
                <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                  <span class="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                  2. Account & Organization
                </h2>
                <div class="text-gray-600 dark:text-gray-300 leading-relaxed space-y-4">
                  <p>
                    To configure tournaments and custom widgets, you must register for an account. You represent and warrant that all information you provide during onboarding is accurate, complete, and current.
                  </p>
                  <p>
                    You are solely responsible for maintaining the confidentiality of your credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use or security breach.
                  </p>
                </div>
              </div>

              <!-- Rules & Restrictions -->
              <div id="rules" class="scroll-mt-24">
                <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                  <span class="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                  3. Platform Usage Rules
                </h2>
                <div class="text-gray-600 dark:text-gray-300 leading-relaxed space-y-4">
                  <p>
                    When using ParaScores to host tournaments, register players, and embed standings, you agree NOT to:
                  </p>
                  <ul class="list-disc pl-6 space-y-2">
                    <li>Upload or enter false tournament results, fake team rosters, or copyrighted images without permission.</li>
                    <li>Attempt to disrupt, breach, or compromise the security, API services, or servers of ParaScores.</li>
                    <li>Embed tournament widgets on websites that contain, advocate, or promote illegal content, gambling, hate speech, or abuse.</li>
                    <li>Scrape data from our public pages or widgets using automated systems without our express written permission.</li>
                  </ul>
                </div>
              </div>

              <!-- Billing & Fees -->
              <div id="billing" class="scroll-mt-24">
                <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                  <span class="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                  4. Pricing, Subscriptions & Fees
                </h2>
                <div class="text-gray-600 dark:text-gray-300 leading-relaxed space-y-4">
                  <p>
                    Certain features, such as custom domain landing pages, premium graphics exports, and advanced widgets, may require subscription billing or one-time tournament fees:
                  </p>
                  <ul class="list-disc pl-6 space-y-2">
                    <li><strong>Pricing:</strong> Current rates are detailed on our Pricing page. All fees are in Nigerian Naira (₦) unless specified otherwise.</li>
                    <li><strong>Billing Cycle:</strong> Subscriptions are billed on a recurring monthly or yearly cycle, or per tournament setup. Fees are charged automatically via our payment processors.</li>
                    <li><strong>Cancellations:</strong> You can cancel recurring subscriptions at any time via your Billing settings dashboard. Services will remain active until the end of the current billing cycle.</li>
                    <li><strong>Refunds:</strong> Except as required by law, all payments and fees are non-refundable.</li>
                  </ul>
                </div>
              </div>

              <!-- Intellectual Property -->
              <div id="intellectual" class="scroll-mt-24">
                <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                  <span class="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                  5. Intellectual Property
                </h2>
                <div class="text-gray-600 dark:text-gray-300 leading-relaxed space-y-4">
                  <p>
                    The service, including code, architecture, graphics, brand icons, logo marks, and templates, is and will remain the exclusive property of ParaScores and its licensors.
                  </p>
                  <p>
                    <strong>Your Content:</strong> Any team logos, organization descriptions, banners, or player data that you upload remain your intellectual property. By uploading them, you grant us a worldwide, non-exclusive, royalty-free license to render and display them in matches, public pages, and embedded widgets as requested by your settings.
                  </p>
                </div>
              </div>

              <!-- Limitation of Liability -->
              <div id="liability" class="scroll-mt-24">
                <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                  <span class="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                  6. Limitation of Liability
                </h2>
                <div class="text-gray-600 dark:text-gray-300 leading-relaxed space-y-4">
                  <p>
                    ParaScores is provided on an "as is" and "as available" basis. We make no representations or warranties of any kind, express or implied, regarding the platform's reliability, accuracy, uptime, or compatibility.
                  </p>
                  <p>
                    In no event will we be liable for any direct, indirect, incidental, special, or consequential damages resulting from your use or inability to use the platform, including but not limited to database failures, tournament result disputes, or widget loading delays.
                  </p>
                </div>
              </div>

              <!-- Contact Us -->
              <div id="contact" class="scroll-mt-24 pt-6 border-t border-gray-100 dark:border-white/5">
                <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">Questions & Feedback</h2>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  If you have any questions, disputes, or feedback regarding these Terms of Service, please contact our legal representative at
                  <a href="mailto:admin@parascores.com" class="text-emerald-500 hover:underline">admin@parascores.com</a> or visit our
                  <NuxtLink to="/contact" class="text-emerald-500 hover:underline">Contact page</NuxtLink>.
                </p>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// SEO Meta
useSeoMeta({
  title: 'Terms of Service - ParaScores',
  description: 'Read the terms, guidelines, and rules for using the ParaScores tournament management software and widgets.',
  ogTitle: 'Terms of Service - ParaScores',
  ogDescription: 'Read the terms, guidelines, and rules for using the ParaScores tournament management software and widgets.',
})

// Sidebar Nav Items
const navItems = [
  { id: 'acceptance', title: '1. Acceptance' },
  { id: 'accounts', title: '2. Account Rules' },
  { id: 'rules', title: '3. Platform Usage' },
  { id: 'billing', title: '4. Billing & Fees' },
  { id: 'intellectual', title: '5. Intellectual Property' },
  { id: 'liability', title: '6. Limitation of Liability' },
]
</script>
