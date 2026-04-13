<template>
  <div class="bg-white dark:bg-[#0A0F1C] min-h-screen text-gray-900 dark:text-white transition-colors">
    <!-- Hero Section -->
    <section class="relative pt-20 pb-32 overflow-hidden">
      <!-- Background Glow -->
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div class="max-w-7xl mx-auto px-6 relative z-10">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
          <!-- Left Content -->
          <div>
            <!-- Badge -->
            <div class="inline-flex items-center gap-2 px-3 py-1.5 mb-8 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded">
              <span class="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              EMBED & INTEGRATE
            </div>

            <!-- Headline -->
            <h1 class="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight mb-6 tracking-tight">
              Live Data.<br />
              On <span class="text-emerald-500">Your</span><br />
              Website.
            </h1>

            <!-- Subtitle -->
            <p class="text-lg text-gray-600 dark:text-gray-400 mb-2 max-w-md font-medium">
              Embed live fixtures, standings, and brackets directly on your website. No coding required — just copy, paste, and go.
            </p>
            <p class="text-lg font-bold text-gray-900 dark:text-white mb-8">
              Keep your audience engaged with real-time tournament data.
            </p>

            <!-- CTAs -->
            <div class="flex flex-wrap gap-4">
              <NuxtLink
                to="/signup"
                class="px-6 py-3 text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded transition-colors shadow-lg shadow-emerald-500/10"
              >
                Start Building Widgets
              </NuxtLink>
              <a
                href="#how-it-works"
                class="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-gray-900 dark:text-white border border-gray-200 dark:border-white/20 hover:border-gray-300 dark:hover:border-white/40 rounded transition-colors"
              >
                See How It Works
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </a>
            </div>
          </div>

          <!-- Right - Widget Preview Mockup -->
          <div class="relative">
            <!-- Browser Frame -->
            <div class="bg-gray-50 dark:bg-[#111827] border border-gray-100 dark:border-white/10 rounded-xl overflow-hidden shadow-2xl transition-colors">
              <!-- Window Controls -->
              <div class="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-[#0d1424]">
                <div class="flex gap-1.5">
                  <div class="w-3 h-3 rounded-full bg-red-500"></div>
                  <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div class="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div class="ml-4 px-3 py-1 text-[10px] text-gray-400 dark:text-gray-500 bg-white dark:bg-black/30 rounded border border-gray-200 dark:border-white/5">
                  yourwebsite.com/match-center
                </div>
              </div>

              <!-- Simulated Widget Preview -->
              <div class="p-6 space-y-4">
                <!-- Simulated Page Content -->
                <div class="flex gap-3 items-center mb-6">
                  <div class="h-3 bg-gray-200 dark:bg-white/10 rounded w-32"></div>
                  <div class="h-3 bg-gray-200 dark:bg-white/10 rounded w-20"></div>
                  <div class="h-3 bg-gray-200 dark:bg-white/10 rounded w-24"></div>
                </div>

                <!-- Embedded Widget Simulaton -->
                <div class="bg-white dark:bg-[#0A0F1C] border border-emerald-500 shadow-sm rounded-xl p-4 transition-colors">
                  <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-2">
                      <span class="text-emerald-500 text-sm">🏆</span>
                      <span class="text-sm font-extrabold text-gray-900 dark:text-white">Premier League 2026</span>
                    </div>
                    <span class="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">LIVE</span>
                  </div>

                  <!-- Simulated Fixture -->
                  <div class="space-y-2">
                    <div class="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/5">
                      <div class="flex items-center gap-2">
                        <div class="w-5 h-5 bg-red-500/30 rounded-full"></div>
                        <span class="text-xs text-gray-900 dark:text-white font-medium">Team Alpha</span>
                      </div>
                      <span class="text-sm font-bold text-emerald-600 dark:text-emerald-400">2 - 1</span>
                      <div class="flex items-center gap-2">
                        <span class="text-xs text-gray-900 dark:text-white font-medium">Team Beta</span>
                        <div class="w-5 h-5 bg-blue-500/30 rounded-full"></div>
                      </div>
                    </div>
                    <div class="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/5">
                      <div class="flex items-center gap-2">
                        <div class="w-5 h-5 bg-orange-500/30 rounded-full"></div>
                        <span class="text-xs text-gray-900 dark:text-white font-medium">Team Gamma</span>
                      </div>
                      <span class="text-sm font-bold text-gray-400">vs</span>
                      <div class="flex items-center gap-2">
                        <span class="text-xs text-gray-900 dark:text-white font-medium">Team Delta</span>
                        <div class="w-5 h-5 bg-purple-500/30 rounded-full"></div>
                      </div>
                    </div>
                    <div class="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/5">
                      <div class="flex items-center gap-2">
                        <div class="w-5 h-5 bg-green-500/30 rounded-full"></div>
                        <span class="text-xs text-gray-900 dark:text-white font-medium">Team Epsilon</span>
                      </div>
                      <span class="text-sm font-bold text-gray-400">vs</span>
                      <div class="flex items-center gap-2">
                        <span class="text-xs text-gray-900 dark:text-white font-medium">Team Zeta</span>
                        <div class="w-5 h-5 bg-cyan-500/30 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                  <div class="mt-3 text-center">
                    <span class="text-[10px] text-gray-500">Powered by ParaScores</span>
                  </div>
                </div>

                <!-- More Simulated Page Content -->
                <div class="space-y-2 mt-4">
                  <div class="h-2.5 bg-gray-200 dark:bg-white/5 rounded w-full"></div>
                  <div class="h-2.5 bg-gray-200 dark:bg-white/5 rounded w-4/5"></div>
                  <div class="h-2.5 bg-gray-200 dark:bg-white/5 rounded w-3/5"></div>
                </div>
              </div>
            </div>

            <!-- Floating Code Badge -->
            <div class="absolute -bottom-6 -left-4 bg-white dark:bg-[#111827] border border-emerald-500/30 rounded-lg p-4 shadow-xl transition-colors">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-lg flex items-center justify-center">
                  <span class="text-emerald-500 dark:text-emerald-400 text-lg">&lt;/&gt;</span>
                </div>
                <div>
                  <div class="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest font-bold">Embed Code</div>
                  <div class="text-sm font-extrabold text-gray-900 dark:text-white">Copy & Paste</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Widget Types Section -->
    <section class="py-24 border-t border-white/10">
      <div class="max-w-7xl mx-auto px-6">
        <!-- Section Header -->
        <div class="max-w-xl mb-16">
          <h2 class="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight leading-tight">
            Three Widgets.<br />
            <span class="text-emerald-500 underline decoration-emerald-500 underline-offset-8">Endless Possibilities.</span>
          </h2>
          <p class="text-gray-600 dark:text-gray-400 font-medium">
            Choose the widget that fits your needs. Each one updates automatically as scores come in.
          </p>
        </div>

        <!-- Widget Type Cards -->
        <div class="grid md:grid-cols-3 gap-8">
          <!-- Fixtures Widget -->
          <div class="bg-gray-50 dark:bg-[#111827] border border-gray-100 dark:border-white/10 rounded-xl p-8 shadow-sm hover:border-emerald-500/50 transition-all duration-300 group">
            <div class="w-14 h-14 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl flex items-center justify-center mb-6">
              <svg class="w-7 h-7 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">Fixtures & Scores</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-6 font-medium leading-relaxed">
              Show upcoming matches and live scores. Fans can follow along as games happen without leaving your site.
            </p>
            <ul class="text-xs text-gray-500 dark:text-gray-500 space-y-2 font-medium">
              <li class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                Live score updates
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                Match dates & times
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                Match status indicators
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                Works with all tournament types
              </li>
            </ul>
          </div>

          <!-- Standings Widget -->
          <div class="relative bg-white dark:bg-[#111827] border-2 border-emerald-500 rounded-xl p-8 group shadow-xl shadow-emerald-500/5">
            <div class="absolute -top-3 right-4 px-3 py-1 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-white dark:bg-[#111827] border border-emerald-500/30 rounded uppercase tracking-widest transition-colors">
              POPULAR
            </div>
            <div class="w-14 h-14 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-xl flex items-center justify-center mb-6">
              <svg class="w-7 h-7 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </div>
            <h3 class="text-xl font-bold text-emerald-600 dark:text-emerald-400 mb-3">Standings Table</h3>
            <p class="text-sm text-gray-700 dark:text-gray-400 mb-6 font-bold leading-relaxed">
              Display league tables with full stats. Points, wins, draws, losses, goal difference — all calculated automatically.
            </p>
            <ul class="text-xs text-gray-600 dark:text-gray-500 space-y-2 font-bold">
              <li class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                Auto-calculated standings
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                Group stage support
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                Team logos & colors
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                Round Robin, Group & Hybrid
              </li>
            </ul>
          </div>

          <!-- Bracket Widget -->
          <div class="bg-gray-50 dark:bg-[#111827] border border-gray-100 dark:border-white/10 rounded-xl p-8 shadow-sm hover:border-emerald-500/50 transition-all duration-300 group">
            <div class="w-14 h-14 bg-red-500/10 dark:bg-red-500/20 rounded-xl flex items-center justify-center mb-6">
              <svg class="w-7 h-7 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">Knockout Bracket</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-6 font-medium leading-relaxed">
              Visualize your knockout tournament with an interactive bracket. Fans can follow the road to the final.
            </p>
            <ul class="text-xs text-gray-500 dark:text-gray-500 space-y-2 font-medium">
              <li class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                Visual bracket tree
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                Round labels (QF, SF, Final)
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                Automatic progression
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                Knockout & Hybrid formats
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works Section -->
    <section id="how-it-works" class="py-24 border-t border-white/10">
      <div class="max-w-7xl mx-auto px-6">
        <div class="text-center mb-16">
          <h2 class="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight leading-tight">
            Embed in <span class="text-emerald-500">Three Steps</span>
          </h2>
          <p class="text-gray-600 dark:text-gray-400 font-medium">
            From zero to embedded widget in under a minute. No technical skills needed.
          </p>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
          <div class="text-center">
            <div class="w-16 h-16 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <span class="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">1</span>
            </div>
            <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-3">Pick Your Tournament</h3>
            <p class="text-gray-600 dark:text-gray-400 text-sm font-medium leading-relaxed">
              Open the Widget Builder in your dashboard and select the tournament you want to embed.
            </p>
          </div>

          <!-- Step 2 -->
          <div class="text-center">
            <div class="w-16 h-16 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <span class="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">2</span>
            </div>
            <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-3">Configure & Preview</h3>
            <p class="text-gray-600 dark:text-gray-400 text-sm font-medium leading-relaxed">
              Choose between Fixtures, Standings, or Bracket. Pick your theme, set dimensions, and preview it live.
            </p>
          </div>

          <!-- Step 3 -->
          <div class="text-center">
            <div class="w-16 h-16 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <span class="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">3</span>
            </div>
            <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-3">Copy & Paste</h3>
            <p class="text-gray-600 dark:text-gray-400 text-sm font-medium leading-relaxed">
              Grab the embed code snippet and paste it into your website's HTML. Done — your widget is live.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Embed Code Demo Section -->
    <section class="py-24 border-t border-white/10">
      <div class="max-w-7xl mx-auto px-6">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
          <!-- Left - Explanation -->
          <div>
            <h2 class="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight leading-tight">
              Just One Line<br />
              of <span class="text-emerald-500">Code</span>
            </h2>
            <p class="text-gray-600 dark:text-gray-400 mb-8 max-w-md font-medium leading-relaxed">
              Embedding a ParaScores widget is as simple as pasting a single iframe tag. It works on any website — WordPress, Wix, Squarespace, custom HTML, and more.
            </p>
            <div class="space-y-4">
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <div>
                  <h4 class="text-sm font-bold text-gray-900 dark:text-white">Responsive Design</h4>
                  <p class="text-xs text-gray-600 dark:text-gray-400 font-medium">Widgets adapt to any container width. Set your own dimensions or let it auto-fit.</p>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg class="w-4 h-4 text-emerald-500 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <div>
                  <h4 class="text-sm font-bold text-gray-900 dark:text-white">Dark & Light Themes</h4>
                  <p class="text-xs text-gray-600 dark:text-gray-400 font-medium">Match your website's look. Switch between dark and light themes in the builder.</p>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg class="w-4 h-4 text-emerald-500 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <div>
                  <h4 class="text-sm font-bold text-gray-900 dark:text-white">Auto-Updating</h4>
                  <p class="text-xs text-gray-600 dark:text-gray-400 font-medium">Scores update in real-time. No need to touch the embed code once it's placed.</p>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg class="w-4 h-4 text-emerald-500 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <div>
                  <h4 class="text-sm font-bold text-gray-900 dark:text-white">Works Everywhere</h4>
                  <p class="text-xs text-gray-600 dark:text-gray-400 font-medium">WordPress, Wix, Squarespace, Ghost, static HTML — if it supports iframes, it works.</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Right - Code Block -->
          <div>
            <div class="bg-gray-50 dark:bg-[#111827] border border-gray-100 dark:border-white/10 rounded-xl overflow-hidden shadow-2xl transition-colors">
              <!-- Code Header -->
              <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-[#0d1424]">
                <div class="flex items-center gap-2">
                  <div class="flex gap-1.5">
                    <div class="w-3 h-3 rounded-full bg-red-500"></div>
                    <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div class="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <span class="ml-3 text-xs text-gray-500 font-bold">embed-code.html</span>
                </div>
                <span class="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-extrabold uppercase tracking-widest">HTML</span>
              </div>
              <!-- Code Content -->
              <div class="p-6 bg-white dark:bg-[#111827] transition-colors">
                <pre class="text-sm font-mono leading-relaxed text-gray-800 dark:text-gray-300"><code><span class="text-gray-400 dark:text-gray-500">&lt;!-- ParaScores Widget --&gt;</span>
<span class="text-red-500 dark:text-red-400">&lt;iframe</span>
  <span class="text-blue-600 dark:text-blue-400">src</span>=<span class="text-emerald-600 dark:text-emerald-400">"https://parascores.com/widget/your-tournament-id/fixtures"</span>
  <span class="text-blue-600 dark:text-blue-400">width</span>=<span class="text-emerald-600 dark:text-emerald-400">"400"</span>
  <span class="text-blue-600 dark:text-blue-400">height</span>=<span class="text-emerald-600 dark:text-emerald-400">"600"</span>
  <span class="text-blue-600 dark:text-blue-400">frameborder</span>=<span class="text-emerald-600 dark:text-emerald-400">"0"</span>
  <span class="text-blue-600 dark:text-blue-400">style</span>=<span class="text-emerald-600 dark:text-emerald-400">"border-radius: 12px;"</span>
  <span class="text-blue-600 dark:text-blue-400">title</span>=<span class="text-emerald-600 dark:text-emerald-400">"Tournament Widget"</span>
<span class="text-red-500 dark:text-red-400">&gt;&lt;/iframe&gt;</span></code></pre>
              </div>
            </div>
            <p class="text-xs text-gray-500 mt-3 text-center">
              The Widget Builder generates this code automatically — no manual editing needed.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Use Cases Section -->
    <section class="py-24 border-t border-white/10">
      <div class="max-w-7xl mx-auto px-6">
        <div class="text-center mb-16">
          <h2 class="text-4xl md:text-5xl font-bold mb-4">
            Built for <span class="text-emerald-400">Everyone</span>
          </h2>
          <p class="text-gray-400 max-w-2xl mx-auto">
            Whether you run a grassroots league or a national competition, widgets bring your data to your audience.
          </p>
        </div>

        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <!-- League Websites -->
          <div class="bg-gray-50 dark:bg-[#111827] border border-gray-100 dark:border-white/10 rounded-lg p-6 hover:border-emerald-500/30 transition-all text-center shadow-sm">
            <div class="w-12 h-12 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span class="text-2xl">🌐</span>
            </div>
            <h3 class="text-sm font-bold text-gray-900 dark:text-white mb-2">League Websites</h3>
            <p class="text-xs text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
              Show live standings and fixtures right on your league's homepage.
            </p>
          </div>

          <!-- Club Pages -->
          <div class="bg-gray-50 dark:bg-[#111827] border border-gray-100 dark:border-white/10 rounded-lg p-6 hover:border-emerald-500/30 transition-all text-center shadow-sm">
            <div class="w-12 h-12 bg-purple-500/10 dark:bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span class="text-2xl">⚽</span>
            </div>
            <h3 class="text-sm font-bold text-gray-900 dark:text-white mb-2">Club Pages</h3>
            <p class="text-xs text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
              Keep your club's website updated with the latest results automatically.
            </p>
          </div>

          <!-- News & Blogs -->
          <div class="bg-gray-50 dark:bg-[#111827] border border-gray-100 dark:border-white/10 rounded-lg p-6 hover:border-emerald-500/30 transition-all text-center shadow-sm">
            <div class="w-12 h-12 bg-orange-500/10 dark:bg-orange-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span class="text-2xl">📰</span>
            </div>
            <h3 class="text-sm font-bold text-gray-900 dark:text-white mb-2">News & Blogs</h3>
            <p class="text-xs text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
              Enrich sports articles with live tournament data inline.
            </p>
          </div>

          <!-- Community Portals -->
          <div class="bg-gray-50 dark:bg-[#111827] border border-gray-100 dark:border-white/10 rounded-lg p-6 hover:border-emerald-500/30 transition-all text-center shadow-sm">
            <div class="w-12 h-12 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span class="text-2xl">👥</span>
            </div>
            <h3 class="text-sm font-bold text-gray-900 dark:text-white mb-2">Community Portals</h3>
            <p class="text-xs text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
              Let your community follow tournament progress without switching apps.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="py-24 border-t border-gray-200 dark:border-white/10">
      <div class="max-w-3xl mx-auto px-6 text-center">
        <h2 class="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight leading-tight">
          Ready to embed your tournament?
        </h2>
        <p class="text-lg text-gray-600 dark:text-gray-400 mb-10 font-medium">
          Create a tournament, open the Widget Builder, and embed live data on your website in minutes. No coding required.
        </p>
        <div class="flex flex-wrap justify-center gap-4">
          <NuxtLink
            to="/signup"
            class="px-8 py-4 text-base font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-all shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95"
          >
            Get Started Free
          </NuxtLink>
          <NuxtLink
            to="/"
            class="px-8 py-4 text-base font-bold text-gray-900 dark:text-white border border-gray-200 dark:border-white/20 hover:border-gray-300 dark:hover:border-white/40 rounded-xl transition-all"
          >
            Learn More About ParaScores
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// SEO
useSeoMeta({
  title: 'Widget Builder - Embed Live Tournament Data | ParaScores',
  description: 'Embed live fixtures, standings, and knockout brackets on your website. Copy one line of code and display real-time tournament data anywhere.',
  ogTitle: 'Widget Builder - Embed Live Tournament Data | ParaScores',
  ogDescription: 'Embed live fixtures, standings, and knockout brackets on your website. Copy one line of code and display real-time tournament data anywhere.',
})
</script>
