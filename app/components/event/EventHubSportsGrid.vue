<script setup lang="ts">
import type { HubSport } from './mock'

const props = withDefaults(defineProps<{
  sports: HubSport[]
  big?: boolean
}>(), {
  big: false,
})

const emit = defineEmits<{
  open: [sport: HubSport]
}>()

const statusColor = (s: string) => {
  if (s === 'LIVE') return 'text-red-400'
  if (s === 'RESULTS') return 'text-emerald-400'
  return 'text-sky-400'
}
</script>

<template>
  <div class="grid gap-2.5" :class="props.big ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-8'">
    <button
      v-for="sport in props.sports"
      :key="sport.name"
      class="card card-hover rounded-xl text-center"
      :class="props.big ? 'p-5' : 'p-3'"
      @click="emit('open', sport)"
    >
      <div :class="props.big ? 'text-3xl' : 'text-2xl'">{{ sport.e }}</div>
      <div class="text-xs font-bold mt-1">{{ sport.name }}</div>
      <div class="text-[10px] font-bold mt-0.5" :class="statusColor(sport.status)">
        <span v-if="sport.status === 'LIVE'" class="live-dot inline-block w-1.5 h-1.5 bg-red-500 rounded-full" />
        {{ sport.status }}
      </div>
    </button>
  </div>
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
