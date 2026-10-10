<script setup lang="ts">
import type { PaymentRecord } from "~/stores/payment";
import type { Tournament } from "~/types";

const props = defineProps<{
  payments: PaymentRecord[];
  tournaments: Tournament[];
  isOwner: boolean;
  refreshing: boolean;
  exporting: boolean;
  retryingPayoutId: string | null;
}>();

const emit = defineEmits<{
  refresh: [];
  export: [tournamentId: string | undefined];
  record: [];
  refund: [payment: PaymentRecord];
  retry: [payment: PaymentRecord];
}>();

// Export tournament filter ('all' sentinel — Reka UI rejects empty-string values)
const exportTournamentId = ref("all");

const exportTournamentOptions = computed(() => [
  { label: "All tournaments", value: "all" },
  ...props.tournaments.map((t) => ({ label: t.name, value: t.id })),
]);

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

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

function statusBadgeColor(status: string) {
  switch (status) {
    case "SUCCESS": return "success" as const;
    case "PENDING": return "warning" as const;
    case "REFUNDED": return "neutral" as const;
    default: return "error" as const;
  }
}

// Payout status chip for online registration payments (instant-payout orgs)
function payoutChip(p: PaymentRecord) {
  if (p.type !== "TOURNAMENT_REGISTRATION" || !p.payoutStatus) return null;
  switch (p.payoutStatus) {
    case "PROCESSING": return { label: "Payout processing", color: "warning" as const };
    case "SUCCESS": return { label: "Paid out instantly", color: "success" as const };
    case "FAILED": return { label: "Payout failed", color: "error" as const };
    case "REVERSED": return { label: "Payout reversed", color: "error" as const };
    default: return null;
  }
}

function canRefund(p: PaymentRecord) {
  return props.isOwner
    && p.status === "SUCCESS"
    && ["TOURNAMENT_REGISTRATION", "OFFLINE_REGISTRATION"].includes(p.type || "")
    && p.amount > 0;
}

function canRetryPayout(p: PaymentRecord) {
  return props.isOwner
    && p.type === "TOURNAMENT_REGISTRATION"
    && p.status === "SUCCESS"
    && p.metadata?.instantPayout === true
    && ["FAILED", "REVERSED"].includes(p.payoutStatus ?? "");
}

// Row actions collapse into a trailing ⋯ menu
function rowActions(p: PaymentRecord) {
  const items = [];
  if (canRetryPayout(p)) {
    items.push({
      label: "Retry payout",
      icon: "i-heroicons-arrow-path",
      onSelect: () => emit("retry", p),
    });
  }
  if (canRefund(p)) {
    items.push({
      label: "Refund",
      icon: "i-heroicons-arrow-uturn-left",
      color: "error" as const,
      onSelect: () => emit("refund", p),
    });
  }
  return [items];
}

const hasRowActions = (p: PaymentRecord) => canRefund(p) || canRetryPayout(p);
</script>

<template>
  <section class="bg-surface border border-subtle rounded-2xl overflow-hidden">
    <header class="flex flex-wrap items-center gap-2.5 px-4 py-3 border-b border-subtle">
      <span class="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
        <UIcon name="i-heroicons-document-text" class="w-3.5 h-3.5" />
      </span>
      <h2 class="text-[13px] font-bold text-heading">Payment history</h2>
      <div class="ml-auto flex flex-wrap items-center gap-1.5">
        <UButton
          icon="i-heroicons-arrow-path"
          size="xs"
          variant="ghost"
          color="neutral"
          :loading="refreshing"
          title="Refresh"
          aria-label="Refresh payment history"
          @click="emit('refresh')"
        />
        <USelect
          v-model="exportTournamentId"
          :items="exportTournamentOptions"
          value-key="value"
          size="xs"
          class="w-36"
          aria-label="Export filter"
        />
        <UButton
          icon="i-heroicons-arrow-down-tray"
          label="Export CSV"
          size="xs"
          variant="outline"
          color="neutral"
          :loading="exporting"
          :disabled="payments.length === 0"
          @click="emit('export', exportTournamentId === 'all' ? undefined : exportTournamentId)"
        />
        <UButton
          icon="i-heroicons-plus"
          label="Record offline"
          size="xs"
          color="primary"
          @click="emit('record')"
        />
      </div>
    </header>

    <!-- Empty State -->
    <div v-if="payments.length === 0" class="p-8 text-center">
      <UIcon name="i-heroicons-document-text" class="w-10 h-10 text-muted mx-auto mb-3" />
      <p class="text-sm text-muted">No payment history yet.</p>
      <p class="text-xs text-muted mt-1">Invoices will appear here after your first payment.</p>
    </div>

    <template v-else>
      <!-- Mobile: cards -->
      <div class="md:hidden divide-y divide-gray-100 dark:divide-white/[0.06]">
        <div
          v-for="payment in payments"
          :key="payment.id"
          class="px-4 py-4 flex items-start gap-3"
        >
          <div
            v-if="payment.teamLogoUrl"
            class="w-9 h-9 rounded-lg overflow-hidden shrink-0 mt-0.5 border border-subtle bg-white dark:bg-white/5"
          >
            <img :src="payment.teamLogoUrl" :alt="payment.teamName || 'Team logo'" class="w-full h-full object-cover" />
          </div>
          <div
            v-else
            class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
            :class="payment.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-500' : payment.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'"
          >
            <UIcon
              :name="payment.status === 'SUCCESS' ? 'i-heroicons-check-circle' : payment.status === 'PENDING' ? 'i-heroicons-clock' : 'i-heroicons-x-circle'"
              class="w-5 h-5"
            />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm font-bold text-heading truncate">{{ paymentLabel(payment) }}</span>
              <span class="text-sm font-bold text-heading shrink-0 tabular-nums">₦{{ (payment.amount / 100).toLocaleString() }}</span>
            </div>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-xs text-muted">{{ formatDate(payment.created_at) }}</span>
              <span v-if="payment.tournament" class="text-xs text-muted truncate">· {{ payment.tournament.name }}</span>
            </div>
            <div class="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <UBadge :color="statusBadgeColor(payment.status)" variant="subtle" size="xs">{{ payment.status }}</UBadge>
              <UBadge v-if="payment.metadata?.waived" color="info" variant="subtle" size="xs">WAIVED</UBadge>
              <UBadge v-if="payment.type === 'OFFLINE_REGISTRATION'" color="neutral" variant="subtle" size="xs">OFFLINE</UBadge>
              <UBadge v-if="payoutChip(payment)" :color="payoutChip(payment)!.color" variant="subtle" size="xs">
                {{ payoutChip(payment)!.label }}
              </UBadge>
              <span class="text-[10px] text-muted truncate font-mono">{{ payment.paystackReference }}</span>
            </div>
          </div>
          <UDropdownMenu
            v-if="hasRowActions(payment)"
            :items="rowActions(payment)"
            :content="{ align: 'end' }"
          >
            <UButton
              variant="ghost"
              color="neutral"
              icon="i-heroicons-ellipsis-vertical"
              size="xs"
              square
              aria-label="Payment actions"
              :loading="retryingPayoutId === payment.id"
            />
          </UDropdownMenu>
        </div>
      </div>

      <!-- Desktop: table -->
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-[10px] font-extrabold text-muted uppercase tracking-wider border-b border-subtle">
              <th class="px-5 py-3">Date</th>
              <th class="px-5 py-3">Payment</th>
              <th class="px-5 py-3">Amount</th>
              <th class="px-5 py-3">Status</th>
              <th class="px-5 py-3">Reference</th>
              <th class="px-5 py-3 text-right"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50 dark:divide-white/[0.04]">
            <tr v-for="payment in payments" :key="payment.id" class="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
              <td class="px-5 py-3.5 whitespace-nowrap text-body text-[13px]">
                {{ formatDate(payment.created_at) }}
              </td>
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-2">
                  <img
                    v-if="payment.teamLogoUrl"
                    :src="payment.teamLogoUrl"
                    :alt="payment.teamName || 'Team logo'"
                    class="w-6 h-6 rounded-md object-cover shrink-0 border border-subtle"
                  />
                  <div class="min-w-0">
                    <span class="font-bold text-heading text-[13px]">{{ paymentLabel(payment) }}</span>
                    <span v-if="payment.tournament" class="text-xs text-muted"> · {{ payment.tournament.name }}</span>
                  </div>
                </div>
              </td>
              <td class="px-5 py-3.5 whitespace-nowrap font-bold text-heading tabular-nums">
                ₦{{ (payment.amount / 100).toLocaleString() }}
              </td>
              <td class="px-5 py-3.5 whitespace-nowrap">
                <UBadge :color="statusBadgeColor(payment.status)" variant="subtle" size="xs" class="font-bold uppercase tracking-wider text-[10px]">
                  {{ payment.status }}
                </UBadge>
                <UBadge v-if="payment.metadata?.waived" color="info" variant="subtle" size="xs" class="ml-1">WAIVED</UBadge>
                <UBadge v-if="payment.type === 'OFFLINE_REGISTRATION'" color="neutral" variant="subtle" size="xs" class="ml-1">OFFLINE</UBadge>
                <UBadge v-if="payoutChip(payment)" :color="payoutChip(payment)!.color" variant="subtle" size="xs" class="ml-1">
                  {{ payoutChip(payment)!.label }}
                </UBadge>
              </td>
              <td class="px-5 py-3.5 whitespace-nowrap text-xs text-muted font-mono">
                {{ payment.paystackReference || '—' }}
              </td>
              <td class="px-5 py-3.5 whitespace-nowrap text-right">
                <UDropdownMenu
                  v-if="hasRowActions(payment)"
                  :items="rowActions(payment)"
                  :content="{ align: 'end' }"
                >
                  <UButton
                    variant="ghost"
                    color="neutral"
                    icon="i-heroicons-ellipsis-vertical"
                    size="xs"
                    square
                    aria-label="Payment actions"
                    :loading="retryingPayoutId === payment.id"
                  />
                </UDropdownMenu>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </section>
</template>
