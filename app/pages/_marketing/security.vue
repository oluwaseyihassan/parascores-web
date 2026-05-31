<template>
  <div class="bg-white dark:bg-[#070b10] min-h-screen text-gray-900 dark:text-white transition-colors">
    <!-- Hero Section -->
    <section class="relative pt-20 pb-16 overflow-hidden">
      <!-- Glow background -->
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-80 bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div class="max-w-7xl mx-auto px-6 relative z-10">
        <div class="text-center max-w-3xl mx-auto">
          <div class="inline-flex items-center gap-2 px-3 py-1.5 mb-6 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded">
            TRUST & SECURITY
          </div>
          <h1 class="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-4 tracking-tight">
            Security <span class="text-emerald-500">Practices.</span>
          </h1>
          <p class="text-md text-gray-600 dark:text-gray-400 max-w-xl mx-auto font-medium">
            Learn about the protocols, encryption standards, and architectural defenses we employ to safeguard your tournament data.
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
              <!-- Commitment -->
              <div id="commitment" class="scroll-mt-24">
                <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                  <span class="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                  1. Our Commitment
                </h2>
                <div class="text-gray-600 dark:text-gray-300 leading-relaxed space-y-4">
                  <p>
                    At ParaScores, we understand that you trust us with your organization's statistics, rosters, matches, and user details. Security is not an afterthought; it is integrated into our backend architecture, API gateways, database rules, and front-end code.
                  </p>
                  <p>
                    We continually upgrade our practices, monitor traffic for anomalies, and conduct threat evaluations to prevent security risks and platform downtime.
                  </p>
                </div>
              </div>

              <!-- Encryption -->
              <div id="encryption" class="scroll-mt-24">
                <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                  <span class="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                  2. Data Encryption
                </h2>
                <div class="text-gray-600 dark:text-gray-300 leading-relaxed space-y-4">
                  <p>
                    We encrypt data both during transmission and at rest:
                  </p>
                  <ul class="list-disc pl-6 space-y-2">
                    <li>
                      <strong>In Transit:</strong> All web and API traffic is encrypted using Secure Sockets Layer / Transport Layer Security (HTTPS with TLS 1.3). Any HTTP connection is automatically redirected to secure HTTPS connections.
                    </li>
                    <li>
                      <strong>At Rest:</strong> Databases, logs, and uploaded crests/banners are stored on secure cloud services utilizing AES-256 encryption. Backup instances are also fully encrypted.
                    </li>
                  </ul>
                </div>
              </div>

              <!-- Access Control -->
              <div id="access" class="scroll-mt-24">
                <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                  <span class="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                  3. Access Control & Authorization
                </h2>
                <div class="text-gray-600 dark:text-gray-300 leading-relaxed space-y-4">
                  <p>
                    We protect access to accounts and organization workspaces using strict verification mechanisms:
                  </p>
                  <ul class="list-disc pl-6 space-y-2">
                    <li>
                      <strong>Password Hashing:</strong> Passwords are never stored in plain text. We hash user credentials using industry-proven, high-performance password-hashing algorithms (bcrypt) before saving them to database storage.
                    </li>
                    <li>
                      <strong>Token-Based Authentication:</strong> Sessions are secured using JSON Web Tokens (JWT) containing expiration parameters and cryptographic signatures.
                    </li>
                    <li>
                      <strong>Multi-Tenant Isolation:</strong> Data rows are separated with database queries validated at the API level (e.g. verifying role mappings like OWNER, ADMIN, and MEMBER) before returning resources.
                    </li>
                  </ul>
                </div>
              </div>

              <!-- Infrastructure -->
              <div id="infrastructure" class="scroll-mt-24">
                <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                  <span class="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                  4. Infrastructure & Hosting Security
                </h2>
                <div class="text-gray-600 dark:text-gray-300 leading-relaxed space-y-4">
                  <p>
                    Our application and database assets are hosted on enterprise cloud providers (such as Vercel and AWS) that feature advanced security postures:
                  </p>
                  <ul class="list-disc pl-6 space-y-2">
                    <li>
                      <strong>Physical Security:</strong> Data centers utilize biometrics, 24/7 security staff, and surveillance monitors.
                    </li>
                    <li>
                      <strong>DDoS Protection:</strong> Automated network traffic filtering mitigates Distributed Denial of Service (DDoS) attempts, safeguarding widget delivery and website uptime.
                    </li>
                    <li>
                      <strong>System Backups:</strong> Automated daily backups are maintained across multiple geographic availability zones to guarantee rapid recovery in the event of an outage.
                    </li>
                  </ul>
                </div>
              </div>

              <!-- Vulnerability Reporting -->
              <div id="reporting" class="scroll-mt-24">
                <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                  <span class="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                  5. Reporting Vulnerabilities
                </h2>
                <div class="text-gray-600 dark:text-gray-300 leading-relaxed space-y-4">
                  <p>
                    We appreciate the security community's work in keeping the internet safe. If you discover a vulnerability or a bug in our tournament platform or widget scripts, please report it to us immediately.
                  </p>
                  <p>
                    Send vulnerability details directly to:
                    <a href="mailto:admin@parascores.com" class="text-emerald-500 hover:underline">admin@parascores.com</a>.
                    Please provide steps to reproduce the issue, and allow us reasonable time to respond and deploy a fix before sharing any information publicly.
                  </p>
                </div>
              </div>

              <!-- Contact Us -->
              <div id="contact" class="scroll-mt-24 pt-6 border-t border-gray-100 dark:border-white/5">
                <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">Security Contact</h2>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  For any security questions, report details, or compliance queries, please reach out to our security officer at
                  <a href="mailto:admin@parascores.com" class="text-emerald-500 hover:underline">admin@parascores.com</a>.
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
  title: 'Security Practices - ParaScores',
  description: 'Understand the encryption standards, authentication protocols, and cloud infrastructure safeguards we use at ParaScores.',
  ogTitle: 'Security Practices - ParaScores',
  ogDescription: 'Understand the encryption standards, authentication protocols, and cloud infrastructure safeguards we use at ParaScores.',
})

// Sidebar Nav Items
const navItems = [
  { id: 'commitment', title: '1. Commitment' },
  { id: 'encryption', title: '2. Encryption' },
  { id: 'access', title: '3. Access Control' },
  { id: 'infrastructure', title: '4. Infrastructure' },
  { id: 'reporting', title: '5. Reporting Bugs' },
]
</script>
