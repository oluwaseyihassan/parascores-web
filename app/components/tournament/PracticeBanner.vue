<script setup lang="ts">
const route = useRoute();
const tournamentStore = useTournamentStore();
const participantStore = useParticipantStore();
const fixtureStore = useFixtureStore();
const standingStore = useStandingStore();
const { handleError } = useErrors();

const { currentTournament: tournament } = storeToRefs(tournamentStore);
const { participants } = storeToRefs(participantStore);
const { fixtures } = storeToRefs(fixtureStore);
const { standings } = storeToRefs(standingStore);

const tournamentId = computed(() => route.params.id as string);

// Practice (sandbox) mode
const practiceBannerDismissed = ref(false);
const practiceActionLoading = ref<"autofill" | "reset" | null>(null);

const showPracticeBanner = computed(() => {
  return !!tournament.value?.isPractice && !practiceBannerDismissed.value;
});

const practiceExpiryLabel = computed(() => {
  if (!tournament.value?.end_date) return null;
  const days = Math.ceil(
    (new Date(tournament.value.end_date).getTime() - Date.now()) / 86400000,
  );
  if (days <= 0) return "expired";
  return days === 1 ? "expires today" : `expires in ${days} days`;
});

async function refreshOverviewData() {
  const response = await $api<any>(
    `/tournaments/${tournamentId.value}/overview`,
    { method: "GET" },
  );
  if (response.data) {
    tournamentStore.setCurrentTournament(response.data.tournament);
    participants.value = response.data.participants;
    fixtures.value = response.data.fixtures;
    standings.value = response.data.standings;
  }
}

async function handlePracticeAutofill() {
  practiceActionLoading.value = "autofill";
  try {
    await $api(`/tournaments/${tournamentId.value}/practice-autofill`, {
      method: "POST",
    });
    await refreshOverviewData();
    useToast().add({
      title: "Sample Results Added",
      description:
        "Fixtures were played with random scores and standings updated.",
      color: "success",
      icon: "i-heroicons-sparkles",
    });
  } catch (err: any) {
    handleError(err, { title: "Autofill failed" });
  } finally {
    practiceActionLoading.value = null;
  }
}

async function handlePracticeReset() {
  if (
    !window.confirm(
      "Reset this sandbox? All scores, events and standings will be wiped.",
    )
  )
    return;
  practiceActionLoading.value = "reset";
  try {
    await $api(`/tournaments/${tournamentId.value}/practice-reset`, {
      method: "POST",
    });
    await refreshOverviewData();
    useToast().add({
      title: "Sandbox Reset",
      description: "Back to the initial state — fixtures ready to play again.",
      color: "success",
      icon: "i-heroicons-arrow-uturn-left",
    });
  } catch (err: any) {
    handleError(err, { title: "Reset failed" });
  } finally {
    practiceActionLoading.value = null;
  }
}
</script>

<template>
  <!-- Practice (Sandbox) Banner -->
  <div
    v-if="showPracticeBanner"
    class="mb-4 rounded-xl border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 p-3 sm:p-4"
  >
    <div class="flex items-start gap-3">
      <UIcon
        name="i-heroicons-beaker"
        class="w-5 h-5 text-amber-500 shrink-0 mt-0.5"
      />
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-amber-700 dark:text-amber-400">
          Practice Mode
        </p>
        <p class="text-xs text-amber-600/90 dark:text-amber-400/80 mt-0.5">
          Sandbox tournament — experiment freely. Teams, players and
          fixtures are fake<template v-if="practiceExpiryLabel">
            · {{ practiceExpiryLabel }}</template
          >.
        </p>
        <div class="flex flex-wrap gap-2 mt-2.5">
          <UButton
            size="xs"
            color="warning"
            variant="soft"
            icon="i-heroicons-sparkles"
            label="Fill Sample Results"
            :loading="practiceActionLoading === 'autofill'"
            @click="handlePracticeAutofill"
          />
          <UButton
            size="xs"
            color="warning"
            variant="soft"
            icon="i-heroicons-arrow-uturn-left"
            label="Reset Sandbox"
            :loading="practiceActionLoading === 'reset'"
            @click="handlePracticeReset"
          />
        </div>
      </div>
      <UButton
        icon="i-heroicons-x-mark"
        variant="ghost"
        color="neutral"
        size="xs"
        class="shrink-0"
        @click="practiceBannerDismissed = true"
      />
    </div>
  </div>
</template>
