<script setup lang="ts">
import type { Fixture } from '~/types'
import { FixtureStatus } from '~/types'
import { computed } from 'vue'

const props = defineProps<{
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

const hasActions = computed(() => {
  return props.fixture.status !== FixtureStatus.CANCELLED
})
</script>

<template>
  <div class="fixture-card group">
    <!-- Top Row: Date and Status -->
    <div class="fixture-card__header">
      <div class="fixture-date">
        <span v-if="fixture.startTime">
          {{ new Date(fixture.startTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) }}
          <span class="opacity-50">·</span>
          {{ new Date(fixture.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) }}
        </span>
        <span v-else class="fixture-unscheduled">TBD</span>
      </div>
      
      <div v-if="fixture.status !== FixtureStatus.SCHEDULED || fixture.startTime || fixture.group" class="fixture-status flex items-center gap-2">
        <div v-if="fixture.group" class="fixture-group-badge">
          {{ fixture.group.name }}
        </div>
        <div v-if="fixture.status !== FixtureStatus.SCHEDULED || fixture.startTime" :class="statusColor[fixture.status]" class="flex items-center gap-1.5">
          <span class="fixture-status__dot" :class="statusDot[fixture.status]" />
          <span class="fixture-status__label">{{ fixture.status }}</span>
        </div>
      </div>
    </div>

    <!-- Middle Row: Teams + score -->
    <div class="fixture-card__body">
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

    <!-- Bottom Row: Actions -->
    <div v-if="hasActions" class="fixture-card__footer">
      <button
        v-if="fixture.status === FixtureStatus.SCHEDULED && fixture.homeTeamId && fixture.awayTeamId && fixture.startTime"
        class="fx-btn fx-btn--start"
        :disabled="updatingMatch"
        @click.stop="emit('start', fixture)"
      >
        <UIcon name="i-heroicons-play" class="w-4 h-4" />
        <span>Start</span>
      </button>

      <button
        v-if="fixture.status === FixtureStatus.SCHEDULED"
        class="fx-btn fx-btn--edit"
        @click.stop="emit('control', fixture)"
      >
        <UIcon name="i-heroicons-pencil" class="w-4 h-4" />
        <span>Edit</span>
      </button>

      <button
        v-if="fixture.status === FixtureStatus.LIVE"
        class="fx-btn fx-btn--control"
        @click.stop="emit('control', fixture)"
      >
        <UIcon name="i-heroicons-adjustments-horizontal" class="w-4 h-4" />
        <span>Control Match</span>
      </button>

      <button
        v-if="fixture.status === FixtureStatus.COMPLETED"
        class="fx-btn fx-btn--details"
        @click.stop="emit('control', fixture)"
      >
        <UIcon name="i-heroicons-clipboard-document-list" class="w-4 h-4" />
        <span>Match Details</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* ── Card Container ────────────────────────────────────────── */
.fixture-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 20px;
  border-radius: 12px;
  background: #f9fafb;
  border: 1px solid #f3f4f6;
  transition: border-color 0.15s, background 0.15s, transform 0.15s;
  position: relative;
}

.fixture-card:hover {
  border-color: #10b981;
  background: #f0fdf8;
  transform: translateY(-1px);
}

:root.dark .fixture-card {
  background: rgba(255,255,255,0.03);
  border-color: rgba(255,255,255,0.05);
}

:root.dark .fixture-card:hover {
  background: rgba(16,185,129,0.04);
  border-color: rgba(16,185,129,0.25);
}

/* ── Top Row (Header) ────────────────────────────────────── */
.fixture-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  padding-bottom: 12px;
}

:root.dark .fixture-card__header {
  border-bottom-color: rgba(255, 255, 255, 0.05);
}

.fixture-date {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 4px;
}

:root.dark .fixture-date {
  color: #9ca3af;
}

.fixture-unscheduled {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 4px;
  padding: 2px 6px;
}

:root.dark .fixture-unscheduled {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.08);
  border-color: rgba(251, 191, 36, 0.2);
}

.fixture-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.fixture-group-badge {
  background: rgba(99, 102, 241, 0.1);
  color: #4f46e5;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.65rem;
  letter-spacing: 0;
  text-transform: none;
  font-weight: 600;
  border: 1px solid rgba(99, 102, 241, 0.2);
}

:root.dark .fixture-group-badge {
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
  border-color: rgba(99, 102, 241, 0.3);
}

.fixture-status__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ── Middle Row (Body) ───────────────────────────────────── */
.fixture-card__body {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

/* ── Teams ───────────────────────────────────────────────── */
.fixture-team {
  display: flex;
  align-items: center;
  gap: 12px;
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
  font-size: 1rem;
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
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
  background: #e5e7eb;
  border: 1px solid #d1d5db;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

:root.dark .fixture-team__avatar {
  background: #1f2937;
  border-color: rgba(255,255,255,0.08);
}

.fixture-team__initial {
  font-size: 0.85rem;
  font-weight: 700;
  color: #6b7280;
}

/* ── Scorebox ────────────────────────────────────────────── */
.fixture-scorebox {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-shrink: 0;
  min-width: 60px;
}

.fixture-score {
  font-size: 1.5rem;
  font-weight: 800;
  color: #111827;
  text-align: center;
  line-height: 1;
}

:root.dark .fixture-score {
  color: #f9fafb;
}

.fixture-score-sep {
  font-size: 1rem;
  color: #9ca3af;
  font-weight: 400;
}

.fixture-vs {
  font-size: 0.85rem;
  font-weight: 600;
  color: #9ca3af;
  letter-spacing: 0.03em;
  background: rgba(156, 163, 175, 0.1);
  padding: 2px 8px;
  border-radius: 12px;
}

:root.dark .fixture-vs {
  background: rgba(156, 163, 175, 0.15);
}

/* ── Bottom Row (Footer) ─────────────────────────────────── */
.fixture-card__footer {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-top: 4px;
}

.fx-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  line-height: 1.2;
}

.fx-btn--start {
  background: rgba(16,185,129,0.1);
  color: #059669;
  border-color: rgba(16,185,129,0.2);
}
.fx-btn--start:hover:not(:disabled) { 
  background: rgba(16,185,129,0.18); 
  border-color: rgba(16,185,129,0.3);
}
.fx-btn--start:disabled { opacity: 0.5; cursor: default; }

.fx-btn--edit {
  background: rgba(107,114,128,0.08);
  color: #4b5563;
  border-color: rgba(107,114,128,0.15);
}
.fx-btn--edit:hover { 
  background: rgba(107,114,128,0.15); 
  border-color: rgba(107,114,128,0.25);
}
:root.dark .fx-btn--edit {
  color: #9ca3af;
}

.fx-btn--control {
  background: rgba(245,158,11,0.1);
  color: #d97706;
  border-color: rgba(245,158,11,0.2);
}
.fx-btn--control:hover { 
  background: rgba(245,158,11,0.18); 
  border-color: rgba(245,158,11,0.3);
}

.fx-btn--details {
  background: rgba(99, 102, 241, 0.1); /* Indigo */
  color: #4f46e5;
  border-color: rgba(99, 102, 241, 0.2);
}
.fx-btn--details:hover { 
  background: rgba(99, 102, 241, 0.18); 
  border-color: rgba(99, 102, 241, 0.3);
}
:root.dark .fx-btn--details {
  color: #818cf8;
}

/* Mobile Adjustments */
@media (max-width: 480px) {
  .fixture-card__body {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .fixture-team {
    justify-content: flex-start;
    text-align: left;
  }
  
  .fixture-team--home {
    flex-direction: row-reverse;
  }
  
  .fixture-scorebox {
    margin: 8px 0;
  }
  
  .fixture-card__footer {
    flex-direction: column;
  }
  
  .fx-btn {
    width: 100%;
  }
}
</style>
