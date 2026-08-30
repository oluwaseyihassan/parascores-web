import type { SportEngine } from '~/engines/types'
import { TournamentType } from '~/types'
import SetScoringPanel from '~/engines/_shared/SetScoringPanel.vue'

export const tennisEngine: SportEngine = {
  key: 'tennis',
  label: 'Tennis',
  scoreLabel: 'Set',
  setScoring: { setsToWin: 2, gamesPerSet: 6, gameLabel: 'Game' },
  panel: SetScoringPanel,
  creation: {
    // Sets sports: single-elimination or one-off matches only
    formats: [TournamentType.KNOCKOUT, TournamentType.FRIENDLY],
    options: { twoLegs: false, thirdPlaceMatch: true, doubleRoundRobin: false },
  },
  capabilities: {
    timer: 'none',
    penalties: false,
    lineups: false,
    substitutions: false,
    cards: false,
    motm: false,
  },
}
