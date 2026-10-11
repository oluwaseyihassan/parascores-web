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
  if (!tournamentId.value) return
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
  { key: 'fixtures', label: 'Fixtures & schedule', hint: '"When is my next match?" — fixture card answers' },
  { key: 'standings', label: 'Standings & stats', hint: '"Who\'s top scorer?" · "Show the table"' },
  { key: 'rules', label: 'House rules', hint: 'Answers from your rules text' },
  { key: 'quickChips', label: 'Quick-ask chips', hint: 'Tap-to-ask suggestions above the fan composer' },
  { key: 'llm', label: 'Free-form AI answers', hint: 'Grounded AI for open questions — requires AI_API_KEY on the server' },
] as const
</script>

<template>
  <div v-if="tournament" class="mt-3 sm:mt-4 grid gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_320px] items-start">
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

    <!-- Rail -->
    <div class="flex flex-col gap-4 sm:gap-5">
      <!-- Open score disputes -->
      <section
        v-if="disputes.length > 0 || disputesLoading"
        class="bg-white dark:bg-gray-900 border border-red-200 dark:border-red-500/25 rounded-2xl overflow-hidden"
      >
        <div class="px-4 sm:px-5 py-3.5 border-b border-red-100 dark:border-red-500/10 flex items-center justify-between">
          <h2 class="text-sm font-semibold text-red-600 dark:text-red-400">Score conflicts</h2>
          <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/25">{{ disputes.length }} open</span>
        </div>
        <div class="p-4 sm:p-5 space-y-2.5">
          <div v-if="disputesLoading" class="flex justify-center py-3">
            <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-gray-400" />
          </div>
          <div
            v-for="d in disputes"
            :key="d.fixtureId"
            class="flex items-center justify-between gap-3 p-3 rounded-xl bg-red-500/[0.04] border border-red-500/20"
          >
            <div class="min-w-0">
              <p class="text-[13px] font-semibold text-gray-900 dark:text-white truncate">{{ d.home }} vs {{ d.away }}</p>
              <p class="text-[11px] text-gray-500 mt-0.5">
                {{ d.round }} · {{ d.submissions.map((s) => `${s.homeScore}–${s.awayScore}`).join(' vs ') }}
              </p>
            </div>
            <UButton type="button" size="xs" color="error" variant="soft" label="Review" @click="reviewDispute(d.fixtureId)" />
          </div>
        </div>
      </section>

      <!-- Chat settings -->
      <section class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden">
        <div class="px-4 sm:px-5 py-3.5 border-b border-gray-100 dark:border-white/[0.06]">
          <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Chat settings</h2>
          <p class="text-xs text-gray-500 mt-0.5">The room lives on the fan page — public read.</p>
        </div>
        <div class="p-4 sm:p-5 space-y-3">
          <div class="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05]">
            <div class="flex-1 pr-3">
              <p class="font-medium text-sm text-gray-900 dark:text-white">Chat enabled</p>
              <p class="text-[11px] text-gray-500 mt-0.5">Shows the Chat tab on the fan page and opens the room.</p>
            </div>
            <USwitch v-model="form.chatEnabled" />
          </div>
          <div class="p-3.5 rounded-xl border border-dashed border-gray-200 dark:border-white/[0.1]">
            <p class="font-medium text-sm text-gray-900 dark:text-white">Who can post</p>
            <p class="text-[11px] text-gray-500 mt-0.5">Approved participants + organizers. Everyone else reads; the fan page shows a locked composer.</p>
          </div>
          <UFormField label="House rules" description="Shown to players; Paragee answers rule questions from this text.">
            <UTextarea v-model="form.chatRules" :rows="3" placeholder="Be respectful. Report scores with screenshots." class="w-full" />
          </UFormField>
          <div class="flex justify-end">
            <UButton type="button" color="primary" size="sm" label="Save settings" icon="i-heroicons-check" :loading="saving" @click="saveSettings" />
          </div>
        </div>
      </section>

      <!-- Paragee -->
      <section class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden">
        <div class="px-4 sm:px-5 py-3.5 border-b border-gray-100 dark:border-white/[0.06] flex items-center justify-between gap-3">
          <h2 class="text-sm font-semibold text-gray-900 dark:text-white">✨ Paragee</h2>
          <div class="flex items-center gap-2">
            <span
              v-if="(tournament?.botCalls ?? 0) > 0"
              class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 tabular-nums"
              title="Times Paragee has answered a question in this room"
            >{{ tournament!.botCalls }} {{ tournament!.botCalls === 1 ? 'call' : 'calls' }}</span>
            <span class="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10">Template tier</span>
          </div>
        </div>
        <div class="p-4 sm:p-5 space-y-3">
          <div class="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05]">
            <div class="flex-1 pr-3">
              <p class="font-medium text-sm text-gray-900 dark:text-white">Bot enabled</p>
              <p class="text-[11px] text-gray-500 mt-0.5">
                Answers player questions from live tournament data. Posts as <span class="font-semibold text-gray-900 dark:text-white">Paragee</span> with a distinct message rail.
              </p>
            </div>
            <USwitch v-model="form.parageeBot.enabled" />
          </div>

          <div class="divide-y divide-gray-100 dark:divide-white/[0.05]">
            <div v-for="row in botToggleRows" :key="row.key" class="flex items-center justify-between gap-3 py-2.5">
              <div class="flex-1 min-w-0">
                <p class="text-[13px] font-semibold text-gray-900 dark:text-white">{{ row.label }}</p>
                <p class="text-[11px] text-gray-500 mt-0.5">{{ row.hint }}</p>
              </div>
              <USwitch v-model="form.parageeBot[row.key]" :disabled="!form.parageeBot.enabled" />
            </div>
          </div>

          <p class="text-[11px] text-gray-400 dark:text-gray-500">
            Template answers (fixtures, table, top scorers, rules) never invent data. With Free-form AI on, open questions get grounded answers from live tournament data — sensitive topics always go to you.
          </p>
          <div class="flex justify-end">
            <UButton type="button" color="primary" size="sm" label="Save settings" icon="i-heroicons-check" :loading="saving" @click="saveSettings" />
          </div>
        </div>
      </section>
    </div>

    <!-- Dispute review modal -->
    <ScoreDisputeReviewModal
      v-model:open="disputeModalOpen"
      :fixture-id="disputeFixtureId"
      @resolved="loadDisputes"
    />
  </div>
</template>
