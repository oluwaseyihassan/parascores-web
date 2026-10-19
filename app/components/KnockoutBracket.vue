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

// Orientation state: auto-detects smaller screens (< 768px) or allows manual override
const isSmallScreen = ref(false)
const orientation = ref<'auto' | 'horizontal' | 'vertical'>('auto')

const isVertical = computed(() => {
  if (orientation.value === 'vertical') return true
  if (orientation.value === 'horizontal') return false
  return isSmallScreen.value
})

const setOrientation = (val: 'horizontal' | 'vertical') => {
  orientation.value = val
  if (val === 'horizontal') {
    nextTick(() => {
      centerBracket()
    })
  }
}

// Mobile vertical navigation: null means 'All Rounds', or specific round index
const selectedMobileRound = ref<number | null>(null)

const displayedVerticalRounds = computed(() => {
  if (selectedMobileRound.value !== null) {
    return [selectedMobileRound.value]
  }
  return props.rounds
})

const getMatchAdvanceText = (roundIdx: number, mIdx: number): string => {
  if (roundIdx === props.rounds.length - 2) {
    return 'Winner advances to Final'
  }
  const nextRound = props.rounds[roundIdx + 1]
  if (nextRound !== undefined) {
    const nextName = props.getRoundDisplayName(nextRound, roundIdx + 1, props.rounds.length)
    const targetMatch = Math.floor(mIdx / 2) + 1
    return `Winner advances to ${nextName} M${targetMatch}`
  }
  return 'Winner advances'
}

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

// Two-legged ties breakdown modal state
const showTwoLegModal = ref(false)
const selectedTwoLegMatchupId = ref<string | null>(null)

const selectedTwoLegMatchup = computed(() => {
  if (!selectedTwoLegMatchupId.value) return null
  for (const round of props.rounds) {
    const list = activeMatchupsByRound.value[round] || []
    const found = list.find((m: any) => m.id === selectedTwoLegMatchupId.value)
    if (found) return found
  }
  return null
})

const openTwoLegModal = (matchup: any) => {
  if (isArranging.value) return
  if (!matchup || !matchup.fixtures || matchup.fixtures.length <= 1) return
  selectedTwoLegMatchupId.value = matchup.id
  showTwoLegModal.value = true
}

const handleStartLeg = (leg: Fixture) => {
  showTwoLegModal.value = false
  emit('start-match', leg)
}

const handleControlLeg = (leg: Fixture) => {
  showTwoLegModal.value = false
  emit('control-match', leg)
}

const getMatchupRoundName = (matchup: any): string => {
  if (!matchup) return 'Knockout Tie'
  for (const r of props.rounds) {
    const list = activeMatchupsByRound.value[r] || []
    const idx = list.findIndex((m: any) => m.id === matchup.id)
    if (idx !== -1) {
      const roundIdx = props.rounds.indexOf(r)
      return props.getRoundDisplayName(r, roundIdx, props.rounds.length)
    }
  }
  return 'Knockout Tie'
}

const formatLegDate = (dateStr?: string | null): string => {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return ''
  }
}

const getFixtureWinner = (f: Fixture): 'home' | 'away' | 'draw' => {
  if (!f || f.status !== FixtureStatus.COMPLETED) return 'draw'
  const hs = f.homeScore ?? 0
  const as = f.awayScore ?? 0
  if (hs > as) return 'home'
  if (as > hs) return 'away'
  const hp = f.homePenaltyScore ?? 0
  const ap = f.awayPenaltyScore ?? 0
  if (hp > ap) return 'home'
  if (ap > hp) return 'away'
  return 'draw'
}

const getMatchupWinner = (m: any): 'home' | 'away' | 'draw' => {
  if (!m || m.status !== FixtureStatus.COMPLETED) return 'draw'
  const hs = m.homeScore ?? 0
  const as = m.awayScore ?? 0
  if (hs > as) return 'home'
  if (as > hs) return 'away'
  const hp = m.homePenaltyScore ?? 0
  const ap = m.awayPenaltyScore ?? 0
  if (hp > ap) return 'home'
  if (ap > hp) return 'away'
  return 'draw'
}

const getTeamName = (team: any, placeholder?: string | null): string => {
  if (team) {
    return team.customName || team.customShortName || team.user?.name || placeholder || 'TBD'
  }
  return placeholder || 'TBD'
}

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

const tournamentChampion = computed(() => {
  if (finalRoundMainMatchups.value.length === 0) return null
  const finalMatchup = finalRoundMainMatchups.value[0]
  if (!finalMatchup || finalMatchup.status !== FixtureStatus.COMPLETED) {
    return null
  }
  const homeScore = finalMatchup.homeScore ?? 0
  const awayScore = finalMatchup.awayScore ?? 0

  let winnerIsHome: boolean | null = null
  if (homeScore > awayScore) {
    winnerIsHome = true
  } else if (awayScore > homeScore) {
    winnerIsHome = false
  } else {
    const homePen = finalMatchup.homePenaltyScore ?? 0
    const awayPen = finalMatchup.awayPenaltyScore ?? 0
    if (homePen > awayPen) {
      winnerIsHome = true
    } else if (awayPen > homePen) {
      winnerIsHome = false
    }
  }

  if (winnerIsHome === null) return null

  const winnerTeam = winnerIsHome ? finalMatchup.homeTeam : finalMatchup.awayTeam
  const winnerName = winnerTeam
    ? (winnerTeam.customShortName || winnerTeam.customName || winnerTeam.user?.name || (winnerIsHome ? finalMatchup.homeTeamPlaceholder : finalMatchup.awayTeamPlaceholder) || 'Champion')
    : ((winnerIsHome ? finalMatchup.homeTeamPlaceholder : finalMatchup.awayTeamPlaceholder) || 'Champion')
  const logoUrl = winnerTeam?.logoUrl || null

  return {
    name: winnerName,
    logoUrl,
    shortName: winnerTeam?.customShortName
  }
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

// Card density: 'compact' (UEFA style matching image) or 'expanded' (full card)
const cardStyle = ref<'compact' | 'expanded'>('compact')

const effectiveColWidth = computed(() => cardStyle.value === 'compact' ? 96 : 250)
const effectiveConnWidth = computed(() => cardStyle.value === 'compact' ? 44 : 48)
const effectiveFinalWidth = computed(() => cardStyle.value === 'compact' ? 100 : 260)

const totalWingRows = computed(() => {
  const matches = Math.max(1, Math.ceil(firstRoundMatches.value / 2))
  return matches * 2
})

const dualGridColumns = computed(() => {
  const n = feederRounds.value.length
  if (n === 0) return `${effectiveFinalWidth.value}px`
  const leftCols: string[] = []
  for (let i = 0; i < n; i++) {
    leftCols.push(`${effectiveColWidth.value}px`)
    leftCols.push(`${effectiveConnWidth.value}px`)
  }
  const centerCol = `${effectiveFinalWidth.value}px`
  const rightCols: string[] = []
  for (let i = 0; i < n; i++) {
    rightCols.push(`${effectiveConnWidth.value}px`)
    rightCols.push(`${effectiveColWidth.value}px`)
  }
  return [...leftCols, centerCol, ...rightCols].join(' ')
})

const linearGridColumns = computed(() =>
  props.rounds.map((_, i) => i < props.rounds.length - 1 ? `${effectiveColWidth.value}px ${effectiveConnWidth.value}px` : `${effectiveColWidth.value}px`).join(' ')
)

// Vertical tree grid computations
const verticalMaxWingMatches = computed(() => {
  if (props.rounds.length === 0) return 1
  const round0 = props.rounds[0]!
  const round0Matches = activeMatchupsByRound.value[round0]?.length || 0
  return Math.max(1, Math.ceil(round0Matches / 2))
})

const verticalTotalCols = computed(() => {
  return verticalMaxWingMatches.value * 2
})

const verticalGridColumns = computed(() => {
  return `repeat(${verticalTotalCols.value}, minmax(0, 1fr))`
})

const getWingMatchGridColumn = (roundIndex: number, matchIndexInWing: number) => {
  const depth = getWingTreeDepth(roundIndex)
  const span = Math.pow(2, depth)
  const start = matchIndexInWing * span * 2 + 1
  const end = start + span * 2
  return `${start} / ${end}`
}

const getVerticalMergeGridColumn = (roundIndex: number, pairIndex: number) => {
  const depth = getWingTreeDepth(roundIndex)
  const span = Math.pow(2, depth)
  const start = pairIndex * span * 4 + 1
  const end = (pairIndex + 1) * span * 4 + 1
  return `${start} / ${end}`
}

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
      description: 'Matchups randomized.',
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
    description: 'Top seeds balanced across both sides.',
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
      description: 'Bracket matchups updated successfully.',
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

// Escape key listener & screen resize listener
onMounted(() => {
  const updateScreen = () => {
    if (typeof window !== 'undefined') {
      isSmallScreen.value = window.innerWidth < 768
    }
  }
  updateScreen()
  window.addEventListener('resize', updateScreen)

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
    window.removeEventListener('resize', updateScreen)
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

// Drag-to-scroll (pan) functionality
const isDragging = ref(false)
let isMouseDown = false
let startX = 0
let scrollLeftStart = 0
let hasMoved = false

const onMouseDown = (e: MouseEvent) => {
  if (e.button !== 0 || !bracketContainerRef.value) return

  // Don't drag if clicking buttons, links or form controls
  const target = e.target as HTMLElement
  if (target.closest('button') || target.closest('a') || target.closest('input')) {
    return
  }

  isMouseDown = true
  hasMoved = false
  startX = e.pageX - bracketContainerRef.value.offsetLeft
  scrollLeftStart = bracketContainerRef.value.scrollLeft

  const onMouseMove = (moveEvent: MouseEvent) => {
    if (!isMouseDown || !bracketContainerRef.value) return
    const currentX = moveEvent.pageX - bracketContainerRef.value.offsetLeft
    const dx = currentX - startX

    if (!hasMoved && Math.abs(dx) > 3) {
      hasMoved = true
      isDragging.value = true
      window.getSelection()?.removeAllRanges()
    }

    if (hasMoved) {
      bracketContainerRef.value.scrollLeft = scrollLeftStart - dx
    }
  }

  const onMouseUp = () => {
    isMouseDown = false
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)

    if (hasMoved) {
      const preventClick = (clickEvent: MouseEvent) => {
        clickEvent.stopPropagation()
        clickEvent.preventDefault()
      }
      window.addEventListener('click', preventClick, { capture: true, once: true })
      setTimeout(() => {
        isDragging.value = false
        hasMoved = false
      }, 50)
    } else {
      isDragging.value = false
    }
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
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
      class="sticky top-0 z-50 mb-3 mx-2 rounded-xl border border-gray-300 dark:border-white/10 bg-white/95 dark:bg-[#141414]/95 p-3 shadow-lg backdrop-blur flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-150"
    >
      <div class="flex items-center gap-3 flex-wrap">
        <div class="flex items-center gap-2 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-700 dark:text-gray-300">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-gray-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-gray-500"></span>
          </span>
          Arrange Mode
        </div>

        <div v-if="selectedSlot" class="flex items-center gap-2 text-xs font-medium text-gray-800 dark:text-gray-200">
          <span>Selected:</span>
          <span class="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold">
            {{ getTeamNameFromSlot(selectedSlot) }}
          </span>
          <span class="text-gray-400 text-[11px]">(Click another team in this round to swap)</span>
          <button
            @click="selectedSlot = null"
            class="text-xs text-primary-600 dark:text-primary-400 hover:underline ml-1"
          >
            Cancel
          </button>
        </div>
        <div v-else class="text-xs text-gray-500 dark:text-gray-400">
          Click any team to select it, then click another team in the same round to swap.
        </div>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <UButton
          size="xs"
          variant="soft"
          color="neutral"
          icon="i-heroicons-sparkles"
          label="Shuffle"
          :loading="isShuffling"
          @click="shuffleDraw"
        />
        <UButton
          size="xs"
          variant="soft"
          color="neutral"
          icon="i-heroicons-arrow-path"
          label="Seeding"
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

    <!-- Top Controls Toolbar (Orientation Toggle + Sub-Modes + Arrange + Zoom) -->
    <div class="flex flex-wrap items-center justify-between gap-2 mb-3 px-1 select-none">
      <!-- Left: Orientation Toggle (Horizontal vs Vertical) -->
      <div class="flex items-center rounded-lg border border-gray-200 bg-white/90 p-0.5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#141414]/90 text-xs">
        <button
          @click="setOrientation('horizontal')"
          :class="!isVertical ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-bold' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'"
          class="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] transition-colors"
          title="Horizontal Bracket (Desktop/Large Screen View)"
        >
          <UIcon name="i-heroicons-arrows-right-left" class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">Horizontal</span>
        </button>
        <button
          @click="setOrientation('vertical')"
          :class="isVertical ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-bold' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'"
          class="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] transition-colors"
          title="Vertical Bracket (Mobile/Small Screen View)"
        >
          <UIcon name="i-heroicons-arrows-up-down" class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">Vertical</span>
        </button>
      </div>

      <!-- Right: Sub-Controls -->
      <div class="flex items-center gap-2">
        <!-- Horizontal Sub-Mode Toggle (Dual-Sided vs Classic Linear) - only in horizontal mode -->
        <div v-if="!isVertical && feederRounds.length > 0" class="flex items-center rounded-lg border border-gray-200 bg-white/90 p-0.5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#141414]/90 text-xs">
          <button
            @click="setLayoutMode('dual')"
            :class="layoutMode === 'dual' ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-bold' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'"
            class="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-colors"
            title="Dual-Sided (Two sides converging to center)"
          >
            <UIcon name="i-heroicons-arrows-pointing-in" class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">Dual</span>
          </button>
          <button
            @click="setLayoutMode('linear')"
            :class="layoutMode === 'linear' ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-bold' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'"
            class="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-colors"
            title="Classic Linear (Left to right)"
          >
            <UIcon name="i-heroicons-arrow-right" class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">Linear</span>
          </button>
        </div>

        <!-- Arrange Button -->
        <button
          v-if="canArrange && !isArranging"
          @click="enterArrangeMode"
          class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200 bg-white/90 dark:bg-[#141414]/90 hover:border-gray-300 dark:border-white/10 dark:hover:border-white/20 text-gray-700 dark:text-gray-300 text-xs font-semibold shadow-sm backdrop-blur transition-all"
          title="Rearrange knockout matches or swap teams"
        >
          <UIcon name="i-heroicons-arrows-right-left" class="w-3.5 h-3.5" />
          <span>Arrange</span>
        </button>

        <!-- Card Density Toggle (Compact vs Expanded) - only in horizontal mode -->
        <div v-if="!isVertical" class="flex items-center rounded-lg border border-gray-200 bg-white/90 p-0.5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#141414]/90 text-xs">
          <button
            @click="cardStyle = 'compact'"
            :class="cardStyle === 'compact' ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-bold' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'"
            class="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-colors"
            title="Compact UEFA Style Cards"
          >
            <UIcon name="i-heroicons-squares-2x2" class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">Compact</span>
          </button>
          <button
            @click="cardStyle = 'expanded'"
            :class="cardStyle === 'expanded' ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-bold' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'"
            class="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-colors"
            title="Expanded Cards with Full Names"
          >
            <UIcon name="i-heroicons-bars-3" class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">Expanded</span>
          </button>
        </div>

        <!-- Zoom Controls (Only in horizontal mode) -->
        <div v-if="!isVertical" class="flex items-center gap-1 rounded-lg border border-gray-200 bg-white/90 p-1 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#141414]/90 text-xs select-none">
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
    </div>

    <!-- 1. MOBILE VERTICAL BRACKET FOR SMALLER SCREENS (UEFA Style Vertical Tree) -->
    <div v-if="isVertical" class="vertical-bracket-container w-full max-w-lg mx-auto py-3 px-1 select-none flex flex-col items-center">
      <!-- TOP WING: Feeder rounds advancing downwards to Grand Final -->
      <template v-for="(round, roundIdx) in feederRounds" :key="`v-left-round-${round}`">
        <!-- Matches row -->
        <div class="w-full grid gap-1.5" :style="{ gridTemplateColumns: verticalGridColumns }">
          <template v-for="(matchup, mIdx) in getWingMatchups(round, 'left')" :key="`v-left-m-${matchup.id}`">
            <div :style="{ gridColumn: getWingMatchGridColumn(roundIdx, mIdx) }" class="flex justify-center w-full">
              <KnockoutCompactCard
                :matchup="matchup"
                :round="round"
                :match-index="getGlobalMatchIndex(round, 'left', mIdx)"
                :is-arranging="isArranging"
                :selected-slot="selectedSlot"
                :readonly="readonly"
                :updating-match="updatingMatch"
                :is-playoff-first-round="roundIdx === 0 && isPlayoffFirstRound"
                @slot-click="handleSlotClick"
                @swap-home-away="swapMatchHomeAway"
                @start-match="emit('start-match', $event)"
                @control-match="emit('control-match', $event)"
                @show-legs="openTwoLegModal"
                @enter-arrange="enterArrangeMode"
              />
            </div>
          </template>
        </div>

        <!-- Connector row down -->
        <div class="w-full">
          <!-- If this is the last feeder round (Semi-Final 1), straight line down to Final -->
          <template v-if="roundIdx === feederRounds.length - 1">
            <div class="h-6 w-full flex justify-center">
              <div class="w-px h-full bg-slate-300 dark:bg-white/20"></div>
            </div>
          </template>

          <!-- 1-to-1 straight lines for Playoff round -->
          <template v-else-if="roundIdx === 0 && isPlayoffFirstRound">
            <div class="w-full grid gap-1.5 h-6" :style="{ gridTemplateColumns: verticalGridColumns }">
              <template v-for="mIdx in getWingMatchups(round, 'left').length" :key="`v-conn-str-${mIdx}`">
                <div :style="{ gridColumn: getWingMatchGridColumn(0, mIdx - 1) }" class="flex justify-center">
                  <div class="w-px h-full bg-slate-300 dark:bg-white/20"></div>
                </div>
              </template>
            </div>
          </template>

          <!-- Binary merge down for intermediate rounds -->
          <template v-else>
            <div class="w-full grid gap-1.5 h-8" :style="{ gridTemplateColumns: verticalGridColumns }">
              <template v-for="pairIdx in Math.ceil(getWingMatchups(round, 'left').length / 2)" :key="`v-conn-bin-${pairIdx}`">
                <div :style="{ gridColumn: getVerticalMergeGridColumn(roundIdx, pairIdx - 1) }" class="w-full h-8">
                  <svg class="w-full h-full" viewBox="0 0 100 32" preserveAspectRatio="none">
                    <path d="M 25 0 V 12 Q 25 16 29 16 H 71 Q 75 16 75 12 V 0 M 50 16 V 32" class="v-bracket-line" />
                  </svg>
                </div>
              </template>
            </div>
          </template>
        </div>
      </template>

      <!-- CENTER ROW: Grand Final centered at 50% + Trophy Showcase on the Right -->
      <div class="w-full relative flex items-center justify-center py-2 min-h-[90px]">
        <!-- Grand Final Match Card (Exact horizontal 50% center) -->
        <div v-if="finalRoundMainMatchups.length > 0" class="flex flex-col items-center z-10">
          <KnockoutCompactCard
            :matchup="finalRoundMainMatchups[0]"
            :round="finalRound"
            :match-index="0"
            :is-final="true"
            :is-arranging="isArranging"
            :selected-slot="selectedSlot"
            :readonly="readonly"
            :updating-match="updatingMatch"
            @slot-click="handleSlotClick"
            @swap-home-away="swapMatchHomeAway"
            @start-match="emit('start-match', $event)"
            @control-match="emit('control-match', $event)"
            @show-legs="openTwoLegModal"
            @enter-arrange="enterArrangeMode"
          />

          <!-- 3rd Place Match underneath if present -->
          <div v-if="thirdPlaceMatchups.length > 0" class="mt-4 flex flex-col items-center">
            <span class="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1">3rd Place</span>
            <KnockoutCompactCard
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
              @show-legs="openTwoLegModal"
              @enter-arrange="enterArrangeMode"
            />
          </div>
        </div>

        <!-- Right: Trophy Showcase in the right wing whitespace -->
        <div class="absolute right-0 sm:right-2 flex flex-col items-center pointer-events-none">
          <BracketChampionTrophy
            :champion="tournamentChampion"
            :is-decided="!!tournamentChampion"
          />
        </div>
      </div>

      <!-- BOTTOM WING: Feeder rounds advancing upwards into Grand Final -->
      <template v-for="(round, revIdx) in reversedFeederRounds" :key="`v-right-round-${round}`">
        <!-- Connector row up -->
        <div class="w-full">
          <!-- If revIdx === 0 (Semi-Final 2), straight line up into Grand Final -->
          <template v-if="revIdx === 0">
            <div class="h-6 w-full flex justify-center">
              <div class="w-px h-full bg-slate-300 dark:bg-white/20"></div>
            </div>
          </template>

          <!-- 1-to-1 straight lines for Playoff round -->
          <template v-else-if="(feederRounds.length - 1 - revIdx) === 0 && isPlayoffFirstRound">
            <div class="w-full grid gap-1.5 h-6" :style="{ gridTemplateColumns: verticalGridColumns }">
              <template v-for="mIdx in getWingMatchups(round, 'right').length" :key="`v-b-conn-str-${mIdx}`">
                <div :style="{ gridColumn: getWingMatchGridColumn(0, mIdx - 1) }" class="flex justify-center">
                  <div class="w-px h-full bg-slate-300 dark:bg-white/20"></div>
                </div>
              </template>
            </div>
          </template>

          <!-- Binary merge up into round above -->
          <template v-else>
            <div class="w-full grid gap-1.5 h-8" :style="{ gridTemplateColumns: verticalGridColumns }">
              <template v-for="pairIdx in Math.ceil(getWingMatchups(round, 'right').length / 2)" :key="`v-b-conn-bin-${pairIdx}`">
                <div :style="{ gridColumn: getVerticalMergeGridColumn(feederRounds.length - 1 - revIdx, pairIdx - 1) }" class="w-full h-8">
                  <svg class="w-full h-full" viewBox="0 0 100 32" preserveAspectRatio="none">
                    <path d="M 50 0 V 16 M 25 32 V 20 Q 25 16 29 16 H 71 Q 75 16 75 20 V 32" class="v-bracket-line" />
                  </svg>
                </div>
              </template>
            </div>
          </template>
        </div>

        <!-- Matches row -->
        <div class="w-full grid gap-1.5" :style="{ gridTemplateColumns: verticalGridColumns }">
          <template v-for="(matchup, mIdx) in getWingMatchups(round, 'right')" :key="`v-right-m-${matchup.id}`">
            <div :style="{ gridColumn: getWingMatchGridColumn(feederRounds.length - 1 - revIdx, mIdx) }" class="flex justify-center w-full">
              <KnockoutCompactCard
                :matchup="matchup"
                :round="round"
                :match-index="getGlobalMatchIndex(round, 'right', mIdx)"
                :is-arranging="isArranging"
                :selected-slot="selectedSlot"
                :readonly="readonly"
                :updating-match="updatingMatch"
                :is-playoff-first-round="(feederRounds.length - 1 - revIdx) === 0 && isPlayoffFirstRound"
                @slot-click="handleSlotClick"
                @swap-home-away="swapMatchHomeAway"
                @start-match="emit('start-match', $event)"
                @control-match="emit('control-match', $event)"
                @show-legs="openTwoLegModal"
                @enter-arrange="enterArrangeMode"
              />
            </div>
          </template>
        </div>
      </template>
    </div>

    <!-- 2. HORIZONTAL BRACKET FOR LARGE SCREENS -->
    <div
      v-else
      ref="bracketContainerRef"
      class="bracket-container"
      :class="{ 'is-dragging': isDragging }"
      @mousedown="onMouseDown"
    >
      <div class="bracket-scroll" :style="{ zoom: scale }">

        <!-- ========================================== -->
        <!-- 1. DUAL-SIDED CENTER-CONVERGING LAYOUT    -->
        <!-- ========================================== -->
        <template v-if="layoutMode === 'dual' && feederRounds.length > 0">
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
              <div class="w-[48px]" />
            </template>

            <!-- Center Final Header -->
            <div class="bracket-header">
              <span>{{ getRoundDisplayName(finalRound, rounds.length - 1, rounds.length) }}</span>
            </div>

            <!-- Right Wing Headers (Reversed: SF <- Round 0) -->
            <template v-for="(round, revIdx) in reversedFeederRounds" :key="`dual-h-right-${round}`">
              <!-- Connector space -->
              <div class="w-[48px]" />
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
                    <KnockoutCompactCard
                      v-if="cardStyle === 'compact'"
                      :matchup="matchup"
                      :round="round"
                      :match-index="getGlobalMatchIndex(round, 'left', mIdx)"
                      :is-arranging="isArranging"
                      :selected-slot="selectedSlot"
                      :readonly="readonly"
                      :updating-match="updatingMatch"
                      :is-playoff-first-round="roundIdx === 0 && isPlayoffFirstRound"
                      @slot-click="handleSlotClick"
                      @swap-home-away="swapMatchHomeAway"
                      @start-match="emit('start-match', $event)"
                      @control-match="emit('control-match', $event)"
                      @show-legs="openTwoLegModal"
                      @enter-arrange="enterArrangeMode"
                    />
                    <KnockoutMatchCard
                      v-else
                      :matchup="matchup"
                      :round="round"
                      :match-index="getGlobalMatchIndex(round, 'left', mIdx)"
                      :is-arranging="isArranging"
                      :selected-slot="selectedSlot"
                      :readonly="readonly"
                      :updating-match="updatingMatch"
                      :is-playoff-first-round="roundIdx === 0 && isPlayoffFirstRound"
                      @slot-click="handleSlotClick"
                      @swap-home-away="swapMatchHomeAway"
                      @start-match="emit('start-match', $event)"
                      @control-match="emit('control-match', $event)"
                      @show-legs="openTwoLegModal"
                      @enter-arrange="enterArrangeMode"
                    />
                  </div>
                </template>
              </div>

              <!-- Left Wing Connector Column -->
              <div class="connector-column">
                <!-- If this is the last feeder round (Semi-Final 1), straight line to Final -->
                <template v-if="roundIdx === feederRounds.length - 1">
                  <div
                    class="connector-pair"
                    :style="{ gridRow: `1 / ${totalWingRows + 1}` }"
                  >
                    <svg class="connector-svg" viewBox="0 0 48 100" preserveAspectRatio="none">
                      <path d="M 0 50 L 48 50" class="connector-line" />
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
                      <svg class="connector-svg" viewBox="0 0 48 100" preserveAspectRatio="none">
                        <path d="M 0 50 L 48 50" class="connector-line" />
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
                      <svg class="connector-svg" viewBox="0 0 48 100" preserveAspectRatio="none">
                        <path d="M 0 25 H 18 Q 24 25 24 30 V 70 Q 24 75 18 75 H 0 M 24 50 H 48" class="connector-line" />
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
              <div class="final-center-slot">
                <!-- Top Slot: Champion Trophy Showcase (Positioned directly above Grand Final card) -->
                <div class="final-top-slot">
                  <BracketChampionTrophy
                    :champion="tournamentChampion"
                    :is-decided="!!tournamentChampion"
                  />
                </div>

                <!-- Center Slot: Grand Final Match Card (Exact 50% vertical center connecting left & right) -->
                <div v-if="finalRoundMainMatchups.length > 0" class="w-full flex justify-center">
                  <KnockoutCompactCard
                    v-if="cardStyle === 'compact'"
                    :matchup="finalRoundMainMatchups[0]"
                    :round="finalRound"
                    :match-index="0"
                    :is-final="true"
                    :is-arranging="isArranging"
                    :selected-slot="selectedSlot"
                    :readonly="readonly"
                    :updating-match="updatingMatch"
                    @slot-click="handleSlotClick"
                    @swap-home-away="swapMatchHomeAway"
                    @start-match="emit('start-match', $event)"
                    @control-match="emit('control-match', $event)"
                    @show-legs="openTwoLegModal"
                    @enter-arrange="enterArrangeMode"
                  />
                  <KnockoutMatchCard
                    v-else
                    :matchup="finalRoundMainMatchups[0]"
                    :round="finalRound"
                    :match-index="0"
                    :is-arranging="isArranging"
                    :selected-slot="selectedSlot"
                    :readonly="readonly"
                    :updating-match="updatingMatch"
                    @slot-click="handleSlotClick"
                    @swap-home-away="swapMatchHomeAway"
                    @start-match="emit('start-match', $event)"
                    @control-match="emit('control-match', $event)"
                    @show-legs="openTwoLegModal"
                    @enter-arrange="enterArrangeMode"
                  />
                </div>

                <!-- Bottom Slot: 3rd Place Play-off Match underneath Grand Final -->
                <div v-if="thirdPlaceMatchups.length > 0" class="final-bottom-slot">
                  <div class="w-full flex flex-col items-center">
                    <div class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 text-center">
                      3rd Place Play-off
                    </div>
                    <KnockoutCompactCard
                      v-if="cardStyle === 'compact'"
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
                      @show-legs="openTwoLegModal"
                      @enter-arrange="enterArrangeMode"
                    />
                    <KnockoutMatchCard
                      v-else
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
                      @show-legs="openTwoLegModal"
                      @enter-arrange="enterArrangeMode"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- RIGHT WING COLUMNS (Reversed: SF -> QF -> R16 -> Playoffs) -->
            <template v-for="(round, revIdx) in reversedFeederRounds" :key="`right-wing-${round}`">
              <!-- Right Wing Connector Column -->
              <div class="connector-column">
                <!-- If this is the last feeder round (Semi-Final 2), straight line to Final from Right -->
                <template v-if="revIdx === 0">
                  <div
                    class="connector-pair"
                    :style="{ gridRow: `1 / ${totalWingRows + 1}` }"
                  >
                    <svg class="connector-svg" viewBox="0 0 48 100" preserveAspectRatio="none">
                      <path d="M 48 50 L 0 50" class="connector-line" />
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
                      <svg class="connector-svg" viewBox="0 0 48 100" preserveAspectRatio="none">
                        <path d="M 48 50 L 0 50" class="connector-line" />
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
                      <svg class="connector-svg" viewBox="0 0 48 100" preserveAspectRatio="none">
                        <path d="M 48 25 H 30 Q 24 25 24 30 V 70 Q 24 75 30 75 H 48 M 24 50 H 0" class="connector-line" />
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
                    <KnockoutCompactCard
                      v-if="cardStyle === 'compact'"
                      :matchup="matchup"
                      :round="round"
                      :match-index="getGlobalMatchIndex(round, 'right', mIdx)"
                      :is-arranging="isArranging"
                      :selected-slot="selectedSlot"
                      :readonly="readonly"
                      :updating-match="updatingMatch"
                      :is-playoff-first-round="(feederRounds.length - 1 - revIdx) === 0 && isPlayoffFirstRound"
                      @slot-click="handleSlotClick"
                      @swap-home-away="swapMatchHomeAway"
                      @start-match="emit('start-match', $event)"
                      @control-match="emit('control-match', $event)"
                      @show-legs="openTwoLegModal"
                      @enter-arrange="enterArrangeMode"
                    />
                    <KnockoutMatchCard
                      v-else
                      :matchup="matchup"
                      :round="round"
                      :match-index="getGlobalMatchIndex(round, 'right', mIdx)"
                      :is-arranging="isArranging"
                      :selected-slot="selectedSlot"
                      :readonly="readonly"
                      :updating-match="updatingMatch"
                      :is-playoff-first-round="(feederRounds.length - 1 - revIdx) === 0 && isPlayoffFirstRound"
                      @slot-click="handleSlotClick"
                      @swap-home-away="swapMatchHomeAway"
                      @start-match="emit('start-match', $event)"
                      @control-match="emit('control-match', $event)"
                      @show-legs="openTwoLegModal"
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
              <div v-if="roundIndex < rounds.length - 1" class="w-[48px]" />
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
                    :class="{ 'match-cell--final': roundIndex === rounds.length - 1 }"
                    :style="{ gridRow: getLinearMatchGridRow(roundIndex, matchIndex) }"
                  >
                    <!-- Champion Trophy Showcase in Linear Mode -->
                    <div
                      v-if="roundIndex === rounds.length - 1 && matchIndex === 0"
                      class="final-top-slot"
                    >
                      <BracketChampionTrophy
                        :champion="tournamentChampion"
                        :is-decided="!!tournamentChampion"
                      />
                    </div>

                    <KnockoutCompactCard
                      v-if="cardStyle === 'compact'"
                      :matchup="matchup"
                      :round="round"
                      :match-index="matchIndex"
                      :is-final="roundIndex === rounds.length - 1"
                      :is-arranging="isArranging"
                      :selected-slot="selectedSlot"
                      :readonly="readonly"
                      :updating-match="updatingMatch"
                      :is-playoff-first-round="roundIndex === 0 && isPlayoffFirstRound"
                      @slot-click="handleSlotClick"
                      @swap-home-away="swapMatchHomeAway"
                      @start-match="emit('start-match', $event)"
                      @control-match="emit('control-match', $event)"
                      @show-legs="openTwoLegModal"
                      @enter-arrange="enterArrangeMode"
                    />
                    <KnockoutMatchCard
                      v-else
                      :matchup="matchup"
                      :round="round"
                      :match-index="matchIndex"
                      :is-arranging="isArranging"
                      :selected-slot="selectedSlot"
                      :readonly="readonly"
                      :updating-match="updatingMatch"
                      :is-playoff-first-round="roundIndex === 0 && isPlayoffFirstRound"
                      @slot-click="handleSlotClick"
                      @swap-home-away="swapMatchHomeAway"
                      @start-match="emit('start-match', $event)"
                      @control-match="emit('control-match', $event)"
                      @show-legs="openTwoLegModal"
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
                      <svg class="connector-svg" viewBox="0 0 48 100" preserveAspectRatio="none">
                        <path d="M 0 50 L 48 50" class="connector-line" />
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
                      <svg class="connector-svg" viewBox="0 0 48 100" preserveAspectRatio="none">
                        <path d="M 0 25 H 18 Q 24 25 24 30 V 70 Q 24 75 18 75 H 0 M 24 50 H 48" class="connector-line" />
                      </svg>
                    </div>
                  </template>
                </template>
              </div>
            </template>
          </div>

          <!-- Linear 3rd Place Section -->
          <div v-if="thirdPlaceMatchups.length > 0" class="third-place-section" :style="{ marginLeft: `${(rounds.length - 1) * (effectiveColWidth + effectiveConnWidth)}px`, width: `${effectiveColWidth}px` }">
            <div v-for="matchup in thirdPlaceMatchups" :key="matchup.id" class="flex flex-col items-center">
              <div class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 text-center">
                3rd Place Play-off
              </div>
              <KnockoutCompactCard
                v-if="cardStyle === 'compact'"
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
                @show-legs="openTwoLegModal"
                @enter-arrange="enterArrangeMode"
              />
              <KnockoutMatchCard
                v-else
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
                @show-legs="openTwoLegModal"
                @enter-arrange="enterArrangeMode"
              />
            </div>
          </div>
        </template>

      </div>
    </div>
  </div>

  <!-- Two-Legged Knockout Ties Breakdown Modal -->
  <UModal v-model:open="showTwoLegModal" :ui="{ content: 'sm:max-w-xl' }">
    <template #content>
      <div v-if="selectedTwoLegMatchup" class="bg-white dark:bg-[#121212] text-gray-900 dark:text-white rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-2xl flex flex-col">
        <!-- Modal Header -->
        <div class="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
          <div class="flex items-center gap-2 min-w-0">
            <h3 class="text-sm font-bold tracking-tight text-gray-900 dark:text-white uppercase truncate">
              {{ getMatchupRoundName(selectedTwoLegMatchup) }} &mdash; 2 Legs Tie
            </h3>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-heroicons-x-mark"
            size="sm"
            class="-mr-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white"
            @click="showTwoLegModal = false"
          />
        </div>

        <!-- Aggregate Score Hero Banner -->
        <div class="p-5 bg-gradient-to-b from-gray-50/80 to-transparent dark:from-white/[0.03] dark:to-transparent border-b border-gray-100 dark:border-white/10">
          <div class="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 text-center mb-3">
            Aggregate Score
          </div>
          <div class="flex items-center justify-between gap-4">
            <!-- Home Team -->
            <div class="flex-1 flex flex-col items-center text-center min-w-0">
              <div class="w-12 h-12 rounded-full overflow-hidden bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/15 flex items-center justify-center mb-2 shadow-inner">
                <img
                  v-if="selectedTwoLegMatchup.homeTeam?.logoUrl"
                  :src="selectedTwoLegMatchup.homeTeam.logoUrl"
                  :alt="selectedTwoLegMatchup.homeTeam?.customName"
                  class="w-full h-full object-cover"
                />
                <span v-else class="text-sm font-bold text-gray-600 dark:text-gray-300">
                  {{ (selectedTwoLegMatchup.homeTeam?.customName || selectedTwoLegMatchup.homeTeamPlaceholder || 'H').charAt(0).toUpperCase() }}
                </span>
              </div>
              <span
                class="text-sm font-bold truncate max-w-full"
                :class="getMatchupWinner(selectedTwoLegMatchup) === 'home' ? 'text-gray-900 dark:text-white font-extrabold' : 'text-gray-600 dark:text-gray-400'"
              >
                {{ getTeamName(selectedTwoLegMatchup.homeTeam, selectedTwoLegMatchup.homeTeamPlaceholder) }}
              </span>
            </div>

            <!-- Score Display -->
            <div class="flex flex-col items-center shrink-0 px-2">
              <div class="text-3xl font-black tracking-widest text-gray-900 dark:text-white leading-none flex items-center gap-2">
                <span>{{ selectedTwoLegMatchup.homeScore ?? 0 }}</span>
                <span class="text-gray-400 dark:text-gray-500 font-normal">-</span>
                <span>{{ selectedTwoLegMatchup.awayScore ?? 0 }}</span>
              </div>

              <!-- Penalties badge if any -->
              <div
                v-if="selectedTwoLegMatchup.homePenaltyScore != null && selectedTwoLegMatchup.awayPenaltyScore != null"
                class="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400"
              >
                ({{ selectedTwoLegMatchup.homePenaltyScore }} - {{ selectedTwoLegMatchup.awayPenaltyScore }} pens)
              </div>

              <!-- Outcome / Status pill -->
              <div class="mt-2">
                <span
                  v-if="selectedTwoLegMatchup.status === FixtureStatus.COMPLETED"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300 border border-gray-200 dark:border-white/10"
                >
                  FT
                </span>
                <span
                  v-else-if="selectedTwoLegMatchup.status === FixtureStatus.LIVE || selectedTwoLegMatchup.status === FixtureStatus.NORMAL_TIME_ENDED || selectedTwoLegMatchup.status === FixtureStatus.EXTRATIME"
                  class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 animate-pulse"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  LIVE IN PROGRESS
                </span>
                <span
                  v-else
                  class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10"
                >
                  SCHEDULED
                </span>
              </div>
            </div>

            <!-- Away Team -->
            <div class="flex-1 flex flex-col items-center text-center min-w-0">
              <div class="w-12 h-12 rounded-full overflow-hidden bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/15 flex items-center justify-center mb-2 shadow-inner">
                <img
                  v-if="selectedTwoLegMatchup.awayTeam?.logoUrl"
                  :src="selectedTwoLegMatchup.awayTeam.logoUrl"
                  :alt="selectedTwoLegMatchup.awayTeam?.customName"
                  class="w-full h-full object-cover"
                />
                <span v-else class="text-sm font-bold text-gray-600 dark:text-gray-300">
                  {{ (selectedTwoLegMatchup.awayTeam?.customName || selectedTwoLegMatchup.awayTeamPlaceholder || 'A').charAt(0).toUpperCase() }}
                </span>
              </div>
              <span
                class="text-sm font-bold truncate max-w-full"
                :class="getMatchupWinner(selectedTwoLegMatchup) === 'away' ? 'text-gray-900 dark:text-white font-extrabold' : 'text-gray-600 dark:text-gray-400'"
              >
                {{ getTeamName(selectedTwoLegMatchup.awayTeam, selectedTwoLegMatchup.awayTeamPlaceholder) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Matches List: Leg 1 and Leg 2 -->
        <div class="p-4 sm:p-5 flex flex-col gap-3 overflow-y-auto max-h-[60vh]">
          <div
            v-for="(fixture, idx) in selectedTwoLegMatchup.fixtures"
            :key="fixture.id || idx"
            class="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#181818] hover:border-gray-300 dark:hover:border-white/20 transition-all duration-200 overflow-hidden shadow-xs dark:shadow-sm"
          >
            <!-- Leg Header -->
            <div class="flex items-center justify-between px-3.5 py-2 bg-gray-50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/5 text-xs">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded-md font-bold text-[11px] bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-white/5">
                  Leg {{ idx + 1 }}
                </span>
                <span v-if="fixture.venue" class="text-gray-500 dark:text-gray-400 text-[11px] flex items-center gap-1">
                  <UIcon name="i-heroicons-map-pin" class="w-3 h-3 text-gray-400 dark:text-gray-500" />
                  {{ fixture.venue }}
                </span>
              </div>

              <div class="flex items-center gap-2">
                <span v-if="fixture.startTime" class="text-[11px] text-gray-500 dark:text-gray-400">
                  {{ formatLegDate(fixture.startTime) }}
                </span>
                <span
                  v-if="fixture.status === FixtureStatus.LIVE || fixture.status === FixtureStatus.NORMAL_TIME_ENDED || fixture.status === FixtureStatus.EXTRATIME"
                  class="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-1"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live
                </span>
                <span
                  v-else-if="fixture.status === FixtureStatus.COMPLETED"
                  class="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300"
                >
                  FT
                </span>
                <span
                  v-else
                  class="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400"
                >
                  Scheduled
                </span>
              </div>
            </div>

            <!-- Teams & Leg Score Row -->
            <div class="p-3.5 flex items-center justify-between gap-3">
              <!-- Leg Home Team -->
              <div class="flex-1 flex items-center gap-2.5 min-w-0">
                <div class="w-7 h-7 rounded-full overflow-hidden bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center shrink-0">
                  <img
                    v-if="fixture.homeTeam?.logoUrl"
                    :src="fixture.homeTeam.logoUrl"
                    :alt="fixture.homeTeam?.customName"
                    class="w-full h-full object-cover"
                  />
                  <span v-else class="text-xs font-bold text-gray-600 dark:text-gray-300">
                    {{ (fixture.homeTeam?.customName || fixture.homeTeamPlaceholder || 'H').charAt(0).toUpperCase() }}
                  </span>
                </div>
                <div class="flex flex-col min-w-0">
                  <span
                    class="text-xs font-semibold truncate"
                    :class="getFixtureWinner(fixture) === 'home' ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-600 dark:text-gray-400'"
                  >
                    {{ getTeamName(fixture.homeTeam, fixture.homeTeamPlaceholder) }}
                  </span>
                  <span class="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-medium">Home</span>
                </div>
              </div>

              <!-- Leg Score -->
              <div class="flex flex-col items-center shrink-0 px-2">
                <div
                  v-if="fixture.status === FixtureStatus.COMPLETED || fixture.status === FixtureStatus.LIVE || fixture.status === FixtureStatus.NORMAL_TIME_ENDED || fixture.status === FixtureStatus.EXTRATIME"
                  class="text-base font-black tracking-wider text-gray-900 dark:text-white"
                >
                  <span>{{ fixture.homeScore ?? 0 }}</span>
                  <span class="text-gray-400 dark:text-gray-500 mx-1.5">-</span>
                  <span>{{ fixture.awayScore ?? 0 }}</span>
                </div>
                <div v-else class="text-xs font-bold text-gray-400 dark:text-gray-500">
                  vs
                </div>

                <!-- Penalties if decided on penalties in this leg -->
                <span
                  v-if="fixture.homePenaltyScore != null && fixture.awayPenaltyScore != null"
                  class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 -mt-0.5"
                >
                  ({{ fixture.homePenaltyScore }} - {{ fixture.awayPenaltyScore }} pens)
                </span>
              </div>

              <!-- Leg Away Team -->
              <div class="flex-1 flex items-center justify-end gap-2.5 min-w-0 text-right">
                <div class="flex flex-col min-w-0 items-end">
                  <span
                    class="text-xs font-semibold truncate"
                    :class="getFixtureWinner(fixture) === 'away' ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-600 dark:text-gray-400'"
                  >
                    {{ getTeamName(fixture.awayTeam, fixture.awayTeamPlaceholder) }}
                  </span>
                  <span class="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-medium">Away</span>
                </div>
                <div class="w-7 h-7 rounded-full overflow-hidden bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center shrink-0">
                  <img
                    v-if="fixture.awayTeam?.logoUrl"
                    :src="fixture.awayTeam.logoUrl"
                    :alt="fixture.awayTeam?.customName"
                    class="w-full h-full object-cover"
                  />
                  <span v-else class="text-xs font-bold text-gray-600 dark:text-gray-300">
                    {{ (fixture.awayTeam?.customName || fixture.awayTeamPlaceholder || 'A').charAt(0).toUpperCase() }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Leg Action Footer -->
            <div class="px-3.5 py-2 bg-gray-50/50 dark:bg-white/[0.015] border-t border-gray-100 dark:border-white/5 flex items-center justify-end gap-2">
              <template v-if="!readonly">
                <!-- If match can be started -->
                <UButton
                  v-if="fixture.status === FixtureStatus.SCHEDULED && fixture.homeTeamId && fixture.awayTeamId"
                  color="success"
                  variant="solid"
                  size="xs"
                  icon="i-heroicons-play"
                  label="Start Leg"
                  :disabled="updatingMatch"
                  @click="handleStartLeg(fixture)"
                />
                <!-- If match can be controlled / edited -->
                <UButton
                  v-else-if="fixture.status === FixtureStatus.LIVE || fixture.status === FixtureStatus.NORMAL_TIME_ENDED || fixture.status === FixtureStatus.EXTRATIME || fixture.status === FixtureStatus.COMPLETED"
                  color="neutral"
                  variant="soft"
                  size="xs"
                  icon="i-heroicons-adjustments-horizontal"
                  label="Match Control"
                  @click="handleControlLeg(fixture)"
                />
              </template>
              <template v-else>
                <!-- Public Spectator view -->
                <UButton
                  color="neutral"
                  variant="soft"
                  size="xs"
                  icon="i-heroicons-chart-bar"
                  label="View Match"
                  @click="handleControlLeg(fixture)"
                />
              </template>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
/* ── Container & scroll ───────────────────────────────────── */
.bracket-container {
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0.75rem 0;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  scrollbar-width: thin;
  scrollbar-color: rgba(156,163,175,0.4) transparent;
}

.bracket-container:active,
.bracket-container.is-dragging {
  cursor: grabbing !important;
}

.bracket-container.is-dragging * {
  cursor: grabbing !important;
  user-select: none !important;
  -webkit-user-select: none !important;
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
  padding-bottom: 1rem;
  transform-origin: top left;
}

/* ── Round headers ────────────────────────────────────────── */
.bracket-headers {
  display: grid;
  margin-bottom: 0.75rem;
}

.bracket-header {
  font-size: 0.675rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;
  padding: 0.35rem 0.5rem;
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

/* ── Grid layout ──────────────────────────────────────────── */
.bracket-grid {
  grid-template-rows: repeat(var(--total-rows), minmax(36px, 1fr));
}

.matches-column {
  display: contents;
}

.match-cell {
  display: flex;
  align-items: center;
  padding: 4px 0;
  min-width: 0;
  overflow: hidden;
}

.match-cell--final {
  position: relative;
  min-height: 420px;
  overflow: visible;
}

/* ── Final Center Column ──────────────────────────────────── */
.final-column {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  min-height: 420px;
  width: 100%;
}

.final-center-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  position: relative;
  z-index: 10;
}

.final-top-slot {
  position: absolute;
  bottom: calc(100% + 12px);
  left: 0;
  right: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 5;
  pointer-events: auto;
}

.final-bottom-slot {
  position: absolute;
  top: calc(100% + 14px);
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  z-index: 5;
  width: 100%;
  pointer-events: auto;
}

/* ── Connector column ─────────────────────────────────────── */
.connector-column {
  display: contents;
}

.connector-pair {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
}

.connector-svg {
  width: 48px;
  height: 100%;
  overflow: visible;
}

.connector-line {
  stroke: #cbd5e1;
  stroke-width: 1.5;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

:root.dark .connector-line {
  stroke: rgba(255, 255, 255, 0.2);
}

/* ── 3rd place ────────────────────────────────────────────── */
.third-place-section {
  margin-top: 1rem;
}

/* ── Vertical Bracket (Mobile Tree) ───────────────────────── */
.vertical-bracket-container {
  user-select: none;
  -webkit-user-select: none;
}

.v-bracket-line {
  stroke: #cbd5e1;
  stroke-width: 1.5;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

:root.dark .v-bracket-line {
  stroke: rgba(255, 255, 255, 0.2);
}

.scrollbar-none {
  scrollbar-width: none;
}
.scrollbar-none::-webkit-scrollbar {
  display: none;
}
</style>
