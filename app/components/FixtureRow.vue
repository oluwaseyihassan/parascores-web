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

const isLive = computed(() => {
  return props.fixture.status === FixtureStatus.LIVE || props.fixture.status === FixtureStatus.NORMAL_TIME_ENDED || props.fixture.status === FixtureStatus.EXTRATIME
})

const hasPenalties = computed(() => {
  return props.fixture.homePenaltyScore != null || props.fixture.awayPenaltyScore != null
})

const livestreamInfo = computed(() => {
  if (!props.fixture.livestreamUrl) return null
  const platform = props.fixture.livestreamPlatform || detectLivestreamPlatform(props.fixture.livestreamUrl)
  return getLivestreamPlatformInfo(platform)
})

// Left status column: live minute / FT / kickoff time
const leftLabel = computed(() => {
  if (isLive.value) return liveMinuteLabel.value || 'Live'
  if (props.fixture.status === FixtureStatus.COMPLETED) return 'FT'
  if (props.fixture.status === FixtureStatus.CANCELLED) return '—'
  if (!props.fixture.startTime) return 'TBD'
  const date = new Date(props.fixture.startTime)
  if (Number.isNaN(date.getTime())) return 'TBD'
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
})


const homeScore = computed(() => props.fixture.homeScore ?? 0)
const awayScore = computed(() => props.fixture.awayScore ?? 0)
const homeWinning = computed(() => isStarted.value && homeScore.value > awayScore.value)
const awayWinning = computed(() => isStarted.value && awayScore.value > homeScore.value)

const canStart = computed(() => {
  return props.fixture.status === FixtureStatus.SCHEDULED
    && !!props.fixture.homeTeamId
    && !!props.fixture.awayTeamId
    && !!props.fixture.startTime
})

// One primary action per row
const primaryAction = computed(() => {
  if (props.isRace) {
    return { label: props.fixture.status === FixtureStatus.COMPLETED ? 'Results' : 'Enter Results', icon: 'i-heroicons-numbered-list', color: 'primary', emit: 'control' as const }
  }
  if (isLive.value) {
    return { label: 'Control', icon: 'i-heroicons-adjustments-horizontal', color: 'live', emit: 'control' as const }
  }
  if (props.fixture.status === FixtureStatus.COMPLETED) {
    return { label: 'Report', icon: 'i-heroicons-clipboard-document-list', color: 'neutral', emit: 'control' as const }
  }
  if (canStart.value) {
    return { label: 'Start', icon: 'i-heroicons-play', color: 'start', emit: 'start' as const }
  }
  return { label: 'Edit', icon: 'i-heroicons-pencil-square', color: 'neutral', emit: 'control' as const }
})

const getShort = (p: { customShortName?: string | null, customName?: string | null } | null | undefined, fallback: string) => {
  const short = p?.customShortName?.trim()
  if (short) return short.slice(0, 3).toUpperCase()
  const name = (p?.customName || fallback).trim()
  return (name.charAt(0) || 'T').toUpperCase()
}

const homeShort = computed(() => getShort(props.fixture.homeTeam, homeTeamName.value))
const awayShort = computed(() => getShort(props.fixture.awayTeam, awayTeamName.value))

const rowMenuItems = computed(() => {
  const items: any[][] = []

  const secondaryGroup: any[] = []

  // If primary action is 'Start', allow editing details/schedule from the menu
  if (primaryAction.value.emit === 'start') {
    secondaryGroup.push({
      label: 'Edit details',
      icon: 'i-heroicons-pencil-square',
      onSelect: () => emit('control', props.fixture),
    })
  }

  if (secondaryGroup.length) {
    items.push(secondaryGroup)
  }

  // Destructive group: delete
  items.push([
    {
      label: 'Delete fixture',
      icon: 'i-heroicons-trash',
      color: 'error' as const,
      onSelect: () => emit('delete', props.fixture),
    },
  ])

  return items
})
</script>

<template>
  <!-- Race fixture: single event, participants ranked by result -->
  <div
    v-if="props.isRace"
    class="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03]"
  >
    <span class="w-10 shrink-0 text-center text-[11px] font-bold text-gray-400 dark:text-gray-500">
      {{ fixture.status === FixtureStatus.COMPLETED ? 'FT' : '—' }}
    </span>
    <span class="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
      <UIcon name="i-heroicons-flag" class="w-4.5 h-4.5 text-emerald-500" />
    </span>
    <div class="min-w-0 flex-1">
      <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">{{ fixture.roundName || 'Race' }}</p>
      <p class="text-[11px] text-gray-500 dark:text-gray-400 truncate">
        {{ fixture.resultEntries?.length ? `${fixture.resultEntries.length} results recorded` : 'Ranked by recorded results' }}
      </p>
    </div>

    <UButton
      size="xs"
      color="primary"
      :icon="primaryAction.icon"
      :label="primaryAction.label"
      @click.stop="emit('control', fixture)"
    />
    <UDropdownMenu
      v-if="hasActions"
      :items="rowMenuItems"
      :content="{ align: 'end' }"
    >
      <UButton
        size="xs"
        color="neutral"
        variant="ghost"
        icon="i-heroicons-ellipsis-vertical"
        aria-label="Fixture actions"
        class="shrink-0 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        @click.stop
      />
    </UDropdownMenu>
  </div>

  <!-- Head-to-head fixture: slim single-line row -->
  <div
    v-else
    class="flex items-center gap-3 px-3 py-2.5 transition-colors"
    :class="isLive
      ? 'bg-red-500/[0.06] dark:bg-red-500/[0.08]'
      : 'hover:bg-gray-50 dark:hover:bg-white/[0.03]'"
  >
    <!-- Status column -->
    <span
      class="w-11 shrink-0 text-center text-[11px] font-bold tabular-nums"
      :class="isLive ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'"
    >
      <span v-if="isLive" class="inline-flex items-center gap-1">
        <span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>{{ leftLabel }}
      </span>
      <template v-else>{{ leftLabel }}</template>
    </span>

    <!-- Avatar stack (home over away) -->
    <span class="flex flex-col -space-y-1.5 shrink-0">
      <span
        class="w-[22px] h-[22px] rounded-full overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-gray-800 ring-2 ring-white dark:ring-gray-900 flex items-center justify-center"
      >
        <img v-if="fixture.homeTeam?.logoUrl" :src="fixture.homeTeam.logoUrl" :alt="homeTeamName" class="w-full h-full object-cover" />
        <span v-else class="text-[8px] font-extrabold text-gray-500 dark:text-gray-300">{{ homeShort }}</span>
      </span>
      <span
        class="w-[22px] h-[22px] rounded-full overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-gray-800 ring-2 ring-white dark:ring-gray-900 flex items-center justify-center"
      >
        <img v-if="fixture.awayTeam?.logoUrl" :src="fixture.awayTeam.logoUrl" :alt="awayTeamName" class="w-full h-full object-cover" />
        <span v-else class="text-[8px] font-extrabold text-gray-500 dark:text-gray-300">{{ awayShort }}</span>
      </span>
    </span>

    <!-- Scoreline -->
    <div class="min-w-0 flex-1 flex items-center gap-1.5 text-sm">
      <span
        class="truncate font-semibold"
        :class="[
          homeWinning ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300',
          { 'line-through opacity-60': fixture.status === FixtureStatus.CANCELLED },
        ]"
      >{{ homeTeamName }}</span>
      <span
        v-if="isStarted"
        class="shrink-0 font-black tabular-nums text-gray-900 dark:text-white"
      >{{ homeScore }} <span class="font-light text-gray-400 dark:text-gray-500">–</span> {{ awayScore }}</span>
      <span v-else class="shrink-0 text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500">vs</span>
      <span
        class="truncate font-semibold"
        :class="[
          awayWinning ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300',
          { 'line-through opacity-60': fixture.status === FixtureStatus.CANCELLED },
        ]"
      >{{ awayTeamName }}</span>
      <span v-if="hasPenalties" class="shrink-0 text-[11px] text-gray-400 dark:text-gray-500">
        ({{ fixture.homePenaltyScore ?? 0 }}–{{ fixture.awayPenaltyScore ?? 0 }} p)
      </span>
      <span v-if="fixture.venue" class="hidden xl:inline shrink-0 text-[11px] text-gray-400 dark:text-gray-500 truncate">
        · {{ fixture.venue }}
      </span>
    </div>

    <!-- Livestream indicator -->
    <UIcon
      v-if="livestreamInfo"
      :name="livestreamInfo.icon"
      class="w-3.5 h-3.5 shrink-0 hidden sm:block"
      :class="livestreamInfo.color"
      title="Livestream available"
    />


    <!-- Primary action + delete -->
    <div v-if="hasActions" class="flex items-center gap-1 shrink-0">
      <UButton
        v-if="primaryAction.color === 'live'"
        size="xs"
        variant="outline"
        color="error"
        :icon="primaryAction.icon"
        :label="primaryAction.label"
        @click.stop="emit('control', fixture)"
      />
      <UButton
        v-else-if="primaryAction.color === 'start'"
        size="xs"
        color="success"
        variant="soft"
        :icon="primaryAction.icon"
        :label="primaryAction.label"
        :disabled="updatingMatch"
        @click.stop="emit('start', fixture)"
      />
      <UButton
        v-else
        size="xs"
        variant="outline"
        color="neutral"
        :icon="primaryAction.icon"
        :label="primaryAction.label"
        @click.stop="emit('control', fixture)"
      />
      <UDropdownMenu
        :items="rowMenuItems"
        :content="{ align: 'end' }"
      >
        <UButton
          size="xs"
          color="neutral"
          variant="ghost"
          icon="i-heroicons-ellipsis-vertical"
          aria-label="Fixture actions"
          class="shrink-0 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          @click.stop
        />
      </UDropdownMenu>
    </div>
  </div>
</template>
