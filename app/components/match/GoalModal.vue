<script setup lang="ts">
import { MatchEventType } from "~/types";
import type { Fixture, Highlight } from "~/types";
import {
  detectHighlightPlatform,
  getHighlightPlatformInfo,
  getHighlightEmbedUrl,
  formatHighlightEmbedUrl,
  isTikTokShortUrl,
  resolveTikTokShortUrl,
} from "~/utils/highlights";

const open = defineModel<boolean>("open", { default: false });
const type = defineModel<MatchEventType>("type", { required: true });
const minute = defineModel<number | null>("minute", { default: null });
const scorerId = defineModel<string | undefined>("scorerId");
const assisterId = defineModel<string | undefined>("assisterId");
const highlightUrl = defineModel<string>("highlightUrl", { default: "" });
const selectedHighlightId = defineModel<string | undefined>("selectedHighlightId");
const highlightCaption = defineModel<string>("highlightCaption", { default: "" });

const props = withDefaults(
  defineProps<{
    fixture: Fixture | null;
    team: "home" | "away";
    scorerOptions: Array<{ label: string; value: string }>;
    assisterOptions: Array<{ label: string; value: string; disabled?: boolean }>;
    noPlayers: boolean;
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

const teamName = computed(() => {
  return props.team === "home"
    ? props.fixture?.homeTeam?.customShortName ||
        props.fixture?.homeTeam?.customName
    : props.fixture?.awayTeam?.customShortName ||
        props.fixture?.awayTeam?.customName;
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
          <div class="flex items-center justify-between gap-4 min-w-0">
            <div class="flex items-center gap-2 min-w-0">
              <UIcon
                name="i-heroicons-trophy"
                class="w-5 h-5 text-green-500 shrink-0"
              />
              <h3
                class="text-lg font-semibold text-gray-900 dark:text-white shrink-0"
              >
                Record Goal
              </h3>
              <UBadge
                :color="team === 'home' ? 'primary' : 'warning'"
                variant="subtle"
                size="sm"
                class="min-w-0"
              >
                <span class="truncate max-w-[120px] sm:max-w-[200px] block">
                  {{ teamName }}
                </span>
              </UBadge>
            </div>
            <UButton
              icon="i-heroicons-x-mark"
              variant="ghost"
              color="neutral"
              size="sm"
              class="shrink-0"
              @click="open = false;"
            />
          </div>
        </template>

        <div class="space-y-4">
          <!-- Goal Type -->
          <UFormField label="Goal Type">
            <USelect
              v-model="type"
              :items="[
                { label: 'Normal Goal', value: 'GOAL' },
                { label: 'Penalty', value: 'PENALTY' },
                { label: 'Missed Penalty', value: 'MISSED_PENALTY' },
                { label: 'Own Goal', value: 'OWN_GOAL' },
              ]"
              class="w-full"
            />
          </UFormField>

          <!-- Minute -->
          <UFormField label="Minute (optional)">
            <UInput
              v-model.number="minute"
              type="number"
              placeholder="e.g. 45"
              icon="i-heroicons-clock"
              :min="0"
              :max="120"
            />
          </UFormField>

          <!-- Scorer -->
          <UFormField label="Goal Scorer (optional)">
            <USelect
              v-model="scorerId"
              :items="scorerOptions"
              placeholder="Select scorer..."
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <!-- Assister -->
          <UFormField
            v-if="type !== 'OWN_GOAL'"
            label="Assist By (optional)"
          >
            <USelect
              v-model="assisterId"
              :items="assisterOptions"
              placeholder="Select assister..."
              value-key="value"
              :disabled="!scorerId"
              class="w-full"
            />
          </UFormField>

          <!-- Goal Highlight Section -->
          <div class="pt-3 border-t border-gray-100 dark:border-white/10 space-y-3">
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
                  New Link
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
              <UFormField label="Select Match Highlight">
                <USelect
                  v-model="selectedHighlightId"
                  :items="existingHighlightOptions"
                  placeholder="Select a highlight..."
                  value-key="value"
                  class="w-full"
                />
              </UFormField>
            </div>

            <!-- New URL input -->
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
                    aria-label="Clear highlight link"
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

            <!-- Optional Highlight Caption -->
            <UFormField
              v-if="highlightUrl || selectedHighlightId"
              label="Highlight Caption (optional)"
            >
              <UInput
                v-model="highlightCaption"
                placeholder="e.g. Stunning volley into the top corner"
                class="w-full"
              />
            </UFormField>
          </div>

          <p v-if="noPlayers" class="text-sm text-gray-500">
            No players registered for this team. You can still record the goal
            without player details.
          </p>

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-2">
            <UButton
              label="Cancel"
              variant="ghost"
              color="neutral"
              @click="open = false;"
            />
            <UButton
              label="Record Goal"
              icon="i-heroicons-check"
              color="success"
              :loading="loading"
              @click="emit('confirm')"
            />
          </div>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
