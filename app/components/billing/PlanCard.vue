<script setup lang="ts">
import type { BillingPlan } from "~/types/billing";

const props = defineProps<{
  plan: BillingPlan;
  isYearly: boolean;
  currentPlan: string;
  isActive: boolean;
  subscribing: boolean;
  storeLoading: boolean;
}>();

const emit = defineEmits<{
  action: [plan: BillingPlan];
}>();

const isCurrentPlan = computed(() => {
  if (props.plan.key === "PER_TOURNAMENT") return false;
  return props.plan.key === props.currentPlan && props.isActive;
});

function canSubscribe() {
  if (["FREE", "ENTERPRISE", "PRO"].includes(props.plan.key)) return false;
  if (props.plan.key === "PER_TOURNAMENT") return true;
  if (isCurrentPlan.value) return false;
  return true;
}

function getButtonLabel() {
  if (props.plan.key === "PRO") return "Coming Soon";
  if (isCurrentPlan.value) return "Current Plan";
  if (props.plan.key === "FREE") return "Free Forever";
  if (props.plan.key === "ENTERPRISE") return "Contact Sales";
  if (props.plan.key === "PER_TOURNAMENT") return "Select Tournament";
  return "Upgrade Now";
}

const isDisabled = computed(
  () =>
    isCurrentPlan.value ||
    props.storeLoading ||
    props.subscribing ||
    props.plan.key === "PRO",
);

// Price display (one-time per-tournament shows the per-team rate)
const priceDisplay = computed(() => {
  const p = props.plan;
  if (p.monthlyPrice === "Custom") return { main: "Custom", per: "", billed: "" };
  if (p.oneTime) return { main: "₦1k", per: "/ team", billed: "" };
  const monthly =
    props.isYearly && p.yearlyPrice
      ? Math.round((p.yearlyPrice as number) / 12)
      : (p.monthlyPrice as number);
  return {
    main: `₦${monthly.toLocaleString()}`,
    per: "/ mo",
    billed:
      props.isYearly && (p.monthlyPrice as number) > 0
        ? `Billed ₦${(p.yearlyPrice as number).toLocaleString()} yearly`
        : "",
  };
});
</script>

<template>
  <div
    class="relative bg-surface rounded-2xl p-5 transition-all duration-300 flex flex-col"
    :class="[
      plan.popular && !isCurrentPlan
        ? 'border-[1.5px] border-emerald-500/60 shadow-lg shadow-emerald-500/10'
        : isCurrentPlan
          ? 'border-[1.5px] border-emerald-500/40 bg-emerald-500/[0.04]'
          : 'border border-subtle hover:border-emerald-500/30',
    ]"
  >
    <!-- Flags: exactly one loud card at a time -->
    <div
      v-if="isCurrentPlan"
      class="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500/10 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-[9px] font-extrabold px-3.5 py-1 rounded-full uppercase tracking-wider whitespace-nowrap"
    >
      Current plan
    </div>
    <div
      v-else-if="plan.popular"
      class="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[9px] font-extrabold px-3.5 py-1 rounded-full uppercase tracking-wider shadow-lg whitespace-nowrap"
    >
      Most popular
    </div>
    <div
      v-else-if="plan.oneTime"
      class="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[9px] font-extrabold px-3.5 py-1 rounded-full uppercase tracking-wider shadow-lg whitespace-nowrap"
    >
      One-time
    </div>

    <h3 class="text-base font-extrabold text-heading mb-1">{{ plan.name }}</h3>
    <p class="text-[12px] text-muted min-h-9 leading-relaxed">{{ plan.description }}</p>

    <!-- Price -->
    <div class="mb-4">
      <span class="text-2xl font-black text-heading tracking-tight tabular-nums">{{ priceDisplay.main }}</span>
      <span v-if="priceDisplay.per" class="text-muted font-bold text-[12px] ml-1">{{ priceDisplay.per }}</span>
      <div v-if="priceDisplay.billed" class="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-bold">
        {{ priceDisplay.billed }}
      </div>
    </div>

    <!-- CTA -->
    <UButton
      block
      size="lg"
      :disabled="isDisabled"
      :loading="subscribing && canSubscribe()"
      :color="canSubscribe() ? 'primary' : 'neutral'"
      :variant="isCurrentPlan ? 'subtle' : 'solid'"
      class="font-bold mb-5 rounded-xl"
      @click="emit('action', plan)"
    >
      {{ getButtonLabel() }}
    </UButton>

    <!-- Features -->
    <div class="flex flex-col gap-2.5 flex-grow border-t border-subtle pt-4">
      <div class="text-[9px] font-extrabold text-muted tracking-widest uppercase">What's included</div>
      <ul class="space-y-2.5">
        <li v-for="feature in plan.features" :key="feature.text" class="flex items-start gap-2">
          <UIcon name="i-heroicons-check-circle" class="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <UTooltip :text="feature.tooltip" :content="{ side: 'top', align: 'center' }">
            <span class="text-[12px] text-body leading-tight border-b border-dashed border-gray-300 dark:border-white/10 cursor-help hover:text-emerald-500 transition-colors">{{ feature.text }}</span>
          </UTooltip>
        </li>
      </ul>
    </div>
  </div>
</template>
