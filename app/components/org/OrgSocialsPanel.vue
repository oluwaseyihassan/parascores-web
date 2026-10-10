<script setup lang="ts">
const props = defineProps<{
  orgMember: any;
  socials: any[];
  loading: boolean;
}>();

const emit = defineEmits<{
  refresh: [];
}>();

const { handleError } = useErrors();

const orgId = computed(() => props.orgMember.organizationId);

// Real brand icons (same icon set as the tournament SocialsCard)
const PLATFORM_OPTIONS = [
  { label: "Twitter / X", value: "twitter", icon: "i-simple-icons-x" },
  { label: "Instagram", value: "instagram", icon: "i-simple-icons-instagram" },
  { label: "Facebook", value: "facebook", icon: "i-simple-icons-facebook" },
  { label: "YouTube", value: "youtube", icon: "i-simple-icons-youtube" },
  { label: "TikTok", value: "tiktok", icon: "i-simple-icons-tiktok" },
  { label: "LinkedIn", value: "linkedin", icon: "i-simple-icons-linkedin" },
  { label: "Website", value: "website", icon: "i-heroicons-globe-alt" },
];

const addingSocial = ref(false);
const newSocial = ref<{ platform: string; url: string }>({
  platform: "twitter",
  url: "",
});

const handleAddSocial = async () => {
  if (!newSocial.value.url) return;
  addingSocial.value = true;
  try {
    await $api(`/socials/organizations/${orgId.value}`, {
      method: "POST",
      body: { platform: newSocial.value.platform, url: newSocial.value.url },
    });
    useToast().add({ title: "Social link added", color: "success" });
    newSocial.value = { platform: "twitter", url: "" };
    emit("refresh");
  } catch (error: any) {
    handleError(error, { title: "Failed to add social" });
  } finally {
    addingSocial.value = false;
  }
};

const handleRemoveSocial = async (socialId: string) => {
  try {
    await $api(`/socials/${socialId}`, { method: "DELETE" });
    useToast().add({ title: "Social link removed", color: "success" });
    emit("refresh");
  } catch (error: any) {
    handleError(error, { title: "Failed to remove social" });
  }
};

const getPlatformLabel = (value: string) =>
  PLATFORM_OPTIONS.find((p) => p.value === value)?.label || value;

const getPlatformIcon = (value: string) =>
  PLATFORM_OPTIONS.find((p) => p.value === value)?.icon || "i-heroicons-link";
</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-6">
      <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-muted" />
    </div>

    <template v-else>
      <!-- Existing links -->
      <div v-if="socials.length" class="flex flex-col mb-4">
        <div
          v-for="social in socials"
          :key="social.id"
          class="group flex items-center gap-3 py-2.5 border-b border-subtle last:border-b-0"
        >
          <span
            class="w-7 h-7 rounded-lg bg-black/5 dark:bg-white/[0.07] flex items-center justify-center shrink-0 text-body"
          >
            <UIcon :name="getPlatformIcon(social.platform)" class="w-3.5 h-3.5" />
          </span>
          <div class="flex-1 min-w-0">
            <p class="text-[13px] font-bold text-heading">
              {{ getPlatformLabel(social.platform) }}
            </p>
            <p class="text-[11px] text-muted truncate">{{ social.url }}</p>
          </div>
          <UButton
            icon="i-heroicons-trash"
            variant="ghost"
            color="error"
            size="xs"
            square
            aria-label="Remove social link"
            class="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            @click="handleRemoveSocial(social.id)"
          />
        </div>
      </div>
      <p v-else class="text-sm text-muted py-2 mb-4">No social links added yet.</p>

      <!-- Add form -->
      <div class="flex gap-2 items-end flex-wrap sm:flex-nowrap">
        <UFormField label="Platform" class="w-36 shrink-0">
          <USelectMenu
            v-model="newSocial.platform"
            :items="PLATFORM_OPTIONS"
            value-key="value"
            size="sm"
            class="w-full"
          >
            <template #item="{ item }">
              <div class="flex items-center gap-2">
                <UIcon :name="item.icon" class="w-3.5 h-3.5" />
                <span>{{ item.label }}</span>
              </div>
            </template>
          </USelectMenu>
        </UFormField>
        <UFormField label="URL" class="flex-1 min-w-40">
          <UInput
            v-model="newSocial.url"
            placeholder="https://x.com/yourorg"
            size="sm"
            icon="i-heroicons-link"
            class="w-full"
            @keyup.enter="handleAddSocial"
          />
        </UFormField>
        <UButton
          label="Add"
          color="primary"
          size="sm"
          class="font-bold mb-px"
          :loading="addingSocial"
          :disabled="!newSocial.url"
          @click="handleAddSocial"
        />
      </div>
    </template>
  </div>
</template>
