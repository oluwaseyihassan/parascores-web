<script setup lang="ts">
import { z } from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

const open = defineModel<boolean>("open", { default: false });

const route = useRoute();
const tournamentStore = useTournamentStore();
const participantStore = useParticipantStore();
const { currentTournament: tournament } = storeToRefs(tournamentStore);
const { participants } = storeToRefs(participantStore);
const { handleError } = useErrors();

const tournamentId = computed(() => route.params.id as string);

// Add participant modal
const addingParticipant = ref(false);
const addError = ref<string | null>(null);

const addParticipantSchema = z.object({
  customName: z.string().min(1, "Name is required").max(100),
  customShortName: z
    .string()
    .max(10, "Short name must be 10 characters or less")
    .optional()
    .nullable(),
  seed: z.number().positive().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
});

type AddParticipantSchema = z.output<typeof addParticipantSchema>;

const addParticipantState = reactive<
  Partial<AddParticipantSchema & { teamId: string | null }>
>({
  customName: "",
  customShortName: "",
  seed: null,
  logoUrl: null,
  teamId: null,
});

// Logo upload state
const logoFileInput = ref<HTMLInputElement | null>(null);
const logoFile = ref<File | null>(null);
const logoPreview = ref<string | null>(null);

const triggerLogoInput = () => {
  logoFileInput.value?.click();
};

const handleLogoChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) return;

  // Validate file type
  if (!file.type.startsWith("image/")) {
    addError.value = "Please select an image file";
    return;
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    addError.value = "Image must be less than 5MB";
    return;
  }

  // Clear error
  addError.value = null;

  logoFile.value = file;
  logoPreview.value = URL.createObjectURL(file);
};

// Roster picker (event orgs)
interface RosterEntry {
  id: string;
  name: string;
  shortName: string | null;
  logoUrl: string | null;
}
const rosterEntries = ref<RosterEntry[]>([]);
const loadingRoster = ref(false);
const selectedRosterEntryId = ref<string | null>(null);

const fetchOrgRoster = async () => {
  const orgId = tournament.value?.organization_id;
  if (!orgId) return;
  loadingRoster.value = true;
  try {
    const res = await $api<{ success: boolean; data?: RosterEntry[] }>(
      `/organizations/${orgId}/roster`,
    );
    rosterEntries.value = res.data ?? [];
  } catch {
    rosterEntries.value = [];
  } finally {
    loadingRoster.value = false;
  }
};

const availableRosterEntries = computed(() => {
  const takenNames = new Set(
    participants.value.map((p) => p.customName?.toLowerCase()),
  );
  return rosterEntries.value.filter(
    (r) => !takenNames.has(r.name.toLowerCase()),
  );
});

const rosterSelectItems = computed(() =>
  availableRosterEntries.value.map((r) => ({
    label: r.shortName ? `${r.name} (${r.shortName})` : r.name,
    value: r.id,
  })),
);

const onRosterPick = (entryId: string | null) => {
  selectedRosterEntryId.value = entryId;
  if (!entryId) return;
  const entry = rosterEntries.value.find((r) => r.id === entryId);
  if (!entry) return;
  addParticipantState.customName = entry.name;
  addParticipantState.customShortName = entry.shortName || "";
  addParticipantState.logoUrl = entry.logoUrl;
  logoPreview.value = entry.logoUrl;
};

const removeLogo = () => {
  logoFile.value = null;
  logoPreview.value = null;
  if (logoFileInput.value) {
    logoFileInput.value.value = "";
  }
};

const resetAddForm = () => {
  addParticipantState.customName = "";
  addParticipantState.customShortName = "";
  addParticipantState.seed = null;
  addParticipantState.logoUrl = null;
  addParticipantState.teamId = null;
  selectedRosterEntryId.value = null;
  removeLogo();
  addError.value = null;
};

// Reset the form and refresh the roster whenever the modal opens
watch(open, (isOpen) => {
  if (isOpen) {
    resetAddForm();
    fetchOrgRoster();
  }
});

const handleAddParticipant = async (
  event: FormSubmitEvent<AddParticipantSchema>,
) => {
  addingParticipant.value = true;
  addError.value = null;

  try {
    let logoUrl: string | null = null;

    // Upload logo if selected
    if (logoFile.value) {
      // Use internal upload endpoint or similar logic
      const formData = new FormData();
      formData.append("file", logoFile.value);

      const uploadResponse = await $api<{
        success: boolean;
        data: { url: string };
        message: string;
      }>("/upload/image?folder=participants", {
        method: "POST",
        body: formData,
      });

      if (uploadResponse.data?.url) {
        logoUrl = uploadResponse.data.url;
      }
    }

    await participantStore.addParticipant(tournamentId.value, {
      customName: event.data.customName,
      customShortName: event.data.customShortName,
      seed: event.data.seed,
      logoUrl: logoUrl,
      teamId: addParticipantState.teamId,
      rosterEntryId: selectedRosterEntryId.value ?? undefined,
    });
    open.value = false;
    resetAddForm();
  } catch (err: any) {
    addError.value = handleError(err, { toast: false });
  } finally {
    addingParticipant.value = false;
  }
};
</script>

<template>
  <!-- Add Participant Modal -->
  <UModal v-model:open="open" :ui="{ content: 'sm:max-w-md' }">
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
              Add Participant
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

        <UAlert
          v-if="addError"
          color="error"
          variant="subtle"
          icon="i-heroicons-exclamation-triangle"
          :title="addError"
          class="mb-4"
          :close-button="{
            icon: 'i-heroicons-x-mark',
            color: 'error',
            variant: 'link',
          }"
          @close="addError = null"
        />

        <UForm
          :schema="addParticipantSchema"
          :state="addParticipantState"
          @submit="handleAddParticipant"
          class="space-y-4"
        >
          <!-- Roster picker (only when the org has roster entries) -->
          <div
            v-if="tournament?.organization_id && (rosterSelectItems.length > 0 || loadingRoster)"
            class="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3 space-y-2"
          >
            <label class="text-xs font-bold text-indigo-400 uppercase tracking-wider">
              From organization roster
            </label>
            <USelectMenu
              :model-value="selectedRosterEntryId ?? undefined"
              :items="rosterSelectItems"
              value-key="value"
              :loading="loadingRoster"
              placeholder="Pick an institution to autofill…"
              class="w-full"
              @update:model-value="onRosterPick($event as string | null)"
            />
            <p v-if="selectedRosterEntryId" class="text-[10px] text-indigo-300/70">
              Linked to the roster — this institution's results aggregate across tournaments.
            </p>
          </div>

          <!-- Logo Upload -->
          <div class="flex items-center gap-4">
            <!-- Hidden file input -->
            <input
              ref="logoFileInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleLogoChange"
            />

            <button
              type="button"
              class="relative w-16 h-16 rounded-full overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 group shrink-0"
              @click="triggerLogoInput"
            >
              <img
                v-if="logoPreview"
                :src="logoPreview"
                alt="Logo preview"
                class="w-full h-full object-contain p-1"
              />
              <div
                v-else
                class="w-full h-full flex flex-col items-center justify-center text-gray-400 group-hover:text-indigo-500 transition-colors"
              >
                <UIcon name="i-heroicons-camera" class="w-6 h-6" />
              </div>
            </button>

            <div class="flex-1">
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                {{
                  tournament?.participantType === "TEAM" ? "Team Logo" : "Photo"
                }}
              </p>
              <div class="flex items-center gap-2 mt-1">
                <UButton
                  size="xs"
                  variant="ghost"
                  color="primary"
                  @click="triggerLogoInput"
                >
                  {{ logoPreview ? "Change" : "Upload" }}
                </UButton>
                <UButton
                  v-if="logoPreview"
                  size="xs"
                  variant="ghost"
                  color="error"
                  @click="removeLogo"
                >
                  Remove
                </UButton>
              </div>
            </div>
          </div>

          <UFormField
            :label="
              tournament?.participantType === 'TEAM'
                ? 'Team Name'
                : 'Participant Name'
            "
            name="customName"
            required
          >
            <UInput
              v-model="addParticipantState.customName"
              :placeholder="
                tournament?.participantType === 'TEAM'
                  ? 'e.g. Manchester United'
                  : 'e.g. John Doe'
              "
              class="w-full"
            />
          </UFormField>

          <UFormField label="Short Name (Optional)" name="customShortName">
            <UInput
              v-model="addParticipantState.customShortName"
              placeholder="e.g. MUN"
              :maxlength="10"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Seed (Optional)" name="seed">
            <UInput
              v-model.number="addParticipantState.seed"
              type="number"
              placeholder="e.g. 1"
              :min="1"
              class="w-full"
            />
          </UFormField>

          <div class="flex justify-end gap-3 pt-4">
            <UButton
              label="Cancel"
              variant="ghost"
              color="neutral"
              @click="open = false"
            />
            <UButton
              type="submit"
              label="Add Participant"
              icon="i-heroicons-plus"
              :loading="addingParticipant"
            />
          </div>
        </UForm>
      </UCard>
    </template>
  </UModal>
</template>
