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
                name="i-heroicons-exclamation-triangle"
                class="w-5 h-5 text-error-500"
              />
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                Remove Penalties
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
          <p class="text-gray-600 dark:text-gray-300">
            Are you sure you want to remove all penalty shootout scores? This
            action cannot be undone.
          </p>

          <!-- Actions -->
          <div
            class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800"
          >
            <UButton
              label="Cancel"
              variant="ghost"
              color="neutral"
              @click="open = false;"
            />
            <UButton
              label="Remove Penalties"
              icon="i-heroicons-trash"
              color="error"
              :loading="loading"
              @click="emit('confirm')"
            />
          </div>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
