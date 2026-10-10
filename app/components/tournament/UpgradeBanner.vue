<script setup lang="ts">
const route = useRoute();
const config = useRuntimeConfig();
const tournamentStore = useTournamentStore();
const participantStore = useParticipantStore();
const paymentStore = usePaymentStore();
const authStore = useAuthStore();
const { handleError } = useErrors();

const { currentTournament: tournament } = storeToRefs(tournamentStore);
const { participants } = storeToRefs(participantStore);
const { subscription, isPro } = storeToRefs(paymentStore);

const tournamentId = computed(() => route.params.id as string);

const showUpgradeBanner = computed(() => {
  if (!tournament.value) return false;
  // Already premium (per-tournament or via org subscription)
  if (tournament.value.isPremium) return false;
  if (isPro.value) return false;
  return true;
});

const upgradePrice = computed(() => {
  if (!tournament.value) return 1000;
  if (
    tournament.value.tournamentPrice &&
    tournament.value.tournamentPrice > 0
  ) {
    return tournament.value.tournamentPrice / 100;
  }
  if (tournament.value.paymentPerTeam && tournament.value.paymentPerTeam > 0) {
    const teamCount = participants.value?.length || 0;
    const calculatedFee = (tournament.value.paymentPerTeam / 100) * teamCount;
    return calculatedFee > 0 ? calculatedFee : 1000;
  }
  return 1000;
});

const upgradingFromBanner = ref(false);

async function handleUpgradeTournament() {
  if (!authStore.currentOrganization?.id || !tournamentId.value) return;

  upgradingFromBanner.value = true;
  try {
    const dashboardUrl = config.public.DASHBOARD_URL || window.location.origin;
    const callbackUrl = `${dashboardUrl}/billing/callback`;

    const feeInKobo = upgradePrice.value * 100;

    const response = await paymentStore.initializePayment(
      authStore.currentOrganization.id,
      "PER_TOURNAMENT",
      feeInKobo,
      callbackUrl,
      tournamentId.value,
    );

    if (response.data?.authorization_url) {
      window.location.href = response.data.authorization_url;
    }
  } catch (err: any) {
    handleError(err, { title: "Upgrade Failed" });
  } finally {
    upgradingFromBanner.value = false;
  }
}
</script>

<template>
  <!-- Premium Upgrade Banner -->
  <div
    v-if="showUpgradeBanner"
    class="mb-4 sm:mb-6 flex flex-wrap items-center gap-3 sm:gap-4 rounded-2xl border border-amber-500/25 bg-white dark:bg-gray-900 px-4 py-3.5 shadow-sm"
  >
    <!-- Icon -->
    <span class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
      <UIcon name="i-heroicons-bolt-solid" class="w-4.5 h-4.5" />
    </span>

    <!-- Title + benefit chips -->
    <div class="flex-1 min-w-[220px]">
      <h3 class="text-[13px] font-extrabold text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
        Unlock Premium for this tournament
        <span class="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">Premium</span>
      </h3>
      <div class="flex flex-wrap gap-1.5 mt-1.5">
        <span class="text-[10.5px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] rounded-full px-2 py-0.5">Unlimited participants</span>
        <span class="text-[10.5px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] rounded-full px-2 py-0.5">Custom branding</span>
        <span class="text-[10.5px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] rounded-full px-2 py-0.5">Advanced stats</span>
        <span class="text-[10.5px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] rounded-full px-2 py-0.5">Priority support</span>
      </div>
    </div>

    <!-- Price -->
    <div class="text-right shrink-0">
      <p class="text-base font-black text-gray-900 dark:text-white tracking-tight tabular-nums">₦{{ upgradePrice.toLocaleString() }}</p>
      <p class="text-[10px] font-semibold text-gray-400 dark:text-gray-500">one-time · this tournament</p>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2 shrink-0 w-full sm:w-auto">
      <UButton
        size="sm"
        color="primary"
        icon="i-heroicons-bolt"
        class="font-bold flex-1 sm:flex-none"
        :loading="upgradingFromBanner"
        @click="handleUpgradeTournament"
      >
        Upgrade now
      </UButton>
      <UButton
        size="sm"
        variant="outline"
        color="neutral"
        class="font-bold flex-1 sm:flex-none"
        to="/billing"
      >
        View plans
      </UButton>
    </div>
  </div>
</template>
