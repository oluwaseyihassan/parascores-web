import type { Ref } from 'vue'
import type { Fixture } from '~/types'

/**
 * Shared optimistic score updates for engine scoring panels.
 * Used by any engine whose scoring is "adjust a number" (basketball +2,
 * football individual −1, etc). Engines with event-modals (football goals)
 * don't need this.
 */
export function useScoreUpdate(options: {
  fixture: Ref<Fixture | null>
  onFixtureUpdated: (fixture: Fixture) => void
}) {
  const fixtureStore = useFixtureStore()
  const { handleError } = useErrors()
  const updating = ref(false)

  const changeScore = async (team: 'home' | 'away', delta: number) => {
    const fixture = options.fixture.value
    if (!fixture) return

    const currentScore =
      team === 'home' ? (fixture.homeScore ?? 0) : (fixture.awayScore ?? 0)
    const newScore = Math.max(0, currentScore + delta)
    if (newScore === currentScore) return

    if (team === 'home') fixture.homeScore = newScore
    else fixture.awayScore = newScore

    updating.value = true
    try {
      await fixtureStore.updateFixture(fixture.id, {
        homeScore: fixture.homeScore,
        awayScore: fixture.awayScore,
      })
      options.onFixtureUpdated(fixture)
    } catch (error: any) {
      if (team === 'home') fixture.homeScore = currentScore
      else fixture.awayScore = currentScore
      handleError(error, { title: 'Failed to update score' })
    } finally {
      updating.value = false
    }
  }

  return { changeScore, updating }
}
