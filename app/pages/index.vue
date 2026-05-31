<template>
  <FanFeed />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'feed'
})

useSeoMeta({
  title: 'Parascores - Your Fan Feed',
  description: 'Follow your favorite tournaments, teams, and athletes directly on your personalized Fan Feed.',
  ogTitle: 'Parascores - Your Fan Feed',
  ogDescription: 'Follow your favorite tournaments, teams, and athletes directly on your personalized Fan Feed.',
  ogImage: 'https://www.parascores.com/og-image.png',
  twitterImage: 'https://www.parascores.com/og-image.png',
  twitterCard: 'summary_large_image'
})
</script>