import type { InjectionKey, ComputedRef, Component } from 'vue'
import type { Fixture } from '~/types'

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
  /** The live-tab scoring surface. Rendered by MatchControl as <component :is>. */
  panel: Component
  /** Clock label for the scoreboard (e.g. "Q2"). Absent = halves labels. */
  formatPeriodLabel?: (fixture: Fixture) => string
  capabilities: SportEngineCapabilities
}

/** Provided by MatchControl so child components can adapt per sport */
export const SportEngineKey: InjectionKey<ComputedRef<SportEngine>> =
  Symbol('sport-engine')
