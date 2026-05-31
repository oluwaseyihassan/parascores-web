<template>
  <div class="min-h-screen bg-white text-gray-950 dark:bg-[#070b10] dark:text-white">
    <section class="relative isolate min-h-[calc(100svh-10rem)] overflow-hidden bg-[#07100c]">
      <img
        src="/images/landing/dashboard-screenshot.png"
        alt="ParaScores tournament dashboard"
        class="absolute inset-0 h-full w-full object-cover opacity-30"
      />
      <div class="absolute inset-0 bg-black/65"></div>

      <div class="relative mx-auto flex min-h-[calc(100svh-10rem)] max-w-7xl flex-col justify-end px-6 py-16 sm:py-20">
        <div class="max-w-3xl">
          <p class="mb-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
            <span class="h-2 w-2 rounded-full bg-emerald-300"></span>
            Tournament operations, live scores, and fan pages
          </p>
          <h1 class="max-w-4xl text-5xl font-semibold leading-[1.02] tracking-normal text-white sm:text-6xl lg:text-7xl">
            Run World-Class Tournaments. <span class="text-emerald-400">Automate Everything.</span>
          </h1>
          <p class="mt-6 max-w-2xl text-base leading-7 text-gray-200 sm:text-lg">
            ParaScores gives organizers one clean workspace for fixtures, standings, match control, brackets, and share-ready graphics.
          </p>

          <div class="mt-8 flex flex-col gap-3 sm:flex-row">
            <NuxtLink
              to="/signup"
              class="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-emerald-400 px-5 text-sm font-semibold text-gray-950 transition hover:bg-emerald-300"
            >
              Start free
              <UIcon name="i-lucide-arrow-right" class="h-4 w-4" />
            </NuxtLink>
            <NuxtLink
              to="/explore"
              class="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/25 px-5 text-sm font-semibold text-white transition hover:border-white/50 hover:bg-white/10"
            >
              Explore tournaments
              <UIcon name="i-lucide-search" class="h-4 w-4" />
            </NuxtLink>
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
            <img :src="item.image" :alt="item.alt" class="aspect-[16/10] w-full object-cover" />
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
    title: 'Graphics studio',
    description: 'Produce result and matchday visuals without leaving the tournament workspace.',
    image: '/images/landing/graphics-generator.png',
    alt: 'ParaScores graphics generator'
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

useSeoMeta({
  title: 'ParaScores - Clean Tournament Management',
  description: 'Run fixtures, standings, live scores, brackets, and match graphics from one clean tournament workspace.',
  ogTitle: 'ParaScores - Clean Tournament Management',
  ogDescription: 'Run fixtures, standings, live scores, brackets, and match graphics from one clean tournament workspace.'
})
</script>
