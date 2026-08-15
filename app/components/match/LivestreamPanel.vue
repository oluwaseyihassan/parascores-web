<script setup lang="ts">
import { MatchLivestreamKey } from "~/composables/match/useMatchLivestream";
import type { Fixture } from "~/types";

const collapsed = defineModel<boolean>("collapsed", { default: false });

defineProps<{
  fixture: Fixture | null;
}>();

const {
  livestreamUrl,
  livestreamPlatform,
  updatingLivestream,
  livestreamPlatformOptions,
  selectedLivestreamPlatformInfo,
  isLivestreamDisabled,
  getLivestreamPlatformInfo,
  updateLivestream,
} = inject(MatchLivestreamKey)!;
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
      <span>Livestream</span>
      <span v-if="fixture?.livestreamUrl" class="mc-tag mc-tag--success"
        >configured</span
      >
      <UIcon
        name="i-heroicons-chevron-down"
        class="w-4 h-4 ml-auto transition-transform"
        :class="{ 'rotate-180': collapsed }"
      />
    </div>
    <div v-show="collapsed" class="mc-section__body">
      <div class="flex flex-col gap-2">
        <USelect
          v-model="livestreamPlatform"
          :items="livestreamPlatformOptions"
          value-key="value"
          placeholder="Select platform…"
          class="w-full"
          size="md"
          :disabled="updatingLivestream"
        >
          <template #leading="{ modelValue }">
            <UIcon
              v-if="getLivestreamPlatformInfo(modelValue)?.icon"
              :name="getLivestreamPlatformInfo(modelValue)!.icon"
              class="w-4 h-4"
              :class="getLivestreamPlatformInfo(modelValue)!.color"
            />
          </template>
        </USelect>
        <UInput
          v-model="livestreamUrl"
          type="text"
          :placeholder="
            selectedLivestreamPlatformInfo?.placeholder ||
            'https://...'
          "
          class="w-full"
          size="md"
          :disabled="updatingLivestream"
        />
      </div>
      <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Paste the public watch URL for your stream. YouTube, Twitch, and Vimeo
        can be embedded directly.
      </p>
      <UButton
        color="primary"
        variant="solid"
        size="sm"
        :loading="updatingLivestream"
        :disabled="isLivestreamDisabled"
        @click="updateLivestream"
        class="mt-3 w-full sm:w-auto"
      >
        {{ livestreamUrl ? "Update Livestream" : "Remove Livestream" }}
      </UButton>
    </div>
  </div>
</template>
