<script setup lang="ts">
import { medals as mockMedals } from './mock'

const props = withDefaults(defineProps<{
  medals?: typeof mockMedals
  mode?: 'preview' | 'full'
}>(), {
  medals: () => mockMedals,
  mode: 'full',
})

const { meta } = useEventHub()

const emit = defineEmits<{
  viewAll: []
}>()

const expanded = ref(false)

// Briefly flash rows whose medal count changed (visible even when ranks don't move)
const prevTotals = new Map<string, number>()
const flashing = ref<Set<string>>(new Set())
let flashTimer: ReturnType<typeof setTimeout> | undefined

const seedTotals = (rows: typeof mockMedals) => {
  for (const m of rows) prevTotals.set(m.u, m.g + m.s + m.b)
}

// Seed on mount so the first live update can be detected as a change
onMounted(() => seedTotals(props.medals))

watch(() => props.medals, (rows) => {
  const changed = new Set<string>()
  for (const m of rows) {
    const total = m.g + m.s + m.b
    if (prevTotals.has(m.u) && prevTotals.get(m.u) !== total) changed.add(m.u)
  }
  seedTotals(rows)
  if (!changed.size) return
  flashing.value = changed
  if (flashTimer) clearTimeout(flashTimer)
  flashTimer = setTimeout(() => (flashing.value = new Set()), 1300)
})

const previewRows = computed(() => props.medals.slice(0, 4))
const fullRows = computed(() => expanded.value ? props.medals : props.medals.slice(0, 8))
</script>

<template>
  <section>
    <!-- Preview mode (overview tab) -->
    <template v-if="props.mode === 'preview'">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-xl font-black tracking-tight flex items-center gap-2">
          <img :src="meta.mascotHead" alt="" class="h-7 w-auto -my-1">
          🏅 Medal Table
        </h2>
        <button v-if="props.medals.length" class="text-xs font-bold text-[var(--event-accent)] hover:underline" @click="emit('viewAll')">
          Full table →
        </button>
      </div>
      <div v-if="!props.medals.length" class="card rounded-2xl p-8 text-center">
        <img :src="meta.mascot" :alt="`${meta.name} mascot`" class="h-24 w-auto mx-auto mb-3 opacity-90 drop-shadow-lg">
        <p class="text-sm text-white/50">No medals decided yet — standings update the moment the first final completes.</p>
      </div>
      <TransitionGroup v-else name="medal" tag="div" class="card relative rounded-2xl overflow-hidden">
        <div
          v-for="(m, i) in previewRows"
          :key="m.u"
          class="medal-row flex items-center px-5 py-3 border-b border-white/5 last:border-0"
          :class="{ 'medal-gold': i === 0, 'row-flash': flashing.has(m.u) }"
        >
          <span class="w-6 font-black text-white/50">{{ i + 1 }}</span>
          <span class="flex-1 font-bold text-sm flex items-center gap-2">
            <img v-if="m.logoUrl" :src="m.logoUrl" :alt="m.u" class="w-5 h-5 rounded object-contain bg-white/5 p-0.5">
            {{ m.u }}<span v-if="m.host" class="text-[10px] text-white/40 ml-1">HOST</span>
          </span>
          <span class="text-xs text-white/50 w-20 text-center">🥇 {{ m.g }}</span>
          <span class="text-xs text-white/50 w-20 text-center">🥈 {{ m.s }}</span>
          <span class="text-xs text-white/50 w-20 text-center">🥉 {{ m.b }}</span>
          <span class="w-12 text-right font-black" :class="{ 'text-[var(--event-accent)]': i === 0 }">{{ m.g + m.s + m.b }}</span>
        </div>
      </TransitionGroup>
    </template>

    <!-- Full mode (medals tab) -->
    <template v-else>
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-xl font-black tracking-tight flex items-center gap-2">
          <img :src="meta.mascotHead" alt="" class="h-7 w-auto -my-1">
          🏅 Live Medal Table
        </h2>
        <span class="text-[11px] text-white/40 uppercase tracking-wider">Auto-computed from official results</span>
      </div>
      <div v-if="!props.medals.length" class="card rounded-2xl p-10 text-center">
        <img :src="meta.mascot" :alt="`${meta.name} mascot`" class="h-28 w-auto mx-auto mb-3 opacity-90 drop-shadow-lg">
        <p class="text-sm text-white/50">No medals awarded yet.</p>
        <p class="text-[11px] text-white/40 mt-1">Gold, silver and bronze appear here automatically as finals complete across all disciplines.</p>
      </div>
      <div v-else class="card rounded-2xl overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-[10px] uppercase tracking-wider text-white/40 border-b border-white/10">
              <th class="text-left px-4 py-3">#</th>
              <th class="text-left px-4 py-3">University</th>
              <th class="px-4 py-3">🥇</th>
              <th class="px-4 py-3">🥈</th>
              <th class="px-4 py-3">🥉</th>
              <th class="px-4 py-3 font-bold">Total</th>
            </tr>
          </thead>
          <TransitionGroup name="medal" tag="tbody" class="font-medium">
            <tr
              v-for="(m, i) in fullRows"
              :key="m.u"
              class="row-alt"
              :class="{ 'medal-gold': i === 0, 'row-flash': flashing.has(m.u) }"
            >
              <td class="px-4 py-3 font-bold">{{ i + 1 }}</td>
              <td class="px-4 py-3">
                <span class="flex items-center gap-2" :class="{ 'font-extrabold': m.host }">
                  <img v-if="m.logoUrl" :src="m.logoUrl" :alt="m.u" class="w-5 h-5 rounded object-contain bg-white/5 p-0.5">
                  {{ m.u }}
                </span>
                <span v-if="m.host" class="text-[10px] text-white/40 ml-1">HOST</span>
              </td>
              <td class="text-center px-4 py-3">{{ m.g }}</td>
              <td class="text-center px-4 py-3">{{ m.s }}</td>
              <td class="text-center px-4 py-3">{{ m.b }}</td>
              <td class="text-center px-4 py-3 font-extrabold" :class="{ 'text-[var(--event-accent)]': i === 0 }">
                {{ m.g + m.s + m.b }}
                <img v-if="i === 0" :src="meta.mascotHead" title="Top of the table" alt="" class="inline-block h-5 w-auto ml-1.5 -my-1 align-middle">
              </td>
            </tr>
          </TransitionGroup>
        </table>
        <button
          class="w-full px-4 py-2.5 text-center text-xs text-white/50 hover:text-white border-t border-white/10 transition-colors"
          @click="expanded = !expanded"
        >
          {{ expanded ? 'Show less ↑' : `View all ${props.medals.length} universities ↓` }}
        </button>
      </div>
    </template>
  </section>
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
  background: linear-gradient(90deg, color-mix(in srgb, var(--event-accent) 16%, transparent), transparent);
}

/* Rows transition their background too (leader highlight glides, not snaps) */
.medal-row, .row-alt {
  transition: background-color 0.7s ease;
}

/* Smooth rank swaps — TransitionGroup FLIP move transition.
   NOTE: must redeclare background-color here — the .row-alt rule above has
   equal specificity and would otherwise override `transition`, dropping
   transform from the property list and killing the move animation. */
.medal-move {
  transition: transform 0.85s cubic-bezier(0.25, 0.8, 0.25, 1), background-color 0.7s ease;
  position: relative;
  z-index: 1;
}

/* Rows entering/leaving the visible slice (e.g. breaking into the top 4):
   fade while siblings glide into the freed space */
.medal-enter-active, .medal-leave-active {
  transition: opacity 0.45s ease;
}
.medal-enter-from, .medal-leave-to {
  opacity: 0;
}
.medal-leave-active {
  position: absolute;
  width: 100%;
}

/* Gold pulse on rows whose medal count just changed */
@keyframes row-flash {
  0% { background-color: color-mix(in srgb, var(--event-accent) 28%, transparent); }
  100% { background-color: transparent; }
}
.row-flash {
  animation: row-flash 1.2s ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .medal-move { transition: none; }
  .medal-enter-active, .medal-leave-active { transition: none; }
  .row-flash { animation: none; }
}
</style>
