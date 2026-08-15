<script setup lang="ts">
const open = defineModel<boolean>("open", { default: false });

defineProps<{
  loading: boolean;
}>();

const emit = defineEmits<{
  confirm: [];
}>();
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon
                name="i-heroicons-arrows-right-left"
                class="w-5 h-5 text-warning-500"
              />
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                Swap Teams
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
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Are you sure you want to swap home and away teams? This will also
            swap scores, penalties, and lineups.
          </p>

          <div class="flex justify-end gap-3 pt-2">
            <UButton
              label="Cancel"
              variant="ghost"
              color="neutral"
              @click="open = false;"
            />
            <UButton
              label="Swap Teams"
              icon="i-heroicons-arrows-right-left"
              color="warning"
              :loading="loading"
              @click="emit('confirm')"
            />
          </div>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
