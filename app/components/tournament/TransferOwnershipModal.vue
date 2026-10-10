<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";

const open = defineModel<boolean>("open", { default: false });

const route = useRoute();
const tournamentStore = useTournamentStore();
const authStore = useAuthStore();
const { currentTournament: tournament } = storeToRefs(tournamentStore);
const { handleError } = useErrors();

const tournamentId = computed(() => route.params.id as string);

// Transfer Ownership logic
const transferringTournament = ref(false);
const targetOrganizationId = ref<string>("");

const availableOrganizationsForTransfer = computed(() => {
  return authStore.organizations
    .filter(
      (orgMember) =>
        orgMember.organizationId !== tournament.value?.organization_id &&
        (orgMember.role === "OWNER" || orgMember.role === "ADMIN"),
    )
    .map((orgMember) => ({
      label: orgMember.organization?.name || "Unnamed Organization",
      value: orgMember.organizationId,
    }));
});

const handleTransferTournament = async (event: FormSubmitEvent<any>) => {
  if (!targetOrganizationId.value) return;

  transferringTournament.value = true;
  try {
    await tournamentStore.updateTournament(
      tournament.value?.id || tournamentId.value,
      {
        organization_id: targetOrganizationId.value,
      },
    );
    useToast().add({
      title: "Tournament transferred successfully",
      color: "success",
    });
    open.value = false;
    await navigateTo("/");
  } catch (err: any) {
    handleError(err, { title: "Failed to transfer tournament" });
  } finally {
    transferringTournament.value = false;
  }
};
</script>

<template>
  <!-- Transfer Ownership Modal -->
  <UModal v-model:open="open">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon
              name="i-heroicons-arrows-right-left"
              class="w-5 h-5 text-amber-500"
            />
            <span class="font-semibold text-gray-900 dark:text-white"
              >Transfer Tournament Ownership</span
            >
          </div>
          <p class="text-sm text-gray-500 mt-2">
            Select an organization to transfer this tournament to. Only
            organizations where you have Admin or Owner permissions are
            listed.
          </p>
        </template>

        <UForm
          :state="{}"
          @submit="handleTransferTournament"
          class="space-y-4"
        >
          <UFormField
            label="Target Organization"
            name="targetOrganizationId"
            required
          >
            <USelect
              v-model="targetOrganizationId"
              :items="availableOrganizationsForTransfer"
              placeholder="Select an organization"
              icon="i-heroicons-building-office"
            />
          </UFormField>

          <div class="flex justify-end gap-3 mt-6">
            <UButton
              color="neutral"
              variant="ghost"
              @click="open = false"
              >Cancel</UButton
            >
            <UButton
              type="submit"
              color="neutral"
              :loading="transferringTournament"
              :disabled="!targetOrganizationId"
            >
              Transfer Ownership
            </UButton>
          </div>
        </UForm>
      </UCard>
    </template>
  </UModal>
</template>
