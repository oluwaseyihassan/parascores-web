<script setup lang="ts">
export interface PlayerSelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

const model = defineModel<string | undefined>();

const props = withDefaults(
  defineProps<{
    items: PlayerSelectOption[];
    placeholder?: string;
    searchPlaceholder?: string;
    disabled?: boolean;
    size?: "xs" | "sm" | "md" | "lg" | "xl";
    clearable?: boolean;
  }>(),
  {
    placeholder: "Select player...",
    searchPlaceholder: "Search player...",
    disabled: false,
    size: "md",
    clearable: true,
  },
);

const searchTerm = ref("");
const menuOpen = ref(false);

const mappedItems = computed(() =>
  props.items.map((opt) => ({
    ...opt,
    onSelect: (e: Event) => {
      if (props.clearable && model.value === opt.value) {
        e.preventDefault();
        model.value = undefined;
        menuOpen.value = false;
      }
    },
  })),
);

function clearSelection() {
  if (props.disabled) return;
  model.value = undefined;
  searchTerm.value = "";
  menuOpen.value = false;
}

function getHighlightParts(label: string): Array<{ text: string; match: boolean }> {
  const query = searchTerm.value.trim();
  if (!query) return [{ text: label, match: false }];

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts: Array<{ text: string; match: boolean }> = [];
  let lastIndex = 0;

  for (const m of label.matchAll(regex)) {
    const idx = m.index ?? 0;
    if (idx > lastIndex) {
      parts.push({ text: label.slice(lastIndex, idx), match: false });
    }
    if (m[0]) {
      parts.push({ text: m[0], match: true });
    }
    lastIndex = idx + m[0].length;
  }

  if (lastIndex < label.length) {
    parts.push({ text: label.slice(lastIndex), match: false });
  }

  return parts.length > 0 ? parts : [{ text: label, match: false }];
}
</script>

<template>
  <USelectMenu
    v-model="model"
    v-model:search-term="searchTerm"
    v-model:open="menuOpen"
    :items="mappedItems"
    value-key="value"
    :placeholder="placeholder"
    :search-input="{ placeholder: searchPlaceholder }"
    :disabled="disabled"
    :size="size"
    class="w-full"
  >
    <template #trailing>
      <div class="flex items-center gap-1">
        <button
          v-if="clearable && model && !disabled"
          type="button"
          aria-label="Clear selection"
          title="Deselect"
          class="p-0.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          @pointerdown.stop.prevent
          @click.stop.prevent="clearSelection"
        >
          <UIcon name="i-heroicons-x-mark" class="w-3.5 h-3.5" />
        </button>
        <UIcon
          name="i-heroicons-chevron-down"
          class="w-4 h-4 text-gray-400 transition-transform duration-150"
          :class="menuOpen ? 'rotate-180' : ''"
        />
      </div>
    </template>

    <template #content-top>
      <div
        v-if="clearable && model"
        class="p-1 border-b border-gray-100 dark:border-white/[0.06]"
      >
        <button
          type="button"
          class="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
          @click="clearSelection"
        >
          <UIcon name="i-heroicons-x-circle" class="w-3.5 h-3.5" />
          <span>Clear selection</span>
        </button>
      </div>
    </template>

    <template #item-label="{ item }">
      <span class="truncate">
        <template
          v-for="(part, idx) in getHighlightParts(String(item.label ?? ''))"
          :key="idx"
        >
          <mark
            v-if="part.match"
            class="bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 rounded-xs px-0.5 font-semibold"
          >{{ part.text }}</mark>
          <template v-else>{{ part.text }}</template>
        </template>
      </span>
    </template>
  </USelectMenu>
</template>
