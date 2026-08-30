import type { SportEngine } from '~/engines/types'
import { TournamentType } from '~/types'
import SetScoringPanel from '~/engines/_shared/SetScoringPanel.vue'

export const tableTennisEngine: SportEngine = {
  key: 'tabletennis',
  label: 'Table Tennis',
  scoreLabel: 'Game',
  setScoring: { setsToWin: 3, gamesPerSet: 11, gameLabel: 'Point' },
  panel: SetScoringPanel,
  creation: {
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
