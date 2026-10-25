<script setup lang="ts">
import MarketingTeamDetails from '~/components/marketing/TeamDetails.vue'

definePageMeta({
  layout: 'feed'
})

const { toTournament } = useHost()
const route = useRoute()
const router = useRouter()
const tournamentId = route.params.id as string
const participantId = (route.params.participantId || route.params.teamId) as string

const handleBack = () => {
  if (typeof window !== 'undefined' && (window.history.length > 2 || window.history.state?.back)) {
    router.back()
  } else {
    navigateTo({
      path: toTournament({ id: tournamentId }),
      query: { tab: 'participants' }
    })
  }
}
</script>

<template>
  <MarketingTeamDetails
    :tournamentId="tournamentId"
    :participantId="participantId"
    @back="handleBack"
  />
</template>
