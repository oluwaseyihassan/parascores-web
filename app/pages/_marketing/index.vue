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
              TOURNAMENT MANAGEMENT PLATFORM
            </div>

            <!-- Headline -->
            <h1 class="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
              Your Tournaments.<br />
              Professionally<br />
              <span class="text-emerald-400">Managed.</span>
            </h1>

            <!-- Subtitle -->
            <p class="text-lg text-gray-400 mb-2 max-w-md">
              Create leagues, cups, and competitions in minutes. Manage fixtures, track scores, and generate stunning graphics.
            </p>
            <p class="text-lg font-medium text-white mb-8">
              From grassroots to pro. All in one place.
            </p>

            <!-- CTAs -->
            <div class="flex flex-wrap gap-4">
              <NuxtLink
                to="/signup"
                class="px-6 py-3 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded transition-colors"
              >
                Start Free
              </NuxtLink>
              <a
                href="#pricing"
                class="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white border border-white/20 hover:border-white/40 rounded transition-colors"
              >
                See Pricing
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </a>
            </div>
          </div>

          <!-- Right Mockup - SCREENSHOT PLACEHOLDER -->
          <div class="relative">
            <!-- Dashboard Screenshot -->
            <div class="bg-[#111827] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
              <!-- Window Controls -->
              <div class="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-[#0d1424]">
                <div class="flex gap-1.5">
                  <div class="w-3 h-3 rounded-full bg-red-500"></div>
                  <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div class="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div class="ml-4 px-3 py-1 text-xs text-gray-500 bg-black/30 rounded">
                  manage.parascores.com
                </div>
              </div>
              
              <!-- REPLACE THIS WITH YOUR DASHBOARD SCREENSHOT -->
              <img 
                src="/images/landing/dashboard-screenshot.png" 
                alt="ParaScores Dashboard"
                class="w-full h-auto"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
              />
              <!-- Fallback placeholder if image doesn't exist -->
              <div class="hidden items-center justify-center h-64 bg-gradient-to-br from-[#111827] to-[#0A0F1C] text-gray-500">
                <div class="text-center">
                  <svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  <p class="text-sm">Dashboard Screenshot</p>
                  <p class="text-xs opacity-60">Add: /public/images/landing/dashboard-screenshot.png</p>
                </div>
              </div>
            </div>
            
            <!-- Floating Stats Badge -->
            <div class="absolute -bottom-6 -right-4 bg-[#111827] border border-emerald-500/30 rounded-lg p-4 shadow-xl">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                  <span class="text-emerald-400 text-lg">🏆</span>
                </div>
                <div>
                  <div class="text-xs text-gray-400">Tournaments Created</div>
                  <div class="text-xl font-bold text-white">10,000+</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Tournament Formats Section -->
    <section class="py-24 border-t border-white/10">
      <div class="max-w-7xl mx-auto px-6">
        <!-- Section Header -->
        <div class="max-w-xl mb-16">
          <h2 class="text-4xl md:text-5xl font-bold mb-4">
            Every Format.<br />
            <span class="text-emerald-400 underline decoration-emerald-400 underline-offset-8">Covered.</span>
          </h2>
          <p class="text-gray-400">
            Whether you're running a local cup or a full season league, we have the format you need.
          </p>
        </div>

        <!-- Format Cards -->
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <!-- Knockout -->
          <div class="bg-[#111827] border border-white/10 rounded-lg p-6 hover:border-emerald-500/50 transition-colors group">
            <div class="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold mb-2 group-hover:text-emerald-400 transition-colors">Knockout</h3>
            <p class="text-sm text-gray-400">
              Single elimination brackets. Win or go home. Perfect for cup competitions and playoffs.
            </p>
          </div>

          <!-- Round Robin -->
          <div class="bg-[#111827] border border-white/10 rounded-lg p-6 hover:border-emerald-500/50 transition-colors group">
            <div class="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold mb-2 group-hover:text-emerald-400 transition-colors">Round Robin</h3>
            <p class="text-sm text-gray-400">
              Everyone plays everyone. Automatic standings with points, goal difference, and tiebreakers.
            </p>
          </div>

          <!-- Group Stage -->
          <div class="bg-[#111827] border border-white/10 rounded-lg p-6 hover:border-emerald-500/50 transition-colors group">
            <div class="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold mb-2 group-hover:text-emerald-400 transition-colors">Group Stage</h3>
            <p class="text-sm text-gray-400">
              Split teams into groups. Mini-leagues within the tournament with separate standings.
            </p>
          </div>

          <!-- Hybrid -->
          <div class="bg-[#111827] border-2 border-emerald-500/50 rounded-lg p-6 group">
            <div class="flex items-center justify-between mb-4">
              <div class="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
              </div>
              <span class="px-2 py-1 text-xs font-medium text-emerald-400 bg-emerald-500/20 rounded">POPULAR</span>
            </div>
            <h3 class="text-lg font-semibold text-emerald-400 mb-2">Hybrid</h3>
            <p class="text-sm text-gray-400">
              Group stage followed by knockout rounds. Just like the World Cup or Champions League format.
            </p>
          </div>

          <!-- Friendly -->
          <div class="bg-[#111827] border border-white/10 rounded-lg p-6 hover:border-emerald-500/50 transition-colors group">
            <div class="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg class="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold mb-2 group-hover:text-emerald-400 transition-colors">Friendly</h3>
            <p class="text-sm text-gray-400">
              Single standalone matches. No brackets, no standings. Perfect for exhibition games.
            </p>
          </div>

          <!-- Custom -->
          <div class="bg-[#111827] border border-white/10 rounded-lg p-6 hover:border-emerald-500/50 transition-colors group">
            <div class="w-12 h-12 bg-gray-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold mb-2 group-hover:text-emerald-400 transition-colors">Configurable</h3>
            <p class="text-sm text-gray-400">
              Custom scoring rules, double round-robin, and more. Adapt to any sport or competition.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Grid Section -->
    <section class="py-24 border-t border-white/10">
      <div class="max-w-7xl mx-auto px-6">
        <div class="text-center mb-16">
          <h2 class="text-4xl md:text-5xl font-bold mb-4">
            Everything You Need
          </h2>
          <p class="text-gray-400 max-w-2xl mx-auto">
            From registration to final whistle. All the tools to run professional tournaments.
          </p>
        </div>

        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <!-- Live Scoring -->
          <div class="bg-[#111827] border border-white/10 rounded-lg p-6 hover:border-white/20 transition-colors">
            <div class="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold mb-2">Live Scoring</h3>
            <p class="text-sm text-gray-400 mb-4">
              Update scores in real-time. Track goals, cards, and substitutions as they happen.
            </p>
            <ul class="text-xs text-gray-500 space-y-1">
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                Start/End match controls
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                Penalty shootout support
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                Match events timeline
              </li>
            </ul>
          </div>

          <!-- Automatic Standings -->
          <div class="bg-[#111827] border border-white/10 rounded-lg p-6 hover:border-white/20 transition-colors">
            <div class="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold mb-2">Automatic Standings</h3>
            <p class="text-sm text-gray-400 mb-4">
              No spreadsheets needed. Points, goal difference, and positions calculated automatically.
            </p>
            <ul class="text-xs text-gray-500 space-y-1">
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                Win/Draw/Loss tracking
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                Goal difference sorting
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                Group-by-group tables
              </li>
            </ul>
          </div>

          <!-- Team Management -->
          <div class="bg-[#111827] border border-white/10 rounded-lg p-6 hover:border-white/20 transition-colors">
            <div class="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold mb-2">Team Management</h3>
            <p class="text-sm text-gray-400 mb-4">
              Add teams with logos, manage player rosters, and track individual statistics.
            </p>
            <ul class="text-xs text-gray-500 space-y-1">
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                Custom team logos
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                Player positions & numbers
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                Seeding for brackets
              </li>
            </ul>
          </div>

          <!-- Graphics Generator - Highlighted -->
          <div class="bg-[#111827] border-2 border-emerald-500/50 rounded-lg p-6">
            <div class="flex items-center justify-between mb-4">
              <div class="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              </div>
              <span class="text-emerald-400 text-2xl">✨</span>
            </div>
            <h3 class="text-lg font-semibold text-emerald-400 mb-2">Graphics Generator</h3>
            <p class="text-sm text-gray-400 mb-4">
              Create stunning social media graphics in seconds. Share results, standings, and brackets.
            </p>
            <ul class="text-xs text-gray-500 space-y-1">
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                Match result graphics
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                Standings table images
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                Tournament brackets
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                Matchday schedules
              </li>
            </ul>
          </div>

          <!-- Sponsors -->
          <div class="bg-[#111827] border border-white/10 rounded-lg p-6 hover:border-white/20 transition-colors">
            <div class="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold mb-2">Sponsor Integration</h3>
            <p class="text-sm text-gray-400 mb-4">
              Add sponsor logos to your tournament. Show them on graphics and tournament pages.
            </p>
            <ul class="text-xs text-gray-500 space-y-1">
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                Upload sponsor logos
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                Link to sponsor websites
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                Auto-include in graphics
              </li>
            </ul>
          </div>

          <!-- Social Links -->
          <div class="bg-[#111827] border border-white/10 rounded-lg p-6 hover:border-white/20 transition-colors">
            <div class="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold mb-2">Social Links</h3>
            <p class="text-sm text-gray-400 mb-4">
              Connect your social media accounts. Display links on tournament pages and graphics.
            </p>
            <ul class="text-xs text-gray-500 space-y-1">
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                Twitter, Instagram, Facebook
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                YouTube, Twitch, Discord
              </li>
              <li class="flex items-center gap-2">
                <span class="w-1 h-1 bg-emerald-400 rounded-full"></span>
                Custom website links
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- Screenshot Showcase Section -->
    <section class="py-24 border-t border-white/10 overflow-hidden">
      <div class="max-w-7xl mx-auto px-6">
        <div class="text-center mb-16">
          <h2 class="text-4xl md:text-5xl font-bold mb-4">
            See It In <span class="text-emerald-400">Action</span>
          </h2>
          <p class="text-gray-400 max-w-2xl mx-auto">
            From match graphics to tournament brackets, see what you can create.
          </p>
        </div>

        <!-- Screenshots Grid -->
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <!-- Graphics Generator Screenshot -->
          <div class="group">
            <div class="bg-[#111827] border border-white/10 rounded-xl overflow-hidden hover:border-emerald-500/50 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-emerald-500/10">
              <img 
                src="/images/landing/graphics-generator.png" 
                alt="Graphics Generator"
                class="w-full h-auto"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
              />
              <!-- Fallback placeholder -->
              <div class="hidden items-center justify-center h-48 bg-gradient-to-br from-[#111827] to-[#0A0F1C] text-gray-500">
                <div class="text-center">
                  <svg class="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  <p class="text-xs opacity-60">graphics-generator.png</p>
                </div>
              </div>
            </div>
            <h3 class="mt-4 font-semibold text-white">Graphics Generator</h3>
            <p class="text-sm text-gray-400">Create stunning match result graphics for social media</p>
          </div>

          <!-- Bracket View Screenshot -->
          <div class="group">
            <div class="bg-[#111827] border border-white/10 rounded-xl overflow-hidden hover:border-emerald-500/50 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-emerald-500/10">
              <img 
                src="/images/landing/bracket-view.png" 
                alt="Tournament Bracket"
                class="w-full h-auto"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
              />
              <!-- Fallback placeholder -->
              <div class="hidden items-center justify-center h-48 bg-gradient-to-br from-[#111827] to-[#0A0F1C] text-gray-500">
                <div class="text-center">
                  <svg class="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  <p class="text-xs opacity-60">bracket-view.png</p>
                </div>
              </div>
            </div>
            <h3 class="mt-4 font-semibold text-white">Tournament Brackets</h3>
            <p class="text-sm text-gray-400">Visual knockout brackets with automatic progression</p>
          </div>

          <!-- Standings Screenshot -->
          <div class="group">
            <div class="bg-[#111827] border border-white/10 rounded-xl overflow-hidden hover:border-emerald-500/50 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-emerald-500/10">
              <img 
                src="/images/landing/standings-table.png" 
                alt="Standings Table"
                class="w-full h-auto"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
              />
              <!-- Fallback placeholder -->
              <div class="hidden items-center justify-center h-48 bg-gradient-to-br from-[#111827] to-[#0A0F1C] text-gray-500">
                <div class="text-center">
                  <svg class="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  <p class="text-xs opacity-60">standings-table.png</p>
                </div>
              </div>
            </div>
            <h3 class="mt-4 font-semibold text-white">Live Standings</h3>
            <p class="text-sm text-gray-400">Auto-calculated league tables and group standings</p>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works Section -->
    <section class="py-24 border-t border-white/10">
      <div class="max-w-7xl mx-auto px-6">
        <div class="text-center mb-16">
          <h2 class="text-4xl md:text-5xl font-bold mb-4">
            Up and Running in <span class="text-emerald-400">Minutes</span>
          </h2>
          <p class="text-gray-400">
            Three simple steps to run your first tournament.
          </p>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
          <!-- Step 1 -->
          <div class="text-center">
            <div class="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <span class="text-2xl font-bold text-emerald-400">1</span>
            </div>
            <h3 class="text-xl font-semibold mb-3">Create Tournament</h3>
            <p class="text-gray-400 text-sm">
              Choose your format, set dates, add branding. Your tournament page is ready instantly.
            </p>
          </div>

          <!-- Step 2 -->
          <div class="text-center">
            <div class="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <span class="text-2xl font-bold text-emerald-400">2</span>
            </div>
            <h3 class="text-xl font-semibold mb-3">Add Participants</h3>
            <p class="text-gray-400 text-sm">
              Add teams or individuals with logos and rosters. Seed them for fair brackets.
            </p>
          </div>

          <!-- Step 3 -->
          <div class="text-center">
            <div class="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <span class="text-2xl font-bold text-emerald-400">3</span>
            </div>
            <h3 class="text-xl font-semibold mb-3">Generate & Go</h3>
            <p class="text-gray-400 text-sm">
              Auto-generate fixtures with one click. Update scores live and share graphics instantly.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing Section -->
    <section id="pricing" class="py-24 border-t border-white/10">
      <div class="max-w-7xl mx-auto px-6">
        <!-- Section Header -->
        <div class="text-center mb-16">
          <h2 class="text-4xl md:text-5xl font-bold mb-4">Simple Pricing</h2>
          <p class="text-gray-400">Start free. Upgrade when you need more.</p>
        </div>

        <!-- Pricing Cards -->
        <div class="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <!-- Free Plan -->
          <div class="bg-[#111827] border border-white/10 rounded-lg p-8 hover:border-white/20 transition-colors">
            <div class="mb-8">
              <h3 class="text-lg font-medium text-gray-400 mb-2">Free</h3>
              <div class="text-5xl font-bold">$0</div>
              <p class="text-sm text-gray-500 mt-2">Forever free</p>
            </div>
            <ul class="space-y-4 mb-8">
              <li class="flex items-center gap-3 text-sm text-gray-400">
                <svg class="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                Up to 16 participants
              </li>
              <li class="flex items-center gap-3 text-sm text-gray-400">
                <svg class="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                Knockout & Round Robin
              </li>
              <li class="flex items-center gap-3 text-sm text-gray-400">
                <svg class="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                Basic graphics
              </li>
              <li class="flex items-center gap-3 text-sm text-gray-400">
                <svg class="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                1 active tournament
              </li>
            </ul>
            <NuxtLink
              to="/signup"
              class="block w-full px-6 py-3 text-sm font-medium text-center text-white border border-white/20 hover:border-white/40 rounded transition-colors"
            >
              Get Started Free
            </NuxtLink>
          </div>

          <!-- Pro Plan - Popular -->
          <div class="relative bg-[#111827] border-2 border-emerald-500/50 rounded-lg p-8">
            <!-- Popular Badge -->
            <div class="absolute -top-3 right-4 px-3 py-1 text-xs font-medium text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 rounded">
              MOST POPULAR
            </div>
            <div class="mb-8">
              <h3 class="text-lg font-medium text-emerald-400 mb-2">Pro</h3>
              <div class="flex items-baseline gap-1">
                <span class="text-5xl font-bold">$19</span>
                <span class="text-gray-400">/mo</span>
              </div>
              <p class="text-sm text-gray-500 mt-2">For serious organizers</p>
            </div>
            <ul class="space-y-4 mb-8">
              <li class="flex items-center gap-3 text-sm">
                <svg class="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                <span class="text-emerald-400">Unlimited</span> participants
              </li>
              <li class="flex items-center gap-3 text-sm">
                <svg class="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                <span class="text-emerald-400">All</span> tournament formats
              </li>
              <li class="flex items-center gap-3 text-sm">
                <svg class="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                Full graphics generator
              </li>
              <li class="flex items-center gap-3 text-sm">
                <svg class="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                Unlimited tournaments
              </li>
              <li class="flex items-center gap-3 text-sm">
                <svg class="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                Priority support
              </li>
            </ul>
            <NuxtLink
              to="/signup"
              class="block w-full px-6 py-3 text-sm font-medium text-center text-white bg-emerald-500 hover:bg-emerald-600 rounded transition-colors"
            >
              Start 14-Day Trial
            </NuxtLink>
          </div>

          <!-- Enterprise Plan -->
          <div class="bg-[#111827] border border-white/10 rounded-lg p-8 hover:border-white/20 transition-colors">
            <div class="mb-8">
              <h3 class="text-lg font-medium text-gray-400 mb-2">Enterprise</h3>
              <div class="text-5xl font-bold">Custom</div>
              <p class="text-sm text-gray-500 mt-2">For organizations</p>
            </div>
            <ul class="space-y-4 mb-8">
              <li class="flex items-center gap-3 text-sm text-gray-400">
                <svg class="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                Everything in Pro
              </li>
              <li class="flex items-center gap-3 text-sm text-gray-400">
                <svg class="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                Custom branding
              </li>
              <li class="flex items-center gap-3 text-sm text-gray-400">
                <svg class="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                API access
              </li>
              <li class="flex items-center gap-3 text-sm text-gray-400">
                <svg class="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                Dedicated support
              </li>
              <li class="flex items-center gap-3 text-sm text-gray-400">
                <svg class="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                White-label option
              </li>
            </ul>
            <NuxtLink
              to="/contact"
              class="block w-full px-6 py-3 text-sm font-medium text-center text-white border border-white/20 hover:border-white/40 rounded transition-colors"
            >
              Contact Sales
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- Final CTA Section -->
    <section class="py-24 border-t border-white/10">
      <div class="max-w-3xl mx-auto px-6 text-center">
        <h2 class="text-4xl md:text-5xl font-bold mb-6">
          Ready to run your next tournament?
        </h2>
        <p class="text-lg text-gray-400 mb-10">
          Join thousands of organizers who trust ParaScores for their competitions. Start for free today.
        </p>
        <div class="flex flex-wrap justify-center gap-4">
          <NuxtLink
            to="/signup"
            class="px-8 py-4 text-base font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded transition-colors"
          >
            Start Free Today
          </NuxtLink>
          <NuxtLink
            to="/contact"
            class="px-8 py-4 text-base font-medium text-white border border-white/20 hover:border-white/40 rounded transition-colors"
          >
            Talk to Sales
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// SEO
useSeoMeta({
  title: 'ParaScores - Tournament Management Made Simple',
  description: 'Create and manage tournaments with ease. Knockout, round robin, and group stages. Live scoring, automatic standings, and social media graphics.',
  ogTitle: 'ParaScores - Tournament Management Made Simple',
  ogDescription: 'Create and manage tournaments with ease. Knockout, round robin, and group stages. Live scoring, automatic standings, and social media graphics.',
})
</script>
