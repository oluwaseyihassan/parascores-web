<script setup lang="ts">
import type { PayoutAccountStatus } from '~/stores/payment'

const open = defineModel<boolean>('open', { default: false })

defineProps<{
  orgId?: string | null
}>()

const emit = defineEmits<{
  saved: [status: PayoutAccountStatus | null]
}>()

function onSaved(status: PayoutAccountStatus | null) {
  open.value = false
  emit('saved', status)
}
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-banknotes" class="w-5 h-5 text-emerald-500" />
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                Set Up Payout Account
              </h3>
            </div>
            <UButton
              icon="i-heroicons-x-mark"
              variant="ghost"
              color="neutral"
              size="sm"
              @click="open = false"
            />
          </div>
        </template>

        <div class="space-y-4">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Registration fees are settled directly to this bank account by
            Paystack the next business day.
          </p>
          <PayoutAccountForm v-if="orgId" :org-id="orgId" @saved="onSaved" />
        </div>
      </UCard>
    </template>
  </UModal>
</template>
