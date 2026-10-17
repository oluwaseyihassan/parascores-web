<script setup lang="ts">
import { TournamentType } from "~/types";
import type { Fixture } from "~/types";

defineProps<{
  updatingMatch: boolean;
}>();

const emit = defineEmits<{
  start: [fixture: Fixture];
  control: [fixture: Fixture];
  "go-to-tab": [slot: string];
  "open-knockout-wizard": [];
}>();

const tournamentStore = useTournamentStore();
const participantStore = useParticipantStore();
const fixtureStore = useFixtureStore();
const { currentTournament: tournament } = storeToRefs(tournamentStore);
const { participants } = storeToRefs(participantStore);
const { fixtures, knockoutFixturesByRound, knockoutRounds } =
  storeToRefs(fixtureStore);

const showPlayoffDraw = ref(false);

const { handleClearKnockoutFixtures } = useFixtureMaintenance();
</script>

<template>
  <!-- Knockout Tab (redesign) -->
  <div class="mt-4">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-trophy" class="w-5 h-5 text-amber-500" />
            <span class="text-sm font-bold">Knockout bracket</span>
          </div>
          <div class="flex items-center gap-2">
            <UButton
              v-if="tournament?.hasKnockoutPlayoffs && fixtures.some((f) => f.stage === 'KNOCKOUT')"
              size="xs"
              color="primary"
              variant="soft"
              icon="i-heroicons-sparkles"
              label="Playoff Draw"
              @click="showPlayoffDraw = true"
            />
            <UButton
              v-if="!knockoutRounds.length && tournament?.type === TournamentType.KNOCKOUT"
              size="xs"
              color="primary"
              icon="i-heroicons-sparkles"
              label="Setup brackets"
              :disabled="participants.length < 2"
              @click="emit('open-knockout-wizard')"
            />
            <UButton
              size="xs"
              variant="outline"
              color="neutral"
              icon="i-heroicons-photo"
              label="Graphic"
              :to="`/tournaments/${tournament.id}/graphics`"
            />
            <UButton
              v-if="tournament?.type === TournamentType.HYBRID && fixtures.some((f) => f.stage === 'KNOCKOUT')"
              size="xs"
              variant="ghost"
              color="error"
              icon="i-heroicons-trash"
              label="Clear brackets"
              @click="handleClearKnockoutFixtures"
            />
          </div>
        </div>
      </template>

      <KnockoutBracket
        v-if="knockoutRounds.length > 0"
        :fixtures-by-round="knockoutFixturesByRound"
        :rounds="knockoutRounds"
        :get-round-display-name="fixtureStore.getKnockoutRoundDisplayName"
        :two-legs-knockout="tournament?.twoLegsKnockout"
        :third-place-match="tournament?.thirdPlaceMatch"
        :updating-match="updatingMatch"
        @start-match="(f) => emit('start', f)"
        @control-match="(f) => emit('control', f)"
        @open-playoff-draw="showPlayoffDraw = true"
      />

      <TournamentPlayoffDrawWizard
        v-if="tournament"
        v-model:open="showPlayoffDraw"
        :tournament="tournament"
        :participants="participants"
        @saved="fixtureStore.fetchFixtures(tournament.id)"
      />
      <div v-else class="py-12 text-center">
        <UIcon name="i-heroicons-trophy" class="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
        <p class="text-sm font-semibold text-gray-900 dark:text-white">No bracket yet</p>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">
          {{ tournament?.type === TournamentType.HYBRID ? (tournament?.unifiedStandings ? "The bracket appears after league phase advancement." : "The bracket appears after group stage advancement.") : "Set up the knockout stage to see the bracket here." }}
        </p>
        <UButton
          v-if="tournament?.type === TournamentType.KNOCKOUT"
          size="sm"
          color="primary"
          icon="i-heroicons-sparkles"
          label="Setup brackets"
          :disabled="participants.length < 2"
          @click="emit('open-knockout-wizard')"
        />
        <UButton
          v-else
          size="sm"
          color="primary"
          variant="soft"
          :label="tournament?.unifiedStandings ? 'Go to Pots' : 'Go to Groups'"
          @click="emit('go-to-tab', 'groups')"
        />
      </div>
    </UCard>
  </div>
</template>
