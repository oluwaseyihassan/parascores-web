import type { InjectionKey, Ref } from "vue";
import type { Highlight, HighlightPlatform, MatchEvent } from "~/types";
import {
  HIGHLIGHT_PLATFORMS,
  detectHighlightPlatform,
  getHighlightPlatformInfo,
  normalizeHighlightUrl,
  getHighlightEmbedUrl,
  isTikTokShortUrl,
  resolveTikTokShortUrl,
} from "~/utils/highlights";

export function useHighlights(
  getFixtureId: () => string | undefined,
  highlights: Ref<Highlight[]>,
  loadingHighlights: Ref<boolean>,
  matchEvents?: Ref<MatchEvent[]>,
  onMatchEventsUpdated?: () => Promise<void>,
) {
  const fixtureStore = useFixtureStore();
  const { handleError } = useErrors();

  const savingHighlight = ref(false);
  const deletingHighlightId = ref<string | null>(null);
  const newHighlightUrl = ref<string>("");
  const newHighlightPlatform = ref<HighlightPlatform | undefined>(undefined);
  const newHighlightCaption = ref<string>("");
  const newHighlightDuration = ref<number | undefined>(undefined);
  const linkedGoalEventId = ref<string | undefined>(undefined);

  const highlightPlatformOptions = computed(() => {
    return HIGHLIGHT_PLATFORMS.map((p) => ({
      label: p.label,
      value: p.value,
      icon: p.icon,
    }));
  });

  const selectedHighlightPlatformInfo = computed(() => {
    return getHighlightPlatformInfo(newHighlightPlatform.value);
  });

  const isAddHighlightDisabled = computed(() => {
    if (!newHighlightUrl.value) return true;
    if (!newHighlightPlatform.value) return true;
    return !normalizeHighlightUrl(newHighlightUrl.value);
  });

  const goalEvents = computed(() => {
    if (!matchEvents?.value) return [];
    return matchEvents.value.filter((e) =>
      ["GOAL", "PENALTY", "OWN_GOAL"].includes(e.type),
    );
  });

  const goalEventSelectOptions = computed(() => {
    return [
      { label: "None (General Match Highlight)", value: "" },
      ...goalEvents.value.map((e) => {
        const min = e.minute ? `${e.minute}' ` : "";
        const tag =
          e.type === "OWN_GOAL" ? " (OG)" : e.type === "PENALTY" ? " (P)" : "";
        return {
          label: `⚽ ${min}${e.player?.name || "Goal"}${tag}`,
          value: e.id,
        };
      }),
    ];
  });

  watch(
    () => newHighlightUrl.value,
    (url) => {
      if (!url) return;
      const detected = detectHighlightPlatform(url);
      if (detected && !newHighlightPlatform.value) {
        newHighlightPlatform.value = detected;
      }
    },
  );

  const refreshHighlights = async () => {
    const fixtureId = getFixtureId();
    if (!fixtureId) return;
    loadingHighlights.value = true;
    try {
      const res = await fixtureStore.fetchHighlights(fixtureId);
      highlights.value = res.data || [];
    } catch (e: any) {
      console.error("Failed to refresh highlights:", e);
    } finally {
      loadingHighlights.value = false;
    }
  };

  const addHighlight = async () => {
    const fixtureId = getFixtureId();
    if (!fixtureId || !newHighlightUrl.value || !newHighlightPlatform.value)
      return;

    const normalized = normalizeHighlightUrl(newHighlightUrl.value);
    if (!normalized) {
      useToast().add({
        title: "Invalid URL",
        description: "Please enter a valid highlight URL.",
        color: "error",
      });
      return;
    }

    const detected = detectHighlightPlatform(normalized);
    if (!detected) {
      useToast().add({
        title: "Unsupported platform",
        description:
          "Only YouTube Shorts, Instagram Reels, and TikTok videos are supported.",
        color: "error",
      });
      return;
    }

    if (detected !== newHighlightPlatform.value) {
      useToast().add({
        title: "Platform mismatch",
        description: `The URL appears to be a ${getHighlightPlatformInfo(detected)?.label || detected} link.`,
        color: "error",
      });
      return;
    }

    savingHighlight.value = true;
    try {
      let embedUrl = getHighlightEmbedUrl(normalized, newHighlightPlatform.value);
      if (!embedUrl && isTikTokShortUrl(normalized)) {
        const resolved = await resolveTikTokShortUrl(normalized);
        if (resolved?.embedUrl) {
          embedUrl = resolved.embedUrl;
        }
      }

      const res = await fixtureStore.createHighlight(fixtureId, {
        externalUrl: normalized,
        platform: newHighlightPlatform.value,
        caption: newHighlightCaption.value || null,
        duration: newHighlightDuration.value || null,
        embedUrl: embedUrl || null,
      });

      const created = res?.data;

      // If linked to a goal event, update that goal event's metadata
      if (linkedGoalEventId.value && created) {
        try {
          const targetEvent = matchEvents?.value.find(
            (e) => e.id === linkedGoalEventId.value,
          );
          if (targetEvent) {
            await fixtureStore.updateMatchEvent(targetEvent.id, {
              metadata: {
                ...(targetEvent.metadata || {}),
                highlightId: created.id,
                highlightUrl: created.externalUrl,
                highlightEmbedUrl: created.embedUrl || embedUrl,
                highlightPlatform: created.platform,
                highlightThumbnailUrl: created.thumbnailUrl,
                highlightCaption: created.caption,
              },
            });
            if (onMatchEventsUpdated) {
              await onMatchEventsUpdated();
            }
          }
        } catch (err) {
          console.warn("Could not link highlight to goal event:", err);
        }
      }

      resetHighlightForm();

      await refreshHighlights();

      useToast().add({
        title: "Highlight Added",
        description: "The highlight has been added to this match.",
        icon: "i-heroicons-video-camera",
        color: "success",
      });
    } catch (error: any) {
      handleError(error, { title: "Failed to add highlight" });
    } finally {
      savingHighlight.value = false;
    }
  };

  const removeHighlight = async (highlight: Highlight) => {
    deletingHighlightId.value = highlight.id;
    try {
      await fixtureStore.deleteHighlight(highlight.id);
      await refreshHighlights();
      useToast().add({
        title: "Highlight Removed",
        description: "The highlight has been deleted.",
        icon: "i-heroicons-trash",
        color: "success",
      });
    } catch (error: any) {
      handleError(error, { title: "Failed to remove highlight" });
    } finally {
      deletingHighlightId.value = null;
    }
  };

  const resetHighlightForm = () => {
    newHighlightUrl.value = "";
    newHighlightPlatform.value = undefined;
    newHighlightCaption.value = "";
    newHighlightDuration.value = undefined;
    linkedGoalEventId.value = undefined;
  };

  return {
    highlights,
    loadingHighlights,
    savingHighlight,
    deletingHighlightId,
    newHighlightUrl,
    newHighlightPlatform,
    newHighlightCaption,
    newHighlightDuration,
    linkedGoalEventId,
    goalEventSelectOptions,
    highlightPlatformOptions,
    selectedHighlightPlatformInfo,
    isAddHighlightDisabled,
    getHighlightPlatformInfo,
    refreshHighlights,
    addHighlight,
    removeHighlight,
    resetHighlightForm,
  };
}

export type HighlightsApi = ReturnType<typeof useHighlights>;

export const HighlightsKey: InjectionKey<HighlightsApi> =
  Symbol("match-highlights");
