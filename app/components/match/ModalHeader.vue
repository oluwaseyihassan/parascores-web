<script setup lang="ts">
import type { Fixture } from "~/types";

const props = defineProps<{
  fixture: Fixture | null;
  canShare: boolean;
  sharingMatch: boolean;
  swappingTeams: boolean;
}>();

const emit = defineEmits<{
  close: [];
  share: [];
  swap: [];
  download: [];
}>();

// Secondary match actions live here (scoreboard stays clean)
const overflowItems = computed(() => [
  [
    {
      label: "Swap teams",
      icon: "i-heroicons-arrows-right-left",
      disabled: props.swappingTeams,
      onSelect: () => emit("swap"),
    },
    {
      label: "Download graphic",
      icon: "i-heroicons-arrow-down-tray",
      onSelect: () => emit("download"),
    },
  ],
]);
</script>

<template>
  <div class="mc-header">
    <div class="mc-header__left">
      <span class="mc-header__title">Match Control</span>
      <span
        v-if="fixture"
        class="mc-status-chip"
        :class="`mc-status-chip--${fixture.status.toLowerCase()}`"
      >
        <span class="mc-status-chip__dot" />
        {{ fixture.status }}
      </span>
      <span v-if="fixture?.roundName" class="mc-header__meta">{{
        fixture.roundName
      }}</span>
    </div>
    <div class="mc-header__right">
      <button
        v-if="canShare"
        class="mc-header__share"
        :disabled="sharingMatch"
        @click="emit('share')"
        title="Share match"
      >
        <UIcon name="i-heroicons-share" class="w-4 h-4" />
      </button>
      <UDropdownMenu :items="overflowItems" :content="{ align: 'end' }">
        <button class="mc-header__more" title="More actions">
          <UIcon name="i-heroicons-ellipsis-vertical" class="w-4 h-4" />
        </button>
      </UDropdownMenu>
      <button class="mc-header__close" @click="emit('close')">
        <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>
