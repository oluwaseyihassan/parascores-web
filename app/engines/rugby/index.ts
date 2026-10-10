import type { SportEngine } from '~/engines/types'
import { TournamentType } from '~/types'
import BasketballPanel from '~/engines/basketball/panel.vue'

// Rugby: halves clock with try (5) / conversion (2) / penalty & drop goal (3).
// The basketball panel is the generic increment scorer.
export const rugbyEngine: SportEngine = {
  key: 'rugby',
  label: 'Rugby',
  scoreLabel: 'Points',
  scoreIncrements: [5, 2, 3],
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
