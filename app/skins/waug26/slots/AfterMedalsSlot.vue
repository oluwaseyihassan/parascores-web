<script setup lang="ts">
// WAUG26 bespoke block — host-city highlight, rendered from real hub meta.
const { meta } = useEventHub()
</script>

<template>
  <section class="card rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-5">
    <img :src="meta.mascot" :alt="`${meta.name} mascot`" class="h-28 w-auto drop-shadow-lg shrink-0">
    <div class="text-center sm:text-left">
      <h2 class="text-lg font-black tracking-tight">
        {{ meta.venue }}, {{ meta.location }}
      </h2>
      <p class="text-xs text-white/50 mt-1">
        {{ meta.dates }} · {{ meta.tagline }}
      </p>
      <p class="text-[11px] text-white/40 mt-2 uppercase tracking-widest">
        The torch burns in {{ meta.location }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
</style>
