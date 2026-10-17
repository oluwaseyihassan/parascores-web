<script setup lang="ts">
import {
  Visibility,
  TournamentType,
  ParticipantType,
  ParticipantStatus,
} from "~/types";

const emit = defineEmits<{
  "go-to-tab": [slot: string];
}>();

const tournamentStore = useTournamentStore();
const participantStore = useParticipantStore();
const { currentTournament: tournament } = storeToRefs(tournamentStore);
const { participants } = storeToRefs(participantStore);

const totalPendingRequests = computed(() => {
  if (!participants.value) return 0;
  const pendingTeams = participants.value.filter(
    (p) => p.status === ParticipantStatus.PENDING,
  ).length;
  const pendingPlayers = participants.value.reduce((total, p) => {
    const pendingCount =
      p.players?.filter((pl) => pl.status === "PENDING").length || 0;
    return total + pendingCount;
  }, 0);
  return pendingTeams + pendingPlayers;
});

// Organizer card sub-line: "N members · owner Femi O." when the members relation is loaded
const orgMetaLine = computed(() => {
  const org = tournament.value?.organization;
  if (!org) return "";
  const members = org.members || [];
  if (members.length) {
    const owner = members.find((m) => m.role === "OWNER")?.user?.name;
    let ownerLabel = "";
    if (owner) {
      const parts = owner.trim().split(/\s+/);
      ownerLabel = " · owner " + parts[0] + (parts[1] ? " " + parts[1].charAt(0).toUpperCase() + "." : "");
    }
    return members.length + " member" + (members.length > 1 ? "s" : "") + ownerLabel;
  }
  return org.phone || "";
});

// Format date for display
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// Type labels
const typeLabels: Record<TournamentType, string> = {
  [TournamentType.KNOCKOUT]: "Knockout Cup",
  [TournamentType.LEAGUE]: "Classic League",
  [TournamentType.ROUND_ROBIN]: "Round Robin",
  [TournamentType.GROUP]: "Group Stage Only",
  [TournamentType.HYBRID]: "World Cup / Euro Style",
  [TournamentType.FRIENDLY]: "Friendly Match",
  [TournamentType.RACE]: "Race / Event",
};

const formatLabel = computed(() => {
  const t = tournament.value;
  if (!t) return "";
  if (t.type === TournamentType.HYBRID) {
    return t.unifiedStandings ? "Champions League Style" : "World Cup / Euro Style";
  }
  return typeLabels[t.type] ?? t.type;
});

const participantLabels: Record<ParticipantType, string> = {
  [ParticipantType.TEAM]: "Teams",
  [ParticipantType.INDIVIDUAL]: "Individuals",
};

const visibilityLabels: Record<Visibility, { label: string; icon: string }> = {
  [Visibility.PUBLIC]: { label: "Public", icon: "i-heroicons-globe-alt" },
  [Visibility.UNLISTED]: { label: "Unlisted", icon: "i-heroicons-eye-slash" },
  [Visibility.PRIVATE]: { label: "Private", icon: "i-heroicons-lock-closed" },
};
</script>

<template>
  <div v-if="tournament">
    <!-- Pending Requests Alert -->
    <div
      v-if="totalPendingRequests > 0"
      class="mt-4 flex items-center gap-3.5 rounded-xl border border-amber-400/30 bg-amber-400/[0.07] px-4 py-3.5"
    >
      <span class="w-9 h-9 rounded-lg bg-amber-400/10 flex items-center justify-center shrink-0">
        <UIcon name="i-heroicons-hand-raised" class="w-5 h-5 text-amber-500" />
      </span>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-bold text-gray-900 dark:text-white">
          {{ totalPendingRequests }} player{{ totalPendingRequests > 1 ? 's' : '' }} waiting for approval
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Join requests are waiting for your review.</p>
      </div>
      <UButton size="sm" color="primary" @click="emit('go-to-tab', 'participants')">Review requests</UButton>
    </div>

    <UCard v-if="tournament.description" class="mt-3 sm:mt-4">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon
            name="i-heroicons-document-text"
            class="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500"
          />
          <span class="font-medium text-sm sm:text-base">About</span>
        </div>
      </template>
      <p
        class="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap"
      >
        {{ tournament.description }}
      </p>
    </UCard>
    <div v-else class="mt-3 sm:mt-4 border border-dashed border-gray-300 dark:border-white/15 rounded-xl py-7 text-center">
      <p class="text-sm text-gray-500 dark:text-gray-400">No description yet</p>
      <UButton size="xs" variant="link" color="primary" @click="emit('go-to-tab', 'settings')">Add one in Settings →</UButton>
    </div>

    <!-- Details, Organizer, Sponsors & Socials Grid -->
    <div
      class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mt-3 sm:mt-4"
    >
      <div class="flex flex-col gap-4 sm:gap-6 lg:col-span-2">
        <!-- Tournament Details (Mobile/Main flow) -->
        <UCard
          class="border border-gray-100 dark:border-gray-800 shadow-sm transition-all h-fit"
        >
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-heroicons-information-circle"
                class="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500"
              />
              <span class="font-medium text-sm sm:text-base"
                >Details</span
              >
            </div>
          </template>

          <div class="space-y-3 sm:space-y-4 text-sm">
            <div
              class="flex justify-between items-center py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-800"
            >
              <span class="text-xs sm:text-sm text-gray-500"
                >Sport</span
              >
              <span class="font-medium text-xs sm:text-sm capitalize">{{
                tournament.sport.toLowerCase()
              }}</span>
            </div>

            <div
              class="flex justify-between items-center py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-800"
            >
              <span class="text-xs sm:text-sm text-gray-500"
                >Format</span
              >
              <span class="font-medium text-xs sm:text-sm">
                {{ formatLabel }}
              </span>
            </div>

            <div
              class="flex justify-between items-center py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-800"
            >
              <span class="text-xs sm:text-sm text-gray-500"
                >Participants</span
              >
              <span class="font-medium text-xs sm:text-sm capitalize"
                >{{ tournament.participantType.toLowerCase() }}s</span
              >
            </div>

            <div class="flex justify-between items-center py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-800">
              <span class="text-xs sm:text-sm text-gray-500">Dates</span>
              <span class="font-medium text-xs sm:text-sm">{{ formatDate(tournament.start_date) }} – {{ formatDate(tournament.end_date) }}</span>
            </div>

            <div v-if="tournament.location" class="flex justify-between items-center py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-800">
              <span class="text-xs sm:text-sm text-gray-500">Location</span>
              <span class="font-medium text-xs sm:text-sm">{{ tournament.location }}</span>
            </div>

            <div class="flex justify-between items-center py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-800">
              <span class="text-xs sm:text-sm text-gray-500">Visibility</span>
              <span class="font-medium text-xs sm:text-sm">{{ visibilityLabels[tournament.visibility].label }}</span>
            </div>

            <div
              class="flex justify-between items-center py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-800"
            >
              <span class="text-xs sm:text-sm text-gray-500"
                >Max Size</span
              >
              <span class="font-medium text-xs sm:text-sm">{{
                tournament.maxParticipants || "Unlimited"
              }}</span>
            </div>

            <div
              class="flex justify-between items-center py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-800"
            >
              <span class="text-xs sm:text-sm text-gray-500"
                >Timezone</span
              >
              <span class="font-medium text-xs sm:text-sm">{{
                tournament.timezone || "UTC"
              }}</span>
            </div>

            <div
              class="flex justify-between items-center py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-800"
            >
              <span class="text-xs sm:text-sm text-gray-500"
                >Auto-approve</span
              >
              <UBadge
                :color="tournament.autoApprove ? 'success' : 'neutral'"
                variant="subtle"
                size="xs"
              >
                {{ tournament.autoApprove ? "Yes" : "No" }}
              </UBadge>
            </div>
          </div>
        </UCard>

        <!-- Sponsors -->
        <TournamentSponsorsCard />
      </div>

      <div class="flex flex-col gap-4 sm:gap-6 lg:col-span-1">
        <!-- Organization -->
        <UCard
          v-if="tournament.organization"
          class="border border-gray-100 dark:border-gray-800 shadow-sm transition-all h-fit"
        >
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-heroicons-building-office"
                class="w-5 h-5 text-emerald-500"
              />
              <span class="font-medium">Organization</span>
            </div>
          </template>

          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl overflow-hidden bg-[#136332] text-white flex items-center justify-center font-extrabold text-sm shrink-0">
              <img v-if="tournament.organization.logoUrl" :src="tournament.organization.logoUrl" class="w-full h-full object-cover" alt="" />
              <span v-else>{{ tournament.organization.name?.charAt(0).toUpperCase() }}</span>
            </div>
            <div class="min-w-0">
              <p class="text-sm font-bold text-gray-900 dark:text-white truncate">{{ tournament.organization.name }}</p>
              <p v-if="orgMetaLine" class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{{ orgMetaLine }}</p>
              <UBadge v-if="tournament.organization.isVerified" color="info" variant="subtle" size="xs" class="mt-1">Verified</UBadge>
            </div>
          </div>
        </UCard>

        <!-- Social Links -->
        <TournamentSocialsCard />

        <!-- Venues -->
        <TournamentVenuesCard />
      </div>
    </div>
  </div>
</template>
