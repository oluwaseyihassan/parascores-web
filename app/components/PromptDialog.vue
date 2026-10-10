<script setup lang="ts">
import { ModalDialogsKey } from "~/composables/useModalDialogs";

const { promptModalState } = inject(ModalDialogsKey)!;
</script>

<template>
  <!-- Generic Prompt Modal -->
  <UModal
    v-model:open="promptModalState.isOpen"
    :ui="{ content: 'sm:max-w-md' }"
  >
    <template #content>
      <UCard :ui="{ root: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white">
              {{ promptModalState.title }}
            </h3>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark"
              class="-my-1"
              @click="promptModalState.isOpen = false"
            />
          </div>
        </template>

        <div class="py-4">
          <UFormField :label="promptModalState.label">
            <UInput
              v-model="promptModalState.value"
              class="w-full"
              autofocus
              @keyup.enter="promptModalState.onConfirm(promptModalState.value)"
            />
          </UFormField>
        </div>

        <template #footer>
          <div class="flex items-center justify-end gap-3">
            <UButton
              color="neutral"
              variant="ghost"
              :label="promptModalState.cancelLabel"
              @click="promptModalState.isOpen = false"
              :disabled="promptModalState.loading"
            />
            <UButton
              color="primary"
              :label="promptModalState.confirmLabel"
              :loading="promptModalState.loading"
              @click="promptModalState.onConfirm(promptModalState.value)"
              :disabled="!promptModalState.value"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
