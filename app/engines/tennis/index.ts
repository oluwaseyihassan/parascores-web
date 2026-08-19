import type { SportEngine } from '~/engines/types'
import TennisPanel from './panel.vue'

export const tennisEngine: SportEngine = {
  key: 'tennis',
  label: 'Tennis',
  scoreLabel: 'Set',
  panel: TennisPanel,
  capabilities: {
    timer: 'none',
    penalties: false,
    lineups: false,
    substitutions: false,
    cards: false,
    motm: false,
  },
}
