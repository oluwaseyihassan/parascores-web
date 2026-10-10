<script setup lang="ts">
const open = defineModel<boolean>("open", { default: false });

const emit = defineEmits<{
  "start-manual-wizard": [];
}>();

const route = useRoute();
const fixtureStore = useFixtureStore();
const standingStore = useStandingStore();
const { handleError } = useErrors();

const tournamentId = computed(() => route.params.id as string);

// Advance to Knockout Stage (Hybrid)
const advancing = ref(false);
const advanceError = ref<string | null>(null);
const manualSelection = ref(false);
const selectedParticipantIds = ref<string[]>([]);

// ── Advance Modal LocalStorage persistence ───────────────────
const ADVANCE_STORAGE_KEY = computed(
  () => `atk-progress-${tournamentId.value}`,
);

const saveAdvanceProgress = () => {
  try {
    const data = {
      manualSelection: manualSelection.value,
      selectedParticipantIds: selectedParticipantIds.value,
      savedAt: Date.now(),
    };
    localStorage.setItem(ADVANCE_STORAGE_KEY.value, JSON.stringify(data));
  } catch {
    /* quota exceeded or SSR */
  }
};

const loadAdvanceProgress = (): boolean => {
  try {
    const raw = localStorage.getItem(ADVANCE_STORAGE_KEY.value);
    if (!raw) return false;
    const data = JSON.parse(raw);
    // Expire after 24 hours
    if (Date.now() - data.savedAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(ADVANCE_STORAGE_KEY.value);
      return false;
    }
    manualSelection.value = data.manualSelection || false;
    selectedParticipantIds.value = data.selectedParticipantIds || [];
    return true;
  } catch {
    return false;
  }
};

const clearAdvanceProgress = () => {
  try {
    localStorage.removeItem(ADVANCE_STORAGE_KEY.value);
  } catch {}
};

// Auto-save advance modal state
watch(
  [manualSelection, selectedParticipantIds],
  () => {
    if (open.value) saveAdvanceProgress();
  },
  { deep: true },
);

const toggleParticipant = (id: string) => {
  const idx = selectedParticipantIds.value.indexOf(id);
  if (idx === -1) {
    selectedParticipantIds.value.push(id);
  } else {
    selectedParticipantIds.value.splice(idx, 1);
  }
};

// Restore saved progress (or reset) whenever the modal opens
watch(open, (isOpen) => {
  if (!isOpen) return;
  advanceError.value = null;
  // Try to restore saved progress first
  const restored = loadAdvanceProgress();
  if (restored) {
    useToast().add({
      title: "Progress Restored",
      description: "Your previous selection has been loaded.",
      color: "neutral",
      icon: "i-heroicons-arrow-path",
    });
  } else {
    manualSelection.value = false;
    selectedParticipantIds.value = [];
  }
});

const handleAdvanceKnockout = async () => {
  advancing.value = true;
  advanceError.value = null;

  try {
    if (manualSelection.value) {
      if (selectedParticipantIds.value.length < 2) {
        advanceError.value = "Please select at least 2 teams to advance.";
        advancing.value = false;
        return;
      }
      await fixtureStore.advanceToKnockout(
        tournamentId.value,
        selectedParticipantIds.value,
      );
    } else {
      await fixtureStore.advanceToKnockout(tournamentId.value);
    }

    open.value = false;
    clearAdvanceProgress();

    // Refresh fully to be safe
    await fixtureStore.fetchFixtures(tournamentId.value);
  } catch (err: any) {
    advanceError.value = handleError(err, { toast: false });
  } finally {
    advancing.value = false;
  }
};

const handleStartManualWizard = () => {
  open.value = false;
  // Small timeout to ensure modals don't fight over focus
  setTimeout(() => {
    emit("start-manual-wizard");
  }, 100);
};
</script>

<template>
  <!-- Advance Modal -->
  <UModal v-model:open="open" :ui="{ content: 'sm:max-w-lg' }">
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
              Advance to Knockout Stage
            </h3>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark"
              class="-my-1"
              @click="open = false"
            />
          </div>
        </template>

        <div class="py-4 max-h-[calc(100dvh-250px)] overflow-y-auto px-1">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <!-- Auto Option -->
            <button
              type="button"
              @click="manualSelection = false"
              class="flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all group"
              :class="
                !manualSelection
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/20 ring-1 ring-primary-500'
                  : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
              "
            >
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center mb-3 transition-colors"
                :class="
                  !manualSelection
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 group-hover:text-gray-600'
                "
              >
                <UIcon name="i-heroicons-bolt" class="w-6 h-6" />
              </div>
              <p
                class="text-sm font-bold text-gray-900 dark:text-white mb-1"
              >
                Quick Auto-Advance
              </p>
              <p class="text-[10px] text-gray-500">
                Top teams from each group qualify automatically.
              </p>
            </button>

            <!-- Wizard Option -->
            <button
              type="button"
              @click="handleStartManualWizard"
              class="flex flex-col items-center justify-center p-4 rounded-xl border border-amber-200 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-center transition-all group"
            >
              <div
                class="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center mb-3 shadow-lg shadow-amber-500/20"
              >
                <UIcon name="i-heroicons-sparkles" class="w-6 h-6" />
              </div>
              <p
                class="text-sm font-bold text-amber-900 dark:text-amber-100 mb-1"
              >
                Custom Bracket Setup
              </p>
              <p
                class="text-[10px] text-amber-700/70 dark:text-amber-400/70"
              >
                Pick teams and place them manually in the bracket.
              </p>
            </button>
          </div>

          <div class="flex items-center gap-2 mb-4">
            <div class="h-px flex-1 bg-gray-100 dark:bg-gray-800"></div>
            <span
              class="text-[10px] font-bold text-gray-400 uppercase tracking-widest"
              >Or Manual Selection</span
            >
            <div class="h-px flex-1 bg-gray-100 dark:bg-gray-800"></div>
          </div>

          <!-- Manual Toggle (Simpler version) -->
          <div v-if="!manualSelection" class="mb-4">
            <UButton
              variant="ghost"
              color="neutral"
              icon="i-heroicons-cursor-arrow-rays"
              size="xs"
              label="Wait, I want to pick teams manually..."
              @click="manualSelection = true"
              class="mx-auto flex"
            />
          </div>

          <!-- Manual Selection: Team list grouped by standings -->
          <div v-if="manualSelection">
            <div class="space-y-4">
              <div
                v-for="(
                  groupStandings, groupName
                ) in standingStore.getStandingsByGroup"
                :key="groupName"
              >
                <h4
                  v-if="groupName !== 'default'"
                  class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1"
                >
                  {{ groupName }}
                </h4>
                <div class="space-y-1">
                  <button
                    v-for="standing in groupStandings"
                    :key="standing.participant_id"
                    type="button"
                    class="w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left"
                    :class="
                      selectedParticipantIds.includes(
                        standing.participant_id,
                      )
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    "
                    @click="toggleParticipant(standing.participant_id)"
                  >
                    <!-- Checkbox indicator -->
                    <div
                      class="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors"
                      :class="
                        selectedParticipantIds.includes(
                          standing.participant_id,
                        )
                          ? 'border-primary-500 bg-primary-500'
                          : 'border-gray-300 dark:border-gray-600'
                      "
                    >
                      <UIcon
                        v-if="
                          selectedParticipantIds.includes(
                            standing.participant_id,
                          )
                        "
                        name="i-heroicons-check"
                        class="w-3.5 h-3.5 text-white"
                      />
                    </div>

                    <!-- Position -->
                    <span
                      class="text-xs font-bold text-gray-400 w-5 text-center"
                      >{{ standing.position }}</span
                    >

                    <!-- Team logo -->
                    <div
                      class="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0"
                    >
                      <img
                        v-if="standing.participant?.logoUrl"
                        :src="standing.participant.logoUrl"
                        class="w-full h-full object-cover"
                      />
                      <span
                        v-else
                        class="text-[10px] font-medium text-gray-500"
                      >
                        {{
                          (
                            standing.participant?.customShortName ||
                            standing.participant?.customName ||
                            "T"
                          )
                            .charAt(0)
                            .toUpperCase()
                        }}
                      </span>
                    </div>

                    <!-- Team name + stats -->
                    <div class="flex-1 min-w-0">
                      <p
                        class="text-sm font-medium text-gray-900 dark:text-white truncate"
                      >
                        {{
                          standing.participant?.customShortName ||
                          standing.participant?.customName ||
                          "Unknown"
                        }}
                      </p>
                      <p class="text-xs text-gray-500">
                        {{ standing.points }} pts · {{ standing.played }}P ·
                        {{ standing.wins }}W {{ standing.draws }}D
                        {{ standing.losses }}L
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <!-- Selection count (fixed below scroll area) -->
            <p
              class="text-xs text-gray-500 text-center pt-2 border-t border-gray-100 dark:border-gray-800"
            >
              {{ selectedParticipantIds.length }} team{{
                selectedParticipantIds.length !== 1 ? "s" : ""
              }}
              selected
            </p>
          </div>

          <!-- Auto mode info -->
          <div v-else class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h4 class="font-medium text-sm mb-2">Qualification Rules:</h4>
            <ul
              class="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1"
            >
              <li>Top 2 teams from each group qualify automatically</li>
              <li>
                Knockout bracket will be seeded based on group positions
              </li>
            </ul>
          </div>
        </div>

        <template #footer>
          <div class="flex items-center justify-end gap-3">
            <UButton
              color="neutral"
              variant="ghost"
              label="Cancel"
              @click="open = false"
            />
            <UButton
              color="primary"
              :label="
                manualSelection
                  ? `Advance ${selectedParticipantIds.length} Teams`
                  : 'Confirm & Generate Bracket'
              "
              :loading="advancing"
              :disabled="
                manualSelection && selectedParticipantIds.length < 2
              "
              @click="handleAdvanceKnockout"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
