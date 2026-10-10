import type { SportEngine } from '~/engines/types'
import { TournamentType } from '~/types'
import BasketballPanel from '~/engines/basketball/panel.vue'

// Handball: football-shaped (halves clock, goals) without cards/subs/lineups.
// The basketball panel is the generic increment scorer.
export const handballEngine: SportEngine = {
  key: 'handball',
  label: 'Handball',
  scoreLabel: 'Goal',
  scoreIncrements: [1],
  panel: BasketballPanel,
  creation: {
    formats: [TournamentType.KNOCKOUT, TournamentType.LEAGUE, TournamentType.ROUND_ROBIN, TournamentType.GROUP, TournamentType.HYBRID, TournamentType.FRIENDLY],
    options: { twoLegs: false, thirdPlaceMatch: true, doubleRoundRobin: true },
  },
  capabilities: {
    timer: 'halves',
    penalties: false,
    lineups: false,
    substitutions: false,
    cards: false,
    motm: false,
  },
}
