import type { SportEngine } from '~/engines/types'
import SetScoringPanel from '~/engines/_shared/SetScoringPanel.vue'

export const tableTennisEngine: SportEngine = {
  key: 'tabletennis',
  label: 'Table Tennis',
  scoreLabel: 'Game',
  setScoring: { setsToWin: 3, gamesPerSet: 11, gameLabel: 'Point' },
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
