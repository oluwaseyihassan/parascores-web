<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import type { ApiResponse } from '~/stores/auth'

definePageMeta({
  auth: false,
  layout: 'feed'
})

const route = useRoute()
const teamId = route.params.id as string

const loading = ref(true)
const error = ref<string | null>(null)
const team = ref<any>(null)

// Owner roster management
const authStore = useAuthStore()
const toast = useToast()
const { handleError } = useErrors()
const isTeamOwner = ref(false)
const expandedRoster = ref<string | null>(null)
const rosterPlayers = ref<Record<string, any[]>>({})
const rosterLoading = ref<string | null>(null)
const addForms = ref<Record<string, { name: string; number?: number; position: string }>>({})
const addingTo = ref<string | null>(null)
const removingPlayerId = ref<string | null>(null)

const rosterPositionOptions = [
  { label: 'Goalkeeper', value: 'GK' },
  { label: 'Defender', value: 'DEF' },
  { label: 'Midfielder', value: 'MID' },
  { label: 'Forward', value: 'FWD' },
]

async function checkOwnership() {
  if (!authStore.isAuthenticated) return
  try {
    // Owner-only endpoint — succeeds only for the team owner
    await $api(`/teams/${teamId}`, { method: 'GET' })
    isTeamOwner.value = true
  } catch {
    // Not the owner — public profile only
  }
}

async function toggleRoster(participantId: string) {
  if (expandedRoster.value === participantId) {
    expandedRoster.value = null
    return
  }
  expandedRoster.value = participantId
  if (!addForms.value[participantId]) {
    addForms.value[participantId] = { name: '', number: undefined, position: '' }
  }
  if (!rosterPlayers.value[participantId]) {
    rosterLoading.value = participantId
    try {
      const res = await $publicApi<ApiResponse<any[]>>(`/participants/${participantId}/players`)
      rosterPlayers.value[participantId] = res.data || []
    } catch {
      rosterPlayers.value[participantId] = []
    } finally {
      rosterLoading.value = null
    }
  }
}

async function addRosterPlayer(participantId: string) {
  const form = addForms.value[participantId]
  if (!form?.name.trim() || addingTo.value) return
  addingTo.value = participantId
  try {
    const res = await $api<ApiResponse<any>>(`/participants/${participantId}/players`, {
      method: 'POST',
      body: {
        name: form.name.trim(),
        number: form.number || undefined,
        position: form.position || undefined,
      },
    })
    if (res.data) {
      rosterPlayers.value[participantId] = [...(rosterPlayers.value[participantId] || []), res.data]
      addForms.value[participantId] = { name: '', number: undefined, position: '' }
      toast.add({
        title: res.data.status === 'PENDING' ? 'Player Added — Pending Approval' : 'Player Added',
        color: 'success',
      })
    }
  } catch (err: any) {
    handleError(err, { title: 'Could not add player' })
  } finally {
    addingTo.value = null
  }
}

async function removeRosterPlayer(participantId: string, playerId: string) {
  if (removingPlayerId.value) return
  removingPlayerId.value = playerId
  try {
    await $api(`/participants/${participantId}/players/${playerId}`, { method: 'DELETE' })
    rosterPlayers.value[participantId] = (rosterPlayers.value[participantId] || []).filter((p) => p.id !== playerId)
    toast.add({ title: 'Player Removed', color: 'success' })
  } catch (err: any) {
    handleError(err, { title: 'Could not remove player' })
  } finally {
    removingPlayerId.value = null
  }
}

function playerStatusColor(status: string) {
  switch (status) {
    case 'APPROVED': return 'success' as const
    case 'PENDING': return 'warning' as const
    default: return 'error' as const
  }
}

onMounted(async () => {
  try {
    const response = await $publicApi<{success: boolean, data: any}>(`/teams/public/${teamId}`)
    if (!response.success) {
      throw new Error('Data load unsuccessful')
    }
    team.value = response.data
  } catch (err: any) {
    console.error('Public Team API Error:', err)
    error.value = err.data?.message || err.message || 'Failed to load team profile'
  } finally {
    loading.value = false
  }
  checkOwnership()
})

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric'
  })
}

const stats = computed(() => {
  if (!team.value?.participants) return { played: 0, wins: 0, goals: 0 }
  return team.value.participants.reduce((acc: any, p: any) => {
    const s = p.standings?.[0]
    if (s) {
      acc.played += s.played || 0
      acc.wins += s.wins || 0
      acc.goals += s.goalsFor || 0
    }
    return acc
  }, { played: 0, wins: 0, goals: 0 })
})
</script>

<template>
  <div class="max-w-3xl mx-auto py-10 px-4 sm:px-6 min-h-screen">
    <!-- Loading -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-24">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-emerald-500 mb-3" />
      <p class="text-sm font-medium text-black dark:text-gray-400">Loading team profile...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-24">
      <div class="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <UIcon name="i-heroicons-exclamation-triangle" class="w-7 h-7 text-red-500" />
      </div>
      <h2 class="text-lg font-bold text-black dark:text-white mb-1">{{ error }}</h2>
      <p class="text-sm text-black dark:text-gray-400 mb-6">The team profile could not be loaded.</p>
      <UButton to="/explore" variant="soft" color="neutral" size="sm" class="rounded-lg">Explore Tournaments</UButton>
    </div>

    <!-- Team Profile -->
    <div v-else-if="team">
      <!-- Hero Card -->
      <div class="relative bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.06] p-8 mb-10 overflow-hidden shadow-sm">
        <!-- Subtle gradient accent -->
        <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500"></div>

        <div class="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <!-- Avatar -->
          <div class="shrink-0">
            <div class="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 dark:bg-white/[0.06] ring-1 ring-gray-200 dark:ring-white/[0.08]">
              <img v-if="team.logoUrl" :src="team.logoUrl" :alt="team.name" class="w-full h-full object-cover" />
              <div v-else class="w-full h-full flex items-center justify-center text-2xl font-black text-black dark:text-gray-600">
                {{ team.name?.charAt(0)?.toUpperCase() }}
              </div>
            </div>
          </div>

          <!-- Info -->
          <div class="flex-1 text-center sm:text-left min-w-0">
            <h1 class="text-2xl sm:text-3xl font-extrabold text-black dark:text-white truncate">
              {{ team.name }}
            </h1>
            <div class="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-2 text-xs font-medium text-black dark:text-gray-400">
              <span class="flex items-center gap-1.5">
                <UIcon name="i-heroicons-calendar-days" class="w-3.5 h-3.5 text-black dark:text-gray-400" />
                Since {{ formatDate(team.created_at) }}
              </span>
              <span class="flex items-center gap-1.5">
                <UIcon name="i-heroicons-trophy" class="w-3.5 h-3.5 text-black dark:text-gray-400" />
                {{ team.participants?.length || 0 }} tournaments
              </span>
            </div>

            <!-- Stats Row -->
            <div class="flex items-center justify-center sm:justify-start gap-3 mt-5">
              <div class="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06]">
                <span class="text-lg font-bold text-black dark:text-white">{{ stats.played }}</span>
                <span class="text-[10px] font-bold uppercase tracking-wider text-black dark:text-gray-400">played</span>
              </div>
              <div class="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/[0.06] border border-emerald-100 dark:border-emerald-500/[0.12]">
                <span class="text-lg font-bold text-emerald-600 dark:text-emerald-400">{{ stats.wins }}</span>
                <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-600/80 dark:text-emerald-500/70">wins</span>
              </div>
              <div class="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/[0.06] border border-indigo-100 dark:border-indigo-500/[0.12]">
                <span class="text-lg font-bold text-indigo-600 dark:text-indigo-400">{{ stats.goals }}</span>
                <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-600/80 dark:text-indigo-500/70">goals</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tournament History -->
      <div>
        <div class="flex items-center justify-between mb-5 px-1">
          <h2 class="text-sm font-bold text-black dark:text-white">Tournament History</h2>
          <span class="text-xs font-semibold text-black dark:text-gray-400">{{ team.participants?.length || 0 }} total</span>
        </div>

        <div v-if="!team.participants || team.participants.length === 0" class="py-14 text-center rounded-2xl border border-dashed border-gray-200 dark:border-white/[0.06]">
          <UIcon name="i-heroicons-trophy" class="w-8 h-8 text-black/40 dark:text-gray-600 mx-auto mb-3" />
          <p class="text-sm font-medium text-black dark:text-gray-400">No tournament records yet.</p>
        </div>

        <div v-else class="space-y-2.5">
          <NuxtLink 
            v-for="p in team.participants" 
            :key="p.id"
            :to="`/t/${p.tournament.customName || p.tournament.id}`"
            class="group flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.05] hover:border-emerald-300 dark:hover:border-emerald-500/30 hover:shadow-sm transition-all"
          >
            <!-- Tournament Logo -->
            <div class="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/[0.06] shrink-0 ring-1 ring-gray-200/50 dark:ring-white/[0.06]">
              <img v-if="p.tournament.logoUrl" :src="p.tournament.logoUrl" :alt="p.tournament.name" class="w-full h-full object-cover" />
              <div v-else class="w-full h-full flex items-center justify-center text-xs font-bold text-black dark:text-gray-400">
                {{ p.tournament.name?.charAt(0)?.toUpperCase() }}
              </div>
            </div>
            
            <!-- Tournament Info -->
            <div class="flex-1 min-w-0">
              <h4 class="text-sm font-bold text-black dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {{ p.tournament.name }}
              </h4>
              <div class="flex items-center gap-2.5 mt-0.5">
                <span class="text-xs font-medium text-black dark:text-gray-400">{{ formatDate(p.tournament.start_date) }}</span>
                <span class="text-[8px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider">
                  {{ p.tournament.sport }}
                </span>
              </div>
            </div>

            <!-- Results -->
            <div v-if="p.standings?.[0]" class="hidden sm:flex items-center gap-3 text-xs">
              <span class="font-medium text-black dark:text-gray-400">{{ p.standings[0].played }}P</span>
              <span class="font-bold text-emerald-600 dark:text-emerald-400">{{ p.standings[0].wins }}W</span>
              <span class="font-bold text-black dark:text-white">{{ p.standings[0].points }}pts</span>
            </div>

            <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-black/40 dark:text-gray-600 group-hover:text-emerald-500 shrink-0 transition-colors" />
          </NuxtLink>
        </div>
      </div>

      <!-- Owner Roster Management -->
      <div v-if="isTeamOwner && team.participants?.length" class="mt-10">
        <div class="mb-5 px-1">
          <h2 class="text-sm font-bold text-black dark:text-white flex items-center gap-2">
            <UIcon name="i-heroicons-user-group" class="w-4 h-4 text-emerald-500" />
            Manage Roster
          </h2>
          <p class="text-xs text-black dark:text-gray-400 mt-1">
            Add players to your squads. Where the tournament requires it, the organizer reviews additions before they appear on the team sheet.
          </p>
        </div>

        <div class="space-y-2.5">
          <div
            v-for="p in team.participants"
            :key="p.id"
            class="rounded-xl bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.05] overflow-hidden"
          >
            <button
              class="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
              @click="toggleRoster(p.id)"
            >
              <div class="flex-1 min-w-0">
                <h4 class="text-sm font-bold text-black dark:text-white truncate">{{ p.tournament.name }}</h4>
                <p class="text-xs font-medium text-black dark:text-gray-400 mt-0.5 capitalize">{{ p.tournament.sport?.toLowerCase() }}</p>
              </div>
              <UIcon
                name="i-heroicons-chevron-down"
                class="w-4 h-4 text-black dark:text-gray-400 transition-transform"
                :class="{ 'rotate-180': expandedRoster === p.id }"
              />
            </button>

            <div v-if="expandedRoster === p.id" class="border-t border-gray-100 dark:border-white/[0.05] p-4 space-y-4">
              <div v-if="rosterLoading === p.id" class="flex items-center gap-2 text-xs text-black dark:text-gray-400 py-2 font-medium">
                <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin text-emerald-500" />
                Loading players...
              </div>

              <template v-else>
                <div v-if="rosterPlayers[p.id]?.length" class="space-y-1.5">
                  <div
                    v-for="player in rosterPlayers[p.id]"
                    :key="player.id"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/[0.03]"
                  >
                    <span class="text-xs font-mono font-bold text-black dark:text-gray-400 w-6 text-center">{{ player.number || '—' }}</span>
                    <span class="text-sm font-semibold text-black dark:text-white flex-1 truncate">{{ player.name }}</span>
                    <span class="text-[10px] font-bold text-black dark:text-gray-400 uppercase">{{ player.position || '' }}</span>
                    <UBadge :color="playerStatusColor(player.status)" variant="subtle" size="xs">{{ player.status }}</UBadge>
                    <UButton
                      icon="i-heroicons-trash"
                      size="xs"
                      variant="ghost"
                      color="error"
                      :loading="removingPlayerId === player.id"
                      @click="removeRosterPlayer(p.id, player.id)"
                    />
                  </div>
                </div>
                <p v-else class="text-xs font-medium text-black dark:text-gray-400 py-1">No players yet — add your squad below.</p>

                <!-- Add player form -->
                <div class="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-100 dark:border-white/[0.05]">
                  <UInput
                    v-model="addForms[p.id].name"
                    placeholder="Player name"
                    size="sm"
                    class="flex-1"
                    @keyup.enter="addRosterPlayer(p.id)"
                  />
                  <UInput
                    v-model.number="addForms[p.id].number"
                    type="number"
                    placeholder="No."
                    size="sm"
                    class="sm:w-20"
                    :min="1"
                    :max="99"
                  />
                  <USelect
                    v-model="addForms[p.id].position"
                    :items="rosterPositionOptions"
                    value-key="value"
                    placeholder="Position"
                    size="sm"
                    class="sm:w-36"
                  />
                  <UButton
                    size="sm"
                    color="primary"
                    icon="i-heroicons-plus"
                    label="Add"
                    :loading="addingTo === p.id"
                    :disabled="!addForms[p.id].name.trim()"
                    @click="addRosterPlayer(p.id)"
                  />
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
