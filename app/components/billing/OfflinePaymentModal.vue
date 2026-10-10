<script setup lang="ts">
import type { ApiResponse } from "~/stores/auth";

const open = defineModel<boolean>("open", { default: false });

const emit = defineEmits<{
  recorded: [];
}>();

const paymentStore = usePaymentStore();
const tournamentStore = useTournamentStore();
const { handleError } = useErrors();

// Offline payment recording
const recordingOffline = ref(false);
const offlineForm = reactive({
  tournamentId: "",
  participantId: "",
  payerName: "",
  amount: null as number | null,
  method: "CASH" as "CASH" | "BANK_TRANSFER" | "OTHER",
  note: "",
});
const offlineParticipants = ref<any[]>([]);
const loadingOfflineParticipants = ref(false);

const offlineTournamentOptions = computed(() =>
  tournamentStore.tournaments
    .filter((t) => t.isPaidRegistration)
    .map((t) => ({ label: t.name, value: t.id })),
);

const offlineSelectedTournament = computed(() =>
  tournamentStore.tournaments.find((t) => t.id === offlineForm.tournamentId),
);

const offlineParticipantOptions = computed(() =>
  offlineParticipants.value.map((p) => ({
    label: p.customName || p.team?.name || p.user?.name || "Unnamed participant",
    value: p.id,
  })),
);

watch(() => offlineForm.tournamentId, async (id) => {
  offlineForm.participantId = "";
  offlineParticipants.value = [];
  if (!id) return;
  loadingOfflineParticipants.value = true;
  try {
    const res = await $api<ApiResponse<any[]>>(`/participants/tournaments/${id}`, { method: "GET" });
    offlineParticipants.value = res.data || [];
  } catch {
    // Participant linking is optional — leave the list empty
  } finally {
    loadingOfflineParticipants.value = false;
  }
});

// Reset the form whenever the modal opens
watch(open, (isOpen) => {
  if (!isOpen) return;
  Object.assign(offlineForm, {
    tournamentId: "",
    participantId: "",
    payerName: "",
    amount: null,
    method: "CASH",
    note: "",
  });
});

async function handleRecordOffline() {
  if (!offlineForm.tournamentId) return;
  recordingOffline.value = true;
  try {
    await paymentStore.recordOfflinePayment({
      tournamentId: offlineForm.tournamentId,
      participantId: offlineForm.participantId || undefined,
      payerName: offlineForm.payerName || undefined,
      amount: offlineForm.amount != null && offlineForm.amount > 0
        ? Math.round(offlineForm.amount * 100)
        : undefined,
      method: offlineForm.method,
      note: offlineForm.note || undefined,
    });
    open.value = false;
    useToast().add({ title: "Offline Payment Recorded", color: "success" });
    emit("recorded");
  } catch (err: any) {
    handleError(err, { title: "Failed to Record Payment" });
  } finally {
    recordingOffline.value = false;
  }
}
</script>

<template>
  <!-- Record Offline Payment Modal -->
  <UModal v-model:open="open">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <UIcon name="i-heroicons-banknotes" class="w-5 h-5 text-emerald-500" />
              </div>
              <div class="min-w-0">
                <h3 class="text-lg font-bold text-heading">Record Offline Payment</h3>
                <p class="text-xs text-muted">Log a registration fee collected by cash or bank transfer.</p>
              </div>
            </div>
            <UButton icon="i-heroicons-x-mark" variant="ghost" color="neutral" size="sm" class="shrink-0" @click="open = false" />
          </div>
        </template>

        <div v-if="offlineTournamentOptions.length === 0" class="py-4 text-center">
          <p class="text-sm text-muted">No tournaments with paid registration found.</p>
          <p class="text-xs text-muted mt-1">Enable paid registration on a tournament first.</p>
        </div>

        <div v-else class="space-y-4">
          <UFormField label="Tournament" required>
            <USelect
              v-model="offlineForm.tournamentId"
              :items="offlineTournamentOptions"
              value-key="value"
              placeholder="Select tournament"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Link participant (optional)">
            <USelect
              v-model="offlineForm.participantId"
              :items="offlineParticipantOptions"
              value-key="value"
              :loading="loadingOfflineParticipants"
              :disabled="!offlineForm.tournamentId"
              placeholder="Walk-in / not linked"
              class="w-full"
            />
          </UFormField>

          <UFormField v-if="!offlineForm.participantId" label="Payer name (optional)">
            <UInput
              v-model="offlineForm.payerName"
              placeholder="e.g. University of Lagos"
              class="w-full"
            />
          </UFormField>

          <div class="grid grid-cols-2 gap-3">
            <UFormField label="Amount (₦)">
              <UInput
                v-model.number="offlineForm.amount"
                type="number"
                min="0"
                step="0.01"
                :placeholder="offlineSelectedTournament ? String((offlineSelectedTournament.registrationFee ?? 0) / 100) : '0.00'"
                class="w-full"
              />
              <template #hint>
                <span v-if="offlineSelectedTournament">
                  Defaults to the fee: ₦{{ ((offlineSelectedTournament.registrationFee ?? 0) / 100).toLocaleString() }}
                </span>
              </template>
            </UFormField>

            <UFormField label="Method" required>
              <USelect
                v-model="offlineForm.method"
                :items="[
                  { label: 'Cash', value: 'CASH' },
                  { label: 'Bank Transfer', value: 'BANK_TRANSFER' },
                  { label: 'Other', value: 'OTHER' },
                ]"
                value-key="value"
                class="w-full"
              />
            </UFormField>
          </div>

          <UFormField label="Note (optional)">
            <UInput
              v-model="offlineForm.note"
              placeholder="e.g. Receipt #0012"
              class="w-full"
            />
          </UFormField>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" label="Cancel" @click="open = false" />
            <UButton
              color="primary"
              icon="i-heroicons-check"
              label="Record Payment"
              :loading="recordingOffline"
              :disabled="!offlineForm.tournamentId"
              @click="handleRecordOffline"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
