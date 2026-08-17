<script setup lang="ts">
import { tickerItems } from './mock'

const props = withDefaults(defineProps<{
  items?: string[]
}>(), {
  items: () => tickerItems,
})

const items = computed(() => [...props.items, ...props.items])
</script>

<template>
  <div class="bg-[#f5b32b] text-[#0a0f1e] overflow-hidden py-1.5 text-xs font-bold">
    <div class="marquee-track">
      <span v-for="(item, i) in items" :key="i" class="mx-8 whitespace-nowrap">{{ item }}</span>
    </div>
  </div>
</template>

<style scoped>
.marquee-track {
  display: flex;
  width: max-content;
  animation: scroll 40s linear infinite;
}
.marquee-track:hover {
  animation-play-state: paused;
}
@keyframes scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
</style>
