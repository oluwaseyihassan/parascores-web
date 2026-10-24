<script setup lang="ts">
import type { ParageeBotFlags } from '~/types'

// Manage-side Chat tab: the room (shared component) + organizer rail
// (chat settings + Paragee toggles). The room self-manages its socket;
// the rail saves via REST — the server broadcasts chat:settings to open rooms.
const tournamentStore = useTournamentStore()
const participantStore = useParticipantStore()
const { currentTournament: tournament } = storeToRefs(tournamentStore)
const { participants } = storeToRefs(participantStore)
const { handleError } = useErrors()
const toast = useToast()

const tournamentId = computed(() => tournament.value?.id ?? '')
const { allowsSelfReporting, isEsports } = useTournamentFeatures(tournament)

// ─── Rail form state (initialized from the tournament) ───
const form = reactive({
  chatEnabled: false,
  chatRules: '',
  parageeBot: {
    enabled: false,
    fixtures: true,
    standings: true,
    rules: true,
    quickChips: true,
  } as ParageeBotFlags,
})

watch(
  tournament,
  (t) => {
    if (!t) return
    form.chatEnabled = t.chatEnabled ?? false
    form.chatRules = t.chatRules ?? ''
    form.parageeBot = { enabled: false, fixtures: true, standings: true, rules: true, quickChips: true, ...(t.parageeBot ?? {}) }
  },
  { immediate: true },
)

const saving = ref(false)
async function saveSettings() {
  if (!tournamentId.value) return
  saving.value = true
  try {
    const res = await $api<{ success: boolean; data: any }>(
      `/tournaments/${tournamentId.value}/chat-settings`,
      {
        method: 'PATCH',
        body: {
          chatEnabled: form.chatEnabled,
          chatRules: form.chatRules,
          parageeBot: form.parageeBot,
        },
      },
    )
    if (tournament.value) {
      tournament.value.chatEnabled = res.data.chatEnabled
      tournament.value.chatRules = res.data.chatRules
      tournament.value.parageeBot = res.data.parageeBot
    }
    toast.add({ title: 'Chat settings saved', color: 'success', icon: 'i-heroicons-check-circle' })
  } catch (err: any) {
    handleError(err, { title: 'Save Failed' })
  } finally {
    saving.value = false
  }
}

// ─── Score disputes (double-entry conflicts) ─────────────
interface Dispute {
  fixtureId: string
  round: string
  home: string
  away: string
  submissions: { participantName: string; homeScore: number; awayScore: number }[]
}
const disputes = ref<Dispute[]>([])
const disputesLoading = ref(false)
const disputeModalOpen = ref(false)
const disputeFixtureId = ref<string | null>(null)

async function loadDisputes() {
  if (!tournamentId.value || !allowsSelfReporting.value) {
    disputes.value = []
    return
  }
  disputesLoading.value = true
  try {
    const res = await $api<{ success: boolean; data: Dispute[] }>(
      `/tournaments/${tournamentId.value}/score-disputes`,
    )
    disputes.value = res.data
  } catch {
    disputes.value = []
  } finally {
    disputesLoading.value = false
  }
}
onMounted(loadDisputes)

function reviewDispute(fixtureId: string) {
  disputeFixtureId.value = fixtureId
  disputeModalOpen.value = true
}

// Mentionable room members (confirmed participants) with profile links
const chatMembers = computed(() =>
  participants.value
    .filter((p) => p.status === 'CONFIRMED')
    .map((p) => ({
      id: p.id,
      name: p.customName ?? 'Player',
      teamName: (p as any).team?.name ?? null,
      href: p.team_id
        ? `/team/${p.team_id}`
        : p.players?.[0]?.id
          ? `/player/${p.players[0].id}`
          : null,
    })),
)

// Inline enable from the room's disabled state
async function enableChat() {
  form.chatEnabled = true
  await saveSettings()
}

const botToggleRows = [
  { key: 'fixtures', label: 'Fixtures & schedule', hint: 'Answers /next and "When is my next match?" with live fixture cards' },
  { key: 'standings', label: 'Standings & stats', hint: 'Answers /table and top scorers with instant table snapshot' },
  { key: 'rules', label: 'House rules', hint: 'Answers /rules directly from your official tournament rules' },
] as const

const automationOpen = ref(false)
</script>

<template>
  <div v-if="tournament && !isEsports" class="mt-4 p-8 text-center rounded-2xl bg-surface border border-subtle">
    <UIcon name="i-heroicons-bolt-slash" class="w-10 h-10 mx-auto text-muted mb-2" />
    <p class="text-sm font-semibold text-heading">Match Hub is only available for esports tournaments</p>
    <p class="text-xs text-muted mt-1">This feature is reserved for esports tournaments with self-reporting and match coordination.</p>
  </div>
  <div v-else-if="tournament" class="mt-3 sm:mt-4 grid gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_320px] items-start">
    <!-- Room -->
    <ChatTournamentChat
      :key="String(form.chatEnabled)"
      :tournament-id="tournament.id"
      can-post="organizer"
      can-moderate
      :paragee-bot="form.parageeBot"
      :member-count="participants.length || undefined"
      :members="chatMembers"
      :tournament="tournament"
      @review-dispute="reviewDispute"
      @enable-chat="enableChat"
    />

    <!-- Rail: Ops Queue & Hub Controls -->
    <div class="flex flex-col gap-4 sm:gap-5">
      <!-- Ops Queue: Score disputes (double-entry conflicts) -->
      <section
        v-if="allowsSelfReporting"
        class="bg-surface border border-subtle rounded-2xl overflow-hidden shadow-2xs"
      >
        <div class="px-4 sm:px-5 py-3.5 border-b border-subtle flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-scale" class="w-4 h-4 text-heading" />
            <h2 class="text-sm font-semibold text-heading">Ops Queue</h2>
          </div>
          <UBadge
            :color="disputes.length > 0 ? 'error' : 'neutral'"
            variant="subtle"
            size="xs"
            :label="disputes.length > 0 ? `${disputes.length} open conflict${disputes.length === 1 ? '' : 's'}` : 'All clear'"
          />
        </div>
        <div class="p-4 sm:p-5">
          <div v-if="disputesLoading" class="flex justify-center py-4">
            <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-muted" />
          </div>
          <div v-else-if="disputes.length > 0" class="space-y-2.5">
            <div
              v-for="d in disputes"
              :key="d.fixtureId"
              class="flex items-center justify-between gap-3 p-3 rounded-xl bg-default border border-subtle"
            >
              <div class="min-w-0">
                <p class="text-xs font-semibold text-heading truncate">{{ d.home }} vs {{ d.away }}</p>
                <p class="text-[11px] text-muted mt-0.5">
                  {{ d.round }} · {{ d.submissions.map((s) => `${s.homeScore}–${s.awayScore}`).join(' vs ') }}
                </p>
              </div>
              <UButton type="button" size="xs" color="error" variant="soft" label="Review" @click="reviewDispute(d.fixtureId)" />
            </div>
          </div>
          <div v-else class="text-center py-4 px-2">
            <UIcon name="i-heroicons-check-circle" class="w-6 h-6 mx-auto text-emerald-500 mb-1.5 opacity-80" />
            <p class="text-xs font-semibold text-heading">No open score conflicts</p>
            <p class="text-[11px] text-muted mt-0.5">Reported match scores are verified or automatically matched.</p>
          </div>
        </div>
      </section>

      <!-- Match Hub & Automation Settings -->
      <section class="bg-surface border border-subtle rounded-2xl overflow-hidden shadow-2xs">
        <div class="px-4 sm:px-5 py-3.5 border-b border-subtle">
          <h2 class="text-sm font-semibold text-heading">Hub Controls</h2>
          <p class="text-xs text-muted mt-0.5">Status, rules & automation settings for this tournament.</p>
        </div>
        <div class="p-4 sm:p-5 space-y-4">
          <!-- Hub Status Toggle -->
          <div class="flex items-center justify-between p-3 rounded-xl bg-default border border-subtle">
            <div class="flex-1 pr-3">
              <p class="font-medium text-xs sm:text-sm text-heading">Match Hub enabled</p>
              <p class="text-[11px] text-muted mt-0.5">Enables the live hub tab for bulletins & score reporting.</p>
            </div>
            <USwitch v-model="form.chatEnabled" />
          </div>

          <!-- Official House Rules -->
          <UFormField label="Official house rules" description="Paragee answers /rules from this text and it is shown in the rules drawer.">
            <UTextarea
              v-model="form.chatRules"
              :rows="3"
              placeholder="Be respectful. Report scores with screenshots. Match starts within 15 mins of call."
              class="w-full"
            />
          </UFormField>

          <!-- Automation (Paragee Bot) Collapsible -->
          <div class="rounded-xl border border-subtle bg-default overflow-hidden">
            <button
              type="button"
              class="w-full px-3.5 py-3 flex items-center justify-between gap-2 hover:bg-surface transition-colors cursor-pointer text-left"
              @click="automationOpen = !automationOpen"
            >
              <div class="flex items-center gap-2 min-w-0">
                <UIcon name="i-heroicons-sparkles" class="w-4 h-4 text-heading shrink-0" />
                <span class="text-xs font-semibold text-heading truncate">Automation (Paragee Bot)</span>
                <span
                  v-if="(tournament?.botCalls ?? 0) > 0"
                  class="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-surface text-muted border border-subtle tabular-nums shrink-0"
                >{{ tournament!.botCalls }}</span>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <UBadge
                  :color="form.parageeBot.enabled ? 'primary' : 'neutral'"
                  variant="subtle"
                  size="xs"
                  :label="form.parageeBot.enabled ? 'Active' : 'Off'"
                />
                <UIcon
                  :name="automationOpen ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
                  class="w-4 h-4 text-muted"
                />
              </div>
            </button>

            <div v-if="automationOpen" class="px-3.5 pb-3.5 pt-1 border-t border-subtle space-y-3">
              <div class="flex items-center justify-between py-2 border-b border-subtle">
                <div class="flex-1 pr-2">
                  <p class="text-xs font-semibold text-heading">Enable Bot</p>
                  <p class="text-[11px] text-muted">Answers player questions deterministically from data.</p>
                </div>
                <USwitch v-model="form.parageeBot.enabled" />
              </div>

              <div class="divide-y divide-subtle">
                <div v-for="row in botToggleRows" :key="row.key" class="flex items-center justify-between gap-3 py-2">
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-medium text-heading">{{ row.label }}</p>
                    <p class="text-[10px] text-muted truncate">{{ row.hint }}</p>
                  </div>
                  <USwitch v-model="form.parageeBot[row.key]" :disabled="!form.parageeBot.enabled" size="sm" />
                </div>
              </div>
            </div>
          </div>

          <!-- Single Unified Save Action -->
          <div class="pt-1">
            <UButton
              type="button"
              color="primary"
              size="sm"
              class="w-full justify-center"
              label="Save settings"
              icon="i-heroicons-check"
              :loading="saving"
              @click="saveSettings"
            />
          </div>
        </div>
      </section>
    </div>

    <!-- Dispute review modal -->
    <ScoreDisputeReviewModal
      v-if="allowsSelfReporting"
      v-model:open="disputeModalOpen"
      :fixture-id="disputeFixtureId"
      @resolved="loadDisputes"
    />
  </div>
</template>
