import type { SportEngine } from '~/engines/types'
import FootballPanel from './panel.vue'

export const footballEngine: SportEngine = {
  key: 'football',
  label: 'Football',
  scoreLabel: 'Goal',
  panel: FootballPanel,
  capabilities: {
    timer: 'halves',
    penalties: true,
    lineups: true,
    substitutions: true,
    cards: true,
    motm: true,
  },
}
