<template>
  <div class="min-h-screen transition-colors" :class="isDark ? 'bg-[#0A0A0A]' : 'bg-white'">
    <!-- Cover & Logo Header -->
    <div 
      class="h-48 md:h-64 w-full bg-cover bg-center relative transition-colors"
      :class="isDark ? 'bg-[#111111]' : 'bg-gray-100'"
    >


      <!-- Back link -->

      <div class="absolute top-6 inset-x-0 z-10 w-full">
        <div class="max-w-7xl mx-auto px-4 sm:px-6">
          <button @click="router.back()" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-xs font-semibold text-white/90 hover:text-white transition-all border border-white/10 cursor-pointer">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 h-full relative flex items-end pb-8">
        <div class="flex items-center gap-6">
          <div 
            class="w-24 h-24 md:w-32 md:h-32 rounded-2xl border-4 overflow-hidden shadow-2xl shrink-0 flex items-center justify-center transition-colors"
            :class="isDark ? 'border-[#0A0A0A] bg-[#111827]' : 'border-white bg-gray-50'"
          >
            <img v-if="organization?.logoUrl" :src="organization.logoUrl" :alt="organization?.name" class="w-full h-full object-cover" />
            <UIcon v-else name="i-heroicons-building-office-2" class="w-12 h-12 text-gray-400" />
          </div>
          <div class="pb-2">
            <h1 
              class="text-3xl md:text-5xl font-black flex items-center gap-2 tracking-tight"
              :class="isDark ? 'text-white' : 'text-gray-900'"
            >
              {{ organization?.name || 'Organization' }}
              <UIcon v-if="organization?.isVerified" name="i-heroicons-check-badge-solid" class="text-emerald-500 w-6 h-6 md:w-8 md:h-8 shrink-0" />
            </h1>
            <p 
              class="mt-2 font-bold text-sm uppercase tracking-widest"
              :class="isDark ? 'text-gray-400' : 'text-gray-500'"
            >
              Joined {{ formattedDate }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <UTabs :items="tabs" class="w-full">
        <template #tournaments>
          <div class="mt-8">
            <!-- Loading -->
            <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <USkeleton v-for="i in 4" :key="i" class="h-64 rounded-xl" />
            </div>
            
            <!-- Error -->
            <div 
              v-else-if="error" 
              class="border rounded-xl p-8 text-center"
              :class="isDark ? 'bg-red-500/5 border-red-500/20 text-red-400' : 'bg-red-50 border-red-100 text-red-600'"
            >
              <UIcon name="i-heroicons-exclamation-triangle" class="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p class="font-bold">{{ error }}</p>
            </div>
            
            <!-- Empty State -->
            <div 
              v-else-if="!tournaments || tournaments.length === 0" 
              class="rounded-2xl p-16 text-center border-2 border-dashed transition-colors"
              :class="isDark ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-gray-50 border-gray-100'"
            >
              <div 
                class="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center transition-colors"
                :class="isDark ? 'bg-white/[0.03]' : 'bg-white shadow-sm'"
              >
                <UIcon name="i-heroicons-trophy" class="w-10 h-10 text-gray-400" />
              </div>
              <h3 
                class="text-2xl font-black mb-3 tracking-tight"
                :class="isDark ? 'text-white' : 'text-gray-900'"
              >
                No Tournaments Yet
              </h3>
              <p class="text-gray-500 font-medium max-w-sm mx-auto">
                This organization hasn't published any public tournaments available for exploration yet.
              </p>
            </div>
            
            <!-- Grid -->
            <div v-else>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                <TournamentCard 
                  v-for="tournament in tournaments" 
                  :key="tournament.id" 
                  :tournament="tournament" 
                />
              </div>
              
              <!-- Pagination -->
              <div v-if="pagination.totalPages > 1" class="mt-16 flex justify-center">
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
const router = useRouter()
const orgStore = useOrganizationStore()
const colorMode = useColorMode()

const isDark = computed(() => colorMode.value === 'dark')
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
