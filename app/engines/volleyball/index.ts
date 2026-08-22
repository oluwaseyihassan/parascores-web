import type { SportEngine } from '~/engines/types'
import { TournamentType } from '~/types'
import SetScoringPanel from '~/engines/_shared/SetScoringPanel.vue'

export const volleyballEngine: SportEngine = {
  key: 'volleyball',
  label: 'Volleyball',
  scoreLabel: 'Set',
  setScoring: { setsToWin: 3, gamesPerSet: 25, gameLabel: 'Point' },
  panel: SetScoringPanel,
  creation: {
    // Volleyball commonly runs groups + knockout
    formats: [TournamentType.KNOCKOUT, TournamentType.HYBRID, TournamentType.GROUP, TournamentType.FRIENDLY],
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
