<script setup lang="ts">
import MarketingFixtureDetails from '~/components/marketing/FixtureDetails.vue'

definePageMeta({
  layout: 'feed'
})

const { toTournament } = useHost()
const route = useRoute()
const tournamentId = route.params.id as string
const fixtureId = route.params.fixtureId as string
</script>

<template>
  <MarketingFixtureDetails
    :tournamentId="tournamentId"
    :fixtureId="fixtureId"
    @back="navigateTo(toTournament({ id: tournamentId }))"
  />
</template>
