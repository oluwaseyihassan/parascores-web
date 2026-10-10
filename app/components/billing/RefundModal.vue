<script setup lang="ts">
import type { PaymentRecord } from "~/stores/payment";

const props = defineProps<{
  payment: PaymentRecord | null;
}>();

const open = defineModel<boolean>("open", { default: false });

const emit = defineEmits<{
  refunded: [];
}>();

const paymentStore = usePaymentStore();
const { handleError } = useErrors();

const refundReason = ref("");
const refundManual = ref(false);
const refunding = ref(false);

// Reset whenever the modal opens
watch(open, (isOpen) => {
  if (!isOpen) return;
  refundReason.value = "";
  refundManual.value = false;
});

function paymentLabel(payment: PaymentRecord) {
  if (payment.type === "OFFLINE_REGISTRATION") {
    return payment.teamName ? `Offline · ${payment.teamName}` : "Offline Registration";
  }
  if (payment.type === "TOURNAMENT_REGISTRATION") {
    const base = payment.teamName ? `Registration · ${payment.teamName}` : "Registration";
    return payment.metadata?.waived ? `${base} (waived)` : base;
  }
  return payment.plan === "PER_TOURNAMENT" ? "Tournament Upgrade" : payment.plan === "PRO" ? "Pro Plan" : payment.plan || "Payment";
}

function isOnlinePayment(p: PaymentRecord) {
  return p.type === "TOURNAMENT_REGISTRATION" && !p.metadata?.waived;
}

async function handleRefund() {
  if (!props.payment) return;
  refunding.value = true;
  try {
    const res = await paymentStore.refundPayment(
      props.payment.id,
      refundReason.value || undefined,
      refundManual.value || undefined,
    );
    open.value = false;
    useToast().add({
      title: "Refund Processed",
      description: res.message,
      color: "success",
    });
    emit("refunded");
  } catch (err: any) {
    handleError(err, { title: "Refund Failed" });
  } finally {
    refunding.value = false;
  }
}
</script>

<template>
  <!-- Refund Payment Modal -->
  <UModal v-model:open="open">
    <template #content>
      <UCard v-if="payment">
        <template #header>
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                <UIcon name="i-heroicons-arrow-uturn-left" class="w-5 h-5 text-red-500" />
              </div>
              <div class="min-w-0">
                <h3 class="text-lg font-bold text-heading">Refund Payment</h3>
                <p class="text-xs text-muted truncate">{{ paymentLabel(payment) }} · ₦{{ (payment.amount / 100).toLocaleString() }}</p>
              </div>
            </div>
            <UButton icon="i-heroicons-x-mark" variant="ghost" color="neutral" size="sm" class="shrink-0" @click="open = false" />
          </div>
        </template>

        <div class="mb-4 p-3 rounded-xl flex items-start gap-2.5 text-xs bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 text-body">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <template v-if="payment.type === 'OFFLINE_REGISTRATION'">
              This only marks the payment as refunded — return the money to the payer directly (cash/transfer).
            </template>
            <template v-else-if="refundManual">
              The payment is marked as refunded, but <span class="font-bold">you</span> return ₦{{ (payment.amount / 100).toLocaleString() }} to the payer yourself (bank transfer/cash). Use this if the automatic refund fails because your unsettled payout balance is too low.
            </template>
            <template v-else>
              The full ₦{{ (payment.amount / 100).toLocaleString() }} will be refunded to the payer via Paystack (3–10 business days). Paystack deducts refunds from your unsettled payout first.
            </template>
            This does <span class="font-bold">not</span> remove the team from the tournament — withdraw them separately if needed.
          </div>
        </div>

        <!-- Refund method (online payments only) -->
        <div v-if="isOnlinePayment(payment)" class="mb-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            :class="[
              'p-3 rounded-xl border text-left transition-all',
              !refundManual
                ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500'
                : 'border-subtle hover:border-emerald-500/40'
            ]"
            @click="refundManual = false"
          >
            <p class="text-sm font-semibold text-heading">Automatic refund</p>
            <p class="text-[11px] text-muted mt-0.5">Paystack returns the money to the payer's card/bank account.</p>
          </button>
          <button
            type="button"
            :class="[
              'p-3 rounded-xl border text-left transition-all',
              refundManual
                ? 'border-amber-500 bg-amber-500/5 ring-1 ring-amber-500'
                : 'border-subtle hover:border-amber-500/40'
            ]"
            @click="refundManual = true"
          >
            <p class="text-sm font-semibold text-heading">Manual refund</p>
            <p class="text-[11px] text-muted mt-0.5">You return the money yourself; we just record it.</p>
          </button>
        </div>

        <UFormField label="Reason (optional)">
          <UInput
            v-model="refundReason"
            placeholder="e.g. Team withdrew before the draw"
            class="w-full"
          />
        </UFormField>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" label="Cancel" @click="open = false" />
            <UButton
              color="error"
              icon="i-heroicons-arrow-uturn-left"
              label="Confirm Refund"
              :loading="refunding"
              @click="handleRefund"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
