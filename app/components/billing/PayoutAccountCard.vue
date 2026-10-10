<script setup lang="ts">
import { storeToRefs } from "pinia";
import type { PayoutAccountStatus } from "~/stores/payment";

const props = defineProps<{
  payoutAccount: PayoutAccountStatus | null;
  isOwner: boolean;
}>();

const emit = defineEmits<{
  saved: [status: PayoutAccountStatus | null];
}>();

const authStore = useAuthStore();
const paymentStore = usePaymentStore();
const { isPro } = storeToRefs(paymentStore);
const { handleError } = useErrors();

const showPayoutForm = ref(false);

function onPayoutSaved(status: PayoutAccountStatus | null) {
  showPayoutForm.value = false;
  emit("saved", status);
}

// Instant payouts (OWNER only)
const togglingInstant = ref(false);

async function handleInstantToggle(enabled: boolean) {
  const orgId = authStore.currentOrganization?.id;
  if (!orgId || togglingInstant.value) return;
  togglingInstant.value = true;
  try {
    const res = await paymentStore.setInstantPayouts(orgId, enabled);
    if (props.payoutAccount) props.payoutAccount.instantPayouts = enabled;
    useToast().add({
      title: enabled ? "Instant Payouts Enabled" : "Instant Payouts Disabled",
      description: res.message,
      color: "success",
    });
  } catch (err: any) {
    handleError(err, { title: "Could Not Update Instant Payouts" });
  } finally {
    togglingInstant.value = false;
  }
}
</script>

<template>
  <section class="bg-surface border border-subtle rounded-2xl overflow-hidden">
    <header class="flex items-center gap-2.5 px-4 py-3 border-b border-subtle">
      <span class="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
        <UIcon name="i-heroicons-building-library" class="w-3.5 h-3.5" />
      </span>
      <h2 class="text-[13px] font-bold text-heading">Payout account</h2>
      <UBadge
        :color="payoutAccount?.hasPayoutAccount ? 'success' : 'neutral'"
        variant="subtle"
        size="sm"
        class="ml-auto"
      >
        {{ payoutAccount?.hasPayoutAccount ? 'Active' : 'Not set up' }}
      </UBadge>
    </header>

    <div class="p-4 sm:p-5 space-y-4">
      <p class="text-[13px] text-muted leading-relaxed">
        <template v-if="payoutAccount?.instantPayouts">
          Instant payouts are on — registration fees are transferred to your bank within minutes of payment. ParaScores keeps only a {{ isPro ? 3 : 5 }}% platform commission{{ isPro ? ' (Pro rate)' : '' }}.
        </template>
        <template v-else>
          Connect a bank account to receive paid registration fees directly. Paystack settles funds to your account the next business day — ParaScores keeps only a {{ isPro ? 3 : 5 }}% platform commission{{ isPro ? ' (Pro rate)' : '' }}.
        </template>
      </p>

      <!-- Connected account -->
      <div
        v-if="payoutAccount?.hasPayoutAccount"
        class="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20"
      >
        <UIcon name="i-heroicons-building-library" class="w-5 h-5 text-emerald-500 shrink-0" />
        <div class="min-w-0 flex-1">
          <p class="text-[13px] font-semibold text-heading truncate">{{ payoutAccount.accountName }}</p>
          <p class="text-[11px] text-muted">
            <template v-if="payoutAccount.bankName">{{ payoutAccount.bankName }} · </template>{{ payoutAccount.accountNumberMasked }}
          </p>
        </div>
        <UButton
          v-if="!showPayoutForm"
          size="sm"
          variant="outline"
          color="neutral"
          icon="i-heroicons-pencil-square"
          label="Change"
          class="shrink-0"
          @click="showPayoutForm = true"
        />
      </div>

      <!-- Instant payouts toggle (OWNER only) -->
      <div
        v-if="payoutAccount?.hasPayoutAccount && isOwner"
        class="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-subtle bg-black/[0.02] dark:bg-white/[0.02]"
      >
        <div class="flex items-start gap-3 min-w-0">
          <UIcon name="i-heroicons-bolt" class="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div class="min-w-0">
            <p class="text-[13px] font-semibold text-heading">Instant payouts</p>
            <p class="text-[11px] text-muted mt-0.5">
              Transfer registration fees to your bank within minutes of payment, instead of settling the next business day.
            </p>
          </div>
        </div>
        <USwitch
          :model-value="!!payoutAccount.instantPayouts"
          :loading="togglingInstant"
          @update:model-value="(v) => handleInstantToggle(!!v)"
        />
      </div>

      <!-- Setup / change form -->
      <PayoutAccountForm
        v-if="showPayoutForm || !payoutAccount?.hasPayoutAccount"
        :org-id="authStore.currentOrganization?.id"
        :initial-bank-code="payoutAccount?.bankCode"
        :is-update="!!payoutAccount?.hasPayoutAccount"
        @saved="onPayoutSaved"
      />
    </div>
  </section>
</template>
