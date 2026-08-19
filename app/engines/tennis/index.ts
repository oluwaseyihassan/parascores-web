import type { SportEngine } from '~/engines/types'
import SetScoringPanel from '~/engines/_shared/SetScoringPanel.vue'

export const tennisEngine: SportEngine = {
  key: 'tennis',
  label: 'Tennis',
  scoreLabel: 'Set',
  setScoring: { setsToWin: 2, gamesPerSet: 6, gameLabel: 'Game' },
  panel: SetScoringPanel,
  capabilities: {
    timer: 'none',
    penalties: false,
    lineups: false,
    substitutions: false,
    cards: false,
    motm: false,
  },
}
