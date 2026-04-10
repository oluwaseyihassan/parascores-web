<template>
  <div class="min-h-screen bg-black">
    <!-- Cover & Logo Header -->
    <div 
      class="h-48 md:h-64 w-full bg-cover bg-center relative"
      :style="{ backgroundColor: organization?.color || '#111111' }"
    >
      <div class="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent"></div>
      <div class="container mx-auto px-4 h-full relative flex items-end pb-6">
        <div class="flex items-center gap-6">
          <div class="w-24 h-24 md:w-32 md:h-32 rounded-xl border-4 border-gray-900 bg-gray-800 overflow-hidden shadow-xl shrink-0 flex items-center justify-center">
            <img v-if="organization?.logoUrl" :src="organization.logoUrl" :alt="organization?.name" class="w-full h-full object-cover" />
            <UIcon v-else name="i-heroicons-building-office-2" class="w-12 h-12 text-gray-500" />
          </div>
          <div>
            <h1 class="text-3xl md:text-5xl font-extrabold text-white flex items-center gap-2">
              {{ organization?.name || 'Organization' }}
              <UIcon v-if="organization?.isVerified" name="i-heroicons-check-badge-solid" class="text-primary-500 w-6 h-6 md:w-8 md:h-8" />
            </h1>
            <p class="text-gray-400 mt-2 font-medium">Joined {{ formattedDate }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="container mx-auto px-4 py-8">
      <UTabs :items="tabs" class="w-full">
        <template #tournaments>
          <div class="mt-8">
            <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <USkeleton v-for="i in 4" :key="i" class="h-64 rounded-xl" />
            </div>
            
            <div v-else-if="error" class="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center text-red-500">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-8 h-8 mx-auto mb-2" />
              <p>{{ error }}</p>
            </div>
            
            <div v-else-if="!tournaments || tournaments.length === 0" class="bg-white/5 rounded-xl p-12 text-center border border-white/10">
              <UIcon name="i-heroicons-trophy" class="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h3 class="text-xl font-bold text-white mb-2">No Tournaments Yet</h3>
              <p class="text-gray-400">This organization hasn't published any public tournaments.</p>
            </div>
            
            <div v-else>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <TournamentCard 
                  v-for="tournament in tournaments" 
                  :key="tournament.id" 
                  :tournament="tournament" 
                />
              </div>
              
              <!-- Pagination -->
              <div v-if="pagination.totalPages > 1" class="mt-10 flex justify-center">
                <UPagination
                  v-model="page"
                  :page-count="pagination.limit"
                  :total="pagination.total"
                  @update:model-value="loadMore"
                />
              </div>
            </div>
          </div>
        </template>
      </UTabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useOrganizationStore } from '~/stores/organization'

definePageMeta({
  layout: 'feed'
})

const { toMain } = useHost()
const route = useRoute()
const orgStore = useOrganizationStore()

const slug = route.params.slug as string
const page = ref(1)

const tabs = [
  { label: 'Tournaments', slot: 'tournaments', icon: 'i-heroicons-trophy' }
]

const { currentOrganization: organization, organizationTournaments: tournaments, loading, error, pagination } = storeToRefs(orgStore)

const formattedDate = computed(() => {
  if (!organization.value?.created_at) return ''
  return new Date(organization.value.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

onMounted(async () => {
  try {
    await orgStore.fetchPublicOrganization(slug)
    await orgStore.fetchOrganizationTournaments(slug, 1)
  } catch (err) {
    console.error('Initial load failed:', err)
  }
})

async function loadMore(newPage: number) {
  page.value = newPage
  await orgStore.fetchOrganizationTournaments(slug, newPage)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// SEO
watchEffect(() => {
  if (organization.value) {
    useSeoMeta({
      title: `${organization.value.name} | ParaScores`,
      description: `View public tournaments hosted by ${organization.value.name}`,
    })
  }
})
</script>
