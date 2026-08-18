import type { SportEngine } from '~/engines/types'
import type { Fixture } from '~/types'
import { getMatchElapsedSeconds } from '~/composables/useMatchTimer'
import BasketballPanel from './panel.vue'

export const basketballEngine: SportEngine = {
  key: 'basketball',
  label: 'Basketball',
  scoreLabel: 'Points',
  periods: 4,
  scoreIncrements: [1, 2, 3],
  panel: BasketballPanel,
  formatPeriodLabel: (fixture: Fixture) => {
    const periods = 4
    const elapsed = getMatchElapsedSeconds(fixture) ?? 0
    const totalSeconds = (fixture.matchDuration ?? 48) * 60
    const periodSeconds = totalSeconds / periods
    const current = Math.min(periods, Math.floor(elapsed / periodSeconds) + 1)
    return `Q${current}`
  },
  capabilities: {
    timer: 'periods',
    penalties: false,
    lineups: false,
    substitutions: false,
    cards: false,
    motm: false,
  },
}
