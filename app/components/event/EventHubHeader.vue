<script setup lang="ts">
import { hubMeta } from './mock'

const props = defineProps<{
  activeTab: string
  meta?: typeof hubMeta
}>()

const emit = defineEmits<{
  'update:activeTab': [tab: string]
}>()

const tabs = [
  { id: 'overview', label: 'Overview', short: 'Overview' },
  { id: 'medals', label: 'Medal Table', short: 'Medals' },
  { id: 'sports', label: 'All Sports', short: 'Sports' },
  { id: 'schedule', label: 'Schedule', short: 'Schedule' },
]
</script>

<template>
  <header class="sticky top-0 z-40 bg-[#0b1226]/90 backdrop-blur-md border-b border-white/10">
    <div class="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
      <img :src="props.meta?.logo ?? hubMeta.logo" :alt="props.meta?.name ?? hubMeta.name" class="h-10 w-auto">
      <div>
        <div class="font-black tracking-tight leading-none text-lg">
          {{ props.meta?.name ?? hubMeta.name }}
        </div>
        <div class="text-[10px] text-white/50 tracking-widest uppercase">
          Live Results Hub · {{ props.meta?.location ?? hubMeta.location }}
        </div>
      </div>
      <div class="hidden md:flex items-center gap-1 mx-auto">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab-btn px-4 py-2 text-xs font-bold text-white/60 hover:text-white"
          :class="{ 'tab-active': props.activeTab === tab.id }"
          @click="emit('update:activeTab', tab.id)"
        >
          {{ tab.label }}
        </button>
      </div>
      <div class="ml-auto flex items-center gap-3">
        <span class="hidden sm:flex items-center gap-1.5 text-xs font-bold text-red-400">
          <span class="live-dot w-2 h-2 rounded-full bg-red-500 inline-block" />
          {{ hubMeta.dayIndicator }}
        </span>
      </div>
    </div>
    <div class="md:hidden flex justify-center gap-1 pb-2">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn px-3 py-1.5 text-[11px] font-bold text-white/60 hover:text-white"
        :class="{ 'tab-active': props.activeTab === tab.id }"
        @click="emit('update:activeTab', tab.id)"
      >
        {{ tab.short }}
      </button>
    </div>
  </header>
</template>

<style scoped>
.tab-btn {
  transition: all 0.2s;
  border-bottom: 3px solid transparent;
}
.tab-active {
  border-bottom-color: #f5b32b;
  color: #fff !important;
}
</style>
