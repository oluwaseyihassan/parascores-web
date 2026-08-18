import type { SportEngine } from '~/engines/types'

export const footballEngine: SportEngine = {
  key: 'football',
  label: 'Football',
  scoreLabel: 'Goal',
  capabilities: {
    timer: 'halves',
    penalties: true,
    lineups: true,
    substitutions: true,
    cards: true,
    motm: true,
  },
}
