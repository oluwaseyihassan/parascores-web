<script setup lang="ts">
import type { PayoutSummary } from "~/stores/payment";

defineProps<{
  summary: PayoutSummary;
}>();
</script>

<template>
  <!-- Per-tournament earnings (lifted out of the payout card) -->
  <section class="bg-surface border border-subtle rounded-2xl overflow-hidden">
    <header class="flex items-center gap-2.5 px-4 py-3 border-b border-subtle">
      <span class="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
        <UIcon name="i-heroicons-chart-bar" class="w-3.5 h-3.5" />
      </span>
      <h2 class="text-[13px] font-bold text-heading">Earnings by tournament</h2>
      <span class="ml-auto text-[11px] text-muted">after {{ summary.commissionPercent }}% commission · estimates</span>
    </header>

    <div class="px-4 sm:px-5 py-3">
      <div
        v-for="t in summary.tournaments"
        :key="t.id"
        class="flex items-center justify-between gap-3 py-2.5 border-b border-subtle last:border-b-0 text-[13px]"
      >
        <span class="text-body truncate">{{ t.name }}</span>
        <span class="text-heading font-bold shrink-0 tabular-nums">
          ₦{{ (t.net / 100).toLocaleString() }}
          <span class="text-[11px] font-normal text-muted">net</span>
        </span>
      </div>

      <div class="flex items-center justify-between gap-3 pt-3 mt-1 border-t border-subtle">
        <span class="text-[13px] font-extrabold text-heading">Total</span>
        <span class="text-[13px] font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0 tabular-nums">
          ₦{{ (summary.totalNet / 100).toLocaleString() }}
          <span class="text-[11px] font-normal text-muted">of ₦{{ (summary.totalGross / 100).toLocaleString() }} gross</span>
        </span>
      </div>

      <p v-if="summary.offlineCount > 0" class="flex items-center gap-1.5 mt-3 pt-3 border-t border-subtle text-[11px] text-muted">
        <UIcon name="i-heroicons-banknotes" class="w-3.5 h-3.5 shrink-0" />
        <span>
          Includes <span class="font-semibold text-heading">₦{{ (summary.offlineGross / 100).toLocaleString() }}</span>
          collected offline ({{ summary.offlineCount }} payment{{ summary.offlineCount === 1 ? '' : 's' }}) — no commission on offline income.
        </span>
      </p>
      <p v-if="summary.refundCount > 0" class="flex items-center gap-1.5 mt-2 text-[11px] text-muted">
        <UIcon name="i-heroicons-arrow-uturn-left" class="w-3.5 h-3.5 shrink-0" />
        <span>
          <span class="font-semibold text-heading">₦{{ (summary.refundedAmount / 100).toLocaleString() }}</span>
          refunded across {{ summary.refundCount }} payment{{ summary.refundCount === 1 ? '' : 's' }} (excluded from totals).
        </span>
      </p>
      <p class="mt-3 pt-3 border-t border-subtle text-[10px] text-muted">
        Estimates after {{ summary.commissionPercent }}% commission on online payments, before Paystack fees. Settlements arrive the next business day.
      </p>
    </div>
  </section>
</template>
