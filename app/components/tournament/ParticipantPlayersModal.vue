<script setup lang="ts">
import type { Participant } from "~/types";
import { ModalDialogsKey } from "~/composables/useModalDialogs";

const props = defineProps<{
  participant: Participant | null;
}>();

const open = defineModel<boolean>("open", { default: false });

const emit = defineEmits<{
  invite: [participant: Participant];
  "player-link-code": [player: any];
}>();

const route = useRoute();
const tournamentStore = useTournamentStore();
const participantStore = useParticipantStore();
const { loading } = storeToRefs(tournamentStore);
const { handleError } = useErrors();
const { openConfirmModal } = inject(ModalDialogsKey)!;

const tournamentId = computed(() => route.params.id as string);

// Participant Management
const newPlayer = reactive({
  name: "",
  number: null as number | null,
  position: "FWD",
});
const editingPlayerId = ref<string | null>(null);
const deletingPlayerId = ref<string | null>(null);

// Excel Upload
const uploadingExcel = ref(false);
const excelFileInput = ref<HTMLInputElement | null>(null);

const triggerExcelUpload = () => {
  if (excelFileInput.value) excelFileInput.value.click();
};

const handleExcelUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file || !props.participant) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    if (!props.participant) return;
    try {
      uploadingExcel.value = true;
      const xlsx = await import("xlsx");
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = xlsx.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) throw new Error("No sheets found in Excel file");
      const worksheet = workbook.Sheets[firstSheetName];
      if (!worksheet) throw new Error("Worksheet not found in the Excel file");
      const jsonData = xlsx.utils.sheet_to_json<any>(worksheet);

      const players = jsonData
        .map((row) => {
          // Find keys defensively
          const keys = Object.keys(row);
          const nameKey = keys.find(
            (k) =>
              k.toLowerCase().trim() === "name" ||
              k.toLowerCase().trim() === "player",
          );
          const numberKey = keys.find(
            (k) =>
              k.toLowerCase().trim() === "number" ||
              k.toLowerCase().trim() === "#",
          );
          const positionKey = keys.find(
            (k) =>
              k.toLowerCase().trim() === "position" ||
              k.toLowerCase().trim() === "pos",
          );

          return {
            name: nameKey ? String(row[nameKey]).trim() : "",
            number: numberKey ? parseInt(row[numberKey]) || null : null,
            position: positionKey
              ? String(row[positionKey]).trim().toUpperCase()
              : "FWD",
          };
        })
        .filter((p) => p.name);

      if (players.length > 0) {
        await participantStore.addPlayersBulk(props.participant.id, {
          players,
        });
        useToast().add({
          title: `Added ${players.length} players successfully`,
          color: "success",
        });

        // fetch updated list
        const updatedPlayers = await participantStore.fetchParticipantPlayers(
          props.participant.id,
        );
        props.participant.players = updatedPlayers;
      } else {
        useToast().add({
          title: "No valid players found in Excel",
          color: "error",
        });
      }
    } catch (err: any) {
      handleError(err, { title: "Failed to parse Excel file" });
    } finally {
      uploadingExcel.value = false;
      if (excelFileInput.value) excelFileInput.value.value = "";
    }
  };
  reader.readAsArrayBuffer(file);
};

const downloadExcelTemplate = async () => {
  const xlsx = await import("xlsx");
  const wsData = [
    ["Name", "Number", "Position"],
    ["John Doe", "9", "FWD"],
    ["Jane Smith", "1", "GK"],
  ];
  const ws = xlsx.utils.aoa_to_sheet(wsData);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, "Players");
  xlsx.writeFile(wb, "Parascores_Player_Upload_Template.xlsx");
};

const positions = ["GK", "DEF", "MID", "FWD", "COACH"];

// Fetch players and reset the form whenever the modal opens
watch(open, async (isOpen) => {
  if (!isOpen || !props.participant) return;
  const participant = props.participant;
  // Fetch players if not loaded
  if (!participant.players?.length) {
    try {
      const players = await participantStore.fetchParticipantPlayers(
        participant.id,
      );
      participant.players = players;
    } finally {
      // loading.value = false
    }
  }
  cancelEditPlayer(); // Reset form and editing state
});

const handleAddPlayer = async () => {
  if (!props.participant || !newPlayer.name) return;

  try {
    if (editingPlayerId.value) {
      await participantStore.updatePlayer(
        props.participant.id,
        editingPlayerId.value,
        { ...newPlayer },
      );
      useToast().add({
        title: "Player updated successfully",
        color: "success",
      });
      cancelEditPlayer();
    } else {
      await participantStore.addPlayer(
        tournamentId.value,
        props.participant.id,
        { ...newPlayer },
      );
      useToast().add({ title: "Player added successfully", color: "success" });
      // Reset form
      newPlayer.name = "";
      newPlayer.number = null;
      newPlayer.position = "FWD";
    }
  } catch (error: any) {
    handleError(error, {
      title: editingPlayerId.value
        ? "Failed to update player"
        : "Failed to add player",
    });
  } finally {
    // loading.value = false
  }
};

const startEditPlayer = (player: any) => {
  editingPlayerId.value = player.id;
  newPlayer.name = player.name;
  newPlayer.number = player.number || null;
  newPlayer.position = player.position || "FWD";
};

const cancelEditPlayer = () => {
  editingPlayerId.value = null;
  newPlayer.name = "";
  newPlayer.number = null;
  newPlayer.position = "FWD";
};

const handleDeletePlayer = async (playerId: string) => {
  if (!props.participant) return;

  openConfirmModal({
    title: "Delete Player",
    description: "Are you sure you want to remove this player from the team?",
    confirmLabel: "Delete",
    color: "error",
    onConfirm: async () => {
      deletingPlayerId.value = playerId;
      try {
        await participantStore.removePlayer(
          props.participant!.id,
          playerId,
        );
        useToast().add({
          title: "Player removed successfully",
          color: "success",
        });

        if (editingPlayerId.value === playerId) cancelEditPlayer();
      } catch (error: any) {
        handleError(error, { title: "Failed to remove player" });
      } finally {
        deletingPlayerId.value = null;
      }
    },
  });
};

const pendingPlayers = computed(() => {
  return (
    props.participant?.players?.filter((p) => p.status === "PENDING") || []
  );
});

const approvedPlayers = computed(() => {
  return (
    props.participant?.players?.filter(
      (p) => p.status === "APPROVED",
    ) || []
  );
});

const handleApprovePlayer = async (playerId: string) => {
  if (!props.participant) return;
  try {
    await participantStore.updatePlayerStatus(
      props.participant.id,
      playerId,
      "APPROVED",
    );
    useToast().add({ title: "Player approved successfully", color: "success" });
  } catch (error: any) {
    handleError(error, { title: "Failed to approve player" });
  }
};

const handleRejectPlayer = async (playerId: string) => {
  if (!props.participant) return;
  openConfirmModal({
    title: "Reject Player",
    description: "Are you sure you want to reject this join request?",
    confirmLabel: "Reject",
    color: "error",
    onConfirm: async () => {
      try {
        await participantStore.updatePlayerStatus(
          props.participant!.id,
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

const handleUnlinkPlayerProfile = async (player: any) => {
  try {
    await $api(`/players/${player.id}/unlink-profile`, { method: "POST" });
    useToast().add({ title: "Player profile unlinked", color: "success" });
    // Refresh player list in modal
    if (props.participant) {
      const updatedPlayers = await participantStore.fetchParticipantPlayers(
        props.participant.id,
      );
      props.participant.players = updatedPlayers;
    }
  } catch (err: any) {
    handleError(err, { title: "Failed to unlink player profile" });
  }
};
</script>

<template>
  <!-- Manage Players Modal -->
  <UModal
    v-model:open="open"
    :ui="{ content: 'sm:max-w-lg' }"
  >
    <template #content>
      <UCard
        class="ring-0 shadow-none"
        :ui="{ root: 'divide-y divide-gray-100 dark:divide-gray-800' }"
      >
        <template #header>
          <div class="flex items-center justify-between">
            <h3
              class="text-base font-semibold leading-6 text-gray-900 dark:text-white"
            >
              Manage Players - {{ participant?.customName }}
            </h3>
            <div class="flex items-center gap-2">
              <UButton
                icon="i-heroicons-x-mark"
                variant="ghost"
                color="neutral"
                size="sm"
                @click="open = false"
              />
            </div>
          </div>
        </template>

        <div class="space-y-4 max-h-[60vh] overflow-y-auto px-1 py-1 pr-3">
          <!-- Excel Upload Instructions -->
          <UAlert
            icon="i-heroicons-information-circle"
            title="Bulk Upload Instructions"
            color="info"
            variant="soft"
          >
            <template #description>
              <div class="flex flex-col items-start gap-3 mt-1">
                <span class="text-sm">
                  Download our pre-formatted template or upload your own
                  Excel/CSV file to add players in bulk. Only the 'Name' column
                  is required; you can optionally include 'Number' and
                  'Position'.
                </span>
                <div class="flex flex-wrap items-center gap-3 w-full">
                  <UButton
                    color="info"
                    variant="solid"
                    size="sm"
                    icon="i-heroicons-arrow-down-tray"
                    label="Get Template"
                    @click="downloadExcelTemplate"
                  />

                  <input
                    ref="excelFileInput"
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    class="hidden"
                    @change="handleExcelUpload"
                  />
                  <UButton
                    variant="soft"
                    color="primary"
                    size="sm"
                    icon="i-heroicons-document-arrow-up"
                    :loading="uploadingExcel"
                    @click="triggerExcelUpload"
                    label="Upload Excel"
                  />
                </div>
              </div>
            </template>
          </UAlert>

          <!-- Player Invite Link -->
          <UAlert
            icon="i-heroicons-link"
            title="Invite Players"
            variant="soft"
            color="success"
          >
            <template #description>
              <div class="flex flex-col items-start gap-3 mt-1">
                <span class="text-sm">
                  Share a link with players to allow them to join this team
                  directly.
                </span>
                <UButton
                  color="success"
                  variant="solid"
                  size="sm"
                  icon="i-heroicons-share"
                  label="Share Link"
                  @click="participant && emit('invite', participant)"
                />
              </div>
            </template>
          </UAlert>

          <!-- Add Player Form -->
          <form @submit.prevent="handleAddPlayer" class="flex items-end gap-3">
            <div class="flex-1">
              <UFormField label="Name" required>
                <UInput
                  v-model="newPlayer.name"
                  placeholder="Player Name"
                  class="w-full"
                />
              </UFormField>
            </div>
            <div class="w-24">
              <UFormField label="Number">
                <UInput
                  v-model.number="newPlayer.number"
                  type="number"
                  placeholder="#"
                />
              </UFormField>
            </div>
            <div class="w-32">
              <UFormField label="Position">
                <USelect
                  v-model="newPlayer.position"
                  :items="positions"
                  class="w-full"
                />
              </UFormField>
            </div>
            <UButton
              type="submit"
              :icon="editingPlayerId ? 'i-heroicons-check' : 'i-heroicons-plus'"
              :color="editingPlayerId ? 'primary' : 'primary'"
              :disabled="!newPlayer.name"
              :loading="loading"
            />
            <UButton
              v-if="editingPlayerId"
              type="button"
              icon="i-heroicons-x-mark"
              color="neutral"
              variant="soft"
              @click="cancelEditPlayer"
              title="Cancel Edit"
            />
          </form>

          <USeparator />

          <!-- Player List -->
          <div class="space-y-4">
            <!-- Pending Requests -->
            <div v-if="pendingPlayers.length > 0" class="space-y-3">
              <h4
                class="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2"
              >
                <UIcon name="i-heroicons-clock" class="w-4 h-4" />
                Pending Join Requests ({{ pendingPlayers.length }})
              </h4>
              <div class="space-y-2">
                <div
                  v-for="player in pendingPlayers"
                  :key="player.id"
                  class="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-lg"
                >
                  <div class="flex items-center gap-3">
                    <!-- Player Avatar Wrapper -->
                    <div class="relative w-8 h-8 flex-shrink-0">
                      <!-- Cropped Avatar Container -->
                      <div
                        class="w-full h-full rounded-full overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 flex items-center justify-center"
                      >
                        <img
                          v-if="player.avatarUrl"
                          :src="player.avatarUrl"
                          class="w-full h-full object-cover"
                        />
                        <span v-else class="text-xs font-bold text-gray-400">
                          {{ player.name.charAt(0) }}
                        </span>
                      </div>
                      <!-- Small Shirt Number Overlay -->
                      <span
                        v-if="player.number"
                        class="absolute -bottom-0.5 -right-0.5 bg-amber-500 text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white dark:border-[#1a1a1a] shadow-sm"
                      >
                        {{ player.number }}
                      </span>
                    </div>
                    <div>
                      <p
                        class="text-sm font-medium text-gray-900 dark:text-white"
                      >
                        {{ player.name }}
                      </p>
                      <p class="text-xs text-gray-500">
                        {{
                          player.position ? player.position.split("-")[0] : ""
                        }}
                        {{ player.number ? `• #${player.number}` : "" }}
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <UButton
                      size="xs"
                      color="success"
                      variant="soft"
                      icon="i-heroicons-check"
                      label="Approve"
                      @click="handleApprovePlayer(player.id)"
                    />
                    <UButton
                      size="xs"
                      color="error"
                      variant="soft"
                      icon="i-heroicons-x-mark"
                      label="Reject"
                      @click="handleRejectPlayer(player.id)"
                    />
                  </div>
                </div>
              </div>
              <USeparator />
            </div>

            <!-- Approved Players -->
            <div class="space-y-2">
              <h4
                v-if="pendingPlayers.length > 0"
                class="text-xs font-bold text-gray-500 uppercase tracking-wider"
              >
                Active Players ({{ approvedPlayers.length }})
              </h4>
              <div
                v-if="!approvedPlayers.length && !pendingPlayers.length"
                class="text-center py-8 text-gray-400"
              >
                <p>No players added yet</p>
              </div>
              <div v-else class="space-y-2 max-h-60 overflow-y-auto pr-1">
                <div
                  v-for="player in approvedPlayers"
                  :key="player.id"
                  class="group flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                >
                  <div class="flex items-center gap-3">
                    <!-- Player Avatar Wrapper -->
                    <div class="relative w-8 h-8 flex-shrink-0">
                      <!-- Cropped Avatar Container -->
                      <div
                        class="w-full h-full rounded-full overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 flex items-center justify-center"
                      >
                        <img
                          v-if="player.avatarUrl"
                          :src="player.avatarUrl"
                          class="w-full h-full object-cover"
                        />
                        <span v-else class="text-xs font-bold text-gray-400">
                          {{ player.name.charAt(0) }}
                        </span>
                      </div>
                      <!-- Small Shirt Number Overlay -->
                      <span
                        v-if="player.number"
                        class="absolute -bottom-0.5 -right-0.5 bg-indigo-500 text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white dark:border-[#1a1a1a] shadow-sm"
                      >
                        {{ player.number }}
                      </span>
                    </div>
                    <div>
                      <p
                        class="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5"
                      >
                        {{ player.name }}
                        <UIcon
                          v-if="player.userId"
                          name="i-heroicons-link"
                          class="w-3.5 h-3.5 text-indigo-500 shrink-0"
                          title="Linked to user account"
                        />
                      </p>
                      <p class="text-xs text-gray-500">
                        {{
                          player.position ? player.position.split("-")[0] : ""
                        }}
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center">
                    <UDropdownMenu
                      :items="[
                        [
                          {
                            label: 'Edit',
                            icon: 'i-heroicons-pencil-square',
                            onSelect: () => startEditPlayer(player),
                          },
                          {
                            label: 'Link Profile Code',
                            icon: 'i-heroicons-key',
                            onSelect: () => emit('player-link-code', player),
                            disabled: !!player.userId,
                          },
                          ...(player.userId
                            ? [
                                {
                                  label: 'Unlink Profile',
                                  icon: 'i-heroicons-link-slash',
                                  onSelect: () =>
                                    handleUnlinkPlayerProfile(player),
                                  class: 'text-amber-500',
                                },
                              ]
                            : []),
                          {
                            label: 'Delete',
                            icon: 'i-heroicons-trash',
                            onSelect: () => handleDeletePlayer(player.id),
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
                        :loading="deletingPlayerId === player.id"
                        class="opacity-70 flex-shrink-0"
                      />
                    </UDropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
