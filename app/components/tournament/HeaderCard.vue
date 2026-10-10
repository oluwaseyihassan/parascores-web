<script setup lang="ts">
import { Visibility } from "~/types";

const props = defineProps<{
  activeTab: string;
  tabItems: Array<{ slot: string; label: string; icon: string; badge?: number }>;
}>();

const emit = defineEmits<{
  "update:activeTab": [value: string];
  "open-qr": [];
  "go-to-tab": [slot: string];
}>();

const tournamentStore = useTournamentStore();
const fixtureStore = useFixtureStore();
const paymentStore = usePaymentStore();
const { currentTournament: tournament } = storeToRefs(tournamentStore);
const { liveFixtures } = storeToRefs(fixtureStore);
const { isPro } = storeToRefs(paymentStore);
const { frontendUrl } = useHost();

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  useToast().add({ title: "Copied to clipboard", color: "success" });
};

// Live flag for the header chip (org-scoped live fixtures)
const hasLiveFixtures = computed(() =>
  tournament.value
    ? liveFixtures.value.some((f) => f.tournament_id === tournament.value!.id)
    : false,
);

const moreActions = computed(() => [
  [
    { label: "QR Code", icon: "i-heroicons-qr-code", onSelect: () => emit("open-qr") },
    { label: "Widgets", icon: "i-heroicons-code-bracket", to: tournament.value ? "/widgets?t=" + (tournament.value.customName || tournament.value.id) : "/widgets" },
  ],
]);

// Format date for display
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// Tournament status
const tournamentStatus = computed(() => {
  if (!tournament.value) return null;
  const now = new Date();
  const start = new Date(tournament.value.start_date);
  const end = new Date(tournament.value.end_date);

  if (now < start) return { label: "Upcoming", color: "info" as const };
  if (now > end) return { label: "Completed", color: "neutral" as const };
  return { label: "Active", color: "success" as const };
});

const visibilityLabels: Record<Visibility, { label: string; icon: string }> = {
  [Visibility.PUBLIC]: { label: "Public", icon: "i-heroicons-globe-alt" },
  [Visibility.UNLISTED]: { label: "Unlisted", icon: "i-heroicons-eye-slash" },
  [Visibility.PRIVATE]: { label: "Private", icon: "i-heroicons-lock-closed" },
};

// Placeholder images
const PLACEHOLDER_LOGO =
  "https://res.cloudinary.com/djsnerfzp/image/upload/v1769695792/parascores_logo_placeholder.png";
const PLACEHOLDER_BANNER =
  "https://res.cloudinary.com/djsnerfzp/image/upload/v1769696842/parascores_banner_placeholder.png";
</script>

<template>
  <!-- Header card -->
  <div
    v-if="tournament"
    class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden mb-6 sm:mb-8"
  >
    <!-- Banner strip -->
    <div class="relative h-20 sm:h-24 w-full overflow-hidden">
      <img
        :src="tournament.bannerUrl || PLACEHOLDER_BANNER"
        :alt="tournament.name"
        class="w-full h-full object-cover opacity-60"
      />
      <div
        class="absolute inset-0 bg-gradient-to-t from-gray-900/30 to-transparent dark:from-black/50"
      ></div>
    </div>

    <!-- Hero row -->
    <div
      class="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-4 sm:gap-5 p-4 sm:p-5 relative"
    >
      <!-- Logo (overlapping banner) -->
      <div
        class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 ring-4 ring-white dark:ring-gray-900 shadow-xl shrink-0 -mt-12 sm:-mt-14 relative z-10"
      >
        <img
          :src="tournament.logoUrl || PLACEHOLDER_LOGO"
          :alt="tournament.name"
          class="w-full h-full object-cover"
        />
      </div>

      <!-- Title & meta -->
      <div class="flex-1 min-w-0 sm:-mt-2">
        <div
          v-if="tournament.organization"
          class="flex items-center gap-1.5 mb-1"
        >
          <img
            v-if="tournament.organization.logoUrl"
            :src="tournament.organization.logoUrl"
            class="w-3.5 h-3.5 rounded-full object-cover"
          />
          <span
            class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest"
          >
            {{ tournament.organization.name }}
          </span>
        </div>

        <div class="flex items-center gap-2.5 flex-wrap">
          <h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            {{ tournament.name }}
          </h1>
          <UBadge
            v-if="tournamentStatus"
            :color="tournamentStatus.color"
            variant="subtle"
            size="sm"
          >
            {{ tournamentStatus.label }}
          </UBadge>
          <UBadge
            v-if="tournament.isPractice"
            color="warning"
            variant="subtle"
            size="sm"
            icon="i-heroicons-beaker"
          >
            Practice
          </UBadge>
          <span
            v-if="tournament.isPremium || isPro"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm"
          >
            <UIcon name="i-heroicons-bolt-solid" class="w-3 h-3" />
            Premium
          </span>
          <span
            v-if="hasLiveFixtures"
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-red-500/10 text-red-500 border border-red-500/40"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            Matchday live
          </span>
        </div>

        <div
          class="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400"
        >
          <span
            class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            >{{ tournament.sport }}</span
          >
          <span class="flex items-center gap-1">
            <UIcon name="i-heroicons-calendar" class="w-4 h-4" />
            {{ formatDate(tournament.start_date) }} –
            {{ formatDate(tournament.end_date) }}
          </span>
          <span v-if="tournament.location" class="flex items-center gap-1">
            <UIcon name="i-heroicons-map-pin" class="w-4 h-4" />
            {{ tournament.location }}
          </span>
          <span class="flex items-center gap-1">
            <UIcon
              :name="visibilityLabels[tournament.visibility].icon"
              class="w-4 h-4"
            />
            {{ visibilityLabels[tournament.visibility].label }}
          </span>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex flex-wrap items-center gap-2 shrink-0">
        <UButton
          icon="i-heroicons-link"
          variant="outline"
          color="neutral"
          size="sm"
          label="Share fan page"
          @click="copyToClipboard(`${frontendUrl}/t/${tournament.customName || tournament.id}`)"
        />
        <UButton
          icon="i-heroicons-photo"
          variant="outline"
          color="neutral"
          size="sm"
          :to="`/tournaments/${tournament.id}/graphics`"
          label="Make graphic"
        />
        <UDropdownMenu :items="moreActions">
          <UButton
            icon="i-heroicons-ellipsis-horizontal"
            variant="outline"
            color="neutral"
            size="sm"
            aria-label="More actions"
          />
        </UDropdownMenu>
        <UButton
          icon="i-heroicons-cog-6-tooth"
          color="primary"
          size="sm"
          label="Edit tournament"
          @click="emit('go-to-tab', 'settings')"
        />
      </div>
    </div>

      <!-- Tab bar (underline tabs, attached to hero card) -->
      <div class="flex items-end gap-1 overflow-x-auto px-3 sm:px-5 border-t border-gray-100 dark:border-white/5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          v-for="(tab, i) in tabItems"
          :key="tab.slot"
          type="button"
          class="flex items-center gap-1.5 px-3.5 py-3 text-[13px] font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors"
          :class="activeTab === String(i)
            ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500'
            : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-white'"
          @click="emit('update:activeTab', String(i))"
        >
          <UIcon :name="tab.icon" class="w-4 h-4" />
          {{ tab.label }}
          <UBadge v-if="tab.badge" color="warning" variant="soft" size="xs">{{ tab.badge }}</UBadge>
        </button>
      </div>
  </div>
</template>
