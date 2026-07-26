<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAdminStore } from '~/stores/admin'

definePageMeta({
  layout: 'admin'
})

const route = useRoute()
const adminStore = useAdminStore()
const { loading, error } = storeToRefs(adminStore)

const tournament = ref<any>(null)
const isSaving = ref(false)
const isDeleteModalOpen = ref(false)
const isDeleting = ref(false)
const isEditModalOpen = ref(false)

const form = reactive({
  name: '',
  customName: '',
  description: '',
  visibility: 'PUBLIC',
  sport: '',
  type: 'LEAGUE',
  location: '',
  timezone: 'UTC',
  startDate: '',
  endDate: '',
  maxParticipants: null as number | null,
  isPremium: false,
  isPinned: false,
  isPaidRegistration: false,
  registrationFee: 0,
  tournamentPrice: 0,
  paymentPerTeam: 0,
  autoApprove: false,
  thirdPlaceMatch: false,
  twoLegsKnockout: false,
  doubleRoundRobin: false,
})

const loadTournament = async () => {
  try {
    const data = await adminStore.fetchTournament(route.params.id as string)
    if (data) {
      tournament.value = data
    }
  } catch (err) {
    console.error('Failed to load tournament:', err)
  }
}

onMounted(() => {
  loadTournament()
})

const openEditModal = () => {
  if (!tournament.value) return
  Object.assign(form, {
    name: tournament.value.name || '',
    customName: tournament.value.customName || '',
    description: tournament.value.description || '',
    visibility: tournament.value.visibility || 'PUBLIC',
    sport: tournament.value.sport || '',
    type: tournament.value.type || 'LEAGUE',
    location: tournament.value.location || '',
    timezone: tournament.value.timezone || 'UTC',
    startDate: formatDateTimeLocal(tournament.value.start_date),
    endDate: formatDateTimeLocal(tournament.value.end_date),
    maxParticipants: tournament.value.maxParticipants ?? null,
    isPremium: tournament.value.isPremium || false,
    isPinned: tournament.value.isPinned || false,
    isPaidRegistration: tournament.value.isPaidRegistration || false,
    registrationFee: tournament.value.registrationFee || 0,
    tournamentPrice: tournament.value.tournamentPrice || 0,
    paymentPerTeam: tournament.value.paymentPerTeam || 0,
    autoApprove: tournament.value.autoApprove || false,
    thirdPlaceMatch: tournament.value.thirdPlaceMatch || false,
    twoLegsKnockout: tournament.value.twoLegsKnockout || false,
    doubleRoundRobin: tournament.value.doubleRoundRobin || false,
  })
  isEditModalOpen.value = true
}

const formatDateTimeLocal = (dateStr?: string) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(val || 0)
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'SCHEDULED':
      return 'bg-slate-800 text-slate-400 border-slate-700'
    case 'LIVE':
    case 'IN_PROGRESS':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    case 'COMPLETED':
    case 'FINISHED':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    default:
      return 'bg-slate-800 text-slate-400 border-slate-700'
  }
}

const saveTournament = async () => {
  if (!tournament.value) return
  isSaving.value = true
  try {
    const payload: any = {
      name: form.name,
      customName: form.customName || null,
      description: form.description || null,
      visibility: form.visibility,
      sport: form.sport,
      type: form.type,
      location: form.location || null,
      timezone: form.timezone,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
      maxParticipants: form.maxParticipants,
      isPremium: form.isPremium,
      isPinned: form.isPinned,
      isPaidRegistration: form.isPaidRegistration,
      registrationFee: form.registrationFee,
      tournamentPrice: form.tournamentPrice,
      paymentPerTeam: form.paymentPerTeam,
      autoApprove: form.autoApprove,
      thirdPlaceMatch: form.thirdPlaceMatch,
      twoLegsKnockout: form.twoLegsKnockout,
      doubleRoundRobin: form.doubleRoundRobin,
    }
    const updated = await adminStore.updateTournament(tournament.value.id, payload)
    Object.assign(tournament.value, updated)
    useToast().add({
      title: 'Tournament Updated',
      description: 'Tournament details have been updated successfully.',
      color: 'success'
    })
    isEditModalOpen.value = false
  } catch (err: any) {
    useToast().add({
      title: 'Update Failed',
      description: err.message || 'Failed to update tournament.',
      color: 'error'
    })
  } finally {
    isSaving.value = false
  }
}

const deleteTournament = async () => {
  if (!tournament.value) return
  isDeleting.value = true
  try {
    await adminStore.deleteTournament(tournament.value.id)
    useToast().add({
      title: 'Tournament Deleted',
      description: 'Tournament has been deleted.',
      color: 'success'
    })
    navigateTo('/tournaments')
  } catch (err: any) {
    useToast().add({
      title: 'Delete Failed',
      description: err.message || 'Failed to delete tournament.',
      color: 'error'
    })
  } finally {
    isDeleting.value = false
    isDeleteModalOpen.value = false
  }
}

const getParticipantName = (participant: any) => {
  if (!participant) return 'TBD'
  return participant.customName || participant.team?.name || participant.user?.name || 'Unnamed'
}

const getParticipantLogo = (participant: any) => {
  return participant?.logoUrl || participant?.team?.logoUrl || participant?.user?.picture || null
}

const getFixtureScore = (fixture: any) => {
  const home = fixture.homeScore ?? '-'
  const away = fixture.awayScore ?? '-'
  return `${home} - ${away}`
}
</script>

<template>
  <div class="space-y-8 select-none">
    <div class="flex items-center gap-3">
      <NuxtLink to="/tournaments" class="text-rose-500 hover:text-rose-400 text-sm font-semibold flex items-center gap-1">
        <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
        Back to Tournaments
      </NuxtLink>
    </div>

    <UAlert
      v-if="error"
      title="Failed to retrieve tournament details"
      description="The backend could not locate the tournament ID requested."
      color="error"
      variant="subtle"
      icon="i-heroicons-exclamation-triangle"
    />

    <div v-if="tournament" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="space-y-6 lg:col-span-1">
        <div class="bg-slate-950 border border-slate-800 rounded-3xl p-6 flex flex-col items-center text-center">
          <UAvatar
            v-if="tournament.logoUrl"
            :src="tournament.logoUrl"
            size="lg"
            class="ring-4 ring-rose-600/30"
          />
          <div v-else class="w-20 h-20 rounded-full bg-slate-850 text-slate-400 border border-slate-800 flex items-center justify-center font-extrabold text-2xl">
            {{ tournament.name?.charAt(0).toUpperCase() }}
          </div>

          <h2 class="text-lg font-bold text-white mt-4">{{ tournament.name }}</h2>
          <p v-if="tournament.customName" class="text-sm text-slate-500 mt-1">{{ tournament.customName }}</p>

          <div class="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider bg-slate-800 text-slate-400 border-slate-700">
              {{ tournament.sport }}
            </span>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider bg-slate-800 text-slate-400 border-slate-700">
              {{ tournament.type?.replace('_', ' ') }}
            </span>
            <span
              class="px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider"
              :class="tournament.visibility === 'PUBLIC' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'"
            >
              {{ tournament.visibility }}
            </span>
            <span v-if="tournament.isPremium" class="px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider bg-rose-500/10 text-rose-400 border-rose-500/20">
              Premium
            </span>
            <span v-if="tournament.isPinned" class="px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider bg-violet-500/10 text-violet-400 border-violet-500/20">
              Pinned
            </span>
          </div>

          <div class="w-full border-t border-slate-900 mt-6 pt-6 text-left space-y-4 text-xs font-semibold">
            <div class="flex flex-col gap-3">
              <UButton
                block
                size="sm"
                color="primary"
                variant="outline"
                icon="i-heroicons-pencil-square"
                @click="openEditModal"
              >
                Edit Tournament
              </UButton>
              <UButton
                block
                size="sm"
                color="error"
                variant="soft"
                icon="i-heroicons-trash"
                @click="isDeleteModalOpen = true"
              >
                Delete Tournament
              </UButton>
            </div>
          </div>

          <div class="w-full border-t border-slate-900 mt-6 pt-6 text-left space-y-4 text-xs font-semibold">
            <div class="flex justify-between">
              <span class="text-slate-500">Tournament ID</span>
              <span class="text-slate-300 font-mono text-[10px] select-all">{{ tournament.id }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Created</span>
              <span class="text-slate-300">{{ formatDate(tournament.created_at) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Updated</span>
              <span class="text-slate-300">{{ formatDate(tournament.updated_at) }}</span>
            </div>
            <div v-if="tournament.organization" class="flex justify-between items-center">
              <span class="text-slate-500">Organization</span>
              <NuxtLink :to="`/organizations/${tournament.organization.id}`" class="text-rose-500 hover:underline truncate max-w-[150px]">
                {{ tournament.organization.name }}
              </NuxtLink>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Location</span>
              <span class="text-slate-300">{{ tournament.location || '—' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Timezone</span>
              <span class="text-slate-300">{{ tournament.timezone }}</span>
            </div>
          </div>
        </div>

        <div class="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h3 class="text-sm font-bold text-white">Dates & Registration</h3>
          <div class="space-y-3 text-xs font-semibold">
            <div class="flex justify-between">
              <span class="text-slate-500">Start Date</span>
              <span class="text-slate-300">{{ formatDate(tournament.start_date) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">End Date</span>
              <span class="text-slate-300">{{ formatDate(tournament.end_date) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Max Participants</span>
              <span class="text-slate-300">{{ tournament.maxParticipants || 'Unlimited' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Auto Approve</span>
              <span class="text-slate-300">{{ tournament.autoApprove ? 'Yes' : 'No' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Paid Registration</span>
              <span class="text-slate-300">{{ tournament.isPaidRegistration ? 'Yes' : 'No' }}</span>
            </div>
            <div v-if="tournament.isPaidRegistration" class="flex justify-between">
              <span class="text-slate-500">Registration Fee</span>
              <span class="text-slate-300">{{ formatCurrency(tournament.registrationFee) }}</span>
            </div>
          </div>
        </div>

        <div class="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h3 class="text-sm font-bold text-white">Pricing</h3>
          <div class="space-y-3 text-xs font-semibold">
            <div class="flex justify-between">
              <span class="text-slate-500">Tournament Price</span>
              <span class="text-slate-300">{{ formatCurrency(tournament.tournamentPrice) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Payment Per Team</span>
              <span class="text-slate-300">{{ formatCurrency(tournament.paymentPerTeam) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-8 lg:col-span-2">
        <div class="bg-slate-950 border border-slate-800 rounded-3xl p-6">
          <h3 class="text-base font-bold text-white mb-4 flex items-center gap-2">
            <UIcon name="i-heroicons-users" class="w-5 h-5 text-rose-500" />
            Participants ({{ tournament._count?.participants || 0 }})
          </h3>
          <div v-if="!tournament.participants || tournament.participants.length === 0" class="text-center py-6 text-slate-500 text-sm">
            No participants have joined this tournament yet.
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="p in tournament.participants"
              :key="p.id"
              class="flex items-center justify-between p-4 bg-slate-900/40 border border-slate-850 rounded-2xl"
            >
              <div class="flex items-center gap-3">
                <UAvatar
                  v-if="getParticipantLogo(p)"
                  :src="getParticipantLogo(p)"
                  size="xs"
                />
                <div v-else class="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                  {{ getParticipantName(p).charAt(0).toUpperCase() }}
                </div>
                <div class="flex flex-col">
                  <span class="text-sm font-bold text-white">{{ getParticipantName(p) }}</span>
                  <span v-if="p.team" class="text-xs text-slate-500">{{ p.team.shortName || p.team.name }}</span>
                </div>
              </div>
              <span
                class="px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider"
                :class="p.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'"
              >
                {{ p.status }}
              </span>
            </div>
          </div>
        </div>

        <div class="bg-slate-950 border border-slate-800 rounded-3xl p-6">
          <h3 class="text-base font-bold text-white mb-4 flex items-center gap-2">
            <UIcon name="i-heroicons-calendar" class="w-5 h-5 text-amber-500" />
            Fixtures ({{ tournament._count?.fixtures || 0 }})
          </h3>
          <div v-if="!tournament.fixtures || tournament.fixtures.length === 0" class="text-center py-6 text-slate-500 text-sm">
            No fixtures have been created for this tournament.
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="f in tournament.fixtures"
              :key="f.id"
              class="p-4 bg-slate-900/40 border border-slate-850 rounded-2xl"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs text-slate-500 font-semibold">{{ f.roundName || `Round ${f.round}` }} • Match {{ f.matchNumber }}</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider" :class="getStatusColor(f.status)">
                  {{ f.status }}
                </span>
              </div>
              <div class="flex items-center justify-between gap-4">
                <div class="flex items-center gap-2 flex-1 min-w-0">
                  <UAvatar v-if="getParticipantLogo(f.homeTeam)" :src="getParticipantLogo(f.homeTeam)" size="xs" />
                  <span class="text-sm font-bold text-white truncate">{{ getParticipantName(f.homeTeam) }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-lg font-extrabold text-white">{{ getFixtureScore(f) }}</span>
                </div>
                <div class="flex items-center gap-2 flex-1 min-w-0 justify-end">
                  <span class="text-sm font-bold text-white truncate">{{ getParticipantName(f.awayTeam) }}</span>
                  <UAvatar v-if="getParticipantLogo(f.awayTeam)" :src="getParticipantLogo(f.awayTeam)" size="xs" />
                </div>
              </div>
              <div v-if="f.startTime" class="text-xs text-slate-500 mt-2">
                {{ formatDate(f.startTime) }}
              </div>
            </div>
          </div>
        </div>

        <div v-if="tournament.standings && tournament.standings.length > 0" class="bg-slate-950 border border-slate-800 rounded-3xl p-6">
          <h3 class="text-base font-bold text-white mb-4 flex items-center gap-2">
            <UIcon name="i-heroicons-table-cells" class="w-5 h-5 text-violet-500" />
            Standings
          </h3>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="border-b border-slate-800 text-slate-500">
                <tr>
                  <th class="py-2">#</th>
                  <th class="py-2">Participant</th>
                  <th class="py-2 text-center">P</th>
                  <th class="py-2 text-center">W</th>
                  <th class="py-2 text-center">D</th>
                  <th class="py-2 text-center">L</th>
                  <th class="py-2 text-center">GF</th>
                  <th class="py-2 text-center">GA</th>
                  <th class="py-2 text-center">GD</th>
                  <th class="py-2 text-center">Pts</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-900">
                <tr v-for="(s, idx) in tournament.standings" :key="s.id">
                  <td class="py-3 text-slate-500">{{ idx + 1 }}</td>
                  <td class="py-3 font-bold text-white">{{ getParticipantName(s.participant) }}</td>
                  <td class="py-3 text-center text-slate-300">{{ s.played }}</td>
                  <td class="py-3 text-center text-slate-300">{{ s.wins }}</td>
                  <td class="py-3 text-center text-slate-300">{{ s.draws }}</td>
                  <td class="py-3 text-center text-slate-300">{{ s.losses }}</td>
                  <td class="py-3 text-center text-slate-300">{{ s.goalsFor }}</td>
                  <td class="py-3 text-center text-slate-300">{{ s.goalsAgainst }}</td>
                  <td class="py-3 text-center text-slate-300">{{ s.goalDiff }}</td>
                  <td class="py-3 text-center font-extrabold text-white">{{ s.points }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="bg-slate-950 border border-slate-800 rounded-3xl p-6">
          <h3 class="text-base font-bold text-white mb-4 flex items-center gap-2">
            <UIcon name="i-heroicons-credit-card" class="w-5 h-5 text-emerald-500" />
            Billing Logs
          </h3>
          <div v-if="!tournament.payments || tournament.payments.length === 0" class="text-center py-6 text-slate-500 text-sm">
            No payments have been logged for this tournament.
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="pay in tournament.payments"
              :key="pay.id"
              class="flex items-center justify-between p-4 bg-slate-900/40 border border-slate-850 rounded-2xl"
            >
              <div class="flex flex-col">
                <span class="text-sm font-bold text-white leading-none mb-1 capitalize">{{ pay.type?.toLowerCase() }}</span>
                <span class="text-xs text-slate-500 mt-1 leading-none">{{ formatDate(pay.created_at) }}</span>
              </div>
              <div class="flex items-center gap-4">
                <span class="text-sm font-extrabold text-white">{{ formatCurrency(pay.amount) }}</span>
                <span
                  class="px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider"
                  :class="[
                    pay.status === 'SUCCESS' || pay.status === 'COMPLETED'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : pay.status === 'PENDING'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  ]"
                >
                  {{ pay.status }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <UModal v-model:open="isEditModalOpen" title="Edit Tournament">
      <template #body>
        <div class="space-y-5 max-h-[70vh] overflow-y-auto pr-2">
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider">Name</label>
            <input v-model="form.name" type="text" class="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm font-semibold rounded-xl px-3.5 py-2.5 focus:ring-rose-500 focus:border-rose-500 focus:outline-none" />
          </div>
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider">Custom Name</label>
            <input v-model="form.customName" type="text" class="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm font-semibold rounded-xl px-3.5 py-2.5 focus:ring-rose-500 focus:border-rose-500 focus:outline-none" />
          </div>
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider">Description</label>
            <textarea v-model="form.description" rows="3" class="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm font-semibold rounded-xl px-3.5 py-2.5 focus:ring-rose-500 focus:border-rose-500 focus:outline-none"></textarea>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider">Sport</label>
              <input v-model="form.sport" type="text" class="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm font-semibold rounded-xl px-3.5 py-2.5 focus:ring-rose-500 focus:border-rose-500 focus:outline-none" />
            </div>
            <div class="space-y-1.5">
              <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider">Type</label>
              <select v-model="form.type" class="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm font-semibold rounded-xl px-3.5 py-2.5 focus:ring-rose-500 focus:border-rose-500 focus:outline-none">
                <option value="LEAGUE">League</option>
                <option value="KNOCKOUT">Knockout</option>
                <option value="ROUND_ROBIN">Round Robin</option>
                <option value="GROUP">Group</option>
                <option value="HYBRID">Hybrid</option>
                <option value="FRIENDLY">Friendly</option>
              </select>
            </div>
          </div>
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider">Visibility</label>
            <select v-model="form.visibility" class="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm font-semibold rounded-xl px-3.5 py-2.5 focus:ring-rose-500 focus:border-rose-500 focus:outline-none">
              <option value="PUBLIC">Public</option>
              <option value="PRIVATE">Private</option>
              <option value="UNLISTED">Unlisted</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider">Start Date</label>
              <input v-model="form.startDate" type="datetime-local" class="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm font-semibold rounded-xl px-3.5 py-2.5 focus:ring-rose-500 focus:border-rose-500 focus:outline-none" />
            </div>
            <div class="space-y-1.5">
              <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider">End Date</label>
              <input v-model="form.endDate" type="datetime-local" class="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm font-semibold rounded-xl px-3.5 py-2.5 focus:ring-rose-500 focus:border-rose-500 focus:outline-none" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider">Location</label>
              <input v-model="form.location" type="text" class="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm font-semibold rounded-xl px-3.5 py-2.5 focus:ring-rose-500 focus:border-rose-500 focus:outline-none" />
            </div>
            <div class="space-y-1.5">
              <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider">Max Participants</label>
              <input v-model.number="form.maxParticipants" type="number" class="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm font-semibold rounded-xl px-3.5 py-2.5 focus:ring-rose-500 focus:border-rose-500 focus:outline-none" />
            </div>
          </div>
          <div class="grid grid-cols-3 gap-4">
            <div class="space-y-1.5">
              <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider">Tournament Price</label>
              <input v-model.number="form.tournamentPrice" type="number" step="0.01" class="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm font-semibold rounded-xl px-3.5 py-2.5 focus:ring-rose-500 focus:border-rose-500 focus:outline-none" />
            </div>
            <div class="space-y-1.5">
              <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider">Payment/Team</label>
              <input v-model.number="form.paymentPerTeam" type="number" step="0.01" class="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm font-semibold rounded-xl px-3.5 py-2.5 focus:ring-rose-500 focus:border-rose-500 focus:outline-none" />
            </div>
            <div class="space-y-1.5">
              <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider">Registration Fee</label>
              <input v-model.number="form.registrationFee" type="number" step="0.01" class="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm font-semibold rounded-xl px-3.5 py-2.5 focus:ring-rose-500 focus:border-rose-500 focus:outline-none" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <label class="flex items-center gap-2 text-sm text-slate-300 font-semibold cursor-pointer">
              <input v-model="form.isPremium" type="checkbox" class="w-4 h-4 rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-rose-500" />
              Premium Tournament
            </label>
            <label class="flex items-center gap-2 text-sm text-slate-300 font-semibold cursor-pointer">
              <input v-model="form.isPinned" type="checkbox" class="w-4 h-4 rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-rose-500" />
              Pin Tournament
            </label>
            <label class="flex items-center gap-2 text-sm text-slate-300 font-semibold cursor-pointer">
              <input v-model="form.isPaidRegistration" type="checkbox" class="w-4 h-4 rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-rose-500" />
              Paid Registration
            </label>
            <label class="flex items-center gap-2 text-sm text-slate-300 font-semibold cursor-pointer">
              <input v-model="form.autoApprove" type="checkbox" class="w-4 h-4 rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-rose-500" />
              Auto Approve
            </label>
            <label class="flex items-center gap-2 text-sm text-slate-300 font-semibold cursor-pointer">
              <input v-model="form.thirdPlaceMatch" type="checkbox" class="w-4 h-4 rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-rose-500" />
              Third Place Match
            </label>
            <label class="flex items-center gap-2 text-sm text-slate-300 font-semibold cursor-pointer">
              <input v-model="form.twoLegsKnockout" type="checkbox" class="w-4 h-4 rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-rose-500" />
              Two Legs Knockout
            </label>
            <label class="flex items-center gap-2 text-sm text-slate-300 font-semibold cursor-pointer">
              <input v-model="form.doubleRoundRobin" type="checkbox" class="w-4 h-4 rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-rose-500" />
              Double Round Robin
            </label>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="neutral" variant="ghost" @click="isEditModalOpen = false">Cancel</UButton>
          <UButton color="primary" variant="solid" icon="i-heroicons-check" :loading="isSaving" @click="saveTournament">Save Tournament</UButton>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="isDeleteModalOpen" title="Delete Tournament">
      <template #body>
        <p class="text-sm text-slate-300">
          Are you sure you want to delete <span class="font-bold text-white">{{ tournament?.name }}</span>? This action cannot be undone.
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="neutral" variant="ghost" @click="isDeleteModalOpen = false">Cancel</UButton>
          <UButton color="error" variant="solid" icon="i-heroicons-trash" :loading="isDeleting" @click="deleteTournament">Delete Tournament</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
