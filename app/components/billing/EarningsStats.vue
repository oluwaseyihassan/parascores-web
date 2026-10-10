<script setup lang="ts">
import type { PayoutSummary } from "~/stores/payment";

defineProps<{
  summary: PayoutSummary;
}>();
</script>

<template>
  <!-- Earnings stat cards (scoped to the Earnings tab) -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
    <div class="bg-surface border border-subtle rounded-2xl p-4 sm:p-5">
      <div class="flex items-center gap-2 text-[11px] font-bold text-muted uppercase tracking-wider">
        <UIcon name="i-heroicons-banknotes" class="w-4 h-4 text-emerald-500" />
        <span>Net earned</span>
      </div>
      <p class="mt-2 text-xl sm:text-2xl font-extrabold text-heading tracking-tight tabular-nums">
        ₦{{ (summary.totalNet / 100).toLocaleString() }}
      </p>
      <p class="text-[11px] text-muted mt-0.5">of ₦{{ (summary.totalGross / 100).toLocaleString() }} gross</p>
    </div>
    <div class="bg-surface border border-subtle rounded-2xl p-4 sm:p-5">
      <div class="flex items-center gap-2 text-[11px] font-bold text-muted uppercase tracking-wider">
        <UIcon name="i-heroicons-receipt-percent" class="w-4 h-4 text-emerald-500" />
        <span>Payments</span>
      </div>
      <p class="mt-2 text-xl sm:text-2xl font-extrabold text-heading tracking-tight tabular-nums">
        {{ summary.paymentCount }}
      </p>
      <p class="text-[11px] text-muted mt-0.5">registration payment{{ summary.paymentCount === 1 ? '' : 's' }}</p>
    </div>
    <div class="bg-surface border border-subtle rounded-2xl p-4 sm:p-5">
      <div class="flex items-center gap-2 text-[11px] font-bold text-muted uppercase tracking-wider">
        <UIcon name="i-heroicons-wallet" class="w-4 h-4 text-amber-500" />
        <span>Collected offline</span>
      </div>
      <p class="mt-2 text-xl sm:text-2xl font-extrabold text-heading tracking-tight tabular-nums">
        ₦{{ (summary.offlineGross / 100).toLocaleString() }}
      </p>
      <p class="text-[11px] text-muted mt-0.5">{{ summary.offlineCount }} payment{{ summary.offlineCount === 1 ? '' : 's' }} — no commission</p>
    </div>
    <div class="bg-surface border border-subtle rounded-2xl p-4 sm:p-5">
      <div class="flex items-center gap-2 text-[11px] font-bold text-muted uppercase tracking-wider">
        <UIcon name="i-heroicons-arrow-uturn-left" class="w-4 h-4 text-red-500" />
        <span>Refunded</span>
      </div>
      <p class="mt-2 text-xl sm:text-2xl font-extrabold text-heading tracking-tight tabular-nums">
        ₦{{ (summary.refundedAmount / 100).toLocaleString() }}
      </p>
      <p class="text-[11px] text-muted mt-0.5">{{ summary.refundCount }} refund{{ summary.refundCount === 1 ? '' : 's' }}</p>
    </div>
  </div>
</template>
