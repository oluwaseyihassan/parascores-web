<script setup lang="ts">
import { ModalDialogsKey } from "~/composables/useModalDialogs";

const { confirmModalState } = inject(ModalDialogsKey)!;
</script>

<template>
  <!-- Generic Confirmation Modal -->
  <UModal
    v-model:open="confirmModalState.isOpen"
    :ui="{ content: 'sm:max-w-md' }"
  >
    <template #content>
      <UCard :ui="{ root: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <template #header>
          <div class="flex items-center justify-between">
            <h3
              class="text-base font-semibold leading-6 text-gray-900 dark:text-white flex items-center gap-2"
            >
              <UIcon
                :name="
                  confirmModalState.color === 'error'
                    ? 'i-heroicons-exclamation-triangle'
                    : 'i-heroicons-information-circle'
                "
                class="w-5 h-5"
                :class="
                  confirmModalState.color === 'error'
                    ? 'text-red-500'
                    : 'text-blue-500'
                "
              />
              {{ confirmModalState.title }}
            </h3>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark"
              class="-my-1"
              @click="confirmModalState.isOpen = false"
            />
          </div>
        </template>

        <div class="py-4">
          <p class="text-sm text-gray-600 dark:text-gray-300">
            {{ confirmModalState.description }}
          </p>
        </div>

        <template #footer>
          <div class="flex items-center justify-end gap-3">
            <UButton
              color="neutral"
              variant="ghost"
              :label="confirmModalState.cancelLabel"
              @click="confirmModalState.isOpen = false"
              :disabled="confirmModalState.loading"
            />
            <UButton
              :color="confirmModalState.color"
              :label="confirmModalState.confirmLabel"
              :loading="confirmModalState.loading"
              @click="confirmModalState.onConfirm"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
