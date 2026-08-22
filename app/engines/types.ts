import type { InjectionKey, ComputedRef, Component } from 'vue'
import type { Fixture } from '~/types'
import { TournamentType, ParticipantType } from '~/types'

/** Which creation-form options a sport engine supports */
export interface EngineCreationConfig {
  /** Tournament formats offered at creation */
  formats: TournamentType[]
  /** Force a participant type (races are always individuals) */
  participantType?: ParticipantType
  options: {
    /** Two-legged knockout ties */
    twoLegs: boolean
    /** Third-place playoff */
    thirdPlaceMatch: boolean
    /** Double round robin */
    doubleRoundRobin: boolean
  }
}

export type EngineTimerMode = 'halves' | 'periods' | 'none'

export interface SportEngineCapabilities {
  /** Clock model the control surface uses */
  timer: EngineTimerMode
  /** Penalty shootout panel (knockout tiebreaks) */
  penalties: boolean
  /** Starting lineups editor */
  lineups: boolean
  /** Player substitutions */
  substitutions: boolean
  /** Yellow/red card events */
  cards: boolean
  /** Man-of-the-match voting */
  motm: boolean
}

export interface SportEngine {
  /** Registry key, matched against Tournament.sport (case-insensitive) */
  key: string
  label: string
  /** Verb for the main scoring action, e.g. "Goal" (football) vs "Points" (basketball) */
  scoreLabel: string
  /** Number of periods when timer mode is 'periods' (e.g. 4 quarters) */
  periods?: number
  /** Quick-score increments offered by the scoring panel (e.g. [1,2,3] for basketball) */
  scoreIncrements?: number[]
  /** Set-based scoring config (tennis, table tennis, volleyball). Defaults; overridable per-tournament via scoringRules.setsToWin / scoringRules.gamesPerSet */
  setScoring?: { setsToWin: number; gamesPerSet: number; gameLabel: string }
  /** Placement-based racing (athletics, swimming). valueLabel shown on inputs (e.g. "Time"), placeholder hint (e.g. "10.42") */
  race?: { valueLabel: string; valuePlaceholder: string }
  /** Creation-form surface. Absent = everything available (football default). */
  creation?: EngineCreationConfig
  /** The live-tab scoring surface. Rendered by MatchControl as <component :is>. */
  panel: Component
  /** Full control surface replacing MatchControl entirely (e.g. races are events, not matches) */
  control?: Component
  /** Clock label for the scoreboard (e.g. "Q2"). Absent = halves labels. */
  formatPeriodLabel?: (fixture: Fixture) => string
  capabilities: SportEngineCapabilities
}

/** Provided by MatchControl so child components can adapt per sport */
export const SportEngineKey: InjectionKey<ComputedRef<SportEngine>> =
  Symbol('sport-engine')
