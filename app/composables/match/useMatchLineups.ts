import type { InjectionKey, Ref } from "vue";
import type { Fixture, Player } from "~/types";

export function useMatchLineups(options: {
  fixture: Ref<Fixture | null>;
  homePlayers: Ref<Player[]>;
  awayPlayers: Ref<Player[]>;
  onFixtureUpdated: (fixture: Fixture) => void;
}) {
  const { fixture, homePlayers, awayPlayers, onFixtureUpdated } = options;

  const fixtureStore = useFixtureStore();
  const { handleError } = useErrors();

  const selectedLineupIds = ref<string[]>([]);
  const savingLineups = ref(false);
  const selectedManOfTheMatchPlayerId = ref<string | null>(null);
  const savingMotm = ref(false);
  const homeFormation = ref<string>("");
  const awayFormation = ref<string>("");
  const lineupViewMode = ref<"list" | "pitch">("pitch");
  const changedPositions = ref<Record<string, string>>({});
  const lineupPositions = ref<Record<string, string>>({});
  const activeLineupTeam = ref<"home" | "away">("home");

  const formationPresets = [
    { label: "Select formation...", value: "" },
    { label: "4-4-2", value: "4-4-2" },
    { label: "4-3-3", value: "4-3-3" },
    { label: "4-2-3-1", value: "4-2-3-1" },
    { label: "3-5-2", value: "3-5-2" },
    { label: "3-4-3", value: "3-4-3" },
    { label: "5-3-2", value: "5-3-2" },
    { label: "5-4-1", value: "5-4-1" },
    { label: "4-1-4-1", value: "4-1-4-1" },
    { label: "4-5-1", value: "4-5-1" },
  ];

  const motmPlayerOptions = computed(() => {
    const homeTeamName =
      fixture.value?.homeTeam?.customShortName ||
      fixture.value?.homeTeam?.customName ||
      "Home";
    const awayTeamName =
      fixture.value?.awayTeam?.customShortName ||
      fixture.value?.awayTeam?.customName ||
      "Away";
    const home = homePlayers.value.map((p) => ({
      label: `${homeTeamName}: ${p.number ? "#" + p.number + " " : ""}${p.name}`,
      value: p.id,
    }));
    const away = awayPlayers.value.map((p) => ({
      label: `${awayTeamName}: ${p.number ? "#" + p.number + " " : ""}${p.name}`,
      value: p.id,
    }));
    return [...home, ...away];
  });

  const motmDisplayName = computed(() => {
    const playerId =
      selectedManOfTheMatchPlayerId.value ||
      fixture.value?.manOfTheMatchPlayerId;
    if (!playerId) return null;
    const player = [...homePlayers.value, ...awayPlayers.value].find(
      (p) => p.id === playerId,
    );
    return player || fixture.value?.manOfTheMatchPlayer || null;
  });

  const selectedMotmModel = computed({
    get: () => selectedManOfTheMatchPlayerId.value || undefined,
    set: (val) => (selectedManOfTheMatchPlayerId.value = val || null),
  });

  const togglePlayerLineup = (playerId: string, isChecked: boolean) => {
    if (isChecked) {
      if (!selectedLineupIds.value.includes(playerId)) {
        selectedLineupIds.value.push(playerId);
      }
    } else {
      selectedLineupIds.value = selectedLineupIds.value.filter(
        (id) => id !== playerId,
      );
    }
  };

  const selectAllRoster = (team: "home" | "away") => {
    const players = team === "home" ? homePlayers.value : awayPlayers.value;
    const ids = players.map((p) => p.id);
    selectedLineupIds.value = [...new Set([...selectedLineupIds.value, ...ids])];
  };

  const clearRosterLineup = (team: "home" | "away") => {
    const players = team === "home" ? homePlayers.value : awayPlayers.value;
    const idsToRemove = new Set(players.map((p) => p.id));
    selectedLineupIds.value = selectedLineupIds.value.filter(
      (id) => !idsToRemove.has(id),
    );
  };

  const handlePlayerPositionUpdate = (
    team: "home" | "away",
    playerId: string,
    newPosition: string,
  ) => {
    lineupPositions.value[playerId] = newPosition;
  };

  const saveLineups = async () => {
    if (!fixture.value) return;
    savingLineups.value = true;
    try {
      // Clean up lineupPositions for players no longer in selectedLineupIds
      const cleanedPositions = { ...lineupPositions.value };
      for (const playerId of Object.keys(cleanedPositions)) {
        if (!selectedLineupIds.value.includes(playerId)) {
          delete cleanedPositions[playerId];
        }
      }

      const res = await fixtureStore.updateFixture(fixture.value.id, {
        lineupPlayerIds: selectedLineupIds.value,
        homeFormation: homeFormation.value || null,
        awayFormation: awayFormation.value || null,
        lineupPositions: cleanedPositions,
      });

      if (res.data) {
        fixture.value = {
          ...fixture.value,
          lineupPlayers: res.data.lineupPlayers || [],
          homeFormation: res.data.homeFormation,
          awayFormation: res.data.awayFormation,
          lineupPositions: res.data.lineupPositions || {},
        };
        lineupPositions.value =
          (res.data.lineupPositions as Record<string, string>) || {};
        onFixtureUpdated(fixture.value);

        useToast().add({
          title: "Lineups Saved",
          description:
            "Match lineups and positions have been successfully updated.",
          icon: "i-heroicons-check-circle",
          color: "success",
        });
      }
    } catch (error: any) {
      handleError(error, { title: "Failed to save lineups" });
    } finally {
      savingLineups.value = false;
    }
  };

  const saveManOfTheMatch = async () => {
    if (!fixture.value) return;

    savingMotm.value = true;
    try {
      await fixtureStore.updateFixture(fixture.value.id, {
        manOfTheMatchPlayerId: selectedManOfTheMatchPlayerId.value,
      });

      fixture.value.manOfTheMatchPlayerId = selectedManOfTheMatchPlayerId.value;
      const selectedPlayer = [...homePlayers.value, ...awayPlayers.value].find(
        (p) => p.id === selectedManOfTheMatchPlayerId.value,
      );
      fixture.value.manOfTheMatchPlayer = selectedPlayer || null;

      onFixtureUpdated(fixture.value);

      useToast().add({
        title: "Man of the Match Saved",
        description: selectedPlayer
          ? `${selectedPlayer.name} is the Man of the Match.`
          : "Man of the Match selection saved.",
        color: "success",
      });
    } catch (error: any) {
      handleError(error, { title: "Failed to save Man of the Match" });
    } finally {
      savingMotm.value = false;
    }
  };

  const clearManOfTheMatch = async () => {
    if (!fixture.value) return;

    savingMotm.value = true;
    try {
      await fixtureStore.updateFixture(fixture.value.id, {
        manOfTheMatchPlayerId: null,
      });

      selectedManOfTheMatchPlayerId.value = null;
      fixture.value.manOfTheMatchPlayerId = null;
      fixture.value.manOfTheMatchPlayer = null;

      onFixtureUpdated(fixture.value);

      useToast().add({
        title: "Man of the Match Cleared",
        description: "The Man of the Match selection has been removed.",
        color: "neutral",
      });
    } catch (error: any) {
      handleError(error, { title: "Failed to clear Man of the Match" });
    } finally {
      savingMotm.value = false;
    }
  };

  const swapFormations = () => {
    const tempForm = homeFormation.value;
    homeFormation.value = awayFormation.value;
    awayFormation.value = tempForm;
  };

  const syncFromFixture = (source: Fixture | null) => {
    selectedLineupIds.value =
      source?.lineupPlayers?.map((p: any) => p.id) || [];
    homeFormation.value = source?.homeFormation || "";
    awayFormation.value = source?.awayFormation || "";
    changedPositions.value = {};
    lineupPositions.value =
      (source?.lineupPositions as Record<string, string>) || {};
    lineupViewMode.value =
      source?.homeFormation || source?.awayFormation ? "pitch" : "list";
    activeLineupTeam.value = "home";
    selectedManOfTheMatchPlayerId.value = source?.manOfTheMatchPlayerId || null;
  };

  const applyDetailedFixture = (source: any) => {
    selectedLineupIds.value =
      source?.lineupPlayers?.map((p: any) => p.id) || [];
    homeFormation.value = source?.homeFormation || "";
    awayFormation.value = source?.awayFormation || "";
    selectedManOfTheMatchPlayerId.value = source?.manOfTheMatchPlayerId || null;
  };

  const resetLineups = () => {
    selectedLineupIds.value = [];
    homeFormation.value = "";
    awayFormation.value = "";
    changedPositions.value = {};
    activeLineupTeam.value = "home";
    selectedManOfTheMatchPlayerId.value = null;
  };

  return {
    selectedLineupIds,
    savingLineups,
    selectedManOfTheMatchPlayerId,
    savingMotm,
    homeFormation,
    awayFormation,
    lineupViewMode,
    changedPositions,
    lineupPositions,
    activeLineupTeam,
    formationPresets,
    motmPlayerOptions,
    motmDisplayName,
    selectedMotmModel,
    togglePlayerLineup,
    selectAllRoster,
    clearRosterLineup,
    handlePlayerPositionUpdate,
    saveLineups,
    saveManOfTheMatch,
    clearManOfTheMatch,
    swapFormations,
    syncFromFixture,
    applyDetailedFixture,
    resetLineups,
  };
}

export type MatchLineupsApi = ReturnType<typeof useMatchLineups>;

export const MatchLineupsKey: InjectionKey<MatchLineupsApi> =
  Symbol("match-lineups");
