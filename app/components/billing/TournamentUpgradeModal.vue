<script setup lang="ts">
const open = defineModel<boolean>("open", { default: false });

const authStore = useAuthStore();
const paymentStore = usePaymentStore();
const tournamentStore = useTournamentStore();
const { handleError } = useErrors();
const config = useRuntimeConfig();

const selectedTournamentId = ref("");
const upgradingTournament = ref(false);

// Reset selection whenever the modal opens
watch(open, (isOpen) => {
  if (isOpen) selectedTournamentId.value = "";
});

function getTournamentUpgradePrice(maxParticipants: number | null | undefined): number {
  if (typeof maxParticipants !== "number") return 25000;
  return maxParticipants * 1000;
}

const selectedTournamentUpgradePrice = computed(() => {
  if (!selectedTournamentId.value) return 0;
  const t = tournamentStore.tournaments.find((x) => x.id === selectedTournamentId.value);
  if (!t) return 0;
  return getTournamentUpgradePrice(t.maxParticipants);
});

async function handleTournamentUpgrade() {
  if (!authStore.currentOrganization?.id || !selectedTournamentId.value) return;

  upgradingTournament.value = true;
  try {
    const dashboardUrl = config.public.DASHBOARD_URL || window.location.origin;
    const callbackUrl = `${dashboardUrl}/billing/callback`;
    const feeInKobo = selectedTournamentUpgradePrice.value * 100;

    const response = await paymentStore.initializePayment(
      authStore.currentOrganization.id,
      "PER_TOURNAMENT",
      feeInKobo,
      callbackUrl,
      selectedTournamentId.value,
    );

    if (response.data?.authorization_url) {
      window.location.href = response.data.authorization_url;
    }
  } catch (err: any) {
    handleError(err, { title: "Upgrade Failed" });
  } finally {
    upgradingTournament.value = false;
  }
}
</script>

<template>
  <!-- Tournament Selector Modal -->
  <UModal v-model:open="open" :ui="{ content: 'sm:max-w-md' }">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <UIcon name="i-heroicons-trophy" class="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 class="text-lg font-bold text-heading">Upgrade Tournament</h3>
                <p class="text-xs text-muted">Select a tournament to upgrade with premium features.</p>
              </div>
            </div>
            <UButton icon="i-heroicons-x-mark" variant="ghost" color="neutral" size="sm" class="shrink-0" @click="open = false" />
          </div>
        </template>

        <!-- Capacity Pricing Info -->
        <div class="mb-4 p-3 rounded-xl flex items-start gap-2.5 text-xs bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 text-body">
          <UIcon name="i-heroicons-information-circle" class="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <span class="font-bold text-emerald-600 dark:text-emerald-400">₦1,000 per team:</span>
            pricing is calculated as max participants × ₦1,000. A 16-team tournament costs ₦16,000.
          </div>
        </div>

        <div v-if="tournamentStore.tournaments.length === 0" class="py-6 text-center">
          <UIcon name="i-heroicons-trophy" class="w-10 h-10 text-muted mx-auto mb-3" />
          <p class="text-sm text-muted">No tournaments found.</p>
          <p class="text-xs text-muted mt-1">Create a tournament first, then come back to upgrade it.</p>
        </div>

        <div v-else class="space-y-2 max-h-60 overflow-y-auto mb-5">
          <button
            v-for="t in tournamentStore.tournaments"
            :key="t.id"
            :disabled="t.isPremium"
            @click="selectedTournamentId = t.id"
            :class="[
              'w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left',
              t.isPremium
                ? 'opacity-50 cursor-not-allowed border-subtle bg-black/[0.02] dark:bg-white/[0.02]'
                : selectedTournamentId === t.id
                  ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500'
                  : 'border-subtle hover:border-emerald-500/40'
            ]"
          >
            <UAvatar v-if="t.logoUrl" :src="t.logoUrl" size="xs" class="rounded-md shrink-0" />
            <div v-else class="w-8 h-8 rounded-md bg-black/5 dark:bg-white/10 flex items-center justify-center text-xs font-bold text-muted shrink-0">
              {{ t.name?.charAt(0) }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold text-heading truncate">{{ t.name }}</p>
              <p class="text-xs text-muted">
                {{ t.sport }} · {{ t.type }} ·
                <span class="font-medium">
                  {{ typeof t.maxParticipants === 'number' ? `${t.maxParticipants} max` : 'Unlimited capacity' }}
                </span>
              </p>
            </div>
            <div v-if="!t.isPremium" class="text-right shrink-0 mr-1">
              <span class="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                ₦{{ getTournamentUpgradePrice(t.maxParticipants).toLocaleString() }}
              </span>
            </div>
            <UBadge v-if="t.isPremium" color="success" variant="subtle" size="xs" class="shrink-0">
              Premium
            </UBadge>
            <UIcon
              v-else-if="selectedTournamentId === t.id"
              name="i-heroicons-check-circle-solid"
              class="w-5 h-5 text-emerald-500 shrink-0"
            />
          </button>
        </div>

        <template #footer>
          <div class="flex items-center gap-3">
            <UButton
              label="Cancel"
              color="neutral"
              variant="soft"
              class="flex-1 font-bold"
              @click="open = false"
            />
            <UButton
              :label="selectedTournamentUpgradePrice ? `Pay ₦${selectedTournamentUpgradePrice.toLocaleString()} & Upgrade` : 'Select a Tournament'"
              color="primary"
              variant="solid"
              class="flex-1 font-bold"
              :disabled="!selectedTournamentId"
              :loading="upgradingTournament"
              @click="handleTournamentUpgrade"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
