<script setup lang="ts">
import type { Tournament, Fixture, Standing, Participant, Sponsor, Social, Venue } from '~/types'
import { TournamentType, FixtureStatus, FixtureStage, ParticipantType, ParticipantStatus } from '~/types'
import { getLivestreamPlatformInfo, detectLivestreamPlatform } from '~/utils/livestream'
import MarketingTournamentPredictionsTab from '~/components/marketing/TournamentPredictionsTab.vue'

definePageMeta({
  layout: 'feed'
})

const route = useRoute()
const router = useRouter()
const tournamentId = route.params.id as string

// Stores
const authStore = useAuthStore()
const tournamentStore = useTournamentStore()
const { handleError, extractErrorMessage } = useErrors()

// State — fetched via useAsyncData for SSR support (SEO meta tags)
const selectedSponsor = ref<Sponsor | null>(null)
const { toMain, toTournament } = useHost()
type TabKey = 'fixtures' | 'standings' | 'bracket' | 'info' | 'participants' | 'stats' | 'chat' | 'predictions'
const activeTab = ref<TabKey>(
  (route.query.tab as any) || 'info'
)
function getFixtureUrl(fixtureId: string) {
  const tId = tournament.value?.customName || tournament.value?.id || tournamentId
  return toMain(`/t/${tId}/fixture/${fixtureId}`)
}

function openFixture(fixtureId: string) {
  if (isDragging.value) return
  navigateTo(getFixtureUrl(fixtureId))
}

function onFixtureClick(e: MouseEvent) {
  if (isDragging.value) {
    e.preventDefault()
  }
}

function getTeamUrl(participantId: string) {
  const tId = tournament.value?.customName || tournament.value?.id || tournamentId
  return toMain(`/t/${tId}/team/${participantId}`)
}

function openTeam(participantId: string) {
  if (isDragging.value) return
  navigateTo(getTeamUrl(participantId))
}

function onTeamClick(e: MouseEvent) {
  if (isDragging.value) {
    e.preventDefault()
  }
}

// Goal Flash state
const flashingFixtures = ref<Map<string, 'home' | 'away'>>(new Map())
const toastedScores = new Map<string, string>() // fixtureId -> "home-away" last toasted score
const toast = useToast()

// Player Stats state
const playerStats = ref<any>(null)
const playerStatsLoading = ref(false)

const loadPlayerStats = async () => {
  const currentId = tournament.value?.id || targetIdentifier.value
  if (!currentId) return
  playerStatsLoading.value = true
  try {
    const res = await $publicApi<{success: boolean, data: any}>(`/tournaments/${currentId}/player-stats`)
    if (res.data) {
      playerStats.value = res.data
    }
  } catch (e) {
    console.error('Failed to load player stats:', e)
  } finally {
    playerStatsLoading.value = false
  }
}

watch(activeTab, (newTab) => {
  router.replace({ query: { ...route.query, tab: newTab } })
  scrollActiveTabIntoView()
}, { flush: 'post' })

watch(() => route.query.tab, (newTab) => {
  if (newTab && newTab !== activeTab.value) {
    const validTabs: TabKey[] = ['info', 'fixtures', 'standings', 'bracket', 'participants', 'stats', 'chat', 'predictions']
    if (validTabs.includes(newTab as TabKey)) {
      if (newTab === 'chat' && !showMatchHub.value) return
      switchTab(newTab as TabKey)
    }
  }
})

// Establish Live Stream connection to receive realtime push notifications
useLiveStream()

function onLiveMatchUpdate(e: Event) {
  const customEvent = e as CustomEvent
  const { type, data } = customEvent.detail

  if (type === 'fixture_updated') {
    const targetIdx = fixtures.value.findIndex((f) => f.id === data.id)
    if (targetIdx !== -1) {
      const oldFixture = fixtures.value[targetIdx]
      if (!oldFixture) return
      const oldHome = oldFixture.homeScore ?? 0
      const oldAway = oldFixture.awayScore ?? 0
      const newHome = data.homeScore ?? 0
      const newAway = data.awayScore ?? 0

      // Detect goal: score increased
      const goalScored = newHome > oldHome || newAway > oldAway

      // Merge fixture data
      fixtures.value[targetIdx] = { ...oldFixture, ...data }

      // Trigger goal flash (deduplicate rapid SSE events)
      const scoreKey = `${newHome}-${newAway}`
      if (goalScored && toastedScores.get(data.id) !== scoreKey) {
        toastedScores.set(data.id, scoreKey)

        const homeName = data.homeTeam?.customName || oldFixture.homeTeam?.customName || 'Home'
        const awayName = data.awayTeam?.customName || oldFixture.awayTeam?.customName || 'Away'
        const scoringSide: 'home' | 'away' = newHome > oldHome ? 'home' : 'away'
        const scoringTeam = scoringSide === 'home' ? homeName : awayName

        // Add goal indicator
        const updatedMap = new Map(flashingFixtures.value)
        updatedMap.set(data.id, scoringSide)
        flashingFixtures.value = updatedMap

        // Remove goal indicator after 5s
        setTimeout(() => {
          const m = new Map(flashingFixtures.value)
          m.delete(data.id)
          flashingFixtures.value = m
        }, 5000)

        // Toast notification
        toast.add({
          id: `goal-${data.id}-${newHome}-${newAway}`,
          title: `⚽ GOAL! ${scoringTeam}`,
          description: `${homeName} ${newHome} - ${newAway} ${awayName}`,
          color: 'success',
          icon: 'i-mdi-soccer',
          duration: 10000
        })
      }
    }
  }
}

onMounted(() => {
  window.addEventListener('live-match-update', onLiveMatchUpdate)
})

onBeforeUnmount(() => {
  window.removeEventListener('live-match-update', onLiveMatchUpdate)
})

// ── SSR-compatible data fetching ──────────────────────────────────
// useAsyncData runs on BOTH server and client, ensuring meta tags
// are present in the initial HTML for social media scrapers.
const runtimeConfig = useRuntimeConfig()

// Target identifier supports ?season= query param or route param ID/slug
const targetIdentifier = computed(() => (route.query.season as string) || (route.params.id as string))

const { data: overviewData, status, error: fetchError, refresh: refreshOverview } = await useAsyncData(
  `tournament-overview-${targetIdentifier.value}`,
  () => $fetch<{
    success: boolean;
    data: {
      tournament: Tournament;
      participants: Participant[];
      fixtures: Fixture[];
      standings: any[];
      sponsors: Sponsor[];
      socials: Social[];
      venues: Venue[];
    }
  }>(`/tournaments/${targetIdentifier.value}/overview`, {
    baseURL: runtimeConfig.public.API_BASE_URL as string,
  }),
  {
    watch: [targetIdentifier],
    lazy: false,
  }
)

// Normalize follower count: if linked to a competition, use perpetual competition followers
function normalizeFollowerCount(t: Tournament | null | undefined) {
  if (t) {
    if (t.competition?._count?.followers != null) {
      t.followerCount = t.competition._count.followers
    } else if (t.followerCount == null && t._count?.followers != null) {
      t.followerCount = t._count.followers
    }
  }
}

// Normalize the initially fetched tournament
normalizeFollowerCount(overviewData.value?.data?.tournament)

// Derived reactive state from the fetched data
const tournament = computed(() => overviewData.value?.data?.tournament || null)
const fixtures = ref<Fixture[]>(overviewData.value?.data?.fixtures || [])
const standings = ref<Standing[]>(overviewData.value?.data?.standings as Standing[] || [])
const participants = ref<Participant[]>(overviewData.value?.data?.participants || [])
const sponsors = ref<Sponsor[]>(overviewData.value?.data?.sponsors || [])
const socials = ref<Social[]>(overviewData.value?.data?.socials || [])
const venues = ref<Venue[]>(overviewData.value?.data?.venues || [])
const loading = computed(() => status.value === 'pending')
const error = ref<string | null>(fetchError.value ? extractErrorMessage(fetchError.value) : (overviewData.value?.data ? null : 'Tournament not found'))

// Sync refs when overviewData refreshes (e.g. client-side navigation)
watch(overviewData, (newData) => {
  if (newData?.data) {
    normalizeFollowerCount(newData.data.tournament)
    fixtures.value = newData.data.fixtures || []
    standings.value = (newData.data.standings as Standing[]) || []
    participants.value = newData.data.participants || []
    sponsors.value = newData.data.sponsors || []
    socials.value = newData.data.socials || []
    venues.value = newData.data.venues || []
  }
})

// Load player stats after mount (client-only, not needed for SEO)
onMounted(() => {
  if (tournament.value?.participantType === ParticipantType.TEAM) {
    loadPlayerStats()
  }
  scrollActiveTabIntoView()
})

// SEO — runs during SSR so meta tags are in the initial HTML
const seoTitle = computed(() => tournament.value ? `${tournament.value.name} | ParaScores` : 'Tournament | ParaScores')
const seoDescription = computed(() => tournament.value?.description || (tournament.value ? `Follow ${tournament.value.name} live scores, fixtures, standings, and brackets.` : 'Live tournament scores, fixtures, standings, and brackets on ParaScores.'))
const seoImage = computed(() => tournament.value?.bannerUrl || tournament.value?.logoUrl || 'https://www.parascores.com/og-image.png')

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
    {
      rel: 'canonical',
      href: computed(() => {
        const compSlug = tournament.value?.competition?.slug
        if (compSlug) {
          return `https://www.parascores.com/t/${compSlug}`
        }
        return `https://www.parascores.com/t/${tournamentId}`
      }),
    },
  ],
})

// Computed
const hasLiveFixtures = computed(() => fixtures.value.some(f => f.status === FixtureStatus.LIVE || f.status === FixtureStatus.NORMAL_TIME_ENDED || f.status === FixtureStatus.EXTRATIME))
const matchTimer = useMatchTimer(30000)

const isTeams = computed(() => tournament.value?.participantType === ParticipantType.TEAM)
const participantsTabName = computed(() => isTeams.value ? 'Teams' : 'Participants')

const isHybrid = computed(() => tournament.value?.type === TournamentType.HYBRID)
const showBracketTab = computed(() => {
  if (!tournament.value) return false
  return tournament.value.type === TournamentType.KNOCKOUT || tournament.value.type === TournamentType.HYBRID
})

const { isEsports } = useTournamentFeatures(tournament)
const showMatchHub = computed(() => isEsports.value && !!tournament.value?.chatEnabled)

const showPredictionsTab = computed(() => {
  const isFootball = (tournament.value?.sport || '').toLowerCase() === 'football'
  const predictionConfig = tournament.value?.scoringRules?.prediction
  return isFootball && predictionConfig?.enabled === true
})

// Visible tabs in exact visual order as rendered in the sticky header nav
const visibleTabs = computed<TabKey[]>(() => {
  const tabs: TabKey[] = ['info', 'fixtures']
  if (standings.value.length > 0) {
    tabs.push('standings')
  }
  if (showBracketTab.value) {
    tabs.push('bracket')
  }
  if (isTeams.value) {
    tabs.push('stats')
  }
  if (participants.value.length > 0) {
    tabs.push('participants')
  }
  if (showMatchHub.value) {
    tabs.push('chat')
  }
  if (showPredictionsTab.value) {
    tabs.push('predictions')
  }
  return tabs
})

const isDragging = ref(false)
const isAnimating = ref(false)
const dragDeltaX = ref(0)
let startClientX = 0
let startClientY = 0
let touchStartTime = 0
let isHorizontalGesture: boolean | null = null
let animationTimeout: any = null
const isTouchIgnored = ref(false)

const activeTabIndex = computed(() => {
  const idx = visibleTabs.value.indexOf(activeTab.value)
  return idx >= 0 ? idx : 0
})

const trackStyle = computed(() => {
  const baseOffset = -activeTabIndex.value * 100
  if (isDragging.value) {
    return {
      transform: `translateX(calc(${baseOffset}% + ${dragDeltaX.value}px))`,
      transition: 'none',
    }
  } else {
    return {
      transform: `translateX(${baseOffset}%)`,
      transition: 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1)',
    }
  }
})

const tabsNavRef = ref<HTMLElement | null>(null)
const contentSectionRef = ref<HTMLElement | null>(null)

function scrollActiveTabIntoView() {
  if (typeof window === 'undefined') return
  nextTick(() => {
    const el = document.getElementById(`tab-btn-${activeTab.value}`)
    if (el) {
      el.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      })
    }
  })
}

function switchTab(tab: TabKey) {
  if (activeTab.value === tab) return
  isAnimating.value = true
  activeTab.value = tab
  clearTimeout(animationTimeout)
  animationTimeout = setTimeout(() => {
    isAnimating.value = false
  }, 330)
}

function goToNextTab() {
  const list = visibleTabs.value
  const currIdx = list.indexOf(activeTab.value)
  if (currIdx !== -1 && currIdx < list.length - 1) {
    const next = list[currIdx + 1]
    if (next) {
      switchTab(next)
      return true
    }
  }
  return false
}

function goToPrevTab() {
  const list = visibleTabs.value
  const currIdx = list.indexOf(activeTab.value)
  if (currIdx > 0) {
    const prev = list[currIdx - 1]
    if (prev) {
      switchTab(prev)
      return true
    }
  }
  return false
}

// Mouse drag-to-scroll on tab bar
let isNavDragging = false
let navStartX = 0
let navScrollLeft = 0
let navHasMoved = false

function onNavMouseDown(e: MouseEvent) {
  const nav = tabsNavRef.value
  if (!nav) return
  isNavDragging = true
  navHasMoved = false
  navStartX = e.pageX - nav.getBoundingClientRect().left
  navScrollLeft = nav.scrollLeft
}

function onNavMouseMove(e: MouseEvent) {
  if (!isNavDragging) return
  const nav = tabsNavRef.value
  if (!nav) return
  const currentX = e.pageX - nav.getBoundingClientRect().left
  const delta = currentX - navStartX
  if (Math.abs(delta) > 5) {
    navHasMoved = true
  }
  nav.scrollLeft = navScrollLeft - delta
}

function onNavMouseUp() {
  isNavDragging = false
  setTimeout(() => {
    navHasMoved = false
  }, 50)
}

function onNavMouseLeave() {
  isNavDragging = false
  setTimeout(() => {
    navHasMoved = false
  }, 50)
}

function handleTabClick(tab: TabKey) {
  if (navHasMoved) {
    return
  }
  switchTab(tab)
}

function isInsideScrollableHorizontal(el: Element | null): boolean {
  if (typeof window === 'undefined' || !el) return false
  let curr: Element | null = el
  while (curr && curr !== contentSectionRef.value && curr !== document.body) {
    if (curr instanceof HTMLInputElement && curr.type === 'range') {
      return true
    }
    if (curr.scrollWidth > curr.clientWidth + 8) {
      const style = window.getComputedStyle(curr)
      if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
        return true
      }
    }
    curr = curr.parentElement
  }
  return false
}

function onTouchStart(e: TouchEvent) {
  const touch = e.touches[0]
  if (!touch) return

  const target = e.target as Element | null
  if (isInsideScrollableHorizontal(target)) {
    isTouchIgnored.value = true
    return
  }

  isTouchIgnored.value = false
  startClientX = touch.clientX
  startClientY = touch.clientY
  touchStartTime = Date.now()
  dragDeltaX.value = 0
  isHorizontalGesture = null
}

function onTouchMove(e: TouchEvent) {
  if (isTouchIgnored.value) return
  const touch = e.touches[0]
  if (!touch) return

  const dx = touch.clientX - startClientX
  const dy = touch.clientY - startClientY

  if (isHorizontalGesture === null) {
    if (Math.abs(dx) > 7 || Math.abs(dy) > 7) {
      if (Math.abs(dx) > Math.abs(dy) * 1.2) {
        isHorizontalGesture = true
        isDragging.value = true
      } else {
        isHorizontalGesture = false
      }
    }
  }

  if (isHorizontalGesture === true) {
    // Edge resistance damping
    if (activeTabIndex.value === 0 && dx > 0) {
      dragDeltaX.value = dx * 0.32
    } else if (activeTabIndex.value === visibleTabs.value.length - 1 && dx < 0) {
      dragDeltaX.value = dx * 0.32
    } else {
      dragDeltaX.value = dx
    }
  }
}

function onTouchEnd() {
  if (isTouchIgnored.value || !isHorizontalGesture) {
    isDragging.value = false
    dragDeltaX.value = 0
    isHorizontalGesture = null
    return
  }

  const duration = Date.now() - touchStartTime
  const velocity = Math.abs(dragDeltaX.value) / Math.max(duration, 1)
  const isFlick = velocity > 0.4 && Math.abs(dragDeltaX.value) > 25
  const isThreshold = Math.abs(dragDeltaX.value) > 55

  if ((isThreshold || isFlick) && dragDeltaX.value < 0) {
    // Swipe left -> next tab
    if (activeTabIndex.value < visibleTabs.value.length - 1) {
      const nextTab = visibleTabs.value[activeTabIndex.value + 1]
      if (nextTab) {
        switchTab(nextTab)
      }
    }
  } else if ((isThreshold || isFlick) && dragDeltaX.value > 0) {
    // Swipe right -> prev tab
    if (activeTabIndex.value > 0) {
      const prevTab = visibleTabs.value[activeTabIndex.value - 1]
      if (prevTab) {
        switchTab(prevTab)
      }
    }
  }

  dragDeltaX.value = 0
  isDragging.value = false
  isAnimating.value = true
  clearTimeout(animationTimeout)
  animationTimeout = setTimeout(() => {
    isAnimating.value = false
  }, 330)
  isHorizontalGesture = null
}

function getSeasonFallbackYear(t: { start_date?: string | null; end_date?: string | null }): string {
  if (!t.start_date) return new Date().getFullYear().toString()
  const startYear = new Date(t.start_date).getFullYear()
  if (t.end_date) {
    const endYear = new Date(t.end_date).getFullYear()
    if (endYear > startYear) {
      return `${startYear}/${endYear}`
    }
  }
  return `${startYear}`
}

const seasonLabel = computed(() => {
  if (tournament.value?.seasonName) {
    return tournament.value.seasonName
  }
  return getSeasonFallbackYear(tournament.value || {})
})

function switchSeason(s: { id: string; customName?: string | null }) {
  const compSlug = tournament.value?.competition?.slug
  if (compSlug && route.params.id === compSlug) {
    router.push({
      query: {
        ...route.query,
        season: s.customName || s.id,
      },
    })
  } else {
    navigateTo(toTournament(s))
  }
}

const seasonMenuItems = computed(() => {
  const list = tournament.value?.seasons || []
  if (list.length <= 1) return []

  return [
    list.map((s) => {
      const isCurrent = s.id === tournament.value?.id
      const baseLabel = s.seasonName || getSeasonFallbackYear(s)
      const label = s.isCurrentSeason ? `${baseLabel} (Current)` : baseLabel
      return {
        label,
        icon: isCurrent ? 'i-heroicons-check' : undefined,
        active: isCurrent,
        onSelect: () => {
          if (!isCurrent) {
            switchSeason(s)
          }
        },
      }
    }),
  ]
})

const shareTournament = async () => {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: tournament.value?.name,
        url: window.location.href,
      })
      return
    } catch {}
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(window.location.href)
    toast.add({ title: 'Link copied', description: 'Tournament link copied to clipboard', color: 'success' })
  }
}

// Validate active tab to prevent forced routing to unavailable tabs
watchEffect(() => {
  if (!tournament.value || loading.value) return
  
  const validTabs = ['info', 'fixtures', 'standings', 'bracket', 'participants', 'stats', 'chat', 'predictions']
  if (!validTabs.includes(activeTab.value)) {
    activeTab.value = 'info'
  }

  if (activeTab.value === 'bracket' && !showBracketTab.value) activeTab.value = 'info'
  else if (activeTab.value === 'standings' && standings.value.length === 0) activeTab.value = 'info'
  else if (activeTab.value === 'participants' && participants.value.length === 0) activeTab.value = 'info'
  else if (activeTab.value === 'stats' && !isTeams.value) activeTab.value = 'info'
  else if (activeTab.value === 'chat' && !showMatchHub.value) activeTab.value = 'info'
  else if (activeTab.value === 'predictions' && !showPredictionsTab.value) activeTab.value = 'info'
})

// Chat: the viewer posts as their confirmed participant identity (organizers post from manage)
const viewerParticipant = computed(() => {
  const uid = authStore.user?.id
  if (!uid) return null
  return participants.value.find((p) => p.user_id === uid && p.status === ParticipantStatus.CONFIRMED) ?? null
})

// Mentionable room members (confirmed participants) with profile links
const chatMembers = computed(() =>
  participants.value
    .filter((p) => p.status === ParticipantStatus.CONFIRMED)
    .map((p) => ({
      id: p.id,
      name: p.customName ?? 'Player',
      teamName: (p as any).team?.name ?? null,
      href: p.team_id
        ? `/team/${p.team_id}`
        : p.players?.[0]?.id
          ? `/player/${p.players[0].id}`
          : null,
    })),
)

// Follow Feature
const isFollowing = ref(false)
const togglingFollow = ref(false)

function notificationsEnabled(): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  return Notification.permission === 'granted' && localStorage.getItem('parascores_notifications_enabled') === 'true'
}

// Initialize follow state once auth is ready
watch([() => authStore.isAuthenticated, () => tournament.value?.id], async ([isAuth, tourneyId]) => {
  if (isAuth && tourneyId) {
    const compId = tournament.value?.competition_id || tournament.value?.competition?.id
    if (compId) {
      isFollowing.value = await tournamentStore.checkCompetitionFollowStatus(compId)
    } else {
      if (tournamentStore.followedTournaments.length > 0) {
        isFollowing.value = tournamentStore.followedTournaments.some(t => t.id === tourneyId || t.customName === tourneyId)
      } else {
        await tournamentStore.fetchFollowedTournaments()
        isFollowing.value = tournamentStore.followedTournaments.some(t => t.id === tourneyId || t.customName === tourneyId)
      }
    }
  } else {
    isFollowing.value = false
  }
}, { immediate: true })

async function toggleFollow() {
  if (!authStore.isAuthenticated) {
    toast.add({ title: 'Login Required', description: 'Please login to follow tournaments', color: 'error' })
    await navigateTo('/login')
    return
  }
  
  const wasFollowing = isFollowing.value
  isFollowing.value = !wasFollowing
  togglingFollow.value = true
  try {
    const compId = tournament.value?.competition_id || tournament.value?.competition?.id
    if (wasFollowing) {
      if (compId) {
        await tournamentStore.unfollowCompetition(compId)
      } else {
        await tournamentStore.unfollowTournament(tournament.value?.id || tournamentId)
      }
      if (tournament.value && tournament.value.followerCount != null && tournament.value.followerCount > 0) {
        tournament.value.followerCount--
      }
      toast.add({ title: 'Unfollowed', description: 'You have unfollowed this tournament.', color: 'neutral' })
    } else {
      if (compId) {
        await tournamentStore.followCompetition(compId)
      } else {
        await tournamentStore.followTournament(tournament.value?.id || tournamentId)
      }
      if (tournament.value) {
        tournament.value.followerCount = (tournament.value.followerCount ?? 0) + 1
      }
      toast.add({ title: 'Followed', description: 'You are now following this tournament!', color: 'success' })
      if (!notificationsEnabled()) {
        toast.add({
          title: 'Notifications Off',
          description: 'Turn on notifications to get live match alerts for this tournament.',
          color: 'warning',
          actions: [{ label: 'Enable', onClick: () => { navigateTo('/following') } }]
        })
      }
    }
  } catch (err: any) {
    isFollowing.value = wasFollowing
    handleError(err, { title: 'Error', report: true })
  } finally {
    togglingFollow.value = false
  }
}

// Fixtures grouped by round
const legFilter = ref<'ALL' | '1' | '2'>('ALL')

const filteredFixtures = computed(() => {
  if (legFilter.value === 'ALL') return fixtures.value
  return fixtures.value.filter(f => {
    if (tournament.value?.twoLegsKnockout) {
      if (legFilter.value === '1') return !f.roundName?.toLowerCase().includes('leg 2')
      if (legFilter.value === '2') return !f.roundName?.toLowerCase().includes('leg 1')
    }
    return true
  })
})

const groupStageFixtures = computed(() => filteredFixtures.value.filter(f => f.stage === FixtureStage.GROUP_STAGE))
const knockoutFixtures = computed(() => filteredFixtures.value.filter(f => f.stage === FixtureStage.KNOCKOUT))

const uniqueVenues = computed(() => {
  // Priority 1: Use the dedicated venues list from the API if available
  if (venues.value && venues.value.length > 0) {
    return venues.value.map(v => v.name).sort()
  }
  
  // Priority 2: Fallback to deriving from fixture data (legacy or just-in-case)
  const derived = fixtures.value
    .map(f => f.venue)
    .filter((v): v is string => !!v && v.trim() !== '')
  return [...new Set(derived)].sort()
})

function groupByRound(list: Fixture[]) {
  const grouped: Record<string, { name: string; fixtures: Fixture[] }> = {}
  for (const fixture of list) {
    const round = fixture.round || 1
    let baseName = (fixture.roundName || `Round ${round}`).replace(/\s*([-–—]\s*)?Leg\s*\d+\s*$/i, '').trim()
    baseName = baseName.replace(/^Group\s+Stage\s*-\s*/i, '')
    const name = baseName
    // Use composite key so fixtures with different roundNames in the same round get separate groups
    const key = `${round}::${name}`
    if (!grouped[key]) {
      grouped[key] = { name, fixtures: [] }
    }
    grouped[key].fixtures.push(fixture)
  }
  // Sort fixtures within each group by date and time
  for (const key in grouped) {
    const group = grouped[key]
    if (!group) continue
    group.fixtures.sort((a, b) => {
      if (a.startTime && b.startTime) {
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      }
      if (a.startTime) return -1
      if (b.startTime) return 1
      return (a.matchNumber || 0) - (b.matchNumber || 0)
    })
  }
  return grouped
}

const fixturesByRound = computed(() => {
  if (isHybrid.value) return groupByRound(groupStageFixtures.value)
  return groupByRound(filteredFixtures.value)
})
const sortedRounds = computed(() => Object.keys(fixturesByRound.value).sort((a, b) => {
  const aNum = parseInt(a.split('::')[0]!)
  const bNum = parseInt(b.split('::')[0]!)
  if (aNum !== bNum) return aNum - bNum
  // Same round: put Final last so Third Place comes first
  const aName = a.split('::')[1] || ''
  const bName = b.split('::')[1] || ''
  if (aName.toLowerCase().includes('final') && !aName.toLowerCase().includes('third')) return 1
  if (bName.toLowerCase().includes('final') && !bName.toLowerCase().includes('third')) return -1
  return 0
}))

const knockoutByRound = computed(() => groupByRound(knockoutFixtures.value))
const knockoutRounds = computed(() => Object.keys(knockoutByRound.value).sort((a, b) => {
  const aNum = parseInt(a.split('::')[0]!)
  const bNum = parseInt(b.split('::')[0]!)
  if (aNum !== bNum) return aNum - bNum
  const aName = a.split('::')[1] || ''
  const bName = b.split('::')[1] || ''
  if (aName.toLowerCase().includes('final') && !aName.toLowerCase().includes('third')) return 1
  if (bName.toLowerCase().includes('final') && !bName.toLowerCase().includes('third')) return -1
  return 0
}))

// --- Modern Fixtures Layout (FotMob / By-Round Style) ---
const fixturesViewMode = ref<'by-round' | 'all'>('by-round')

const viewModeMenuItems = computed(() => [
  [
    {
      label: 'By round',
      icon: fixturesViewMode.value === 'by-round' ? 'i-heroicons-check' : undefined,
      onSelect: () => {
        fixturesViewMode.value = 'by-round'
      },
    },
    {
      label: 'All rounds',
      icon: fixturesViewMode.value === 'all' ? 'i-heroicons-check' : undefined,
      onSelect: () => {
        fixturesViewMode.value = 'all'
      },
    },
  ],
])

interface FixtureRoundItem {
  key: string
  name: string
  stage?: string
  fixtures: Fixture[]
}

const allRoundsList = computed<FixtureRoundItem[]>(() => {
  const list: FixtureRoundItem[] = []

  if (isHybrid.value) {
    // 1. Group stage rounds
    for (const rKey of sortedRounds.value) {
      const g = fixturesByRound.value[rKey]
      if (g && g.fixtures.length > 0) {
        list.push({
          key: `gs::${rKey}`,
          name: g.name,
          stage: FixtureStage.GROUP_STAGE,
          fixtures: g.fixtures,
        })
      }
    }
    // 2. Knockout stage rounds
    for (const rKey of knockoutRounds.value) {
      const g = knockoutByRound.value[rKey]
      if (g && g.fixtures.length > 0) {
        list.push({
          key: `ko::${rKey}`,
          name: g.name,
          stage: FixtureStage.KNOCKOUT,
          fixtures: g.fixtures,
        })
      }
    }
  } else if (tournament.value?.type === TournamentType.KNOCKOUT) {
    for (const rKey of sortedRounds.value) {
      const g = fixturesByRound.value[rKey]
      if (g && g.fixtures.length > 0) {
        list.push({
          key: `ko::${rKey}`,
          name: g.name,
          stage: FixtureStage.KNOCKOUT,
          fixtures: g.fixtures,
        })
      }
    }
  } else {
    for (const rKey of sortedRounds.value) {
      const g = fixturesByRound.value[rKey]
      if (g && g.fixtures.length > 0) {
        list.push({
          key: `rnd::${rKey}`,
          name: g.name,
          stage: FixtureStage.GROUP_STAGE,
          fixtures: g.fixtures,
        })
      }
    }
  }

  return list
})

const selectedRoundKey = ref<string>('')
const userHasManuallySelectedRound = ref(false)

watch(
  allRoundsList,
  (rounds) => {
    if (!rounds.length) {
      selectedRoundKey.value = ''
      return
    }

    if (userHasManuallySelectedRound.value && selectedRoundKey.value && rounds.some(r => r.key === selectedRoundKey.value)) {
      return
    }

    // Auto-detect current active round:
    // 1. Check if any round has live matches
    const liveRound = rounds.find(r => r.fixtures.some(f =>
      f.status === FixtureStatus.LIVE ||
      f.status === FixtureStatus.NORMAL_TIME_ENDED ||
      f.status === FixtureStatus.EXTRATIME
    ))
    if (liveRound) {
      selectedRoundKey.value = liveRound.key
      return
    }

    // 2. Find first round that has uncompleted matches (SCHEDULED)
    const activeRound = rounds.find(r => r.fixtures.some(f =>
      f.status !== FixtureStatus.COMPLETED && f.status !== FixtureStatus.CANCELLED
    ))
    if (activeRound) {
      selectedRoundKey.value = activeRound.key
      return
    }

    // 3. Fallback to latest round or first round
    selectedRoundKey.value = rounds[rounds.length - 1]?.key || rounds[0]!.key
  },
  { immediate: true },
)

const currentRoundIndex = computed(() => {
  return allRoundsList.value.findIndex(r => r.key === selectedRoundKey.value)
})

const currentRound = computed(() => {
  if (currentRoundIndex.value >= 0) {
    return allRoundsList.value[currentRoundIndex.value]
  }
  return allRoundsList.value[0] || null
})

const isPrevRoundDisabled = computed(() => currentRoundIndex.value <= 0)
const isNextRoundDisabled = computed(() =>
  currentRoundIndex.value === -1 || currentRoundIndex.value >= allRoundsList.value.length - 1
)

function goToPrevRound() {
  if (isPrevRoundDisabled.value) return
  const prev = allRoundsList.value[currentRoundIndex.value - 1]
  if (prev) {
    selectedRoundKey.value = prev.key
    userHasManuallySelectedRound.value = true
  }
}

function goToNextRound() {
  if (isNextRoundDisabled.value) return
  const next = allRoundsList.value[currentRoundIndex.value + 1]
  if (next) {
    selectedRoundKey.value = next.key
    userHasManuallySelectedRound.value = true
  }
}

const roundDropdownItems = computed(() => {
  if (allRoundsList.value.length === 0) return []

  if (isHybrid.value) {
    const gs = allRoundsList.value.filter(r => r.stage === FixtureStage.GROUP_STAGE)
    const ko = allRoundsList.value.filter(r => r.stage === FixtureStage.KNOCKOUT)

    const sections: any[] = []
    if (gs.length > 0) {
      sections.push(
        gs.map(r => ({
          label: r.name,
          icon: selectedRoundKey.value === r.key ? 'i-heroicons-check' : undefined,
          onSelect: () => {
            selectedRoundKey.value = r.key
            userHasManuallySelectedRound.value = true
          },
        }))
      )
    }
    if (ko.length > 0) {
      sections.push(
        ko.map(r => ({
          label: r.name,
          icon: selectedRoundKey.value === r.key ? 'i-heroicons-check' : undefined,
          onSelect: () => {
            selectedRoundKey.value = r.key
            userHasManuallySelectedRound.value = true
          },
        }))
      )
    }
    return sections
  }

  return [
    allRoundsList.value.map(r => ({
      label: r.name,
      icon: selectedRoundKey.value === r.key ? 'i-heroicons-check' : undefined,
      onSelect: () => {
        selectedRoundKey.value = r.key
        userHasManuallySelectedRound.value = true
      },
    })),
  ]
})

function formatFixtureDayHeader(dateStr?: string | null): string {
  if (!dateStr) return 'Today'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return 'Today'

  const today = new Date()
  const todayStr = today.toDateString()
  const dStr = d.toDateString()
  if (dStr === todayStr) return 'Today'

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (dStr === yesterday.toDateString()) return 'Yesterday'

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (dStr === tomorrow.toDateString()) return 'Tomorrow'

  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

interface FixtureDateGroup {
  dateKey: string
  dateLabel: string
  fixtures: Fixture[]
}

function getRoundDateGroups(roundFixtures: Fixture[]): FixtureDateGroup[] {
  if (!roundFixtures || roundFixtures.length === 0) return []

  const hasDates = roundFixtures.some(f => f.startTime)
  if (!hasDates) {
    return [{
      dateKey: 'today',
      dateLabel: 'Today',
      fixtures: roundFixtures,
    }]
  }

  const map = new Map<string, { label: string; fixtures: Fixture[] }>()

  for (const f of roundFixtures) {
    let key = 'undated'
    let label = 'Matches'
    if (f.startTime) {
      const d = new Date(f.startTime)
      if (!isNaN(d.getTime())) {
        key = d.toISOString().split('T')[0]!
        label = formatFixtureDayHeader(f.startTime)
      }
    }
    if (!map.has(key)) {
      map.set(key, { label, fixtures: [] })
    }
    map.get(key)!.fixtures.push(f)
  }

  const sortedKeys = Array.from(map.keys()).sort((a, b) => {
    if (a === 'undated') return 1
    if (b === 'undated') return -1
    return a.localeCompare(b)
  })

  return sortedKeys.map(k => ({
    dateKey: k,
    dateLabel: map.get(k)!.label,
    fixtures: map.get(k)!.fixtures,
  }))
}

const currentRoundDateGroups = computed(() => {
  if (!currentRound.value) return []
  return getRoundDateGroups(currentRound.value.fixtures)
})

// Standings grouped by group
const standingsByGroup = computed(() => {
  const grouped: Record<string, Standing[]> = {}
  standings.value.forEach(s => {
    const group = s.group || 'default'
    if (!grouped[group]) grouped[group] = []
    grouped[group].push(s)
  })
  Object.keys(grouped).forEach(key => {
    grouped[key]!.sort((a, b) => (a.position || 0) - (b.position || 0))
  })
  return grouped
})

// Bracket — pass raw fixtures by round and let KnockoutBracket handle all grouping
const bracketFixtures = computed(() => {
  if (isHybrid.value) return knockoutFixtures.value
  return fixtures.value
})

const bracketFixturesByRound = computed(() => {
  const grouped: Record<number, Fixture[]> = {}
  for (const f of bracketFixtures.value) {
    const r = f.round || 1
    if (!grouped[r]) grouped[r] = []
    grouped[r].push(f)
  }
  Object.values(grouped).forEach(arr => arr.sort((a, b) => a.matchNumber - b.matchNumber))
  return grouped
})

const bracketRounds = computed(() =>
  Object.keys(bracketFixturesByRound.value).map(Number).sort((a, b) => a - b)
)

// Collapsible rounds
const collapsedRounds = ref<Set<string>>(new Set())
function toggleRound(round: string) {
  const s = new Set(collapsedRounds.value)
  if (s.has(round)) s.delete(round)
  else s.add(round)
  collapsedRounds.value = s
}

// Winner Indication
const winnerId = computed(() => {
  if (!fixtures.value.length) return null
  if (fixtures.value.some(f => f.status === FixtureStatus.LIVE || f.status === FixtureStatus.NORMAL_TIME_ENDED || f.status === FixtureStatus.EXTRATIME)) return null
  
  if (tournament.value?.type === TournamentType.KNOCKOUT || tournament.value?.type === TournamentType.HYBRID) {
    const koFixtures = fixtures.value.filter(f => f.stage === FixtureStage.KNOCKOUT)
    if (!koFixtures.length) return null
    const maxRound = Math.max(...koFixtures.map(f => f.round))
    const finalRoundFixtures = koFixtures.filter(f => f.round === maxRound)

    // Identify the final match, excluding the third-place play-off if present
    const finalMatch = finalRoundFixtures.find(f => {
      const name = (f.roundName || '').toLowerCase()
      return name.includes('final') && !name.includes('third') && !name.includes('3rd')
    }) || finalRoundFixtures.sort((a, b) => a.matchNumber - b.matchNumber)[0]
    
    if (finalMatch && finalMatch.status === FixtureStatus.COMPLETED) {
      const hs = finalMatch.homeScore ?? 0
      const as = finalMatch.awayScore ?? 0
      if (hs > as) return finalMatch.homeTeamId
      if (as > hs) return finalMatch.awayTeamId
      const hp = finalMatch.homePenaltyScore ?? 0
      const ap = finalMatch.awayPenaltyScore ?? 0
      if (hp > ap) return finalMatch.homeTeamId
      if (ap > hp) return finalMatch.awayTeamId
    }
  } else if (standings.value.length > 0 && fixtures.value.every(f => f.status === FixtureStatus.COMPLETED)) {
    const top = [...standings.value].sort((a, b) => (a.position || 999) - (b.position || 999))[0]
    return top?.participant_id
  }
  return null
})

const winnerParticipant = computed(() => {
  if (!winnerId.value) return null
  return participants.value.find(p => p.id === winnerId.value)
})

// Helpers
function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function formatTime(dateStr?: string | null) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}
function formatTime24(dateStr?: string | null) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}
function formatDateTimeShort(dateStr?: string | null) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ', ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}
function formatType(type: string) {
  const map: Record<string, string> = {
    KNOCKOUT: 'Knockout', ROUND_ROBIN: 'Round Robin', GROUP: 'Group Stage',
    HYBRID: 'Hybrid', FRIENDLY: 'Friendly'
  }
  return map[type] || type
}
function formatCount(count: number) {
  if (count >= 1000000) return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (count >= 1000) return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return count.toString()
}
function getTypeBadgeClasses(type: string) {
  switch (type) {
    case 'KNOCKOUT': return 'bg-red-500/20 text-red-400 border-red-500/30'
    case 'ROUND_ROBIN': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    case 'GROUP': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    case 'HYBRID': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    case 'FRIENDLY': return 'bg-green-500/20 text-green-400 border-green-500/30'
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }
}
function getRoundDisplayName(roundIndex: number, totalRounds: number, roundName?: string | null) {
  if (roundName) {
    const cleanName = roundName.replace(/^Group\s+Stage\s*-\s*/i, '')
    return cleanName.replace(/\s*([-–—]\s*)?Leg\s*\d+\s*$/i, '').trim()
  }
  const remaining = totalRounds - roundIndex
  switch (remaining) {
    case 1: return 'Final'
    case 2: return 'Semi-Final'
    case 3: return 'Quarter-Final'
    case 4: return 'Round of 16'
    default: return `Round ${roundIndex + 1}`
  }
}

function getRoundName(fixture: Fixture) {
  let name = fixture.roundName || `Round ${fixture.round}`
  name = name.replace(/^Group\s+Stage\s*-\s*/i, '')
  const legMatch = name.match(/Leg\s*(\d+)/i)
  if (legMatch) {
    const baseName = name.replace(/\s*([-–—]\s*)?Leg\s*\d+\s*$/i, '').trim()
    return `${baseName} (Leg ${legMatch[1]})`
  }
  return name
}

function getMatchAggregate(match: Fixture) {
  const isLive = match.status === FixtureStatus.LIVE || match.status === FixtureStatus.NORMAL_TIME_ENDED || match.status === FixtureStatus.EXTRATIME
  if (match.status !== FixtureStatus.COMPLETED && !isLive) return null
  if (!match.roundName || !/leg\s*2/i.test(match.roundName)) return null

  // Find Leg 1
  const leg1 = fixtures.value.find(f => 
    f.id !== match.id &&
    f.round === match.round &&
    f.stage === match.stage &&
    /leg\s*1/i.test(f.roundName || '') &&
    ((f.homeTeamId === match.homeTeamId && f.awayTeamId === match.awayTeamId) ||
     (f.homeTeamId === match.awayTeamId && f.awayTeamId === match.homeTeamId))
  )

  const leg1IsLive = leg1 && (leg1.status === FixtureStatus.LIVE || leg1.status === FixtureStatus.NORMAL_TIME_ENDED || leg1.status === FixtureStatus.EXTRATIME)
  if (leg1 && (leg1.status === FixtureStatus.COMPLETED || leg1IsLive)) {
    const leg1HomeScore = leg1.homeTeamId === match.homeTeamId ? (leg1.homeScore ?? 0) : (leg1.awayScore ?? 0)
    const leg1AwayScore = leg1.awayTeamId === match.awayTeamId ? (leg1.awayScore ?? 0) : (leg1.homeScore ?? 0)
    
    const aggHome = (match.homeScore ?? 0) + leg1HomeScore
    const aggAway = (match.awayScore ?? 0) + leg1AwayScore
    
    return `${aggHome}-${aggAway} agg`
  }
  return null
}

function getLivestreamInfo(fixture: Fixture) {
  if (!fixture.livestreamUrl) return null
  const platform = fixture.livestreamPlatform || detectLivestreamPlatform(fixture.livestreamUrl)
  return getLivestreamPlatformInfo(platform)
}

function getTeamClass(matchup: any, isHome: boolean) {
  if (matchup.status !== FixtureStatus.COMPLETED) return 'text-gray-800 group-hover:text-gray-900 dark:text-gray-200 dark:group-hover:text-white'
  const hs = matchup.homeScore ?? 0
  const as = matchup.awayScore ?? 0
  
  let isWinner = false
  let isLoser = false
  
  if (hs === as) {
    const hp = matchup.homePenaltyScore ?? 0
    const ap = matchup.awayPenaltyScore ?? 0
    if (hp === ap) return 'font-medium text-gray-500' // True draw
    isWinner = isHome ? hp > ap : ap > hp
    isLoser = isHome ? hp < ap : ap > hp
  } else {
    isWinner = isHome ? hs > as : as > hs
    isLoser = isHome ? hs < as : as > hs
  }
  
  if (isWinner) return 'font-bold text-gray-900 dark:text-white'
  if (isLoser) return 'font-medium text-gray-500'
  return 'font-medium text-gray-500'
}
function getScoreClass(matchup: any, isHome: boolean) {
  if (matchup.status !== FixtureStatus.COMPLETED) return 'text-gray-900 dark:text-white'
  const hs = matchup.homeScore ?? 0
  const as = matchup.awayScore ?? 0
  
  let isWinner = false
  
  if (hs === as) {
    const hp = matchup.homePenaltyScore ?? 0
    const ap = matchup.awayPenaltyScore ?? 0
    if (hp !== ap) {
      isWinner = isHome ? hp > ap : ap > hp
    }
  } else {
    isWinner = isHome ? hs > as : as > hs
  }
  
  return isWinner ? 'font-bold text-gray-900 dark:text-white' : 'font-bold text-gray-500'
}

// Detect completed matches with no clear winner (tied with no decisive penalties)
function hasNoWinner(matchup: any): boolean {
  if (matchup.status !== FixtureStatus.COMPLETED) return false
  const homeScore = matchup.homeScore ?? 0
  const awayScore = matchup.awayScore ?? 0
  if (homeScore !== awayScore) return false
  // Scores are tied — check penalties
  const homePen = matchup.homePenaltyScore ?? 0
  const awayPen = matchup.awayPenaltyScore ?? 0
  return homePen === awayPen
}

function getTeamCards(fixture: any, isHome: boolean) {
  if (!fixture.matchEvents) return { yellow: 0, red: 0 }
  const teamId = isHome ? fixture.homeTeamId : fixture.awayTeamId
  if (!teamId) return { yellow: 0, red: 0 }
  
  let yellow = 0
  let red = 0
  for (const event of fixture.matchEvents) {
    if (event.participant_id === teamId) {
      if (event.type === 'YELLOW_CARD') yellow++
      if (event.type === 'RED_CARD') red++
    }
  }
  return { yellow, red }
}

</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center min-h-[60vh]">
      <div class="flex flex-col items-center gap-4">
        <div class="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <span class="text-sm text-gray-400">Loading tournament...</span>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex items-center justify-center min-h-[60vh]">
      <div class="text-center">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 class="text-lg font-semibold mb-2">Failed to load tournament</h3>
        <p class="text-sm text-gray-400 mb-4">{{ error }}</p>
        <NuxtLink :to="toMain('/explore')" class="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
          ← Back to Explore
        </NuxtLink>
      </div>
    </div>

    <!-- Content -->
    <div v-else-if="tournament">
      <!-- Redesigned Minimal Tournament Header (Light & Dark Mode) -->
      <section class="bg-white dark:bg-[#121212] border-b border-gray-200 dark:border-neutral-800 text-gray-900 dark:text-white transition-colors">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-3">
          <!-- Top Action Bar -->
          <div class="flex items-center justify-between gap-3">
            <!-- Left: Circular Action Buttons -->
            <div class="flex items-center gap-2">
              <button
                @click="router.back()"
                type="button"
                class="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800/90 dark:hover:bg-neutral-700 text-gray-700 dark:text-white flex items-center justify-center transition-colors border border-gray-200 dark:border-neutral-700/60 cursor-pointer shadow-sm"
                title="Back"
              >
                <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
              </button>

              <button
                v-if="hasLiveFixtures"
                @click="switchTab('fixtures')"
                type="button"
                class="w-9 h-9 rounded-full bg-rose-50 hover:bg-rose-100 dark:bg-neutral-800/90 dark:hover:bg-neutral-700 text-rose-600 dark:text-rose-400 flex items-center justify-center transition-colors border border-rose-200 dark:border-neutral-700/60 cursor-pointer shadow-sm relative"
                title="Live matches happening now"
              >
                <UIcon name="i-heroicons-tv" class="w-4 h-4" />
                <span class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                <span class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500"></span>
              </button>
              <button
                v-else
                @click="shareTournament"
                type="button"
                class="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800/90 dark:hover:bg-neutral-700 text-gray-700 dark:text-white flex items-center justify-center transition-colors border border-gray-200 dark:border-neutral-700/60 cursor-pointer shadow-sm"
                title="Share tournament"
              >
                <UIcon name="i-heroicons-share" class="w-4 h-4" />
              </button>
            </div>

            <!-- Right: Season Pill & Follow Button -->
            <div class="flex items-center gap-2 sm:gap-2.5">
              <!-- Season Pill / Dropdown Menu -->
              <UDropdownMenu
                v-if="seasonMenuItems.length > 0"
                :items="seasonMenuItems"
                :content="{ align: 'end', side: 'bottom', sideOffset: 6 }"
                :ui="{ content: 'min-w-[170px]' }"
              >
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800/90 dark:hover:bg-neutral-700 border border-gray-200 dark:border-neutral-700/70 text-xs font-semibold text-gray-800 dark:text-white transition-colors cursor-pointer shadow-sm"
                  title="Switch season"
                >
                  <span
                    v-if="tournament?.isCurrentSeason"
                    class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"
                    title="Active Season"
                  />
                  <span>{{ seasonLabel }}</span>
                  <UIcon name="i-heroicons-chevron-down" class="w-3.5 h-3.5 text-gray-500 dark:text-neutral-400" />
                </button>
              </UDropdownMenu>

              <div
                v-else
                class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gray-100 dark:bg-neutral-800/90 border border-gray-200 dark:border-neutral-700/70 text-xs font-semibold text-gray-800 dark:text-white select-none cursor-default"
              >
                <span
                  v-if="tournament?.isCurrentSeason"
                  class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"
                  title="Active Season"
                />
                <span>{{ seasonLabel }}</span>
              </div>

              <button
                type="button"
                @click="toggleFollow"
                :disabled="togglingFollow"
                class="px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer disabled:opacity-50 shadow-sm"
                :class="isFollowing
                  ? 'bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-200 dark:bg-neutral-800 dark:text-white dark:border-neutral-700 dark:hover:bg-neutral-700 flex items-center gap-1.5'
                  : 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200'"
              >
                <UIcon v-if="isFollowing" name="i-heroicons-check" class="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                <span>{{ isFollowing ? 'Following' : 'Follow' }}</span>
              </button>
            </div>
          </div>

          <!-- Tournament Identity Row -->
          <div class="flex items-center gap-3.5 sm:gap-4 pt-4 pb-2">
            <!-- Logo -->
            <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-gray-100 dark:bg-neutral-800/90 border border-gray-200 dark:border-neutral-700/60 shrink-0 flex items-center justify-center p-1.5 shadow-md">
              <img
                v-if="tournament.logoUrl"
                :src="tournament.logoUrl"
                :alt="tournament.name"
                class="w-full h-full object-contain"
              />
              <span v-else class="text-xl sm:text-2xl font-black text-gray-700 dark:text-white/80">
                {{ tournament.name.charAt(0).toUpperCase() }}
              </span>
            </div>

            <!-- Title & Subtitle -->
            <div class="min-w-0 flex-1">
              <h1 class="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight leading-snug truncate">
                {{ tournament.name }}
              </h1>
              <!-- Organization & Location Row -->
              <div class="mt-0.5 flex flex-wrap items-center gap-2 text-xs sm:text-sm font-medium text-gray-500 dark:text-neutral-400">
                <NuxtLink
                  v-if="tournament.organization"
                  :to="toMain(`/org/${tournament.organization.slug}`)"
                  class="inline-flex items-center gap-1.5 hover:text-gray-900 dark:hover:text-white transition-colors group"
                >
                  <img
                    v-if="tournament.organization.logoUrl"
                    :src="tournament.organization.logoUrl"
                    :alt="tournament.organization.name"
                    class="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                  />
                  <span class="group-hover:underline">{{ tournament.organization.name }}</span>
                  <UIcon
                    v-if="tournament.organization.isVerified"
                    name="i-heroicons-check-badge-solid"
                    class="w-3.5 h-3.5 text-emerald-500 shrink-0"
                    title="Verified Organization"
                  />
                </NuxtLink>
                <span v-else-if="tournament.location || tournament.sport">
                  {{ tournament.location || tournament.sport }}
                </span>
                <template v-if="tournament.organization && tournament.location">
                  <span class="text-gray-300 dark:text-neutral-600">•</span>
                  <span>{{ tournament.location }}</span>
                </template>
              </div>

              <!-- Winner Row (Moved under organization name) -->
              <div
                v-if="winnerParticipant"
                class="mt-1 flex items-center gap-1.5 text-xs sm:text-sm font-medium text-amber-600 dark:text-amber-400"
              >
                <UIcon name="i-heroicons-trophy" class="w-3.5 h-3.5 shrink-0" />
                <span>Winner: <strong class="font-semibold text-amber-700 dark:text-amber-300">{{ winnerParticipant.customName }}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Tabs Bar (Sticky) -->
      <section class="border-b sticky top-0 z-30 backdrop-blur-xl transition-colors border-gray-200 dark:border-neutral-800 bg-white/95 dark:bg-[#121212]/95">
        <div class="max-w-7xl mx-auto px-4 sm:px-6">
          <nav
            ref="tabsNavRef"
            class="flex items-center gap-6 overflow-x-auto hide-scrollbar whitespace-nowrap -mb-px select-none cursor-grab active:cursor-grabbing scroll-smooth"
            @mousedown="onNavMouseDown"
            @mousemove="onNavMouseMove"
            @mouseup="onNavMouseUp"
            @mouseleave="onNavMouseLeave"
          >
            <!-- Overview (formerly Info) -->
            <button
              id="tab-btn-info"
              @click="handleTabClick('info')"
              type="button"
              :class="[
                'py-3.5 text-sm transition-colors duration-150 cursor-pointer relative shrink-0',
                activeTab === 'info'
                  ? 'font-bold text-black dark:text-white'
                  : 'font-semibold text-black/70 hover:text-black dark:text-neutral-400 dark:hover:text-white'
              ]"
            >
              Overview
              <span v-if="activeTab === 'info'" class="absolute bottom-0 left-0 right-0 h-[2.5px] bg-emerald-500 dark:bg-[#00e676] rounded-full"></span>
            </button>

            <!-- Fixtures -->
            <button
              id="tab-btn-fixtures"
              @click="handleTabClick('fixtures')"
              type="button"
              :class="[
                'py-3.5 text-sm transition-colors duration-150 cursor-pointer relative flex items-center gap-1.5 shrink-0',
                activeTab === 'fixtures'
                  ? 'font-bold text-black dark:text-white'
                  : 'font-semibold text-black/70 hover:text-black dark:text-neutral-400 dark:hover:text-white'
              ]"
            >
              <span>Fixtures</span>
              <span
                v-if="fixtures.length"
                :class="[
                  'px-1.5 py-0.2 rounded-full text-[10px] font-semibold transition-colors',
                  activeTab === 'fixtures'
                    ? 'bg-gray-200 text-black dark:bg-white/20 dark:text-white font-bold'
                    : 'bg-gray-100 text-black/80 dark:bg-white/10 dark:text-neutral-400'
                ]"
              >{{ fixtures.length }}</span>
              <span v-if="activeTab === 'fixtures'" class="absolute bottom-0 left-0 right-0 h-[2.5px] bg-emerald-500 dark:bg-[#00e676] rounded-full"></span>
            </button>

            <!-- Table (formerly Standings) -->
            <button
              v-if="standings.length > 0"
              id="tab-btn-standings"
              @click="handleTabClick('standings')"
              type="button"
              :class="[
                'py-3.5 text-sm transition-colors duration-150 cursor-pointer relative shrink-0',
                activeTab === 'standings'
                  ? 'font-bold text-black dark:text-white'
                  : 'font-semibold text-black/70 hover:text-black dark:text-neutral-400 dark:hover:text-white'
              ]"
            >
              Table
              <span v-if="activeTab === 'standings'" class="absolute bottom-0 left-0 right-0 h-[2.5px] bg-emerald-500 dark:bg-[#00e676] rounded-full"></span>
            </button>

            <!-- Knockout (formerly Bracket) -->
            <button
              v-if="showBracketTab"
              id="tab-btn-bracket"
              @click="handleTabClick('bracket')"
              type="button"
              :class="[
                'py-3.5 text-sm transition-colors duration-150 cursor-pointer relative shrink-0',
                activeTab === 'bracket'
                  ? 'font-bold text-black dark:text-white'
                  : 'font-semibold text-black/70 hover:text-black dark:text-neutral-400 dark:hover:text-white'
              ]"
            >
              Knockout
              <span v-if="activeTab === 'bracket'" class="absolute bottom-0 left-0 right-0 h-[2.5px] bg-emerald-500 dark:bg-[#00e676] rounded-full"></span>
            </button>

            <!-- Player stats -->
            <button
              v-if="isTeams"
              id="tab-btn-stats"
              @click="handleTabClick('stats')"
              type="button"
              :class="[
                'py-3.5 text-sm transition-colors duration-150 cursor-pointer relative shrink-0',
                activeTab === 'stats'
                  ? 'font-bold text-black dark:text-white'
                  : 'font-semibold text-black/70 hover:text-black dark:text-neutral-400 dark:hover:text-white'
              ]"
            >
              Player stats
              <span v-if="activeTab === 'stats'" class="absolute bottom-0 left-0 right-0 h-[2.5px] bg-emerald-500 dark:bg-[#00e676] rounded-full"></span>
            </button>

            <!-- Teams -->
            <button
              v-if="participants.length > 0"
              id="tab-btn-participants"
              @click="handleTabClick('participants')"
              type="button"
              :class="[
                'py-3.5 text-sm transition-colors duration-150 cursor-pointer relative shrink-0',
                activeTab === 'participants'
                  ? 'font-bold text-black dark:text-white'
                  : 'font-semibold text-black/70 hover:text-black dark:text-neutral-400 dark:hover:text-white'
              ]"
            >
              {{ participantsTabName }}
              <span v-if="activeTab === 'participants'" class="absolute bottom-0 left-0 right-0 h-[2.5px] bg-emerald-500 dark:bg-[#00e676] rounded-full"></span>
            </button>

            <!-- Match Hub -->
            <button
              v-if="showMatchHub"
              id="tab-btn-chat"
              @click="handleTabClick('chat')"
              type="button"
              :class="[
                'py-3.5 text-sm transition-colors duration-150 cursor-pointer relative flex items-center gap-1.5 shrink-0',
                activeTab === 'chat'
                  ? 'font-bold text-black dark:text-white'
                  : 'font-semibold text-black/70 hover:text-black dark:text-neutral-400 dark:hover:text-white'
              ]"
            >
              <UIcon name="i-heroicons-bolt" class="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <span>Match Hub</span>
              <span v-if="activeTab === 'chat'" class="absolute bottom-0 left-0 right-0 h-[2.5px] bg-emerald-500 dark:bg-[#00e676] rounded-full"></span>
            </button>

            <!-- Predictions Tab -->
            <button
              v-if="showPredictionsTab"
              id="tab-btn-predictions"
              @click="handleTabClick('predictions')"
              type="button"
              :class="[
                'py-3.5 text-sm transition-colors duration-150 cursor-pointer relative flex items-center gap-1.5 shrink-0',
                activeTab === 'predictions'
                  ? 'font-bold text-black dark:text-white'
                  : 'font-semibold text-black/70 hover:text-black dark:text-neutral-400 dark:hover:text-white'
              ]"
            >
              <span>Predictions</span>
              <span v-if="activeTab === 'predictions'" class="absolute bottom-0 left-0 right-0 h-[2.5px] bg-emerald-500 dark:bg-[#00e676] rounded-full"></span>
            </button>
          </nav>
        </div>
      </section>

      <!-- Tab Content -->
      <section
        ref="contentSectionRef"
        class="max-w-7xl mx-auto px-4 py-8 relative min-h-[500px] touch-pan-y overflow-x-hidden"
        @touchstart.passive="onTouchStart"
        @touchmove.passive="onTouchMove"
        @touchend="onTouchEnd"
      >
        
        <div class="w-full overflow-hidden">
          <div
            class="flex w-full items-start will-change-transform"
            :style="trackStyle"
          >
            <!-- ====== OVERVIEW (INFO) TAB ====== -->
            <div
              class="w-full shrink-0 min-w-full"
              :class="activeTab === 'info' || isDragging || isAnimating ? 'h-auto overflow-visible' : 'h-0 overflow-hidden'"
            >
              <div class="flex flex-col gap-6">


            <!-- About Section (First) -->
            <div v-if="tournament.description || (socials && socials.length > 0)" class="border rounded-xl overflow-hidden bg-white border-gray-200 shadow-sm dark:bg-[#1a1a1a] dark:border-white/[0.06]">
              <div class="px-5 py-3.5 border-b transition-colors flex items-center justify-between border-gray-100 dark:border-white/[0.06]">
                <h3 class="text-sm font-bold text-gray-500">About</h3>
                
                <!-- Socials in Header -->
                <div v-if="socials && socials.length > 0" class="flex items-center gap-3">
                  <a
                    v-for="social in socials"
                    :key="social.id"
                    :href="social.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-gray-400 hover:text-emerald-400 transition-colors tooltip"
                    :title="social.handle || social.platform"
                  >
                    <SocialsTwitterIcon v-if="social.platform === 'twitter'" class="w-4 h-4" />
                    <SocialsInstagramIcon v-else-if="social.platform === 'instagram'" class="w-4 h-4" />
                    <SocialsWebIcon v-else-if="social.platform === 'website'" class="w-4 h-4" />
                    <UIcon v-else-if="social.platform === 'facebook'" name="i-simple-icons-facebook" class="w-4 h-4" />
                    <UIcon v-else-if="social.platform === 'youtube'" name="i-simple-icons-youtube" class="w-4 h-4" />
                    <UIcon v-else-if="social.platform === 'tiktok'" name="i-simple-icons-tiktok" class="w-4 h-4" />
                    <UIcon v-else-if="social.platform === 'discord'" name="i-simple-icons-discord" class="w-4 h-4" />
                    <UIcon v-else-if="social.platform === 'twitch'" name="i-simple-icons-twitch" class="w-4 h-4" />
                    <UIcon v-else name="i-heroicons-globe-alt" class="w-4 h-4" />
                  </a>
                </div>
              </div>
              <div v-if="tournament.description" class="p-5">
                <p class="text-sm leading-relaxed whitespace-pre-line text-gray-600 dark:text-gray-300">
                  {{ tournament.description }}
                </p>
              </div>
            </div>

            <div v-if="sponsors && sponsors.length > 0" class="border rounded-xl overflow-hidden mt-6 bg-white border-gray-200 shadow-sm dark:bg-[#1a1a1a] dark:border-white/[0.06]">
              <div class="px-5 py-3.5 border-b transition-colors flex items-center gap-2 border-gray-100 dark:border-white/[0.06]">
                <UIcon name="i-heroicons-building-office-2" class="w-4 h-4 text-gray-400" />
                <h3 class="text-sm font-bold text-gray-500">Sponsors</h3>
              </div>
              <div class="p-8 flex flex-wrap justify-center items-center gap-8 sm:gap-12 md:gap-16">
                <template v-for="sponsor in sponsors" :key="sponsor.id">
                  <button
                    class="group flex flex-col items-center justify-center transition-transform duration-300 cursor-pointer hover:scale-105"
                    @click="selectedSponsor = sponsor"
                  >
                    <div class="h-16 sm:h-20 lg:h-24 max-w-[160px] sm:max-w-[200px] flex items-center justify-center mb-0">
                      <img v-if="sponsor.logoUrl" :src="sponsor.logoUrl" :alt="sponsor.name" class="w-full h-full object-contain filter dark:brightness-90 dark:group-hover:brightness-100 transition-all" />
                      <span v-else class="text-xl font-bold text-gray-400">{{ sponsor.name }}</span>
                    </div>
                  </button>
                </template>
              </div>

              <!-- Sponsor Detail Modal -->
              <Teleport to="body">
                <Transition name="sponsor-modal">
                  <div
                    v-if="selectedSponsor"
                    class="fixed inset-0 z-[100] flex items-center justify-center px-4"
                    @click.self="selectedSponsor = null"
                  >
                    <!-- Backdrop -->
                    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="selectedSponsor = null" />

                    <!-- Card -->
                    <div
                      class="relative w-full max-w-sm rounded-2xl border p-6 shadow-2xl transition-all bg-white border-gray-200 dark:bg-[#1a1a1a] dark:border-white/10"
                    >
                      <!-- Close Button -->
                      <button
                        class="absolute top-3 right-3 p-1.5 rounded-lg transition-colors hover:bg-gray-100 text-gray-500 dark:hover:bg-white/10 dark:text-gray-400"
                        @click="selectedSponsor = null"
                      >
                        <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
                      </button>

                      <!-- Logo -->
                      <div class="flex justify-center mb-5">
                        <div
                          class="w-28 h-28 rounded-xl flex items-center justify-center overflow-hidden border bg-gray-50 border-gray-100 dark:bg-white/5 dark:border-white/10"
                        >
                          <img
                            v-if="selectedSponsor.logoUrl"
                            :src="selectedSponsor.logoUrl"
                            :alt="selectedSponsor.name"
                            class="w-full h-full object-contain p-3"
                          />
                          <span v-else class="text-3xl font-bold text-gray-400">
                            {{ selectedSponsor.name.charAt(0).toUpperCase() }}
                          </span>
                        </div>
                      </div>

                      <!-- Name -->
                      <h3
                        class="text-xl font-bold text-center mb-1 break-words overflow-hidden text-gray-900 dark:text-white"
                      >
                        {{ selectedSponsor.name }}
                      </h3>

                      <p class="text-xs text-center text-gray-500 mb-5">
                        {{ selectedSponsor.description || 'Tournament Sponsor' }}
                      </p>

                      <!-- Website Link -->
                      <a
                        v-if="selectedSponsor.websiteUrl"
                        :href="selectedSponsor.websiteUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                      >
                        <UIcon name="i-heroicons-globe-alt" class="w-4 h-4" />
                        Visit Website
                      </a>

                      <div
                        v-else
                        class="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium text-gray-400 bg-gray-50 dark:text-gray-500 dark:bg-white/5"
                      >
                        <UIcon name="i-heroicons-globe-alt" class="w-4 h-4" />
                        No website available
                      </div>
                    </div>
                  </div>
                </Transition>
              </Teleport>
            </div>

            <!-- Tournament Info (Last) -->
            <div class="border rounded-xl overflow-hidden mt-6 bg-white border-gray-200 shadow-sm dark:bg-[#1a1a1a] dark:border-white/[0.06]">
              <div class="px-5 py-3.5 border-b transition-colors border-gray-100 dark:border-white/[0.06]">
                <h3 class="text-sm font-bold text-gray-500">Tournament Info</h3>
              </div>
              <div class="divide-y transition-colors divide-gray-100 dark:divide-white/[0.04]">
                <div class="flex items-center justify-between px-5 py-3">
                  <span class="text-sm text-gray-500">Dates</span>
                  <span class="text-sm transition-colors text-gray-800 dark:text-gray-200">{{ formatDate(tournament.start_date) }} — {{ formatDate(tournament.end_date) }}</span>
                </div>
                <div class="flex items-center justify-between px-5 py-3">
                  <span class="text-sm text-gray-500">Sport</span>
                  <span class="text-sm transition-colors capitalize text-gray-800 dark:text-gray-200">{{ tournament.sport }}</span>
                </div>
                <div class="flex items-center justify-between px-5 py-3">
                  <span class="text-sm text-gray-500">Type</span>
                  <span class="text-sm transition-colors text-gray-800 dark:text-gray-200">{{ formatType(tournament.type) }}</span>
                </div>
                <div v-if="tournament.organization" class="flex items-center justify-between px-5 py-3">
                  <span class="text-sm text-gray-500">Organizer</span>
                  <NuxtLink
                    :to="toMain(`/org/${tournament.organization.slug}`)"
                    class="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5"
                  >
                    <img
                      v-if="tournament.organization.logoUrl"
                      :src="tournament.organization.logoUrl"
                      :alt="tournament.organization.name"
                      class="w-4 h-4 rounded-full object-cover shrink-0"
                    />
                    <span>{{ tournament.organization.name }}</span>
                    <UIcon
                      v-if="tournament.organization.isVerified"
                      name="i-heroicons-check-badge-solid"
                      class="w-3.5 h-3.5 text-emerald-500 shrink-0"
                    />
                  </NuxtLink>
                </div>
                <div v-if="tournament.location" class="flex items-center justify-between px-5 py-3">
                  <span class="text-sm text-gray-500">Location</span>
                  <span class="text-sm transition-colors text-gray-800 dark:text-gray-200">{{ tournament.location }}</span>
                </div>
                <div v-if="uniqueVenues.length > 0" class="flex items-center justify-between px-5 py-3">
                  <span class="text-sm text-gray-500">Venues</span>
                  <span class="text-sm transition-colors text-right pl-4 text-gray-800 dark:text-gray-200">
                    {{ uniqueVenues.join(', ') }}
                  </span>
                </div>
              </div>
            </div>
          </div>
            </div>

            <!-- ====== FIXTURES TAB ====== -->
            <div
              class="w-full shrink-0 min-w-full"
              :class="activeTab === 'fixtures' || isDragging || isAnimating ? 'h-auto overflow-visible' : 'h-0 overflow-hidden'"
            >
              <div v-if="filteredFixtures.length === 0" class="text-center py-16">
              <p class="text-sm text-gray-500">No fixtures available for this filter.</p>
            </div>

            <!-- Modern Fixtures Card Layout (FotMob Style) -->
            <div v-else class="max-w-3xl mx-auto">
              <!-- Outer Card -->
              <div class="bg-white dark:bg-[#181818] border border-gray-200/80 dark:border-white/[0.06] rounded-2xl p-4 sm:p-5 shadow-sm">
                <!-- Top Filter / Controls Bar -->
                <div class="flex items-center justify-between gap-3 mb-2">
                  <!-- Left: "By round" dropdown -->
                  <UDropdownMenu
                    :items="viewModeMenuItems"
                    :content="{ align: 'start', side: 'bottom', sideOffset: 6 }"
                    :ui="{ content: 'min-w-[140px]' }"
                  >
                    <button
                      type="button"
                      class="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-800 dark:text-neutral-200 hover:text-black dark:hover:text-white px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-white/[0.06] dark:hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <span>{{ fixturesViewMode === 'by-round' ? 'By round' : 'All rounds' }}</span>
                      <UIcon name="i-heroicons-chevron-down" class="w-3.5 h-3.5 text-gray-500 dark:text-neutral-400" />
                    </button>
                  </UDropdownMenu>

                  <!-- Right: Two Legs Filter (if applicable) -->
                  <div v-if="tournament.twoLegsKnockout && fixtures.length > 0" class="flex items-center gap-1">
                    <button
                      type="button"
                      @click="legFilter = 'ALL'"
                      class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      :class="legFilter === 'ALL'
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-white/10'"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      @click="legFilter = '1'"
                      class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      :class="legFilter === '1'
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-white/10'"
                    >
                      Leg 1
                    </button>
                    <button
                      type="button"
                      @click="legFilter = '2'"
                      class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      :class="legFilter === '2'
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-white/10'"
                    >
                      Leg 2
                    </button>
                  </div>
                </div>

                <!-- Stepper: < Round X v > (Only in 'by-round' mode) -->
                <div v-if="fixturesViewMode === 'by-round'" class="flex items-center justify-between py-2 sm:py-3 mb-1">
                  <!-- Prev Round Button -->
                  <button
                    type="button"
                    @click="goToPrevRound"
                    :disabled="isPrevRoundDisabled"
                    class="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-[#252525] dark:hover:bg-[#323232] text-gray-700 dark:text-gray-300 disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer shrink-0"
                    aria-label="Previous round"
                  >
                    <UIcon name="i-heroicons-chevron-left" class="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>

                  <!-- Round Dropdown Trigger -->
                  <UDropdownMenu
                    v-if="roundDropdownItems.length > 0"
                    :items="roundDropdownItems"
                    :content="{ align: 'center', side: 'bottom', sideOffset: 8 }"
                    :ui="{ content: 'max-h-80 overflow-y-auto min-w-[200px]' }"
                  >
                    <button
                      type="button"
                      class="inline-flex items-center gap-1.5 text-sm sm:text-base font-bold text-gray-900 dark:text-white hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors cursor-pointer select-none"
                    >
                      <span>{{ currentRound?.name || 'Round' }}</span>
                      <UIcon name="i-heroicons-chevron-down" class="w-4 h-4 text-gray-400" />
                    </button>
                  </UDropdownMenu>
                  <span
                    v-else
                    class="text-sm sm:text-base font-bold text-gray-900 dark:text-white"
                  >
                    {{ currentRound?.name || 'Round' }}
                  </span>

                  <!-- Next Round Button -->
                  <button
                    type="button"
                    @click="goToNextRound"
                    :disabled="isNextRoundDisabled"
                    class="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-[#252525] dark:hover:bg-[#323232] text-gray-700 dark:text-gray-300 disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer shrink-0"
                    aria-label="Next round"
                  >
                    <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>

                <!-- Matches Section: Single Round View -->
                <div v-if="fixturesViewMode === 'by-round'" class="space-y-4">
                  <div
                    v-for="group in currentRoundDateGroups"
                    :key="group.dateKey"
                    class="space-y-1"
                  >
                    <!-- Date Pill / Banner -->
                    <div class="bg-gray-100 dark:bg-[#242424] text-xs sm:text-sm font-bold text-gray-900 dark:text-white px-3.5 py-2.5 rounded-xl flex items-center justify-between">
                      <span>{{ group.dateLabel }}</span>
                    </div>

                    <!-- Fixtures in Date Group -->
                    <div class="divide-y divide-gray-100 dark:divide-white/[0.04]">
                      <NuxtLink
                        v-for="fixture in group.fixtures"
                        :key="fixture.id"
                        :to="getFixtureUrl(fixture.id)"
                        @click="onFixtureClick"
                        class="w-full flex items-center py-3 px-2 sm:px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer text-left focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                      >
                        <!-- Status Pill on Left -->
                        <div class="w-10 sm:w-12 shrink-0 flex items-center justify-start">
                          <!-- FT (Completed) -->
                          <span
                            v-if="fixture.status === FixtureStatus.COMPLETED"
                            class="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-gray-100 dark:bg-[#262626] text-gray-500 dark:text-neutral-400"
                          >
                            FT
                          </span>
                          <!-- Live -->
                          <span
                            v-else-if="fixture.status === FixtureStatus.LIVE || fixture.status === FixtureStatus.NORMAL_TIME_ENDED || fixture.status === FixtureStatus.EXTRATIME"
                            class="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-red-500/15 text-red-500 dark:text-red-400 flex items-center gap-1"
                          >
                            <span class="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                            <span>{{ matchTimer.formatMinuteLabel(fixture) || 'LIVE' }}</span>
                          </span>
                          <!-- Cancelled -->
                          <span
                            v-else-if="fixture.status === FixtureStatus.CANCELLED"
                            class="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-red-500/15 text-red-400"
                          >
                            CANC
                          </span>
                          <!-- Scheduled / Time -->
                          <span
                            v-else
                            class="text-[11px] font-medium text-gray-400 dark:text-neutral-500"
                          >
                            {{ fixture.startTime ? formatTime24(fixture.startTime) : 'TBD' }}
                          </span>
                        </div>

                        <!-- Matchup Grid: Home (Right) | Score (Center) | Away (Left) -->
                        <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3 flex-1 min-w-0">
                          <!-- Home Team -->
                          <div class="flex items-center justify-end gap-2 sm:gap-2.5 min-w-0">
                            <span
                              v-if="flashingFixtures.get(fixture.id) === 'home'"
                              class="goal-text shrink-0 text-xs font-bold text-emerald-500 mr-1"
                            >
                              GOAL!
                            </span>
                            <span
                              class="text-xs sm:text-[14px] font-semibold truncate text-right transition-colors"
                              :class="getTeamClass(fixture, true)"
                            >
                              {{ fixture.homeTeam?.customShortName || fixture.homeTeam?.customName || fixture.homeTeamPlaceholder || 'TBD' }}
                            </span>
                            <div class="w-5 h-5 sm:w-6 sm:h-6 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 ring-1 ring-gray-200 dark:bg-white/10 dark:ring-0 p-0.5 flex items-center justify-center">
                              <img
                                v-if="fixture.homeTeam?.logoUrl"
                                :src="fixture.homeTeam.logoUrl"
                                class="w-full h-full object-contain"
                              />
                              <span v-else class="text-[9px] font-bold text-gray-500 uppercase">
                                {{ (fixture.homeTeam?.customShortName || fixture.homeTeam?.customName || fixture.homeTeamPlaceholder || 'TBD').charAt(0) }}
                              </span>
                            </div>
                            <!-- Red / Yellow card indicator for home team -->
                            <div
                              v-if="getTeamCards(fixture, true).red > 0"
                              class="w-2.5 h-3.5 bg-red-500 rounded-[1px] shrink-0"
                              title="Red card"
                            />
                            <div
                              v-if="getTeamCards(fixture, true).yellow > 0"
                              class="w-2.5 h-3.5 bg-yellow-400 rounded-[1px] shrink-0"
                              title="Yellow card"
                            />
                          </div>

                          <!-- Score / Center -->
                          <div class="flex flex-col items-center justify-center px-1.5 sm:px-3 min-w-[50px] sm:min-w-[62px] shrink-0 text-center">
                            <!-- Completed or Live Score -->
                            <template v-if="fixture.status === FixtureStatus.COMPLETED || fixture.status === FixtureStatus.LIVE || fixture.status === FixtureStatus.NORMAL_TIME_ENDED || fixture.status === FixtureStatus.EXTRATIME">
                              <div class="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-[15px] font-bold tabular-nums tracking-wide text-gray-900 dark:text-white">
                                <span :class="getScoreClass(fixture, true)">{{ fixture.homeScore ?? 0 }}</span>
                                <span class="text-gray-400 dark:text-neutral-500 text-xs font-normal">-</span>
                                <span :class="getScoreClass(fixture, false)">{{ fixture.awayScore ?? 0 }}</span>
                              </div>
                              <span
                                v-if="fixture.homePenaltyScore != null && fixture.awayPenaltyScore != null"
                                class="text-[9px] sm:text-[10px] font-medium text-gray-400 dark:text-neutral-500 mt-0.5"
                              >
                                ({{ fixture.homePenaltyScore }} - {{ fixture.awayPenaltyScore }} pen)
                              </span>
                              <span
                                v-if="getMatchAggregate(fixture)"
                                class="text-[9px] font-bold text-emerald-500 uppercase tracking-wider mt-0.5"
                              >
                                {{ getMatchAggregate(fixture) }}
                              </span>
                            </template>
                            <!-- Cancelled -->
                            <template v-else-if="fixture.status === FixtureStatus.CANCELLED">
                              <span class="text-xs font-bold text-red-500">CANC</span>
                            </template>
                            <!-- Scheduled -->
                            <template v-else>
                              <span class="text-xs font-semibold text-gray-400 dark:text-neutral-500 tracking-wider">vs</span>
                            </template>
                          </div>

                          <!-- Away Team -->
                          <div class="flex items-center justify-start gap-2 sm:gap-2.5 min-w-0">
                            <!-- Red / Yellow card indicator for away team -->
                            <div
                              v-if="getTeamCards(fixture, false).red > 0"
                              class="w-2.5 h-3.5 bg-red-500 rounded-[1px] shrink-0"
                              title="Red card"
                            />
                            <div
                              v-if="getTeamCards(fixture, false).yellow > 0"
                              class="w-2.5 h-3.5 bg-yellow-400 rounded-[1px] shrink-0"
                              title="Yellow card"
                            />
                            <div class="w-5 h-5 sm:w-6 sm:h-6 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 ring-1 ring-gray-200 dark:bg-white/10 dark:ring-0 p-0.5 flex items-center justify-center">
                              <img
                                v-if="fixture.awayTeam?.logoUrl"
                                :src="fixture.awayTeam.logoUrl"
                                class="w-full h-full object-contain"
                              />
                              <span v-else class="text-[9px] font-bold text-gray-500 uppercase">
                                {{ (fixture.awayTeam?.customShortName || fixture.awayTeam?.customName || fixture.awayTeamPlaceholder || 'TBD').charAt(0) }}
                              </span>
                            </div>
                            <span
                              class="text-xs sm:text-[14px] font-semibold truncate text-left transition-colors"
                              :class="getTeamClass(fixture, false)"
                            >
                              {{ fixture.awayTeam?.customShortName || fixture.awayTeam?.customName || fixture.awayTeamPlaceholder || 'TBD' }}
                            </span>
                            <span
                              v-if="flashingFixtures.get(fixture.id) === 'away'"
                              class="goal-text shrink-0 text-xs font-bold text-emerald-500 ml-1"
                            >
                              GOAL!
                            </span>
                          </div>
                        </div>
                      </NuxtLink>
                    </div>
                  </div>
                </div>

                <!-- Matches Section: All Rounds View -->
                <div v-else class="space-y-6">
                  <div
                    v-for="roundItem in allRoundsList"
                    :key="roundItem.key"
                    class="space-y-3"
                  >
                    <!-- Round Header Banner -->
                    <div class="bg-gray-100 dark:bg-[#242424] text-xs sm:text-sm font-bold text-gray-900 dark:text-white px-3.5 py-2.5 rounded-xl flex items-center justify-between">
                      <span>{{ roundItem.name }}</span>
                      <span class="text-[11px] font-medium text-gray-500 dark:text-neutral-400">{{ roundItem.fixtures.length }} {{ roundItem.fixtures.length === 1 ? 'match' : 'matches' }}</span>
                    </div>

                    <!-- Fixtures List -->
                    <div class="divide-y divide-gray-100 dark:divide-white/[0.04]">
                      <NuxtLink
                        v-for="fixture in roundItem.fixtures"
                        :key="fixture.id"
                        :to="getFixtureUrl(fixture.id)"
                        @click="onFixtureClick"
                        class="w-full flex items-center py-3 px-2 sm:px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer text-left focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                      >
                        <!-- Status Pill on Left -->
                        <div class="w-10 sm:w-12 shrink-0 flex items-center justify-start">
                          <span
                            v-if="fixture.status === FixtureStatus.COMPLETED"
                            class="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-gray-100 dark:bg-[#262626] text-gray-500 dark:text-neutral-400"
                          >
                            FT
                          </span>
                          <span
                            v-else-if="fixture.status === FixtureStatus.LIVE || fixture.status === FixtureStatus.NORMAL_TIME_ENDED || fixture.status === FixtureStatus.EXTRATIME"
                            class="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-red-500/15 text-red-500 dark:text-red-400 flex items-center gap-1"
                          >
                            <span class="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                            <span>{{ matchTimer.formatMinuteLabel(fixture) || 'LIVE' }}</span>
                          </span>
                          <span
                            v-else-if="fixture.status === FixtureStatus.CANCELLED"
                            class="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-red-500/15 text-red-400"
                          >
                            CANC
                          </span>
                          <span
                            v-else
                            class="text-[11px] font-medium text-gray-400 dark:text-neutral-500"
                          >
                            {{ fixture.startTime ? formatTime24(fixture.startTime) : 'TBD' }}
                          </span>
                        </div>

                        <!-- Matchup Grid -->
                        <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3 flex-1 min-w-0">
                          <!-- Home Team -->
                          <div class="flex items-center justify-end gap-2 sm:gap-2.5 min-w-0">
                            <span
                              v-if="flashingFixtures.get(fixture.id) === 'home'"
                              class="goal-text shrink-0 text-xs font-bold text-emerald-500 mr-1"
                            >
                              GOAL!
                            </span>
                            <span
                              class="text-xs sm:text-[14px] font-semibold truncate text-right transition-colors"
                              :class="getTeamClass(fixture, true)"
                            >
                              {{ fixture.homeTeam?.customShortName || fixture.homeTeam?.customName || fixture.homeTeamPlaceholder || 'TBD' }}
                            </span>
                            <div class="w-5 h-5 sm:w-6 sm:h-6 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 ring-1 ring-gray-200 dark:bg-white/10 dark:ring-0 p-0.5 flex items-center justify-center">
                              <img
                                v-if="fixture.homeTeam?.logoUrl"
                                :src="fixture.homeTeam.logoUrl"
                                class="w-full h-full object-contain"
                              />
                              <span v-else class="text-[9px] font-bold text-gray-500 uppercase">
                                {{ (fixture.homeTeam?.customShortName || fixture.homeTeam?.customName || fixture.homeTeamPlaceholder || 'TBD').charAt(0) }}
                              </span>
                            </div>
                            <div
                              v-if="getTeamCards(fixture, true).red > 0"
                              class="w-2.5 h-3.5 bg-red-500 rounded-[1px] shrink-0"
                              title="Red card"
                            />
                            <div
                              v-if="getTeamCards(fixture, true).yellow > 0"
                              class="w-2.5 h-3.5 bg-yellow-400 rounded-[1px] shrink-0"
                              title="Yellow card"
                            />
                          </div>

                          <!-- Score -->
                          <div class="flex flex-col items-center justify-center px-1.5 sm:px-3 min-w-[50px] sm:min-w-[62px] shrink-0 text-center">
                            <template v-if="fixture.status === FixtureStatus.COMPLETED || fixture.status === FixtureStatus.LIVE || fixture.status === FixtureStatus.NORMAL_TIME_ENDED || fixture.status === FixtureStatus.EXTRATIME">
                              <div class="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-[15px] font-bold tabular-nums tracking-wide text-gray-900 dark:text-white">
                                <span :class="getScoreClass(fixture, true)">{{ fixture.homeScore ?? 0 }}</span>
                                <span class="text-gray-400 dark:text-neutral-500 text-xs font-normal">-</span>
                                <span :class="getScoreClass(fixture, false)">{{ fixture.awayScore ?? 0 }}</span>
                              </div>
                              <span
                                v-if="fixture.homePenaltyScore != null && fixture.awayPenaltyScore != null"
                                class="text-[9px] sm:text-[10px] font-medium text-gray-400 dark:text-neutral-500 mt-0.5"
                              >
                                ({{ fixture.homePenaltyScore }} - {{ fixture.awayPenaltyScore }} pen)
                              </span>
                              <span
                                v-if="getMatchAggregate(fixture)"
                                class="text-[9px] font-bold text-emerald-500 uppercase tracking-wider mt-0.5"
                              >
                                {{ getMatchAggregate(fixture) }}
                              </span>
                            </template>
                            <template v-else-if="fixture.status === FixtureStatus.CANCELLED">
                              <span class="text-xs font-bold text-red-500">CANC</span>
                            </template>
                            <template v-else>
                              <span class="text-xs font-semibold text-gray-400 dark:text-neutral-500 tracking-wider">vs</span>
                            </template>
                          </div>

                          <!-- Away Team -->
                          <div class="flex items-center justify-start gap-2 sm:gap-2.5 min-w-0">
                            <div
                              v-if="getTeamCards(fixture, false).red > 0"
                              class="w-2.5 h-3.5 bg-red-500 rounded-[1px] shrink-0"
                              title="Red card"
                            />
                            <div
                              v-if="getTeamCards(fixture, false).yellow > 0"
                              class="w-2.5 h-3.5 bg-yellow-400 rounded-[1px] shrink-0"
                              title="Yellow card"
                            />
                            <div class="w-5 h-5 sm:w-6 sm:h-6 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 ring-1 ring-gray-200 dark:bg-white/10 dark:ring-0 p-0.5 flex items-center justify-center">
                              <img
                                v-if="fixture.awayTeam?.logoUrl"
                                :src="fixture.awayTeam.logoUrl"
                                class="w-full h-full object-contain"
                              />
                              <span v-else class="text-[9px] font-bold text-gray-500 uppercase">
                                {{ (fixture.awayTeam?.customShortName || fixture.awayTeam?.customName || fixture.awayTeamPlaceholder || 'TBD').charAt(0) }}
                              </span>
                            </div>
                            <span
                              class="text-xs sm:text-[14px] font-semibold truncate text-left transition-colors"
                              :class="getTeamClass(fixture, false)"
                            >
                              {{ fixture.awayTeam?.customShortName || fixture.awayTeam?.customName || fixture.awayTeamPlaceholder || 'TBD' }}
                            </span>
                            <span
                              v-if="flashingFixtures.get(fixture.id) === 'away'"
                              class="goal-text shrink-0 text-xs font-bold text-emerald-500 ml-1"
                            >
                              GOAL!
                            </span>
                          </div>
                        </div>
                      </NuxtLink>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>

            <!-- ====== STANDINGS TAB ====== -->
            <div
              v-if="standings.length > 0"
              class="w-full shrink-0 min-w-full"
              :class="activeTab === 'standings' || isDragging || isAnimating ? 'h-auto overflow-visible' : 'h-0 overflow-hidden'"
            >
              <div v-if="standings.length === 0" class="text-center py-16">
            <p class="text-sm text-gray-500">No standings available yet.</p>
          </div>
          <div v-else class="space-y-6 w-full mx-auto">
            <div v-for="(groupStandings, groupName) in standingsByGroup" :key="groupName">
              <div class="flex items-center justify-between mb-3 px-1">
                <h4 v-if="groupName !== 'default'" class="text-xs font-bold text-gray-500">
                  {{ groupName }}
                </h4>
              </div>
              <div class="border rounded-xl overflow-x-auto transition-colors bg-white shadow-sm border-gray-100 dark:bg-[#1a1a1a] dark:border-white/[0.06]">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b transition-colors border-gray-100 dark:border-white/[0.06]">
                      <th class="text-center w-8 md:w-10 min-w-[32px] md:min-w-[40px] px-2 py-3 text-[11px] font-bold text-black dark:text-gray-500 sticky left-0 z-20 bg-white dark:bg-[#1a1a1a]">#</th>
                      <th class="text-left w-1/2 px-3 py-3 text-[11px] font-bold text-black dark:text-gray-500 sticky left-[32px] md:left-[40px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] md:shadow-none bg-white dark:bg-[#1a1a1a]">Team</th>
                      <th class="text-center min-w-[44px] md:min-w-[50px] px-2 py-3 text-[11px] font-bold text-black dark:text-gray-500">P</th>
                      <th class="text-center min-w-[44px] md:min-w-[50px] px-2 py-3 text-[11px] font-bold text-black dark:text-gray-500">W</th>
                      <th class="text-center min-w-[44px] md:min-w-[50px] px-2 py-3 text-[11px] font-bold text-black dark:text-gray-500">D</th>
                      <th class="text-center min-w-[44px] md:min-w-[50px] px-2 py-3 text-[11px] font-bold text-black dark:text-gray-500">L</th>
                      <th class="text-center min-w-[44px] md:min-w-[50px] px-2 py-3 text-[11px] font-bold text-black dark:text-gray-500">GF</th>
                      <th class="text-center min-w-[44px] md:min-w-[50px] px-2 py-3 text-[11px] font-bold text-black dark:text-gray-500">GA</th>
                      <th class="text-center min-w-[44px] md:min-w-[50px] px-2 py-3 text-[11px] font-bold text-black dark:text-gray-500">GD</th>
                      <th class="text-center min-w-[50px] md:min-w-[56px] px-3 py-3 text-[11px] font-bold text-emerald-500">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr 
                      v-for="(standing, index) in groupStandings" 
                      :key="standing.id"
                      @click="standing.participant_id && openTeam(standing.participant_id)"
                      class="border-t transition-colors cursor-pointer border-gray-100 hover:bg-gray-100 dark:border-white/[0.04] dark:hover:bg-white/[0.04]"
                    >
                      <td class="text-center w-8 md:w-10 min-w-[32px] md:min-w-[40px] px-2 py-3 text-[13px] font-bold text-black dark:text-gray-500 sticky left-0 z-10 bg-white dark:bg-[#1a1a1a]">{{ standing.position || index + 1 }}</td>
                      <td class="text-left w-[170px] md:w-auto min-w-[170px] px-3 py-3 sticky left-[32px] md:left-[40px] z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] md:shadow-none bg-white dark:bg-[#1a1a1a]">
                        <div class="flex items-center gap-2 md:gap-2.5">
                          <div class="w-5 h-5 md:w-6 md:h-6 rounded-full bg-white/10 overflow-hidden flex-shrink-0">
                            <img v-if="standing.participant?.logoUrl" :src="standing.participant.logoUrl" class="w-full h-full object-cover" />
                            <span v-else class="flex items-center justify-center w-full h-full text-[8px] md:text-[9px] font-bold text-black dark:text-gray-500">
                              {{ (standing.participant?.customShortName || standing.participant?.customName || 'T').charAt(0) }}
                            </span>
                          </div>
                          <div class="flex flex-col min-w-0">
                            <span class="text-[12px] md:text-[13px] font-bold truncate max-w-[120px] sm:max-w-[150px] md:max-w-[200px] text-black dark:text-gray-200">{{ standing.participant?.customShortName || standing.participant?.customName || 'Unknown' }}</span>
                            <NuxtLink 
                              v-if="standing.participant?.team_id || standing.participant?.team?.id"
                              :to="`/team/${standing.participant?.team_id || standing.participant?.team?.id}`"
                              class="text-[9px] text-emerald-600 dark:text-emerald-500 font-black uppercase tracking-widest hover:underline mt-0.5"
                              @click.stop
                            >
                              Team History
                            </NuxtLink>
                          </div>

                        </div>
                      </td>
                      <td class="text-center min-w-[44px] md:min-w-[50px] px-2 py-3 text-[12px] md:text-[13px] text-black dark:text-gray-400 font-medium">{{ standing.played }}</td>
                      <td class="text-center min-w-[44px] md:min-w-[50px] px-2 py-3 text-[12px] md:text-[13px] text-black dark:text-gray-400 font-medium">{{ standing.wins }}</td>
                      <td class="text-center min-w-[44px] md:min-w-[50px] px-2 py-3 text-[12px] md:text-[13px] text-black dark:text-gray-400 font-medium">{{ standing.draws }}</td>
                      <td class="text-center min-w-[44px] md:min-w-[50px] px-2 py-3 text-[12px] md:text-[13px] text-black dark:text-gray-400 font-medium">{{ standing.losses }}</td>
                      <td class="text-center min-w-[44px] md:min-w-[50px] px-2 py-3 text-[12px] md:text-[13px] text-black dark:text-gray-400 font-medium">{{ standing.goalsFor }}</td>
                      <td class="text-center min-w-[44px] md:min-w-[50px] px-2 py-3 text-[12px] md:text-[13px] text-black dark:text-gray-400 font-medium">{{ standing.goalsAgainst }}</td>
                      <td class="text-center min-w-[44px] md:min-w-[50px] px-2 py-3 text-[12px] md:text-[13px] font-semibold" :class="standing.goalDiff > 0 ? 'text-emerald-600 dark:text-emerald-400' : standing.goalDiff < 0 ? 'text-red-500' : 'text-black dark:text-gray-500'">
                        {{ standing.goalDiff > 0 ? '+' : '' }}{{ standing.goalDiff }}
                      </td>
                      <td class="text-center min-w-[50px] md:min-w-[56px] px-3 py-3 text-[12px] md:text-[13px] font-bold text-black dark:text-white">{{ standing.points }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
            </div>

            <!-- ====== BRACKET TAB ====== -->
            <div
              v-if="showBracketTab"
              class="w-full shrink-0 min-w-full"
              :class="activeTab === 'bracket' || isDragging || isAnimating ? 'h-auto overflow-visible' : 'h-0 overflow-hidden'"
            >
              <div v-if="bracketRounds.length === 0" class="text-center py-16">
            <p class="text-sm text-gray-500">No bracket data available yet.</p>
          </div>
          <div v-else class="px-4 pb-12">
            <KnockoutBracket
              :fixtures-by-round="bracketFixturesByRound"
              :rounds="bracketRounds"
              :get-round-display-name="(round, index, total) => getRoundDisplayName(index, total, bracketFixturesByRound[round]?.[0]?.roundName)"
              :two-legs-knockout="tournament.twoLegsKnockout"
              :third-place-match="tournament.thirdPlaceMatch"
              :readonly="true"
              @control-match="(fixture) => openFixture(fixture.id)"
              @start-match="(fixture) => openFixture(fixture.id)"
            />
          </div>
            </div>

            <!-- ====== STATS TAB ====== -->
            <div
              v-if="isTeams"
              class="w-full shrink-0 min-w-full"
              :class="activeTab === 'stats' || isDragging || isAnimating ? 'h-auto overflow-visible' : 'h-0 overflow-hidden'"
            >
              <div class="max-w-7xl mx-auto">
            <MarketingPlayerStatsLeaderboard :stats="playerStats" :loading="playerStatsLoading" />
          </div>
            </div>

            <!-- ====== PARTICIPANTS TAB ====== -->
            <div
              v-if="participants.length > 0"
              class="w-full shrink-0 min-w-full"
              :class="activeTab === 'participants' || isDragging || isAnimating ? 'h-auto overflow-visible' : 'h-0 overflow-hidden'"
            >
              <div v-if="participants.length === 0" class="text-center py-16">
            <p class="text-sm font-medium text-black dark:text-gray-500">No {{ participantsTabName.toLowerCase() }} available yet.</p>
          </div>
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <NuxtLink
              v-for="participant in participants"
              :key="participant.id"
              :to="getTeamUrl(participant.id)"
              @click="onTeamClick"
              :class="winnerId === participant.id ? 'border-amber-400 dark:border-amber-400/50' : 'border-gray-200 dark:border-white/[0.06] hover:border-emerald-500/30 dark:hover:border-emerald-500/50'"
              class="bg-white shadow-sm hover:bg-gray-50 dark:bg-[#1a1a1a] dark:hover:bg-white/[0.02] border rounded-xl p-4 flex flex-col gap-4 transition-colors group text-left focus:outline-none focus:ring-2 focus:ring-emerald-500/50 relative overflow-hidden cursor-pointer"
            >
              <!-- Winner Indicator -->
              <div v-if="winnerId === participant.id" class="absolute -top-1 -right-1 z-10">
                <div class="bg-amber-400 text-black px-2.5 py-1 rounded-bl-xl text-[9px] font-black uppercase tracking-widest shadow-sm">
                  Winner
                </div>
              </div>
              
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 transition-colors relative bg-gray-100 dark:bg-white/10">
                  <img v-if="participant.logoUrl" :src="participant.logoUrl" class="w-full h-full object-cover" />
                  <span v-else class="flex items-center justify-center w-full h-full text-lg font-bold text-black dark:text-gray-500">
                    {{ (participant.customShortName || participant.customName || 'P').charAt(0).toUpperCase() }}
                  </span>
                </div>
                <div class="flex-1 min-w-0">
                  <h4 class="text-base font-bold truncate transition-colors text-black group-hover:text-black dark:text-gray-200 dark:group-hover:text-white">
                    {{ participant.customShortName || participant.customName || 'Unknown' }}
                  </h4>
                  <NuxtLink 
                    v-if="participant.team_id || participant.team?.id"
                    :to="`/team/${participant.team_id || participant.team?.id}`"
                    class="text-[10px] text-emerald-600 dark:text-emerald-500 font-bold hover:underline mt-1 inline-block"
                    @click.stop
                  >
                    View Global Profile
                  </NuxtLink>

                </div>
              </div>
            </NuxtLink>
          </div>
            </div>

            <!-- ====== CHAT TAB ====== -->
            <div
              v-if="showMatchHub"
              class="w-full shrink-0 min-w-full"
              :class="activeTab === 'chat' || isDragging || isAnimating ? 'h-auto overflow-visible' : 'h-0 overflow-hidden'"
            >
              <!-- pb clears the fixed mobile bottom nav so the composer stays visible -->
          <div class="max-w-3xl mx-auto pb-24 md:pb-8">
            <ChatTournamentChat
              :tournament-id="tournament.id"
              :can-post="viewerParticipant ? 'participant' : false"
              :viewer-participant-id="viewerParticipant?.id ?? null"
              :paragee-bot="tournament.parageeBot"
              :member-count="participants.length || undefined"
              :members="chatMembers"
              :fixtures="fixtures"
              :tournament="tournament"
              @score-submitted="() => refreshOverview()"
            />
          </div>
            </div>

            <!-- ====== PREDICTIONS TAB ====== -->
            <div
              v-if="showPredictionsTab"
              class="w-full shrink-0 min-w-full"
              :class="activeTab === 'predictions' || isDragging || isAnimating ? 'h-auto overflow-visible' : 'h-0 overflow-hidden'"
            >
              <MarketingTournamentPredictionsTab
                :tournament="tournament"
                :fixtures="fixtures"
                @open-fixture="openFixture"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.fixture-row {
  transition: background-color 0.15s ease;
}
.fixture-row:hover {
  background-color: rgba(128, 128, 128, 0.06);
}
.round-content {
  max-height: 3000px;
  overflow: hidden;
  transition: max-height 0.35s ease, opacity 0.25s ease;
  opacity: 1;
}
.round-content.collapsed {
  max-height: 0;
  opacity: 0;
}

/* Goal Text Animation */
.goal-text {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: #ef4444;
  text-shadow: 0 0 6px rgba(239, 68, 68, 0.5);
  animation: goalTextPulse 1s ease-in-out infinite;
}
@keyframes goalTextPulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

/* Tab slide transitions */
.tab-slide-next-enter-active,
.tab-slide-next-leave-active,
.tab-slide-prev-enter-active,
.tab-slide-prev-leave-active {
  transition: opacity 0.18s ease, transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.tab-slide-next-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.tab-slide-next-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.tab-slide-prev-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}
.tab-slide-prev-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* Hide scrollbar utility */
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>

<style>
/* Sponsor Modal Transitions (unscoped because modal is teleported to body) */
.sponsor-modal-enter-active,
.sponsor-modal-leave-active {
  transition: opacity 0.2s ease;
}
.sponsor-modal-enter-active > div:last-child,
.sponsor-modal-leave-active > div:last-child {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.sponsor-modal-enter-from,
.sponsor-modal-leave-to {
  opacity: 0;
}
.sponsor-modal-enter-from > div:last-child {
  transform: scale(0.95);
  opacity: 0;
}
.sponsor-modal-leave-to > div:last-child {
  transform: scale(0.95);
  opacity: 0;
}
</style>

