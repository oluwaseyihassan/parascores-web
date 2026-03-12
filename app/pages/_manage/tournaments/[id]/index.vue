<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { Visibility, TournamentType, ParticipantType, ParticipantStatus, FixtureStatus, FixtureStage } from '~/types'
import type { Participant, Fixture, Sponsor, Social } from '~/types'
import * as xlsx from 'xlsx'
import QrcodeVue from 'qrcode.vue'

definePageMeta({
  layout: 'dashboard'
})

const route = useRoute()
const tournamentStore = useTournamentStore()
const participantStore = useParticipantStore()
const fixtureStore = useFixtureStore()
const standingStore = useStandingStore()
const sponsorStore = useSponsorStore()
const socialStore = useSocialStore()
const { currentTournament: tournament, loading, error } = storeToRefs(tournamentStore)
const { participants, loading: participantsLoading } = storeToRefs(participantStore)
const { fixtures, fixturesByRound, rounds, knockoutFixturesByRound, knockoutRounds, groupStageFixturesByRound, groupStageRounds, loading: fixturesLoading, generating } = storeToRefs(fixtureStore)
const { standings, loading: standingsLoading } = storeToRefs(standingStore)
const { sponsors, loading: sponsorsLoading } = storeToRefs(sponsorStore)
const { socials, loading: socialsLoading } = storeToRefs(socialStore)

// Fetch tournament, participants, and fixtures on mount
const tournamentId = computed(() => route.params.id as string)

onMounted(async () => {
  if (tournamentId.value) {
    await Promise.all([
      tournamentStore.fetchTournament(tournamentId.value),
      participantStore.fetchParticipants(tournamentId.value),
      fixtureStore.fetchFixtures(tournamentId.value),
      standingStore.fetchStandings(tournamentId.value),
      sponsorStore.fetchSponsors(tournamentId.value),
      socialStore.fetchSocials(tournamentId.value)
    ])
  }
})

// Check if standings should be shown
const showStandings = computed(() => {
  if (!tournament.value) return false
  return [TournamentType.ROUND_ROBIN, TournamentType.GROUP, TournamentType.HYBRID].includes(tournament.value.type)
})

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
        await tournamentStore.deleteTournament(tournamentId.value)
        useToast().add({ title: 'Tournament deleted successfully', color: 'success' })
        const router = useRouter()
        router.push('/')
      } catch (err: any) {
        useToast().add({ 
          title: 'Failed to delete tournament', 
          description: err.message || 'Unknown error', 
          color: 'error' 
        })
      } finally {
        deletingTournament.value = false
      }
    }
  })
}

// Generate fixtures
const generateError = ref<string | null>(null)
const showGenerateModal = ref(false)
const generateConfig = reactive({
  teamsPerGroup: null as number | null,
  numberOfGroups: null as number | null,
  doubleRoundRobin: false
})

const openGenerateModal = () => {
  // Reset config
  generateConfig.teamsPerGroup = null
  generateConfig.numberOfGroups = null
  generateConfig.doubleRoundRobin = false
  generateError.value = null
  
  // If not a group or round robin tournament, proceed directly
  if (tournament.value?.type !== TournamentType.GROUP && tournament.value?.type !== TournamentType.ROUND_ROBIN && tournament.value?.type !== TournamentType.HYBRID) {
    handleGenerateFixtures()
  } else {
    showGenerateModal.value = true
  }
}

const handleGenerateFixtures = async () => {
  if (participants.value.length < 2) {
    generateError.value = 'At least 2 participants are required to generate fixtures'
    return
  }
  
  
  generateError.value = null
  try {
    await fixtureStore.generateFixtures(tournamentId.value, {
      teamsPerGroup: generateConfig.teamsPerGroup || undefined,
      numberOfGroups: generateConfig.numberOfGroups || undefined,
      doubleRoundRobin: generateConfig.doubleRoundRobin
    })
    
    showGenerateModal.value = false
    
    // Auto-refresh fixtures
    await fixtureStore.fetchFixtures(tournamentId.value)
    
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
    generateError.value = err?.data?.message || err?.message || 'Failed to generate fixtures'
  }
}

// Advance to Knockout Stage (Hybrid)
const showAdvanceModal = ref(false)
const advancing = ref(false)
const advanceError = ref<string | null>(null)
const manualSelection = ref(false)
const selectedParticipantIds = ref<string[]>([])

const canAdvance = computed(() => {
  if (tournament.value?.type !== TournamentType.HYBRID) return false
  
  // Check if group stage matches exist and are all completed
  const groupMatches = fixtures.value.filter(f => f.stage === FixtureStage.GROUP_STAGE)
  if (groupMatches.length === 0) return false
  
  const allGroupsComplete = groupMatches.every(f => f.status === FixtureStatus.COMPLETED)
  if (!allGroupsComplete) return false
  
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
  manualSelection.value = false
  selectedParticipantIds.value = []
  advanceError.value = null
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
    
    // Refresh fully to be safe
    await fixtureStore.fetchFixtures(tournamentId.value)
    
    useToast().add({
      title: 'Advanced to Knockout Stage',
      description: 'Knockout fixtures have been generated.',
      icon: 'i-heroicons-check-circle',
      color: 'success'
    })
  } catch (err: any) {
    advanceError.value = err?.data?.message || err?.message || 'Failed to advance'
  } finally {
    advancing.value = false
  }
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

const addParticipantState = reactive<Partial<AddParticipantSchema>>({
  customName: '',
  seed: null,
  logoUrl: null
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
      console.error('Excel parse error:', err)
      useToast().add({ title: 'Failed to parse Excel file', description: err.message, color: 'error' })
    } finally {
      uploadingExcel.value = false
      if (excelFileInput.value) excelFileInput.value.value = ''
    }
  }
  reader.readAsArrayBuffer(file)
}

const downloadExcelTemplate = () => {
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
    useToast().add({ 
      title: editingPlayerId.value ? 'Failed to update player' : 'Failed to add player', 
      description: error.message || 'Unknown error', 
      color: 'error' 
    })
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
  
  // Assuming 'openConfirmModal' is defined elsewhere, or define it here if needed
  // const openConfirmModal = ({ title, description, confirmLabel, color, onConfirm }) => { /* ... */ }
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
        useToast().add({ 
          title: 'Failed to remove player', 
          description: error.message || 'Unknown error', 
          color: 'error' 
        })
      } finally {
        deletingPlayerId.value = null
      }
    }
  })
}

const removeParticipant = async (participantId: string) => {
  if (!confirm('Are you sure you want to remove this participant?')) return
  
  try {
    await participantStore.removeParticipant(participantId)
    useToast().add({ title: 'Participant removed successfully', color: 'success' })
  } catch (error: any) {
    useToast().add({ 
      title: 'Failed to remove participant', 
      description: error.message || 'Unknown error', 
      color: 'error' 
    })
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
      logoUrl: logoUrl
    })
    showAddModal.value = false
    resetAddForm()
  } catch (err: any) {
    addError.value = err?.data?.message || err?.message || 'Failed to add participant'
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
  logoUrl: null as string | null
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
      logoUrl: finalLogoUrl
    })
    
    useToast().add({ title: 'Participant updated successfully', color: 'success' })
    showEditModal.value = false
  } catch (err: any) {
    editParticipantError.value = err?.data?.message || err?.message || 'Failed to update participant'
  } finally {
    editingParticipant.value = false
  }
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

// Accordion items for fixtures
const accordionItems = computed(() => {
  return rounds.value.map(round => {
    const roundFixtures = fixturesByRound.value[round] || []
    const total = roundFixtures.length
    const completed = roundFixtures.filter(f => f.status === FixtureStatus.COMPLETED).length
    const live = roundFixtures.filter(f => f.status === FixtureStatus.LIVE).length
    
    let label = fixtureStore.getRoundDisplayName(round)
    
    let stats = ''
    const parts = []
    if (live > 0) parts.push(`🔴 ${live} Live`)
    if (completed > 0) parts.push(`${completed}/${total} Completed`)
    else if (total > 0) parts.push(`${total} Scheduled`)
    
    if (parts.length > 0) {
      stats = `(${parts.join(' • ')})`
    }
    
    return {
      label,
      stats,
      fixtures: roundFixtures,
      defaultOpen: true,
      color: 'neutral' as const,
      variant: 'soft' as const
    }
  })
})

// Group-stage-only accordion items (for hybrid tournaments)
const groupStageAccordionItems = computed(() => {
  return groupStageRounds.value.map(round => {
    const roundFixtures = groupStageFixturesByRound.value[round] || []
    const total = roundFixtures.length
    const completed = roundFixtures.filter(f => f.status === FixtureStatus.COMPLETED).length
    const live = roundFixtures.filter(f => f.status === FixtureStatus.LIVE).length
    
    let label = fixtureStore.getGroupStageRoundDisplayName(round)
    
    let stats = ''
    const parts = []
    if (live > 0) parts.push(`🔴 ${live} Live`)
    if (completed > 0) parts.push(`${completed}/${total} Completed`)
    else if (total > 0) parts.push(`${total} Scheduled`)
    
    if (parts.length > 0) {
      stats = `(${parts.join(' • ')})`
    }
    
    return {
      label,
      stats,
      fixtures: roundFixtures,
      defaultOpen: true,
      color: 'neutral' as const,
      variant: 'soft' as const
    }
  })
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
  logoUrl: z.string().url('Must be a valid URL').optional().nullable().or(z.literal('')),
  websiteUrl: z.string().url('Must be a valid URL').optional().nullable().or(z.literal(''))
})

type AddSponsorSchema = z.output<typeof addSponsorSchema>

const addSponsorState = reactive<Partial<AddSponsorSchema>>({
  name: '',
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
  addSponsorState.logoUrl = ''
  addSponsorState.websiteUrl = ''
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
        useToast().add({ 
          title: 'Failed to remove sponsor', 
          description: error.message || 'Unknown error', 
          color: 'error' 
        })
      }
    }
  })
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
        useToast().add({ 
          title: 'Failed to remove social link', 
          description: error.message || 'Unknown error', 
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

// Tab configuration
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
      icon: 'i-heroicons-user-group'
    },
    {
      slot: 'fixtures',
      label: 'Fixtures',
      icon: 'i-heroicons-calendar-days'
    }
  ]

  if (showStandings.value) {
    items.push({
      slot: 'standings',
      label: 'Standings',
      icon: 'i-heroicons-chart-bar'
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
    useToast().add({ title: 'Failed to copy link', description: String(err), color: 'error' })
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
      variant="subtle"
      icon="i-heroicons-exclamation-triangle"
      :title="error"
      class="mb-6"
    />

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
          <div class="flex items-center justify-center gap-3 mb-2">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ tournament.name }}
            </h1>
            <UBadge v-if="tournamentStatus" :color="tournamentStatus.color" variant="subtle">
              {{ tournamentStatus.label }}
            </UBadge>
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

            <div class="py-4">
              <p class="text-sm text-gray-500 mb-4">
                The group stage is complete. Choose how to select teams for the knockout bracket.
              </p>
              
              <UAlert
                v-if="advanceError"
                color="error"
                variant="subtle"
                icon="i-heroicons-exclamation-triangle"
                :title="advanceError"
                class="mb-4"
              />

              <!-- Selection Mode Toggle -->
              <div class="flex items-center gap-3 mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                <USwitch v-model="manualSelection" />
                <div>
                  <p class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ manualSelection ? 'Manual Selection' : 'Auto-Select' }}
                  </p>
                  <p class="text-xs text-gray-500">
                    {{ manualSelection 
                      ? 'Pick which teams advance to the knockout stage' 
                      : 'Top 2 teams from each group qualify automatically' 
                    }}
                  </p>
                </div>
              </div>

              <!-- Manual Selection: Team list grouped by standings -->
              <div v-if="manualSelection">
                <div class="space-y-4 max-h-80 overflow-y-auto">
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

      <!-- Content Container -->
      <div class="max-w-4xl mx-auto w-full">
        <!-- Main Content -->
        <div class="w-full">
          <UTabs 
            :items="tabItems" 
            class="w-full"
            :ui="{ list: 'overflow-x-auto flex-nowrap sm:flex-wrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden' }"
          >
            <!-- Overview Tab -->
            <template #overview>
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
                  <!-- Organizer -->
                  <UCard v-if="tournament.organizer" class="border border-gray-100 dark:border-gray-800 shadow-sm transition-all h-fit">
                    <template #header>
                      <div class="flex items-center gap-2">
                        <UIcon name="i-heroicons-user" class="w-5 h-5 text-indigo-500" />
                        <span class="font-medium">Organizer</span>
                      </div>
                    </template>
                    
                    <div class="flex items-center gap-3">
                      <UAvatar 
                        v-if="tournament.organizer.picture" 
                        :src="tournament.organizer.picture" 
                        size="md"
                      />
                      <UAvatar 
                        v-else 
                        :text="tournament.organizer.name?.charAt(0).toUpperCase()" 
                        size="md"
                        class="bg-indigo-500 text-white"
                      />
                      <div>
                        <p class="font-medium text-gray-900 dark:text-white">{{ tournament.organizer.name }}</p>
                        <p class="text-sm text-gray-500">{{ tournament.organizer.email }}</p>
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
                        <UButton size="xs" variant="ghost" icon="i-heroicons-plus" @click="openAddSponsorModal" />
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
                        <button 
                          class="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-xs transition-all z-10"
                          @click="handleRemoveSponsor(sponsor.id)"
                          title="Remove"
                        >
                          ×
                        </button>
                      </div>
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
                        <UButton size="xs" variant="ghost" icon="i-heroicons-plus" @click="openAddSocialModal" />
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
                          <UIcon v-else :name="getSocialIcon(social.platform)" class="w-4 h-4" :class="getSocialColor(social.platform)" />
                          <span class="text-sm text-gray-700 dark:text-gray-300 capitalize">{{ social.platform }}</span>
                        </a>
                        <button 
                          class="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-xs transition-all"
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
                    <UButton size="xs" variant="ghost" icon="i-heroicons-plus" @click="openAddModal">
                      Add
                    </UButton>
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
                        :show="!!participant.players?.length"
                        :text="participant.players?.length"
                        size="xl"
                        color="error"
                        inset
                      >
                        <UButton 
                          size="xs" 
                          color="neutral" 
                          variant="ghost" 
                          icon="i-heroicons-users"
                          @click="openManagePlayers(participant)"
                          title="Manage Players"
                        />
                      </UChip>
                      <UDropdownMenu 
                        :items="[[
                          { label: 'Edit', icon: 'i-heroicons-pencil-square', onSelect: () => openEditParticipantModal(participant) },
                          { label: 'Delete', icon: 'i-heroicons-trash', onSelect: () => removeParticipant(participant.id), class: 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' }
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
                      <UBadge :color="statusColors[participant.status]" variant="subtle" size="sm">
                        {{ participant.status }}
                      </UBadge>
                    </div>
                  </div>
                </div>
              </UCard>
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
                <div v-if="(tournament.type === 'GROUP' || tournament.type === 'HYBRID') && Object.keys(standingStore.getStandingsByGroup).length > 0" class="space-y-6">
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
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <UIcon name="i-heroicons-calendar-days" class="w-5 h-5 text-indigo-500" />
                      <span class="font-medium">Fixtures</span>
                      <UBadge v-if="fixtures.length" size="sm" variant="subtle">
                        {{ fixtures.length }}
                      </UBadge>
                    </div>
                    <UButton 
                      size="xs" 
                      variant="ghost" 
                      icon="i-heroicons-sparkles"
                      :loading="generating"
                      :disabled="participants.length < 2"
                      @click="openGenerateModal"
                    >
                      Generate
                    </UButton>
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
                
                <!-- Loading -->
                <div v-if="fixturesLoading && !fixtures.length" class="py-8 text-center text-gray-400">
                  <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 mx-auto mb-2 animate-spin" />
                  <p>Loading fixtures...</p>
                </div>
                
                <!-- Empty State -->
                <div v-else-if="!fixtures.length" class="py-8 text-center text-gray-400">
                  <UIcon name="i-heroicons-calendar-days" class="w-12 h-12 mx-auto mb-2" />
                  <p>No fixtures scheduled</p>
                  <p class="text-sm mb-4">Generate fixtures after adding participants</p>
                  <UButton 
                    v-if="participants.length >= 2"
                    size="sm" 
                    variant="outline" 
                    icon="i-heroicons-sparkles"
                    :loading="generating"
                    @click="openGenerateModal"
                  >
                    Generate Fixtures
                  </UButton>
                  <p v-else class="text-xs text-gray-400 mt-2">
                    Need at least 2 participants
                  </p>
                </div>
                
                <!-- Fixtures Display -->
                <template v-else>
                  <!-- Knockout Bracket for knockout tournaments -->
                  <KnockoutBracket
                    v-if="tournament?.type === TournamentType.KNOCKOUT"
                    :fixtures-by-round="fixturesByRound"
                    :rounds="rounds"
                    :get-round-display-name="fixtureStore.getRoundDisplayName"
                    :updating-match="updatingMatch"
                    :two-legs-knockout="tournament?.twoLegsKnockout"
                    :third-place-match="tournament?.thirdPlaceMatch"
                    @start-match="startMatch"
                    @control-match="openMatchControl"
                  />
                  
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
                          <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0 flex-1 text-left w-full">
                            <span class="font-medium text-gray-900 dark:text-white whitespace-normal break-words">{{ item.label }}</span>
                            <span v-if="item.stats" class="text-xs sm:text-sm font-normal text-gray-500 dark:text-gray-400 shrink-0">
                              {{ item.stats }}
                            </span>
                          </div>
                        </template>
                        
                        <template #content="{ item }">
                          <div class="space-y-2 p-4 pt-2">
                             <div 
                              v-for="fixture in item.fixtures" 
                              :key="fixture.id"
                              class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                            >
                              <div class="w-full sm:flex-1 sm:w-auto">
                                <div class="flex items-center gap-2 text-sm min-w-0">
                                  <div class="flex items-center gap-2 flex-1 min-w-0 justify-end">
                                    <span class="font-medium text-gray-900 dark:text-white truncate">
                                      {{ fixture.homeTeam?.customName || 'TBD' }}
                                    </span>
                                    <div class="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                                      <img 
                                        v-if="fixture.homeTeam?.logoUrl" 
                                        :src="fixture.homeTeam.logoUrl" 
                                        class="w-full h-full object-cover"
                                      />
                                      <span v-else class="text-[10px] font-medium text-gray-600 dark:text-gray-300">
                                        {{ (fixture.homeTeam?.customName || 'T').charAt(0).toUpperCase() }}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <span class="text-gray-400 px-2 shrink-0">vs</span>
                                  
                                  <div class="flex items-center gap-2 flex-1 min-w-0 justify-start">
                                    <div class="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                                      <img 
                                        v-if="fixture.awayTeam?.logoUrl" 
                                        :src="fixture.awayTeam.logoUrl" 
                                        class="w-full h-full object-cover"
                                      />
                                      <span v-else class="text-[10px] font-medium text-gray-600 dark:text-gray-300">
                                        {{ (fixture.awayTeam?.customName || 'T').charAt(0).toUpperCase() }}
                                      </span>
                                    </div>
                                    <span class="font-medium text-gray-900 dark:text-white truncate">
                                      {{ fixture.awayTeam?.customName || 'TBD' }}
                                    </span>
                                  </div>
                                </div>
                                <p v-if="fixture.startTime" class="text-xs text-gray-500 mt-1">
                                  {{ new Date(fixture.startTime).toLocaleDateString() }}
                                </p>
                              </div>
                              
                              <div 
                                v-if="fixture.status === 'COMPLETED' || fixture.status === 'LIVE'"
                                class="flex items-center gap-2 px-3"
                              >
                                <span class="text-lg font-bold text-gray-900 dark:text-white">
                                  {{ fixture.homeScore ?? 0 }}
                                </span>
                                <span class="text-gray-400">-</span>
                                <span class="text-lg font-bold text-gray-900 dark:text-white">
                                  {{ fixture.awayScore ?? 0 }}
                                </span>
                              </div>
                              
                              <div class="flex items-center justify-end w-full sm:w-auto shrink-0 gap-2 mt-1 sm:mt-0">
                                <UButton 
                                  v-if="fixture.status === 'SCHEDULED' && fixture.homeTeamId && fixture.awayTeamId"
                                  size="xs" 
                                  color="success" 
                                  variant="soft"
                                  icon="i-heroicons-play"
                                  :loading="updatingMatch"
                                  @click.stop="startMatch(fixture)"
                                >
                                  Start
                                </UButton>
                                
                                <UButton 
                                  v-if="fixture.status === 'SCHEDULED'"
                                  size="xs" 
                                  color="neutral" 
                                  variant="soft"
                                  icon="i-heroicons-pencil"
                                  @click.stop="openMatchControl(fixture)"
                                >
                                  Edit
                                </UButton>
                                
                                <UButton 
                                  v-if="fixture.status === 'LIVE' || fixture.status === 'COMPLETED'"
                                  size="xs" 
                                  color="warning" 
                                  variant="soft"
                                  icon="i-heroicons-adjustments-horizontal"
                                  @click.stop="openMatchControl(fixture)"
                                >
                                  Control
                                </UButton>
                                
                                <UBadge :color="fixtureStatusColors[fixture.status]" variant="subtle" size="sm">
                                  {{ fixture.status }}
                                </UBadge>
                              </div>
                            </div>
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

                    <!-- Knockout Bracket (shown after advancement) -->
                    <div v-if="knockoutRounds.length > 0" class="mt-6">
                      <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <UIcon name="i-heroicons-trophy" class="w-4 h-4 text-amber-500" />
                        Knockout Stage
                      </h4>
                      <KnockoutBracket
                        :fixtures-by-round="knockoutFixturesByRound"
                        :rounds="knockoutRounds"
                        :get-round-display-name="fixtureStore.getKnockoutRoundDisplayName"
                        :updating-match="updatingMatch"
                        @start-match="startMatch"
                        @control-match="openMatchControl"
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
                          class="mb-2 w-full justify-between rounded"
                        >
                          <div class="flex items-center gap-2 truncate">
                            <span class="font-medium text-gray-900 dark:text-white">{{ item.label }}</span>
                            <span v-if="item.stats" class="text-sm font-normal text-gray-500 dark:text-gray-400">
                              {{ item.stats }}
                            </span>
                          </div>

                          <template #trailing>
                            <UIcon 
                              name="i-heroicons-chevron-down" 
                              class="w-5 h-5 ms-auto transform transition-transform duration-200" 
                              :class="[open && '-rotate-180']" 
                            />
                          </template>
                        </UButton>
                      </template>
                      
                      <template #content="{ item }">
                        <div class="space-y-2 p-4 pt-2">
                           <div 
                            v-for="fixture in item.fixtures" 
                            :key="fixture.id"
                            class="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                          >
                            <!-- Match Info -->
                            <div class="flex-1">
                              <div class="flex items-center gap-2 text-sm">
                                <div class="flex items-center gap-2 w-1/3 justify-end">
                                  <span class="font-medium text-gray-900 dark:text-white truncate">
                                    {{ fixture.homeTeam?.customName || 'TBD' }}
                                  </span>
                                  <div class="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                                    <img 
                                      v-if="fixture.homeTeam?.logoUrl" 
                                      :src="fixture.homeTeam.logoUrl" 
                                      class="w-full h-full object-cover"
                                    />
                                    <span v-else class="text-[10px] font-medium text-gray-600 dark:text-gray-300">
                                      {{ (fixture.homeTeam?.customName || 'T').charAt(0).toUpperCase() }}
                                    </span>
                                  </div>
                                </div>
                                
                                <span class="text-gray-400 px-2">vs</span>
                                
                                <div class="flex items-center gap-2 w-1/3 justify-start">
                                  <div class="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                                    <img 
                                      v-if="fixture.awayTeam?.logoUrl" 
                                      :src="fixture.awayTeam.logoUrl" 
                                      class="w-full h-full object-cover"
                                    />
                                    <span v-else class="text-[10px] font-medium text-gray-600 dark:text-gray-300">
                                      {{ (fixture.awayTeam?.customName || 'T').charAt(0).toUpperCase() }}
                                    </span>
                                  </div>
                                  <span class="font-medium text-gray-900 dark:text-white truncate">
                                    {{ fixture.awayTeam?.customName || 'TBD' }}
                                  </span>
                                </div>
                              </div>
                              <p v-if="fixture.startTime" class="text-xs text-gray-500 mt-1">
                                {{ new Date(fixture.startTime).toLocaleDateString() }}
                              </p>
                            </div>
                            
                            <!-- Score (if completed or live) -->
                            <div 
                              v-if="fixture.status === 'COMPLETED' || fixture.status === 'LIVE'"
                              class="flex items-center gap-2 px-3"
                            >
                              <span class="text-lg font-bold text-gray-900 dark:text-white">
                                {{ fixture.homeScore ?? 0 }}
                              </span>
                              <span class="text-gray-400">-</span>
                              <span class="text-lg font-bold text-gray-900 dark:text-white">
                                {{ fixture.awayScore ?? 0 }}
                              </span>
                            </div>
                            
                            <!-- Match Actions -->
                            <div class="flex items-center gap-2">
                              <!-- Start Match Button (for SCHEDULED) -->
                              <UButton 
                                v-if="fixture.status === 'SCHEDULED' && fixture.homeTeamId && fixture.awayTeamId"
                                size="xs" 
                                color="success" 
                                variant="soft"
                                icon="i-heroicons-play"
                                :loading="updatingMatch"
                                @click.stop="startMatch(fixture)"
                              >
                                Start
                              </UButton>

                              <UButton 
                                v-if="fixture.status === 'SCHEDULED'"
                                size="xs" 
                                color="neutral" 
                                variant="soft"
                                icon="i-heroicons-pencil"
                                @click.stop="openMatchControl(fixture)"
                              >
                                Edit
                              </UButton>
                              
                              <!-- Control Match Button (for LIVE) -->
                              <UButton 
                                v-if="fixture.status === 'LIVE'"
                                size="xs" 
                                color="warning" 
                                variant="soft"
                                icon="i-heroicons-adjustments-horizontal"
                                @click.stop="openMatchControl(fixture)"
                              >
                                Control
                              </UButton>
                              
                              <!-- Status Badge -->
                              <UBadge :color="fixtureStatusColors[fixture.status]" variant="subtle" size="sm">
                                {{ fixture.status }}
                              </UBadge>
                            </div>
                          </div>
                        </div>
                      </template>
                    </UAccordion>
                  </div>
                </template>
              </UCard>
            </template>



            <!-- Settings Tab -->
            <template #settings>
              <UCard class="mt-4">
                <template #header>
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <UIcon name="i-heroicons-cog-6-tooth" class="w-5 h-5 text-indigo-500" />
                      <span class="font-medium">Tournament Settings</span>
                    </div>
                  </div>
                </template>
                <div class="p-2">
                  <TournamentSettings :tournament="tournament" />
                  
                  <UCard class="mt-8 border-red-200 dark:border-red-900/50" :ui="{ header: 'bg-red-50 dark:bg-red-900/20' }">
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
              </UCard>
            </template>
          </UTabs>
        </div>
      </div>
    </template>

    <!-- Not Found -->
    <div v-else class="text-center py-20">
      <UIcon name="i-heroicons-magnifying-glass" class="w-12 h-12 mx-auto text-gray-400 mb-4" />
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">Tournament not found</h2>
      <p class="text-gray-500 mb-6">The tournament you're looking for doesn't exist or has been deleted.</p>
      <UButton to="/" variant="outline">Back to Dashboard</UButton>
    </div>
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
          <div class="space-y-2">
            <div v-if="!selectedParticipant?.players?.length" class="text-center py-8 text-gray-400">
              <p>No players added yet</p>
            </div>
            <div v-else class="space-y-2 max-h-60 overflow-y-auto pr-1">
              <div 
                v-for="player in selectedParticipant.players" 
                :key="player.id"
                class="group flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
              >
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-medium text-xs">
                    {{ player.number || '#' }}
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-900 dark:text-white">
                      {{ player.name }}
                    </p>
                    <p class="text-xs text-gray-500">
                      {{ player.position }}
                    </p>
                  </div>
                </div>
                <div class="flex items-center">
                  <UDropdownMenu 
                    :items="[[
                      { label: 'Edit', icon: 'i-heroicons-pencil-square', onSelect: () => startEditPlayer(player) },
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

          <!-- Group Stage Config -->
          <div v-if="tournament?.type === 'GROUP' || tournament?.type === 'HYBRID'" class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          
          <!-- Double Round Robin Option -->
          <div 
            v-if="tournament?.type === 'ROUND_ROBIN' || tournament?.type === 'GROUP' || tournament?.type === 'HYBRID'" 
            class="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50"
          >
             <div>
              <p class="font-medium text-gray-900 dark:text-white">Double Round Robin</p>
              <p class="text-sm text-gray-500">Teams play each other twice (Home & Away)</p>
            </div>
            <USwitch v-model="generateConfig.doubleRoundRobin" />
          </div>

          <div v-if="tournament?.type === 'GROUP' || tournament?.type === 'HYBRID'" class="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg text-sm text-gray-500">
            <p v-if="generateConfig.teamsPerGroup && participants.length">
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
</template>
