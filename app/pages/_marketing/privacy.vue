<template>
  <div class="bg-white dark:bg-[#070b10] min-h-screen text-gray-900 dark:text-white transition-colors">
    <!-- Hero Section -->
    <section class="relative pt-20 pb-16 overflow-hidden">
      <!-- Glow background -->
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-80 bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div class="max-w-7xl mx-auto px-6 relative z-10">
        <div class="text-center max-w-3xl mx-auto">
          <div class="inline-flex items-center gap-2 px-3 py-1.5 mb-6 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded">
            LEGAL & POLICY
          </div>
          <h1 class="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-4 tracking-tight">
            Privacy <span class="text-emerald-500">Policy.</span>
          </h1>
          <p class="text-md text-gray-600 dark:text-gray-400 max-w-xl mx-auto font-medium">
            Last Updated: May 31, 2026. Learn how we collect, use, and protect your personal and tournament data.
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
              <!-- Introduction -->
              <div id="introduction" class="scroll-mt-24">
                <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                  <span class="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                  1. Introduction
                </h2>
                <div class="text-gray-600 dark:text-gray-300 leading-relaxed space-y-4">
                  <p>
                    Welcome to ParaScores ("we", "our", or "us"). We provide a tournament management platform, interactive widget embeds, and live score services. We are committed to protecting your privacy and ensuring your personal information is handled in a safe and responsible manner.
                  </p>
                  <p>
                    This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website, register an account, and use our tournament widgets or score graphics. By accessing or using our services, you consent to the practices described in this policy.
                  </p>
                </div>
              </div>

              <!-- Information We Collect -->
              <div id="collection" class="scroll-mt-24">
                <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                  <span class="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                  2. Information We Collect
                </h2>
                <div class="text-gray-600 dark:text-gray-300 leading-relaxed space-y-4">
                  <p>
                    We collect several types of information to provide and improve our services:
                  </p>
                  <ul class="list-disc pl-6 space-y-2">
                    <li>
                      <strong>Account Data:</strong> When you register, we collect details such as your name, email address, organization name, phone/WhatsApp number, and account preferences.
                    </li>
                    <li>
                      <strong>Tournament & Participant Data:</strong> Data that you upload to run your leagues or tournaments, including team names, player rosters, matches, scores, tournament schedules, and logo graphics.
                    </li>
                    <li>
                      <strong>Usage & Technical Data:</strong> IP addresses, browser types, operating systems, referring URLs, pages viewed, device information, and diagnostic log data collected via standard cookies and monitoring services.
                    </li>
                  </ul>
                </div>
              </div>

              <!-- How We Use Information -->
              <div id="usage" class="scroll-mt-24">
                <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                  <span class="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                  3. How We Use Your Information
                </h2>
                <div class="text-gray-600 dark:text-gray-300 leading-relaxed space-y-4">
                  <p>
                    We utilize the collected information for various operational and product improvement purposes:
                  </p>
                  <ul class="list-disc pl-6 space-y-2">
                    <li>To configure, run, and host your sport tournaments, leagues, and standings.</li>
                    <li>To render live tournament widgets and embed codes across third-party websites.</li>
                    <li>To process registrations, handle subscriptions, and prevent platform misuse.</li>
                    <li>To send administrative notifications, updates, and customer support communications.</li>
                    <li>To analyze user engagement and optimize layout features, loading performance, and UI responsiveness.</li>
                  </ul>
                </div>
              </div>

              <!-- Information Sharing -->
              <div id="sharing" class="scroll-mt-24">
                <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                  <span class="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                  4. Sharing & Disclosure
                </h2>
                <div class="text-gray-600 dark:text-gray-300 leading-relaxed space-y-4">
                  <p>
                    We do not sell your personal data. We only share information under the following limited circumstances:
                  </p>
                  <ul class="list-disc pl-6 space-y-2">
                    <li>
                      <strong>Public Views:</strong> Tournament details, match fixtures, team sheets, and live match scores are publicly visible on our platform and nested widgets by design.
                    </li>
                    <li>
                      <strong>Service Providers:</strong> We share data with verified third-party subprocessors who assist in running our infrastructure (e.g. database hosting, transactional email service, and security monitors).
                    </li>
                    <li>
                      <strong>Legal Compliance:</strong> If required by law, we may disclose details to comply with legal processes or protect the rights, safety, and property of ParaScores and its users.
                    </li>
                  </ul>
                </div>
              </div>

              <!-- Data Security -->
              <div id="security" class="scroll-mt-24">
                <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                  <span class="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                  5. Data Security & Storage
                </h2>
                <div class="text-gray-600 dark:text-gray-300 leading-relaxed space-y-4">
                  <p>
                    We employ industry-standard security measures, including HTTPS encryption, secure database access control layers, and regular code reviews, to protect your personal and tournament data against unauthorized access, loss, or disclosure.
                  </p>
                  <p>
                    While we make every effort to guard your data, no method of transmission or electronic storage is completely secure, and we cannot guarantee absolute data security.
                  </p>
                </div>
              </div>

              <!-- Your Rights -->
              <div id="rights" class="scroll-mt-24">
                <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                  <span class="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                  6. Your Rights & Choices
                </h2>
                <div class="text-gray-600 dark:text-gray-300 leading-relaxed space-y-4">
                  <p>
                    You have control over your data on our platform:
                  </p>
                  <ul class="list-disc pl-6 space-y-2">
                    <li>You can review and update account credentials or organization branding through the Settings dashboard.</li>
                    <li>You may request complete account termination and the permanent deletion of your organization records.</li>
                    <li>You can disable marketing newsletters or email summaries by clicking the unsubscribe link.</li>
                  </ul>
                </div>
              </div>

              <!-- Contact Us -->
              <div id="contact" class="scroll-mt-24 pt-6 border-t border-gray-100 dark:border-white/5">
                <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">Questions & Feedback</h2>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  If you have any questions or feedback regarding this Privacy Policy, please contact our support team at
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
  title: 'Privacy Policy - ParaScores',
  description: 'Learn how we collect, process, and protect your personal and tournament data on ParaScores.',
  ogTitle: 'Privacy Policy - ParaScores',
  ogDescription: 'Learn how we collect, process, and protect your personal and tournament data on ParaScores.',
})

// Sidebar Nav Items
const navItems = [
  { id: 'introduction', title: '1. Introduction' },
  { id: 'collection', title: '2. Information Collection' },
  { id: 'usage', title: '3. Use of Information' },
  { id: 'sharing', title: '4. Sharing & Disclosure' },
  { id: 'security', title: '5. Data Security' },
  { id: 'rights', title: '6. Your Rights' },
]
</script>
