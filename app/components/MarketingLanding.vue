<template>
  <div class="min-h-screen bg-white text-gray-950 dark:bg-[#070b10] dark:text-white transition-colors duration-300">
    <section class="relative isolate min-h-[calc(100svh-10rem)] overflow-hidden bg-slate-50 dark:bg-[#070b10] transition-colors duration-300">
      <!-- Glowing design assets for premium dark mode aesthetics -->
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.08),transparent_45%)] pointer-events-none"></div>
      <div class="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div class="relative mx-auto w-full max-w-7xl px-6 py-16 sm:py-20 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
        <!-- Left Column: Copy & Value Proposition -->
        <div class="max-w-2xl">
          <p class="mb-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
            <span class="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-300 animate-pulse"></span>
            Tournament operations, live scores, and fan pages
          </p>
          <h1 class="max-w-4xl text-5xl font-semibold leading-[1.02] tracking-normal text-gray-900 dark:text-white sm:text-6xl lg:text-7xl">
            Run World-Class Tournaments. <span class="text-emerald-500 dark:text-emerald-400">Automate Everything.</span>
          </h1>
          <p class="mt-6 max-w-2xl text-base leading-7 text-gray-600 dark:text-gray-200 sm:text-lg">
            ParaScores gives organizers one clean workspace for fixtures, standings, match control, brackets, and share-ready graphics.
          </p>

          <div class="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <NuxtLink
              to="/signup"
              class="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-emerald-400 px-5 text-sm font-semibold text-gray-950 transition hover:bg-emerald-300"
            >
              Start free
              <UIcon name="i-lucide-arrow-right" class="h-4 w-4" />
            </NuxtLink>
            <NuxtLink
              to="/contact"
              class="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-gray-300 dark:border-white/25 px-5 text-sm font-semibold text-gray-900 dark:text-white transition hover:border-gray-400 dark:hover:border-white/50 hover:bg-gray-100 dark:hover:bg-white/10"
            >
              Book a demo
              <UIcon name="i-lucide-calendar" class="h-4 w-4" />
            </NuxtLink>
            <NuxtLink
              to="/explore"
              class="inline-flex items-center justify-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition py-2"
            >
              Explore tournaments
              <UIcon name="i-lucide-search" class="h-4 w-4" />
            </NuxtLink>
          </div>
        </div>

        <!-- Right Column: Premium Smartphone Mockup -->
        <div class="relative flex justify-center lg:justify-end items-center w-full">
          <!-- Outer subtle green glow behind the phone -->
          <div class="absolute -inset-10 bg-emerald-500/10 blur-[60px] rounded-full pointer-events-none"></div>

          <!-- Phone mockup container -->
          <div class="relative w-[290px] h-[580px] rounded-[44px] border-[10px] border-[#1f2937] bg-[#070b10] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden ring-1 ring-white/10 flex flex-col select-none">
            <!-- Speaker Ear Piece & Camera / Dynamic Island -->
            <div class="absolute top-2.5 left-1/2 -translate-x-1/2 w-24 h-4.5 bg-black rounded-full z-30 flex items-center justify-center">
              <span class="w-1.5 h-1.5 rounded-full bg-[#111827] mr-10"></span>
              <span class="w-1 h-1 rounded-full bg-[#030712]"></span>
            </div>

            <!-- Screen Content (Simulated Live Fan Page) -->
            <div class="flex-1 flex flex-col bg-[#070b10] text-white overflow-hidden p-4 pt-10 font-sans text-xs">
              <!-- Top Navigation -->
              <div class="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
                <div class="flex items-center gap-1.5">
                  <div class="w-5 h-5 rounded bg-emerald-500 flex items-center justify-center font-bold text-[10px] text-gray-950">🏆</div>
                  <span class="font-bold text-[11px] tracking-tight">OAU Supremacy Cup</span>
                </div>
                <span class="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold uppercase tracking-wider">Group Stage</span>
              </div>

              <!-- Live Match Card -->
              <div class="bg-white/[0.03] border border-white/10 rounded-xl p-3 mb-3 relative overflow-hidden">
                <!-- Glowing red live dot -->
                <div class="flex items-center justify-between mb-2.5">
                  <span class="text-[9px] text-gray-400 font-medium">Pitch 1 • Group A</span>
                  <div class="flex items-center gap-1.5">
                    <span class="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping"></span>
                    <span class="text-[9px] font-bold text-red-500 tracking-wide">78' LIVE</span>
                  </div>
                </div>

                <!-- Teams and Score -->
                <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mb-2">
                  <div class="flex flex-col items-center text-center">
                    <div class="w-9 h-9 rounded-full bg-[#1e293b] border border-white/10 flex items-center justify-center font-black text-xs text-emerald-400 mb-1 shadow-sm">ATH</div>
                    <span class="font-bold text-[10px] text-gray-200 truncate w-full">Athletics</span>
                  </div>
                  <div class="flex flex-col items-center">
                    <span class="text-lg font-extrabold text-white tracking-widest">2 - 1</span>
                    <span class="text-[9px] text-gray-500 font-semibold uppercase mt-0.5">VS</span>
                  </div>
                  <div class="flex flex-col items-center text-center">
                    <div class="w-9 h-9 rounded-full bg-[#1d1e2e] border border-white/10 flex items-center justify-center font-black text-xs text-blue-400 mb-1 shadow-sm">TEC</div>
                    <span class="font-bold text-[10px] text-gray-200 truncate w-full">Tech Titans</span>
                  </div>
                </div>

                <!-- Live events ticker -->
                <div class="border-t border-white/5 pt-2 space-y-1 text-[9px] text-gray-400">
                  <div class="flex justify-between">
                    <span>⚽ O. Johnson (ATH)</span>
                    <span class="text-emerald-400 font-bold">68'</span>
                  </div>
                  <div class="flex justify-between">
                    <span>⚽ A. Yusuf (TEC)</span>
                    <span class="text-blue-400">54'</span>
                  </div>
                </div>
              </div>

              <!-- Mini Standing Table Card -->
              <div class="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex-1 flex flex-col">
                <div class="flex items-center justify-between mb-2">
                  <span class="font-bold text-[10px] text-gray-200 uppercase tracking-wider">Group A Standings</span>
                  <span class="text-[8px] text-gray-500">Live points</span>
                </div>
                
                <div class="space-y-1.5 flex-1">
                  <!-- Table Header -->
                  <div class="grid grid-cols-[20px_1fr_24px_24px_24px] text-[8px] font-bold text-gray-500 uppercase pb-1 border-b border-white/5">
                    <span>Pos</span>
                    <span>Team</span>
                    <span class="text-center">P</span>
                    <span class="text-center">GD</span>
                    <span class="text-right">Pts</span>
                  </div>
                  
                  <!-- Standing Row 1 -->
                  <div class="grid grid-cols-[20px_1fr_24px_24px_24px] items-center text-[10px] font-medium py-0.5 text-white">
                    <span class="text-emerald-400 font-bold">1</span>
                    <span class="truncate font-semibold text-gray-200">Athletics</span>
                    <span class="text-center text-gray-400">4</span>
                    <span class="text-center text-green-500">+4</span>
                    <span class="text-right font-bold text-emerald-400">10</span>
                  </div>
                  
                  <!-- Standing Row 2 -->
                  <div class="grid grid-cols-[20px_1fr_24px_24px_24px] items-center text-[10px] font-medium py-0.5 text-white">
                    <span class="text-gray-400">2</span>
                    <span class="truncate text-gray-300">Tech Titans</span>
                    <span class="text-center text-gray-400">4</span>
                    <span class="text-center text-blue-400">+1</span>
                    <span class="text-right font-bold">7</span>
                  </div>

                  <!-- Standing Row 3 -->
                  <div class="grid grid-cols-[20px_1fr_24px_24px_24px] items-center text-[10px] font-medium py-0.5 text-white">
                    <span class="text-gray-400">3</span>
                    <span class="truncate text-gray-300">Sky Hawks</span>
                    <span class="text-center text-gray-400">4</span>
                    <span class="text-center text-gray-500">-1</span>
                    <span class="text-right font-bold">4</span>
                  </div>
                </div>

                <!-- Fan Interaction Banner -->
                <div class="mt-auto bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/25 rounded-lg p-2 flex items-center justify-between">
                  <div class="flex flex-col">
                    <span class="text-[8px] text-emerald-400 font-black uppercase tracking-wider">Fan Mode</span>
                    <span class="text-[9px] text-gray-200 font-bold">Turn on Notifications</span>
                  </div>
                  <div class="w-6 h-3.5 bg-emerald-500 rounded-full flex items-center justify-end px-0.5 cursor-pointer">
                    <span class="w-2.5 h-2.5 rounded-full bg-gray-950"></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="border-b border-gray-200 bg-white py-14 dark:border-white/10 dark:bg-[#070b10]">
      <div class="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div>
          <p class="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Built for busy organizers</p>
          <h2 class="mt-3 max-w-xl text-3xl font-semibold leading-tight tracking-normal text-gray-950 dark:text-white sm:text-4xl">
            Everything important stays close to the match.
          </h2>
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
            <p class="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">{{ feature.description }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="bg-gray-50 py-18 dark:bg-[#0b1118]">
      <div class="mx-auto max-w-7xl px-6">
        <div class="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p class="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Matchday control</p>
            <h2 class="mt-3 text-3xl font-semibold leading-tight tracking-normal text-gray-950 dark:text-white sm:text-4xl">
              Keep scores, standings, and graphics in sync.
            </h2>
            <p class="mt-4 max-w-xl text-sm leading-7 text-gray-600 dark:text-gray-400">
              Update a match once and let ParaScores carry that result through the fan page, group table, bracket, and social graphic workflow.
            </p>
          </div>

          <div class="grid gap-4 sm:grid-cols-3">
            <div
              v-for="workflow in workflows"
              :key="workflow.title"
              class="rounded-lg border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#070b10]"
            >
              <p class="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-500">{{ workflow.step }}</p>
              <h3 class="mt-4 text-base font-semibold text-gray-950 dark:text-white">{{ workflow.title }}</h3>
              <p class="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">{{ workflow.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="border-y border-gray-200 bg-white py-18 dark:border-white/10 dark:bg-[#070b10]">
      <div class="mx-auto max-w-7xl px-6">
        <div class="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p class="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Formats covered</p>
            <h2 class="mt-3 text-3xl font-semibold leading-tight tracking-normal text-gray-950 dark:text-white sm:text-4xl">
              From a friendly to a full season.
            </h2>
          </div>
          <NuxtLink
            to="/signup"
            class="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-md border border-gray-300 px-4 text-sm font-semibold text-gray-900 transition hover:bg-gray-100 dark:border-white/15 dark:text-white dark:hover:bg-white/10"
          >
            Create tournament
            <UIcon name="i-lucide-plus" class="h-4 w-4" />
          </NuxtLink>
        </div>

        <div class="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div
            v-for="format in formats"
            :key="format.name"
            class="rounded-lg border border-gray-200 p-4 dark:border-white/10"
          >
            <UIcon :name="format.icon" class="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
            <h3 class="mt-4 text-sm font-semibold text-gray-950 dark:text-white">{{ format.name }}</h3>
            <p class="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">{{ format.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="bg-gray-50 py-18 dark:bg-[#0b1118]">
      <div class="mx-auto max-w-7xl px-6">
        <div class="max-w-2xl">
          <p class="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Live public experience</p>
          <h2 class="mt-3 text-3xl font-semibold leading-tight tracking-normal text-gray-950 dark:text-white sm:text-4xl">
            Give fans pages that feel current.
          </h2>
          <p class="mt-4 text-sm leading-7 text-gray-600 dark:text-gray-400">
            Publish the details people actually check: brackets, fixture pages, live standings, and clean visual assets for every update.
          </p>
        </div>

        <div class="mt-10 grid gap-5 lg:grid-cols-3">
          <article
            v-for="item in showcase"
            :key="item.title"
            class="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/10 dark:bg-[#070b10]"
          >
            <div class="relative group overflow-hidden cursor-zoom-in aspect-[16/10]" @click="selectedImage = { src: item.image, alt: item.alt }">
              <img 
                :src="item.image" 
                :alt="item.alt" 
                class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
              />
              <div class="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div class="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-lg">
                  <UIcon name="i-heroicons-magnifying-glass-plus" class="w-5 h-5" />
                </div>
              </div>
            </div>
            <div class="p-5">
              <h3 class="text-base font-semibold text-gray-950 dark:text-white">{{ item.title }}</h3>
              <p class="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">{{ item.description }}</p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="bg-white py-18 dark:bg-[#070b10]">
      <div class="mx-auto max-w-7xl px-6">
        <div class="max-w-2xl">
          <p class="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Organizer voices</p>
          <h2 class="mt-3 text-3xl font-semibold leading-tight tracking-normal text-gray-950 dark:text-white sm:text-4xl">
            Loved by people who run the game.
          </h2>
        </div>

        <div class="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="testimonial in testimonials"
            :key="testimonial.name"
            class="rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-white/10 dark:bg-white/[0.03]"
          >
            <UIcon name="i-lucide-quote" class="h-6 w-6 text-emerald-500/60" />
            <p class="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-300">
              {{ testimonial.quote }}
            </p>
            <div class="mt-6 flex items-center gap-3">
              <div class="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                {{ testimonial.name.split(' ').map(n => n[0]).join('').slice(0, 2) }}
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-950 dark:text-white">{{ testimonial.name }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ testimonial.role }}</p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="bg-white py-18 dark:bg-[#070b10]">
      <div class="mx-auto max-w-7xl px-6">
        <div class="grid gap-8 rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-white/10 dark:bg-white/[0.03] sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 class="text-3xl font-semibold leading-tight tracking-normal text-gray-950 dark:text-white">
              Ready for the next fixture?
            </h2>
            <p class="mt-3 max-w-2xl text-sm leading-7 text-gray-600 dark:text-gray-400">
              Start with a free tournament, invite participants, and publish a polished fan experience before kickoff.
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
              to="/contact"
              class="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-gray-300 px-5 text-sm font-semibold text-gray-900 transition hover:bg-white dark:border-white/15 dark:text-white dark:hover:bg-white/10"
            >
              Book a demo
              <UIcon name="i-lucide-calendar" class="h-4 w-4" />
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- Lightbox Modal -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div 
        v-if="selectedImage" 
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
        @click="selectedImage = null"
      >
        <!-- Close Button -->
        <button 
          class="absolute top-4 right-4 text-white/75 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full border border-white/10 transition-colors cursor-pointer"
          @click.stop="selectedImage = null"
          aria-label="Close image"
        >
          <UIcon name="i-heroicons-x-mark" class="w-6 h-6" />
        </button>

        <!-- Image Container -->
        <div class="relative max-w-5xl max-h-[85vh] w-full flex items-center justify-center" @click.stop>
          <img 
            :src="selectedImage.src" 
            :alt="selectedImage.alt" 
            class="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-white/10 animate-in zoom-in-95 duration-300" 
          />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const selectedImage = ref<{ src: string; alt: string } | null>(null)

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && selectedImage.value) {
    selectedImage.value = null
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

const features = [
  {
    title: 'Fixtures without spreadsheet drift',
    description: 'Build schedules, assign venues, and keep every public page aligned as results change.',
    icon: 'i-lucide-calendar-days'
  },
  {
    title: 'Live match control',
    description: 'Track goals, cards, penalties, and corrections from one focused control surface.',
    icon: 'i-lucide-radio'
  },
  {
    title: 'Automatic tables and brackets',
    description: 'Standings, goal difference, group order, and knockout progression update as you score.',
    icon: 'i-lucide-table-2'
  },
  {
    title: 'Share-ready graphics',
    description: 'Turn results, standings, and match moments into clean assets for social channels.',
    icon: 'i-lucide-image'
  }
]

const workflows = [
  {
    step: '01',
    title: 'Create',
    description: 'Choose the format, dates, participants, and basic branding.'
  },
  {
    step: '02',
    title: 'Control',
    description: 'Run fixtures live with event tracking and score corrections.'
  },
  {
    step: '03',
    title: 'Publish',
    description: 'Share public pages, widgets, and graphics as the tournament unfolds.'
  }
]

const formats = [
  {
    name: 'Knockout',
    description: 'Single-elimination cups and playoffs.',
    icon: 'i-lucide-git-branch'
  },
  {
    name: 'Round robin',
    description: 'Everyone plays everyone with live tables.',
    icon: 'i-lucide-refresh-cw'
  },
  {
    name: 'Group stage',
    description: 'Multiple groups with separate standings.',
    icon: 'i-lucide-panels-top-left'
  },
  {
    name: 'Hybrid',
    description: 'Groups first, knockout bracket after.',
    icon: 'i-lucide-workflow'
  },
  {
    name: 'Friendly',
    description: 'Standalone matches with simple publishing.',
    icon: 'i-lucide-shield'
  }
]

const showcase = [
  {
    title: 'Tournament page',
    description: 'Give your fans a dedicated home page for schedules, standings, rosters, and brackets.',
    image: '/images/landing/fan-page.png',
    alt: 'ParaScores tournament page view'
  },
  {
    title: 'Knockout brackets',
    description: 'Publish clear bracket views that progress automatically as teams advance.',
    image: '/images/landing/bracket-view.png',
    alt: 'ParaScores knockout bracket view'
  },
  {
    title: 'Live standings',
    description: 'Give fans an up-to-date table with points, goal difference, and positions.',
    image: '/images/landing/standings-table.png',
    alt: 'ParaScores standings table'
  }
]

const testimonials = [
  {
    name: 'Daniel Okafor',
    role: 'Tournament Director, Lagos University Cup',
    quote: 'ParaScores cut our matchday admin time in half. Fans get live updates and we finally stopped updating spreadsheets at midnight.'
  },
  {
    name: 'Amara Nwosu',
    role: 'Organizer, Eastern Youth League',
    quote: 'The graphics feature alone is worth it. We share standings and results on Instagram without touching a design tool.'
  },
  {
    name: 'Tunde Balogun',
    role: 'League Secretary, Ibadan FA',
    quote: 'From fixtures to final standings, everything is in one place. My referees and team managers love the public pages.'
  }
]

useSeoMeta({
  title: 'ParaScores - Tournament Management Made Simple',
  description: 'Run fixtures, standings, live scores, brackets, and match graphics from one clean tournament workspace.',
  ogTitle: 'ParaScores - Tournament Management Made Simple',
  ogDescription: 'Run fixtures, standings, live scores, brackets, and match graphics from one clean tournament workspace.',
  ogImage: 'https://res.cloudinary.com/djsnerfzp/image/upload/v1780242386/og-image_mbs1ei.png',
  twitterImage: 'https://res.cloudinary.com/djsnerfzp/image/upload/v1780242386/og-image_mbs1ei.png',
  twitterCard: 'summary_large_image'
})
</script>
