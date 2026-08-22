import type { SportEngine } from '~/engines/types'
import { TournamentType, ParticipantType } from '~/types'
import RaceResultsPanel from '~/engines/_shared/RaceResultsPanel.vue'
import RaceControl from '~/engines/_shared/RaceControl.vue'

export const athleticsEngine: SportEngine = {
  key: 'athletics',
  label: 'Athletics',
  scoreLabel: 'Place',
  race: { valueLabel: 'Time', valuePlaceholder: '10.42' },
  panel: RaceResultsPanel,
  control: RaceControl,
  creation: {
    // Dedicated race format: one fixture ("Final") with all participants ranked
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
