<template>
  <div class="bg-[#0A0F1C] min-h-screen text-white">
    <!-- Hero Section -->
    <section class="relative pt-20 pb-32 overflow-hidden">
      <div class="max-w-7xl mx-auto px-6">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
          <!-- Left Content -->
          <div>
            <!-- Badge -->
            <div class="inline-flex items-center gap-2 px-3 py-1.5 mb-8 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded">
              <span class="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              V2.0 SYSTEM ONLINE
            </div>

            <!-- Headline -->
            <h1 class="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
              Tournaments<br />
              Managed.<br />
              <span class="text-emerald-400">Simply.</span>
            </h1>

            <!-- Subtitle -->
            <p class="text-lg text-gray-400 mb-2 max-w-md">
              The definitive platform for esports brackets, live scoring, and player statistics.
            </p>
            <p class="text-lg font-medium text-white mb-8">
              Zero latency. Pure data.
            </p>

            <!-- CTAs -->
            <div class="flex flex-wrap gap-4">
              <NuxtLink
                to="/signup"
                class="px-6 py-3 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded transition-colors"
              >
                Create Tournament
              </NuxtLink>
              <NuxtLink
                to="/docs"
                class="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white border border-white/20 hover:border-white/40 rounded transition-colors"
              >
                View Documentation
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                </svg>
              </NuxtLink>
            </div>
          </div>

          <!-- Right Mockup -->
          <div class="relative">
            <!-- Tournament Badge -->
            <div class="absolute -top-4 right-12 z-10 px-4 py-2 bg-[#111827] border border-emerald-500/30 rounded-lg">
              <div class="text-xs text-gray-400">ESPL LEAGUE</div>
              <div class="flex items-center gap-2">
                <span class="text-emerald-400">🏆</span>
                <span class="font-medium text-emerald-400">Summer Split '25</span>
              </div>
            </div>

            <!-- Main Dashboard Mockup -->
            <div class="bg-[#111827] border border-white/10 rounded-lg overflow-hidden">
              <!-- Window Controls -->
              <div class="flex items-center gap-2 px-4 py-3 border-b border-white/10">
                <div class="flex gap-1.5">
                  <div class="w-3 h-3 rounded-full bg-red-500"></div>
                  <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div class="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div class="ml-4 px-3 py-1 text-xs text-gray-500 bg-black/30 rounded">
                  TOURNAMENT_ID: #587215
                </div>
              </div>

              <!-- Dashboard Content -->
              <div class="p-6 grid grid-cols-2 gap-4">
                <!-- Left Panel - Match List -->
                <div class="space-y-3">
                  <div class="text-xs text-gray-500 mb-2">MATCH 01</div>
                  <div class="flex justify-between text-sm">
                    <span class="text-white">Alpha</span>
                    <span class="font-medium text-white">3</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-400">Beta</span>
                    <span class="text-gray-400">1</span>
                  </div>
                  
                  <div class="text-xs text-gray-500 mt-4 mb-2">MATCH 02</div>
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-400">Gamma</span>
                    <span class="text-gray-400">0</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-400">Delta</span>
                    <span class="text-gray-400">0</span>
                  </div>
                </div>

                <!-- Right Panel - Live Match -->
                <div class="bg-[#0A0F1C] border border-white/10 rounded-lg p-4">
                  <div class="flex items-center justify-between mb-4">
                    <span class="text-xs text-gray-500">SEMIFINAL</span>
                    <span class="px-2 py-0.5 text-xs text-emerald-400 bg-emerald-500/20 rounded">● LIVE</span>
                  </div>
                  <div class="space-y-2">
                    <div class="flex items-center justify-between p-2 bg-emerald-500/10 border border-emerald-500/30 rounded">
                      <div class="flex items-center gap-2">
                        <div class="w-6 h-6 bg-gray-700 rounded flex items-center justify-center text-xs">A</div>
                        <span class="font-medium">ALPHA</span>
                      </div>
                      <span class="text-xl font-bold">3</span>
                    </div>
                    <div class="flex items-center justify-between p-2 bg-white/5 rounded">
                      <div class="flex items-center gap-2">
                        <div class="w-6 h-6 bg-gray-700 rounded flex items-center justify-center text-xs">Ω</div>
                        <span>OMEGA</span>
                      </div>
                      <span class="text-xl font-bold text-gray-400">1</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Player Activity Card -->
            <div class="absolute -bottom-8 -right-4 w-48 bg-[#111827] border border-white/10 rounded-lg p-4">
              <div class="text-xs text-gray-500 mb-3">PLAYER ACTIVITY</div>
              <div class="flex items-end gap-1 h-16">
                <div class="flex-1 bg-emerald-500/30 rounded-t" style="height: 40%"></div>
                <div class="flex-1 bg-emerald-500/30 rounded-t" style="height: 60%"></div>
                <div class="flex-1 bg-emerald-500/30 rounded-t" style="height: 45%"></div>
                <div class="flex-1 bg-emerald-500/30 rounded-t" style="height: 80%"></div>
                <div class="flex-1 bg-emerald-500 rounded-t" style="height: 100%"></div>
              </div>
              <div class="mt-2 text-right text-emerald-400 text-sm font-medium">+24%</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Trusted By Section -->
    <section class="py-12 border-t border-white/10">
      <div class="max-w-7xl mx-auto px-6">
        <p class="text-center text-xs font-medium text-gray-500 uppercase tracking-[0.2em] mb-8">
          Trusted by Elite Organizations
        </p>
        <div class="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          <div class="flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors">
            <span class="text-xl">▲</span>
            <span class="font-semibold tracking-wide">NEXUS</span>
          </div>
          <div class="flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors">
            <span class="text-xl">⚡</span>
            <span class="font-semibold tracking-wide">HYPERION</span>
          </div>
          <div class="flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors">
            <span class="text-xl">✦</span>
            <span class="font-semibold tracking-wide">STRATOS</span>
          </div>
          <div class="flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors">
            <span class="text-xl">◈</span>
            <span class="font-semibold tracking-wide">VOXEL</span>
          </div>
          <div class="flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors">
            <span class="text-xl">⚙</span>
            <span class="font-semibold tracking-wide">CORE</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Intro Section -->
    <section class="py-24">
      <div class="max-w-7xl mx-auto px-6">
        <!-- Section Header -->
        <div class="max-w-xl mb-16">
          <h2 class="text-4xl md:text-5xl font-bold mb-4">
            Engineered for<br />
            <span class="text-emerald-400 underline decoration-emerald-400 underline-offset-8">Competition.</span>
          </h2>
        </div>

        <!-- Feature Cards -->
        <div class="grid md:grid-cols-3 gap-6">
          <!-- Real-Time WebSocket Sync -->
          <div class="bg-[#111827] border border-white/10 rounded-lg p-6 hover:border-white/20 transition-colors">
            <div class="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold mb-2">Real-Time WebSocket Sync</h3>
            <p class="text-sm text-gray-400">
              Score updates propagate instantly to millions of connected clients. No refresh required. 15ms global latency.
            </p>
          </div>

          <!-- Chaos-Free Scheduling -->
          <div class="bg-[#111827] border border-white/10 rounded-lg p-6 hover:border-white/20 transition-colors">
            <div class="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold mb-2">Chaos-Free Scheduling</h3>
            <p class="text-sm text-gray-400 mb-4">
              Forget spreadsheets. Generate round-robin, knockout, or group stage schedules in one click. Our engine handles conflict resolution automatically.
            </p>
            <ul class="text-xs text-gray-500 space-y-1">
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                Drag-and-drop fixture management
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                Automatic table calculation
              </li>
            </ul>
          </div>

          <!-- Embeddable Live Widgets -->
          <div class="bg-[#111827] border border-white/10 rounded-lg p-6 hover:border-white/20 transition-colors">
            <div class="bg-[#0A0F1C] border border-white/10 rounded p-3 mb-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs text-gray-500">LIVE WIDGET</span>
                <span class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              </div>
              <div class="space-y-1">
                <div class="flex items-center justify-between text-sm">
                  <div class="flex items-center gap-2">
                    <div class="w-4 h-4 bg-emerald-500 rounded"></div>
                    <span>Team A</span>
                  </div>
                  <span class="text-emerald-400 font-medium">3</span>
                </div>
                <div class="flex items-center justify-between text-sm">
                  <div class="flex items-center gap-2">
                    <div class="w-4 h-4 bg-red-500 rounded"></div>
                    <span>Team B</span>
                  </div>
                  <span class="font-medium">2</span>
                </div>
              </div>
            </div>
            <h3 class="text-lg font-semibold mb-2">Embeddable Live Widgets</h3>
            <p class="text-sm text-gray-400">
              Drop a single line of code to embed fully interactive brackets and score tickers on your own website.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Feature Grid Section -->
    <section class="py-24 border-t border-white/10">
      <div class="max-w-7xl mx-auto px-6">
        <div class="grid md:grid-cols-3 gap-6">
          <!-- Headless API - Highlighted -->
          <div class="bg-[#111827] border-2 border-emerald-500/50 rounded-lg p-6">
            <div class="flex items-center justify-between mb-4">
              <div class="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <span class="text-emerald-400 font-mono text-lg">&lt;/&gt;</span>
              </div>
              <span class="text-gray-600 text-2xl">↔</span>
            </div>
            <h3 class="text-lg font-semibold text-emerald-400 mb-2">Headless API</h3>
            <p class="text-sm text-gray-400">
              Build your own frontend. Our robust JSON API gives you full read/write access to every match, player, and stat.
            </p>
          </div>

          <!-- Social Media Ready -->
          <div class="bg-[#111827] border border-white/10 rounded-lg p-6 hover:border-white/20 transition-colors">
            <div class="flex items-center justify-between mb-4">
              <div class="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              </div>
            </div>
            <h3 class="text-lg font-semibold mb-2">Social Media Ready. Instantly.</h3>
            <p class="text-sm text-gray-400 mb-4">
              Don't wait for a designer. Generate stunning match results, league tables, and player quote graphics directly from your match data.
            </p>
            <ul class="text-xs text-gray-500 space-y-1">
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                Auto-populated data templates
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                Custom branding & logos
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                Download in HD for <span class="text-emerald-400">Instagram/Twitter</span>
              </li>
            </ul>
          </div>

          <!-- Match Verification -->
          <div class="bg-[#111827] border border-white/10 rounded-lg p-6 hover:border-white/20 transition-colors">
            <div class="flex items-center justify-between mb-4">
              <div class="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                </svg>
              </div>
            </div>
            <h3 class="text-lg font-semibold mb-2">Match Verification</h3>
            <p class="text-sm text-gray-400">
              Dispute resolution tools and screenshot verification workflows built directly into the match lobby.
            </p>
          </div>

          <!-- Prize Payouts -->
          <div class="bg-[#111827] border border-white/10 rounded-lg p-6 hover:border-white/20 transition-colors">
            <div class="flex items-center justify-between mb-4">
              <div class="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
            </div>
            <h3 class="text-lg font-semibold mb-2">Prize Payouts</h3>
            <p class="text-sm text-gray-400">
              Automated prize pool distribution via Stripe Connect or PayPal. Handle entry fees securely.
            </p>
          </div>

          <!-- Deep Analytics -->
          <div class="bg-[#111827] border border-white/10 rounded-lg p-6 hover:border-white/20 transition-colors">
            <div class="flex items-center justify-between mb-4">
              <div class="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
              </div>
            </div>
            <h3 class="text-lg font-semibold mb-2">Deep Analytics</h3>
            <p class="text-sm text-gray-400">
              Player performance heatmaps, APM tracking, and historical ELO ratings generated automatically.
            </p>
          </div>

          <!-- Role Management -->
          <div class="bg-[#111827] border border-white/10 rounded-lg p-6 hover:border-white/20 transition-colors">
            <div class="flex items-center justify-between mb-4">
              <div class="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
              </div>
            </div>
            <h3 class="text-lg font-semibold mb-2">Role Management</h3>
            <p class="text-sm text-gray-400">
              Granular permissions for Admins, Referees, and Casters. Invite staff with a single link.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Embed Anywhere Section -->
    <section class="py-24 border-t border-white/10">
      <div class="max-w-7xl mx-auto px-6">
        <div class="grid lg:grid-cols-2 gap-12 items-start">
          <!-- Left Content -->
          <div>
            <h2 class="text-4xl font-bold mb-4">Embed Anywhere.</h2>
            <p class="text-gray-400 mb-8 max-w-md">
              Customize your tournament widget and drop it into your React, Vue, or vanilla JS app with one line of code.
            </p>

            <!-- Widget Customizer Mockup -->
            <div class="bg-[#111827] border border-white/10 rounded-lg p-6">
              <div class="mb-6">
                <div class="text-xs text-gray-500 uppercase tracking-wider mb-3">Accent Color</div>
                <div class="flex gap-2">
                  <button class="w-8 h-8 bg-emerald-500 rounded ring-2 ring-white ring-offset-2 ring-offset-[#111827]"></button>
                  <button class="w-8 h-8 bg-blue-500 rounded"></button>
                  <button class="w-8 h-8 bg-red-500 rounded"></button>
                  <button class="w-8 h-8 bg-orange-500 rounded"></button>
                </div>
              </div>

              <div class="mb-6">
                <div class="text-xs text-gray-500 uppercase tracking-wider mb-3">View Mode</div>
                <div class="flex">
                  <button class="flex-1 px-4 py-2 text-sm font-medium text-white bg-white/10 border border-white/20 rounded-l">BRACKET</button>
                  <button class="flex-1 px-4 py-2 text-sm font-medium text-gray-400 border border-white/10 rounded-r">MATCH LIST</button>
                </div>
              </div>

              <div class="flex items-center justify-between mb-6">
                <span class="text-sm font-medium">Show Live Indicator</span>
                <div class="w-12 h-6 bg-emerald-500 rounded-full relative">
                  <div class="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>

              <div class="bg-[#0A0F1C] rounded p-3 font-mono text-xs">
                <div class="text-gray-500">&lt;ParaWidget</div>
                <div class="pl-4 text-emerald-400">id="<span class="text-white">tour_4k021</span>"</div>
                <div class="pl-4 text-emerald-400">theme="<span class="text-white">dark</span>"</div>
                <div class="text-gray-500">/&gt;</div>
              </div>
            </div>
          </div>

          <!-- Right Widget Preview -->
          <div class="bg-[#0A0F1C] border border-white/10 rounded-lg p-6">
            <div class="flex items-center gap-2 text-xs text-gray-500 mb-6">
              <span>PREVIEW_MODE:</span>
              <span class="text-emerald-400">INTERACTIVE</span>
            </div>

            <div class="bg-[#111827] border border-white/10 rounded-lg overflow-hidden">
              <div class="flex items-center justify-between p-4 border-b border-white/10">
                <span class="font-medium">Summer Championship</span>
                <span class="px-2 py-1 text-xs text-red-400 bg-red-500/20 rounded">LIVE NOW</span>
              </div>
              <div class="p-4 space-y-2">
                <div class="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/30 rounded">
                  <div class="flex items-center gap-3">
                    <div class="w-6 h-6 bg-gray-600 rounded"></div>
                    <span>Team Liquid</span>
                  </div>
                  <span class="text-emerald-400 font-bold">2</span>
                </div>
                <div class="flex items-center justify-between p-3 bg-white/5 rounded">
                  <div class="flex items-center gap-3">
                    <div class="w-6 h-6 bg-gray-600 rounded"></div>
                    <span>Cloud9</span>
                  </div>
                  <span class="font-bold">0</span>
                </div>
              </div>
              <div class="p-3 text-center text-xs text-gray-500 border-t border-white/10">
                POWERED BY PARASCORES
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Graphics Studio Section -->
    <section class="py-24 border-t border-white/10">
      <div class="max-w-7xl mx-auto px-6">
        <div class="grid lg:grid-cols-2 gap-12 items-start">
          <!-- Left Content -->
          <div>
            <!-- Badge -->
            <div class="inline-flex items-center gap-2 px-3 py-1.5 mb-6 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded">
              ✏️ GRAPHICS STUDIO
            </div>

            <h2 class="text-4xl font-bold mb-4">
              Broadcast-Ready<br />
              Visuals.
            </h2>
            <p class="text-gray-400 mb-8 max-w-md">
              Generate professional post-match graphics, stream overlays, and social media assets directly from your tournament data.
            </p>

            <!-- Template Builder Mockup -->
            <div class="bg-[#111827] border border-white/10 rounded-lg p-6">
              <div class="mb-6">
                <div class="text-xs text-gray-500 uppercase tracking-wider mb-3">Template</div>
                <div class="flex">
                  <button class="flex-1 px-4 py-2 text-sm font-medium text-white bg-emerald-500 rounded-l">VERSUS</button>
                  <button class="flex-1 px-4 py-2 text-sm font-medium text-gray-400 bg-white/5 rounded-r">WINNER</button>
                </div>
              </div>

              <div class="mb-6">
                <div class="text-xs text-gray-500 uppercase tracking-wider mb-3">Match Details</div>
                <div class="space-y-3">
                  <div>
                    <label class="text-xs text-gray-500">TOURNAMENT PHASE</label>
                    <input type="text" value="GRAND FINAL" class="w-full mt-1 px-3 py-2 text-sm bg-[#0A0F1C] border border-white/10 rounded text-white" />
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="text-xs text-gray-500">TEAM A NAME</label>
                      <input type="text" value="Team Alpha" class="w-full mt-1 px-3 py-2 text-sm bg-[#0A0F1C] border border-white/10 rounded text-white" />
                    </div>
                    <div>
                      <label class="text-xs text-gray-500">SCORE A</label>
                      <input type="text" value="3" class="w-full mt-1 px-3 py-2 text-sm bg-[#0A0F1C] border border-white/10 rounded text-white" />
                    </div>
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="text-xs text-gray-500">TEAM B NAME</label>
                      <input type="text" value="Team Omega" class="w-full mt-1 px-3 py-2 text-sm bg-[#0A0F1C] border border-white/10 rounded text-white" />
                    </div>
                    <div>
                      <label class="text-xs text-gray-500">SCORE B</label>
                      <input type="text" value="1" class="w-full mt-1 px-3 py-2 text-sm bg-[#0A0F1C] border border-white/10 rounded text-white" />
                    </div>
                  </div>
                </div>
              </div>

              <div class="mb-6">
                <div class="text-xs text-gray-500 uppercase tracking-wider mb-3">Style</div>
                <div class="flex gap-2">
                  <button class="w-10 h-10 bg-[#0A0F1C] border-2 border-emerald-500 rounded flex items-center justify-center">
                    <div class="w-4 h-4 bg-white/20 rounded-sm"></div>
                  </button>
                  <button class="w-10 h-10 bg-[#0A0F1C] border border-white/10 rounded flex items-center justify-center">
                    <div class="grid grid-cols-2 gap-0.5">
                      <div class="w-1.5 h-1.5 bg-white/20 rounded-sm"></div>
                      <div class="w-1.5 h-1.5 bg-white/20 rounded-sm"></div>
                      <div class="w-1.5 h-1.5 bg-white/20 rounded-sm"></div>
                      <div class="w-1.5 h-1.5 bg-white/20 rounded-sm"></div>
                    </div>
                  </button>
                  <button class="w-10 h-10 bg-[#0A0F1C] border border-white/10 rounded flex items-center justify-center">
                    <div class="w-4 h-1 bg-white/20 rounded-sm"></div>
                  </button>
                </div>
              </div>

              <button class="w-full px-4 py-3 text-sm font-medium text-white bg-white/10 border border-white/20 rounded hover:bg-white/20 transition-colors flex items-center justify-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
                EXPORT GRAPHIC
              </button>
            </div>
          </div>

          <!-- Right Graphic Preview -->
          <div class="bg-[#0A0F1C] border border-white/10 rounded-lg p-6">
            <div class="flex items-center justify-end gap-2 mb-6">
              <button class="w-8 h-8 bg-white/10 rounded flex items-center justify-center hover:bg-white/20">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"/>
                </svg>
              </button>
              <button class="w-8 h-8 bg-white/10 rounded flex items-center justify-center hover:bg-white/20">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"/>
                </svg>
              </button>
            </div>

            <!-- Match Graphic -->
            <div class="bg-[#111827] rounded-lg overflow-hidden">
              <div class="text-center py-2 text-xs font-medium text-emerald-400 bg-emerald-500/20">
                GRAND FINAL
              </div>
              <div class="p-8 flex items-center justify-center gap-8">
                <div class="text-center">
                  <div class="w-20 h-20 bg-gray-700 rounded-lg mb-3 flex items-center justify-center">
                    <svg class="w-10 h-10 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                  </div>
                  <div class="text-2xl font-bold text-emerald-400">TEAM</div>
                  <div class="text-2xl font-bold">ALPHA</div>
                </div>
                <div class="text-center">
                  <div class="text-5xl font-bold text-emerald-400">3</div>
                  <div class="text-sm text-gray-500">-</div>
                  <div class="text-5xl font-bold text-gray-400">1</div>
                  <div class="text-xs text-gray-500 mt-2">FINAL SCORE</div>
                </div>
                <div class="text-center">
                  <div class="w-20 h-20 bg-gray-700 rounded-lg mb-3 flex items-center justify-center">
                    <svg class="w-10 h-10 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                  </div>
                  <div class="text-2xl font-bold">TEAM</div>
                  <div class="text-2xl font-bold">OMEGA</div>
                </div>
              </div>
              <div class="flex items-center justify-center gap-2 py-3 border-t border-white/10">
                <div class="w-5 h-5 bg-emerald-500 rounded flex items-center justify-center">
                  <span class="text-xs font-bold">P</span>
                </div>
                <span class="text-xs text-gray-500">PARASCORES</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing Section -->
    <section class="py-24 border-t border-white/10">
      <div class="max-w-7xl mx-auto px-6">
        <!-- Section Header -->
        <div class="text-center mb-16">
          <h2 class="text-4xl md:text-5xl font-bold mb-4">Scalable Pricing</h2>
          <p class="text-gray-400">Start for free. Upgrade when you go pro.</p>
        </div>

        <!-- Pricing Cards -->
        <div class="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <!-- Starter Plan -->
          <div class="bg-[#111827] border border-white/10 rounded-lg p-8 hover:border-white/20 transition-colors">
            <div class="mb-8">
              <h3 class="text-lg font-medium text-gray-400 mb-2">Starter</h3>
              <div class="text-5xl font-bold">$0</div>
            </div>
            <ul class="space-y-4 mb-8">
              <li class="flex items-center gap-3 text-sm text-gray-400">
                <svg class="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                Up to 32 Participants
              </li>
              <li class="flex items-center gap-3 text-sm text-gray-400">
                <svg class="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                <span>Single Elimination <span class="text-yellow-400">Only</span></span>
              </li>
              <li class="flex items-center gap-3 text-sm text-gray-400">
                <svg class="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                Basic API Access
              </li>
            </ul>
            <button class="w-full px-6 py-3 text-sm font-medium text-white border border-white/20 hover:border-white/40 rounded transition-colors">
              START FREE
            </button>
          </div>

          <!-- Organizer Plan - Popular -->
          <div class="relative bg-[#111827] border-2 border-emerald-500/50 rounded-lg p-8">
            <!-- Popular Badge -->
            <div class="absolute -top-3 right-4 px-3 py-1 text-xs font-medium text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 rounded">
              MOST POPULAR
            </div>
            <div class="mb-8">
              <h3 class="text-lg font-medium text-emerald-400 mb-2">Organizer</h3>
              <div class="flex items-baseline gap-1">
                <span class="text-5xl font-bold">$29</span>
                <span class="text-gray-400">/mo</span>
              </div>
            </div>
            <ul class="space-y-4 mb-8">
              <li class="flex items-center gap-3 text-sm">
                <svg class="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                <span class="text-emerald-400">Unlimited</span> Participants
              </li>
              <li class="flex items-center gap-3 text-sm">
                <svg class="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                <span class="text-emerald-400">All</span> Bracket Formats
              </li>
              <li class="flex items-center gap-3 text-sm">
                <svg class="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                Priority Support
              </li>
              <li class="flex items-center gap-3 text-sm">
                <svg class="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                Custom Branding
              </li>
            </ul>
            <button class="w-full px-6 py-3 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded transition-colors">
              GET STARTED
            </button>
          </div>

          <!-- Enterprise Plan -->
          <div class="bg-[#111827] border border-white/10 rounded-lg p-8 hover:border-white/20 transition-colors">
            <div class="mb-8">
              <h3 class="text-lg font-medium text-gray-400 mb-2">Enterprise</h3>
              <div class="text-5xl font-bold">Custom</div>
            </div>
            <ul class="space-y-4 mb-8">
              <li class="flex items-center gap-3 text-sm text-gray-400">
                <svg class="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                Dedicated Server Instance
              </li>
              <li class="flex items-center gap-3 text-sm text-gray-400">
                <svg class="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                SLA &amp; 24/7 Support
              </li>
              <li class="flex items-center gap-3 text-sm text-gray-400">
                <svg class="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                White-label Solution
              </li>
              <li class="flex items-center gap-3 text-sm text-gray-400">
                <svg class="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                Anti-Cheat Integration
              </li>
            </ul>
            <button class="w-full px-6 py-3 text-sm font-medium text-white border border-white/20 hover:border-white/40 rounded transition-colors">
              CONTACT SALES
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Final CTA Section -->
    <section class="py-24 border-t border-white/10">
      <div class="max-w-3xl mx-auto px-6 text-center">
        <h2 class="text-4xl md:text-5xl font-bold mb-6">
          Ready to level up your tournaments?
        </h2>
        <p class="text-lg text-gray-400 mb-10">
          Join thousands of organizers who trust Parascores to run their events. Start for free today.
        </p>
        <div class="flex flex-wrap justify-center gap-4">
          <NuxtLink
            to="/signup"
            class="px-8 py-4 text-base font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded transition-colors"
          >
            Get started for free
          </NuxtLink>
          <NuxtLink
            to="/contact"
            class="px-8 py-4 text-base font-medium text-white border border-white/20 hover:border-white/40 rounded transition-colors"
          >
            Talk to sales
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// No additional logic needed for this static page
</script>
