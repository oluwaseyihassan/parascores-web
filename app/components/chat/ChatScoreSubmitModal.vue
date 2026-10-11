<script setup lang="ts">
import type { Fixture, Tournament } from '~/types'

const props = withDefaults(
  defineProps<{
    fixture: Fixture | null
    tournament?: Tournament | null
    viewerParticipantId?: string | null
    prefill?: { home?: number | null; away?: number | null; note?: string } | null
    mode?: 'submit' | 'dispute' | 'edit'
  }>(),
  {
    fixture: null,
    tournament: null,
    viewerParticipantId: null,
    prefill: null,
    mode: 'submit',
  },
)

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  (e: 'submitted', result: { state: string }): void
}>()

const { handleError } = useErrors()
const toast = useToast()

const homeScore = ref<number | null>(null)
const awayScore = ref<number | null>(null)
const note = ref('')
const evidenceFile = ref<File | null>(null)
const evidencePreview = ref<string | null>(null)
const evidenceInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const submitting = ref(false)

const evidenceRequired = computed(() => !!props.tournament?.requiresScoreEvidence)

const isHome = computed(() => {
  if (!props.fixture || !props.viewerParticipantId) return false
  return props.fixture.homeTeamId === props.viewerParticipantId
})

const homeName = computed(() => {
  const f: any = props.fixture
  return f?.homeTeam?.customName ?? f?.homeTeam?.team?.name ?? f?.home ?? 'Home'
})

const awayName = computed(() => {
  const f: any = props.fixture
  return f?.awayTeam?.customName ?? f?.awayTeam?.team?.name ?? f?.away ?? 'Away'
})

const modalTitle = computed(() => {
  if (props.mode === 'dispute') return 'Dispute / Counter-report score'
  if (props.mode === 'edit') return 'Edit score submission'
  return 'Report match score'
})

function resetForm() {
  homeScore.value = props.prefill?.home ?? null
  awayScore.value = props.prefill?.away ?? null
  note.value = props.prefill?.note ?? ''
  evidenceFile.value = null
  evidencePreview.value = null
  isDragging.value = false
  submitting.value = false
}

watch(
  () => open.value,
  (isOpen) => {
    if (isOpen) {
      resetForm()
      attachPasteListener()
    } else {
      detachPasteListener()
    }
  },
)

// Stepper helpers
function adjustHome(delta: number) {
  const current = homeScore.value ?? 0
  homeScore.value = Math.max(0, Math.min(999, current + delta))
}

function adjustAway(delta: number) {
  const current = awayScore.value ?? 0
  awayScore.value = Math.max(0, Math.min(999, current + delta))
}

function applyPreset(h: number, a: number) {
  // If player is away team, flip to preserve (Me vs Opponent) perspective if desired
  if (!isHome.value && props.viewerParticipantId) {
    homeScore.value = a
    awayScore.value = h
  } else {
    homeScore.value = h
    awayScore.value = a
  }
}

// File handling
function handleFile(file: File) {
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

function onEvidenceChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) handleFile(file)
}

function onDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) handleFile(file)
}

// Clipboard Paste (Ctrl+V) listener
function onWindowPaste(e: ClipboardEvent) {
  if (!open.value) return
  // If target is typing in note or text input, let default text paste work
  const activeEl = document.activeElement
  if (activeEl?.tagName === 'INPUT' && (activeEl as HTMLInputElement).type === 'text') return

  const items = e.clipboardData?.items
  if (!items) return

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (!item) continue

    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) {
        handleFile(file)
        toast.add({ title: 'Screenshot pasted from clipboard 📋', color: 'success' })
        e.preventDefault()
        break
      }
    }
  }
}

function attachPasteListener() {
  if (import.meta.client) {
    window.addEventListener('paste', onWindowPaste)
  }
}

function detachPasteListener() {
  if (import.meta.client) {
    window.removeEventListener('paste', onWindowPaste)
  }
}

onBeforeUnmount(detachPasteListener)

async function submit() {
  if (!props.fixture?.id) return

  if (homeScore.value == null || awayScore.value == null) {
    toast.add({ title: 'Enter both scores', color: 'error' })
    return
  }

  if (evidenceRequired.value && !evidenceFile.value && !evidencePreview.value) {
    toast.add({ title: 'Result screenshot is required by tournament rules', color: 'error' })
    return
  }

  submitting.value = true
  try {
    let evidenceUrl: string | undefined = undefined

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
        body: {
          homeScore: homeScore.value,
          awayScore: awayScore.value,
          evidenceUrl,
          note: note.value.trim() || undefined,
        },
      },
    )

    const state = res.data?.state
    toast.add({
      title:
        state === 'confirmed'
          ? 'Result confirmed ✅ Match verified!'
          : state === 'conflict'
            ? "Scores don't match — organizer alerted"
            : 'Score submitted — awaiting opponent verification',
      color: state === 'conflict' ? 'warning' : 'success',
    })

    open.value = false
    emit('submitted', { state: state || 'awaitingOpponent' })
  } catch (err: any) {
    handleError(err, { title: 'Score submission failed' })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" :ui="{ content: 'sm:max-w-lg' }">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div>
              <h3 class="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>🎮</span> {{ modalTitle }}
              </h3>
              <p class="text-xs text-gray-500 mt-0.5">
                {{ fixture?.roundName || `Round ${fixture?.round || 1}` }} · {{ homeName }} vs {{ awayName }}
              </p>
            </div>
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              icon="i-heroicons-x-mark"
              @click="open = false"
            />
          </div>
        </template>

        <div class="space-y-4">
          <!-- Score inputs with steppers -->
          <div class="bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl p-4">
            <div class="flex items-center justify-center gap-3 sm:gap-6">
              <!-- Home Team -->
              <div class="flex-1 text-center min-w-0">
                <p class="text-xs font-bold text-gray-900 dark:text-white truncate mb-1" :title="homeName">
                  {{ homeName }}
                </p>
                <span
                  v-if="isHome"
                  class="inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 tracking-wider mb-2"
                >
                  YOU
                </span>
                <span v-else class="block h-4 mb-2"></span>

                <div class="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    class="w-8 h-8 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center font-bold text-sm transition-colors disabled:opacity-30"
                    :disabled="(homeScore ?? 0) <= 0"
                    @click="adjustHome(-1)"
                  >
                    –
                  </button>
                  <UInput
                    v-model.number="homeScore"
                    type="number"
                    :min="0"
                    :max="999"
                    class="w-16"
                    :ui="{ base: 'text-center font-mono font-bold text-xl tabular-nums h-9' }"
                  />
                  <button
                    type="button"
                    class="w-8 h-8 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center font-bold text-sm transition-colors"
                    @click="adjustHome(1)"
                  >
                    +
                  </button>
                </div>
              </div>

              <!-- Divider -->
              <span class="font-mono text-xl text-gray-400 font-bold pt-4">–</span>

              <!-- Away Team -->
              <div class="flex-1 text-center min-w-0">
                <p class="text-xs font-bold text-gray-900 dark:text-white truncate mb-1" :title="awayName">
                  {{ awayName }}
                </p>
                <span
                  v-if="!isHome && viewerParticipantId"
                  class="inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 tracking-wider mb-2"
                >
                  YOU
                </span>
                <span v-else class="block h-4 mb-2"></span>

                <div class="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    class="w-8 h-8 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center font-bold text-sm transition-colors disabled:opacity-30"
                    :disabled="(awayScore ?? 0) <= 0"
                    @click="adjustAway(-1)"
                  >
                    –
                  </button>
                  <UInput
                    v-model.number="awayScore"
                    type="number"
                    :min="0"
                    :max="999"
                    class="w-16"
                    :ui="{ base: 'text-center font-mono font-bold text-xl tabular-nums h-9' }"
                  />
                  <button
                    type="button"
                    class="w-8 h-8 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center font-bold text-sm transition-colors"
                    @click="adjustAway(1)"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <!-- Fast quick score chips -->
            <div class="flex items-center justify-center gap-1.5 mt-3 pt-3 border-t border-gray-200/60 dark:border-white/[0.06] flex-wrap">
              <span class="text-[10px] uppercase font-bold text-gray-400 mr-1">Presets:</span>
              <button
                v-for="preset in [[1,0], [2,0], [2,1], [3,0], [3,1], [3,2]]"
                :key="`${preset[0]}-${preset[1]}`"
                type="button"
                class="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/25 text-gray-700 dark:text-gray-200 transition-colors"
                @click="applyPreset(preset[0], preset[1])"
              >
                {{ preset[0] }}–{{ preset[1] }}
              </button>
            </div>
          </div>

          <!-- Screenshot / Proof upload & paste zone -->
          <div>
            <div class="flex items-center justify-between text-xs mb-1.5">
              <label class="font-semibold text-gray-700 dark:text-gray-300">
                Match screenshot proof
                <span v-if="evidenceRequired" class="text-red-500 font-bold">*</span>
                <span v-else class="text-gray-400 font-normal"> (recommended)</span>
              </label>
              <span class="text-[10.5px] text-gray-400">Ctrl + V to paste</span>
            </div>

            <input
              ref="evidenceInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="onEvidenceChange"
            />

            <!-- Preview box -->
            <div
              v-if="evidencePreview"
              class="flex items-center gap-3 p-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]"
            >
              <img
                :src="evidencePreview"
                class="w-16 h-12 rounded-lg object-cover border border-gray-200 dark:border-white/10 bg-black shrink-0"
                alt="Screenshot proof"
              />
              <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold text-gray-900 dark:text-white truncate">
                  {{ evidenceFile?.name || 'Attached proof screenshot' }}
                </p>
                <p class="text-[11px] text-gray-500">
                  {{ evidenceFile ? `${Math.round(evidenceFile.size / 1024)} KB` : 'Ready to submit' }}
                </p>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <UButton
                  type="button"
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  label="Replace"
                  @click="evidenceInput?.click()"
                />
                <UButton
                  type="button"
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  icon="i-heroicons-trash"
                  @click="evidenceFile = null; evidencePreview = null"
                />
              </div>
            </div>

            <!-- Drag, click or paste dropzone -->
            <div
              v-else
              class="rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-colors"
              :class="isDragging
                ? 'border-gray-500 bg-gray-100 dark:bg-white/10'
                : 'border-gray-300 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/20 bg-gray-50/50 dark:bg-white/[0.01]'"
              @click="evidenceInput?.click()"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="onDrop"
            >
              <UIcon name="i-heroicons-photo" class="w-6 h-6 mx-auto mb-1 text-gray-400" />
              <p class="text-xs font-semibold text-gray-800 dark:text-gray-200">
                Click to attach final screen, or press <kbd class="px-1 py-0.5 rounded bg-gray-200 dark:bg-white/10 font-mono text-[10px]">Ctrl+V</kbd> to paste
              </p>
              <p class="text-[11px] text-gray-500 mt-0.5">PNG, JPG or WebP up to 5MB</p>
            </div>
          </div>

          <!-- Note -->
          <UFormField label="Match note (optional)" description="e.g. Game 2 overtime, walkover, disconnect">
            <UInput
              v-model="note"
              placeholder="Add any context for the opponent and admin..."
              class="w-full"
            />
          </UFormField>

          <!-- Double-entry notice -->
          <div class="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.02] p-3 text-[11.5px] text-gray-600 dark:text-gray-400 flex items-start gap-2.5">
            <UIcon name="i-heroicons-shield-check" class="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
            <span>
              <strong>Double-entry system:</strong> Both players report. When entries agree, results confirm automatically. Mismatched scores escalate to organizer review.
            </span>
          </div>
        </div>

        <template #footer>
          <div class="flex items-center justify-end gap-2">
            <UButton
              variant="ghost"
              color="neutral"
              label="Cancel"
              :disabled="submitting"
              @click="open = false"
            />
            <UButton
              color="primary"
              icon="i-heroicons-check"
              :loading="submitting"
              label="Submit score"
              @click="submit"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
