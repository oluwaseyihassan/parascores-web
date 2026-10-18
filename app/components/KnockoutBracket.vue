<script setup lang="ts">
import type { Fixture } from '~/types'
import { FixtureStatus } from '~/types'

interface Props {
  fixturesByRound: Record<number, Fixture[]>
  rounds: number[]
  getRoundDisplayName: (round: number, index: number, total: number) => string
  updatingMatch?: boolean
  twoLegsKnockout?: boolean
  thirdPlaceMatch?: boolean
  readonly?: boolean
  tournamentId?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'start-match': [fixture: Fixture]
  'control-match': [fixture: Fixture]
  'open-playoff-draw': []
}>()

const toast = useToast()
const fixtureStore = useFixtureStore()
const standingStore = useStandingStore()
const participantStore = useParticipantStore()

const bracketContainerRef = ref<HTMLElement | null>(null)
const layoutMode = ref<'dual' | 'linear'>('dual')

const getAggregateStatus = (fixtures: Fixture[]): FixtureStatus => {
  if (fixtures.some(f => f.status === FixtureStatus.LIVE || f.status === FixtureStatus.NORMAL_TIME_ENDED || f.status === FixtureStatus.EXTRATIME)) return FixtureStatus.LIVE
  if (fixtures.every(f => f.status === FixtureStatus.COMPLETED)) return FixtureStatus.COMPLETED
  if (fixtures.some(f => f.status === FixtureStatus.SCHEDULED)) return FixtureStatus.SCHEDULED
  return FixtureStatus.CANCELLED
}

const matchupsByRound = computed(() => {
  const result: Record<number, any[]> = {}
  const totalRounds = props.rounds.length

  props.rounds.forEach((round, roundIndex) => {
    const isFinalRound = roundIndex === totalRounds - 1
    const roundFixtures = props.fixturesByRound[round] || []
    const matchups: any[] = []

    if (props.twoLegsKnockout && !isFinalRound) {
      const matchupsMap = new Map<number, Fixture[]>()
      for (const f of roundFixtures) {
        const logicalMatchId = f.matchNumber ? Math.ceil(f.matchNumber / 2) : 1
        if (!matchupsMap.has(logicalMatchId)) matchupsMap.set(logicalMatchId, [])
        matchupsMap.get(logicalMatchId)!.push(f)
      }

      const sortedLogicalIds = Array.from(matchupsMap.keys()).sort((a, b) => a - b)

      for (const logicalMatchId of sortedLogicalIds) {
        const fixtures = matchupsMap.get(logicalMatchId)!
        fixtures.sort((a, b) => a.matchNumber - b.matchNumber)
        
        const f1 = fixtures[0]!
        const f2 = fixtures[1]
        
        matchups.push({
          id: f1.id,
          fixtures,
          isThirdPlace: false,
          homeTeam: f1.homeTeam,
          awayTeam: f1.awayTeam,
          homeTeamPlaceholder: f1.homeTeamPlaceholder,
          awayTeamPlaceholder: f1.awayTeamPlaceholder,
          homeScore: (f1.homeScore ?? 0) + (f2 ? (f2.awayScore ?? 0) : 0),
          awayScore: (f1.awayScore ?? 0) + (f2 ? (f2.homeScore ?? 0) : 0),
          homeSubScores: [f1.homeScore, f2 ? f2.awayScore : null],
          awaySubScores: [f1.awayScore, f2 ? f2.homeScore : null],
          homePenaltyScore: f2?.awayPenaltyScore ?? f1.homePenaltyScore,
          awayPenaltyScore: f2?.homePenaltyScore ?? f1.awayPenaltyScore,
          status: getAggregateStatus(fixtures),
          homeTeamId: f1.homeTeamId,
          awayTeamId: f1.awayTeamId
        })
      }
    } else {
      for (let i = 0; i < roundFixtures.length; i++) {
        const f = roundFixtures[i]!
        const roundName = (f.roundName || '').toLowerCase()
        const isThirdPlace = isFinalRound && props.thirdPlaceMatch && (
          roundName.includes('third') || roundName.includes('3rd') || (i === 1 && !roundName.includes('final'))
        )
        matchups.push({
          id: f.id,
          fixtures: [f],
          isThirdPlace,
          homeTeam: f.homeTeam,
          awayTeam: f.awayTeam,
          homeTeamPlaceholder: f.homeTeamPlaceholder,
          awayTeamPlaceholder: f.awayTeamPlaceholder,
          homeScore: f.homeScore ?? 0,
          awayScore: f.awayScore ?? 0,
          homePenaltyScore: f.homePenaltyScore,
          awayPenaltyScore: f.awayPenaltyScore,
          status: f.status,
          homeTeamId: f.homeTeamId,
          awayTeamId: f.awayTeamId
        })
      }
    }
    result[round] = matchups
  })
  return result
})

// Arrange Mode state
const isArranging = ref(false)
const isSaving = ref(false)
const isShuffling = ref(false)
const draftMatchups = ref<Record<number, any[]>>({})

const selectedSlot = ref<{
  round: number
  matchIndex: number
  isHome: boolean
  teamId?: string | null
  team?: any
  placeholder?: string | null
} | null>(null)

const activeMatchupsByRound = computed(() => {
  if (isArranging.value && draftMatchups.value && Object.keys(draftMatchups.value).length > 0) {
    return draftMatchups.value
  }
  return matchupsByRound.value
})

const finalRound = computed(() => {
  if (props.rounds.length === 0) return 0
  return props.rounds[props.rounds.length - 1]!
})

const feederRounds = computed(() => {
  if (props.rounds.length <= 1) return []
  return props.rounds.slice(0, props.rounds.length - 1)
})

const reversedFeederRounds = computed(() => {
  return [...feederRounds.value].reverse()
})

const finalRoundMainMatchups = computed(() => {
  if (props.rounds.length === 0) return []
  return (activeMatchupsByRound.value[finalRound.value] || []).filter((m: any) => !m.isThirdPlace)
})

const thirdPlaceMatchups = computed(() => {
  if (props.rounds.length === 0) return []
  return (activeMatchupsByRound.value[finalRound.value] || []).filter((m: any) => m.isThirdPlace)
})

const firstRoundMatches = computed(() => {
  if (props.rounds.length === 0) return 0
  return activeMatchupsByRound.value[props.rounds[0]!]?.length || 0
})

const isPlayoffFirstRound = computed(() => {
  if (props.rounds.length < 2) return false
  const r0 = props.rounds[0]!
  const r1 = props.rounds[1]!
  const count0 = activeMatchupsByRound.value[r0]?.length || 0
  const count1 = activeMatchupsByRound.value[r1]?.length || 0
  return count0 > 0 && count0 === count1
})

const canArrange = computed(() => {
  if (props.readonly) return false
  return props.rounds.some(r => {
    const roundFixtures = props.fixturesByRound[r] || []
    return roundFixtures.some(f => f.status === FixtureStatus.SCHEDULED)
  })
})

const COLUMN_WIDTH = 260
const CONNECTOR_WIDTH = 52
const FINAL_WIDTH = 290

const totalWingRows = computed(() => {
  const matches = Math.max(1, Math.ceil(firstRoundMatches.value / 2))
  return matches * 2
})

const dualGridColumns = computed(() => {
  const n = feederRounds.value.length
  if (n === 0) return `${FINAL_WIDTH}px`
  const leftCols: string[] = []
  for (let i = 0; i < n; i++) {
    leftCols.push(`${COLUMN_WIDTH}px`)
    leftCols.push(`${CONNECTOR_WIDTH}px`)
  }
  const centerCol = `${FINAL_WIDTH}px`
  const rightCols: string[] = []
  for (let i = 0; i < n; i++) {
    rightCols.push(`${CONNECTOR_WIDTH}px`)
    rightCols.push(`${COLUMN_WIDTH}px`)
  }
  return [...leftCols, centerCol, ...rightCols].join(' ')
})

const linearGridColumns = computed(() =>
  props.rounds.map((_, i) => i < props.rounds.length - 1 ? `${COLUMN_WIDTH}px ${CONNECTOR_WIDTH}px` : `${COLUMN_WIDTH}px`).join(' ')
)

const getWingMatchups = (round: number, wing: 'left' | 'right') => {
  const allMatches = activeMatchupsByRound.value[round] || []
  const halfCount = Math.ceil(allMatches.length / 2)
  if (wing === 'left') {
    return allMatches.slice(0, halfCount)
  } else {
    return allMatches.slice(halfCount)
  }
}

const getGlobalMatchIndex = (round: number, wing: 'left' | 'right', wingIndex: number) => {
  if (wing === 'left') return wingIndex
  const allMatches = activeMatchupsByRound.value[round] || []
  const halfCount = Math.ceil(allMatches.length / 2)
  return halfCount + wingIndex
}

const getWingTreeDepth = (roundIndex: number): number => {
  if (isPlayoffFirstRound.value) {
    return roundIndex === 0 ? 0 : roundIndex - 1
  }
  return roundIndex
}

const getWingMatchGridRow = (roundIndex: number, matchIndexInWing: number) => {
  const depth = getWingTreeDepth(roundIndex)
  const span = Math.pow(2, depth)
  const start = matchIndexInWing * span * 2 + 1
  const end = start + span * 2
  return `${start} / ${end}`
}

const getLinearMatchGridRow = (roundIndex: number, matchIndex: number) => {
  const depth = isPlayoffFirstRound.value ? (roundIndex === 0 ? 0 : roundIndex - 1) : roundIndex
  const span = Math.pow(2, depth)
  const start = matchIndex * span * 2 + 1
  const end = start + span * 2
  return `${start} / ${end}`
}

const enterArrangeMode = () => {
  draftMatchups.value = JSON.parse(JSON.stringify(matchupsByRound.value))
  selectedSlot.value = null
  isArranging.value = true
  toast.add({
    title: 'Arrange Bracket Mode',
    description: 'Click any team to select it, then click another team to swap positions.',
    color: 'info',
    icon: 'i-heroicons-arrows-right-left'
  })
}

const exitArrangeMode = () => {
  isArranging.value = false
  selectedSlot.value = null
  draftMatchups.value = {}
}

const toggleArrangeMode = () => {
  if (isArranging.value) {
    exitArrangeMode()
  } else {
    enterArrangeMode()
  }
}

const getTeamNameFromSlot = (slot: typeof selectedSlot.value): string => {
  if (!slot) return ''
  if (slot.team) {
    return slot.team.customShortName || slot.team.customName || slot.team.user?.name || 'Team'
  }
  return slot.placeholder || 'Slot'
}

const handleSlotClick = (round: number, matchIndex: number, isHome: boolean) => {
  if (!isArranging.value) return

  const roundMatchups = draftMatchups.value[round]
  if (!roundMatchups || !roundMatchups[matchIndex]) return

  const matchup = roundMatchups[matchIndex]
  if (matchup.status !== FixtureStatus.SCHEDULED) {
    toast.add({
      title: 'Match unavailable',
      description: 'You can only swap teams in scheduled matches.',
      color: 'warning'
    })
    return
  }

  const slotTeam = isHome ? matchup.homeTeam : matchup.awayTeam
  const slotTeamId = isHome ? matchup.homeTeamId : matchup.awayTeamId
  const slotPlaceholder = isHome ? matchup.homeTeamPlaceholder : matchup.awayTeamPlaceholder

  // If nothing is selected yet:
  if (!selectedSlot.value) {
    if (!slotTeamId && !slotTeam) {
      toast.add({
        title: 'Empty slot',
        description: 'Please select a slot that contains an assigned team.',
        color: 'neutral'
      })
      return
    }

    selectedSlot.value = {
      round,
      matchIndex,
      isHome,
      teamId: slotTeamId,
      team: slotTeam,
      placeholder: slotPlaceholder
    }
    return
  }

  // Clicked the exact same slot -> Deselect
  if (
    selectedSlot.value.round === round &&
    selectedSlot.value.matchIndex === matchIndex &&
    selectedSlot.value.isHome === isHome
  ) {
    selectedSlot.value = null
    return
  }

  // Must swap within the same round
  if (selectedSlot.value.round !== round) {
    toast.add({
      title: 'Different rounds',
      description: 'Teams can only be swapped with other teams in the same round.',
      color: 'warning'
    })
    return
  }

  // Swap selectedSlot with target slot!
  const prevRound = selectedSlot.value.round
  const prevMatchIdx = selectedSlot.value.matchIndex
  const prevIsHome = selectedSlot.value.isHome
  const prevMatchup = draftMatchups.value[prevRound]![prevMatchIdx]!

  const prevTeam = prevIsHome ? prevMatchup.homeTeam : prevMatchup.awayTeam
  const prevTeamId = prevIsHome ? prevMatchup.homeTeamId : prevMatchup.awayTeamId
  const prevPlaceholder = prevIsHome ? prevMatchup.homeTeamPlaceholder : prevMatchup.awayTeamPlaceholder

  // Update prevMatchup
  if (prevIsHome) {
    prevMatchup.homeTeam = slotTeam
    prevMatchup.homeTeamId = slotTeamId
    prevMatchup.homeTeamPlaceholder = slotPlaceholder
    if (prevMatchup.fixtures?.[0]) {
      prevMatchup.fixtures[0].homeTeam = slotTeam
      prevMatchup.fixtures[0].homeTeamId = slotTeamId
      prevMatchup.fixtures[0].homeTeamPlaceholder = slotPlaceholder
    }
  } else {
    prevMatchup.awayTeam = slotTeam
    prevMatchup.awayTeamId = slotTeamId
    prevMatchup.awayTeamPlaceholder = slotPlaceholder
    if (prevMatchup.fixtures?.[0]) {
      prevMatchup.fixtures[0].awayTeam = slotTeam
      prevMatchup.fixtures[0].awayTeamId = slotTeamId
      prevMatchup.fixtures[0].awayTeamPlaceholder = slotPlaceholder
    }
  }

  // Update current matchup
  if (isHome) {
    matchup.homeTeam = prevTeam
    matchup.homeTeamId = prevTeamId
    matchup.homeTeamPlaceholder = prevPlaceholder
    if (matchup.fixtures?.[0]) {
      matchup.fixtures[0].homeTeam = prevTeam
      matchup.fixtures[0].homeTeamId = prevTeamId
      matchup.fixtures[0].homeTeamPlaceholder = prevPlaceholder
    }
  } else {
    matchup.awayTeam = prevTeam
    matchup.awayTeamId = prevTeamId
    matchup.awayTeamPlaceholder = prevPlaceholder
    if (matchup.fixtures?.[0]) {
      matchup.fixtures[0].awayTeam = prevTeam
      matchup.fixtures[0].awayTeamId = prevTeamId
      matchup.fixtures[0].awayTeamPlaceholder = prevPlaceholder
    }
  }

  const teamAName = prevTeam?.customShortName || prevTeam?.customName || prevTeam?.user?.name || prevPlaceholder || 'Team'
  const teamBName = slotTeam?.customShortName || slotTeam?.customName || slotTeam?.user?.name || slotPlaceholder || 'Team'

  toast.add({
    title: 'Teams Swapped',
    description: `Swapped ${teamAName} ⇄ ${teamBName}`,
    color: 'success',
    icon: 'i-heroicons-arrows-right-left'
  })

  selectedSlot.value = null
}

const swapMatchHomeAway = (round: number, matchIndex: number) => {
  if (!isArranging.value) return
  const matchup = draftMatchups.value[round]?.[matchIndex]
  if (!matchup || matchup.status !== FixtureStatus.SCHEDULED) return

  const tempTeam = matchup.homeTeam
  const tempTeamId = matchup.homeTeamId
  const tempPlaceholder = matchup.homeTeamPlaceholder

  matchup.homeTeam = matchup.awayTeam
  matchup.homeTeamId = matchup.awayTeamId
  matchup.homeTeamPlaceholder = matchup.awayTeamPlaceholder

  matchup.awayTeam = tempTeam
  matchup.awayTeamId = tempTeamId
  matchup.awayTeamPlaceholder = tempPlaceholder

  if (matchup.fixtures?.[0]) {
    matchup.fixtures[0].homeTeam = matchup.homeTeam
    matchup.fixtures[0].homeTeamId = matchup.homeTeamId
    matchup.fixtures[0].homeTeamPlaceholder = matchup.homeTeamPlaceholder

    matchup.fixtures[0].awayTeam = matchup.awayTeam
    matchup.fixtures[0].awayTeamId = matchup.awayTeamId
    matchup.fixtures[0].awayTeamPlaceholder = matchup.awayTeamPlaceholder
  }

  toast.add({
    title: 'Home / Away Inverted',
    description: 'First leg home advantage reversed.',
    color: 'info',
    icon: 'i-heroicons-arrows-up-down'
  })
}

const shuffleDraw = () => {
  if (!isArranging.value) return
  isShuffling.value = true

  try {
    // 1. Play-off round (Round 0)
    const r0 = props.rounds[0]
    if (r0 !== undefined && isPlayoffFirstRound.value && draftMatchups.value[r0]) {
      const playoffMatchups = draftMatchups.value[r0]!
      if (playoffMatchups.every(m => m.status === FixtureStatus.SCHEDULED)) {
        const awayTeams = playoffMatchups.map(m => ({
          team: m.awayTeam,
          teamId: m.awayTeamId,
          placeholder: m.awayTeamPlaceholder
        }))
        const shuffledAway = [...awayTeams].sort(() => Math.random() - 0.5)

        playoffMatchups.forEach((m, idx) => {
          const item = shuffledAway[idx]!
          m.awayTeam = item.team
          m.awayTeamId = item.teamId
          m.awayTeamPlaceholder = item.placeholder
          if (m.fixtures?.[0]) {
            m.fixtures[0].awayTeam = item.team
            m.fixtures[0].awayTeamId = item.teamId
            m.fixtures[0].awayTeamPlaceholder = item.placeholder
          }
        })
      }
    }

    // 2. Round of 16 (or first round if no playoffs)
    const r1 = isPlayoffFirstRound.value ? props.rounds[1] : props.rounds[0]
    if (r1 !== undefined && draftMatchups.value[r1]) {
      const r1Matchups = draftMatchups.value[r1]!
      if (r1Matchups.every(m => m.status === FixtureStatus.SCHEDULED)) {
        const homeTeams = r1Matchups
          .map(m => ({ team: m.homeTeam, teamId: m.homeTeamId, placeholder: m.homeTeamPlaceholder }))
          .filter(h => !!h.teamId)

        if (homeTeams.length > 1) {
          const shuffledHome = [...homeTeams].sort(() => Math.random() - 0.5)
          let sIdx = 0
          r1Matchups.forEach(m => {
            if (m.homeTeamId) {
              const item = shuffledHome[sIdx++]!
              m.homeTeam = item.team
              m.homeTeamId = item.teamId
              m.homeTeamPlaceholder = item.placeholder
              if (m.fixtures?.[0]) {
                m.fixtures[0].homeTeam = item.team
                m.fixtures[0].homeTeamId = item.teamId
                m.fixtures[0].homeTeamPlaceholder = item.placeholder
              }
            }
          })
        }
      }
    }

    selectedSlot.value = null
    toast.add({
      title: 'Draw Shuffled',
      description: 'Matchups and bracket paths randomized.',
      color: 'success',
      icon: 'i-heroicons-sparkles'
    })
  } finally {
    isShuffling.value = false
  }
}

const standardSeeding = () => {
  if (!isArranging.value) return

  const standings = standingStore.standings
  const participants = participantStore.participants
  const getParticipant = (pId: string) => participants.find(p => p.id === pId)

  // 1. Playoff round: 9 vs 24, 10 vs 23, etc.
  const r0 = props.rounds[0]
  if (r0 !== undefined && isPlayoffFirstRound.value && draftMatchups.value[r0]) {
    const playoffMatchups = draftMatchups.value[r0]!
    if (standings.length >= 24) {
      const s9to16 = standings.slice(8, 16)
      const s17to24 = standings.slice(16, 24)

      playoffMatchups.forEach((m, idx) => {
        const seededStanding = s9to16[idx]
        const unseededStanding = s17to24[s17to24.length - 1 - idx]

        if (seededStanding) {
          const p = getParticipant(seededStanding.participant_id)
          m.homeTeamId = seededStanding.participant_id
          m.homeTeam = p
          if (m.fixtures?.[0]) {
            m.fixtures[0].homeTeamId = seededStanding.participant_id
            m.fixtures[0].homeTeam = p
          }
        }
        if (unseededStanding) {
          const p = getParticipant(unseededStanding.participant_id)
          m.awayTeamId = unseededStanding.participant_id
          m.awayTeam = p
          if (m.fixtures?.[0]) {
            m.fixtures[0].awayTeamId = unseededStanding.participant_id
            m.fixtures[0].awayTeam = p
          }
        }
      })
    }
  }

  // 2. Round of 16 Top 8 seeds: standard balanced bracket
  const r1 = isPlayoffFirstRound.value ? props.rounds[1] : props.rounds[0]
  if (r1 !== undefined && draftMatchups.value[r1]) {
    const r1Matchups = draftMatchups.value[r1]!
    if (standings.length >= 8 && r1Matchups.length >= 8) {
      const seedOrder = [0, 7, 3, 4, 1, 6, 2, 5]
      r1Matchups.forEach((m, idx) => {
        const seedIdx = seedOrder[idx]
        if (seedIdx !== undefined && standings[seedIdx]) {
          const standing = standings[seedIdx]!
          const p = getParticipant(standing.participant_id)
          m.homeTeamId = standing.participant_id
          m.homeTeam = p
          if (m.fixtures?.[0]) {
            m.fixtures[0].homeTeamId = standing.participant_id
            m.fixtures[0].homeTeam = p
          }
        }
      })
    }
  }

  selectedSlot.value = null
  toast.add({
    title: 'Standard Seeding Restored',
    description: 'Top seeds balanced across Top and Bottom halves.',
    color: 'success',
    icon: 'i-heroicons-arrow-path'
  })
}

const saveArrangement = async () => {
  if (!props.tournamentId) {
    toast.add({
      title: 'Missing tournament',
      description: 'Tournament ID is required to save pairings.',
      color: 'error'
    })
    return
  }

  isSaving.value = true
  try {
    const pairingsPayload: Array<{
      fixtureId: string
      homeTeamId?: string | null
      awayTeamId?: string | null
    }> = []

    for (const round of props.rounds) {
      const matchups = draftMatchups.value[round] || []
      for (const m of matchups) {
        if (m.status === FixtureStatus.SCHEDULED && m.fixtures?.[0]?.id) {
          pairingsPayload.push({
            fixtureId: m.fixtures[0].id,
            homeTeamId: m.homeTeamId || null,
            awayTeamId: m.awayTeamId || null
          })
        }
      }
    }

    if (pairingsPayload.length === 0) {
      isArranging.value = false
      return
    }

    await fixtureStore.updateKnockoutPairings(props.tournamentId, pairingsPayload)

    toast.add({
      title: 'Knockout Arrangement Saved',
      description: 'Bracket path to the final updated successfully.',
      color: 'success',
      icon: 'i-heroicons-check-circle'
    })

    isArranging.value = false
    selectedSlot.value = null
    draftMatchups.value = {}
  } catch (err: any) {
    toast.add({
      title: 'Failed to Save',
      description: err?.message || 'Could not update knockout pairings.',
      color: 'error'
    })
  } finally {
    isSaving.value = false
  }
}

// Center scroll container on mount
const centerBracket = () => {
  if (bracketContainerRef.value && layoutMode.value === 'dual') {
    const el = bracketContainerRef.value
    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2
  }
}

const setLayoutMode = (mode: 'dual' | 'linear') => {
  layoutMode.value = mode
  if (mode === 'dual') {
    nextTick(() => {
      centerBracket()
    })
  }
}

// Escape key listener
onMounted(() => {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isArranging.value) {
      if (selectedSlot.value) {
        selectedSlot.value = null
      } else {
        exitArrangeMode()
      }
    }
  }
  window.addEventListener('keydown', onKeyDown)
  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown)
  })

  nextTick(() => {
    centerBracket()
  })
})

// Zoom logic
const scale = ref(1.0)
const zoomIn = () => {
  if (scale.value < 1.5) {
    scale.value = parseFloat((scale.value + 0.1).toFixed(1))
  }
}
const zoomOut = () => {
  if (scale.value > 0.6) {
    scale.value = parseFloat((scale.value - 0.1).toFixed(1))
  }
}
const resetZoom = () => {
  scale.value = 1.0
}

defineExpose({
  isArranging,
  canArrange,
  enterArrangeMode,
  exitArrangeMode,
  toggleArrangeMode,
  saveArrangement,
  shuffleDraw,
  standardSeeding
})
</script>

<template>
  <div class="relative w-full">
    <!-- Top Floating Toolbar when Arranging -->
    <div
      v-if="isArranging"
      class="sticky top-0 z-50 mb-3 mx-2 rounded-xl border border-primary-500/40 bg-white/95 dark:bg-gray-900/95 p-3 shadow-lg backdrop-blur flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-150"
    >
      <div class="flex items-center gap-3 flex-wrap">
        <div class="flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800/60 text-xs font-bold text-primary-700 dark:text-primary-300">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
          </span>
          Arrange Mode
        </div>

        <div v-if="selectedSlot" class="flex items-center gap-2 text-xs font-medium text-gray-800 dark:text-gray-200">
          <span>Selected:</span>
          <span class="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold">
            {{ getTeamNameFromSlot(selectedSlot) }}
          </span>
          <span class="text-gray-400 text-[11px]">(Click any other team slot in this round to swap across halves)</span>
          <button
            @click="selectedSlot = null"
            class="text-xs text-primary-600 dark:text-primary-400 hover:underline ml-1"
          >
            Cancel selection
          </button>
        </div>
        <div v-else class="text-xs text-gray-500 dark:text-gray-400">
          Click any team to select it, then click another team to swap. Left Wing feeds into SF 1; Right Wing feeds into SF 2.
        </div>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <UButton
          size="xs"
          variant="soft"
          color="neutral"
          icon="i-heroicons-sparkles"
          label="Shuffle Draw"
          :loading="isShuffling"
          @click="shuffleDraw"
        />
        <UButton
          size="xs"
          variant="soft"
          color="neutral"
          icon="i-heroicons-arrow-path"
          label="Standard Seeding"
          @click="standardSeeding"
        />
        <div class="w-px h-5 bg-gray-200 dark:bg-white/10 mx-1"></div>
        <UButton
          size="xs"
          variant="ghost"
          color="neutral"
          label="Cancel"
          :disabled="isSaving"
          @click="exitArrangeMode"
        />
        <UButton
          size="xs"
          color="primary"
          icon="i-heroicons-check"
          label="Save Arrangement"
          :loading="isSaving"
          @click="saveArrangement"
        />
      </div>
    </div>

    <!-- Top Right Controls (Arrange Button + Layout Toggle + Zoom) -->
    <div class="absolute top-0 right-4 z-40 flex items-center gap-2">
      <!-- Layout Mode Toggle (Dual-Sided vs Classic Linear) -->
      <div v-if="feederRounds.length > 0" class="flex items-center rounded-lg border border-gray-200 bg-white/90 p-0.5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-gray-900/90 text-xs select-none">
        <button
          @click="setLayoutMode('dual')"
          :class="layoutMode === 'dual' ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 font-bold border border-primary-200 dark:border-primary-800/60' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white border border-transparent'"
          class="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-colors"
          title="Dual-Sided (Left & Right Wings converging to Center Championship)"
        >
          <UIcon name="i-heroicons-arrows-pointing-in" class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">Dual-Sided</span>
        </button>
        <button
          @click="setLayoutMode('linear')"
          :class="layoutMode === 'linear' ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 font-bold border border-primary-200 dark:border-primary-800/60' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white border border-transparent'"
          class="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-colors"
          title="Classic Linear (Left to Right)"
        >
          <UIcon name="i-heroicons-arrow-right" class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">Classic</span>
        </button>
      </div>

      <!-- Arrange Button -->
      <button
        v-if="canArrange && !isArranging"
        @click="enterArrangeMode"
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-primary-500/30 bg-white/90 dark:bg-gray-900/90 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950/40 text-primary-600 dark:text-primary-400 text-xs font-semibold shadow-sm backdrop-blur transition-all"
        title="Rearrange knockout matches, swap teams, or run draw"
      >
        <UIcon name="i-heroicons-arrows-right-left" class="w-3.5 h-3.5" />
        <span>Arrange Bracket</span>
      </button>

      <!-- Zoom Controls -->
      <div class="flex items-center gap-1 rounded-lg border border-gray-200 bg-white/90 p-1 shadow-sm backdrop-blur dark:border-white/10 dark:bg-gray-900/90 text-xs select-none">
        <button
          @click="zoomOut"
          class="flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
          title="Zoom Out"
        >
          <UIcon name="i-heroicons-minus" class="w-3.5 h-3.5" />
        </button>
        <span class="text-[10px] font-bold text-gray-500 dark:text-gray-400 min-w-[28px] text-center">
          {{ Math.round(scale * 100) }}%
        </span>
        <button
          @click="zoomIn"
          class="flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
          title="Zoom In"
        >
          <UIcon name="i-heroicons-plus" class="w-3.5 h-3.5" />
        </button>
        <div class="w-px h-3 bg-gray-200 dark:bg-white/10 mx-1"></div>
        <button
          @click="resetZoom"
          class="px-1.5 py-0.5 rounded text-[9px] font-bold text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
          title="Reset Zoom"
        >
          Reset
        </button>
      </div>
    </div>

    <!-- MAIN BRACKET CONTAINER -->
    <div ref="bracketContainerRef" class="bracket-container">
      <div class="bracket-scroll" :style="{ zoom: scale }">

        <!-- ========================================== -->
        <!-- 1. DUAL-SIDED CENTER-CONVERGING LAYOUT    -->
        <!-- ========================================== -->
        <template v-if="layoutMode === 'dual' && feederRounds.length > 0">
          <!-- Top Path Indicator Banner -->
          <div class="dual-path-banner mb-3" :style="{ gridTemplateColumns: dualGridColumns }">
            <!-- Left Wing Path Banner -->
            <div
              class="path-banner-card path-banner-card--left"
              :style="{ gridColumn: `1 / ${feederRounds.length * 2 + 1}` }"
            >
              <div class="flex items-center gap-2">
                <span class="path-pill path-pill--left">Top Half</span>
                <span class="text-xs font-bold text-sky-700 dark:text-sky-300">Feeds into Semi-Final 1 ➔</span>
              </div>
              <span class="text-[11px] text-sky-600/70 dark:text-sky-400/60 hidden md:inline">Advances left-to-right</span>
            </div>

            <!-- Center Final Trophy Banner -->
            <div
              class="path-banner-card path-banner-card--center"
              :style="{ gridColumn: `${feederRounds.length * 2 + 1} / ${feederRounds.length * 2 + 2}` }"
            >
              <UIcon name="i-heroicons-trophy" class="w-4 h-4 text-amber-500" />
              <span class="text-xs font-black tracking-wider uppercase text-amber-600 dark:text-amber-400">Grand Final</span>
            </div>

            <!-- Right Wing Path Banner -->
            <div
              class="path-banner-card path-banner-card--right"
              :style="{ gridColumn: `${feederRounds.length * 2 + 2} / -1` }"
            >
              <span class="text-[11px] text-purple-600/70 dark:text-purple-400/60 hidden md:inline">Advances right-to-left</span>
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-purple-700 dark:text-purple-300">⬅ Feeds into Semi-Final 2</span>
                <span class="path-pill path-pill--right">Bottom Half</span>
              </div>
            </div>
          </div>

          <!-- Dual Round Headers -->
          <div
            class="bracket-headers"
            :style="{
              display: 'grid',
              gridTemplateColumns: dualGridColumns,
            }"
          >
            <!-- Left Wing Headers (Forward: Round 0 -> SF) -->
            <template v-for="(round, idx) in feederRounds" :key="`dual-h-left-${round}`">
              <div class="bracket-header">
                <span>{{ getRoundDisplayName(round, idx, rounds.length) }}</span>
              </div>
              <!-- Connector space -->
              <div class="w-[52px]" />
            </template>

            <!-- Center Final Header -->
            <div class="bracket-header bracket-header--final">
              <UIcon name="i-heroicons-trophy" class="w-3.5 h-3.5 text-amber-500 inline-block mr-1" />
              <span>{{ getRoundDisplayName(finalRound, rounds.length - 1, rounds.length) }}</span>
            </div>

            <!-- Right Wing Headers (Reversed: SF <- Round 0) -->
            <template v-for="(round, revIdx) in reversedFeederRounds" :key="`dual-h-right-${round}`">
              <!-- Connector space -->
              <div class="w-[52px]" />
              <div class="bracket-header">
                <span>{{ getRoundDisplayName(round, feederRounds.length - 1 - revIdx, rounds.length) }}</span>
              </div>
            </template>
          </div>

          <!-- Dual Bracket Grid -->
          <div
            class="bracket-grid"
            :style="{
              '--total-rows': totalWingRows,
              display: 'grid',
              gridTemplateColumns: dualGridColumns,
              gap: '0'
            }"
          >
            <!-- LEFT WING COLUMNS -->
            <template v-for="(round, roundIdx) in feederRounds" :key="`left-wing-${round}`">
              <!-- Left Wing Matches Column -->
              <div class="matches-column">
                <template v-for="(matchup, mIdx) in getWingMatchups(round, 'left')" :key="`left-m-${matchup.id}`">
                  <div
                    class="match-cell"
                    :style="{ gridRow: getWingMatchGridRow(roundIdx, mIdx) }"
                  >
                    <KnockoutMatchCard
                      :matchup="matchup"
                      :round="round"
                      :match-index="getGlobalMatchIndex(round, 'left', mIdx)"
                      :half-title="'Top Half · SF 1 Path'"
                      :is-top-half="true"
                      :is-arranging="isArranging"
                      :selected-slot="selectedSlot"
                      :readonly="readonly"
                      :updating-match="updatingMatch"
                      :is-playoff-first-round="roundIdx === 0 && isPlayoffFirstRound"
                      @slot-click="handleSlotClick"
                      @swap-home-away="swapMatchHomeAway"
                      @start-match="emit('start-match', $event)"
                      @control-match="emit('control-match', $event)"
                      @enter-arrange="enterArrangeMode"
                    />
                  </div>
                </template>
              </div>

              <!-- Left Wing Connector Column -->
              <div class="connector-column">
                <!-- If this is the last feeder round (Semi-Final 1), straight line to Final! -->
                <template v-if="roundIdx === feederRounds.length - 1">
                  <div
                    class="connector-pair"
                    :style="{ gridRow: `1 / ${totalWingRows + 1}` }"
                  >
                    <svg class="connector-svg" viewBox="0 0 52 100" preserveAspectRatio="none">
                      <path d="M 0 50 L 52 50" class="connector-line connector-line--sf" />
                    </svg>
                  </div>
                </template>

                <!-- 1-to-1 straight lines for Playoff round -->
                <template v-else-if="roundIdx === 0 && isPlayoffFirstRound">
                  <template v-for="mIdx in getWingMatchups(round, 'left').length" :key="`left-conn-str-${mIdx}`">
                    <div
                      class="connector-pair"
                      :style="{ gridRow: `${(mIdx - 1) * 2 + 1} / ${(mIdx - 1) * 2 + 3}` }"
                    >
                      <svg class="connector-svg" viewBox="0 0 52 100" preserveAspectRatio="none">
                        <path d="M 0 50 L 52 50" class="connector-line" />
                      </svg>
                    </div>
                  </template>
                </template>

                <!-- Binary merge for intermediate rounds -->
                <template v-else>
                  <template v-for="pairIdx in Math.ceil(getWingMatchups(round, 'left').length / 2)" :key="`left-conn-bin-${pairIdx}`">
                    <div
                      class="connector-pair"
                      :style="{
                        gridRow: `${(pairIdx - 1) * Math.pow(2, getWingTreeDepth(roundIdx)) * 4 + 1} / ${(pairIdx - 1) * Math.pow(2, getWingTreeDepth(roundIdx)) * 4 + Math.pow(2, getWingTreeDepth(roundIdx)) * 4 + 1}`
                      }"
                    >
                      <svg class="connector-svg" viewBox="0 0 52 100" preserveAspectRatio="none">
                        <path d="M 0 25 L 26 25 L 26 50" class="connector-line" />
                        <path d="M 0 75 L 26 75 L 26 50" class="connector-line" />
                        <path d="M 26 50 L 52 50" class="connector-line" />
                      </svg>
                    </div>
                  </template>
                </template>
              </div>
            </template>

            <!-- CENTER GRAND FINAL COLUMN -->
            <div
              class="final-column"
              :style="{
                gridRow: `1 / ${totalWingRows + 1}`
              }"
            >
              <div class="final-container">
                <!-- Championship Trophy Badge -->
                <div class="final-trophy-badge mb-2.5">
                  <UIcon name="i-heroicons-trophy" class="w-5 h-5 text-amber-500 animate-bounce" />
                  <span class="text-xs font-black tracking-wider uppercase text-amber-600 dark:text-amber-400">Championship Match</span>
                </div>

                <!-- Grand Final Match Card -->
                <div v-if="finalRoundMainMatchups.length > 0" class="w-full">
                  <KnockoutMatchCard
                    :matchup="finalRoundMainMatchups[0]"
                    :round="finalRound"
                    :match-index="0"
                    :is-arranging="isArranging"
                    :selected-slot="selectedSlot"
                    :readonly="readonly"
                    :updating-match="updatingMatch"
                    :is-championship-final="true"
                    @slot-click="handleSlotClick"
                    @swap-home-away="swapMatchHomeAway"
                    @start-match="emit('start-match', $event)"
                    @control-match="emit('control-match', $event)"
                    @enter-arrange="enterArrangeMode"
                  />
                </div>

                <!-- 3rd Place Play-off Match underneath Grand Final -->
                <div v-if="thirdPlaceMatchups.length > 0" class="w-full mt-6 pt-4 border-t border-dashed border-gray-200 dark:border-white/10">
                  <div class="third-place-label mb-2 flex items-center justify-center gap-1.5 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <UIcon name="i-heroicons-shield-check" class="w-3.5 h-3.5 text-amber-600 dark:text-amber-500" />
                    3rd Place Play-off
                  </div>
                  <KnockoutMatchCard
                    :matchup="thirdPlaceMatchups[0]"
                    :round="finalRound"
                    :match-index="1"
                    :is-arranging="isArranging"
                    :selected-slot="selectedSlot"
                    :readonly="readonly"
                    :updating-match="updatingMatch"
                    @slot-click="handleSlotClick"
                    @swap-home-away="swapMatchHomeAway"
                    @start-match="emit('start-match', $event)"
                    @control-match="emit('control-match', $event)"
                    @enter-arrange="enterArrangeMode"
                  />
                </div>
              </div>
            </div>

            <!-- RIGHT WING COLUMNS (Reversed: SF -> QF -> R16 -> Playoffs) -->
            <template v-for="(round, revIdx) in reversedFeederRounds" :key="`right-wing-${round}`">
              <!-- Right Wing Connector Column -->
              <div class="connector-column">
                <!-- If this is the last feeder round (Semi-Final 2), straight line to Final from Right! -->
                <template v-if="revIdx === 0">
                  <div
                    class="connector-pair"
                    :style="{ gridRow: `1 / ${totalWingRows + 1}` }"
                  >
                    <svg class="connector-svg" viewBox="0 0 52 100" preserveAspectRatio="none">
                      <path d="M 52 50 L 0 50" class="connector-line connector-line--sf" />
                    </svg>
                  </div>
                </template>

                <!-- 1-to-1 straight lines for Playoff round -->
                <template v-else-if="(feederRounds.length - 1 - revIdx) === 0 && isPlayoffFirstRound">
                  <template v-for="mIdx in getWingMatchups(round, 'right').length" :key="`right-conn-str-${mIdx}`">
                    <div
                      class="connector-pair"
                      :style="{ gridRow: `${(mIdx - 1) * 2 + 1} / ${(mIdx - 1) * 2 + 3}` }"
                    >
                      <svg class="connector-svg" viewBox="0 0 52 100" preserveAspectRatio="none">
                        <path d="M 52 50 L 0 50" class="connector-line" />
                      </svg>
                    </div>
                  </template>
                </template>

                <!-- Binary merge for intermediate rounds (advancing right-to-left) -->
                <template v-else>
                  <template v-for="pairIdx in Math.ceil(getWingMatchups(round, 'right').length / 2)" :key="`right-conn-bin-${pairIdx}`">
                    <div
                      class="connector-pair"
                      :style="{
                        gridRow: `${(pairIdx - 1) * Math.pow(2, getWingTreeDepth(feederRounds.length - 1 - revIdx)) * 4 + 1} / ${(pairIdx - 1) * Math.pow(2, getWingTreeDepth(feederRounds.length - 1 - revIdx)) * 4 + Math.pow(2, getWingTreeDepth(feederRounds.length - 1 - revIdx)) * 4 + 1}`
                      }"
                    >
                      <svg class="connector-svg" viewBox="0 0 52 100" preserveAspectRatio="none">
                        <path d="M 52 25 L 26 25 L 26 50" class="connector-line" />
                        <path d="M 52 75 L 26 75 L 26 50" class="connector-line" />
                        <path d="M 26 50 L 0 50" class="connector-line" />
                      </svg>
                    </div>
                  </template>
                </template>
              </div>

              <!-- Right Wing Matches Column -->
              <div class="matches-column">
                <template v-for="(matchup, mIdx) in getWingMatchups(round, 'right')" :key="`right-m-${matchup.id}`">
                  <div
                    class="match-cell"
                    :style="{ gridRow: getWingMatchGridRow(feederRounds.length - 1 - revIdx, mIdx) }"
                  >
                    <KnockoutMatchCard
                      :matchup="matchup"
                      :round="round"
                      :match-index="getGlobalMatchIndex(round, 'right', mIdx)"
                      :half-title="'Bottom Half · SF 2 Path'"
                      :is-top-half="false"
                      :is-arranging="isArranging"
                      :selected-slot="selectedSlot"
                      :readonly="readonly"
                      :updating-match="updatingMatch"
                      :is-playoff-first-round="(feederRounds.length - 1 - revIdx) === 0 && isPlayoffFirstRound"
                      @slot-click="handleSlotClick"
                      @swap-home-away="swapMatchHomeAway"
                      @start-match="emit('start-match', $event)"
                      @control-match="emit('control-match', $event)"
                      @enter-arrange="enterArrangeMode"
                    />
                  </div>
                </template>
              </div>
            </template>
          </div>
        </template>


        <!-- ========================================== -->
        <!-- 2. CLASSIC LINEAR LAYOUT (LEFT TO RIGHT)  -->
        <!-- ========================================== -->
        <template v-else>
          <!-- Linear Round headers -->
          <div
            class="bracket-headers"
            :style="{
              display: 'grid',
              gridTemplateColumns: linearGridColumns,
            }"
          >
            <template v-for="(round, roundIndex) in rounds" :key="`linear-header-${round}`">
              <div class="bracket-header">
                <span>{{ getRoundDisplayName(round, roundIndex, rounds.length) }}</span>
              </div>
              <div v-if="roundIndex < rounds.length - 1" class="w-[52px]" />
            </template>
          </div>

          <!-- Linear Bracket grid -->
          <div
            class="bracket-grid"
            :style="{
              '--total-rows': firstRoundMatches * 2,
              display: 'grid',
              gridTemplateColumns: linearGridColumns,
              gap: '0'
            }"
          >
            <template v-for="(round, roundIndex) in rounds" :key="`linear-col-${round}`">
              <!-- Matches column -->
              <div class="matches-column">
                <template v-for="(matchup, matchIndex) in (roundIndex === rounds.length - 1 ? finalRoundMainMatchups : activeMatchupsByRound[round])" :key="`linear-m-${matchup.id}`">
                  <div
                    class="match-cell"
                    :style="{ gridRow: getLinearMatchGridRow(roundIndex, matchIndex) }"
                  >
                    <KnockoutMatchCard
                      :matchup="matchup"
                      :round="round"
                      :match-index="matchIndex"
                      :half-title="roundIndex < rounds.length - 1 && activeMatchupsByRound[round]?.length >= 2 ? (matchIndex < Math.ceil(activeMatchupsByRound[round].length / 2) ? 'Top Half · SF 1 Path' : 'Bottom Half · SF 2 Path') : null"
                      :is-top-half="roundIndex < rounds.length - 1 && activeMatchupsByRound[round]?.length >= 2 ? (matchIndex < Math.ceil(activeMatchupsByRound[round].length / 2)) : null"
                      :is-arranging="isArranging"
                      :selected-slot="selectedSlot"
                      :readonly="readonly"
                      :updating-match="updatingMatch"
                      :is-playoff-first-round="roundIndex === 0 && isPlayoffFirstRound"
                      :is-championship-final="roundIndex === rounds.length - 1"
                      @slot-click="handleSlotClick"
                      @swap-home-away="swapMatchHomeAway"
                      @start-match="emit('start-match', $event)"
                      @control-match="emit('control-match', $event)"
                      @enter-arrange="enterArrangeMode"
                    />
                  </div>
                </template>
              </div>

              <!-- Connector column -->
              <div v-if="roundIndex < rounds.length - 1" class="connector-column">
                <template v-if="roundIndex === 0 && isPlayoffFirstRound">
                  <template v-for="matchIdx in (activeMatchupsByRound[round]?.length || 0)" :key="`linear-conn-str-${matchIdx}`">
                    <div
                      class="connector-pair"
                      :style="{
                        gridRow: `${(matchIdx - 1) * 2 + 1} / ${(matchIdx - 1) * 2 + 3}`
                      }"
                    >
                      <svg class="connector-svg" viewBox="0 0 52 100" preserveAspectRatio="none">
                        <path d="M 0 50 L 52 50" class="connector-line" />
                      </svg>
                    </div>
                  </template>
                </template>

                <template v-else>
                  <template v-for="pairIndex in Math.ceil((activeMatchupsByRound[round]?.length || 0) / 2)" :key="`linear-conn-bin-${pairIndex}`">
                    <div
                      class="connector-pair"
                      :style="{
                        gridRow: `${(pairIndex - 1) * Math.pow(2, isPlayoffFirstRound ? (roundIndex === 0 ? 0 : roundIndex - 1) : roundIndex) * 4 + 1} / ${(pairIndex - 1) * Math.pow(2, isPlayoffFirstRound ? (roundIndex === 0 ? 0 : roundIndex - 1) : roundIndex) * 4 + Math.pow(2, isPlayoffFirstRound ? (roundIndex === 0 ? 0 : roundIndex - 1) : roundIndex) * 4 + 1}`
                      }"
                    >
                      <svg class="connector-svg" viewBox="0 0 52 100" preserveAspectRatio="none">
                        <path d="M 0 25 L 26 25 L 26 50" class="connector-line" />
                        <path d="M 0 75 L 26 75 L 26 50" class="connector-line" />
                        <path d="M 26 50 L 52 50" class="connector-line" />
                      </svg>
                    </div>
                  </template>
                </template>
              </div>
            </template>
          </div>

          <!-- Linear 3rd Place Section -->
          <div v-if="thirdPlaceMatchups.length > 0" class="third-place-section" :style="{ marginLeft: `${(rounds.length - 1) * (COLUMN_WIDTH + CONNECTOR_WIDTH)}px`, width: `${COLUMN_WIDTH}px` }">
            <div v-for="matchup in thirdPlaceMatchups" :key="matchup.id">
              <div class="third-place-label">
                <UIcon name="i-heroicons-trophy" class="w-3.5 h-3.5 text-amber-500" />
                3rd Place Play-off
              </div>
              <KnockoutMatchCard
                :matchup="matchup"
                :round="finalRound"
                :match-index="1"
                :is-arranging="isArranging"
                :selected-slot="selectedSlot"
                :readonly="readonly"
                :updating-match="updatingMatch"
                @slot-click="handleSlotClick"
                @swap-home-away="swapMatchHomeAway"
                @start-match="emit('start-match', $event)"
                @control-match="emit('control-match', $event)"
                @enter-arrange="enterArrangeMode"
              />
            </div>
          </div>
        </template>

      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Container & scroll ───────────────────────────────────── */
.bracket-container {
  overflow-x: auto;
  overflow-y: hidden;
  padding: 1rem 0;
  cursor: grab;
  scrollbar-width: thin;
  scrollbar-color: rgba(156,163,175,0.4) transparent;
}

.bracket-container:active {
  cursor: grabbing;
}

.bracket-container::-webkit-scrollbar {
  height: 6px;
}

.bracket-container::-webkit-scrollbar-thumb {
  background: rgba(156,163,175,0.4);
  border-radius: 3px;
}

.bracket-scroll {
  display: inline-block;
  min-width: 100%;
  padding-bottom: 1.5rem;
  transform-origin: top left;
}

/* ── Dual Path Banner ─────────────────────────────────────── */
.dual-path-banner {
  display: grid;
  align-items: center;
  gap: 0;
  width: 100%;
}

.path-banner-card {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.85rem;
  border-radius: 8px;
}

.path-banner-card--left {
  justify-content: space-between;
  background: rgba(14, 165, 233, 0.08);
  border: 1px solid rgba(14, 165, 233, 0.2);
}

.path-banner-card--center {
  justify-content: center;
  gap: 0.35rem;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  margin: 0 0.5rem;
}

.path-banner-card--right {
  justify-content: space-between;
  background: rgba(168, 85, 247, 0.08);
  border: 1px solid rgba(168, 85, 247, 0.2);
}

.path-pill {
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
}

.path-pill--left {
  background: #0ea5e9;
  color: #ffffff;
}

.path-pill--right {
  background: #a855f7;
  color: #ffffff;
}

/* ── Round headers ────────────────────────────────────────── */
.bracket-headers {
  display: grid;
  margin-bottom: 0.75rem;
}

.bracket-header {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #6b7280;
  padding: 0.375rem 0.5rem;
  background: #f3f4f6;
  border-radius: 6px;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:root.dark .bracket-header {
  color: #9ca3af;
  background: rgba(255,255,255,0.04);
}

.bracket-header--final {
  color: #d97706;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.25);
  font-weight: 800;
}

:root.dark .bracket-header--final {
  color: #fbbf24;
  background: rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.35);
}

/* ── Grid layout ──────────────────────────────────────────── */
.bracket-grid {
  grid-template-rows: repeat(var(--total-rows), minmax(42px, 1fr));
}

.matches-column {
  display: contents;
}

.match-cell {
  display: flex;
  align-items: center;
  padding: 6px 0;
  min-width: 0;
  overflow: hidden;
}

/* ── Final Center Column ──────────────────────────────────── */
.final-column {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 0.5rem;
}

.final-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.final-trophy-badge {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

/* ── Connector column ─────────────────────────────────────── */
.connector-column {
  display: contents;
}

.connector-pair {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
}

.connector-svg {
  width: 52px;
  height: 100%;
  overflow: visible;
}

.connector-line {
  stroke: #d1d5db;
  stroke-width: 1.5;
  fill: none;
  vector-effect: non-scaling-stroke;
}

:root.dark .connector-line {
  stroke: rgba(255,255,255,0.1);
}

.connector-line--sf {
  stroke: #f59e0b;
  stroke-width: 2;
  stroke-dasharray: 4 2;
}

/* ── 3rd place ────────────────────────────────────────────── */
.third-place-section {
  margin-top: 1rem;
}

.third-place-label {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #9ca3af;
  margin-bottom: 0.5rem;
}
</style>
