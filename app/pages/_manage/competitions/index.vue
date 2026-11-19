<script setup lang="ts">
import { storeToRefs } from 'pinia'
import type { Competition, CompetitionEdition, Tournament } from '~/types'
import { formatEditionDateRange, getEditionLabel, getEditionStatusMeta } from '~/utils/competition'

definePageMeta({
  middleware: ['require-organizer'],
  layout: 'dashboard',
})

useSeoMeta({ title: 'Competitions — ParaScores' })

const route = useRoute()
const authStore = useAuthStore()
const competitionStore = useCompetitionStore()
const tournamentStore = useTournamentStore()
const { orgCompetitions, orgLoading } = storeToRefs(competitionStore)
const { tournaments } = storeToRefs(tournamentStore)
const { toCompetition, frontendUrl } = useHost()
const { handleError } = useErrors()
const toast = useToast()

const activeOrgId = computed(
  () => authStore.activeOrganizationId || authStore.currentOrganization?.id || null,
)

const fetchError = ref(false)
const searchQuery = ref('')
const selectedSport = ref('all')
const expandedIds = ref<Set<string>>(new Set())

const sportOptions = [
  'Football',
  'Basketball',
  'Tennis',
  'Table Tennis',
  'Volleyball',
  'Badminton',
  'Handball',
  'Rugby',
  'Athletics',
  'Swimming',
  'Cycling',
  'Weightlifting',
  'Boxing',
  'Judo',
  'Taekwondo',
  'Wrestling',
  'Esports',
]

async function loadData() {
  if (!activeOrgId.value) return
  fetchError.value = false
  try {
    await Promise.all([
      competitionStore.fetchOrgCompetitions(activeOrgId.value),
      tournamentStore.fetchTournaments({ limit: 100 }),
    ])
    const highlightId = route.query.highlight as string | undefined
    if (highlightId) {
      expandedIds.value.add(highlightId)
    } else if (orgCompetitions.value.length <= 3) {
      orgCompetitions.value.forEach((c) => expandedIds.value.add(c.id))
    }
  } catch {
    fetchError.value = true
  }
}

watch(activeOrgId, (id) => {
  if (id) loadData()
}, { immediate: true })

// Summary metrics
const totalEditionsCount = computed(() =>
  orgCompetitions.value.reduce((acc, c) => acc + (c.seasons?.length ?? c._count?.seasons ?? 0), 0),
)
const totalFollowersCount = computed(() =>
  orgCompetitions.value.reduce((acc, c) => acc + (c._count?.followers ?? 0), 0),
)

const availableSports = computed(() => {
  const set = new Set<string>()
  orgCompetitions.value.forEach((c) => {
    if (c.sport) set.add(c.sport)
  })
  return ['all', ...Array.from(set)]
})

const filteredCompetitions = computed(() => {
  let list = orgCompetitions.value
  if (selectedSport.value !== 'all') {
    list = list.filter((c) => c.sport.toLowerCase() === selectedSport.value.toLowerCase())
  }
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q),
    )
  }
  return list
})

function toggleExpand(id: string) {
  const next = new Set(expandedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedIds.value = next
}

function getActiveEdition(comp: Competition): CompetitionEdition | null {
  const list = comp.seasons || []
  return list.find((s) => s.isCurrentSeason) || list[0] || null
}

async function copyPublicSlugUrl(comp: Competition) {
  try {
    await navigator.clipboard.writeText(`${frontendUrl.value}/c/${comp.slug}`)
    toast.add({ title: 'Public series URL copied!', color: 'success' })
  } catch {
    toast.add({ title: 'Failed to copy link', color: 'error' })
  }
}

// ---------- Create / Edit Competition Modal ----------
const formModalOpen = ref(false)
const editingCompetition = ref<Competition | null>(null)
const savingCompetition = ref(false)
const slugManuallyEdited = ref(false)
const uploadingLogo = ref(false)
const uploadingBanner = ref(false)
const logoInputRef = ref<HTMLInputElement | null>(null)
const bannerInputRef = ref<HTMLInputElement | null>(null)

const compForm = reactive({
  name: '',
  slug: '',
  sport: 'Football',
  description: '',
  logoUrl: '',
  bannerUrl: '',
})

function slugifyText(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

watch(
  () => compForm.name,
  (val) => {
    if (!editingCompetition.value && !slugManuallyEdited.value) {
      compForm.slug = slugifyText(val)
    }
  },
)

function openCreateModal() {
  editingCompetition.value = null
  slugManuallyEdited.value = false
  compForm.name = ''
  compForm.slug = ''
  compForm.sport = 'Football'
  compForm.description = ''
  compForm.logoUrl = ''
  compForm.bannerUrl = ''
  formModalOpen.value = true
}

function openEditModal(comp: Competition) {
  editingCompetition.value = comp
  slugManuallyEdited.value = true
  compForm.name = comp.name
  compForm.slug = comp.slug
  compForm.sport = comp.sport || 'Football'
  compForm.description = comp.description || ''
  compForm.logoUrl = comp.logoUrl || ''
  compForm.bannerUrl = comp.bannerUrl || ''
  formModalOpen.value = true
}

async function handleImageUpload(event: Event, targetField: 'logoUrl' | 'bannerUrl') {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (targetField === 'logoUrl') uploadingLogo.value = true
  else uploadingBanner.value = true

  try {
    const formData = new FormData()
    formData.append('file', file)
    const res = await $api<{ data: { url: string } }>('/upload/image?folder=competitions', {
      method: 'POST',
      body: formData,
    })
    compForm[targetField] = res.data.url
  } catch (err: any) {
    handleError(err, { title: 'Image upload failed' })
  } finally {
    if (targetField === 'logoUrl') uploadingLogo.value = false
    else uploadingBanner.value = false
    input.value = ''
  }
}

async function saveCompetition() {
  if (!compForm.name.trim()) {
    toast.add({ title: 'Competition name is required', color: 'error' })
    return
  }
  const cleanSlug = slugifyText(compForm.slug || compForm.name)
  if (!cleanSlug) {
    toast.add({ title: 'Valid URL slug is required', color: 'error' })
    return
  }
  if (!activeOrgId.value) return

  savingCompetition.value = true
  try {
    if (editingCompetition.value) {
      await competitionStore.updateCompetition(
        editingCompetition.value.id,
        {
          name: compForm.name.trim(),
          slug: cleanSlug,
          sport: compForm.sport,
          description: compForm.description.trim() || undefined,
          logoUrl: compForm.logoUrl || undefined,
          bannerUrl: compForm.bannerUrl || undefined,
        },
        activeOrgId.value,
      )
      toast.add({ title: 'Competition updated', color: 'success' })
    } else {
      const res = await competitionStore.createCompetition({
        name: compForm.name.trim(),
        slug: cleanSlug,
        sport: compForm.sport,
        description: compForm.description.trim() || undefined,
        organization_id: activeOrgId.value,
        logoUrl: compForm.logoUrl || undefined,
        bannerUrl: compForm.bannerUrl || undefined,
      })
      if (res.data?.id) {
        expandedIds.value.add(res.data.id)
      }
      toast.add({ title: 'Competition created', color: 'success' })
    }
    formModalOpen.value = false
  } catch (err: any) {
    handleError(err, {
      title: editingCompetition.value ? 'Failed to update competition' : 'Failed to create competition',
    })
  } finally {
    savingCompetition.value = false
  }
}

// ---------- Attach Existing Tournament Modal ----------
const attachModalOpen = ref(false)
const attachTargetComp = ref<Competition | null>(null)
const attaching = ref(false)
const attachForm = reactive({
  tournamentId: '',
  seasonName: '',
  setAsCurrent: false,
})

const attachableTournaments = computed<Tournament[]>(() => {
  const targetId = attachTargetComp.value?.id
  return tournaments.value.filter(
    (t) =>
      (!activeOrgId.value || !t.organization_id || t.organization_id === activeOrgId.value) &&
      t.competition_id !== targetId &&
      !t.isPractice,
  )
})

function openAttachModal(comp: Competition) {
  attachTargetComp.value = comp
  attachForm.tournamentId = ''
  attachForm.seasonName = ''
  attachForm.setAsCurrent = (comp.seasons?.length ?? 0) === 0
  attachModalOpen.value = true
}

watch(
  () => attachForm.tournamentId,
  (tId) => {
    if (!tId) return
    const t = attachableTournaments.value.find((x) => x.id === tId)
    if (!t) return
    if (t.seasonName) {
      attachForm.seasonName = t.seasonName
    } else if (t.start_date) {
      const y = new Date(t.start_date).getFullYear()
      if (!Number.isNaN(y)) attachForm.seasonName = `${y} Edition`
    }
  },
)

async function submitAttachSeason() {
  if (!attachTargetComp.value || !attachForm.tournamentId) {
    toast.add({ title: 'Please select a tournament to attach', color: 'error' })
    return
  }
  attaching.value = true
  try {
    await competitionStore.attachSeason(
      attachTargetComp.value.id,
      {
        tournamentId: attachForm.tournamentId,
        seasonName: attachForm.seasonName.trim() || undefined,
        setAsCurrent: attachForm.setAsCurrent,
      },
      activeOrgId.value || undefined,
    )
    expandedIds.value.add(attachTargetComp.value.id)
    await tournamentStore.fetchTournaments({ limit: 100 })
    toast.add({ title: 'Edition attached to competition', color: 'success' })
    attachModalOpen.value = false
  } catch (err: any) {
    handleError(err, { title: 'Failed to attach tournament' })
  } finally {
    attaching.value = false
  }
}

// ---------- Inline Edition Actions (Set Active, Edit Label, Detach, Start New Season) ----------
const settingActiveEditionId = ref<string | null>(null)
const editingSeasonId = ref<string | null>(null)
const editingSeasonLabel = ref('')
const savingSeasonLabel = ref(false)

async function handleSetActiveEdition(comp: Competition, season: CompetitionEdition) {
  settingActiveEditionId.value = season.id
  try {
    await competitionStore.updateSeason(
      comp.id,
      season.id,
      { isCurrentSeason: true },
      activeOrgId.value || undefined,
    )
    toast.add({
      title: 'Active edition updated',
      description: `${getEditionLabel(season)} is now the default edition for ${comp.name}.`,
      color: 'success',
    })
  } catch (err: any) {
    handleError(err, { title: 'Failed to set active edition' })
  } finally {
    settingActiveEditionId.value = null
  }
}

function startEditSeasonLabel(season: CompetitionEdition) {
  editingSeasonId.value = season.id
  editingSeasonLabel.value = season.seasonName || getEditionLabel(season)
}

function cancelEditSeasonLabel() {
  editingSeasonId.value = null
  editingSeasonLabel.value = ''
}

async function saveSeasonLabel(comp: Competition, season: CompetitionEdition) {
  savingSeasonLabel.value = true
  try {
    await competitionStore.updateSeason(
      comp.id,
      season.id,
      { seasonName: editingSeasonLabel.value.trim() },
      activeOrgId.value || undefined,
    )
    toast.add({ title: 'Season label updated', color: 'success' })
    cancelEditSeasonLabel()
  } catch (err: any) {
    handleError(err, { title: 'Failed to update season label' })
  } finally {
    savingSeasonLabel.value = false
  }
}

// Detach Modal
const detachModalOpen = ref(false)
const detachTarget = ref<{ comp: Competition; season: CompetitionEdition } | null>(null)
const detaching = ref(false)

function promptDetachSeason(comp: Competition, season: CompetitionEdition) {
  detachTarget.value = { comp, season }
  detachModalOpen.value = true
}

async function confirmDetachSeason() {
  if (!detachTarget.value) return
  detaching.value = true
  try {
    await competitionStore.detachSeason(
      detachTarget.value.comp.id,
      detachTarget.value.season.id,
      activeOrgId.value || undefined,
    )
    await tournamentStore.fetchTournaments({ limit: 100 })
    toast.add({ title: 'Edition detached from competition', color: 'neutral' })
    detachModalOpen.value = false
  } catch (err: any) {
    handleError(err, { title: 'Failed to detach edition' })
  } finally {
    detaching.value = false
  }
}

// Start New Season Modal
const startSeasonOpen = ref(false)
const startSeasonSource = ref<{ id: string; name?: string | null; seasonName?: string | null } | null>(null)

function openStartNewSeason(comp: Competition) {
  const source = getActiveEdition(comp)
  if (!source) {
    openAttachModal(comp)
    return
  }
  startSeasonSource.value = {
    id: source.id,
    name: source.name,
    seasonName: source.seasonName,
  }
  startSeasonOpen.value = true
}
</script>

<template>
  <div class="flex flex-col gap-5 sm:gap-6 max-w-6xl mx-auto">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-heading tracking-tight">
          Competitions
        </h1>
        <p class="text-sm text-body mt-1 tabular-nums">
          {{ orgCompetitions.length }} {{ orgCompetitions.length === 1 ? 'series' : 'series' }}
          <span aria-hidden="true">·</span>
          {{ totalEditionsCount }} {{ totalEditionsCount === 1 ? 'edition' : 'editions' }}
          <span aria-hidden="true">·</span>
          {{ totalFollowersCount }} {{ totalFollowersCount === 1 ? 'follower' : 'followers' }}
        </p>
      </div>

      <div v-if="activeOrgId" class="flex items-center gap-2.5">
        <UButton
          color="primary"
          size="sm"
          icon="i-heroicons-plus"
          label="New Competition"
          class="font-semibold"
          @click="openCreateModal"
        />
      </div>
    </div>

    <!-- Search & Sport Filter Toolbar -->
    <div v-if="activeOrgId && orgCompetitions.length > 0" class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      <div class="relative flex-1">
        <UIcon
          name="i-heroicons-magnifying-glass"
          class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
        />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search competition series by name or slug..."
          class="w-full pl-10 pr-9 py-2 bg-white dark:bg-gray-900 border border-subtle rounded-xl text-sm text-heading placeholder:text-muted focus:outline-none focus:border-emerald-500 transition-colors"
        />
        <button
          v-if="searchQuery"
          type="button"
          aria-label="Clear search"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-heading"
          @click="searchQuery = ''"
        >
          <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
        </button>
      </div>

      <div v-if="availableSports.length > 2" class="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <button
          v-for="sp in availableSports"
          :key="sp"
          type="button"
          class="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors shrink-0 cursor-pointer"
          :class="selectedSport === sp
            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
            : 'bg-surface border border-subtle text-body hover:text-heading'"
          @click="selectedSport = sp"
        >
          {{ sp }}
        </button>
      </div>
    </div>

    <!-- No Active Organization -->
    <div
      v-if="!activeOrgId"
      class="flex flex-col items-center text-center bg-surface border border-subtle rounded-2xl px-6 py-14"
    >
      <div class="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
        <UIcon name="i-heroicons-building-office" class="w-8 h-8 text-emerald-500" />
      </div>
      <h2 class="text-lg font-semibold text-heading mb-1.5">No active workspace</h2>
      <p class="text-sm text-muted max-w-sm mb-6">
        Select or create an organization workspace first to manage competition series.
      </p>
      <UButton to="/organizations" color="primary" size="sm" label="Go to Organizations" />
    </div>

    <!-- Loading Skeleton -->
    <div v-else-if="orgLoading && orgCompetitions.length === 0" class="flex flex-col gap-3.5">
      <div
        v-for="i in 3"
        :key="i"
        class="h-36 bg-white dark:bg-gray-900 border border-subtle rounded-2xl p-5 animate-pulse"
      />
    </div>

    <!-- Error Banner -->
    <div
      v-else-if="fetchError && orgCompetitions.length === 0"
      class="bg-red-500/5 border border-red-500/20 rounded-2xl p-8 text-center"
    >
      <UIcon name="i-heroicons-exclamation-triangle" class="w-8 h-8 text-red-500 mx-auto mb-2" />
      <p class="text-sm font-semibold text-heading">Unable to load competitions</p>
      <p class="text-xs text-body mt-1 mb-4">Check your connection and try again.</p>
      <UButton size="xs" color="neutral" variant="outline" label="Retry" @click="loadData" />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="orgCompetitions.length === 0"
      class="flex flex-col items-center text-center bg-white dark:bg-gray-900 border border-subtle rounded-2xl px-6 py-14"
    >
      <div class="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
        <UIcon name="i-heroicons-rectangle-stack" class="w-8 h-8 text-emerald-500" />
      </div>
      <h2 class="text-lg font-semibold text-heading mb-1.5">No competition series yet</h2>
      <p class="text-sm text-muted max-w-md mb-6">
        Group recurring seasons under a permanent public hub (<code class="text-xs font-mono">/c/your-league</code>) so fans follow once across every edition and past editions stay easy to browse.
      </p>
      <UButton
        color="primary"
        size="sm"
        icon="i-heroicons-plus"
        label="Create First Competition"
        class="font-semibold"
        @click="openCreateModal"
      />
    </div>

    <!-- Competitions List -->
    <div v-else class="flex flex-col gap-4">
      <div
        v-for="comp in filteredCompetitions"
        :key="comp.id"
        class="bg-white dark:bg-gray-900 border border-subtle rounded-2xl overflow-hidden transition-colors"
      >
        <!-- Optional Banner Strip -->
        <div
          v-if="comp.bannerUrl"
          class="h-16 w-full relative overflow-hidden bg-gray-100 dark:bg-black/40 border-b border-subtle"
        >
          <img :src="comp.bannerUrl" :alt="comp.name" class="w-full h-full object-cover opacity-50" />
          <div class="absolute inset-0 bg-gradient-to-t from-white dark:from-gray-900 to-transparent" />
        </div>

        <!-- Card Body -->
        <div class="p-4 sm:p-5">
          <div class="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <!-- Left Identity -->
            <div class="flex items-start gap-3.5 min-w-0 flex-1">
              <div class="w-12 h-12 rounded-xl overflow-hidden bg-surface border border-subtle shrink-0 flex items-center justify-center p-1">
                <img
                  v-if="comp.logoUrl"
                  :src="comp.logoUrl"
                  :alt="comp.name"
                  class="w-full h-full object-contain"
                />
                <span v-else class="text-base font-black text-heading">
                  {{ comp.name.charAt(0).toUpperCase() }}
                </span>
              </div>

              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <h2 class="text-base font-bold text-heading truncate">
                    {{ comp.name }}
                  </h2>
                  <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                    {{ comp.sport }}
                  </span>

                  <!-- Copyable slug pill -->
                  <button
                    type="button"
                    :title="`Copy ${frontendUrl}/c/${comp.slug}`"
                    :aria-label="`Copy public URL for ${comp.name}`"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface border border-subtle font-mono text-[11px] text-muted hover:text-heading transition-colors cursor-pointer"
                    @click="copyPublicSlugUrl(comp)"
                  >
                    <span>/c/{{ comp.slug }}</span>
                    <UIcon name="i-heroicons-clipboard-document" class="w-3 h-3" />
                  </button>
                </div>

                <p v-if="comp.description" class="text-xs text-body mt-1 line-clamp-2">
                  {{ comp.description }}
                </p>

                <!-- Metrics Row -->
                <div class="mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs text-body tabular-nums">
                  <span class="inline-flex items-center gap-1">
                    <UIcon name="i-heroicons-users" class="w-3.5 h-3.5 text-muted" />
                    {{ comp._count?.followers ?? 0 }} {{ (comp._count?.followers ?? 0) === 1 ? 'follower' : 'followers' }}
                  </span>
                  <span aria-hidden="true" class="text-muted">·</span>
                  <span class="inline-flex items-center gap-1">
                    <UIcon name="i-heroicons-calendar" class="w-3.5 h-3.5 text-muted" />
                    {{ comp.seasons?.length ?? 0 }} {{ (comp.seasons?.length ?? 0) === 1 ? 'edition' : 'editions' }}
                  </span>
                  <span aria-hidden="true" class="text-muted">·</span>
                  <span
                    v-if="getActiveEdition(comp)"
                    class="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold"
                  >
                    <UIcon name="i-heroicons-check-circle" class="w-3.5 h-3.5" />
                    Active: {{ getEditionLabel(getActiveEdition(comp)!) }}
                  </span>
                  <span v-else class="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                    No editions linked yet
                  </span>
                </div>
              </div>
            </div>

            <!-- Right Actions -->
            <div class="flex items-center gap-2 flex-wrap shrink-0">
              <UButton
                size="xs"
                color="neutral"
                variant="outline"
                icon="i-heroicons-pencil-square"
                label="Edit Info"
                @click="openEditModal(comp)"
              />
              <UButton
                size="xs"
                color="neutral"
                variant="soft"
                icon="i-heroicons-link"
                label="Attach Tournament"
                @click="openAttachModal(comp)"
              />
              <UButton
                size="xs"
                color="primary"
                variant="soft"
                icon="i-heroicons-document-duplicate"
                :label="(comp.seasons?.length ?? 0) > 0 ? 'Start New Season' : 'Link First Edition'"
                @click="openStartNewSeason(comp)"
              />
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                icon="i-heroicons-arrow-top-right-on-square"
                label="Public Page"
                :to="toCompetition(comp)"
                external
                target="_blank"
              />
            </div>
          </div>

          <!-- Toggle Editions Bar -->
          <div class="mt-4 pt-3 border-t border-subtle flex items-center justify-between">
            <button
              type="button"
              :aria-expanded="expandedIds.has(comp.id)"
              :aria-controls="`editions-panel-${comp.id}`"
              class="inline-flex items-center gap-1.5 text-xs font-semibold text-body hover:text-heading transition-colors cursor-pointer"
              @click="toggleExpand(comp.id)"
            >
              <UIcon
                name="i-heroicons-chevron-down"
                class="w-4 h-4 transition-transform duration-200"
                :class="expandedIds.has(comp.id) ? 'rotate-180' : ''"
              />
              <span>
                {{ expandedIds.has(comp.id) ? 'Hide' : 'Show' }} Season Editions ({{ comp.seasons?.length ?? 0 }})
              </span>
            </button>
          </div>
        </div>

        <!-- Expandable Editions Drawer -->
        <div
          v-show="expandedIds.has(comp.id)"
          :id="`editions-panel-${comp.id}`"
          class="border-t border-subtle bg-surface/60 px-4 sm:px-5 py-3.5"
        >
          <div
            v-if="!comp.seasons || comp.seasons.length === 0"
            class="rounded-xl border border-dashed border-subtle p-5 text-center"
          >
            <p class="text-xs text-body mb-2.5">
              No tournament editions linked to <strong>{{ comp.name }}</strong> yet.
            </p>
            <UButton
              size="xs"
              color="primary"
              variant="soft"
              icon="i-heroicons-link"
              label="Attach Existing Tournament"
              @click="openAttachModal(comp)"
            />
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="season in comp.seasons"
              :key="season.id"
              class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border transition-colors"
              :class="season.isCurrentSeason
                ? 'bg-emerald-500/[0.04] border-emerald-500/25 dark:border-emerald-500/30'
                : 'bg-white dark:bg-gray-900/70 border-subtle'"
            >
              <!-- Edition Info -->
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <span
                  class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  :class="season.isCurrentSeason
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-surface text-muted'"
                >
                  <UIcon
                    :name="season.isCurrentSeason ? 'i-heroicons-check-circle' : 'i-heroicons-calendar'"
                    class="w-4 h-4"
                  />
                </span>

                <div class="min-w-0 flex-1">
                  <!-- Inline Season Label Editor -->
                  <div v-if="editingSeasonId === season.id" class="flex items-center gap-1.5 max-w-xs">
                    <UInput
                      v-model="editingSeasonLabel"
                      size="xs"
                      placeholder="e.g. 2025/26"
                      class="flex-1"
                      @keydown.enter.prevent="saveSeasonLabel(comp, season)"
                      @keydown.esc.prevent="cancelEditSeasonLabel"
                    />
                    <UButton
                      size="xs"
                      color="primary"
                      icon="i-heroicons-check"
                      aria-label="Save season label"
                      :loading="savingSeasonLabel"
                      @click="saveSeasonLabel(comp, season)"
                    />
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="i-heroicons-x-mark"
                      aria-label="Cancel editing season label"
                      @click="cancelEditSeasonLabel"
                    />
                  </div>

                  <!-- Display Mode -->
                  <div v-else class="flex items-center gap-2 flex-wrap">
                    <span class="text-sm font-bold text-heading truncate">
                      {{ getEditionLabel(season) }}
                    </span>
                    <span
                      v-if="season.name !== getEditionLabel(season)"
                      class="text-xs text-body truncate"
                    >
                      · {{ season.name }}
                    </span>
                    <UBadge
                      v-if="season.isCurrentSeason"
                      color="success"
                      variant="subtle"
                      size="xs"
                      label="Active Season"
                    />
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border"
                      :class="getEditionStatusMeta(season.status).badgeClass"
                    >
                      {{ getEditionStatusMeta(season.status).label }}
                    </span>
                    <span
                      class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-surface border border-subtle text-muted"
                    >
                      {{ season.visibility }}
                    </span>
                  </div>

                  <p class="text-xs text-muted mt-0.5 tabular-nums">
                    {{ formatEditionDateRange(season.start_date, season.end_date) }}
                    <template v-if="season._count?.participants != null">
                      · {{ season._count.participants }} participants
                    </template>
                  </p>
                </div>
              </div>

              <!-- Edition Actions -->
              <div class="flex items-center gap-1.5 flex-wrap shrink-0">
                <UButton
                  v-if="!season.isCurrentSeason"
                  size="xs"
                  color="primary"
                  variant="subtle"
                  icon="i-heroicons-star"
                  label="Set Active"
                  :loading="settingActiveEditionId === season.id"
                  @click="handleSetActiveEdition(comp, season)"
                />
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-tag"
                  title="Edit season label"
                  aria-label="Edit season label"
                  @click="startEditSeasonLabel(season)"
                />
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-arrow-top-right-on-square"
                  label="Open"
                  :to="`/tournaments/${season.customName || season.id}`"
                />
                <UButton
                  size="xs"
                  color="error"
                  variant="ghost"
                  icon="i-heroicons-link-slash"
                  title="Detach from competition"
                  aria-label="Detach edition from competition"
                  @click="promptDetachSeason(comp, season)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create / Edit Competition Modal -->
    <UModal v-model:open="formModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-base font-bold text-heading">
                  {{ editingCompetition ? 'Edit Competition Series' : 'New Competition Series' }}
                </h3>
                <p class="text-xs text-muted mt-0.5">
                  Group recurring tournament editions under a permanent public series page.
                </p>
              </div>
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-heroicons-x-mark"
                aria-label="Close modal"
                @click="formModalOpen = false"
              />
            </div>
          </template>

          <form class="space-y-4" @submit.prevent="saveCompetition">
            <UFormField label="Competition name" required>
              <UInput
                v-model="compForm.name"
                placeholder="e.g. Jot League"
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Public URL slug"
              required
              :help="`${frontendUrl}/c/${compForm.slug || 'your-slug'}`"
            >
              <UInput
                v-model="compForm.slug"
                placeholder="jot-league"
                class="w-full font-mono"
                @input="slugManuallyEdited = true"
              />
            </UFormField>

            <UFormField label="Sport" required>
              <USelect
                v-model="compForm.sport"
                :items="sportOptions"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Description">
              <UTextarea
                v-model="compForm.description"
                :rows="3"
                autoresize
                placeholder="Shown on the public /c/:slug About tab..."
                class="w-full"
              />
            </UFormField>

            <!-- Branding Uploads -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <!-- Logo -->
              <div>
                <span class="block text-xs font-semibold text-heading mb-2">Series Logo</span>
                <div class="flex items-center gap-3">
                  <div class="w-14 h-14 rounded-xl border border-subtle bg-surface overflow-hidden flex items-center justify-center shrink-0 p-1">
                    <img
                      v-if="compForm.logoUrl"
                      :src="compForm.logoUrl"
                      alt="Logo preview"
                      class="w-full h-full object-contain"
                    />
                    <UIcon v-else name="i-heroicons-trophy" class="w-6 h-6 text-muted" />
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <input
                      ref="logoInputRef"
                      type="file"
                      accept="image/*"
                      class="hidden"
                      @change="handleImageUpload($event, 'logoUrl')"
                    />
                    <UButton
                      type="button"
                      size="xs"
                      color="neutral"
                      variant="outline"
                      icon="i-heroicons-camera"
                      :label="compForm.logoUrl ? 'Change Logo' : 'Upload Logo'"
                      :loading="uploadingLogo"
                      @click="logoInputRef?.click()"
                    />
                    <UButton
                      v-if="compForm.logoUrl"
                      type="button"
                      size="xs"
                      color="error"
                      variant="ghost"
                      label="Remove"
                      @click="compForm.logoUrl = ''"
                    />
                  </div>
                </div>
              </div>

              <!-- Banner -->
              <div>
                <span class="block text-xs font-semibold text-heading mb-2">Cover Banner</span>
                <div class="flex flex-col gap-2">
                  <div
                    v-if="compForm.bannerUrl"
                    class="h-14 w-full rounded-xl border border-subtle overflow-hidden relative"
                  >
                    <img :src="compForm.bannerUrl" alt="Banner preview" class="w-full h-full object-cover" />
                  </div>
                  <div class="flex items-center gap-2">
                    <input
                      ref="bannerInputRef"
                      type="file"
                      accept="image/*"
                      class="hidden"
                      @change="handleImageUpload($event, 'bannerUrl')"
                    />
                    <UButton
                      type="button"
                      size="xs"
                      color="neutral"
                      variant="outline"
                      icon="i-heroicons-photo"
                      :label="compForm.bannerUrl ? 'Change Banner' : 'Upload Banner'"
                      :loading="uploadingBanner"
                      @click="bannerInputRef?.click()"
                    />
                    <UButton
                      v-if="compForm.bannerUrl"
                      type="button"
                      size="xs"
                      color="error"
                      variant="ghost"
                      label="Remove"
                      @click="compForm.bannerUrl = ''"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t border-subtle">
              <UButton
                type="button"
                color="neutral"
                variant="ghost"
                label="Cancel"
                @click="formModalOpen = false"
              />
              <UButton
                type="submit"
                color="primary"
                :label="editingCompetition ? 'Save Changes' : 'Create Competition'"
                :loading="savingCompetition"
              />
            </div>
          </form>
        </UCard>
      </template>
    </UModal>

    <!-- Attach Existing Tournament Modal -->
    <UModal v-model:open="attachModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-base font-bold text-heading">
                  Attach Tournament to {{ attachTargetComp?.name }}
                </h3>
                <p class="text-xs text-muted mt-0.5">
                  Link an existing tournament in your workspace as a season edition of this series.
                </p>
              </div>
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-heroicons-x-mark"
                aria-label="Close modal"
                @click="attachModalOpen = false"
              />
            </div>
          </template>

          <form class="space-y-4" @submit.prevent="submitAttachSeason">
            <UFormField label="Select tournament" required>
              <select
                v-model="attachForm.tournamentId"
                class="w-full px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-subtle text-sm text-heading focus:outline-none focus:border-emerald-500"
              >
                <option value="" disabled>Choose a tournament...</option>
                <option
                  v-for="t in attachableTournaments"
                  :key="t.id"
                  :value="t.id"
                >
                  {{ t.name }} ({{ formatEditionDateRange(t.start_date, t.end_date) || t.sport }})
                </option>
              </select>
              <p v-if="attachableTournaments.length === 0" class="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
                All tournaments in this workspace are already attached to this competition.
              </p>
            </UFormField>

            <UFormField
              label="Season label"
              help="Shown in the public season switcher and editions tab (e.g. 2024/25, 2026 Edition, Season 3)"
            >
              <UInput
                v-model="attachForm.seasonName"
                placeholder="e.g. 2025/26"
                class="w-full"
              />
            </UFormField>

            <UCheckbox
              v-model="attachForm.setAsCurrent"
              label="Set as the active default edition for public visitors"
            />

            <div class="flex justify-end gap-2 pt-3 border-t border-subtle">
              <UButton
                type="button"
                color="neutral"
                variant="ghost"
                label="Cancel"
                @click="attachModalOpen = false"
              />
              <UButton
                type="submit"
                color="primary"
                icon="i-heroicons-link"
                label="Attach Edition"
                :disabled="!attachForm.tournamentId"
                :loading="attaching"
              />
            </div>
          </form>
        </UCard>
      </template>
    </UModal>

    <!-- Detach Confirmation Modal -->
    <UModal v-model:open="detachModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="text-base font-bold text-heading">Detach Edition</h3>
          </template>
          <p class="text-sm text-body">
            Detach <strong>{{ detachTarget ? getEditionLabel(detachTarget.season) : '' }}</strong> from
            <strong>{{ detachTarget?.comp.name }}</strong>? The tournament itself will not be deleted and will remain accessible as a standalone tournament.
          </p>
          <div class="flex justify-end gap-2 mt-5 pt-3 border-t border-subtle">
            <UButton
              color="neutral"
              variant="ghost"
              label="Cancel"
              @click="detachModalOpen = false"
            />
            <UButton
              color="error"
              label="Detach Edition"
              :loading="detaching"
              @click="confirmDetachSeason"
            />
          </div>
        </UCard>
      </template>
    </UModal>

    <!-- Start New Season Modal -->
    <TournamentStartSeasonModal
      v-model:open="startSeasonOpen"
      :source-tournament="startSeasonSource"
    />
  </div>
</template>
