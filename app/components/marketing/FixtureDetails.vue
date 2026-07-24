<script setup lang="ts">
import { useRoute } from "#imports";
import type { Tournament, Fixture, MatchEvent, Highlight } from "~/types";
import { FixtureStatus, MatchEventType, MatchHalf } from "~/types";
import LivestreamEmbed from "~/components/marketing/LivestreamEmbed.vue";
import { getHighlightPlatformInfo } from "~/utils/highlights";

const { toMain, isManage } = useHost();
const toast = useToast();

const props = defineProps<{
  tournamentId: string;
  fixtureId: string;
}>();

defineEmits(["back"]);
// Theme: use widget injection if available, otherwise follow app color mode
const colorMode = useColorMode();
const injectedDark = inject<Ref<boolean> | null>("widgetIsDark", null);
const isDark = computed(() =>
  injectedDark !== null ? injectedDark.value : colorMode.value === "dark",
);

const tabInactiveClass = computed(() =>
  isDark.value
    ? "border-transparent text-gray-400 hover:text-gray-300"
    : "border-transparent text-gray-500 hover:text-gray-700",
);

// State
const tournament = ref<Tournament | null>(null);
const fixture = ref<Fixture | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const activeTab = ref<"events" | "info" | "lineups" | "highlights">("events");
const activeMobileLineupTeam = ref<"home" | "away">("home");
const highlights = ref<Highlight[]>([]);
const loadingHighlights = ref(false);
const route = useRoute();
const isFullPage = computed(() => route.path.includes("/fixture/"));

// Establish Live Stream connection to receive realtime push notifications
useLiveStream();

// Listen to local streaming updates
if (typeof window !== "undefined") {
  window.addEventListener("live-match-update", (e: Event) => {
    const customEvent = e as CustomEvent;
    const { type, data } = customEvent.detail;

    if (!fixture.value) return;

    // Ensure update corresponds to this fixture
    if (type === "fixture_updated" && data.id === fixture.value.id) {
      Object.assign(fixture.value, data);
    }

    // Match Events handling requires either this match id directly or by reading from the event
    if (
      type === "event_added" ||
      type === "event_updated" ||
      type === "event_deleted"
    ) {
      const targetFixtureId = data.fixture_id || data.fixtureId;
      if (targetFixtureId !== fixture.value.id) return;

      if (!fixture.value.matchEvents) {
        fixture.value.matchEvents = [];
      }

      const matchEvents = fixture.value.matchEvents as MatchEvent[];

      if (type === "event_added") {
        matchEvents.push(data);
      } else if (type === "event_updated") {
        const idx = matchEvents.findIndex((ev) => ev.id === data.id);
        if (idx !== -1) {
          matchEvents[idx] = data;
        }
      } else if (type === "event_deleted") {
        const deletedId = data.eventId;
        const idx = matchEvents.findIndex((ev) => ev.id === deletedId);
        if (idx !== -1) {
          matchEvents.splice(idx, 1);
        }
      }
    }
  });
}

// Fetch data
async function fetchHighlights() {
  loadingHighlights.value = true;
  try {
    const res = await $publicApi<any>(`/highlights/fixture/${props.fixtureId}`);
    highlights.value = res?.data || [];
  } catch (e: any) {
    console.error("Highlights fetch error:", e);
    highlights.value = [];
  } finally {
    loadingHighlights.value = false;
  }
}

async function fetchData() {
  loading.value = true;
  error.value = null;
  try {
    const [tournamentRes, fixtureRes] = await Promise.all([
      $publicApi<any>(`/tournaments/${props.tournamentId}`),
      $publicApi<any>(`/fixtures/${props.fixtureId}`),
    ]);

    tournament.value = tournamentRes?.data || tournamentRes;
    fixture.value = fixtureRes?.data || fixtureRes;

    if (!fixture.value) {
      error.value = "Fixture not found";
    } else {
      fetchHighlights();
    }
  } catch (e: any) {
    error.value = e.message || "Failed to load fixture";
    console.error("Fixture detail error:", e);
  } finally {
    loading.value = false;
  }
}

onMounted(fetchData);

// SEO
watchEffect(() => {
  if (fixture.value && tournament.value) {
    const home = fixture.value.homeTeam?.customName || "TBD";
    const away = fixture.value.awayTeam?.customName || "TBD";
    useSeoMeta({
      title: `${home} vs ${away} — ${tournament.value.name} | ParaScores`,
      description: `${home} vs ${away} in ${tournament.value.name}. Follow live scores and match events.`,
      ogTitle: `${home} vs ${away} — ${tournament.value.name}`,
      ogDescription: `${home} vs ${away} in ${tournament.value.name}. Follow live scores and match events.`,
    });
  }
});

// Computed
const events = computed(() => {
  if (!fixture.value?.matchEvents) return [];
  return [...fixture.value.matchEvents].sort(
    (a, b) => (a.minute || 0) - (b.minute || 0),
  );
});

const homeEvents = computed(() =>
  events.value.filter(
    (e) =>
      e.participant_id === fixture.value?.homeTeamId ||
      (e as any).participantId === fixture.value?.homeTeamId,
  ),
);
const awayEvents = computed(() =>
  events.value.filter(
    (e) =>
      e.participant_id === fixture.value?.awayTeamId ||
      (e as any).participantId === fixture.value?.awayTeamId,
  ),
);

const isCompleted = computed(
  () => fixture.value?.status === FixtureStatus.COMPLETED,
);
const isLive = computed(
  () =>
    fixture.value?.status === FixtureStatus.LIVE ||
    fixture.value?.status === FixtureStatus.NORMAL_TIME_ENDED ||
    fixture.value?.status === FixtureStatus.EXTRATIME,
);
const hasPenalties = computed(
  () =>
    fixture.value?.homePenaltyScore != null ||
    fixture.value?.awayPenaltyScore != null,
);
const matchTimer = useMatchTimer();
const liveMinuteLabel = computed(() =>
  fixture.value ? matchTimer.formatMinuteLabel(fixture.value) : "",
);
const liveClock = computed(() =>
  fixture.value ? matchTimer.formatClock(fixture.value) : "",
);

const manOfTheMatch = computed(() => {
  if (!fixture.value) return null;
  if (fixture.value.manOfTheMatchPlayer)
    return fixture.value.manOfTheMatchPlayer;
  if (fixture.value.manOfTheMatchPlayerId && fixture.value.matchEvents) {
    return (
      fixture.value.matchEvents.find(
        (e) => e.player?.id === fixture.value!.manOfTheMatchPlayerId,
      )?.player || null
    );
  }
  return null;
});

const teamName = computed(() => {
  const participant = manOfTheMatch.value?.participant;
  if (!participant) return "";
  return (
    participant.customName ||
    participant.team?.name ||
    participant.user?.name ||
    ""
  );
});

const shareUrl = computed(() => {
  if (!fixture.value || !tournament.value) return "";
  const slug = tournament.value.customName || tournament.value.id;
  return toMain(`/t/${slug}/fixture/${fixture.value.id}`, { absolute: true });
});

const shareData = computed(() => {
  const home = fixture.value?.homeTeam?.customName || "TBD";
  const away = fixture.value?.awayTeam?.customName || "TBD";
  const tournamentName = tournament.value?.name || "";
  return {
    title: `${home} vs ${away} — ${tournamentName}`,
    text: `${home} vs ${away} in ${tournamentName}. Follow live scores and match events.`,
    url: shareUrl.value,
  };
});

async function shareFixture() {
  if (
    typeof navigator !== "undefined" &&
    navigator.share &&
    navigator.canShare?.(shareData.value)
  ) {
    try {
      await navigator.share(shareData.value);
      return;
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        console.error("Share failed:", e);
      }
    }
  }
  await copyLink();
}

async function copyLink() {
  if (!shareUrl.value) return;
  try {
    await navigator.clipboard.writeText(shareUrl.value);
    toast.add({
      title: "Link copied!",
      description: "Fixture link copied to clipboard.",
      icon: "i-heroicons-link",
      color: "success",
    });
  } catch (e) {
    console.error("Copy failed:", e);
    toast.add({
      title: "Failed to copy",
      description: "Could not copy the link to your clipboard.",
      icon: "i-heroicons-exclamation-triangle",
      color: "error",
    });
  }
}

// Helpers
function formatTime(dateStr?: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
function formatFullDate(dateStr?: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getEventIcon(type: MatchEventType) {
  switch (type) {
    case MatchEventType.GOAL:
      return "⚽";
    case MatchEventType.OWN_GOAL:
      return "⚽";
    case MatchEventType.PENALTY:
      return "🎯";
    case MatchEventType.MISSED_PENALTY:
      return "❌";
    case MatchEventType.PENALTY_SAVE:
      return "🧤";
    case MatchEventType.YELLOW_CARD:
      return "🟨";
    case MatchEventType.RED_CARD:
      return "🟥";
    case MatchEventType.SUBSTITUTION:
      return "🔄";
    case MatchEventType.ASSIST:
      return "👟";
    default:
      return "📋";
  }
}

function getEventLabel(type: MatchEventType) {
  switch (type) {
    case MatchEventType.GOAL:
      return "Goal";
    case MatchEventType.OWN_GOAL:
      return "Own Goal";
    case MatchEventType.PENALTY:
      return "Penalty";
    case MatchEventType.MISSED_PENALTY:
      return "Missed Penalty";
    case MatchEventType.PENALTY_SAVE:
      return "Penalty Saved";
    case MatchEventType.YELLOW_CARD:
      return "Yellow Card";
    case MatchEventType.RED_CARD:
      return "Red Card";
    case MatchEventType.SUBSTITUTION:
      return "Substitution";
    case MatchEventType.ASSIST:
      return "Assist";
    default:
      return type;
  }
}

function getPlayerGoals(playerId: string) {
  return events.value.filter(
    (e) =>
      ["GOAL", "PENALTY"].includes(e.type) &&
      (e.playerId === playerId || e.player?.id === playerId),
  ).length;
}

function getPlayerAssists(playerId: string) {
  return events.value.filter(
    (e) =>
      ["GOAL", "PENALTY"].includes(e.type) &&
      (e.relatedPlayerId === playerId || e.relatedPlayer?.id === playerId),
  ).length;
}

// Compute cumulative score for goal events to show the (1 - 0) format
const timelineEvents = computed(() => {
  let homeScore = 0;
  let awayScore = 0;
  const mapped = events.value.map((event) => {
    let currentHomeScore = homeScore;
    let currentAwayScore = awayScore;
    let scoringTeam: "home" | "away" | null = null;

    if (["GOAL", "OWN_GOAL", "PENALTY"].includes(event.type)) {
      const isHomeEventFlag = isHomeEvent(event);
      if (isHomeEventFlag) {
        homeScore++;
        scoringTeam = "home";
      } else {
        awayScore++;
        scoringTeam = "away";
      }
      currentHomeScore = homeScore;
      currentAwayScore = awayScore;
    }

    return {
      ...event,
      scoreAtTime: ["GOAL", "OWN_GOAL", "PENALTY"].includes(event.type)
        ? `${currentHomeScore} - ${currentAwayScore}`
        : "",
      currentHomeScore,
      currentAwayScore,
      scoringTeam,
    };
  });

  // Optionally group them or just return the mapped array
  return mapped;
});

const keyEventsSummary = computed(() => {
  const goalsAndReds = events.value
    .filter((e) => ["GOAL", "OWN_GOAL", "PENALTY", "RED_CARD"].includes(e.type))
    .sort((a, b) => (a.minute || 0) - (b.minute || 0));

  const homeEvents = goalsAndReds.filter((e) => isHomeEvent(e));
  const awayEvents = goalsAndReds.filter((e) => !isHomeEvent(e));

  const rows: { home: any | null; away: any | null }[] = [];
  const maxRows = Math.max(homeEvents.length, awayEvents.length);
  for (let i = 0; i < maxRows; i++) {
    rows.push({
      home: homeEvents[i] || null,
      away: awayEvents[i] || null,
    });
  }

  return rows;
});

// Helper to determine if an event is home or away
const isHomeEvent = (event: any) => {
  return (
    event.participant_id === fixture.value?.homeTeamId ||
    event.participantId === fixture.value?.homeTeamId
  );
};

const getMatchHalf = (event: any): MatchHalf => {
  if (event.metadata?.isPenaltyShootout) return MatchHalf.PENALTY_SHOOTOUT;
  if (event.half) return event.half as MatchHalf;

  const normalDuration = 90;
  const duration = fixture.value?.matchDuration ?? normalDuration;
  const halfTime = duration / 2;
  const minute = event.minute ?? 0;

  if (fixture.value?.status === FixtureStatus.EXTRATIME) {
    return MatchHalf.EXTRA_TIME;
  }

  if (minute > normalDuration) return MatchHalf.EXTRA_TIME;
  if (minute > halfTime) return MatchHalf.SECOND_HALF;
  return MatchHalf.FIRST_HALF;
};

const getMatchHalfLabel = (half: MatchHalf) => {
  switch (half) {
    case MatchHalf.FIRST_HALF:
      return "First Half";
    case MatchHalf.SECOND_HALF:
      return "Second Half";
    case MatchHalf.EXTRA_TIME:
      return "Extra Time";
    case MatchHalf.PENALTY_SHOOTOUT:
      return "Penalty Shootout";
    default:
      return "Other";
  }
};

const penaltyShootoutEvents = computed(() => {
  return events.value.filter((e) => e.metadata?.isPenaltyShootout === true);
});

const penaltyShootoutOrderMap = computed(() => {
  const sorted = [...penaltyShootoutEvents.value].sort((a, b) => {
    if (a.minute !== b.minute) return (a.minute || 0) - (b.minute || 0);
    return a.id.localeCompare(b.id);
  });
  const map = new Map<string, number>();
  sorted.forEach((event, index) => map.set(event.id, index + 1));
  return map;
});

const getEventMinuteDisplay = (event: any) => {
  if (event.metadata?.isPenaltyShootout) {
    const order =
      event.metadata?.shootoutOrder ||
      penaltyShootoutOrderMap.value.get(event.id);
    return order ? `P${order}` : "P";
  }
  return event.minute != null ? `${event.minute}'` : null;
};

const groupedTimelineEvents = computed(() => {
  const groups: Record<MatchHalf, any[]> = {
    [MatchHalf.FIRST_HALF]: [],
    [MatchHalf.SECOND_HALF]: [],
    [MatchHalf.EXTRA_TIME]: [],
    [MatchHalf.PENALTY_SHOOTOUT]: [],
  };

  for (const event of timelineEvents.value) {
    const half = getMatchHalf(event);
    groups[half].push(event);
  }

  const sectionOrder = [
    MatchHalf.FIRST_HALF,
    MatchHalf.SECOND_HALF,
    MatchHalf.EXTRA_TIME,
    MatchHalf.PENALTY_SHOOTOUT,
  ];
  return sectionOrder
    .map((half) => ({
      half,
      label: getMatchHalfLabel(half),
      events: groups[half],
    }))
    .filter((group) => group.events.length > 0);
});

const homePenaltyShootoutEvents = computed(() => {
  return events.value
    .filter(
      (e) =>
        e.metadata?.isPenaltyShootout === true &&
        e.participant_id === fixture.value?.homeTeamId,
    )
    .sort(
      (a, b) =>
        (penaltyShootoutOrderMap.value.get(a.id) || 0) -
        (penaltyShootoutOrderMap.value.get(b.id) || 0),
    );
});

const awayPenaltyShootoutEvents = computed(() => {
  return events.value
    .filter(
      (e) =>
        e.metadata?.isPenaltyShootout === true &&
        e.participant_id === fixture.value?.awayTeamId,
    )
    .sort(
      (a, b) =>
        (penaltyShootoutOrderMap.value.get(a.id) || 0) -
        (penaltyShootoutOrderMap.value.get(b.id) || 0),
    );
});

const maxPenaltyRounds = computed(() => {
  return Math.max(
    homePenaltyShootoutEvents.value.length,
    awayPenaltyShootoutEvents.value.length,
  );
});

const homeLineup = computed(() => {
  if (
    !fixture.value?.lineupPlayers ||
    fixture.value.lineupPlayers.length === 0
  ) {
    return [];
  }
  return fixture.value.lineupPlayers.filter(
    (p) => p.participantId === fixture.value?.homeTeamId,
  );
});

const awayLineup = computed(() => {
  if (
    !fixture.value?.lineupPlayers ||
    fixture.value.lineupPlayers.length === 0
  ) {
    return [];
  }
  return fixture.value.lineupPlayers.filter(
    (p) => p.participantId === fixture.value?.awayTeamId,
  );
});

const homeSubs = computed(() => {
  const roster = fixture.value?.homeTeam?.players || [];
  const lineupIds = new Set(homeLineup.value.map((p) => p.id));
  return roster.filter((p) => !lineupIds.has(p.id));
});

const awaySubs = computed(() => {
  const roster = fixture.value?.awayTeam?.players || [];
  const lineupIds = new Set(awayLineup.value.map((p) => p.id));
  return roster.filter((p) => !lineupIds.has(p.id));
});
</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center min-h-[60vh]">
      <div class="flex flex-col items-center gap-4">
        <div
          class="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"
        ></div>
        <span class="text-sm text-gray-400">Loading match...</span>
      </div>
    </div>

    <!-- Error -->
    <div
      v-else-if="error"
      class="flex items-center justify-center min-h-[60vh]"
    >
      <div class="text-center">
        <div
          class="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center"
        >
          <svg
            class="w-8 h-8 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h3
          class="text-lg font-semibold mb-2"
          :class="isDark ? 'text-white' : 'text-gray-900'"
        >
          Match not found
        </h3>
        <p class="text-sm text-gray-400 mb-4">{{ error }}</p>
        <button
          @click="$emit('back')"
          class="text-sm text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
        >
          ← Back
        </button>
      </div>
    </div>

    <!-- Content -->
    <div v-else-if="fixture && tournament">
      <!-- Match Header -->
      <section
        class="relative overflow-hidden transition-colors"
        :class="
          isDark
            ? 'bg-[#1a1a1a] border-white/[0.06]'
            : 'bg-white border-gray-200'
        "
      >
        <div
          class="relative max-w-3xl mx-auto px-3 sm:px-4 md:px-6 pt-6 sm:pt-8 md:pt-10 pb-0"
        >
          <!-- Header Controls -->
          <div class="flex items-center justify-between mb-4 sm:mb-6 md:mb-8">
            <!-- Back + Tournament -->
            <button
              @click="$emit('back')"
              class="inline-flex items-center gap-2 text-[11px] sm:text-xs text-gray-400 hover:text-emerald-400 transition-colors cursor-pointer"
            >
              <svg
                class="w-3 h-3 sm:w-3.5 sm:h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back
            </button>

            <div class="flex items-center gap-1.5 sm:gap-2">
              <!-- Full Page Link -->
              <NuxtLink
                v-if="!isFullPage"
                :to="
                  toMain(
                    `/t/${tournament.customName || tournament.id}/fixture/${fixture.id}`,
                  )
                "
                :external="isManage"
                class="inline-flex items-center gap-1.5 text-[10px] sm:text-xs text-emerald-500 hover:text-emerald-400 transition-colors bg-emerald-500/10 hover:bg-emerald-500/20 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-emerald-500/20"
              >
                <span class="hidden sm:inline">View Full Match Page</span>
                <span class="sm:hidden">Full Page</span>
                <svg
                  class="w-3 h-3 sm:w-3.5 sm:h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </NuxtLink>

              <!-- Share Button -->
              <button
                @click="shareFixture"
                class="inline-flex items-center justify-center gap-1.5 text-[10px] sm:text-xs text-emerald-500 hover:text-emerald-400 transition-colors bg-emerald-500/10 hover:bg-emerald-500/20 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-emerald-500/20 cursor-pointer"
                aria-label="Share match"
              >
                <UIcon
                  name="i-heroicons-share"
                  class="w-3 h-3 sm:w-3.5 sm:h-3.5"
                />
                <span class="hidden sm:inline">Share</span>
              </button>

              <!-- Copy Link Button -->
              <button
                @click="copyLink"
                class="inline-flex items-center justify-center gap-1.5 text-[10px] sm:text-xs text-emerald-500 hover:text-emerald-400 transition-colors bg-emerald-500/10 hover:bg-emerald-500/20 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-emerald-500/20 cursor-pointer"
                aria-label="Copy link"
              >
                <UIcon
                  name="i-heroicons-link"
                  class="w-3 h-3 sm:w-3.5 sm:h-3.5"
                />
                <span class="hidden sm:inline">Copy Link</span>
              </button>
            </div>
          </div>

          <!-- Match Header (FotMob Style) -->
          <div class="pb-4 sm:pb-6 md:pb-8">
            <!-- Round info -->
            <div class="text-center mb-3 sm:mb-4 md:mb-6">
              <span
                class="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-widest block"
              >
                {{
                  (fixture.roundName || `Round ${fixture.round}`).replace(
                    /^Group\s+Stage\s*-\s*/i,
                    "",
                  )
                }}<template v-if="fixture.matchNumber">
                  · Match {{ fixture.matchNumber }}</template
                >
              </span>

              <!-- Tournament link -->
              <NuxtLink
                v-if="tournament"
                :to="toMain(`/t/${tournament.customName || tournament.id}`)"
                :external="isManage"
                class="inline-flex items-center justify-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2 text-[11px] sm:text-[12px] font-bold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <img
                  v-if="tournament.logoUrl"
                  :src="tournament.logoUrl"
                  class="w-3 h-3 sm:w-4 sm:h-4 object-contain"
                  :alt="tournament.name"
                />
                <span class="truncate max-w-[160px] sm:max-w-[220px]">{{
                  tournament.name
                }}</span>
              </NuxtLink>

              <div
                v-if="fixture.venue"
                class="flex items-center justify-center gap-1.5 mt-1 opacity-60"
              >
                <UIcon
                  name="i-heroicons-map-pin"
                  class="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400"
                />
                <span
                  class="text-[9px] sm:text-[10px] font-semibold text-gray-500 uppercase tracking-wider"
                >
                  {{ fixture.venue }}
                </span>
              </div>
            </div>

            <!-- Scoreboard -->
            <div
              class="flex items-center justify-center max-w-xl mx-auto mb-4 sm:mb-6 w-full"
            >
              <!-- Home Team -->
              <div
                class="flex-1 flex flex-col items-center text-center min-w-0"
              >
                <div
                  class="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-full overflow-hidden mb-2 sm:mb-2.5 flex-shrink-0 flex items-center justify-center ring-1 ring-white/10"
                  :class="isDark ? 'bg-white/5' : 'bg-gray-100 ring-gray-200'"
                >
                  <img
                    v-if="fixture.homeTeam?.logoUrl"
                    :src="fixture.homeTeam.logoUrl"
                    class="w-full h-full object-cover p-1"
                  />
                  <span
                    v-else
                    class="text-base sm:text-lg md:text-xl font-bold text-gray-400"
                  >
                    {{
                      (
                        fixture.homeTeam?.customShortName ||
                        fixture.homeTeam?.customName ||
                        "H"
                      ).charAt(0)
                    }}
                  </span>
                </div>
                <span
                  class="text-[12px] sm:text-[13px] md:text-[15px] font-bold transition-colors max-w-full truncate px-1 sm:px-2"
                  :class="isDark ? 'text-white' : 'text-gray-900'"
                >
                  {{
                    fixture.homeTeam?.customShortName ||
                    fixture.homeTeam?.customName ||
                    fixture.homeTeamPlaceholder ||
                    "TBD"
                  }}
                </span>
              </div>

              <!-- Score Center -->
              <div
                class="flex-shrink-0 min-w-[5rem] sm:min-w-[7rem] md:min-w-[10rem] flex flex-col items-center justify-center px-1 sm:px-2"
              >
                <template v-if="isLive || isCompleted">
                  <div
                    class="flex items-center justify-center gap-1.5 sm:gap-2 md:gap-3 mb-1"
                  >
                    <span
                      class="text-[24px] sm:text-[32px] md:text-[40px] font-bold tracking-tight leading-none transition-colors whitespace-nowrap"
                      :class="isDark ? 'text-white' : 'text-gray-900'"
                    >
                      {{ fixture.homeScore ?? 0 }}
                      <span class="text-gray-500 font-normal mx-1">-</span>
                      {{ fixture.awayScore ?? 0 }}
                    </span>
                  </div>
                  <div
                    class="text-[11px] sm:text-[13px] font-medium text-gray-400 mt-1 flex items-center justify-center gap-1.5"
                  >
                    <template v-if="isLive">
                      <span
                        class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-500 animate-pulse"
                      ></span>
                      <span class="text-red-400">{{
                        liveMinuteLabel || "Live"
                      }}</span>
                    </template>
                    <span v-else>Full time</span>
                  </div>
                  <div
                    v-if="hasPenalties"
                    class="text-[10px] sm:text-[11px] text-gray-500 mt-1"
                  >
                    ({{ fixture.homePenaltyScore ?? 0 }} -
                    {{ fixture.awayPenaltyScore ?? 0 }} pens)
                  </div>
                </template>
                <template
                  v-else-if="fixture.status === FixtureStatus.CANCELLED"
                >
                  <span
                    class="text-[24px] sm:text-[32px] md:text-[40px] font-bold tracking-tight leading-none transition-colors"
                    :class="isDark ? 'text-white' : 'text-gray-900'"
                    >-</span
                  >
                  <span
                    class="text-[11px] sm:text-[13px] font-medium text-red-400 mt-2"
                    >Cancelled</span
                  >
                </template>
                <template v-else>
                  <span
                    v-if="fixture.startTime"
                    class="text-lg sm:text-xl md:text-2xl font-bold block mb-1 transition-colors"
                    :class="isDark ? 'text-white' : 'text-gray-900'"
                  >
                    {{ formatTime(fixture.startTime) }}
                  </span>
                  <span
                    v-else
                    class="text-[24px] sm:text-[32px] font-bold text-gray-600 block mb-1"
                    >-</span
                  >
                  <span
                    v-if="fixture.startTime"
                    class="text-[9px] sm:text-[10px] md:text-[12px] text-gray-400 block text-center"
                  >
                    {{ formatFullDate(fixture.startTime) }}
                  </span>
                </template>
              </div>

              <!-- Away Team -->
              <div
                class="flex-1 flex flex-col items-center text-center min-w-0"
              >
                <div
                  class="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-full overflow-hidden mb-2 sm:mb-2.5 flex-shrink-0 flex items-center justify-center ring-1 ring-white/10"
                  :class="isDark ? 'bg-white/5' : 'bg-gray-100 ring-gray-200'"
                >
                  <img
                    v-if="fixture.awayTeam?.logoUrl"
                    :src="fixture.awayTeam.logoUrl"
                    class="w-full h-full object-cover p-1"
                  />
                  <span
                    v-else
                    class="text-base sm:text-lg md:text-xl font-bold text-gray-400"
                  >
                    {{
                      (
                        fixture.awayTeam?.customShortName ||
                        fixture.awayTeam?.customName ||
                        "A"
                      ).charAt(0)
                    }}
                  </span>
                </div>
                <span
                  class="text-[12px] sm:text-[13px] md:text-[15px] font-bold transition-colors max-w-full truncate px-1 sm:px-2"
                  :class="isDark ? 'text-white' : 'text-gray-900'"
                >
                  {{
                    fixture.awayTeam?.customShortName ||
                    fixture.awayTeam?.customName ||
                    fixture.awayTeamPlaceholder ||
                    "TBD"
                  }}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="max-w-3xl mx-auto px-3 sm:px-4 md:px-6 mt-2 sm:mt-4">
          <nav
            class="flex gap-4 sm:gap-6 border-b transition-colors"
            :class="isDark ? 'border-white/[0.08]' : 'border-gray-200'"
          >
            <button
              @click="activeTab = 'events'"
              class="pb-2 sm:pb-3 text-xs sm:text-sm font-medium border-b-2 transition-colors duration-200"
              :class="
                activeTab === 'events'
                  ? 'border-emerald-500 text-emerald-400'
                  : tabInactiveClass
              "
            >
              Match Events
            </button>
            <button
              @click="activeTab = 'info'"
              class="pb-2 sm:pb-3 text-xs sm:text-sm font-medium border-b-2 transition-colors duration-200"
              :class="
                activeTab === 'info'
                  ? 'border-emerald-500 text-emerald-400'
                  : tabInactiveClass
              "
            >
              Match Info
            </button>
            <button
              @click="activeTab = 'lineups'"
              class="pb-2 sm:pb-3 text-xs sm:text-sm font-medium border-b-2 transition-colors duration-200"
              :class="
                activeTab === 'lineups'
                  ? 'border-emerald-500 text-emerald-400'
                  : tabInactiveClass
              "
            >
              Lineups
            </button>
            <button
              @click="activeTab = 'highlights'"
              class="pb-2 sm:pb-3 text-xs sm:text-sm font-medium border-b-2 transition-colors duration-200"
              :class="
                activeTab === 'highlights'
                  ? 'border-emerald-500 text-emerald-400'
                  : tabInactiveClass
              "
            >
              Highlights
              <span
                v-if="highlights.length > 0"
                class="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                >{{ highlights.length }}</span
              >
            </button>
          </nav>
        </div>
      </section>

      <!-- Livestream -->
      <section
        v-if="fixture.livestreamUrl"
        class="max-w-3xl mx-auto px-3 sm:px-4 md:px-6 -mt-2 sm:mt-0 mb-4 sm:mb-6"
      >
        <LivestreamEmbed :fixture="fixture" />
      </section>

      <!-- Match Details Content -->
      <section class="max-w-3xl mx-auto px-3 py-6 md:px-4 md:py-8">
        <!-- Match Events Tab -->
        <div v-show="activeTab === 'events'">
          <!-- Player of the Match -->
          <div
            v-if="manOfTheMatch"
            class="mb-3 md:mb-6 border rounded-xl overflow-hidden"
            :class="
              isDark
                ? 'bg-[#1a1a1a] border-white/[0.06]'
                : 'bg-white border-gray-200 shadow-sm'
            "
          >
            <div class="px-3 py-2.5 md:px-5 md:py-4">
              <h3
                class="text-[13px] md:text-[14px] font-bold mb-2 md:mb-4 text-center"
                :class="isDark ? 'text-white' : 'text-gray-900'"
              >
                Player of the Match
              </h3>
              <div class="flex items-center gap-2 md:gap-3">
                <UAvatar
                  :src="manOfTheMatch.avatarUrl || undefined"
                  :alt="manOfTheMatch.name"
                  size="sm"
                  class="shrink-0"
                  :class="isDark ? 'bg-white/10' : 'bg-gray-100'"
                />
                <div class="flex-1 min-w-0">
                  <p
                    class="text-xs md:text-sm font-semibold truncate"
                    :class="isDark ? 'text-white' : 'text-gray-900'"
                  >
                    {{ manOfTheMatch.name }}
                  </p>
                  <div class="flex items-center gap-1.5">
                    <img
                      v-if="
                        (manOfTheMatch.participant as any)?.logoUrl ||
                        (manOfTheMatch.participant as any)?.team?.logoUrl
                      "
                      :src="
                        (manOfTheMatch.participant as any)?.logoUrl ||
                        (manOfTheMatch.participant as any)?.team?.logoUrl
                      "
                      :alt="teamName"
                      class="shrink-0 w-3 h-3 md:w-4 md:h-4 rounded-full object-cover"
                    />
                    <p
                      class="text-[11px] md:text-xs truncate"
                      :class="isDark ? 'text-gray-400' : 'text-gray-500'"
                    >
                      {{ teamName }}
                    </p>
                  </div>
                </div>
                <div
                  class="shrink-0 flex items-center gap-1 px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-[10px] md:text-xs font-semibold bg-blue-500 text-white"
                >
                  <UIcon
                    name="i-heroicons-star"
                    class="w-3 h-3 md:w-3.5 md:h-3.5"
                  />
                </div>
              </div>
            </div>
          </div>
          <div
            v-if="groupedTimelineEvents.length > 0"
            :class="
              isDark
                ? 'bg-[#1a1a1a] border-white/[0.06]'
                : 'bg-white border-gray-200 shadow-sm'
            "
            class="border rounded-xl overflow-hidden relative pb-8 md:pb-10"
          >
            <div class="px-2 md:px-5 py-3 md:py-6 flex flex-col items-center">
              <h3
                class="text-[13px] md:text-[14px] font-bold mb-4 md:mb-8 relative z-10 z-[1]"
                :class="isDark ? 'text-white' : 'text-gray-900'"
              >
                Events
              </h3>

              <!-- Center Line (Removed) -->

              <div class="w-full flex flex-col relative z-10">
                <div
                  v-for="group in groupedTimelineEvents"
                  :key="group.half"
                  class="w-full"
                >
                  <div
                    class="sticky top-0 z-20 text-center py-2 my-1 text-[11px] font-bold uppercase tracking-wider"
                    :class="
                      isDark
                        ? 'text-gray-400 bg-[#1a1a1a]/95'
                        : 'text-gray-500 bg-white/95'
                    "
                  >
                    {{ group.label }}
                  </div>
                  <div
                    v-if="group.half === MatchHalf.PENALTY_SHOOTOUT"
                    class="flex items-center justify-center gap-4 md:gap-8 py-3 mb-2"
                  >
                    <div
                      class="flex flex-wrap items-center justify-center gap-1.5 md:gap-2 max-w-[45%]"
                    >
                      <div
                        v-for="n in maxPenaltyRounds"
                        :key="`home-${n}`"
                        class="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold"
                        :class="
                          homePenaltyShootoutEvents[n - 1]?.type === 'PENALTY'
                            ? 'bg-emerald-500 text-white'
                            : homePenaltyShootoutEvents[n - 1]
                              ? 'bg-red-500 text-white'
                              : 'bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                        "
                      >
                        <UIcon
                          v-if="
                            homePenaltyShootoutEvents[n - 1]?.type === 'PENALTY'
                          "
                          name="i-heroicons-check"
                          class="w-3 h-3 sm:w-3.5 sm:h-3.5"
                        />
                        <UIcon
                          v-else-if="homePenaltyShootoutEvents[n - 1]"
                          name="i-heroicons-x-mark"
                          class="w-3 h-3 sm:w-3.5 sm:h-3.5"
                        />
                        <span v-else>{{ n }}</span>
                      </div>
                    </div>
                    <div class="w-px h-6 bg-gray-300 dark:bg-white/10" />
                    <div
                      class="flex flex-wrap items-center justify-center gap-1.5 md:gap-2 max-w-[45%]"
                    >
                      <div
                        v-for="n in maxPenaltyRounds"
                        :key="`away-${n}`"
                        class="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold"
                        :class="
                          awayPenaltyShootoutEvents[n - 1]?.type === 'PENALTY'
                            ? 'bg-emerald-500 text-white'
                            : awayPenaltyShootoutEvents[n - 1]
                              ? 'bg-red-500 text-white'
                              : 'bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                        "
                      >
                        <UIcon
                          v-if="
                            awayPenaltyShootoutEvents[n - 1]?.type === 'PENALTY'
                          "
                          name="i-heroicons-check"
                          class="w-3 h-3 sm:w-3.5 sm:h-3.5"
                        />
                        <UIcon
                          v-else-if="awayPenaltyShootoutEvents[n - 1]"
                          name="i-heroicons-x-mark"
                          class="w-3 h-3 sm:w-3.5 sm:h-3.5"
                        />
                        <span v-else>{{ n }}</span>
                      </div>
                    </div>
                  </div>
                  <div
                    v-for="(event, index) in group.events"
                    :key="event.id"
                    class="flex w-full items-center group transition-opacity duration-300 py-3 md:py-4 border-b last:border-b-0"
                    :class="isDark ? 'border-white/[0.06]' : 'border-gray-100'"
                  >
                    <!-- Left Side (Home) -->
                    <div
                      class="flex-1 flex justify-start md:justify-end text-right md:w-1/2 min-w-0"
                      :class="
                        isHomeEvent(event)
                          ? 'order-2 md:order-1'
                          : 'hidden md:flex order-1'
                      "
                    >
                      <div
                        v-if="isHomeEvent(event)"
                        class="flex items-center gap-2 md:gap-3 min-w-0"
                      >
                        <div
                          class="flex flex-col items-start md:items-end justify-center min-w-0"
                        >
                          <div
                            class="flex items-center gap-1.5 flex-row md:flex-row-reverse min-w-0"
                          >
                            <!-- Event Icon (Left side has it on the right closest to center) -->
                            <div
                              class="flex-shrink-0 w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"
                            >
                              <IconsSoccerBallIcon
                                v-if="
                                  ['GOAL', 'PENALTY', 'OWN_GOAL'].includes(
                                    event.type,
                                  )
                                "
                                class="w-3 h-3 md:w-5 md:h-5"
                                :class="
                                  event.type === 'OWN_GOAL'
                                    ? 'text-red-500'
                                    : isDark
                                      ? 'text-white'
                                      : 'text-gray-900'
                                "
                              />
                              <div
                                v-else-if="event.type === 'YELLOW_CARD'"
                                class="w-2.5 h-[11px] md:w-3.5 md:h-[18px] bg-yellow-400 rounded-[2px] shadow-sm"
                              ></div>
                              <div
                                v-else-if="event.type === 'RED_CARD'"
                                class="w-2.5 h-[11px] md:w-3.5 md:h-[18px] bg-red-500 rounded-[2px] shadow-sm"
                              ></div>
                              <div
                                v-else-if="event.type === 'SUBSTITUTION'"
                                class="flex items-center justify-center"
                              >
                                <UIcon
                                  name="i-heroicons-arrows-right-left"
                                  class="w-3 h-3 md:w-5 md:h-5 text-gray-400 transform rotate-90"
                                />
                              </div>
                              <IconsAssistIcon
                                v-else-if="event.type === 'ASSIST'"
                                class="w-3 h-3 md:w-5 md:h-5 text-gray-400"
                              />
                              <span v-else class="text-[10px] md:text-sm">{{
                                getEventIcon(event.type)
                              }}</span>
                            </div>

                            <!-- Event Details -->
                            <div
                              class="flex flex-col items-start md:items-end min-w-0"
                            >
                              <p
                                class="text-[12px] md:text-[14px] font-semibold tracking-tight transition-colors flex flex-wrap justify-start md:justify-end md:items-center gap-1 md:gap-1.5"
                                :class="isDark ? 'text-white' : 'text-gray-900'"
                              >
                                <span
                                  v-if="event.type === 'SUBSTITUTION'"
                                  class="text-emerald-500 break-all min-w-0"
                                  >{{ event.player?.name || "Player In" }}</span
                                >
                                <span
                                  v-else
                                  class="break-all min-w-0 text-left md:text-right"
                                >
                                  {{
                                    event.player?.name ||
                                    event.participant?.customName ||
                                    getEventLabel(event.type)
                                  }}
                                  <span
                                    v-if="event.type === 'PENALTY'"
                                    class="text-xs text-gray-400 font-normal ml-0.5"
                                    >(P)</span
                                  >
                                  <span
                                    v-if="event.type === 'MISSED_PENALTY'"
                                    class="text-xs text-red-500 font-normal ml-0.5"
                                    >(Missed)</span
                                  >
                                  <span
                                    v-if="event.type === 'PENALTY_SAVE'"
                                    class="text-xs text-amber-500 font-normal ml-0.5"
                                    >(Saved)</span
                                  >
                                  <span
                                    v-if="event.type === 'OWN_GOAL'"
                                    class="text-xs text-red-500 font-normal ml-0.5"
                                    >(OG)</span
                                  >
                                </span>

                                <!-- Score after goal -->
                                <span
                                  v-if="
                                    ['GOAL', 'PENALTY', 'OWN_GOAL'].includes(
                                      event.type,
                                    ) && event.scoreAtTime
                                  "
                                  class="text-gray-500 ml-1"
                                >
                                  (<span
                                    :class="
                                      event.scoringTeam === 'home'
                                        ? 'text-emerald-500'
                                        : ''
                                    "
                                    >{{ event.currentHomeScore }}</span
                                  >
                                  -
                                  <span
                                    :class="
                                      event.scoringTeam === 'away'
                                        ? 'text-emerald-500'
                                        : ''
                                    "
                                    >{{ event.currentAwayScore }}</span
                                  >)
                                </span>
                              </p>

                              <!-- Subtitle / Assist / Sub Out -->
                              <p
                                v-if="event.type === 'SUBSTITUTION'"
                                class="text-[10px] md:text-[12px] text-red-500 font-medium tracking-tight"
                              >
                                {{ event.relatedPlayer?.name || "Player Out" }}
                              </p>
                              <p
                                v-else-if="
                                  ['GOAL', 'PENALTY'].includes(event.type) &&
                                  event.relatedPlayer
                                "
                                class="text-[11px] md:text-[13px] text-gray-400/80 flex items-center gap-1"
                              >
                                assist by {{ event.relatedPlayer.name }}
                              </p>
                              <p
                                v-else-if="
                                  event.type === 'PENALTY_SAVE' &&
                                  event.relatedPlayer
                                "
                                class="text-[11px] md:text-[13px] text-gray-400/80 flex items-center gap-1"
                              >
                                penalty by {{ event.relatedPlayer.name }}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Center Minute Bubble -->
                    <div
                      class="flex-shrink-0 md:w-12 flex justify-center items-center relative md:mx-0"
                      :class="
                        isHomeEvent(event)
                          ? 'order-1 md:order-2 w-6 mr-1.5 md:mr-0'
                          : 'order-2 md:order-2 w-6 ml-1.5 md:ml-0'
                      "
                    >
                      <div
                        class="flex items-center justify-center text-[11px] md:text-[11px] font-bold z-10 transition-colors md:rounded-full md:w-8 md:h-8 md:shadow-sm"
                        :class="
                          isDark
                            ? 'text-gray-400 md:bg-white/10 md:text-gray-300 md:ring-1 md:ring-white/20'
                            : 'text-gray-500 md:bg-gray-100 md:text-gray-600 md:ring-1 md:ring-gray-200'
                        "
                      >
                        <span v-if="getEventMinuteDisplay(event)">{{
                          getEventMinuteDisplay(event)
                        }}</span>
                        <span v-else class="text-[10px] md:text-xs">
                          <UIcon
                            name="i-heroicons-clock"
                            class="w-3 h-3 md:w-3.5 md:h-3.5"
                          />
                        </span>
                      </div>
                    </div>

                    <!-- Right Side (Away) -->
                    <div
                      class="flex-1 flex justify-end md:justify-start text-left md:w-1/2 min-w-0"
                      :class="
                        !isHomeEvent(event)
                          ? 'order-1 md:order-3'
                          : 'hidden md:flex order-3'
                      "
                    >
                      <div
                        v-if="!isHomeEvent(event)"
                        class="flex items-center gap-1.5 md:gap-3 min-w-0"
                      >
                        <div
                          class="flex flex-col items-end md:items-start justify-center min-w-0"
                        >
                          <div
                            class="flex items-center gap-1.5 flex-row-reverse md:flex-row min-w-0"
                          >
                            <!-- Event Icon -->
                            <div
                              class="flex-shrink-0 w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"
                            >
                              <IconsSoccerBallIcon
                                v-if="
                                  ['GOAL', 'PENALTY', 'OWN_GOAL'].includes(
                                    event.type,
                                  )
                                "
                                class="w-3 h-3 md:w-5 md:h-5"
                                :class="
                                  event.type === 'OWN_GOAL'
                                    ? 'text-red-500'
                                    : isDark
                                      ? 'text-white'
                                      : 'text-gray-900'
                                "
                              />
                              <div
                                v-else-if="event.type === 'YELLOW_CARD'"
                                class="w-2.5 h-[11px] md:w-3.5 md:h-[18px] bg-yellow-400 rounded-[2px] shadow-sm"
                              ></div>
                              <div
                                v-else-if="event.type === 'RED_CARD'"
                                class="w-2.5 h-[11px] md:w-3.5 md:h-[18px] bg-red-500 rounded-[2px] shadow-sm"
                              ></div>
                              <div
                                v-else-if="event.type === 'SUBSTITUTION'"
                                class="flex items-center justify-center"
                              >
                                <UIcon
                                  name="i-heroicons-arrows-right-left"
                                  class="w-3 h-3 md:w-5 md:h-5 text-gray-400 transform rotate-90"
                                />
                              </div>
                              <IconsAssistIcon
                                v-else-if="event.type === 'ASSIST'"
                                class="w-3 h-3 md:w-5 md:h-5 text-gray-400"
                              />
                              <span v-else class="text-[10px] md:text-sm">{{
                                getEventIcon(event.type)
                              }}</span>
                            </div>

                            <!-- Event Details -->
                            <div
                              class="flex flex-col items-end md:items-start min-w-0"
                            >
                              <p
                                class="text-[12px] md:text-[14px] font-semibold tracking-tight transition-colors flex flex-wrap justify-end md:justify-start md:items-center gap-1 md:gap-1.5"
                                :class="isDark ? 'text-white' : 'text-gray-900'"
                              >
                                <span
                                  v-if="event.type === 'SUBSTITUTION'"
                                  class="text-emerald-500 break-all min-w-0"
                                  >{{ event.player?.name || "Player In" }}</span
                                >
                                <span
                                  v-else
                                  class="break-all min-w-0 text-right md:text-left"
                                >
                                  {{
                                    event.player?.name ||
                                    event.participant?.customName ||
                                    getEventLabel(event.type)
                                  }}
                                  <span
                                    v-if="event.type === 'PENALTY'"
                                    class="text-[10px] md:text-xs text-gray-400 font-normal ml-0.5"
                                    >(P)</span
                                  >
                                  <span
                                    v-if="event.type === 'MISSED_PENALTY'"
                                    class="text-[10px] md:text-xs text-red-500 font-normal ml-0.5"
                                    >(Missed)</span
                                  >
                                  <span
                                    v-if="event.type === 'PENALTY_SAVE'"
                                    class="text-[10px] md:text-xs text-amber-500 font-normal ml-0.5"
                                    >(Saved)</span
                                  >
                                  <span
                                    v-if="event.type === 'OWN_GOAL'"
                                    class="text-[10px] md:text-xs text-red-500 font-normal ml-0.5"
                                    >(OG)</span
                                  >
                                </span>

                                <!-- Score after goal -->
                                <span
                                  v-if="
                                    ['GOAL', 'PENALTY', 'OWN_GOAL'].includes(
                                      event.type,
                                    ) && event.scoreAtTime
                                  "
                                  class="text-gray-500 ml-1"
                                >
                                  (<span
                                    :class="
                                      event.scoringTeam === 'home'
                                        ? 'text-emerald-500'
                                        : ''
                                    "
                                    >{{ event.currentHomeScore }}</span
                                  >
                                  -
                                  <span
                                    :class="
                                      event.scoringTeam === 'away'
                                        ? 'text-emerald-500'
                                        : ''
                                    "
                                    >{{ event.currentAwayScore }}</span
                                  >)
                                </span>
                              </p>

                              <!-- Subtitle / Assist / Sub Out -->
                              <p
                                v-if="event.type === 'SUBSTITUTION'"
                                class="text-[10px] md:text-[12px] text-red-500 font-medium tracking-tight"
                              >
                                {{ event.relatedPlayer?.name || "Player Out" }}
                              </p>
                              <p
                                v-else-if="
                                  ['GOAL', 'PENALTY'].includes(event.type) &&
                                  event.relatedPlayer
                                "
                                class="text-[11px] md:text-[13px] text-gray-400/80 flex items-center gap-1"
                              >
                                assist by {{ event.relatedPlayer.name }}
                              </p>
                              <p
                                v-else-if="
                                  event.type === 'PENALTY_SAVE' &&
                                  event.relatedPlayer
                                "
                                class="text-[11px] md:text-[13px] text-gray-400/80 flex items-center gap-1"
                              >
                                penalty by {{ event.relatedPlayer.name }}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- End match fading effect at bottom -->
            <div
              class="absolute bottom-0 left-0 right-0 h-10 w-full"
              :class="
                isDark
                  ? 'bg-gradient-to-t from-[#1a1a1a] to-transparent'
                  : 'bg-gradient-to-t from-white to-transparent'
              "
            ></div>
          </div>

          <!-- No Events Message -->
          <div
            v-else
            :class="
              isDark
                ? 'bg-[#1a1a1a] border-white/[0.06]'
                : 'bg-white border-gray-200 shadow-sm'
            "
            class="border rounded-xl px-5 py-12 flex flex-col items-center justify-center"
          >
            <UIcon
              name="i-heroicons-clipboard-document-list"
              class="w-10 h-10 text-gray-400 mb-3 opacity-50"
            />
            <p class="text-sm font-medium text-gray-500">
              No match events recorded yet.
            </p>
          </div>
        </div>

        <!-- Lineups Tab -->
        <div v-show="activeTab === 'lineups'">
          <div
            v-if="!fixture.lineupPlayers || fixture.lineupPlayers.length === 0"
            :class="
              isDark
                ? 'bg-[#1a1a1a] border-white/[0.06]'
                : 'bg-white border-gray-200 shadow-sm'
            "
            class="border rounded-xl px-5 py-12 flex flex-col items-center justify-center"
          >
            <UIcon
              name="i-heroicons-users"
              class="w-10 h-10 text-gray-400 mb-3 opacity-50"
            />
            <p class="text-sm font-medium text-gray-500">
              No lineup announced yet.
            </p>
          </div>
          <div v-else class="flex flex-col gap-8 items-center w-full">
            <!-- Mobile Team Switcher Tabs -->
            <div class="md:hidden flex justify-center w-full">
              <div
                class="inline-flex bg-gray-100 dark:bg-white/[0.06] p-0.5 rounded-lg border border-gray-200 dark:border-white/[0.04] w-full max-w-[280px]"
              >
                <button
                  type="button"
                  class="flex-1 text-center py-1.5 px-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer min-w-0"
                  :class="
                    activeMobileLineupTeam === 'home'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  "
                  @click="activeMobileLineupTeam = 'home'"
                >
                  <img
                    v-if="fixture.homeTeam?.logoUrl"
                    :src="fixture.homeTeam.logoUrl"
                    class="w-3.5 h-3.5 object-contain flex-shrink-0"
                  />
                  <span class="truncate block min-w-0 flex-1 text-center">
                    {{
                      fixture.homeTeam?.customShortName ||
                      fixture.homeTeam?.customName ||
                      fixture.homeTeamPlaceholder ||
                      "Home Team"
                    }}
                  </span>
                </button>
                <button
                  type="button"
                  class="flex-1 text-center py-1.5 px-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer min-w-0"
                  :class="
                    activeMobileLineupTeam === 'away'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  "
                  @click="activeMobileLineupTeam = 'away'"
                >
                  <span class="truncate block min-w-0 flex-1 text-center">
                    {{
                      fixture.awayTeam?.customShortName ||
                      fixture.awayTeam?.customName ||
                      fixture.awayTeamPlaceholder ||
                      "Away Team"
                    }}
                  </span>
                  <img
                    v-if="fixture.awayTeam?.logoUrl"
                    :src="fixture.awayTeam.logoUrl"
                    class="w-3.5 h-3.5 object-contain flex-shrink-0"
                  />
                </button>
              </div>
            </div>

            <!-- Pitch/Substitutes Visuals (Formations Mode) -->
            <template v-if="fixture.homeFormation || fixture.awayFormation">
              <!-- Pitch Visuals -->
              <div
                class="flex flex-col md:flex-row gap-6 w-full justify-center items-center md:items-start"
              >
                <FormationPitch
                  v-if="fixture.homeFormation"
                  :players="homeLineup"
                  :formation="fixture.homeFormation"
                  :team-name="
                    fixture.homeTeam?.customShortName ||
                    fixture.homeTeam?.customName ||
                    fixture.homeTeamPlaceholder ||
                    'Home Team'
                  "
                  :team-logo-url="fixture.homeTeam?.logoUrl"
                  :is-dark="isDark"
                  :inverted="false"
                  :match-events="homeEvents"
                  :lineup-positions="fixture.lineupPositions"
                  :class="{
                    'hidden md:block': activeMobileLineupTeam !== 'home',
                  }"
                />
                <FormationPitch
                  v-if="fixture.awayFormation"
                  :players="awayLineup"
                  :formation="fixture.awayFormation"
                  :team-name="
                    fixture.awayTeam?.customShortName ||
                    fixture.awayTeam?.customName ||
                    fixture.awayTeamPlaceholder ||
                    'Away Team'
                  "
                  :team-logo-url="fixture.awayTeam?.logoUrl"
                  :is-dark="isDark"
                  :inverted="true"
                  :match-events="awayEvents"
                  :lineup-positions="fixture.lineupPositions"
                  :class="{
                    'hidden md:block': activeMobileLineupTeam !== 'away',
                  }"
                />
              </div>

              <!-- Substitutes -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                <!-- Home Substitutes -->
                <div
                  :class="[
                    isDark
                      ? 'bg-[#1a1a1a] border-white/[0.06]'
                      : 'bg-white border-gray-200 shadow-sm',
                    { 'hidden md:block': activeMobileLineupTeam !== 'home' },
                  ]"
                  class="border rounded-xl overflow-hidden self-start min-w-0"
                >
                  <div
                    class="px-5 py-3.5 border-b transition-colors flex items-center justify-between"
                    :class="isDark ? 'border-white/[0.06]' : 'border-gray-100'"
                  >
                    <h3
                      class="text-[12px] font-semibold uppercase tracking-wider text-gray-400 truncate pr-4"
                    >
                      {{
                        fixture.homeTeam?.customShortName ||
                        fixture.homeTeam?.customName ||
                        fixture.homeTeamPlaceholder ||
                        "Home Team"
                      }}
                      Substitutes
                    </h3>
                    <span
                      class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 whitespace-nowrap"
                      >Subs</span
                    >
                  </div>
                  <div
                    class="divide-y transition-colors"
                    :class="isDark ? 'divide-white/[0.04]' : 'divide-gray-100'"
                  >
                    <template v-if="homeSubs.length">
                      <NuxtLink
                        v-for="player in homeSubs"
                        :key="'sub-' + player.id"
                        :to="toMain(`/player/${player.id}`)"
                        :external="isManage"
                        class="flex items-center px-5 py-3 transition-colors cursor-pointer"
                        :class="
                          isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50'
                        "
                      >
                        <!-- Player Avatar -->
                        <div class="relative w-7 h-7 flex-shrink-0 mr-3">
                          <div
                            class="w-full h-full rounded-full overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 flex items-center justify-center"
                          >
                            <img
                              v-if="player.avatarUrl"
                              :src="player.avatarUrl"
                              class="w-full h-full object-cover"
                            />
                            <span
                              v-else
                              class="text-[10px] font-bold text-gray-400"
                              >{{ player.name.charAt(0) }}</span
                            >
                          </div>
                          <span
                            v-if="player.number"
                            class="absolute -bottom-0.5 -right-0.5 bg-gray-500 text-white text-[7px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white dark:border-[#1a1a1a] shadow-sm"
                          >
                            {{ player.number }}
                          </span>
                        </div>
                        <span
                          class="text-sm font-medium transition-colors flex-1 min-w-0 truncate pr-2"
                          :class="isDark ? 'text-gray-200' : 'text-gray-800'"
                          >{{ player.name }}</span
                        >
                        <div
                          v-if="
                            getPlayerGoals(player.id) > 0 ||
                            getPlayerAssists(player.id) > 0
                          "
                          class="flex items-center ml-2.5 z-10 text-white flex-shrink-0"
                        >
                          <div
                            v-if="getPlayerGoals(player.id) > 0"
                            class="flex items-center -space-x-1.5"
                          >
                            <div
                              v-for="i in getPlayerGoals(player.id)"
                              :key="'goal-' + i"
                              class="w-[14px] h-[14px] flex items-center justify-center rounded-full relative text-[10px]"
                              :class="
                                isDark
                                  ? 'ring-1 ring-gray-900 bg-gray-900'
                                  : 'ring-1 ring-white bg-white text-gray-900'
                              "
                            >
                              <IconsSoccerBallIcon class="w-[10px] h-[10px]" />
                            </div>
                          </div>
                          <div
                            v-if="getPlayerAssists(player.id) > 0"
                            class="flex items-center -space-x-1.5"
                            :class="{ 'ml-1': getPlayerGoals(player.id) > 0 }"
                          >
                            <div
                              v-for="i in getPlayerAssists(player.id)"
                              :key="'assist-' + i"
                              class="w-[14px] h-[14px] flex items-center justify-center rounded-full relative text-[10px]"
                              :class="
                                isDark
                                  ? 'ring-1 ring-gray-900 bg-gray-900'
                                  : 'ring-1 ring-white bg-white text-emerald-400'
                              "
                            >
                              <IconsAssistIcon class="w-[10px] h-[10px]" />
                            </div>
                          </div>
                        </div>
                        <span
                          v-if="player.position"
                          class="ml-auto flex-shrink-0 pl-3 text-[11px] font-medium uppercase tracking-wider text-gray-400"
                          >{{ player.position.split("-")[0] }}</span
                        >
                      </NuxtLink>
                    </template>
                    <div v-else class="px-5 py-8 text-center">
                      <p class="text-sm text-gray-500">
                        No substitutes listed.
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Away Substitutes -->
                <div
                  :class="[
                    isDark
                      ? 'bg-[#1a1a1a] border-white/[0.06]'
                      : 'bg-white border-gray-200 shadow-sm',
                    { 'hidden md:block': activeMobileLineupTeam !== 'away' },
                  ]"
                  class="border rounded-xl overflow-hidden self-start min-w-0"
                >
                  <div
                    class="px-5 py-3.5 border-b transition-colors flex items-center justify-between"
                    :class="isDark ? 'border-white/[0.06]' : 'border-gray-100'"
                  >
                    <h3
                      class="text-[12px] font-semibold uppercase tracking-wider text-gray-400 truncate pr-4"
                    >
                      {{
                        fixture.awayTeam?.customShortName ||
                        fixture.awayTeam?.customName ||
                        fixture.awayTeamPlaceholder ||
                        "Away Team"
                      }}
                      Substitutes
                    </h3>
                    <span
                      class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 whitespace-nowrap"
                      >Subs</span
                    >
                  </div>
                  <div
                    class="divide-y transition-colors"
                    :class="isDark ? 'divide-white/[0.04]' : 'divide-gray-100'"
                  >
                    <template v-if="awaySubs.length">
                      <NuxtLink
                        v-for="player in awaySubs"
                        :key="'sub-' + player.id"
                        :to="toMain(`/player/${player.id}`)"
                        :external="isManage"
                        class="flex items-center px-5 py-3 transition-colors cursor-pointer"
                        :class="
                          isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50'
                        "
                      >
                        <!-- Player Avatar -->
                        <div class="relative w-7 h-7 flex-shrink-0 mr-3">
                          <div
                            class="w-full h-full rounded-full overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 flex items-center justify-center"
                          >
                            <img
                              v-if="player.avatarUrl"
                              :src="player.avatarUrl"
                              class="w-full h-full object-cover"
                            />
                            <span
                              v-else
                              class="text-[10px] font-bold text-gray-400"
                              >{{ player.name.charAt(0) }}</span
                            >
                          </div>
                          <span
                            v-if="player.number"
                            class="absolute -bottom-0.5 -right-0.5 bg-gray-500 text-white text-[7px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white dark:border-[#1a1a1a] shadow-sm"
                          >
                            {{ player.number }}
                          </span>
                        </div>
                        <span
                          class="text-sm font-medium transition-colors flex-1 min-w-0 truncate pr-2"
                          :class="isDark ? 'text-gray-200' : 'text-gray-800'"
                          >{{ player.name }}</span
                        >
                        <div
                          v-if="
                            getPlayerGoals(player.id) > 0 ||
                            getPlayerAssists(player.id) > 0
                          "
                          class="flex items-center ml-2.5 z-10 text-white flex-shrink-0"
                        >
                          <div
                            v-if="getPlayerGoals(player.id) > 0"
                            class="flex items-center -space-x-1.5"
                          >
                            <div
                              v-for="i in getPlayerGoals(player.id)"
                              :key="'goal-' + i"
                              class="w-[14px] h-[14px] flex items-center justify-center rounded-full relative text-[10px]"
                              :class="
                                isDark
                                  ? 'ring-1 ring-gray-900 bg-gray-900'
                                  : 'ring-1 ring-white bg-white text-gray-900'
                              "
                            >
                              <IconsSoccerBallIcon class="w-[10px] h-[10px]" />
                            </div>
                          </div>
                          <div
                            v-if="getPlayerAssists(player.id) > 0"
                            class="flex items-center -space-x-1.5"
                            :class="{ 'ml-1': getPlayerGoals(player.id) > 0 }"
                          >
                            <div
                              v-for="i in getPlayerAssists(player.id)"
                              :key="'assist-' + i"
                              class="w-[14px] h-[14px] flex items-center justify-center rounded-full relative text-[10px]"
                              :class="
                                isDark
                                  ? 'ring-1 ring-gray-900 bg-gray-900'
                                  : 'ring-1 ring-white bg-white text-emerald-400'
                              "
                            >
                              <IconsAssistIcon class="w-[10px] h-[10px]" />
                            </div>
                          </div>
                        </div>
                        <span
                          v-if="player.position"
                          class="ml-auto flex-shrink-0 pl-3 text-[11px] font-medium uppercase tracking-wider text-gray-400"
                          >{{ player.position.split("-")[0] }}</span
                        >
                      </NuxtLink>
                    </template>
                    <div v-else class="px-5 py-8 text-center">
                      <p class="text-sm text-gray-500">
                        No substitutes listed.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              <!-- Home Team Players -->
              <div
                :class="[
                  isDark
                    ? 'bg-[#1a1a1a] border-white/[0.06]'
                    : 'bg-white border-gray-200 shadow-sm',
                  { 'hidden md:block': activeMobileLineupTeam !== 'home' },
                ]"
                class="border rounded-xl overflow-hidden self-start min-w-0"
              >
                <div
                  class="px-5 py-3.5 border-b transition-colors flex items-center justify-between"
                  :class="isDark ? 'border-white/[0.06]' : 'border-gray-100'"
                >
                  <h3
                    class="text-[12px] font-semibold uppercase tracking-wider text-gray-400 truncate pr-4"
                  >
                    {{
                      fixture.homeTeam?.customShortName ||
                      fixture.homeTeam?.customName ||
                      fixture.homeTeamPlaceholder ||
                      "Home Team"
                    }}
                  </h3>
                  <span
                    class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap"
                    >Lineup</span
                  >
                </div>
                <div
                  class="divide-y transition-colors"
                  :class="isDark ? 'divide-white/[0.04]' : 'divide-gray-100'"
                >
                  <template v-if="homeLineup.length">
                    <NuxtLink
                      v-for="player in homeLineup"
                      :key="player.id"
                      :to="toMain(`/player/${player.id}`)"
                      :external="isManage"
                      class="flex items-center px-5 py-3 transition-colors cursor-pointer"
                      :class="
                        isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50'
                      "
                    >
                      <!-- Player Avatar Wrapper -->
                      <div class="relative w-7 h-7 flex-shrink-0 mr-3">
                        <!-- Cropped Avatar Container -->
                        <div
                          class="w-full h-full rounded-full overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 flex items-center justify-center"
                        >
                          <img
                            v-if="player.avatarUrl"
                            :src="player.avatarUrl"
                            class="w-full h-full object-cover"
                          />
                          <span
                            v-else
                            class="text-[10px] font-bold text-gray-400"
                          >
                            {{ player.name.charAt(0) }}
                          </span>
                        </div>
                        <!-- Shirt Number Badge -->
                        <span
                          v-if="player.number"
                          class="absolute -bottom-0.5 -right-0.5 bg-gray-500 text-white text-[7px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white dark:border-[#1a1a1a] shadow-sm"
                        >
                          {{ player.number }}
                        </span>
                      </div>
                      <div
                        class="flex items-center gap-1.5 flex-1 min-w-0 pr-2"
                      >
                        <span
                          class="text-sm font-medium transition-colors truncate"
                          :class="isDark ? 'text-gray-200' : 'text-gray-800'"
                          :title="player.name"
                          >{{ player.name }}</span
                        >
                        <UIcon
                          v-if="player.userId && player.status === 'APPROVED'"
                          name="i-heroicons-check-badge-solid"
                          class="w-3.5 h-3.5 text-blue-500 shrink-0"
                          title="Claimed & Verified Player"
                        />
                      </div>
                      <div
                        v-if="
                          getPlayerGoals(player.id) > 0 ||
                          getPlayerAssists(player.id) > 0
                        "
                        class="flex items-center ml-2.5 z-10 text-white flex-shrink-0"
                      >
                        <div
                          v-if="getPlayerGoals(player.id) > 0"
                          class="flex items-center -space-x-1.5"
                        >
                          <div
                            v-for="i in getPlayerGoals(player.id)"
                            :key="'goal-' + i"
                            class="w-[14px] h-[14px] flex items-center justify-center rounded-full relative text-[10px]"
                            :class="
                              isDark
                                ? 'ring-1 ring-gray-900 bg-gray-900'
                                : 'ring-1 ring-white bg-white text-gray-900'
                            "
                          >
                            <IconsSoccerBallIcon class="w-[10px] h-[10px]" />
                          </div>
                        </div>
                        <div
                          v-if="getPlayerAssists(player.id) > 0"
                          class="flex items-center -space-x-1.5"
                          :class="{ 'ml-1': getPlayerGoals(player.id) > 0 }"
                        >
                          <div
                            v-for="i in getPlayerAssists(player.id)"
                            :key="'assist-' + i"
                            class="w-[14px] h-[14px] flex items-center justify-center rounded-full relative text-[10px]"
                            :class="
                              isDark
                                ? 'ring-1 ring-gray-900 bg-gray-900'
                                : 'ring-1 ring-white bg-white text-emerald-400'
                            "
                          >
                            <IconsAssistIcon class="w-[10px] h-[10px]" />
                          </div>
                        </div>
                      </div>
                      <span
                        v-if="player.position"
                        class="ml-auto flex-shrink-0 pl-3 text-[11px] font-medium uppercase tracking-wider text-gray-400"
                        >{{ player.position.split("-")[0] }}</span
                      >
                    </NuxtLink>
                  </template>
                  <div v-else class="px-5 py-8 text-center">
                    <p class="text-sm text-gray-500">
                      No players listed in lineup.
                    </p>
                  </div>

                  <!-- Home Substitutes -->
                  <template v-if="homeSubs.length">
                    <div
                      class="px-5 py-2 bg-gray-50 dark:bg-white/[0.02] border-t border-b transition-colors flex items-center justify-between"
                      :class="
                        isDark ? 'border-white/[0.04]' : 'border-gray-100'
                      "
                    >
                      <span
                        class="text-[11px] font-bold uppercase tracking-wider text-gray-400"
                        >Substitutes</span
                      >
                      <span
                        class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 whitespace-nowrap"
                        >Subs</span
                      >
                    </div>
                    <NuxtLink
                      v-for="player in homeSubs"
                      :key="'sub-' + player.id"
                      :to="toMain(`/player/${player.id}`)"
                      :external="isManage"
                      class="flex items-center px-5 py-3 transition-colors cursor-pointer"
                      :class="
                        isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50'
                      "
                    >
                      <!-- Player Avatar Wrapper -->
                      <div class="relative w-7 h-7 flex-shrink-0 mr-3">
                        <!-- Cropped Avatar Container -->
                        <div
                          class="w-full h-full rounded-full overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 flex items-center justify-center"
                        >
                          <img
                            v-if="player.avatarUrl"
                            :src="player.avatarUrl"
                            class="w-full h-full object-cover"
                          />
                          <span
                            v-else
                            class="text-[10px] font-bold text-gray-400"
                          >
                            {{ player.name.charAt(0) }}
                          </span>
                        </div>
                        <!-- Shirt Number Badge -->
                        <span
                          v-if="player.number"
                          class="absolute -bottom-0.5 -right-0.5 bg-gray-500 text-white text-[7px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white dark:border-[#1a1a1a] shadow-sm"
                        >
                          {{ player.number }}
                        </span>
                      </div>
                      <div
                        class="flex items-center gap-1.5 flex-1 min-w-0 pr-2"
                      >
                        <span
                          class="text-sm font-medium transition-colors truncate"
                          :class="isDark ? 'text-gray-200' : 'text-gray-800'"
                          :title="player.name"
                          >{{ player.name }}</span
                        >
                        <UIcon
                          v-if="player.userId && player.status === 'APPROVED'"
                          name="i-heroicons-check-badge-solid"
                          class="w-3.5 h-3.5 text-blue-500 shrink-0"
                          title="Claimed & Verified Player"
                        />
                      </div>
                      <div
                        v-if="
                          getPlayerGoals(player.id) > 0 ||
                          getPlayerAssists(player.id) > 0
                        "
                        class="flex items-center ml-2.5 z-10 text-white flex-shrink-0"
                      >
                        <div
                          v-if="getPlayerGoals(player.id) > 0"
                          class="flex items-center -space-x-1.5"
                        >
                          <div
                            v-for="i in getPlayerGoals(player.id)"
                            :key="'goal-' + i"
                            class="w-[14px] h-[14px] flex items-center justify-center rounded-full relative text-[10px]"
                            :class="
                              isDark
                                ? 'ring-1 ring-gray-900 bg-gray-900'
                                : 'ring-1 ring-white bg-white text-gray-900'
                            "
                          >
                            <IconsSoccerBallIcon class="w-[10px] h-[10px]" />
                          </div>
                        </div>
                        <div
                          v-if="getPlayerAssists(player.id) > 0"
                          class="flex items-center -space-x-1.5"
                          :class="{ 'ml-1': getPlayerGoals(player.id) > 0 }"
                        >
                          <div
                            v-for="i in getPlayerAssists(player.id)"
                            :key="'assist-' + i"
                            class="w-[14px] h-[14px] flex items-center justify-center rounded-full relative text-[10px]"
                            :class="
                              isDark
                                ? 'ring-1 ring-gray-900 bg-gray-900'
                                : 'ring-1 ring-white bg-white text-emerald-400'
                            "
                          >
                            <IconsAssistIcon class="w-[10px] h-[10px]" />
                          </div>
                        </div>
                      </div>
                      <span
                        v-if="player.position"
                        class="ml-auto flex-shrink-0 pl-3 text-[11px] font-medium uppercase tracking-wider text-gray-400"
                        >{{ player.position.split("-")[0] }}</span
                      >
                    </NuxtLink>
                  </template>
                </div>
              </div>

              <!-- Away Team Players -->
              <div
                :class="[
                  isDark
                    ? 'bg-[#1a1a1a] border-white/[0.06]'
                    : 'bg-white border-gray-200 shadow-sm',
                  { 'hidden md:block': activeMobileLineupTeam !== 'away' },
                ]"
                class="border rounded-xl overflow-hidden self-start min-w-0"
              >
                <div
                  class="px-5 py-3.5 border-b transition-colors flex items-center justify-between"
                  :class="isDark ? 'border-white/[0.06]' : 'border-gray-100'"
                >
                  <h3
                    class="text-[12px] font-semibold uppercase tracking-wider text-gray-400 truncate pr-4"
                  >
                    {{
                      fixture.awayTeam?.customShortName ||
                      fixture.awayTeam?.customName ||
                      fixture.awayTeamPlaceholder ||
                      "Away Team"
                    }}
                  </h3>
                  <span
                    class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap"
                    >Lineup</span
                  >
                </div>
                <div
                  class="divide-y transition-colors"
                  :class="isDark ? 'divide-white/[0.04]' : 'divide-gray-100'"
                >
                  <template v-if="awayLineup.length">
                    <NuxtLink
                      v-for="player in awayLineup"
                      :key="player.id"
                      :to="toMain(`/player/${player.id}`)"
                      :external="isManage"
                      class="flex items-center px-5 py-3 transition-colors cursor-pointer"
                      :class="
                        isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50'
                      "
                    >
                      <!-- Player Avatar Wrapper -->
                      <div class="relative w-7 h-7 flex-shrink-0 mr-3">
                        <!-- Cropped Avatar Container -->
                        <div
                          class="w-full h-full rounded-full overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 flex items-center justify-center"
                        >
                          <img
                            v-if="player.avatarUrl"
                            :src="player.avatarUrl"
                            class="w-full h-full object-cover"
                          />
                          <span
                            v-else
                            class="text-[10px] font-bold text-gray-400"
                          >
                            {{ player.name.charAt(0) }}
                          </span>
                        </div>
                        <!-- Shirt Number Badge -->
                        <span
                          v-if="player.number"
                          class="absolute -bottom-0.5 -right-0.5 bg-gray-500 text-white text-[7px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white dark:border-[#1a1a1a] shadow-sm"
                        >
                          {{ player.number }}
                        </span>
                      </div>
                      <div
                        class="flex items-center gap-1.5 flex-1 min-w-0 pr-2"
                      >
                        <span
                          class="text-sm font-medium transition-colors truncate"
                          :class="isDark ? 'text-gray-200' : 'text-gray-800'"
                          :title="player.name"
                          >{{ player.name }}</span
                        >
                        <UIcon
                          v-if="player.userId && player.status === 'APPROVED'"
                          name="i-heroicons-check-badge-solid"
                          class="w-3.5 h-3.5 text-blue-500 shrink-0"
                          title="Claimed & Verified Player"
                        />
                      </div>
                      <div
                        v-if="
                          getPlayerGoals(player.id) > 0 ||
                          getPlayerAssists(player.id) > 0
                        "
                        class="flex items-center ml-2.5 z-10 text-white flex-shrink-0"
                      >
                        <div
                          v-if="getPlayerGoals(player.id) > 0"
                          class="flex items-center -space-x-1.5"
                        >
                          <div
                            v-for="i in getPlayerGoals(player.id)"
                            :key="'goal-' + i"
                            class="w-[14px] h-[14px] flex items-center justify-center rounded-full relative text-[10px]"
                            :class="
                              isDark
                                ? 'ring-1 ring-gray-900 bg-gray-900'
                                : 'ring-1 ring-white bg-white text-gray-900'
                            "
                          >
                            <IconsSoccerBallIcon class="w-[10px] h-[10px]" />
                          </div>
                        </div>
                        <div
                          v-if="getPlayerAssists(player.id) > 0"
                          class="flex items-center -space-x-1.5"
                          :class="{ 'ml-1': getPlayerGoals(player.id) > 0 }"
                        >
                          <div
                            v-for="i in getPlayerAssists(player.id)"
                            :key="'assist-' + i"
                            class="w-[14px] h-[14px] flex items-center justify-center rounded-full relative text-[10px]"
                            :class="
                              isDark
                                ? 'ring-1 ring-gray-900 bg-gray-900'
                                : 'ring-1 ring-white bg-white text-emerald-400'
                            "
                          >
                            <IconsAssistIcon class="w-[10px] h-[10px]" />
                          </div>
                        </div>
                      </div>
                      <span
                        v-if="player.position"
                        class="ml-auto flex-shrink-0 pl-3 text-[11px] font-medium uppercase tracking-wider text-gray-400"
                        >{{ player.position.split("-")[0] }}</span
                      >
                    </NuxtLink>
                  </template>
                  <div v-else class="px-5 py-8 text-center">
                    <p class="text-sm text-gray-500">
                      No players listed in lineup.
                    </p>
                  </div>

                  <!-- Away Substitutes -->
                  <template v-if="awaySubs.length">
                    <div
                      class="px-5 py-2 bg-gray-50 dark:bg-white/[0.02] border-t border-b transition-colors flex items-center justify-between"
                      :class="
                        isDark ? 'border-white/[0.04]' : 'border-gray-100'
                      "
                    >
                      <span
                        class="text-[11px] font-bold uppercase tracking-wider text-gray-400"
                        >Substitutes</span
                      >
                      <span
                        class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 whitespace-nowrap"
                        >Subs</span
                      >
                    </div>
                    <NuxtLink
                      v-for="player in awaySubs"
                      :key="'sub-' + player.id"
                      :to="toMain(`/player/${player.id}`)"
                      :external="isManage"
                      class="flex items-center px-5 py-3 transition-colors cursor-pointer"
                      :class="
                        isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50'
                      "
                    >
                      <!-- Player Avatar Wrapper -->
                      <div class="relative w-7 h-7 flex-shrink-0 mr-3">
                        <!-- Cropped Avatar Container -->
                        <div
                          class="w-full h-full rounded-full overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 flex items-center justify-center"
                        >
                          <img
                            v-if="player.avatarUrl"
                            :src="player.avatarUrl"
                            class="w-full h-full object-cover"
                          />
                          <span
                            v-else
                            class="text-[10px] font-bold text-gray-400"
                          >
                            {{ player.name.charAt(0) }}
                          </span>
                        </div>
                        <!-- Shirt Number Badge -->
                        <span
                          v-if="player.number"
                          class="absolute -bottom-0.5 -right-0.5 bg-gray-500 text-white text-[7px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white dark:border-[#1a1a1a] shadow-sm"
                        >
                          {{ player.number }}
                        </span>
                      </div>
                      <div
                        class="flex items-center gap-1.5 flex-1 min-w-0 pr-2"
                      >
                        <span
                          class="text-sm font-medium transition-colors truncate"
                          :class="isDark ? 'text-gray-200' : 'text-gray-800'"
                          :title="player.name"
                          >{{ player.name }}</span
                        >
                        <UIcon
                          v-if="player.userId && player.status === 'APPROVED'"
                          name="i-heroicons-check-badge-solid"
                          class="w-3.5 h-3.5 text-blue-500 shrink-0"
                          title="Claimed & Verified Player"
                        />
                      </div>
                      <div
                        v-if="
                          getPlayerGoals(player.id) > 0 ||
                          getPlayerAssists(player.id) > 0
                        "
                        class="flex items-center ml-2.5 z-10 text-white flex-shrink-0"
                      >
                        <div
                          v-if="getPlayerGoals(player.id) > 0"
                          class="flex items-center -space-x-1.5"
                        >
                          <div
                            v-for="i in getPlayerGoals(player.id)"
                            :key="'goal-' + i"
                            class="w-[14px] h-[14px] flex items-center justify-center rounded-full relative text-[10px]"
                            :class="
                              isDark
                                ? 'ring-1 ring-gray-900 bg-gray-900'
                                : 'ring-1 ring-white bg-white text-gray-900'
                            "
                          >
                            <IconsSoccerBallIcon class="w-[10px] h-[10px]" />
                          </div>
                        </div>
                        <div
                          v-if="getPlayerAssists(player.id) > 0"
                          class="flex items-center -space-x-1.5"
                          :class="{ 'ml-1': getPlayerGoals(player.id) > 0 }"
                        >
                          <div
                            v-for="i in getPlayerAssists(player.id)"
                            :key="'assist-' + i"
                            class="w-[14px] h-[14px] flex items-center justify-center rounded-full relative text-[10px]"
                            :class="
                              isDark
                                ? 'ring-1 ring-gray-900 bg-gray-900'
                                : 'ring-1 ring-white bg-white text-emerald-400'
                            "
                          >
                            <IconsAssistIcon class="w-[10px] h-[10px]" />
                          </div>
                        </div>
                      </div>
                      <span
                        v-if="player.position"
                        class="ml-auto flex-shrink-0 pl-3 text-[11px] font-medium uppercase tracking-wider text-gray-400"
                        >{{ player.position.split("-")[0] }}</span
                      >
                    </NuxtLink>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Match Info Tab -->
        <div v-show="activeTab === 'info'">
          <div
            :class="
              isDark
                ? 'bg-[#1a1a1a] border-white/[0.06]'
                : 'bg-white border-gray-200 shadow-sm'
            "
            class="border rounded-xl overflow-hidden"
          >
            <div
              class="px-5 py-3.5 border-b transition-colors"
              :class="isDark ? 'border-white/[0.06]' : 'border-gray-100'"
            >
              <h3
                class="text-[12px] font-semibold uppercase tracking-wider text-gray-400"
              >
                Match Info
              </h3>
            </div>
            <div
              class="divide-y transition-colors"
              :class="isDark ? 'divide-white/[0.04]' : 'divide-gray-100'"
            >
              <div class="flex items-center justify-between px-5 py-3">
                <span class="text-sm text-gray-500">Tournament</span>
                <button
                  @click="$emit('back')"
                  class="text-sm text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  {{ tournament.name }}
                </button>
              </div>
              <div class="flex items-center justify-between px-5 py-3">
                <span class="text-sm text-gray-500">Round</span>
                <span
                  class="text-sm transition-colors"
                  :class="isDark ? 'text-gray-200' : 'text-gray-800'"
                  >{{
                    (fixture.roundName || `Round ${fixture.round}`).replace(
                      /^Group\s+Stage\s*-\s*/i,
                      "",
                    )
                  }}</span
                >
              </div>
              <div class="flex items-center justify-between px-5 py-3">
                <span class="text-sm text-gray-500">Match</span>
                <span
                  class="text-sm transition-colors"
                  :class="isDark ? 'text-gray-200' : 'text-gray-800'"
                  >#{{ fixture.matchNumber }}</span
                >
              </div>
              <div
                v-if="fixture.venue"
                class="flex items-center justify-between px-5 py-3"
              >
                <span class="text-sm text-gray-500">Venue</span>
                <span
                  class="text-sm font-semibold transition-colors"
                  :class="isDark ? 'text-emerald-400' : 'text-emerald-600'"
                  >{{ fixture.venue }}</span
                >
              </div>
              <div
                v-if="fixture.startTime"
                class="flex items-center justify-between px-5 py-3"
              >
                <span class="text-sm text-gray-500">Date & Time</span>
                <span
                  class="text-sm transition-colors"
                  :class="isDark ? 'text-gray-200' : 'text-gray-800'"
                  >{{ formatFullDate(fixture.startTime) }} ·
                  {{ formatTime(fixture.startTime) }}</span
                >
              </div>
              <div
                v-if="fixture.stage"
                class="flex items-center justify-between px-5 py-3"
              >
                <span class="text-sm text-gray-500">Stage</span>
                <span
                  class="text-sm transition-colors"
                  :class="isDark ? 'text-gray-200' : 'text-gray-800'"
                  >{{ fixture.stage.replace(/_/g, " ") }}</span
                >
              </div>
              <div
                v-if="fixture.group"
                class="flex items-center justify-between px-5 py-3"
              >
                <span class="text-sm text-gray-500">Group</span>
                <span
                  class="text-sm transition-colors"
                  :class="isDark ? 'text-gray-200' : 'text-gray-800'"
                  >{{ fixture.group.name }}</span
                >
              </div>
              <div class="flex items-center justify-between px-5 py-3">
                <span class="text-sm text-gray-500">Status</span>
                <span
                  class="text-sm font-medium"
                  :class="{
                    'text-red-400': isLive,
                    'text-emerald-400': isCompleted,
                    'text-gray-400': !isLive && !isCompleted,
                  }"
                >
                  {{ fixture.status }}
                </span>
              </div>
              <div
                v-if="isLive && liveClock"
                class="flex items-center justify-between px-5 py-3"
              >
                <span class="text-sm text-gray-500">Match Timer</span>
                <span class="text-sm font-semibold tabular-nums text-red-400"
                  >{{ liveClock }} ({{ liveMinuteLabel }})</span
                >
              </div>
            </div>
          </div>
        </div>

        <!-- Highlights Tab -->
        <div v-show="activeTab === 'highlights'">
          <div
            v-if="loadingHighlights"
            :class="
              isDark
                ? 'bg-[#1a1a1a] border-white/[0.06]'
                : 'bg-white border-gray-200 shadow-sm'
            "
            class="border rounded-xl px-5 py-12 flex flex-col items-center justify-center"
          >
            <UIcon
              name="i-heroicons-arrow-path"
              class="w-10 h-10 text-gray-400 mb-3 animate-spin"
            />
            <p class="text-sm font-medium text-gray-500">Loading highlights…</p>
          </div>
          <div
            v-else-if="highlights.length === 0"
            :class="
              isDark
                ? 'bg-[#1a1a1a] border-white/[0.06]'
                : 'bg-white border-gray-200 shadow-sm'
            "
            class="border rounded-xl px-5 py-12 flex flex-col items-center justify-center"
          >
            <UIcon
              name="i-heroicons-video-camera"
              class="w-10 h-10 text-gray-400 mb-3 opacity-50"
            />
            <p class="text-sm font-medium text-gray-500">
              No highlights available yet.
            </p>
          </div>
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              v-for="highlight in highlights"
              :key="highlight.id"
              class="border rounded-xl overflow-hidden"
              :class="
                isDark
                  ? 'bg-[#1a1a1a] border-white/[0.06]'
                  : 'bg-white border-gray-200 shadow-sm'
              "
            >
              <div class="aspect-[9/16] max-h-[480px] w-full bg-black">
                <iframe
                  v-if="highlight.embedUrl"
                  :src="highlight.embedUrl"
                  class="w-full h-full"
                  frameborder="0"
                  allowfullscreen
                  loading="lazy"
                  :title="highlight.caption || 'Match highlight'"
                />
              </div>
              <div class="p-3 space-y-1">
                <div class="flex items-center justify-between">
                  <span
                    class="text-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    {{
                      getHighlightPlatformInfo(highlight.platform)?.label ||
                      highlight.platform
                    }}
                  </span>
                  <span
                    v-if="highlight.duration"
                    class="text-xs text-gray-500 dark:text-gray-400"
                  >
                    {{ highlight.duration }}s
                  </span>
                </div>
                <p
                  v-if="highlight.caption"
                  class="text-sm font-medium"
                  :class="isDark ? 'text-white' : 'text-gray-900'"
                >
                  {{ highlight.caption }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
