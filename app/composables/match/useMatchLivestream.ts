import type { InjectionKey, Ref } from "vue";
import type { Fixture, LivestreamPlatform } from "~/types";
import {
  LIVESTREAM_PLATFORMS,
  detectLivestreamPlatform,
  getLivestreamPlatformInfo,
  normalizeLivestreamUrl,
} from "~/utils/livestream";

export function useMatchLivestream(options: {
  fixture: Ref<Fixture | null>;
  onFixtureUpdated: (fixture: Fixture) => void;
}) {
  const { fixture, onFixtureUpdated } = options;
  const fixtureStore = useFixtureStore();
  const { handleError } = useErrors();

  const livestreamUrl = ref<string>("");
  const livestreamPlatform = ref<LivestreamPlatform | undefined>(undefined);
  const updatingLivestream = ref(false);

  const livestreamPlatformOptions = computed(() => {
    return LIVESTREAM_PLATFORMS.map((p) => ({
      label: p.label,
      value: p.value,
      icon: p.icon,
    }));
  });

  const selectedLivestreamPlatformInfo = computed(() => {
    return getLivestreamPlatformInfo(livestreamPlatform.value);
  });

  const isLivestreamDisabled = computed(() => {
    if (!fixture.value) return true;

    const normalized = normalizeLivestreamUrl(livestreamUrl.value);
    const urlChanged = (fixture.value.livestreamUrl || "") !== normalized;
    const platformChanged =
      (fixture.value.livestreamPlatform || "") !==
      (livestreamPlatform.value || "");

    return !urlChanged && !platformChanged;
  });

  watch(
    () => livestreamUrl.value,
    (url) => {
      if (!url) return;
      const detected = detectLivestreamPlatform(url);
      if (detected && !livestreamPlatform.value) {
        livestreamPlatform.value = detected as LivestreamPlatform;
      }
    },
  );

  const syncFromFixture = (source: Fixture | null) => {
    livestreamUrl.value = source?.livestreamUrl || "";
    livestreamPlatform.value = source?.livestreamPlatform as
      | LivestreamPlatform
      | undefined;
  };

  const resetLivestream = () => {
    livestreamUrl.value = "";
    livestreamPlatform.value = undefined;
  };

  const updateLivestream = async () => {
    if (!fixture.value) return;

    const normalized = normalizeLivestreamUrl(livestreamUrl.value);
    if (livestreamUrl.value && !normalized) {
      useToast().add({
        title: "Invalid stream URL",
        description: "Please enter a valid URL or YouTube video ID.",
        color: "error",
      });
      return;
    }

    updatingLivestream.value = true;
    try {
      const detectedPlatform =
        livestreamPlatform.value ||
        (normalized ? detectLivestreamPlatform(normalized) : null);
      const payload = {
        livestreamUrl: normalized || null,
        livestreamPlatform: detectedPlatform || null,
      };

      await fixtureStore.updateFixture(fixture.value.id, payload);

      fixture.value = {
        ...fixture.value,
        ...payload,
      };

      onFixtureUpdated(fixture.value);

      useToast().add({
        title: normalized ? "Livestream Updated" : "Livestream Removed",
        description: normalized
          ? "The match livestream has been updated."
          : "The match livestream has been removed.",
        icon: "i-heroicons-video-camera",
        color: "success",
      });
    } catch (error: any) {
      handleError(error, { title: "Failed to update livestream" });
    } finally {
      updatingLivestream.value = false;
    }
  };

  return {
    livestreamUrl,
    livestreamPlatform,
    updatingLivestream,
    livestreamPlatformOptions,
    selectedLivestreamPlatformInfo,
    isLivestreamDisabled,
    getLivestreamPlatformInfo,
    syncFromFixture,
    resetLivestream,
    updateLivestream,
  };
}

export type MatchLivestreamApi = ReturnType<typeof useMatchLivestream>;

export const MatchLivestreamKey: InjectionKey<MatchLivestreamApi> =
  Symbol("match-livestream");
