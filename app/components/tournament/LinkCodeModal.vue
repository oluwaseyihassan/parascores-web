<script setup lang="ts">
const { handleError } = useErrors();

// Link Code state
const showLinkCodeModal = ref(false);
const currentLinkCode = ref<string | null>(null);
const currentLinkCodeExpiry = ref<string | null>(null);
const generatingLinkCode = ref(false);
const linkCodeModalTitle = ref("Team Link Code");
const linkCodeModalDesc = ref(
  "Share this code with the team manager. They can enter it on their team profile page to link it to this tournament entry.",
);

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  useToast().add({ title: "Copied to clipboard", color: "success" });
};

const generateForParticipant = async (participantId: string) => {
  generatingLinkCode.value = true;
  try {
    const res = await $api<{
      success: boolean;
      data: { code: string; expiresAt: string };
    }>(`/participants/${participantId}/generate-link-code`, {
      method: "POST",
    });
    linkCodeModalTitle.value = "Team Link Code";
    linkCodeModalDesc.value =
      "Share this code with the team manager. They can enter it on their team profile page to link it to this tournament entry.";
    currentLinkCode.value = res.data.code;
    currentLinkCodeExpiry.value = res.data.expiresAt;
    showLinkCodeModal.value = true;
  } catch (err: any) {
    handleError(err, { title: "Failed to generate link code" });
  } finally {
    generatingLinkCode.value = false;
  }
};

const generateForPlayer = async (playerId: string) => {
  generatingLinkCode.value = true;
  try {
    const res = await $api<{
      success: boolean;
      data: { code: string; expiresAt: string };
    }>(`/players/${playerId}/generate-link-code`, {
      method: "POST",
    });
    linkCodeModalTitle.value = "Player Link Code";
    linkCodeModalDesc.value =
      "Share this code with the player. They can enter it on their player profile page/settings to link their user account to this player entry.";
    currentLinkCode.value = res.data.code;
    currentLinkCodeExpiry.value = res.data.expiresAt;
    showLinkCodeModal.value = true;
  } catch (err: any) {
    handleError(err, { title: "Failed to generate player link code" });
  } finally {
    generatingLinkCode.value = false;
  }
};

defineExpose({ generateForParticipant, generateForPlayer });
</script>

<template>
  <!-- Link Code Modal -->
  <UModal v-model:open="showLinkCodeModal">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon
              name="i-heroicons-key"
              class="w-5 h-5 text-indigo-500"
            />
            <span class="font-semibold text-gray-900 dark:text-white">{{
              linkCodeModalTitle
            }}</span>
          </div>
          <p class="text-sm text-gray-500 mt-2">
            {{ linkCodeModalDesc }}
          </p>
        </template>

        <div
          class="flex flex-col items-center justify-center py-8 bg-gray-50 dark:bg-gray-950/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-800"
        >
          <span
            class="text-4xl font-bold tracking-[0.2em] text-indigo-600 dark:text-indigo-400 font-mono"
          >
            {{ currentLinkCode }}
          </span>
          <div class="mt-4 flex items-center gap-2 text-xs text-gray-500">
            <UIcon name="i-heroicons-clock" class="w-4 h-4" />
            <span
              >Expires on
              {{
                new Date(currentLinkCodeExpiry!).toLocaleDateString()
              }}</span
            >
          </div>
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <UButton
            color="neutral"
            variant="ghost"
            @click="showLinkCodeModal = false"
            >Close</UButton
          >
          <UButton
            color="primary"
            icon="i-heroicons-document-duplicate"
            @click="copyToClipboard(currentLinkCode!)"
          >
            Copy Code
          </UButton>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
