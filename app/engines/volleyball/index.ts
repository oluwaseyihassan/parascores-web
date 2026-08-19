import type { SportEngine } from '~/engines/types'
import SetScoringPanel from '~/engines/_shared/SetScoringPanel.vue'

export const volleyballEngine: SportEngine = {
  key: 'volleyball',
  label: 'Volleyball',
  scoreLabel: 'Set',
  setScoring: { setsToWin: 3, gamesPerSet: 25, gameLabel: 'Point' },
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
