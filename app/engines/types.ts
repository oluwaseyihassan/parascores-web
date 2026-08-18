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
  capabilities: SportEngineCapabilities
}
