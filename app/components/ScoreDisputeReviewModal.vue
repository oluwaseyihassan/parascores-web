<script setup lang="ts">
/**
 * Resolve score conflict — both double-entry claims side by side with evidence,
 * accept either or enter the correct score. Verdict note posts to the chat room.
 */
const props = defineProps<{ fixtureId: string | null }>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ (e: 'resolved'): void }>()

const { handleError } = useErrors()
const toast = useToast()

interface Claim {
  id: string
  participantId: string
  participantName: string
  homeScore: number
  awayScore: number
  evidenceUrl?: string | null
  note?: string | null
  createdAt: string
}

const claims = ref<Claim[]>([])
const loading = ref(false)
const resolving = ref(false)
const acceptedId = ref<string | null>(null)
const customHome = ref<number | null>(null)
const customAway = ref<number | null>(null)
const verdictNote = ref('')
const mode = ref<'accept' | 'custom'>('accept')

async function load() {
  if (!props.fixtureId) return
  loading.value = true
  claims.value = []
  acceptedId.value = null
  customHome.value = null
  customAway.value = null
  verdictNote.value = ''
  mode.value = 'accept'
  try {
    const res = await $api<{ success: boolean; data: { submissions: Claim[] } }>(
      `/fixtures/${props.fixtureId}/score-submissions`,
    )
    claims.value = res.data.submissions.filter((s: any) => s.status === 'CONFLICT')
    if (claims.value[0]) acceptedId.value = claims.value[0].id
  } catch (err: any) {
    handleError(err, { title: 'Failed to load dispute' })
    open.value = false
  } finally {
    loading.value = false
  }
}
watch(() => [open.value, props.fixtureId], ([isOpen]) => { if (isOpen) load() })

async function resolveDispute() {
  if (!props.fixtureId) return
  const body: Record<string, any> = { verdictNote: verdictNote.value || undefined }
  if (mode.value === 'accept') {
    if (!acceptedId.value) return
    body.acceptSubmissionId = acceptedId.value
  } else {
    if (customHome.value == null || customAway.value == null) {
      toast.add({ title: 'Enter both scores', color: 'error' })
      return
    }
    body.homeScore = customHome.value
    body.awayScore = customAway.value
  }
  resolving.value = true
  try {
    await $api(`/fixtures/${props.fixtureId}/score-submissions/resolve`, { method: 'POST', body })
    toast.add({ title: 'Result applied', description: 'The fixture was updated and both players were notified in chat.', color: 'success', icon: 'i-heroicons-check-circle' })
    open.value = false
    emit('resolved')
  } catch (err: any) {
    handleError(err, { title: 'Resolve Failed' })
  } finally {
    resolving.value = false
  }
}

async function dismissDispute() {
  if (!props.fixtureId) return
  resolving.value = true
  try {
    await $api(`/fixtures/${props.fixtureId}/score-submissions/dismiss`, { method: 'POST' })
    toast.add({ title: 'Conflict dismissed', description: 'Both entries were voided — players can re-submit.', color: 'success' })
    open.value = false
    emit('resolved')
  } catch (err: any) {
    handleError(err, { title: 'Dismiss Failed' })
  } finally {
    resolving.value = false
  }
}

function claimTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}
</script>

<template>
  <UModal v-model:open="open" :ui="{ content: 'sm:max-w-2xl' }">
    <template #content>
      <UCard>
        <template #header>
          <div>
            <h3 class="text-base font-bold text-gray-900 dark:text-white">Resolve score conflict</h3>
            <p class="text-xs text-gray-500 mt-0.5">Both entries + evidence — your decision applies the result.</p>
          </div>
        </template>

        <div v-if="loading" class="py-10 flex justify-center">
          <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
        </div>

        <div v-else class="space-y-5">
          <!-- claims -->
          <div class="grid sm:grid-cols-2 gap-3">
            <button
              v-for="claim in claims"
              :key="claim.id"
              type="button"
              class="rounded-2xl border p-4 text-center transition-all"
              :class="mode === 'accept' && acceptedId === claim.id
                ? 'border-emerald-500/60 bg-emerald-50 dark:bg-emerald-500/10 ring-1 ring-emerald-500/30'
                : 'border-gray-200 dark:border-white/[0.09] bg-gray-50 dark:bg-white/[0.03] hover:border-gray-300 dark:hover:border-white/[0.16]'"
              @click="mode = 'accept'; acceptedId = claim.id"
            >
              <p class="text-[13px] font-bold text-gray-900 dark:text-white">{{ claim.participantName }}</p>
              <p class="font-mono text-3xl font-bold text-gray-900 dark:text-white tabular-nums my-2">
                {{ claim.homeScore }} – {{ claim.awayScore }}
              </p>
              <a
                v-if="claim.evidenceUrl"
                :href="claim.evidenceUrl"
                target="_blank"
                class="block rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 mb-2 hover:opacity-90"
                @click.stop
              >
                <img :src="claim.evidenceUrl" class="w-full h-20 object-cover" alt="Evidence screenshot" />
              </a>
              <p v-else class="text-[10.5px] text-gray-400 mb-2">no evidence attached</p>
              <p v-if="claim.note" class="text-[11px] text-gray-500 italic mb-1">"{{ claim.note }}"</p>
              <p class="text-[10.5px] text-gray-400">submitted {{ claimTime(claim.createdAt) }}</p>
              <span
                class="inline-block mt-2 text-[11px] font-bold px-3 py-1 rounded-lg"
                :class="mode === 'accept' && acceptedId === claim.id ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'"
              >{{ mode === 'accept' && acceptedId === claim.id ? '✓ Accepting this score' : 'Accept this score' }}</span>
            </button>
          </div>

          <!-- custom override -->
          <div>
            <div class="flex items-center gap-3 mb-3">
              <span class="flex-1 h-px bg-gray-100 dark:bg-white/[0.07]"></span>
              <button
                type="button"
                class="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                @click="mode = 'custom'"
              >Or enter the correct score</button>
              <span class="flex-1 h-px bg-gray-100 dark:bg-white/[0.07]"></span>
            </div>
            <div v-if="mode === 'custom'" class="flex items-center justify-center gap-3">
              <UInput v-model.number="customHome" type="number" :min="0" :max="999" class="w-20" :ui="{ base: 'text-center font-mono font-bold text-lg tabular-nums' }" />
              <span class="font-mono text-gray-400">–</span>
              <UInput v-model.number="customAway" type="number" :min="0" :max="999" class="w-20" :ui="{ base: 'text-center font-mono font-bold text-lg tabular-nums' }" />
            </div>
          </div>

          <UFormField label="Verdict note (posted to chat with the result)">
            <UInput v-model="verdictNote" placeholder="e.g. Evidence confirms 3–2. Rule reminder issued." class="w-full" />
          </UFormField>

          <div class="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-500/25 text-amber-700 dark:text-amber-400 text-[11.5px] leading-relaxed">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 shrink-0 mt-0.5" />
            Applying updates the fixture immediately and posts the verdict to the chat room.
          </div>
        </div>

        <template #footer>
          <div class="flex justify-between gap-2 w-full">
            <UButton variant="ghost" color="error" label="Dismiss conflict" :disabled="resolving" @click="dismissDispute" />
            <div class="flex gap-2">
              <UButton variant="ghost" color="neutral" label="Cancel" :disabled="resolving" @click="open = false" />
              <UButton color="primary" icon="i-heroicons-check" label="Apply result" :loading="resolving" @click="resolveDispute" />
            </div>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
