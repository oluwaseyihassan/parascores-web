import { TournamentType } from "~/types";
import type { Fixture } from "~/types";
import { ModalDialogsKey } from "~/composables/useModalDialogs";

/**
 * Destructive fixture maintenance actions (clear all, clear knockout,
 * delete single fixture) shared between the fixtures and knockout tabs
 * of the tournament dashboard. Requires the page to provide ModalDialogsKey.
 */
export function useFixtureMaintenance() {
  const route = useRoute();
  const tournamentStore = useTournamentStore();
  const fixtureStore = useFixtureStore();
  const standingStore = useStandingStore();
  const { currentTournament: tournament } = storeToRefs(tournamentStore);
  const { handleError } = useErrors();
  const { openConfirmModal } = inject(ModalDialogsKey)!;

  const tournamentId = computed(() => route.params.id as string);

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

  const handleClearFixtures = () => {
    openConfirmModal({
      title: "Clear All Fixtures",
      description:
        "Are you sure you want to delete all fixtures and standings for this tournament? This action cannot be undone.",
      confirmLabel: "Clear All",
      color: "error",
      onConfirm: async () => {
        try {
          await fixtureStore.deleteAllFixtures(
            tournament.value?.id || tournamentId.value,
          );
          // Refresh standings as they are cleared on backend
          await standingStore.fetchStandings(
            tournament.value?.id || tournamentId.value,
          );
          useToast().add({
            title: "Fixtures cleared successfully",
            color: "success",
          });
        } catch (err: any) {
          handleError(err, { title: "Failed to clear fixtures" });
        }
      },
    });
  };

  const handleClearKnockoutFixtures = () => {
    openConfirmModal({
      title: "Clear Knockout Brackets",
      description:
        "Are you sure you want to delete all knockout fixtures? Group stage fixtures and standings will be preserved.",
      confirmLabel: "Clear Knockout",
      color: "error",
      onConfirm: async () => {
        try {
          await fixtureStore.deleteAllFixtures(
            tournament.value?.id || tournamentId.value,
            "KNOCKOUT",
          );
          useToast().add({
            title: "Knockout fixtures cleared",
            color: "success",
          });
        } catch (err: any) {
          handleError(err, { title: "Failed to clear knockout fixtures" });
        }
      },
    });
  };

  const handleDeleteFixture = (fixture: Fixture) => {
    openConfirmModal({
      title: "Delete Fixture",
      description: `Are you sure you want to delete the match between ${fixture.homeTeam?.customName || "TBD"} and ${fixture.awayTeam?.customName || "TBD"}?`,
      confirmLabel: "Delete Fixture",
      color: "error",
      onConfirm: async () => {
        try {
          await fixtureStore.deleteFixture(fixture.id);
          useToast().add({
            title: "Fixture deleted successfully",
            color: "success",
          });
          // Refresh standings to reflect the change
          if (showStandings.value) {
            await standingStore.fetchStandings(tournamentId.value);
          }
        } catch (err: any) {
          handleError(err, { title: "Failed to delete fixture" });
        }
      },
    });
  };

  return {
    showStandings,
    handleClearFixtures,
    handleClearKnockoutFixtures,
    handleDeleteFixture,
  };
}
