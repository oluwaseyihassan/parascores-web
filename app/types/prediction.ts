import type { User, Fixture } from './index'

export type PredictionOutcomeStatus = 'PENDING' | 'EXACT' | 'CORRECT_RESULT' | 'INCORRECT' | 'VOID'

export interface PredictionConfig {
  enabled: boolean
  exactScorePoints: number
  correctResultPoints: number
}

export interface Prediction {
  id: string
  tournamentId: string
  fixtureId: string
  userId: string
  user?: {
    id: string
    name: string
    picture?: string | null
  } | null
  homeScore: number
  awayScore: number
  points?: number | null
  status?: PredictionOutcomeStatus
  createdAt: string
  updatedAt: string
}

export interface PredictionLeaderboardEntry {
  userId: string
  user: {
    id: string
    name: string
    picture?: string | null
  }
  rank: number
  totalPoints: number
  exactScoresCount: number
  correctResultsCount: number
  totalPredictions: number
  accuracyRate: number // 0 to 100 percentage
}

export interface FixturePredictionStats {
  fixtureId: string
  totalPredictions: number
  homeWinPercentage: number
  drawPercentage: number
  awayWinPercentage: number
  avgHomeScore: number
  avgAwayScore: number
  mostPredictedScore: {
    home: number
    away: number
    count: number
  } | null
}
