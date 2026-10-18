<script setup lang="ts">
import {
  TournamentType,
  FixtureStatus,
  FixtureStage,
  ParticipantType,
} from "~/types";
import type { Fixture } from "~/types";
import { resolveEngine } from "~/engines/registry";
import { getParticipantName } from "~/utils/participant";

const props = defineProps<{
  playerStats: any;
  updatingMatch: boolean;
}>();

const emit = defineEmits<{
  start: [fixture: Fixture];
  control: [fixture: Fixture];
  "go-to-tab": [slot: string];
  "open-knockout-wizard": [];
  "open-group-wizard": [];
  "open-playoff-draw": [];
}>();

const route = useRoute();
const tournamentStore = useTournamentStore();
const participantStore = useParticipantStore();
const fixtureStore = useFixtureStore();
const standingStore = useStandingStore();
const groupStore = useGroupStore();
const { handleError } = useErrors();

const { currentTournament: tournament } = storeToRefs(tournamentStore);
const { participants } = storeToRefs(participantStore);
const {
  fixtures,
  fixturesByRound,
  rounds,
  knockoutFixturesByRound,
  knockoutRounds,
  groupStageFixturesByRound,
  groupStageRounds,
  loading: fixturesLoading,
  generating,
  liveFixtures,
} = storeToRefs(fixtureStore);
const { standings } = storeToRefs(standingStore);

const tournamentId = computed(() => route.params.id as string);

const {
  showStandings,
  handleClearFixtures,
  handleClearKnockoutFixtures,
  handleDeleteFixture,
} = useFixtureMaintenance();

// Redesigned fixtures tab: mini stats + side rail + tab navigation
const fixturesPlayed = computed(() => fixtures.value.filter((f) => f.status === FixtureStatus.COMPLETED).length);
const goalsScored = computed(() =>
  fixtures.value
    .filter((f) => f.status === FixtureStatus.COMPLETED)
    .reduce((s, f) => s + (f.homeScore ?? 0) + (f.awayScore ?? 0), 0),
);
const goalsPerMatch = computed(() => (fixturesPlayed.value ? (goalsScored.value / fixturesPlayed.value).toFixed(1) : "0.0"));
const liveHere = computed(() =>
  tournament.value ? liveFixtures.value.filter((f) => f.tournament_id === tournament.value!.id) : [],
);
const topScorersMini = computed(() => (props.playerStats?.topScorers || []).slice(0, 3));

// Race tournaments render fixtures as ranked events, not head-to-head cards.
// Driven by the sport engine (works for tournaments created before RACE type
// existed) or explicitly by the RACE tournament type.
const isRaceTournament = computed(() =>
  tournament.value?.type === TournamentType.RACE ||
  !!resolveEngine(tournament.value?.sport).race,
);

// Race tournaments hold multiple named events (Men's 100m, 200m…)
const raceFixtures = computed(() =>
  isRaceTournament.value ? fixtures.value : [],
);

const showTodayOnly = ref(false);

const hasTodayFixtures = computed(() => {
  const todayStr = new Date().toLocaleDateString("en-CA");
  return fixtures.value.some(
    (f) =>
      f.startTime &&
      new Date(f.startTime).toLocaleDateString("en-CA") === todayStr,
  );
});

// Calculate expected rounds based on tournament type and participants
const expectedRounds = computed(() => {
  if (!tournament.value) return [];
  const type = tournament.value.type;
  const totalTeamCount = participants.value.length;
  if (totalTeamCount < 2) return [];

  const items: { label: string; round: number; stage: FixtureStage }[] = [];

  // 1. Group Stage / League / Round Robin
  if (
    [
      TournamentType.LEAGUE,
      TournamentType.ROUND_ROBIN,
      TournamentType.GROUP,
      TournamentType.HYBRID,
    ].includes(type)
  ) {
    // Determine number of teams to use for round calculation
    const groupCounts = new Map<string, number>();
    participants.value.forEach((p) => {
      if (p.groupId)
        groupCounts.set(p.groupId, (groupCounts.get(p.groupId) || 0) + 1);
    });
    const groupStageTeamCount =
      groupCounts.size > 0 ? Math.max(...groupCounts.values()) : totalTeamCount;
    const oneWayRoundCount =
      groupStageTeamCount % 2 === 0
        ? groupStageTeamCount - 1
        : groupStageTeamCount;

    // Check if we already have double round robin fixtures to decide how many to show
    const hasDoubleRoundRobin = tournament.value.doubleRoundRobin;
    let roundCount: number;

    if (tournament.value.unifiedStandings) {
      const numPots = Math.max(2, groupCounts.size || tournament.value.numberOfGroups || 4);
      roundCount = numPots * 2;
    } else {
      roundCount = hasDoubleRoundRobin
        ? 2 * oneWayRoundCount
        : oneWayRoundCount;
    }

    for (let i = 1; i <= roundCount; i++) {
      items.push({
        label: `Matchday ${i}`,
        round: i,
        stage: FixtureStage.GROUP_STAGE,
      });
    }
  }

  // 2. Knockout Stage
  if ([TournamentType.KNOCKOUT, TournamentType.HYBRID].includes(type)) {
    const totalRounds = Math.ceil(Math.log2(totalTeamCount));
    const bracketSize = Math.pow(2, totalRounds);

    // Calculate offset for knockout rounds if hybrid
    let baseRoundOffset = 0;
    if (type === TournamentType.HYBRID) {
      const groupCounts = new Map<string, number>();
      participants.value.forEach((p) => {
        if (p.groupId)
          groupCounts.set(p.groupId, (groupCounts.get(p.groupId) || 0) + 1);
      });
      const groupStageTeamCount =
        groupCounts.size > 0
          ? Math.max(...groupCounts.values())
          : totalTeamCount;

      const hasDoubleRoundRobin = tournament.value.doubleRoundRobin;
      const gpOneWayRounds =
        groupStageTeamCount % 2 === 0
          ? groupStageTeamCount - 1
          : groupStageTeamCount;

      if (tournament.value.unifiedStandings) {
        const numPots = Math.max(2, groupCounts.size || tournament.value.numberOfGroups || 4);
        baseRoundOffset = numPots * 2;
      } else {
        baseRoundOffset = hasDoubleRoundRobin
          ? 2 * gpOneWayRounds
          : gpOneWayRounds;
      }
    }

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

      if (tournament.value?.twoLegsKnockout && !isFinal) {
        items.push({
          label: `${name} - Leg 1`,
          round: roundNum,
          stage: FixtureStage.KNOCKOUT,
        });
        items.push({
          label: `${name} - Leg 2`,
          round: roundNum,
          stage: FixtureStage.KNOCKOUT,
        });
      } else {
        items.push({
          label: name,
          round: roundNum,
          stage: FixtureStage.KNOCKOUT,
        });
      }
    }

    if (tournament.value?.thirdPlaceMatch) {
      items.push({
        label: "Third Place Match",
        round: baseRoundOffset + totalRounds + 1,
        stage: FixtureStage.KNOCKOUT,
      });
    }
  }

  return items;
});

const isFixturesOutdated = computed(() => {
  if (fixturesLoading.value || !tournament.value || fixtures.value.length === 0)
    return false;

  const type = tournament.value.type;
  const currentParticipants = participants.value;
  const tournamentTeamIds = new Set(currentParticipants.map((p) => p.id));

  // 1. Check for rounds that shouldn't exist anymore (e.g. went from 8 teams to 4)
  // Skip for pure knockout — those fixtures have no stage set and aren't group-based
  if (type !== TournamentType.KNOCKOUT && type !== TournamentType.FRIENDLY) {
    const expectedGroupRounds = expectedRounds.value.filter(
      (r) => r.stage === FixtureStage.GROUP_STAGE || !r.stage,
    );
    const actualGroupRounds = groupStageRounds.value;

    // If we have more group rounds in DB than expected, it's outdated
    if (actualGroupRounds.length > expectedGroupRounds.length) return true;

    // For Round Robin / League / Groups: The counts should match exactly
    if (
      [
        TournamentType.LEAGUE,
        TournamentType.ROUND_ROBIN,
        TournamentType.GROUP,
        TournamentType.HYBRID,
      ].includes(type)
    ) {
      if (actualGroupRounds.length !== expectedGroupRounds.length) return true;
    }
  }

  // 2. Check for "Orphan" participants in fixtures (teams that were deleted)
  for (const f of fixtures.value) {
    // If a fixture has a hard ID that is no longer in the tournament
    if (f.homeTeamId && !tournamentTeamIds.has(f.homeTeamId)) return true;
    if (f.awayTeamId && !tournamentTeamIds.has(f.awayTeamId)) return true;
  }

  // 3. For Round Robin specifically: Check if every CURRENT team is actually in the fixtures
  // (Detects if you added a team but haven't regenerated)
  if ([TournamentType.ROUND_ROBIN, TournamentType.LEAGUE].includes(type)) {
    const participantsInFixtures = new Set();
    fixtures.value.forEach((f) => {
      if (f.homeTeamId) participantsInFixtures.add(f.homeTeamId);
      if (f.awayTeamId) participantsInFixtures.add(f.awayTeamId);
    });

    // If there are teams in the tournament NOT in any fixtures
    if (currentParticipants.some((p) => !participantsInFixtures.has(p.id)))
      return true;
  }

  // 4. For group stage matches, check if the group assignment still matches
  if (type === TournamentType.GROUP || type === TournamentType.HYBRID) {
    const pGroupMap = new Map(
      currentParticipants.map((p) => [p.id, p.groupId]),
    );
    for (const f of fixtures.value) {
      if ((f.stage === FixtureStage.GROUP_STAGE || !f.stage) && f.groupId) {
        if (f.homeTeamId && pGroupMap.get(f.homeTeamId) !== f.groupId)
          return true;
        if (f.awayTeamId && pGroupMap.get(f.awayTeamId) !== f.groupId)
          return true;
      }
    }
  }

  return false;
});

// ── Flat fixture groups (matchday-style list) ────────────────
const LIVE_FIXTURE_STATUSES = [
  FixtureStatus.LIVE,
  FixtureStatus.NORMAL_TIME_ENDED,
  FixtureStatus.EXTRATIME,
];
const isLiveFixture = (f: Fixture) => LIVE_FIXTURE_STATUSES.includes(f.status);

interface FixtureGroup {
  value: string;
  label: string;
  round: number;
  roundName: string;
  dateLabel: string;
  hasLive: boolean;
  fixtures: Fixture[];
}

// Right-side group label: TODAY / TOMORROW / nearest date, from fixture times
const fixtureDateLabel = (roundFixtures: Fixture[]): string => {
  const dates = roundFixtures
    .filter((f) => f.startTime)
    .map((f) => new Date(f.startTime as string))
    .filter((d) => !Number.isNaN(d.getTime()));
  if (!dates.length) return "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);

  if (dates.some((d) => d >= today && d < tomorrow)) return "TODAY";

  const fmt = (d: Date) =>
    d
      .toLocaleDateString("en-US", { month: "short", day: "numeric" })
      .toUpperCase();

  const future = dates
    .filter((d) => d >= tomorrow)
    .sort((a, b) => a.getTime() - b.getTime());
  if (future.length) {
    const d = future[0]!;
    return d < dayAfter ? "TOMORROW" : fmt(d);
  }
  const past = dates.sort((a, b) => b.getTime() - a.getTime());
  return fmt(past[0]!);
};

// Rows: chronological by start time, then match number (stable)
const sortGroupFixtures = (roundFixtures: Fixture[]) =>
  roundFixtures
    .slice()
    .sort((a, b) => {
      if (a.startTime && b.startTime) {
        const timeDiff =
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        if (timeDiff !== 0) return timeDiff;
      }
      return (a.matchNumber || 0) - (b.matchNumber || 0);
    });

// Groups: always chronological round order (Matchday 1 first, never jump when live)
const sortFixtureGroups = (groups: FixtureGroup[]) =>
  groups.sort((a, b) => a.round - b.round);

// ── Team filtering ──────────────────────────────────────────
const selectedTeam = ref<string>("ALL");

const matchesTeamFilter = (f: Fixture): boolean => {
  if (selectedTeam.value === "ALL") return true;
  return (
    f.homeTeamId === selectedTeam.value ||
    f.awayTeamId === selectedTeam.value ||
    f.homeTeam?.id === selectedTeam.value ||
    f.awayTeam?.id === selectedTeam.value
  );
};

const teamOptions = computed(() => {
  if (!participants.value.length) return [];

  const isIndividual =
    tournament.value?.participantType === ParticipantType.INDIVIDUAL;
  const allLabel = isIndividual ? "All Participants" : "All Teams";

  const list = participants.value
    .map((p) => ({
      value: p.id,
      label: getParticipantName(p),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return [{ value: "ALL", label: allLabel }, ...list];
});

const todayFiltered = (roundFixtures: Fixture[]): Fixture[] => {
  if (!showTodayOnly.value) return roundFixtures;
  const todayStr = new Date().toLocaleDateString("en-CA");
  return roundFixtures.filter(
    (f) =>
      f.startTime &&
      new Date(f.startTime).toLocaleDateString("en-CA") === todayStr,
  );
};

const filterFixtures = (roundFixtures: Fixture[]): Fixture[] => {
  let list = todayFiltered(roundFixtures);
  if (selectedTeam.value !== "ALL") {
    list = list.filter(matchesTeamFilter);
  }
  return list;
};

const makeGroup = (
  value: string,
  label: string,
  round: number,
  roundFixtures: Fixture[],
): FixtureGroup => ({
  value,
  label,
  round,
  roundName: label,
  dateLabel: fixtureDateLabel(roundFixtures),
  hasLive: roundFixtures.some(isLiveFixture),
  fixtures: sortGroupFixtures(roundFixtures),
});

// League / Round Robin / general list (skeleton rounds included even when empty)
const fixtureGroups = computed(() => {
  const skeleton = expectedRounds.value.filter(
    (r) => r.stage === FixtureStage.GROUP_STAGE || !r.stage,
  );
  const allRoundNumbers = Array.from(
    new Set([...skeleton.map((r) => r.round), ...rounds.value]),
  );

  const groups: FixtureGroup[] = [];
  for (const round of allRoundNumbers) {
    const roundFixtures = filterFixtures(fixturesByRound.value[round] || []);
    // Only hide empty rounds if showing today only OR if filtering by team
    if (
      (showTodayOnly.value || selectedTeam.value !== "ALL") &&
      roundFixtures.length === 0
    )
      continue;
    const skeletonInfo = skeleton.find((s) => s.round === round);
    const label =
      skeletonInfo?.label || fixtureStore.getRoundDisplayName(round);
    groups.push(makeGroup(`round-${round}`, label, round, roundFixtures));
  }
  return sortFixtureGroups(groups);
});

// Group-stage-only groups (for hybrid tournaments)
const groupStageGroups = computed(() => {
  const skeleton = expectedRounds.value.filter(
    (r) => r.stage === FixtureStage.GROUP_STAGE,
  );
  const allRoundNumbers = Array.from(
    new Set([...skeleton.map((r) => r.round), ...groupStageRounds.value]),
  );

  const groups: FixtureGroup[] = [];
  for (const round of allRoundNumbers) {
    const roundFixtures = filterFixtures(
      groupStageFixturesByRound.value[round] || [],
    );
    if (
      (showTodayOnly.value || selectedTeam.value !== "ALL") &&
      roundFixtures.length === 0
    )
      continue;
    const skeletonInfo = skeleton.find((s) => s.round === round);
    const label =
      skeletonInfo?.label || fixtureStore.getGroupStageRoundDisplayName(round);
    groups.push(makeGroup(`gs-round-${round}`, label, round, roundFixtures));
  }
  return sortFixtureGroups(groups);
});

// Knockout groups: grouped by roundName within each round so legs stay
// together per stage; skeleton rounds with no fixtures produce no group
const knockoutLegOrder = (name: string) => {
  const leg = name.match(/Leg (\d+)/)?.[1];
  if (leg) return parseInt(leg);
  if (/^final$/i.test(name.trim())) return 10000;
  return 999;
};

const buildKnockoutGroups = (
  prefix: string,
  byRound: Record<number, Fixture[]>,
  roundList: number[],
) => {
  const skeleton = expectedRounds.value.filter(
    (r) => r.stage === FixtureStage.KNOCKOUT,
  );
  const allRoundNumbers = Array.from(
    new Set([...skeleton.map((r) => r.round), ...roundList]),
  );

  const groups: FixtureGroup[] = [];
  for (const round of allRoundNumbers) {
    const roundFixtures = filterFixtures(
      (byRound[round] || []).slice().sort((a, b) => a.matchNumber - b.matchNumber),
    );
    if (roundFixtures.length === 0) continue;

    const byName = new Map<string, Fixture[]>();
    for (const f of roundFixtures) {
      const key = f.roundName || `Round ${f.round}`;
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key)!.push(f);
    }
    const sortedKeys = Array.from(byName.keys()).sort(
      (a, b) => knockoutLegOrder(a) - knockoutLegOrder(b),
    );
    for (const label of sortedKeys) {
      groups.push(
        makeGroup(`${prefix}-${round}-${label}`, label, round, byName.get(label)!),
      );
    }
  }
  return sortFixtureGroups(groups);
};

// Pure knockout: fixtures have no stage set — use all fixtures.
// Hybrid: only knockout-stage fixtures.
const knockoutGroups = computed(() => {
  const isHybrid = tournament.value?.type === TournamentType.HYBRID;
  return buildKnockoutGroups(
    "ko",
    isHybrid ? knockoutFixturesByRound.value : fixturesByRound.value,
    isHybrid ? knockoutRounds.value : rounds.value,
  );
});

// Same pattern for the hybrid knockout stage
const hybridKnockoutGroups = computed(() =>
  buildKnockoutGroups("hko", knockoutFixturesByRound.value, knockoutRounds.value),
);

// ── Round filtering & navigation ────────────────────────────
const allAvailableGroups = computed<FixtureGroup[]>(() => {
  if (tournament.value?.type === TournamentType.KNOCKOUT) {
    return knockoutGroups.value;
  }
  if (tournament.value?.type === TournamentType.HYBRID) {
    return [...groupStageGroups.value, ...hybridKnockoutGroups.value];
  }
  return fixtureGroups.value;
});

const selectedRound = ref<string>("ALL");
const userSelectedRound = ref(false);

const findActiveRoundValue = (groups: FixtureGroup[]): string => {
  if (!groups.length) return "ALL";
  const liveGroup = groups.find((g) => g.hasLive);
  if (liveGroup) return liveGroup.value;
  const uncompletedGroup = groups.find((g) =>
    g.fixtures.some((f) => f.status !== FixtureStatus.COMPLETED),
  );
  if (uncompletedGroup) return uncompletedGroup.value;
  return groups[0]!.value;
};

watch(
  allAvailableGroups,
  (groups) => {
    if (!groups.length) {
      selectedRound.value = "ALL";
      return;
    }
    if (!userSelectedRound.value) {
      selectedRound.value = findActiveRoundValue(groups);
    } else if (
      selectedRound.value !== "ALL" &&
      !groups.some((g) => g.value === selectedRound.value)
    ) {
      selectedRound.value = findActiveRoundValue(groups);
    }
  },
  { immediate: true },
);

const roundOptions = computed(() => {
  const groups = allAvailableGroups.value;
  if (!groups.length) return [];

  const isKnockoutOnly = tournament.value?.type === TournamentType.KNOCKOUT;
  const isHybridWithKnockout =
    tournament.value?.type === TournamentType.HYBRID &&
    hybridKnockoutGroups.value.length > 0;

  const totalFilteredCount = groups.reduce(
    (acc, g) => acc + g.fixtures.length,
    0,
  );

  const allLabel = isKnockoutOnly
    ? `All Rounds (${totalFilteredCount})`
    : isHybridWithKnockout
      ? `All Matches (${totalFilteredCount})`
      : `All Matchdays (${totalFilteredCount})`;

  const items: Array<{ value: string; label: string }> = [
    {
      value: "ALL",
      label: allLabel,
    },
  ];

  for (const group of groups) {
    const isKnockoutGroup =
      tournament.value?.type === TournamentType.HYBRID &&
      hybridKnockoutGroups.value.some((kg) => kg.value === group.value);
    const labelPrefix = isKnockoutGroup ? "Knockout: " : "";
    items.push({
      value: group.value,
      label: `${labelPrefix}${group.label} (${group.fixtures.length})`,
    });
  }

  return items;
});

const currentGroupIndex = computed(() => {
  if (selectedRound.value === "ALL") return -1;
  return allAvailableGroups.value.findIndex(
    (g) => g.value === selectedRound.value,
  );
});

const isPrevRoundDisabled = computed(() => {
  if (selectedRound.value === "ALL") return true;
  return currentGroupIndex.value <= 0;
});

const isNextRoundDisabled = computed(() => {
  if (selectedRound.value === "ALL") return true;
  return (
    currentGroupIndex.value === -1 ||
    currentGroupIndex.value >= allAvailableGroups.value.length - 1
  );
});

const goToPrevRound = () => {
  if (isPrevRoundDisabled.value) return;
  const prevIdx = currentGroupIndex.value - 1;
  if (prevIdx >= 0) {
    selectedRound.value = allAvailableGroups.value[prevIdx]!.value;
    userSelectedRound.value = true;
  }
};

const goToNextRound = () => {
  if (isNextRoundDisabled.value) return;
  const nextIdx = currentGroupIndex.value + 1;
  if (nextIdx < allAvailableGroups.value.length) {
    selectedRound.value = allAvailableGroups.value[nextIdx]!.value;
    userSelectedRound.value = true;
  }
};

// Filtered groups for display
const displayedFixtureGroups = computed(() => {
  if (selectedRound.value === "ALL") return fixtureGroups.value;
  return fixtureGroups.value.filter((g) => g.value === selectedRound.value);
});

const displayedGroupStageGroups = computed(() => {
  if (selectedRound.value === "ALL") return groupStageGroups.value;
  return groupStageGroups.value.filter((g) => g.value === selectedRound.value);
});

const displayedHybridKnockoutGroups = computed(() => {
  if (selectedRound.value === "ALL") return hybridKnockoutGroups.value;
  return hybridKnockoutGroups.value.filter(
    (g) => g.value === selectedRound.value,
  );
});

const displayedKnockoutGroups = computed(() => {
  if (selectedRound.value === "ALL") return knockoutGroups.value;
  return knockoutGroups.value.filter((g) => g.value === selectedRound.value);
});

const isGroupStageSectionVisible = computed(() => {
  if (selectedRound.value === "ALL") return true;
  return displayedGroupStageGroups.value.length > 0;
});

const isKnockoutSectionVisible = computed(() => {
  if (selectedRound.value === "ALL") return true;
  return displayedHybridKnockoutGroups.value.length > 0;
});

const displayedFixturesCount = computed(() => {
  if (
    selectedRound.value === "ALL" &&
    selectedTeam.value === "ALL" &&
    !showTodayOnly.value
  ) {
    return `${fixtures.value.length}`;
  }
  const groups = [
    ...displayedFixtureGroups.value,
    ...displayedGroupStageGroups.value,
    ...displayedKnockoutGroups.value,
    ...displayedHybridKnockoutGroups.value,
  ];
  const count = groups.reduce((acc, g) => acc + g.fixtures.length, 0);
  return `${count} of ${fixtures.value.length}`;
});

const hasFilteredFixtures = computed(() => {
  return allAvailableGroups.value.some((g) => g.fixtures.length > 0);
});

watch(selectedTeam, () => {
  if (selectedRound.value !== "ALL") {
    if (!allAvailableGroups.value.some((g) => g.value === selectedRound.value)) {
      selectedRound.value = "ALL";
    }
  }
});

// Card header ⋯ menu: secondary fixture actions (primary = "+ Add fixture")
const fixtureMenuItems = computed(() => {
  const setup: any[] = [];

  if (fixtures.value.length) {
    setup.push({
      label: showTodayOnly.value ? "Show all fixtures" : "Today only",
      icon: "i-heroicons-calendar",
      onSelect: () => {
        showTodayOnly.value = !showTodayOnly.value;
      },
    });
  }
  if (tournament.value?.type === TournamentType.KNOCKOUT) {
    setup.push({
      label: "Setup brackets",
      icon: "i-heroicons-sparkles",
      disabled: fixtures.value.length > 0,
      onSelect: () => emit("open-knockout-wizard"),
    });
  }
  setup.push({
    label:
      tournament.value?.type === TournamentType.LEAGUE ||
      tournament.value?.type === TournamentType.GROUP ||
      tournament.value?.type === TournamentType.HYBRID ||
      tournament.value?.type === TournamentType.ROUND_ROBIN
        ? "Setup stage"
        : "Generate fixtures",
    icon: "i-heroicons-sparkles",
    disabled: participants.value.length < 2 || fixtures.value.length > 0,
    onSelect: openGenerateModal,
  });

  const danger: any[] = [];
  if (fixtures.value.length) {
    danger.push({
      label: "Clear all fixtures",
      icon: "i-heroicons-trash",
      color: "error" as const,
      onSelect: handleClearFixtures,
    });
  }
  if (
    tournament.value?.type === TournamentType.HYBRID &&
    fixtures.value.some((f) => f.stage === "KNOCKOUT")
  ) {
    danger.push({
      label: "Clear knockout brackets",
      icon: "i-heroicons-trash",
      color: "error" as const,
      onSelect: handleClearKnockoutFixtures,
    });
  }

  return danger.length ? [setup, danger] : [setup];
});

// Generate fixtures
const generateError = ref<string | null>(null);
const showGenerateModal = ref(false);
const generateConfig = reactive({
  teamsPerGroup: null as number | null,
  numberOfGroups: null as number | null,
  useExistingGroups: false,
});

const openGenerateModal = () => {
  // Reset config
  generateConfig.teamsPerGroup = null;
  generateConfig.numberOfGroups = null;
  generateConfig.useExistingGroups = groupStore.groups.length > 0;
  generateError.value = null;

  if (
    tournament.value?.type === TournamentType.GROUP ||
    tournament.value?.type === TournamentType.HYBRID ||
    tournament.value?.type === TournamentType.LEAGUE ||
    tournament.value?.type === TournamentType.ROUND_ROBIN
  ) {
    emit("open-group-wizard");
  } else if (tournament.value?.type === TournamentType.KNOCKOUT) {
    emit("open-knockout-wizard");
  } else {
    handleGenerateFixtures();
  }
};

const handleGenerateFixtures = async () => {
  if (participants.value.length < 2) {
    generateError.value =
      "At least 2 participants are required to generate fixtures";
    return;
  }

  generateError.value = null;
  try {
    await fixtureStore.generateFixtures(
      tournament.value?.id || tournamentId.value,
      {
        teamsPerGroup: generateConfig.useExistingGroups
          ? undefined
          : generateConfig.teamsPerGroup || undefined,
        numberOfGroups: generateConfig.useExistingGroups
          ? undefined
          : generateConfig.numberOfGroups || undefined,
        doubleRoundRobin: tournament.value?.doubleRoundRobin || false,
        useExistingGroups: generateConfig.useExistingGroups,
      },
    );

    showGenerateModal.value = false;

    // Auto-refresh fixtures
    await fixtureStore.fetchFixtures(
      tournament.value?.id || tournamentId.value,
    );

    // Refresh standings if applicable
    if (showStandings.value) {
      await standingStore.fetchStandings(tournamentId.value);
    }

    // Show success toast
    const toast = useToast();
    toast.add({
      title: "Fixtures Generated",
      description: "Fixtures have been successfully generated and refreshed.",
      icon: "i-heroicons-check-circle",
      color: "success",
    });
  } catch (err: any) {
    generateError.value = handleError(err, { toast: false });
  }
};

// Advance to Knockout Stage (Hybrid)
const showAdvanceModal = ref(false);

const canAdvance = computed(() => {
  if (tournament.value?.type !== TournamentType.HYBRID) return false;

  // Check if group stage matches exist and are all completed
  const groupMatches = fixtures.value.filter(
    (f) => f.stage === FixtureStage.GROUP_STAGE,
  );
  if (groupMatches.length === 0) return false;

  const allGroupsComplete = groupMatches.every(
    (f) => f.status === FixtureStatus.COMPLETED,
  );
  if (!allGroupsComplete) return false;

  // Validate that we have at least a single round robin across all groups
  const groupParticipantCounts = new Map<string, number>();
  participants.value.forEach((p) => {
    if (p.groupId) {
      groupParticipantCounts.set(
        p.groupId,
        (groupParticipantCounts.get(p.groupId) || 0) + 1,
      );
    }
  });

  let expectedMinMatches = 0;
  groupParticipantCounts.forEach((count) => {
    if (count >= 2) {
      expectedMinMatches += (count * (count - 1)) / 2;
    }
  });

  // If we have fewer matches than a single round robin, don't allow advancement yet (skip for unified standings / Swiss format)
  if (!tournament.value?.unifiedStandings && groupMatches.length < expectedMinMatches) return false;

  // Check if already advanced (knockout matches exist with actual teams assigned)
  const knockoutMatches = fixtures.value.filter(
    (f) => f.stage === FixtureStage.KNOCKOUT,
  );
  if (knockoutMatches.length > 0) {
    const hasPopulatedKnockout = knockoutMatches.some(
      (f) => f.homeTeamId || f.awayTeamId,
    );
    if (hasPopulatedKnockout) return false;
  }

  return true;
});

// Manual fixture creation modal
const fixtureAddModal = ref();
const openAddFixtureModal = (round?: number, roundName?: string) => {
  fixtureAddModal.value?.openModal(round, roundName);
};

const handleAddFixtureClick = () => {
  if (selectedRound.value !== "ALL") {
    const currentGroup = allAvailableGroups.value.find(
      (g) => g.value === selectedRound.value,
    );
    if (currentGroup) {
      openAddFixtureModal(currentGroup.round, currentGroup.roundName);
      return;
    }
  }
  openAddFixtureModal();
};

// Race event creation modal
const showAddEventModal = ref(false);
</script>

<template>
  <div>
    <!-- Mini stats (redesign) -->
    <div v-if="!isRaceTournament" class="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 mb-1">
      <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] rounded-xl px-4 py-3">
        <span class="block font-mono text-lg font-bold text-gray-900 dark:text-white">{{ fixturesPlayed }}</span>
        <span class="block text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Fixtures played</span>
      </div>
      <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] rounded-xl px-4 py-3">
        <span class="block font-mono text-lg font-bold" :class="liveHere.length ? 'text-red-500' : 'text-gray-900 dark:text-white'">{{ liveHere.length }}</span>
        <span class="block text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Live right now</span>
      </div>
      <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] rounded-xl px-4 py-3">
        <span class="block font-mono text-lg font-bold text-gray-900 dark:text-white">{{ goalsScored }}</span>
        <span class="block text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Goals scored</span>
      </div>
      <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] rounded-xl px-4 py-3">
        <span class="block font-mono text-lg font-bold text-gray-900 dark:text-white">{{ goalsPerMatch }}</span>
        <span class="block text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Goals / match</span>
      </div>
    </div>
    <!-- Race tournament: the event itself is the surface -->
    <UCard v-if="isRaceTournament" class="mt-4">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-flag" class="w-5 h-5 text-emerald-500" />
          <span class="font-medium">Event</span>
        </div>
      </template>

      <!-- Named event list (Men's 100m, 200m…) -->
      <div v-if="raceFixtures.length" class="space-y-2 mb-4">
        <div
          v-for="event in raceFixtures"
          :key="event.id"
          class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.06]"
        >
          <div class="flex items-center gap-3">
            <span class="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <UIcon name="i-heroicons-flag" class="w-5 h-5 text-emerald-500" />
            </span>
            <div>
              <p class="font-bold">{{ event.roundName || 'Event' }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ event.status === 'COMPLETED'
                  ? `${event.resultEntries?.length ?? 0} results published`
                  : `${event.resultEntries?.length ?? participants.length} athletes entered · results pending` }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <UBadge
              :color="event.status === 'COMPLETED' ? 'success' : 'neutral'"
              variant="subtle"
            >
              {{ event.status === 'COMPLETED' ? 'Official' : event.status }}
            </UBadge>
            <UButton
              color="primary"
              icon="i-heroicons-numbered-list"
              @click="emit('control', event)"
              :label="event.status === 'COMPLETED' ? 'View Results' : 'Enter Results'"
            />
            <UButton
              color="error"
              variant="ghost"
              icon="i-heroicons-trash"
              @click="handleDeleteFixture(event)"
            />
          </div>
        </div>
      </div>

      <!-- Add event -->
      <div class="flex justify-end">
        <UButton
          color="primary"
          icon="i-heroicons-plus"
          :disabled="participants.length < 2"
          @click="showAddEventModal = true"
          label="Add Event"
        />
      </div>
      <p v-if="participants.length < 2" class="text-[11px] text-gray-500 mt-2">
        Add at least 2 athletes in the Participants tab first.
      </p>
    </UCard>

    <div v-else class="grid gap-4 items-start mt-4" :class="topScorersMini.length ? 'lg:grid-cols-[1.7fr_1fr]' : ''">
    <div class="min-w-0">
    <UCard>
      <template #header>
        <div
          class="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div class="flex items-center gap-2">
            <UIcon
              name="i-heroicons-calendar-days"
              class="w-5 h-5 text-indigo-500"
            />
            <span class="font-medium">Fixtures</span>
            <UBadge v-if="fixtures.length" size="sm" variant="subtle">
              {{ displayedFixturesCount }}
            </UBadge>
          </div>
          <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between sm:justify-end">
            <!-- Team Filter -->
            <div
              v-if="!showTodayOnly && teamOptions.length > 2"
              class="flex items-center"
            >
              <USelect
                v-model="selectedTeam"
                :items="teamOptions"
                value-key="value"
                size="xs"
                class="w-32 sm:w-40"
              />
            </div>

            <!-- Round Selector & Navigation -->
            <div
              v-if="!showTodayOnly && roundOptions.length > 2"
              class="flex items-center gap-1"
            >
              <UButton
                size="xs"
                variant="ghost"
                color="neutral"
                icon="i-heroicons-chevron-left"
                :disabled="isPrevRoundDisabled"
                aria-label="Previous round"
                @click="goToPrevRound"
              />
              <USelect
                v-model="selectedRound"
                :items="roundOptions"
                value-key="value"
                size="xs"
                class="w-36 sm:w-44"
                @update:model-value="userSelectedRound = true"
              />
              <UButton
                size="xs"
                variant="ghost"
                color="neutral"
                icon="i-heroicons-chevron-right"
                :disabled="isNextRoundDisabled"
                aria-label="Next round"
                @click="goToNextRound"
              />
            </div>

            <div class="flex items-center gap-1.5">
              <UDropdownMenu
                :items="fixtureMenuItems"
                :content="{ align: 'end' }"
              >
                <UButton
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  icon="i-heroicons-ellipsis-horizontal"
                  :loading="generating"
                  aria-label="Fixture actions"
                />
              </UDropdownMenu>
              <UButton
                size="xs"
                color="primary"
                icon="i-heroicons-plus"
                @click="handleAddFixtureClick"
                :disabled="participants.length < 2"
                label="Add fixture"
              />
            </div>
          </div>
        </div>
      </template>

      <!-- Error -->
      <UAlert
        v-if="generateError"
        color="error"
        variant="subtle"
        icon="i-heroicons-exclamation-triangle"
        :title="generateError"
        class="mb-4"
        :close-button="{
          icon: 'i-heroicons-x-mark',
          color: 'error',
          variant: 'link',
        }"
        @close="generateError = null"
      />

      <!-- Fixtures Outdated Alert -->
      <UAlert
        v-if="isFixturesOutdated"
        color="warning"
        variant="subtle"
        icon="i-heroicons-exclamation-triangle"
        title="Configuration Changed"
        description="Changes were made to participants or groups. Your current fixtures may be outdated. Consider clearing and regenerating them."
        class="mb-4"
      >
        <template #actions>
          <UButton
            size="xs"
            color="warning"
            variant="solid"
            @click="handleClearFixtures"
            label="Clear Fixtures"
          />
          <UButton
            size="xs"
            color="primary"
            variant="solid"
            @click="openGenerateModal"
            label="Regenerate"
          />
        </template>
      </UAlert>

      <!-- Loading -->
      <div
        v-if="fixturesLoading && !fixtures.length"
        class="py-8 text-center text-gray-400"
      >
        <UIcon
          name="i-heroicons-arrow-path"
          class="w-8 h-8 mx-auto mb-2 animate-spin"
        />
        <p>Loading fixtures...</p>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="!fixtures.length && !participants.length"
        class="py-6 sm:py-8 text-center text-gray-400 text-sm"
      >
        <UIcon
          name="i-heroicons-calendar-days"
          class="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2"
        />
        <p>No fixtures scheduled</p>
        <p class="text-xs sm:text-sm mb-4">
          Generate fixtures automatically or add them manually
        </p>
        <div
          v-if="participants.length >= 2"
          class="flex items-center justify-center gap-2 sm:gap-3"
        >
          <UButton
            size="sm"
            variant="outline"
            icon="i-heroicons-sparkles"
            :loading="generating"
            @click="openGenerateModal"
          >
            Generate
          </UButton>
          <UButton
            size="sm"
            variant="outline"
            color="neutral"
            icon="i-heroicons-plus"
            @click="openAddFixtureModal()"
          >
            Add
          </UButton>
        </div>
        <p v-else class="text-xs text-gray-400 mt-2">
          Need at least 2 participants
        </p>
      </div>

      <!-- Today Empty State -->
      <div
        v-else-if="showTodayOnly && !hasTodayFixtures"
        class="py-6 sm:py-8 text-center text-gray-400 text-sm"
      >
        <UIcon
          name="i-heroicons-calendar"
          class="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50"
        />
        <p>No fixtures scheduled for today</p>
        <UButton
          size="sm"
          variant="soft"
          color="primary"
          class="mt-3 sm:mt-4"
          @click="showTodayOnly = false"
        >
          View All Fixtures
        </UButton>
      </div>

      <!-- Filtered Empty State -->
      <div
        v-else-if="fixtures.length && !hasFilteredFixtures"
        class="py-6 sm:py-8 text-center text-gray-400 text-sm"
      >
        <UIcon
          name="i-heroicons-funnel"
          class="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50"
        />
        <p>No fixtures match the selected filter</p>
        <div class="flex items-center justify-center gap-2 mt-3">
          <UButton
            v-if="selectedTeam !== 'ALL'"
            size="xs"
            variant="soft"
            color="neutral"
            @click="selectedTeam = 'ALL'"
          >
            Clear Team Filter
          </UButton>
          <UButton
            v-if="selectedRound !== 'ALL'"
            size="xs"
            variant="soft"
            color="neutral"
            @click="selectedRound = 'ALL'"
          >
            All Rounds
          </UButton>
        </div>
      </div>

      <!-- Fixtures Display -->
      <template v-else>
        <!-- Knockout Fixture List + Bracket for knockout tournaments -->
        <template v-if="tournament?.type === TournamentType.KNOCKOUT">
          <!-- Flat fixture list, grouped by stage/leg -->
          <TournamentFixtureGroups
            :groups="displayedKnockoutGroups"
            :updating-match="updatingMatch"
            class="mb-6"
            @add-fixture="(p) => openAddFixtureModal(p.round, p.roundName)"
            @start="(f) => emit('start', f)"
            @control="(f) => emit('control', f)"
            @delete="handleDeleteFixture"
          />

          <!-- Read-only bracket (below list) -->
          <KnockoutBracket
            v-if="!showTodayOnly && selectedTeam === 'ALL'"
            :fixtures-by-round="fixturesByRound"
            :rounds="rounds"
            :get-round-display-name="fixtureStore.getRoundDisplayName"
            :two-legs-knockout="tournament?.twoLegsKnockout"
            :third-place-match="tournament?.thirdPlaceMatch"
            :readonly="true"
          />
        </template>

        <!-- Hybrid: Group stage list + Knockout bracket -->
        <template
          v-else-if="tournament?.type === TournamentType.HYBRID"
        >
          <!-- Advance to Knockout CTA -->
          <div
            v-if="canAdvance"
            class="mb-4 flex items-center justify-between gap-4 p-4 rounded-lg border border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-950/20"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center"
              >
                <UIcon
                  name="i-heroicons-check-circle"
                  class="w-5 h-5 text-primary-600 dark:text-primary-400"
                />
              </div>
              <div>
                <p
                  class="text-sm font-medium text-gray-900 dark:text-white"
                >
                  {{ tournament?.unifiedStandings ? 'All league phase matches completed' : 'All group stage matches completed' }}
                </p>
                <p class="text-xs text-gray-500">
                  Ready to generate the knockout bracket
                </p>
              </div>
            </div>
            <UButton
              icon="i-heroicons-forward"
              label="Advance Stage"
              color="primary"
              variant="solid"
              @click="showAdvanceModal = true"
            />
          </div>

          <!-- Group Stage Fixtures (flat list) -->
          <TournamentFixtureGroups
            v-if="isGroupStageSectionVisible"
            :groups="displayedGroupStageGroups"
            :updating-match="updatingMatch"
            @add-fixture="(p) => openAddFixtureModal(p.round, p.roundName)"
            @start="(f) => emit('start', f)"
            @control="(f) => emit('control', f)"
            @delete="handleDeleteFixture"
          />

          <!-- Knockout Stage (shown after advancement) -->
          <div
            v-if="knockoutRounds.length > 0 && isKnockoutSectionVisible"
            class="mt-6 space-y-6"
          >
            <h4
              class="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2"
            >
              <UIcon
                name="i-heroicons-trophy"
                class="w-4 h-4 text-amber-500"
              />
              Knockout Stage
            </h4>

            <!-- Flat fixture list, grouped by stage/leg -->
            <TournamentFixtureGroups
              :groups="displayedHybridKnockoutGroups"
              :updating-match="updatingMatch"
              @add-fixture="(p) => openAddFixtureModal(p.round, p.roundName)"
              @start="(f) => emit('start', f)"
              @control="(f) => emit('control', f)"
              @delete="handleDeleteFixture"
            />

            <!-- Read-only bracket -->
            <KnockoutBracket
              v-if="!showTodayOnly"
              :fixtures-by-round="knockoutFixturesByRound"
              :rounds="knockoutRounds"
              :get-round-display-name="
                fixtureStore.getKnockoutRoundDisplayName
              "
              :two-legs-knockout="tournament?.twoLegsKnockout"
              :third-place-match="tournament?.thirdPlaceMatch"
              :readonly="true"
            />
          </div>
        </template>

        <!-- List view for other tournament types (League, Round Robin) -->
        <div v-else>
          <TournamentFixtureGroups
            :groups="displayedFixtureGroups"
            :updating-match="updatingMatch"
            @add-fixture="(p) => openAddFixtureModal(p.round, p.roundName)"
            @start="(f) => emit('start', f)"
            @control="(f) => emit('control', f)"
            @delete="handleDeleteFixture"
          />
        </div>
      </template>

    </UCard>
    </div>

    <!-- Side rail (redesign): top scorers -->
    <aside v-if="topScorersMini.length" class="flex flex-col gap-4">

      <UCard v-if="topScorersMini.length">
        <template #header>
          <div class="flex items-center justify-between">
            <span class="text-sm font-bold">Top scorers</span>
            <button class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline" @click="emit('go-to-tab', 'stats')">All stats →</button>
          </div>
        </template>
        <div class="-my-2">
          <div
            v-for="(item, i) in topScorersMini"
            :key="i"
            class="flex items-center gap-3 py-2 text-sm border-b border-gray-100 dark:border-white/5 last:border-b-0"
          >
            <span class="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-300 shrink-0">
              {{ (item.player?.name || '?').charAt(0).toUpperCase() }}
            </span>
            <span class="flex-1 min-w-0">
              <span class="block truncate font-semibold text-gray-900 dark:text-white">{{ item.player?.name || 'Unknown' }}</span>
              <span class="block text-[11px] text-gray-500 dark:text-gray-400 truncate">{{ item.teamName }}</span>
            </span>
            <span class="font-mono text-base font-bold text-emerald-500">{{ item.goals }}</span>
          </div>
        </div>
      </UCard>
    </aside>
    </div>

    <!-- Add Fixture Modal -->
    <TournamentFixtureAddModal ref="fixtureAddModal" />

    <!-- Generate Fixtures Modal -->
    <TournamentFixtureGenerateModal
      v-model:open="showGenerateModal"
      :generate-config="generateConfig"
      :generating="generating"
      :generate-error="generateError"
      @generate="handleGenerateFixtures"
    />

    <!-- Advance to Knockout Modal -->
    <TournamentAdvanceModal
      v-model:open="showAdvanceModal"
      @start-manual-wizard="emit('open-knockout-wizard')"
      @start-playoff-draw="emit('open-playoff-draw')"
    />

    <!-- Add Event Modal (race tournaments) -->
    <TournamentAddEventModal v-model:open="showAddEventModal" />
  </div>
</template>
