<script setup lang="ts">
import type { MatchEvent, Highlight } from "~/types";
import {
  detectHighlightPlatform,
  getHighlightPlatformInfo,
  getHighlightEmbedUrl,
  formatHighlightEmbedUrl,
  isTikTokShortUrl,
  resolveTikTokShortUrl,
} from "~/utils/highlights";

const open = defineModel<boolean>("open", { default: false });
const minute = defineModel<number | null>("minute", { default: null });
const playerId = defineModel<string | undefined>("playerId");
const relatedPlayerId = defineModel<string | undefined>("relatedPlayerId");
const highlightUrl = defineModel<string>("highlightUrl", { default: "" });
const selectedHighlightId = defineModel<string | undefined>("selectedHighlightId");
const highlightCaption = defineModel<string>("highlightCaption", { default: "" });

const props = withDefaults(
  defineProps<{
    event: MatchEvent | null;
    playerOptions: Array<{ label: string; value: string }>;
    relatedOptions: Array<{ label: string; value: string; disabled?: boolean }>;
    loading: boolean;
    highlights?: Highlight[];
  }>(),
  {
    highlights: () => [],
  },
);

const emit = defineEmits<{
  confirm: [];
}>();

const highlightMode = ref<"url" | "existing">("url");
const showPreview = ref(false);

const isGoalEvent = computed(() => {
  return ["GOAL", "PENALTY", "OWN_GOAL"].includes(props.event?.type || "");
});

const existingHighlightOptions = computed(() => {
  return (props.highlights || []).map((h) => ({
    label: h.caption || `${getHighlightPlatformInfo(h.platform)?.label || h.platform} clip`,
    value: h.id,
  }));
});

const detectedPlatform = computed(() => {
  if (!highlightUrl.value) return null;
  return detectHighlightPlatform(highlightUrl.value);
});

const detectedPlatformInfo = computed(() => {
  return getHighlightPlatformInfo(detectedPlatform.value);
});

const resolvingUrl = ref(false);
const resolvedEmbedUrl = ref<string | null>(null);

const previewEmbedUrl = computed(() => {
  if (selectedHighlightId.value) {
    const found = (props.highlights || []).find((h) => h.id === selectedHighlightId.value);
    return formatHighlightEmbedUrl(found?.embedUrl || null);
  }
  if (resolvedEmbedUrl.value) {
    return resolvedEmbedUrl.value;
  }
  if (highlightUrl.value && detectedPlatform.value) {
    return getHighlightEmbedUrl(highlightUrl.value, detectedPlatform.value);
  }
  return null;
});

watch(
  () => highlightUrl.value,
  async (val) => {
    resolvedEmbedUrl.value = null;
    if (!val) return;
    const trimmed = val.trim();
    if (isTikTokShortUrl(trimmed)) {
      resolvingUrl.value = true;
      try {
        const resolved = await resolveTikTokShortUrl(trimmed);
        if (resolved?.embedUrl) {
          resolvedEmbedUrl.value = resolved.embedUrl;
        }
      } catch {
        // fail silently
      } finally {
        resolvingUrl.value = false;
      }
    }
  },
  { immediate: true },
);

watch(
  () => props.event,
  (ev) => {
    if (ev?.metadata?.highlightId && props.highlights?.some((h) => h.id === ev.metadata?.highlightId)) {
      highlightMode.value = "existing";
    } else {
      highlightMode.value = "url";
    }
  },
  { immediate: true },
);

watch(selectedHighlightId, (id) => {
  if (id) {
    const found = (props.highlights || []).find((h) => h.id === id);
    if (found && !highlightCaption.value) {
      highlightCaption.value = found.caption || "";
    }
  }
});
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon
                name="i-heroicons-pencil"
                class="w-5 h-5 text-primary-500"
              />
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                Edit Event
              </h3>
            </div>
            <UButton
              icon="i-heroicons-x-mark"
              variant="ghost"
              color="neutral"
              size="sm"
              @click="open = false;"
            />
          </div>
        </template>

        <div class="space-y-4">
          <!-- Minute (hidden for penalty shootout events) -->
          <UFormField
            v-if="!event?.metadata?.isPenaltyShootout"
            label="Minute (optional)"
          >
            <UInput
              v-model.number="minute"
              type="number"
              placeholder="e.g. 45"
              icon="i-heroicons-clock"
              :min="0"
              :max="120"
            />
          </UFormField>

          <!-- Scorer/Player -->
          <UFormField
            :label="
              event?.type === 'SUBSTITUTION'
                ? 'Player In (Entering)'
                : 'Player'
            "
          >
            <USelect
              v-model="playerId"
              :items="playerOptions"
              placeholder="Select player..."
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <!-- Assister/Related (hidden for penalty shootout events) -->
          <UFormField
            v-if="!event?.metadata?.isPenaltyShootout"
            :label="
              event?.type === 'SUBSTITUTION'
                ? 'Player Out (Leaving)'
                : 'Related Player / Assist (optional)'
            "
          >
            <USelect
              v-model="relatedPlayerId"
              :items="relatedOptions"
              placeholder="Select related player..."
              value-key="value"
              :disabled="!playerId"
              class="w-full"
            />
          </UFormField>

          <!-- Goal Highlight Section (only for goal events) -->
          <div
            v-if="isGoalEvent"
            class="pt-3 border-t border-gray-100 dark:border-white/10 space-y-3"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <UIcon
                  name="i-heroicons-video-camera"
                  class="w-4 h-4 text-rose-500"
                />
                <span
                  class="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300"
                >
                  Goal Highlight (optional)
                </span>
              </div>

              <!-- Mode toggle if fixture highlights exist -->
              <div
                v-if="existingHighlightOptions.length > 0"
                class="flex items-center gap-1.5 text-xs"
              >
                <button
                  type="button"
                  class="px-2 py-0.5 rounded transition-colors cursor-pointer"
                  :class="
                    highlightMode === 'url'
                      ? 'bg-rose-500/10 text-rose-500 font-semibold'
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                  "
                  @click="
                    highlightMode = 'url';
                    selectedHighlightId = undefined;
                  "
                >
                  Video Link
                </button>
                <span class="text-gray-300 dark:text-gray-600">|</span>
                <button
                  type="button"
                  class="px-2 py-0.5 rounded transition-colors cursor-pointer"
                  :class="
                    highlightMode === 'existing'
                      ? 'bg-rose-500/10 text-rose-500 font-semibold'
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                  "
                  @click="
                    highlightMode = 'existing';
                    highlightUrl = '';
                  "
                >
                  From Highlights ({{ existingHighlightOptions.length }})
                </button>
              </div>
            </div>

            <!-- Existing highlight select -->
            <div
              v-if="highlightMode === 'existing' && existingHighlightOptions.length > 0"
            >
              <UFormField label="Select From Match Highlights">
                <div class="flex items-center gap-2">
                  <USelect
                    v-model="selectedHighlightId"
                    :items="existingHighlightOptions"
                    placeholder="Select a highlight..."
                    value-key="value"
                    class="flex-1"
                  />
                  <UButton
                    v-if="selectedHighlightId"
                    icon="i-heroicons-x-mark"
                    variant="ghost"
                    color="neutral"
                    size="sm"
                    aria-label="Remove linked highlight"
                    @click="selectedHighlightId = undefined; highlightCaption = '';"
                  />
                </div>
              </UFormField>
            </div>

            <!-- Video URL input -->
            <div v-else class="space-y-2">
              <UFormField
                label="Highlight Video URL"
                help="YouTube Shorts, Instagram Reel, or TikTok video link"
              >
                <div class="flex items-center gap-2">
                  <UInput
                    v-model="highlightUrl"
                    placeholder="https://youtube.com/shorts/... or instagram.com/reel/..."
                    icon="i-heroicons-link"
                    class="flex-1"
                  />
                  <UButton
                    v-if="highlightUrl"
                    icon="i-heroicons-x-mark"
                    variant="ghost"
                    color="neutral"
                    size="sm"
                    aria-label="Clear highlight URL"
                    @click="highlightUrl = '';"
                  />
                </div>
              </UFormField>

              <!-- Detected platform info & preview toggle -->
              <div
                v-if="detectedPlatformInfo"
                class="flex items-center justify-between text-xs pt-0.5"
              >
                <div class="flex items-center gap-1.5">
                  <span class="text-gray-400">Platform:</span>
                  <UBadge
                    color="primary"
                    variant="subtle"
                    size="sm"
                    class="flex items-center gap-1"
                  >
                    <UIcon :name="detectedPlatformInfo.icon" class="w-3.5 h-3.5" />
                    <span>{{ detectedPlatformInfo.label }}</span>
                  </UBadge>
                  <span
                    v-if="resolvingUrl"
                    class="text-xs text-amber-500 flex items-center gap-1 font-medium"
                  >
                    <UIcon name="i-heroicons-arrow-path" class="w-3 h-3 animate-spin" />
                    <span>Resolving…</span>
                  </span>
                </div>

                <button
                  v-if="previewEmbedUrl"
                  type="button"
                  class="text-xs text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 font-medium underline flex items-center gap-1 cursor-pointer"
                  @click="showPreview = !showPreview"
                >
                  <UIcon name="i-heroicons-play-circle" class="w-3.5 h-3.5" />
                  <span>{{ showPreview ? 'Hide preview' : 'Preview video' }}</span>
                </button>
              </div>

              <!-- Inline Preview if toggled -->
              <div
                v-if="showPreview && previewEmbedUrl"
                class="pt-2"
              >
                <div
                  class="aspect-[9/16] max-h-[300px] w-full max-w-[220px] mx-auto rounded-lg overflow-hidden bg-black shadow-md ring-1 ring-white/10"
                >
                  <iframe
                    :src="previewEmbedUrl"
                    class="w-full h-full"
                    frameborder="0"
                    allowfullscreen
                    allow="fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>

            <!-- Optional Caption -->
            <UFormField
              v-if="highlightUrl || selectedHighlightId"
              label="Highlight Caption (optional)"
            >
              <UInput
                v-model="highlightCaption"
                placeholder="e.g. 90th minute winning goal"
                class="w-full"
              />
            </UFormField>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-2">
            <UButton
              label="Cancel"
              variant="ghost"
              color="neutral"
              @click="open = false;"
            />
            <UButton
              label="Save Changes"
              icon="i-heroicons-check"
              color="primary"
              :loading="loading"
              @click="emit('confirm')"
            />
          </div>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
