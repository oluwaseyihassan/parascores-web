<script setup lang="ts">
import { storeToRefs } from 'pinia'
import type { Tournament } from '~/types'
import { TournamentType } from '~/types'

definePageMeta({
  layout: 'dashboard'
})

const tournamentStore = useTournamentStore()
const { tournaments, loading: tournamentsLoading } = storeToRefs(tournamentStore)

// Widget config
const selectedTournamentId = ref<string>('')
const selectedWidgetType = ref<'fixtures' | 'standings' | 'bracket'>('fixtures')
const widgetTheme = ref<'dark' | 'light'>('dark')
const widgetWidth = ref(400)
const widgetHeight = ref(600)
const copied = ref(false)

// Fetch tournaments
onMounted(async () => {
  if (tournaments.value.length === 0) {
    await tournamentStore.fetchTournaments({ limit: 50 })
  }
  // Auto-select first tournament
  if (tournaments.value.length > 0 && !selectedTournamentId.value) {
    selectedTournamentId.value = tournaments.value[0]?.id ?? ''
  }
})

const selectedTournament = computed(() => {
  return tournaments.value.find(t => t.id === selectedTournamentId.value) || null
})

// Widget type options based on tournament type
const widgetTypes = computed(() => {
  const types = [
    { label: 'Fixtures', value: 'fixtures', icon: 'i-heroicons-calendar-days', description: 'Live scores & upcoming matches' }
  ]
  
  const t = selectedTournament.value
  if (t) {
    // Standings available for Round Robin, Group, Hybrid
    if ([TournamentType.ROUND_ROBIN, TournamentType.GROUP, TournamentType.HYBRID].includes(t.type)) {
      types.push({ label: 'Standings', value: 'standings', icon: 'i-heroicons-table-cells', description: 'League table & group standings' })
    }
    // Bracket available for Knockout, Hybrid
    if ([TournamentType.KNOCKOUT, TournamentType.HYBRID].includes(t.type)) {
      types.push({ label: 'Bracket', value: 'bracket', icon: 'i-heroicons-squares-2x2', description: 'Knockout bracket view' })
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

// Build widget URL
const widgetBaseUrl = computed(() => {
  const protocol = import.meta.dev ? 'http' : 'https'
  const host = import.meta.client ? window.location.host.replace(/^manage\./, '') : 'parascores.com'
  return `${protocol}://${host}`
})

const widgetUrl = computed(() => {
  if (!selectedTournamentId.value) return ''
  const params = new URLSearchParams()
  if (widgetTheme.value !== 'dark') params.set('theme', widgetTheme.value)
  const queryString = params.toString()
  return `${widgetBaseUrl.value}/widget/${selectedTournamentId.value}/${selectedWidgetType.value}${queryString ? '?' + queryString : ''}`
})

// Generate embed code
const embedCode = computed(() => {
  if (!widgetUrl.value) return ''
  return `<iframe src="${widgetUrl.value}" width="${widgetWidth.value}" height="${widgetHeight.value}" frameborder="0" style="border-radius: 12px; overflow: hidden;" title="ParaScores Widget"></iframe>`
})

const copyEmbedCode = async () => {
  if (!embedCode.value) return
  try {
    await navigator.clipboard.writeText(embedCode.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // Fallback
    const el = document.createElement('textarea')
    el.value = embedCode.value
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }
}

// Reset widget type when tournament changes
watch(selectedTournamentId, () => {
  const availableTypes = widgetTypes.value.map(t => t.value)
  if (!availableTypes.includes(selectedWidgetType.value)) {
    selectedWidgetType.value = 'fixtures'
  }
})
</script>

<template>
  <div class="max-w-5xl mx-auto">
    <!-- Page Header -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Widget Builder</h1>
      <p class="text-gray-500 mt-1">Embed live tournament data on your website</p>
    </div>

    <div class="grid lg:grid-cols-2 gap-8">
      <!-- Configuration Panel -->
      <div class="space-y-6">
        <!-- Tournament Select -->
        <div class="p-6 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <UIcon name="i-heroicons-trophy" class="w-4 h-4 text-indigo-500" />
            Select Tournament
          </h3>
          <USelect
            v-model="selectedTournamentId"
            :items="tournamentItems"
            placeholder="Choose a tournament..."
            value-key="value"
            class="w-full"
            :loading="tournamentsLoading"
          />
          <p v-if="selectedTournament" class="text-xs text-gray-400 mt-2">
            {{ selectedTournament.type?.replace('_', ' ') }} • 
            {{ selectedTournament.visibility }}
          </p>
        </div>

        <!-- Widget Type -->
        <div class="p-6 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <UIcon name="i-heroicons-squares-2x2" class="w-4 h-4 text-indigo-500" />
            Widget Type
          </h3>
          <div class="grid gap-2">
            <button
              v-for="type in widgetTypes"
              :key="type.value"
              class="flex items-center gap-3 p-3 rounded-lg border text-left transition-all"
              :class="selectedWidgetType === type.value 
                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400'
                : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 text-gray-700 dark:text-gray-300'"
              @click="selectedWidgetType = type.value as 'fixtures' | 'standings' | 'bracket'"
            >
              <UIcon :name="type.icon" class="w-5 h-5 flex-shrink-0" />
              <div>
                <p class="text-sm font-medium">{{ type.label }}</p>
                <p class="text-xs text-gray-400">{{ type.description }}</p>
              </div>
            </button>
          </div>
        </div>

        <!-- Appearance -->
        <div class="p-6 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <UIcon name="i-heroicons-paint-brush" class="w-4 h-4 text-indigo-500" />
            Appearance
          </h3>
          
          <div class="space-y-4">
            <!-- Theme -->
            <div>
              <label class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">Theme</label>
              <div class="flex gap-2">
                <button
                  class="flex-1 py-2 px-3 text-sm rounded-lg border transition-all"
                  :class="widgetTheme === 'dark' 
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500'
                    : 'border-gray-200 dark:border-white/10 text-gray-500'"
                  @click="widgetTheme = 'dark'"
                >
                  🌙 Dark
                </button>
                <button
                  class="flex-1 py-2 px-3 text-sm rounded-lg border transition-all"
                  :class="widgetTheme === 'light' 
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500'
                    : 'border-gray-200 dark:border-white/10 text-gray-500'"
                  @click="widgetTheme = 'light'"
                >
                  ☀️ Light
                </button>
              </div>
            </div>

            <!-- Dimensions -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">Width (px)</label>
                <UInput v-model.number="widgetWidth" type="number" :min="200" :max="1200" />
              </div>
              <div>
                <label class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">Height (px)</label>
                <UInput v-model.number="widgetHeight" type="number" :min="200" :max="1200" />
              </div>
            </div>
          </div>
        </div>

        <!-- Embed Code -->
        <div v-if="selectedTournamentId" class="p-6 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <UIcon name="i-heroicons-code-bracket" class="w-4 h-4 text-indigo-500" />
            Embed Code
          </h3>
          <div class="relative">
            <pre class="text-xs p-3 rounded-lg overflow-x-auto font-mono bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10">{{ embedCode }}</pre>
            <button
              class="absolute top-2 right-2 px-3 py-1 text-xs font-medium rounded-md transition-colors"
              :class="copied 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'"
              @click="copyEmbedCode"
            >
              {{ copied ? '✓ Copied!' : 'Copy' }}
            </button>
          </div>
          <p class="text-xs text-gray-400 mt-2">Paste this code into your website's HTML.</p>
        </div>
      </div>

      <!-- Preview Panel -->
      <div class="lg:sticky lg:top-4 lg:self-start">
        <div class="p-6 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <UIcon name="i-heroicons-eye" class="w-4 h-4 text-indigo-500" />
            Preview
          </h3>
          
          <div v-if="!selectedTournamentId" class="flex items-center justify-center py-16 text-center">
            <div>
              <UIcon name="i-heroicons-cursor-arrow-ripple" class="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p class="text-sm text-gray-400">Select a tournament to preview</p>
            </div>
          </div>

          <div v-else class="flex items-center justify-center">
            <div 
              class="rounded-xl overflow-hidden border shadow-lg"
              :class="widgetTheme === 'dark' ? 'border-white/10' : 'border-gray-200'"
              :style="{ width: Math.min(widgetWidth, 500) + 'px', height: widgetHeight + 'px' }"
            >
              <iframe 
                :src="widgetUrl" 
                class="w-full h-full"
                frameborder="0"
                title="Widget Preview"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
