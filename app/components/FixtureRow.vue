<script setup lang="ts">
import type { Fixture } from '~/types'
import { FixtureStatus } from '~/types'

defineProps<{
  fixture: Fixture
  updatingMatch?: boolean
}>()

const emit = defineEmits<{
  'start': [fixture: Fixture]
  'control': [fixture: Fixture]
}>()

const statusColor: Record<string, string> = {
  LIVE:      'text-amber-400',
  COMPLETED: 'text-emerald-400',
  SCHEDULED: 'text-gray-400',
  CANCELLED: 'text-gray-500',
}

const statusDot: Record<string, string> = {
  LIVE:      'bg-amber-400 animate-pulse',
  COMPLETED: 'bg-emerald-400',
  SCHEDULED: 'bg-gray-500',
  CANCELLED: 'bg-gray-600',
}
</script>

<template>
  <div class="fixture-row group">
    <!-- Date -->
    <div class="fixture-date">
      <span v-if="fixture.startTime">
        {{ new Date(fixture.startTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) }}
      </span>
      <span v-else class="fixture-unscheduled">TBD</span>
    </div>

    <!-- Teams + score -->
    <div class="fixture-main">
      <!-- Home -->
      <div class="fixture-team fixture-team--home">
        <span class="fixture-team__name">{{ fixture.homeTeam?.customName || 'TBD' }}</span>
        <div class="fixture-team__avatar">
          <img v-if="fixture.homeTeam?.logoUrl" :src="fixture.homeTeam.logoUrl" class="w-full h-full object-cover" />
          <span v-else class="fixture-team__initial">{{ (fixture.homeTeam?.customName || 'T').charAt(0) }}</span>
        </div>
      </div>

      <!-- Score / vs -->
      <div class="fixture-scorebox">
        <template v-if="fixture.status === FixtureStatus.LIVE || fixture.status === FixtureStatus.COMPLETED">
          <span class="fixture-score">{{ fixture.homeScore ?? 0 }}</span>
          <span class="fixture-score-sep">–</span>
          <span class="fixture-score">{{ fixture.awayScore ?? 0 }}</span>
        </template>
        <span v-else class="fixture-vs">vs</span>
      </div>

      <!-- Away -->
      <div class="fixture-team fixture-team--away">
        <div class="fixture-team__avatar">
          <img v-if="fixture.awayTeam?.logoUrl" :src="fixture.awayTeam.logoUrl" class="w-full h-full object-cover" />
          <span v-else class="fixture-team__initial">{{ (fixture.awayTeam?.customName || 'T').charAt(0) }}</span>
        </div>
        <span class="fixture-team__name">{{ fixture.awayTeam?.customName || 'TBD' }}</span>
      </div>
    </div>

    <!-- Status + actions -->
    <div class="fixture-actions">
      <!-- Status chip -->
      <div class="fixture-status" :class="statusColor[fixture.status]">
        <span class="fixture-status__dot" :class="statusDot[fixture.status]" />
        <span class="fixture-status__label">{{ fixture.status }}</span>
      </div>

      <!-- Action buttons -->
      <button
        v-if="fixture.status === FixtureStatus.SCHEDULED && fixture.homeTeamId && fixture.awayTeamId"
        class="fx-btn fx-btn--start"
        :disabled="updatingMatch"
        @click.stop="emit('start', fixture)"
      >
        <UIcon name="i-heroicons-play" class="w-3 h-3" />
        <span>Start</span>
      </button>

      <button
        v-if="fixture.status === FixtureStatus.SCHEDULED"
        class="fx-btn fx-btn--edit"
        @click.stop="emit('control', fixture)"
      >
        <UIcon name="i-heroicons-pencil" class="w-3 h-3" />
        <span class="hidden sm:inline">Edit</span>
      </button>

      <button
        v-if="fixture.status === FixtureStatus.LIVE || fixture.status === FixtureStatus.COMPLETED"
        class="fx-btn fx-btn--control"
        @click.stop="emit('control', fixture)"
      >
        <UIcon name="i-heroicons-adjustments-horizontal" class="w-3 h-3" />
        <span>Control</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* ── Row ─────────────────────────────────────────────────── */
.fixture-row {
  display: grid;
  grid-template-columns: 36px 1fr auto;
  align-items: center;
  gap: 8px;
  padding: 10px 10px 10px 12px;
  border-radius: 10px;
  background: #f9fafb;
  border: 1px solid #f3f4f6;
  transition: border-color 0.15s, background 0.15s;
  position: relative;
}

.fixture-row:hover {
  border-color: #10b981;
  background: #f0fdf8;
}

:root.dark .fixture-row {
  background: rgba(255,255,255,0.03);
  border-color: rgba(255,255,255,0.05);
}

:root.dark .fixture-row:hover {
  background: rgba(16,185,129,0.04);
  border-color: rgba(16,185,129,0.25);
}

/* ── Date column ─────────────────────────────────────────── */
.fixture-date {
  font-size: 0.6rem;
  font-weight: 600;
  color: #9ca3af;
  text-align: center;
  line-height: 1.3;
  white-space: pre-line;
}

.fixture-unscheduled {
  display: inline-block;
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 4px;
  padding: 1px 4px;
  line-height: 1.6;
}

:root.dark .fixture-unscheduled {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.08);
  border-color: rgba(251, 191, 36, 0.2);
}

/* ── Main (teams + score) ────────────────────────────────── */
.fixture-main {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

/* ── Team ────────────────────────────────────────────────── */
.fixture-team {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.fixture-team--home {
  justify-content: flex-end;
  text-align: right;
}

.fixture-team--away {
  justify-content: flex-start;
  text-align: left;
}

.fixture-team__name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

:root.dark .fixture-team__name {
  color: #f3f4f6;
}

.fixture-team__avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  flex-shrink: 0;
  background: #e5e7eb;
  border: 1px solid #d1d5db;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

:root.dark .fixture-team__avatar {
  background: #1f2937;
  border-color: rgba(255,255,255,0.08);
}

.fixture-team__initial {
  font-size: 0.625rem;
  font-weight: 700;
  color: #6b7280;
}

/* ── Scorebox ────────────────────────────────────────────── */
.fixture-scorebox {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}

.fixture-score {
  font-size: 1rem;
  font-weight: 800;
  color: #111827;
  min-width: 18px;
  text-align: center;
  line-height: 1;
}

:root.dark .fixture-score {
  color: #f9fafb;
}

.fixture-score-sep {
  font-size: 0.75rem;
  color: #9ca3af;
  font-weight: 400;
}

.fixture-vs {
  font-size: 0.7rem;
  font-weight: 600;
  color: #9ca3af;
  letter-spacing: 0.03em;
  padding: 0 2px;
}

/* ── Actions ─────────────────────────────────────────────── */
.fixture-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

/* status chip */
.fixture-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.fixture-status__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}

.fixture-status__label {
  display: none;
}

@media (min-width: 480px) {
  .fixture-status__label {
    display: inline;
  }
}

/* action buttons */
.fx-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.6rem;
  font-weight: 600;
  padding: 0.22rem 0.5rem;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
  line-height: 1.5;
}

.fx-btn--start {
  background: rgba(16,185,129,0.1);
  color: #059669;
  border-color: rgba(16,185,129,0.2);
}
.fx-btn--start:hover:not(:disabled) { background: rgba(16,185,129,0.18); }
.fx-btn--start:disabled { opacity: 0.5; cursor: default; }

.fx-btn--edit {
  background: rgba(107,114,128,0.08);
  color: #6b7280;
  border-color: rgba(107,114,128,0.12);
}
.fx-btn--edit:hover { background: rgba(107,114,128,0.14); }

.fx-btn--control {
  background: rgba(245,158,11,0.1);
  color: #d97706;
  border-color: rgba(245,158,11,0.2);
}
.fx-btn--control:hover { background: rgba(245,158,11,0.18); }

@media (max-width: 480px) {
  .fixture-row {
    grid-template-columns: auto 1fr;
    grid-template-rows: auto auto;
    gap: 4px 8px;
  }

  /* Teams + score spans full width on row 1 */
  .fixture-main {
    grid-column: 1 / -1;
    grid-row: 1;
  }

  /* Date moves to row 2, left side */
  .fixture-date {
    grid-column: 1;
    grid-row: 2;
    align-self: center;
    text-align: left;
  }

  /* Actions move to row 2, right side */
  .fixture-actions {
    grid-column: 2;
    grid-row: 2;
    justify-content: flex-end;
  }

  /* Always show the status label on mobile */
  .fixture-status__label {
    display: inline;
  }
}
</style>
