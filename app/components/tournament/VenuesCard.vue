<script setup lang="ts">
import { ModalDialogsKey } from "~/composables/useModalDialogs";

const route = useRoute();
const tournamentStore = useTournamentStore();
const venueStore = useVenueStore();
const { currentTournament: tournament } = storeToRefs(tournamentStore);
const { venues } = storeToRefs(venueStore);
const { openConfirmModal } = inject(ModalDialogsKey)!;

const tournamentId = computed(() => route.params.id as string);

const manageMode = ref(false);

// Venue Management
const showAddVenueModal = ref(false);
const addingVenue = ref(false);
const newVenueName = ref("");
const addVenueError = ref<string | null>(null);

const openAddVenueModal = () => {
  newVenueName.value = "";
  addVenueError.value = null;
  showAddVenueModal.value = true;
};

const handleAddVenue = async () => {
  if (addingVenue.value || !newVenueName.value.trim() || !tournament.value)
    return;

  // Check if venue already exists
  const exists = venues.value.some(
    (v) => v.name.toLowerCase() === newVenueName.value.trim().toLowerCase(),
  );
  if (exists) {
    addVenueError.value = "A venue with this name already exists";
    return;
  }

  addingVenue.value = true;
  addVenueError.value = null;

  try {
    await venueStore.addVenue(tournamentId.value, newVenueName.value.trim());
    showAddVenueModal.value = false;
    useToast().add({ title: "Venue added successfully", color: "success" });
  } catch (err: any) {
    addVenueError.value =
      err?.data?.message || err?.message || "Failed to add venue";
  } finally {
    addingVenue.value = false;
  }
};

const handleRemoveVenue = (venueId: string, venueName: string) => {
  openConfirmModal({
    title: "Remove Venue",
    description: `Are you sure you want to remove "${venueName}" from the list of venues?`,
    confirmLabel: "Remove",
    color: "error",
    onConfirm: async () => {
      try {
        await venueStore.removeVenue(venueId);
        useToast().add({ title: "Venue removed", color: "success" });
      } catch (error: any) {
        const message = error.data?.message || error.message || "Unknown error";
        useToast().add({
          title: "Failed to remove venue",
          description: message,
          color: "error",
        });
      }
    },
  });
};
</script>

<template>
  <!-- Venues -->
  <UCard
    class="border border-gray-100 dark:border-gray-800 shadow-sm transition-all h-fit"
  >
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon
            name="i-heroicons-map-pin"
            class="w-5 h-5 text-emerald-500"
          />
          <span class="font-medium">Venues</span>
          <UBadge
            v-if="venues.length"
            size="sm"
            variant="subtle"
          >
            {{ venues.length }}
          </UBadge>
        </div>
        <div class="flex items-center gap-1">
          <UButton
            size="xs"
            variant="ghost"
            :color="manageMode ? 'primary' : 'neutral'"
            :icon="manageMode ? 'i-heroicons-check' : 'i-heroicons-pencil-square'"
            @click="manageMode = !manageMode"
            :label="manageMode ? 'Done' : 'Manage'"
          />
          <UButton
            size="xs"
            variant="ghost"
            icon="i-heroicons-plus"
            @click="openAddVenueModal"
          />
        </div>
      </div>
    </template>

    <div v-if="venues.length" class="flex flex-col gap-2">
      <div
        v-for="venue in venues"
        :key="venue.id"
        class="group relative"
      >
        <div
          class="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all"
        >
          <UIcon
            name="i-heroicons-map-pin"
            class="w-4 h-4 text-gray-400"
          />
          <span
            class="text-sm text-gray-700 dark:text-gray-300 truncate"
            >{{ venue.name }}</span
          >
        </div>
        <button
          v-if="manageMode"
          class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs shadow-lg transition-all z-10 hover:bg-red-600 hover:scale-110 active:scale-95"
          @click="handleRemoveVenue(venue.id, venue.name)"
          title="Remove"
        >
          ×
        </button>
      </div>
    </div>
    <div v-else class="text-center py-4 text-gray-400 text-sm">
      <p>No venues added yet</p>
      <UButton
        size="xs"
        variant="link"
        @click="openAddVenueModal"
        >Add one</UButton
      >
    </div>
  </UCard>

  <!-- Add Venue Modal -->
  <UModal v-model:open="showAddVenueModal" :ui="{ content: 'sm:max-w-md' }">
    <template #content>
      <UCard class="ring-0 shadow-none">
        <template #header>
          <div class="flex items-center justify-between">
            <h3
              class="text-base font-semibold leading-6 text-gray-900 dark:text-white"
            >
              Add Venue
            </h3>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark"
              class="-my-1"
              @click="showAddVenueModal = false"
            />
          </div>
        </template>

        <form @submit.prevent="handleAddVenue" class="space-y-4 py-2">
          <UAlert
            v-if="addVenueError"
            color="error"
            variant="subtle"
            icon="i-heroicons-exclamation-triangle"
            :title="addVenueError"
            class="mb-2"
          />

          <UFormField label="Venue Name" required>
            <UInput
              v-model="newVenueName"
              placeholder="e.g. National Stadium, Pitch 1"
              autofocus
              @keyup.enter="handleAddVenue"
            />
          </UFormField>

          <div class="flex items-center justify-end gap-3 pt-2">
            <UButton
              color="neutral"
              variant="ghost"
              label="Cancel"
              @click="showAddVenueModal = false"
            />
            <UButton
              color="primary"
              label="Add Venue"
              :loading="addingVenue"
              :disabled="!newVenueName.trim()"
              type="submit"
            />
          </div>
        </form>
      </UCard>
    </template>
  </UModal>
</template>
