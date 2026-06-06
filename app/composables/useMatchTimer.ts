import { onMounted, onUnmounted, ref } from 'vue'
import type { Fixture } from '~/types'
import { FixtureStatus } from '~/types'

type TimerFixture = Pick<Fixture, 'status' | 'startTime'> & {
  timerStartedAt?: string | null
  timerElapsedSeconds?: number | null
  timerIsRunning?: boolean | null
  actualStartTime?: string | null
  liveStartedAt?: string | null
  startedAt?: string | null
  kickoffTime?: string | null
  matchDuration?: number | null
}

/**
 * Calculate elapsed seconds for a fixture, supporting pause/resume via DB fields.
 *
 * Logic:
 *  - If `timerIsRunning` is true and `timerStartedAt` is set:
 *      elapsed = timerElapsedSeconds + (now - timerStartedAt)
 *  - If `timerIsRunning` is false (paused/halftime):
 *      elapsed = timerElapsedSeconds  (static)
 *  - Fallback (legacy): derive from startTime if no timer fields present
 */
export function getMatchElapsedSeconds(fixture?: TimerFixture | null, nowMs = Date.now()) {
  if (!fixture || fixture.status !== FixtureStatus.LIVE) return null

  const savedElapsed = fixture.timerElapsedSeconds ?? 0

  // New timer system: timerIsRunning explicitly controls whether the clock ticks
  if (fixture.timerIsRunning && fixture.timerStartedAt) {
    const startMs = new Date(fixture.timerStartedAt).getTime()
    if (Number.isNaN(startMs)) return savedElapsed
    const dynamicElapsed = Math.floor((nowMs - startMs) / 1000)
    return Math.max(0, savedElapsed + dynamicElapsed)
  }

  // If timer is explicitly paused, return the saved elapsed seconds (frozen clock)
  if (fixture.timerIsRunning === false) {
    return savedElapsed
  }

  // Legacy fallback: calculate from startTime (for fixtures without new timer fields)
  const startTime =
    fixture.timerStartedAt ||
    fixture.startTime

  if (!startTime) return null

  const startMs = new Date(startTime).getTime()
  return Number.isNaN(startMs) ? null : Math.max(0, Math.floor((nowMs - startMs) / 1000))
}

export function getHalftimeSeconds(fixture?: TimerFixture | null) {
  const durationMinutes = fixture?.matchDuration ?? 90
  return (durationMinutes * 60) / 2
}

export function isFixtureHalftime(fixture?: TimerFixture | null) {
  if (!fixture || fixture.status !== FixtureStatus.LIVE) return false
  const htSeconds = getHalftimeSeconds(fixture)
  return fixture.timerIsRunning === false && fixture.timerElapsedSeconds === htSeconds
}

export function getMatchMinute(fixture?: TimerFixture | null, nowMs = Date.now()) {
  const elapsedSeconds = getMatchElapsedSeconds(fixture, nowMs)
  if (elapsedSeconds === null) return null

  const durationMinutes = fixture?.matchDuration ?? 90
  const htSeconds = (durationMinutes * 60) / 2
  const ftSeconds = durationMinutes * 60
  const baseElapsed = fixture?.timerElapsedSeconds ?? 0

  if (baseElapsed < htSeconds) {
    if (elapsedSeconds >= htSeconds) {
      return Math.floor(htSeconds / 60)
    }
  } else {
    if (elapsedSeconds >= ftSeconds) {
      return Math.floor(ftSeconds / 60)
    }
  }

  return Math.max(1, Math.floor(elapsedSeconds / 60) + 1)
}

export function getTimerDisplayInfo(fixture?: TimerFixture | null, nowMs = Date.now()) {
  if (!fixture || fixture.status !== FixtureStatus.LIVE) {
    return { isLive: false, displayClock: '', displayLabel: '' }
  }

  if (isFixtureHalftime(fixture)) {
    return { isLive: true, displayClock: 'HT', displayLabel: 'HT' }
  }

  const elapsedSeconds = getMatchElapsedSeconds(fixture, nowMs)
  if (elapsedSeconds === null) {
    return { isLive: true, displayClock: '', displayLabel: '' }
  }

  const durationMinutes = fixture?.matchDuration ?? 90
  const htSeconds = (durationMinutes * 60) / 2
  const ftSeconds = durationMinutes * 60
  const baseElapsed = fixture?.timerElapsedSeconds ?? 0

  const htMinutes = Math.floor(htSeconds / 60)
  const ftMinutes = Math.floor(ftSeconds / 60)

  if (baseElapsed < htSeconds) {
    if (elapsedSeconds >= htSeconds) {
      // First half stoppage time
      return {
        isLive: true,
        displayClock: `${htMinutes}+`,
        displayLabel: `${htMinutes}+'`
      }
    }
  } else {
    if (elapsedSeconds >= ftSeconds) {
      // Second half stoppage time
      return {
        isLive: true,
        displayClock: `${ftMinutes}+`,
        displayLabel: `${ftMinutes}+'`
      }
    }
  }

  // Regular time
  const minutes = Math.floor(elapsedSeconds / 60)
  const seconds = elapsedSeconds % 60
  const displayClock = `${minutes}:${String(seconds).padStart(2, '0')}`
  const minuteLabelVal = Math.max(1, minutes + 1)
  const displayLabel = `${minuteLabelVal}'`

  return {
    isLive: true,
    displayClock,
    displayLabel
  }
}

export function formatMatchMinuteLabel(fixture?: TimerFixture | null, nowMs = Date.now()) {
  const info = getTimerDisplayInfo(fixture, nowMs)
  return info.displayLabel
}

export function formatMatchClock(fixture?: TimerFixture | null, nowMs = Date.now()) {
  const info = getTimerDisplayInfo(fixture, nowMs)
  return info.displayClock
}

export function useMatchTimer(intervalMs = 1000) {
  const now = ref(Date.now())
  let interval: ReturnType<typeof setInterval> | undefined

  onMounted(() => {
    interval = setInterval(() => {
      now.value = Date.now()
    }, intervalMs)
  })

  onUnmounted(() => {
    if (interval) clearInterval(interval)
  })

  return {
    now,
    getElapsedSeconds: (fixture?: TimerFixture | null) => getMatchElapsedSeconds(fixture, now.value),
    getMinute: (fixture?: TimerFixture | null) => getMatchMinute(fixture, now.value),
    formatClock: (fixture?: TimerFixture | null) => formatMatchClock(fixture, now.value),
    formatMinuteLabel: (fixture?: TimerFixture | null) => formatMatchMinuteLabel(fixture, now.value),
    isHalftime: (fixture?: TimerFixture | null) => isFixtureHalftime(fixture)
  }
}
