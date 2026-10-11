import { computed, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { resolveEngine } from '~/engines/registry'
import type { Tournament } from '~/types'

/**
 * Feature detection & capabilities for a tournament.
 * Dispatches between physical sports (official referee scoring via MatchControl)
 * and esports/self-reporting formats (double-entry player submissions, proof evidence, disputes).
 */
export function useTournamentFeatures(tournamentSource: MaybeRefOrGetter<Tournament | null | undefined>) {
  const tournament = computed(() => toValue(tournamentSource))
  const engine = computed(() => resolveEngine(tournament.value?.sport))

  /**
   * Whether players self-report scores via double-entry verification.
   * Can be explicitly enabled or disabled in tournament config, defaulting to the sport engine's capabilities.
   */
  const allowsSelfReporting = computed(() => {
    const t = tournament.value
    if (!t) return false
    const config = (t as any).config
    if (typeof config?.selfReporting === 'boolean') {
      return config.selfReporting
    }
    return engine.value.capabilities.selfReporting ?? false
  })

  /**
   * Whether this tournament is categorized under the Esports engine.
   */
  const isEsports = computed(() => {
    return engine.value.key === 'esports'
  })

  /**
   * Whether screenshot evidence/proof is supported for score submissions.
   */
  const requiresProof = computed(() => {
    return allowsSelfReporting.value && (engine.value.capabilities.proofEvidence ?? true)
  })

  return {
    engine,
    isEsports,
    allowsSelfReporting,
    requiresProof,
    capabilities: computed(() => engine.value.capabilities),
  }
}
