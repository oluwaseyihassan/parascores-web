import type { InjectionKey, Ref } from "vue";
import {
  FixtureStatus,
  MatchEventType,
  MatchHalf,
} from "~/types";
import type { Fixture, MatchEvent, Player, Highlight } from "~/types";
import {
  detectHighlightPlatform,
  normalizeHighlightUrl,
  getHighlightEmbedUrl,
  getHighlightThumbnailUrl,
} from "~/utils/highlights";

export function useMatchEvents(options: {
  fixture: Ref<Fixture | null>;
  matchEvents: Ref<MatchEvent[]>;
  loadingEvents: Ref<boolean>;
  homePlayers: Ref<Player[]>;
  awayPlayers: Ref<Player[]>;
  updatingMatch: Ref<boolean>;
  highlights?: Ref<Highlight[]>;
  onFixtureUpdated: (fixture: Fixture) => void;
  onHighlightsUpdated?: () => Promise<void>;
}) {
  const {
    fixture,
    matchEvents,
    loadingEvents,
    homePlayers,
    awayPlayers,
    updatingMatch,
    highlights,
    onFixtureUpdated,
    onHighlightsUpdated,
  } = options;

  const fixtureStore = useFixtureStore();
  const { handleError } = useErrors();

  // Edit event modal
  const showEditEventModal = ref(false);
  const eventBeingEdited = ref<MatchEvent | null>(null);
  const editEventData = reactive({
    minute: null as number | null,
    playerId: undefined as string | undefined,
    relatedPlayerId: undefined as string | undefined,
    highlightUrl: "",
    selectedHighlightId: undefined as string | undefined,
    highlightCaption: "",
  });

  const showDeleteEventModal = ref(false);
  const eventBeingDeleted = ref<MatchEvent | null>(null);

  // Watchers for mutual exclusion between player and related player
  watch(
    () => editEventData.playerId,
    (newId) => {
      if (newId && newId === editEventData.relatedPlayerId) {
        editEventData.relatedPlayerId = undefined;
      }
    },
  );

  watch(
    () => editEventData.relatedPlayerId,
    (newId) => {
      if (newId && newId === editEventData.playerId) {
        editEventData.playerId = undefined;
      }
    },
  );

  const openEditEventModal = (event: MatchEvent) => {
    eventBeingEdited.value = event;
    editEventData.minute = event.minute ?? null;
    editEventData.playerId = event.playerId || undefined;
    editEventData.relatedPlayerId = event.relatedPlayerId || undefined;
    editEventData.highlightUrl = event.metadata?.highlightUrl || "";
    editEventData.selectedHighlightId = event.metadata?.highlightId || undefined;
    editEventData.highlightCaption = event.metadata?.highlightCaption || "";
    showEditEventModal.value = true;
  };

  const confirmEditEvent = async () => {
    if (!eventBeingEdited.value) return;
    updatingMatch.value = true;
    try {
      const isPenaltyShootout =
        eventBeingEdited.value.metadata?.isPenaltyShootout === true;
      const isGoalEvent = [
        MatchEventType.GOAL,
        MatchEventType.PENALTY,
        MatchEventType.OWN_GOAL,
      ].includes(eventBeingEdited.value.type);

      const updateData: any = {
        playerId: editEventData.playerId,
        relatedPlayerId: editEventData.relatedPlayerId,
      };
      if (!isPenaltyShootout) {
        updateData.minute = editEventData.minute;
        updateData.half = getMatchHalf(
          editEventData.minute,
          eventBeingEdited.value.metadata,
        );
      }

      if (isGoalEvent) {
        const metadata = { ...(eventBeingEdited.value.metadata || {}) };

        if (editEventData.selectedHighlightId) {
          const existing = highlights?.value?.find(
            (h) => h.id === editEventData.selectedHighlightId,
          );
          if (existing) {
            metadata.highlightId = existing.id;
            metadata.highlightUrl = existing.externalUrl;
            metadata.highlightEmbedUrl = existing.embedUrl;
            metadata.highlightPlatform = existing.platform;
            metadata.highlightThumbnailUrl = existing.thumbnailUrl;
            metadata.highlightCaption = existing.caption;
          }
        } else if (editEventData.highlightUrl.trim()) {
          const normalized = normalizeHighlightUrl(editEventData.highlightUrl);
          const platform = normalized ? detectHighlightPlatform(normalized) : null;
          const embedUrl = normalized ? getHighlightEmbedUrl(normalized, platform) : null;
          const thumbUrl = normalized ? getHighlightThumbnailUrl(normalized, platform) : null;

          let createdHighlightId: string | undefined = undefined;
          if (fixture.value?.id && normalized && platform) {
            try {
              const res = await fixtureStore.createHighlight(fixture.value.id, {
                externalUrl: normalized,
                platform: platform,
                caption: editEventData.highlightCaption.trim() || undefined,
              });
              if (res?.data) {
                createdHighlightId = res.data.id;
                if (highlights?.value) {
                  highlights.value.unshift(res.data);
                }
                if (onHighlightsUpdated) {
                  await onHighlightsUpdated();
                }
              }
            } catch (err) {
              console.warn("Could not create fixture highlight record:", err);
            }
          }

          if (normalized) {
            metadata.highlightUrl = normalized;
            metadata.highlightPlatform = platform || undefined;
            metadata.highlightEmbedUrl = embedUrl || undefined;
            metadata.highlightThumbnailUrl = thumbUrl || undefined;
            if (createdHighlightId) {
              metadata.highlightId = createdHighlightId;
            }
            metadata.highlightCaption = editEventData.highlightCaption.trim() || undefined;
          }
        } else {
          delete metadata.highlightUrl;
          delete metadata.highlightId;
          delete metadata.highlightEmbedUrl;
          delete metadata.highlightPlatform;
          delete metadata.highlightThumbnailUrl;
          delete metadata.highlightCaption;
        }

        updateData.metadata = metadata;
      }

      await fixtureStore.updateMatchEvent(eventBeingEdited.value.id, updateData);
      showEditEventModal.value = false;
      await refreshMatchEvents();
      useToast().add({ title: "Event Updated", color: "success" });
    } catch (e: any) {
      handleError(e, { title: "Failed to update event" });
    } finally {
      updatingMatch.value = false;
    }
  };

  const openDeleteEventModal = (event: MatchEvent) => {
    eventBeingDeleted.value = event;
    showDeleteEventModal.value = true;
  };

  const confirmDeleteEvent = async () => {
    if (!eventBeingDeleted.value) return;

    const event = eventBeingDeleted.value;
    loadingEvents.value = true;
    try {
      await fixtureStore.deleteMatchEvent(event.id);

      // Update local score if it was a goal
      const isScoringEvent =
        event.type === MatchEventType.GOAL ||
        event.type === MatchEventType.OWN_GOAL ||
        event.type === MatchEventType.PENALTY;
      if (isScoringEvent && fixture.value) {
        if (event.participant_id === fixture.value.homeTeamId) {
          fixture.value.homeScore = Math.max(
            0,
            (fixture.value.homeScore ?? 0) - 1,
          );
        } else if (event.participant_id === fixture.value.awayTeamId) {
          fixture.value.awayScore = Math.max(
            0,
            (fixture.value.awayScore ?? 0) - 1,
          );
        }
        await fixtureStore.updateFixture(fixture.value.id, {
          homeScore: fixture.value.homeScore,
          awayScore: fixture.value.awayScore,
        });
        onFixtureUpdated(fixture.value);
      }

      await refreshMatchEvents();
      showDeleteEventModal.value = false;
      eventBeingDeleted.value = null;
      useToast().add({ title: "Event Deleted", color: "success" });
    } catch (e: any) {
      handleError(e, { title: "Failed to delete event" });
    } finally {
      loadingEvents.value = false;
    }
  };

  const editEventTeamPlayers = computed(() => {
    if (!eventBeingEdited.value || !fixture.value) return [];

    if (eventBeingEdited.value.type === MatchEventType.OWN_GOAL) {
      return eventBeingEdited.value.participant_id ===
        fixture.value.homeTeamId
        ? awayPlayers.value
        : homePlayers.value;
    }

    return eventBeingEdited.value.participant_id === fixture.value.homeTeamId
      ? homePlayers.value
      : awayPlayers.value;
  });

  const editEventPlayerOptions = computed(() => {
    return editEventTeamPlayers.value.map((p) => ({
      label: `${p.number ? `#${p.number} ` : ""}${p.name}`,
      value: p.id,
    }));
  });

  const editEventRelatedPlayerOptions = computed(() => {
    return editEventTeamPlayers.value.map((p) => ({
      label: `${p.number ? `#${p.number} ` : ""}${p.name}`,
      value: p.id,
      disabled: p.id === editEventData.playerId,
    }));
  });

  const getEventActionItems = (event: MatchEvent) => [
    [
      {
        label: "Edit",
        icon: "i-heroicons-pencil",
        onSelect: () => openEditEventModal(event),
      },
    ],
    [
      {
        label: "Delete",
        icon: "i-heroicons-trash",
        onSelect: () => openDeleteEventModal(event),
      },
    ],
  ];

  // Penalty shootout event derivations
  const penaltyShootoutEvents = computed(() => {
    return matchEvents.value.filter(
      (e) => e.metadata?.isPenaltyShootout === true,
    );
  });

  const homePenaltyShootoutEvents = computed(() => {
    return penaltyShootoutEvents.value
      .filter((e) => e.participant_id === fixture.value?.homeTeamId)
      .sort((a, b) => getShootoutOrder(a) - getShootoutOrder(b));
  });

  const awayPenaltyShootoutEvents = computed(() => {
    return penaltyShootoutEvents.value
      .filter((e) => e.participant_id === fixture.value?.awayTeamId)
      .sort((a, b) => getShootoutOrder(a) - getShootoutOrder(b));
  });

  const getShootoutOrder = (event: MatchEvent) => {
    return (
      event.metadata?.shootoutOrder ||
      penaltyShootoutOrderMap.value.get(event.id) ||
      0
    );
  };

  const penaltyShootoutOrderMap = computed(() => {
    const sorted = [...penaltyShootoutEvents.value].sort((a, b) => {
      if (a.minute !== b.minute) return (a.minute || 0) - (b.minute || 0);
      return a.id.localeCompare(b.id);
    });
    const map = new Map<string, number>();
    sorted.forEach((event, index) => map.set(event.id, index + 1));
    return map;
  });

  const chronologicalPenaltyEvents = computed(() => {
    const sorted = [...penaltyShootoutEvents.value].sort(
      (a, b) => getShootoutOrder(a) - getShootoutOrder(b),
    );
    let homeScore = 0;
    let awayScore = 0;
    return sorted.map((event) => {
      const isHome = event.participant_id === fixture.value?.homeTeamId;
      if (event.type === MatchEventType.PENALTY) {
        if (isHome) homeScore++;
        else awayScore++;
      }
      return {
        ...event,
        homeScore,
        awayScore,
        isHome,
        isScored: event.type === MatchEventType.PENALTY,
      };
    });
  });

  const maxPenaltyRounds = computed(() => {
    return Math.max(
      homePenaltyShootoutEvents.value.length,
      awayPenaltyShootoutEvents.value.length,
    );
  });

  // Event helper functions
  const getEventIcon = (type: MatchEventType) => {
    switch (type) {
      case MatchEventType.GOAL:
        return "i-heroicons-trophy";
      case MatchEventType.OWN_GOAL:
        return "i-heroicons-exclamation-triangle";
      case MatchEventType.PENALTY:
        return "i-heroicons-stop";
      case MatchEventType.MISSED_PENALTY:
        return "i-heroicons-x-circle";
      case MatchEventType.PENALTY_SAVE:
        return "i-heroicons-hand";
      case MatchEventType.YELLOW_CARD:
        return "i-heroicons-exclamation-circle";
      case MatchEventType.RED_CARD:
        return "i-heroicons-x-circle";
      case MatchEventType.SUBSTITUTION:
        return "i-heroicons-arrows-right-left";
      case MatchEventType.ASSIST:
        return "i-heroicons-hand-raised";
      default:
        return "i-heroicons-flag";
    }
  };

  const getEventColor = (type: MatchEventType) => {
    switch (type) {
      case MatchEventType.GOAL:
        return "text-green-500";
      case MatchEventType.OWN_GOAL:
        return "text-orange-500";
      case MatchEventType.PENALTY:
        return "text-blue-500";
      case MatchEventType.MISSED_PENALTY:
        return "text-red-500";
      case MatchEventType.PENALTY_SAVE:
        return "text-amber-500";
      case MatchEventType.YELLOW_CARD:
        return "text-yellow-500";
      case MatchEventType.RED_CARD:
        return "text-red-500";
      case MatchEventType.SUBSTITUTION:
        return "text-purple-500";
      case MatchEventType.ASSIST:
        return "text-cyan-500";
      default:
        return "text-gray-500";
    }
  };

  const getPlayerName = (playerId: string | null | undefined) => {
    if (!playerId) return null;
    const player = [...homePlayers.value, ...awayPlayers.value].find(
      (p) => p.id === playerId,
    );
    return player
      ? `${player.number ? `#${player.number} ` : ""}${player.name}`
      : null;
  };

  const getTeamName = (participantId: string | null | undefined) => {
    if (!participantId || !fixture.value) return null;
    if (participantId === fixture.value.homeTeamId) {
      return fixture.value.homeTeam?.customName || "Home";
    }
    if (participantId === fixture.value.awayTeamId) {
      return fixture.value.awayTeam?.customName || "Away";
    }
    return null;
  };

  const getMatchHalf = (
    minute?: number | null,
    metadata?: Record<string, any> | null,
  ): MatchHalf => {
    if (metadata?.isPenaltyShootout) return MatchHalf.PENALTY_SHOOTOUT;
    if (!fixture.value) return MatchHalf.FIRST_HALF;

    const normalDuration = 90;
    const duration = fixture.value.matchDuration ?? normalDuration;
    const halfTime = duration / 2;

    if (fixture.value.status === FixtureStatus.EXTRATIME) {
      return MatchHalf.EXTRA_TIME;
    }

    const min = minute ?? 0;
    if (min > normalDuration) return MatchHalf.EXTRA_TIME;
    if (min > halfTime) return MatchHalf.SECOND_HALF;
    return MatchHalf.FIRST_HALF;
  };

  const getMatchHalfLabel = (half?: MatchHalf | null) => {
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

  const getEventMinuteDisplay = (event: MatchEvent) => {
    if (event.metadata?.isPenaltyShootout) {
      const order = getShootoutOrder(event);
      return order ? `P${order}` : "P";
    }
    return event.minute != null ? `${event.minute}'` : "–";
  };

  const groupedMatchEvents = computed(() => {
    const grouped: Record<MatchHalf, MatchEvent[]> = {
      [MatchHalf.FIRST_HALF]: [],
      [MatchHalf.SECOND_HALF]: [],
      [MatchHalf.EXTRA_TIME]: [],
      [MatchHalf.PENALTY_SHOOTOUT]: [],
    };

    for (const event of matchEvents.value) {
      const half = event.half ?? getMatchHalf(event.minute, event.metadata);
      grouped[half].push(event);
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
        events: grouped[half].sort((a, b) => (a.minute || 0) - (b.minute || 0)),
      }))
      .filter((group) => group.events.length > 0);
  });

  const refreshMatchEvents = async () => {
    if (!fixture.value) return;
    loadingEvents.value = true;
    try {
      const res = await $api<any>(
        `/match-events/fixture/${fixture.value.id}`,
      );
      matchEvents.value = res.data || [];
    } catch (e) {
      console.error("Failed to refresh events:", e);
    } finally {
      loadingEvents.value = false;
    }
  };

  const getEventHighlight = (event: MatchEvent | null | undefined) => {
    if (!event) return null;
    const meta = event.metadata;
    if (!meta) return null;
    if (meta.highlightUrl || meta.highlightId) {
      return {
        id: meta.highlightId as string | undefined,
        externalUrl: meta.highlightUrl as string | undefined,
        embedUrl:
          (meta.highlightEmbedUrl as string | undefined) ||
          (meta.highlightUrl
            ? getHighlightEmbedUrl(meta.highlightUrl, meta.highlightPlatform)
            : null),
        platform: meta.highlightPlatform as string | undefined,
        thumbnailUrl: meta.highlightThumbnailUrl as string | undefined,
        caption: meta.highlightCaption as string | undefined,
      };
    }
    return null;
  };

  const previewHighlightModalOpen = ref(false);
  const highlightToPreview = ref<{
    title?: string;
    subtitle?: string;
    highlight?: {
      embedUrl?: string | null;
      externalUrl?: string | null;
      platform?: string | null;
      caption?: string | null;
      thumbnailUrl?: string | null;
    } | null;
  } | null>(null);

  const openHighlightPreview = (event: MatchEvent) => {
    const hl = getEventHighlight(event);
    if (!hl) return;

    const playerName = getPlayerName(event.playerId) || "Goal";
    const minuteDisplay = getEventMinuteDisplay(event);
    const teamName = getTeamName(event.participant_id);

    highlightToPreview.value = {
      title: `⚽ ${playerName}${minuteDisplay ? ` (${minuteDisplay})` : ""}`,
      subtitle: teamName ? `${teamName} · Match Goal` : "Match Goal",
      highlight: hl,
    };
    previewHighlightModalOpen.value = true;
  };

  return {
    matchEvents,
    loadingEvents,
    showEditEventModal,
    eventBeingEdited,
    editEventData,
    showDeleteEventModal,
    eventBeingDeleted,
    openEditEventModal,
    confirmEditEvent,
    openDeleteEventModal,
    confirmDeleteEvent,
    editEventPlayerOptions,
    editEventRelatedPlayerOptions,
    getEventActionItems,
    penaltyShootoutEvents,
    homePenaltyShootoutEvents,
    awayPenaltyShootoutEvents,
    penaltyShootoutOrderMap,
    getShootoutOrder,
    chronologicalPenaltyEvents,
    maxPenaltyRounds,
    getEventIcon,
    getEventColor,
    getPlayerName,
    getTeamName,
    getMatchHalf,
    getMatchHalfLabel,
    getEventMinuteDisplay,
    groupedMatchEvents,
    refreshMatchEvents,
    getEventHighlight,
    previewHighlightModalOpen,
    highlightToPreview,
    openHighlightPreview,
  };
}

export type MatchEventsApi = ReturnType<typeof useMatchEvents>;

export const MatchEventsKey: InjectionKey<MatchEventsApi> =
  Symbol("match-events");
