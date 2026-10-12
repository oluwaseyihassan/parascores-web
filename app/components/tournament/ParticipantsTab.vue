<script setup lang="ts">
import { ParticipantStatus, ParticipantType } from "~/types";
import type { Participant } from "~/types";
import { ModalDialogsKey } from "~/composables/useModalDialogs";

const route = useRoute();
const tournamentStore = useTournamentStore();
const participantStore = useParticipantStore();
const { currentTournament: tournament, loading } = storeToRefs(tournamentStore);
const { participants, loading: participantsLoading } =
  storeToRefs(participantStore);
const { handleError } = useErrors();
const { openConfirmModal } = inject(ModalDialogsKey)!;

const tournamentId = computed(() => route.params.id as string);

// Participant Management
const selectedParticipant = ref<Participant | null>(null);

// Flattened pending join requests across all participants (redesign)
const pendingJoinRequests = computed(() => {
  const list: Array<{ player: any; participant: any }> = [];
  participants.value.forEach((p) => {
    (p.players || [])
      .filter((pl: any) => pl.status === "PENDING")
      .forEach((pl: any) => list.push({ player: pl, participant: p }));
  });
  return list;
});

// Modals
const showAddModal = ref(false);
const showEditModal = ref(false);
const editingParticipant = ref<Participant | null>(null);
const showManagePlayersModal = ref(false);
const showTournamentInviteModal = ref(false);
const inviteLinkModal = ref();
const linkCodeModal = ref();

const openAddModal = () => {
  showAddModal.value = true;
};

const openEditParticipantModal = (participant: Participant) => {
  editingParticipant.value = participant;
  showEditModal.value = true;
};

const openManagePlayers = async (participant: Participant) => {
  selectedParticipant.value = participant;
  showManagePlayersModal.value = true;

  // Also generate invite link in background
  inviteLinkModal.value?.generate(participant, false);
};

const handleApprovePlayer = async (playerId: string) => {
  if (!selectedParticipant.value) return;
  try {
    await participantStore.updatePlayerStatus(
      selectedParticipant.value.id,
      playerId,
      "APPROVED",
    );
    useToast().add({ title: "Player approved successfully", color: "success" });
  } catch (error: any) {
    handleError(error, { title: "Failed to approve player" });
  }
};

const handleRejectPlayer = async (playerId: string) => {
  if (!selectedParticipant.value) return;
  openConfirmModal({
    title: "Reject Player",
    description: "Are you sure you want to reject this join request?",
    confirmLabel: "Reject",
    color: "error",
    onConfirm: async () => {
      try {
        await participantStore.updatePlayerStatus(
          selectedParticipant.value!.id,
          playerId,
          "REJECTED",
        );
        useToast().add({ title: "Request rejected", color: "success" });
      } catch (error: any) {
        handleError(error, { title: "Failed to reject request" });
      }
    },
  });
};

const removeParticipant = (participant: Participant) => {
  openConfirmModal({
    title: "Remove Participant",
    description: `Are you sure you want to remove ${participant.customName || "this participant"}? This will also delete all their associated fixtures and standings.`,
    confirmLabel: "Remove",
    color: "error",
    onConfirm: async () => {
      try {
        await participantStore.removeParticipant(participant.id);
        useToast().add({
          title: "Participant removed successfully",
          color: "success",
        });
      } catch (error: any) {
        handleError(error, { title: "Failed to remove participant" });
      }
    },
  });
};

const updateParticipantStatus = async (
  participantId: string,
  status: ParticipantStatus,
) => {
  try {
    await participantStore.updateParticipantStatus(participantId, status);
    useToast().add({
      title:
        status === ParticipantStatus.CONFIRMED
          ? "Participant approved"
          : "Participant rejected",
      color: status === ParticipantStatus.CONFIRMED ? "success" : "error",
    });
  } catch (err: any) {
    handleError(err, { title: "Failed to update status" });
  }
};

const handleUnlinkProfile = async (participant: Participant) => {
  try {
    await participantStore.updateParticipant(participant.id, {
      teamId: null,
    } as any);
    useToast().add({ title: "Team profile unlinked", color: "success" });
    // Refresh participants
    if (tournamentId.value) {
      participantStore.fetchParticipants(tournamentId.value);
    }
  } catch (err: any) {
    handleError(err, { title: "Failed to unlink profile" });
  }
};

// Excel Upload for Teams
const uploadingTeamExcel = ref(false);
const teamExcelFileInput = ref<HTMLInputElement | null>(null);

const triggerTeamExcelUpload = () => {
  if (teamExcelFileInput.value) teamExcelFileInput.value.click();
};

const handleTeamExcelUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      uploadingTeamExcel.value = true;
      const xlsx = await import("xlsx");
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = xlsx.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) throw new Error("No sheets found in Excel file");
      const worksheet = workbook.Sheets[firstSheetName];
      if (!worksheet) throw new Error("Worksheet not found in the Excel file");
      const jsonData = xlsx.utils.sheet_to_json<any>(worksheet);

      const teamsToUpload = jsonData
        .map((row) => {
          const keys = Object.keys(row);
          const nameKey = keys.find(
            (k) =>
              k.toLowerCase().trim() === "name" ||
              k.toLowerCase().trim() === "team",
          );
          const shortNameKey = keys.find(
            (k) =>
              k.toLowerCase().trim() === "shortname" ||
              k.toLowerCase().trim() === "short name" ||
              k.toLowerCase().trim() === "short_name",
          );
          const seedKey = keys.find(
            (k) =>
              k.toLowerCase().trim() === "seed" ||
              k.toLowerCase().trim() === "rank",
          );

          return {
            customName: nameKey ? String(row[nameKey]).trim() : "",
            customShortName: shortNameKey
              ? String(row[shortNameKey]).trim()
              : null,
            seed: seedKey ? parseInt(row[seedKey]) || null : null,
            logoUrl: null,
          };
        })
        .filter((t) => t.customName);

      if (teamsToUpload.length > 0) {
        await participantStore.addParticipantsBulk(
          tournament.value?.id || tournamentId.value,
          { participants: teamsToUpload },
        );
        useToast().add({
          title: `Added ${teamsToUpload.length} participants successfully`,
          color: "success",
        });
      } else {
        useToast().add({
          title: "No valid participants found in Excel",
          color: "error",
        });
      }
    } catch (err: any) {
      handleError(err, { title: "Failed to parse Excel file" });
    } finally {
      uploadingTeamExcel.value = false;
      if (teamExcelFileInput.value) teamExcelFileInput.value.value = "";
    }
  };
  reader.readAsArrayBuffer(file);
};

const downloadTeamExcelTemplate = async () => {
  const xlsx = await import("xlsx");
  const wsData = [
    ["Name", "Seed"],
    ["Team A", "1"],
    ["Team B", "2"],
  ];
  const ws = xlsx.utils.aoa_to_sheet(wsData);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, "Teams");
  xlsx.writeFile(wb, "Parascores_Team_Upload_Template.xlsx");
};

// Status badge colors
const statusColors: Record<
  ParticipantStatus,
  "success" | "warning" | "error" | "neutral"
> = {
  [ParticipantStatus.CONFIRMED]: "success",
  [ParticipantStatus.PENDING]: "warning",
  [ParticipantStatus.DECLINED]: "error",
  [ParticipantStatus.DISQUALIFIED]: "neutral",
};
</script>

<template>
  <div>
    <!-- Pending join requests (flat list, redesign) -->
    <div
      v-if="pendingJoinRequests.length"
      class="mt-4 bg-white dark:bg-gray-900 border border-amber-400/35 dark:border-amber-400/30 rounded-2xl overflow-hidden"
    >
      <header class="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/5">
        <h2 class="text-sm font-bold text-gray-900 dark:text-white">Pending join requests</h2>
        <UBadge color="warning" variant="soft" size="sm">{{ pendingJoinRequests.length }} waiting</UBadge>
      </header>
      <div
        v-for="{ player, participant } in pendingJoinRequests"
        :key="player.id"
        class="flex items-center gap-3 px-5 py-3 border-b border-gray-100 dark:border-white/5 last:border-b-0"
      >
        <UAvatar :src="player.avatarUrl || undefined" :text="(player.name || '?').charAt(0).toUpperCase()" size="sm" />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">{{ player.name || 'Unknown' }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
            {{ player.position || 'Player' }} · wants to join {{ participant.customName || participant.customShortName || 'team' }} · {{ new Date(player.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}
          </p>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <UButton size="xs" color="success" variant="soft" @click="handleApprovePlayer(player.id)">Approve</UButton>
          <UButton size="xs" color="neutral" variant="ghost" @click="handleRejectPlayer(player.id)">Reject</UButton>
        </div>
      </div>
    </div>

    <UCard class="mt-4">
      <template #header>
        <div
          class="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div class="flex items-center gap-2">
            <UIcon
              name="i-heroicons-user-group"
              class="w-5 h-5 text-emerald-500"
            />
            <span class="font-medium">Participants</span>
            <UBadge
              v-if="participants.length"
              size="sm"
              variant="subtle"
            >
              {{ participants.length }}
            </UBadge>
          </div>
          <div class="flex items-center gap-2">
            <UButton
              size="xs"
              variant="ghost"
              color="success"
              icon="i-heroicons-link"
              @click="showTournamentInviteModal = true"
            >
              <span class="hidden sm:inline">Invite</span>
            </UButton>
            <UDropdownMenu
              :items="[
                [
                  {
                    label: 'Upload Excel',
                    icon: 'i-heroicons-arrow-up-tray',
                    onSelect: triggerTeamExcelUpload,
                  },
                  {
                    label: 'Download Template',
                    icon: 'i-heroicons-arrow-down-tray',
                    onSelect: downloadTeamExcelTemplate,
                  },
                ],
              ]"
              :content="{ align: 'end' }"
            >
              <UButton
                size="xs"
                variant="ghost"
                icon="i-heroicons-arrow-up-tray"
                :loading="uploadingTeamExcel"
                title="Bulk Upload Options"
              />
            </UDropdownMenu>
            <UButton
              size="xs"
              color="primary"
              variant="soft"
              icon="i-heroicons-plus"
              @click="openAddModal"
            >
              <span class="hidden sm:inline">Add</span>
            </UButton>
          </div>
          <input
            type="file"
            ref="teamExcelFileInput"
            accept=".xlsx, .xls, .csv"
            class="hidden"
            @change="handleTeamExcelUpload"
          />
        </div>
      </template>

      <!-- Loading -->
      <div
        v-if="participantsLoading && !participants.length"
        class="py-8 text-center text-gray-400"
      >
        <UIcon
          name="i-heroicons-arrow-path"
          class="w-8 h-8 mx-auto mb-2 animate-spin"
        />
        <p>Loading participants...</p>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="!participants.length"
        class="py-6 sm:py-8 text-center text-gray-400 text-sm"
      >
        <UIcon
          name="i-heroicons-user-group"
          class="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2"
        />
        <p>No participants yet</p>
        <p class="text-xs sm:text-sm">
          Add teams or individuals to get started
        </p>
        <UButton
          size="sm"
          variant="outline"
          icon="i-heroicons-plus"
          class="mt-3 sm:mt-4"
          @click="openAddModal"
        >
          Add Participant
        </UButton>
      </div>

      <!-- Participant List -->
      <div
        v-else
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
      >
        <div
          v-for="participant in participants"
          :key="participant.id"
          class="flex items-center gap-3 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-3.5 hover:border-gray-300 dark:hover:border-white/[0.14] transition-all"
        >
          <div class="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
            <img v-if="participant.logoUrl" :src="participant.logoUrl" :alt="participant.customShortName || participant.customName || 'Participant'" class="w-full h-full object-cover" />
            <span v-else class="text-xs font-bold text-gray-600 dark:text-gray-300">{{ (participant.customName || participant.customShortName || '?').charAt(0).toUpperCase() }}</span>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <p class="text-sm font-bold text-gray-900 dark:text-white truncate">{{ participant.customName || 'Unnamed' }}</p>
              <span v-if="participant.seed" class="text-[9px] font-bold px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 shrink-0" title="Seed Ranking">#{{ participant.seed }}</span>
            </div>
            <p class="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
              {{ participant.players?.length || 0 }} players · Added {{ new Date(participant.created_at).toLocaleDateString() }}
            </p>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <UChip
            v-if="
            tournament?.participantType === ParticipantType.TEAM
            "
            :show="
            !!(
            participant.players?.filter(
            (p) => p.status === 'PENDING',
            ).length || 0
            )
            "
            :text="
            participant.players?.filter(
            (p) => p.status === 'PENDING',
            ).length
            "
            size="xl"
            color="error"
            inset
            >
            <UButton
            size="xs"
            :color="
            participant.players?.some(
            (p) => p.status === 'PENDING',
            )
            ? 'error'
            : 'neutral'
            "
            :variant="
            participant.players?.some(
            (p) => p.status === 'PENDING',
            )
            ? 'soft'
            : 'ghost'
            "
            icon="i-heroicons-users"
            :label="
            participant.players?.length
            ? String(participant.players.length)
            : undefined
            "
            @click="openManagePlayers(participant)"
            title="Manage Players"
            />
            </UChip>
            <div
            class="flex items-center gap-1"
            v-if="participant.status === ParticipantStatus.PENDING"
            >
            <UButton
            size="xs"
            color="success"
            variant="soft"
            icon="i-heroicons-check"
            :loading="participantStore.loading"
            @click="
            updateParticipantStatus(
            participant.id,
            ParticipantStatus.CONFIRMED,
            )
            "
            title="Approve"
            />
            <UButton
            size="xs"
            color="error"
            variant="soft"
            icon="i-heroicons-x-mark"
            :loading="participantStore.loading"
            @click="
            updateParticipantStatus(
            participant.id,
            ParticipantStatus.DECLINED,
            )
            "
            title="Reject"
            />
            </div>
            <UTooltip
              v-else-if="participant.status === ParticipantStatus.CONFIRMED"
              text="Confirmed participant"
            >
              <UBadge
                color="success"
                variant="subtle"
                size="xs"
                class="p-1"
              >
                <UIcon name="i-heroicons-check" class="w-3.5 h-3.5" />
              </UBadge>
            </UTooltip>
            <UBadge
              v-else
              :color="statusColors[participant.status]"
              variant="subtle"
              size="xs"
              class="capitalize"
            >
              {{ participant.status.toLowerCase() }}
            </UBadge>
            <UDropdownMenu
            :items="[
            [
            {
            label: 'Edit',
            icon: 'i-heroicons-pencil-square',
            onSelect: () =>
            openEditParticipantModal(participant),
            },
            ...(tournament?.participantType ===
            ParticipantType.TEAM
            ? [
            {
            label: 'Invite Players',
            icon: 'i-heroicons-user-plus',
            onSelect: () =>
            inviteLinkModal?.generate(participant),
            },
            {
            label: 'Link Profile Code',
            icon: 'i-heroicons-key',
            onSelect: () =>
            linkCodeModal?.generateForParticipant(participant.id),
            disabled: !!participant.team_id,
            },
            ...(participant.team_id
            ? [
            {
            label: 'Unlink Profile',
            icon: 'i-heroicons-link-slash',
            onSelect: () =>
            handleUnlinkProfile(participant),
            class: 'text-amber-500',
            },
            ]
            : []),
            ]
            : []),
            {
            label: 'Delete',
            icon: 'i-heroicons-trash',
            onSelect: () => removeParticipant(participant),
            class:
            'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20',
            },
            ],
            ]"
            :content="{ align: 'end' }"
            >
            <UButton
            color="neutral"
            variant="ghost"
            icon="i-heroicons-ellipsis-vertical"
            :loading="loading"
            class="opacity-70 flex-shrink-0"
            />
            </UDropdownMenu>
          </div>
        </div>

        <!-- Add team (dashed slot) -->
        <button
          type="button"
          class="flex items-center justify-center gap-2 min-h-[72px] rounded-xl border border-dashed border-gray-300 dark:border-white/15 text-gray-500 dark:text-gray-400 text-sm font-semibold hover:border-emerald-500/50 hover:text-emerald-500 transition-colors"
          @click="openAddModal"
        >
          <UIcon name="i-heroicons-plus" class="w-4 h-4" />
          Add team
        </button>
      </div>
    </UCard>

    <TournamentInviteModal
      v-model="showTournamentInviteModal"
      :tournament-id="tournamentId"
    />

    <TournamentParticipantAddModal v-model:open="showAddModal" />

    <TournamentParticipantEditModal
      v-model:open="showEditModal"
      :participant="editingParticipant"
    />

    <TournamentParticipantPlayersModal
      v-model:open="showManagePlayersModal"
      :participant="selectedParticipant"
      @invite="(p) => inviteLinkModal?.generate(p)"
      @player-link-code="(player) => linkCodeModal?.generateForPlayer(player.id)"
    />

    <TournamentInviteLinkModal ref="inviteLinkModal" />

    <TournamentLinkCodeModal ref="linkCodeModal" />
  </div>
</template>
