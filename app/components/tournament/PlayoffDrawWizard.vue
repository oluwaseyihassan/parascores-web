<script setup lang="ts">
import type { Participant, Tournament, Fixture } from '~/types'

interface Props {
  open?: boolean
  tournament: Tournament
  participants: Participant[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  'saved': []
}>()

const fixtureStore = useFixtureStore()
const standingStore = useStandingStore()
const toast = useToast()
const { handleError } = useErrors()

const isOpen = computed({
  get: () => props.open || false,
  set: (val) => emit('update:open', val)
})

const viewMode = ref<'bracket' | 'list'>('bracket')
const saving = ref(false)
const isShuffling = ref(false)

// Represents one playoff tie
interface PlayoffTie {
  fixtureId: string
  matchNumber: number
  leg1: Fixture
  leg2?: Fixture
  homeTeamId: string
  awayTeamId: string
}

interface OpponentInfo {
  name: string
  logoUrl?: string
  rank?: number
}

const ties = ref<PlayoffTie[]>([])
const seededPot = ref<Participant[]>([])
const unseededPot = ref<Participant[]>([])

// Helper to get participant display name
const getParticipantName = (p?: Participant | null) => {
  if (!p) return 'TBD'
  return p.customShortName || p.customName || p.user?.name || p.team?.name || 'Unnamed'
}

const getParticipantShort = (id: string): string => {
  const p = props.participants.find((part) => part.id === id)
  if (!p) return 'TBD'
  return p.customShortName || p.customName || p.user?.name || p.team?.name || 'TBD'
}

const getParticipantLogo = (id: string): string | undefined => {
  const p = props.participants.find((part) => part.id === id)
  return p?.logoUrl
}

// Helper to get participant standing rank
const getParticipantRank = (id: string): number | null => {
  const standings = standingStore.standings
  const idx = standings.findIndex((s: any) => s.participant_id === id)
  if (idx !== -1) {
    return standings[idx]?.position || idx + 1
  }
  return null
}

// Helper to get actual Round of 16 top-seeded opponent for tieKey (1 to 8)
const getR16Opponent = (tieKey: number): OpponentInfo => {
  const r1 = fixtureStore.knockoutRounds[1]
  if (r1 !== undefined) {
    const r1Fixtures = fixtureStore.knockoutFixturesByRound[r1] || []
    const matchFixtures = r1Fixtures.filter((f) => {
      const key = f.matchNumber ? Math.ceil(f.matchNumber / 2) : 1
      return key === tieKey
    })
    for (const f of matchFixtures) {
      if (f.homeTeam && !f.homeTeamPlaceholder?.includes('PO(')) {
        return {
          name: getParticipantName(f.homeTeam),
          logoUrl: f.homeTeam.logoUrl,
          rank: getParticipantRank(f.homeTeam.id) || undefined
        }
      }
      if (f.awayTeam && !f.awayTeamPlaceholder?.includes('PO(')) {
        return {
          name: getParticipantName(f.awayTeam),
          logoUrl: f.awayTeam.logoUrl,
          rank: getParticipantRank(f.awayTeam.id) || undefined
        }
      }
      if (f.homeTeamPlaceholder && !f.homeTeamPlaceholder.includes('PO(')) {
        return { name: f.homeTeamPlaceholder }
      }
      if (f.awayTeamPlaceholder && !f.awayTeamPlaceholder.includes('PO(')) {
        return { name: f.awayTeamPlaceholder }
      }
    }
  }

  // Fallback to top 8 standings seeds
  const standings = standingStore.standings
  const standing = standings[tieKey - 1]
  if (standing) {
    const p = props.participants.find((part) => part.id === standing.participant_id)
    if (p) {
      return {
        name: getParticipantName(p),
        logoUrl: p.logoUrl,
        rank: standing.position || tieKey
      }
    }
  }

  return { name: `Top Seed ${tieKey}` }
}

// Build the initial ties and pots from existing fixtures and standings
const initPotsAndTies = () => {
  const r0 = fixtureStore.knockoutRounds[0]
  if (r0 === undefined) return
  const roundFixtures = fixtureStore.knockoutFixturesByRound[r0] || []
  if (!roundFixtures.length) return

  // Group by logical matchup (Leg 1 = odd matchNumber, Leg 2 = even matchNumber)
  const map = new Map<number, Fixture[]>()
  for (const f of roundFixtures) {
    const key = f.matchNumber ? Math.ceil(f.matchNumber / 2) : 1
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(f)
  }

  const sortedKeys = Array.from(map.keys()).sort((a, b) => a - b)
  const builtTies: PlayoffTie[] = []
  const seededIds = new Set<string>()
  const unseededIds = new Set<string>()

  sortedKeys.forEach((key) => {
    const group = map.get(key)!
    group.sort((a, b) => a.matchNumber - b.matchNumber)
    const leg1 = group[0]!
    const leg2 = group[1]

    const homeId = leg1.homeTeamId || ''
    const awayId = leg1.awayTeamId || ''

    if (homeId) seededIds.add(homeId)
    if (awayId) unseededIds.add(awayId)

    builtTies.push({
      fixtureId: leg1.id,
      matchNumber: leg1.matchNumber,
      leg1,
      leg2,
      homeTeamId: homeId,
      awayTeamId: awayId
    })
  })

  ties.value = builtTies

  // Derive pots:
  const standings = standingStore.standings
  if (standings.length >= 16) {
    // Ranks 9 to 16 are seeded, 17 to 24 are unseeded
    const pot1: Participant[] = []
    const pot2: Participant[] = []

    standings.slice(8, 16).forEach((s: any) => {
      const p = props.participants.find((part) => part.id === s.participant_id)
      if (p) pot1.push(p)
    })
    standings.slice(16, 24).forEach((s: any) => {
      const p = props.participants.find((part) => part.id === s.participant_id)
      if (p) pot2.push(p)
    })

    if (pot1.length > 0) seededPot.value = pot1
    if (pot2.length > 0) unseededPot.value = pot2
  }

  // Fallbacks if standings not loaded or fewer items
  if (seededPot.value.length === 0) {
    seededPot.value = props.participants.filter((p) => seededIds.has(p.id))
  }
  if (unseededPot.value.length === 0) {
    unseededPot.value = props.participants.filter((p) => unseededIds.has(p.id))
  }
}

watch(isOpen, (open) => {
  if (open) {
    initPotsAndTies()
  }
})

// Auto-swap when user changes home team on tieIndex
const onHomeTeamChange = (tieIndex: number, newId: string) => {
  const currentTie = ties.value[tieIndex]
  if (!currentTie || currentTie.homeTeamId === newId) return

  const otherTie = ties.value.find((t, i) => i !== tieIndex && t.homeTeamId === newId)
  if (otherTie) {
    otherTie.homeTeamId = currentTie.homeTeamId
  }
  currentTie.homeTeamId = newId
}

// Auto-swap when user changes away team on tieIndex
const onAwayTeamChange = (tieIndex: number, newId: string) => {
  const currentTie = ties.value[tieIndex]
  if (!currentTie || currentTie.awayTeamId === newId) return

  const otherTie = ties.value.find((t, i) => i !== tieIndex && t.awayTeamId === newId)
  if (otherTie) {
    otherTie.awayTeamId = currentTie.awayTeamId
  }
  currentTie.awayTeamId = newId
}

// Swap Home and Away within a single tie
const swapTieHomeAway = (tieIndex: number) => {
  const tie = ties.value[tieIndex]
  if (!tie) return
  const temp = tie.homeTeamId
  tie.homeTeamId = tie.awayTeamId
  tie.awayTeamId = temp
}

// Shuffle Draw: Randomly pair seeded teams with unseeded teams
const shuffleDraw = () => {
  if (seededPot.value.length === 0 || unseededPot.value.length === 0) return

  isShuffling.value = true

  const shuffledSeeded = [...seededPot.value].sort(() => Math.random() - 0.5)
  const shuffledUnseeded = [...unseededPot.value].sort(() => Math.random() - 0.5)

  ties.value.forEach((tie, idx) => {
    if (shuffledSeeded[idx]) {
      tie.homeTeamId = shuffledSeeded[idx]!.id
    }
    if (shuffledUnseeded[idx]) {
      tie.awayTeamId = shuffledUnseeded[idx]!.id
    }
  })

  setTimeout(() => {
    isShuffling.value = false
    toast.add({
      title: 'Play-off Draw Completed!',
      description: 'Random pairings generated between seeded and unseeded pots.',
      color: 'success',
      icon: 'i-heroicons-sparkles'
    })
  }, 300)
}

// Reset to canonical inverted seeding (9 vs 24, 10 vs 23...)
const resetInvertedSeeding = () => {
  const standings = standingStore.standings
  if (standings.length >= 24) {
    const s9to16 = standings.slice(8, 16)
    const s17to24 = standings.slice(16, 24)

    ties.value.forEach((tie, idx) => {
      const seededStanding = s9to16[idx]
      const unseededStanding = s17to24[s17to24.length - 1 - idx]

      if (seededStanding) tie.homeTeamId = seededStanding.participant_id
      if (unseededStanding) tie.awayTeamId = unseededStanding.participant_id
    })

    toast.add({
      title: 'Reset to Inverted Seeding',
      description: 'Matches paired as 9v24, 10v23, 11v22, etc.',
      color: 'neutral',
      icon: 'i-heroicons-arrow-path'
    })
  } else {
    ties.value.forEach((tie, idx) => {
      if (seededPot.value[idx]) tie.homeTeamId = seededPot.value[idx]!.id
      const unseededIdx = unseededPot.value.length - 1 - idx
      if (unseededPot.value[unseededIdx]) tie.awayTeamId = unseededPot.value[unseededIdx]!.id
    })
  }
}

// Save all pairings
const handleSave = async () => {
  saving.value = true
  try {
    const pairingsPayload = ties.value.map((t) => ({
      fixtureId: t.fixtureId,
      homeTeamId: t.homeTeamId,
      awayTeamId: t.awayTeamId
    }))

    await fixtureStore.updateKnockoutPairings(props.tournament.id, pairingsPayload)

    toast.add({
      title: 'Play-off Pairings Saved',
      description: 'The bracket has been updated with your new playoff matchups.',
      color: 'success',
      icon: 'i-heroicons-check-circle'
    })

    emit('saved')
    isOpen.value = false
  } catch (err: any) {
    handleError(err, { title: 'Failed to save pairings' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal v-model:open="isOpen" :ui="{ content: 'sm:max-w-6xl w-full' }">
    <template #content>
      <UCard class="ring-0 shadow-none" :ui="{ root: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <!-- Modal Header -->
        <template #header>
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <UIcon name="i-heroicons-sparkles" class="w-5 h-5" />
              </div>
              <div>
                <h3 class="text-base font-bold text-gray-900 dark:text-white leading-tight">
                  Knockout Play-off Draw & Bracket Flow
                </h3>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  Pair teams for the Knockout Play-offs and visualize how they feed into the Round of 16 and Quarter-finals
                </p>
              </div>
            </div>

            <!-- Controls: View mode & close -->
            <div class="flex items-center gap-2">
              <div class="flex items-center rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5 border border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  @click="viewMode = 'bracket'"
                  class="px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5"
                  :class="viewMode === 'bracket' ? 'bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'"
                >
                  <UIcon name="i-heroicons-rectangle-group" class="w-3.5 h-3.5" />
                  Bracket Flow
                </button>
                <button
                  type="button"
                  @click="viewMode = 'list'"
                  class="px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5"
                  :class="viewMode === 'list' ? 'bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'"
                >
                  <UIcon name="i-heroicons-list-bullet" class="w-3.5 h-3.5" />
                  Form List
                </button>
              </div>

              <UButton
                color="neutral"
                variant="ghost"
                icon="i-heroicons-x-mark"
                class="-my-1"
                @click="isOpen = false"
              />
            </div>
          </div>
        </template>

        <div class="py-4 space-y-4 max-h-[calc(100dvh-200px)] overflow-y-auto px-1">
          <!-- Pots Summary Banners & Action Bar -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <!-- Seeded Pot -->
            <div class="rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5">
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <UIcon name="i-heroicons-star" class="w-3.5 h-3.5 text-emerald-500" />
                  Seeded Pot (9th–16th)
                </span>
                <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                  {{ seededPot.length }} teams
                </span>
              </div>
              <div class="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto pr-1">
                <div
                  v-for="p in seededPot"
                  :key="p.id"
                  class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white dark:bg-gray-900 border border-emerald-200/60 dark:border-emerald-800/40 text-[11px] text-gray-800 dark:text-gray-200 shadow-xs"
                >
                  <span v-if="getParticipantRank(p.id)" class="text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    #{{ getParticipantRank(p.id) }}
                  </span>
                  <img v-if="p.logoUrl" :src="p.logoUrl" class="w-3 h-3 rounded-full object-cover" />
                  <span class="truncate max-w-[90px]">{{ getParticipantName(p) }}</span>
                </div>
              </div>
            </div>

            <!-- Unseeded Pot -->
            <div class="rounded-xl border border-sky-200 dark:border-sky-900/40 bg-sky-50/50 dark:bg-sky-950/20 p-2.5">
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-xs font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                  <UIcon name="i-heroicons-shield-check" class="w-3.5 h-3.5 text-sky-500" />
                  Unseeded Pot (17th–24th)
                </span>
                <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300">
                  {{ unseededPot.length }} teams
                </span>
              </div>
              <div class="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto pr-1">
                <div
                  v-for="p in unseededPot"
                  :key="p.id"
                  class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white dark:bg-gray-900 border border-sky-200/60 dark:border-sky-800/40 text-[11px] text-gray-800 dark:text-gray-200 shadow-xs"
                >
                  <span v-if="getParticipantRank(p.id)" class="text-[9px] font-mono font-bold text-sky-600 dark:text-sky-400">
                    #{{ getParticipantRank(p.id) }}
                  </span>
                  <img v-if="p.logoUrl" :src="p.logoUrl" class="w-3 h-3 rounded-full object-cover" />
                  <span class="truncate max-w-[90px]">{{ getParticipantName(p) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Action bar -->
          <div class="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-gray-100 dark:border-gray-800">
            <span class="text-xs font-bold text-gray-700 dark:text-gray-300">
              {{ viewMode === 'bracket' ? 'Interactive Knockout Bracket Flow' : `Matchup Pairings (${ties.length} Matches)` }}
            </span>
            <div class="flex items-center gap-2">
              <UButton
                size="xs"
                color="primary"
                variant="solid"
                icon="i-heroicons-sparkles"
                :loading="isShuffling"
                label="Shuffle Draw (UEFA Style)"
                @click="shuffleDraw"
              />
              <UButton
                size="xs"
                color="neutral"
                variant="outline"
                icon="i-heroicons-arrow-path"
                label="Default Seeding"
                @click="resetInvertedSeeding"
              />
            </div>
          </div>

          <!-- ══════════════════════════════════════════════════════════ -->
          <!-- VIEW 1: BRACKET FLOW VIEW                                  -->
          <!-- ══════════════════════════════════════════════════════════ -->
          <div v-if="viewMode === 'bracket'" class="overflow-x-auto pb-4">
            <div class="min-w-[880px]">
              <!-- Column Headers -->
              <div class="grid grid-cols-[280px_48px_250px_48px_240px] items-center mb-3 text-center">
                <div class="bracket-col-header">
                  <span>Knockout Play-offs (Select)</span>
                </div>
                <div />
                <div class="bracket-col-header">
                  <span>Round of 16 (Top Seeds)</span>
                </div>
                <div />
                <div class="bracket-col-header">
                  <span>Quarter-finals (Preview)</span>
                </div>
              </div>

              <!-- Bracket Grid -->
              <div class="grid grid-cols-[280px_48px_250px_48px_240px] gap-0">
                <!-- ── Column 1: Play-offs (8 Matches, 16 rows) ─────── -->
                <div class="grid grid-rows-[repeat(16,minmax(64px,auto))] gap-0">
                  <div
                    v-for="(tie, idx) in ties"
                    :key="tie.fixtureId"
                    class="py-1 flex flex-col justify-center"
                    :style="{ gridRow: `${idx * 2 + 1} / ${idx * 2 + 3}` }"
                  >
                    <div class="flow-card flow-card--playoff">
                      <!-- Card Header -->
                      <div class="flow-card__header">
                        <span class="text-[10px] font-bold text-gray-500">
                          Play-off {{ idx + 1 }}
                        </span>
                        <button
                          type="button"
                          @click="swapTieHomeAway(idx)"
                          title="Swap Home/Away"
                          class="p-0.5 rounded text-gray-400 hover:text-emerald-500 transition-colors"
                        >
                          <UIcon name="i-heroicons-arrows-right-left" class="w-3 h-3" />
                        </button>
                      </div>

                      <!-- Home Team Row (Seeded Pot) -->
                      <div class="flow-card__team-row">
                        <span class="team-pot-tag team-pot-tag--seeded">SEED</span>
                        <select
                          :value="tie.homeTeamId"
                          class="team-select"
                          @change="(e: any) => onHomeTeamChange(idx, e.target.value)"
                        >
                          <option v-for="p in seededPot" :key="p.id" :value="p.id">
                            {{ getParticipantRank(p.id) ? `[#${getParticipantRank(p.id)}] ` : '' }}{{ getParticipantName(p) }}
                          </option>
                        </select>
                      </div>

                      <div class="flow-card__divider" />

                      <!-- Away Team Row (Unseeded Pot) -->
                      <div class="flow-card__team-row">
                        <span class="team-pot-tag team-pot-tag--unseeded">UNSEED</span>
                        <select
                          :value="tie.awayTeamId"
                          class="team-select"
                          @change="(e: any) => onAwayTeamChange(idx, e.target.value)"
                        >
                          <option v-for="p in unseededPot" :key="p.id" :value="p.id">
                            {{ getParticipantRank(p.id) ? `[#${getParticipantRank(p.id)}] ` : '' }}{{ getParticipantName(p) }}
                          </option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- ── Connector Column 1: Straight lines 8x ─────────── -->
                <div class="grid grid-rows-[repeat(16,minmax(64px,auto))] w-12">
                  <div
                    v-for="(_, idx) in ties"
                    :key="`conn-r0-${idx}`"
                    class="relative"
                    :style="{ gridRow: `${idx * 2 + 1} / ${idx * 2 + 3}` }"
                  >
                    <svg class="w-full h-full absolute inset-0" viewBox="0 0 48 100" preserveAspectRatio="none">
                      <path d="M 0 50 L 48 50" class="draw-connector-line" />
                    </svg>
                  </div>
                </div>

                <!-- ── Column 2: Round of 16 (8 Matches, 16 rows) ────── -->
                <div class="grid grid-rows-[repeat(16,minmax(64px,auto))] gap-0">
                  <div
                    v-for="(tie, idx) in ties"
                    :key="`r16-${idx}`"
                    class="py-1 flex flex-col justify-center"
                    :style="{ gridRow: `${idx * 2 + 1} / ${idx * 2 + 3}` }"
                  >
                    <div class="flow-card flow-card--r16">
                      <!-- Card Header -->
                      <div class="flow-card__header">
                        <span class="text-[10px] font-bold text-gray-500">
                          R16 Match {{ idx + 1 }}
                        </span>
                      </div>

                      <!-- Seeded Top Team -->
                      <div class="flow-card__team-row">
                        <span v-if="getR16Opponent(idx + 1).rank" class="text-[10px] font-mono font-bold text-amber-500">
                          #{{ getR16Opponent(idx + 1).rank }}
                        </span>
                        <img
                          v-if="getR16Opponent(idx + 1).logoUrl"
                          :src="getR16Opponent(idx + 1).logoUrl"
                          class="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                        />
                        <span class="text-xs font-bold text-gray-900 dark:text-white truncate">
                          {{ getR16Opponent(idx + 1).name }}
                        </span>
                      </div>

                      <div class="flow-card__divider" />

                      <!-- Feeder Playoff Winner Preview -->
                      <div class="flow-card__team-row flex-col items-start gap-0.5 py-1">
                        <div class="flex items-center gap-1.5 w-full">
                          <UIcon name="i-heroicons-arrow-right-circle" class="w-3 h-3 text-emerald-500 shrink-0" />
                          <span class="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                            PO({{ idx + 1 }}) Winner
                          </span>
                        </div>
                        <span class="text-[9px] text-gray-400 dark:text-gray-500 truncate pl-4.5 block max-w-full">
                          {{ getParticipantShort(tie.homeTeamId) }} or {{ getParticipantShort(tie.awayTeamId) }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- ── Connector Column 2: 2-to-1 Forks 4x ────────────── -->
                <div class="grid grid-rows-[repeat(16,minmax(64px,auto))] w-12">
                  <div
                    v-for="pairIdx in 4"
                    :key="`conn-r1-${pairIdx}`"
                    class="relative"
                    :style="{ gridRow: `${(pairIdx - 1) * 4 + 1} / ${(pairIdx - 1) * 4 + 5}` }"
                  >
                    <svg class="w-full h-full absolute inset-0" viewBox="0 0 48 100" preserveAspectRatio="none">
                      <!-- Top R16 match arm -->
                      <path d="M 0 25 L 24 25 L 24 50" class="draw-connector-line" />
                      <!-- Bottom R16 match arm -->
                      <path d="M 0 75 L 24 75 L 24 50" class="draw-connector-line" />
                      <!-- Midpoint to QF -->
                      <path d="M 24 50 L 48 50" class="draw-connector-line" />
                    </svg>
                  </div>
                </div>

                <!-- ── Column 3: Quarter-finals (4 Matches, 16 rows) ─── -->
                <div class="grid grid-rows-[repeat(16,minmax(64px,auto))] gap-0">
                  <div
                    v-for="qfIdx in 4"
                    :key="`qf-${qfIdx}`"
                    class="py-1 flex flex-col justify-center"
                    :style="{ gridRow: `${(qfIdx - 1) * 4 + 1} / ${(qfIdx - 1) * 4 + 5}` }"
                  >
                    <div class="flow-card flow-card--qf">
                      <!-- Card Header -->
                      <div class="flow-card__header">
                        <span class="text-[10px] font-bold text-gray-500">
                          Quarter Final {{ qfIdx }}
                        </span>
                      </div>

                      <!-- Top R16 Winner -->
                      <div class="flow-card__team-row flex-col items-start gap-0.5 py-1.5 border-b border-gray-100 dark:border-white/5">
                        <div class="flex items-center gap-1.5 w-full">
                          <span class="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          <span class="text-[11px] font-semibold text-gray-800 dark:text-gray-200 truncate">
                            R16({{ (qfIdx - 1) * 2 + 1 }}) Winner
                          </span>
                        </div>
                        <span class="text-[9px] text-gray-400 pl-3 truncate block max-w-full">
                          {{ getR16Opponent((qfIdx - 1) * 2 + 1).name }} / PO({{ (qfIdx - 1) * 2 + 1 }})
                        </span>
                      </div>

                      <!-- Bottom R16 Winner -->
                      <div class="flow-card__team-row flex-col items-start gap-0.5 py-1.5">
                        <div class="flex items-center gap-1.5 w-full">
                          <span class="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          <span class="text-[11px] font-semibold text-gray-800 dark:text-gray-200 truncate">
                            R16({{ (qfIdx - 1) * 2 + 2 }}) Winner
                          </span>
                        </div>
                        <span class="text-[9px] text-gray-400 pl-3 truncate block max-w-full">
                          {{ getR16Opponent((qfIdx - 1) * 2 + 2).name }} / PO({{ (qfIdx - 1) * 2 + 2 }})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ══════════════════════════════════════════════════════════ -->
          <!-- VIEW 2: FORM LIST VIEW                                     -->
          <!-- ══════════════════════════════════════════════════════════ -->
          <div v-else class="space-y-3">
            <div
              v-for="(tie, idx) in ties"
              :key="tie.fixtureId"
              class="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 hover:border-gray-300 dark:hover:border-gray-700 transition-all shadow-xs"
            >
              <!-- Card Header -->
              <div class="flex items-center justify-between mb-2.5">
                <div class="flex items-center gap-2">
                  <span class="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 text-[10px] font-bold text-gray-600 dark:text-gray-400 flex items-center justify-center">
                    {{ idx + 1 }}
                  </span>
                  <span class="text-xs font-bold text-gray-900 dark:text-white">
                    Play-off Match {{ idx + 1 }}
                  </span>
                </div>
                <div class="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <UIcon name="i-heroicons-arrow-right" class="w-3 h-3" />
                  Winner plays <strong class="font-bold underline">{{ getR16Opponent(idx + 1).name }}</strong> in Round of 16
                </div>
              </div>

              <!-- Match Selector Grid -->
              <div class="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-2.5">
                <!-- Home Team (Seeded Pot) -->
                <div>
                  <label class="block text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">
                    Home Team (Seeded)
                  </label>
                  <select
                    :value="tie.homeTeamId"
                    class="w-full text-xs py-2 px-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                    @change="(e: any) => onHomeTeamChange(idx, e.target.value)"
                  >
                    <option v-for="p in seededPot" :key="p.id" :value="p.id">
                      {{ getParticipantRank(p.id) ? `[#${getParticipantRank(p.id)}] ` : '' }}{{ getParticipantName(p) }}
                    </option>
                  </select>
                </div>

                <!-- VS & Swap Button -->
                <div class="flex flex-col items-center justify-center pt-3 sm:pt-4">
                  <button
                    type="button"
                    class="p-1.5 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    title="Swap Home/Away"
                    @click="swapTieHomeAway(idx)"
                  >
                    <UIcon name="i-heroicons-arrows-right-left" class="w-3.5 h-3.5" />
                  </button>
                </div>

                <!-- Away Team (Unseeded Pot) -->
                <div>
                  <label class="block text-[10px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider mb-1">
                    Away Team (Unseeded)
                  </label>
                  <select
                    :value="tie.awayTeamId"
                    class="w-full text-xs py-2 px-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all"
                    @change="(e: any) => onAwayTeamChange(idx, e.target.value)"
                  >
                    <option v-for="p in unseededPot" :key="p.id" :value="p.id">
                      {{ getParticipantRank(p.id) ? `[#${getParticipantRank(p.id)}] ` : '' }}{{ getParticipantName(p) }}
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <template #footer>
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <span class="text-xs text-gray-500">
              Matches will be synced across both legs automatically.
            </span>
            <div class="flex items-center gap-2.5">
              <UButton
                color="neutral"
                variant="outline"
                label="Cancel"
                :disabled="saving"
                @click="isOpen = false"
              />
              <UButton
                color="primary"
                icon="i-heroicons-check"
                :loading="saving"
                label="Save Playoff Matches"
                @click="handleSave"
              />
            </div>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<style scoped>
/* ── Bracket Column Header ──────────────────────────────── */
.bracket-col-header span {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #6b7280;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  display: inline-block;
}

:root.dark .bracket-col-header span {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.08);
  color: #9ca3af;
}

/* ── Flow Cards ─────────────────────────────────────────── */
.flow-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 0.15s, box-shadow 0.15s;
}

:root.dark .flow-card {
  background: #141414;
  border-color: rgba(255, 255, 255, 0.08);
}

.flow-card--playoff {
  border-left: 3px solid #10b981;
}

.flow-card--r16 {
  border-left: 3px solid #f59e0b;
  background: #fafafa;
}

:root.dark .flow-card--r16 {
  background: #121212;
}

.flow-card--qf {
  border-left: 3px solid #6366f1;
  background: #f9fafb;
}

:root.dark .flow-card--qf {
  background: #111111;
}

.flow-card__header {
  padding: 0.25rem 0.5rem;
  background: rgba(0, 0, 0, 0.02);
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

:root.dark .flow-card__header {
  background: rgba(255, 255, 255, 0.02);
  border-bottom-color: rgba(255, 255, 255, 0.05);
}

.flow-card__team-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.5rem;
  min-width: 0;
}

.flow-card__divider {
  height: 1px;
  background: #f3f4f6;
  margin: 0 0.5rem;
}

:root.dark .flow-card__divider {
  background: rgba(255, 255, 255, 0.04);
}

/* ── Select inside Playoff Card ─────────────────────────── */
.team-select {
  width: 100%;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.2rem 0.35rem;
  border-radius: 4px;
  border: 1px solid transparent;
  background: transparent;
  color: inherit;
  outline: none;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.team-select:hover {
  background: rgba(0, 0, 0, 0.04);
}

:root.dark .team-select:hover {
  background: rgba(255, 255, 255, 0.05);
}

.team-select:focus {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.05);
}

/* ── Pot Tags ───────────────────────────────────────────── */
.team-pot-tag {
  font-size: 0.55rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
  flex-shrink: 0;
}

.team-pot-tag--seeded {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}

:root.dark .team-pot-tag--seeded {
  color: #34d399;
}

.team-pot-tag--unseeded {
  background: rgba(14, 165, 233, 0.12);
  color: #0284c7;
}

:root.dark .team-pot-tag--unseeded {
  color: #38bdf8;
}

/* ── SVG Connectors ─────────────────────────────────────── */
.draw-connector-line {
  stroke: #d1d5db;
  stroke-width: 1.5;
  fill: none;
  vector-effect: non-scaling-stroke;
}

:root.dark .draw-connector-line {
  stroke: rgba(255, 255, 255, 0.15);
}
</style>
