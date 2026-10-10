import type { SportEngine } from '~/engines/types'
import { TournamentType, ParticipantType } from '~/types'
import RaceResultsPanel from '~/engines/_shared/RaceResultsPanel.vue'
import RaceControl from '~/engines/_shared/RaceControl.vue'

export const swimmingEngine: SportEngine = {
  key: 'swimming',
  label: 'Swimming',
  scoreLabel: 'Place',
  race: { valueLabel: 'Time', valuePlaceholder: '2:03.44' },
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
