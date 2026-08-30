<script setup lang="ts">
import { schedule as mockSchedule } from './mock'

const props = withDefaults(defineProps<{
  items?: typeof mockSchedule
  limit?: number
  header?: boolean
}>(), {
  items: () => mockSchedule,
  limit: 0,
  header: false,
})

const emit = defineEmits<{
  viewAll: []
}>()

const { meta } = useEventHub()

const rows = computed(() => props.limit > 0 ? props.items.slice(0, props.limit) : props.items)
</script>

<template>
  <section>
    <div v-if="props.header" class="flex items-center justify-between mb-3">
      <h2 class="text-xl font-black tracking-tight">Coming Up Today</h2>
      <button class="text-xs font-bold text-[var(--event-accent)] hover:underline" @click="emit('viewAll')">
        Full day →
      </button>
    </div>
    <div v-if="!rows.length" class="card rounded-2xl p-8 text-center">
      <img :src="meta.mascot" :alt="`${meta.name} mascot`" class="h-24 w-auto mx-auto mb-3 opacity-90 drop-shadow-lg">
      <p class="text-sm text-white/50">Nothing scheduled right now — new fixtures appear here automatically.</p>
    </div>
    <div v-else class="card rounded-2xl divide-y divide-white/5">
      <div v-for="item in rows" :key="item.t + item.title" class="px-5 py-3.5 flex items-center gap-4 text-sm">
        <span class="text-[var(--event-accent)] font-bold w-14 text-xs">{{ item.t }}</span>
        <span class="text-lg">{{ item.e }}</span>
        <div class="flex-1">
          <span class="font-bold">{{ item.title }}</span>
          <div class="text-[10px] text-white/40">{{ item.sub }}</div>
        </div>
        <span class="text-[10px] font-bold" :class="item.cls">{{ item.status }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
</style>
