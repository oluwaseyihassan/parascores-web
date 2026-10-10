import type { SportEngine } from '~/engines/types'
import { TournamentType, ParticipantType } from '~/types'
import RaceResultsPanel from '~/engines/_shared/RaceResultsPanel.vue'
import RaceControl from '~/engines/_shared/RaceControl.vue'

// Cycling: placement by time — lowest wins; supports h:mm:ss durations.
export const cyclingEngine: SportEngine = {
  key: 'cycling',
  label: 'Cycling',
  scoreLabel: 'Place',
  race: { valueLabel: 'Time', valuePlaceholder: '1:02:33', direction: 'low' },
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
