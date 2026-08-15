<script setup lang="ts">
import {
  FixtureStatus,
  MatchEventType,
  ParticipantType,
  FixtureStage,
} from "~/types";
import type { Fixture, Player, MatchEvent, Highlight } from "~/types";
import {
  useMatchTimer,
  isFixtureLiveStatus,
} from "~/composables/useMatchTimer";

const props = withDefaults(
  defineProps<{
    fixture: Fixture | null;
    open: boolean;
    tournament?: any;
  }>(),
  {
    fixture: null,
    open: false,
    tournament: null,
  },
);

const emit = defineEmits<{
  "update:open": [value: boolean];
  "fixture-updated": [fixture: Fixture];
  "match-ended": [];
}>();

const internalOpen = computed({
  get: () => props.open,
  set: (value) => emit("update:open", value),
});

const fixtureStore = useFixtureStore();
const participantStore = useParticipantStore();
const { handleError, extractErrorMessage } = useErrors();

// Local state
const selectedFixture = ref<Fixture | null>(null);
const updatingMatch = ref(false);
const matchDuration = ref(90);
const matchTimer = useMatchTimer();

const updatingTime = ref(false);
const homePlayers = ref<Player[]>([]);
const awayPlayers = ref<Player[]>([]);
const loadingPlayers = ref(false);
const matchEvents = ref<MatchEvent[]>([]);
const loadingEvents = ref(false);
const showEventsCollapsible = ref(false);
const showScheduleCollapsible = ref(false);
const showLivestreamCollapsible = ref(false);
const showPenaltyCollapsible = ref(false);
const showWalkoverCollapsible = ref(false);
const errorMessage = ref<string | null>(null);
const swappingTeams = ref(false);
const highlights = ref<Highlight[]>([]);
const loadingHighlights = ref(false);
const showHighlightsCollapsible = ref(false);
const showLineupCollapsible = ref(false);
const showMotmCollapsible = ref(false);

const activeTab = ref<"live" | "setup" | "events" | "media">("live");

const highlightsApi = useHighlights(
  () => selectedFixture.value?.id,
  highlights,
  loadingHighlights,
);
provide(HighlightsKey, highlightsApi);

const livestreamApi = useMatchLivestream({
  fixture: selectedFixture,
  onFixtureUpdated: (fixture) => emit("fixture-updated", fixture),
});
provide(MatchLivestreamKey, livestreamApi);

const eventsApi = useMatchEvents({
  fixture: selectedFixture,
  matchEvents,
  loadingEvents,
  homePlayers,
  awayPlayers,
  updatingMatch,
  onFixtureUpdated: (fixture) => emit("fixture-updated", fixture),
});
provide(MatchEventsKey, eventsApi);

const penaltiesApi = usePenalties({
  fixture: selectedFixture,
  updatingMatch,
  homePlayers,
  awayPlayers,
  eventsApi,
  isScoreTiedOrAggregateTied: () => isScoreTiedOrAggregateTied.value,
  isIndividual: () =>
    props.tournament?.participantType === ParticipantType.INDIVIDUAL,
  onFixtureUpdated: (fixture) => emit("fixture-updated", fixture),
});
provide(PenaltiesKey, penaltiesApi);

const {
  showEditEventModal,
  eventBeingEdited,
  editEventData,
  showDeleteEventModal,
  confirmEditEvent,
  confirmDeleteEvent,
  editEventPlayerOptions,
  editEventRelatedPlayerOptions,
  getMatchHalf,
  refreshMatchEvents,
} = eventsApi;

const {
  showPenaltyOverride,
  showRemovePenaltiesModal,
  hasPenalties,
  needsPenaltyWarning,
  removePenalties,
} = penaltiesApi;

const scheduleApi = useMatchSchedule({
  fixture: selectedFixture,
  matchDuration,
  updatingTime,
  tournament: () => props.tournament,
  onFixtureUpdated: (fixture) => emit("fixture-updated", fixture),
});
provide(MatchScheduleKey, scheduleApi);

const lineupsApi = useMatchLineups({
  fixture: selectedFixture,
  homePlayers,
  awayPlayers,
  onFixtureUpdated: (fixture) => emit("fixture-updated", fixture),
});
provide(MatchLineupsKey, lineupsApi);

const { selectedLineupIds } = lineupsApi;

const confirmModalApi = useConfirmModal();
provide(ConfirmModalKey, confirmModalApi);

const timerControlsApi = useMatchTimerControls({
  fixture: selectedFixture,
  matchDuration,
  updatingMatch,
  updatingTime,
  matchTimer,
  isScoreTiedOrAggregateTied: () => isScoreTiedOrAggregateTied.value,
  onFixtureUpdated: (fixture) => emit("fixture-updated", fixture),
  onMatchEnded: () => emit("match-ended"),
  closeModal: () => closeModal(),
  onError: (message) => (errorMessage.value = message),
});
provide(MatchTimerControlsKey, timerControlsApi);

const {
  showConfirmModal,
  confirmModalTitle,
  confirmModalMessage,
  confirmModalConfirmLabel,
  confirmModalConfirmColor,
  handleConfirmModal,
} = confirmModalApi;

const {
  adjustedMinute,
  isEditingMinute,
  adjustTimerMaxMinutes,
  adjustMatchTimer,
} = timerControlsApi;

const eventsTabBadge = computed(() => {
  const count = matchEvents.value.length;
  return count > 0 ? count : undefined;
});

const setupTabBadge = computed(() => {
  if (livestreamApi.livestreamUrl.value || selectedFixture.value?.livestreamUrl)
    return "configured";
  if (selectedFixture.value?.startTime) return "scheduled";
  return undefined;
});

const mediaTabBadge = computed(() => {
  const count = highlights.value.length;
  return count > 0 ? count : undefined;
});

watch(
  () => selectedFixture.value?.status,
  (status) => {
    if (!status) return;
    if (status === "SCHEDULED") {
      activeTab.value = "setup";
    } else if (["LIVE", "EXTRATIME", "NORMAL_TIME_ENDED"].includes(status)) {
      activeTab.value = "live";
    } else if (status === "COMPLETED") {
      activeTab.value = "events";
    }
  },
);

// Goal scoring modal
const showGoalModal = ref(false);
const scoringTeam = ref<"home" | "away">("home");
const goalData = reactive({
  type: MatchEventType.GOAL as MatchEventType,
  scorerId: undefined as string | undefined,
  assisterId: undefined as string | undefined,
  minute: null as number | null,
});

// Card modal
const showCardModal = ref(false);
const cardTeam = ref<"home" | "away">("home");
const cardData = reactive({
  type: MatchEventType.YELLOW_CARD as MatchEventType,
  playerId: undefined as string | undefined,
  minute: null as number | null,
});

// Walkover modal
const showWalkoverModal = ref(false);
const walkoverScore = ref(3);

// Swap confirmation modal
const showSwapConfirmModal = ref(false);

// Substitution modal
const showSubstitutionModal = ref(false);
const subTeam = ref<"home" | "away">("home");
const subData = reactive({
  playerOutId: undefined as string | undefined,
  playerInId: undefined as string | undefined,
  minute: null as number | null,
});

// Watchers for mutual exclusion between scorer and assister
watch(
  () => goalData.scorerId,
  (newId) => {
    if (newId && newId === goalData.assisterId) {
      goalData.assisterId = undefined;
    }
  },
);

watch(
  () => goalData.assisterId,
  (newId) => {
    if (newId && newId === goalData.scorerId) {
      goalData.scorerId = undefined;
    }
  },
);

watch(
  () => subData.playerOutId,
  (newId) => {
    if (newId && newId === subData.playerInId) {
      subData.playerInId = undefined;
    }
  },
);

watch(
  () => subData.playerInId,
  (newId) => {
    if (newId && newId === subData.playerOutId) {
      subData.playerOutId = undefined;
    }
  },
);

// Watch for fixture changes
watch(
  () => props.fixture,
  async (newFixture) => {
    if (newFixture && props.open) {
      selectedFixture.value = { ...newFixture };
      matchDuration.value = newFixture.matchDuration ?? 90;
      lineupsApi.syncFromFixture(newFixture);
      await loadMatchData(newFixture);
    }
  },
  { immediate: true },
);

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen && props.fixture) {
      errorMessage.value = null;
      selectedFixture.value = { ...props.fixture };
      matchDuration.value = props.fixture.matchDuration ?? 90;
      lineupsApi.syncFromFixture(props.fixture);
      livestreamApi.syncFromFixture(props.fixture);
      scheduleApi.syncFromFixture(props.fixture);
      await loadMatchData(props.fixture);
    } else if (!isOpen) {
      // Reset state when closing
      errorMessage.value = null;
      showPenaltyOverride.value = false;
      matchEvents.value = [];
      highlights.value = [];
      homePlayers.value = [];
      awayPlayers.value = [];
      livestreamApi.resetLivestream();
      scheduleApi.resetSchedule();
      highlightsApi.resetHighlightForm();
      showLivestreamCollapsible.value = false;
      showEventsCollapsible.value = false;
      showPenaltyCollapsible.value = false;
      showHighlightsCollapsible.value = false;
      showLineupCollapsible.value = false;
      showMotmCollapsible.value = false;
      showWalkoverCollapsible.value = false;
      showScheduleCollapsible.value = false;
      lineupsApi.resetLineups();
    }
  },
);

watch(showScheduleCollapsible, (isOpen) => {
  if (isOpen && isFixtureLiveStatus(selectedFixture.value?.status)) {
    const currentElapsed =
      matchTimer.getElapsedSeconds(selectedFixture.value) ?? 0;
    const rawMinute = Math.floor(currentElapsed / 60);
    adjustedMinute.value = Math.min(rawMinute, adjustTimerMaxMinutes.value);
  }
});

watch(
  () => matchTimer.now.value,
  () => {
    if (
      isEditingMinute.value ||
      !isFixtureLiveStatus(selectedFixture.value?.status)
    )
      return;
    const minute = matchTimer.getMinute(selectedFixture.value);
    if (minute !== null) {
      adjustedMinute.value = Math.min(minute, adjustTimerMaxMinutes.value);
    }
  },
);

const loadMatchData = async (fixture: Fixture) => {
  matchEvents.value = [];
  highlights.value = [];
  loadingPlayers.value = true;
  loadingEvents.value = true;
  loadingHighlights.value = true;

  try {
    // Fetch full fixture details to get the saved lineup players
    const detailedFixtureRes = await $api<any>(`/fixtures/${fixture.id}`);
    const detailedFixture = detailedFixtureRes?.data || detailedFixtureRes;
    if (detailedFixture) {
      selectedFixture.value = detailedFixture;
      lineupsApi.applyDetailedFixture(detailedFixture);
    }

    const promises: Promise<any>[] = [];

    if (fixture.homeTeamId) {
      promises.push(
        participantStore
          .fetchParticipantPlayers(fixture.homeTeamId)
          .then((players) => {
            homePlayers.value = players;
          })
          .catch((e) => {
            console.error("Error fetching home players:", e);
            homePlayers.value = [];
          }),
      );
    }

    if (fixture.awayTeamId) {
      promises.push(
        participantStore
          .fetchParticipantPlayers(fixture.awayTeamId)
          .then((players) => {
            awayPlayers.value = players;
          })
          .catch((e) => {
            console.error("Error fetching away players:", e);
            awayPlayers.value = [];
          }),
      );
    }

    // Fetch match events
    promises.push(
      $api<any>(`/match-events/fixture/${fixture.id}`)
        .then((res) => {
          matchEvents.value = res.data || [];
        })
        .catch(() => {
          matchEvents.value = [];
        }),
    );

    // Fetch highlights
    promises.push(
      fixtureStore
        .fetchHighlights(fixture.id)
        .then((res: any) => {
          highlights.value = res.data || [];
        })
        .catch(() => {
          highlights.value = [];
        }),
    );

    await Promise.all(promises);
  } catch (e) {
    console.error("Failed to load data:", e);
  } finally {
    loadingPlayers.value = false;
    loadingEvents.value = false;
    loadingHighlights.value = false;
  }
};

const isLeg2 = computed(() => {
  if (!props.tournament?.twoLegsKnockout) return false;
  if (!selectedFixture.value) return false;
  if (
    selectedFixture.value.stage !== FixtureStage.KNOCKOUT &&
    selectedFixture.value.stage != null
  )
    return false;
  return selectedFixture.value.matchNumber % 2 === 0;
});

const leg1Completed = computed(() => {
  if (!isLeg2.value || !selectedFixture.value) return true;

  const leg1 = fixtureStore.fixtures.find(
    (f) =>
      f.tournament_id === selectedFixture.value?.tournament_id &&
      f.round === selectedFixture.value?.round &&
      f.matchNumber === selectedFixture.value!.matchNumber - 1 &&
      (selectedFixture.value?.stage == null ||
        f.stage === selectedFixture.value?.stage) &&
      (selectedFixture.value?.groupId == null ||
        f.groupId === selectedFixture.value?.groupId),
  );

  if (!leg1) return true;
  return leg1.status === FixtureStatus.COMPLETED;
});

// Check if scores are tied (or aggregate tied for Leg 2)
const isScoreTiedOrAggregateTied = computed(() => {
  if (!selectedFixture.value) return false;
  const homeScore = selectedFixture.value.homeScore ?? 0;
  const awayScore = selectedFixture.value.awayScore ?? 0;

  if (isLeg2.value) {
    // For Leg 2, check the aggregate score
    const leg1 = fixtureStore.fixtures.find(
      (f) =>
        f.tournament_id === selectedFixture.value?.tournament_id &&
        f.round === selectedFixture.value?.round &&
        f.matchNumber === selectedFixture.value!.matchNumber - 1 &&
        (selectedFixture.value?.stage == null ||
          f.stage === selectedFixture.value?.stage) &&
        (selectedFixture.value?.groupId == null ||
          f.groupId === selectedFixture.value?.groupId),
    );

    if (leg1) {
      // Leg 2 home = Leg 1 away, so aggregate:
      const aggHome = homeScore + (leg1.awayScore ?? 0);
      const aggAway = awayScore + (leg1.homeScore ?? 0);
      return aggHome === aggAway;
    }
  }

  // Single leg or Leg 1: simple comparison
  return homeScore === awayScore;
});

const scoringTeamPlayers = computed(() => {
  if (goalData.type === MatchEventType.OWN_GOAL) {
    return scoringTeam.value === "home" ? awayPlayers.value : homePlayers.value;
  }
  return scoringTeam.value === "home" ? homePlayers.value : awayPlayers.value;
});

const cardTeamPlayers = computed(() => {
  return cardTeam.value === "home" ? homePlayers.value : awayPlayers.value;
});

const subTeamPlayers = computed(() => {
  return subTeam.value === "home" ? homePlayers.value : awayPlayers.value;
});

const teamSubEvents = computed(() => {
  const participantId =
    subTeam.value === "home"
      ? selectedFixture.value?.homeTeamId
      : selectedFixture.value?.awayTeamId;
  if (!participantId) return [];
  return matchEvents.value.filter(
    (e) =>
      e.type === MatchEventType.SUBSTITUTION &&
      e.participant_id === participantId,
  );
});

const subbedOutPlayerIds = computed(() => {
  return teamSubEvents.value
    .map((e) => e.relatedPlayerId)
    .filter(Boolean) as string[];
});

const currentlyOnPitch = computed(() => {
  const teamRoster = subTeamPlayers.value;
  const teamLineupIds = teamRoster
    .map((p) => p.id)
    .filter((id) => selectedLineupIds.value.includes(id));

  const baseLineupIds =
    teamLineupIds.length > 0 ? teamLineupIds : teamRoster.map((p) => p.id);
  const onPitchIds = new Set(baseLineupIds);

  const sortedSubEvents = [...teamSubEvents.value].sort(
    (a, b) => (a.minute || 0) - (b.minute || 0),
  );
  for (const event of sortedSubEvents) {
    if (event.relatedPlayerId) {
      onPitchIds.delete(event.relatedPlayerId);
    }
    if (event.playerId) {
      onPitchIds.add(event.playerId);
    }
  }

  return teamRoster.filter((p) => onPitchIds.has(p.id));
});

const subPlayerOutOptions = computed(() => {
  return currentlyOnPitch.value.map((p) => ({
    label: `${p.number ? "#" + p.number + " " : ""}${p.name}${p.position ? " (" + p.position.split("-")[0] + ")" : ""}`,
    value: p.id,
  }));
});

const subPlayerInOptions = computed(() => {
  const teamRoster = subTeamPlayers.value;
  const onPitchIds = new Set(currentlyOnPitch.value.map((p) => p.id));
  const outIds = new Set(subbedOutPlayerIds.value);

  const benchPlayers = teamRoster.filter(
    (p) => !onPitchIds.has(p.id) && !outIds.has(p.id),
  );

  return benchPlayers
    .filter((p) => p.id !== subData.playerOutId)
    .map((p) => ({
      label: `${p.number ? "#" + p.number + " " : ""}${p.name}${p.position ? " (" + p.position.split("-")[0] + ")" : ""}`,
      value: p.id,
    }));
});

const confirmGoal = async () => {
  if (!selectedFixture.value) return;

  const participantId =
    scoringTeam.value === "home"
      ? selectedFixture.value.homeTeamId
      : selectedFixture.value.awayTeamId;

  if (!participantId) return;

  // Update local state immediately (but only if it's a goal that counts towards the score)
  const isScoringEvent =
    goalData.type === MatchEventType.GOAL ||
    goalData.type === MatchEventType.OWN_GOAL ||
    goalData.type === MatchEventType.PENALTY;

  if (isScoringEvent) {
    if (scoringTeam.value === "home") {
      selectedFixture.value.homeScore =
        (selectedFixture.value.homeScore ?? 0) + 1;
    } else {
      selectedFixture.value.awayScore =
        (selectedFixture.value.awayScore ?? 0) + 1;
    }
  }

  updatingMatch.value = true;
  try {
    // Update fixture score
    await fixtureStore.updateFixture(selectedFixture.value.id, {
      homeScore: selectedFixture.value.homeScore,
      awayScore: selectedFixture.value.awayScore,
    });

    // Create match event for the goal (skip for Individual tournaments)
    if (props.tournament?.participantType !== ParticipantType.INDIVIDUAL) {
      await fixtureStore.createMatchEvent({
        fixtureId: selectedFixture.value.id,
        participantId: participantId,
        playerId: goalData.scorerId,
        relatedPlayerId: goalData.assisterId,
        type: goalData.type,
        half: getMatchHalf(goalData.minute),
        minute: goalData.minute,
      });
    }

    showGoalModal.value = false;
    emit("fixture-updated", selectedFixture.value!);

    // Refresh match events (skip for Individual tournaments)
    if (props.tournament?.participantType !== ParticipantType.INDIVIDUAL) {
      await refreshMatchEvents();
    }

    useToast().add({
      title: "Goal Recorded!",
      description: goalData.scorerId
        ? "Goal and scorer recorded."
        : "Goal recorded.",
      icon: "i-heroicons-trophy",
      color: "success",
    });
  } catch (error: any) {
    // Revert on error
    if (isScoringEvent) {
      if (scoringTeam.value === "home") {
        selectedFixture.value.homeScore =
          (selectedFixture.value.homeScore ?? 1) - 1;
      } else {
        selectedFixture.value.awayScore =
          (selectedFixture.value.awayScore ?? 1) - 1;
      }
    }
    handleError(error, { title: "Failed to record goal" });
  } finally {
    updatingMatch.value = false;
  }
};

const openGoalModal = (
  team: "home" | "away",
  type: MatchEventType = MatchEventType.GOAL,
) => {
  scoringTeam.value = team;
  goalData.type = type;
  goalData.scorerId = undefined;
  goalData.assisterId = undefined;

  const currentMin = isFixtureLiveStatus(selectedFixture.value?.status)
    ? (matchTimer.getMinute(selectedFixture.value) ?? null)
    : null;
  goalData.minute = currentMin;

  // For Individual tournaments, record goal immediately without modal
  if (props.tournament?.participantType === ParticipantType.INDIVIDUAL) {
    confirmGoal();
    return;
  }

  showGoalModal.value = true;
};

const openCardModal = (team: "home" | "away") => {
  cardTeam.value = team;
  cardData.type = MatchEventType.YELLOW_CARD;
  cardData.playerId = undefined;

  const currentMin = isFixtureLiveStatus(selectedFixture.value?.status)
    ? (matchTimer.getMinute(selectedFixture.value) ?? null)
    : null;
  cardData.minute = currentMin;
  showCardModal.value = true;
};

const confirmCard = async () => {
  if (!selectedFixture.value) return;

  const participantId =
    cardTeam.value === "home"
      ? selectedFixture.value.homeTeamId
      : selectedFixture.value.awayTeamId;

  if (!participantId || !cardData.playerId) return;

  updatingMatch.value = true;
  try {
    await fixtureStore.createMatchEvent({
      fixtureId: selectedFixture.value.id,
      participantId: participantId,
      playerId: cardData.playerId,
      type: cardData.type,
      half: getMatchHalf(cardData.minute),
      minute: cardData.minute,
    });

    showCardModal.value = false;
    await refreshMatchEvents();

    useToast().add({
      title: "Card Recorded!",
      description: "Card event has been added.",
      icon:
        cardData.type === MatchEventType.YELLOW_CARD
          ? "i-heroicons-exclamation-triangle"
          : "i-heroicons-x-circle",
      color: cardData.type === MatchEventType.YELLOW_CARD ? "warning" : "error",
    });
  } catch (error: any) {
    handleError(error, { title: "Failed to record card" });
  } finally {
    updatingMatch.value = false;
  }
};

const openSubstitutionModal = (team: "home" | "away") => {
  subTeam.value = team;
  subData.playerOutId = undefined;
  subData.playerInId = undefined;

  const currentMin = isFixtureLiveStatus(selectedFixture.value?.status)
    ? (matchTimer.getMinute(selectedFixture.value) ?? null)
    : null;
  subData.minute = currentMin;
  showSubstitutionModal.value = true;
};

const confirmSubstitution = async () => {
  if (!selectedFixture.value) return;

  const participantId =
    subTeam.value === "home"
      ? selectedFixture.value.homeTeamId
      : selectedFixture.value.awayTeamId;

  if (!participantId || !subData.playerOutId || !subData.playerInId) return;

  updatingMatch.value = true;
  try {
    await fixtureStore.createMatchEvent({
      fixtureId: selectedFixture.value.id,
      participantId: participantId,
      playerId: subData.playerInId, // Player In
      relatedPlayerId: subData.playerOutId, // Player Out
      type: MatchEventType.SUBSTITUTION,
      half: getMatchHalf(subData.minute),
      minute: subData.minute,
    });

    showSubstitutionModal.value = false;
    await refreshMatchEvents();

    useToast().add({
      title: "Substitution Recorded!",
      description: "Substitution event has been added.",
      icon: "i-heroicons-arrow-path",
      color: "success",
    });
  } catch (error: any) {
    handleError(error, { title: "Failed to record substitution" });
  } finally {
    updatingMatch.value = false;
  }
};

const decrementScore = async (team: "home" | "away") => {
  if (!selectedFixture.value) return;

  const currentScore =
    team === "home"
      ? (selectedFixture.value.homeScore ?? 0)
      : (selectedFixture.value.awayScore ?? 0);

  if (currentScore <= 0) return;

  const newScore = currentScore - 1;

  // Update local state immediately
  if (team === "home") {
    selectedFixture.value.homeScore = newScore;
  } else {
    selectedFixture.value.awayScore = newScore;
  }

  updatingMatch.value = true;
  try {
    await fixtureStore.updateFixture(selectedFixture.value.id, {
      homeScore: selectedFixture.value.homeScore,
      awayScore: selectedFixture.value.awayScore,
    });
    emit("fixture-updated", selectedFixture.value!);
  } catch (error: any) {
    // Revert on error
    if (team === "home") {
      selectedFixture.value.homeScore = currentScore;
    } else {
      selectedFixture.value.awayScore = currentScore;
    }
    handleError(error, { title: "Failed to update score" });
  } finally {
    updatingMatch.value = false;
  }
};

const setWalkover = async (winner: "home" | "away") => {
  if (!selectedFixture.value) return;

  updatingMatch.value = true;
  try {
    const homeScore = winner === "home" ? walkoverScore.value : 0;
    const awayScore = winner === "away" ? walkoverScore.value : 0;

    const updatePayload = {
      status: FixtureStatus.COMPLETED,
      homeScore,
      awayScore,
      timerIsRunning: false,
    };
    await fixtureStore.updateFixture(selectedFixture.value.id, updatePayload);

    selectedFixture.value = {
      ...selectedFixture.value,
      ...updatePayload,
    };
    emit("fixture-updated", selectedFixture.value!);
    emit("match-ended");
    showWalkoverModal.value = false;
    closeModal();

    useToast().add({
      title: "Walkover Recorded",
      description: `${winner === "home" ? selectedFixture.value.homeTeam?.customName || "Home" : selectedFixture.value.awayTeam?.customName || "Away"} wins by walkover (${homeScore}-${awayScore}).`,
      icon: "i-heroicons-flag",
      color: "success",
    });
  } catch (error: any) {
    errorMessage.value = extractErrorMessage(error);
    handleError(error, { title: "Failed to record walkover" });
  } finally {
    updatingMatch.value = false;
  }
};

// Player selection items for dropdowns
const scorerOptions = computed(() => {
  return scoringTeamPlayers.value.map((p) => ({
    label: `${p.number ? `#${p.number} ` : ""}${p.name}`,
    value: p.id,
  }));
});

const assisterOptions = computed(() => {
  return scoringTeamPlayers.value.map((p) => ({
    label: `${p.number ? `#${p.number} ` : ""}${p.name}`,
    value: p.id,
    disabled: p.id === goalData.scorerId,
  }));
});

const confirmSwapTeams = async () => {
  showSwapConfirmModal.value = false;
  await swapTeams();
};

const swapTeams = async () => {
  if (!selectedFixture.value || swappingTeams.value) return;

  swappingTeams.value = true;
  const f = selectedFixture.value;

  try {
    // Send swap to backend
    await fixtureStore.updateFixture(f.id, {
      homeTeamId: f.awayTeamId,
      awayTeamId: f.homeTeamId,
      homeScore: f.awayScore ?? 0,
      awayScore: f.homeScore ?? 0,
      homePenaltyScore: f.awayPenaltyScore ?? null,
      awayPenaltyScore: f.homePenaltyScore ?? null,
      homeTeamPlaceholder: f.awayTeamPlaceholder ?? null,
      awayTeamPlaceholder: f.homeTeamPlaceholder ?? null,
      homeFormation: f.awayFormation ?? null,
      awayFormation: f.homeFormation ?? null,
    });

    // Swap local state
    const newFixture = {
      ...f,
      homeTeamId: f.awayTeamId,
      awayTeamId: f.homeTeamId,
      homeTeam: f.awayTeam,
      awayTeam: f.homeTeam,
      homeScore: f.awayScore ?? 0,
      awayScore: f.homeScore ?? 0,
      homePenaltyScore: f.awayPenaltyScore,
      awayPenaltyScore: f.homePenaltyScore,
      homeTeamPlaceholder: f.awayTeamPlaceholder,
      awayTeamPlaceholder: f.homeTeamPlaceholder,
      homeFormation: f.awayFormation,
      awayFormation: f.homeFormation,
    };
    selectedFixture.value = newFixture;

    // Swap local refs
    lineupsApi.swapFormations();

    // Swap players too
    const tempPlayers = homePlayers.value;
    homePlayers.value = awayPlayers.value;
    awayPlayers.value = tempPlayers;

    emit("fixture-updated", newFixture);

    useToast().add({
      title: "Teams Swapped",
      description: "Home and away teams have been swapped.",
      icon: "i-heroicons-arrows-right-left",
      color: "success",
    });
  } catch (error: any) {
    handleError(error, { title: "Failed to swap teams" });
  } finally {
    swappingTeams.value = false;
  }
};

const closeModal = () => {
  emit("update:open", false);
};

const downloading = ref(false);
const sharingMatch = ref(false);

const { canShare, shareGraphic: shareGraphicFn } = useGraphicShare();

const generateGraphicBlob = async (): Promise<Blob | null> => {
  if (!selectedFixture.value || !props.tournament) return null;

  try {
    return await $fetch<Blob>("/api/graphics/match-result", {
      method: "POST",
      body: {
        match: selectedFixture.value,
        homeTeam: selectedFixture.value.homeTeam,
        awayTeam: selectedFixture.value.awayTeam,
        tournament: props.tournament,
      },
      responseType: "blob",
    });
  } catch (e) {
    console.error("Graphic generation failed", e);
    return null;
  }
};

const handleShareGraphic = async () => {
  sharingMatch.value = true;
  try {
    const blob = await generateGraphicBlob();
    if (blob) {
      const filename = `match-${selectedFixture.value?.id || "result"}.png`;
      await shareGraphicFn(blob, filename);
    } else {
      handleError(new Error("Could not generate graphic"), {
        title: "Generation Failed",
      });
    }
  } finally {
    sharingMatch.value = false;
  }
};

const downloadGraphic = async () => {
  if (!selectedFixture.value || !props.tournament) return;

  downloading.value = true;
  try {
    const response = await $fetch<Blob>("/api/graphics/match-result", {
      method: "POST",
      body: {
        match: selectedFixture.value,
        homeTeam: selectedFixture.value.homeTeam,
        awayTeam: selectedFixture.value.awayTeam,
        tournament: props.tournament,
      },
      responseType: "blob",
    });

    // Create download link
    const url = window.URL.createObjectURL(response);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `match-${selectedFixture.value.id}.png`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    useToast().add({
      title: "Graphic Generated",
      description: "Match result graphic has been downloaded.",
      icon: "i-heroicons-photo",
      color: "success",
    });
  } catch (e) {
    handleError(e, {
      title: "Generation Failed",
      description: "Could not generate graphic.",
    });
  } finally {
    downloading.value = false;
  }
};
</script>

<template>
  <!-- Match Control Modal -->
  <UModal v-model:open="internalOpen">
    <template #content>
      <div class="mc-shell">
        <!-- ── Header ──────────────────────────────────────────── -->
        <MatchModalHeader
          :fixture="selectedFixture"
          :can-share="canShare"
          :sharing-match="sharingMatch"
          @close="closeModal"
          @share="handleShareGraphic"
        />

        <!-- Persistent Scoreboard (outside tabs) -->
        <MatchScoreboard
          :fixture="selectedFixture"
          :swapping-teams="swappingTeams"
          :updating-match="updatingMatch"
          @swap="showSwapConfirmModal = true"
        />

        <!-- Tabs -->
        <div v-if="selectedFixture" class="mc-tabs">
          <button
            class="mc-tab"
            :class="{ 'mc-tab--active': activeTab === 'live' }"
            @click="activeTab = 'live'"
          >
            <UIcon name="i-heroicons-bolt" class="w-4 h-4" />
            <span>Live</span>
          </button>
          <button
            class="mc-tab"
            :class="{ 'mc-tab--active': activeTab === 'events' }"
            @click="activeTab = 'events'"
          >
            <UIcon name="i-heroicons-clipboard-document-list" class="w-4 h-4" />
            <span>Events</span>
            <span v-if="eventsTabBadge" class="mc-tab-badge">{{
              eventsTabBadge
            }}</span>
          </button>
          <button
            class="mc-tab"
            :class="{ 'mc-tab--active': activeTab === 'setup' }"
            @click="activeTab = 'setup'"
          >
            <UIcon name="i-heroicons-cog-6-tooth" class="w-4 h-4" />
            <span>Setup</span>
            <span v-if="setupTabBadge" class="mc-tab-badge">{{
              setupTabBadge
            }}</span>
          </button>
          <button
            class="mc-tab"
            :class="{ 'mc-tab--active': activeTab === 'media' }"
            @click="activeTab = 'media'"
          >
            <UIcon name="i-heroicons-video-camera" class="w-4 h-4" />
            <span>Media</span>
            <span v-if="mediaTabBadge" class="mc-tab-badge">{{
              mediaTabBadge
            }}</span>
          </button>
        </div>

        <!-- Body / Tab Panes -->
        <div v-if="selectedFixture" class="mc-body">
          <!-- Alerts (sticky-ish top of body) -->
          <UAlert
            v-if="errorMessage"
            icon="i-heroicons-exclamation-triangle"
            color="error"
            variant="soft"
            :title="errorMessage"
            class="mb-4"
          />
          <UAlert
            v-if="needsPenaltyWarning"
            icon="i-heroicons-exclamation-triangle"
            color="warning"
            variant="soft"
            title="No winner — scores are tied"
            description="Add penalty shootout scores to determine a winner."
            class="mb-4"
          >
            <template #actions>
              <UButton
                size="xs"
                color="warning"
                variant="soft"
                icon="i-heroicons-bolt"
                label="Add Penalties"
                @click="
                  showPenaltyOverride = true;
                  activeTab = 'events';
                "
              />
            </template>
          </UAlert>

          <!-- Live Tab -->
          <div v-show="activeTab === 'live'" class="mc-tab-pane">
            <!-- Streamlined score controls -->
            <div
              v-if="
                [
                  'LIVE',
                  'NORMAL_TIME_ENDED',
                  'EXTRATIME',
                  'COMPLETED',
                ].includes(selectedFixture.status)
              "
              class="mc-controls"
            >
              <!-- Home side column -->
              <div class="mc-ctrl-side">
                <button
                  class="mc-btn mc-btn--goal mc-btn--large"
                  :disabled="loadingPlayers || updatingMatch"
                  @click="openGoalModal('home')"
                >
                  <UIcon name="i-heroicons-plus" class="w-3.5 h-3.5" />
                  <span>Goal</span>
                </button>
                <button
                  v-if="
                    props.tournament?.participantType !==
                    ParticipantType.INDIVIDUAL
                  "
                  class="mc-btn mc-btn--card mc-btn--large"
                  :disabled="loadingPlayers || updatingMatch"
                  @click="openCardModal('home')"
                >
                  <span class="card-icons">
                    <span class="card-icon card-icon--yellow" />
                    <span class="card-icon card-icon--red" />
                  </span>
                  <span>Card</span>
                </button>
                <button
                  v-if="
                    props.tournament?.participantType !==
                    ParticipantType.INDIVIDUAL
                  "
                  class="mc-btn mc-btn--sub mc-btn--large"
                  :disabled="loadingPlayers || updatingMatch"
                  @click="openSubstitutionModal('home')"
                >
                  <UIcon name="i-heroicons-arrow-path" class="w-3.5 h-3.5" />
                  <span>Sub</span>
                </button>
                <!-- More actions -->
                <div class="mc-actions-more">
                  <button
                    class="mc-btn mc-btn--penalty"
                    :disabled="loadingPlayers || updatingMatch"
                    @click="openGoalModal('home', MatchEventType.PENALTY)"
                  >
                    <IconsSoccerBallIcon class="w-3.5 h-3.5" />
                    <span>Penalty</span>
                  </button>
                  <button
                    class="mc-btn mc-btn--og"
                    :disabled="loadingPlayers || updatingMatch"
                    @click="openGoalModal('home', MatchEventType.OWN_GOAL)"
                  >
                    <IconsSoccerBallIcon class="w-3.5 h-3.5" />
                    <span>OG</span>
                  </button>
                  <button
                    class="mc-btn mc-btn--miss"
                    :disabled="loadingPlayers || updatingMatch"
                    @click="
                      openGoalModal('home', MatchEventType.MISSED_PENALTY)
                    "
                  >
                    <UIcon name="i-heroicons-x-circle" class="w-3.5 h-3.5" />
                    <span>Missed Pen</span>
                  </button>
                </div>
                <button
                  v-if="
                    props.tournament?.participantType ===
                    ParticipantType.INDIVIDUAL
                  "
                  class="mc-btn mc-btn--minus"
                  :disabled="
                    (selectedFixture.homeScore ?? 0) <= 0 || updatingMatch
                  "
                  @click="decrementScore('home')"
                >
                  <UIcon name="i-heroicons-minus" class="w-3.5 h-3.5" />
                </button>
              </div>

              <!-- Away side column -->
              <div class="mc-ctrl-side">
                <button
                  class="mc-btn mc-btn--goal mc-btn--large"
                  :disabled="loadingPlayers || updatingMatch"
                  @click="openGoalModal('away')"
                >
                  <UIcon name="i-heroicons-plus" class="w-3.5 h-3.5" />
                  <span>Goal</span>
                </button>
                <button
                  v-if="
                    props.tournament?.participantType !==
                    ParticipantType.INDIVIDUAL
                  "
                  class="mc-btn mc-btn--card mc-btn--large"
                  :disabled="loadingPlayers || updatingMatch"
                  @click="openCardModal('away')"
                >
                  <span class="card-icons">
                    <span class="card-icon card-icon--yellow" />
                    <span class="card-icon card-icon--red" />
                  </span>
                  <span>Card</span>
                </button>
                <button
                  v-if="
                    props.tournament?.participantType !==
                    ParticipantType.INDIVIDUAL
                  "
                  class="mc-btn mc-btn--sub mc-btn--large"
                  :disabled="loadingPlayers || updatingMatch"
                  @click="openSubstitutionModal('away')"
                >
                  <UIcon name="i-heroicons-arrow-path" class="w-3.5 h-3.5" />
                  <span>Sub</span>
                </button>
                <div class="mc-actions-more">
                  <button
                    class="mc-btn mc-btn--penalty"
                    :disabled="loadingPlayers || updatingMatch"
                    @click="openGoalModal('away', MatchEventType.PENALTY)"
                  >
                    <IconsSoccerBallIcon class="w-3.5 h-3.5" />
                    <span>Penalty</span>
                  </button>
                  <button
                    class="mc-btn mc-btn--og"
                    :disabled="loadingPlayers || updatingMatch"
                    @click="openGoalModal('away', MatchEventType.OWN_GOAL)"
                  >
                    <IconsSoccerBallIcon class="w-3.5 h-3.5" />
                    <span>OG</span>
                  </button>
                  <button
                    class="mc-btn mc-btn--miss"
                    :disabled="loadingPlayers || updatingMatch"
                    @click="
                      openGoalModal('away', MatchEventType.MISSED_PENALTY)
                    "
                  >
                    <UIcon name="i-heroicons-x-circle" class="w-3.5 h-3.5" />
                    <span>Missed Pen</span>
                  </button>
                </div>
                <button
                  v-if="
                    props.tournament?.participantType ===
                    ParticipantType.INDIVIDUAL
                  "
                  class="mc-btn mc-btn--minus"
                  :disabled="
                    (selectedFixture.awayScore ?? 0) <= 0 || updatingMatch
                  "
                  @click="decrementScore('away')"
                >
                  <UIcon name="i-heroicons-minus" class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <!-- Adjust Running Time (only LIVE/NORMAL_TIME_ENDED/EXTRATIME) -->
            <div
              v-if="
                ['LIVE', 'NORMAL_TIME_ENDED', 'EXTRATIME'].includes(
                  selectedFixture.status,
                )
              "
              class="mc-timer-adjust"
            >
              <div
                class="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400"
              >
                <span class="flex items-center gap-1">
                  <UIcon
                    name="i-heroicons-clock"
                    class="w-3.5 h-3.5 text-amber-500"
                  />
                  <span>Adjust Running Time (minutes)</span>
                </span>
                <span class="font-bold text-amber-500"
                  >{{ adjustedMinute }}'</span
                >
              </div>
              <div class="flex gap-2 items-center mt-1.5">
                <UInput
                  type="number"
                  v-model.number="adjustedMinute"
                  min="0"
                  :max="adjustTimerMaxMinutes"
                  class="flex-1"
                  size="sm"
                  :disabled="updatingTime"
                  @focus="isEditingMinute = true"
                  @blur="isEditingMinute = false"
                />
                <UButton
                  color="warning"
                  variant="solid"
                  size="sm"
                  :loading="updatingTime"
                  @click="adjustMatchTimer"
                >
                  Apply
                </UButton>
              </div>
            </div>
          </div>

          <!-- Setup Tab -->
          <div v-show="activeTab === 'setup'" class="mc-tab-pane">
            <!-- Schedule -->
            <MatchScheduleForm
              v-if="
                [
                  'SCHEDULED',
                  'LIVE',
                  'NORMAL_TIME_ENDED',
                  'EXTRATIME',
                  'COMPLETED',
                ].includes(selectedFixture.status)
              "
              v-model:collapsed="showScheduleCollapsible"
            />

            <!-- Lineups -->
            <MatchLineupEditor
              v-if="tournament?.participantType !== ParticipantType.INDIVIDUAL"
              v-model:collapsed="showLineupCollapsible"
              :fixture="selectedFixture"
              :home-players="homePlayers"
              :away-players="awayPlayers"
              :loading-players="loadingPlayers"
            />

            <!-- Walkover -->
            <div
              v-if="selectedFixture.status !== 'COMPLETED'"
              class="mc-section mc-section--walkover"
            >
              <div
                class="mc-section__head cursor-pointer"
                @click="showWalkoverCollapsible = !showWalkoverCollapsible"
              >
                <UIcon
                  name="i-heroicons-flag"
                  class="w-3.5 h-3.5 text-amber-500"
                />
                <span>Walkover</span>
                <UIcon
                  name="i-heroicons-chevron-down"
                  class="w-4 h-4 ml-auto transition-transform"
                  :class="{ 'rotate-180': showWalkoverCollapsible }"
                />
              </div>
              <div v-show="showWalkoverCollapsible" class="mc-section__body">
                <button
                  class="mc-walkover-btn"
                  :disabled="updatingMatch"
                  @click="() => { showWalkoverModal = true }"
                >
                  Record Walkover
                </button>
              </div>
            </div>
          </div>

          <!-- Events Tab -->
          <div v-show="activeTab === 'events'" class="mc-tab-pane">
            <!-- Penalty Shootout -->
            <MatchPenaltyShootoutPanel
              v-if="
                [
                  'LIVE',
                  'NORMAL_TIME_ENDED',
                  'EXTRATIME',
                  'COMPLETED',
                ].includes(selectedFixture.status) &&
                (isScoreTiedOrAggregateTied ||
                  hasPenalties ||
                  showPenaltyOverride)
              "
              v-model:collapsed="showPenaltyCollapsible"
              :fixture="selectedFixture"
              :updating-match="updatingMatch"
            />

            <!-- Edit Penalties toggle -->
            <div
              v-if="
                selectedFixture.status === 'COMPLETED' &&
                !isScoreTiedOrAggregateTied &&
                !hasPenalties &&
                !showPenaltyOverride
              "
              class="flex justify-center"
            >
              <UButton
                size="xs"
                variant="link"
                color="neutral"
                icon="i-heroicons-bolt"
                label="Edit Penalties"
                @click="() => { showPenaltyOverride = true }"
              />
            </div>

            <!-- Match Events -->
            <MatchEventsPanel
              v-if="tournament?.participantType !== ParticipantType.INDIVIDUAL"
              v-model:collapsed="showEventsCollapsible"
              :fixture="selectedFixture"
            />

            <!-- MOTM -->
            <MatchMotmPanel
              v-if="
                tournament?.participantType !== ParticipantType.INDIVIDUAL &&
                selectedFixture.status === 'COMPLETED'
              "
              v-model:collapsed="showMotmCollapsible"
              :loading-players="loadingPlayers"
            />
          </div>

          <!-- Media Tab -->
          <div v-show="activeTab === 'media'" class="mc-tab-pane">
            <!-- Livestream -->
            <MatchLivestreamPanel
              v-model:collapsed="showLivestreamCollapsible"
              :fixture="selectedFixture"
            />

            <MatchHighlightsPanel v-model:collapsed="showHighlightsCollapsible" />
          </div>
        </div>

        <!-- Sticky Footer -->
        <MatchTimerControlsFooter
          :fixture="selectedFixture"
          :updating-match="updatingMatch"
          :is-leg2="isLeg2"
          :leg1-completed="leg1Completed"
        />
      </div>
      <!-- /mc-shell -->
    </template>
  </UModal>

  <!-- Goal Scoring Modal -->
  <MatchGoalModal
    v-model:open="showGoalModal"
    v-model:type="goalData.type"
    v-model:minute="goalData.minute"
    v-model:scorer-id="goalData.scorerId"
    v-model:assister-id="goalData.assisterId"
    :fixture="selectedFixture"
    :team="scoringTeam"
    :scorer-options="scorerOptions"
    :assister-options="assisterOptions"
    :no-players="scoringTeamPlayers.length === 0"
    :loading="updatingMatch"
    @confirm="confirmGoal"
  />

  <!-- Card Event Modal -->
  <MatchCardModal
    v-model:open="showCardModal"
    v-model:type="cardData.type"
    v-model:player-id="cardData.playerId"
    v-model:minute="cardData.minute"
    :fixture="selectedFixture"
    :team="cardTeam"
    :players="cardTeamPlayers"
    :loading="updatingMatch"
    @confirm="confirmCard"
  />

  <!-- Substitution Modal -->
  <MatchSubstitutionModal
    v-model:open="showSubstitutionModal"
    v-model:minute="subData.minute"
    v-model:player-out-id="subData.playerOutId"
    v-model:player-in-id="subData.playerInId"
    :fixture="selectedFixture"
    :team="subTeam"
    :out-options="subPlayerOutOptions"
    :in-options="subPlayerInOptions"
    :no-players="subTeamPlayers.length === 0"
    :loading="updatingMatch"
    @confirm="confirmSubstitution"
  />

  <!-- Edit Event Modal -->
  <MatchEditEventModal
    v-model:open="showEditEventModal"
    v-model:minute="editEventData.minute"
    v-model:player-id="editEventData.playerId"
    v-model:related-player-id="editEventData.relatedPlayerId"
    :event="eventBeingEdited"
    :player-options="editEventPlayerOptions"
    :related-options="editEventRelatedPlayerOptions"
    :loading="updatingMatch"
    @confirm="confirmEditEvent"
  />

  <!-- Delete Event Confirmation Modal -->
  <MatchDeleteEventModal
    v-model:open="showDeleteEventModal"
    :loading="loadingEvents"
    @confirm="confirmDeleteEvent"
  />

  <!-- Remove Penalties Confirmation Modal -->
  <MatchRemovePenaltiesModal
    v-model:open="showRemovePenaltiesModal"
    :loading="updatingMatch"
    @confirm="removePenalties"
  />

  <!-- Walkover Modal -->
  <MatchWalkoverModal
    v-model:open="showWalkoverModal"
    v-model:score="walkoverScore"
    :fixture="selectedFixture"
    :loading="updatingMatch"
    @confirm="setWalkover"
  />

  <!-- Swap Teams Confirmation Modal -->
  <MatchSwapTeamsModal
    v-model:open="showSwapConfirmModal"
    :loading="swappingTeams"
    @confirm="confirmSwapTeams"
  />

  <!-- Generic Confirmation Modal -->
  <MatchConfirmModal
    v-model:open="showConfirmModal"
    :title="confirmModalTitle"
    :message="confirmModalMessage"
    :confirm-label="confirmModalConfirmLabel"
    :confirm-color="confirmModalConfirmColor"
    :loading="updatingMatch"
    @confirm="handleConfirmModal"
  />
</template>

