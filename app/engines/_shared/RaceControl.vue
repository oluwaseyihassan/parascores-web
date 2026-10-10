<script setup lang="ts">
import { FixtureStatus } from '~/types'
import type { Fixture, Participant, ResultEntry } from '~/types'
import { SportEngineKey } from '~/engines/types'

const props = defineProps<{
  fixture: Fixture
  tournament?: any
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'fixture-updated': [fixture: Fixture]
}>()

const engine = inject(SportEngineKey)
const raceConfig = computed(() => engine?.value.race)
const direction = computed(() => raceConfig.value?.direction ?? 'low')

const participantStore = useParticipantStore()
const { handleError } = useErrors()
const toast = useToast()

interface ResultRow {
  participantId: string
  name: string
  shortName: string
  logoUrl: string | null
  lane: number | null
  value: string
  note: string
  status: '' | 'DNF' | 'DNS' | 'DQ'
  rankOverride: number | null
  entered: boolean
}

const STATUS_OPTIONS = ['DNF', 'DNS', 'DQ'] as const

const rows = ref<ResultRow[]>([])
const conditions = ref('')
const loading = ref(false)
const publishing = ref(false)

const isCompleted = computed(() => props.fixture.status === FixtureStatus.COMPLETED)

// Parse "10.42" / "2:03.44" / "1:02:33.5" to comparable seconds
const toSeconds = (v: string): number => {
  const parts = v.split(':')
  if (parts.length === 3) return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2])
  if (parts.length === 2) return Number(parts[0]) * 60 + Number(parts[1])
  return Number(v)
}

// Live rank preview — sorts as values are typed (empty values sink to bottom)
const rankByParticipant = computed(() => {
  const map = new Map<string, number>()
  rows.value
    .filter((r) => r.entered && r.value.trim() !== '' && !Number.isNaN(toSeconds(r.value.trim())))
    .slice()
    .sort((a, b) =>
      direction.value === 'high'
        ? toSeconds(b.value.trim()) - toSeconds(a.value.trim())
        : toSeconds(a.value.trim()) - toSeconds(b.value.trim()),
    )
    .forEach((r, i) => map.set(r.participantId, i + 1))
  return map
})

// A row counts as recorded if entered AND has a time, a status, or a manual rank
const rowRecorded = (r: ResultRow) =>
  r.entered && (r.value.trim() !== '' || r.status !== '' || r.rankOverride != null)

const filledCount = computed(() => rows.value.filter(rowRecorded).length)

const init = () => {
  const existingEntries = props.fixture.resultEntries ?? []
  const hasExistingEntries = existingEntries.length > 0
  const existing = new Map(
    existingEntries.map((e: ResultEntry) => [e.participantId, e]),
  )
  rows.value = participantStore.participants.map((p: Participant) => {
    const entry = existing.get(p.id)
    const isStatus = STATUS_OPTIONS.includes(entry?.value as any)
    return {
      participantId: p.id,
      name: p.customName ?? 'Unknown',
      shortName: p.customShortName ?? '',
      logoUrl: p.logoUrl ?? null,
      lane: entry?.lane ?? null,
      value: isStatus ? '' : (entry?.value ?? ''),
      note: entry?.note ?? '',
      status: isStatus ? (entry?.value as ResultRow['status']) : '',
      rankOverride: entry?.rank ?? null,
      // If results exist, entry presence defines entry; otherwise all entered by default
      entered: hasExistingEntries ? !!entry : true,
    }
  })
  conditions.value = (props.fixture.config as any)?.conditions ?? ''
}

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    loading.value = true
    try {
      if (props.fixture.tournament_id) {
        await participantStore.fetchParticipants(props.fixture.tournament_id)
      }
      init()
    } finally {
      loading.value = false
    }
  },
  { immediate: true },
)

const close = () => emit('update:open', false)

const publish = async () => {
  if (!filledCount.value) return
  publishing.value = true
  try {
    // 1. Save results (server computes official ranks)
    const res = await $api<{ success: boolean; data?: Fixture }>(
      `/fixtures/${props.fixture.id}/results`,
      {
        method: 'PUT',
        body: {
          direction: direction.value,
          results: rows.value
            .filter(rowRecorded)
            .map((r) => ({
              participantId: r.participantId,
              // Status entries (DNF/DNS/DQ) save as the value; server leaves them unranked
              value: r.status || r.value.trim() || undefined,
              lane: r.lane ?? undefined,
              note: r.note.trim() || undefined,
              rank: r.rankOverride ?? undefined,
            })),
        },
      },
    )
    const saved = res.data

    // 2. Persist conditions + complete the fixture in one step
    const completeRes = await $api<{ success: boolean; data?: Fixture }>(
      `/fixtures/${props.fixture.id}`,
      {
        method: 'PATCH',
        body: {
          status: FixtureStatus.COMPLETED,
          config: {
            ...((props.fixture.config as any) ?? {}),
            conditions: conditions.value.trim() || undefined,
          },
        },
      },
    )

    const finalFixture = completeRes.data ?? saved
    if (finalFixture) emit('fixture-updated', finalFixture)
    toast.add({
      title: 'Official Result Published',
      description: 'Results are live and medals have been awarded.',
      color: 'success',
    })
    close()
  } catch (error: any) {
    handleError(error, { title: 'Failed to publish result' })
  } finally {
    publishing.value = false
  }
}

const medalForRank = (rank: number | undefined) =>
  rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : ''

// Tap-to-assign placement mode: tap athletes in finish order
const placementMode = ref(false)

const nextAvailableRank = computed(() => {
  const taken = new Set(rows.value.map((r) => r.rankOverride).filter((r) => r != null))
  let rank = 1
  while (taken.has(rank)) rank++
  return rank
})

const togglePlacement = (row: ResultRow) => {
  if (!row.entered) return
  if (row.rankOverride != null) {
    row.rankOverride = null // unassign
  } else {
    row.rankOverride = nextAvailableRank.value
    row.value = ''
    row.status = ''
  }
}

const clearPlacements = () => {
  rows.value.forEach((r) => (r.rankOverride = null))
}

// Cycle: time entry → DNF → DNS → DQ → back to time
const cycleStatus = (row: ResultRow) => {
  const order: ResultRow['status'][] = ['', 'DNF', 'DNS', 'DQ']
  const idx = order.indexOf(row.status)
  row.status = order[(idx + 1) % order.length] ?? ''
  if (row.status) row.value = ''
}
</script>

<template>
  <UModal
    :open="open"
    :ui="{ content: 'max-w-4xl w-full max-h-[90vh]' }"
    @update:open="emit('update:open', $event)"
  >
    <template #content>
      <div class="bg-gray-950 text-white flex flex-col max-h-[90vh] rounded-2xl overflow-hidden">
        <!-- Header -->
        <div class="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-white/10 bg-gray-950/95 z-10 shrink-0">
          <UIcon name="i-heroicons-flag" class="w-5 h-5 text-emerald-400" />
          <div class="flex-1 min-w-0">
            <h2 class="font-black text-lg truncate">
              {{ props.tournament?.name }} · {{ fixture.roundName || 'Final' }}
            </h2>
            <p class="text-[11px] text-white/40 uppercase tracking-wider">
              {{ engine?.label ?? 'Race' }} control
            </p>
          </div>
          <span
            class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
            :class="isCompleted ? 'bg-emerald-500/15 text-emerald-400' : 'bg-sky-500/15 text-sky-400'"
          >
            {{ fixture.status }}
          </span>
          <button class="text-white/50 hover:text-white p-1" @click="close">
            <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-4 sm:px-6 py-5 max-w-4xl mx-auto w-full space-y-6">
          <!-- Conditions -->
          <div class="flex items-center gap-3">
            <label class="text-[10px] font-bold text-white/40 uppercase tracking-wider shrink-0">
              Conditions
            </label>
            <input
              v-model="conditions"
              type="text"
              placeholder="e.g. Wind +0.4 m/s · Lane 4 wet"
              class="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              :disabled="isCompleted"
            />
          </div>

          <!-- Results grid -->
          <div v-if="loading" class="text-center text-sm text-white/40 py-10">
            Loading participants…
          </div>

          <div v-else class="space-y-1.5">
            <!-- Placement mode toggle -->
            <div v-if="!isCompleted" class="flex items-center justify-between px-1 pb-1">
              <button
                type="button"
                class="flex items-center gap-2 text-xs font-bold transition-colors"
                :class="placementMode ? 'text-amber-400' : 'text-white/50 hover:text-white'"
                @click="placementMode = !placementMode"
              >
                <UIcon :name="placementMode ? 'i-heroicons-numbered-list' : 'i-heroicons-queue-list'" class="w-4 h-4" />
                {{ placementMode ? 'Placement mode ON — tap athletes in finish order' : 'Assign places by tapping' }}
              </button>
              <button
                v-if="placementMode && rows.some((r) => r.rankOverride != null)"
                type="button"
                class="text-[10px] text-white/40 hover:text-white underline"
                @click="clearPlacements"
              >
                Clear places
              </button>
            </div>

            <div
              v-for="row in rows"
              :key="row.participantId"
              class="px-3 py-2.5 rounded-xl border transition-colors"
              :class="[
                (rankByParticipant.get(row.participantId) === 1 && row.value) || row.rankOverride === 1
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-white/[0.03] border-white/[0.06]',
                placementMode ? 'cursor-pointer select-none active:scale-[0.99]' : '',
                placementMode && row.rankOverride != null ? 'border-emerald-500/40 bg-emerald-500/10' : '',
              ]"
              @click="placementMode && togglePlacement(row)"
            >
              <!-- Top line: entered toggle + rank + athlete -->
              <div class="flex items-center gap-2.5 min-w-0" :class="{ 'opacity-40': !row.entered }">
                <button
                  v-if="!isCompleted"
                  type="button"
                  class="shrink-0"
                  :title="row.entered ? 'Not participating in this event — remove' : 'Include in this event'"
                  @click.stop="row.entered = !row.entered"
                >
                  <UIcon
                    :name="row.entered ? 'i-heroicons-check-circle-solid' : 'i-heroicons-minus-circle'"
                    class="w-4 h-4"
                    :class="row.entered ? 'text-emerald-500' : 'text-white/30'"
                  />
                </button>
                <span
                  class="w-7 shrink-0 text-sm font-black text-center flex items-center justify-center"
                  :class="placementMode && row.rankOverride == null ? 'text-white/20' : ''"
                >
                  <!-- Manual rank entry when no time/status (non-placement mode) -->
                  <input
                    v-if="!placementMode && !row.value && !row.status && !isCompleted"
                    v-model.number="row.rankOverride"
                    type="number"
                    min="1"
                    :max="rows.length"
                    placeholder="#"
                    class="w-7 bg-white/5 border border-white/10 rounded px-0.5 py-1 text-center text-xs text-white focus:outline-none focus:border-emerald-500/50"
                    title="Assign place manually (no time recorded)"
                    @click.stop
                  />
                  <span
                    v-else-if="placementMode && row.rankOverride == null"
                    class="w-6 h-6 rounded-full border-2 border-dashed border-white/20 inline-block"
                  />
                  <template v-else-if="row.rankOverride != null">
                    <span :class="row.rankOverride <= 3 ? '' : 'text-white/40'">
                      {{ medalForRank(row.rankOverride) || row.rankOverride }}
                    </span>
                  </template>
                  <template v-else-if="row.value && rankByParticipant.get(row.participantId)">
                    <span :class="(rankByParticipant.get(row.participantId) ?? 0) <= 3 ? '' : 'text-white/40'">
                      {{ medalForRank(rankByParticipant.get(row.participantId)) || rankByParticipant.get(row.participantId) }}
                    </span>
                  </template>
                  <span v-else class="text-white/20">–</span>
                </span>
                <img
                  v-if="row.logoUrl"
                  :src="row.logoUrl"
                  :alt="row.name"
                  class="w-6 h-6 rounded object-contain bg-white/5 p-0.5 shrink-0"
                />
                <div class="min-w-0 flex-1">
                  <div class="text-sm font-bold truncate">{{ row.name }}</div>
                  <div v-if="row.shortName" class="text-[10px] text-white/40 font-mono">{{ row.shortName }}</div>
                </div>
              </div>

              <!-- Inputs line (never triggers placement toggle; hidden when not entered) -->
              <div v-if="row.entered" class="flex items-center gap-2 mt-2 pl-9 sm:pl-0" @click.stop>
                <input
                  v-model.number="row.lane"
                  type="number"
                  min="1"
                  max="12"
                  placeholder="Ln"
                  class="bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-center text-sm text-white focus:outline-none focus:border-emerald-500/50 w-14 shrink-0"
                  :disabled="isCompleted"
                />

                <div class="flex items-center gap-1 flex-1 min-w-0">
                  <input
                    v-if="!row.status"
                    v-model="row.value"
                    type="text"
                    :placeholder="raceConfig?.valuePlaceholder ?? '10.42'"
                    class="bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-center text-sm font-black text-white focus:outline-none focus:border-emerald-500/50 w-full tabular-nums"
                    :class="rankByParticipant.get(row.participantId) === 1 && row.value ? 'border-amber-500/50 text-amber-300' : ''"
                    :disabled="isCompleted"
                  />
                  <span
                    v-else
                    class="w-full text-center text-xs font-black text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-2 py-2"
                  >
                    {{ row.status }}
                  </span>
                  <button
                    v-if="!isCompleted"
                    type="button"
                    class="text-white/30 hover:text-white text-[10px] font-bold shrink-0 px-1"
                    :title="row.status ? 'Back to time entry' : 'Mark DNF / DNS / DQ'"
                    @click="cycleStatus(row)"
                  >
                    <UIcon :name="row.status ? 'i-heroicons-arrow-uturn-left' : 'i-heroicons-no-symbol'" class="w-3.5 h-3.5" />
                  </button>
                </div>

                <input
                  v-model="row.note"
                  type="text"
                  placeholder="PB / GR"
                  maxlength="12"
                  class="bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-center text-xs text-white focus:outline-none focus:border-emerald-500/50 w-16 sm:w-20 shrink-0"
                  :disabled="isCompleted"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="border-t border-white/10 px-4 sm:px-6 py-4 bg-gray-950/95 shrink-0">
          <div class="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <span class="text-xs text-white/40">
              {{ filledCount }} of {{ rows.length }} results entered
            </span>
            <div class="flex items-center gap-3">
              <UButton color="neutral" variant="ghost" @click="close">
                {{ isCompleted ? 'Close' : 'Cancel' }}
              </UButton>
              <UButton
                v-if="!isCompleted"
                color="primary"
                size="lg"
                icon="i-heroicons-check-badge"
                :loading="publishing"
                :disabled="!filledCount"
                @click="publish"
              >
                Publish Official Result
              </UButton>
              <span v-else class="text-xs text-emerald-400 font-bold flex items-center gap-1">
                <UIcon name="i-heroicons-check-badge" class="w-4 h-4" />
                Official result published
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
