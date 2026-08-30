import { $fetch } from 'ofetch'
import { getMatchMinute } from '~/composables/useMatchTimer'
import { resolveEngine } from '~/engines/registry'
import {
  hubMeta,
  sports as mockSports,
  medals as mockMedals,
  schedule as mockSchedule,
  tickerItems as mockTicker,
  type HubSport,
} from '~/components/event/mock'

interface ApiResponse<T> {
  success: boolean
  message: string
  data?: T
}

export interface EventHubOrg {
  id: string
  name: string
  slug: string
  subdomain: string
  description: string | null
  logoUrl: string | null
  color: string | null
  brandConfig: Record<string, any> | null
  tournaments: {
    id: string
    name: string
    customName: string | null
    sport: string
    type: string
    start_date: string
    end_date: string
    logoUrl: string | null
    location: string | null
  }[]
}

export interface EventHubMatchEvent {
  id: string
  type: string
  minute: number | null
  description: string | null
  metadata: Record<string, any> | null
  created_at: string
  participant: { customName: string | null; customShortName: string | null } | null
  player: { name: string } | null
}

export interface EventHubResultEntry {
  id: string
  participantId: string
  value: string | null
  lane: number | null
  note: string | null
  rank: number | null
  participant: { customName: string | null; customShortName: string | null; logoUrl: string | null } | null
}

export interface EventHubFixture {
  id: string
  tournament_id: string
  round: number
  roundName: string | null
  stage: string | null
  status: string
  startTime: string | null
  venue: string | null
  homeScore: number | null
  awayScore: number | null
  homeTeamPlaceholder: string | null
  awayTeamPlaceholder: string | null
  timerStartedAt: string | null
  timerElapsedSeconds: number
  timerIsRunning: boolean
  matchDuration: number
  half: string | null
  periodScores?: { home: number[]; away: number[] } | null
  resultEntries?: EventHubResultEntry[]
  updated_at: string
  matchEvents?: EventHubMatchEvent[]
  homeTeam: { customName: string | null; customShortName: string | null; logoUrl: string | null; team: { name: string } | null } | null
  awayTeam: { customName: string | null; customShortName: string | null; logoUrl: string | null; team: { name: string } | null } | null
  tournament: { id: string; name: string; customName: string | null; sport: string }
}

export interface LiveCard {
  fixture: EventHubFixture
  label: string
  clock: string | null
  home: { name: string; abbr: string; logoUrl: string | null }
  away: { name: string; abbr: string; logoUrl: string | null }
  hs: number
  as: number
  lastEvent: string | null
}

export interface EventHubSportStatus {
  tournamentId: string
  name: string
  customName: string | null
  sport: string
  logoUrl: string | null
  liveCount: number
  nextStart: string | null
  hasResults: boolean
}

export interface EventHubLive {
  live: EventHubFixture[]
  upcoming: EventHubFixture[]
  results: EventHubFixture[]
  sports: EventHubSportStatus[]
}

export interface MedalTableRow {
  rosterEntryId: string
  name: string
  shortName: string | null
  logoUrl: string | null
  gold: number
  silver: number
  bronze: number
  total: number
}

/**
 * Resolves the event hub organization for the current subdomain.
 * Falls back to bundled mock data when no org is configured for the slug,
 * so the hub demo works before the backend is populated.
 */
export const useEventHub = () => {
  const { eventSlug } = useHost()

  const org = useState<EventHubOrg | null>('eventHub.org', () => null)
  const liveData = useState<EventHubLive | null>('eventHub.live', () => null)
  const medalTable = useState<MedalTableRow[] | null>('eventHub.medals', () => null)
  const isMock = useState<boolean>('eventHub.isMock', () => true)
  const pending = useState<boolean>('eventHub.pending', () => false)

  const fetchHub = async () => {
    if (!eventSlug.value) return
    pending.value = true
    const apiBase = useRuntimeConfig().public.API_BASE_URL as string
    try {
      const res = await $fetch<ApiResponse<EventHubOrg>>(
        `${apiBase}/organizations/event-hub/${eventSlug.value}`,
        { timeout: 5000 },
      )
      org.value = res.data ?? null
      isMock.value = false
    } catch {
      org.value = null
      isMock.value = true
    }

    if (!isMock.value) {
      const [liveRes, medalsRes] = await Promise.allSettled([
        $fetch<ApiResponse<EventHubLive>>(
          `${apiBase}/organizations/event-hub/${eventSlug.value}/live`,
          { timeout: 5000 },
        ),
        $fetch<ApiResponse<MedalTableRow[]>>(
          `${apiBase}/organizations/event-hub/${eventSlug.value}/medals`,
          { timeout: 5000 },
        ),
      ])
      liveData.value = liveRes.status === 'fulfilled' ? (liveRes.value.data ?? null) : null
      medalTable.value = medalsRes.status === 'fulfilled' ? (medalsRes.value.data ?? null) : null
    }
    pending.value = false
  }

  const meta = computed(() => {
    const brand = (org.value?.brandConfig ?? {}) as Record<string, any>
    return {
      ...hubMeta,
      name: org.value?.name ?? hubMeta.name,
      logo: org.value?.logoUrl ?? hubMeta.logo,
      location: brand.location ?? hubMeta.location,
      venue: brand.venue ?? hubMeta.venue,
      dates: brand.dates ?? hubMeta.dates,
      tagline: brand.tagline ?? hubMeta.tagline,
      countdownTarget: brand.countdownTarget ?? hubMeta.countdownTarget,
      countdownLabel: brand.countdownLabel ?? hubMeta.countdownLabel,
      mascot: brand.mascotUrl ?? hubMeta.mascot,
      mascotHead: brand.mascotHeadUrl ?? hubMeta.mascotHead,
      dayIndicator: brand.dayIndicator ?? hubMeta.dayIndicator,
    }
  })

  const sportList = computed<HubSport[]>(() => {
    if (isMock.value || !liveData.value) return mockSports
    return liveData.value.sports.map((s) => ({
      e: mockSports.find((m) => m.name.toLowerCase() === s.sport.toLowerCase())?.e ?? '🏅',
      name: s.name,
      status: s.liveCount > 0
        ? 'LIVE'
        : s.nextStart
          ? new Date(s.nextStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : s.hasResults
            ? 'RESULTS'
            : 'SOON',
      detail: 'tournament',
      tournamentId: s.tournamentId,
    }))
  })

  const scheduleItems = computed(() => {
    if (isMock.value || !liveData.value) return mockSchedule
    return liveData.value.upcoming.map((f) => ({
      t: f.startTime ? new Date(f.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD',
      e: mockSports.find((m) => m.name.toLowerCase() === f.tournament.sport.toLowerCase())?.e ?? '🏅',
      title: `${f.tournament.name}${f.roundName ? ` — ${f.roundName}` : ''}`,
      sub: [f.venue, f.tournament.sport].filter(Boolean).join(' · '),
      status: 'SCHEDULED',
      cls: 'text-sky-400',
    }))
  })

  const teamDisplay = (
    team: EventHubFixture['homeTeam'],
    placeholder: string | null,
  ) => {
    const name = team?.customName ?? team?.team?.name ?? placeholder ?? 'TBD'
    const abbr = (team?.customShortName ?? name.slice(0, 3)).toUpperCase()
    return { name, abbr, logoUrl: team?.logoUrl ?? null }
  }

  const eventLabel = (e: EventHubMatchEvent): string => {
    const who = e.player?.name ?? e.participant?.customShortName ?? e.participant?.customName ?? ''
    const base = e.description ?? `${e.type.replace(/_/g, ' ')}${who ? ` — ${who}` : ''}`
    return e.minute != null ? `${base} ${e.minute}'` : base
  }

  const liveCards = computed<LiveCard[]>(() => {
    if (!liveData.value) return []
    return liveData.value.live.map((f) => {
      const hasClock = resolveEngine(f.tournament.sport).capabilities.timer !== 'none'
      const minute = hasClock ? getMatchMinute(f as any) : null
      const latest = f.matchEvents?.[0]
      return {
        fixture: f,
        label: [f.tournament.name, f.roundName, f.venue].filter(Boolean).join(' · '),
        clock: minute != null ? `${minute}'` : null,
        home: teamDisplay(f.homeTeam, f.homeTeamPlaceholder),
        away: teamDisplay(f.awayTeam, f.awayTeamPlaceholder),
        hs: f.homeScore ?? 0,
        as: f.awayScore ?? 0,
        lastEvent: latest ? `Latest: ${eventLabel(latest)}` : null,
      }
    })
  })

  const medalRows = computed(() => {
    if (isMock.value || !medalTable.value) return mockMedals
    return medalTable.value.map((r) => ({
      u: r.shortName ?? r.name,
      logoUrl: r.logoUrl,
      g: r.gold,
      s: r.silver,
      b: r.bronze,
    }))
  })
  const ticker = computed(() => {
    if (isMock.value || !liveData.value) return mockTicker

    const items: string[] = []
    for (const card of liveCards.value) {
      items.push(
        `🔴 LIVE · ${card.fixture.tournament.name}: ${card.home.name} ${card.hs}–${card.as} ${card.away.name}${card.clock ? ` (${card.clock})` : ''}`,
      )
    }
    for (const f of liveData.value.results.slice(0, 8)) {
      const home = teamDisplay(f.homeTeam, f.homeTeamPlaceholder)
      const away = teamDisplay(f.awayTeam, f.awayTeamPlaceholder)
      items.push(
        `🏁 ${f.tournament.name}${f.roundName ? ` ${f.roundName}` : ''}: ${home.name} ${f.homeScore ?? 0}–${f.awayScore ?? 0} ${away.name}`,
      )
    }
    if (!items.length) {
      items.push(`Welcome to ${meta.value.name} — live results appear here when competition begins`)
    }
    return items
  })

  // ── Live updates via the global SSE stream ─────────────────────────────
  let refreshTimer: ReturnType<typeof setTimeout> | null = null
  let listening = false

  const handleLiveEvent = (event: Event) => {
    const payload = (event as CustomEvent).detail
    const fixture = payload?.data
    // Refresh on updates touching one of the org's tournaments
    // (or when we can't tell — cheap, debounced)
    const tid = fixture?.tournament_id
    const orgTournamentIds = liveData.value?.sports.map((s) => s.tournamentId) ?? []
    if (tid && orgTournamentIds.length && !orgTournamentIds.includes(tid)) return

    if (refreshTimer) clearTimeout(refreshTimer)
    refreshTimer = setTimeout(() => {
      fetchHub()
    }, 400)
  }

  const startLiveUpdates = () => {
    if (!import.meta.client || isMock.value || listening) return
    listening = true
    window.addEventListener('live-match-update', handleLiveEvent)
  }

  const stopLiveUpdates = () => {
    if (!import.meta.client || !listening) return
    listening = false
    window.removeEventListener('live-match-update', handleLiveEvent)
    if (refreshTimer) clearTimeout(refreshTimer)
  }

  return {
    org,
    isMock,
    pending,
    meta,
    liveData,
    liveCards,
    sports: sportList,
    schedule: scheduleItems,
    medals: medalRows,
    ticker,
    fetchHub,
    startLiveUpdates,
    stopLiveUpdates,
  }
}
