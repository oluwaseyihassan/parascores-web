<script setup lang="ts">
import type { Fixture } from '~/types'
import { FixtureStatus } from '~/types'
import { computed } from 'vue'
import { getParticipantName } from '~/utils/participant'
import { getLivestreamPlatformInfo, detectLivestreamPlatform } from '~/utils/livestream'

const props = defineProps<{
  fixture: Fixture
  updatingMatch?: boolean
  isRace?: boolean
}>()

const emit = defineEmits<{
  'start': [fixture: Fixture]
  'control': [fixture: Fixture]
  'delete': [fixture: Fixture]
}>()

const hasActions = computed(() => {
  return props.fixture.status !== FixtureStatus.CANCELLED
})

const matchTimer = useMatchTimer(30000)
const liveMinuteLabel = computed(() => matchTimer.formatMinuteLabel(props.fixture))

const homeTeamName = computed(() => getParticipantName(props.fixture.homeTeam, props.fixture.homeTeamPlaceholder || 'TBD'))
const awayTeamName = computed(() => getParticipantName(props.fixture.awayTeam, props.fixture.awayTeamPlaceholder || 'TBD'))

const isStarted = computed(() => {
  return props.fixture.status === FixtureStatus.LIVE || props.fixture.status === FixtureStatus.NORMAL_TIME_ENDED || props.fixture.status === FixtureStatus.EXTRATIME || props.fixture.status === FixtureStatus.COMPLETED
})

const hasPenalties = computed(() => {
  return props.fixture.homePenaltyScore != null || props.fixture.awayPenaltyScore != null
})

const livestreamInfo = computed(() => {
  if (!props.fixture.livestreamUrl) return null
  const platform = props.fixture.livestreamPlatform || detectLivestreamPlatform(props.fixture.livestreamUrl)
  return getLivestreamPlatformInfo(platform)
})

const normalizedStatus = computed(() => props.fixture.status.toLowerCase())

const statusLabel = computed(() => {
  if (props.fixture.status === FixtureStatus.LIVE) return liveMinuteLabel.value || 'Live'
  if (props.fixture.status === FixtureStatus.NORMAL_TIME_ENDED) return liveMinuteLabel.value || 'Full Time'
  if (props.fixture.status === FixtureStatus.EXTRATIME) return liveMinuteLabel.value || 'Extra Time'
  if (props.fixture.status === FixtureStatus.COMPLETED) return 'Final'
  if (props.fixture.status === FixtureStatus.CANCELLED) return 'Cancelled'
  if (!props.fixture.startTime) return 'Unscheduled'
  return 'Scheduled'
})

const scheduleLabel = computed(() => {
  if (!props.fixture.startTime) return 'TBD'

  const date = new Date(props.fixture.startTime)
  if (Number.isNaN(date.getTime())) return 'TBD'

  const day = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  return `${day}, ${time}`
})

const primaryActionLabel = computed(() => {
  if (props.isRace) {
    if (props.fixture.status === FixtureStatus.COMPLETED) return 'Results'
    return 'Enter Results'
  }
  if (props.fixture.status === FixtureStatus.LIVE || props.fixture.status === FixtureStatus.NORMAL_TIME_ENDED || props.fixture.status === FixtureStatus.EXTRATIME) return 'Control'
  if (props.fixture.status === FixtureStatus.COMPLETED) return 'Details'
  return 'Edit'
})

const primaryActionIcon = computed(() => {
  if (props.isRace) return 'i-heroicons-numbered-list'
  if (props.fixture.status === FixtureStatus.LIVE || props.fixture.status === FixtureStatus.NORMAL_TIME_ENDED || props.fixture.status === FixtureStatus.EXTRATIME) return 'i-heroicons-adjustments-horizontal'
  if (props.fixture.status === FixtureStatus.COMPLETED) return 'i-heroicons-clipboard-document-list'
  return 'i-heroicons-pencil-square'
})

const canStart = computed(() => {
  return props.fixture.status === FixtureStatus.SCHEDULED
    && !!props.fixture.homeTeamId
    && !!props.fixture.awayTeamId
    && !!props.fixture.startTime
})

const getInitial = (name: string) => {
  return name.trim().charAt(0).toUpperCase() || 'T'
}
</script>

<template>
  <div class="fixture-card" :class="`fixture-card--${normalizedStatus}`">
    <div class="fixture-card__accent" aria-hidden="true" />

    <div class="fixture-card__content">
      <div class="fixture-card__header">
        <div class="fixture-meta">
          <span class="fixture-date" :class="{ 'fixture-date--empty': !fixture.startTime }">
            <UIcon name="i-heroicons-calendar-days" class="fixture-meta__icon" />
            {{ scheduleLabel }}
          </span>

          <span v-if="fixture.group" class="fixture-chip">
            {{ fixture.group.name }}
          </span>

          <span v-if="fixture.venue" class="fixture-venue">
            <UIcon name="i-heroicons-map-pin" class="fixture-meta__icon" />
            {{ fixture.venue }}
          </span>

          <span v-if="livestreamInfo" class="fixture-livestream">
            <UIcon :name="livestreamInfo.icon" class="fixture-meta__icon" :class="livestreamInfo.color" />
            <span>Live</span>
          </span>
        </div>

        <span v-if="fixture.startTime || fixture.status !== FixtureStatus.SCHEDULED" class="fixture-status" :class="`fixture-status--${normalizedStatus}`">
          <span class="fixture-status__dot" />
          {{ statusLabel }}
        </span>
      </div>

      <!-- Race fixture: single event, participants ranked by result -->
      <div v-if="props.isRace" class="fixture-match">
        <div class="flex items-center gap-3 py-1">
          <span class="fixture-team__avatar">
            <UIcon name="i-heroicons-flag" class="w-5 h-5 text-emerald-500" />
          </span>
          <div class="flex flex-col">
            <span class="font-bold text-sm">{{ fixture.roundName || 'Race' }}</span>
            <span class="text-[11px] text-gray-500 dark:text-gray-400">
              {{ fixture.resultEntries?.length ? `${fixture.resultEntries.length} results recorded` : 'All participants ranked by result' }}
            </span>
          </div>
        </div>
      </div>

      <div v-else class="fixture-match">
        <div class="fixture-team">
          <div class="fixture-team__avatar">
            <img
              v-if="fixture.homeTeam?.logoUrl"
              :src="fixture.homeTeam.logoUrl"
              :alt="homeTeamName"
              class="fixture-team__logo"
            >
            <span v-else class="fixture-team__initial">{{ getInitial(homeTeamName) }}</span>
          </div>

          <span class="fixture-team__name">{{ homeTeamName }}</span>

          <span v-if="isStarted" class="fixture-score">{{ fixture.homeScore ?? 0 }}</span>
        </div>

        <div class="fixture-divider">
          <span v-if="!isStarted" class="fixture-vs">vs</span>
          <span v-else-if="hasPenalties" class="fixture-penalties">
            Pens {{ fixture.homePenaltyScore ?? 0 }}-{{ fixture.awayPenaltyScore ?? 0 }}
          </span>
        </div>

        <div class="fixture-team">
          <div class="fixture-team__avatar">
            <img
              v-if="fixture.awayTeam?.logoUrl"
              :src="fixture.awayTeam.logoUrl"
              :alt="awayTeamName"
              class="fixture-team__logo"
            >
            <span v-else class="fixture-team__initial">{{ getInitial(awayTeamName) }}</span>
          </div>

          <span class="fixture-team__name">{{ awayTeamName }}</span>

          <span v-if="isStarted" class="fixture-score">{{ fixture.awayScore ?? 0 }}</span>
        </div>
      </div>
    </div>

    <div v-if="hasActions" class="fixture-card__actions" :class="{ 'fixture-card__actions--with-start': canStart }">
      <button
        v-if="canStart"
        type="button"
        class="fx-btn fx-btn--start"
        :disabled="updatingMatch"
        @click.stop="emit('start', fixture)"
      >
        <UIcon name="i-heroicons-play" class="fx-btn__icon" />
        <span>Start</span>
      </button>

      <button
        type="button"
        class="fx-btn fx-btn--primary"
        @click.stop="emit('control', fixture)"
      >
        <UIcon :name="primaryActionIcon" class="fx-btn__icon" />
        <span>{{ primaryActionLabel }}</span>
      </button>

      <button
        type="button"
        class="fx-btn fx-btn--delete"
        aria-label="Delete fixture"
        title="Delete fixture"
        @click.stop="emit('delete', fixture)"
      >
        <UIcon name="i-heroicons-trash" class="fx-btn__icon" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.fixture-card {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  overflow: hidden;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.fixture-card:hover {
  border-color: rgba(16, 185, 129, 0.38);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}

:root.dark .fixture-card {
  border-color: rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.035);
  box-shadow: none;
}

:root.dark .fixture-card:hover {
  border-color: rgba(16, 185, 129, 0.32);
  background: rgba(255, 255, 255, 0.052);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.26);
}

.fixture-card__accent {
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: #9ca3af;
}

.fixture-card--live .fixture-card__accent,
.fixture-card--normal_time_ended .fixture-card__accent,
.fixture-card--extratime .fixture-card__accent {
  background: #f59e0b;
}

.fixture-card--completed .fixture-card__accent {
  background: #10b981;
}

.fixture-card--cancelled .fixture-card__accent {
  background: #6b7280;
}

.fixture-card__content {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 10px;
  padding-left: 4px;
}

.fixture-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
}

.fixture-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
}

.fixture-date,
.fixture-chip,
.fixture-venue,
.fixture-status {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 700;
  line-height: 1;
}

.fixture-date {
  gap: 5px;
  padding: 0 8px;
  color: #374151;
  background: #f3f4f6;
}

:root.dark .fixture-date {
  color: #d1d5db;
  background: rgba(255, 255, 255, 0.07);
}

.fixture-date--empty {
  color: #b45309;
  background: rgba(245, 158, 11, 0.12);
}

:root.dark .fixture-date--empty {
  color: #fbbf24;
  background: rgba(245, 158, 11, 0.16);
}

.fixture-chip {
  padding: 0 8px;
  color: #4f46e5;
  background: rgba(99, 102, 241, 0.1);
}

:root.dark .fixture-chip {
  color: #a5b4fc;
  background: rgba(99, 102, 241, 0.18);
}

.fixture-venue {
  max-width: 180px;
  gap: 5px;
  padding: 0 8px;
  overflow: hidden;
  color: #6b7280;
  background: #f9fafb;
}

:root.dark .fixture-venue {
  color: #9ca3af;
  background: rgba(255, 255, 255, 0.045);
}

.fixture-livestream {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  min-height: 24px;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 700;
  line-height: 1;
  color: #be123c;
  background: rgba(244, 63, 94, 0.08);
}

:root.dark .fixture-livestream {
  color: #fb7185;
  background: rgba(244, 63, 94, 0.12);
}

.fixture-meta__icon {
  width: 13px;
  height: 13px;
  flex: 0 0 auto;
}

.fixture-status {
  flex: 0 0 auto;
  gap: 6px;
  padding: 0 8px;
  color: #6b7280;
  background: #f9fafb;
  text-transform: uppercase;
}

:root.dark .fixture-status {
  color: #a3a3a3;
  background: rgba(255, 255, 255, 0.045);
}

.fixture-status__dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: currentColor;
}

.fixture-status--live,
.fixture-status--normal_time_ended,
.fixture-status--extratime {
  color: #d97706;
  background: rgba(245, 158, 11, 0.13);
}

:root.dark .fixture-status--live,
:root.dark .fixture-status--normal_time_ended,
:root.dark .fixture-status--extratime {
  color: #fbbf24;
  background: rgba(245, 158, 11, 0.16);
}

.fixture-status--live .fixture-status__dot,
.fixture-status--normal_time_ended .fixture-status__dot,
.fixture-status--extratime .fixture-status__dot {
  animation: pulse 1.6s ease-in-out infinite;
}

.fixture-status--completed {
  color: #059669;
  background: rgba(16, 185, 129, 0.12);
}

:root.dark .fixture-status--completed {
  color: #34d399;
  background: rgba(16, 185, 129, 0.14);
}

.fixture-status--cancelled {
  color: #6b7280;
}

.fixture-match {
  display: grid;
  gap: 4px;
}

.fixture-team {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-width: 0;
  min-height: 42px;
}

.fixture-team__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  color: #475569;
  background: linear-gradient(135deg, #eef2ff, #ecfdf5);
}

:root.dark .fixture-team__avatar {
  border-color: rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.18), rgba(16, 185, 129, 0.14));
}

.fixture-team__logo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.fixture-team__initial {
  font-size: 0.8125rem;
  font-weight: 800;
}

.fixture-team__name {
  min-width: 0;
  overflow: hidden;
  color: #111827;
  font-size: 0.9375rem;
  font-weight: 750;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:root.dark .fixture-team__name {
  color: #f5f5f5;
}

.fixture-score {
  min-width: 32px;
  color: #111827;
  font-size: 1.375rem;
  font-weight: 850;
  line-height: 1;
  text-align: right;
}

:root.dark .fixture-score {
  color: #ffffff;
}

.fixture-divider {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 8px;
  color: #9ca3af;
}

.fixture-divider::before,
.fixture-divider::after {
  height: 1px;
  content: "";
  background: #eef2f7;
}

:root.dark .fixture-divider::before,
:root.dark .fixture-divider::after {
  background: rgba(255, 255, 255, 0.07);
}

.fixture-vs,
.fixture-penalties {
  font-size: 0.625rem;
  font-weight: 800;
  line-height: 1;
  text-transform: uppercase;
}

.fixture-vs {
  color: #6b7280;
}

:root.dark .fixture-vs {
  color: #a3a3a3;
}

.fixture-penalties {
  color: #6b7280;
}

:root.dark .fixture-penalties {
  color: #a3a3a3;
}

.fixture-card__actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 112px;
}

.fx-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 34px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 7px;
  font-size: 0.75rem;
  font-weight: 800;
  line-height: 1;
  cursor: pointer;
  transition: border-color 0.16s ease, background 0.16s ease, color 0.16s ease, transform 0.16s ease;
}

.fx-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.fx-btn:disabled {
  cursor: default;
  opacity: 0.55;
}

.fx-btn__icon {
  width: 15px;
  height: 15px;
  flex: 0 0 auto;
}

.fx-btn--start {
  color: #047857;
  border-color: rgba(16, 185, 129, 0.24);
  background: rgba(16, 185, 129, 0.1);
}

.fx-btn--start:hover:not(:disabled) {
  border-color: rgba(16, 185, 129, 0.42);
  background: rgba(16, 185, 129, 0.17);
}

:root.dark .fx-btn--start {
  color: #34d399;
  border-color: rgba(16, 185, 129, 0.2);
  background: rgba(16, 185, 129, 0.12);
}

.fx-btn--primary {
  color: #374151;
  border-color: #e5e7eb;
  background: #f9fafb;
}

.fx-btn--primary:hover {
  border-color: #d1d5db;
  background: #f3f4f6;
}

:root.dark .fx-btn--primary {
  color: #e5e7eb;
  border-color: rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.055);
}

:root.dark .fx-btn--primary:hover {
  border-color: rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.085);
}

.fx-btn--delete {
  color: #dc2626;
  border-color: rgba(239, 68, 68, 0.18);
  background: rgba(239, 68, 68, 0.07);
}

.fx-btn--delete:hover {
  border-color: rgba(239, 68, 68, 0.32);
  background: rgba(239, 68, 68, 0.13);
}

:root.dark .fx-btn--delete {
  color: #f87171;
  border-color: rgba(239, 68, 68, 0.2);
  background: rgba(239, 68, 68, 0.1);
}

@media (max-width: 640px) {
  .fixture-card {
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 11px;
  }

  .fixture-card__header {
    align-items: flex-start;
    gap: 8px;
  }

  .fixture-meta {
    gap: 5px;
  }

  .fixture-status {
    min-height: 22px;
    padding: 0 7px;
    font-size: 0.625rem;
  }

  .fixture-team {
    min-height: 38px;
  }

  .fixture-card__actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 38px;
    width: 100%;
  }

  .fixture-card__actions--with-start {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 38px;
  }

  .fx-btn {
    min-width: 0;
    min-height: 32px;
    padding: 0 8px;
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.35;
  }
}
</style>
