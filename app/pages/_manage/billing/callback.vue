<script setup lang="ts">
definePageMeta({
  middleware: ['require-auth'],
  layout: 'dashboard'
})

useSeoMeta({
  title: 'Payment Verification - ParaScores',
})

const route = useRoute()
const paymentStore = usePaymentStore()
const { handleError } = useErrors()

const status = ref<'verifying' | 'success' | 'failed'>('verifying')
const errorMessage = ref('')
const verifiedTournamentId = ref<string | null>(null)
const isTournamentUpgrade = ref(false)

onMounted(async () => {
  const reference = route.query.reference as string || route.query.trxref as string

  if (!reference) {
    status.value = 'failed'
    errorMessage.value = 'No payment reference found.'
    return
  }

  try {
    const response = await paymentStore.verifyPayment(reference)
    status.value = 'success'

    // Extract tournament info from the response for the back link
    const data = response.data
    if (data?.tournament?.id) {
      verifiedTournamentId.value = data.tournament.id
      isTournamentUpgrade.value = true
    } else if (data?.payment?.tournamentId) {
      verifiedTournamentId.value = data.payment.tournamentId
      isTournamentUpgrade.value = true
    }
  } catch (err: any) {
    status.value = 'failed'
    errorMessage.value = err?.data?.message || err?.message || 'Payment verification failed.'
    handleError(err, { title: 'Payment Verification Failed', toast: false })
  }
})

const backLink = computed(() => {
  if (verifiedTournamentId.value) {
    return `/tournaments/${verifiedTournamentId.value}`
  }
  return '/'
})
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh] text-center">
    
    <!-- Verifying -->
    <template v-if="status === 'verifying'">
      <div class="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-6 animate-pulse">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
      <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Verifying your payment...</h2>
      <p class="text-gray-500 text-sm max-w-md">Please wait while we confirm your transaction with Paystack.</p>
    </template>

    <!-- Success -->
    <template v-else-if="status === 'success'">
      <div class="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
        <UIcon name="i-heroicons-check-circle-solid" class="w-10 h-10 text-emerald-500" />
      </div>
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Payment Successful!</h2>
      <p class="text-gray-500 text-sm max-w-md mb-8">
        <template v-if="isTournamentUpgrade">
          Your tournament has been upgraded with premium features.
        </template>
        <template v-else>
          Your subscription has been activated. You now have access to all Pro features.
        </template>
      </p>
      <div class="flex items-center gap-3">
        <UButton
          label="Go to Billing"
          to="/billing"
          color="primary"
          size="lg"
          icon="i-heroicons-credit-card"
          class="font-bold"
        />
        <UButton
          :label="isTournamentUpgrade ? 'Back to Tournament' : 'Back to Dashboard'"
          :to="backLink"
          variant="ghost"
          color="neutral"
          size="lg"
          :icon="isTournamentUpgrade ? 'i-heroicons-trophy' : 'i-heroicons-home'"
          class="font-bold"
        />
      </div>
    </template>

    <!-- Failed -->
    <template v-else-if="status === 'failed'">
      <div class="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
        <UIcon name="i-heroicons-x-circle-solid" class="w-10 h-10 text-red-500" />
      </div>
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Payment Failed</h2>
      <p class="text-gray-500 text-sm max-w-md mb-2">
        {{ errorMessage || 'Something went wrong while processing your payment.' }}
      </p>
      <p class="text-gray-400 text-xs max-w-md mb-8">
        No charges were made. Please try again or contact support if the issue persists.
      </p>
      <div class="flex items-center gap-3">
        <UButton
          label="Try Again"
          to="/billing"
          color="primary"
          size="lg"
          icon="i-heroicons-arrow-path"
          class="font-bold"
        />
        <UButton
          label="Back to Dashboard"
          to="/"
          variant="ghost"
          color="neutral"
          size="lg"
          class="font-bold"
        />
      </div>
    </template>
  </div>
</template>

