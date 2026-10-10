<script setup lang="ts">
const props = defineProps<{
  generateConfig: {
    teamsPerGroup: number | null;
    numberOfGroups: number | null;
    useExistingGroups: boolean;
  };
  generating: boolean;
  generateError: string | null;
}>();

const emit = defineEmits<{
  generate: [];
}>();

const open = defineModel<boolean>("open", { default: false });

const tournamentStore = useTournamentStore();
const participantStore = useParticipantStore();
const groupStore = useGroupStore();
const { currentTournament: tournament } = storeToRefs(tournamentStore);
const { participants } = storeToRefs(participantStore);
</script>

<template>
  <!-- Generate Fixtures Modal -->
  <UModal v-model:open="open">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Generate Fixtures
            </h3>
            <UButton
              icon="i-heroicons-x-mark"
              variant="ghost"
              color="neutral"
              size="sm"
              @click="open = false"
            />
          </div>
        </template>

        <div class="space-y-4">
          <p class="text-gray-600 dark:text-gray-300">
            <span
              v-if="
                tournament?.type === 'GROUP' || tournament?.type === 'HYBRID'
              "
            >
              Configure how the group stage should be generated. You can specify
              the number of groups or teams per group.
            </span>
            <span v-else>
              Configure how the
              {{
                tournament?.type === "ROUND_ROBIN" ? "round robin" : "fixtures"
              }}
              should be generated.
            </span>
          </p>

          <UAlert
            v-if="generateError"
            color="error"
            variant="subtle"
            icon="i-heroicons-exclamation-triangle"
            :title="generateError"
            class="mb-4"
          />

          <!-- Use Existing Groups Option -->
          <div
            v-if="
              (tournament?.type === 'GROUP' || tournament?.type === 'HYBRID') &&
              groupStore.groups.length > 0
            "
            class="flex items-center justify-between p-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30"
          >
            <div>
              <p class="font-medium text-indigo-900 dark:text-indigo-300">
                Use Existing Groups
              </p>
              <p class="text-sm text-indigo-700/70 dark:text-indigo-400/70">
                Re-use the {{ groupStore.groups.length }} groups you have
                already set up
              </p>
            </div>
            <USwitch v-model="generateConfig.useExistingGroups" />
          </div>

          <!-- Group Stage Config -->
          <div
            v-if="
              (tournament?.type === 'GROUP' || tournament?.type === 'HYBRID') &&
              !generateConfig.useExistingGroups
            "
            class="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <UFormField label="Teams Per Group" name="teamsPerGroup">
              <UInput
                v-model.number="generateConfig.teamsPerGroup"
                type="number"
                placeholder="e.g. 4"
                :min="2"
              />
            </UFormField>

            <UFormField label="Number of Groups" name="numberOfGroups">
              <UInput
                v-model.number="generateConfig.numberOfGroups"
                type="number"
                placeholder="e.g. 4"
                :min="1"
              />
            </UFormField>
          </div>

          <div
            v-if="tournament?.type === 'GROUP' || tournament?.type === 'HYBRID'"
            class="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg text-sm text-gray-500"
          >
            <p v-if="generateConfig.useExistingGroups">
              The system will use your existing groups and team assignments.
            </p>
            <p v-else-if="generateConfig.teamsPerGroup && participants.length">
              With {{ participants.length }} participants and
              {{ generateConfig.teamsPerGroup }} teams per group, you will have
              roughly
              {{
                Math.ceil(participants.length / generateConfig.teamsPerGroup)
              }}
              groups.
            </p>
            <p v-else-if="generateConfig.numberOfGroups && participants.length">
              With {{ participants.length }} participants and
              {{ generateConfig.numberOfGroups }} groups, you will have roughly
              {{
                Math.ceil(participants.length / generateConfig.numberOfGroups)
              }}
              teams per group.
            </p>
            <p v-else>
              The system will automatically balance groups if no preference is
              set.
            </p>
          </div>

          <div class="flex justify-end gap-3 pt-4">
            <UButton
              label="Cancel"
              variant="ghost"
              color="neutral"
              @click="open = false"
            />
            <UButton
              label="Generate"
              icon="i-heroicons-sparkles"
              :loading="generating"
              @click="emit('generate')"
            />
          </div>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
