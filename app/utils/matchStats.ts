import type { Fixture, FixtureMatchStats, TeamMatchStats } from '~/types'
import { MatchEventType } from '~/types'

export interface StatMetricItem {
  key: keyof TeamMatchStats
  label: string
  category: 'general' | 'distribution' | 'discipline'
  isPercentage?: boolean
  higherIsBetter?: boolean
}

export const MATCH_STAT_METRICS: StatMetricItem[] = [
  // General
  { key: 'possession', label: 'Ball Possession', category: 'general', isPercentage: true, higherIsBetter: true },
  { key: 'shots', label: 'Total Shots', category: 'general', higherIsBetter: true },
  { key: 'shotsOnTarget', label: 'Shots on Target', category: 'general', higherIsBetter: true },
  { key: 'corners', label: 'Corner Kicks', category: 'general', higherIsBetter: true },

  // Distribution
  { key: 'passes', label: 'Passes Completed', category: 'distribution', higherIsBetter: true },
  { key: 'saves', label: 'Goalkeeper Saves', category: 'distribution', higherIsBetter: true },

  // Discipline
  { key: 'fouls', label: 'Fouls', category: 'discipline', higherIsBetter: false },
  { key: 'offsides', label: 'Offsides', category: 'discipline', higherIsBetter: false },
  { key: 'yellowCards', label: 'Yellow Cards', category: 'discipline', higherIsBetter: false },
  { key: 'redCards', label: 'Red Cards', category: 'discipline', higherIsBetter: false },
]

export function getEventCards(fixture: Fixture | null) {
  const result = {
    homeYellow: 0,
    awayYellow: 0,
    homeRed: 0,
    awayRed: 0,
  }
  if (!fixture || !fixture.matchEvents) return result

  for (const event of fixture.matchEvents) {
    const isHome = event.participant_id === fixture.homeTeamId
    if (event.type === MatchEventType.YELLOW_CARD) {
      if (isHome) result.homeYellow++
      else result.awayYellow++
    } else if (event.type === MatchEventType.RED_CARD) {
      if (isHome) result.homeRed++
      else result.awayRed++
    }
  }

  return result
}

export function resolveTeamStats(
  fixture: Fixture | null
): { home: TeamMatchStats; away: TeamMatchStats; hasRecordedStats: boolean } {
  const rawStats = (fixture?.config as any)?.stats as FixtureMatchStats | undefined
  const eventCards = getEventCards(fixture)

  const hasExplicitStats = Boolean(
    rawStats &&
    (rawStats.home?.shots !== undefined ||
      rawStats.away?.shots !== undefined ||
      rawStats.home?.possession !== undefined ||
      rawStats.away?.possession !== undefined ||
      rawStats.home?.corners !== undefined ||
      rawStats.away?.corners !== undefined ||
      rawStats.home?.fouls !== undefined ||
      rawStats.away?.fouls !== undefined ||
      rawStats.home?.passes !== undefined ||
      rawStats.away?.passes !== undefined ||
      rawStats.home?.saves !== undefined ||
      rawStats.away?.saves !== undefined)
  )

  const defaultPossession = hasExplicitStats ? 50 : 50

  const home: TeamMatchStats = {
    possession: rawStats?.home?.possession ?? defaultPossession,
    shots: rawStats?.home?.shots ?? 0,
    shotsOnTarget: rawStats?.home?.shotsOnTarget ?? 0,
    corners: rawStats?.home?.corners ?? 0,
    fouls: rawStats?.home?.fouls ?? 0,
    offsides: rawStats?.home?.offsides ?? 0,
    saves: rawStats?.home?.saves ?? 0,
    passes: rawStats?.home?.passes ?? 0,
    yellowCards: rawStats?.home?.yellowCards ?? eventCards.homeYellow,
    redCards: rawStats?.home?.redCards ?? eventCards.homeRed,
  }

  const away: TeamMatchStats = {
    possession: rawStats?.away?.possession ?? (100 - (home.possession ?? 50)),
    shots: rawStats?.away?.shots ?? 0,
    shotsOnTarget: rawStats?.away?.shotsOnTarget ?? 0,
    corners: rawStats?.away?.corners ?? 0,
    fouls: rawStats?.away?.fouls ?? 0,
    offsides: rawStats?.away?.offsides ?? 0,
    saves: rawStats?.away?.saves ?? 0,
    passes: rawStats?.away?.passes ?? 0,
    yellowCards: rawStats?.away?.yellowCards ?? eventCards.awayYellow,
    redCards: rawStats?.away?.redCards ?? eventCards.awayRed,
  }

  const hasEventCards = (eventCards.homeYellow + eventCards.awayYellow + eventCards.homeRed + eventCards.awayRed) > 0
  const hasRecordedStats = hasExplicitStats || hasEventCards

  return { home, away, hasRecordedStats }
}
