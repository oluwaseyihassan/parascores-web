<script setup lang="ts">
/**
 * Organizations — workspace switcher + per-org management.
 * Master–detail layout (dashboard-v2): pick any workspace on the left and
 * manage it on the right (Members / Branding / Socials / Danger tabs).
 * Role gates (OWNER/ADMIN/MEMBER) mirror the backend — see docs/platform-roles.md.
 */
import { storeToRefs } from "pinia";
import {
  useModalDialogs,
  ModalDialogsKey,
} from "~/composables/useModalDialogs";

definePageMeta({
  middleware: ["require-organizer"],
  layout: "dashboard-v2",
});

useSeoMeta({ title: "Organizations — ParaScores" });

const authStore = useAuthStore();
const { activeOrganizationId } = storeToRefs(authStore);

// Shared confirm dialog for the panels below
provide(ModalDialogsKey, useModalDialogs());

// Selected workspace (detail panel) — defaults to the active one
const selectedOrgId = ref<string | null>(null);

watchEffect(() => {
  if (!selectedOrgId.value && authStore.organizations.length) {
    selectedOrgId.value =
      activeOrganizationId.value ||
      authStore.organizations[0]?.organizationId ||
      null;
  }
});

// If the active org is deleted from under us, fall back to the first org
watch(activeOrganizationId, (id) => {
  if (id && id !== selectedOrgId.value) {
    const stillExists = authStore.organizations.some(
      (o) => o.organizationId === selectedOrgId.value,
    );
    if (!stillExists) selectedOrgId.value = id;
  }
});

const selectedOrgMember = computed(
  () =>
    authStore.organizations.find(
      (o) => o.organizationId === selectedOrgId.value,
    ) || null,
);

const handleSwitch = (id: string) => {
  // Stay on /organizations — the workspace is being managed in place
  authStore.setActiveOrganization(id, { navigate: false });
  useToast().add({ title: "Workspace switched", color: "success" });
};
</script>

<template>
  <div class="max-w-6xl mx-auto">
    <div
      v-if="authStore.organizations.length"
      class="grid lg:grid-cols-[300px_minmax(0,1fr)] gap-4 items-start"
    >
      <OrgListPanel
        :selected-id="selectedOrgId"
        @update:selected-id="selectedOrgId = $event"
      />
      <!-- :key remounts the detail panel per workspace, so each panel
           fetches its own members/socials for the selected org -->
      <OrgDetailPanel
        v-if="selectedOrgMember"
        :key="selectedOrgMember.organizationId"
        :org-member="selectedOrgMember"
        @switch="handleSwitch"
      />
    </div>

    <!-- No workspaces -->
    <div
      v-else
      class="flex flex-col items-center text-center bg-surface border border-subtle rounded-2xl px-6 py-14"
    >
      <div
        class="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4"
      >
        <UIcon
          name="i-heroicons-building-office"
          class="w-8 h-8 text-emerald-500"
        />
      </div>
      <h3 class="text-lg font-semibold text-heading mb-1.5">
        No workspaces yet
      </h3>
      <p class="text-sm text-muted max-w-sm mb-6">
        Organizations separate tournaments and team management between
        different clubs or leagues.
      </p>
      <UButton
        color="primary"
        icon="i-heroicons-plus"
        to="/onboarding"
        label="Create your first organization"
      />
    </div>

    <!-- Shared confirm dialog (member removal etc.) -->
    <ConfirmDialog />
  </div>
</template>
