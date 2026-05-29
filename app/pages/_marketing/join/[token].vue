<script setup lang="ts">
import type { TeamInvite } from '~/types'
import type { ApiResponse } from '~/stores/auth'

definePageMeta({
  layout: 'feed'
})

const route = useRoute()
const authStore = useAuthStore()
const paymentStore = usePaymentStore()
const token = route.params.token as string

const invite = ref<TeamInvite | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const joining = ref(false)
const joinSuccess = ref(false)
const joinStatus = ref<'APPROVED' | 'PENDING'>('APPROVED')
const joinError = ref<string | null>(null)
const verifyingPayment = ref(false)

// Player form
const playerForm = reactive({
  name: '',
  number: undefined as number | undefined,
  position: '',
})

const positionOptions = [
  { label: 'Goalkeeper', value: 'GK' },
  { label: 'Defender', value: 'DEF' },
  { label: 'Midfielder', value: 'MID' },
  { label: 'Forward', value: 'FWD' },
]

// Fetch invite details or verify payment
onMounted(async () => {
  const reference = (route.query.reference || route.query.trxref) as string
  if (reference) {
    verifyingPayment.value = true
    try {
      const res = await paymentStore.verifyPayment(reference)
      if (res.data) {
        joinStatus.value = (res.data.status as 'APPROVED' | 'PENDING') || 'APPROVED'
        joinSuccess.value = true
        
        // Fetch invite details to populate team info
        const inviteResponse = await $publicApi<ApiResponse<TeamInvite>>(`/team-invites/token/${token}`)
        if (inviteResponse.data) {
          invite.value = inviteResponse.data
        }
      }
    } catch (err: any) {
      joinError.value = err?.data?.message || err?.message || 'Failed to verify payment'
    } finally {
      verifyingPayment.value = false
      loading.value = false
      // Clear reference query params from URL
      const { reference: _, trxref: __, ...query } = route.query
      navigateTo({ path: route.path, query }, { replace: true })
    }
  } else {
    try {
      const response = await $publicApi<ApiResponse<TeamInvite>>(`/team-invites/token/${token}`)
      if (response.data) {
        invite.value = response.data
        // Pre-fill name from user profile if logged in
        if (authStore.user?.name) {
          playerForm.name = authStore.user.name
        }
      }
    } catch (err: any) {
      error.value = err?.data?.message || err?.message || 'Invite not found'
    } finally {
      loading.value = false
    }
  }
})

const handleJoin = async () => {
  if (!authStore.isAuthenticated) {
    // Redirect to login with return URL
    navigateTo(`/login?redirect=/join/${token}`)
    return
  }

  if (joining.value || !playerForm.name.trim()) return

  joining.value = true
  joinError.value = null
  try {
    const callbackUrl = `${window.location.origin}/join/${token}`
    const response = await paymentStore.initializeTeamJoin({
      token,
      name: playerForm.name.trim(),
      number: playerForm.number || undefined,
      position: playerForm.position || undefined,
      callbackUrl,
    })

    if (response.data?.authorization_url) {
      window.location.href = response.data.authorization_url
    } else {
      throw new Error('Failed to generate checkout URL')
    }
  } catch (err: any) {
    joinError.value = err?.data?.message || err?.message || 'Failed to join team'
  } finally {
    joining.value = false
  }
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <!-- Verifying Payment -->
    <div v-if="verifyingPayment" class="text-center">
      <UIcon name="i-heroicons-arrow-path" class="w-10 h-10 animate-spin text-emerald-500 mb-4" />
      <p class="text-gray-900 dark:text-white font-semibold">Verifying registration payment...</p>
      <p class="text-gray-500 text-sm mt-1">Please do not close this page.</p>
    </div>

    <!-- Loading -->
    <div v-else-if="loading" class="text-center">
      <UIcon name="i-heroicons-arrow-path" class="w-10 h-10 animate-spin text-gray-400 mb-4" />
      <p class="text-gray-500">Loading invite...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center max-w-md">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <UIcon name="i-heroicons-x-circle" class="w-8 h-8 text-red-500" />
      </div>
      <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Invite Not Found</h2>
      <p class="text-gray-500 mb-6">{{ error }}</p>
      <UButton to="/" variant="outline" color="neutral">Go Home</UButton>
    </div>

    <!-- Join Success -->
    <div v-else-if="joinSuccess" class="max-w-md w-full">
      <UCard
        class="shadow-xl border-0"
        :ui="{ 
          root: 'ring-1 ring-gray-200 dark:ring-gray-800',
          body: 'text-center'
        }"
      >
        <div 
          class="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center transition-all duration-500 scale-110"
          :class="joinStatus === 'PENDING' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-green-100 dark:bg-green-900/30'"
        >
          <UIcon 
            :name="joinStatus === 'PENDING' ? 'i-heroicons-clock' : 'i-heroicons-check-circle'" 
            class="w-10 h-10"
            :class="joinStatus === 'PENDING' ? 'text-amber-500' : 'text-green-500'"
          />
        </div>
        
        <h2 v-if="joinStatus === 'PENDING'" class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Request Sent! ⏳</h2>
        <h2 v-else class="text-2xl font-bold text-gray-900 dark:text-white mb-2">You're In! 🎉</h2>
        
        <p class="text-gray-500 mb-2">
          <span v-if="joinStatus === 'PENDING'">Your request to join </span>
          <span v-else>You've successfully joined </span>
          <strong class="text-gray-900 dark:text-white">{{ invite?.participant?.customName }}</strong>
        </p>
        
        <p v-if="joinStatus === 'PENDING'" class="text-sm text-gray-400 mb-8 px-4">
          is waiting for approval from the organizer of <strong>{{ invite?.tournament?.name }}</strong>.
        </p>
        <p v-else class="text-sm text-gray-400 mb-8 px-4">
          in {{ invite?.tournament?.name }}
        </p>
        
        <div class="flex flex-col gap-3">
          <UButton
            :to="`/t/${invite?.tournament?.customName}`"
            color="primary"
            size="lg"
            block
          >
            View Tournament
          </UButton>
          <UButton
            to="/"
            variant="outline"
            color="neutral"
            size="lg"
            block
          >
            Go Home
          </UButton>
        </div>
      </UCard>
    </div>

    <!-- Invite Card -->
    <div v-else-if="invite" class="max-w-lg w-full">

      <UCard
        :class="[
          'shadow-xl border-0'
        ]"
        :ui="{ root: 'ring-1 ring-gray-200 dark:ring-gray-800' }"
      >
        <!-- Header -->
        <div class="text-center mb-6">
          <!-- Tournament Logo -->
          <div
            v-if="invite.tournament?.logoUrl"
            class="w-16 h-16 mx-auto mb-3 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 ring-2 ring-white dark:ring-gray-900 shadow-md"
            :class="{ 'relative z-10': invite.tournament?.bannerUrl }"
          >
            <img :src="invite.tournament.logoUrl" class="w-full h-full object-cover" />
          </div>

          <!-- Organizer -->
          <p
            v-if="invite.tournament?.organization?.name"
            class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1"
          >
            {{ invite.tournament.organization.name }}
          </p>

          <h1 class="text-xl font-bold text-gray-900 dark:text-white mb-1">
            {{ invite.tournament?.name }}
          </h1>

          <div class="flex flex-wrap items-center justify-center gap-3 text-xs text-gray-500 mb-4">
            <span v-if="invite.tournament?.sport" class="capitalize">{{ invite.tournament.sport.toLowerCase() }}</span>
            <span v-if="invite.tournament?.start_date">
              {{ formatDate(invite.tournament.start_date) }}
            </span>
            <span v-if="invite.tournament?.location">
              📍 {{ invite.tournament.location }}
            </span>
          </div>

          <!-- Divider -->
          <div class="border-t border-gray-100 dark:border-gray-800 my-4"></div>

          <!-- Team Info -->
          <p class="text-sm text-gray-500 mb-2">You've been invited to join</p>
          <div class="flex items-center justify-center gap-3 mb-1">
            <div
              v-if="invite.participant?.logoUrl"
              class="w-12 h-12 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800"
            >
              <img :src="invite.participant.logoUrl" class="w-full h-full object-cover" />
            </div>
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ invite.participant?.customName || 'Unknown Team' }}
            </h2>
          </div>

          <!-- Current Players -->
          <p v-if="invite.participant?.players?.length" class="text-xs text-gray-400 mt-2">
            {{ invite.participant.players.length }} player{{ invite.participant.players.length !== 1 ? 's' : '' }} already on the team
          </p>
        </div>

        <!-- Invalid Invite States -->
        <UAlert
          v-if="!invite.isValid && !invite.isActive"
          color="error"
          variant="subtle"
          icon="i-heroicons-x-circle"
          title="This invite has been revoked"
          class="mb-4"
        />
        <UAlert
          v-else-if="!invite.isValid && invite.isExpired"
          color="warning"
          variant="subtle"
          icon="i-heroicons-clock"
          title="This invite has expired"
          class="mb-4"
        />
        <UAlert
          v-else-if="!invite.isValid && invite.isMaxedOut"
          color="warning"
          variant="subtle"
          icon="i-heroicons-user-group"
          title="This invite has reached its maximum number of uses"
          class="mb-4"
        />

        <!-- Join Form (only if invite is valid) -->
        <template v-if="invite.isValid">
          <div class="space-y-4">
            <UAlert
              v-if="joinError"
              color="error"
              variant="subtle"
              icon="i-heroicons-exclamation-triangle"
              :title="joinError"
              class="mb-2"
            />

            <!-- Registration Fee & Benefits Info -->
            <div class="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Player Registration Fee</span>
                <span class="text-lg font-bold text-emerald-600 dark:text-emerald-400">₦500</span>
              </div>
              <div class="border-t border-emerald-500/10 pt-2">
                <p class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Benefits of joining:</p>
                <ul class="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-inside list-disc pl-1">
                  <li>Get an official, linked player profile in the tournament.</li>
                  <li>Track your live match statistics (goals, assists, appearances, cards).</li>
                  <li>Feature on team sheets, lineup sheets, and match graphics.</li>
                </ul>
              </div>
            </div>

            <UFormField label="Your Name" required>
              <UInput
                v-model="playerForm.name"
                placeholder="Enter your name"
                size="lg"
              />
            </UFormField>

            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Shirt Number">
                <UInput
                  v-model.number="playerForm.number"
                  type="number"
                  placeholder="e.g. 10"
                  :min="1"
                  :max="99"
                />
              </UFormField>
              <UFormField label="Position">
                <USelect
                  v-model="playerForm.position"
                  :items="positionOptions"
                  placeholder="Select..."
                  value-key="value"
                />
              </UFormField>
            </div>

            <!-- Approval notice -->
            <UAlert
              v-if="invite.tournament && !invite.tournament.autoApprove"
              color="warning"
              variant="subtle"
              icon="i-heroicons-clock"
              title="Organiser approval required"
              description="Your request will be sent to the tournament organiser for review before you are added to the team roster."
              class="mt-2"
            />

            <!-- Not logged in notice -->
            <UAlert
              v-if="!authStore.isAuthenticated"
              color="info"
              variant="subtle"
              icon="i-heroicons-information-circle"
              title="You'll need to log in to join this team"
              class="mt-2"
            />

            <UButton
              block
              size="lg"
              color="primary"
              :loading="joining"
              :disabled="authStore.isAuthenticated && !playerForm.name.trim()"
              @click="handleJoin"
              class="mt-4"
            >
              <template v-if="!authStore.isAuthenticated">
                Log In & Join
              </template>
              <template v-else>
                {{ invite.tournament?.autoApprove ? 'Join Team' : 'Request to Join' }}
              </template>
            </UButton>
          </div>
        </template>
      </UCard>
    </div>
  </div>
</template>
