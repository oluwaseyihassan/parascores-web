<script setup lang="ts">
import {
  TournamentType,
  ParticipantType,
  ParticipantStatus,
  FixtureStatus,
} from "~/types";
import type {
  Participant,
  Fixture,
  Sponsor,
  Social,
  Tournament,
  Venue,
} from "~/types";
import { resolveEngine } from "~/engines/registry";
import { SportEngineKey } from "~/engines/types";
import {
  useModalDialogs,
  ModalDialogsKey,
} from "~/composables/useModalDialogs";
import { getParticipantName } from "~/utils/participant";

definePageMeta({
  middleware: ["require-organizer"],
  layout: "dashboard",
});

const route = useRoute();
const router = useRouter();
const tournamentStore = useTournamentStore();
const participantStore = useParticipantStore();
const teamStore = useTeamStore();
const fixtureStore = useFixtureStore();
const standingStore = useStandingStore();
const sponsorStore = useSponsorStore();
const authStore = useAuthStore();
const groupStore = useGroupStore();
const socialStore = useSocialStore();
const venueStore = useVenueStore();
const paymentStore = usePaymentStore();
const { handleError } = useErrors();
const toast = useToast();

const { currentTournament: tournament } = storeToRefs(tournamentStore);
const pageLoading = ref(true);
const pageError = ref<string | null>(null);
const { participants } = storeToRefs(participantStore);
const { fixtures, knockoutRounds } = storeToRefs(fixtureStore);
const { standings } = storeToRefs(standingStore);
const { sponsors } = storeToRefs(sponsorStore);
const { socials } = storeToRefs(socialStore);
const { venues } = storeToRefs(venueStore);

// Shared confirm/prompt dialogs, available to every tab/card/modal below
const modalDialogs = useModalDialogs();
provide(ModalDialogsKey, modalDialogs);

const tournamentId = computed(() => route.params.id as string);

// Live fixtures feed (powers the header "Matchday live" chip)
onMounted(async () => {
  if (authStore.activeOrganizationId) {
    fixtureStore.fetchLiveFixtures(authStore.activeOrganizationId);
  }
});

// Player Stats state
const playerStats = ref<any>(null);
const playerStatsLoading = ref(false);

const loadPlayerStats = async () => {
  if (!tournamentId.value) return;
  playerStatsLoading.value = true;
  try {
    const res = await $api<{ success: boolean; data: any }>(
      `/tournaments/${tournamentId.value}/player-stats`,
    );
    if (res.data) {
      playerStats.value = res.data;
    }
  } catch (e) {
    console.error("Failed to load player stats:", e);
  } finally {
    playerStatsLoading.value = false;
  }
};

// Fetch tournament, participants, and fixtures
const loadTournamentOverview = async (silent = false) => {
  if (!tournamentId.value) return;
  if (!silent) {
    pageLoading.value = true;
    pageError.value = null;
  }
  try {
    const response = await $api<{
      success: boolean;
      data: {
        tournament: Tournament;
        participants: Participant[];
        fixtures: Fixture[];
        standings: any[];
        sponsors: Sponsor[];
        socials: Social[];
        venues: Venue[];
      };
    }>(`/tournaments/${tournamentId.value}/overview`, { method: "GET" });

    if (response.data) {
      // Access control: the overview endpoint is public (it also powers the
      // marketing site), so the dashboard must verify the tournament belongs
      // to an organization the user is a member of.
      const tournamentOrgId = response.data.tournament.organization_id;
      const isOrgMember = authStore.organizations.some(
        (org) => org.organizationId === tournamentOrgId,
      );
      if (!isOrgMember) {
        if (!silent) {
          pageError.value =
            "You don't have access to this tournament. It belongs to another organization.";
          toast.add({
            title: "Access denied",
            description: "This tournament belongs to another organization.",
            color: "error",
          });
          await navigateTo("/");
        }
        return;
      }

      tournamentStore.setCurrentTournament(response.data.tournament);

      // Sync the org switcher to the tournament's organization
      if (
        tournamentOrgId &&
        tournamentOrgId !== authStore.currentOrganization?.id
      ) {
        authStore.syncActiveOrganization(tournamentOrgId);
        paymentStore.fetchSubscription(tournamentOrgId).catch(() => {});
      }

      participants.value = response.data.participants;
      fixtures.value = response.data.fixtures;
      standings.value = response.data.standings;
      sponsors.value = response.data.sponsors;
      socials.value = response.data.socials;
      venues.value = response.data.venues;

      // Initialize groups
      if (response.data.tournament.groups) {
        groupStore.groups = response.data.tournament.groups;
      } else if (tournamentId.value) {
        groupStore.fetchGroups(tournamentId.value);
      }

      // Load stats if applicable
      if (response.data.tournament.participantType === ParticipantType.TEAM) {
        loadPlayerStats();
      }
    }
  } catch (e: any) {
    if (!silent) {
      pageError.value = handleError(e, {
        title: "Failed to load dashboard",
        toast: false,
      });
    }
  } finally {
    if (!silent) {
      pageLoading.value = false;
    }
  }
};

const handleVisibilityChange = () => {
  if (document.visibilityState === "visible" && tournamentId.value) {
    loadTournamentOverview(true);
  }
};

onMounted(async () => {
  teamStore.loadMyTeams();

  // Fetch subscription state for the premium upgrade banner
  if (authStore.currentOrganization?.id) {
    paymentStore
      .fetchSubscription(authStore.currentOrganization.id)
      .catch(() => {});
  }

  await loadTournamentOverview(false);

  document.addEventListener("visibilitychange", handleVisibilityChange);
});

onUnmounted(() => {
  document.removeEventListener("visibilitychange", handleVisibilityChange);
});

// Check if standings should be shown
const showStandings = computed(() => {
  if (!tournament.value) return false;
  return [
    TournamentType.ROUND_ROBIN,
    TournamentType.GROUP,
    TournamentType.HYBRID,
    TournamentType.LEAGUE,
  ].includes(tournament.value.type);
});

// Race tournaments render fixtures as ranked events, not head-to-head cards.
// Driven by the sport engine (works for tournaments created before RACE type
// existed) or explicitly by the RACE tournament type.
const isRaceTournament = computed(() =>
  tournament.value?.type === TournamentType.RACE ||
  !!resolveEngine(tournament.value?.sport).race,
);

// Pending requests badge for the Participants tab
const totalPendingRequests = computed(() => {
  if (!participants.value) return 0;
  const pendingTeams = participants.value.filter(
    (p) => p.status === ParticipantStatus.PENDING,
  ).length;
  const pendingPlayers = participants.value.reduce((total, p) => {
    const pendingCount =
      p.players?.filter((pl) => pl.status === "PENDING").length || 0;
    return total + pendingCount;
  }, 0);
  return pendingTeams + pendingPlayers;
});

// Tab management
const activeTab = ref("0");
const tabItems = computed(() => {
  const items = [
    {
      slot: "overview",
      label: "Overview",
      icon: "i-heroicons-information-circle",
    },
    {
      slot: "participants",
      label: "Participants",
      icon: "i-heroicons-user-group",
      badge:
        totalPendingRequests.value > 0 ? totalPendingRequests.value : undefined,
    },
    // Race tournaments get an Event tab instead of fixtures — the race IS the event
    isRaceTournament.value
      ? {
          slot: "fixtures",
          label: "Event",
          icon: "i-heroicons-flag",
        }
      : {
          slot: "fixtures",
          label: "Fixtures",
          icon: "i-heroicons-calendar-days",
        },
  ];

  // Add Groups/Pots tab for Group/Hybrid tournaments
  if (
    tournament.value?.type === TournamentType.GROUP ||
    tournament.value?.type === TournamentType.HYBRID
  ) {
    items.splice(2, 0, {
      slot: "groups",
      label: tournament.value?.unifiedStandings ? "Pots" : "Groups",
      icon: "i-heroicons-rectangle-group",
    });
  }

  // Knockout bracket tab (knockout & hybrid tournaments, or when bracket data exists)
  if (
    tournament.value?.type === TournamentType.KNOCKOUT ||
    tournament.value?.type === TournamentType.HYBRID ||
    knockoutRounds.value.length > 0
  ) {
    const fxIndex = items.findIndex((i) => i.slot === "fixtures");
    items.splice(fxIndex + 1, 0, {
      slot: "knockout",
      label: "Knockout",
      icon: "i-heroicons-trophy",
    });
  }

  if (showStandings.value) {
    items.push({
      slot: "standings",
      label: "Standings",
      icon: "i-heroicons-chart-bar",
    });
  }

  if (tournament.value?.participantType === ParticipantType.TEAM) {
    items.push({
      slot: "stats",
      label: "Player Stats",
      icon: "i-heroicons-star",
    });
  }

  // Match Hub tab (esports & operations — announcements, self-reporting & results)
  items.push({
    slot: "chat",
    label: "Match Hub",
    icon: "i-heroicons-bolt",
  });

  // Add settings tab
  items.push({
    slot: "settings",
    label: "Settings",
    icon: "i-heroicons-cog-6-tooth",
  });

  return items;
});

const initTabFromQuery = () => {
  const queryTab = route.query.tab as string;
  if (queryTab) {
    const idx = tabItems.value.findIndex((t) => t.slot === queryTab);
    if (idx >= 0) activeTab.value = String(idx);
  }
};

watch(
  tabItems,
  () => {
    initTabFromQuery();
  },
  { immediate: true },
);

watch(activeTab, (newIdx) => {
  const tab = tabItems.value[Number(newIdx)];
  if (tab && route.query.tab !== tab.slot) {
    router.replace({ query: { ...route.query, tab: tab.slot } }).catch(() => {});
  }
});

const goToTab = (slot: string) => {
  const i = tabItems.value.findIndex((t) => t.slot === slot);
  if (i >= 0) {
    activeTab.value = String(i);
    router.replace({ query: { ...route.query, tab: slot } }).catch(() => {});
  }
};

// Match Control Modal (owned here so every tab can reach it)
const showMatchControlModal = ref(false);
const showRaceControlModal = ref(false);
const selectedFixture = ref<Fixture | null>(null);
const updatingMatch = ref(false);

const openMatchControl = (fixture: Fixture) => {
  selectedFixture.value = { ...fixture };
  // Race engines get their own control surface — a race is an event, not a match
  const engine = resolveEngine(tournament.value?.sport);
  showRaceControlModal.value = !!engine.control;
  showMatchControlModal.value = !engine.control;
};

const startMatch = async (fixture: Fixture) => {
  // Fresh-fetch fixture before opening modal to catch stale tab states
  let currentFixture = fixture;
  try {
    const latest = await fixtureStore.fetchFixtureById(fixture.id);
    if (latest) {
      currentFixture = latest;
      if (latest.status === FixtureStatus.COMPLETED) {
        toast.add({
          title: "Match Already Completed",
          description: "This match has already ended on another device.",
          icon: "i-heroicons-information-circle",
          color: "warning",
        });
        return;
      }
      if (latest.status === FixtureStatus.LIVE) {
        toast.add({
          title: "Match Already Live",
          description: "This match is already in progress.",
          icon: "i-heroicons-information-circle",
          color: "info",
        });
        return;
      }
      if (latest.status === FixtureStatus.CANCELLED) {
        toast.add({
          title: "Match Cancelled",
          description: "This match has been cancelled.",
          icon: "i-heroicons-exclamation-triangle",
          color: "error",
        });
        return;
      }
    }
  } catch {
    // Proceed if network error
  }

  const home = getParticipantName(
    currentFixture.homeTeam,
    currentFixture.homeTeamPlaceholder || "Home",
  );
  const away = getParticipantName(
    currentFixture.awayTeam,
    currentFixture.awayTeamPlaceholder || "Away",
  );

  modalDialogs.openConfirmModal({
    title: "Start Match",
    description: `Are you sure you want to start ${home} vs ${away}? This will change the match status to LIVE and begin the match clock.`,
    confirmLabel: "Start Match",
    cancelLabel: "Cancel",
    color: "primary",
    onConfirm: async () => {
      updatingMatch.value = true;
      try {
        const fresh = await fixtureStore.fetchFixtureById(currentFixture.id);
        if (fresh && fresh.status === FixtureStatus.COMPLETED) {
          toast.add({
            title: "Match Already Completed",
            description: "This match has already ended on another device.",
            icon: "i-heroicons-information-circle",
            color: "warning",
          });
          return;
        }

        const now = new Date().toISOString();
        await fixtureStore.updateFixture(currentFixture.id, {
          status: FixtureStatus.LIVE,
          homeScore: (fresh?.homeScore ?? currentFixture.homeScore) ?? 0,
          awayScore: (fresh?.awayScore ?? currentFixture.awayScore) ?? 0,
          timerStartedAt: now,
          timerElapsedSeconds: 0,
          timerIsRunning: true,
        });

        toast.add({
          title: "Match Started",
          description: "The match is now live!",
          icon: "i-heroicons-play",
          color: "success",
        });
      } catch (error: any) {
        toast.add({
          title: "Failed to start match",
          description: error?.data?.message || error?.message || "Unknown error",
          color: "error",
        });
      } finally {
        updatingMatch.value = false;
      }
    },
  });
};

const handleFixtureUpdated = (fixture: Fixture) => {
  // Update the fixture in the store/list if needed
  selectedFixture.value = fixture;
};

const handleMatchEnded = async () => {
  // Refresh fixtures so the bracket updates immediately (e.g., winner advances)
  await fixtureStore.fetchFixtures(tournamentId.value);
  // Refresh standings if applicable
  if (showStandings.value) {
    await standingStore.fetchStandings(tournamentId.value);
  }
};

// Fixture setup wizards (opened from the fixtures/knockout tabs)
const showKnockoutWizard = ref(false);
const showGroupWizard = ref(false);

// QR Code Feature
const showQRCodeModal = ref(false);

// Settings: season & ownership modals
const showTransferModal = ref(false);
const showSeasonModal = ref(false);

// Provide the resolved engine at page level so engine control surfaces
// (e.g. RaceControl) rendered outside MatchControl can still access it
provide(SportEngineKey, computed(() => resolveEngine(tournament.value?.sport)));
</script>

<template>
  <div class="max-w-5xl mx-auto">
    <!-- Back link -->
    <NuxtLink
      to="/"
      class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-6"
    >
      <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
      Back to Dashboard
    </NuxtLink>

    <!-- Loading State -->
    <div v-if="pageLoading" class="flex items-center justify-center py-20">
      <UIcon
        name="i-heroicons-arrow-path"
        class="w-8 h-8 animate-spin text-gray-400"
      />
    </div>

    <!-- Error State -->
    <UAlert
      v-else-if="pageError"
      color="error"
      variant="soft"
      icon="i-heroicons-exclamation-circle"
      title="Action Required"
      :description="pageError"
      class="mb-6 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-sm"
    >
      <template #description>
        <div class="flex items-center justify-between gap-3">
          <span class="flex-1">{{ pageError }}</span>
          <UButton
            size="xs"
            color="error"
            variant="ghost"
            icon="i-heroicons-x-mark"
            class="rounded-full"
            @click="pageError = null"
          />
        </div>
      </template>
    </UAlert>

    <!-- Tournament Content -->
    <template v-else-if="tournament">
      <TournamentHeaderCard
        v-model:active-tab="activeTab"
        :tab-items="tabItems"
        @open-qr="showQRCodeModal = true"
        @go-to-tab="goToTab"
      />

      <!-- Premium Upgrade Banner -->
      <TournamentUpgradeBanner />

      <TournamentQrCodeModal v-model:open="showQRCodeModal" />

      <!-- Content Container -->
      <div class="max-w-4xl mx-auto w-full px-3 sm:px-4">
        <!-- Practice (Sandbox) Banner -->
        <TournamentPracticeBanner />

        <!-- Main Content -->
        <div class="w-full">
          <UTabs
            v-model="activeTab"
            :items="tabItems"
            class="w-full"
            color="primary"
            variant="link"
            :ui="{
              list: 'hidden',
              trigger:
                'shrink-0 min-w-max whitespace-nowrap text-[13px] font-semibold py-3 px-3',
            }"
          >
            <!-- Overview Tab -->
            <template #overview>
              <TournamentOverviewTab @go-to-tab="goToTab" />
            </template>

            <!-- Participants Tab -->
            <template #participants>
              <TournamentParticipantsTab />
            </template>

            <!-- Groups Tab -->
            <template #groups>
              <TournamentGroupsTab />
            </template>

            <!-- Standings Tab -->
            <template #standings>
              <TournamentStandingsTab />
            </template>

            <!-- Fixtures Tab -->
            <template #fixtures>
              <TournamentFixturesTab
                :player-stats="playerStats"
                :updating-match="updatingMatch"
                @start="startMatch"
                @control="openMatchControl"
                @go-to-tab="goToTab"
                @open-knockout-wizard="showKnockoutWizard = true"
                @open-group-wizard="showGroupWizard = true"
              />
            </template>

            <!-- Knockout Tab -->
            <template #knockout>
              <TournamentKnockoutTab
                :updating-match="updatingMatch"
                @start="startMatch"
                @control="openMatchControl"
                @go-to-tab="goToTab"
                @open-knockout-wizard="showKnockoutWizard = true"
              />
            </template>

            <!-- Stats Tab -->
            <template #stats>
              <div class="mt-4">
                <MarketingPlayerStatsLeaderboard
                  :stats="playerStats"
                  :loading="playerStatsLoading"
                />
              </div>
            </template>

            <!-- Chat Tab -->
            <template #chat>
              <TournamentChatTab />
            </template>

            <!-- Settings Tab -->
            <template #settings>
              <div class="mt-3 sm:mt-4 w-full">
                <TournamentSettings
                  :tournament="tournament"
                  @open-tab="goToTab"
                  @qr="showQRCodeModal = true"
                >
                  <template #ownership>
                    <TournamentOwnershipSection
                      @start-season="showSeasonModal = true"
                      @transfer="showTransferModal = true"
                    />
                  </template>
                  <template #danger>
                    <TournamentDangerSection />
                  </template>
                </TournamentSettings>
              </div>
            </template>
          </UTabs>
        </div>

        <KnockoutWizard
          v-if="tournament"
          v-model:open="showKnockoutWizard"
          :participants="participants"
          :tournament="tournament"
          @finish="fixtureStore.fetchFixtures(tournament.id)"
        />

        <GroupSetupWizard
          v-if="tournament"
          v-model:open="showGroupWizard"
          :participants="participants"
          :tournament="tournament"
          :groups="groupStore.groups"
          @finish="fixtureStore.fetchFixtures(tournament.id)"
        />
      </div>
    </template>

    <!-- Not Found -->
    <div v-else class="text-center py-20">
      <UIcon
        name="i-heroicons-magnifying-glass"
        class="w-12 h-12 mx-auto text-gray-400 mb-4"
      />
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        Tournament not found
      </h2>
      <p class="text-gray-500 mb-6">
        The tournament you're looking for doesn't exist or has been deleted.
      </p>
      <UButton to="/" variant="outline">Back to Dashboard</UButton>
    </div>

    <TournamentTransferOwnershipModal v-model:open="showTransferModal" />

    <TournamentStartSeasonModal v-model:open="showSeasonModal" />

    <!-- Match Control Component (head-to-head sports) -->
    <MatchControl
      :fixture="selectedFixture"
      :tournament="tournament"
      v-model:open="showMatchControlModal"
      @fixture-updated="handleFixtureUpdated"
      @match-ended="handleMatchEnded"
    />

    <!-- Race Control (placement sports — engine-provided full control surface) -->
    <component
      :is="resolveEngine(tournament?.sport).control"
      v-if="selectedFixture && resolveEngine(tournament?.sport).control"
      :fixture="selectedFixture"
      :tournament="tournament"
      v-model:open="showRaceControlModal"
      @fixture-updated="handleFixtureUpdated"
    />

    <!-- Shared dialogs -->
    <ConfirmDialog />
    <PromptDialog />
  </div>
</template>
