<script setup lang="ts">
import { NIGERIAN_LOCATIONS } from '~/utils/nigerian-locations'
import type { ApiResponse } from '~/stores/auth'

interface LocationSuggestion {
  label: string
  lat: number | null
  lon: number | null
}

interface LocationItem {
  label: string
  value: string
  lat?: number | null
  lon?: number | null
}

const model = defineModel<string | null | undefined>({ default: '' })

const emit = defineEmits<{
  coordinates: [coords: { lat: number; lon: number } | null]
}>()

const searchTerm = ref('')
const remoteItems = ref<LocationItem[] | null>(null)
const searching = ref(false)

const staticItems: LocationItem[] = NIGERIAN_LOCATIONS.map((l) => ({
  label: l,
  value: l,
}))

const items = computed(() => remoteItems.value ?? staticItems)

let debounceTimer: ReturnType<typeof setTimeout> | undefined

watch(searchTerm, (term) => {
  if (debounceTimer) clearTimeout(debounceTimer)

  const trimmed = term.trim()
  if (trimmed.length < 3) {
    remoteItems.value = null
    searching.value = false
    return
  }

  searching.value = true
  debounceTimer = setTimeout(async () => {
    try {
      const response = await $api<ApiResponse<LocationSuggestion[]>>(
        '/locations/search',
        {
          method: 'GET',
          query: { query: trimmed },
        },
      )
      remoteItems.value = response.data?.length
        ? response.data.map((s) => ({ label: s.label, value: s.label, lat: s.lat, lon: s.lon }))
        : null
    } catch {
      remoteItems.value = null
    } finally {
      searching.value = false
    }
  }, 400)
})

watch(model, (value) => {
  if (!value) {
    emit('coordinates', null)
    return
  }
  const match = items.value.find((item) => item.value === value)
  emit(
    'coordinates',
    match?.lat != null && match?.lon != null
      ? { lat: match.lat, lon: match.lon }
      : null,
  )
})

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<template>
  <UInputMenu
    v-model="model"
    v-model:search-term="searchTerm"
    :items="items"
    value-key="value"
    :ignore-filter="!!remoteItems"
    :loading="searching"
    create-item
    placeholder="Search city or state…"
    icon="i-heroicons-map-pin"
    class="w-full"
  />
</template>
