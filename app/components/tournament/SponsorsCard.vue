<script setup lang="ts">
import { z } from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import type { Sponsor } from "~/types";
import { ModalDialogsKey } from "~/composables/useModalDialogs";

const route = useRoute();
const sponsorStore = useSponsorStore();
const { sponsors, loading: sponsorsLoading } = storeToRefs(sponsorStore);
const { openConfirmModal } = inject(ModalDialogsKey)!;

const tournamentId = computed(() => route.params.id as string);

const manageMode = ref(false);

// Sponsor Management
const showAddSponsorModal = ref(false);
const addingSponsor = ref(false);
const addSponsorError = ref<string | null>(null);

const addSponsorSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(200).optional().nullable().or(z.literal("")),
  logoUrl: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .nullable()
    .or(z.literal("")),
  websiteUrl: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .nullable()
    .or(z.literal("")),
});

type AddSponsorSchema = z.output<typeof addSponsorSchema>;

const addSponsorState = reactive<Partial<AddSponsorSchema>>({
  name: "",
  description: "",
  logoUrl: "",
  websiteUrl: "",
});

// Sponsor Logo Upload State
const sponsorLogoFileInput = ref<HTMLInputElement | null>(null);
const sponsorLogoFile = ref<File | null>(null);
const sponsorLogoPreview = ref<string | null>(null);
const uploadingSponsorLogo = ref(false);

const triggerSponsorLogoInput = () => {
  sponsorLogoFileInput.value?.click();
};

const handleSponsorLogoChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    addSponsorError.value = "Please select an image file";
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    addSponsorError.value = "Image must be less than 5MB";
    return;
  }

  sponsorLogoFile.value = file;
  sponsorLogoPreview.value = URL.createObjectURL(file);
  addSponsorError.value = null;
};

const removeSponsorLogo = () => {
  sponsorLogoFile.value = null;
  sponsorLogoPreview.value = null;
  if (sponsorLogoFileInput.value) {
    sponsorLogoFileInput.value.value = "";
  }
};

const openAddSponsorModal = () => {
  addSponsorState.name = "";
  addSponsorState.description = "";
  addSponsorState.logoUrl = "";
  addSponsorState.websiteUrl = "";
  addSponsorError.value = null;
  // Reset upload state
  removeSponsorLogo();
  showAddSponsorModal.value = true;
};

const handleAddSponsor = async (event: FormSubmitEvent<AddSponsorSchema>) => {
  addingSponsor.value = true;
  addSponsorError.value = null;

  try {
    let finalLogoUrl = event.data.logoUrl;

    // Upload logo if selected
    if (sponsorLogoFile.value) {
      uploadingSponsorLogo.value = true;
      try {
        const formData = new FormData();
        formData.append("file", sponsorLogoFile.value);

        const uploadResponse = await $api<{
          success: boolean;
          data: { url: string; publicId: string };
          message: string;
        }>("/upload/image?folder=sponsors", {
          method: "POST",
          body: formData,
        });

        if (uploadResponse.data?.url) {
          finalLogoUrl = uploadResponse.data.url;
        }
      } finally {
        uploadingSponsorLogo.value = false;
      }
    }

    await sponsorStore.addSponsor(tournamentId.value, {
      name: event.data.name,
      description: event.data.description || null,
      logoUrl: finalLogoUrl || null,
      websiteUrl: event.data.websiteUrl || null,
    });
    showAddSponsorModal.value = false;
    useToast().add({ title: "Sponsor added successfully", color: "success" });
  } catch (err: any) {
    addSponsorError.value =
      err?.data?.message || err?.message || "Failed to add sponsor";
  } finally {
    addingSponsor.value = false;
  }
};

const handleRemoveSponsor = (sponsorId: string) => {
  openConfirmModal({
    title: "Remove Sponsor",
    description: "Are you sure you want to remove this sponsor?",
    confirmLabel: "Remove",
    color: "error",
    onConfirm: async () => {
      try {
        await sponsorStore.removeSponsor(tournamentId.value, sponsorId);
        useToast().add({ title: "Sponsor removed", color: "success" });
      } catch (error: any) {
        const message = error.data?.message || error.message || "Unknown error";
        useToast().add({
          title: "Failed to remove sponsor",
          description: message,
          color: "error",
        });
      }
    },
  });
};

// Edit Sponsor
const showEditSponsorModal = ref(false);
const editingSponsor = ref(false);
const editSponsorError = ref<string | null>(null);
const editSponsorId = ref<string | null>(null);

const editSponsorState = reactive<Partial<AddSponsorSchema>>({
  name: "",
  description: "",
  logoUrl: "",
  websiteUrl: "",
});

const openEditSponsorModal = (sponsor: Sponsor) => {
  editSponsorId.value = sponsor.id;
  editSponsorState.name = sponsor.name;
  editSponsorState.description = sponsor.description || "";
  editSponsorState.logoUrl = sponsor.logoUrl || "";
  editSponsorState.websiteUrl = sponsor.websiteUrl || "";
  editSponsorError.value = null;
  removeSponsorLogo();
  showEditSponsorModal.value = true;
};

const handleEditSponsor = async (event: FormSubmitEvent<AddSponsorSchema>) => {
  if (!editSponsorId.value) return;
  editingSponsor.value = true;
  editSponsorError.value = null;

  try {
    let finalLogoUrl = event.data.logoUrl;

    if (sponsorLogoFile.value) {
      uploadingSponsorLogo.value = true;
      try {
        const formData = new FormData();
        formData.append("file", sponsorLogoFile.value);
        const uploadResponse = await $api<{
          success: boolean;
          data: { url: string; publicId: string };
          message: string;
        }>("/upload/image?folder=sponsors", {
          method: "POST",
          body: formData,
        });
        if (uploadResponse.data?.url) {
          finalLogoUrl = uploadResponse.data.url;
        }
      } finally {
        uploadingSponsorLogo.value = false;
      }
    }

    await sponsorStore.updateSponsor(tournamentId.value, editSponsorId.value, {
      name: event.data.name,
      description: event.data.description || null,
      logoUrl: finalLogoUrl || null,
      websiteUrl: event.data.websiteUrl || null,
    });
    showEditSponsorModal.value = false;
    useToast().add({ title: "Sponsor updated", color: "success" });
  } catch (err: any) {
    editSponsorError.value =
      err?.data?.message || err?.message || "Failed to update sponsor";
  } finally {
    editingSponsor.value = false;
  }
};
</script>

<template>
  <!-- Sponsors -->
  <UCard
    class="border border-gray-100 dark:border-gray-800 shadow-sm transition-all h-fit"
  >
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon
            name="i-heroicons-building-storefront"
            class="w-5 h-5 text-emerald-500"
          />
          <span class="font-medium">Sponsors</span>
          <UBadge
            v-if="sponsors.length"
            size="sm"
            variant="subtle"
          >
            {{ sponsors.length }}
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
            @click="openAddSponsorModal"
          />
        </div>
      </div>
    </template>

    <!-- Loading -->
    <div
      v-if="sponsorsLoading && !sponsors.length"
      class="py-8 text-center text-gray-400"
    >
      <UIcon
        name="i-heroicons-arrow-path"
        class="w-8 h-8 mx-auto mb-2 animate-spin"
      />
      <p>Loading sponsors...</p>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!sponsors.length"
      class="text-center py-4 text-gray-400 text-sm"
    >
      <p>No sponsors yet</p>
      <UButton
        size="xs"
        variant="link"
        @click="openAddSponsorModal"
        >Add one</UButton
      >
    </div>

    <!-- Sponsor List -->
    <div v-else class="flex flex-wrap gap-3">
      <div
        v-for="sponsor in sponsors"
        :key="sponsor.id"
        class="group relative"
      >
        <div class="flex flex-col items-center gap-1.5 w-16">
          <div class="w-14 h-14 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center overflow-hidden" :title="sponsor.websiteUrl || sponsor.name">
            <img v-if="sponsor.logoUrl" :src="sponsor.logoUrl" :alt="sponsor.name" class="max-h-full max-w-full object-contain p-1" />
            <span v-else class="text-xs font-bold text-gray-600 dark:text-gray-300 px-1 truncate">{{ sponsor.name }}</span>
          </div>
        </div>
        <template v-if="manageMode">
          <button
            class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs shadow-lg transition-all z-10 hover:bg-red-600 hover:scale-110 active:scale-95"
            @click="handleRemoveSponsor(sponsor.id)"
            title="Remove"
          >
            ×
          </button>
          <button
            class="absolute -top-1.5 right-4 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg transition-all z-10 hover:bg-indigo-600 hover:scale-110 active:scale-95"
            @click="openEditSponsorModal(sponsor)"
            title="Edit"
          >
            <UIcon name="i-heroicons-pencil" class="w-3 h-3" />
          </button>
        </template>
      </div>

      <p class="text-xs text-gray-500 dark:text-gray-400 mt-4">Sponsor logos appear on generated graphics and the public page footer.</p>

      <button
        type="button"
        class="w-14 h-14 rounded-xl border border-dashed border-gray-300 dark:border-white/15 text-gray-500 dark:text-gray-400 hover:border-emerald-500/50 hover:text-emerald-500 transition-colors flex items-center justify-center text-lg"
        @click="openAddSponsorModal"
        title="Add sponsor"
      >
        +
      </button>
    </div>
  </UCard>

  <!-- Add Sponsor Modal -->
  <UModal v-model:open="showAddSponsorModal">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon
              name="i-heroicons-building-storefront"
              class="w-5 h-5 text-indigo-500"
            />
            <span class="font-semibold">Add Sponsor</span>
          </div>
        </template>

        <UForm
          :schema="addSponsorSchema"
          :state="addSponsorState"
          @submit="handleAddSponsor"
          class="space-y-4"
        >
          <UAlert
            v-if="addSponsorError"
            color="error"
            variant="subtle"
            icon="i-heroicons-exclamation-triangle"
            :title="addSponsorError"
            class="mb-4"
          />

          <UFormField label="Name" name="name" required>
            <UInput
              v-model="addSponsorState.name"
              placeholder="Sponsor name"
              icon="i-heroicons-building-office"
            />
          </UFormField>

          <UFormField label="Description" name="description">
            <UTextarea
              v-model="addSponsorState.description"
              placeholder="e.g. Official kit sponsor"
              :rows="2"
              autoresize
            />
          </UFormField>

          <div class="space-y-2">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-200"
              >Sponsor Logo</span
            >
            <div class="flex items-start gap-4">
              <input
                ref="sponsorLogoFileInput"
                type="file"
                accept="image/*"
                class="hidden"
                @change="handleSponsorLogoChange"
              />

              <button
                type="button"
                class="relative h-20 min-w-20 max-w-40 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 group bg-gray-50 dark:bg-gray-800"
                @click="triggerSponsorLogoInput"
                :disabled="uploadingSponsorLogo"
              >
                <img
                  v-if="sponsorLogoPreview || addSponsorState.logoUrl"
                  :src="
                    sponsorLogoPreview || addSponsorState.logoUrl || undefined
                  "
                  alt="Logo preview"
                  class="h-full w-auto object-contain mx-auto p-1"
                />
                <div
                  v-else
                  class="w-full h-full flex flex-col items-center justify-center text-gray-400 group-hover:text-indigo-500 transition-colors px-2"
                >
                  <UIcon name="i-heroicons-photo" class="w-6 h-6" />
                  <span class="text-[10px] mt-1 font-medium whitespace-nowrap"
                    >Add Logo</span
                  >
                </div>

                <div
                  v-if="uploadingSponsorLogo"
                  class="absolute inset-0 bg-black/50 flex items-center justify-center"
                >
                  <UIcon
                    name="i-heroicons-arrow-path"
                    class="w-5 h-5 text-white animate-spin"
                  />
                </div>
              </button>

              <div class="flex-1 space-y-2">
                <p class="text-xs text-gray-500 dark:text-gray-400">Max 5MB.</p>
                <UButton
                  v-if="sponsorLogoPreview || addSponsorState.logoUrl"
                  size="xs"
                  variant="ghost"
                  color="error"
                  icon="i-heroicons-trash"
                  label="Remove"
                  :disabled="uploadingSponsorLogo"
                  @click="removeSponsorLogo"
                  class="px-0"
                />
              </div>
            </div>
          </div>

          <UFormField label="Website URL" name="websiteUrl">
            <UInput
              v-model="addSponsorState.websiteUrl"
              placeholder="https://sponsor-website.com"
              icon="i-heroicons-globe-alt"
            />
          </UFormField>

          <div class="flex justify-end gap-2 pt-4">
            <UButton
              label="Cancel"
              variant="ghost"
              color="neutral"
              @click="showAddSponsorModal = false"
            />
            <UButton
              type="submit"
              label="Add Sponsor"
              icon="i-heroicons-plus"
              :loading="addingSponsor"
            />
          </div>
        </UForm>
      </UCard>
    </template>
  </UModal>

  <!-- Edit Sponsor Modal -->
  <UModal v-model:open="showEditSponsorModal">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon
              name="i-heroicons-building-storefront"
              class="w-5 h-5 text-indigo-500"
            />
            <span class="font-semibold">Edit Sponsor</span>
          </div>
        </template>

        <UForm
          :schema="addSponsorSchema"
          :state="editSponsorState"
          @submit="handleEditSponsor"
          class="space-y-4"
        >
          <UAlert
            v-if="editSponsorError"
            color="error"
            variant="subtle"
            icon="i-heroicons-exclamation-triangle"
            :title="editSponsorError"
            class="mb-4"
          />

          <UFormField label="Name" name="name" required>
            <UInput
              v-model="editSponsorState.name"
              placeholder="Sponsor name"
              icon="i-heroicons-building-office"
            />
          </UFormField>

          <UFormField label="Description" name="description">
            <UTextarea
              v-model="editSponsorState.description"
              placeholder="e.g. Official kit sponsor"
              :rows="2"
              autoresize
            />
          </UFormField>

          <div class="space-y-2">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-200"
              >Sponsor Logo</span
            >
            <div class="flex items-start gap-4">
              <input
                ref="sponsorLogoFileInput"
                type="file"
                accept="image/*"
                class="hidden"
                @change="handleSponsorLogoChange"
              />
              <button
                type="button"
                class="relative h-20 min-w-20 max-w-40 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 group bg-gray-50 dark:bg-gray-800"
                @click="triggerSponsorLogoInput"
                :disabled="uploadingSponsorLogo"
              >
                <img
                  v-if="sponsorLogoPreview || editSponsorState.logoUrl"
                  :src="
                    sponsorLogoPreview || editSponsorState.logoUrl || undefined
                  "
                  alt="Logo preview"
                  class="h-full w-auto object-contain mx-auto p-1"
                />
                <div
                  v-else
                  class="w-full h-full flex flex-col items-center justify-center text-gray-400 group-hover:text-indigo-500 transition-colors px-2"
                >
                  <UIcon name="i-heroicons-photo" class="w-6 h-6" />
                  <span class="text-[10px] mt-1 font-medium whitespace-nowrap"
                    >Add Logo</span
                  >
                </div>
                <div
                  v-if="uploadingSponsorLogo"
                  class="absolute inset-0 bg-black/50 flex items-center justify-center"
                >
                  <UIcon
                    name="i-heroicons-arrow-path"
                    class="w-5 h-5 text-white animate-spin"
                  />
                </div>
              </button>
              <div class="flex-1 space-y-2">
                <p class="text-xs text-gray-500 dark:text-gray-400">Max 5MB.</p>
                <UButton
                  v-if="sponsorLogoPreview || editSponsorState.logoUrl"
                  size="xs"
                  variant="ghost"
                  color="error"
                  icon="i-heroicons-trash"
                  label="Remove"
                  :disabled="uploadingSponsorLogo"
                  @click="
                    removeSponsorLogo();
                    editSponsorState.logoUrl = '';
                  "
                  class="px-0"
                />
              </div>
            </div>
          </div>

          <UFormField label="Website URL" name="websiteUrl">
            <UInput
              v-model="editSponsorState.websiteUrl"
              placeholder="https://sponsor-website.com"
              icon="i-heroicons-globe-alt"
            />
          </UFormField>

          <div class="flex justify-end gap-2 pt-4">
            <UButton
              label="Cancel"
              variant="ghost"
              color="neutral"
              @click="showEditSponsorModal = false"
            />
            <UButton
              type="submit"
              label="Save Changes"
              icon="i-heroicons-check"
              :loading="editingSponsor"
            />
          </div>
        </UForm>
      </UCard>
    </template>
  </UModal>
</template>
