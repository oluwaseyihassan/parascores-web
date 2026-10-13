<script setup lang="ts">
import { storeToRefs } from 'pinia'
import type { Tournament } from '~/types'
import { TournamentType } from '~/types'

definePageMeta({
  middleware: ['require-organizer'],
  layout: 'dashboard'
})

const tournamentStore = useTournamentStore()
const { tournaments, loading: tournamentsLoading } = storeToRefs(tournamentStore)

// Widget config
const selectedTournamentId = ref<string>('')
const selectedWidgetType = ref<'fixtures' | 'standings' | 'bracket' | 'stats'>('fixtures')
const widgetTheme = ref<'dark' | 'light'>('dark')
const widgetWidth = ref(400)
const widgetHeight = ref(600)
const copiedEmbed = ref(false)
const copiedLink = ref(false)
// Once the user edits dimensions manually, type-switching stops suggesting presets
const sizeCustomized = ref(false)

const route = useRoute()
const toast = useToast()

// Fetch tournaments
onMounted(async () => {
  if (tournaments.value.length === 0) {
    await tournamentStore.fetchTournaments({ limit: 50 })
  }

  // Auto-select tournament from query parameter or default to first
  const queryTournament = (route.query.t || route.query.tournament) as string | undefined
  if (queryTournament) {
    const matched = tournaments.value.find(t => t.id === queryTournament || t.customName === queryTournament)
    if (matched) {
      selectedTournamentId.value = matched.id
    } else {
      // Invalid query param provided
      toast.add({
        id: 'invalid-tournament-query',
        title: 'Tournament Not Found',
        description: 'The requested tournament link was invalid. Defaulting to your first tournament.',
        color: 'error',
        icon: 'i-heroicons-exclamation-triangle'
      })
    }
  }

  if (tournaments.value.length > 0 && !selectedTournamentId.value) {
    selectedTournamentId.value = tournaments.value[0]?.id ?? ''
  }
})

const selectedTournament = computed(() => {
  return tournaments.value.find(t => t.id === selectedTournamentId.value) || null
})

const tournamentMetaLine = computed(() => {
  const t = selectedTournament.value
  if (!t) return ''
  return `${t.type?.replace(/_/g, ' ').toLowerCase()} · ${String(t.visibility).toLowerCase()}`
})

// Widget type options based on tournament type
const widgetTypes = computed(() => {
  const types = [
    { label: 'Fixtures', value: 'fixtures', icon: 'i-heroicons-calendar-days', description: 'Live scores & schedule' }
  ]

  const t = selectedTournament.value
  if (t) {
    // Standings available for Round Robin, Group, Hybrid
    if ([TournamentType.ROUND_ROBIN, TournamentType.GROUP, TournamentType.HYBRID].includes(t.type)) {
      types.push({ label: 'Standings', value: 'standings', icon: 'i-heroicons-chart-bar', description: 'League table & groups' })
    }
    // Bracket available for Knockout, Hybrid
    if ([TournamentType.KNOCKOUT, TournamentType.HYBRID].includes(t.type)) {
      types.push({ label: 'Bracket', value: 'bracket', icon: 'i-heroicons-squares-2x2', description: 'Knockout bracket view' })
    }
    // Player Stats available for Team tournaments
    if (t.participantType === 'TEAM') {
      types.push({ label: 'Player Stats', value: 'stats', icon: 'i-heroicons-star', description: 'Top goals and assists' })
    }
  }

  return types
})

// Tournament select items
const tournamentItems = computed(() => {
  return tournaments.value.map(t => ({
    label: t.name,
    value: t.id
  }))
})

// Size presets (per-type suggestion applied until the user customizes)
const sizePresets = [
  { key: 'portrait', label: 'Portrait', width: 400, height: 600 },
  { key: 'wide', label: 'Wide', width: 640, height: 420 },
  { key: 'tall', label: 'Tall', width: 380, height: 720 },
] as const

const typePresetKey: Record<string, (typeof sizePresets)[number]['key']> = {
  fixtures: 'portrait',
  standings: 'tall',
  bracket: 'wide',
  stats: 'portrait',
}

const activePresetKey = computed(() => {
  const match = sizePresets.find(p => p.width === widgetWidth.value && p.height === widgetHeight.value)
  return match?.key ?? 'custom'
})

const applyPreset = (preset: (typeof sizePresets)[number]) => {
  widgetWidth.value = preset.width
  widgetHeight.value = preset.height
  sizeCustomized.value = false
}

watch([widgetWidth, widgetHeight], () => {
  // Editing the inputs directly counts as customizing
  if (activePresetKey.value === 'custom') sizeCustomized.value = true
})

// Build widget URL
const widgetBaseUrl = computed(() => {
  const protocol = import.meta.dev ? 'http' : 'https'
  const host = import.meta.client ? window.location.host.replace(/^manage-dev\./, window.location.host.includes('lvh.me') ? '' : 'dev.').replace(/^manage\./, '') : 'parascores.com'
  return `${protocol}://${host}`
})

const widgetUrl = computed(() => {
  if (!selectedTournamentId.value || !selectedTournament.value) return ''
  const urlId = selectedTournament.value.customName || selectedTournament.value.id

  const params = new URLSearchParams()
  if (widgetTheme.value !== 'dark') params.set('theme', widgetTheme.value)
  const queryString = params.toString()
  return `${widgetBaseUrl.value}/widget/${urlId}/${selectedWidgetType.value}${queryString ? '?' + queryString : ''}`
})

const demoWidgetUrl = computed(() => {
  const params = new URLSearchParams()
  if (widgetTheme.value !== 'dark') params.set('theme', widgetTheme.value)
  const queryString = params.toString()
  return `${widgetBaseUrl.value}/widget/oau-supremacy-2026/${selectedWidgetType.value}${queryString ? '?' + queryString : ''}`
})

// Preview uses the real tournament when selected, else the public demo
const previewUrl = computed(() => selectedTournamentId.value ? widgetUrl.value : demoWidgetUrl.value)

const widgetTypeLabel = computed(() => {
  return widgetTypes.value.find(t => t.value === selectedWidgetType.value)?.label || 'Fixtures'
})

// Generate embed code
const embedCode = computed(() => {
  if (!widgetUrl.value) return ''
  return `<iframe src="${widgetUrl.value}" width="${widgetWidth.value}" height="${widgetHeight.value}" frameborder="0" style="border-radius: 12px; overflow: hidden;" title="ParaScores Widget"></iframe>`
})

// Syntax-tinted display copy (escaped; copy always uses the raw embedCode)
const embedCodeHtml = computed(() => {
  if (!embedCode.value) return ''
  const esc = embedCode.value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return esc
    .replace(/(&lt;\/?)([a-zA-Z]+)/g, '$1<span class="text-sky-400">$2</span>')
    .replace(/([a-zA-Z-]+)=(&quot;|")([^"]*)("|$)/g, '<span class="text-violet-400">$1</span>=<span class="text-emerald-400">$2$3$4</span>')
})

const copyText = async (text: string, flag: typeof copiedEmbed) => {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // Fallback
    const el = document.createElement('textarea')
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  }
  flag.value = true
  setTimeout(() => { flag.value = false }, 2000)
}

const copyEmbedCode = () => copyText(embedCode.value, copiedEmbed)
const copyWidgetLink = () => copyText(widgetUrl.value, copiedLink)

// Reset widget type when tournament changes
watch(selectedTournamentId, () => {
  const availableTypes = widgetTypes.value.map(t => t.value)
  if (!availableTypes.includes(selectedWidgetType.value)) {
    selectedWidgetType.value = 'fixtures'
  }
})

// Suggest a fitting size preset when the widget type changes
watch(selectedWidgetType, (type) => {
  if (sizeCustomized.value) return
  const preset = sizePresets.find(p => p.key === typePresetKey[type])
  if (preset) applyPreset(preset)
})

// Preview scale-to-fit (iframe stays at real pixel size; the frame scales)
const stageRef = ref<HTMLElement | null>(null)
const stageWidth = ref(0)
let stageObserver: ResizeObserver | null = null

onMounted(() => {
  if (stageRef.value) {
    stageWidth.value = stageRef.value.clientWidth
    stageObserver = new ResizeObserver((entries) => {
      stageWidth.value = entries[0]?.contentRect.width ?? stageWidth.value
    })
    stageObserver.observe(stageRef.value)
  }
})

onUnmounted(() => {
  stageObserver?.disconnect()
})

const previewScale = computed(() => {
  if (!stageWidth.value) return 1
  return Math.min(1, (stageWidth.value - 40) / widgetWidth.value)
})
</script>

<template>
  <div class="max-w-6xl mx-auto">
    <div class="grid lg:grid-cols-[380px_minmax(0,1fr)] gap-4 items-start">

      <!-- ═══ Config rail ═══ -->
      <div class="flex flex-col gap-3">

        <!-- Tournament -->
        <section class="bg-surface border border-subtle rounded-2xl overflow-hidden">
          <header class="flex items-center gap-2.5 px-4 py-3 border-b border-subtle">
            <span class="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <UIcon name="i-heroicons-trophy" class="w-3.5 h-3.5" />
            </span>
            <h2 class="text-[13px] font-bold text-heading">Tournament</h2>
            <span v-if="tournamentMetaLine" class="ml-auto text-[11px] text-muted capitalize truncate">{{ tournamentMetaLine }}</span>
          </header>
          <div class="p-4">
            <USelectMenu
              v-model="selectedTournamentId"
              :items="tournamentItems"
              placeholder="Choose a tournament…"
              value-key="value"
              class="w-full"
              :loading="tournamentsLoading"
              searchable
            />
          </div>
        </section>

        <!-- Widget type -->
        <section class="bg-surface border border-subtle rounded-2xl overflow-hidden">
          <header class="flex items-center gap-2.5 px-4 py-3 border-b border-subtle">
            <span class="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <UIcon name="i-heroicons-squares-2x2" class="w-3.5 h-3.5" />
            </span>
            <h2 class="text-[13px] font-bold text-heading">Widget</h2>
            <span class="ml-auto text-[11px] text-muted">Options adapt to the format</span>
          </header>
          <div class="p-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                v-for="type in widgetTypes"
                :key="type.value"
                type="button"
                class="flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all"
                :class="selectedWidgetType === type.value
                  ? 'border-emerald-500/50 bg-emerald-500/[0.08]'
                  : 'border-subtle bg-black/[0.02] dark:bg-white/[0.03] hover:border-white/[0.16]'"
                :aria-pressed="selectedWidgetType === type.value"
                @click="selectedWidgetType = type.value as 'fixtures' | 'standings' | 'bracket' | 'stats'"
              >
                <span
                  class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                  :class="selectedWidgetType === type.value
                    ? 'bg-emerald-500/15 text-emerald-500'
                    : 'bg-black/5 dark:bg-white/[0.07] text-muted'"
                >
                  <UIcon :name="type.icon" class="w-4 h-4" />
                </span>
                <span class="min-w-0">
                  <span class="block text-xs font-bold text-heading">{{ type.label }}</span>
                  <span class="block text-[10px] text-muted truncate">{{ type.description }}</span>
                </span>
              </button>
            </div>
          </div>
        </section>

        <!-- Appearance -->
        <section class="bg-surface border border-subtle rounded-2xl overflow-hidden">
          <header class="flex items-center gap-2.5 px-4 py-3 border-b border-subtle">
            <span class="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <UIcon name="i-heroicons-paint-brush" class="w-3.5 h-3.5" />
            </span>
            <h2 class="text-[13px] font-bold text-heading">Appearance</h2>
          </header>
          <div class="p-4 flex flex-col gap-4">
            <!-- Theme -->
            <div class="flex items-center gap-1 bg-black/[0.03] dark:bg-white/[0.04] border border-subtle p-0.5 rounded-lg">
              <button
                type="button"
                class="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-[11.5px] font-bold transition-all"
                :class="widgetTheme === 'dark' ? 'bg-emerald-500 text-white shadow-sm' : 'text-muted hover:text-heading'"
                :aria-pressed="widgetTheme === 'dark'"
                @click="widgetTheme = 'dark'"
              >
                <UIcon name="i-heroicons-moon" class="w-3.5 h-3.5" />
                Dark
              </button>
              <button
                type="button"
                class="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-[11.5px] font-bold transition-all"
                :class="widgetTheme === 'light' ? 'bg-emerald-500 text-white shadow-sm' : 'text-muted hover:text-heading'"
                :aria-pressed="widgetTheme === 'light'"
                @click="widgetTheme = 'light'"
              >
                <UIcon name="i-heroicons-sun" class="w-3.5 h-3.5" />
                Light
              </button>
            </div>

            <!-- Size presets + custom -->
            <div>
              <div class="flex flex-wrap gap-1.5 mb-2.5">
                <button
                  v-for="preset in sizePresets"
                  :key="preset.key"
                  type="button"
                  class="px-2.5 py-1 text-[10.5px] font-bold rounded-full border transition-all"
                  :class="activePresetKey === preset.key
                    ? 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/[0.08]'
                    : 'border-subtle text-muted hover:text-heading hover:border-white/[0.16]'"
                  @click="applyPreset(preset)"
                >
                  {{ preset.label }} · {{ preset.width }}×{{ preset.height }}
                </button>
                <button
                  type="button"
                  class="px-2.5 py-1 text-[10.5px] font-bold rounded-full border transition-all"
                  :class="activePresetKey === 'custom'
                    ? 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/[0.08]'
                    : 'border-subtle text-muted hover:text-heading hover:border-white/[0.16]'"
                  @click="sizeCustomized = true"
                >
                  Custom
                </button>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <UInput v-model.number="widgetWidth" type="number" :min="200" :max="1200">
                  <template #leading><span class="text-[10px] font-bold text-muted">W</span></template>
                  <template #trailing><span class="text-[10px] text-muted">px</span></template>
                </UInput>
                <UInput v-model.number="widgetHeight" type="number" :min="200" :max="1200">
                  <template #leading><span class="text-[10px] font-bold text-muted">H</span></template>
                  <template #trailing><span class="text-[10px] text-muted">px</span></template>
                </UInput>
              </div>
            </div>
          </div>
        </section>

        <!-- Share -->
        <section v-if="selectedTournamentId" class="bg-surface border border-subtle rounded-2xl overflow-hidden">
          <header class="flex items-center gap-2.5 px-4 py-3 border-b border-subtle">
            <span class="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <UIcon name="i-heroicons-link" class="w-3.5 h-3.5" />
            </span>
            <h2 class="text-[13px] font-bold text-heading">Share</h2>
          </header>
          <div class="p-4 flex flex-col gap-3">
            <!-- Direct link -->
            <div class="flex items-center gap-1.5 bg-black/[0.03] dark:bg-white/[0.04] border border-subtle rounded-lg pl-3 pr-1.5 py-1.5">
              <span class="flex-1 min-w-0 font-mono text-[11px] text-muted truncate select-all">{{ widgetUrl }}</span>
              <UButton
                size="xs"
                variant="ghost"
                color="neutral"
                :icon="copiedLink ? 'i-heroicons-check' : 'i-heroicons-clipboard-document'"
                aria-label="Copy link"
                @click="copyWidgetLink"
              />
              <UButton
                size="xs"
                variant="ghost"
                color="neutral"
                icon="i-heroicons-arrow-top-right-on-square"
                aria-label="Open in new tab"
                :to="widgetUrl"
                target="_blank"
              />
            </div>

            <!-- Embed code -->
            <pre
              class="font-mono text-[10.5px] leading-relaxed p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-all bg-black/[0.03] dark:bg-black/40 text-muted border border-subtle"
              aria-label="Embed code"
              v-html="embedCodeHtml"
            ></pre>

            <div class="flex gap-2">
              <UButton
                color="primary"
                class="flex-1 font-bold"
                :icon="copiedEmbed ? 'i-heroicons-check' : 'i-heroicons-clipboard-document'"
                @click="copyEmbedCode"
              >
                {{ copiedEmbed ? 'Copied!' : 'Copy embed code' }}
              </UButton>
              <UButton
                variant="outline"
                color="neutral"
                class="font-bold"
                :icon="copiedLink ? 'i-heroicons-check' : 'i-heroicons-link'"
                @click="copyWidgetLink"
              >
                {{ copiedLink ? 'Copied!' : 'Copy link' }}
              </UButton>
            </div>
            <p class="text-[10.5px] text-muted leading-relaxed">
              Embed for websites · bare link for OBS / stream overlays. Data updates live — no refresh needed.
            </p>
          </div>
        </section>
      </div>

      <!-- ═══ Preview ═══ -->
      <section class="bg-surface border border-subtle rounded-2xl overflow-hidden lg:sticky lg:top-4">
        <header class="flex items-center gap-2.5 px-4 py-3 border-b border-subtle">
          <span class="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <UIcon name="i-heroicons-eye" class="w-3.5 h-3.5" />
          </span>
          <h2 class="text-[13px] font-bold text-heading">Preview</h2>
          <div class="ml-auto flex items-center gap-1.5">
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/[0.07] text-body">{{ widgetTypeLabel }}</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/[0.07] text-body tabular-nums">{{ widgetWidth }} × {{ widgetHeight }}</span>
            <span class="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
              <span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
              Live data
            </span>
          </div>
        </header>

        <!-- Demo notice when no tournament is selected -->
        <div
          v-if="!selectedTournamentId"
          class="flex items-center gap-2 px-4 py-2.5 border-b border-subtle bg-emerald-500/[0.06] text-[11px] font-semibold text-emerald-600 dark:text-emerald-400"
        >
          <UIcon name="i-heroicons-sparkles" class="w-3.5 h-3.5 shrink-0" />
          Live demo — OAU Supremacy Cup. Select a tournament to preview yours.
        </div>

        <!-- Stage -->
        <div
          ref="stageRef"
          class="relative overflow-hidden border-b border-subtle p-5 flex justify-center"
          style="background-image: radial-gradient(rgba(128,128,128,0.16) 1px, transparent 1px); background-size: 14px 14px;"
        >
          <div
            class="shrink-0"
            :style="{
              width: Math.round(widgetWidth * previewScale) + 'px',
              height: Math.round(widgetHeight * previewScale) + 'px',
            }"
          >
            <div
              class="rounded-xl overflow-hidden border shadow-xl dark:shadow-black/50"
              :class="widgetTheme === 'dark' ? 'border-white/10' : 'border-gray-300'"
              :style="{
                width: widgetWidth + 'px',
                height: widgetHeight + 'px',
                transform: `scale(${previewScale})`,
                transformOrigin: 'top left',
              }"
            >
              <iframe
                v-if="previewUrl"
                :src="previewUrl"
                class="w-full h-full"
                frameborder="0"
                title="Widget Preview"
              />
            </div>
          </div>
        </div>

        <footer class="flex items-center justify-between gap-3 px-4 py-3">
          <span class="text-[10.5px] text-muted">Shown at actual size · scaled to fit the panel</span>
          <UButton
            v-if="previewUrl"
            size="xs"
            variant="outline"
            color="neutral"
            icon="i-heroicons-arrow-top-right-on-square"
            label="Open in new tab"
            :to="previewUrl"
            target="_blank"
            class="font-bold"
          />
        </footer>
      </section>
    </div>
  </div>
</template>
