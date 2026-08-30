<script setup lang="ts">
import { footballMatch, basketballMatch } from './mock'
import type { LiveCard } from '~/composables/useEventHub'

const props = withDefaults(defineProps<{
  cards?: LiveCard[] | null
}>(), {
  cards: null,
})

const { meta } = useEventHub()

const emit = defineEmits<{
  open: [key: string]
  openFixture: [card: LiveCard]
}>()

// Mock cards (demo when no org is configured)
const mockCards = [
  {
    key: 'football',
    label: footballMatch.label,
    clock: footballMatch.clock,
    home: footballMatch.home,
    away: footballMatch.away,
    hs: footballMatch.hs,
    as: footballMatch.as,
    lastEvent: footballMatch.lastEvent,
  },
  {
    key: 'basketball',
    label: basketballMatch.label,
    clock: basketballMatch.clock,
    home: basketballMatch.home,
    away: basketballMatch.away,
    hs: basketballMatch.hs,
    as: basketballMatch.as,
    lastEvent: basketballMatch.lastEvent,
  },
]

const isReal = computed(() => props.cards !== null)
</script>

<template>
  <section>
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-xl font-black tracking-tight flex items-center gap-2">
        <span class="live-dot w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
        Happening Now
      </h2>
      <span class="text-[11px] text-white/40">click a match for the full match centre</span>
    </div>

    <!-- Real fixtures -->
    <template v-if="isReal">
      <div v-if="props.cards!.length" class="grid md:grid-cols-2 gap-4">
        <button
          v-for="card in props.cards!"
          :key="card.fixture.id"
          class="card card-hover rounded-2xl p-5 text-left w-full"
          @click="emit('openFixture', card)"
        >
          <div class="flex items-center justify-between text-[10px] font-bold text-white/50 uppercase tracking-wider">
            <span class="truncate pr-2">{{ card.label }}</span>
            <span v-if="card.clock" class="text-red-400 flex items-center gap-1 shrink-0">
              <span class="live-dot w-1.5 h-1.5 bg-red-500 rounded-full inline-block" />
              {{ card.clock }}
            </span>
          </div>
          <div class="mt-4 flex items-center justify-between">
            <div class="flex items-center gap-2.5 min-w-0">
              <img v-if="card.home.logoUrl" :src="card.home.logoUrl" :alt="card.home.abbr" class="w-10 h-10 rounded-full object-contain bg-white/5 border-2 border-white/20 p-1">
              <div v-else class="w-10 h-10 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center text-xs font-black shrink-0">
                {{ card.home.abbr }}
              </div>
              <span class="font-bold text-sm truncate">{{ card.home.name }}</span>
            </div>
            <div class="text-3xl font-black tracking-tight shrink-0 px-3">
              <span>{{ card.hs }}</span><span class="text-white/25 mx-1.5">–</span><span>{{ card.as }}</span>
            </div>
            <div class="flex items-center gap-2.5 min-w-0 justify-end">
              <span class="font-bold text-sm truncate">{{ card.away.name }}</span>
              <img v-if="card.away.logoUrl" :src="card.away.logoUrl" :alt="card.away.abbr" class="w-10 h-10 rounded-full object-contain bg-white/5 border-2 border-white/20 p-1">
              <div v-else class="w-10 h-10 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center text-xs font-black shrink-0">
                {{ card.away.abbr }}
              </div>
            </div>
          </div>
          <div v-if="card.lastEvent" class="mt-3 text-[11px] text-white/40 truncate">{{ card.lastEvent }}</div>
        </button>
      </div>
      <div v-else class="card rounded-2xl p-8 text-center">
        <img :src="meta.mascot" :alt="`${meta.name} mascot`" class="h-24 w-auto mx-auto mb-3 opacity-90 drop-shadow-lg">
        <p class="text-sm text-white/60 font-semibold">The torch is lit — no matches live right now.</p>
        <p class="text-[11px] text-white/40 mt-1">Check the schedule for what's coming up.</p>
      </div>
    </template>

    <!-- Mock demo cards -->
    <div v-else class="grid md:grid-cols-2 gap-4">
      <button
        v-for="card in mockCards"
        :key="card.key"
        class="card card-hover rounded-2xl p-5 text-left w-full"
        @click="emit('open', card.key)"
      >
        <div class="flex items-center justify-between text-[10px] font-bold text-white/50 uppercase tracking-wider">
          <span>{{ card.label }}</span>
          <span class="text-red-400 flex items-center gap-1">
            <span class="live-dot w-1.5 h-1.5 bg-red-500 rounded-full inline-block" />
            {{ card.clock }}
          </span>
        </div>
        <div class="mt-4 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div
              class="w-10 h-10 rounded-full border-2 border-white/20 flex items-center justify-center text-xs font-black"
              :style="{ background: card.home.color }"
            >
              {{ card.home.abbr }}
            </div>
            <span class="font-bold text-sm">{{ card.home.name }}</span>
          </div>
          <div class="text-3xl font-black tracking-tight">
            <span>{{ card.hs }}</span><span class="text-white/25 mx-1.5">–</span><span>{{ card.as }}</span>
          </div>
          <div class="flex items-center gap-2.5">
            <span class="font-bold text-sm">{{ card.away.name }}</span>
            <div
              class="w-10 h-10 rounded-full border-2 border-white/20 flex items-center justify-center text-xs font-black"
              :style="{ background: card.away.color }"
            >
              {{ card.away.abbr }}
            </div>
          </div>
        </div>
        <div class="mt-3 text-[11px] text-white/40">{{ card.lastEvent }}</div>
      </button>
    </div>
  </section>
</template>

<style scoped>
.card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.25s ease;
}
.card-hover:hover {
  background: rgba(255, 255, 255, 0.07);
  border-color: color-mix(in srgb, var(--event-accent) 40%, transparent);
  transform: translateY(-2px);
  cursor: pointer;
}
</style>
