<script setup lang="ts">
const open = defineModel<boolean>("open", { default: false });

const emit = defineEmits<{
  cancelled: [];
}>();

const authStore = useAuthStore();
const paymentStore = usePaymentStore();
const { handleError } = useErrors();

const cancelling = ref(false);

async function handleCancelSubscription() {
  if (!authStore.currentOrganization?.id) return;

  cancelling.value = true;
  try {
    await paymentStore.cancelSubscription(authStore.currentOrganization.id);
    open.value = false;
    useToast().add({
      title: "Subscription Cancelled",
      description: "Your subscription has been cancelled. Features remain active until the end of your billing period.",
      color: "success",
    });
    emit("cancelled");
  } catch (err: any) {
    handleError(err, { title: "Cancellation Failed" });
  } finally {
    cancelling.value = false;
  }
}
</script>

<template>
  <!-- Cancel Subscription Confirmation -->
  <UModal v-model:open="open" :ui="{ content: 'sm:max-w-md' }">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-500" />
            </div>
            <h3 class="text-lg font-bold text-heading">Cancel Subscription?</h3>
          </div>
        </template>

        <p class="text-sm text-body leading-relaxed">
          Are you sure you want to cancel your <strong>Pro</strong> subscription?
          You'll keep access to Pro features until the end of your current billing
          period. After that, your account will revert to the Free plan.
        </p>

        <template #footer>
          <div class="flex items-center gap-3">
            <UButton
              label="Keep Plan"
              color="neutral"
              variant="soft"
              class="flex-1 font-bold"
              @click="open = false"
            />
            <UButton
              label="Cancel Plan"
              color="error"
              variant="solid"
              class="flex-1 font-bold"
              :loading="cancelling"
              @click="handleCancelSubscription"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
