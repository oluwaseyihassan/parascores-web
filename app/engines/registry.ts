import type { SportEngine } from '~/engines/types'
import { footballEngine } from '~/engines/football'
import { basketballEngine } from '~/engines/basketball'
import { tennisEngine } from '~/engines/tennis'
import { tableTennisEngine } from '~/engines/tabletennis'
import { volleyballEngine } from '~/engines/volleyball'

const engines: Record<string, SportEngine> = {
  football: footballEngine,
  basketball: basketballEngine,
  tennis: tennisEngine,
  tabletennis: tableTennisEngine,
  volleyball: volleyballEngine,
}

/**
 * Resolve the sport engine for a tournament's `sport` string.
 * Unknown/missing sports fall back to football (the current behavior
 * everywhere in the app), so existing tournaments are unaffected.
 */
export function resolveEngine(sport?: string | null): SportEngine {
  // Normalize: "Table Tennis" / "table-tennis" / "TableTennis" → "tabletennis"
  const key = (sport ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
  return engines[key] ?? footballEngine
}

export function listEngines(): SportEngine[] {
  return Object.values(engines)
}
