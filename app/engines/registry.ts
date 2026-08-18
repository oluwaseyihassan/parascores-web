import type { SportEngine } from '~/engines/types'
import { footballEngine } from '~/engines/football'

const engines: Record<string, SportEngine> = {
  football: footballEngine,
}

/**
 * Resolve the sport engine for a tournament's `sport` string.
 * Unknown/missing sports fall back to football (the current behavior
 * everywhere in the app), so existing tournaments are unaffected.
 */
export function resolveEngine(sport?: string | null): SportEngine {
  const key = (sport ?? '').trim().toLowerCase()
  return engines[key] ?? footballEngine
}

export function listEngines(): SportEngine[] {
  return Object.values(engines)
}
