<script setup lang="ts">
import type { Fixture, ResultEntry } from '~/types'
import { SportEngineKey } from '~/engines/types'

const props = defineProps<{
  fixture: Fixture
  tournament?: any
  updatingMatch: boolean
}>()

const emit = defineEmits<{
  'fixture-updated': [fixture: Fixture]
}>()

const engine = inject(SportEngineKey)
const raceConfig = computed(() => engine?.value.race)

const participantStore = useParticipantStore()
const { handleError } = useErrors()

interface RowState {
  participantId: string
  name: string
  shortName: string
  logoUrl: string | null
  value: string
  lane: number | null
  note: string
  rank: number | null
}

const rows = ref<RowState[]>([])
const loadingParticipants = ref(false)
const saving = ref(false)
const saved = ref(false)

const initRows = () => {
  const existing = new Map(
    (props.fixture.resultEntries ?? []).map((e: ResultEntry) => [e.participantId, e]),
  )
  rows.value = participantStore.participants.map((p) => {
    const entry = existing.get(p.id)
    return {
      participantId: p.id,
      name: p.customName ?? 'Unknown',
      shortName: p.customShortName ?? '',
      logoUrl: p.logoUrl ?? null,
      value: entry?.value ?? '',
      lane: entry?.lane ?? null,
      note: entry?.note ?? '',
      rank: entry?.rank ?? null,
    }
  })
}

onMounted(async () => {
  loadingParticipants.value = true
  try {
    if (props.fixture.tournament_id) {
      await participantStore.fetchParticipants(props.fixture.tournament_id)
    }
    initRows()
  } finally {
    loadingParticipants.value = false
  }
})

const isCompleted = computed(() => props.fixture.status === 'COMPLETED')

const filledRows = computed(() => rows.value.filter((r) => r.value.trim() !== ''))

const save = async () => {
  if (!filledRows.value.length) return
  saving.value = true
  saved.value = false
  try {
    const res = await $api<{ success: boolean; data?: Fixture }>(
      `/fixtures/${props.fixture.id}/results`,
      {
        method: 'PUT',
        body: {
          results: filledRows.value.map((r) => ({
            participantId: r.participantId,
            value: r.value.trim(),
            lane: r.lane ?? undefined,
            note: r.note.trim() || undefined,
          })),
        },
      },
    )
    if (res.data) {
      emit('fixture-updated', res.data)
      initRowsFromEntries(res.data.resultEntries ?? [])
      saved.value = true
      setTimeout(() => (saved.value = false), 2500)
    }
  } catch (error: any) {
    handleError(error, { title: 'Failed to save results' })
  } finally {
    saving.value = false
  }
}

const initRowsFromEntries = (entries: ResultEntry[]) => {
  const byParticipant = new Map(entries.map((e) => [e.participantId, e]))
  rows.value = rows.value.map((r) => {
    const entry = byParticipant.get(r.participantId)
    return entry ? { ...r, rank: entry.rank ?? null } : r
  })
  // Keep ranks sorted view consistent with server
  rows.value.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
}
</script>

<template>
  <div class="col-span-full w-full space-y-3">
    <div class="text-center text-[10px] text-white/40 uppercase tracking-wider">
      {{ raceConfig?.valueLabel ?? 'Result' }} per participant — lowest wins
    </div>

    <div v-if="loadingParticipants" class="text-center text-xs text-white/40 py-4">
      Loading participants…
    </div>

    <div v-else class="space-y-1.5">
      <div
        v-for="row in rows"
        :key="row.participantId"
        class="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]"
      >
        <span
          v-if="row.rank"
          class="w-6 text-center text-xs font-black"
          :class="row.rank === 1 ? 'text-amber-400' : row.rank === 2 ? 'text-gray-300' : row.rank === 3 ? 'text-amber-700' : 'text-white/40'"
        >
          {{ row.rank }}
        </span>
        <span v-else class="w-6" />
        <span class="flex-1 min-w-0 text-xs font-bold truncate">
          {{ row.shortName || row.name }}
        </span>
        <input
          v-model.number="row.lane"
          type="number"
          min="1"
          max="12"
          placeholder="Ln"
          class="w-12 bg-white/5 border border-white/10 rounded px-1.5 py-1 text-center text-[11px] text-white focus:outline-none focus:border-emerald-500/50"
          :disabled="isCompleted || saving"
        />
        <input
          v-model="row.value"
          type="text"
          :placeholder="raceConfig?.valuePlaceholder ?? '10.42'"
          class="w-20 bg-white/5 border border-white/10 rounded px-1.5 py-1 text-center text-[11px] text-white focus:outline-none focus:border-emerald-500/50"
          :disabled="isCompleted || saving"
        />
        <input
          v-model="row.note"
          type="text"
          placeholder="PB / GR"
          maxlength="12"
          class="w-16 bg-white/5 border border-white/10 rounded px-1.5 py-1 text-center text-[11px] text-white focus:outline-none focus:border-emerald-500/50"
          :disabled="isCompleted || saving"
        />
      </div>
    </div>

    <div v-if="!isCompleted" class="flex justify-center pt-1">
      <button
        class="mc-primary-btn mc-primary-btn--start"
        :disabled="saving || !filledRows.length"
        @click="save"
      >
        <UIcon
          :name="saved ? 'i-heroicons-check' : 'i-heroicons-arrow-down-tray'"
          class="w-4 h-4"
        />
        <span>{{ saving ? 'Saving…' : saved ? 'Saved!' : `Save Results (${filledRows.length})` }}</span>
      </button>
    </div>
    <div v-else class="text-center text-xs text-white/40">
      Match completed — reopen to edit results.
    </div>
  </div>
</template>
