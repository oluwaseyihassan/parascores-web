import type { SportEngine } from '~/engines/types'
import { TournamentType, ParticipantType } from '~/types'
import RaceResultsPanel from '~/engines/_shared/RaceResultsPanel.vue'
import RaceControl from '~/engines/_shared/RaceControl.vue'

// Weightlifting: placement by total lifted — HIGHEST value wins.
export const weightliftingEngine: SportEngine = {
  key: 'weightlifting',
  label: 'Weightlifting',
  scoreLabel: 'Place',
  race: { valueLabel: 'Total (kg)', valuePlaceholder: '220', direction: 'high' },
  panel: RaceResultsPanel,
  control: RaceControl,
  creation: {
    formats: [TournamentType.RACE, TournamentType.FRIENDLY],
    participantType: ParticipantType.INDIVIDUAL,
    options: { twoLegs: false, thirdPlaceMatch: false, doubleRoundRobin: false },
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
