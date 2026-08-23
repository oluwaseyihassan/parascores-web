<script setup lang="ts">
import { hubMeta } from './mock'

const props = withDefaults(defineProps<{
  meta?: typeof hubMeta
}>(), {
  meta: () => hubMeta,
})

const days = ref('--')
const hours = ref('--')
const mins = ref('--')
const secs = ref('--')

let interval: ReturnType<typeof setInterval> | undefined

const tick = () => {
  const diff = Math.max(0, new Date(props.meta.countdownTarget).getTime() - Date.now())
  days.value = String(Math.floor(diff / 86400000))
  hours.value = String(Math.floor(diff / 3600000) % 24).padStart(2, '0')
  mins.value = String(Math.floor(diff / 60000) % 60).padStart(2, '0')
  secs.value = String(Math.floor(diff / 1000) % 60).padStart(2, '0')
}

onMounted(() => {
  tick()
  interval = setInterval(tick, 1000)
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
})
</script>

<template>
  <div class="relative overflow-hidden">
    <div class="absolute inset-0 bg-gradient-to-r from-[var(--event-primary)]/40 via-transparent to-[var(--event-accent)]/10 pointer-events-none" />
    <div class="max-w-7xl mx-auto px-4 py-5 flex flex-wrap items-center gap-4 relative">
      <div class="min-w-0">
        <div class="text-sm font-extrabold">{{ props.meta.dates }} · {{ props.meta.venue }}</div>
        <div class="text-[11px] text-white/50">{{ props.meta.tagline }}</div>
      </div>
      <div class="flex items-center gap-2 text-center sm:ml-auto">
        <div class="card rounded-lg px-3 py-1.5 min-w-[52px]">
          <div class="text-lg font-black text-[var(--event-accent)] leading-none">{{ days }}</div>
          <div class="text-[8px] text-white/40 uppercase tracking-wider mt-0.5">days</div>
        </div>
        <div class="card rounded-lg px-3 py-1.5 min-w-[52px]">
          <div class="text-lg font-black text-[var(--event-accent)] leading-none">{{ hours }}</div>
          <div class="text-[8px] text-white/40 uppercase tracking-wider mt-0.5">hrs</div>
        </div>
        <div class="card rounded-lg px-3 py-1.5 min-w-[52px]">
          <div class="text-lg font-black text-[var(--event-accent)] leading-none">{{ mins }}</div>
          <div class="text-[8px] text-white/40 uppercase tracking-wider mt-0.5">min</div>
        </div>
        <div class="card rounded-lg px-3 py-1.5 min-w-[52px]">
          <div class="text-lg font-black text-[var(--event-accent)] leading-none">{{ secs }}</div>
          <div class="text-[8px] text-white/40 uppercase tracking-wider mt-0.5">sec</div>
        </div>
        <div class="text-[9px] text-white/40 ml-1 leading-tight text-left">
          {{ props.meta.countdownLabel }}
        </div>
      </div>
      <!-- Mascot centerpiece with flickering torch glow -->
      <div class="mascot-wrap relative shrink-0 -my-2 ml-auto sm:ml-0">
        <div class="mascot-aura absolute inset-0 pointer-events-none" />
        <div class="torch-glow absolute pointer-events-none" />
        <img
          :src="props.meta.mascot"
          :alt="`${props.meta.name} mascot`"
          class="mascot-img relative h-32 sm:h-40 md:h-48 w-auto"
        >
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.mascot-img {
  filter: drop-shadow(0 6px 18px rgba(0, 0, 0, 0.55));
  animation: mascot-bob 6s ease-in-out infinite;
}

/* Soft brand-colored aura behind the figure */
.mascot-aura {
  background: radial-gradient(ellipse 60% 55% at 50% 45%, color-mix(in srgb, var(--event-accent) 16%, transparent), color-mix(in srgb, var(--event-primary) 12%, transparent) 55%, transparent 75%);
}

/* Flame glow — positioned over the torch (upper-left of the figure) */
.torch-glow {
  left: -4%;
  top: 6%;
  width: 52%;
  height: 30%;
  background: radial-gradient(circle, rgba(255, 178, 60, 0.6), rgba(255, 120, 20, 0.28) 45%, transparent 70%);
  filter: blur(7px);
  animation: torch-flicker 2.4s ease-in-out infinite;
}

@keyframes torch-flicker {
  0%, 100% { opacity: 0.75; transform: scale(1); }
  20% { opacity: 1; transform: scale(1.12); }
  45% { opacity: 0.6; transform: scale(0.94); }
  70% { opacity: 0.95; transform: scale(1.06); }
}

@keyframes mascot-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

@media (prefers-reduced-motion: reduce) {
  .mascot-img, .torch-glow { animation: none; }
}
</style>
