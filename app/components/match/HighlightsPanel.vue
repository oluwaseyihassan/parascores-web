<script setup lang="ts">
import { HighlightsKey } from "~/composables/match/useHighlights";
import { formatHighlightEmbedUrl } from "~/utils/highlights";

const collapsed = defineModel<boolean>("collapsed", { default: false });

const {
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
  addHighlight,
  removeHighlight,
} = inject(HighlightsKey)!;
</script>

<template>
  <div class="mc-section">
    <div
      class="mc-section__head cursor-pointer"
      @click="collapsed = !collapsed"
    >
      <UIcon
        name="i-heroicons-video-camera"
        class="w-3.5 h-3.5 text-rose-500"
      />
      <span>Match Highlights</span>
      <span class="mc-tag">{{ highlights.length }}</span>
      <UIcon
        name="i-heroicons-chevron-down"
        class="w-4 h-4 ml-auto transition-transform"
        :class="{ 'rotate-180': collapsed }"
      />
    </div>
    <div v-show="collapsed" class="mc-section__body space-y-4">
      <div class="space-y-3">
        <div class="flex flex-col sm:flex-row gap-2">
          <UFormField label="Platform" class="sm:w-40 shrink-0">
            <USelect
              v-model="newHighlightPlatform"
              :items="highlightPlatformOptions"
              placeholder="Select..."
              value-key="value"
              class="w-full"
            />
          </UFormField>
          <UFormField
            :label="
              selectedHighlightPlatformInfo?.placeholder || 'Video URL'
            "
            class="flex-1"
          >
            <UInput
              v-model="newHighlightUrl"
              :placeholder="
                selectedHighlightPlatformInfo?.placeholder ||
                'https://...'
              "
              class="w-full"
            />
          </UFormField>
        </div>
        <UFormField
          v-if="goalEventSelectOptions.length > 1"
          label="Link to Goal (optional)"
        >
          <USelect
            v-model="linkedGoalEventId"
            :items="goalEventSelectOptions"
            placeholder="Select a goal..."
            value-key="value"
            class="w-full"
          />
        </UFormField>
        <div class="flex flex-col sm:flex-row gap-2 sm:items-end">
          <UFormField label="Caption (optional)" class="flex-1">
            <UInput
              v-model="newHighlightCaption"
              placeholder="e.g. 90th minute winner"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Secs" class="sm:w-24 shrink-0">
            <UInput
              v-model.number="newHighlightDuration"
              type="number"
              placeholder="30"
              class="w-full"
            />
          </UFormField>
          <UButton
            size="sm"
            color="success"
            variant="soft"
            icon="i-heroicons-plus"
            label="Add Highlight"
            :loading="savingHighlight"
            :disabled="isAddHighlightDisabled"
            @click="addHighlight"
            class="shrink-0"
          />
        </div>
      </div>

      <div class="border-t border-gray-200 dark:border-white/10 pt-4">
        <div
          v-if="loadingHighlights"
          class="flex items-center justify-center gap-2 py-6 text-sm text-gray-400"
        >
          <UIcon
            name="i-heroicons-arrow-path"
            class="w-4 h-4 animate-spin"
          />
          Loading…
        </div>
        <div
          v-else-if="highlights.length === 0"
          class="py-6 text-center text-sm text-gray-400"
        >
          No highlights added yet.
        </div>
        <div v-else class="space-y-4">
          <div
            v-for="highlight in highlights"
            :key="highlight.id"
            class="rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden bg-white dark:bg-gray-900"
          >
            <div class="aspect-[9/16] max-h-[420px] w-full bg-black">
              <iframe
                v-if="highlight.embedUrl"
                :src="formatHighlightEmbedUrl(highlight.embedUrl)"
                class="w-full h-full"
                frameborder="0"
                allowfullscreen
                allow="fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                loading="lazy"
                :title="highlight.caption || 'Match highlight'"
              />
            </div>
            <div class="p-3 space-y-2">
              <div class="flex items-center justify-between">
                <span
                  class="text-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  {{
                    getHighlightPlatformInfo(highlight.platform)?.label ||
                    highlight.platform
                  }}
                </span>
                <UButton
                  size="xs"
                  color="error"
                  variant="ghost"
                  icon="i-heroicons-trash"
                  :loading="deletingHighlightId === highlight.id"
                  @click="removeHighlight(highlight)"
                />
              </div>
              <p
                v-if="highlight.caption"
                class="text-sm text-gray-900 dark:text-white"
              >
                {{ highlight.caption }}
              </p>
              <p
                v-if="highlight.duration"
                class="text-xs text-gray-500 dark:text-gray-400"
              >
                {{ highlight.duration }}s
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
