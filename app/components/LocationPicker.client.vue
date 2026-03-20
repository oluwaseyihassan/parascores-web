<template>
  <div class="relative w-full">
    <!-- Search Input -->
    <div class="relative mb-2">
      <UInput 
        v-model="searchQuery" 
        placeholder="Search for a location or drag the map..." 
        icon="i-heroicons-magnifying-glass"
        autocomplete="off"
        size="lg"
        @keyup.enter="performSearch"
        :loading="isSearching"
      >
        <template #trailing>
          <UButton 
            v-if="searchQuery" 
            color="neutral" 
            variant="ghost" 
            icon="i-heroicons-x-mark" 
            size="xs" 
            @click="clearSearch" 
          />
          <UButton 
            v-else 
            color="neutral" 
            variant="ghost" 
            label="Search" 
            size="xs" 
            @click="performSearch" 
          />
        </template>
      </UInput>
      
      <!-- Search Results -->
      <div v-if="searchResults.length > 0" class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-xl max-h-60 overflow-y-auto">
        <button 
          v-for="(result, index) in searchResults" 
          :key="index"
          type="button"
          class="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0 transition-colors"
          @click="selectSearchResult(result)"
        >
          {{ result.display_name }}
        </button>
      </div>
    </div>

    <!-- Map Container -->
    <div class="relative w-full h-[320px] rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-100 dark:bg-gray-900 group">
      <!-- Leaflet Map Div -->
      <div ref="mapContainer" class="w-full h-full z-0"></div>

      <!-- Center Pin (Fixed in center of container) -->
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[100%] z-10 pointer-events-none transition-transform duration-200 ease-out drop-shadow-xl" :class="{ '-translate-y-[130%] scale-110': isMoving }">
        <UIcon name="i-heroicons-map-pin-solid" class="w-10 h-10 text-rose-500" />
      </div>

      <!-- Content Overlay for small address readout -->
      <div class="absolute bottom-4 left-4 right-4 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-lg p-3 shadow-lg border border-gray-200/50 dark:border-gray-700/50 flex flex-col pointer-events-none transition-opacity duration-300" :class="{ 'opacity-50': isMoving }">
        <span class="text-xs font-semibold tracking-wider uppercase text-gray-500 dark:text-gray-400 mb-0.5">Selected Location</span>
        <span class="text-sm font-medium text-gray-900 dark:text-white truncate">
          {{ isFetchingAddress ? 'Finding address...' : (modelValue || 'Move map to select location') }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps<{
  modelValue?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const mapContainer = ref<HTMLElement | null>(null)
let map: L.Map | null = null

const isMoving = ref(false)
const isFetchingAddress = ref(false)

const searchQuery = ref('')
const isSearching = ref(false)
const searchResults = ref<any[]>([])

// Default to a central location (e.g., Lagos, Nigeria)
const defaultCenter: L.LatLngExpression = [6.5244, 3.3792] 
const defaultZoom = 13

onMounted(() => {
  if (!mapContainer.value) return

  map = L.map(mapContainer.value, {
    zoomControl: false 
  }).setView(defaultCenter, defaultZoom)

  L.control.zoom({ position: 'topright' }).addTo(map)

  // Use CARTO Voyager basemap (light, minimal labels) to match the dark/light modes more naturally than default OSM
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19
  }).addTo(map)

  map.on('movestart', () => {
    isMoving.value = true
    searchResults.value = [] // Close search dropdown if user interacts with map manually
  })

  map.on('moveend', async () => {
    isMoving.value = false
    const center = map?.getCenter()
    if (center) {
      await fetchAddress(center.lat, center.lng)
    }
  })
})

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
  }
})

// Reverse Geocoding (lat/lng -> address)
async function fetchAddress(lat: number, lng: number) {
  isFetchingAddress.value = true
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
    if (!response.ok) throw new Error('Geocoding failed')
    
    const data = await response.json()
    if (data && data.display_name) {
      emit('update:modelValue', data.display_name)
      searchQuery.value = '' // Clear out the search input so the user sees the real result below
    }
  } catch (error) {
    console.error('Failed to reverse geocode:', error)
  } finally {
    isFetchingAddress.value = false
  }
}

// Forward Geocoding (address -> lat/lng)
async function performSearch() {
  if (!searchQuery.value.trim()) return
  
  isSearching.value = true
  searchResults.value = []
  
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(searchQuery.value)}&limit=5`)
    if (!response.ok) throw new Error('Search failed')
    
    const data = await response.json()
    searchResults.value = data || []
  } catch (error) {
    console.error('Failed to search location:', error)
  } finally {
    isSearching.value = false
  }
}

function selectSearchResult(result: any) {
  searchResults.value = []
  searchQuery.value = result.display_name
  emit('update:modelValue', result.display_name)
  
  if (map) {
    const lat = parseFloat(result.lat)
    const lon = parseFloat(result.lon)
    map.flyTo([lat, lon], 16) // Zoom in on the searched location
  }
}

function clearSearch() {
  searchQuery.value = ''
  searchResults.value = []
}
</script>
