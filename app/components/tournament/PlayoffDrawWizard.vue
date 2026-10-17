<script setup lang="ts">
import type { Participant, Tournament, Fixture } from '~/types'
import { FixtureStatus } from '~/types'

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
  r16OpponentName?: string
}

const ties = ref<PlayoffTie[]>([])
const seededPot = ref<Participant[]>([])
const unseededPot = ref<Participant[]>([])

// Helper to get participant display name
const getParticipantName = (p?: Participant | null) => {
  if (!p) return 'TBD'
  return p.customShortName || p.customName || p.user?.name || p.team?.name || 'Unnamed'
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

  // Find R16 opponents (Round 1) if present
  const r1 = fixtureStore.knockoutRounds[1]
  const r1Fixtures = r1 !== undefined ? (fixtureStore.knockoutFixturesByRound[r1] || []) : []
  const r1HomeTeamsByTie = new Map<number, string>()
  for (const f of r1Fixtures) {
    const key = f.matchNumber ? Math.ceil(f.matchNumber / 2) : 1
    if (f.homeTeam) {
      r1HomeTeamsByTie.set(key, getParticipantName(f.homeTeam))
    } else if (f.homeTeamPlaceholder) {
      r1HomeTeamsByTie.set(key, f.homeTeamPlaceholder)
    }
  }

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
      awayTeamId: awayId,
      r16OpponentName: r1HomeTeamsByTie.get(key) || `R16 Match ${key}`
    })
  })

  ties.value = builtTies

  // Derive pots:
  // If standings are available and match count (e.g. 24 teams, ranks 9-16 and 17-24):
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

  // Fallback if standings wasn't used or had fewer items: use currently assigned teams
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

// Auto-swap when user changes home team (Seeded Pot) on tieIndex
const onHomeTeamChange = (tieIndex: number, newId: string) => {
  const currentTie = ties.value[tieIndex]
  if (!currentTie || currentTie.homeTeamId === newId) return

  // Find if another tie already has newId as home
  const otherTie = ties.value.find((t, i) => i !== tieIndex && t.homeTeamId === newId)
  if (otherTie) {
    // Swap
    otherTie.homeTeamId = currentTie.homeTeamId
  }
  currentTie.homeTeamId = newId
}

// Auto-swap when user changes away team (Unseeded Pot) on tieIndex
const onAwayTeamChange = (tieIndex: number, newId: string) => {
  const currentTie = ties.value[tieIndex]
  if (!currentTie || currentTie.awayTeamId === newId) return

  // Find if another tie already has newId as away
  const otherTie = ties.value.find((t, i) => i !== tieIndex && t.awayTeamId === newId)
  if (otherTie) {
    // Swap
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

  // Copy and shuffle seeded pot
  const shuffledSeeded = [...seededPot.value].sort(() => Math.random() - 0.5)
  // Copy and shuffle unseeded pot
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
    const s17to24 = standings.slice(16, 24) // 17 is 0, 24 is 7

    ties.value.forEach((tie, idx) => {
      const seededStanding = s9to16[idx]
      // 9 plays 24 (idx 0 -> idx 7), 10 plays 23 (idx 1 -> idx 6)...
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
    // If not standard 24, pair index i with index length - 1 - i from pots
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

const findParticipant = (id: string): Participant | undefined => {
  return props.participants.find((p) => p.id === id)
}
</script>

<template>
  <UModal v-model:open="isOpen" :ui="{ content: 'sm:max-w-3xl' }">
    <template #content>
      <UCard class="ring-0 shadow-none" :ui="{ root: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <!-- Modal Header -->
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <UIcon name="i-heroicons-sparkles" class="w-5 h-5" />
              </div>
              <div>
                <h3 class="text-base font-bold text-gray-900 dark:text-white leading-tight">
                  Knockout Play-off Draw
                </h3>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  Pair seeded teams (9th–16th) with unseeded teams (17th–24th) or shuffle for a live draw
                </p>
              </div>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark"
              class="-my-1"
              @click="isOpen = false"
            />
          </div>
        </template>

        <div class="py-4 space-y-5 max-h-[calc(100dvh-220px)] overflow-y-auto px-1">
          <!-- Pots Summary Banners -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <!-- Seeded Pot -->
            <div class="rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <UIcon name="i-heroicons-star" class="w-3.5 h-3.5 text-emerald-500" />
                  Seeded Pot (9th–16th)
                </span>
                <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                  {{ seededPot.length }} teams
                </span>
              </div>
              <div class="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                <div
                  v-for="p in seededPot"
                  :key="p.id"
                  class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white dark:bg-gray-900 border border-emerald-200/60 dark:border-emerald-800/40 text-xs text-gray-800 dark:text-gray-200 shadow-xs"
                >
                  <span v-if="getParticipantRank(p.id)" class="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    #{{ getParticipantRank(p.id) }}
                  </span>
                  <img v-if="p.logoUrl" :src="p.logoUrl" class="w-3.5 h-3.5 rounded-full object-cover" />
                  <span class="truncate max-w-[100px]">{{ getParticipantName(p) }}</span>
                </div>
              </div>
            </div>

            <!-- Unseeded Pot -->
            <div class="rounded-xl border border-sky-200 dark:border-sky-900/40 bg-sky-50/50 dark:bg-sky-950/20 p-3">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                  <UIcon name="i-heroicons-shield-check" class="w-3.5 h-3.5 text-sky-500" />
                  Unseeded Pot (17th–24th)
                </span>
                <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300">
                  {{ unseededPot.length }} teams
                </span>
              </div>
              <div class="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                <div
                  v-for="p in unseededPot"
                  :key="p.id"
                  class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white dark:bg-gray-900 border border-sky-200/60 dark:border-sky-800/40 text-xs text-gray-800 dark:text-gray-200 shadow-xs"
                >
                  <span v-if="getParticipantRank(p.id)" class="text-[10px] font-mono font-bold text-sky-600 dark:text-sky-400">
                    #{{ getParticipantRank(p.id) }}
                  </span>
                  <img v-if="p.logoUrl" :src="p.logoUrl" class="w-3.5 h-3.5 rounded-full object-cover" />
                  <span class="truncate max-w-[100px]">{{ getParticipantName(p) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Action Buttons -->
          <div class="flex items-center justify-between gap-2 flex-wrap pt-1">
            <span class="text-xs font-bold text-gray-700 dark:text-gray-300">
              Matchup Pairings ({{ ties.length }} Matches)
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

          <!-- Tie Matchup Cards -->
          <div class="space-y-3">
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
                  Winner plays <strong class="font-bold underline">{{ tie.r16OpponentName }}</strong> in Round of 16
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
          <div class="flex items-center justify-end gap-2.5">
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
        </template>
      </UCard>
    </template>
  </UModal>
</template>
