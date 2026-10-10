<script setup lang="ts">
const open = defineModel<boolean>("open", { default: false });

const route = useRoute();
const tournamentStore = useTournamentStore();
const participantStore = useParticipantStore();
const fixtureStore = useFixtureStore();
const { currentTournament: tournament } = storeToRefs(tournamentStore);
const { participants } = storeToRefs(participantStore);
const { handleError } = useErrors();

const tournamentId = computed(() => route.params.id as string);

const newEventName = ref("");
const creatingEvent = ref(false);
const selectedEventParticipantIds = ref<string[]>([]);

// Reset the form whenever the modal opens
watch(open, (isOpen) => {
  if (!isOpen) return;
  newEventName.value = "";
  // Default: everyone entered
  selectedEventParticipantIds.value = participants.value.map((p) => p.id);
});

const toggleEventParticipant = (id: string) => {
  const idx = selectedEventParticipantIds.value.indexOf(id);
  if (idx === -1) selectedEventParticipantIds.value.push(id);
  else selectedEventParticipantIds.value.splice(idx, 1);
};

const createRaceEvent = async () => {
  const name = newEventName.value.trim();
  if (!name || !tournament.value) return;
  creatingEvent.value = true;
  try {
    const res = await fixtureStore.createFixture({
      tournament_id: tournament.value.id,
      round: 1,
      roundName: name,
      status: undefined,
    } as any);

    // Seed blank result entries for the selected participants (marks entry)
    const fixtureId = res?.data?.id;
    if (fixtureId && selectedEventParticipantIds.value.length) {
      await $api(`/fixtures/${fixtureId}/results`, {
        method: "PUT",
        body: {
          results: selectedEventParticipantIds.value.map((id) => ({
            participantId: id,
          })),
        },
      });
    }

    open.value = false;
    await fixtureStore.fetchFixtures(tournament.value.id);
    useToast().add({
      title: "Event Created",
      description: `"${name}" is ready for result entry.`,
      color: "success",
    });
  } catch (err: any) {
    handleError(err, { title: "Failed to create event" });
  } finally {
    creatingEvent.value = false;
  }
};
</script>

<template>
  <!-- Add Event Modal (race tournaments) -->
  <UModal v-model:open="open" title="Add Event">
    <template #body>
      <div class="space-y-4">
        <UFormField label="Event name" required>
          <UInput
            v-model="newEventName"
            placeholder="e.g. Men's 100m Final"
            class="w-full"
            @keyup.enter="createRaceEvent"
          />
        </UFormField>

        <UFormField
          label="Participating athletes"
          :description="`${selectedEventParticipantIds.length} of ${participants.length} selected`"
        >
          <div class="max-h-64 overflow-y-auto space-y-1 rounded-lg border border-gray-200 dark:border-gray-800 p-2">
            <button
              v-for="p in participants"
              :key="p.id"
              type="button"
              class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors"
              :class="selectedEventParticipantIds.includes(p.id)
                ? 'bg-emerald-500/10 text-gray-900 dark:text-white'
                : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'"
              @click="toggleEventParticipant(p.id)"
            >
              <UIcon
                :name="selectedEventParticipantIds.includes(p.id)
                  ? 'i-heroicons-check-circle-solid'
                  : 'i-heroicons-minus-circle'"
                class="w-4 h-4 shrink-0"
                :class="selectedEventParticipantIds.includes(p.id) ? 'text-emerald-500' : ''"
              />
              <span class="text-sm font-medium truncate">{{ p.customName }}</span>
            </button>
          </div>
        </UFormField>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton color="neutral" variant="ghost" @click="open = false">
          Cancel
        </UButton>
        <UButton
          color="primary"
          icon="i-heroicons-plus"
          :loading="creatingEvent"
          :disabled="!newEventName.trim() || !selectedEventParticipantIds.length"
          @click="createRaceEvent"
        >
          Create Event
        </UButton>
      </div>
    </template>
  </UModal>
</template>
