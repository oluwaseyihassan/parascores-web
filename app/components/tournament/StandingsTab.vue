<script setup lang="ts">
import { TournamentType } from "~/types";

const route = useRoute();
const tournamentStore = useTournamentStore();
const standingStore = useStandingStore();
const { currentTournament: tournament } = storeToRefs(tournamentStore);
const { standings, loading: standingsLoading } = storeToRefs(standingStore);

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

// Export current standings as CSV (client-side)
const exportStandingsCsv = () => {
  if (!standings.value.length) return;
  const header = ["Pos", "Team", "P", "W", "D", "L", "GF", "GA", "GD", "Pts"];
  const rows = [...standings.value]
    .sort((a, b) => (a.position ?? 999) - (b.position ?? 999) || b.points - a.points)
    .map((s, i) => [
      s.position ?? i + 1,
      s.participant?.customName || s.participant?.customShortName || "Team",
      s.played,
      s.wins,
      s.draws,
      s.losses,
      s.goalsFor,
      s.goalsAgainst,
      s.goalDiff,
      s.points,
    ]);
  const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = (tournament.value?.customName || "tournament") + "-standings.csv";
  a.click();
  URL.revokeObjectURL(url);
  useToast().add({ title: "Standings exported", color: "success" });
};
</script>

<template>
  <UCard
    v-if="showStandings"
    :loading="standingsLoading"
    class="mt-4"
  >
    <template #header>
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-chart-bar" class="w-5 h-5 text-emerald-500" />
          <span class="text-sm font-bold">League table</span>
        </div>
        <div class="flex items-center gap-2">
          <UButton size="xs" variant="outline" color="neutral" icon="i-heroicons-arrow-down-tray" label="Export CSV" @click="exportStandingsCsv" />
          <UButton size="xs" variant="outline" color="neutral" icon="i-heroicons-photo" label="Graphic" :to="`/tournaments/${tournament.id}/graphics`" />
          <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-arrow-path" :loading="standingsLoading" title="Recalculate" @click="standingStore.fetchStandings(tournamentId)" />
        </div>
      </div>
    </template>

    <!-- Group Stage (Multiple Tables) -->
    <div
      v-if="
        (tournament.type === TournamentType.GROUP ||
          tournament.type === TournamentType.HYBRID ||
          tournament.type === TournamentType.LEAGUE) &&
        Object.keys(standingStore.getStandingsByGroup).length > 0
      "
      class="space-y-6"
    >
      <div
        v-for="(
          groupStandings, groupName
        ) in standingStore.getStandingsByGroup"
        :key="groupName"
      >
        <h4
          v-if="groupName !== 'default'"
          class="text-sm font-medium text-gray-500 mb-3 px-1"
        >
          {{ groupName }}
        </h4>
        <StandingTable
          :standings="groupStandings"
          :loading="standingsLoading"
        />
      </div>
    </div>

    <!-- Single Table (League/Round Robin) -->
    <StandingTable
      v-else
      :standings="standings"
      :loading="standingsLoading"
    />
  </UCard>
</template>
