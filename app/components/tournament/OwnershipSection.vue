<script setup lang="ts">
const emit = defineEmits<{
  "start-season": [];
  transfer: [];
}>();
</script>

<template>
  <section
    id="ownership"
    class="scroll-mt-28 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden"
  >
    <div
      class="px-4 sm:px-5 py-3.5 border-b border-gray-100 dark:border-white/[0.06]"
    >
      <h2 class="text-sm font-semibold text-gray-900 dark:text-white">
        Season &amp; ownership
      </h2>
      <p class="text-xs text-gray-500 mt-0.5">
        Lifecycle actions — rare, but safe to run.
      </p>
    </div>
    <div class="px-4 sm:px-5 py-2">
      <div
        class="flex items-center justify-between gap-3 py-3 border-b border-gray-100 dark:border-white/[0.05] flex-wrap"
      >
        <div class="flex items-center gap-3 min-w-0">
          <span
            class="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0"
          >
            <UIcon
              name="i-heroicons-arrow-path"
              class="w-4.5 h-4.5 text-indigo-500 dark:text-indigo-400"
            />
          </span>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-gray-900 dark:text-white">
              Start new season
            </p>
            <p class="text-xs text-gray-500 mt-0.5">
              Clone settings into a new season. Teams and
              fixtures are not copied.
            </p>
          </div>
        </div>
        <UButton
          type="button"
          color="neutral"
          variant="soft"
          size="sm"
          icon="i-heroicons-document-duplicate"
          label="Start New Season"
          @click="emit('start-season')"
        />
      </div>
      <div
        class="flex items-center justify-between gap-3 py-3 flex-wrap"
      >
        <div class="flex items-center gap-3 min-w-0">
          <span
            class="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0"
          >
            <UIcon
              name="i-heroicons-arrows-right-left"
              class="w-4.5 h-4.5 text-amber-500"
            />
          </span>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-gray-900 dark:text-white">
              Transfer ownership
            </p>
            <p class="text-xs text-gray-500 mt-0.5">
              Move this tournament to another organization you
              admin. You may lose access to it in this
              workspace.
            </p>
          </div>
        </div>
        <UButton
          type="button"
          color="neutral"
          variant="soft"
          size="sm"
          icon="i-heroicons-arrows-right-left"
          label="Transfer Ownership"
          @click="emit('transfer')"
        />
      </div>
    </div>
  </section>
</template>
