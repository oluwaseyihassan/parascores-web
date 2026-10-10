<script setup lang="ts">
/**
 * Moved: the Overview page is now the dashboard home at '/'
 * (_manage/index.vue). This stub keeps stale /overview links working.
 */
definePageMeta({
  middleware: ['require-organizer'],
  layout: 'dashboard-v2'
})

await navigateTo('/', { replace: true })
</script>

<template>
  <div />
</template>
