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
    <div class="absolute inset-0 bg-gradient-to-r from-[#1e3a8a]/40 via-transparent to-[#f5b32b]/10 pointer-events-none" />
    <div class="max-w-7xl mx-auto px-4 py-5 flex flex-wrap items-center gap-4 relative">
      <div class="flex items-center gap-3">
        <img :src="props.meta.mascot" class="w-12 h-12 rounded-xl object-cover border border-white/20" :alt="`${props.meta.name} mascot`">
        <div>
          <div class="text-sm font-extrabold">{{ props.meta.dates }} · {{ props.meta.venue }}</div>
          <div class="text-[11px] text-white/50">{{ props.meta.tagline }}</div>
        </div>
      </div>
      <div class="ml-auto flex items-center gap-2 text-center">
        <div class="card rounded-lg px-3 py-1.5 min-w-[52px]">
          <div class="text-lg font-black text-[#f5b32b] leading-none">{{ days }}</div>
          <div class="text-[8px] text-white/40 uppercase tracking-wider mt-0.5">days</div>
        </div>
        <div class="card rounded-lg px-3 py-1.5 min-w-[52px]">
          <div class="text-lg font-black text-[#f5b32b] leading-none">{{ hours }}</div>
          <div class="text-[8px] text-white/40 uppercase tracking-wider mt-0.5">hrs</div>
        </div>
        <div class="card rounded-lg px-3 py-1.5 min-w-[52px]">
          <div class="text-lg font-black text-[#f5b32b] leading-none">{{ mins }}</div>
          <div class="text-[8px] text-white/40 uppercase tracking-wider mt-0.5">min</div>
        </div>
        <div class="card rounded-lg px-3 py-1.5 min-w-[52px]">
          <div class="text-lg font-black text-[#f5b32b] leading-none">{{ secs }}</div>
          <div class="text-[8px] text-white/40 uppercase tracking-wider mt-0.5">sec</div>
        </div>
        <div class="text-[9px] text-white/40 ml-1 leading-tight text-left">
          {{ props.meta.countdownLabel }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
</style>
