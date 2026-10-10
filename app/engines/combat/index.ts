import type { SportEngine } from '~/engines/types'
import type { Fixture } from '~/types'
import { TournamentType, ParticipantType } from '~/types'
import { getMatchElapsedSeconds } from '~/composables/useMatchTimer'
import CombatPanel from '~/engines/combat/CombatPanel.vue'

/**
 * Combat sports share one engine shape: points per fighter, rounds clock,
 * and a result type (Decision/KO/TKO/DQ) with an explicit winner for
 * stoppages that end level on points. Knockout brackets with no third-place
 * match award double bronze automatically (see medal aggregation).
 */

const roundLabel = (periods: number) => (fixture: Fixture) => {
  const elapsed = getMatchElapsedSeconds(fixture) ?? 0
  const totalSeconds = (fixture.matchDuration ?? periods * 3) * 60
  const roundSeconds = totalSeconds / periods
  const current = Math.min(periods, Math.floor(elapsed / roundSeconds) + 1)
  return `R${current}`
}

const combat = (
  key: string,
  label: string,
  rounds: number,
  increments: number[],
): SportEngine => ({
  key,
  label,
  scoreLabel: 'Points',
  periods: rounds,
  scoreIncrements: increments,
  panel: CombatPanel,
  formatPeriodLabel: roundLabel(rounds),
  creation: {
    // Combat brackets are straight knockout; bronzes come from both SF losers
    formats: [TournamentType.KNOCKOUT, TournamentType.FRIENDLY],
    participantType: ParticipantType.INDIVIDUAL,
    options: { twoLegs: false, thirdPlaceMatch: false, doubleRoundRobin: false },
  },
  capabilities: {
    timer: 'periods',
    penalties: false,
    lineups: false,
    substitutions: false,
    cards: false,
    motm: false,
  },
})

export const boxingEngine = combat('boxing', 'Boxing', 3, [1])
export const judoEngine = combat('judo', 'Judo', 1, [1])
export const taekwondoEngine = combat('taekwondo', 'Taekwondo', 3, [1, 2, 3, 4])
export const wrestlingEngine = combat('wrestling', 'Wrestling', 2, [1, 2, 4])
