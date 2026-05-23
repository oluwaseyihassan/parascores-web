<template>
  <div class="min-h-screen transition-colors" :class="isDark ? 'bg-[#0A0A0A]' : 'bg-white'">
    <!-- Cover Header -->
    <div 
      class="h-48 md:h-64 w-full bg-cover bg-center relative transition-colors"
      :class="isDark ? 'bg-[#111111]' : 'bg-gray-100'"
      :style="organization?.bannerUrl ? { backgroundImage: `url(${organization.bannerUrl})` } : {}"
    >
      <!-- Back link -->
      <div class="absolute top-6 inset-x-0 z-10 w-full">
        <div class="max-w-7xl mx-auto px-4 sm:px-6">
          <button @click="router.back()" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-xs font-semibold text-white/90 hover:text-white transition-all border border-white/10 cursor-pointer">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
        </div>
      </div>
    </div>

    <!-- Header Content Container (overlapping cover) -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 relative pb-8">
      <div class="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start">
        <!-- Logo overlapping -->
        <div 
          class="-mt-12 md:-mt-16 w-28 h-28 md:w-36 md:h-36 rounded-2xl border-4 overflow-hidden shadow-2xl shrink-0 flex items-center justify-center transition-colors relative z-10"
          :class="isDark ? 'border-[#0A0A0A] bg-[#111827]' : 'border-white bg-gray-50'"
        >
          <img v-if="organization?.logoUrl" :src="organization.logoUrl" :alt="organization?.name" class="w-full h-full object-cover" />
          <UIcon v-else name="i-heroicons-building-office-2" class="w-12 h-12 text-gray-400" />
        </div>

        <!-- Text details -->
        <div class="flex-1 text-center md:text-left pt-4 md:pt-6 pb-2 flex flex-col items-center md:items-start w-full">
          <h1 
            class="text-3xl md:text-5xl font-black flex flex-wrap items-center justify-center md:justify-start gap-2 tracking-tight"
            :class="isDark ? 'text-white' : 'text-gray-900'"
          >
            {{ organization?.name || 'Organization' }}
            <UIcon v-if="organization?.isVerified" name="i-heroicons-check-badge-solid" class="text-blue-500 w-6 h-6 md:w-8 md:h-8 shrink-0 translate-y-0.5 md:translate-y-1" />
          </h1>
          <p 
            class="mt-2 font-bold text-sm uppercase tracking-widest"
            :class="isDark ? 'text-gray-400' : 'text-gray-500'"
          >
            Joined {{ formattedDate }}
          </p>
          <p 
            v-if="organization?.description" 
            class="mt-2 text-sm max-w-xl whitespace-pre-wrap"
            :class="isDark ? 'text-gray-300' : 'text-gray-600'"
          >
            {{ organization.description }}
          </p>
          <!-- Social Links -->
          <div v-if="organization?.socials?.length" class="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-3">
              <a 
                v-for="social in organization.socials" 
                :key="social.id"
                :href="social.url" 
                target="_blank" 
                rel="noopener noreferrer"
                class="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                :class="isDark ? 'bg-white/10 hover:bg-white/20 text-white/70 hover:text-white' : 'bg-black/5 hover:bg-black/10 text-gray-600 hover:text-gray-900'"
                :title="getPlatformLabel(social.platform)"
              >
                <svg v-if="social.platform === 'twitter'" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                <svg v-else-if="social.platform === 'instagram'" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                <svg v-else-if="social.platform === 'facebook'" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                <svg v-else-if="social.platform === 'youtube'" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                <svg v-else-if="social.platform === 'tiktok'" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                <svg v-else-if="social.platform === 'linkedin'" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              </a>
            </div>
          </div>
        </div>
      </div>

    <!-- Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <UTabs :items="tabs" class="w-full" default-value="ongoing" @update:model-value="onChangeTab">
        <template #tournaments>
          <div class="mt-8">
            <!-- Loading -->
            <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <USkeleton v-for="i in 4" :key="i" class="h-64 rounded-xl" />
            </div>
            
            <!-- Error -->
            <div 
              v-else-if="error" 
              class="border rounded-xl p-8 text-center"
              :class="isDark ? 'bg-red-500/5 border-red-500/20 text-red-400' : 'bg-red-50 border-red-100 text-red-600'"
            >
              <UIcon name="i-heroicons-exclamation-triangle" class="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p class="font-bold">{{ error }}</p>
            </div>
            
            <!-- Empty State -->
            <div 
              v-else-if="!tournaments || tournaments.length === 0" 
              class="rounded-2xl p-16 text-center border-2 border-dashed transition-colors"
              :class="isDark ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-gray-50 border-gray-100'"
            >
              <div 
                class="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center transition-colors"
                :class="isDark ? 'bg-white/[0.03]' : 'bg-white shadow-sm'"
              >
                <UIcon name="i-heroicons-trophy" class="w-10 h-10 text-gray-400" />
              </div>
              <h3 
                class="text-2xl font-black mb-3 tracking-tight"
                :class="isDark ? 'text-white' : 'text-gray-900'"
              >
                No {{ currentStatusLabel }} Tournaments
              </h3>
              <p class="text-gray-500 font-medium max-w-sm mx-auto">
                This organization hasn't published any {{ currentStatusLabel.toLowerCase() }} tournaments available for exploration yet.
              </p>
            </div>
            
            <!-- Grid -->
            <div v-else>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                <TournamentCard 
                  v-for="tournament in tournaments" 
                  :key="tournament.id" 
                  :tournament="tournament" 
                />
              </div>
              
              <!-- Pagination -->
              <div v-if="pagination.totalPages > 1" class="mt-16 flex justify-center">
                <UPagination
                  v-model="page"
                  :page-count="pagination.limit"
                  :total="pagination.total"
                  @update:model-value="loadMore"
                />
              </div>
            </div>
          </div>
        </template>
      </UTabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Organization, ApiResponse } from '~/types'
import { storeToRefs } from 'pinia'
import { useOrganizationStore } from '~/stores/organization'

definePageMeta({
  layout: 'feed'
})

const { toMain } = useHost()
const route = useRoute()
const router = useRouter()
const orgStore = useOrganizationStore()
const colorMode = useColorMode()
const { extractErrorMessage } = useErrors()

const isDark = computed(() => colorMode.value === 'dark')
const slug = route.params.slug as string
const page = ref(1)

const tabs = [
  { label: 'Ongoing', key: 'ongoing', value: 'ongoing', slot: 'tournaments', icon: 'i-heroicons-play' },
  { label: 'Upcoming', key: 'upcoming', value: 'upcoming', slot: 'tournaments', icon: 'i-heroicons-calendar' },
  { label: 'Past', key: 'past', value: 'past', slot: 'tournaments', icon: 'i-heroicons-clock' }
]

const currentStatusIndex = ref(0)
const currentStatus = computed(() => tabs[currentStatusIndex.value]?.key || 'ongoing')
const currentStatusLabel = computed(() => tabs[currentStatusIndex.value]?.label || 'Ongoing')

async function onChangeTab(index: any) {
  let tabIndex = 0;
  
  if (typeof index === 'number') {
    tabIndex = index;
  } else if (typeof index === 'string') {
    // Some versions of Nuxt UI might pass the key or a stringified index
    const foundIndex = tabs.findIndex(t => t.key === index);
    if (foundIndex !== -1) tabIndex = foundIndex;
    else if (!isNaN(Number(index))) tabIndex = Number(index);
  }

  currentStatusIndex.value = tabIndex
  page.value = 1
  
  const statusKey = tabs[tabIndex]?.key || 'ongoing'
  await orgStore.fetchOrganizationTournaments(slug, 1, 12, false, statusKey)
}

// ── SSR-compatible org data fetching ──────────────────────────────
// useAsyncData runs on BOTH server and client, ensuring meta tags
// are present in the initial HTML for social media scrapers.
const runtimeConfig = useRuntimeConfig()

const { data: orgData, error: orgFetchError } = await useAsyncData(
  `org-public-${slug}`,
  () => $fetch<ApiResponse<Organization>>(`/organizations/public/${slug}`, {
    baseURL: runtimeConfig.public.API_BASE_URL as string,
  }),
  { lazy: false }
)

// Hydrate the store with SSR-fetched data so the rest of the page works seamlessly
if (orgData.value?.data) {
  orgStore.currentOrganization = orgData.value.data
}

// Use store refs for template bindings (keeps reactivity for client-side updates)
const { currentOrganization: organization, organizationTournaments: tournaments, loading, error, pagination } = storeToRefs(orgStore)

// Set initial error from SSR fetch if needed
if (orgFetchError.value) {
  error.value = extractErrorMessage(orgFetchError.value)
}

const formattedDate = computed(() => {
  if (!organization.value?.created_at) return ''
  return new Date(organization.value.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const getPlatformLabel = (platform: string) => {
  const labels: Record<string, string> = {
    twitter: 'X (Twitter)',
    instagram: 'Instagram',
    facebook: 'Facebook',
    youtube: 'YouTube',
    tiktok: 'TikTok',
    linkedin: 'LinkedIn',
    website: 'Website',
  }
  return labels[platform] || platform
}

// Tournaments are client-only (pagination, not needed for SEO)
onMounted(async () => {
  try {
    // If org wasn't fetched during SSR (edge case), fetch now
    if (!organization.value) {
      await orgStore.fetchPublicOrganization(slug)
    }
    await orgStore.fetchOrganizationTournaments(slug, 1, 12, false, currentStatus.value)
  } catch (err) {
    console.error('Initial load failed:', err)
  }
})

async function loadMore(newPage: number) {
  page.value = newPage
  await orgStore.fetchOrganizationTournaments(slug, newPage, 12, false, currentStatus.value)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// SEO — runs during SSR so meta tags are in the initial HTML
const seoTitle = computed(() => organization.value ? `${organization.value.name} | ParaScores` : 'Organization | ParaScores')
const seoDescription = computed(() => organization.value ? `View public tournaments hosted by ${organization.value.name}` : 'Explore tournaments on ParaScores.')
const seoImage = computed(() => organization.value?.logoUrl || 'https://www.parascores.com/og-image.png')

useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  ogTitle: seoTitle,
  ogDescription: seoDescription,
  ogImage: seoImage,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: seoTitle,
  twitterDescription: seoDescription,
  twitterImage: seoImage,
})

useHead({
  link: [
    { rel: 'canonical', href: computed(() => `https://www.parascores.com/org/${slug}`) }
  ]
})
</script>
