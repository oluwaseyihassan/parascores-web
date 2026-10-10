<script setup lang="ts">
const props = defineProps<{
  orgMember: any;
}>();

const authStore = useAuthStore();
const { handleError } = useErrors();

// Delete Organization State (2-step: email code verification)
const deleteModalOpen = ref(false);
const deleteStep = ref<1 | 2>(1);
const deleteCounts = ref({ tournamentCount: 0, memberCount: 0 });
const deleteCode = ref("");
const requestingCode = ref(false);
const confirmingDelete = ref(false);

const orgId = computed(() => props.orgMember.organizationId);
const orgName = computed(() => props.orgMember.organization?.name || "Organization");

const openDeleteModal = () => {
  deleteStep.value = 1;
  deleteCode.value = "";
  deleteModalOpen.value = true;
};

const handleRequestDeleteCode = async () => {
  requestingCode.value = true;
  try {
    const response = await $api<{
      success: boolean;
      data: { tournamentCount: number; memberCount: number };
      message: string;
    }>(`/organizations/${orgId.value}/request-delete`, { method: "POST" });
    deleteCounts.value = response.data;
    deleteStep.value = 2;
    useToast().add({
      title: "Code sent",
      description: "Check your email for the verification code",
      color: "success",
    });
  } catch (error: any) {
    handleError(error, { title: "Failed to send code" });
  } finally {
    requestingCode.value = false;
  }
};

const handleConfirmDelete = async () => {
  if (!deleteCode.value) return;
  confirmingDelete.value = true;
  try {
    await $api(`/organizations/${orgId.value}/confirm-delete`, {
      method: "POST",
      body: { code: deleteCode.value },
    });
    useToast().add({
      title: "Organization deleted",
      description: `${orgName.value} has been permanently deleted.`,
      color: "success",
    });
    deleteModalOpen.value = false;
    // Refresh user data to remove the deleted org
    await authStore.fetchUser();
    // If we deleted the active org, switch to first available
    if (orgId.value === authStore.activeOrganizationId) {
      const remaining = authStore.organizations[0];
      if (remaining) {
        authStore.setActiveOrganization(remaining.organizationId);
      }
    }
  } catch (error: any) {
    handleError(error, { title: "Delete failed" });
  } finally {
    confirmingDelete.value = false;
  }
};
</script>

<template>
  <div>
    <div class="rounded-xl border border-red-500/25 overflow-hidden">
      <div
        class="flex items-center gap-2 px-4 py-3 border-b border-red-500/10 bg-red-500/[0.04] text-[13px] font-bold text-red-500"
      >
        <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4" />
        Delete this organization
      </div>
      <div class="p-4">
        <p class="text-xs text-muted leading-relaxed mb-3">
          Permanently deletes the workspace, its tournaments, fixtures,
          standings and member associations. Requires an emailed 6-digit
          verification code.
        </p>
        <UButton
          label="Delete organization…"
          color="error"
          variant="soft"
          icon="i-heroicons-trash"
          class="font-bold"
          @click="openDeleteModal"
        />
      </div>
    </div>

    <!-- Delete Organization Modal (2-step email-code verification) -->
    <UModal v-model:open="deleteModalOpen" :ui="{ content: 'sm:max-w-lg' }">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3
                class="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2"
              >
                <UIcon
                  name="i-heroicons-exclamation-triangle"
                  class="w-5 h-5 text-red-500"
                />
                Delete {{ orgName }}
              </h3>
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-heroicons-x-mark"
                class="-my-1"
                @click="deleteModalOpen = false"
              />
            </div>
          </template>

          <!-- Step 1: Warning -->
          <div v-if="deleteStep === 1" class="py-4 px-2 space-y-4">
            <div
              class="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl"
            >
              <p class="text-sm font-bold text-red-600 dark:text-red-400 mb-2">
                This action is irreversible!
              </p>
              <p class="text-sm text-red-600/80 dark:text-red-400/80">
                Deleting this organization will permanently remove:
              </p>
              <ul
                class="text-sm text-red-600/80 dark:text-red-400/80 mt-2 ml-4 list-disc space-y-1"
              >
                <li>
                  The organization "<strong>{{ orgName }}</strong
                  >"
                </li>
                <li>All tournaments and their fixtures, standings, and match data</li>
                <li>All team invites and player registrations</li>
                <li>All member associations</li>
              </ul>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-300">
              To proceed, we'll send a
              <strong>6-digit verification code</strong> to your email address.
              You must enter this code to confirm the deletion.
            </p>
          </div>

          <!-- Step 2: Code Entry -->
          <div v-if="deleteStep === 2" class="py-4 px-2 space-y-4">
            <div
              class="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl"
            >
              <p class="text-sm text-amber-700 dark:text-amber-400">
                <strong>Verification code sent!</strong> Check your email and
                enter the 6-digit code below. The code expires in 10 minutes.
              </p>
            </div>
            <UFormField label="Verification Code">
              <UInput
                v-model="deleteCode"
                placeholder="Enter 6-digit code"
                size="lg"
                class="font-mono text-center tracking-widest"
                maxlength="6"
                @keyup.enter="handleConfirmDelete"
              />
            </UFormField>
            <p class="text-xs text-gray-400">
              Didn't receive the code?
              <button
                class="text-emerald-500 hover:underline"
                :disabled="requestingCode"
                @click="handleRequestDeleteCode"
              >
                Resend code
              </button>
            </p>
          </div>

          <template #footer>
            <div class="flex items-center justify-end gap-3">
              <UButton
                color="neutral"
                variant="ghost"
                label="Cancel"
                @click="deleteModalOpen = false"
                :disabled="requestingCode || confirmingDelete"
              />
              <UButton
                v-if="deleteStep === 1"
                color="error"
                label="Send Verification Code"
                icon="i-heroicons-envelope"
                :loading="requestingCode"
                @click="handleRequestDeleteCode"
              />
              <UButton
                v-if="deleteStep === 2"
                color="error"
                label="Permanently Delete"
                icon="i-heroicons-trash"
                :loading="confirmingDelete"
                :disabled="deleteCode.length !== 6"
                @click="handleConfirmDelete"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
