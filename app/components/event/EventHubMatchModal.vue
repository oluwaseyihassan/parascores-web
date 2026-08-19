<script setup lang="ts">
import {
  footballMatch,
  basketballMatch,
  athleticsResult,
  swimmingResult,
  volleyballResult,
  boxingBracket,
  type HubSport,
} from './mock'
import type { LiveCard, EventHubFixture } from '~/composables/useEventHub'
import { getMatchMinute } from '~/composables/useMatchTimer'
import { resolveEngine } from '~/engines/registry'

export interface TournamentDetail {
  name: string
  live: EventHubFixture[]
  upcoming: EventHubFixture[]
  results: EventHubFixture[]
}

const props = defineProps<{
  sport: HubSport | null
  liveCard?: LiveCard | null
  tournament?: TournamentDetail | null
}>()

const emit = defineEmits<{
  close: []
  openFixture: [fixture: EventHubFixture]
}>()

const open = computed(() => !!props.sport || !!props.liveCard || !!props.tournament)

const close = () => emit('close')

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') close()
}

watch(open, (val) => {
  if (!import.meta.client) return
  document.body.style.overflow = val ? 'hidden' : ''
  if (val) window.addEventListener('keydown', onKeydown)
  else window.removeEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  if (import.meta.client) {
    document.body.style.overflow = ''
    window.removeEventListener('keydown', onKeydown)
  }
})

const headerLabel = computed(() => {
  if (props.liveCard) return props.liveCard.label
  if (props.tournament) return props.tournament.name
  if (!props.sport) return ''
  if (props.sport.detail === 'football') return footballMatch.label
  if (props.sport.detail === 'basketball') return basketballMatch.label
  return `${props.sport.e} ${props.sport.name}`
})

const fixtureTeam = (
  team: EventHubFixture['homeTeam'],
  placeholder: string | null,
) => {
  const name = team?.customName ?? team?.team?.name ?? placeholder ?? 'TBD'
  const abbr = (team?.customShortName ?? name.slice(0, 3)).toUpperCase()
  return { name, abbr, logoUrl: team?.logoUrl ?? null }
}

const fixtureStatusText = (f: EventHubFixture) => {
  if (f.status === 'COMPLETED') return 'FT'
  if (['LIVE', 'EXTRATIME', 'NORMAL_TIME_ENDED'].includes(f.status)) {
    const minute = getMatchMinute(f as any)
    return minute != null ? `${minute}'` : 'LIVE'
  }
  return f.startTime
    ? new Date(f.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'TBD'
}

const liveClock = computed(() => {
  if (!props.liveCard) return null
  const hasClock = resolveEngine(props.liveCard.fixture.tournament.sport).capabilities.timer !== 'none'
  if (!hasClock) return null
  const minute = getMatchMinute(props.liveCard.fixture as any)
  return minute != null ? `${minute}'` : null
})

const liveEvents = computed(() => props.liveCard?.fixture.matchEvents ?? [])

const eventText = (e: NonNullable<LiveCard['fixture']['matchEvents']>[number]) => {
  const who = e.player?.name ?? e.participant?.customShortName ?? e.participant?.customName ?? ''
  return e.description ?? `${e.type.replace(/_/g, ' ')}${who ? ` — ${who}` : ''}`
}

const reversedFootballEvents = computed(() => footballMatch.events.slice().reverse())
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 modal-bg bg-black/70 flex items-center justify-center p-4"
      @click.self="close"
    >
      <div class="modal-panel card rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-[#0d1530] border-white/15">
        <div class="px-5 py-3 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#0d1530] z-10">
          <span class="text-xs font-extrabold tracking-wider uppercase text-white/60">{{ headerLabel }}</span>
          <button class="text-white/50 hover:text-white text-lg leading-none" @click="close">✕</button>
        </div>

        <!-- Real tournament detail (fixtures by status) -->
        <div v-if="props.tournament" class="p-5 space-y-5">
          <template v-for="section in ([
            { title: 'Live', items: props.tournament.live, clickable: true },
            { title: 'Upcoming', items: props.tournament.upcoming, clickable: false },
            { title: 'Results', items: props.tournament.results, clickable: false },
          ] as const)" :key="section.title">
            <div v-if="section.items.length">
              <h4 class="text-xs font-black uppercase tracking-wider text-white/50 mb-2 flex items-center gap-2">
                <span v-if="section.title === 'Live'" class="live-dot w-1.5 h-1.5 bg-red-500 rounded-full inline-block" />
                {{ section.title }}
              </h4>
              <div class="space-y-1.5">
                <button
                  v-for="f in section.items"
                  :key="f.id"
                  class="w-full card rounded-lg px-3 py-2.5 flex items-center gap-3 text-xs"
                  :class="{ 'card-hover': section.clickable, 'cursor-default': !section.clickable }"
                  @click="section.clickable ? emit('openFixture', f) : undefined"
                >
                  <span class="text-white/40 w-16 shrink-0 text-left">
                    {{ f.roundName ?? `Round ${f.round}` }}
                  </span>
                  <span class="flex-1 text-right font-bold truncate">{{ fixtureTeam(f.homeTeam, f.homeTeamPlaceholder).name }}</span>
                  <span class="w-14 text-center font-black shrink-0">
                    <template v-if="f.status === 'COMPLETED' || ['LIVE', 'EXTRATIME', 'NORMAL_TIME_ENDED'].includes(f.status)">
                      {{ f.homeScore ?? 0 }}–{{ f.awayScore ?? 0 }}
                    </template>
                    <span v-else class="text-[#f5b32b] font-bold">{{ fixtureStatusText(f) }}</span>
                  </span>
                  <span class="flex-1 font-bold truncate">{{ fixtureTeam(f.awayTeam, f.awayTeamPlaceholder).name }}</span>
                  <span
                    class="w-10 shrink-0 text-right text-[10px] font-bold"
                    :class="['LIVE', 'EXTRATIME', 'NORMAL_TIME_ENDED'].includes(f.status) ? 'text-red-400' : 'text-white/40'"
                  >
                    {{ ['LIVE', 'EXTRATIME', 'NORMAL_TIME_ENDED'].includes(f.status) ? fixtureStatusText(f) : f.status === 'COMPLETED' ? 'FT' : '' }}
                  </span>
                </button>
              </div>
            </div>
          </template>
          <p
            v-if="!props.tournament.live.length && !props.tournament.upcoming.length && !props.tournament.results.length"
            class="text-sm text-white/50 text-center py-6"
          >
            No fixtures yet for this discipline.
          </p>
        </div>

        <!-- Real live fixture match centre -->
        <div v-else-if="props.liveCard" class="p-6">
          <div class="flex items-center justify-between text-center">
            <div class="flex-1">
              <img
                v-if="props.liveCard.home.logoUrl"
                :src="props.liveCard.home.logoUrl"
                :alt="props.liveCard.home.abbr"
                class="w-16 h-16 mx-auto rounded-full object-contain bg-white/5 border-2 border-white/20 p-1.5"
              >
              <div v-else class="w-16 h-16 mx-auto rounded-full bg-white/10 flex items-center justify-center font-black text-lg border-2 border-white/20">
                {{ props.liveCard.home.abbr }}
              </div>
              <div class="mt-2 font-bold text-sm">{{ props.liveCard.home.name }}</div>
            </div>
            <div class="px-6">
              <div class="text-5xl font-black tracking-tight">
                <span>{{ props.liveCard.hs }}</span><span class="text-white/30 mx-2">–</span><span>{{ props.liveCard.as }}</span>
              </div>
              <div
                v-if="liveClock || props.liveCard"
                class="text-[11px] text-red-400 font-bold mt-1 flex items-center justify-center gap-1"
              >
                <span class="live-dot w-1.5 h-1.5 bg-red-500 rounded-full inline-block" />
                {{ liveClock ? `${liveClock} LIVE` : 'LIVE' }}
              </div>
            </div>
            <div class="flex-1">
              <img
                v-if="props.liveCard.away.logoUrl"
                :src="props.liveCard.away.logoUrl"
                :alt="props.liveCard.away.abbr"
                class="w-16 h-16 mx-auto rounded-full object-contain bg-white/5 border-2 border-white/20 p-1.5"
              >
              <div v-else class="w-16 h-16 mx-auto rounded-full bg-white/10 flex items-center justify-center font-black text-lg border-2 border-white/20">
                {{ props.liveCard.away.abbr }}
              </div>
              <div class="mt-2 font-bold text-sm">{{ props.liveCard.away.name }}</div>
            </div>
          </div>

          <h4 class="text-xs font-black uppercase tracking-wider text-white/50 mt-6 mb-2">Match Events</h4>
          <div v-if="liveEvents.length" class="text-xs">
            <div
              v-for="event in liveEvents"
              :key="event.id"
              class="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0"
            >
              <span class="text-[#f5b32b] font-bold w-10 text-right">{{ event.minute != null ? `${event.minute}'` : '—' }}</span>
              <span class="text-white/80">{{ eventText(event) }}</span>
            </div>
          </div>
          <p v-else class="text-xs text-white/40">Events will appear here as they happen.</p>
        </div>

        <!-- Football match centre (mock) -->
        <div v-else-if="props.sport?.detail === 'football'" class="p-6">
          <div class="flex items-center justify-between text-center">
            <div class="flex-1">
              <div class="w-16 h-16 mx-auto rounded-full flex items-center justify-center font-black text-lg border-2 border-white/20" :style="{ background: footballMatch.home.color }">
                {{ footballMatch.home.abbr }}
              </div>
              <div class="mt-2 font-bold">{{ footballMatch.home.name }}</div>
            </div>
            <div class="px-6">
              <div class="text-5xl font-black tracking-tight">
                <span>{{ footballMatch.hs }}</span><span class="text-white/30 mx-2">–</span><span>{{ footballMatch.as }}</span>
              </div>
              <div class="text-[11px] text-red-400 font-bold mt-1 flex items-center justify-center gap-1">
                <span class="live-dot w-1.5 h-1.5 bg-red-500 rounded-full inline-block" />
                {{ footballMatch.clock }} {{ footballMatch.clockLabel }}
              </div>
            </div>
            <div class="flex-1">
              <div class="w-16 h-16 mx-auto rounded-full flex items-center justify-center font-black text-lg border-2 border-white/20" :style="{ background: footballMatch.away.color }">
                {{ footballMatch.away.abbr }}
              </div>
              <div class="mt-2 font-bold">{{ footballMatch.away.name }}</div>
            </div>
          </div>
          <div class="mt-5 grid grid-cols-3 gap-2 text-center text-[11px]">
            <div v-for="stat in footballMatch.stats" :key="stat.label" class="card rounded-lg p-2.5">
              <div class="font-black text-base">{{ stat.value }}</div>
              <div class="text-white/40 text-[9px] uppercase">{{ stat.label }}</div>
            </div>
          </div>
          <h4 class="text-xs font-black uppercase tracking-wider text-white/50 mt-5 mb-2">Match Events</h4>
          <div class="text-xs">
            <div
              v-for="(event, i) in reversedFootballEvents"
              :key="i"
              class="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0"
            >
              <span class="text-[#f5b32b] font-bold w-10 text-right">{{ event.min }}</span>
              <span>{{ event.icon }}</span>
              <span class="text-white/80">{{ event.text }}</span>
            </div>
          </div>
        </div>

        <!-- Basketball match centre -->
        <div v-else-if="props.sport?.detail === 'basketball'" class="p-6">
          <div class="flex items-center justify-between text-center">
            <div class="flex-1">
              <div class="w-16 h-16 mx-auto rounded-full flex items-center justify-center font-black text-lg border-2 border-white/20" :style="{ background: basketballMatch.home.color }">
                {{ basketballMatch.home.abbr }}
              </div>
              <div class="mt-2 font-bold">{{ basketballMatch.home.name }}</div>
            </div>
            <div class="px-6">
              <div class="text-5xl font-black tracking-tight">
                <span>{{ basketballMatch.hs }}</span><span class="text-white/30 mx-2">–</span><span>{{ basketballMatch.as }}</span>
              </div>
              <div class="text-[11px] text-red-400 font-bold mt-1 flex items-center justify-center gap-1">
                <span class="live-dot w-1.5 h-1.5 bg-red-500 rounded-full inline-block" />
                {{ basketballMatch.clock }}
              </div>
            </div>
            <div class="flex-1">
              <div class="w-16 h-16 mx-auto rounded-full flex items-center justify-center font-black text-lg border-2 border-white/20" :style="{ background: basketballMatch.away.color }">
                {{ basketballMatch.away.abbr }}
              </div>
              <div class="mt-2 font-bold">{{ basketballMatch.away.name }}</div>
            </div>
          </div>
          <table class="w-full text-xs mt-6">
            <thead>
              <tr class="text-[10px] text-white/40 uppercase">
                <th class="text-left py-2">Team</th>
                <th v-for="label in basketballMatch.quarters.labels" :key="label" class="py-2">{{ label }}</th>
                <th class="py-2 font-bold">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr class="row-alt">
                <td class="py-2 font-bold">{{ basketballMatch.home.name }}</td>
                <td v-for="(q, i) in basketballMatch.quarters.home" :key="i" class="text-center" :class="{ 'text-[#f5b32b] font-bold': i === basketballMatch.quarters.home.length - 1 }">{{ q }}</td>
                <td class="text-center font-extrabold">{{ basketballMatch.hs }}</td>
              </tr>
              <tr class="row-alt">
                <td class="py-2 font-bold">{{ basketballMatch.away.name }}</td>
                <td v-for="(q, i) in basketballMatch.quarters.away" :key="i" class="text-center" :class="{ 'text-[#f5b32b] font-bold': i === basketballMatch.quarters.away.length - 1 }">{{ q }}</td>
                <td class="text-center font-extrabold">{{ basketballMatch.as }}</td>
              </tr>
            </tbody>
          </table>
          <div class="mt-4 text-xs text-white/40">{{ basketballMatch.topScorer }}</div>
        </div>

        <!-- Race results (athletics / swimming) -->
        <div v-else-if="props.sport?.detail === 'athletics' || props.sport?.detail === 'swimming'" class="p-5">
          <template v-for="result in [props.sport.detail === 'athletics' ? athleticsResult : swimmingResult]" :key="result.title">
            <h4 class="font-black text-sm mb-3">{{ result.title }}</h4>
            <table class="w-full text-xs">
              <thead>
                <tr class="text-[10px] uppercase text-white/40 border-b border-white/10">
                  <th class="text-left py-2">Lane</th>
                  <th class="text-left py-2">Athlete</th>
                  <th class="text-left py-2">University</th>
                  <th class="text-right py-2">Time</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in result.rows"
                  :key="row.lane"
                  class="row-alt"
                  :class="{ 'medal-gold': row.medal === 'g' }"
                >
                  <td class="py-2">{{ row.lane }}</td>
                  <td class="py-2" :class="{ 'font-bold': row.medal }">{{ row.athlete }}</td>
                  <td class="py-2 text-white/60">{{ row.uni }}</td>
                  <td class="py-2 text-right" :class="row.medal === 'g' ? 'font-extrabold text-[#f5b32b]' : row.medal ? 'font-bold' : ''">
                    {{ row.time }}
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="text-[10px] text-white/40 mt-2">{{ result.note }}</div>
          </template>
        </div>

        <!-- Volleyball result -->
        <div v-else-if="props.sport?.detail === 'volleyball'" class="p-5">
          <h4 class="font-black text-sm mb-3">{{ volleyballResult.title }}</h4>
          <div class="text-center py-3">
            <span class="font-black">{{ volleyballResult.home }}</span>
            <span class="text-2xl font-black mx-3">{{ volleyballResult.score }}</span>
            <span class="font-black">{{ volleyballResult.away }}</span>
          </div>
          <div class="flex justify-center gap-2 text-[11px] font-bold">
            <span v-for="set in volleyballResult.sets" :key="set" class="px-2.5 py-1 rounded bg-white/5">{{ set }}</span>
          </div>
          <div class="text-[10px] text-white/40 text-center mt-3">{{ volleyballResult.medals }}</div>
        </div>

        <!-- Boxing bracket -->
        <div v-else-if="props.sport?.detail === 'boxing'" class="p-5">
          <h4 class="font-black text-sm mb-3">{{ boxingBracket.title }}</h4>
          <div class="space-y-2 text-xs">
            <div
              v-for="bout in boxingBracket.bouts"
              :key="bout.name"
              class="rounded-lg px-3 py-2 flex justify-between"
              :class="bout.winner ? 'card' : 'opacity-50'"
            >
              <span :class="{ 'font-bold': bout.winner }">{{ bout.name }}</span>
              <span v-if="bout.winner" class="text-[#f5b32b] font-bold">{{ bout.result }}</span>
              <span v-else>{{ bout.result }}</span>
            </div>
            <div class="rounded-lg px-3 py-2 flex justify-between border border-[#f5b32b]/40 bg-[#f5b32b]/10">
              <span class="font-bold">{{ boxingBracket.final.label }}</span>
              <span class="text-[#f5b32b] font-bold">{{ boxingBracket.final.when }}</span>
            </div>
          </div>
        </div>

        <!-- Generic upcoming sport -->
        <div v-else class="p-5">
          <div class="text-center py-6">
            <div class="text-3xl mb-2">📋</div>
            <div class="text-sm text-white/60">
              Schedule, draws, and live results for this discipline appear here the moment competition begins.
            </div>
            <div class="text-[10px] text-white/40 mt-2">
              Results flow straight into the medal table automatically.
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.row-alt:nth-child(even) {
  background: rgba(255, 255, 255, 0.025);
}
.medal-gold {
  background: linear-gradient(90deg, rgba(245, 179, 43, 0.16), transparent);
}
.modal-bg {
  backdrop-filter: blur(6px);
  animation: fadeIn 0.2s ease;
}
.modal-panel {
  animation: slideUp 0.3s cubic-bezier(0.2, 0.9, 0.3, 1.1);
}
@keyframes fadeIn {
  from { opacity: 0; }
}
@keyframes slideUp {
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
