<script setup lang="ts">
import MarketingFixtureDetails from '~/components/marketing/FixtureDetails.vue'

definePageMeta({
  layout: 'feed'
})

const { toTournament } = useHost()
const route = useRoute()
const router = useRouter()
const tournamentId = route.params.id as string
const fixtureId = route.params.fixtureId as string

const handleBack = () => {
  if (window.history.length > 2 || window.history.state?.back) {
    router.back()
  } else {
    navigateTo(toTournament({ id: tournamentId }))
  }
}
</script>

<template>
  <MarketingFixtureDetails
    :tournamentId="tournamentId"
    :fixtureId="fixtureId"
    @back="handleBack"
  />
</template>
