<script setup lang="ts">
import type { Fixture, Participant, Tournament } from '~/types'

/**
 * Double-entry score reporting (esports package). Renders only for a logged-in
 * confirmed participant of this fixture while it has no confirmed result.
 * States: due (submit CTA) → awaiting opponent → opponent-submitted
 * confirm/dispute → conflict (organizer reviews).
 */
const props = defineProps<{
  fixture: Fixture
  tournament: Tournament
}>()

const emit = defineEmits<{ (e: 'updated'): void }>()

const authStore = useAuthStore()
const { handleError } = useErrors()
const toast = useToast()

interface Submission {
  id: string
  participantId: string
  participantName: string
  homeScore: number
  awayScore: number
  evidenceUrl?: string | null
  note?: string | null
  status: 'PENDING' | 'MATCHED' | 'CONFLICT' | 'APPLIED' | 'DISMISSED'
}

const submissions = ref<Submission[]>([])
const stateLoading = ref(true)
const permitted = ref(false) // viewer is a fixture participant or organizer

// ─── viewer identity ─────────────────────────────────────
const myParticipant = computed<Participant | null>(() => {
  const uid = authStore.user?.id
  if (!uid) return null
  const sides = [props.fixture.homeTeam as any, props.fixture.awayTeam as any]
  return (
    sides.find(
      (s) => s && s.user_id === uid && s.status === 'CONFIRMED',
    ) ?? null
  )
})

const fixtureOpen = computed(() => props.fixture.status !== 'COMPLETED')
const isHome = computed(() => myParticipant.value?.id === (props.fixture as any).homeTeamId)

const homeName = computed(() => (props.fixture as any).homeTeam?.customName ?? 'TBD')
const awayName = computed(() => (props.fixture as any).awayTeam?.customName ?? 'TBD')

// ─── submission state ────────────────────────────────────
async function loadState() {
  if (!myParticipant.value || !fixtureOpen.value) {
    stateLoading.value = false
    return
  }
  try {
    const res = await $api<{ success: boolean; data: { submissions: Submission[] } }>(
      `/fixtures/${props.fixture.id}/score-submissions`,
    )
    submissions.value = res.data.submissions
    permitted.value = true
  } catch {
    permitted.value = false // 403 — not a fixture participant
  } finally {
    stateLoading.value = false
  }
}
onMounted(loadState)

const myEntry = computed(() =>
  submissions.value.find((s) => s.participantId === myParticipant.value?.id && (s.status === 'PENDING' || s.status === 'CONFLICT')),
)
const opponentEntry = computed(() =>
  submissions.value.find((s) => s.participantId !== myParticipant.value?.id && (s.status === 'PENDING' || s.status === 'CONFLICT')),
)

const cardState = computed<'none' | 'awaitingOpponent' | 'awaitingMe' | 'conflict'>(() => {
  if (submissions.value.some((s) => s.status === 'CONFLICT')) return 'conflict'
  if (myEntry.value && !opponentEntry.value) return 'awaitingOpponent'
  if (!myEntry.value && opponentEntry.value) return 'awaitingMe'
  return 'none'
})

// ─── submit modal ────────────────────────────────────────
const showModal = ref(false)
const homeScore = ref<number | null>(null)
const awayScore = ref<number | null>(null)
const note = ref('')
const evidenceFile = ref<File | null>(null)
const evidencePreview = ref<string | null>(null)
const evidenceInput = ref<HTMLInputElement | null>(null)
const submitting = ref(false)

const evidenceRequired = computed(() => !!props.tournament.requiresScoreEvidence)

function openSubmit(prefill?: { home: number; away: number }) {
  homeScore.value = prefill?.home ?? myEntry.value?.homeScore ?? null
  awayScore.value = prefill?.away ?? myEntry.value?.awayScore ?? null
  note.value = myEntry.value?.note ?? ''
  evidenceFile.value = null
  evidencePreview.value = myEntry.value?.evidenceUrl ?? null
  showModal.value = true
}

function onEvidenceChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    toast.add({ title: 'Please select an image file', color: 'error' })
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    toast.add({ title: 'Image must be under 5MB', color: 'error' })
    return
  }
  evidenceFile.value = file
  evidencePreview.value = URL.createObjectURL(file)
}

async function submit() {
  if (homeScore.value == null || awayScore.value == null) {
    toast.add({ title: 'Enter both scores', color: 'error' })
    return
  }
  if (evidenceRequired.value && !evidenceFile.value && !evidencePreview.value) {
    toast.add({ title: 'Attach the result screenshot', color: 'error' })
    return
  }
  submitting.value = true
  try {
    let evidenceUrl = myEntry.value?.evidenceUrl ?? undefined
    if (evidenceFile.value) {
      const formData = new FormData()
      formData.append('file', evidenceFile.value)
      const up = await $api<{ data: { url: string } }>('/upload/image?folder=scores', {
        method: 'POST',
        body: formData,
      })
      evidenceUrl = up.data.url
    }
    const res = await $api<{ success: boolean; data: { state: string } }>(
      `/fixtures/${props.fixture.id}/score-submissions`,
      {
        method: 'POST',
        body: { homeScore: homeScore.value, awayScore: awayScore.value, evidenceUrl, note: note.value || undefined },
      },
    )
    showModal.value = false
    const st = res.data?.state
    toast.add({
      title:
        st === 'confirmed' ? 'Result confirmed ✅'
        : st === 'conflict' ? 'Scores don\'t match — organizer notified'
        : 'Score submitted — awaiting opponent',
      color: st === 'conflict' ? 'warning' : 'success',
    })
    await loadState()
    if (st === 'confirmed') emit('updated')
  } catch (err: any) {
    handleError(err, { title: 'Submission Failed' })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section
    v-if="permitted && myParticipant && fixtureOpen && !stateLoading"
    class="max-w-3xl mx-auto px-3 sm:px-4 md:px-6 mb-4 sm:mb-6"
  >
    <!-- due: submit CTA -->
    <div
      v-if="cardState === 'none'"
      class="rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] p-4 sm:p-5 text-center"
    >
      <p class="text-xs font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-300 mb-1">Score reporting</p>
      <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">
        Played this match? Both players submit — scores must match to go official.
      </p>
      <UButton color="primary" icon="i-heroicons-trophy" label="Submit score" @click="openSubmit()" />
    </div>

    <!-- awaiting opponent -->
    <div
      v-else-if="cardState === 'awaitingOpponent'"
      class="rounded-2xl border border-amber-500/25 bg-amber-500/[0.05] p-4 sm:p-5 text-center"
    >
      <p class="text-xs font-bold uppercase tracking-widest text-amber-500 mb-1">⏳ Awaiting opponent</p>
      <p class="font-mono text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
        {{ myEntry?.homeScore }} – {{ myEntry?.awayScore }}
      </p>
      <p class="text-xs text-gray-500 mt-1 mb-3">
        your submission · {{ isHome ? homeName : awayName }} (you) vs {{ isHome ? awayName : homeName }} — result goes official when the entries match.
      </p>
      <UButton variant="outline" color="neutral" size="sm" label="Edit submission" @click="openSubmit()" />
    </div>

    <!-- opponent submitted: confirm or dispute -->
    <div
      v-else-if="cardState === 'awaitingMe'"
      class="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04] p-4 sm:p-5 text-center"
    >
      <p class="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">Action needed — opponent submitted</p>
      <p class="font-mono text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
        {{ opponentEntry?.homeScore }} – {{ opponentEntry?.awayScore }}
      </p>
      <p class="text-xs text-gray-500 mt-1">
        {{ opponentEntry?.participantName }} reports this score ({{ homeName }} vs {{ awayName }})
      </p>
      <a
        v-if="opponentEntry?.evidenceUrl"
        :href="opponentEntry.evidenceUrl"
        target="_blank"
        class="inline-flex items-center gap-1 text-[11.5px] font-bold text-indigo-500 dark:text-indigo-300 mt-1.5 hover:underline"
      >🖼 View evidence ↗</a>
      <div class="flex gap-2.5 mt-4">
        <UButton
          class="flex-1"
          color="primary"
          icon="i-heroicons-check"
          label="Correct — submit matching score"
          @click="openSubmit({ home: opponentEntry!.homeScore, away: opponentEntry!.awayScore })"
        />
        <UButton
          class="flex-1"
          variant="outline"
          color="error"
          icon="i-heroicons-exclamation-triangle"
          label="Dispute"
          @click="openSubmit()"
        />
      </div>
      <p class="text-[11px] text-gray-400 mt-2.5">
        Agreeing submits your own matching entry. Disputing sends both entries + evidence to the organizer.
      </p>
    </div>

    <!-- conflict -->
    <div
      v-else-if="cardState === 'conflict'"
      class="rounded-2xl border border-red-500/25 bg-red-500/[0.04] p-4 sm:p-5 text-center"
    >
      <p class="text-xs font-bold uppercase tracking-widest text-red-500 mb-1">⚠ Score conflict</p>
      <p class="text-sm text-gray-600 dark:text-gray-300">
        You said <span class="font-mono font-bold text-red-500">{{ myEntry?.homeScore }}–{{ myEntry?.awayScore }}</span>,
        {{ opponentEntry?.participantName ?? 'opponent' }} said
        <span class="font-mono font-bold text-red-500">{{ opponentEntry?.homeScore }}–{{ opponentEntry?.awayScore }}</span>.
      </p>
      <p class="text-[11px] text-gray-400 mt-2">The organizer is reviewing both screenshots — nothing is applied until they decide.</p>
    </div>

    <!-- submit modal -->
    <UModal v-model:open="showModal">
      <template #content>
        <UCard>
          <template #header>
            <div>
              <h3 class="text-base font-bold text-gray-900 dark:text-white">Submit score</h3>
              <p class="text-xs text-gray-500 mt-0.5">{{ homeName }} vs {{ awayName }}</p>
            </div>
          </template>

          <div class="space-y-4">
            <!-- score inputs -->
            <div class="flex items-center justify-center gap-4">
              <div class="flex-1 text-center">
                <p class="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  {{ homeName }}
                  <span v-if="isHome" class="block text-[9px] font-extrabold text-emerald-500 tracking-widest">▸ YOU</span>
                </p>
                <UInput
                  v-model.number="homeScore"
                  type="number"
                  :min="0"
                  :max="999"
                  class="w-20 mx-auto"
                  :ui="{ base: 'text-center font-mono font-bold text-xl tabular-nums' }"
                />
              </div>
              <span class="font-mono text-xl text-gray-400 pt-6">–</span>
              <div class="flex-1 text-center">
                <p class="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  {{ awayName }}
                  <span v-if="!isHome" class="block text-[9px] font-extrabold text-emerald-500 tracking-widest">▸ YOU</span>
                </p>
                <UInput
                  v-model.number="awayScore"
                  type="number"
                  :min="0"
                  :max="999"
                  class="w-20 mx-auto"
                  :ui="{ base: 'text-center font-mono font-bold text-xl tabular-nums' }"
                />
              </div>
            </div>

            <!-- evidence -->
            <div>
              <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Final-score screenshot <span v-if="evidenceRequired" class="text-red-500">*</span>
                <span v-else class="text-gray-400">(optional)</span>
              </p>
              <input ref="evidenceInput" type="file" accept="image/*" class="hidden" @change="onEvidenceChange" />
              <div
                v-if="evidencePreview"
                class="flex items-center gap-3 p-2.5 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03]"
              >
                <img :src="evidencePreview" class="w-16 h-10 rounded-lg object-cover border border-gray-200 dark:border-white/10" alt="Evidence" />
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-semibold text-gray-900 dark:text-white truncate">{{ evidenceFile?.name || 'Current screenshot' }}</p>
                  <p class="text-[11px] text-gray-500">Visible to your opponent + organizer</p>
                </div>
                <UButton type="button" size="xs" variant="ghost" label="Replace" @click="evidenceInput?.click()" />
              </div>
              <button
                v-else
                type="button"
                class="w-full p-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-white/[0.12] hover:border-emerald-400 dark:hover:border-emerald-500/50 transition-colors text-center text-xs text-gray-500 dark:text-gray-400"
                @click="evidenceInput?.click()"
              >
                <UIcon name="i-heroicons-photo" class="w-6 h-6 mx-auto mb-1 text-gray-400" />
                Upload the final score screen
              </button>
            </div>

            <UFormField label="Note (optional)">
              <UInput v-model="note" placeholder="e.g. went to extra time" class="w-full" />
            </UFormField>

            <div class="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-500/25 text-amber-700 dark:text-amber-400 text-[11.5px] leading-relaxed">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 shrink-0 mt-0.5" />
              False reporting leads to disqualification. Your opponent submits their own score — mismatches go to the organizer.
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton variant="ghost" color="neutral" label="Cancel" :disabled="submitting" @click="showModal = false" />
              <UButton color="primary" icon="i-heroicons-check" label="Submit score" :loading="submitting" @click="submit" />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </section>
</template>
