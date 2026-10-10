<script setup lang="ts">
import type { Participant } from "~/types";

const props = defineProps<{
  participant: Participant | null;
}>();

const open = defineModel<boolean>("open", { default: false });

const tournamentStore = useTournamentStore();
const participantStore = useParticipantStore();
const { currentTournament: tournament } = storeToRefs(tournamentStore);
const { handleError } = useErrors();

// Edit Participant Modal
const editingParticipant = ref(false);
const editParticipantError = ref<string | null>(null);
const editingParticipantId = ref<string | null>(null);

const editParticipantState = reactive({
  customName: "",
  customShortName: "",
  logoUrl: null as string | null,
  teamId: null as string | null,
});

const editLogoFileInput = ref<HTMLInputElement | null>(null);
const editLogoFile = ref<File | null>(null);
const editLogoPreview = ref<string | null>(null);

const triggerEditLogoInput = () => {
  editLogoFileInput.value?.click();
};

const handleEditLogoChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) return;
  if (!file.type.startsWith("image/")) {
    editParticipantError.value = "Please select an image file";
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    editParticipantError.value = "Image must be less than 5MB";
    return;
  }

  editParticipantError.value = null;
  editLogoFile.value = file;
  editLogoPreview.value = URL.createObjectURL(file);
};

const removeEditLogo = () => {
  editLogoFile.value = null;
  editLogoPreview.value = null;
  editParticipantState.logoUrl = null;
  if (editLogoFileInput.value) {
    editLogoFileInput.value.value = "";
  }
};

// Populate the form whenever the modal opens for a participant
watch(open, (isOpen) => {
  if (!isOpen || !props.participant) return;
  const participant = props.participant;
  editingParticipantId.value = participant.id;
  editParticipantState.customName = participant.customName || "";
  editParticipantState.customShortName = participant.customShortName || "";
  editParticipantState.logoUrl = participant.logoUrl || null;
  editParticipantState.teamId =
    participant.team_id || participant.team?.id || null;
  editParticipantError.value = null;

  editLogoFile.value = null;
  editLogoPreview.value = participant.logoUrl || null; // preview existing logo
});

const handleEditParticipant = async () => {
  if (!editingParticipantId.value) return;

  editingParticipant.value = true;
  editParticipantError.value = null;

  try {
    let finalLogoUrl = editParticipantState.logoUrl;

    // Upload new logo if selected
    if (editLogoFile.value) {
      const formData = new FormData();
      formData.append("file", editLogoFile.value);

      const uploadResponse = await $api<{
        success: boolean;
        data: { url: string };
        message: string;
      }>("/upload/image?folder=participants", {
        method: "POST",
        body: formData,
      });

      if (uploadResponse.data?.url) {
        finalLogoUrl = uploadResponse.data.url;
      }
    }

    await participantStore.updateParticipant(editingParticipantId.value, {
      customName: editParticipantState.customName,
      customShortName: editParticipantState.customShortName,
      logoUrl: finalLogoUrl,
      teamId: editParticipantState.teamId,
    });

    useToast().add({
      title: "Participant updated successfully",
      color: "success",
    });
    open.value = false;
  } catch (err: any) {
    editParticipantError.value = handleError(err, { toast: false });
  } finally {
    editingParticipant.value = false;
  }
};
</script>

<template>
  <!-- Edit Participant Modal -->
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
              Edit Participant
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
          v-if="editParticipantError"
          color="error"
          variant="subtle"
          icon="i-heroicons-exclamation-triangle"
          :title="editParticipantError"
          class="mb-4"
          :close-button="{
            icon: 'i-heroicons-x-mark',
            color: 'error',
            variant: 'link',
          }"
          @close="editParticipantError = null"
        />

        <UForm
          :state="editParticipantState"
          @submit="handleEditParticipant"
          class="space-y-4"
        >
          <!-- Logo Upload -->
          <div class="flex items-center gap-4">
            <input
              ref="editLogoFileInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleEditLogoChange"
            />

            <button
              type="button"
              class="relative w-16 h-16 rounded-full overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 group shrink-0"
              @click="triggerEditLogoInput"
            >
              <img
                v-if="editLogoPreview"
                :src="editLogoPreview"
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
                  @click="triggerEditLogoInput"
                >
                  {{ editLogoPreview ? "Change" : "Upload" }}
                </UButton>
                <UButton
                  v-if="editLogoPreview"
                  size="xs"
                  variant="ghost"
                  color="error"
                  @click="removeEditLogo"
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
            <UInput v-model="editParticipantState.customName" class="w-full" />
          </UFormField>

          <UFormField label="Short Name (Optional)" name="customShortName">
            <UInput
              v-model="editParticipantState.customShortName"
              placeholder="e.g. MUN"
              :maxlength="10"
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
              label="Save Changes"
              icon="i-heroicons-check"
              :loading="editingParticipant"
              :disabled="!editParticipantState.customName"
            />
          </div>
        </UForm>
      </UCard>
    </template>
  </UModal>
</template>
