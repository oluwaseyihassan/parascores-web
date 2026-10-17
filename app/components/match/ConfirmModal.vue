<script setup lang="ts">
const open = defineModel<boolean>("open", { default: false });

defineProps<{
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor?:
    | "info"
    | "error"
    | "success"
    | "primary"
    | "secondary"
    | "warning"
    | "neutral";
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
                :name="confirmColor === 'success' ? 'i-heroicons-clock' : 'i-heroicons-exclamation-triangle'"
                class="w-5 h-5"
                :class="confirmColor === 'success' ? 'text-emerald-500' : 'text-error-500'"
              />
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ title }}
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
            {{ message }}
          </p>

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
              :label="confirmLabel"
              :icon="confirmColor === 'success' ? 'i-heroicons-forward' : 'i-heroicons-exclamation-triangle'"
              :color="confirmColor || 'error'"
              :loading="loading"
              @click="emit('confirm')"
            />
          </div>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
