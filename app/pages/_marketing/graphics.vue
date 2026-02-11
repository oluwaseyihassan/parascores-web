<template>
  <div class="bg-[#0A0F1C] min-h-screen text-white">
    <!-- Hero Section -->
    <section class="relative pt-20 pb-32 overflow-x-hidden">
      <!-- Background Glow -->
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div class="max-w-7xl mx-auto px-6 relative z-10">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
          <!-- Left Content -->
          <div>
            <!-- Badge -->
            <div class="inline-flex items-center gap-2 px-3 py-1.5 mb-8 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded">
              <span class="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              GRAPHICS STUDIO
            </div>

            <!-- Headline -->
            <h1 class="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
              Share-Worthy<br />
              Graphics in<br />
              <span class="text-emerald-400">Seconds.</span>
            </h1>

            <!-- Subtitle -->
            <p class="text-lg text-gray-400 mb-2 max-w-md">
              Generate stunning match results, standings tables, bracket visuals, and matchday schedules — ready for social media with one click.
            </p>
            <p class="text-lg font-medium text-white mb-8">
              No design skills needed. No templates to fiddle with.
            </p>

            <!-- CTAs -->
            <div class="flex flex-wrap gap-4">
              <NuxtLink
                to="/signup"
                class="px-6 py-3 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded transition-colors"
              >
                Try Graphics Studio
              </NuxtLink>
              <a
                href="#graphic-types"
                class="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white border border-white/20 hover:border-white/40 rounded transition-colors"
              >
                See Examples
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </a>
            </div>
          </div>

          <!-- Right - Mockup Stack -->
          <div class="relative overflow-visible">
            <!-- Stacked Cards Mockup -->
            <div class="relative w-full max-w-md mx-auto">
              <!-- Back Card (Standings) -->
              <div class="absolute top-4 left-4 right-0 bg-[#111827] border border-white/10 rounded-xl p-5 shadow-xl transform rotate-3">
                <div class="flex items-center gap-2 mb-3">
                  <div class="w-3 h-3 bg-blue-400 rounded-full"></div>
                  <span class="text-xs text-gray-400 font-medium">Standings Table</span>
                </div>
                <div class="space-y-1.5">
                  <div class="flex items-center gap-2 text-[10px] text-gray-500 px-2">
                    <span class="w-4">#</span>
                    <span class="flex-1">Team</span>
                    <span class="w-6 text-center">W</span>
                    <span class="w-6 text-center">D</span>
                    <span class="w-6 text-center">L</span>
                    <span class="w-8 text-center">Pts</span>
                  </div>
                  <div class="flex items-center gap-2 text-xs bg-emerald-500/10 rounded p-2">
                    <span class="w-4 text-emerald-400 font-bold">1</span>
                    <div class="w-4 h-4 bg-red-500/30 rounded-full flex-shrink-0"></div>
                    <span class="flex-1 text-white">Team Alpha</span>
                    <span class="w-6 text-center text-gray-300">8</span>
                    <span class="w-6 text-center text-gray-300">1</span>
                    <span class="w-6 text-center text-gray-300">1</span>
                    <span class="w-8 text-center text-emerald-400 font-bold">25</span>
                  </div>
                  <div class="flex items-center gap-2 text-xs bg-white/5 rounded p-2">
                    <span class="w-4 text-gray-400">2</span>
                    <div class="w-4 h-4 bg-blue-500/30 rounded-full flex-shrink-0"></div>
                    <span class="flex-1 text-white">Team Beta</span>
                    <span class="w-6 text-center text-gray-300">7</span>
                    <span class="w-6 text-center text-gray-300">2</span>
                    <span class="w-6 text-center text-gray-300">1</span>
                    <span class="w-8 text-center text-gray-300 font-bold">23</span>
                  </div>
                  <div class="flex items-center gap-2 text-xs bg-white/5 rounded p-2">
                    <span class="w-4 text-gray-400">3</span>
                    <div class="w-4 h-4 bg-orange-500/30 rounded-full flex-shrink-0"></div>
                    <span class="flex-1 text-white">Team Gamma</span>
                    <span class="w-6 text-center text-gray-300">5</span>
                    <span class="w-6 text-center text-gray-300">3</span>
                    <span class="w-6 text-center text-gray-300">2</span>
                    <span class="w-8 text-center text-gray-300 font-bold">18</span>
                  </div>
                </div>
              </div>

              <!-- Front Card (Match Result) -->
              <div class="relative bg-[#111827] border border-emerald-500/30 rounded-xl p-6 shadow-2xl transform -rotate-2 z-10">
                <div class="flex items-center justify-between mb-4">
                  <span class="text-xs text-emerald-400 font-medium">MATCH RESULT</span>
                  <span class="text-[10px] text-gray-500">Premier League • Round 8</span>
                </div>

                <!-- Score Display -->
                <div class="flex items-center justify-between px-2 mb-4">
                  <div class="text-center">
                    <div class="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span class="text-lg">🔴</span>
                    </div>
                    <span class="text-xs text-white font-medium">Team Alpha</span>
                  </div>
                  <div class="text-center">
                    <div class="text-3xl font-black text-white">3 <span class="text-gray-500">-</span> 1</div>
                    <span class="text-[10px] text-emerald-400">FULL TIME</span>
                  </div>
                  <div class="text-center">
                    <div class="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span class="text-lg">🔵</span>
                    </div>
                    <span class="text-xs text-white font-medium">Team Beta</span>
                  </div>
                </div>

                <!-- Goal Scorers -->
                <div class="border-t border-white/10 pt-3 space-y-1">
                  <div class="flex items-center justify-between text-[10px]">
                    <span class="text-gray-300">⚽ A. Johnson 12', 45'</span>
                    <span class="text-gray-500"></span>
                  </div>
                  <div class="flex items-center justify-between text-[10px]">
                    <span class="text-gray-300">⚽ M. Silva 67'</span>
                    <span class="text-gray-300">⚽ R. Garcia 52'</span>
                  </div>
                </div>

                <!-- Download Bar -->
                <div class="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                  <span class="text-[9px] text-gray-600">parascores.com</span>
                  <div class="flex items-center gap-2 text-emerald-400">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                    </svg>
                    <span class="text-[10px] font-semibold">Download PNG</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Graphic Types Section -->
    <section id="graphic-types" class="py-24 border-t border-white/10">
      <div class="max-w-7xl mx-auto px-6">
        <!-- Section Header -->
        <div class="max-w-xl mb-16">
          <h2 class="text-4xl md:text-5xl font-bold mb-4">
            Four Graphics.<br />
            <span class="text-emerald-400 underline decoration-emerald-400 underline-offset-8">One Studio.</span>
          </h2>
          <p class="text-gray-400">
            Every graphic type you need to keep your audience engaged — generated instantly from your live tournament data.
          </p>
        </div>

        <!-- Graphic Type Cards -->
        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <!-- Match Result -->
          <div class="relative bg-[#111827] border-2 border-emerald-500/50 rounded-xl p-6">
            <div class="absolute -top-3 right-4 px-3 py-1 text-xs font-medium text-emerald-400 bg-[#111827] border border-emerald-500/30 rounded">
              MOST USED
            </div>
            <div class="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg class="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-emerald-400 mb-2">Match Result</h3>
            <p class="text-sm text-gray-400 mb-4">
              Beautiful score cards with team logos, final scores, and goal scorers.
            </p>
            <ul class="text-xs text-gray-500 space-y-1.5">
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                Team logos & colors
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                Goal scorers with minutes
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                Sponsor logos included
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                Penalty results
              </li>
            </ul>
          </div>

          <!-- Standings Table -->
          <div class="bg-[#111827] border border-white/10 rounded-xl p-6 hover:border-emerald-500/50 transition-all duration-300 group">
            <div class="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold mb-2 group-hover:text-emerald-400 transition-colors">Standings Table</h3>
            <p class="text-sm text-gray-400 mb-4">
              Full league table graphics with positions, points, and goal difference.
            </p>
            <ul class="text-xs text-gray-500 space-y-1.5">
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                W/D/L, GD, Pts stats
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                Group selector
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                Team logos displayed
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                Round Robin & Hybrid
              </li>
            </ul>
          </div>

          <!-- Bracket -->
          <div class="bg-[#111827] border border-white/10 rounded-xl p-6 hover:border-emerald-500/50 transition-all duration-300 group">
            <div class="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold mb-2 group-hover:text-emerald-400 transition-colors">Knockout Bracket</h3>
            <p class="text-sm text-gray-400 mb-4">
              Visual bracket tree from first round to the final.
            </p>
            <ul class="text-xs text-gray-500 space-y-1.5">
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                Full bracket tree
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                QF, SF, Final labels
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                Scores & progression
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                Knockout & Hybrid
              </li>
            </ul>
          </div>

          <!-- Matchday Schedule -->
          <div class="bg-[#111827] border border-white/10 rounded-xl p-6 hover:border-emerald-500/50 transition-all duration-300 group">
            <div class="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold mb-2 group-hover:text-emerald-400 transition-colors">Matchday Schedule</h3>
            <p class="text-sm text-gray-400 mb-4">
              All matches for a round, ready to share before kickoff.
            </p>
            <ul class="text-xs text-gray-500 space-y-1.5">
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                Round fixtures list
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                Match times & dates
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                Team logos & names
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                Round selector
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works Section -->
    <section class="py-24 border-t border-white/10">
      <div class="max-w-7xl mx-auto px-6">
        <div class="text-center mb-16">
          <h2 class="text-4xl md:text-5xl font-bold mb-4">
            From Score to <span class="text-emerald-400">Social Post</span>
          </h2>
          <p class="text-gray-400">
            Three steps. Under 30 seconds. Professional results every time.
          </p>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
          <!-- Step 1 -->
          <div class="text-center">
            <div class="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <span class="text-2xl font-bold text-emerald-400">1</span>
            </div>
            <h3 class="text-xl font-semibold mb-3">Pick Your Graphic</h3>
            <p class="text-gray-400 text-sm">
              Open the Graphics Studio from any tournament. Choose Match Result, Standings, Bracket, or Matchday.
            </p>
          </div>

          <!-- Step 2 -->
          <div class="text-center">
            <div class="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <span class="text-2xl font-bold text-emerald-400">2</span>
            </div>
            <h3 class="text-xl font-semibold mb-3">Select Your Data</h3>
            <p class="text-gray-400 text-sm">
              Pick the specific match, group, or round. The graphic is generated instantly from your live data.
            </p>
          </div>

          <!-- Step 3 -->
          <div class="text-center">
            <div class="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <span class="text-2xl font-bold text-emerald-400">3</span>
            </div>
            <h3 class="text-xl font-semibold mb-3">Download & Share</h3>
            <p class="text-gray-400 text-sm">
              Download as a high-quality PNG. Post it to Instagram, Twitter, WhatsApp, or wherever your audience is.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="py-24 border-t border-white/10">
      <div class="max-w-7xl mx-auto px-6">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
          <!-- Left -->
          <div>
            <h2 class="text-4xl md:text-5xl font-bold mb-6">
              Designed to<br />
              <span class="text-emerald-400">Impress.</span>
            </h2>
            <p class="text-gray-400 mb-8 max-w-md">
              Every graphic is generated server-side with professional styling. No more manual design work or messy templates.
            </p>
            <div class="space-y-4">
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <div>
                  <h4 class="text-sm font-semibold text-white">Always On-Brand</h4>
                  <p class="text-xs text-gray-400">Tournament name, sponsor logos, and social handles are included automatically.</p>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <div>
                  <h4 class="text-sm font-semibold text-white">Real-Time Data</h4>
                  <p class="text-xs text-gray-400">Graphics are generated from live data. Update a score 5 seconds before — it's reflected instantly.</p>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <div>
                  <h4 class="text-sm font-semibold text-white">High-Quality PNG</h4>
                  <p class="text-xs text-gray-400">Crisp, high-resolution images that look great on any platform — no compression artifacts.</p>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <div>
                  <h4 class="text-sm font-semibold text-white">Sponsor Integration</h4>
                  <p class="text-xs text-gray-400">Added sponsors to your tournament? Their logos appear on every graphic automatically.</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Right - Social Platform Mockup -->
          <div class="space-y-4">
            <!-- Platform Cards -->
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-[#111827] border border-white/10 rounded-xl p-5 text-center hover:border-white/20 transition-colors">
                <span class="text-3xl mb-3 block">📸</span>
                <h4 class="text-sm font-semibold mb-1">Instagram</h4>
                <p class="text-[10px] text-gray-500">Stories & Feed Posts</p>
              </div>
              <div class="bg-[#111827] border border-white/10 rounded-xl p-5 text-center hover:border-white/20 transition-colors">
                <span class="text-3xl mb-3 block">🐦</span>
                <h4 class="text-sm font-semibold mb-1">Twitter / X</h4>
                <p class="text-[10px] text-gray-500">Score Updates</p>
              </div>
              <div class="bg-[#111827] border border-white/10 rounded-xl p-5 text-center hover:border-white/20 transition-colors">
                <span class="text-3xl mb-3 block">💬</span>
                <h4 class="text-sm font-semibold mb-1">WhatsApp</h4>
                <p class="text-[10px] text-gray-500">Group Shares</p>
              </div>
              <div class="bg-[#111827] border border-white/10 rounded-xl p-5 text-center hover:border-white/20 transition-colors">
                <span class="text-3xl mb-3 block">📘</span>
                <h4 class="text-sm font-semibold mb-1">Facebook</h4>
                <p class="text-[10px] text-gray-500">Page & Group Posts</p>
              </div>
            </div>
            <p class="text-xs text-gray-500 text-center">
              Download once, share everywhere. Graphics are optimized for all platforms.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Comparison Section -->
    <section class="py-24 border-t border-white/10">
      <div class="max-w-5xl mx-auto px-6">
        <div class="text-center mb-16">
          <h2 class="text-4xl md:text-5xl font-bold mb-4">
            Stop Wasting Time on <span class="text-emerald-400">Design</span>
          </h2>
          <p class="text-gray-400 max-w-2xl mx-auto">
            No more opening Canva, Photoshop, or fiddling with templates every match day.
          </p>
        </div>

        <div class="grid md:grid-cols-2 gap-8">
          <!-- Without ParaScores -->
          <div class="bg-red-500/5 border border-red-500/20 rounded-xl p-8">
            <div class="flex items-center gap-2 mb-6">
              <span class="text-red-400 text-xl">✕</span>
              <h3 class="text-lg font-semibold text-red-400">Without ParaScores</h3>
            </div>
            <ul class="space-y-3 text-sm text-gray-400">
              <li class="flex items-center gap-3">
                <span class="text-red-400/70">•</span>
                Open a design tool after every match
              </li>
              <li class="flex items-center gap-3">
                <span class="text-red-400/70">•</span>
                Manually type in scores and names
              </li>
              <li class="flex items-center gap-3">
                <span class="text-red-400/70">•</span>
                Find and place team logos by hand
              </li>
              <li class="flex items-center gap-3">
                <span class="text-red-400/70">•</span>
                Update standings in a spreadsheet
              </li>
              <li class="flex items-center gap-3">
                <span class="text-red-400/70">•</span>
                Fight with alignment and sizing
              </li>
              <li class="flex items-center gap-3">
                <span class="text-red-400/70">•</span>
                20+ minutes per graphic, per match
              </li>
            </ul>
          </div>

          <!-- With ParaScores -->
          <div class="bg-emerald-500/5 border border-emerald-500/30 rounded-xl p-8">
            <div class="flex items-center gap-2 mb-6">
              <span class="text-emerald-400 text-xl">✓</span>
              <h3 class="text-lg font-semibold text-emerald-400">With ParaScores</h3>
            </div>
            <ul class="space-y-3 text-sm text-gray-300">
              <li class="flex items-center gap-3">
                <svg class="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                Click one button after the match
              </li>
              <li class="flex items-center gap-3">
                <svg class="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                Scores and names pulled automatically
              </li>
              <li class="flex items-center gap-3">
                <svg class="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                Team logos included from your roster
              </li>
              <li class="flex items-center gap-3">
                <svg class="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                Standings generated live
              </li>
              <li class="flex items-center gap-3">
                <svg class="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                Pixel-perfect every time
              </li>
              <li class="flex items-center gap-3">
                <svg class="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                Under 10 seconds per graphic
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="py-24 border-t border-white/10">
      <div class="max-w-3xl mx-auto px-6 text-center">
        <h2 class="text-4xl md:text-5xl font-bold mb-6">
          Ready to level up your socials?
        </h2>
        <p class="text-lg text-gray-400 mb-10">
          Create a tournament and start generating professional graphics in seconds. Free to start — no credit card required.
        </p>
        <div class="flex flex-wrap justify-center gap-4">
          <NuxtLink
            to="/signup"
            class="px-8 py-4 text-base font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded transition-colors"
          >
            Start Creating Graphics
          </NuxtLink>
          <NuxtLink
            to="/"
            class="px-8 py-4 text-base font-medium text-white border border-white/20 hover:border-white/40 rounded transition-colors"
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
  title: 'Graphics Studio - Social Media Graphics for Tournaments | ParaScores',
  description: 'Generate match result graphics, standings tables, bracket visuals, and matchday schedules in seconds. Download and share across all social platforms.',
  ogTitle: 'Graphics Studio - Social Media Graphics for Tournaments | ParaScores',
  ogDescription: 'Generate match result graphics, standings tables, bracket visuals, and matchday schedules in seconds. Download and share across all social platforms.',
})
</script>
