<script setup lang="ts">
const props = defineProps<{
  imageUrl: string | null
  title?: string
}>()

const open = defineModel<boolean>('open', { default: false })
</script>

<template>
  <UModal v-model:open="open" :ui="{ content: 'sm:max-w-3xl' }">
    <template #content>
      <UCard :ui="{ body: 'p-2 sm:p-3' }">
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <h3 class="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <span>🖼</span> {{ title || 'Screenshot evidence' }}
            </h3>
            <div class="flex items-center gap-2">
              <a
                v-if="imageUrl"
                :href="imageUrl"
                target="_blank"
                class="text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white inline-flex items-center gap-1"
              >
                Open original ↗
              </a>
              <UButton
                size="xs"
                variant="ghost"
                color="neutral"
                icon="i-heroicons-x-mark"
                @click="open = false"
              />
            </div>
          </div>
        </template>

        <div v-if="imageUrl" class="flex items-center justify-center bg-black/80 rounded-xl overflow-hidden min-h-[300px] max-h-[75vh]">
          <img
            :src="imageUrl"
            class="max-w-full max-h-[75vh] object-contain mx-auto"
            alt="Screenshot evidence"
          />
        </div>
      </UCard>
    </template>
  </UModal>
</template>
