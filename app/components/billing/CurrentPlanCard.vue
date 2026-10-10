<script setup lang="ts">
const props = defineProps<{
  currentPlan: string;
  subscription: any;
  isPro: boolean;
  isActive: boolean;
  isCancelled: boolean;
  isPastDue: boolean;
  orgName?: string;
}>();

const emit = defineEmits<{
  cancel: [];
  manage: [];
}>();

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const statusColor = computed(() => {
  switch (props.subscription?.status) {
    case "ACTIVE": return "success" as const;
    case "TRIALING": return "info" as const;
    case "PAST_DUE": return "warning" as const;
    case "CANCELLED": return "error" as const;
    default: return "neutral" as const;
  }
});
</script>

<template>
  <section class="bg-surface border border-subtle rounded-2xl overflow-hidden">
    <div class="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div class="flex items-center gap-3.5 flex-1 min-w-0">
        <div
          class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          :class="isPro ? 'bg-emerald-500/10 text-emerald-500' : 'bg-black/5 dark:bg-white/5 text-muted'"
        >
          <UIcon :name="isPro ? 'i-heroicons-bolt-solid' : 'i-heroicons-sparkles'" class="w-5.5 h-5.5" />
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h3 class="text-base font-extrabold text-heading">{{ currentPlan }} Plan</h3>
            <UBadge
              v-if="subscription?.status"
              :color="statusColor"
              variant="subtle"
              size="sm"
              class="uppercase font-bold tracking-wider text-[10px]"
            >
              {{ subscription.status }}
            </UBadge>
          </div>
          <p class="text-[12px] text-muted mt-0.5">
            <template v-if="isPro && subscription?.currentPeriodEnd">
              Renews {{ formatDate(subscription.currentPeriodEnd) }}
            </template>
            <template v-else-if="isCancelled && subscription?.currentPeriodEnd">
              Active until {{ formatDate(subscription.currentPeriodEnd) }}
            </template>
            <template v-else-if="isPastDue">
              Payment failed — please update your payment method.
            </template>
            <template v-else>
              {{ orgName || 'Your organization' }} · upgrade to unlock premium features
            </template>
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <UButton
          v-if="isPro && isActive && !isCancelled"
          label="Cancel plan"
          color="error"
          variant="ghost"
          size="sm"
          icon="i-heroicons-x-mark"
          @click="emit('cancel')"
        />
        <UButton
          v-else-if="!isPro"
          label="Manage"
          size="sm"
          variant="outline"
          color="neutral"
          class="font-bold"
          @click="emit('manage')"
        />
      </div>
    </div>
  </section>
</template>
