import type { InjectionKey, Ref } from "vue";
import type { Highlight, HighlightPlatform } from "~/types";
import {
  HIGHLIGHT_PLATFORMS,
  detectHighlightPlatform,
  getHighlightPlatformInfo,
  normalizeHighlightUrl,
} from "~/utils/highlights";

export function useHighlights(
  getFixtureId: () => string | undefined,
  highlights: Ref<Highlight[]>,
  loadingHighlights: Ref<boolean>,
) {
  const fixtureStore = useFixtureStore();
  const { handleError } = useErrors();

  const savingHighlight = ref(false);
  const deletingHighlightId = ref<string | null>(null);
  const newHighlightUrl = ref<string>("");
  const newHighlightPlatform = ref<HighlightPlatform | undefined>(undefined);
  const newHighlightCaption = ref<string>("");
  const newHighlightDuration = ref<number | undefined>(undefined);

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
      await fixtureStore.createHighlight(fixtureId, {
        externalUrl: normalized,
        platform: newHighlightPlatform.value,
        caption: newHighlightCaption.value || null,
        duration: newHighlightDuration.value || null,
      });

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
