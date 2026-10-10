<script setup lang="ts">
import type { Participant } from "~/types";

const route = useRoute();
const tournamentStore = useTournamentStore();
const { currentTournament: tournament } = storeToRefs(tournamentStore);

const tournamentId = computed(() => route.params.id as string);

// Invite Link Management
const showInviteModal = ref(false);
const inviteLink = ref("");
const inviteLoading = ref(false);
const inviteParticipant = ref<Participant | null>(null);

const generateInviteLink = async (
  participant: Participant,
  openModal = true,
) => {
  inviteParticipant.value = participant;
  inviteLoading.value = true;
  if (openModal) showInviteModal.value = true;
  try {
    const response = await $api<{ success: boolean; data: any }>(
      "/team-invites",
      {
        method: "POST",
        body: {
          participantId: participant.id,
          tournamentId: tournament.value?.id || tournamentId.value,
        },
      },
    );
    if (response.data) {
      const host = import.meta.client
        ? window.location.host
            .replace(
              /^manage-dev\./,
              window.location.host.includes("lvh.me") ? "" : "dev.",
            )
            .replace(/^manage\./, "")
        : "parascores.com";
      const protocol = import.meta.dev ? "http" : "https";
      const baseUrl = `${protocol}://${host}`;
      inviteLink.value = `${baseUrl}/join/${response.data.token}`;
    }
  } catch (err: any) {
    useToast().add({
      title: "Failed to generate invite link",
      description: err?.data?.message || err?.message || "Unknown error",
      color: "error",
    });
    showInviteModal.value = false;
  } finally {
    inviteLoading.value = false;
  }
};

const copyInviteLink = async () => {
  if (!import.meta.client) return;
  try {
    await navigator.clipboard.writeText(inviteLink.value);
    useToast().add({ title: "Invite link copied!", color: "success" });
  } catch {
    useToast().add({ title: "Failed to copy link", color: "error" });
  }
};

defineExpose({ generate: generateInviteLink });
</script>

<template>
  <!-- Invite Link Modal -->
  <UModal v-model:open="showInviteModal" :ui="{ content: 'sm:max-w-md' }">
    <template #content>
      <UCard class="ring-0 shadow-none">
        <template #header>
          <div class="flex items-center justify-between">
            <h3
              class="text-base font-semibold leading-6 text-gray-900 dark:text-white"
            >
              Invite Link
            </h3>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark"
              class="-my-1"
              @click="showInviteModal = false"
            />
          </div>
        </template>

        <div class="py-2">
          <!-- Loading -->
          <div v-if="inviteLoading" class="flex flex-col items-center py-8">
            <UIcon
              name="i-heroicons-arrow-path"
              class="w-8 h-8 animate-spin text-gray-400 mb-3"
            />
            <p class="text-sm text-gray-500">Generating invite link...</p>
          </div>

          <!-- Link Ready -->
          <div v-else-if="inviteLink" class="space-y-4">
            <p class="text-sm text-gray-500">
              Share this link with players to invite them to join
              <strong class="text-gray-900 dark:text-white">{{
                inviteParticipant?.customName
              }}</strong
              >.
            </p>

            <div
              class="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <span
                class="text-xs text-gray-600 dark:text-gray-300 truncate flex-1 select-all font-mono"
              >
                {{ inviteLink }}
              </span>
              <UButton
                color="primary"
                variant="soft"
                icon="i-heroicons-clipboard-document"
                size="xs"
                @click="copyInviteLink"
              />
            </div>

            <UAlert
              color="info"
              variant="subtle"
              icon="i-heroicons-information-circle"
              title="Players will need to log in or create an account to join the team."
            />
          </div>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
