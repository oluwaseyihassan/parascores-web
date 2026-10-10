import type { InjectionKey, Ref } from "vue";
import { FixtureStage, MatchEventType } from "~/types";
import type { Fixture, Player } from "~/types";
import type { MatchEventsApi } from "~/composables/match/useMatchEvents";

export function usePenalties(options: {
  fixture: Ref<Fixture | null>;
  updatingMatch: Ref<boolean>;
  homePlayers: Ref<Player[]>;
  awayPlayers: Ref<Player[]>;
  eventsApi: MatchEventsApi;
  isScoreTiedOrAggregateTied: () => boolean;
  isIndividual: () => boolean;
  onFixtureUpdated: (fixture: Fixture) => void;
}) {
  const {
    fixture,
    updatingMatch,
    homePlayers,
    awayPlayers,
    eventsApi,
    isScoreTiedOrAggregateTied,
    isIndividual,
    onFixtureUpdated,
  } = options;

  const fixtureStore = useFixtureStore();
  const { handleError } = useErrors();

  const showPenaltyOverride = ref(false);
  const homePenaltyPlayerId = ref<string | undefined>(undefined);
  const awayPenaltyPlayerId = ref<string | undefined>(undefined);
  const showRemovePenaltiesModal = ref(false);

  // Check if the fixture already has penalty scores
  const hasPenalties = computed(() => {
    if (!fixture.value) return false;
    return (
      fixture.value.homePenaltyScore != null ||
      fixture.value.awayPenaltyScore != null
    );
  });

  // Warning: completed knockout match with tied aggregate and no decisive penalties
  const needsPenaltyWarning = computed(() => {
    if (!fixture.value) return false;
    if (fixture.value.status !== "COMPLETED") return false;
    // Only show for knockout stage matches — draws are valid in group stage
    if (fixture.value.stage !== FixtureStage.KNOCKOUT) return false;
    if (!isScoreTiedOrAggregateTied()) return false;

    // Check if penalties resolve the tie
    const homePen = fixture.value.homePenaltyScore ?? 0;
    const awayPen = fixture.value.awayPenaltyScore ?? 0;
    return homePen === awayPen; // Equal penalties (including 0-0) means no winner
  });

  const homePenaltyPlayerOptions = computed(() => {
    return homePlayers.value.map((p) => ({
      label: `${p.number ? `#${p.number} ` : ""}${p.name}`,
      value: p.id,
    }));
  });

  const awayPenaltyPlayerOptions = computed(() => {
    return awayPlayers.value.map((p) => ({
      label: `${p.number ? `#${p.number} ` : ""}${p.name}`,
      value: p.id,
    }));
  });

  const recordPenaltyShot = async (
    team: "home" | "away",
    outcome: "scored" | "missed" | "saved",
    playerId?: string | null,
  ) => {
    if (!fixture.value) return;

    const participantId =
      team === "home" ? fixture.value.homeTeamId : fixture.value.awayTeamId;
    if (!participantId) return;

    const individual = isIndividual();
    const eventType =
      outcome === "scored"
        ? MatchEventType.PENALTY
        : outcome === "missed"
          ? MatchEventType.MISSED_PENALTY
          : MatchEventType.PENALTY_SAVE;

    const currentHomePen = fixture.value.homePenaltyScore ?? 0;
    const currentAwayPen = fixture.value.awayPenaltyScore ?? 0;
    const newHomePen =
      team === "home" && outcome === "scored"
        ? currentHomePen + 1
        : currentHomePen;
    const newAwayPen =
      team === "away" && outcome === "scored"
        ? currentAwayPen + 1
        : currentAwayPen;

    updatingMatch.value = true;
    try {
      await fixtureStore.updateFixture(fixture.value.id, {
        homePenaltyScore: newHomePen,
        awayPenaltyScore: newAwayPen,
      });

      if (!individual) {
        const shootoutOrder = eventsApi.penaltyShootoutEvents.value.length + 1;
        await fixtureStore.createMatchEvent({
          fixtureId: fixture.value.id,
          participantId: participantId,
          playerId: playerId || null,
          type: eventType,
          half: eventsApi.getMatchHalf(120, { isPenaltyShootout: true }),
          minute: 120 + shootoutOrder,
          description: `Penalty shootout ${shootoutOrder}`,
          metadata: { isPenaltyShootout: true, shootoutOrder },
        });
      }

      fixture.value.homePenaltyScore = newHomePen;
      fixture.value.awayPenaltyScore = newAwayPen;

      onFixtureUpdated(fixture.value);

      if (!individual) {
        await eventsApi.refreshMatchEvents();
      }

      useToast().add({
        title:
          outcome === "scored"
            ? "Penalty Scored"
            : outcome === "missed"
              ? "Penalty Missed"
              : "Penalty Saved",
        description: `${team === "home" ? "Home" : "Away"} penalty recorded.`,
        icon: "i-heroicons-bolt",
        color: outcome === "scored" ? "success" : "warning",
      });
    } catch (error: any) {
      fixture.value.homePenaltyScore = currentHomePen;
      fixture.value.awayPenaltyScore = currentAwayPen;
      handleError(error, { title: "Failed to record penalty" });
    } finally {
      updatingMatch.value = false;
    }
  };

  const openRemovePenaltiesModal = () => {
    showRemovePenaltiesModal.value = true;
  };

  const removePenalties = async () => {
    if (!fixture.value) return;

    updatingMatch.value = true;
    try {
      const shootoutEvents = eventsApi.penaltyShootoutEvents.value;

      await Promise.all(
        shootoutEvents.map((event) => fixtureStore.deleteMatchEvent(event.id)),
      );

      await fixtureStore.updateFixture(fixture.value.id, {
        homePenaltyScore: null,
        awayPenaltyScore: null,
      });

      fixture.value.homePenaltyScore = null;
      fixture.value.awayPenaltyScore = null;
      showPenaltyOverride.value = false;
      showRemovePenaltiesModal.value = false;

      await eventsApi.refreshMatchEvents();
      onFixtureUpdated(fixture.value);

      useToast().add({
        title: "Penalties Removed",
        description: "Penalty shootout scores have been cleared.",
        icon: "i-heroicons-trash",
        color: "success",
      });
    } catch (error: any) {
      handleError(error, { title: "Failed to remove penalties" });
    } finally {
      updatingMatch.value = false;
    }
  };

  return {
    showPenaltyOverride,
    homePenaltyPlayerId,
    awayPenaltyPlayerId,
    showRemovePenaltiesModal,
    hasPenalties,
    needsPenaltyWarning,
    homePenaltyPlayerOptions,
    awayPenaltyPlayerOptions,
    recordPenaltyShot,
    openRemovePenaltiesModal,
    removePenalties,
  };
}

export type PenaltiesApi = ReturnType<typeof usePenalties>;

export const PenaltiesKey: InjectionKey<PenaltiesApi> =
  Symbol("match-penalties");
