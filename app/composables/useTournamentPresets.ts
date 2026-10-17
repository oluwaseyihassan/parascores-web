import { TournamentType } from '~/types'

export interface TournamentPreset {
  id: string
  label: string
  tag: string
  summary: string
  description: string
  icon: string
  type: TournamentType
  unifiedStandings: boolean
  flowSteps: string[]
}

export const TOURNAMENT_PRESETS: TournamentPreset[] = [
  {
    id: 'world_cup',
    label: 'World Cup / Euro Style',
    tag: 'FIFA World Cup, AFCON',
    summary: 'Groups Stage → Knockout Bracket',
    description: 'Teams are divided into groups (A, B, C...). Top teams from each group advance to single or two-legged playoff brackets.',
    icon: 'i-heroicons-globe-alt',
    type: TournamentType.HYBRID,
    unifiedStandings: false,
    flowSteps: ['Group Stage', 'Top Teams Qualify', 'Playoff Bracket', 'Champion']
  },
  {
    id: 'champions_league',
    label: 'Champions League Style',
    tag: 'UEFA Champions League',
    summary: 'Unified League Phase → Seeded Knockouts',
    description: 'Teams seeded in pots play cross-pot matches. All teams compete on ONE single 36-team league table with top seeds advancing to playoffs.',
    icon: 'i-heroicons-sparkles',
    type: TournamentType.HYBRID,
    unifiedStandings: true,
    flowSteps: ['Seeding Pots', '1 Shared League Table', 'Seeded Playoff Bracket', 'Champion']
  },
  {
    id: 'league',
    label: 'Classic League Table',
    tag: 'Premier League, La Liga',
    summary: 'Single Standings Table Ranking',
    description: 'All teams compete on one shared table. Play single or home & away round-robin matches; most points at the end wins the title.',
    icon: 'i-heroicons-table-cells',
    type: TournamentType.LEAGUE,
    unifiedStandings: false,
    flowSteps: ['All Teams in 1 Table', 'Round-Robin Matchdays', 'Table Winner Crowned']
  },
  {
    id: 'knockout',
    label: 'Knockout Cup',
    tag: 'FA Cup, March Madness',
    summary: 'Single Elimination Bracket',
    description: 'Straight elimination cup bracket. Win and advance to the next round, lose and you are eliminated.',
    icon: 'i-heroicons-trophy',
    type: TournamentType.KNOCKOUT,
    unifiedStandings: false,
    flowSteps: ['Opening Round', 'Quarterfinals', 'Semifinals', 'Final']
  },
  {
    id: 'groups_only',
    label: 'Group Stage Only',
    tag: 'Multi-Group Festivals',
    summary: 'Groups without Knockout Stage',
    description: 'Multiple round-robin groups playing independently, crowning winners inside each group with no subsequent playoff bracket.',
    icon: 'i-heroicons-squares-2x2',
    type: TournamentType.GROUP,
    unifiedStandings: false,
    flowSteps: ['Multiple Groups', 'Group Standings Tables', 'Group Winners Crowned']
  },
  {
    id: 'race',
    label: 'Race / Event Final',
    tag: 'Track & Field, Swimming',
    summary: 'Ranked by Time, Distance or Points',
    description: 'All participants compete in a single race or event and are placed by final result or score.',
    icon: 'i-heroicons-flag',
    type: TournamentType.RACE,
    unifiedStandings: false,
    flowSteps: ['Participants Line Up', 'Event Final', 'Podium Rankings']
  },
  {
    id: 'friendly',
    label: 'Single Match / Friendly',
    tag: 'Exhibition, Derby',
    summary: 'One-off Exhibition Game',
    description: 'A standalone match without group tables or multi-round tournament brackets.',
    icon: 'i-heroicons-bolt',
    type: TournamentType.FRIENDLY,
    unifiedStandings: false,
    flowSteps: ['Single Game', 'Match Result']
  }
]

export function getPresetIdFromState(type?: TournamentType | string, unifiedStandings?: boolean): string {
  if (type === TournamentType.HYBRID) {
    return unifiedStandings ? 'champions_league' : 'world_cup'
  }
  if (type === TournamentType.LEAGUE || type === TournamentType.ROUND_ROBIN) {
    return 'league'
  }
  if (type === TournamentType.KNOCKOUT) {
    return 'knockout'
  }
  if (type === TournamentType.GROUP) {
    return 'groups_only'
  }
  if (type === TournamentType.RACE) {
    return 'race'
  }
  if (type === TournamentType.FRIENDLY) {
    return 'friendly'
  }
  return 'world_cup'
}

export function getPresetById(id: string): TournamentPreset {
  return TOURNAMENT_PRESETS.find(p => p.id === id) || TOURNAMENT_PRESETS[0]!
}
