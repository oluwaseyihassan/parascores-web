import type { SportEngine } from '~/engines/types'
import { footballEngine } from '~/engines/football'
import { basketballEngine } from '~/engines/basketball'
import { tennisEngine } from '~/engines/tennis'
import { tableTennisEngine } from '~/engines/tabletennis'
import { volleyballEngine } from '~/engines/volleyball'
import { badmintonEngine } from '~/engines/badminton'
import { handballEngine } from '~/engines/handball'
import { rugbyEngine } from '~/engines/rugby'
import { athleticsEngine } from '~/engines/athletics'
import { swimmingEngine } from '~/engines/swimming'
import { cyclingEngine } from '~/engines/cycling'
import { weightliftingEngine } from '~/engines/weightlifting'
import { boxingEngine, judoEngine, taekwondoEngine, wrestlingEngine } from '~/engines/combat'
import { esportsEngine } from '~/engines/esports'

const engines: Record<string, SportEngine> = {
  football: footballEngine,
  basketball: basketballEngine,
  tennis: tennisEngine,
  tabletennis: tableTennisEngine,
  volleyball: volleyballEngine,
  badminton: badmintonEngine,
  handball: handballEngine,
  rugby: rugbyEngine,
  athletics: athleticsEngine,
  swimming: swimmingEngine,
  cycling: cyclingEngine,
  weightlifting: weightliftingEngine,
  boxing: boxingEngine,
  judo: judoEngine,
  taekwondo: taekwondoEngine,
  wrestling: wrestlingEngine,
  esports: esportsEngine,
}

const ESPORTS_ALIASES = new Set([
  'esports',
  'esport',
  'fifa',
  'efootball',
  'eafc',
  'pes',
  'valorant',
  'cod',
  'callofduty',
  'rocketleague',
  'tekken',
  'streetfighter',
  'pubg',
  'apex',
  'fortnite',
  'lol',
  'dota',
  'nba2k',
  'madden',
])

/**
 * Resolve the sport engine for a tournament's `sport` string.
 * Unknown/missing sports fall back to football (the current behavior
 * everywhere in the app), so existing tournaments are unaffected.
 */
export function resolveEngine(sport?: string | null): SportEngine {
  // Normalize: "Table Tennis" / "table-tennis" / "TableTennis" → "tabletennis"
  const key = (sport ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
  if (ESPORTS_ALIASES.has(key)) return esportsEngine
  return engines[key] ?? footballEngine
}

// Currently visible sports in tournament creation / settings
const ACTIVE_SPORT_KEYS = ['football', 'esports']

/**
 * List registered sport engines.
 * By default returns only the active sports (Football, Esports).
 * Pass `{ all: true }` to retrieve all registered engines.
 */
export function listEngines(options?: { all?: boolean }): SportEngine[] {
  if (options?.all) return Object.values(engines)
  return ACTIVE_SPORT_KEYS.map((k) => engines[k]).filter(Boolean) as SportEngine[]
}
