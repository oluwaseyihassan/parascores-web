<template>
  <div class="min-h-screen bg-white text-gray-950 dark:bg-[#070b10] dark:text-white transition-colors duration-300">
    <!-- Hero Section with Interactive Widget Playground -->
    <section class="relative isolate overflow-hidden bg-[#07100c] py-20 lg:py-24">
      <img
        src="/images/landing/dashboard-screenshot.png"
        alt="ParaScores tournament dashboard"
        class="absolute inset-0 h-full w-full object-cover opacity-20"
      />
      <div class="absolute inset-0 bg-black/75"></div>

      <div class="relative mx-auto max-w-7xl px-6 z-10 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
        <!-- Left Column: Copy & Value Proposition -->
        <div>
          <p class="mb-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
            <span class="h-2 w-2 rounded-full bg-emerald-300 animate-pulse"></span>
            EMBED & INTEGRATE
          </p>
          <h1 class="text-4xl font-semibold leading-[1.05] tracking-normal text-white sm:text-5xl lg:text-6xl">
            Live match data.<br />
            <span class="text-emerald-400">On your website.</span>
          </h1>
          <p class="mt-6 max-w-xl text-base leading-7 text-gray-200 sm:text-lg">
            Embed live fixtures, standings, and brackets on your platform. Zero coding required — just configure your widgets, copy the embed snippet, and launch.
          </p>

          <div class="mt-8 flex flex-col gap-3 sm:flex-row">
            <NuxtLink
              to="/signup"
              class="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-emerald-400 px-5 text-sm font-semibold text-gray-950 transition hover:bg-emerald-300"
            >
              Start free
              <UIcon name="i-lucide-arrow-right" class="h-4 w-4" />
            </NuxtLink>
            <a
              href="#showcase"
              class="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/25 px-5 text-sm font-semibold text-white transition hover:border-white/50 hover:bg-white/10"
            >
              Explore widgets
              <UIcon name="i-lucide-chevron-down" class="h-4 w-4" />
            </a>
          </div>

          <dl class="mt-12 grid max-w-lg grid-cols-3 gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 text-white backdrop-blur">
            <div v-for="metric in metrics" :key="metric.label" class="bg-black/20 p-4 text-center">
              <dt class="text-[11px] font-medium text-gray-300 uppercase tracking-wider">{{ metric.label }}</dt>
              <dd class="mt-1 text-lg font-semibold sm:text-2xl">{{ metric.value }}</dd>
            </div>
          </dl>
        </div>

        <!-- Right Column: Interactive Browser Playground -->
        <div class="relative w-full lg:max-w-md mx-auto">
          <div class="rounded-xl border border-white/10 bg-[#0b131c] shadow-2xl overflow-hidden backdrop-blur-sm">
            <!-- Simulated Browser Address Bar -->
            <div class="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/35">
              <div class="flex gap-1.5 shrink-0">
                <span class="w-3.5 h-3.5 rounded-full bg-[#ff5f56]"></span>
                <span class="w-3.5 h-3.5 rounded-full bg-[#ffbd2e]"></span>
                <span class="w-3.5 h-3.5 rounded-full bg-[#27c93f]"></span>
              </div>
              <div class="mx-4 w-full max-w-[220px] text-center px-3 py-1 text-[10px] text-gray-400 bg-black/40 rounded border border-white/5 truncate font-mono">
                yourwebsite.com/match-center
              </div>
              <div class="w-12"></div>
            </div>
            
            <!-- Interactive Widgets Controls -->
            <div class="flex flex-wrap items-center justify-between gap-2 p-3 bg-black/25 border-b border-white/10 text-xs">
              <div class="flex gap-1 bg-black/30 p-0.5 rounded-md border border-white/5">
                <button 
                  v-for="tab in tabs"
                  :key="tab"
                  @click="activeTab = tab as any"
                  :class="activeTab === tab ? 'bg-emerald-400 text-gray-950 font-bold' : 'text-gray-400 hover:text-white hover:bg-white/5'"
                  class="px-2.5 py-1 rounded text-[10px] uppercase tracking-wide transition font-semibold"
                >
                  {{ tab }}
                </button>
              </div>
            </div>

            <!-- Dynamic Iframe Wrapper -->
            <div class="relative bg-black/10 min-h-[380px] flex flex-col justify-between">
              <iframe
                :key="previewUrl"
                :src="previewUrl"
                class="w-full h-[380px] bg-transparent border-0 transition-opacity duration-300"
                frameborder="0"
                title="Live widget playground preview"
              ></iframe>
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- Live Showcase Grid Section (All Widgets Side-by-Side) -->
    <section id="showcase" class="border-b border-gray-200 bg-white py-20 dark:border-white/10 dark:bg-[#070b10]">
      <div class="mx-auto max-w-7xl px-6">
        <div class="text-center max-w-3xl mx-auto mb-16">
          <p class="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Live Demonstrations</p>
          <h2 class="mt-3 text-3xl font-semibold leading-tight tracking-normal text-gray-950 dark:text-white sm:text-4xl">
            Choose the widget that suits your layout.
          </h2>
          <p class="mt-4 text-sm leading-7 text-gray-600 dark:text-gray-400">
            Real interactive data feeds rendered live from the <strong>OAU Supremacy Cup 2026</strong>. Click tabs, browse schedules, or explore brackets directly inside these previews.
          </p>
        </div>

        <div class="grid lg:grid-cols-3 gap-8">
          <!-- Widget Card -->
          <div 
            v-for="card in widgetCards" 
            :key="card.type" 
            class="flex flex-col rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-white/10 dark:bg-white/[0.03] shadow-sm hover:border-emerald-500/30 dark:hover:border-emerald-400/25 transition-all duration-300 min-w-0 overflow-hidden"
          >
            <!-- Title Header -->
            <div class="flex items-center gap-3.5 mb-4">
              <div class="flex h-9 w-9 items-center justify-center rounded-md bg-white text-emerald-700 shadow-sm ring-1 ring-gray-200 dark:bg-[#101820] dark:text-emerald-300 dark:ring-white/10">
                <UIcon :name="card.icon" class="h-5 w-5" />
              </div>
              <h3 class="text-base font-semibold text-gray-950 dark:text-white">{{ card.title }}</h3>
            </div>
            
            <p class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-4 min-h-[36px]">
              {{ card.description }}
            </p>

            <!-- Widget Live Iframe Preview Container -->
            <div class="relative rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 h-[360px] mb-4">
              <iframe
                :src="`/widget/oau-supremacy-2026/${card.type}?theme=dark`"
                class="w-full h-[360px]"
                frameborder="0"
                :title="`${card.title} Live Preview`"
              ></iframe>
            </div>

            <!-- Embed Code Box & Snippet -->
            <div class="mt-auto space-y-4">
              <div class="rounded bg-gray-100 dark:bg-black/30 p-2.5 border border-gray-200 dark:border-white/5 overflow-hidden">
                <div class="flex justify-between items-center text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                  <span>HTML Embed Code</span>
                  <button 
                    @click="copyText(getEmbedCode(card.type, 'dark'), card.type)"
                    class="text-emerald-700 dark:text-emerald-300 hover:text-emerald-500 transition flex items-center gap-1 font-semibold"
                  >
                    <UIcon :name="copiedStates[card.type] ? 'i-lucide-check' : 'i-lucide-copy'" class="w-3.5 h-3.5" />
                    {{ copiedStates[card.type] ? 'Copied' : 'Copy' }}
                  </button>
                </div>
                <div class="min-w-0 w-full text-[9px] font-mono text-gray-600 dark:text-gray-300 overflow-x-auto select-all [scrollbar-width:none] [&::-webkit-scrollbar]:hidden whitespace-nowrap">
                  <code>{{ getEmbedCode(card.type, 'dark') }}</code>
                </div>
              </div>

              <!-- List of Subfeatures -->
              <ul class="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px] font-medium text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-white/5 pt-3.5">
                <li v-for="feat in card.features" :key="feat" class="flex items-center gap-1.5 truncate">
                  <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                  <span class="truncate">{{ feat }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works Section (Step-by-Step) -->
    <section class="bg-gray-50 py-20 dark:bg-[#0b1118]">
      <div class="mx-auto max-w-7xl px-6">
        <div class="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p class="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Seamless integration</p>
            <h2 class="mt-3 text-3xl font-semibold leading-tight tracking-normal text-gray-950 dark:text-white sm:text-4xl">
              Embed tournament standings and fixtures in three steps.
            </h2>
            <p class="mt-4 max-w-xl text-sm leading-7 text-gray-600 dark:text-gray-400">
              No technical experience required. The widget builder generates responsive HTML iframe snippets that work with all major CMS systems, web builders, and custom stacks.
            </p>
          </div>

          <div class="grid gap-4 sm:grid-cols-3">
            <div class="rounded-lg border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#070b10]">
              <p class="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">01. Setup</p>
              <h3 class="mt-4 text-base font-semibold text-gray-950 dark:text-white font-bold">Choose Tournament</h3>
              <p class="mt-2 text-xs leading-5 text-gray-600 dark:text-gray-400">Select any active tournament from your dashboard to configure its live data.</p>
            </div>
            <div class="rounded-lg border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#070b10]">
              <p class="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">02. Design</p>
              <h3 class="mt-4 text-base font-semibold text-gray-950 dark:text-white font-bold">Adjust Themes</h3>
              <p class="mt-2 text-xs leading-5 text-gray-600 dark:text-gray-400">Pick from light or dark modes, toggle features, and preview the output live.</p>
            </div>
            <div class="rounded-lg border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#070b10]">
              <p class="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">03. Publish</p>
              <h3 class="mt-4 text-base font-semibold text-gray-950 dark:text-white font-bold">Copy Code</h3>
              <p class="mt-2 text-xs leading-5 text-gray-600 dark:text-gray-400">Paste the generated iframe line on Wix, WordPress, or custom HTML structures.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Performance Details & Specifications -->
    <section class="border-b border-gray-200 bg-white py-20 dark:border-white/10 dark:bg-[#070b10]">
      <div class="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div>
          <p class="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Engineered for performance</p>
          <h2 class="mt-3 max-w-xl text-3xl font-semibold leading-tight tracking-normal text-gray-950 dark:text-white sm:text-4xl">
            Live standings, scores, and brackets without the bloat.
          </h2>
          <p class="mt-4 max-w-md text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Our embeddable widgets are built to load instantly, consume minimal bandwidth, and cache updates aggressively.
          </p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <article
            v-for="feature in features"
            :key="feature.title"
            class="rounded-lg border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-white/[0.03]"
          >
            <div class="mb-5 flex h-10 w-10 items-center justify-center rounded-md bg-white text-emerald-700 shadow-sm ring-1 ring-gray-200 dark:bg-[#101820] dark:text-emerald-300 dark:ring-white/10">
              <UIcon :name="feature.icon" class="h-5 w-5" />
            </div>
            <h3 class="text-base font-semibold text-gray-950 dark:text-white">{{ feature.title }}</h3>
            <p class="mt-2 text-xs leading-6 text-gray-600 dark:text-gray-400">{{ feature.description }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- Adaptability & Use Cases Grid -->
    <section class="bg-gray-50 py-20 dark:bg-[#0b1118]">
      <div class="mx-auto max-w-7xl px-6">
        <div class="text-center max-w-3xl mx-auto mb-16">
          <p class="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Adaptable everywhere</p>
          <h2 class="mt-3 text-3xl font-semibold leading-tight tracking-normal text-gray-950 dark:text-white sm:text-4xl">
            Who uses ParaScores widgets?
          </h2>
          <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Whether running local grassroots leagues or high-traffic sports news channels, widgets offer a complete fan interface.
          </p>
        </div>

        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div 
            v-for="uc in useCases" 
            :key="uc.title"
            class="bg-white border border-gray-200 dark:border-white/10 dark:bg-[#070b10] rounded-xl p-6 hover:border-emerald-500/30 transition-all text-center shadow-sm"
          >
            <div class="w-12 h-12 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-4 text-2xl">
              {{ uc.icon }}
            </div>
            <h3 class="text-sm font-bold text-gray-900 dark:text-white mb-2">{{ uc.title }}</h3>
            <p class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
              {{ uc.description }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Bottom CTA Card (Landing page styles) -->
    <section class="bg-white py-20 dark:bg-[#070b10]">
      <div class="mx-auto max-w-7xl px-6">
        <div class="grid gap-8 rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-white/10 dark:bg-white/[0.03] sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 class="text-3xl font-semibold leading-tight tracking-normal text-gray-950 dark:text-white">
              Ready to embed your next tournament?
            </h2>
            <p class="mt-3 max-w-2xl text-sm leading-7 text-gray-600 dark:text-gray-400">
              Start with a free tournament, invite participants, configure your layout settings, and embed widgets in minutes.
            </p>
          </div>
          <div class="flex flex-col gap-3 sm:flex-row">
            <NuxtLink
              to="/signup"
              class="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-gray-950 px-5 text-sm font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
            >
              Start free
              <UIcon name="i-lucide-arrow-right" class="h-4 w-4" />
            </NuxtLink>
            <NuxtLink
              to="/pricing"
              class="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-gray-300 px-5 text-sm font-semibold text-gray-900 transition hover:bg-white dark:border-white/15 dark:text-white dark:hover:bg-white/10"
            >
              View pricing
              <UIcon name="i-lucide-credit-card" class="h-4 w-4" />
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'

const activeTab = ref<'fixtures' | 'standings' | 'bracket' | 'stats'>('fixtures')
const activeTheme = ref<'dark' | 'light'>('dark')

const tournament = ref<any>(null)

const tabs = computed(() => {
  const base = ['fixtures']
  if (tournament.value) {
    const tType = tournament.value.type
    if (['ROUND_ROBIN', 'GROUP', 'HYBRID'].includes(tType)) {
      base.push('standings')
    }
    if (['KNOCKOUT', 'HYBRID'].includes(tType)) {
      base.push('bracket')
    }
    if (tournament.value.participantType === 'TEAM') {
      base.push('stats')
    }
  } else {
    // Default fallback while loading
    base.push('standings', 'bracket', 'stats')
  }
  return base
})

watch(tabs, (newTabs) => {
  if (!newTabs.includes(activeTab.value)) {
    activeTab.value = newTabs[0] as any
  }
})

onMounted(async () => {
  try {
    const res = await $publicApi<any>('/tournaments/oau-supremacy-2026')
    if (res?.data) {
      tournament.value = res.data
    }
  } catch (err) {
    console.error('Failed to fetch demo tournament details:', err)
  }
})

const previewUrl = computed(() => {
  return `/widget/oau-supremacy-2026/${activeTab.value}?theme=${activeTheme.value}`
})

const getEmbedCode = (type: string, theme: string) => {
  return `<iframe src="https://parascores.com/widget/oau-supremacy-2026/${type}?theme=${theme}" width="100%" height="600" frameborder="0" style="border-radius: 12px; border: 1px solid rgba(0,0,0,0.1);" title="Tournament ${type}"></iframe>`
}

const copiedStates = ref<Record<string, boolean>>({
  fixtures: false,
  standings: false,
  bracket: false,
  stats: false,
  playground: false
})

const copyText = async (text: string, key: string) => {
  try {
    await navigator.clipboard.writeText(text)
    copiedStates.value[key] = true
    setTimeout(() => {
      copiedStates.value[key] = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy code: ', err)
  }
}

const metrics = [
  { label: 'Setup time', value: '< 1 min' },
  { label: 'Widgets', value: '4 types' },
  { label: 'Updates', value: 'Live' }
]

const features = [
  {
    title: 'Zero database latency',
    description: 'Direct websocket updates push match events and goals to your users website instantly.',
    icon: 'i-lucide-zap'
  },
  {
    title: 'Adaptive styling',
    description: 'Pick light or dark modes, customize color accents, or let the widget inherit container styling.',
    icon: 'i-lucide-sliders'
  },
  {
    title: 'Universal compatibility',
    description: 'Works with Wix, WordPress, Squarespace, Ghost, custom React/Vue code, and standard HTML.',
    icon: 'i-lucide-globe'
  },
  {
    title: 'Responsive layouts',
    description: 'Designed to scale beautifully from mobile portrait feeds to wide desktop monitors.',
    icon: 'i-lucide-smartphone'
  }
]

const widgetCards = [
  {
    type: 'fixtures',
    title: 'Fixtures & Scores',
    description: 'Show upcoming matches and live real-time scores with automated status markers.',
    icon: 'i-lucide-calendar-days',
    features: ['Live score updates', 'Match event stats', 'Filter by round/stage', 'Direct match details link']
  },
  {
    type: 'standings',
    title: 'Standings Table',
    description: 'Display live group standings, points, goal differences, and head-to-head states automatically.',
    icon: 'i-lucide-table-2',
    features: ['Auto-sorting ranking', 'Support for multiple groups', 'Goal difference logic', 'Highlight qualification spots']
  },
  {
    type: 'bracket',
    title: 'Knockout Bracket',
    description: 'Visualize single and double-elimination brackets with automatic seed progress.',
    icon: 'i-lucide-git-branch',
    features: ['Interactive scroll/zoom', 'Automated match progression', 'Custom round labels', 'Responsive design']
  }
]

const useCases = [
  {
    title: 'League websites',
    description: 'Keep your league portal updated with live standings and schedules without complex dev APIs.',
    icon: '🌐'
  },
  {
    title: 'Club & team hubs',
    description: 'Provide fans with a dedicated result ticker and next match details for your teams.',
    icon: '⚽'
  },
  {
    title: 'Sports news & blogs',
    description: 'Enrich match analysis articles by pasting actual interactive match event data inline.',
    icon: '📰'
  },
  {
    title: 'Community portals',
    description: 'Enable local tournament communities to browse brackets and groups without leaving your site.',
    icon: '👥'
  }
]

useSeoMeta({
  title: 'Widgets - Embed Live Tournament Data | ParaScores',
  description: 'Embed real-time tournament fixtures, standings, brackets, and statistics directly on any website with one line of iframe code.',
  ogTitle: 'Widgets - Embed Live Tournament Data | ParaScores',
  ogDescription: 'Embed real-time tournament fixtures, standings, brackets, and statistics directly on any website with one line of iframe code.'
})
</script>
