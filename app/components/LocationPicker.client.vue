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
      <transition
        enter-active-class="transition duration-100 ease-out"
        enter-from-class="transform scale-95 opacity-0"
        enter-to-class="transform scale-100 opacity-100"
        leave-active-class="transition duration-75 ease-in"
        leave-from-class="transform scale-100 opacity-100"
        leave-to-class="transform scale-95 opacity-0"
      >
        <div v-if="searchResults.length > 0 || (searchQuery.length > 2 && !isSearching && searchResults.length === 0 && hasSearchedOnce)" class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl max-h-60 overflow-y-auto">
          <div v-if="searchResults.length > 0">
            <button 
              v-for="(result, index) in searchResults" 
              :key="index"
              type="button"
              class="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-white/5 border-b border-gray-100 dark:border-white/5 last:border-0 transition-colors flex items-start gap-3 group"
              @click="selectSearchResult(result)"
            >
              <UIcon name="i-heroicons-map-pin" class="w-5 h-5 mt-0.5 text-gray-400 group-hover:text-rose-500 transition-colors" />
              <div class="flex flex-col">
                <span class="font-medium text-gray-900 dark:text-white">{{ result.display_name.split(',')[0] }}</span>
                <span class="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{{ result.display_name.split(',').slice(1).join(',').trim() }}</span>
              </div>
            </button>
          </div>
          <div v-else-if="searchQuery.length > 2" class="px-4 py-8 text-center">
            <UIcon name="i-heroicons-magnifying-glass" class="w-8 h-8 mx-auto text-gray-300 dark:text-gray-700 mb-2" />
            <p class="text-sm text-gray-500 dark:text-gray-400">No locations found for "{{ searchQuery }}"</p>
          </div>
        </div>
      </transition>
    </div>

    <!-- Map Container -->
    <div class="relative w-full h-[320px] rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-100 dark:bg-gray-900 group">
      <!-- Leaflet Map Div -->
      <div ref="mapContainer" class="w-full h-full z-0"></div>

      <!-- Locate Me Button -->
      <div class="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <UButton 
          icon="i-heroicons-cursor-arrow-rays" 
          color="neutral" 
          variant="solid" 
          class="shadow-md rounded-lg"
          square
          :loading="isLocating"
          @click="locateMe"
        />
      </div>

      <!-- Center Pin (Fixed in center of container) -->
      <div 
        class="absolute top-1/2 left-1/2 -translate-x-1/2 z-10 pointer-events-none transition-all duration-200 ease-out drop-shadow-xl" 
        :class="[
          isMoving ? '-translate-y-[130%] scale-110' : '-translate-y-[100%] scale-100',
          { 'animate-bounce-short': isSettling }
        ]"
      >
        <UIcon name="i-heroicons-map-pin-solid" class="w-10 h-10 text-rose-500" />
      </div>

      <!-- Content Overlay for small address readout -->
      <div class="absolute bottom-4 left-4 right-4 z-10 bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-xl border border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 group-hover:scale-[1.02]" :class="{ 'opacity-0 scale-95 translate-y-4': isMoving }">
        <div class="flex items-center justify-between mb-1.5">
          <div class="flex items-center gap-1.5">
            <UIcon name="i-heroicons-map-pin" class="w-3.5 h-3.5 text-rose-500" />
            <span class="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-400 dark:text-gray-500">Pick Location</span>
          </div>
          <div v-if="isFetchingAddress" class="flex gap-1">
            <span class="w-1 h-1 bg-rose-500 rounded-full animate-bounce"></span>
            <span class="w-1 h-1 bg-rose-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
            <span class="w-1 h-1 bg-rose-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
          </div>
        </div>
        <span class="text-sm font-bold text-gray-900 dark:text-white truncate leading-tight">
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

const toast = useToast()
const colorMode = useColorMode()
const mapContainer = ref<HTMLElement | null>(null)
let map: L.Map | null = null
let tileLayer: L.TileLayer | null = null

const isMoving = ref(false)
const isSettling = ref(false)
const isFetchingAddress = ref(false)
const isLocating = ref(false)

const searchQuery = ref('')
const isSearching = ref(false)
const hasSearchedOnce = ref(false)
const searchResults = ref<any[]>([])

let searchTimeout: any = null

// Real-time search with debounce
watch(searchQuery, (newVal) => {
  if (searchTimeout) clearTimeout(searchTimeout)
  if (!newVal || newVal.length < 3) {
    searchResults.value = []
    hasSearchedOnce.value = false
    return
  }
  
  // Don't auto-search if it looks like we just selected a result
  if (newVal === props.modelValue) return

  searchTimeout = setTimeout(() => {
    performSearch()
  }, 400)
})

// Default to a central location (e.g., Lagos, Nigeria)
const defaultCenter: L.LatLngExpression = [6.5244, 3.3792] 
const defaultZoom = 13

onMounted(() => {
  if (!mapContainer.value) return

  map = L.map(mapContainer.value, {
    zoomControl: false 
  }).setView(defaultCenter, defaultZoom)

  L.control.zoom({ position: 'topright' }).addTo(map)

  // Get correct tile URL based on theme
  const getTileUrl = () => colorMode.value === 'dark' 
    ? 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'

  // Use CARTO basemap that matches the current theme
  tileLayer = L.tileLayer(getTileUrl(), {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19
  }).addTo(map)

  // Watch for theme changes and update tiles
  watch(() => colorMode.value, (newTheme) => {
    if (tileLayer) {
      tileLayer.setUrl(getTileUrl())
    }
  })

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
    if (data && data.address) {
      // Build a cleaner address (Shortened)
      const a = data.address
      const parts = []
      
      // Prioritize readable parts: Venue/Point of Interest -> Road -> City/Town/Suburb -> State -> Country
      if (a.amenity || a.building || a.office) parts.push(a.amenity || a.building || a.office)
      if (a.road) parts.push(a.road)
      if (a.suburb || a.neighbourhood) parts.push(a.suburb || a.neighbourhood)
      if (a.city || a.town || a.village) parts.push(a.city || a.town || a.village)
      if (a.state) parts.push(a.state)
      if (a.country) parts.push(a.country)
      
      const cleanAddress = parts.slice(0, 4).join(', ') // Keep it somewhat concise
      
      emit('update:modelValue', cleanAddress || data.display_name)
      searchQuery.value = '' 
      
      // Trigger subtle bounce animation
      isSettling.value = true
      setTimeout(() => { isSettling.value = false }, 400)
    }
  } catch (error) {
    console.error('Failed to reverse geocode:', error)
  } finally {
    isFetchingAddress.value = false
  }
}

async function locateMe() {
  if (!navigator.geolocation) {
    toast.add({ title: 'Geolocation Not Supported', description: 'Your browser does not support location services.', color: 'error' })
    return
  }

  isLocating.value = true
  toast.add({ title: 'Finding location...', color: 'info' })

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords
      if (map) {
        map.flyTo([latitude, longitude], 16)
        toast.add({ title: 'Location found!', color: 'success' })
      }
      isLocating.value = false
    },
    (error) => {
      let message = 'An unknown error occurred.'
      switch (error.code) {
        case error.PERMISSION_DENIED:
          message = 'You denied the request for Geolocation. Please enable it in your browser settings.'
          break
        case error.POSITION_UNAVAILABLE:
          message = 'Location information is unavailable.'
          break
        case error.TIMEOUT:
          message = 'The request to get user location timed out.'
          break
      }
      toast.add({ 
        title: 'Location Error', 
        description: message, 
        color: 'error' 
      })
      isLocating.value = false
    },
    { 
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  )
}

// Forward Geocoding (address -> lat/lng)
async function performSearch() {
  if (!searchQuery.value.trim() || searchQuery.value.length < 3) return
  
  isSearching.value = true
  hasSearchedOnce.value = true
  
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(searchQuery.value)}&limit=5`, {
      headers: {
        'User-Agent': 'Parascores (parascores-web/1.0)',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    })
    if (!response.ok) throw new Error('Search failed')
    
    const data = await response.json()
    searchResults.value = data || []
  } catch (error) {
    console.error('Failed to search location:', error)
    toast.add({ title: 'Search Error', description: 'Could not connect to the location service.', color: 'error' })
  } finally {
    isSearching.value = false
  }
}

function selectSearchResult(result: any) {
  const displayName = result.display_name
  searchResults.value = []
  hasSearchedOnce.value = false
  
  // Create a clean display name variant
  const parts = displayName.split(',').map((p: string) => p.trim())
  const cleanName = parts.slice(0, 3).join(', ')
  
  searchQuery.value = cleanName
  emit('update:modelValue', cleanName)
  
  if (map) {
    const lat = parseFloat(result.lat)
    const lon = parseFloat(result.lon)
    map.flyTo([lat, lon], 16)
  }
}

function clearSearch() {
  searchQuery.value = ''
  searchResults.value = []
}
</script>

<style scoped>
@keyframes bounce-short {
  0%, 100% { transform: translate(-50%, -100%) scale(1); }
  50% { transform: translate(-50%, -115%) scale(1.05); }
}

.animate-bounce-short {
  animation: bounce-short 0.4s ease-out;
}
</style>
