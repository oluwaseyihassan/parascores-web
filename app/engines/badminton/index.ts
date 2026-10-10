import type { SportEngine } from '~/engines/types'
import { TournamentType } from '~/types'
import SetScoringPanel from '~/engines/_shared/SetScoringPanel.vue'

export const badmintonEngine: SportEngine = {
  key: 'badminton',
  label: 'Badminton',
  scoreLabel: 'Game',
  // Best of 3 games to 21
  setScoring: { setsToWin: 2, gamesPerSet: 21, gameLabel: 'Point' },
  panel: SetScoringPanel,
  creation: {
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
