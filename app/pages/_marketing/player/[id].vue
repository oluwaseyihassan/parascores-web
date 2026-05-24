<script setup lang="ts">
import { storeToRefs } from 'pinia'
import type { Player } from '~/types'
import type { ApiResponse } from '~/stores/auth'

definePageMeta({
  layout: 'feed'
})

const { toMain } = useHost()
const route = useRoute()
const playerId = route.params.id as string

const player = ref<any | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// Auth
const authStore = useAuthStore()
const { user, isAuthenticated } = storeToRefs(authStore)
const playerStore = usePlayerStore()
const toast = useToast()
const { handleError } = useErrors()

// Check if current user is owner of this player profile
const isOwner = computed(() => {
  return isAuthenticated.value && player.value && player.value.userId === user.value?.id
})

// Edit State
const isEditing = ref(false)
const editName = ref('')
const editNumber = ref<number | null>(null)
const editPosition = ref<string>('')
const updating = ref(false)

const positionOptions = [
  { label: 'Goalkeeper (GK)', value: 'GK' },
  { label: 'Defender (DEF)', value: 'DEF' },
  { label: 'Midfielder (MID)', value: 'MID' },
  { label: 'Forward (FWD)', value: 'FWD' }
]

// Avatar upload
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)

const triggerUpload = () => fileInput.value?.click()

const handleAvatarChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    toast.add({ title: 'Please select an image file', color: 'error' })
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    toast.add({ title: 'Image must be less than 5MB', color: 'error' })
    return
  }

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await $api<{success: boolean, data: { url: string }}>('/upload/image?folder=players', {
      method: 'POST',
      body: formData
    })

    if (response.data?.url) {
      const updateRes = await playerStore.updateProfile(playerId, { avatarUrl: response.data.url })
      if (updateRes.success && updateRes.data) {
        player.value.avatarUrl = updateRes.data.avatarUrl
        toast.add({ title: 'Profile picture updated', color: 'success' })
      }
    }
  } catch (err) {
    handleError(err, { title: 'Upload failed' })
  } finally {
    uploading.value = false
  }
}

const startEditing = () => {
  editName.value = player.value?.name || ''
  editNumber.value = player.value?.number ?? null
  editPosition.value = player.value?.position || ''
  isEditing.value = true
}

const handleUpdatePlayer = async () => {
  if (!player.value) return
  if (!editName.value.trim()) {
    toast.add({ title: 'Name cannot be empty', color: 'error' })
    return
  }
  updating.value = true
  try {
    const payload: any = {
      name: editName.value,
      position: editPosition.value || null
    }
    if (editNumber.value !== null && editNumber.value !== undefined && String(editNumber.value).trim() !== '') {
      payload.number = parseInt(String(editNumber.value), 10)
      if (isNaN(payload.number)) {
        payload.number = null
      }
    } else {
      payload.number = null
    }

    const res = await playerStore.updateProfile(playerId, payload)
    if (res.success && res.data) {
      player.value.name = res.data.name
      player.value.number = res.data.number
      player.value.position = res.data.position
      toast.add({ title: 'Player profile updated', color: 'success' })
      isEditing.value = false
    }
  } catch (error: any) {
    handleError(error, { title: 'Update failed' })
  } finally {
    updating.value = false
  }
}

// Theme
const colorMode = useColorMode()

onMounted(async () => {
  try {
    const response = await $publicApi<{success: boolean, data: any}>(`/players/${playerId}`)
    if (response.data) {
      player.value = response.data
    }
  } catch (err: any) {
    error.value = err?.data?.message || err?.message || 'Player not found'
  } finally {
    loading.value = false
  }
})

const getPositionLabel = (pos: string | null | undefined) => {
  const map: Record<string, string> = {
    GK: 'Goalkeeper',
    DEF: 'Defender',
    MID: 'Midfielder',
    FWD: 'Forward',
  }
  return pos ? map[pos] || pos : 'Unknown'
}

const getPositionColor = (pos: string | null | undefined): string => {
  const map: Record<string, string> = {
    GK: 'warning',
    DEF: 'info',
    MID: 'success',
    FWD: 'error',
  }
  return pos ? map[pos] || 'neutral' : 'neutral'
}

// Count stats from match events
const statsFromEvents = computed(() => {
  if (!player.value?.matchEvents) return { goals: 0, assists: 0, yellowCards: 0, redCards: 0 }

  let goals = 0, assists = 0, yellowCards = 0, redCards = 0
  for (const event of player.value.matchEvents) {
    if (event.type === 'GOAL') goals++
    if (event.type === 'PENALTY') goals++
    if (event.type === 'ASSIST') assists++
    if (event.type === 'YELLOW_CARD') yellowCards++
    if (event.type === 'RED_CARD') redCards++
  }
  return { goals, assists, yellowCards, redCards }
})
</script>

<template>
  <div class="max-w-3xl mx-auto py-10 px-4 sm:px-6 min-h-screen">
    <!-- Loading -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-24 bg-white dark:bg-white/[0.02] rounded-3xl border border-gray-100 dark:border-white/[0.05]">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-emerald-500 mb-3" />
      <p class="text-sm text-gray-400">Loading player profile...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-24 bg-white dark:bg-white/[0.02] rounded-3xl border border-gray-100 dark:border-white/[0.05] px-6">
      <div class="w-14 h-14 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <UIcon name="i-heroicons-exclamation-triangle" class="w-7 h-7 text-rose-500" />
      </div>
      <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-1">{{ error }}</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">The player profile could not be loaded.</p>
      <UButton :to="toMain('/explore')" variant="soft" color="neutral" size="sm" class="rounded-lg">Explore Tournaments</UButton>
    </div>

    <!-- Player Profile -->
    <div v-else-if="player" class="space-y-8">
      
      <!-- Hero Card -->
      <div class="relative bg-white dark:bg-white/[0.02] rounded-2xl border border-gray-200 dark:border-white/[0.05] p-6 sm:p-8 overflow-hidden transition-all shadow-sm">
        <!-- Accent top line -->
        <div class="absolute inset-x-0 top-0 h-1.5 bg-emerald-500"></div>
        
        <div class="flex flex-col sm:flex-row items-center gap-6 relative z-10">
          
          <!-- Avatar section -->
          <div class="relative group">
            <input v-if="isOwner" ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleAvatarChange" />
            
            <button
              :disabled="!isOwner || uploading"
              @click="isOwner ? triggerUpload() : null"
              class="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-gray-50 dark:bg-white/[0.04] border-4 border-white dark:border-[#1A1A1A] ring-1 ring-gray-200 dark:ring-white/[0.08] shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
              :class="{ 'cursor-pointer hover:ring-emerald-500/50 hover:scale-102': isOwner }"
            >
              <img v-if="player.avatarUrl" :src="player.avatarUrl" class="w-full h-full object-cover" />
              <div v-else class="w-full h-full flex items-center justify-center text-4xl font-black text-gray-300 dark:text-gray-600 uppercase">
                {{ player.name.charAt(0) }}
              </div>

              <!-- Overlay for Owner -->
              <div v-if="isOwner" class="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <UIcon v-if="!uploading" name="i-heroicons-camera" class="w-6 h-6 text-white mb-1" />
                <UIcon v-else name="i-heroicons-arrow-path" class="w-6 h-6 text-white animate-spin" />
                <span class="text-[8px] font-black uppercase text-white tracking-widest">Change</span>
              </div>
            </button>
          </div>

          <!-- Info / Title -->
          <div class="flex-1 text-center sm:text-left min-w-0 w-full">
            
            <!-- Non-editing view -->
            <div v-if="!isEditing" class="space-y-2">
              <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h1 class="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                  {{ player.name }}
                </h1>
                <span v-if="player.number" class="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-xs border border-emerald-500/20">
                  #{{ player.number }}
                </span>
                
                <!-- Position Badge -->
                <span 
                  class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                  :class="player.position === 'GK' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                          player.position === 'DEF' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' :
                          player.position === 'MID' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                          player.position === 'FWD' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' :
                          'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20'"
                >
                  {{ getPositionLabel(player.position) }}
                </span>
              </div>

              <!-- Owner Click Info -->
              <p v-if="isOwner" class="text-[10px] text-gray-400 dark:text-gray-500 tracking-wider">
                <span class="hover:text-emerald-500 dark:hover:text-emerald-400 cursor-pointer" @click="triggerUpload">Change photo</span>
                <span class="mx-1.5">•</span>
                <span class="hover:text-emerald-500 dark:hover:text-emerald-400 cursor-pointer" @click="startEditing">Edit details</span>
              </p>
              
              <div v-if="isOwner" class="pt-2">
                <UButton
                  variant="soft"
                  color="success"
                  size="xs"
                  icon="i-heroicons-pencil-square"
                  @click="startEditing"
                  class="rounded-xl font-bold uppercase tracking-wider text-[9px] px-3 py-1.5"
                >
                  Edit Profile
                </UButton>
              </div>
            </div>

            <!-- Editing view -->
            <div v-else class="w-full max-w-sm mx-auto sm:mx-0 space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="sm:col-span-2">
                  <span class="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Player Name</span>
                  <UInput
                    v-model="editName"
                    placeholder="Player Name"
                    size="md"
                    class="w-full font-bold"
                    @keyup.enter="handleUpdatePlayer"
                  />
                </div>
                <div>
                  <span class="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Shirt Number</span>
                  <UInput
                    v-model="editNumber"
                    type="number"
                    placeholder="None"
                    size="md"
                    class="w-full font-bold"
                    @keyup.enter="handleUpdatePlayer"
                  />
                </div>
              </div>

              <div>
                <span class="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Position</span>
                <USelect
                  v-model="editPosition"
                  :items="positionOptions"
                  placeholder="Select Position"
                  size="md"
                  class="w-full font-bold"
                />
              </div>

              <div class="flex gap-2 justify-center sm:justify-start pt-1">
                <UButton
                  color="success"
                  size="xs"
                  :loading="updating"
                  @click="handleUpdatePlayer"
                  class="rounded-xl font-black uppercase tracking-widest text-[9px] px-4 py-2"
                >
                  Save
                </UButton>
                <UButton
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  @click="isEditing = false"
                  class="rounded-xl font-black uppercase tracking-widest text-[9px] px-4 py-2"
                >
                  Cancel
                </UButton>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- Stats Section -->
      <div>
        <h3 class="text-xs font-bold text-gray-400 dark:text-gray-500 mb-4 px-1 uppercase tracking-wider">Tournament Stats</h3>
        
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <!-- Goals Card -->
          <div class="group relative bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.05] p-5 rounded-2xl hover:-translate-y-1 hover:shadow-md transition-all duration-300 overflow-hidden">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Goals</span>
              <div class="p-1.5 bg-emerald-500/10 rounded-lg">
                <UIcon name="i-mdi-soccer" class="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              </div>
            </div>
            <div class="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              {{ statsFromEvents.goals }}
            </div>
          </div>

          <!-- Assists Card -->
          <div class="group relative bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.05] p-5 rounded-2xl hover:-translate-y-1 hover:shadow-md transition-all duration-300 overflow-hidden">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Assists</span>
              <div class="p-1.5 bg-cyan-500/10 rounded-lg">
                <UIcon name="i-mdi-shoe-cleat" class="w-4 h-4 text-cyan-500 dark:text-cyan-400 -rotate-45 transform" />
              </div>
            </div>
            <div class="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              {{ statsFromEvents.assists }}
            </div>
          </div>

          <!-- Yellow Cards Card -->
          <div class="group relative bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.05] p-5 rounded-2xl hover:-translate-y-1 hover:shadow-md transition-all duration-300 overflow-hidden">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Yellows</span>
              <div class="w-4 h-5 bg-yellow-400 rounded-[2px] shadow-sm ring-1 ring-yellow-400/20 shrink-0"></div>
            </div>
            <div class="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              {{ statsFromEvents.yellowCards }}
            </div>
          </div>

          <!-- Red Cards Card -->
          <div class="group relative bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.05] p-5 rounded-2xl hover:-translate-y-1 hover:shadow-md transition-all duration-300 overflow-hidden">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Reds</span>
              <div class="w-4 h-5 bg-rose-500 dark:bg-rose-600 rounded-[2px] shadow-sm ring-1 ring-rose-500/20 shrink-0"></div>
            </div>
            <div class="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              {{ statsFromEvents.redCards }}
            </div>
          </div>
        </div>
      </div>

      <!-- Active Tournament Section -->
      <div v-if="player.participant?.tournament">
        <div class="flex items-center justify-between mb-4 px-1">
          <h3 class="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Active Tournament</h3>
        </div>

        <NuxtLink
          :to="`/t/${player.participant.tournament.customName || player.participant.tournament.id}`"
          class="group flex items-center gap-4 p-5 bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.05] hover:border-emerald-300 dark:hover:border-emerald-500/30 hover:shadow-sm rounded-2xl transition-all"
        >
          <!-- Tournament Logo -->
          <div class="w-12 h-12 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.08] p-1.5 shrink-0 overflow-hidden flex items-center justify-center shadow-sm">
            <img v-if="player.participant.tournament.logoUrl" :src="player.participant.tournament.logoUrl" class="w-full h-full object-contain" />
            <div v-else class="text-sm font-bold text-gray-400">
              {{ player.participant.tournament.name.charAt(0) }}
            </div>
          </div>
          
          <div class="flex-1 min-w-0">
            <h4 class="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-emerald-500 transition-colors">
              {{ player.participant.tournament.name }}
            </h4>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-xs text-emerald-600 dark:text-emerald-400 font-extrabold uppercase tracking-wider">
                {{ player.participant.customName || 'Individual' }}
              </span>
              <span v-if="player.number" class="text-xs text-gray-400 font-bold">• #{{ player.number }}</span>
            </div>
          </div>
          <UIcon name="i-heroicons-chevron-right" class="w-5 h-5 text-gray-300 dark:text-gray-700 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
        </NuxtLink>
      </div>

      <!-- Career History -->
      <div v-if="player.user?.player_profiles?.length && player.user.player_profiles.length > 1">
        <div class="flex items-center justify-between mb-4 px-1">
          <h3 class="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Career Records</h3>
          <span class="text-xs text-gray-400">{{ player.user.player_profiles.length - 1 }} other profile(s)</span>
        </div>

        <div class="grid gap-3">
          <template v-for="profile in player.user.player_profiles" :key="profile.id">
            <NuxtLink
              v-if="profile.id !== player.id"
              :to="`/player/${profile.id}`"
              class="group flex items-center gap-4 p-4 bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.05] hover:border-emerald-300 dark:hover:border-emerald-500/30 hover:shadow-sm rounded-xl transition-all"
            >
              <div class="w-10 h-10 rounded-lg bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.08] flex items-center justify-center shrink-0 overflow-hidden p-1 shadow-sm">
                <img v-if="profile.participant?.tournament?.logoUrl" :src="profile.participant.tournament.logoUrl" class="w-full h-full object-contain" />
                <UIcon v-else name="i-heroicons-archive-box" class="w-4 h-4 text-gray-400 dark:text-gray-600" />
              </div>
              
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-gray-800 dark:text-gray-200 truncate group-hover:text-emerald-500 transition-colors">
                  {{ profile.participant?.tournament?.name || 'Tournament Profile' }}
                </p>
                <div class="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                  <span>{{ profile.participant?.customName }}</span>
                  <span v-if="profile.number">• #{{ profile.number }}</span>
                  <span v-if="profile.position">• {{ getPositionLabel(profile.position) }}</span>
                </div>
              </div>
              <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-300 dark:text-gray-700 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
            </NuxtLink>
          </template>
        </div>
      </div>

      <!-- Watermark Footer -->
      <div class="pt-6 border-t border-gray-100 dark:border-white/[0.05] flex items-center justify-between">
        <div class="flex items-center gap-2 grayscale opacity-40 hover:opacity-60 transition-opacity">
          <div class="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center text-[10px] font-black text-white">P</div>
          <span class="text-[10px] font-black uppercase tracking-widest text-gray-500 leading-none">ParaScores</span>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 10px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: #333;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #d1d5db;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #444;
}
</style>
