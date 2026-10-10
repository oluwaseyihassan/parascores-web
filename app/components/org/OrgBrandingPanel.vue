<script setup lang="ts">
const props = defineProps<{
  orgMember: any;
}>();

const authStore = useAuthStore();
const { handleError } = useErrors();
const { frontendUrl } = useHost();

const orgId = computed(() => props.orgMember.organizationId);

// Editable fields only (name/description/logo) — location/website are not
// surfaced by the API form today
const branding = reactive({
  name: props.orgMember.organization?.name || "",
  description: props.orgMember.organization?.description || "",
  logoUrl: props.orgMember.organization?.logoUrl || "",
});

const updatingBranding = ref(false);

const copyPublicLink = async () => {
  const slug = props.orgMember.organization?.slug;
  if (!slug) return;
  try {
    await navigator.clipboard.writeText(`${frontendUrl.value}/org/${slug}`);
    useToast().add({ title: "Public link copied!", color: "success" });
  } catch {
    useToast().add({ title: "Failed to copy link", color: "error" });
  }
};

const logoInput = ref<HTMLInputElement | null>(null);

const handleLogoUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await $api<{ data: { url: string } }>(
      "/upload/image?folder=organizations",
      { method: "POST", body: formData },
    );
    branding.logoUrl = response.data.url;
  } catch (error: any) {
    handleError(error, { title: "Upload failed" });
  }
};

const handleUpdateBranding = async () => {
  updatingBranding.value = true;
  try {
    const payload: Record<string, any> = { ...branding };
    if (!payload.logoUrl) delete payload.logoUrl;

    await $api(`/organizations/${orgId.value}`, {
      method: "PATCH",
      body: payload,
    });
    useToast().add({ title: "Branding updated", color: "success" });
    await authStore.fetchUser();
  } catch (error: any) {
    handleError(error, { title: "Update failed" });
  } finally {
    updatingBranding.value = false;
  }
};
</script>

<template>
  <div>
    <!-- Public link -->
    <div
      v-if="orgMember.organization?.slug"
      class="flex items-center gap-2.5 px-3.5 py-2.5 mb-4 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-subtle"
    >
      <UIcon name="i-heroicons-globe-alt" class="w-4 h-4 text-muted shrink-0" />
      <span class="flex-1 min-w-0 font-mono text-[11px] text-muted truncate select-all">
        {{ frontendUrl }}/org/{{ orgMember.organization.slug }}
      </span>
      <UButton
        size="xs"
        variant="ghost"
        color="neutral"
        :icon="'i-heroicons-clipboard-document'"
        aria-label="Copy public link"
        @click="copyPublicLink"
      />
    </div>

    <UFormField label="Workspace name" class="mb-4">
      <UInput v-model="branding.name" placeholder="Organization name" class="w-full" />
    </UFormField>

    <UFormField label="Bio / description" class="mb-4">
      <UTextarea
        v-model="branding.description"
        placeholder="E.g., Digitizing grassroots sports tournaments across Nigeria"
        :rows="3"
        autoresize
        class="w-full"
      />
    </UFormField>

    <div class="mb-5">
      <span class="block text-[11px] font-bold text-muted mb-2">Workspace logo</span>
      <div class="flex items-center gap-3">
        <UAvatar
          v-if="branding.logoUrl"
          :src="branding.logoUrl"
          size="lg"
          class="rounded-xl border border-subtle"
        />
        <span
          v-else
          class="w-11 h-11 rounded-xl bg-[#136332] text-white text-base font-extrabold flex items-center justify-center"
        >
          {{ branding.name?.charAt(0).toUpperCase() || "O" }}
        </span>
        <UButton
          label="Change image"
          variant="outline"
          color="neutral"
          size="sm"
          icon="i-heroicons-camera"
          class="font-bold"
          @click="logoInput?.click()"
        />
        <input
          ref="logoInput"
          type="file"
          class="hidden"
          accept="image/*"
          @change="handleLogoUpload"
        />
      </div>
    </div>

    <div class="flex justify-end">
      <UButton
        label="Save changes"
        color="primary"
        class="font-bold"
        :loading="updatingBranding"
        :disabled="!branding.name.trim()"
        @click="handleUpdateBranding"
      />
    </div>
  </div>
</template>
