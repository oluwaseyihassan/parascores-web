<script setup lang="ts">
import { tickerItems } from './mock'

const props = withDefaults(defineProps<{
  items?: string[]
}>(), {
  items: () => tickerItems,
})

const { meta } = useEventHub()

const items = computed(() => [...props.items, ...props.items])
</script>

<template>
  <div class="bg-[#f5b32b] text-[#0a0f1e] overflow-hidden py-1.5 text-xs font-bold">
    <div class="marquee-track">
      <span v-for="(item, i) in items" :key="i" class="flex items-center whitespace-nowrap">
        <span class="mx-6">{{ item }}</span>
        <img :src="meta.mascotHead" alt="" class="h-4.5 w-auto opacity-80">
      </span>
    </div>
  </div>
</template>

<style scoped>
.marquee-track {
  display: flex;
  align-items: center;
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
