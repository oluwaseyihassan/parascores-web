<script setup lang="ts">
import {
  getHighlightPlatformInfo,
  getHighlightEmbedUrl,
  formatHighlightEmbedUrl,
} from "~/utils/highlights";

const open = defineModel<boolean>("open", { default: false });

const props = defineProps<{
  title?: string;
  subtitle?: string;
  highlight?: {
    embedUrl?: string | null;
    externalUrl?: string | null;
    platform?: string | null;
    caption?: string | null;
    thumbnailUrl?: string | null;
  } | null;
}>();

const platformInfo = computed(() => {
  return getHighlightPlatformInfo(props.highlight?.platform);
});

const resolvedEmbedUrl = computed(() => {
  if (props.highlight?.embedUrl) {
    return formatHighlightEmbedUrl(props.highlight.embedUrl);
  }
  if (props.highlight?.externalUrl) {
    return getHighlightEmbedUrl(props.highlight.externalUrl, props.highlight.platform);
  }
  return null;
});
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-3 min-w-0">
            <div class="flex items-center gap-2 min-w-0">
              <div class="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
                <UIcon
                  name="i-heroicons-video-camera"
                  class="w-4 h-4 text-rose-500"
                />
              </div>
              <div class="min-w-0">
                <h3 class="text-base font-semibold text-gray-900 dark:text-white truncate">
                  {{ title || "Goal Highlight" }}
                </h3>
                <p v-if="subtitle" class="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {{ subtitle }}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <UBadge
                v-if="platformInfo"
                color="neutral"
                variant="subtle"
                size="sm"
                class="hidden sm:flex items-center gap-1"
              >
                <UIcon :name="platformInfo.icon" class="w-3.5 h-3.5" />
                <span>{{ platformInfo.label }}</span>
              </UBadge>
              <UButton
                icon="i-heroicons-x-mark"
                variant="ghost"
                color="neutral"
                size="sm"
                @click="open = false;"
              />
            </div>
          </div>
        </template>

        <div class="space-y-4">
          <!-- Video Frame -->
          <div
            v-if="resolvedEmbedUrl"
            class="aspect-[9/16] max-h-[500px] w-full max-w-[320px] sm:max-w-[360px] mx-auto rounded-xl overflow-hidden bg-black shadow-xl ring-1 ring-black/10 dark:ring-white/10"
          >
            <iframe
              :src="resolvedEmbedUrl"
              class="w-full h-full"
              frameborder="0"
              allowfullscreen
              allow="fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              loading="lazy"
              :title="highlight?.caption || title || 'Goal highlight'"
            />
          </div>

          <!-- Fallback when no embed is possible but external URL exists -->
          <div
            v-else-if="highlight?.externalUrl"
            class="aspect-video w-full rounded-xl bg-gray-100 dark:bg-white/5 flex flex-col items-center justify-center p-6 text-center ring-1 ring-gray-200 dark:ring-white/10"
          >
            <UIcon
              name="i-heroicons-arrow-top-right-on-square"
              class="w-10 h-10 text-gray-400 mb-2"
            />
            <p class="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Embedded preview not available
            </p>
            <p class="text-xs text-gray-500 mt-1 max-w-xs">
              Watch this clip directly on {{ platformInfo?.label || "the platform" }}.
            </p>
          </div>

          <!-- Caption -->
          <p
            v-if="highlight?.caption"
            class="text-sm text-center text-gray-700 dark:text-gray-300 font-medium px-3"
          >
            {{ highlight.caption }}
          </p>

          <!-- External open button -->
          <div v-if="highlight?.externalUrl" class="flex justify-center pt-1">
            <UButton
              :to="highlight.externalUrl"
              target="_blank"
              rel="noopener noreferrer"
              color="primary"
              variant="soft"
              size="sm"
              icon="i-heroicons-arrow-top-right-on-square"
              :label="`Watch on ${platformInfo?.label || 'Platform'}`"
            />
          </div>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
