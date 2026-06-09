<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { Visibility, TournamentType, ParticipantType, ParticipantStatus, FixtureStatus, FixtureStage } from '~/types'
import type { Participant, Fixture, Sponsor, Social, Tournament, Venue } from '~/types'
import GroupSetupWizard from '~/components/GroupSetupWizard.vue'
import KnockoutWizard from '~/components/KnockoutWizard.vue'
import TournamentInviteModal from '~/components/TournamentInviteModal.vue'
import QrcodeVue from 'qrcode.vue'

definePageMeta({
  middleware: ['require-organizer'],
  layout: 'dashboard'
})

const route = useRoute()
const tournamentStore = useTournamentStore()
const participantStore = useParticipantStore()
const teamStore = useTeamStore()
const fixtureStore = useFixtureStore()
const standingStore = useStandingStore()
const sponsorStore = useSponsorStore()
const authStore = useAuthStore()
const groupStore = useGroupStore()
const socialStore = useSocialStore()
const venueStore = useVenueStore()
const paymentStore = usePaymentStore()
const { handleError, extractErrorMessage } = useErrors()
const toast = useToast()
const config = useRuntimeConfig()

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text)
  toast.add({ title: 'Copied to clipboard', color: 'success' })
}
const { currentTournament: tournament, loading, error } = storeToRefs(tournamentStore)
const { participants, loading: participantsLoading } = storeToRefs(participantStore)
const { fixtures, fixturesByRound, rounds, knockoutFixturesByRound, knockoutRounds, groupStageFixturesByRound, groupStageRounds, loading: fixturesLoading, generating } = storeToRefs(fixtureStore)
const { standings, loading: standingsLoading } = storeToRefs(standingStore)
const { sponsors, loading: sponsorsLoading } = storeToRefs(sponsorStore)
const { socials, loading: socialsLoading } = storeToRefs(socialStore)
const { venues, loading: venuesLoading } = storeToRefs(venueStore)

// Player Stats state
const playerStats = ref<any>(null)
const playerStatsLoading = ref(false)

const loadPlayerStats = async () => {
  if (!tournamentId.value) return
  playerStatsLoading.value = true
  try {
    const res = await $api<{success: boolean, data: any}>(`/tournaments/${tournamentId.value}/player-stats`)
    if (res.data) {
      playerStats.value = res.data
    }
  } catch (e) {
    console.error('Failed to load player stats:', e)
  } finally {
    playerStatsLoading.value = false
  }
}

// Fetch tournament, participants, and fixtures on mount
const showKnockoutWizard = ref(false)
const tournamentId = computed(() => route.params.id as string)

// Subscription / Premium state
const { subscription, isPro } = storeToRefs(paymentStore)

const showUpgradeBanner = computed(() => {
  if (!tournament.value) return false
  // Already premium (per-tournament or via org subscription)
  if (tournament.value.isPremium) return false
  if (isPro.value) return false
  return true
})

const upgradingFromBanner = ref(false)

async function handleUpgradeTournament() {
  if (!authStore.currentOrganization?.id || !tournamentId.value) return

  upgradingFromBanner.value = true
  try {
    const dashboardUrl = config.public.DASHBOARD_URL || window.location.origin
    const callbackUrl = `${dashboardUrl}/billing/callback`

    const response = await paymentStore.initializePayment(
      authStore.currentOrganization.id,
      'PER_TOURNAMENT',
      5000 * 100,
      callbackUrl,
      tournamentId.value
    )

    if (response.data?.authorization_url) {
      window.location.href = response.data.authorization_url
    }
  } catch (err: any) {
    handleError(err, { title: 'Upgrade Failed' })
  } finally {
    upgradingFromBanner.value = false
  }
}

onMounted(async () => {
  teamStore.loadMyTeams()

  // Fetch subscription state for upgrade banner
  if (authStore.currentOrganization?.id) {
    paymentStore.fetchSubscription(authStore.currentOrganization.id).catch(() => {})
  }

  if (tournamentId.value) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<{
        success: boolean;
        data: {
          tournament: Tournament;
          participants: Participant[];
          fixtures: Fixture[];
          standings: any[];
          sponsors: Sponsor[];
          socials: Social[];
          venues: Venue[];
        }
      }>(`/tournaments/${tournamentId.value}/overview`, { method: 'GET' })

      if (response.data) {
        tournamentStore.setCurrentTournament(response.data.tournament)
        participants.value = response.data.participants
        fixtures.value = response.data.fixtures
        standings.value = response.data.standings
        sponsors.value = response.data.sponsors
        socials.value = response.data.socials
        venues.value = response.data.venues
        
        // Initialize groups
        if (response.data.tournament.groups) {
          groupStore.groups = response.data.tournament.groups
        } else if (tournamentId.value) {
          groupStore.fetchGroups(tournamentId.value)
        }

        // Load stats if applicable
        if (response.data.tournament.participantType === ParticipantType.TEAM) {
          loadPlayerStats()
        }
      }
    } catch (e: any) {
      error.value = handleError(e, { title: 'Failed to load dashboard', toast: false })
    } finally {
      loading.value = false
    }
  }
})

// Check if standings should be shown
const showStandings = computed(() => {
  if (!tournament.value) return false
  return [TournamentType.ROUND_ROBIN, TournamentType.GROUP, TournamentType.HYBRID, TournamentType.LEAGUE].includes(tournament.value.type)
})

// Transfer Ownership logic
const showTransferModal = ref(false)
const showTournamentInviteModal = ref(false)
const transferringTournament = ref(false)
const targetOrganizationId = ref<string>('')

const availableOrganizationsForTransfer = computed(() => {
  return authStore.organizations
    .filter(orgMember => orgMember.organizationId !== tournament.value?.organization_id && (orgMember.role === 'OWNER' || orgMember.role === 'ADMIN'))
    .map(orgMember => ({
      label: orgMember.organization?.name || 'Unnamed Organization',
      value: orgMember.organizationId
    }))
})

const handleTransferTournament = async (event: FormSubmitEvent<any>) => {
  if (!targetOrganizationId.value) return

  transferringTournament.value = true
  try {
    await tournamentStore.updateTournament(tournament.value?.id || tournamentId.value, {
      organization_id: targetOrganizationId.value
    })
    useToast().add({ title: 'Tournament transferred successfully', color: 'success' })
    showTransferModal.value = false
    await navigateTo('/')
  } catch (err: any) {
    handleError(err, { title: 'Failed to transfer tournament' })
  } finally {
    transferringTournament.value = false
  }
}

// Delete Tournament logic
const deletingTournament = ref(false)

const handleDeleteTournament = () => {
  openConfirmModal({
    title: 'Delete Tournament',
    description: 'Are you absolutely sure you want to delete this tournament? This action cannot be undone and all data will be lost.',
    confirmLabel: 'Delete Tournament',
    color: 'error',
    onConfirm: async () => {
      deletingTournament.value = true
      try {
        await tournamentStore.deleteTournament(tournament.value?.id || tournamentId.value)
        useToast().add({ title: 'Tournament deleted successfully', color: 'success' })
        await navigateTo('/')
      } catch (err: any) {
        handleError(err, { title: 'Failed to delete tournament' })
      } finally {
        deletingTournament.value = false
      }
    }
  })
}

// Start New Season logic
const showSeasonModal = ref(false)
const startingSeason = ref(false)
const seasonState = reactive({
  seasonName: '',
  start_date: '',
  end_date: ''
})
const seasonSchema = z.object({
  seasonName: z.string().min(1, 'Season name is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required')
})

const handleStartSeason = async (event: FormSubmitEvent<any>) => {
  startingSeason.value = true
  try {
    const res = await tournamentStore.startSeason(tournament.value?.id || tournamentId.value, event.data)
    useToast().add({ title: 'New season started successfully', color: 'success' })
    showSeasonModal.value = false
    
    // Redirect to the new tournament season overview
    if (res.data?.id) {
      await navigateTo(`/tournaments/${res.data.id}`)
    }
  } catch (err: any) {
    handleError(err, { title: 'Failed to start season' })
  } finally {
    startingSeason.value = false
  }
}

// Generate fixtures
const generateError = ref<string | null>(null)
const showGenerateModal = ref(false)
const generateConfig = reactive({
  teamsPerGroup: null as number | null,
  numberOfGroups: null as number | null,
  useExistingGroups: false
})

// Group fixture wizard
const showGroupWizard = ref(false)

const openGenerateModal = () => {
  // Reset config
  generateConfig.teamsPerGroup = null
  generateConfig.numberOfGroups = null
  generateConfig.useExistingGroups = groupStore.groups.length > 0
  generateError.value = null
  
  if (
    tournament.value?.type === TournamentType.GROUP || 
    tournament.value?.type === TournamentType.HYBRID || 
    tournament.value?.type === TournamentType.LEAGUE ||
    tournament.value?.type === TournamentType.ROUND_ROBIN
  ) {
    showGroupWizard.value = true
  } else if (tournament.value?.type === TournamentType.KNOCKOUT) {
    showKnockoutWizard.value = true
  } else {
    handleGenerateFixtures()
  }
}

const handleGenerateFixtures = async () => {
  if (participants.value.length < 2) {
    generateError.value = 'At least 2 participants are required to generate fixtures'
    return
  }
  
  
  generateError.value = null
  try {
    await fixtureStore.generateFixtures(tournament.value?.id || tournamentId.value, {
      teamsPerGroup: generateConfig.useExistingGroups ? undefined : (generateConfig.teamsPerGroup || undefined),
      numberOfGroups: generateConfig.useExistingGroups ? undefined : (generateConfig.numberOfGroups || undefined),
      doubleRoundRobin: tournament.value?.doubleRoundRobin || false,
      useExistingGroups: generateConfig.useExistingGroups
    })
    
    showGenerateModal.value = false
    
    // Auto-refresh fixtures
    await fixtureStore.fetchFixtures(tournament.value?.id || tournamentId.value)
    
    // Refresh standings if applicable
    if (showStandings.value) {
      await standingStore.fetchStandings(tournamentId.value)
    }
    
    // Show success toast
    const toast = useToast()
    toast.add({
      title: 'Fixtures Generated',
      description: 'Fixtures have been successfully generated and refreshed.',
      icon: 'i-heroicons-check-circle',
      color: 'success'
    })
  } catch (err: any) {
    generateError.value = handleError(err, { toast: false })
  }
}

const handleClearFixtures = () => {
  openConfirmModal({
    title: 'Clear All Fixtures',
    description: 'Are you sure you want to delete all fixtures and standings for this tournament? This action cannot be undone.',
    confirmLabel: 'Clear All',
    color: 'error',
    onConfirm: async () => {
      try {
        await fixtureStore.deleteAllFixtures(tournament.value?.id || tournamentId.value)
        // Refresh standings as they are cleared on backend
        await standingStore.fetchStandings(tournament.value?.id || tournamentId.value)
        useToast().add({ title: 'Fixtures cleared successfully', color: 'success' })
      } catch (err: any) {
        handleError(err, { title: 'Failed to clear fixtures' })
      }
    }
  })
}

const handleClearKnockoutFixtures = () => {
  openConfirmModal({
    title: 'Clear Knockout Brackets',
    description: 'Are you sure you want to delete all knockout fixtures? Group stage fixtures and standings will be preserved.',
    confirmLabel: 'Clear Knockout',
    color: 'error',
    onConfirm: async () => {
      try {
        await fixtureStore.deleteAllFixtures(tournament.value?.id || tournamentId.value, 'KNOCKOUT')
        useToast().add({ title: 'Knockout fixtures cleared', color: 'success' })
      } catch (err: any) {
        handleError(err, { title: 'Failed to clear knockout fixtures' })
      }
    }
  })
}

const handleDeleteFixture = (fixture: Fixture) => {
  openConfirmModal({
    title: 'Delete Fixture',
    description: `Are you sure you want to delete the match between ${fixture.homeTeam?.customName || 'TBD'} and ${fixture.awayTeam?.customName || 'TBD'}?`,
    confirmLabel: 'Delete Fixture',
    color: 'error',
    onConfirm: async () => {
      try {
        await fixtureStore.deleteFixture(fixture.id)
        useToast().add({ title: 'Fixture deleted successfully', color: 'success' })
        // Refresh standings to reflect the change
        if (showStandings.value) {
           await standingStore.fetchStandings(tournamentId.value)
        }
      } catch (err: any) {
        handleError(err, { title: 'Failed to delete fixture' })
      }
    }
  })
}

// Group Management state
const newGroupName = ref('')
const addingGroup = ref(false)
const groupSearchQuery = ref('')

const handleAddGroup = async () => {
  if (!newGroupName.value.trim()) return
  addingGroup.value = true
  try {
    await groupStore.createGroup({
      name: newGroupName.value,
      tournament_id: tournament.value?.id || tournamentId.value
    })
    newGroupName.value = ''
    useToast().add({ title: 'Group created successfully', color: 'success' })
  } catch (err: any) {
    handleError(err, { title: 'Failed to create group' })
  } finally {
    addingGroup.value = false
  }
}

const handleRenameGroup = (group: any) => {
  openPromptModal({
    title: 'Rename Group',
    label: 'Group Name',
    initialValue: group.name,
    confirmLabel: 'Rename',
    onConfirm: async (newName) => {
      if (newName && newName !== group.name) {
        await groupStore.updateGroup(group.id, { name: newName })
        useToast().add({ title: 'Group renamed', color: 'success' })
      }
    }
  })
}

const handleDeleteGroup = (groupId: string) => {
  openConfirmModal({
    title: 'Delete Group',
    description: 'Are you sure you want to delete this group? All participants in this group will become unassigned.',
    confirmLabel: 'Delete Group',
    color: 'error',
    onConfirm: async () => {
      try {
        await groupStore.deleteGroup(groupId)
        // Update local participants list to reflect they are now unassigned
        participants.value.forEach(p => {
          if (p.groupId === groupId) p.groupId = null
        })
        // Refresh standings
        standingStore.fetchStandings(tournament.value?.id || tournamentId.value)
        useToast().add({ title: 'Group deleted', color: 'success' })
      } catch (err: any) {
        handleError(err, { title: 'Delete failed' })
      }
    }
  })
}

const handleAssignToGroup = async (participantId: string, groupId: string | null) => {
  try {
    await groupStore.assignParticipant(participantId, groupId)
    // Synchronize local participants list
    const participant = participants.value.find(p => p.id === participantId)
    if (participant) {
      participant.groupId = groupId

      const participantName = participant.customName || participant.user?.name || participant.team?.name || 'Team'
      const group = groupId ? groupStore.groups.find(g => g.id === groupId) : null
      const groupName = group?.name || 'group'

      useToast().add({ 
        title: groupId 
          ? `${participantName} assigned to ${groupName}` 
          : `${participantName} removed from group`, 
        color: 'success' 
      })
    }
    // Refresh standings to show newborn records
    standingStore.fetchStandings(tournament.value?.id || tournamentId.value)
  } catch (err: any) {
    handleError(err, { title: 'Operation failed' })
  }
}

// Drag and Drop for Group Assignment
const draggedParticipantId = ref<string | null>(null)
const dropTargetGroupId = ref<string | null | 'unassigned'>(null)

const handleDragStart = (participantId: string) => {
  draggedParticipantId.value = participantId
}

const handleDragOver = (e: DragEvent, groupId: string | 'unassigned') => {
  e.preventDefault()
  dropTargetGroupId.value = groupId
}

const handleDragLeave = () => {
  dropTargetGroupId.value = null
}

const handleDrop = (groupId: string | null) => {
  const pId = draggedParticipantId.value
  if (pId) {
    // Only assign if it's actually changing groups
    const p = participants.value.find(item => item.id === pId)
    if (p && p.groupId !== groupId) {
      handleAssignToGroup(pId, groupId)
    }
  }
  draggedParticipantId.value = null
  dropTargetGroupId.value = null
}

const unassignedParticipants = computed(() => {
  if (!participants.value) return []
  return participants.value.filter(p => !p.groupId)
})

const getParticipantGroup = (participantId: string) => {
  const p = participants.value.find(p => p.id === participantId)
  if (!p || !p.groupId) return null
  return groupStore.groups.find(g => g.id === p.groupId) || null
}

const getGroupParticipants = (groupId: string) => {
  return participants.value.filter(p => p.groupId === groupId)
}

const getParticipantById = (id: string) => participants.value.find(p => p.id === id)

// Manual Fixture Creation
const showAddFixtureModal = ref(false)
const addingFixture = ref(false)
const addFixtureKeepOpen = ref(false)
const addFixtureState = reactive({
  homeTeamId: '' as string,
  awayTeamId: '' as string,
  round: 1,
  roundName: '' as string,
  startTime: '' as string,
  venue: '' as string,
  groupId: '' as string,
  stage: undefined as FixtureStage | undefined,
  matchDuration: 90
})

const openAddFixtureModal = (round?: number, roundName?: string) => {
  addFixtureState.homeTeamId = ''
  addFixtureState.awayTeamId = ''

  if (round !== undefined) {
    addFixtureState.round = round
    addFixtureState.roundName = roundName || ''
  } else {
    // Default round to the next available
    const maxRound = fixtures.value.length > 0 ? Math.max(...fixtures.value.map(f => f.round)) : 0
    addFixtureState.round = maxRound + 1
    addFixtureState.roundName = ''
  }

  addFixtureState.startTime = ''
  addFixtureState.venue = ''
  addFixtureState.groupId = groupStore.groups[0]?.id || ''
  addFixtureState.matchDuration = 90
  
  // Set default stage based on tournament type and round name
  const name = (addFixtureState.roundName || '').toLowerCase()
  if (name.includes('matchday')) {
    addFixtureState.stage = FixtureStage.GROUP_STAGE
  } else if (
    name.includes('final') || 
    name.includes('semi') || 
    name.includes('quarter') || 
    name.includes('round of') || 
    name.includes('third place')
  ) {
    addFixtureState.stage = FixtureStage.KNOCKOUT
  } else {
    if (tournament.value?.type === TournamentType.KNOCKOUT) {
      addFixtureState.stage = FixtureStage.KNOCKOUT
    } else if (tournament.value?.type === TournamentType.HYBRID || tournament.value?.type === TournamentType.GROUP) {
      addFixtureState.stage = FixtureStage.GROUP_STAGE
    } else {
      addFixtureState.stage = undefined
    }
  }

  addFixtureKeepOpen.value = false
  showAddFixtureModal.value = true
}

const participantOptionsAll = computed(() => {
  return participants.value.map(p => ({
    label: p.customName || p.user?.name || p.team?.name || 'Unnamed',
    value: p.id,
    groupId: p.groupId,
    avatar: p.logoUrl ? { src: p.logoUrl } : undefined
  }))
})

const availableParticipantsForRound = computed(() => {
  const currentRound = addFixtureState.round
  const stage = addFixtureState.stage
  
  const teamsInRound = new Set()
  fixtures.value.forEach(f => {
    // Normalizing null and undefined for stage
    const fStage = f.stage || undefined
    const currentStage = stage || undefined
    
    if (f.round === currentRound && fStage === currentStage) {
      if (f.homeTeamId) teamsInRound.add(f.homeTeamId)
      if (f.awayTeamId) teamsInRound.add(f.awayTeamId)
    }
  })
  
  return participantOptionsAll.value.filter(p => !teamsInRound.has(p.value))
})

const homeParticipantOptions = computed(() => {
  let items = availableParticipantsForRound.value
  if (addFixtureState.groupId) {
    items = items.filter(p => p.groupId === addFixtureState.groupId)
  }
  return items.filter(p => p.value !== addFixtureState.awayTeamId)
})

const awayParticipantOptions = computed(() => {
  let items = availableParticipantsForRound.value
  if (addFixtureState.groupId) {
    items = items.filter(p => p.groupId === addFixtureState.groupId)
  }
  return items.filter(p => p.value !== addFixtureState.homeTeamId)
})

const roundNameOptions = computed(() => {
  const type = tournament.value?.type
  const totalTeamCount = participants.value.length
  const options: { label: string; value: string; round: number }[] = []

  // Calculate the relevant team count for group stage rounds
  let groupStageTeamCount = totalTeamCount
  if (type === TournamentType.GROUP || type === TournamentType.HYBRID || type === TournamentType.LEAGUE) {
    if (addFixtureState.groupId) {
      // Use the size of the specific selected group
      groupStageTeamCount = participants.value.filter(p => p.groupId === addFixtureState.groupId).length
    } else {
      // Use the size of the largest group as a default
      const groupCounts = new Map<string, number>()
      participants.value.forEach(p => {
        if (p.groupId) {
          groupCounts.set(p.groupId, (groupCounts.get(p.groupId) || 0) + 1)
        }
      })
      if (groupCounts.size > 0) {
        groupStageTeamCount = Math.max(...groupCounts.values())
      }
    }
  }

  if (type === TournamentType.ROUND_ROBIN || type === TournamentType.GROUP || type === TournamentType.HYBRID || type === TournamentType.LEAGUE) {
    // Generate matchday names
    const oneWayRoundCount = groupStageTeamCount % 2 === 0 ? groupStageTeamCount - 1 : groupStageTeamCount
    const roundCount = tournament.value?.doubleRoundRobin ? 2 * oneWayRoundCount : oneWayRoundCount
    for (let i = 1; i <= roundCount; i++) {
      const name = `Matchday ${i}`
      options.push({ label: name, value: name, round: i })
    }
  }

  if (type === TournamentType.KNOCKOUT || type === TournamentType.HYBRID) {
    // Generate knockout round names
    const totalRounds = Math.ceil(Math.log2(totalTeamCount))
    const bracketSize = Math.pow(2, totalRounds)
    const gpOneWayRoundCount = groupStageTeamCount % 2 === 0 ? groupStageTeamCount - 1 : groupStageTeamCount
    const baseRoundOffset = type === TournamentType.HYBRID ? (tournament.value?.doubleRoundRobin ? 2 * gpOneWayRoundCount : gpOneWayRoundCount) : 0

    let previousRoundCompleted = true
    for (let i = 1; i <= totalRounds; i++) {
        const roundsFromFinal = totalRounds - i
        let name: string
        switch (roundsFromFinal) {
            case 0: name = 'Final'; break
            case 1: name = 'Semi Final'; break
            case 2: name = 'Quarter Final'; break
            default:
                const teamsInRound = bracketSize / Math.pow(2, i - 1)
                name = `Round of ${teamsInRound}`
        }
        
        const roundNum = baseRoundOffset + i
        const isFinal = roundsFromFinal === 0
        
        // Only allow manual entry if it's the first knockout round OR the previous round is fully completed
        if (i === 1 || previousRoundCompleted) {
            if (tournament.value?.twoLegsKnockout && !isFinal) {
                options.push({ label: `${name} - Leg 1`, value: `${name} - Leg 1`, round: roundNum })
                options.push({ label: `${name} - Leg 2`, value: `${name} - Leg 2`, round: roundNum })
            } else {
                options.push({ label: name, value: name, round: roundNum })
            }
        }

        // Check completion status for the next iteration
        const roundFixtures = fixtures.value.filter(f => f.round === roundNum && f.stage === FixtureStage.KNOCKOUT)
        if (roundFixtures.length === 0 || roundFixtures.some(f => f.status !== FixtureStatus.COMPLETED)) {
            previousRoundCompleted = false
        }
    }

    if (tournament.value?.thirdPlaceMatch) {
       const semiFinalRoundNum = baseRoundOffset + totalRounds - 1
       const semiFinalFixtures = fixtures.value.filter(f => f.round === semiFinalRoundNum && f.stage === FixtureStage.KNOCKOUT)
       const sfCompleted = semiFinalFixtures.length > 0 && semiFinalFixtures.every(f => f.status === FixtureStatus.COMPLETED)
       
       if (sfCompleted) {
         options.push({ label: 'Third Place Match', value: 'Third Place Match', round: baseRoundOffset + totalRounds + 1 })
       }
    }
  }

  // Fallback if no options were generated
  if (options.length === 0) {
    for (let i = 1; i <= 10; i++) {
      options.push({ label: `Matchday ${i}`, value: `Matchday ${i}`, round: i })
    }
  }

  return options
})

// Watch roundName to auto-set round number and stage
watch(() => addFixtureState.roundName, (val) => {
  if (!val) return
  
  const option = roundNameOptions.value.find(o => o.value === val)
  if (option) {
    addFixtureState.round = option.round
  }

  // Auto-set stage based on round name
  const name = val.toLowerCase()
  if (name.includes('matchday')) {
    addFixtureState.stage = FixtureStage.GROUP_STAGE
  } else if (
    name.includes('final') || 
    name.includes('semi') || 
    name.includes('quarter') || 
    name.includes('round of') || 
    name.includes('third place')
  ) {
    addFixtureState.stage = FixtureStage.KNOCKOUT
  }
})

// Auto-resolve group and stage
watch(() => addFixtureState.homeTeamId, (val) => {
  if (val && !addFixtureState.groupId) {
    const p = participants.value.find(p => p.id === val)
    if (p?.groupId) {
      addFixtureState.groupId = p.groupId
    }
  }
})

watch(() => addFixtureState.awayTeamId, (val) => {
  if (val && !addFixtureState.groupId) {
    const p = participants.value.find(p => p.id === val)
    if (p?.groupId) {
      addFixtureState.groupId = p.groupId
    }
  }
})

watch(() => addFixtureState.groupId, (val) => {
  if (val && (addFixtureState.stage === undefined || addFixtureState.stage === null)) {
    addFixtureState.stage = FixtureStage.GROUP_STAGE
  }
})

// Clear selected teams if they are already scheduled in the newly selected round/stage
watch([() => addFixtureState.round, () => addFixtureState.stage], () => {
  const teamsInRound = new Set()
  fixtures.value.forEach(f => {
    // Normalizing null and undefined for stage
    const fStage = f.stage || undefined
    const currentStage = addFixtureState.stage || undefined
    
    if (f.round === addFixtureState.round && fStage === currentStage) {
      if (f.homeTeamId) teamsInRound.add(f.homeTeamId)
      if (f.awayTeamId) teamsInRound.add(f.awayTeamId)
    }
  })
  
  if (addFixtureState.homeTeamId && teamsInRound.has(addFixtureState.homeTeamId)) {
    addFixtureState.homeTeamId = ''
  }
  if (addFixtureState.awayTeamId && teamsInRound.has(addFixtureState.awayTeamId)) {
    addFixtureState.awayTeamId = ''
  }
})

const groupOptions = computed(() => {
  return groupStore.groups.map(g => ({ label: g.name, value: g.id }))
})

const fixtureStageOptions = [
  { label: 'Group Stage', value: FixtureStage.GROUP_STAGE },
  { label: 'Knockout', value: FixtureStage.KNOCKOUT }
]

const venueOptions = computed(() => {
  return venues.value.map(v => ({ label: v.name, value: v.name }))
})

const handleAddFixture = async () => {
  if (!addFixtureState.homeTeamId || !addFixtureState.awayTeamId) {
    useToast().add({ title: 'Please select both Home and Away teams', color: 'error' })
    return
  }
  if (addFixtureState.homeTeamId === addFixtureState.awayTeamId) {
    useToast().add({ title: 'Home and Away teams must be different', color: 'error' })
    return
  }
  if (addFixtureState.startTime && tournament.value?.start_date && tournament.value?.end_date) {
    const fixtureDate = new Date(addFixtureState.startTime)
    if (!isNaN(fixtureDate.getTime())) {
      const startDate = new Date(tournament.value.start_date)
      const endDate = new Date(tournament.value.end_date)
      if (fixtureDate < startDate || fixtureDate > endDate) {
        useToast().add({
          title: 'Date out of range',
          description: `The fixture date must be between the tournament start date (${formatDate(tournament.value.start_date)}) and end date (${formatDate(tournament.value.end_date)}). Please adjust the tournament's start or end date to select this date.`,
          color: 'error'
        })
        return
      }
    }
  }
  addingFixture.value = true
  try {
    await fixtureStore.createFixture({
      tournament_id: tournament.value?.id || tournamentId.value,
      homeTeamId: addFixtureState.homeTeamId,
      awayTeamId: addFixtureState.awayTeamId,
      round: addFixtureState.round,
      roundName: addFixtureState.roundName || undefined,
      startTime: addFixtureState.startTime || undefined,
      venue: addFixtureState.venue || undefined,
      groupId: addFixtureState.groupId || undefined,
      stage: addFixtureState.stage || undefined,
      matchDuration: addFixtureState.matchDuration
    })
    
    // Re-fetch fixtures to get fully populated data (with team relations)
    await fixtureStore.fetchFixtures(tournament.value?.id || tournamentId.value)
    
    useToast().add({ title: 'Fixture created successfully', color: 'success' })
    
    if (addFixtureKeepOpen.value) {
      // Reset for another fixture but keep round
      addFixtureState.homeTeamId = ''
      addFixtureState.awayTeamId = ''
      addFixtureState.startTime = ''
      addFixtureState.venue = ''
      addFixtureState.matchDuration = 90
    } else {
      showAddFixtureModal.value = false
    }
  } catch (err: any) {
    handleError(err, { title: 'Failed to create fixture' })
  } finally {
    addingFixture.value = false
  }
}

// Advance to Knockout Stage (Hybrid)
const showAdvanceModal = ref(false)
const advancing = ref(false)
const advanceError = ref<string | null>(null)
const manualSelection = ref(false)
const selectedParticipantIds = ref<string[]>([])

// ── Advance Modal LocalStorage persistence ───────────────────
const ADVANCE_STORAGE_KEY = computed(() => `atk-progress-${tournamentId.value}`)

const saveAdvanceProgress = () => {
  try {
    const data = {
      manualSelection: manualSelection.value,
      selectedParticipantIds: selectedParticipantIds.value,
      savedAt: Date.now()
    }
    localStorage.setItem(ADVANCE_STORAGE_KEY.value, JSON.stringify(data))
  } catch { /* quota exceeded or SSR */ }
}

const loadAdvanceProgress = (): boolean => {
  try {
    const raw = localStorage.getItem(ADVANCE_STORAGE_KEY.value)
    if (!raw) return false
    const data = JSON.parse(raw)
    // Expire after 24 hours
    if (Date.now() - data.savedAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(ADVANCE_STORAGE_KEY.value)
      return false
    }
    manualSelection.value = data.manualSelection || false
    selectedParticipantIds.value = data.selectedParticipantIds || []
    return true
  } catch {
    return false
  }
}

const clearAdvanceProgress = () => {
  try { localStorage.removeItem(ADVANCE_STORAGE_KEY.value) } catch {}
}

// Auto-save advance modal state
watch([manualSelection, selectedParticipantIds], () => {
  if (showAdvanceModal.value) saveAdvanceProgress()
}, { deep: true })

const canAdvance = computed(() => {
  if (tournament.value?.type !== TournamentType.HYBRID) return false
  
  // Check if group stage matches exist and are all completed
  const groupMatches = fixtures.value.filter(f => f.stage === FixtureStage.GROUP_STAGE)
  if (groupMatches.length === 0) return false
  
  const allGroupsComplete = groupMatches.every(f => f.status === FixtureStatus.COMPLETED)
  if (!allGroupsComplete) return false

  // Validate that we have at least a single round robin across all groups
  const groupParticipantCounts = new Map<string, number>()
  participants.value.forEach(p => {
    if (p.groupId) {
      groupParticipantCounts.set(p.groupId, (groupParticipantCounts.get(p.groupId) || 0) + 1)
    }
  })

  let expectedMinMatches = 0
  groupParticipantCounts.forEach(count => {
    if (count >= 2) {
      expectedMinMatches += (count * (count - 1)) / 2
    }
  })

  // If we have fewer matches than a single round robin, don't allow advancement yet
  if (groupMatches.length < expectedMinMatches) return false
  
  // Check if already advanced (knockout matches exist)
  const knockoutMatches = fixtures.value.filter(f => f.stage === FixtureStage.KNOCKOUT)
  if (knockoutMatches.length > 0) return false
  
  return true
})

const toggleParticipant = (id: string) => {
  const idx = selectedParticipantIds.value.indexOf(id)
  if (idx === -1) {
    selectedParticipantIds.value.push(id)
  } else {
    selectedParticipantIds.value.splice(idx, 1)
  }
}

const openAdvanceModal = () => {
  advanceError.value = null
  // Try to restore saved progress first
  const restored = loadAdvanceProgress()
  if (restored) {
    useToast().add({ title: 'Progress Restored', description: 'Your previous selection has been loaded.', color: 'neutral', icon: 'i-heroicons-arrow-path' })
  } else {
    manualSelection.value = false
    selectedParticipantIds.value = []
  }
  showAdvanceModal.value = true
}

const handleAdvanceKnockout = async () => {
  advancing.value = true
  advanceError.value = null
  
  try {
    if (manualSelection.value) {
      if (selectedParticipantIds.value.length < 2) {
        advanceError.value = 'Please select at least 2 teams to advance.'
        advancing.value = false
        return
      }
      await fixtureStore.advanceToKnockout(tournamentId.value, selectedParticipantIds.value)
    } else {
      await fixtureStore.advanceToKnockout(tournamentId.value)
    }
    
    showAdvanceModal.value = false
    clearAdvanceProgress()
    
    // Refresh fully to be safe
    await fixtureStore.fetchFixtures(tournamentId.value)
    
  } catch (err: any) {
    advanceError.value = handleError(err, { toast: false })
  } finally {
    advancing.value = false
  }
}

const handleStartManualWizard = () => {
  showAdvanceModal.value = false
  // Small timeout to ensure modals don't fight over focus
  setTimeout(() => {
    showKnockoutWizard.value = true
  }, 100)
}

// Fixture status colors
const fixtureStatusColors: Record<FixtureStatus, 'info' | 'success' | 'warning' | 'neutral'> = {
  [FixtureStatus.SCHEDULED]: 'info',
  [FixtureStatus.LIVE]: 'warning',
  [FixtureStatus.COMPLETED]: 'success',
  [FixtureStatus.CANCELLED]: 'neutral'
}



// Add participant modal
const showAddModal = ref(false)
const addingParticipant = ref(false)
const addError = ref<string | null>(null)

const addParticipantSchema = z.object({
  customName: z.string().min(1, 'Name is required').max(100),
  seed: z.number().positive().optional().nullable(),
  logoUrl: z.string().optional().nullable()
})

type AddParticipantSchema = z.output<typeof addParticipantSchema>

const addParticipantState = reactive<Partial<AddParticipantSchema & { teamId: string | null }>>({
  customName: '',
  seed: null,
  logoUrl: null,
  teamId: null
})

// Logo upload state
const logoFileInput = ref<HTMLInputElement | null>(null)
const logoFile = ref<File | null>(null)
const logoPreview = ref<string | null>(null)
const uploadingLogo = ref(false)

const triggerLogoInput = () => {
  logoFileInput.value?.click()
}

const handleLogoChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    addError.value = 'Please select an image file'
    return
  }
  
  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    addError.value = 'Image must be less than 5MB'
    return
  }
  
  // Clear error
  addError.value = null
  
  logoFile.value = file
  logoPreview.value = URL.createObjectURL(file)
}

// Participant Management
const newParticipantName = ref('')
const selectedParticipant = ref<Participant | null>(null)
const showManagePlayersModal = ref(false)
const newPlayer = reactive({
  name: '',
  number: null as number | null,
  position: 'FWD'
})
const editingPlayerId = ref<string | null>(null)
const deletingPlayerId = ref<string | null>(null)
// Excel Upload for Teams
const uploadingTeamExcel = ref(false)
const teamExcelFileInput = ref<HTMLInputElement | null>(null)

const triggerTeamExcelUpload = () => {
  if (teamExcelFileInput.value) teamExcelFileInput.value.click()
}

const handleTeamExcelUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      uploadingTeamExcel.value = true
      const xlsx = await import('xlsx')
      const data = new Uint8Array(e.target?.result as ArrayBuffer)
      const workbook = xlsx.read(data, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      if (!firstSheetName) throw new Error('No sheets found in Excel file')
      const worksheet = workbook.Sheets[firstSheetName]
      if (!worksheet) throw new Error('Worksheet not found in the Excel file')
      const jsonData = xlsx.utils.sheet_to_json<any>(worksheet)
      
      const teamsToUpload = jsonData.map(row => {
        const keys = Object.keys(row)
        const nameKey = keys.find(k => k.toLowerCase().trim() === 'name' || k.toLowerCase().trim() === 'team')
        const seedKey = keys.find(k => k.toLowerCase().trim() === 'seed' || k.toLowerCase().trim() === 'rank')

        return {
          customName: nameKey ? String(row[nameKey]).trim() : '',
          seed: seedKey ? parseInt(row[seedKey]) || null : null,
          logoUrl: null
        }
      }).filter(t => t.customName)

      if (teamsToUpload.length > 0) {
        await participantStore.addParticipantsBulk(tournament.value?.id || tournamentId.value, { participants: teamsToUpload })
        useToast().add({ title: `Added ${teamsToUpload.length} participants successfully`, color: 'success' })
      } else {
        useToast().add({ title: 'No valid participants found in Excel', color: 'error' })
      }
    } catch (err: any) {
      handleError(err, { title: 'Failed to parse Excel file' })
    } finally {
      uploadingTeamExcel.value = false
      if (teamExcelFileInput.value) teamExcelFileInput.value.value = ''
    }
  }
  reader.readAsArrayBuffer(file)
}

const downloadTeamExcelTemplate = async () => {
  const xlsx = await import('xlsx')
  const wsData = [
    ['Name', 'Seed'],
    ['Team A', '1'],
    ['Team B', '2']
  ]
  const ws = xlsx.utils.aoa_to_sheet(wsData)
  const wb = xlsx.utils.book_new()
  xlsx.utils.book_append_sheet(wb, ws, 'Teams')
  xlsx.writeFile(wb, 'Parascores_Team_Upload_Template.xlsx')
}

// Excel Upload

const uploadingExcel = ref(false)
const excelFileInput = ref<HTMLInputElement | null>(null)

const triggerExcelUpload = () => {
  if (excelFileInput.value) excelFileInput.value.click()
}

const handleExcelUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file || !selectedParticipant.value) return

  const reader = new FileReader()
  reader.onload = async (e) => {
    if (!selectedParticipant.value) return
    try {
      uploadingExcel.value = true
      const xlsx = await import('xlsx')
      const data = new Uint8Array(e.target?.result as ArrayBuffer)
      const workbook = xlsx.read(data, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      if (!firstSheetName) throw new Error('No sheets found in Excel file')
      const worksheet = workbook.Sheets[firstSheetName]
      if (!worksheet) throw new Error('Worksheet not found in the Excel file')
      const jsonData = xlsx.utils.sheet_to_json<any>(worksheet)
      
      const players = jsonData.map(row => {
        // Find keys defensively
        const keys = Object.keys(row)
        const nameKey = keys.find(k => k.toLowerCase().trim() === 'name' || k.toLowerCase().trim() === 'player')
        const numberKey = keys.find(k => k.toLowerCase().trim() === 'number' || k.toLowerCase().trim() === '#')
        const positionKey = keys.find(k => k.toLowerCase().trim() === 'position' || k.toLowerCase().trim() === 'pos')

        return {
          name: nameKey ? String(row[nameKey]).trim() : '',
          number: numberKey ? parseInt(row[numberKey]) || null : null,
          position: positionKey ? String(row[positionKey]).trim().toUpperCase() : 'FWD'
        }
      }).filter(p => p.name)

      if (players.length > 0) {
        await participantStore.addPlayersBulk(selectedParticipant.value.id, { players })
        useToast().add({ title: `Added ${players.length} players successfully`, color: 'success' })
        
        // fetch updated list
        const updatedPlayers = await participantStore.fetchParticipantPlayers(selectedParticipant.value.id)
        selectedParticipant.value.players = updatedPlayers
      } else {
        useToast().add({ title: 'No valid players found in Excel', color: 'error' })
      }
    } catch (err: any) {
      handleError(err, { title: 'Failed to parse Excel file' })
    } finally {
      uploadingExcel.value = false
      if (excelFileInput.value) excelFileInput.value.value = ''
    }
  }
  reader.readAsArrayBuffer(file)
}

const downloadExcelTemplate = async () => {
  const xlsx = await import('xlsx')
  const wsData = [
    ['Name', 'Number', 'Position'],
    ['John Doe', '9', 'FWD'],
    ['Jane Smith', '1', 'GK']
  ]
  const ws = xlsx.utils.aoa_to_sheet(wsData)
  const wb = xlsx.utils.book_new()
  xlsx.utils.book_append_sheet(wb, ws, 'Players')
  xlsx.writeFile(wb, 'Parascores_Player_Upload_Template.xlsx')
}

const positions = ['GK', 'DEF', 'MID', 'FWD', 'COACH']

const openManagePlayers = async (participant: Participant) => {
  selectedParticipant.value = participant
  showManagePlayersModal.value = true
  // Fetch players if not loaded
  if (!participant.players?.length) {
    try {
      // Assuming 'loading' ref is defined elsewhere, or define it here if needed
      // const loading = ref(false)
      // loading.value = true
      const players = await participantStore.fetchParticipantPlayers(participant.id)
      participant.players = players
    } finally {
      // loading.value = false
    }
  }
  cancelEditPlayer() // Reset form and editing state
  
  // Also generate invite link in background
  generateInviteLink(participant, false)
}

const handleAddPlayer = async () => {
  if (!selectedParticipant.value || !newPlayer.name) return
  
  // Assuming 'loading' ref is defined elsewhere, or define it here if needed
  // const loading = ref(false)
  // loading.value = true
  try {
    if (editingPlayerId.value) {
      await participantStore.updatePlayer(selectedParticipant.value.id, editingPlayerId.value, { ...newPlayer })
      useToast().add({ title: 'Player updated successfully', color: 'success' })
      cancelEditPlayer()
    } else {
      await participantStore.addPlayer(tournamentId.value, selectedParticipant.value.id, { ...newPlayer })
      useToast().add({ title: 'Player added successfully', color: 'success' })
      // Reset form
      newPlayer.name = ''
      newPlayer.number = null
      newPlayer.position = 'FWD'
    }
  } catch (error: any) {
    handleError(error, { title: editingPlayerId.value ? 'Failed to update player' : 'Failed to add player' })
  } finally {
    // loading.value = false
  }
}

const startEditPlayer = (player: any) => {
  editingPlayerId.value = player.id
  newPlayer.name = player.name
  newPlayer.number = player.number || null
  newPlayer.position = player.position || 'FWD'
}

const cancelEditPlayer = () => {
  editingPlayerId.value = null
  newPlayer.name = ''
  newPlayer.number = null
  newPlayer.position = 'FWD'
}

const handleDeletePlayer = async (playerId: string) => {
  if (!selectedParticipant.value) return
  
  openConfirmModal({
    title: 'Delete Player',
    description: 'Are you sure you want to remove this player from the team?',
    confirmLabel: 'Delete',
    color: 'error',
    onConfirm: async () => {
      deletingPlayerId.value = playerId
      try {
        await participantStore.removePlayer(selectedParticipant.value!.id, playerId)
        useToast().add({ title: 'Player removed successfully', color: 'success' })
        
        if (editingPlayerId.value === playerId) cancelEditPlayer()
      } catch (error: any) {
        handleError(error, { title: 'Failed to remove player' })
      } finally {
        deletingPlayerId.value = null
      }
    }
  })
}

const pendingPlayers = computed(() => {
  return selectedParticipant.value?.players?.filter(p => p.status === 'PENDING') || []
})

const approvedPlayers = computed(() => {
  return selectedParticipant.value?.players?.filter(p => p.status === 'APPROVED') || []
})

const handleApprovePlayer = async (playerId: string) => {
  if (!selectedParticipant.value) return
  try {
    await participantStore.updatePlayerStatus(selectedParticipant.value.id, playerId, 'APPROVED')
    useToast().add({ title: 'Player approved successfully', color: 'success' })
  } catch (error: any) {
    handleError(error, { title: 'Failed to approve player' })
  }
}

const handleRejectPlayer = async (playerId: string) => {
  if (!selectedParticipant.value) return
  openConfirmModal({
    title: 'Reject Player',
    description: 'Are you sure you want to reject this join request?',
    confirmLabel: 'Reject',
    color: 'error',
    onConfirm: async () => {
      try {
        await participantStore.updatePlayerStatus(selectedParticipant.value!.id, playerId, 'REJECTED')
        useToast().add({ title: 'Request rejected', color: 'success' })
      } catch (error: any) {
        handleError(error, { title: 'Failed to reject request' })
      }
    }
  })
}

const removeParticipant = (participant: Participant) => {
  openConfirmModal({
    title: 'Remove Participant',
    description: `Are you sure you want to remove ${participant.customName || 'this participant'}? This will also delete all their associated fixtures and standings.`,
    confirmLabel: 'Remove',
    color: 'error',
    onConfirm: async () => {
      try {
        await participantStore.removeParticipant(participant.id)
        useToast().add({ title: 'Participant removed successfully', color: 'success' })
      } catch (error: any) {
        handleError(error, { title: 'Failed to remove participant' })
      }
    }
  })
}

const updateParticipantStatus = async (participantId: string, status: ParticipantStatus) => {
  try {
    await participantStore.updateParticipantStatus(participantId, status)
    useToast().add({ 
      title: status === ParticipantStatus.CONFIRMED ? 'Participant approved' : 'Participant rejected', 
      color: status === ParticipantStatus.CONFIRMED ? 'success' : 'error' 
    })
  } catch (err: any) {
    handleError(err, { title: 'Failed to update status' })
  }
}



const removeLogo = () => {
  logoFile.value = null
  logoPreview.value = null
  if (logoFileInput.value) {
    logoFileInput.value.value = ''
  }
}

const resetAddForm = () => {
  addParticipantState.customName = ''
  addParticipantState.seed = null
  addParticipantState.logoUrl = null
  addParticipantState.teamId = null
  removeLogo()
  addError.value = null
}

const openAddModal = () => {
  resetAddForm()
  showAddModal.value = true
}

const handleAddParticipant = async (event: FormSubmitEvent<AddParticipantSchema>) => {
  addingParticipant.value = true
  addError.value = null
  
  try {
    let logoUrl: string | null = null
    
    // Upload logo if selected
    if (logoFile.value) {
      // Use internal upload endpoint or similar logic
      const formData = new FormData()
      formData.append('file', logoFile.value)
      
      const uploadResponse = await $api<{success: boolean, data: { url: string }, message: string}>('/upload/image?folder=participants', {
        method: 'POST',
        body: formData
      })
      
      if (uploadResponse.data?.url) {
        logoUrl = uploadResponse.data.url
      }
    }
    
    await participantStore.addParticipant(tournamentId.value, {
      customName: event.data.customName,
      seed: event.data.seed,
      logoUrl: logoUrl,
      teamId: addParticipantState.teamId
    })
    showAddModal.value = false
    resetAddForm()
  } catch (err: any) {
    addError.value = handleError(err, { toast: false })
  } finally {
    addingParticipant.value = false
  }
}

// Edit Participant Modal
const showEditModal = ref(false)
const editingParticipant = ref(false)
const editParticipantError = ref<string | null>(null)
const editingParticipantId = ref<string | null>(null)

const editParticipantState = reactive({
  customName: '',
  logoUrl: null as string | null,
  teamId: null as string | null
})

const editLogoFileInput = ref<HTMLInputElement | null>(null)
const editLogoFile = ref<File | null>(null)
const editLogoPreview = ref<string | null>(null)

const triggerEditLogoInput = () => {
  editLogoFileInput.value?.click()
}

const handleEditLogoChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return
  if (!file.type.startsWith('image/')) {
    editParticipantError.value = 'Please select an image file'
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    editParticipantError.value = 'Image must be less than 5MB'
    return
  }
  
  editParticipantError.value = null
  editLogoFile.value = file
  editLogoPreview.value = URL.createObjectURL(file)
}

const removeEditLogo = () => {
  editLogoFile.value = null
  editLogoPreview.value = null
  editParticipantState.logoUrl = null
  if (editLogoFileInput.value) {
    editLogoFileInput.value.value = ''
  }
}

const openEditParticipantModal = (participant: Participant) => {
  editingParticipantId.value = participant.id
  editParticipantState.customName = participant.customName || ''
  editParticipantState.logoUrl = participant.logoUrl || null
  editParticipantState.teamId = participant.team_id || participant.team?.id || null
  editParticipantError.value = null
  
  editLogoFile.value = null
  editLogoPreview.value = participant.logoUrl || null // preview existing logo
  
  showEditModal.value = true
}

const handleEditParticipant = async () => {
  if (!editingParticipantId.value) return
  
  editingParticipant.value = true
  editParticipantError.value = null
  
  try {
    let finalLogoUrl = editParticipantState.logoUrl
    
    // Upload new logo if selected
    if (editLogoFile.value) {
      const formData = new FormData()
      formData.append('file', editLogoFile.value)
      
      const uploadResponse = await $api<{success: boolean, data: { url: string }, message: string}>('/upload/image?folder=participants', {
        method: 'POST',
        body: formData
      })
      
      if (uploadResponse.data?.url) {
        finalLogoUrl = uploadResponse.data.url
      }
    }
    
    await participantStore.updateParticipant(editingParticipantId.value, {
      customName: editParticipantState.customName,
      logoUrl: finalLogoUrl,
      teamId: editParticipantState.teamId
    })
    
    useToast().add({ title: 'Participant updated successfully', color: 'success' })
    showEditModal.value = false
  } catch (err: any) {
    editParticipantError.value = handleError(err, { toast: false })
  } finally {
    editingParticipant.value = false
  }
}

// Link Code state
const showLinkCodeModal = ref(false)
const currentLinkCode = ref<string | null>(null)
const currentLinkCodeExpiry = ref<string | null>(null)
const generatingLinkCode = ref(false)
const linkCodeModalTitle = ref('Team Link Code')
const linkCodeModalDesc = ref('Share this code with the team manager. They can enter it on their team profile page to link it to this tournament entry.')

const handleGenerateLinkCode = async (participantId: string) => {
  generatingLinkCode.value = true
  try {
    const res = await $api<{ success: boolean, data: { code: string, expiresAt: string } }>(`/participants/${participantId}/generate-link-code`, {
      method: 'POST'
    })
    linkCodeModalTitle.value = 'Team Link Code'
    linkCodeModalDesc.value = 'Share this code with the team manager. They can enter it on their team profile page to link it to this tournament entry.'
    currentLinkCode.value = res.data.code
    currentLinkCodeExpiry.value = res.data.expiresAt
    showLinkCodeModal.value = true
  } catch (err: any) {
    handleError(err, { title: 'Failed to generate link code' })
  } finally {
    generatingLinkCode.value = false
  }
}

const handleUnlinkProfile = async (participant: Participant) => {
  try {
    await participantStore.updateParticipant(participant.id, { teamId: null } as any)
    useToast().add({ title: 'Team profile unlinked', color: 'success' })
    // Refresh participants
    if (tournamentId.value) {
      participantStore.fetchParticipants(tournamentId.value)
    }
  } catch (err: any) {
    handleError(err, { title: 'Failed to unlink profile' })
  }
}

const handleGeneratePlayerLinkCode = async (playerId: string) => {
  generatingLinkCode.value = true
  try {
    const res = await $api<{ success: boolean, data: { code: string, expiresAt: string } }>(`/players/${playerId}/generate-link-code`, {
      method: 'POST'
    })
    linkCodeModalTitle.value = 'Player Link Code'
    linkCodeModalDesc.value = 'Share this code with the player. They can enter it on their player profile page/settings to link their user account to this player entry.'
    currentLinkCode.value = res.data.code
    currentLinkCodeExpiry.value = res.data.expiresAt
    showLinkCodeModal.value = true
  } catch (err: any) {
    handleError(err, { title: 'Failed to generate player link code' })
  } finally {
    generatingLinkCode.value = false
  }
}

const handleUnlinkPlayerProfile = async (player: any) => {
  try {
    await $api(`/players/${player.id}/unlink-profile`, { method: 'POST' })
    useToast().add({ title: 'Player profile unlinked', color: 'success' })
    // Refresh player list in modal
    if (selectedParticipant.value) {
      const updatedPlayers = await participantStore.fetchParticipantPlayers(selectedParticipant.value.id)
      selectedParticipant.value.players = updatedPlayers
    }
  } catch (err: any) {
    handleError(err, { title: 'Failed to unlink player profile' })
  }
}

const myTeamOptions = computed(() => {
  return teamStore.teams.map(t => ({
    name: t.name,
    id: t.id,
    avatar: t.logoUrl ? { src: t.logoUrl } : undefined
  }))
})

async function searchTeams(query: string) {
  if (!query) return myTeamOptions.value
  const teams = await teamStore.searchAllTeams(query)
  return teams.map(t => ({
    name: t.name,
    id: t.id,
    avatar: t.logoUrl ? { src: t.logoUrl } : undefined
  }))
}


// Status badge colors
const statusColors: Record<ParticipantStatus, 'success' | 'warning' | 'error' | 'neutral'> = {
  [ParticipantStatus.CONFIRMED]: 'success',
  [ParticipantStatus.PENDING]: 'warning',
  [ParticipantStatus.DECLINED]: 'error',
  [ParticipantStatus.DISQUALIFIED]: 'neutral'
}

// Format date for display
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

// Tournament status
const tournamentStatus = computed(() => {
  if (!tournament.value) return null
  const now = new Date()
  const start = new Date(tournament.value.start_date)
  const end = new Date(tournament.value.end_date)
  
  if (now < start) return { label: 'Upcoming', color: 'info' as const }
  if (now > end) return { label: 'Completed', color: 'neutral' as const }
  return { label: 'Active', color: 'success' as const }
})

// Type labels
const typeLabels: Record<TournamentType, string> = {
  [TournamentType.KNOCKOUT]: 'Knockout',
  [TournamentType.LEAGUE]: 'League',
  [TournamentType.ROUND_ROBIN]: 'Round Robin',
  [TournamentType.GROUP]: 'Group Stage',
  [TournamentType.HYBRID]: 'Hybrid (Group + Knockout)',
  [TournamentType.FRIENDLY]: 'Friendly Match'
}

const participantLabels: Record<ParticipantType, string> = {
  [ParticipantType.TEAM]: 'Teams',
  [ParticipantType.INDIVIDUAL]: 'Individuals'
}

const visibilityLabels: Record<Visibility, { label: string; icon: string }> = {
  [Visibility.PUBLIC]: { label: 'Public', icon: 'i-heroicons-globe-alt' },
  [Visibility.UNLISTED]: { label: 'Unlisted', icon: 'i-heroicons-eye-slash' },
  [Visibility.PRIVATE]: { label: 'Private', icon: 'i-heroicons-lock-closed' }
}

// Placeholder images
const PLACEHOLDER_LOGO = 'https://res.cloudinary.com/djsnerfzp/image/upload/v1769695792/parascores_logo_placeholder.png'
const PLACEHOLDER_BANNER = 'https://res.cloudinary.com/djsnerfzp/image/upload/v1769696842/parascores_banner_placeholder.png'

const showTodayOnly = ref(false)

const hasTodayFixtures = computed(() => {
  const todayStr = new Date().toLocaleDateString('en-CA')
  return fixtures.value.some(f => f.startTime && new Date(f.startTime).toLocaleDateString('en-CA') === todayStr)
})

// Calculate expected rounds based on tournament type and participants
const expectedRounds = computed(() => {
  if (!tournament.value) return []
  const type = tournament.value.type
  const totalTeamCount = participants.value.length
  if (totalTeamCount < 2) return []

  const items: { label: string; round: number; stage: FixtureStage }[] = []

  // 1. Group Stage / League / Round Robin
  if ([TournamentType.LEAGUE, TournamentType.ROUND_ROBIN, TournamentType.GROUP, TournamentType.HYBRID].includes(type)) {
    // Determine number of teams to use for round calculation
    const groupCounts = new Map<string, number>()
    participants.value.forEach(p => {
      if (p.groupId) groupCounts.set(p.groupId, (groupCounts.get(p.groupId) || 0) + 1)
    })
    const groupStageTeamCount = groupCounts.size > 0 ? Math.max(...groupCounts.values()) : totalTeamCount
    const oneWayRoundCount = groupStageTeamCount % 2 === 0 ? groupStageTeamCount - 1 : groupStageTeamCount
    
    // Check if we already have double round robin fixtures to decide how many to show
    const hasDoubleRoundRobin = tournament.value.doubleRoundRobin
    const roundCount = hasDoubleRoundRobin ? 2 * oneWayRoundCount : oneWayRoundCount

    for (let i = 1; i <= roundCount; i++) {
      items.push({ label: `Matchday ${i}`, round: i, stage: FixtureStage.GROUP_STAGE })
    }
  }

  // 2. Knockout Stage
  if ([TournamentType.KNOCKOUT, TournamentType.HYBRID].includes(type)) {
    const totalRounds = Math.ceil(Math.log2(totalTeamCount))
    const bracketSize = Math.pow(2, totalRounds)
    
    // Calculate offset for knockout rounds if hybrid
    let baseRoundOffset = 0
    if (type === TournamentType.HYBRID) {
       const groupCounts = new Map<string, number>()
       participants.value.forEach(p => {
         if (p.groupId) groupCounts.set(p.groupId, (groupCounts.get(p.groupId) || 0) + 1)
       })
       const groupStageTeamCount = groupCounts.size > 0 ? Math.max(...groupCounts.values()) : totalTeamCount
       
       const hasDoubleRoundRobin = tournament.value.doubleRoundRobin
       const gpOneWayRounds = groupStageTeamCount % 2 === 0 ? groupStageTeamCount - 1 : groupStageTeamCount
       baseRoundOffset = hasDoubleRoundRobin ? 2 * gpOneWayRounds : gpOneWayRounds
    }

    for (let i = 1; i <= totalRounds; i++) {
        const roundsFromFinal = totalRounds - i
        let name: string
        switch (roundsFromFinal) {
            case 0: name = 'Final'; break
            case 1: name = 'Semi Final'; break
            case 2: name = 'Quarter Final'; break
            default:
                const teamsInRound = bracketSize / Math.pow(2, i - 1)
                name = `Round of ${teamsInRound}`
        }
        
        const roundNum = baseRoundOffset + i
        const isFinal = roundsFromFinal === 0
        
        if (tournament.value?.twoLegsKnockout && !isFinal) {
            items.push({ label: `${name} - Leg 1`, round: roundNum, stage: FixtureStage.KNOCKOUT })
            items.push({ label: `${name} - Leg 2`, round: roundNum, stage: FixtureStage.KNOCKOUT })
        } else {
            items.push({ label: name, round: roundNum, stage: FixtureStage.KNOCKOUT })
        }
    }
    
    if (tournament.value?.thirdPlaceMatch) {
       items.push({ label: 'Third Place Match', round: baseRoundOffset + totalRounds + 1, stage: FixtureStage.KNOCKOUT })
    }
  }

  return items
})

const isFixturesOutdated = computed(() => {
  if (fixturesLoading.value || !tournament.value || fixtures.value.length === 0) return false
  
  const type = tournament.value.type
  const currentParticipants = participants.value
  const tournamentTeamIds = new Set(currentParticipants.map(p => p.id))
  
  // 1. Check for rounds that shouldn't exist anymore (e.g. went from 8 teams to 4)
  // Skip for pure knockout — those fixtures have no stage set and aren't group-based
  if (type !== TournamentType.KNOCKOUT && type !== TournamentType.FRIENDLY) {
    const expectedGroupRounds = expectedRounds.value.filter(r => r.stage === FixtureStage.GROUP_STAGE || !r.stage)
    const actualGroupRounds = groupStageRounds.value
    
    // If we have more group rounds in DB than expected, it's outdated
    if (actualGroupRounds.length > expectedGroupRounds.length) return true
    
    // For Round Robin / League / Groups: The counts should match exactly
    if ([TournamentType.LEAGUE, TournamentType.ROUND_ROBIN, TournamentType.GROUP, TournamentType.HYBRID].includes(type)) {
       if (actualGroupRounds.length !== expectedGroupRounds.length) return true
    }
  }

  // 2. Check for "Orphan" participants in fixtures (teams that were deleted)
  for (const f of fixtures.value) {
    // If a fixture has a hard ID that is no longer in the tournament
    if (f.homeTeamId && !tournamentTeamIds.has(f.homeTeamId)) return true
    if (f.awayTeamId && !tournamentTeamIds.has(f.awayTeamId)) return true
  }
  
  // 3. For Round Robin specifically: Check if every CURRENT team is actually in the fixtures
  // (Detects if you added a team but haven't regenerated)
  if ([TournamentType.ROUND_ROBIN, TournamentType.LEAGUE].includes(type)) {
    const participantsInFixtures = new Set()
    fixtures.value.forEach(f => {
      if (f.homeTeamId) participantsInFixtures.add(f.homeTeamId)
      if (f.awayTeamId) participantsInFixtures.add(f.awayTeamId)
    })
    
    // If there are teams in the tournament NOT in any fixtures
    if (currentParticipants.some(p => !participantsInFixtures.has(p.id))) return true
  }
  
  // 4. For group stage matches, check if the group assignment still matches
  if (type === TournamentType.GROUP || type === TournamentType.HYBRID) {
    const pGroupMap = new Map(currentParticipants.map(p => [p.id, p.groupId]))
    for (const f of fixtures.value) {
      if ((f.stage === FixtureStage.GROUP_STAGE || !f.stage) && f.groupId) {
        if (f.homeTeamId && pGroupMap.get(f.homeTeamId) !== f.groupId) return true
        if (f.awayTeamId && pGroupMap.get(f.awayTeamId) !== f.groupId) return true
      }
    }
  }

  return false
})

// Accordion items for fixtures
const accordionItems = computed(() => {
  const skeleton = expectedRounds.value.filter(r => r.stage === FixtureStage.GROUP_STAGE || !r.stage)
  const existingRounds = rounds.value
  const allRoundNumbers = Array.from(new Set([...skeleton.map(r => r.round), ...existingRounds])).sort((a, b) => a - b)

  return allRoundNumbers.map(round => {
    let roundFixtures = fixturesByRound.value[round] || []
    const skeletonInfo = skeleton.find(s => s.round === round)
    
    if (showTodayOnly.value) {
      const todayStr = new Date().toLocaleDateString('en-CA')
      roundFixtures = roundFixtures.filter(f => f.startTime && new Date(f.startTime).toLocaleDateString('en-CA') === todayStr)
      // Only hide empty rounds if showing today only
      if (roundFixtures.length === 0) return null
    }

    const total = roundFixtures.length
    const completed = roundFixtures.filter(f => f.status === FixtureStatus.COMPLETED).length
    const live = roundFixtures.filter(f => f.status === FixtureStatus.LIVE).length
    
    let label = skeletonInfo?.label || fixtureStore.getRoundDisplayName(round)
    
    let stats = ''
    const parts = []
    if (live > 0) parts.push(`🔴 ${live} Live`)
    if (completed > 0) parts.push(`${completed}/${total} Completed`)
    else if (total > 0) parts.push(`${total} Scheduled`)
    
    if (parts.length > 0) {
      stats = `(${parts.join(' • ')})`
    }
    
    return {
      value: `round-${round}`,
      label,
      stats,
      fixtures: roundFixtures,
      defaultOpen: true,
      color: 'neutral' as const,
      variant: 'soft' as const,
      slot: 'content',
      round,
      roundName: label
    }
  }).filter((item) => item !== null) as Array<{ value: string; label: string; stats: string; fixtures: Fixture[]; defaultOpen: boolean; color: any; variant: any; slot: string; round: number; roundName: string }>
})

// Group-stage-only accordion items (for hybrid tournaments)
const groupStageAccordionItems = computed(() => {
  const skeleton = expectedRounds.value.filter(r => r.stage === FixtureStage.GROUP_STAGE)
  const existingRounds = groupStageRounds.value
  const allRoundNumbers = Array.from(new Set([...skeleton.map(r => r.round), ...existingRounds])).sort((a, b) => a - b)

  return allRoundNumbers.map(round => {
    let roundFixtures = groupStageFixturesByRound.value[round] || []
    const skeletonInfo = skeleton.find(s => s.round === round)
    
    if (showTodayOnly.value) {
      const todayStr = new Date().toLocaleDateString('en-CA')
      roundFixtures = roundFixtures.filter(f => f.startTime && new Date(f.startTime).toLocaleDateString('en-CA') === todayStr)
      if (roundFixtures.length === 0) return null
    }

    const total = roundFixtures.length
    const completed = roundFixtures.filter(f => f.status === FixtureStatus.COMPLETED).length
    const live = roundFixtures.filter(f => f.status === FixtureStatus.LIVE).length
    
    let label = skeletonInfo?.label || fixtureStore.getGroupStageRoundDisplayName(round)
    
    let stats = ''
    const parts = []
    if (live > 0) parts.push(`🔴 ${live} Live`)
    if (completed > 0) parts.push(`${completed}/${total} Completed`)
    else if (total > 0) parts.push(`${total} Scheduled`)
    
    if (parts.length > 0) {
      stats = `(${parts.join(' • ')})`
    }
    
    return {
      value: `gs-round-${round}`,
      label,
      stats,
      fixtures: roundFixtures,
      defaultOpen: true,
      color: 'neutral' as const,
      variant: 'soft' as const,
      slot: 'content',
      round,
      roundName: label
    }
  }).filter((item) => item !== null) as Array<{ value: string; label: string; stats: string; fixtures: Fixture[]; defaultOpen: boolean; color: any; variant: any; slot: string; round: number; roundName: string }>
})

// Accordion items for the pure knockout bracket fixture list
// Groups by roundName within each round so legs stay together per stage
const knockoutAccordionItems = computed(() => {
  const items: Array<{ value: string; label: string; stats: string; fixtures: Fixture[]; slot: string; round: number; roundName: string }> = []
  const skeleton = expectedRounds.value.filter(r => r.stage === FixtureStage.KNOCKOUT)
  
  // For pure knockout tournaments, fixtures don't have stage set — use all fixtures
  // For hybrid tournaments, use only knockout-stage fixtures
  const isHybrid = tournament.value?.type === TournamentType.HYBRID
  const relevantFixturesByRound = isHybrid ? knockoutFixturesByRound.value : fixturesByRound.value
  const relevantRounds = isHybrid ? knockoutRounds.value : rounds.value

  const allRoundNumbers = Array.from(new Set([...skeleton.map(r => r.round), ...relevantRounds])).sort((a, b) => a - b)

  for (const round of allRoundNumbers) {
    let roundFixtures = (relevantFixturesByRound[round] || [])
      .slice()
      .sort((a, b) => a.matchNumber - b.matchNumber)

    if (showTodayOnly.value) {
      const todayStr = new Date().toLocaleDateString('en-CA')
      roundFixtures = roundFixtures.filter(f => f.startTime && new Date(f.startTime).toLocaleDateString('en-CA') === todayStr)
      // If showing today only, skip the round if no fixtures
      if (roundFixtures.length === 0) continue
    }

    // Only add fixtures, don't pre-fill with skeleton if empty
    const byName = new Map<string, Fixture[]>()
    for (const f of roundFixtures) {
      const key = f.roundName || `Round ${f.round}`
      if (!byName.has(key)) byName.set(key, [])
      byName.get(key)!.push(f)
    }

    // Sort: Leg 1, Leg 2, ..., other rounds, Third Place Match, Final
    const legKey = (name: string) => {
      const leg = name.match(/Leg (\d+)/)?.[1]
      if (leg) return parseInt(leg)
      if (/^final$/i.test(name.trim())) return 10000
      return 999
    }
    const sortedKeys = Array.from(byName.keys()).sort((a, b) => legKey(a) - legKey(b))

    for (const label of sortedKeys) {
      const fixtures = byName.get(label)!
      const total = fixtures.length
      const completed = fixtures.filter(f => f.status === FixtureStatus.COMPLETED).length
      const live = fixtures.filter(f => f.status === FixtureStatus.LIVE).length

      const parts: string[] = []
      if (live > 0) parts.push(`🔴 ${live} Live`)
      if (completed > 0) parts.push(`${completed}/${total} Completed`)
      else if (total > 0) parts.push(`${total} Scheduled`)

      items.push({
        value: `ko-${round}-${label}`,
        label,
        stats: parts.length ? `(${parts.join(' • ')})` : '',
        fixtures,
        slot: 'content',
        round,
        roundName: label
      })
    }
  }

  return items
})

// Same pattern for the hybrid knockout stage
const hybridKnockoutAccordionItems = computed(() => {
  const items: Array<{ value: string; label: string; stats: string; fixtures: Fixture[]; slot: string; round: number; roundName: string }> = []
  const skeleton = expectedRounds.value.filter(r => r.stage === FixtureStage.KNOCKOUT)
  
  // Use skeleton labels as base structure, plus any existing knockout rounds
  const existingRounds = knockoutRounds.value
  const allRoundNumbers = Array.from(new Set([...skeleton.map(r => r.round), ...existingRounds])).sort((a, b) => a - b)

  for (const round of allRoundNumbers) {
    let roundFixtures = (knockoutFixturesByRound.value[round] || [])
      .slice()
      .sort((a, b) => a.matchNumber - b.matchNumber)

    if (showTodayOnly.value) {
      const todayStr = new Date().toLocaleDateString('en-CA')
      roundFixtures = roundFixtures.filter(f => f.startTime && new Date(f.startTime).toLocaleDateString('en-CA') === todayStr)
      if (roundFixtures.length === 0) continue
    }

    const byName = new Map<string, Fixture[]>()
    
    for (const f of roundFixtures) {
      const key = f.roundName || `Round ${f.round}`
      if (!byName.has(key)) byName.set(key, [])
      byName.get(key)!.push(f)
    }

    const legKey = (name: string) => {
      const leg = name.match(/Leg (\d+)/)?.[1]
      if (leg) return parseInt(leg)
      if (/^final$/i.test(name.trim())) return 10000
      return 999
    }
    const sortedKeys = Array.from(byName.keys()).sort((a, b) => legKey(a) - legKey(b))

    for (const label of sortedKeys) {
      const fixtures = byName.get(label)!
      const total = fixtures.length
      const completed = fixtures.filter(f => f.status === FixtureStatus.COMPLETED).length
      const live = fixtures.filter(f => f.status === FixtureStatus.LIVE).length

      const parts: string[] = []
      if (live > 0) parts.push(`🔴 ${live} Live`)
      if (completed > 0) parts.push(`${completed}/${total} Completed`)
      else if (total > 0) parts.push(`${total} Scheduled`)

      items.push({
        value: `hko-${round}-${label}`,
        label,
        stats: parts.length ? `(${parts.join(' • ')})` : '',
        fixtures,
        slot: 'content',
        round,
        roundName: label
      })
    }
  }

  return items
})

// Match Control Modal
const showMatchControlModal = ref(false)
const selectedFixture = ref<Fixture | null>(null)
const updatingMatch = ref(false)

const openMatchControl = (fixture: Fixture) => {
  selectedFixture.value = { ...fixture }
  showMatchControlModal.value = true
}

const startMatch = async (fixture: Fixture) => {
  updatingMatch.value = true
  try {
    await fixtureStore.updateFixture(fixture.id, {
      status: FixtureStatus.LIVE,
      homeScore: fixture.homeScore ?? 0,
      awayScore: fixture.awayScore ?? 0
    })
    
    useToast().add({ 
      title: 'Match Started', 
      description: 'The match is now live!',
      icon: 'i-heroicons-play',
      color: 'success' 
    })
  } catch (error: any) {
    useToast().add({ 
      title: 'Failed to start match', 
      description: error?.data?.message || error?.message || 'Unknown error', 
      color: 'error' 
    })
  } finally {
    updatingMatch.value = false
  }
}

const handleFixtureUpdated = (fixture: Fixture) => {
  // Update the fixture in the store/list if needed
  selectedFixture.value = fixture
}

const handleMatchEnded = async () => {
  // Refresh fixtures so the bracket updates immediately (e.g., winner advances)
  await fixtureStore.fetchFixtures(tournamentId.value)
  // Refresh standings if applicable
  if (showStandings.value) {
    await standingStore.fetchStandings(tournamentId.value)
  }
}

// Sponsor Management
const showAddSponsorModal = ref(false)
const addingSponsor = ref(false)
const addSponsorError = ref<string | null>(null)

const addSponsorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(200).optional().nullable().or(z.literal('')),
  logoUrl: z.string().url('Must be a valid URL').optional().nullable().or(z.literal('')),
  websiteUrl: z.string().url('Must be a valid URL').optional().nullable().or(z.literal(''))
})

type AddSponsorSchema = z.output<typeof addSponsorSchema>

const addSponsorState = reactive<Partial<AddSponsorSchema>>({
  name: '',
  description: '',
  logoUrl: '',
  websiteUrl: ''
})

// Sponsor Logo Upload State
const sponsorLogoFileInput = ref<HTMLInputElement | null>(null)
const sponsorLogoFile = ref<File | null>(null)
const sponsorLogoPreview = ref<string | null>(null)
const uploadingSponsorLogo = ref(false)

const triggerSponsorLogoInput = () => {
  sponsorLogoFileInput.value?.click()
}

const handleSponsorLogoChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return
  
  if (!file.type.startsWith('image/')) {
    addSponsorError.value = 'Please select an image file'
    return
  }
  
  if (file.size > 5 * 1024 * 1024) {
    addSponsorError.value = 'Image must be less than 5MB'
    return
  }
  
  sponsorLogoFile.value = file
  sponsorLogoPreview.value = URL.createObjectURL(file)
  addSponsorError.value = null
}

const removeSponsorLogo = () => {
  sponsorLogoFile.value = null
  sponsorLogoPreview.value = null
  if (sponsorLogoFileInput.value) {
    sponsorLogoFileInput.value.value = ''
  }
}

const openAddSponsorModal = () => {
  addSponsorState.name = ''
  addSponsorState.description = ''
  addSponsorState.logoUrl = ''
  addSponsorState.websiteUrl = ''
  addSponsorError.value = null
  // Reset upload state
  removeSponsorLogo()
  showAddSponsorModal.value = true
}

const handleAddSponsor = async (event: FormSubmitEvent<AddSponsorSchema>) => {
  addingSponsor.value = true
  addSponsorError.value = null
  
  try {
    let finalLogoUrl = event.data.logoUrl

    // Upload logo if selected
    if (sponsorLogoFile.value) {
      uploadingSponsorLogo.value = true
      try {
        const formData = new FormData()
        formData.append('file', sponsorLogoFile.value)
        
        const uploadResponse = await $api<{success: boolean, data: { url: string, publicId: string }, message: string}>('/upload/image?folder=sponsors', {
          method: 'POST',
          body: formData
        })
        
        if (uploadResponse.data?.url) {
          finalLogoUrl = uploadResponse.data.url
        }
      } finally {
        uploadingSponsorLogo.value = false
      }
    }

    await sponsorStore.addSponsor(tournamentId.value, {
      name: event.data.name,
      description: event.data.description || null,
      logoUrl: finalLogoUrl || null,
      websiteUrl: event.data.websiteUrl || null
    })
    showAddSponsorModal.value = false
    useToast().add({ title: 'Sponsor added successfully', color: 'success' })
  } catch (err: any) {
    addSponsorError.value = err?.data?.message || err?.message || 'Failed to add sponsor'
  } finally {
    addingSponsor.value = false
  }
}

const handleRemoveSponsor = (sponsorId: string) => {
  openConfirmModal({
    title: 'Remove Sponsor',
    description: 'Are you sure you want to remove this sponsor?',
    confirmLabel: 'Remove',
    color: 'error',
    onConfirm: async () => {
      try {
        await sponsorStore.removeSponsor(tournamentId.value, sponsorId)
        useToast().add({ title: 'Sponsor removed', color: 'success' })
      } catch (error: any) {
        const message = error.data?.message || error.message || 'Unknown error'
        useToast().add({
          title: 'Failed to remove sponsor',
          description: message,
          color: 'error'
        })
      }
    }
  })
}

// Edit Sponsor
const showEditSponsorModal = ref(false)
const editingSponsor = ref(false)
const editSponsorError = ref<string | null>(null)
const editSponsorId = ref<string | null>(null)

const editSponsorState = reactive<Partial<AddSponsorSchema>>({
  name: '',
  description: '',
  logoUrl: '',
  websiteUrl: ''
})

const openEditSponsorModal = (sponsor: Sponsor) => {
  editSponsorId.value = sponsor.id
  editSponsorState.name = sponsor.name
  editSponsorState.description = sponsor.description || ''
  editSponsorState.logoUrl = sponsor.logoUrl || ''
  editSponsorState.websiteUrl = sponsor.websiteUrl || ''
  editSponsorError.value = null
  removeSponsorLogo()
  showEditSponsorModal.value = true
}

const handleEditSponsor = async (event: FormSubmitEvent<AddSponsorSchema>) => {
  if (!editSponsorId.value) return
  editingSponsor.value = true
  editSponsorError.value = null

  try {
    let finalLogoUrl = event.data.logoUrl

    if (sponsorLogoFile.value) {
      uploadingSponsorLogo.value = true
      try {
        const formData = new FormData()
        formData.append('file', sponsorLogoFile.value)
        const uploadResponse = await $api<{success: boolean, data: { url: string, publicId: string }, message: string}>('/upload/image?folder=sponsors', {
          method: 'POST',
          body: formData
        })
        if (uploadResponse.data?.url) {
          finalLogoUrl = uploadResponse.data.url
        }
      } finally {
        uploadingSponsorLogo.value = false
      }
    }

    await sponsorStore.updateSponsor(tournamentId.value, editSponsorId.value, {
      name: event.data.name,
      description: event.data.description || null,
      logoUrl: finalLogoUrl || null,
      websiteUrl: event.data.websiteUrl || null
    })
    showEditSponsorModal.value = false
    useToast().add({ title: 'Sponsor updated', color: 'success' })
  } catch (err: any) {
    editSponsorError.value = err?.data?.message || err?.message || 'Failed to update sponsor'
  } finally {
    editingSponsor.value = false
  }
}

// Social Management
const showAddSocialModal = ref(false)
const addingSocial = ref(false)
const addSocialError = ref<string | null>(null)

const platformOptions = [
  { value: 'twitter', label: 'Twitter / X', icon: 'i-simple-icons-x', color: 'text-black dark:text-white' },
  { value: 'instagram', label: 'Instagram', icon: 'i-simple-icons-instagram', color: 'text-pink-500' },
  { value: 'facebook', label: 'Facebook', icon: 'i-simple-icons-facebook', color: 'text-blue-600' },
  { value: 'youtube', label: 'YouTube', icon: 'i-simple-icons-youtube', color: 'text-red-600' },
  { value: 'tiktok', label: 'TikTok', icon: 'i-simple-icons-tiktok', color: 'text-black dark:text-white' },
  { value: 'discord', label: 'Discord', icon: 'i-simple-icons-discord', color: 'text-indigo-500' },
  { value: 'twitch', label: 'Twitch', icon: 'i-simple-icons-twitch', color: 'text-purple-500' },
  { value: 'website', label: 'Website', icon: 'i-heroicons-globe-alt', color: 'text-gray-500' }
]

const addSocialSchema = z.object({
  platform: z.string().min(1, 'Platform is required'),
  url: z.string().url('Must be a valid URL'),
  handle: z.string().optional().nullable()
})

type AddSocialSchema = z.output<typeof addSocialSchema>

const addSocialState = reactive<Partial<AddSocialSchema>>({
  platform: '',
  url: '',
  handle: ''
})

const openAddSocialModal = () => {
  addSocialState.platform = ''
  addSocialState.url = ''
  addSocialState.handle = ''
  addSocialError.value = null
  showAddSocialModal.value = true
}

const handleAddSocial = async (event: FormSubmitEvent<AddSocialSchema>) => {
  addingSocial.value = true
  addSocialError.value = null
  
  try {
    await socialStore.addSocial(tournamentId.value, {
      platform: event.data.platform,
      url: event.data.url,
      handle: event.data.handle || null
    })
    showAddSocialModal.value = false
    useToast().add({ title: 'Social link added successfully', color: 'success' })
  } catch (err: any) {
    addSocialError.value = err?.data?.message || err?.message || 'Failed to add social link'
  } finally {
    addingSocial.value = false
  }
}

const handleRemoveSocial = (socialId: string) => {
  openConfirmModal({
    title: 'Remove Social Link',
    description: 'Are you sure you want to remove this social link?',
    confirmLabel: 'Remove',
    color: 'error',
    onConfirm: async () => {
      try {
        await socialStore.removeSocial(tournamentId.value, socialId)
        useToast().add({ title: 'Social link removed', color: 'success' })
      } catch (error: any) {
        const message = error.data?.message || error.message || 'Unknown error'
        useToast().add({ 
          title: 'Failed to remove social link', 
          description: message, 
          color: 'error' 
        })
      }
    }
  })
}

const getSocialIcon = (platform: string) => {
  const option = platformOptions.find(p => p.value === platform.toLowerCase())
  return option?.icon || 'i-heroicons-link'
}

const getSocialColor = (platform: string) => {
  const option = platformOptions.find(p => p.value === platform.toLowerCase())
  return option?.color || 'text-gray-500'
}

// Venue Management
const showAddVenueModal = ref(false)
const addingVenue = ref(false)
const newVenueName = ref('')
const addVenueError = ref<string | null>(null)

// Manage Modes
const manageModes = reactive({
  sponsors: false,
  venues: false,
  socials: false
})

// Invite Link Management
const showInviteModal = ref(false)
const inviteLink = ref('')
const inviteLoading = ref(false)
const inviteParticipant = ref<Participant | null>(null)

const generateInviteLink = async (participant: Participant, openModal = true) => {
  inviteParticipant.value = participant
  inviteLoading.value = true
  if (openModal) showInviteModal.value = true
  try {
    const response = await $api<{success: boolean, data: any}>('/team-invites', {
      method: 'POST',
      body: {
        participantId: participant.id,
        tournamentId: tournament.value?.id || tournamentId.value,
      },
    })
    if (response.data) {
      const host = import.meta.client ? window.location.host.replace(/^manage\./, '') : 'parascores.com'
      const protocol = import.meta.dev ? 'http' : 'https'
      const baseUrl = `${protocol}://${host}`
      inviteLink.value = `${baseUrl}/join/${response.data.token}`
    }
  } catch (err: any) {
    useToast().add({
      title: 'Failed to generate invite link',
      description: err?.data?.message || err?.message || 'Unknown error',
      color: 'error',
    })
    showInviteModal.value = false
  } finally {
    inviteLoading.value = false
  }
}

const copyInviteLink = async () => {
  if (!import.meta.client) return
  try {
    await navigator.clipboard.writeText(inviteLink.value)
    useToast().add({ title: 'Invite link copied!', color: 'success' })
  } catch {
    useToast().add({ title: 'Failed to copy link', color: 'error' })
  }
}

const openAddVenueModal = () => {
  newVenueName.value = ''
  addVenueError.value = null
  showAddVenueModal.value = true
}

const handleAddVenue = async () => {
  if (addingVenue.value || !newVenueName.value.trim() || !tournament.value) return
  
  // Check if venue already exists
  const exists = venues.value.some(v => v.name.toLowerCase() === newVenueName.value.trim().toLowerCase())
  if (exists) {
    addVenueError.value = 'A venue with this name already exists'
    return
  }

  addingVenue.value = true
  addVenueError.value = null
  
  try {
    await venueStore.addVenue(tournamentId.value, newVenueName.value.trim())
    showAddVenueModal.value = false
    useToast().add({ title: 'Venue added successfully', color: 'success' })
  } catch (err: any) {
    addVenueError.value = err?.data?.message || err?.message || 'Failed to add venue'
  } finally {
    addingVenue.value = false
  }
}

const handleRemoveVenue = (venueId: string, venueName: string) => {
  openConfirmModal({
    title: 'Remove Venue',
    description: `Are you sure you want to remove "${venueName}" from the list of venues?`,
    confirmLabel: 'Remove',
    color: 'error',
    onConfirm: async () => {
      try {
        await venueStore.removeVenue(venueId)
        useToast().add({ title: 'Venue removed', color: 'success' })
      } catch (error: any) {
        const message = error.data?.message || error.message || 'Unknown error'
        useToast().add({ 
          title: 'Failed to remove venue', 
          description: message, 
          color: 'error' 
        })
      }
    }
  })
}

// Pending requests calculation
const totalPendingRequests = computed(() => {
  if (!participants.value) return 0
  const pendingTeams = participants.value.filter(p => p.status === ParticipantStatus.PENDING).length
  const pendingPlayers = participants.value.reduce((total, p) => {
    const pendingCount = p.players?.filter(pl => pl.status === 'PENDING').length || 0
    return total + pendingCount
  }, 0)
  return pendingTeams + pendingPlayers
})

// Tab configuration
// Tab management
const activeTab = ref('0')
const tabItems = computed(() => {
  const items = [
    {
      slot: 'overview',
      label: 'Overview',
      icon: 'i-heroicons-information-circle'
    },
    {
      slot: 'participants',
      label: 'Participants',
      icon: 'i-heroicons-user-group',
      badge: totalPendingRequests.value > 0 ? totalPendingRequests.value : undefined
    },
    {
      slot: 'fixtures',
      label: 'Fixtures',
      icon: 'i-heroicons-calendar-days'
    }
  ]

  // Add Groups tab for Group/Hybrid tournaments
  if (tournament.value?.type === TournamentType.GROUP || tournament.value?.type === TournamentType.HYBRID) {
    items.splice(2, 0, {
      slot: 'groups',
      label: 'Groups',
      icon: 'i-heroicons-rectangle-group'
    })
  }

  if (showStandings.value) {
    items.push({
      slot: 'standings',
      label: 'Standings',
      icon: 'i-heroicons-chart-bar'
    })
  }

  if (tournament.value?.participantType === ParticipantType.TEAM) {
    items.push({
      slot: 'stats',
      label: 'Player Stats',
      icon: 'i-heroicons-star'
    })
  }

  // Add settings tab
  items.push({
    slot: 'settings',
    label: 'Settings',
    icon: 'i-heroicons-cog-6-tooth'
  })

  return items
})

// Shared Confirmation Modal State
const confirmModalState = reactive({
  isOpen: false,
  title: '',
  description: '',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  color: 'primary' as 'primary' | 'error' | 'warning',
  onConfirm: async () => {},
  loading: false
})

const openConfirmModal = (options: {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  color?: 'primary' | 'error' | 'warning'
  onConfirm: () => Promise<void> | void
}) => {
  confirmModalState.title = options.title
  confirmModalState.description = options.description
  confirmModalState.confirmLabel = options.confirmLabel || 'Confirm'
  confirmModalState.cancelLabel = options.cancelLabel || 'Cancel'
  confirmModalState.color = options.color || 'primary'
  confirmModalState.onConfirm = async () => {
    confirmModalState.loading = true
    try {
      await options.onConfirm()
    } finally {
      confirmModalState.loading = false
      confirmModalState.isOpen = false
    }
  }
  confirmModalState.isOpen = true
}

// Shared Prompt Modal State
const promptModalState = reactive({
  isOpen: false,
  title: '',
  label: '',
  value: '',
  confirmLabel: 'OK',
  cancelLabel: 'Cancel',
  onConfirm: async (val: string) => {},
  loading: false
})

const openPromptModal = (options: {
  title: string
  label: string
  initialValue?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: (value: string) => Promise<void> | void
}) => {
  promptModalState.title = options.title
  promptModalState.label = options.label
  promptModalState.value = options.initialValue || ''
  promptModalState.confirmLabel = options.confirmLabel || 'OK'
  promptModalState.cancelLabel = options.cancelLabel || 'Cancel'
  promptModalState.onConfirm = async (val: string) => {
    promptModalState.loading = true
    try {
      await options.onConfirm(val)
    } finally {
      promptModalState.loading = false
      promptModalState.isOpen = false
    }
  }
  promptModalState.isOpen = true
}

// QR Code Feature
const showQRCodeModal = ref(false)
const appConfig = useRuntimeConfig()
const publicTournamentUrl = computed(() => {
  const host = import.meta.client ? window.location.host.replace(/^manage\./, '') : 'parascores.com'
  const protocol = import.meta.dev ? 'http' : 'https'
  const baseUrl = appConfig.public.siteUrl || `${protocol}://${host}`
  
  const urlId = tournament.value?.customName || tournamentId.value
  return `${baseUrl}/t/${urlId}`
})

const downloadQRCode = () => {
  if (!import.meta.client) return
  
  // Find the canvas element
  const canvas = document.querySelector('.qr-code-canvas canvas') as HTMLCanvasElement
  if (!canvas) {
    useToast().add({ title: 'Error generating QR code', color: 'error' })
    return
  }
  
  // Download as PNG
  const link = document.createElement('a')
  const fileName = tournament.value?.name?.replace(/\s+/g, '-').toLowerCase() || 'tournament'
  link.download = `${fileName}-qr-code.png`
  link.href = canvas.toDataURL('image/png')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const copyTournamentLink = async () => {
  if (!import.meta.client) return
  
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(publicTournamentUrl.value)
      useToast().add({ title: 'Link copied to clipboard', color: 'success' })
    } else {
      // Fallback for non-secure contexts (like local network testing)
      const textArea = document.createElement('textarea')
      textArea.value = publicTournamentUrl.value
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)
      
      if (successful) {
        useToast().add({ title: 'Link copied to clipboard', color: 'success' })
      } else {
        useToast().add({ title: 'Failed to copy link', color: 'error' })
      }
    }
  } catch (err) {
    const message = (err as any).data?.message || String(err)
    useToast().add({ title: 'Failed to copy link', description: message, color: 'error' })
  }
}

</script>

<template>
  <div class="max-w-5xl mx-auto">
    <!-- Back link -->
    <NuxtLink 
      to="/" 
      class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-6"
    >
      <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
      Back to Dashboard
    </NuxtLink>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
    </div>

    <!-- Error State -->
    <UAlert 
      v-else-if="error" 
      color="error" 
      variant="soft"
      icon="i-heroicons-exclamation-circle"
      title="Action Required"
      :description="error"
      class="mb-6 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-sm"
    >
      <template #description>
        <div class="flex items-center justify-between gap-3">
          <span class="flex-1">{{ error }}</span>
          <UButton 
            size="xs" 
            color="error" 
            variant="ghost" 
            icon="i-heroicons-x-mark" 
            class="rounded-full"
            @click="error = null" 
          />
        </div>
      </template>
    </UAlert>

    <!-- Tournament Content -->
    <template v-else-if="tournament">
      <!-- Banner -->
      <div 
        class="w-full h-48 rounded-xl overflow-hidden mb-6"
      >
        <img 
          :src="tournament.bannerUrl || PLACEHOLDER_BANNER" 
          :alt="tournament.name"
          class="w-full h-full object-cover opacity-70"
        />
      </div>

      <!-- Header -->
      <div class="flex flex-col items-center text-center mb-8 -mt-16 relative z-10">
        <!-- Logo -->
        <div 
          class="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-4 ring-4 ring-white dark:ring-black shadow-xl"
        >
          <img 
            :src="tournament.logoUrl || PLACEHOLDER_LOGO" 
            :alt="tournament.name"
            class="w-full h-full object-cover"
          />
        </div>

        <!-- Title & Meta -->
        <div class="mb-4">
          <div class="flex flex-col items-center justify-center mb-2">
            <div v-if="tournament.organization" class="flex items-center gap-1.5 mb-1.5">
              <img 
                v-if="tournament.organization.logoUrl" 
                :src="tournament.organization.logoUrl" 
                class="w-4 h-4 rounded-full object-cover" 
              />
              <span class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                {{ tournament.organization.name }}
              </span>
            </div>
            <div class="flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ tournament.name }}
              </h1>
              <div class="flex flex-wrap items-center justify-center gap-2 shrink-0">
                <UBadge v-if="tournamentStatus" :color="tournamentStatus.color" variant="subtle">
                  {{ tournamentStatus.label }}
                </UBadge>
                <span 
                  v-if="tournament.isPremium || isPro"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm"
                >
                  <UIcon name="i-heroicons-bolt-solid" class="w-3 h-3" />
                  Premium
                </span>
              </div>
            </div>
          </div>
          
          <div class="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500">
            <div class="flex items-center gap-1">
              <UIcon name="i-heroicons-calendar" class="w-4 h-4" />
              <span>{{ formatDate(tournament.start_date) }} - {{ formatDate(tournament.end_date) }}</span>
            </div>
            <div v-if="tournament.location" class="flex items-center gap-1">
              <UIcon name="i-heroicons-map-pin" class="w-4 h-4" />
              <span>{{ tournament.location }}</span>
            </div>
            <div class="flex items-center gap-1">
              <UIcon :name="visibilityLabels[tournament.visibility].icon" class="w-4 h-4" />
              <span>{{ visibilityLabels[tournament.visibility].label }}</span>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2">
          <UButton 
            icon="i-heroicons-qr-code" 
            variant="outline" 
            color="neutral"
            @click="showQRCodeModal = true"
            label="QR Code"
          />
          <UButton 
            icon="i-heroicons-photo" 
            variant="outline" 
            color="neutral"
            :to="`/tournaments/${tournament.id}/graphics`"
            label="Graphics"
          />
          <UButton 
            icon="i-heroicons-code-bracket" 
            variant="outline" 
            color="neutral"
            :to="`/widgets?t=${tournament.customName || tournament.id}`"
            label="Widgets"
          />
        </div>
      </div>

      <!-- Premium Upgrade Banner -->
      <div
        v-if="showUpgradeBanner"
        class="mb-8 relative overflow-hidden rounded-2xl border border-amber-200/60 dark:border-amber-500/20 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-yellow-950/20 p-6 shadow-sm"
      >
        <!-- Decorative glow -->
        <div class="absolute -top-10 -right-10 w-40 h-40 bg-amber-400/10 dark:bg-amber-400/5 rounded-full blur-3xl" />
        <div class="absolute -bottom-8 -left-8 w-32 h-32 bg-orange-400/10 dark:bg-orange-400/5 rounded-full blur-2xl" />

        <div class="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div class="flex items-center gap-4 flex-1 min-w-0">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
              <UIcon name="i-heroicons-bolt-solid" class="w-6 h-6 text-white" />
            </div>
            <div class="min-w-0">
              <h3 class="text-sm font-bold text-gray-900 dark:text-white">
                Unlock Premium Features
              </h3>
              <p class="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">
                Get unlimited participants, custom branding, advanced stats, and more for this tournament.
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <UButton
              size="sm"
              variant="solid"
              class="font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm flex-1 sm:flex-none"
              icon="i-heroicons-bolt"
              :loading="upgradingFromBanner"
              @click="handleUpgradeTournament"
            >
              Upgrade (₦5,000)
            </UButton>
            <UButton
              size="sm"
              variant="ghost"
              color="neutral"
              class="font-bold flex-1 sm:flex-none"
              to="/billing"
            >
              View Plans
            </UButton>
          </div>
        </div>
      </div>
      
      <!-- QR Code Modal -->
      <UModal v-model:open="showQRCodeModal" :ui="{ content: 'sm:max-w-md' }">
        <template #content>
          <UCard class="ring-0 shadow-none" :ui="{ root: 'divide-y divide-gray-100 dark:divide-gray-800' }">
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                  Tournament QR Code
                </h3>
                <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" class="-my-1" @click="showQRCodeModal = false" />
              </div>
            </template>

            <div class="py-6 flex flex-col items-center">
              <p class="text-sm text-gray-500 mb-6 text-center px-4">
                Scan this code to visit the public tournament page. Export it for use on promotional flyers and banners.
              </p>
              
              <div class="bg-white p-4 rounded-xl shadow-lg border border-gray-100 mb-6 inline-flex justify-center items-center qr-code-canvas">
                <QrcodeVue 
                  :value="publicTournamentUrl" 
                  :size="200" 
                  level="H" 
                  render-as="canvas" 
                  :margin="2"
                  foreground="#000000"
                />
              </div>

              <div class="w-full max-w-[280px] space-y-4">
                <UButton 
                  block 
                  color="primary" 
                  icon="i-heroicons-arrow-down-tray" 
                  @click="downloadQRCode"
                >
                  Download PNG
                </UButton>
                
                <div class="relative w-full">
                  <div class="flex items-center w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <span class="text-xs text-gray-500 truncate flex-1 select-all mr-2">
                      {{ publicTournamentUrl }}
                    </span>
                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-heroicons-clipboard-document"
                      size="xs"
                      @click="copyTournamentLink"
                    />
                  </div>
                </div>
              </div>
            </div>
          </UCard>
        </template>
      </UModal>

      <!-- Advance Modal -->
      <UModal v-model:open="showAdvanceModal" :ui="{ content: 'sm:max-w-lg' }">
        <template #content>
          <UCard class="ring-0 shadow-none" :ui="{ root: 'divide-y divide-gray-100 dark:divide-gray-800' }">
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                  Advance to Knockout Stage
                </h3>
                <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" class="-my-1" @click="showAdvanceModal = false" />
              </div>
            </template>

            <div class="py-4 max-h-[calc(100dvh-250px)] overflow-y-auto px-1">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <!-- Auto Option -->
                <button 
                  type="button"
                  @click="manualSelection = false"
                  class="flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all group"
                  :class="!manualSelection ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/20 ring-1 ring-primary-500' : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'"
                >
                  <div class="w-10 h-10 rounded-full flex items-center justify-center mb-3 transition-colors" :class="!manualSelection ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 group-hover:text-gray-600'">
                    <UIcon name="i-heroicons-bolt" class="w-6 h-6" />
                  </div>
                  <p class="text-sm font-bold text-gray-900 dark:text-white mb-1">Quick Auto-Advance</p>
                  <p class="text-[10px] text-gray-500">Top teams from each group qualify automatically.</p>
                </button>

                <!-- Wizard Option -->
                <button 
                  type="button"
                  @click="handleStartManualWizard"
                  class="flex flex-col items-center justify-center p-4 rounded-xl border border-amber-200 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-center transition-all group"
                >
                  <div class="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center mb-3 shadow-lg shadow-amber-500/20">
                    <UIcon name="i-heroicons-sparkles" class="w-6 h-6" />
                  </div>
                  <p class="text-sm font-bold text-amber-900 dark:text-amber-100 mb-1">Custom Bracket Setup</p>
                  <p class="text-[10px] text-amber-700/70 dark:text-amber-400/70">Pick teams and place them manually in the bracket.</p>
                </button>
              </div>

              <div class="flex items-center gap-2 mb-4">
                <div class="h-px flex-1 bg-gray-100 dark:bg-gray-800"></div>
                <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Or Manual Selection</span>
                <div class="h-px flex-1 bg-gray-100 dark:bg-gray-800"></div>
              </div>

              <!-- Manual Toggle (Simpler version) -->
              <div v-if="!manualSelection" class="mb-4">
                 <UButton 
                    variant="ghost" 
                    color="neutral" 
                    icon="i-heroicons-cursor-arrow-rays" 
                    size="xs" 
                    label="Wait, I want to pick teams manually..." 
                    @click="manualSelection = true"
                    class="mx-auto flex"
                 />
              </div>

              <!-- Manual Selection: Team list grouped by standings -->
              <div v-if="manualSelection">
                <div class="space-y-4">
                  <div v-for="(groupStandings, groupName) in standingStore.getStandingsByGroup" :key="groupName">
                    <h4 v-if="groupName !== 'default'" class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
                      {{ groupName }}
                    </h4>
                    <div class="space-y-1">
                      <button
                        v-for="standing in groupStandings"
                        :key="standing.participant_id"
                        type="button"
                        class="w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left"
                        :class="selectedParticipantIds.includes(standing.participant_id)
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        "
                        @click="toggleParticipant(standing.participant_id)"
                      >
                        <!-- Checkbox indicator -->
                        <div 
                          class="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors"
                          :class="selectedParticipantIds.includes(standing.participant_id)
                            ? 'border-primary-500 bg-primary-500'
                            : 'border-gray-300 dark:border-gray-600'
                          "
                        >
                          <UIcon 
                            v-if="selectedParticipantIds.includes(standing.participant_id)" 
                            name="i-heroicons-check" 
                            class="w-3.5 h-3.5 text-white" 
                          />
                        </div>

                        <!-- Position -->
                        <span class="text-xs font-bold text-gray-400 w-5 text-center">{{ standing.position }}</span>

                        <!-- Team logo -->
                        <div class="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                          <img 
                            v-if="standing.participant?.logoUrl" 
                            :src="standing.participant.logoUrl" 
                            class="w-full h-full object-cover"
                          />
                          <span v-else class="text-[10px] font-medium text-gray-500">
                            {{ (standing.participant?.customName || 'T').charAt(0).toUpperCase() }}
                          </span>
                        </div>

                        <!-- Team name + stats -->
                        <div class="flex-1 min-w-0">
                          <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {{ standing.participant?.customName || 'Unknown' }}
                          </p>
                          <p class="text-xs text-gray-500">
                            {{ standing.points }} pts · {{ standing.played }}P · {{ standing.wins }}W {{ standing.draws }}D {{ standing.losses }}L
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Selection count (fixed below scroll area) -->
                <p class="text-xs text-gray-500 text-center pt-2 border-t border-gray-100 dark:border-gray-800">
                  {{ selectedParticipantIds.length }} team{{ selectedParticipantIds.length !== 1 ? 's' : '' }} selected
                </p>
              </div>

              <!-- Auto mode info -->
              <div v-else class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h4 class="font-medium text-sm mb-2">Qualification Rules:</h4>
                <ul class="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>Top 2 teams from each group qualify automatically</li>
                  <li>Knockout bracket will be seeded based on group positions</li>
                </ul>
              </div>
            </div>

            <template #footer>
              <div class="flex items-center justify-end gap-3">
                <UButton color="neutral" variant="ghost" label="Cancel" @click="showAdvanceModal = false" />
                <UButton 
                  color="primary" 
                  :label="manualSelection ? `Advance ${selectedParticipantIds.length} Teams` : 'Confirm & Generate Bracket'"
                  :loading="advancing"
                  :disabled="manualSelection && selectedParticipantIds.length < 2"
                  @click="handleAdvanceKnockout"
                />
              </div>
            </template>
          </UCard>
        </template>
      </UModal>

      <!-- Add Venue Modal -->
      <UModal v-model:open="showAddVenueModal" :ui="{ content: 'sm:max-w-md' }">
        <template #content>
          <UCard class="ring-0 shadow-none">
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                  Add Venue
                </h3>
                <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" class="-my-1" @click="showAddVenueModal = false" />
              </div>
            </template>

            <form @submit.prevent="handleAddVenue" class="space-y-4 py-2">
              <UAlert
                v-if="addVenueError"
                color="error"
                variant="subtle"
                icon="i-heroicons-exclamation-triangle"
                :title="addVenueError"
                class="mb-2"
              />

              <UFormField label="Venue Name" required>
                <UInput 
                  v-model="newVenueName" 
                  placeholder="e.g. National Stadium, Pitch 1" 
                  autofocus
                  @keyup.enter="handleAddVenue"
                />
              </UFormField>

              <div class="flex items-center justify-end gap-3 pt-2">
                <UButton color="neutral" variant="ghost" label="Cancel" @click="showAddVenueModal = false" />
                <UButton 
                  color="primary" 
                  label="Add Venue" 
                  :loading="addingVenue"
                  :disabled="!newVenueName.trim()"
                  type="submit"
                />
              </div>
            </form>
          </UCard>
        </template>
      </UModal>

      <!-- Invite Link Modal -->
      <UModal v-model:open="showInviteModal" :ui="{ content: 'sm:max-w-md' }">
        <template #content>
          <UCard class="ring-0 shadow-none">
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                  Invite Link
                </h3>
                <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" class="-my-1" @click="showInviteModal = false" />
              </div>
            </template>

            <div class="py-2">
              <!-- Loading -->
              <div v-if="inviteLoading" class="flex flex-col items-center py-8">
                <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400 mb-3" />
                <p class="text-sm text-gray-500">Generating invite link...</p>
              </div>

              <!-- Link Ready -->
              <div v-else-if="inviteLink" class="space-y-4">
                <p class="text-sm text-gray-500">
                  Share this link with players to invite them to join
                  <strong class="text-gray-900 dark:text-white">{{ inviteParticipant?.customName }}</strong>.
                </p>

                <div class="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <span class="text-xs text-gray-600 dark:text-gray-300 truncate flex-1 select-all font-mono">
                    {{ inviteLink }}
                  </span>
                  <UButton
                    color="primary"
                    variant="soft"
                    icon="i-heroicons-clipboard-document"
                    size="xs"
                    @click="copyInviteLink"
                  />
                </div>

                <UAlert
                  color="info"
                  variant="subtle"
                  icon="i-heroicons-information-circle"
                  title="Players will need to log in or create an account to join the team."
                />
              </div>
            </div>
          </UCard>
        </template>
      </UModal>

      <!-- Content Container -->
      <div class="max-w-4xl mx-auto w-full">
        <!-- Main Content -->
        <div class="w-full">
          <UTabs 
            v-model="activeTab"
            :items="tabItems" 
            class="w-full"
            :ui="{ 
              list: 'overflow-x-auto flex-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-1',
              trigger: 'shrink-0 min-w-max whitespace-nowrap'
            }"
          >
            <!-- Overview Tab -->
            <template #overview>
              <!-- Pending Requests Alert -->
              <UAlert 
                v-if="totalPendingRequests > 0"
                color="warning" 
                variant="subtle"
                icon="i-heroicons-exclamation-circle"
                class="mt-4 border border-warning-200 dark:border-warning-900/50"
                :title="`${totalPendingRequests} Pending Join Request${totalPendingRequests > 1 ? 's' : ''}`"
                description="Teams or players are waiting for your approval to join. Review them in the Participants tab."
              >
                <template #actions>
                  <UButton size="xs" color="warning" @click="activeTab = '1'">
                    Review Now
                  </UButton>
                </template>
              </UAlert>

              <UCard v-if="tournament.description" class="mt-4">
                <template #header>
                  <div class="flex items-center gap-2">
                    <UIcon name="i-heroicons-document-text" class="w-5 h-5 text-indigo-500" />
                    <span class="font-medium">About</span>
                  </div>
                </template>
                <p class="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                  {{ tournament.description }}
                </p>
              </UCard>
              <UCard v-else class="mt-4">
                <div class="text-center py-8 text-gray-500">
                  <UIcon name="i-heroicons-document-text" class="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p>No description available.</p>
                </div>
              </UCard>

              <!-- Details, Organizer, Sponsors & Socials Grid -->
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
                <!-- Tournament Details (Mobile/Main flow) -->
                <UCard class="lg:col-span-2 border border-gray-100 dark:border-gray-800 shadow-sm transition-all h-fit">
                  <template #header>
                    <div class="flex items-center gap-2">
                      <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-indigo-500" />
                      <span class="font-medium">Details</span>
                    </div>
                  </template>
                  
                  <div class="space-y-4">
                    <div class="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                      <span class="text-sm text-gray-500">Sport</span>
                      <span class="font-medium capitalize">{{ tournament.sport.toLowerCase() }}</span>
                    </div>
                    
                    <div class="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                      <span class="text-sm text-gray-500">Format</span>
                      <span class="font-medium">
                        {{ tournament.type === TournamentType.ROUND_ROBIN ? 'Round Robin' : 
                           tournament.type === TournamentType.KNOCKOUT ? 'Knockout' : 
                           tournament.type === TournamentType.GROUP ? 'Group Stage' :
                           'Hybrid (Groups + Knockout)' }}
                      </span>
                    </div>
                    
                    <div class="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                      <span class="text-sm text-gray-500">Participants</span>
                      <span class="font-medium capitalize">{{ tournament.participantType.toLowerCase() }}s</span>
                    </div>
                    
                    <div class="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                      <span class="text-sm text-gray-500">Max Size</span>
                      <span class="font-medium">{{ tournament.maxParticipants || 'Unlimited' }}</span>
                    </div>
                    
                    <div class="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                      <span class="text-sm text-gray-500">Timezone</span>
                      <span class="font-medium text-sm">{{ tournament.timezone || 'UTC' }}</span>
                    </div>
                    
                    <div class="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                      <span class="text-sm text-gray-500">Auto-approve</span>
                      <UBadge :color="tournament.autoApprove ? 'success' : 'neutral'" variant="subtle" size="sm">
                        {{ tournament.autoApprove ? 'Yes' : 'No' }}
                      </UBadge>
                    </div>
                  </div>
                </UCard>
                
                <div class="flex flex-col gap-6 lg:col-span-1">
                  <!-- Organization -->
                  <UCard v-if="tournament.organization" class="border border-gray-100 dark:border-gray-800 shadow-sm transition-all h-fit">
                    <template #header>
                      <div class="flex items-center gap-2">
                        <UIcon name="i-heroicons-building-office" class="w-5 h-5 text-indigo-500" />
                        <span class="font-medium">Organization</span>
                      </div>
                    </template>
                    
                    <div class="flex items-center gap-3">
                      <UAvatar 
                        v-if="tournament.organization.logoUrl" 
                        :src="tournament.organization.logoUrl" 
                        size="md"
                      />
                      <UAvatar 
                        v-else 
                        :text="tournament.organization.name?.charAt(0).toUpperCase()" 
                        size="md"
                        class="bg-indigo-500 text-white"
                      />
                      <div>
                        <p class="font-medium text-gray-900 dark:text-white">{{ tournament.organization.name }}</p>
                        <p v-if="tournament.organization.phone" class="text-sm text-gray-500">{{ tournament.organization.phone }}</p>
                        <UBadge v-if="tournament.organization.isVerified" color="info" variant="subtle" size="xs" class="mt-1">
                          Verified
                        </UBadge>
                      </div>
                    </div>
                  </UCard>

                  <!-- Sponsors -->
                  <UCard class="border border-gray-100 dark:border-gray-800 shadow-sm transition-all h-fit">
                    <template #header>
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                          <UIcon name="i-heroicons-building-storefront" class="w-5 h-5 text-indigo-500" />
                          <span class="font-medium">Sponsors</span>
                          <UBadge v-if="sponsors.length" size="sm" variant="subtle">
                            {{ sponsors.length }}
                          </UBadge>
                        </div>
                        <div class="flex items-center gap-1">
                          <UButton 
                            size="xs" 
                            variant="ghost" 
                            :color="manageModes.sponsors ? 'primary' : 'neutral'"
                            :icon="manageModes.sponsors ? 'i-heroicons-check' : 'i-heroicons-pencil-square'" 
                            @click="manageModes.sponsors = !manageModes.sponsors" 
                            :label="manageModes.sponsors ? 'Done' : 'Manage'"
                          />
                          <UButton size="xs" variant="ghost" icon="i-heroicons-plus" @click="openAddSponsorModal" />
                        </div>
                      </div>
                    </template>
                    
                    <!-- Loading -->
                    <div v-if="sponsorsLoading && !sponsors.length" class="py-8 text-center text-gray-400">
                      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 mx-auto mb-2 animate-spin" />
                      <p>Loading sponsors...</p>
                    </div>
                    
                    <!-- Empty State -->
                    <div v-else-if="!sponsors.length" class="text-center py-4 text-gray-400 text-sm">
                      <p>No sponsors yet</p>
                      <UButton size="xs" variant="link" @click="openAddSponsorModal">Add one</UButton>
                    </div>
                    
                    <!-- Sponsor List -->
                    <div v-else class="flex flex-col gap-2">
                      <div 
                        v-for="sponsor in sponsors" 
                        :key="sponsor.id"
                        class="group relative"
                      >
                        <div class="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all w-full">
                          <div class="h-8 max-w-20 flex flex-col justify-center shrink-0">
                            <img 
                              v-if="sponsor.logoUrl" 
                              :src="sponsor.logoUrl" 
                              :alt="sponsor.name"
                              class="max-h-full max-w-full object-contain"
                            />
                            <UIcon v-else name="i-heroicons-building-office-2" class="w-5 h-5 text-gray-400" />
                          </div>
                          <div class="flex flex-col overflow-hidden min-w-0 flex-1">
                            <span class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ sponsor.name }}</span>
                            <a 
                              v-if="sponsor.websiteUrl" 
                              :href="sponsor.websiteUrl"
                              target="_blank"
                              rel="noopener noreferrer"
                              class="text-xs text-indigo-500 hover:text-indigo-600 truncate"
                            >
                              {{ sponsor.websiteUrl.replace(/^https?:\/\//, '') }}
                            </a>
                          </div>
                        </div>
                        <template v-if="manageModes.sponsors">
                          <button
                            class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs shadow-lg transition-all z-10 hover:bg-red-600 hover:scale-110 active:scale-95"
                            @click="handleRemoveSponsor(sponsor.id)"
                            title="Remove"
                          >×</button>
                          <button
                            class="absolute -top-1.5 right-4 w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-lg transition-all z-10 hover:bg-indigo-600 hover:scale-110 active:scale-95"
                            @click="openEditSponsorModal(sponsor)"
                            title="Edit"
                          >
                            <UIcon name="i-heroicons-pencil" class="w-3 h-3" />
                          </button>
                        </template>
                      </div>
                    </div>
                  </UCard>

                  <!-- Venues -->
                  <UCard class="border border-gray-100 dark:border-gray-800 shadow-sm transition-all h-fit">
                    <template #header>
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                          <UIcon name="i-heroicons-map-pin" class="w-5 h-5 text-indigo-500" />
                          <span class="font-medium">Venues</span>
                          <UBadge v-if="venues.length" size="sm" variant="subtle">
                            {{ venues.length }}
                          </UBadge>
                        </div>
                        <div class="flex items-center gap-1">
                          <UButton 
                            size="xs" 
                            variant="ghost" 
                            :color="manageModes.venues ? 'primary' : 'neutral'"
                            :icon="manageModes.venues ? 'i-heroicons-check' : 'i-heroicons-pencil-square'" 
                            @click="manageModes.venues = !manageModes.venues" 
                            :label="manageModes.venues ? 'Done' : 'Manage'"
                          />
                          <UButton size="xs" variant="ghost" icon="i-heroicons-plus" @click="openAddVenueModal" />
                        </div>
                      </div>
                    </template>
                    
                    <div v-if="venues.length" class="flex flex-col gap-2">
                      <div 
                        v-for="venue in venues" 
                        :key="venue.id"
                        class="group relative"
                      >
                        <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all">
                          <UIcon name="i-heroicons-map-pin" class="w-4 h-4 text-gray-400" />
                          <span class="text-sm text-gray-700 dark:text-gray-300 truncate">{{ venue.name }}</span>
                        </div>
                        <button 
                          v-if="manageModes.venues"
                          class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs shadow-lg transition-all z-10 hover:bg-red-600 hover:scale-110 active:scale-95"
                          @click="handleRemoveVenue(venue.id, venue.name)"
                          title="Remove"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <div v-else class="text-center py-4 text-gray-400 text-sm">
                      <p>No venues added yet</p>
                      <UButton size="xs" variant="link" @click="openAddVenueModal">Add one</UButton>
                    </div>
                  </UCard>

                  <!-- Social Links -->
                  <UCard class="border border-gray-100 dark:border-gray-800 shadow-sm transition-all h-fit">
                    <template #header>
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                          <UIcon name="i-heroicons-share" class="w-5 h-5 text-indigo-500" />
                          <span class="font-medium">Social Links</span>
                        </div>
                        <div class="flex items-center gap-1">
                          <UButton 
                            size="xs" 
                            variant="ghost" 
                            :color="manageModes.socials ? 'primary' : 'neutral'"
                            :icon="manageModes.socials ? 'i-heroicons-check' : 'i-heroicons-pencil-square'" 
                            @click="manageModes.socials = !manageModes.socials" 
                            :label="manageModes.socials ? 'Done' : 'Manage' "
                          />
                          <UButton size="xs" variant="ghost" icon="i-heroicons-plus" @click="openAddSocialModal" />
                        </div>
                      </div>
                    </template>
                    
                    <div v-if="socials.length" class="flex flex-wrap gap-2">
                      <div 
                        v-for="social in socials" 
                        :key="social.id"
                        class="group relative"
                      >
                        <a 
                          :href="social.url"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all"
                          :title="social.handle || social.platform"
                        >
                          <SocialsTwitterIcon v-if="social.platform === 'twitter'" class="w-4 h-4" />
                          <SocialsInstagramIcon v-else-if="social.platform === 'instagram'" class="w-4 h-4" />
                          <SocialsWebIcon v-else-if="social.platform === 'website'" class="w-4 h-4" />
                          <UIcon v-else :name="getSocialIcon(social.platform)" class="w-4 h-4" :class="getSocialColor(social.platform)" />
                          <span class="text-sm text-gray-700 dark:text-gray-300 capitalize">{{ social.platform }}</span>
                        </a>
                        <button 
                          v-if="manageModes.socials"
                          class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs shadow-lg transition-all z-10 hover:bg-red-600 hover:scale-110 active:scale-95"
                          @click="handleRemoveSocial(social.id)"
                          title="Remove"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <div v-else class="text-center py-4 text-gray-400 text-sm">
                      <p>No social links yet</p>
                      <UButton size="xs" variant="link" @click="openAddSocialModal">Add one</UButton>
                    </div>
                  </UCard>
                </div>
              </div>
            </template>

            <!-- Participants Tab -->
            <template #participants>
              <UCard class="mt-4">
                <template #header>
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <UIcon name="i-heroicons-user-group" class="w-5 h-5 text-indigo-500" />
                      <span class="font-medium">Participants</span>
                      <UBadge v-if="participants.length" size="sm" variant="subtle">
                        {{ participants.length }}
                      </UBadge>
                    </div>
                    <div class="flex items-center gap-2">
                      <UButton 
                        size="xs" 
                        variant="ghost" 
                        color="success"
                        icon="i-heroicons-link" 
                        @click="showTournamentInviteModal = true"
                      >
                        Invite
                      </UButton>
                      <UDropdownMenu 
                        :items="[[
                          { label: 'Upload Excel', icon: 'i-heroicons-arrow-up-tray', onSelect: triggerTeamExcelUpload },
                          { label: 'Download Template', icon: 'i-heroicons-arrow-down-tray', onSelect: downloadTeamExcelTemplate }
                        ]]"
                        :content="{ align: 'end' }"
                      >
                        <UButton 
                          size="xs" 
                          variant="ghost" 
                          icon="i-heroicons-arrow-up-tray" 
                          :loading="uploadingTeamExcel"
                          title="Bulk Upload Options"
                        />
                      </UDropdownMenu>
                      <UButton size="xs" variant="ghost" icon="i-heroicons-plus" @click="openAddModal">
                        Add
                      </UButton>
                    </div>
                    <input 
                      type="file" 
                      ref="teamExcelFileInput" 
                      accept=".xlsx, .xls, .csv" 
                      class="hidden" 
                      @change="handleTeamExcelUpload" 
                    />
                  </div>
                </template>
                
                <!-- Loading -->
                <div v-if="participantsLoading && !participants.length" class="py-8 text-center text-gray-400">
                  <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 mx-auto mb-2 animate-spin" />
                  <p>Loading participants...</p>
                </div>
                
                <!-- Empty State -->
                <div v-else-if="!participants.length" class="py-8 text-center text-gray-400">
                  <UIcon name="i-heroicons-user-group" class="w-12 h-12 mx-auto mb-2" />
                  <p>No participants yet</p>
                  <p class="text-sm">Add teams or individuals to get started</p>
                  <UButton 
                    size="sm" 
                    variant="outline" 
                    icon="i-heroicons-plus" 
                    class="mt-4"
                    @click="openAddModal"
                  >
                    Add Participant
                  </UButton>
                </div>
                
                <!-- Participant List -->
                <div v-else class="divide-y divide-gray-100 dark:divide-gray-800">
                  <div 
                    v-for="participant in participants" 
                    :key="participant.id"
                    class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div class="flex items-center gap-3 min-w-0 flex-1">
                      <div class="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                        <img 
                          v-if="participant.logoUrl" 
                          :src="participant.logoUrl" 
                          :alt="participant.customName || 'Participant'"
                          class="w-full h-full object-cover"
                        />
                        <span v-else class="text-sm font-medium text-gray-600 dark:text-gray-300">
                          {{ participant.seed || '-' }}
                        </span>
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2 mb-0.5">
                          <p class="font-medium text-gray-900 dark:text-white truncate">
                            {{ participant.customName || 'Unnamed' }}
                          </p>
                          <span 
                            v-if="participant.seed" 
                            class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 shrink-0"
                            title="Seed Ranking"
                          >
                            #{{ participant.seed }}
                          </span>
                        </div>
                        <p class="text-xs text-gray-500 truncate">
                          Added {{ new Date(participant.created_at).toLocaleDateString() }}
                        </p>
                      </div>
                    </div>
                    
                    <div class="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <UChip
                        v-if="tournament?.participantType === ParticipantType.TEAM"
                        :show="!!(participant.players?.filter(p => p.status === 'PENDING').length || 0)"
                        :text="participant.players?.filter(p => p.status === 'PENDING').length"
                        size="xl"
                        color="error"
                        inset
                      >
                        <UButton 
                          size="xs" 
                          :color="participant.players?.some(p => p.status === 'PENDING') ? 'error' : 'neutral'" 
                          :variant="participant.players?.some(p => p.status === 'PENDING') ? 'soft' : 'ghost'" 
                          icon="i-heroicons-users"
                          :label="participant.players?.length ? String(participant.players.length) : undefined"
                          @click="openManagePlayers(participant)"
                          title="Manage Players"
                        />
                      </UChip>
                      <UDropdownMenu 
                        :items="[[
                          { label: 'Edit', icon: 'i-heroicons-pencil-square', onSelect: () => openEditParticipantModal(participant) },
                          ...(tournament?.participantType === ParticipantType.TEAM ? [
                            { label: 'Invite Players', icon: 'i-heroicons-user-plus', onSelect: () => generateInviteLink(participant) },
                            { label: 'Link Profile Code', icon: 'i-heroicons-key', onSelect: () => handleGenerateLinkCode(participant.id), disabled: !!participant.team_id },
                            ...(participant.team_id ? [{ label: 'Unlink Profile', icon: 'i-heroicons-link-slash', onSelect: () => handleUnlinkProfile(participant), class: 'text-amber-500' }] : [])
                          ] : []),
                          { label: 'Delete', icon: 'i-heroicons-trash', onSelect: () => removeParticipant(participant), class: 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' }
                        ]]"
                        :content="{ align: 'end' }"
                      >
                        <UButton 
                          color="neutral" 
                          variant="ghost" 
                          icon="i-heroicons-ellipsis-vertical"
                          :loading="loading"
                          class="opacity-70 flex-shrink-0"
                        />
                      </UDropdownMenu>
                      <div class="flex items-center gap-1" v-if="participant.status === ParticipantStatus.PENDING">
                        <UButton 
                          size="xs" 
                          color="success" 
                          variant="soft" 
                          icon="i-heroicons-check"
                          :loading="participantStore.loading"
                          @click="updateParticipantStatus(participant.id, ParticipantStatus.CONFIRMED)"
                          title="Approve"
                        />
                        <UButton 
                          size="xs" 
                          color="error" 
                          variant="soft" 
                          icon="i-heroicons-x-mark"
                          :loading="participantStore.loading"
                          @click="updateParticipantStatus(participant.id, ParticipantStatus.DECLINED)"
                          title="Reject"
                        />
                      </div>
                      <UBadge v-else :color="statusColors[participant.status]" variant="subtle" size="sm">
                        {{ participant.status }}
                      </UBadge>
                    </div>
                  </div>
                </div>
              </UCard>
            </template>

            <!-- Groups Tab -->
            <template #groups>
              <div class="mt-4 space-y-6">
                <!-- Group Creation & Stats -->
                <div class="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <UIcon name="i-heroicons-rectangle-group" class="w-6 h-6" />
                    </div>
                    <div>
                      <h3 class="font-semibold text-gray-900 dark:text-white">Tournament Groups</h3>
                      <p class="text-xs text-gray-500">{{ groupStore.groups.length }} Groups · {{ participants.length }} Participants</p>
                    </div>
                  </div>
                  
                  <div class="flex w-full md:w-auto gap-2">
                    <UInput 
                      v-model="newGroupName" 
                      placeholder="New group name..." 
                      class="flex-1 md:w-48"
                      @keyup.enter="handleAddGroup"
                    />
                    <UButton 
                      color="primary" 
                      icon="i-heroicons-plus" 
                      label="Add Group" 
                      :loading="addingGroup"
                      :disabled="!newGroupName.trim()"
                      @click="handleAddGroup" 
                    />
                  </div>
                </div>

                <!-- Unassigned Participants Pool -->
                <UCard 
                  v-if="unassignedParticipants.length > 0"
                  class="border-dashed border-2 transition-all duration-200"
                  :class="[
                    dropTargetGroupId === 'unassigned' 
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 ring-2 ring-indigo-500/20' 
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20'
                  ]"
                  @dragover="handleDragOver($event, 'unassigned')"
                  @dragleave="handleDragLeave"
                  @drop="handleDrop(null)"
                >
                  <template #header>
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <UIcon name="i-heroicons-user-plus" class="w-4 h-4 text-amber-500" />
                        <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Unassigned Participants ({{ unassignedParticipants.length }})
                        </span>
                      </div>
                    </div>
                  </template>
                  
                  <div class="flex flex-wrap gap-2">
                    <div 
                      v-for="participant in unassignedParticipants" 
                      :key="participant.id"
                      draggable="true"
                      @dragstart="handleDragStart(participant.id)"
                      class="flex items-center gap-2 bg-white dark:bg-gray-800 pl-2 pr-1 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-sm shadow-sm transition-all hover:border-indigo-300 dark:hover:border-indigo-600 cursor-grab active:cursor-grabbing hover:shadow-md"
                    >
                      <UAvatar 
                        :src="participant.logoUrl || undefined" 
                        :alt="participant.customName || '?'" 
                        size="xs"
                        class="bg-gray-100 dark:bg-gray-700"
                      />
                      <span class="max-w-[120px] truncate font-medium text-gray-700 dark:text-gray-200">{{ participant.customName || 'Unnamed' }}</span>
                      
                      <UDropdownMenu
                        :items="[groupStore.groups.map(g => ({ label: g.name, icon: 'i-heroicons-arrow-right', onSelect: () => handleAssignToGroup(participant.id, g.id) }))]"
                        :content="{ align: 'end' }"
                      >
                        <UButton 
                          size="xs" 
                          variant="ghost" 
                          color="neutral" 
                          icon="i-heroicons-chevron-right" 
                          class="ml-1"
                        />
                      </UDropdownMenu>
                    </div>
                  </div>
                </UCard>

                <!-- Groups Grid -->
                <div v-if="groupStore.groups.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div 
                    v-for="group in groupStore.groups" 
                    :key="group.id"
                    class="group flex flex-col"
                  >
                    <div class="bg-white dark:bg-[#0a0a0a] rounded-xl border border-gray-200 dark:border-white/[0.08] shadow-sm overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow">
                      <!-- Group Header -->
                      <div class="p-4 border-b border-gray-200 dark:border-white/[0.08] flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.02]">
                        <div class="flex items-center gap-2 min-w-0">
                          <div class="w-2 h-2 rounded-full bg-indigo-500"></div>
                          <h4 class="font-bold text-gray-900 dark:text-white truncate">{{ group.name }}</h4>
                          <span class="text-xs text-gray-400 font-normal">({{ getGroupParticipants(group.id).length }})</span>
                        </div>
                        
                        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <UButton 
                            size="xs" 
                            variant="ghost" 
                            color="neutral" 
                            icon="i-heroicons-pencil" 
                            @click="handleRenameGroup(group)"
                          />
                          <UButton 
                            size="xs" 
                            variant="ghost" 
                            color="error" 
                            icon="i-heroicons-trash" 
                            @click="handleDeleteGroup(group.id)"
                          />
                        </div>
                      </div>

                      <!-- Group Content (Teams) -->
                      <div 
                        class="p-3 flex-1 space-y-2 min-h-[100px] max-h-[300px] overflow-y-auto transition-all duration-200"
                        :class="[dropTargetGroupId === group.id ? 'bg-indigo-50/50 dark:bg-indigo-950/20 ring-2 ring-inset ring-indigo-500/50' : '']"
                        @dragover="handleDragOver($event, group.id)"
                        @dragleave="handleDragLeave"
                        @drop="handleDrop(group.id)"
                      >
                        <div 
                          v-for="participant in getGroupParticipants(group.id)" 
                          :key="participant.id"
                          draggable="true"
                          @dragstart="handleDragStart(participant.id)"
                          class="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.08] text-sm hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-all cursor-grab active:cursor-grabbing hover:shadow-sm"
                        >
                          <div class="flex items-center gap-2 min-w-0">
                            <UAvatar 
                              :src="participant.logoUrl || undefined" 
                              :alt="participant.customName || '?'" 
                              size="xs"
                              class="bg-gray-100 dark:bg-gray-700 shrink-0"
                            />
                            <span class="truncate font-medium text-gray-700 dark:text-gray-200">
                              {{ participant.customName || 'Unnamed' }}
                            </span>
                          </div>
                          <UButton 
                            size="xs" 
                            variant="ghost" 
                            color="error" 
                            icon="i-heroicons-x-mark" 
                            @click="handleAssignToGroup(participant.id, null)" 
                          />
                        </div>

                        <div 
                          v-if="getGroupParticipants(group.id).length === 0"
                          class="flex flex-col items-center justify-center py-8 text-center text-gray-400"
                        >
                          <UIcon name="i-heroicons-user-group" class="w-8 h-8 mb-2 opacity-20" />
                          <p class="text-xs">No teams assigned yet</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Empty State Groups -->
                <div v-else class="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                  <div class="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                    <UIcon name="i-heroicons-rectangle-group" class="w-10 h-10 text-gray-300 dark:text-gray-600" />
                  </div>
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">No groups created</h3>
                  <p class="text-gray-500 max-w-xs mx-auto mt-1 mb-6">Create groups manually to organize your tournament participants.</p>
                  <div class="max-w-xs mx-auto flex gap-2">
                    <UInput v-model="newGroupName" placeholder="e.g. Group A" class="flex-1" />
                    <UButton color="primary" label="Create Group" @click="handleAddGroup" />
                  </div>
                </div>
              </div>
            </template>

            <!-- Standings Tab -->
             <template #standings>
              <UCard v-if="showStandings" :loading="standingsLoading" class="mt-4">
                <template #header>
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <UIcon name="i-heroicons-chart-bar" class="w-5 h-5 text-indigo-500" />
                      <span class="font-medium">Standings</span>
                    </div>
                    <!-- Optional: Add manual recalculate button if needed -->
                  </div>
                </template>

                <!-- Group Stage (Multiple Tables) -->
                <div v-if="(tournament.type === TournamentType.GROUP || tournament.type === TournamentType.HYBRID || tournament.type === TournamentType.LEAGUE) && Object.keys(standingStore.getStandingsByGroup).length > 0" class="space-y-6">
                  <div v-for="(groupStandings, groupName) in standingStore.getStandingsByGroup" :key="groupName">
                    <h4 v-if="groupName !== 'default'" class="text-sm font-medium text-gray-500 mb-3 px-1">
                      {{ groupName }}
                    </h4>
                    <StandingTable :standings="groupStandings" :loading="standingsLoading" />
                  </div>
                </div>

                <!-- Single Table (League/Round Robin) -->
                <StandingTable 
                  v-else 
                  :standings="standings" 
                  :loading="standingsLoading" 
                />
              </UCard>
            </template>

            <!-- Fixtures Tab -->
            <template #fixtures>
              <UCard class="mt-4">
                <template #header>
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div class="flex items-center gap-2">
                      <UIcon name="i-heroicons-calendar-days" class="w-5 h-5 text-indigo-500" />
                      <span class="font-medium">Fixtures</span>
                      <UBadge v-if="fixtures.length" size="sm" variant="subtle">
                        {{ fixtures.length }}
                      </UBadge>
                    </div>
                    <div class="flex flex-wrap items-center gap-1">
                      <UButton
                        v-if="fixtures.length"
                        size="xs"
                        :variant="showTodayOnly ? 'solid' : 'ghost'"
                        :color="showTodayOnly ? 'primary' : 'neutral'"
                        icon="i-heroicons-calendar"
                        @click="showTodayOnly = !showTodayOnly"
                        label="Today"
                      />
                      <UButton 
                        size="xs" 
                        variant="ghost" 
                        icon="i-heroicons-plus"
                        @click="openAddFixtureModal()"
                        :disabled="participants.length < 2"
                        label="Add"
                      />
                      <UButton
                        v-if="tournament?.type === TournamentType.KNOCKOUT"
                        size="xs"
                        variant="ghost"
                        icon="i-heroicons-sparkles"
                        @click="showKnockoutWizard = true"
                        label="Setup Brackets"
                        class="text-amber-500 hover:text-amber-600 font-bold"
                        title="Setup brackets step-by-step"
                        :disabled="fixtures.length > 0"
                      />
                      <UButton 
                        size="xs" 
                        variant="ghost" 
                        icon="i-heroicons-sparkles"
                        :loading="generating"
                        :disabled="participants.length < 2 || fixtures.length > 0"
                        @click="openGenerateModal"
                        :label="(tournament?.type === TournamentType.LEAGUE || tournament?.type === TournamentType.GROUP || tournament?.type === TournamentType.HYBRID || tournament?.type === TournamentType.ROUND_ROBIN) ? 'Setup Stage' : 'Generate'"
                        class="text-amber-500 hover:text-amber-600 font-bold"
                      />
                      <UButton 
                        v-if="fixtures.length"
                        size="xs" 
                        variant="ghost" 
                        color="error"
                        icon="i-heroicons-trash"
                        @click="handleClearFixtures"
                        label="Clear All"
                      />
                      <UButton 
                        v-if="tournament?.type === TournamentType.HYBRID && fixtures.some(f => f.stage === 'KNOCKOUT')"
                        size="xs" 
                        variant="ghost" 
                        color="error"
                        icon="i-heroicons-trash"
                        @click="handleClearKnockoutFixtures"
                        label="Clear Brackets"
                        title="Clear only knockout fixtures"
                      />
                    </div>
                  </div>
                </template>
                
                <!-- Error -->
                <UAlert 
                  v-if="generateError" 
                  color="error" 
                  variant="subtle"
                  icon="i-heroicons-exclamation-triangle"
                  :title="generateError"
                  class="mb-4"
                  :close-button="{ icon: 'i-heroicons-x-mark', color: 'error', variant: 'link' }"
                  @close="generateError = null"
                />

                <!-- Fixtures Outdated Alert -->
                <UAlert
                  v-if="isFixturesOutdated"
                  color="warning"
                  variant="subtle"
                  icon="i-heroicons-exclamation-triangle"
                  title="Configuration Changed"
                  description="Changes were made to participants or groups. Your current fixtures may be outdated. Consider clearing and regenerating them."
                  class="mb-4"
                >
                  <template #actions>
                    <UButton size="xs" color="warning" variant="solid" @click="handleClearFixtures" label="Clear Fixtures" />
                    <UButton size="xs" color="primary" variant="solid" @click="openGenerateModal" label="Regenerate" />
                  </template>
                </UAlert>
                
                <!-- Loading -->
                <div v-if="fixturesLoading && !fixtures.length" class="py-8 text-center text-gray-400">
                  <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 mx-auto mb-2 animate-spin" />
                  <p>Loading fixtures...</p>
                </div>
                
                <!-- Empty State -->
                <div v-else-if="!fixtures.length && !participants.length" class="py-8 text-center text-gray-400">
                  <UIcon name="i-heroicons-calendar-days" class="w-12 h-12 mx-auto mb-2" />
                  <p>No fixtures scheduled</p>
                  <p class="text-sm mb-4">Generate fixtures automatically or add them manually</p>
                  <div v-if="participants.length >= 2" class="flex items-center justify-center gap-3">
                    <UButton 
                      size="sm" 
                      variant="outline" 
                      icon="i-heroicons-sparkles"
                      :loading="generating"
                      @click="openGenerateModal"
                    >
                      Generate Fixtures
                    </UButton>
                    <UButton 
                      size="sm" 
                      variant="outline" 
                      color="neutral"
                      icon="i-heroicons-plus"
                      @click="openAddFixtureModal()"
                    >
                      Add Manually
                    </UButton>
                  </div>
                  <p v-else class="text-xs text-gray-400 mt-2">
                    Need at least 2 participants
                  </p>
                </div>
                
                <!-- Today Empty State -->
                <div v-else-if="showTodayOnly && !hasTodayFixtures" class="py-8 text-center text-gray-400">
                  <UIcon name="i-heroicons-calendar" class="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No fixtures scheduled for today</p>
                  <UButton size="sm" variant="soft" color="primary" class="mt-4" @click="showTodayOnly = false">
                    View All Fixtures
                  </UButton>
                </div>
                
                <!-- Fixtures Display -->
                <template v-else>
                  <!-- Knockout Fixture List + Bracket for knockout tournaments -->
                  <template v-if="tournament?.type === TournamentType.KNOCKOUT">
                    <!-- Fixture list collapsible -->
                    <div class="mb-6">
                      <div class="flex items-center gap-2 mb-3 px-1">
                        <UIcon name="i-heroicons-list-bullet" class="w-4 h-4 text-gray-400" />
                        <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">Manage Fixtures</span>
                      </div>
                      <UAccordion
                        :items="knockoutAccordionItems"
                        class="w-full"
                        :ui="{
                          item: 'p-0 mb-3 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800 transition-colors rounded-lg overflow-hidden',
                          trigger: 'p-4 w-full flex items-center justify-between',
                          label: 'w-full flex-1 min-w-0'
                        }"
                        multiple
                        :default-open="true"
                      >
                        <template #default="{ item, open }">
                          <div class="flex items-center justify-between gap-4 w-full min-w-0 overflow-hidden">
                            <div class="flex flex-col items-start gap-0.5 min-w-0 flex-1 text-left">
                              <span class="font-medium text-gray-900 dark:text-white whitespace-normal break-words">{{ item.label }}</span>
                              <span v-if="item.stats" class="text-xs font-normal text-gray-500 dark:text-gray-400">
                                {{ item.stats }}
                              </span>
                            </div>
                            <UButton 
                              v-if="open"
                              size="xs" 
                              variant="ghost" 
                              color="primary" 
                              icon="i-heroicons-plus" 
                              class="shrink-0"
                              label="Add Fixture"
                              @click.stop="openAddFixtureModal(item.round, item.roundName)"
                            />
                          </div>
                        </template>
                        <template #content="{ item }">
                          <div class="space-y-1.5 px-2 pb-3 pt-1">
                            <FixtureRow
                              v-for="fixture in item.fixtures"
                              :key="fixture.id"
                              :fixture="fixture"
                              :updating-match="updatingMatch"
                              @start="startMatch"
                              @control="openMatchControl"
                              @delete="handleDeleteFixture"
                            />
                          </div>
                        </template>
                      </UAccordion>
                    </div>

                    <!-- Read-only bracket (below list) -->
                    <KnockoutBracket
                      v-if="!showTodayOnly"
                      :fixtures-by-round="fixturesByRound"
                      :rounds="rounds"
                      :get-round-display-name="fixtureStore.getRoundDisplayName"
                      :two-legs-knockout="tournament?.twoLegsKnockout"
                      :third-place-match="tournament?.thirdPlaceMatch"
                      :readonly="true"
                    />
                  </template>
                  
                  <!-- Hybrid: Group stage list + Knockout bracket -->
                  <template v-else-if="tournament?.type === TournamentType.HYBRID">
                    <!-- Group Stage Fixtures (accordion list) -->
                    <div class="space-y-6">
                      <UAccordion 
                        :items="groupStageAccordionItems" 
                        class="mb-4 w-full"
                        :ui="{ 
                          item: 'p-0 mb-4 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800 transition-colors rounded-lg overflow-hidden',
                          trigger: 'p-4 w-full flex items-center justify-between',
                          label: 'w-full flex-1 min-w-0'
                        }"
                        multiple
                        :default-open="true"
                      >
                        <template #default="{ item, open }">
                          <div class="flex items-center justify-between gap-4 w-full min-w-0 overflow-hidden">
                            <div class="flex flex-col items-start gap-0.5 min-w-0 flex-1 text-left">
                              <span class="font-medium text-gray-900 dark:text-white whitespace-normal break-words">{{ item.label }}</span>
                              <span v-if="item.stats" class="text-xs font-normal text-gray-500 dark:text-gray-400">
                                {{ item.stats }}
                              </span>
                            </div>
                            <UButton 
                              v-if="open"
                              size="xs" 
                              variant="ghost" 
                              color="primary" 
                              icon="i-heroicons-plus" 
                              class="shrink-0"
                              label="Add Fixture"
                              @click.stop="openAddFixtureModal(item.round, item.roundName)"
                            />
                          </div>
                        </template>
                        
                        <template #content="{ item }">
                          <div class="space-y-1.5 px-2 pb-3 pt-1">
                            <FixtureRow
                              v-for="fixture in item.fixtures"
                              :key="fixture.id"
                              :fixture="fixture"
                              :updating-match="updatingMatch"
                              @start="startMatch"
                              @control="openMatchControl"
                              @delete="handleDeleteFixture"
                            />
                          </div>
                        </template>
                      </UAccordion>
                    </div>

                    <!-- Advance to Knockout CTA -->
                    <div 
                      v-if="canAdvance" 
                      class="mt-4 flex items-center justify-between gap-4 p-4 rounded-lg border border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-950/20"
                    >
                      <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                          <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                          <p class="text-sm font-medium text-gray-900 dark:text-white">All group stage matches completed</p>
                          <p class="text-xs text-gray-500">Ready to generate the knockout bracket</p>
                        </div>
                      </div>
                      <UButton 
                        icon="i-heroicons-forward"
                        label="Advance Stage"
                        color="primary"
                        variant="solid"
                        @click="openAdvanceModal"
                      />
                    </div>

                    <!-- Knockout Stage (shown after advancement) -->
                    <div v-if="knockoutRounds.length > 0" class="mt-6 space-y-6">
                      <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <UIcon name="i-heroicons-trophy" class="w-4 h-4 text-amber-500" />
                        Knockout Stage
                      </h4>

                      <!-- Fixture list collapsible -->
                      <div>
                        <div class="flex items-center gap-2 mb-3 px-1">
                          <UIcon name="i-heroicons-list-bullet" class="w-4 h-4 text-gray-400" />
                          <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">Manage Fixtures</span>
                        </div>
                        <UAccordion
                          :items="hybridKnockoutAccordionItems"
                          class="w-full"
                          :ui="{
                            item: 'p-0 mb-3 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800 transition-colors rounded-lg overflow-hidden',
                            trigger: 'p-4 w-full flex items-center justify-between',
                            label: 'w-full flex-1 min-w-0'
                          }"
                          multiple
                          :default-open="true"
                        >
                          <template #default="{ item, open }">
                            <div class="flex items-center justify-between gap-4 w-full min-w-0 overflow-hidden">
                              <div class="flex flex-col items-start gap-0.5 min-w-0 flex-1 text-left">
                                <span class="font-medium text-gray-900 dark:text-white whitespace-normal break-words">{{ item.label }}</span>
                                <span v-if="item.stats" class="text-xs font-normal text-gray-500 dark:text-gray-400">
                                  {{ item.stats }}
                                </span>
                              </div>
                              <UButton 
                                v-if="open"
                                size="xs" 
                                variant="ghost" 
                                color="primary" 
                                icon="i-heroicons-plus" 
                                class="shrink-0"
                                label="Add Fixture"
                                @click.stop="openAddFixtureModal(item.round, item.roundName)"
                              />
                            </div>
                          </template>
                          <template #content="{ item }">
                            <div class="space-y-1.5 px-2 pb-3 pt-1">
                              <FixtureRow
                                v-for="fixture in item.fixtures"
                                :key="fixture.id"
                                :fixture="fixture"
                                :updating-match="updatingMatch"
                                @start="startMatch"
                                @control="openMatchControl"
                                @delete="handleDeleteFixture"
                              />
                            </div>
                          </template>
                        </UAccordion>
                      </div>

                      <!-- Read-only bracket -->
                      <KnockoutBracket
                        v-if="!showTodayOnly"
                        :fixtures-by-round="knockoutFixturesByRound"
                        :rounds="knockoutRounds"
                        :get-round-display-name="fixtureStore.getKnockoutRoundDisplayName"
                        :two-legs-knockout="tournament?.twoLegsKnockout"
                        :third-place-match="tournament?.thirdPlaceMatch"
                        :readonly="true"
                      />
                    </div>
                  </template>
                  
                  <!-- List view for other tournament types (League, Round Robin) -->
                  <div v-else class="space-y-6">
                    <UAccordion 
                      :items="accordionItems" 
                      class="mb-4 w-full"
                      :ui="{ 
                        item: 'p-0',
                        trigger: 'p-4'
                      }"
                      multiple
                      :default-open="true"
                    >
                      <template #default="{ item, open }">
                        <UButton 
                          :color="item.color" 
                          :variant="item.variant"
                          class="mb-2 w-full justify-between rounded group"
                        >
                          <div class="flex items-center gap-2 truncate">
                            <span class="font-medium text-gray-900 dark:text-white">{{ item.label }}</span>
                            <span v-if="item.stats" class="text-sm font-normal text-gray-500 dark:text-gray-400">
                              {{ item.stats }}
                            </span>
                          </div>

                          <div class="flex items-center gap-2">
                            <UButton 
                              v-if="open"
                              size="xs" 
                              variant="soft" 
                              color="primary" 
                              icon="i-heroicons-plus" 
                              class="shrink-0"
                              label="Add Fixture"
                              @click.stop="openAddFixtureModal(item.round, item.roundName)"
                            />
                            <UIcon 
                              name="i-heroicons-chevron-down" 
                              class="w-5 h-5 ms-auto transform transition-transform duration-200" 
                              :class="[open && '-rotate-180']" 
                            />
                          </div>
                        </UButton>
                      </template>
                      
                      <template #content="{ item }">
                        <div class="space-y-1.5 px-2 pb-3 pt-1">
                          <FixtureRow
                            v-for="fixture in item.fixtures"
                            :key="fixture.id"
                            :fixture="fixture"
                            :updating-match="updatingMatch"
                            @start="startMatch"
                            @control="openMatchControl"
                            @delete="handleDeleteFixture"
                          />
                        </div>
                      </template>
                    </UAccordion>
                  </div>
                </template>
              </UCard>
            </template>

            <!-- Stats Tab -->
             <template #stats>
              <div class="mt-4">
                <MarketingPlayerStatsLeaderboard :stats="playerStats" :loading="playerStatsLoading" />
              </div>
            </template>

            <!-- Settings Tab -->
            <template #settings>
              <div class="mt-4 space-y-8 w-full">
                <TournamentSettings :tournament="tournament" />
                
                <UCard class="border-indigo-200 dark:border-indigo-900/50" :ui="{ header: 'bg-indigo-50 dark:bg-indigo-900/20' }">
                  <template #header>
                    <div class="flex items-center gap-2">
                      <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 text-indigo-500" />
                      <span class="font-medium text-indigo-700 dark:text-indigo-400">Seasons</span>
                    </div>
                  </template>
                  <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h4 class="text-sm font-medium text-gray-900 dark:text-white">Start New Season</h4>
                      <p class="text-sm text-gray-500 mt-1">
                        Clone this tournament's settings into a new season. Active teams and fixtures will not be copied.
                      </p>
                    </div>
                    <UButton 
                      color="neutral" 
                      variant="soft" 
                      icon="i-heroicons-document-duplicate"
                      label="Start New Season" 
                      @click="showSeasonModal = true" 
                    />
                  </div>
                </UCard>
                
                <UCard class="border-amber-200 dark:border-amber-900/50" :ui="{ header: 'bg-amber-50 dark:bg-amber-900/20' }">
                  <template #header>
                    <div class="flex items-center gap-2">
                      <UIcon name="i-heroicons-arrows-right-left" class="w-5 h-5 text-amber-500" />
                      <span class="font-medium text-amber-700 dark:text-amber-400">Transfer Ownership</span>
                    </div>
                  </template>
                  <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h4 class="text-sm font-medium text-gray-900 dark:text-white">Transfer to another organization</h4>
                      <p class="text-sm text-gray-500 mt-1">
                        Move this tournament to another organization you are an admin of. You may lose access to it in this workspace.
                      </p>
                    </div>
                    <UButton 
                      color="neutral" 
                      variant="soft" 
                      icon="i-heroicons-arrows-right-left"
                      label="Transfer Ownership" 
                      @click="showTransferModal = true" 
                    />
                  </div>
                </UCard>
                
                <UCard class="border-red-200 dark:border-red-900/50" :ui="{ header: 'bg-red-50 dark:bg-red-900/20' }">
                  <template #header>
                    <div class="flex items-center gap-2">
                      <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-500" />
                      <span class="font-medium text-red-600 dark:text-red-400">Danger Zone</span>
                    </div>
                  </template>
                  <div class="flex items-center justify-between">
                    <div>
                      <h4 class="text-sm font-medium text-gray-900 dark:text-white">Delete this tournament</h4>
                      <p class="text-sm text-gray-500 mt-1">
                        Once you delete a tournament, there is no going back. Please be certain.
                      </p>
                    </div>
                    <UButton 
                      color="error" 
                      variant="soft" 
                      label="Delete Tournament" 
                      :loading="deletingTournament"
                      @click="handleDeleteTournament" 
                    />
                  </div>
                </UCard>
              </div>
            </template>
          </UTabs>
        </div>
        
        <KnockoutWizard
          v-if="tournament"
          v-model:open="showKnockoutWizard"
          :participants="participants"
          :tournament="tournament"
          @finish="fixtureStore.fetchFixtures(tournament.id)"
        />

        <GroupSetupWizard
          v-if="tournament"
          v-model:open="showGroupWizard"
          :participants="participants"
          :tournament="tournament"
          :groups="groupStore.groups"
          @finish="fixtureStore.fetchFixtures(tournament.id)"
        />
        <!-- Link Code Modal -->
    <UModal v-model:open="showLinkCodeModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-key" class="w-5 h-5 text-indigo-500" />
              <span class="font-semibold text-gray-900 dark:text-white">{{ linkCodeModalTitle }}</span>
            </div>
            <p class="text-sm text-gray-500 mt-2">
              {{ linkCodeModalDesc }}
            </p>
          </template>

          <div class="flex flex-col items-center justify-center py-8 bg-gray-50 dark:bg-gray-950/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
            <span class="text-4xl font-bold tracking-[0.2em] text-indigo-600 dark:text-indigo-400 font-mono">
              {{ currentLinkCode }}
            </span>
            <div class="mt-4 flex items-center gap-2 text-xs text-gray-500">
              <UIcon name="i-heroicons-clock" class="w-4 h-4" />
              <span>Expires on {{ new Date(currentLinkCodeExpiry!).toLocaleDateString() }}</span>
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-6">
            <UButton color="neutral" variant="ghost" @click="showLinkCodeModal = false">Close</UButton>
            <UButton 
              color="primary" 
              icon="i-heroicons-document-duplicate"
              @click="copyToClipboard(currentLinkCode!)"
            >
              Copy Code
            </UButton>
          </div>
        </UCard>
      </template>
    </UModal>
      </div>
    </template>

    <!-- Not Found -->
    <div v-else class="text-center py-20">
      <UIcon name="i-heroicons-magnifying-glass" class="w-12 h-12 mx-auto text-gray-400 mb-4" />
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">Tournament not found</h2>
      <p class="text-gray-500 mb-6">The tournament you're looking for doesn't exist or has been deleted.</p>
      <UButton to="/" variant="outline">Back to Dashboard</UButton>
    </div>

    <!-- Transfer Ownership Modal -->
    <UModal v-model:open="showTransferModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-arrows-right-left" class="w-5 h-5 text-amber-500" />
              <span class="font-semibold text-gray-900 dark:text-white">Transfer Tournament Ownership</span>
            </div>
            <p class="text-sm text-gray-500 mt-2">
              Select an organization to transfer this tournament to. Only organizations where you have Admin or Owner permissions are listed.
            </p>
          </template>

          <UForm 
            :state="{}" 
            @submit="handleTransferTournament"
            class="space-y-4"
          >
            <UFormField label="Target Organization" name="targetOrganizationId" required>
              <USelect
                v-model="targetOrganizationId"
                :items="availableOrganizationsForTransfer"
                placeholder="Select an organization"
                icon="i-heroicons-building-office"
              />
            </UFormField>

            <div class="flex justify-end gap-3 mt-6">
              <UButton color="neutral" variant="ghost" @click="showTransferModal = false">Cancel</UButton>
              <UButton type="submit" color="neutral" :loading="transferringTournament" :disabled="!targetOrganizationId">
                Transfer Ownership
              </UButton>
            </div>
          </UForm>
        </UCard>
      </template>
    </UModal>

      <TournamentInviteModal v-model="showTournamentInviteModal" :tournament-id="tournamentId" />
      
    <!-- Start Season Modal -->
    <UModal v-model:open="showSeasonModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-document-duplicate" class="w-5 h-5 text-indigo-500" />
              <span class="font-semibold">Start New Season</span>
            </div>
            <p class="text-sm text-gray-500 mt-2">
              This will create a new tournament copying the rules, format, logo, and settings of this tournament. Teams and fixtures will not be copied.
            </p>
          </template>

          <UForm 
            :schema="seasonSchema" 
            :state="seasonState" 
            @submit="handleStartSeason"
            class="space-y-4"
          >
            <UFormField label="Season Name" name="seasonName" required>
              <UInput 
                v-model="seasonState.seasonName" 
                placeholder="e.g. 2024/2025 or Season 3"
              />
            </UFormField>

            <UFormField label="Start Date" name="start_date" required>
              <UInput 
                type="datetime-local" 
                v-model="seasonState.start_date" 
              />
            </UFormField>

            <UFormField label="End Date" name="end_date" required>
              <UInput 
                type="datetime-local" 
                v-model="seasonState.end_date" 
              />
            </UFormField>

            <div class="flex justify-end gap-2 pt-4">
              <UButton 
                label="Cancel" 
                variant="ghost" 
                color="neutral"
                @click="showSeasonModal = false"
              />
              <UButton 
                type="submit"
                label="Create Season" 
                icon="i-heroicons-arrow-right"
                :loading="startingSeason"
              />
            </div>
          </UForm>
        </UCard>
      </template>
    </UModal>
  </div>

  <!-- Manage Players Modal -->
  <UModal v-model:open="showManagePlayersModal">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Manage Players - {{ selectedParticipant?.customName }}
            </h3>
            <div class="flex items-center gap-2">
              <UButton 
                icon="i-heroicons-x-mark" 
                variant="ghost" 
                color="neutral" 
                size="sm"
                @click="showManagePlayersModal = false"
              />
            </div>
          </div>
        </template>

        <div class="space-y-6 max-h-[70vh] overflow-y-auto px-1 py-1 pr-3">
          <!-- Excel Upload Instructions -->
          <UAlert
            icon="i-heroicons-information-circle"
            title="Bulk Upload Instructions"
            color="info"
            variant="soft"
          >
            <template #description>
              <div class="flex flex-col items-start gap-3 mt-1">
                <span class="text-sm">
                  Download our pre-formatted template or upload your own Excel/CSV file to add players in bulk. Only the 'Name' column is required; you can optionally include 'Number' and 'Position'.
                </span>
                <div class="flex flex-wrap items-center gap-3 w-full">
                  <UButton
                    color="info"
                    variant="solid"
                    size="sm"
                    icon="i-heroicons-arrow-down-tray"
                    label="Get Template"
                    @click="downloadExcelTemplate"
                  />
                  
                  <input 
                    ref="excelFileInput"
                    type="file" 
                    accept=".xlsx, .xls, .csv"
                    class="hidden"
                    @change="handleExcelUpload"
                  />
                  <UButton
                    variant="soft"
                    color="primary"
                    size="sm"
                    icon="i-heroicons-document-arrow-up"
                    :loading="uploadingExcel"
                    @click="triggerExcelUpload"
                    label="Upload Excel"
                  />
                </div>
              </div>
            </template>
          </UAlert>

          <!-- Player Invite Link -->
          <UAlert
            icon="i-heroicons-link"
            title="Invite Players"
            variant="soft"
            color="success"
          >
            <template #description>
              <div class="flex flex-col items-start gap-3 mt-1">
                <span class="text-sm">
                  Share a link with players to allow them to join this team directly.
                </span>
                <UButton
                  color="success"
                  variant="solid"
                  size="sm"
                  icon="i-heroicons-share"
                  label="Share Link"
                  @click="selectedParticipant && generateInviteLink(selectedParticipant)"
                />
              </div>
            </template>
          </UAlert>

          <!-- Add Player Form -->
          <form @submit.prevent="handleAddPlayer" class="flex items-end gap-3">
            <div class="flex-1">
              <UFormField label="Name" required>
                <UInput v-model="newPlayer.name" placeholder="Player Name" class="w-full" />
              </UFormField>
            </div>
             <div class="w-24">
              <UFormField label="Number">
                <UInput v-model.number="newPlayer.number" type="number" placeholder="#" />
              </UFormField>
            </div>
             <div class="w-32">
              <UFormField label="Position">
                <USelect v-model="newPlayer.position" :items="positions" class="w-full" />
              </UFormField>
            </div>
            <UButton 
              type="submit" 
              :icon="editingPlayerId ? 'i-heroicons-check' : 'i-heroicons-plus'"
              :color="editingPlayerId ? 'primary' : 'primary'"
              :disabled="!newPlayer.name"
              :loading="loading"
            />
            <UButton 
              v-if="editingPlayerId"
              type="button"
              icon="i-heroicons-x-mark"
              color="neutral"
              variant="soft"
              @click="cancelEditPlayer"
              title="Cancel Edit"
            />
          </form>

          <USeparator />

          <!-- Player List -->
          <div class="space-y-4">
            <!-- Pending Requests -->
            <div v-if="pendingPlayers.length > 0" class="space-y-3">
              <h4 class="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <UIcon name="i-heroicons-clock" class="w-4 h-4" />
                Pending Join Requests ({{ pendingPlayers.length }})
              </h4>
              <div class="space-y-2">
                <div 
                  v-for="player in pendingPlayers" 
                  :key="player.id"
                  class="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-lg"
                >
                  <div class="flex items-center gap-3">
                    <!-- Player Avatar Wrapper -->
                    <div class="relative w-8 h-8 flex-shrink-0">
                      <!-- Cropped Avatar Container -->
                      <div class="w-full h-full rounded-full overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                        <img v-if="player.avatarUrl" :src="player.avatarUrl" class="w-full h-full object-cover" />
                        <span v-else class="text-xs font-bold text-gray-400">
                          {{ player.name.charAt(0) }}
                        </span>
                      </div>
                      <!-- Small Shirt Number Overlay -->
                      <span v-if="player.number" class="absolute -bottom-0.5 -right-0.5 bg-amber-500 text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white dark:border-[#1a1a1a] shadow-sm">
                        {{ player.number }}
                      </span>
                    </div>
                    <div>
                      <p class="text-sm font-medium text-gray-900 dark:text-white">
                        {{ player.name }}
                      </p>
                      <p class="text-xs text-gray-500">
                        {{ player.position ? player.position.split('-')[0] : '' }} {{ player.number ? `• #${player.number}` : '' }}
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <UButton 
                      size="xs" 
                      color="success" 
                      variant="soft" 
                      icon="i-heroicons-check"
                      label="Approve"
                      @click="handleApprovePlayer(player.id)"
                    />
                    <UButton 
                      size="xs" 
                      color="error" 
                      variant="soft" 
                      icon="i-heroicons-x-mark"
                      label="Reject"
                      @click="handleRejectPlayer(player.id)"
                    />
                  </div>
                </div>
              </div>
              <USeparator />
            </div>

            <!-- Approved Players -->
            <div class="space-y-2">
              <h4 v-if="pendingPlayers.length > 0" class="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Active Players ({{ approvedPlayers.length }})
              </h4>
              <div v-if="!approvedPlayers.length && !pendingPlayers.length" class="text-center py-8 text-gray-400">
                <p>No players added yet</p>
              </div>
              <div v-else class="space-y-2 max-h-60 overflow-y-auto pr-1">
                <div 
                  v-for="player in approvedPlayers" 
                  :key="player.id"
                  class="group flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                >
                  <div class="flex items-center gap-3">
                    <!-- Player Avatar Wrapper -->
                    <div class="relative w-8 h-8 flex-shrink-0">
                      <!-- Cropped Avatar Container -->
                      <div class="w-full h-full rounded-full overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                        <img v-if="player.avatarUrl" :src="player.avatarUrl" class="w-full h-full object-cover" />
                        <span v-else class="text-xs font-bold text-gray-400">
                          {{ player.name.charAt(0) }}
                        </span>
                      </div>
                      <!-- Small Shirt Number Overlay -->
                      <span v-if="player.number" class="absolute -bottom-0.5 -right-0.5 bg-indigo-500 text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white dark:border-[#1a1a1a] shadow-sm">
                        {{ player.number }}
                      </span>
                    </div>
                    <div>
                      <p class="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                        {{ player.name }}
                        <UIcon v-if="player.userId" name="i-heroicons-link" class="w-3.5 h-3.5 text-indigo-500 shrink-0" title="Linked to user account" />
                      </p>
                      <p class="text-xs text-gray-500">
                        {{ player.position ? player.position.split('-')[0] : '' }}
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center">
                    <UDropdownMenu 
                      :items="[[
                        { label: 'Edit', icon: 'i-heroicons-pencil-square', onSelect: () => startEditPlayer(player) },
                        { label: 'Link Profile Code', icon: 'i-heroicons-key', onSelect: () => handleGeneratePlayerLinkCode(player.id), disabled: !!player.userId },
                        ...(player.userId ? [{ label: 'Unlink Profile', icon: 'i-heroicons-link-slash', onSelect: () => handleUnlinkPlayerProfile(player), class: 'text-amber-500' }] : []),
                        { label: 'Delete', icon: 'i-heroicons-trash', onSelect: () => handleDeletePlayer(player.id), class: 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' }
                      ]]"
                      :content="{ align: 'end' }"
                    >
                      <UButton 
                        color="neutral" 
                        variant="ghost" 
                        icon="i-heroicons-ellipsis-vertical"
                        :loading="deletingPlayerId === player.id"
                        class="opacity-70 flex-shrink-0"
                      />
                    </UDropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </template>
  </UModal>

  <!-- Add Participant Modal -->
  <UModal v-model:open="showAddModal">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Add Participant
            </h3>
            <UButton 
              icon="i-heroicons-x-mark" 
              variant="ghost" 
              color="neutral" 
              size="sm"
              @click="showAddModal = false"
            />
          </div>
        </template>

        <UAlert 
          v-if="addError" 
          color="error" 
          variant="subtle"
          icon="i-heroicons-exclamation-triangle"
          :title="addError"
          class="mb-4"
          :close-button="{ icon: 'i-heroicons-x-mark', color: 'error', variant: 'link' }"
          @close="addError = null"
        />

        <UForm 
          :schema="addParticipantSchema" 
          :state="addParticipantState" 
          @submit="handleAddParticipant"
          class="space-y-4"
        >
          <!-- Logo Upload -->
          <div class="flex items-center gap-4">
             <!-- Hidden file input -->
            <input 
              ref="logoFileInput"
              type="file" 
              accept="image/*"
              class="hidden"
              @change="handleLogoChange"
            />
            
            <button 
              type="button"
              class="relative w-16 h-16 rounded-full overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 group shrink-0"
              @click="triggerLogoInput"
            >
              <img 
                v-if="logoPreview" 
                :src="logoPreview" 
                alt="Logo preview"
                class="w-full h-full object-contain p-1"
              />
              <div 
                v-else
                class="w-full h-full flex flex-col items-center justify-center text-gray-400 group-hover:text-indigo-500 transition-colors"
              >
                <UIcon name="i-heroicons-camera" class="w-6 h-6" />
              </div>
            </button>
            
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                {{ tournament?.participantType === 'TEAM' ? 'Team Logo' : 'Photo' }}
              </p>
              <div class="flex items-center gap-2 mt-1">
                 <UButton
                  size="xs"
                  variant="ghost"
                  color="primary"
                  @click="triggerLogoInput"
                >
                  {{ logoPreview ? 'Change' : 'Upload' }}
                </UButton>
                <UButton
                  v-if="logoPreview"
                  size="xs"
                  variant="ghost"
                  color="error"
                  @click="removeLogo"
                >
                  Remove
                </UButton>
              </div>
            </div>
          </div>


          <UFormField 
            :label="tournament?.participantType === 'TEAM' ? 'Team Name' : 'Participant Name'" 
            name="customName" 
            required
          >
            <UInput 
              v-model="addParticipantState.customName" 
              :placeholder="tournament?.participantType === 'TEAM' ? 'e.g. Manchester United' : 'e.g. John Doe'"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Seed (Optional)" name="seed">
            <UInput 
              v-model.number="addParticipantState.seed" 
              type="number"
              placeholder="e.g. 1"
              :min="1"
              class="w-full"
            />
          </UFormField>

          <div class="flex justify-end gap-3 pt-4">
            <UButton 
              label="Cancel" 
              variant="ghost" 
              color="neutral"
              @click="showAddModal = false"
            />
            <UButton 
              type="submit"
              label="Add Participant" 
              icon="i-heroicons-plus"
              :loading="addingParticipant"
            />
          </div>
        </UForm>
      </UCard>
    </template>
  </UModal>

  <!-- Edit Participant Modal -->
  <UModal v-model:open="showEditModal">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Edit Participant
            </h3>
            <UButton 
              icon="i-heroicons-x-mark" 
              variant="ghost" 
              color="neutral" 
              size="sm"
              @click="showEditModal = false"
            />
          </div>
        </template>

        <UAlert 
          v-if="editParticipantError" 
          color="error" 
          variant="subtle"
          icon="i-heroicons-exclamation-triangle"
          :title="editParticipantError"
          class="mb-4"
          :close-button="{ icon: 'i-heroicons-x-mark', color: 'error', variant: 'link' }"
          @close="editParticipantError = null"
        />

        <UForm 
          :state="editParticipantState" 
          @submit="handleEditParticipant"
          class="space-y-4"
        >
          <!-- Logo Upload -->
          <div class="flex items-center gap-4">
            <input 
              ref="editLogoFileInput"
              type="file" 
              accept="image/*"
              class="hidden"
              @change="handleEditLogoChange"
            />
            
            <button 
              type="button"
              class="relative w-16 h-16 rounded-full overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 group shrink-0"
              @click="triggerEditLogoInput"
            >
              <img 
                v-if="editLogoPreview" 
                :src="editLogoPreview" 
                alt="Logo preview"
                class="w-full h-full object-contain p-1"
              />
              <div 
                v-else
                class="w-full h-full flex flex-col items-center justify-center text-gray-400 group-hover:text-indigo-500 transition-colors"
              >
                <UIcon name="i-heroicons-camera" class="w-6 h-6" />
              </div>
            </button>
            
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                {{ tournament?.participantType === 'TEAM' ? 'Team Logo' : 'Photo' }}
              </p>
              <div class="flex items-center gap-2 mt-1">
                 <UButton
                  size="xs"
                  variant="ghost"
                  color="primary"
                  @click="triggerEditLogoInput"
                >
                  {{ editLogoPreview ? 'Change' : 'Upload' }}
                </UButton>
                <UButton
                  v-if="editLogoPreview"
                  size="xs"
                  variant="ghost"
                  color="error"
                  @click="removeEditLogo"
                >
                  Remove
                </UButton>
              </div>
            </div>
          </div>


          <UFormField 
            :label="tournament?.participantType === 'TEAM' ? 'Team Name' : 'Participant Name'" 
            name="customName" 
            required
          >
            <UInput 
              v-model="editParticipantState.customName" 
              class="w-full"
            />
          </UFormField>

          <div class="flex justify-end gap-3 pt-4">
            <UButton 
              label="Cancel" 
              variant="ghost" 
              color="neutral"
              @click="showEditModal = false"
            />
            <UButton 
              type="submit"
              label="Save Changes" 
              icon="i-heroicons-check"
              :loading="editingParticipant"
              :disabled="!editParticipantState.customName"
            />
          </div>
        </UForm>
      </UCard>
    </template>
  </UModal>

  <!-- Generate Fixtures Modal -->
  <UModal v-model:open="showGenerateModal">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Generate Fixtures
            </h3>
            <UButton 
              icon="i-heroicons-x-mark" 
              variant="ghost" 
              color="neutral" 
              size="sm"
              @click="showGenerateModal = false"
            />
          </div>
        </template>

        <div class="space-y-4">
          <p class="text-gray-600 dark:text-gray-300">
            <span v-if="tournament?.type === 'GROUP' || tournament?.type === 'HYBRID'">
              Configure how the group stage should be generated. You can specify the number of groups or teams per group.
            </span>
            <span v-else>
              Configure how the {{ tournament?.type === 'ROUND_ROBIN' ? 'round robin' : 'fixtures' }} should be generated.
            </span>
          </p>

          <UAlert 
            v-if="generateError" 
            color="error" 
            variant="subtle"
            icon="i-heroicons-exclamation-triangle"
            :title="generateError"
            class="mb-4"
          />

          <!-- Use Existing Groups Option -->
          <div 
            v-if="(tournament?.type === 'GROUP' || tournament?.type === 'HYBRID') && groupStore.groups.length > 0" 
            class="flex items-center justify-between p-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30"
          >
            <div>
              <p class="font-medium text-indigo-900 dark:text-indigo-300">Use Existing Groups</p>
              <p class="text-sm text-indigo-700/70 dark:text-indigo-400/70">Re-use the {{ groupStore.groups.length }} groups you have already set up</p>
            </div>
            <USwitch v-model="generateConfig.useExistingGroups" />
          </div>

          <!-- Group Stage Config -->
          <div v-if="(tournament?.type === 'GROUP' || tournament?.type === 'HYBRID') && !generateConfig.useExistingGroups" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField label="Teams Per Group" name="teamsPerGroup">
              <UInput 
                v-model.number="generateConfig.teamsPerGroup" 
                type="number" 
                placeholder="e.g. 4"
                :min="2"
              />
            </UFormField>

            <UFormField label="Number of Groups" name="numberOfGroups">
              <UInput 
                v-model.number="generateConfig.numberOfGroups" 
                type="number" 
                placeholder="e.g. 4"
                :min="1"
              />
            </UFormField>
          </div>
          



          <div v-if="(tournament?.type === 'GROUP' || tournament?.type === 'HYBRID')" class="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg text-sm text-gray-500">
            <p v-if="generateConfig.useExistingGroups">
              The system will use your existing groups and team assignments.
            </p>
            <p v-else-if="generateConfig.teamsPerGroup && participants.length">
              With {{ participants.length }} participants and {{ generateConfig.teamsPerGroup }} teams per group, 
              you will have roughly {{ Math.ceil(participants.length / generateConfig.teamsPerGroup) }} groups.
            </p>
            <p v-else-if="generateConfig.numberOfGroups && participants.length">
              With {{ participants.length }} participants and {{ generateConfig.numberOfGroups }} groups, 
              you will have roughly {{ Math.ceil(participants.length / generateConfig.numberOfGroups) }} teams per group.
            </p>
            <p v-else>
              The system will automatically balance groups if no preference is set.
            </p>
          </div>

          <div class="flex justify-end gap-3 pt-4">
            <UButton 
              label="Cancel" 
              variant="ghost" 
              color="neutral"
              @click="showGenerateModal = false"
            />
            <UButton 
              label="Generate" 
              icon="i-heroicons-sparkles"
              :loading="generating"
              @click="handleGenerateFixtures"
            />
          </div>
        </div>
      </UCard>
    </template>
  </UModal>

  <!-- Add Fixture Modal -->
  <UModal v-model:open="showAddFixtureModal">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Add Fixture
            </h3>
            <UButton 
              icon="i-heroicons-x-mark" 
              variant="ghost" 
              color="neutral" 
              size="sm"
              @click="showAddFixtureModal = false"
            />
          </div>
        </template>

        <div class="space-y-4 max-h-[calc(100dvh-220px)] overflow-y-auto pr-1">
          <p class="text-sm text-gray-500">
            Manually create a fixture by selecting the home and away teams.
          </p>


          <!-- Group & Stage (for GROUP/HYBRID tournaments) -->
          <div 
            v-if="(tournament?.type === 'GROUP' || tournament?.type === 'HYBRID') && groupOptions.length" 
            class="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <UFormField label="Group" name="groupId">
              <USelectMenu
                v-model="addFixtureState.groupId"
                :items="groupOptions"
                value-key="value"
                placeholder="Select group (optional)"
              />
            </UFormField>

            <UFormField v-if="tournament?.type === TournamentType.HYBRID || tournament?.type === TournamentType.GROUP" label="Stage" name="stage">
              <USelectMenu
                v-model="addFixtureState.stage"
                :items="fixtureStageOptions"
                value-key="value"
                disabled
                placeholder="Select stage (optional)"
              />
            </UFormField>
          </div>

          <!-- Teams -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField label="Home Team" name="homeTeamId" required>
              <USelectMenu
                v-model="addFixtureState.homeTeamId"
                :items="homeParticipantOptions"
                value-key="value"
                placeholder="Select home team"
              />
            </UFormField>

            <UFormField label="Away Team" name="awayTeamId" required>
              <USelectMenu
                v-model="addFixtureState.awayTeamId"
                :items="awayParticipantOptions"
                value-key="value"
                placeholder="Select away team"
              />
            </UFormField>
          </div>

          <!-- Round & Round Name -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField label="Round Name" name="roundName">
              <USelectMenu
                v-model="addFixtureState.roundName"
                :items="roundNameOptions"
                value-key="value"
                placeholder="Select round"
              />
            </UFormField>

            <UFormField label="Round Number" name="round">
              <UInput 
                v-model.number="addFixtureState.round" 
                type="number" 
                :min="1"
                disabled
                placeholder="1"
              />
            </UFormField>
          </div>

          <!-- Start Time & Venue -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField label="Start Time" name="startTime">
              <UInput 
                v-model="addFixtureState.startTime" 
                type="datetime-local"
              />
            </UFormField>

            <UFormField label="Venue" name="venue">
              <USelectMenu
                v-model="addFixtureState.venue"
                :items="venueOptions"
                value-key="value"
                searchable
                creatable
                placeholder="Select or enter venue"
              />
            </UFormField>
          </div>

          <!-- Match Duration Slider -->
          <UFormField label="Match Duration" name="matchDuration">
            <div class="flex flex-col gap-1.5 w-full">
              <div class="flex justify-between items-center text-xs text-gray-500">
                <span>Configure total game time (minutes)</span>
                <span class="font-bold text-gray-900 dark:text-white">{{ addFixtureState.matchDuration }} mins</span>
              </div>
              <input 
                type="range" 
                v-model.number="addFixtureState.matchDuration" 
                min="10" 
                max="120" 
                step="5"
                class="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </UFormField>


          <!-- Add Another toggle -->
          <div class="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">Add Another</p>
              <p class="text-xs text-gray-500">Keep the modal open to add more fixtures</p>
            </div>
            <USwitch v-model="addFixtureKeepOpen" />
          </div>

          <div class="flex justify-end gap-3 pt-4">
            <UButton 
              label="Cancel" 
              variant="ghost" 
              color="neutral"
              @click="showAddFixtureModal = false"
            />
            <UButton 
              label="Add Fixture" 
              icon="i-heroicons-plus"
              :loading="addingFixture"
              @click="handleAddFixture"
            />
          </div>
        </div>
      </UCard>
    </template>
  </UModal>

  <!-- Match Control Component -->
  <MatchControl
    :fixture="selectedFixture"
    :tournament="tournament"
    v-model:open="showMatchControlModal"
    @fixture-updated="handleFixtureUpdated"
    @match-ended="handleMatchEnded"
  />


  <!-- Add Sponsor Modal -->
  <UModal v-model:open="showAddSponsorModal">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-building-storefront" class="w-5 h-5 text-indigo-500" />
            <span class="font-semibold">Add Sponsor</span>
          </div>
        </template>

        <UForm 
          :schema="addSponsorSchema" 
          :state="addSponsorState" 
          @submit="handleAddSponsor"
          class="space-y-4"
        >
          <UAlert 
            v-if="addSponsorError" 
            color="error" 
            variant="subtle"
            icon="i-heroicons-exclamation-triangle"
            :title="addSponsorError"
            class="mb-4"
          />

          <UFormField label="Name" name="name" required>
            <UInput
              v-model="addSponsorState.name"
              placeholder="Sponsor name"
              icon="i-heroicons-building-office"
            />
          </UFormField>

          <UFormField label="Description" name="description">
            <UTextarea
              v-model="addSponsorState.description"
              placeholder="e.g. Official kit sponsor"
              :rows="2"
              autoresize
            />
          </UFormField>

          <div class="space-y-2">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-200">Sponsor Logo</span>
            <div class="flex items-start gap-4">
              <input 
                ref="sponsorLogoFileInput"
                type="file" 
                accept="image/*"
                class="hidden"
                @change="handleSponsorLogoChange"
              />
              
              <button 
                type="button"
                class="relative h-20 min-w-20 max-w-40 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 group bg-gray-50 dark:bg-gray-800"
                @click="triggerSponsorLogoInput"
                :disabled="uploadingSponsorLogo"
              >
                <img 
                  v-if="sponsorLogoPreview || addSponsorState.logoUrl" 
                  :src="sponsorLogoPreview || addSponsorState.logoUrl || undefined" 
                  alt="Logo preview"
                  class="h-full w-auto object-contain mx-auto p-1"
                />
                <div 
                  v-else
                  class="w-full h-full flex flex-col items-center justify-center text-gray-400 group-hover:text-indigo-500 transition-colors px-2"
                >
                  <UIcon name="i-heroicons-photo" class="w-6 h-6" />
                  <span class="text-[10px] mt-1 font-medium whitespace-nowrap">Add Logo</span>
                </div>
                
                <div 
                  v-if="uploadingSponsorLogo"
                  class="absolute inset-0 bg-black/50 flex items-center justify-center"
                >
                  <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 text-white animate-spin" />
                </div>
              </button>
              
              <div class="flex-1 space-y-2">
                 <p class="text-xs text-gray-500 dark:text-gray-400">
                   Max 5MB.
                 </p>
                 <UButton
                   v-if="sponsorLogoPreview || addSponsorState.logoUrl"
                   size="xs"
                   variant="ghost"
                   color="error"
                   icon="i-heroicons-trash"
                   label="Remove"
                   :disabled="uploadingSponsorLogo"
                   @click="removeSponsorLogo"
                   class="px-0"
                 />
              </div>
            </div>
          </div>

          <UFormField label="Website URL" name="websiteUrl">
            <UInput 
              v-model="addSponsorState.websiteUrl" 
              placeholder="https://sponsor-website.com"
              icon="i-heroicons-globe-alt"
            />
          </UFormField>

          <div class="flex justify-end gap-2 pt-4">
            <UButton 
              label="Cancel" 
              variant="ghost" 
              color="neutral"
              @click="showAddSponsorModal = false"
            />
            <UButton 
              type="submit"
              label="Add Sponsor" 
              icon="i-heroicons-plus"
              :loading="addingSponsor"
            />
          </div>
        </UForm>
      </UCard>
    </template>
  </UModal>

  <!-- Edit Sponsor Modal -->
  <UModal v-model:open="showEditSponsorModal">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-building-storefront" class="w-5 h-5 text-indigo-500" />
            <span class="font-semibold">Edit Sponsor</span>
          </div>
        </template>

        <UForm
          :schema="addSponsorSchema"
          :state="editSponsorState"
          @submit="handleEditSponsor"
          class="space-y-4"
        >
          <UAlert
            v-if="editSponsorError"
            color="error"
            variant="subtle"
            icon="i-heroicons-exclamation-triangle"
            :title="editSponsorError"
            class="mb-4"
          />

          <UFormField label="Name" name="name" required>
            <UInput
              v-model="editSponsorState.name"
              placeholder="Sponsor name"
              icon="i-heroicons-building-office"
            />
          </UFormField>

          <UFormField label="Description" name="description">
            <UTextarea
              v-model="editSponsorState.description"
              placeholder="e.g. Official kit sponsor"
              :rows="2"
              autoresize
            />
          </UFormField>

          <div class="space-y-2">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-200">Sponsor Logo</span>
            <div class="flex items-start gap-4">
              <input
                ref="sponsorLogoFileInput"
                type="file"
                accept="image/*"
                class="hidden"
                @change="handleSponsorLogoChange"
              />
              <button
                type="button"
                class="relative h-20 min-w-20 max-w-40 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 group bg-gray-50 dark:bg-gray-800"
                @click="triggerSponsorLogoInput"
                :disabled="uploadingSponsorLogo"
              >
                <img
                  v-if="sponsorLogoPreview || editSponsorState.logoUrl"
                  :src="sponsorLogoPreview || editSponsorState.logoUrl || undefined"
                  alt="Logo preview"
                  class="h-full w-auto object-contain mx-auto p-1"
                />
                <div
                  v-else
                  class="w-full h-full flex flex-col items-center justify-center text-gray-400 group-hover:text-indigo-500 transition-colors px-2"
                >
                  <UIcon name="i-heroicons-photo" class="w-6 h-6" />
                  <span class="text-[10px] mt-1 font-medium whitespace-nowrap">Add Logo</span>
                </div>
                <div
                  v-if="uploadingSponsorLogo"
                  class="absolute inset-0 bg-black/50 flex items-center justify-center"
                >
                  <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 text-white animate-spin" />
                </div>
              </button>
              <div class="flex-1 space-y-2">
                <p class="text-xs text-gray-500 dark:text-gray-400">Max 5MB.</p>
                <UButton
                  v-if="sponsorLogoPreview || editSponsorState.logoUrl"
                  size="xs"
                  variant="ghost"
                  color="error"
                  icon="i-heroicons-trash"
                  label="Remove"
                  :disabled="uploadingSponsorLogo"
                  @click="removeSponsorLogo(); editSponsorState.logoUrl = ''"
                  class="px-0"
                />
              </div>
            </div>
          </div>

          <UFormField label="Website URL" name="websiteUrl">
            <UInput
              v-model="editSponsorState.websiteUrl"
              placeholder="https://sponsor-website.com"
              icon="i-heroicons-globe-alt"
            />
          </UFormField>

          <div class="flex justify-end gap-2 pt-4">
            <UButton
              label="Cancel"
              variant="ghost"
              color="neutral"
              @click="showEditSponsorModal = false"
            />
            <UButton
              type="submit"
              label="Save Changes"
              icon="i-heroicons-check"
              :loading="editingSponsor"
            />
          </div>
        </UForm>
      </UCard>
    </template>
  </UModal>

  <!-- Add Social Modal -->
  <UModal v-model:open="showAddSocialModal">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-share" class="w-5 h-5 text-indigo-500" />
            <span class="font-semibold">Add Social Link</span>
          </div>
        </template>

        <UForm 
          :schema="addSocialSchema" 
          :state="addSocialState" 
          @submit="handleAddSocial"
          class="space-y-4"
        >
          <UAlert 
            v-if="addSocialError" 
            color="error" 
            variant="subtle"
            icon="i-heroicons-exclamation-triangle"
            :title="addSocialError"
            class="mb-4"
          />

          <UFormField label="Platform" name="platform" required>
            <USelectMenu 
              v-model="addSocialState.platform" 
              :items="platformOptions"
              value-key="value"
              placeholder="Select platform..."
            >
              <template #item="{ item }">
                <div class="flex items-center gap-2">
                  <UIcon :name="item.icon" class="w-4 h-4" :class="item.color" />
                  <span>{{ item.label }}</span>
                </div>
              </template>
            </USelectMenu>
          </UFormField>

          <UFormField label="URL" name="url" required>
            <UInput 
              v-model="addSocialState.url" 
              placeholder="https://twitter.com/tournamentname"
              icon="i-heroicons-link"
            />
          </UFormField>

          <UFormField label="Handle (optional)" name="handle">
            <UInput 
              v-model="addSocialState.handle" 
              placeholder="@tournamentname"
              icon="i-heroicons-at-symbol"
            />
          </UFormField>

          <div class="flex justify-end gap-2 pt-4">
            <UButton 
              label="Cancel" 
              variant="ghost" 
              color="neutral"
              @click="showAddSocialModal = false"
            />
            <UButton 
              type="submit"
              label="Add Social Link" 
              icon="i-heroicons-plus"
              :loading="addingSocial"
            />
          </div>
        </UForm>
      </UCard>
    </template>
  </UModal>

  <!-- Generic Confirmation Modal -->
  <UModal v-model:open="confirmModalState.isOpen" :ui="{ content: 'sm:max-w-md' }">
    <template #content>
      <UCard :ui="{ root: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white flex items-center gap-2">
              <UIcon :name="confirmModalState.color === 'error' ? 'i-heroicons-exclamation-triangle' : 'i-heroicons-information-circle'" 
                class="w-5 h-5" :class="confirmModalState.color === 'error' ? 'text-red-500' : 'text-blue-500'" />
              {{ confirmModalState.title }}
            </h3>
            <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" class="-my-1" @click="confirmModalState.isOpen = false" />
          </div>
        </template>

        <div class="py-4">
          <p class="text-sm text-gray-600 dark:text-gray-300">
            {{ confirmModalState.description }}
          </p>
        </div>

        <template #footer>
          <div class="flex items-center justify-end gap-3">
            <UButton 
              color="neutral" 
              variant="ghost" 
              :label="confirmModalState.cancelLabel" 
              @click="confirmModalState.isOpen = false" 
              :disabled="confirmModalState.loading"
            />
            <UButton 
              :color="confirmModalState.color" 
              :label="confirmModalState.confirmLabel"
              :loading="confirmModalState.loading"
              @click="confirmModalState.onConfirm"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>

  <!-- Generic Prompt Modal -->
  <UModal v-model:open="promptModalState.isOpen" :ui="{ content: 'sm:max-w-md' }">
    <template #content>
      <UCard :ui="{ root: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white">
              {{ promptModalState.title }}
            </h3>
            <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" class="-my-1" @click="promptModalState.isOpen = false" />
          </div>
        </template>

        <div class="py-4">
          <UFormField :label="promptModalState.label">
            <UInput 
              v-model="promptModalState.value" 
              class="w-full" 
              autofocus 
              @keyup.enter="promptModalState.onConfirm(promptModalState.value)"
            />
          </UFormField>
        </div>

        <template #footer>
          <div class="flex items-center justify-end gap-3">
            <UButton 
              color="neutral" 
              variant="ghost" 
              :label="promptModalState.cancelLabel" 
              @click="promptModalState.isOpen = false" 
              :disabled="promptModalState.loading"
            />
            <UButton 
              color="primary" 
              :label="promptModalState.confirmLabel"
              :loading="promptModalState.loading"
              @click="promptModalState.onConfirm(promptModalState.value)"
              :disabled="!promptModalState.value"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
