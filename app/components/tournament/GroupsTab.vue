<script setup lang="ts">
import { ModalDialogsKey } from "~/composables/useModalDialogs";

const route = useRoute();
const tournamentStore = useTournamentStore();
const participantStore = useParticipantStore();
const standingStore = useStandingStore();
const groupStore = useGroupStore();
const { currentTournament: tournament } = storeToRefs(tournamentStore);
const { participants } = storeToRefs(participantStore);
const { handleError } = useErrors();
const { openConfirmModal, openPromptModal } = inject(ModalDialogsKey)!;

const tournamentId = computed(() => route.params.id as string);
const isUnified = computed(() => tournament.value?.unifiedStandings ?? false);

// Group / Pot Management state
const newGroupName = ref("");
const addingGroup = ref(false);

const handleAddGroup = async () => {
  if (!newGroupName.value.trim()) return;
  addingGroup.value = true;
  try {
    await groupStore.createGroup({
      name: newGroupName.value,
      tournament_id: tournament.value?.id || tournamentId.value,
    });
    newGroupName.value = "";
    useToast().add({
      title: isUnified.value ? "Pot created successfully" : "Group created successfully",
      color: "success"
    });
  } catch (err: any) {
    handleError(err, { title: isUnified.value ? "Failed to create pot" : "Failed to create group" });
  } finally {
    addingGroup.value = false;
  }
};

const handleRenameGroup = (group: any) => {
  openPromptModal({
    title: isUnified.value ? "Rename Pot" : "Rename Group",
    label: isUnified.value ? "Pot Name" : "Group Name",
    initialValue: group.name,
    confirmLabel: "Rename",
    onConfirm: async (newName) => {
      if (newName && newName !== group.name) {
        await groupStore.updateGroup(group.id, { name: newName });
        useToast().add({
          title: isUnified.value ? "Pot renamed" : "Group renamed",
          color: "success"
        });
      }
    },
  });
};

const handleDeleteGroup = (groupId: string) => {
  openConfirmModal({
    title: isUnified.value ? "Delete Pot" : "Delete Group",
    description: isUnified.value
      ? "Are you sure you want to delete this pot? All participants in this pot will become unassigned."
      : "Are you sure you want to delete this group? All participants in this group will become unassigned.",
    confirmLabel: isUnified.value ? "Delete Pot" : "Delete Group",
    color: "error",
    onConfirm: async () => {
      try {
        await groupStore.deleteGroup(groupId);
        // Update local participants list to reflect they are now unassigned
        participants.value.forEach((p) => {
          if (p.groupId === groupId) p.groupId = null;
        });
        // Refresh standings
        standingStore.fetchStandings(
          tournament.value?.id || tournamentId.value,
        );
        useToast().add({
          title: isUnified.value ? "Pot deleted" : "Group deleted",
          color: "success"
        });
      } catch (err: any) {
        handleError(err, { title: "Delete failed" });
      }
    },
  });
};

const handleAssignToGroup = async (
  participantId: string,
  groupId: string | null,
) => {
  try {
    await groupStore.assignParticipant(participantId, groupId);
    // Synchronize local participants list
    const participant = participants.value.find((p) => p.id === participantId);
    if (participant) {
      participant.groupId = groupId;

      const participantName =
        participant.customName ||
        participant.user?.name ||
        participant.team?.name ||
        "Team";
      const group = groupId
        ? groupStore.groups.find((g) => g.id === groupId)
        : null;
      const groupName = group?.name || (isUnified.value ? "pot" : "group");

      useToast().add({
        title: groupId
          ? `${participantName} assigned to ${groupName}`
          : `${participantName} removed from ${isUnified.value ? 'pot' : 'group'}`,
        color: "success",
      });
    }
    // Refresh standings to show newborn records
    standingStore.fetchStandings(tournament.value?.id || tournamentId.value);
  } catch (err: any) {
    handleError(err, { title: "Operation failed" });
  }
};

// Drag and Drop for Group Assignment
const draggedParticipantId = ref<string | null>(null);
const dropTargetGroupId = ref<string | null | "unassigned">(null);

const handleDragStart = (participantId: string) => {
  draggedParticipantId.value = participantId;
};

const handleDragOver = (e: DragEvent, groupId: string | "unassigned") => {
  e.preventDefault();
  dropTargetGroupId.value = groupId;
};

const handleDragLeave = () => {
  dropTargetGroupId.value = null;
};

const handleDrop = (groupId: string | null) => {
  const pId = draggedParticipantId.value;
  if (pId) {
    // Only assign if it's actually changing groups
    const p = participants.value.find((item) => item.id === pId);
    if (p && p.groupId !== groupId) {
      handleAssignToGroup(pId, groupId);
    }
  }
  draggedParticipantId.value = null;
  dropTargetGroupId.value = null;
};

const unassignedParticipants = computed(() => {
  if (!participants.value) return [];
  return participants.value.filter((p) => !p.groupId);
});

const getGroupParticipants = (groupId: string) => {
  return participants.value.filter((p) => p.groupId === groupId);
};
</script>

<template>
  <div class="mt-4 space-y-6">
    <!-- Group Creation & Stats -->
    <div
      class="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400"
        >
          <UIcon
            name="i-heroicons-rectangle-group"
            class="w-6 h-6"
          />
        </div>
        <div>
          <h3 class="font-semibold text-gray-900 dark:text-white">
            {{ isUnified ? 'Tournament Pots' : 'Tournament Groups' }}
          </h3>
          <p class="text-xs text-gray-500">
            {{ groupStore.groups.length }} {{ isUnified ? (groupStore.groups.length === 1 ? 'Pot' : 'Pots') : (groupStore.groups.length === 1 ? 'Group' : 'Groups') }} ·
            {{ participants.length }} Participants
          </p>
        </div>
      </div>

      <div class="flex w-full md:w-auto gap-2">
        <UInput
          v-model="newGroupName"
          :placeholder="isUnified ? 'New pot name (e.g. Pot 1)...' : 'New group name...'"
          class="flex-1 md:w-48"
          @keyup.enter="handleAddGroup"
        />
        <UButton
          color="primary"
          icon="i-heroicons-plus"
          :label="isUnified ? 'Add Pot' : 'Add Group'"
          :loading="addingGroup"
          :disabled="!newGroupName.trim()"
          @click="handleAddGroup"
        />
      </div>
    </div>

    <!-- Unassigned Participants Pool -->
    <UCard
      v-if="unassignedParticipants.length > 0"
      class="border-dashed border-2 transition-all duration-200"
      :class="[
        dropTargetGroupId === 'unassigned'
          ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 ring-2 ring-indigo-500/20'
          : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20',
      ]"
      @dragover="handleDragOver($event, 'unassigned')"
      @dragleave="handleDragLeave"
      @drop="handleDrop(null)"
    >
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon
              name="i-heroicons-user-plus"
              class="w-4 h-4 text-amber-500"
            />
            <span
              class="text-sm font-semibold text-gray-700 dark:text-gray-300"
            >
              Unassigned Participants ({{
                unassignedParticipants.length
              }})
            </span>
          </div>
        </div>
      </template>

      <div class="flex flex-wrap gap-2">
        <div
          v-for="participant in unassignedParticipants"
          :key="participant.id"
          draggable="true"
          @dragstart="handleDragStart(participant.id)"
          class="flex items-center gap-2 bg-white dark:bg-gray-800 pl-2 pr-1 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-sm shadow-sm transition-all hover:border-indigo-300 dark:hover:border-indigo-600 cursor-grab active:cursor-grabbing hover:shadow-md"
        >
          <UAvatar
            :src="participant.logoUrl || undefined"
            :alt="
              participant.customShortName ||
              participant.customName ||
              '?'
            "
            size="xs"
            class="bg-gray-100 dark:bg-gray-700"
          />
          <span
            class="max-w-[120px] truncate font-medium text-gray-700 dark:text-gray-200"
            >{{ participant.customName || "Unnamed" }}</span
          >

          <UDropdownMenu
            :items="[
              groupStore.groups.map((g) => ({
                label: g.name,
                icon: 'i-heroicons-arrow-right',
                onSelect: () =>
                  handleAssignToGroup(participant.id, g.id),
              })),
            ]"
            :content="{ align: 'end' }"
          >
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              icon="i-heroicons-chevron-right"
              class="ml-1"
            />
          </UDropdownMenu>
        </div>
      </div>
    </UCard>

    <!-- Groups Grid -->
    <div
      v-if="groupStore.groups.length > 0"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
    >
      <div
        v-for="group in groupStore.groups"
        :key="group.id"
        class="group flex flex-col"
      >
        <div
          class="bg-white dark:bg-[#0a0a0a] rounded-xl border border-gray-200 dark:border-white/[0.08] shadow-sm overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow"
        >
          <!-- Group Header -->
          <div
            class="p-3 sm:p-4 border-b border-gray-200 dark:border-white/[0.08] flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.02]"
          >
            <div class="flex items-center gap-2 min-w-0">
              <div class="w-2 h-2 rounded-full bg-indigo-500"></div>
              <h4
                class="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate"
              >
                {{ group.name }}
              </h4>
              <span class="text-xs text-gray-400 font-normal"
                >({{ getGroupParticipants(group.id).length }})</span
              >
            </div>

            <div
              class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <UButton
                size="xs"
                variant="ghost"
                color="neutral"
                icon="i-heroicons-pencil"
                @click="handleRenameGroup(group)"
              />
              <UButton
                size="xs"
                variant="ghost"
                color="error"
                icon="i-heroicons-trash"
                @click="handleDeleteGroup(group.id)"
              />
            </div>
          </div>

          <!-- Group Content (Teams) -->
          <div
            class="p-2 sm:p-3 flex-1 space-y-1.5 sm:space-y-2 min-h-[80px] sm:min-h-[100px] max-h-[240px] sm:max-h-[300px] overflow-y-auto transition-all duration-200"
            :class="[
              dropTargetGroupId === group.id
                ? 'bg-indigo-50/50 dark:bg-indigo-950/20 ring-2 ring-inset ring-indigo-500/50'
                : '',
            ]"
            @dragover="handleDragOver($event, group.id)"
            @dragleave="handleDragLeave"
            @drop="handleDrop(group.id)"
          >
            <div
              v-for="participant in getGroupParticipants(group.id)"
              :key="participant.id"
              draggable="true"
              @dragstart="handleDragStart(participant.id)"
              class="flex items-center justify-between gap-2 p-1.5 sm:p-2 rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.08] text-xs sm:text-sm hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-all cursor-grab active:cursor-grabbing hover:shadow-sm"
            >
              <div
                class="flex items-center gap-1.5 sm:gap-2 min-w-0"
              >
                <UAvatar
                  :src="participant.logoUrl || undefined"
                  :alt="
                    participant.customShortName ||
                    participant.customName ||
                    '?'
                  "
                  size="xs"
                  class="bg-gray-100 dark:bg-gray-700 shrink-0"
                />
                <span
                  class="truncate font-medium text-gray-700 dark:text-gray-200"
                >
                  {{ participant.customName || "Unnamed" }}
                </span>
              </div>
              <UButton
                size="xs"
                variant="ghost"
                color="error"
                icon="i-heroicons-x-mark"
                @click="handleAssignToGroup(participant.id, null)"
              />
            </div>

            <div
              v-if="getGroupParticipants(group.id).length === 0"
              class="flex flex-col items-center justify-center py-6 sm:py-8 text-center text-gray-400"
            >
              <UIcon
                name="i-heroicons-user-group"
                class="w-6 h-6 sm:w-8 sm:h-8 mb-2 opacity-20"
              />
              <p class="text-xs">
                {{ isUnified ? 'No teams assigned to this pot yet' : 'No teams assigned yet' }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State Groups -->
    <div
      v-else
      class="text-center py-12 sm:py-20 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 px-4"
    >
      <div
        class="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4"
      >
        <UIcon
          name="i-heroicons-rectangle-group"
          class="w-8 h-8 sm:w-10 sm:h-10 text-gray-300 dark:text-gray-600"
        />
      </div>
      <h3
        class="text-base sm:text-lg font-semibold text-gray-900 dark:text-white"
      >
        {{ isUnified ? 'No pots created' : 'No groups created' }}
      </h3>
      <p class="text-sm text-gray-500 max-w-xs mx-auto mt-1 mb-6">
        {{ isUnified
          ? 'Create pots manually to organize your tournament seedings.'
          : 'Create groups manually to organize your tournament participants.' }}
      </p>
      <div class="max-w-xs mx-auto flex gap-2">
        <UInput
          v-model="newGroupName"
          :placeholder="isUnified ? 'e.g. Pot 1' : 'e.g. Group A'"
          class="flex-1"
          size="sm"
        />
        <UButton
          color="primary"
          size="sm"
          :label="isUnified ? 'Create Pot' : 'Create Group'"
          @click="handleAddGroup"
        />
      </div>
    </div>
  </div>
</template>
