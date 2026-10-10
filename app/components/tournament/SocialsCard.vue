<script setup lang="ts">
import { z } from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import { ModalDialogsKey } from "~/composables/useModalDialogs";

const route = useRoute();
const socialStore = useSocialStore();
const { socials } = storeToRefs(socialStore);
const { openConfirmModal } = inject(ModalDialogsKey)!;

const tournamentId = computed(() => route.params.id as string);

const manageMode = ref(false);

// Social Management
const showAddSocialModal = ref(false);
const addingSocial = ref(false);
const addSocialError = ref<string | null>(null);

const platformOptions = [
  {
    value: "twitter",
    label: "Twitter / X",
    icon: "i-simple-icons-x",
    color: "text-black dark:text-white",
  },
  {
    value: "instagram",
    label: "Instagram",
    icon: "i-simple-icons-instagram",
    color: "text-pink-500",
  },
  {
    value: "facebook",
    label: "Facebook",
    icon: "i-simple-icons-facebook",
    color: "text-blue-600",
  },
  {
    value: "youtube",
    label: "YouTube",
    icon: "i-simple-icons-youtube",
    color: "text-red-600",
  },
  {
    value: "tiktok",
    label: "TikTok",
    icon: "i-simple-icons-tiktok",
    color: "text-black dark:text-white",
  },
  {
    value: "discord",
    label: "Discord",
    icon: "i-simple-icons-discord",
    color: "text-indigo-500",
  },
  {
    value: "twitch",
    label: "Twitch",
    icon: "i-simple-icons-twitch",
    color: "text-purple-500",
  },
  {
    value: "website",
    label: "Website",
    icon: "i-heroicons-globe-alt",
    color: "text-gray-500",
  },
];

const addSocialSchema = z.object({
  platform: z.string().min(1, "Platform is required"),
  url: z.string().url("Must be a valid URL"),
  handle: z.string().optional().nullable(),
});

type AddSocialSchema = z.output<typeof addSocialSchema>;

const addSocialState = reactive<Partial<AddSocialSchema>>({
  platform: "",
  url: "",
  handle: "",
});

const openAddSocialModal = () => {
  addSocialState.platform = "";
  addSocialState.url = "";
  addSocialState.handle = "";
  addSocialError.value = null;
  showAddSocialModal.value = true;
};

const handleAddSocial = async (event: FormSubmitEvent<AddSocialSchema>) => {
  addingSocial.value = true;
  addSocialError.value = null;

  try {
    await socialStore.addSocial(tournamentId.value, {
      platform: event.data.platform,
      url: event.data.url,
      handle: event.data.handle || null,
    });
    showAddSocialModal.value = false;
    useToast().add({
      title: "Social link added successfully",
      color: "success",
    });
  } catch (err: any) {
    addSocialError.value =
      err?.data?.message || err?.message || "Failed to add social link";
  } finally {
    addingSocial.value = false;
  }
};

const handleRemoveSocial = (socialId: string) => {
  openConfirmModal({
    title: "Remove Social Link",
    description: "Are you sure you want to remove this social link?",
    confirmLabel: "Remove",
    color: "error",
    onConfirm: async () => {
      try {
        await socialStore.removeSocial(tournamentId.value, socialId);
        useToast().add({ title: "Social link removed", color: "success" });
      } catch (error: any) {
        const message = error.data?.message || error.message || "Unknown error";
        useToast().add({
          title: "Failed to remove social link",
          description: message,
          color: "error",
        });
      }
    },
  });
};

const getSocialIcon = (platform: string) => {
  const option = platformOptions.find(
    (p) => p.value === platform.toLowerCase(),
  );
  return option?.icon || "i-heroicons-link";
};

const getSocialColor = (platform: string) => {
  const option = platformOptions.find(
    (p) => p.value === platform.toLowerCase(),
  );
  return option?.color || "text-gray-500";
};
</script>

<template>
  <!-- Social Links -->
  <UCard
    class="border border-gray-100 dark:border-gray-800 shadow-sm transition-all h-fit"
  >
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon
            name="i-heroicons-share"
            class="w-5 h-5 text-emerald-500"
          />
          <span class="font-medium">Social Links</span>
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
            @click="openAddSocialModal"
          />
        </div>
      </div>
    </template>

    <div v-if="socials.length" class="flex flex-wrap gap-2">
      <div
        v-for="social in socials"
        :key="social.id"
        class="group relative"
      >
        <a
          :href="social.url"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all"
          :title="social.handle || social.platform"
        >
          <SocialsTwitterIcon
            v-if="social.platform === 'twitter'"
            class="w-4 h-4"
          />
          <SocialsInstagramIcon
            v-else-if="social.platform === 'instagram'"
            class="w-4 h-4"
          />
          <SocialsWebIcon
            v-else-if="social.platform === 'website'"
            class="w-4 h-4"
          />
          <UIcon
            v-else
            :name="getSocialIcon(social.platform)"
            class="w-4 h-4"
            :class="getSocialColor(social.platform)"
          />
          <span
            class="text-sm text-gray-700 dark:text-gray-300 capitalize"
            >{{ social.platform }}</span
          >
        </a>
        <button
          v-if="manageMode"
          class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs shadow-lg transition-all z-10 hover:bg-red-600 hover:scale-110 active:scale-95"
          @click="handleRemoveSocial(social.id)"
          title="Remove"
        >
          ×
        </button>
      </div>
    </div>
    <div v-else class="text-center py-4 text-gray-400 text-sm">
      <p>No social links yet</p>
      <UButton
        size="xs"
        variant="link"
        @click="openAddSocialModal"
        >Add one</UButton
      >
    </div>
  </UCard>

  <!-- Add Social Modal -->
  <UModal v-model:open="showAddSocialModal">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-share" class="w-5 h-5 text-indigo-500" />
            <span class="font-semibold">Add Social Link</span>
          </div>
        </template>

        <UForm
          :schema="addSocialSchema"
          :state="addSocialState"
          @submit="handleAddSocial"
          class="space-y-4"
        >
          <UAlert
            v-if="addSocialError"
            color="error"
            variant="subtle"
            icon="i-heroicons-exclamation-triangle"
            :title="addSocialError"
            class="mb-4"
          />

          <UFormField label="Platform" name="platform" required>
            <USelectMenu
              v-model="addSocialState.platform"
              :items="platformOptions"
              value-key="value"
              placeholder="Select platform..."
            >
              <template #item="{ item }">
                <div class="flex items-center gap-2">
                  <UIcon
                    :name="item.icon"
                    class="w-4 h-4"
                    :class="item.color"
                  />
                  <span>{{ item.label }}</span>
                </div>
              </template>
            </USelectMenu>
          </UFormField>

          <UFormField label="URL" name="url" required>
            <UInput
              v-model="addSocialState.url"
              placeholder="https://twitter.com/tournamentname"
              icon="i-heroicons-link"
            />
          </UFormField>

          <UFormField label="Handle (optional)" name="handle">
            <UInput
              v-model="addSocialState.handle"
              placeholder="@tournamentname"
              icon="i-heroicons-at-symbol"
            />
          </UFormField>

          <div class="flex justify-end gap-2 pt-4">
            <UButton
              label="Cancel"
              variant="ghost"
              color="neutral"
              @click="showAddSocialModal = false"
            />
            <UButton
              type="submit"
              label="Add Social Link"
              icon="i-heroicons-plus"
              :loading="addingSocial"
            />
          </div>
        </UForm>
      </UCard>
    </template>
  </UModal>
</template>
