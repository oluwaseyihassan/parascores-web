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
  ogImage: 'https://res.cloudinary.com/djsnerfzp/image/upload/v1780242386/og-image_mbs1ei.png',
  twitterImage: 'https://res.cloudinary.com/djsnerfzp/image/upload/v1780242386/og-image_mbs1ei.png',
  twitterCard: 'summary_large_image'
})
</script>