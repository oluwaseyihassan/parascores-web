import type { SportEngine } from '~/engines/types'
import { TournamentType } from '~/types'
import EsportsPanel from './panel.vue'

export const esportsEngine: SportEngine = {
  key: 'esports',
  label: 'Esports',
  scoreLabel: 'Score',
  panel: EsportsPanel,
  capabilities: {
    timer: 'none',
    penalties: false,
    lineups: false,
    substitutions: false,
    cards: false,
    motm: false,
    selfReporting: true,
    proofEvidence: true,
    disputes: true,
    gamerTags: true,
  },
  creation: {
    formats: [
      TournamentType.KNOCKOUT,
      TournamentType.LEAGUE,
      TournamentType.ROUND_ROBIN,
      TournamentType.GROUP,
      TournamentType.HYBRID,
    ],
    options: {
      twoLegs: true,
      thirdPlaceMatch: true,
      doubleRoundRobin: true,
    },
  },
}
