<script setup lang="ts">
import {
  TournamentType,
  FixtureStatus,
  FixtureStage,
  LivestreamPlatform,
} from "~/types";
import {
  LIVESTREAM_PLATFORMS,
  detectLivestreamPlatform,
  getLivestreamPlatformInfo,
} from "~/utils/livestream";

const open = defineModel<boolean>("open", { default: false });

const route = useRoute();
const tournamentStore = useTournamentStore();
const participantStore = useParticipantStore();
const fixtureStore = useFixtureStore();
const venueStore = useVenueStore();
const groupStore = useGroupStore();
const { currentTournament: tournament } = storeToRefs(tournamentStore);
const { participants } = storeToRefs(participantStore);
const { fixtures } = storeToRefs(fixtureStore);
const { venues } = storeToRefs(venueStore);
const { handleError } = useErrors();

const tournamentId = computed(() => route.params.id as string);

// Format date for display
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// Manual Fixture Creation
const addingFixture = ref(false);
const addFixtureKeepOpen = ref(false);
const addFixtureState = reactive({
  homeTeamId: "" as string,
  awayTeamId: "" as string,
  round: 1,
  roundName: "" as string,
  startTime: "" as string,
  venue: "" as string,
  groupId: "" as string,
  stage: undefined as FixtureStage | undefined,
  matchDuration: 90,
  livestreamUrl: "" as string,
  livestreamPlatform: undefined as LivestreamPlatform | undefined,
});

const openAddFixtureModal = (round?: number, roundName?: string) => {
  addFixtureState.homeTeamId = "";
  addFixtureState.awayTeamId = "";

  if (round !== undefined) {
    addFixtureState.round = round;
    addFixtureState.roundName = roundName || "";
  } else {
    // Default round to the next available
    const maxRound =
      fixtures.value.length > 0
        ? Math.max(...fixtures.value.map((f) => f.round))
        : 0;
    addFixtureState.round = maxRound + 1;
    addFixtureState.roundName = "";
  }

  addFixtureState.startTime = "";
  addFixtureState.venue = "";
  addFixtureState.groupId = groupStore.groups[0]?.id || "";
  addFixtureState.matchDuration = 90;
  addFixtureState.livestreamUrl = "";
  addFixtureState.livestreamPlatform = undefined;

  // Set default stage based on tournament type and round name
  const name = (addFixtureState.roundName || "").toLowerCase();
  if (name.includes("matchday")) {
    addFixtureState.stage = FixtureStage.GROUP_STAGE;
  } else if (
    name.includes("final") ||
    name.includes("semi") ||
    name.includes("quarter") ||
    name.includes("round of") ||
    name.includes("third place")
  ) {
    addFixtureState.stage = FixtureStage.KNOCKOUT;
  } else {
    if (tournament.value?.type === TournamentType.KNOCKOUT) {
      addFixtureState.stage = FixtureStage.KNOCKOUT;
    } else if (
      tournament.value?.type === TournamentType.HYBRID ||
      tournament.value?.type === TournamentType.GROUP
    ) {
      addFixtureState.stage = FixtureStage.GROUP_STAGE;
    } else {
      addFixtureState.stage = undefined;
    }
  }

  addFixtureKeepOpen.value = false;
  open.value = true;
};

defineExpose({ openModal: openAddFixtureModal });

const participantOptionsAll = computed(() => {
  return participants.value.map((p) => ({
    label:
      p.customShortName ||
      p.customName ||
      p.user?.name ||
      p.team?.name ||
      "Unnamed",
    value: p.id,
    groupId: p.groupId,
    avatar: p.logoUrl ? { src: p.logoUrl } : undefined,
  }));
});

const availableParticipantsForRound = computed(() => {
  const currentRound = addFixtureState.round;
  const stage = addFixtureState.stage;

  const teamsInRound = new Set();
  fixtures.value.forEach((f) => {
    // Normalizing null and undefined for stage
    const fStage = f.stage || undefined;
    const currentStage = stage || undefined;

    if (f.round === currentRound && fStage === currentStage) {
      if (f.homeTeamId) teamsInRound.add(f.homeTeamId);
      if (f.awayTeamId) teamsInRound.add(f.awayTeamId);
    }
  });

  return participantOptionsAll.value.filter((p) => !teamsInRound.has(p.value));
});

const homeParticipantOptions = computed(() => {
  let items = availableParticipantsForRound.value;
  if (addFixtureState.groupId) {
    items = items.filter((p) => p.groupId === addFixtureState.groupId);
  }
  return items.filter((p) => p.value !== addFixtureState.awayTeamId);
});

const awayParticipantOptions = computed(() => {
  let items = availableParticipantsForRound.value;
  if (addFixtureState.groupId) {
    items = items.filter((p) => p.groupId === addFixtureState.groupId);
  }
  return items.filter((p) => p.value !== addFixtureState.homeTeamId);
});

const roundNameOptions = computed(() => {
  const type = tournament.value?.type;
  const totalTeamCount = participants.value.length;
  const options: { label: string; value: string; round: number }[] = [];

  // Calculate the relevant team count for group stage rounds
  let groupStageTeamCount = totalTeamCount;
  if (
    type === TournamentType.GROUP ||
    type === TournamentType.HYBRID ||
    type === TournamentType.LEAGUE
  ) {
    if (addFixtureState.groupId) {
      // Use the size of the specific selected group
      groupStageTeamCount = participants.value.filter(
        (p) => p.groupId === addFixtureState.groupId,
      ).length;
    } else {
      // Use the size of the largest group as a default
      const groupCounts = new Map<string, number>();
      participants.value.forEach((p) => {
        if (p.groupId) {
          groupCounts.set(p.groupId, (groupCounts.get(p.groupId) || 0) + 1);
        }
      });
      if (groupCounts.size > 0) {
        groupStageTeamCount = Math.max(...groupCounts.values());
      }
    }
  }

  if (
    type === TournamentType.ROUND_ROBIN ||
    type === TournamentType.GROUP ||
    type === TournamentType.HYBRID ||
    type === TournamentType.LEAGUE
  ) {
    // Generate matchday names
    const oneWayRoundCount =
      groupStageTeamCount % 2 === 0
        ? groupStageTeamCount - 1
        : groupStageTeamCount;
    const roundCount = tournament.value?.doubleRoundRobin
      ? 2 * oneWayRoundCount
      : oneWayRoundCount;
    for (let i = 1; i <= roundCount; i++) {
      const name = `Matchday ${i}`;
      options.push({ label: name, value: name, round: i });
    }
  }

  if (type === TournamentType.KNOCKOUT || type === TournamentType.HYBRID) {
    // Generate knockout round names
    const totalRounds = Math.ceil(Math.log2(totalTeamCount));
    const bracketSize = Math.pow(2, totalRounds);
    const gpOneWayRoundCount =
      groupStageTeamCount % 2 === 0
        ? groupStageTeamCount - 1
        : groupStageTeamCount;
    const baseRoundOffset =
      type === TournamentType.HYBRID
        ? tournament.value?.doubleRoundRobin
          ? 2 * gpOneWayRoundCount
          : gpOneWayRoundCount
        : 0;

    let previousRoundCompleted = true;
    for (let i = 1; i <= totalRounds; i++) {
      const roundsFromFinal = totalRounds - i;
      let name: string;
      switch (roundsFromFinal) {
        case 0:
          name = "Final";
          break;
        case 1:
          name = "Semi Final";
          break;
        case 2:
          name = "Quarter Final";
          break;
        default:
          const teamsInRound = bracketSize / Math.pow(2, i - 1);
          name = `Round of ${teamsInRound}`;
      }

      const roundNum = baseRoundOffset + i;
      const isFinal = roundsFromFinal === 0;

      // Only allow manual entry if it's the first knockout round OR the previous round is fully completed
      if (i === 1 || previousRoundCompleted) {
        if (tournament.value?.twoLegsKnockout && !isFinal) {
          options.push({
            label: `${name} - Leg 1`,
            value: `${name} - Leg 1`,
            round: roundNum,
          });
          options.push({
            label: `${name} - Leg 2`,
            value: `${name} - Leg 2`,
            round: roundNum,
          });
        } else {
          options.push({ label: name, value: name, round: roundNum });
        }
      }

      // Check completion status for the next iteration
      const roundFixtures = fixtures.value.filter(
        (f) => f.round === roundNum && f.stage === FixtureStage.KNOCKOUT,
      );
      if (
        roundFixtures.length === 0 ||
        roundFixtures.some((f) => f.status !== FixtureStatus.COMPLETED)
      ) {
        previousRoundCompleted = false;
      }
    }

    if (tournament.value?.thirdPlaceMatch) {
      const semiFinalRoundNum = baseRoundOffset + totalRounds - 1;
      const semiFinalFixtures = fixtures.value.filter(
        (f) =>
          f.round === semiFinalRoundNum && f.stage === FixtureStage.KNOCKOUT,
      );
      const sfCompleted =
        semiFinalFixtures.length > 0 &&
        semiFinalFixtures.every((f) => f.status === FixtureStatus.COMPLETED);

      if (sfCompleted) {
        options.push({
          label: "Third Place Match",
          value: "Third Place Match",
          round: baseRoundOffset + totalRounds + 1,
        });
      }
    }
  }

  // Fallback if no options were generated
  if (options.length === 0) {
    for (let i = 1; i <= 10; i++) {
      options.push({
        label: `Matchday ${i}`,
        value: `Matchday ${i}`,
        round: i,
      });
    }
  }

  return options;
});

// Watch roundName to auto-set round number and stage
watch(
  () => addFixtureState.roundName,
  (val) => {
    if (!val) return;

    const option = roundNameOptions.value.find((o) => o.value === val);
    if (option) {
      addFixtureState.round = option.round;
    }

    // Auto-set stage based on round name
    const name = val.toLowerCase();
    if (name.includes("matchday")) {
      addFixtureState.stage = FixtureStage.GROUP_STAGE;
    } else if (
      name.includes("final") ||
      name.includes("semi") ||
      name.includes("quarter") ||
      name.includes("round of") ||
      name.includes("third place")
    ) {
      addFixtureState.stage = FixtureStage.KNOCKOUT;
    }
  },
);

// Auto-resolve group and stage
watch(
  () => addFixtureState.homeTeamId,
  (val) => {
    if (val && !addFixtureState.groupId) {
      const p = participants.value.find((p) => p.id === val);
      if (p?.groupId) {
        addFixtureState.groupId = p.groupId;
      }
    }
  },
);

watch(
  () => addFixtureState.awayTeamId,
  (val) => {
    if (val && !addFixtureState.groupId) {
      const p = participants.value.find((p) => p.id === val);
      if (p?.groupId) {
        addFixtureState.groupId = p.groupId;
      }
    }
  },
);

watch(
  () => addFixtureState.groupId,
  (val) => {
    if (
      val &&
      (addFixtureState.stage === undefined || addFixtureState.stage === null)
    ) {
      addFixtureState.stage = FixtureStage.GROUP_STAGE;
    }
  },
);

// Clear selected teams if they are already scheduled in the newly selected round/stage
watch([() => addFixtureState.round, () => addFixtureState.stage], () => {
  const teamsInRound = new Set();
  fixtures.value.forEach((f) => {
    // Normalizing null and undefined for stage
    const fStage = f.stage || undefined;
    const currentStage = addFixtureState.stage || undefined;

    if (f.round === addFixtureState.round && fStage === currentStage) {
      if (f.homeTeamId) teamsInRound.add(f.homeTeamId);
      if (f.awayTeamId) teamsInRound.add(f.awayTeamId);
    }
  });

  if (
    addFixtureState.homeTeamId &&
    teamsInRound.has(addFixtureState.homeTeamId)
  ) {
    addFixtureState.homeTeamId = "";
  }
  if (
    addFixtureState.awayTeamId &&
    teamsInRound.has(addFixtureState.awayTeamId)
  ) {
    addFixtureState.awayTeamId = "";
  }
});

const groupOptions = computed(() => {
  return groupStore.groups.map((g) => ({ label: g.name, value: g.id }));
});

const fixtureStageOptions = [
  { label: "Group Stage", value: FixtureStage.GROUP_STAGE },
  { label: "Knockout", value: FixtureStage.KNOCKOUT },
];

const venueOptions = computed(() => {
  return venues.value.map((v) => ({ label: v.name, value: v.name }));
});

const livestreamPlatformOptions = computed(() => {
  return LIVESTREAM_PLATFORMS.map((p) => ({
    label: p.label,
    value: p.value,
    icon: p.icon,
  }));
});

const selectedLivestreamPlatformInfo = computed(() => {
  return getLivestreamPlatformInfo(addFixtureState.livestreamPlatform);
});

watch(
  () => addFixtureState.livestreamUrl,
  (url) => {
    if (!url) return;
    const detected = detectLivestreamPlatform(url);
    if (detected && !addFixtureState.livestreamPlatform) {
      addFixtureState.livestreamPlatform = detected;
    }
  },
);

const handleAddFixture = async () => {
  if (!addFixtureState.homeTeamId || !addFixtureState.awayTeamId) {
    useToast().add({
      title: "Please select both Home and Away teams",
      color: "error",
    });
    return;
  }
  if (addFixtureState.homeTeamId === addFixtureState.awayTeamId) {
    useToast().add({
      title: "Home and Away teams must be different",
      color: "error",
    });
    return;
  }
  if (
    addFixtureState.startTime &&
    tournament.value?.start_date &&
    tournament.value?.end_date
  ) {
    const fixtureDate = new Date(addFixtureState.startTime);
    if (!isNaN(fixtureDate.getTime())) {
      const startDate = new Date(tournament.value.start_date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(tournament.value.end_date);
      endDate.setHours(23, 59, 59, 999);
      if (fixtureDate < startDate || fixtureDate > endDate) {
        useToast().add({
          title: "Date out of range",
          description: `The fixture date must be between the tournament start date (${formatDate(tournament.value.start_date)}) and end date (${formatDate(tournament.value.end_date)}). Please adjust the tournament's start or end date to select this date.`,
          color: "error",
        });
        return;
      }
    }
  }
  addingFixture.value = true;
  try {
    await fixtureStore.createFixture({
      tournament_id: tournament.value?.id || tournamentId.value,
      homeTeamId: addFixtureState.homeTeamId,
      awayTeamId: addFixtureState.awayTeamId,
      round: addFixtureState.round,
      roundName: addFixtureState.roundName || undefined,
      startTime: addFixtureState.startTime || undefined,
      venue: addFixtureState.venue || undefined,
      groupId: addFixtureState.groupId || undefined,
      stage: addFixtureState.stage || undefined,
      matchDuration: addFixtureState.matchDuration,
      livestreamUrl: addFixtureState.livestreamUrl || undefined,
      livestreamPlatform: addFixtureState.livestreamPlatform || undefined,
    });

    // Re-fetch fixtures to get fully populated data (with team relations)
    await fixtureStore.fetchFixtures(
      tournament.value?.id || tournamentId.value,
    );

    useToast().add({ title: "Fixture created successfully", color: "success" });

    if (addFixtureKeepOpen.value) {
      // Reset for another fixture but keep round
      addFixtureState.homeTeamId = "";
      addFixtureState.awayTeamId = "";
      addFixtureState.startTime = "";
      addFixtureState.venue = "";
      addFixtureState.matchDuration = 90;
      addFixtureState.livestreamUrl = "";
      addFixtureState.livestreamPlatform = undefined;
    } else {
      open.value = false;
    }
  } catch (err: any) {
    handleError(err, { title: "Failed to create fixture" });
  } finally {
    addingFixture.value = false;
  }
};
</script>

<template>
  <!-- Add Fixture Modal -->
  <UModal v-model:open="open">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Add Fixture
            </h3>
            <UButton
              icon="i-heroicons-x-mark"
              variant="ghost"
              color="neutral"
              size="sm"
              @click="open = false"
            />
          </div>
        </template>

        <div class="space-y-4 max-h-[calc(100dvh-220px)] overflow-y-auto pr-1">
          <p class="text-sm text-gray-500">
            Manually create a fixture by selecting the home and away teams.
          </p>

          <!-- Group & Stage (for GROUP/HYBRID tournaments) -->
          <div
            v-if="
              (tournament?.type === 'GROUP' || tournament?.type === 'HYBRID') &&
              groupOptions.length
            "
            class="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <UFormField label="Group" name="groupId">
              <USelectMenu
                v-model="addFixtureState.groupId"
                :items="groupOptions"
                value-key="value"
                placeholder="Select group (optional)"
              />
            </UFormField>

            <UFormField
              v-if="
                tournament?.type === TournamentType.HYBRID ||
                tournament?.type === TournamentType.GROUP
              "
              label="Stage"
              name="stage"
            >
              <USelectMenu
                v-model="addFixtureState.stage"
                :items="fixtureStageOptions"
                value-key="value"
                disabled
                placeholder="Select stage (optional)"
              />
            </UFormField>
          </div>

          <!-- Teams -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField label="Home Team" name="homeTeamId" required>
              <USelectMenu
                v-model="addFixtureState.homeTeamId"
                :items="homeParticipantOptions"
                value-key="value"
                placeholder="Select home team"
              />
            </UFormField>

            <UFormField label="Away Team" name="awayTeamId" required>
              <USelectMenu
                v-model="addFixtureState.awayTeamId"
                :items="awayParticipantOptions"
                value-key="value"
                placeholder="Select away team"
              />
            </UFormField>
          </div>

          <!-- Round & Round Name -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField label="Round Name" name="roundName">
              <USelectMenu
                v-model="addFixtureState.roundName"
                :items="roundNameOptions"
                value-key="value"
                placeholder="Select round"
              />
            </UFormField>

            <UFormField label="Round Number" name="round">
              <UInput
                v-model.number="addFixtureState.round"
                type="number"
                :min="1"
                disabled
                placeholder="1"
              />
            </UFormField>
          </div>

          <!-- Start Time & Venue -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField label="Start Time" name="startTime">
              <UInput
                v-model="addFixtureState.startTime"
                type="datetime-local"
              />
            </UFormField>

            <UFormField label="Venue" name="venue">
              <USelectMenu
                v-model="addFixtureState.venue"
                :items="venueOptions"
                value-key="value"
                searchable
                creatable
                placeholder="Select or enter venue"
              />
            </UFormField>
          </div>

          <!-- Match Duration Slider -->
          <UFormField label="Match Duration" name="matchDuration">
            <div class="flex flex-col gap-1.5 w-full">
              <div
                class="flex justify-between items-center text-xs text-gray-500"
              >
                <span>Configure total game time (minutes)</span>
                <span class="font-bold text-gray-900 dark:text-white"
                  >{{ addFixtureState.matchDuration }} mins</span
                >
              </div>
              <input
                type="range"
                v-model.number="addFixtureState.matchDuration"
                min="10"
                max="120"
                step="5"
                class="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </UFormField>

          <!-- Livestream -->
          <UFormField label="Livestream" name="livestream">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <USelectMenu
                v-model="addFixtureState.livestreamPlatform"
                :items="livestreamPlatformOptions"
                value-key="value"
                placeholder="Select platform"
              >
                <template #leading="{ modelValue }">
                  <UIcon
                    v-if="getLivestreamPlatformInfo(modelValue)?.icon"
                    :name="getLivestreamPlatformInfo(modelValue)!.icon"
                    class="w-4 h-4"
                    :class="getLivestreamPlatformInfo(modelValue)!.color"
                  />
                </template>
              </USelectMenu>
              <UInput
                v-model="addFixtureState.livestreamUrl"
                type="text"
                :placeholder="
                  selectedLivestreamPlatformInfo?.placeholder || 'https://...'
                "
              />
            </div>
            <p class="mt-1.5 text-xs text-gray-500">
              Paste the public watch URL for your stream. YouTube, Twitch, and
              Vimeo can be embedded directly.
            </p>
          </UFormField>

          <!-- Add Another toggle -->
          <div
            class="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
          >
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                Add Another
              </p>
              <p class="text-xs text-gray-500">
                Keep the modal open to add more fixtures
              </p>
            </div>
            <USwitch v-model="addFixtureKeepOpen" />
          </div>

          <div class="flex justify-end gap-3 pt-4">
            <UButton
              label="Cancel"
              variant="ghost"
              color="neutral"
              @click="open = false"
            />
            <UButton
              label="Add Fixture"
              icon="i-heroicons-plus"
              :loading="addingFixture"
              @click="handleAddFixture"
            />
          </div>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
