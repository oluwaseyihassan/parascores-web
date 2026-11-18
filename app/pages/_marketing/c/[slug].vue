<template>
  <div class="min-h-screen bg-surface transition-colors">
    <!-- Loading State -->
    <div v-if="pending && !competition">
      <div class="bg-white dark:bg-[#121212]">
        <div class="h-40 sm:h-48 md:h-56 bg-gray-200 dark:bg-white/5 animate-pulse" />
        <div class="max-w-7xl mx-auto px-4 sm:px-6 pb-6">
          <div class="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10 sm:-mt-12">
            <USkeleton class="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl shrink-0" />
            <div class="flex-1 space-y-2.5 pt-2">
              <USkeleton class="h-7 w-64 rounded-lg" />
              <USkeleton class="h-4 w-48 rounded-lg" />
            </div>
            <USkeleton class="h-10 w-28 rounded-full shrink-0" />
          </div>
          <USkeleton class="h-24 w-full rounded-2xl mt-6" />
        </div>
        <div class="border-y border-subtle px-4 sm:px-6 py-3.5">
          <div class="max-w-7xl mx-auto flex gap-6">
            <USkeleton class="h-4 w-20 rounded" />
            <USkeleton class="h-4 w-20 rounded" />
            <USkeleton class="h-4 w-16 rounded" />
          </div>
        </div>
      </div>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <USkeleton v-for="i in 4" :key="i" class="h-36 rounded-2xl" />
      </div>
    </div>

    <!-- 404 / Error State -->
    <div v-else-if="fetchError || !competition" class="max-w-xl mx-auto px-4 py-24 text-center">
      <template v-if="isNotFound">
        <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-white/5 border border-subtle flex items-center justify-center">
          <UIcon name="i-heroicons-trophy" class="w-10 h-10 text-muted" />
        </div>
        <h1 class="text-2xl font-extrabold text-heading tracking-tight">Competition not found</h1>
        <p class="text-sm text-body mt-2 mb-6">
          This competition series doesn't exist or doesn't have any public editions yet.
        </p>
        <UButton :to="toMain('/explore')" color="success" size="lg" class="rounded-xl font-bold px-6">
          Explore Competitions
        </UButton>
      </template>

      <template v-else>
        <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-10 h-10 text-red-500" />
        </div>
        <h1 class="text-2xl font-extrabold text-heading tracking-tight">Unable to load competition</h1>
        <p class="text-sm text-body mt-2 mb-6">{{ errorMessage }}</p>
        <UButton color="neutral" variant="soft" size="lg" class="rounded-xl font-bold px-6" @click="refresh()">
          Retry
        </UButton>
      </template>
    </div>

    <!-- Populated State -->
    <template v-else>
      <!-- Hero + Current Edition -->
      <section class="bg-white dark:bg-[#121212] transition-colors">
        <!-- Cover Banner -->
        <div class="relative h-40 sm:h-48 md:h-56 w-full overflow-hidden bg-gray-100 dark:bg-[#161616]">
          <img
            v-if="competition.bannerUrl"
            :src="competition.bannerUrl"
            :alt="competition.name"
            class="absolute inset-0 w-full h-full object-cover"
          />
          <div
            v-else-if="competition.logoUrl"
            class="absolute inset-0 bg-cover bg-center blur-[70px] scale-150 opacity-50"
            :style="{ backgroundImage: `url(&quot;${competition.logoUrl}&quot;)` }"
          />
          <div
            v-else
            class="absolute inset-0 opacity-20 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]"
          />

          <!-- Bottom gradient fade -->
          <div class="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white dark:from-[#121212] to-transparent pointer-events-none" />

          <!-- Floating Top Actions -->
          <div class="absolute top-4 inset-x-0 z-10">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
              <button
                type="button"
                aria-label="Go back"
                class="w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md text-white border border-white/15 flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                @click="goBack"
              >
                <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
              </button>

              <button
                type="button"
                aria-label="Share competition"
                class="w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md text-white border border-white/15 flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                @click="shareCompetition"
              >
                <UIcon name="i-heroicons-share" class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <!-- Identity Header -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 pb-6">
          <div class="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6 -mt-10 sm:-mt-12 relative z-10">
            <!-- Logo -->
            <div class="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl border-4 border-white dark:border-[#121212] bg-white dark:bg-[#141414] shadow-xl overflow-hidden shrink-0 flex items-center justify-center p-2">
              <img
                v-if="competition.logoUrl"
                :src="competition.logoUrl"
                :alt="competition.name"
                class="w-full h-full object-contain"
              />
              <span v-else class="text-2xl sm:text-4xl font-black text-heading">
                {{ competition.name.charAt(0).toUpperCase() }}
              </span>
            </div>

            <!-- Name & Metadata -->
            <div class="flex-1 min-w-0 pb-1">
              <h1 class="text-2xl sm:text-3xl font-extrabold text-heading tracking-tight leading-tight truncate">
                {{ competition.name }}
              </h1>

              <div class="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm text-body">
                <template v-if="competition.organization">
                  <NuxtLink
                    :to="toMain(`/org/${competition.organization.slug}`)"
                    class="inline-flex items-center gap-1.5 font-medium hover:text-heading transition-colors group"
                  >
                    <img
                      v-if="competition.organization.logoUrl"
                      :src="competition.organization.logoUrl"
                      :alt="competition.organization.name"
                      class="w-4 h-4 rounded-full object-cover shrink-0"
                    />
                    <span class="group-hover:underline">{{ competition.organization.name }}</span>
                    <UIcon
                      v-if="competition.organization.isVerified"
                      name="i-heroicons-check-badge-solid"
                      class="w-4 h-4 text-emerald-500 shrink-0"
                      aria-label="Verified organization"
                      title="Verified Organization"
                    />
                  </NuxtLink>

                  <span aria-hidden="true" class="text-muted">·</span>
                </template>

                <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-white/[0.06] text-heading">
                  {{ competition.sport }}
                </span>
              </div>

              <div class="mt-2 flex items-center gap-3 text-xs text-muted font-medium tabular-nums">
                <span>{{ formatCount(followerCount) }} {{ followerCount === 1 ? 'follower' : 'followers' }}</span>
                <span aria-hidden="true">·</span>
                <span>{{ seasons.length }} {{ seasons.length === 1 ? 'edition' : 'editions' }}</span>
              </div>
            </div>

            <!-- Primary CTA: Follow Competition -->
            <div class="sm:ml-auto pb-1 w-full sm:w-auto">
              <UTooltip text="Follows this competition and all its editions">
                <button
                  type="button"
                  :aria-pressed="isFollowing"
                  :aria-label="isFollowing ? `Unfollow ${competition.name}` : `Follow ${competition.name}`"
                  :disabled="togglingFollow"
                  class="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer disabled:opacity-50 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  :class="isFollowing
                    ? 'bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-200 dark:bg-neutral-800 dark:text-white dark:border-neutral-700 dark:hover:bg-neutral-700'
                    : 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200'"
                  @click="toggleFollow"
                >
                  <UIcon
                    v-if="togglingFollow"
                    name="i-heroicons-arrow-path"
                    class="w-3.5 h-3.5 animate-spin"
                  />
                  <UIcon
                    v-else-if="isFollowing"
                    name="i-heroicons-check"
                    class="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400"
                  />
                  <span>{{ isFollowing ? 'Following' : 'Follow' }}</span>
                </button>
              </UTooltip>
            </div>
          </div>

          <!-- Current / Latest Edition Highlight Card -->
          <div
            v-if="featuredEdition"
            class="mt-6 rounded-2xl border border-subtle bg-surface dark:bg-[#1a1a1a] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  {{ featuredEdition.status === 'completed' ? 'Latest Edition' : 'Current Edition' }}
                </span>
                <span
                  class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border"
                  :class="featuredStatusMeta.badgeClass"
                >
                  <span
                    v-if="featuredEdition.status === 'live'"
                    class="w-1.5 h-1.5 rounded-full bg-rose-500 motion-safe:animate-pulse"
                  />
                  {{ featuredStatusMeta.label }}
                </span>
              </div>

              <h2 class="text-base sm:text-lg font-bold text-heading mt-1 truncate">
                {{ getEditionLabel(featuredEdition) }}
                <span v-if="featuredEdition.name !== getEditionLabel(featuredEdition)" class="font-medium text-body">
                  — {{ featuredEdition.name }}
                </span>
              </h2>

              <div class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-body tabular-nums">
                <span v-if="featuredDateRange">{{ featuredDateRange }}</span>
                <template v-if="featuredEdition._count?.participants != null">
                  <span v-if="featuredDateRange" aria-hidden="true">·</span>
                  <span>{{ featuredEdition._count.participants }} {{ featuredEdition._count.participants === 1 ? 'participant' : 'participants' }}</span>
                </template>
                <template v-if="featuredEdition.location">
                  <span aria-hidden="true">·</span>
                  <span>{{ featuredEdition.location }}</span>
                </template>
                <template v-if="featuredEdition.champion">
                  <span aria-hidden="true">·</span>
                  <span class="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                    <UIcon name="i-heroicons-trophy" class="w-3.5 h-3.5" />
                    {{ featuredEdition.champion.name }}
                  </span>
                </template>
              </div>
            </div>

            <UButton
              :to="toTournament(featuredEdition)"
              color="success"
              size="md"
              trailing-icon="i-heroicons-arrow-right"
              class="w-full sm:w-auto justify-center rounded-xl font-bold shrink-0"
            >
              Go to {{ getEditionLabel(featuredEdition) }}
            </UButton>
          </div>
        </div>
      </section>

      <!-- Sticky Tab Bar -->
      <section class="border-y sticky top-0 z-30 backdrop-blur-xl transition-colors border-subtle bg-white/95 dark:bg-[#121212]/95">
        <div class="max-w-7xl mx-auto px-4 sm:px-6">
          <nav
            aria-label="Competition sections"
            role="tablist"
            class="flex items-center gap-6 overflow-x-auto no-scrollbar whitespace-nowrap -mb-px"
          >
            <button
              v-for="(tab, idx) in tabs"
              :id="`comp-tab-${tab.key}`"
              :key="tab.key"
              type="button"
              role="tab"
              :aria-selected="activeTab === tab.key"
              :aria-controls="`comp-panel-${tab.key}`"
              :tabindex="activeTab === tab.key ? 0 : -1"
              class="relative py-3.5 text-sm font-semibold transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:text-heading"
              :class="activeTab === tab.key
                ? 'text-heading'
                : 'text-body hover:text-heading'"
              @click="switchTab(tab.key)"
              @keydown="onTabKeydown($event, idx)"
            >
              <span>{{ tab.label }}</span>
              <span
                v-if="tab.count != null"
                class="ml-1.5 text-xs font-bold tabular-nums opacity-70"
              >
                ({{ tab.count }})
              </span>
              <span
                v-if="activeTab === tab.key"
                class="absolute bottom-0 left-0 right-0 h-[2.5px] bg-emerald-500 dark:bg-[#00e676] rounded-full"
              />
            </button>
          </nav>
        </div>
      </section>

      <!-- Tab Panels -->
      <section class="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24">
        <!-- Editions Tab -->
        <div
          v-show="activeTab === 'editions'"
          id="comp-panel-editions"
          role="tabpanel"
          aria-labelledby="comp-tab-editions"
        >
          <div v-if="seasons.length === 0" class="rounded-2xl p-12 text-center border-2 border-dashed border-subtle bg-white dark:bg-[#141414]">
            <p class="text-sm font-semibold text-body">No public editions yet</p>
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <CompetitionEditionCard
              v-for="season in seasons"
              :key="season.id"
              :edition="season"
              :is-current="season.id === featuredEdition?.id && season.status !== 'completed'"
            />
          </div>
        </div>

        <!-- Honours Tab -->
        <div
          v-show="activeTab === 'honours'"
          id="comp-panel-honours"
          role="tabpanel"
          aria-labelledby="comp-tab-honours"
        >
          <CompetitionHonoursTab :seasons="seasons" />
        </div>

        <!-- About Tab -->
        <div
          v-show="activeTab === 'about'"
          id="comp-panel-about"
          role="tabpanel"
          aria-labelledby="comp-tab-about"
        >
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div class="lg:col-span-8">
              <div class="bg-white dark:bg-[#141414] border border-subtle rounded-2xl p-5 sm:p-6 shadow-sm">
                <h2 class="text-base font-bold text-heading mb-3">About {{ competition.name }}</h2>
                <p
                  v-if="competition.description"
                  class="text-sm text-body whitespace-pre-line leading-relaxed"
                >
                  {{ competition.description }}
                </p>
                <p v-else class="text-sm text-muted italic">
                  No competition description provided.
                </p>
              </div>
            </div>

            <div class="lg:col-span-4 space-y-4">
              <!-- Organizer Card -->
              <div
                v-if="competition.organization"
                class="bg-white dark:bg-[#141414] border border-subtle rounded-2xl p-5 shadow-sm"
              >
                <h3 class="text-xs font-bold uppercase tracking-wider text-muted mb-3">Organizer</h3>
                <NuxtLink
                  :to="toMain(`/org/${competition.organization.slug}`)"
                  class="flex items-center gap-3 group"
                >
                  <div class="w-11 h-11 rounded-xl overflow-hidden bg-gray-100 dark:bg-white/5 border border-subtle flex items-center justify-center shrink-0">
                    <img
                      v-if="competition.organization.logoUrl"
                      :src="competition.organization.logoUrl"
                      :alt="competition.organization.name"
                      class="w-full h-full object-cover"
                    />
                    <UIcon v-else name="i-heroicons-building-office-2" class="w-5 h-5 text-muted" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5">
                      <span class="text-sm font-bold text-heading group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                        {{ competition.organization.name }}
                      </span>
                      <UIcon
                        v-if="competition.organization.isVerified"
                        name="i-heroicons-check-badge-solid"
                        class="w-4 h-4 text-emerald-500 shrink-0"
                        aria-label="Verified organization"
                      />
                    </div>
                    <span class="text-xs text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1 mt-0.5">
                      View organization
                      <UIcon name="i-heroicons-arrow-right" class="w-3 h-3" />
                    </span>
                  </div>
                </NuxtLink>
                <p
                  v-if="competition.organization.description"
                  class="text-xs text-body mt-3 line-clamp-3 leading-relaxed"
                >
                  {{ competition.organization.description }}
                </p>
              </div>

              <!-- Series Info Card -->
              <div class="bg-white dark:bg-[#141414] border border-subtle rounded-2xl p-5 shadow-sm">
                <h3 class="text-xs font-bold uppercase tracking-wider text-muted mb-3">Series Info</h3>
                <dl class="space-y-2.5 text-sm">
                  <div class="flex items-center justify-between gap-2">
                    <dt class="text-body">Sport</dt>
                    <dd class="font-semibold text-heading capitalize">{{ competition.sport }}</dd>
                  </div>
                  <div class="flex items-center justify-between gap-2">
                    <dt class="text-body">Editions</dt>
                    <dd class="font-semibold text-heading tabular-nums">{{ seasons.length }}</dd>
                  </div>
                  <div class="flex items-center justify-between gap-2">
                    <dt class="text-body">Followers</dt>
                    <dd class="font-semibold text-heading tabular-nums">{{ formatCount(followerCount) }}</dd>
                  </div>
                  <div v-if="competition.created_at" class="flex items-center justify-between gap-2">
                    <dt class="text-body">Established</dt>
                    <dd class="font-semibold text-heading tabular-nums">
                      {{ new Date(competition.created_at).getFullYear() }}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ApiResponse, Competition, CompetitionEdition } from '~/types'
import { formatEditionDateRange, getEditionLabel, getEditionStatusMeta } from '~/utils/competition'

definePageMeta({
  layout: 'feed',
})

const route = useRoute()
const router = useRouter()
const runtimeConfig = useRuntimeConfig()
const authStore = useAuthStore()
const competitionStore = useCompetitionStore()
const { toMain, toTournament } = useHost()
const { handleError, extractErrorMessage } = useErrors()
const toast = useToast()

const slug = computed(() => route.params.slug as string)

const {
  data: compResponse,
  status,
  error: fetchError,
  refresh,
} = await useAsyncData(
  `competition-${slug.value}`,
  () =>
    $fetch<ApiResponse<Competition>>(`/competitions/${slug.value}`, {
      baseURL: runtimeConfig.public.API_BASE_URL as string,
    }),
  {
    watch: [slug],
    lazy: false,
  },
)

const competition = computed(() => compResponse.value?.data || null)
const seasons = computed<CompetitionEdition[]>(() => competition.value?.seasons || [])
const pending = computed(() => status.value === 'pending')

const isNotFound = computed(() => {
  const code = (fetchError.value as any)?.statusCode || (fetchError.value as any)?.status
  return code === 404 || (!pending.value && !fetchError.value && !competition.value)
})

const errorMessage = computed(() =>
  fetchError.value ? extractErrorMessage(fetchError.value) : 'Something went wrong.',
)

// Follower count (reactive local counter synced with API)
const localFollowerDelta = ref(0)
watch(slug, () => {
  localFollowerDelta.value = 0
})
const followerCount = computed(() =>
  Math.max(0, (competition.value?._count?.followers ?? 0) + localFollowerDelta.value),
)

// Follow state
const isFollowing = ref(false)
const togglingFollow = ref(false)

watch(
  [() => authStore.isAuthenticated, () => competition.value?.id],
  async ([isAuth, compId]) => {
    if (isAuth && compId) {
      isFollowing.value = await competitionStore.checkCompetitionFollowStatus(compId)
    } else {
      isFollowing.value = false
    }
  },
  { immediate: true },
)

async function toggleFollow() {
  if (!authStore.isAuthenticated) {
    toast.add({
      title: 'Login Required',
      description: 'Please login to follow competitions',
      color: 'error',
    })
    await navigateTo('/login')
    return
  }

  if (!competition.value) return
  const wasFollowing = isFollowing.value
  isFollowing.value = !wasFollowing
  localFollowerDelta.value += wasFollowing ? -1 : 1
  togglingFollow.value = true

  try {
    if (wasFollowing) {
      await competitionStore.unfollowCompetition(competition.value.id)
      toast.add({
        title: 'Unfollowed',
        description: `You unfollowed ${competition.value.name}.`,
        color: 'neutral',
      })
    } else {
      await competitionStore.followCompetition(competition.value.id, competition.value)
      toast.add({
        title: 'Followed',
        description: `You are now following ${competition.value.name} and all future editions.`,
        color: 'success',
      })
    }
  } catch (err: any) {
    isFollowing.value = wasFollowing
    localFollowerDelta.value += wasFollowing ? 1 : -1
    handleError(err, { title: 'Follow Action Failed', report: true })
  } finally {
    togglingFollow.value = false
  }
}

// Featured / Current Edition (guard truthy slugs/ids so null === null never matches)
const featuredEdition = computed<CompetitionEdition | null>(() => {
  if (!seasons.value.length) return null
  const activeSlug = competition.value?.activeSeasonSlug
  const activeId = competition.value?.activeSeasonId
  return (
    seasons.value.find(
      (s) =>
        (activeSlug && s.customName === activeSlug) ||
        (activeId && s.id === activeId),
    ) ||
    seasons.value.find((s) => s.status === 'live') ||
    seasons.value.find((s) => s.status === 'upcoming') ||
    seasons.value[0] ||
    null
  )
})

const featuredStatusMeta = computed(() => getEditionStatusMeta(featuredEdition.value?.status))
const featuredDateRange = computed(() =>
  formatEditionDateRange(featuredEdition.value?.start_date, featuredEdition.value?.end_date),
)

// Tabs
type CompTabKey = 'editions' | 'honours' | 'about'
const validTabs: CompTabKey[] = ['editions', 'honours', 'about']
const initialTab = validTabs.includes(route.query.tab as CompTabKey)
  ? (route.query.tab as CompTabKey)
  : 'editions'
const activeTab = ref<CompTabKey>(initialTab)

const crownedCount = computed(() => seasons.value.filter((s) => !!s.champion).length)

const tabs = computed(() => [
  { key: 'editions' as CompTabKey, label: 'Editions', count: seasons.value.length },
  { key: 'honours' as CompTabKey, label: 'Honours', count: crownedCount.value },
  { key: 'about' as CompTabKey, label: 'About', count: null },
])

function switchTab(key: CompTabKey) {
  activeTab.value = key
  router.replace({ query: { ...route.query, tab: key } })
}

function onTabKeydown(e: KeyboardEvent, currentIdx: number) {
  let nextIdx = currentIdx
  if (e.key === 'ArrowRight') nextIdx = (currentIdx + 1) % tabs.value.length
  else if (e.key === 'ArrowLeft') nextIdx = (currentIdx - 1 + tabs.value.length) % tabs.value.length
  else if (e.key === 'Home') nextIdx = 0
  else if (e.key === 'End') nextIdx = tabs.value.length - 1
  else return

  e.preventDefault()
  const nextTab = tabs.value[nextIdx]
  if (!nextTab) return
  switchTab(nextTab.key)
  nextTick(() => {
    document.getElementById(`comp-tab-${nextTab.key}`)?.focus()
  })
}

watch(
  () => route.query.tab,
  (q) => {
    if (validTabs.includes(q as CompTabKey) && q !== activeTab.value) {
      activeTab.value = q as CompTabKey
    }
  },
)

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return String(n)
}

function goBack() {
  if (import.meta.client && window.history.length > 1) {
    router.back()
  } else {
    navigateTo(toMain('/explore'))
  }
}

async function shareCompetition() {
  if (!import.meta.client) return
  const url = window.location.href
  if (navigator.share) {
    try {
      await navigator.share({ title: competition.value?.name || 'Competition', url })
      return
    } catch {
      // fall through to clipboard
    }
  }
  await navigator.clipboard?.writeText(url)
  toast.add({ title: 'Link copied', description: 'Competition URL copied to clipboard.', color: 'success' })
}

// SEO
useSeoMeta({
  title: () => (competition.value ? `${competition.value.name} | ParaScores` : 'Competition | ParaScores'),
  description: () =>
    competition.value?.description ||
    (competition.value
      ? `Follow ${competition.value.name} editions, champions, and live scores on ParaScores.`
      : 'Browse competition editions and champions on ParaScores.'),
  ogTitle: () => (competition.value ? `${competition.value.name} | ParaScores` : 'Competition | ParaScores'),
  ogDescription: () =>
    competition.value?.description ||
    (competition.value
      ? `Follow ${competition.value.name} editions, champions, and live scores on ParaScores.`
      : 'Browse competition editions and champions on ParaScores.'),
  ogImage: () => competition.value?.bannerUrl || competition.value?.logoUrl || undefined,
  twitterCard: 'summary_large_image',
})
</script>
