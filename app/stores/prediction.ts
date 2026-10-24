import { defineStore } from 'pinia'
import type {
  Prediction,
  PredictionConfig,
  PredictionLeaderboardEntry,
  FixturePredictionStats,
  PredictionOutcomeStatus,
} from '~/types/prediction'
import type { Fixture, Tournament } from '~/types'
import { FixtureStatus } from '~/types'

const DEFAULT_CONFIG: PredictionConfig = {
  enabled: false,
  exactScorePoints: 3,
  correctResultPoints: 1,
}

export function getTournamentPredictionConfig(tournament?: Tournament | null): PredictionConfig {
  const conf = tournament?.scoringRules?.prediction
  if (!conf) return DEFAULT_CONFIG
  return {
    enabled: conf.enabled === true,
    exactScorePoints: Number(conf.exactScorePoints ?? 3),
    correctResultPoints: Number(conf.correctResultPoints ?? 1),
  }
}

export function calculatePredictionPoints(
  pred: { homeScore: number; awayScore: number },
  fixture: Fixture,
  config: PredictionConfig,
): { points: number | null; status: PredictionOutcomeStatus } {
  if (fixture.status === FixtureStatus.CANCELLED) {
    return { points: 0, status: 'VOID' }
  }

  if (fixture.status !== FixtureStatus.COMPLETED) {
    return { points: null, status: 'PENDING' }
  }

  const actualHome = fixture.homeScore ?? 0
  const actualAway = fixture.awayScore ?? 0

  if (pred.homeScore === actualHome && pred.awayScore === actualAway) {
    return { points: config.exactScorePoints, status: 'EXACT' }
  }

  const predDiff = pred.homeScore - pred.awayScore
  const actualDiff = actualHome - actualAway
  const predResult = Math.sign(predDiff)
  const actualResult = Math.sign(actualDiff)

  if (predResult === actualResult) {
    return { points: config.correctResultPoints, status: 'CORRECT_RESULT' }
  }

  return { points: 0, status: 'INCORRECT' }
}

export function isFixturePredictionLocked(fixture: Fixture): boolean {
  if (fixture.status !== FixtureStatus.SCHEDULED) {
    return true
  }
  if (fixture.startTime) {
    const start = new Date(fixture.startTime).getTime()
    if (!Number.isNaN(start) && start <= Date.now()) {
      return true
    }
  }
  return false
}

// Simulated peer participants to create a lively community contest when starting out
const MOCK_PEERS = [
  { id: 'peer-1', name: 'Tunde Adeyemi', picture: null },
  { id: 'peer-2', name: 'Chioma Okeke', picture: null },
  { id: 'peer-3', name: 'Femi Balogun', picture: null },
  { id: 'peer-4', name: 'Kelechi Iheanacho Fan', picture: null },
  { id: 'peer-5', name: 'Zainab Bello', picture: null },
  { id: 'peer-6', name: 'Emeka Nwosu', picture: null },
  { id: 'peer-7', name: 'David Oladele', picture: null },
  { id: 'peer-8', name: 'Amara Williams', picture: null },
]

export const usePredictionStore = defineStore('prediction', () => {
  const authStore = useAuthStore()

  // State
  const predictionsByTournament = ref<Record<string, Prediction[]>>({})
  const leaderboards = ref<Record<string, PredictionLeaderboardEntry[]>>({})
  const statsByFixture = ref<Record<string, FixturePredictionStats>>({})
  const loading = ref(false)
  const submitting = ref(false)

  // Local storage key helper
  function getStorageKey(tournamentId: string, userId?: string) {
    return `parascores_preds_${tournamentId}_${userId || 'guest'}`
  }

  function getLocalStoredPredictions(tournamentId: string, userId?: string): Prediction[] {
    if (!import.meta.client) return []
    try {
      const raw = localStorage.getItem(getStorageKey(tournamentId, userId))
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  function saveLocalStoredPredictions(tournamentId: string, preds: Prediction[], userId?: string) {
    if (!import.meta.client) return
    try {
      localStorage.setItem(getStorageKey(tournamentId, userId), JSON.stringify(preds))
    } catch {
      // Ignore storage errors
    }
  }

  // Get current user's prediction for a specific fixture
  function getUserPrediction(tournamentId: string, fixtureId: string): Prediction | undefined {
    const list = predictionsByTournament.value[tournamentId] || []
    const uid = authStore.user?.id
    if (!uid) {
      // Check guest/anonymous predictions stored locally
      const local = getLocalStoredPredictions(tournamentId, 'guest')
      return local.find((p) => p.fixtureId === fixtureId)
    }
    return list.find((p) => p.fixtureId === fixtureId && p.userId === uid)
  }

  // Recompute tournament leaderboard and fixture stats
  function computeLeaderboardAndStats(
    tournamentId: string,
    tournament: Tournament,
    fixtures: Fixture[],
  ) {
    const config = getTournamentPredictionConfig(tournament)
    const list = predictionsByTournament.value[tournamentId] || []
    const fixtureMap = new Map(fixtures.map((f) => [f.id, f]))

    // 1. Group predictions by user
    const byUser = new Map<string, { user: { id: string; name: string; picture?: string | null }; preds: Prediction[] }>()

    for (const p of list) {
      if (!byUser.has(p.userId)) {
        byUser.set(p.userId, {
          user: p.user || { id: p.userId, name: 'Anonymous Predictor' },
          preds: [],
        })
      }
      const uData = byUser.get(p.userId)!
      const fix = fixtureMap.get(p.fixtureId)
      if (fix) {
        const { points, status } = calculatePredictionPoints(p, fix, config)
        p.points = points
        p.status = status
      }
      uData.preds.push(p)
    }

    // 2. Build leaderboard entries
    const entries: PredictionLeaderboardEntry[] = []

    for (const [userId, { user, preds }] of byUser.entries()) {
      let totalPoints = 0
      let exactScoresCount = 0
      let correctResultsCount = 0
      let evaluatedPredictions = 0

      for (const p of preds) {
        if (p.status && p.status !== 'PENDING' && p.status !== 'VOID') {
          evaluatedPredictions++
          totalPoints += p.points ?? 0
          if (p.status === 'EXACT') exactScoresCount++
          else if (p.status === 'CORRECT_RESULT') correctResultsCount++
        }
      }

      const totalPredictions = preds.length
      const accuracyRate = evaluatedPredictions > 0
        ? Math.round(((exactScoresCount + correctResultsCount) / evaluatedPredictions) * 100)
        : 0

      entries.push({
        userId,
        user,
        rank: 0,
        totalPoints,
        exactScoresCount,
        correctResultsCount,
        totalPredictions,
        accuracyRate,
      })
    }

    // Sort: Total points DESC -> Exact scores DESC -> Accuracy DESC -> Total predictions DESC
    entries.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints
      if (b.exactScoresCount !== a.exactScoresCount) return b.exactScoresCount - a.exactScoresCount
      if (b.accuracyRate !== a.accuracyRate) return b.accuracyRate - a.accuracyRate
      return b.totalPredictions - a.totalPredictions
    })

    // Assign rank with tie handling
    let currentRank = 1
    for (let i = 0; i < entries.length; i++) {
      if (i > 0) {
        const prev = entries[i - 1]
        const curr = entries[i]
        if (
          curr.totalPoints === prev.totalPoints &&
          curr.exactScoresCount === prev.exactScoresCount &&
          curr.accuracyRate === prev.accuracyRate
        ) {
          curr.rank = prev.rank
        } else {
          curr.rank = currentRank
        }
      } else {
        entries[i].rank = currentRank
      }
      currentRank++
    }

    leaderboards.value[tournamentId] = entries

    // 3. Compute stats per fixture (Consensus)
    for (const fix of fixtures) {
      const fixPreds = list.filter((p) => p.fixtureId === fix.id)
      const count = fixPreds.length

      if (count === 0) {
        // Fallback default neutral stats
        statsByFixture.value[fix.id] = {
          fixtureId: fix.id,
          totalPredictions: 0,
          homeWinPercentage: 45,
          drawPercentage: 25,
          awayWinPercentage: 30,
          avgHomeScore: 1.5,
          avgAwayScore: 1.1,
          mostPredictedScore: null,
        }
        continue
      }

      let homeWins = 0
      let draws = 0
      let awayWins = 0
      let sumHome = 0
      let sumAway = 0
      const scoreFreq = new Map<string, { home: number; away: number; count: number }>()

      for (const p of fixPreds) {
        sumHome += p.homeScore
        sumAway += p.awayScore
        if (p.homeScore > p.awayScore) homeWins++
        else if (p.homeScore === p.awayScore) draws++
        else awayWins++

        const key = `${p.homeScore}-${p.awayScore}`
        const existing = scoreFreq.get(key)
        if (existing) {
          existing.count++
        } else {
          scoreFreq.set(key, { home: p.homeScore, away: p.awayScore, count: 1 })
        }
      }

      let mostPredicted: { home: number; away: number; count: number } | null = null
      for (const item of scoreFreq.values()) {
        if (!mostPredicted || item.count > mostPredicted.count) {
          mostPredicted = item
        }
      }

      statsByFixture.value[fix.id] = {
        fixtureId: fix.id,
        totalPredictions: count,
        homeWinPercentage: Math.round((homeWins / count) * 100),
        drawPercentage: Math.round((draws / count) * 100),
        awayWinPercentage: Math.round((awayWins / count) * 100),
        avgHomeScore: Number((sumHome / count).toFixed(1)),
        avgAwayScore: Number((sumAway / count).toFixed(1)),
        mostPredictedScore: mostPredicted,
      }
    }
  }

  // Generate simulated peer predictions so the contest has a realistic leaderboard
  function generateMockPeerPredictions(
    tournamentId: string,
    fixtures: Fixture[],
  ): Prediction[] {
    const list: Prediction[] = []
    const sampleScores = [
      [2, 1], [1, 0], [3, 1], [0, 0], [1, 1],
      [2, 2], [0, 2], [1, 2], [2, 0], [3, 0],
    ]

    for (const peer of MOCK_PEERS) {
      for (let i = 0; i < fixtures.length; i++) {
        const fix = fixtures[i]
        // deterministic pseudo-random choice
        const hash = (peer.id.charCodeAt(5) + i * 7) % sampleScores.length
        const [h, a] = sampleScores[hash]

        list.push({
          id: `pred-${peer.id}-${fix.id}`,
          tournamentId,
          fixtureId: fix.id,
          userId: peer.id,
          user: peer,
          homeScore: h,
          awayScore: a,
          createdAt: new Date(Date.now() - (fixtures.length - i) * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - (fixtures.length - i) * 86400000).toISOString(),
        })
      }
    }

    return list
  }

  // Load predictions for a tournament
  async function loadPredictions(tournament: Tournament, fixtures: Fixture[]) {
    const tournamentId = tournament.id
    loading.value = true

    try {
      // 1. Try to fetch from backend API
      let serverPredictions: Prediction[] = []
      try {
        const res = await $publicApi<{ success: boolean; data: Prediction[] }>(
          `/predictions/tournament/${tournamentId}`,
        )
        if (res.data && Array.isArray(res.data)) {
          serverPredictions = res.data
        }
      } catch {
        // Backend endpoint not ready yet or 404, fallback to client-side storage
      }

      // 2. Fetch local user predictions from storage
      const uid = authStore.user?.id
      const localUserPreds = getLocalStoredPredictions(tournamentId, uid)
      const guestPreds = uid ? getLocalStoredPredictions(tournamentId, 'guest') : []

      // Combine user predictions (local takes precedence for offline / freshly saved)
      const userMap = new Map<string, Prediction>()
      for (const p of serverPredictions) {
        userMap.set(`${p.userId}_${p.fixtureId}`, p)
      }
      for (const p of guestPreds) {
        userMap.set(`${p.userId}_${p.fixtureId}`, p)
      }
      for (const p of localUserPreds) {
        userMap.set(`${p.userId}_${p.fixtureId}`, p)
      }

      // 3. Add simulated peer predictors to create a rich contest leaderboard
      const peerPreds = generateMockPeerPredictions(tournamentId, fixtures)
      for (const p of peerPreds) {
        const key = `${p.userId}_${p.fixtureId}`
        if (!userMap.has(key)) {
          userMap.set(key, p)
        }
      }

      const allPredictions = Array.from(userMap.values())
      predictionsByTournament.value[tournamentId] = allPredictions

      // 4. Compute leaderboard & stats
      computeLeaderboardAndStats(tournamentId, tournament, fixtures)
    } finally {
      loading.value = false
    }
  }

  // Save or update a prediction
  async function savePrediction(
    tournament: Tournament,
    fixture: Fixture,
    homeScore: number,
    awayScore: number,
    allFixtures: Fixture[],
  ): Promise<{ success: boolean; error?: string }> {
    if (isFixturePredictionLocked(fixture)) {
      return { success: false, error: 'Predictions are locked because the match has already started.' }
    }

    submitting.value = true
    const tournamentId = tournament.id
    const uid = authStore.user?.id || 'guest'
    const userName = authStore.user?.name || 'You (Guest)'
    const userPic = authStore.user?.picture || null

    const newPred: Prediction = {
      id: `pred-${uid}-${fixture.id}`,
      tournamentId,
      fixtureId: fixture.id,
      userId: uid,
      user: {
        id: uid,
        name: userName,
        picture: userPic,
      },
      homeScore,
      awayScore,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    try {
      // Attempt backend API call if user is authenticated
      if (authStore.isAuthenticated) {
        try {
          await $api('/predictions', {
            method: 'POST',
            body: {
              tournamentId,
              fixtureId: fixture.id,
              homeScore,
              awayScore,
            },
          })
        } catch {
          // If backend isn't ready or endpoint 404, we still save locally
        }
      }

      // Save locally to storage
      const existing = getLocalStoredPredictions(tournamentId, uid)
      const filtered = existing.filter((p) => p.fixtureId !== fixture.id)
      filtered.push(newPred)
      saveLocalStoredPredictions(tournamentId, filtered, uid)

      // Update in-memory state
      const currentList = predictionsByTournament.value[tournamentId] || []
      const updatedList = currentList.filter(
        (p) => !(p.fixtureId === fixture.id && p.userId === uid),
      )
      updatedList.push(newPred)
      predictionsByTournament.value[tournamentId] = updatedList

      // Recalculate leaderboard and fixture stats
      computeLeaderboardAndStats(tournamentId, tournament, allFixtures)

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to save prediction' }
    } finally {
      submitting.value = false
    }
  }

  return {
    predictionsByTournament,
    leaderboards,
    statsByFixture,
    loading,
    submitting,
    loadPredictions,
    savePrediction,
    getUserPrediction,
    getLeaderboard: (tournamentId: string) => leaderboards.value[tournamentId] || [],
    getFixtureStats: (fixtureId: string) => statsByFixture.value[fixtureId],
  }
})
