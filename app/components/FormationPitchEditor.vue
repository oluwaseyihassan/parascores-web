<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Player } from '~/types'

const props = withDefaults(defineProps<{
  players: Player[]
  selectedLineupIds: string[]
  formation: string
  teamName?: string
  isDark?: boolean
}>(), {
  teamName: '',
  isDark: false
})

const emit = defineEmits<{
  'update:selectedLineupIds': [ids: string[]]
  'update-player-position': [playerId: string, position: string]
}>()

// Position category order
const positionOrder: Record<string, number> = { GK: 0, DEF: 1, MID: 2, FWD: 3 }

// Map row index to position category
const getRowPositionCategory = (rowIdx: number, totalRows: number): string => {
  if (rowIdx === 0) return 'GK'
  if (rowIdx === 1) return 'DEF'
  if (rowIdx === totalRows - 1) return 'FWD'
  return 'MID'
}

// Full list of starting players for this team
const starters = computed(() => {
  return props.players.filter(p => props.selectedLineupIds.includes(p.id))
})

// Scrollable roster bench list (not starting)
const benchPlayers = computed(() => {
  return props.players.filter(p => !props.selectedLineupIds.includes(p.id))
})

// Search query for bench players
const searchQuery = ref('')

const filteredBenchPlayers = computed(() => {
  if (!searchQuery.value) return benchPlayers.value
  const query = searchQuery.value.toLowerCase().trim()
  return benchPlayers.value.filter(p => 
    p.name.toLowerCase().includes(query) || 
    (p.number && p.number.toString().includes(query)) ||
    (p.position && p.position.toLowerCase().includes(query))
  )
})

// Parse formation rows
const formationRows = computed(() => {
  if (!props.formation) return [1, 4, 4, 2] // Fallback preset
  const parts = props.formation.split('-').map(Number).filter(n => !isNaN(n) && n > 0)
  return [1, ...parts] // Add Goalkeeper row at index 0
})

// Pitch slots layout
const pitchSlots = computed(() => {
  const rows = formationRows.value
  const totalRows = rows.length
  
  // Initialize slots grid
  const slotsGrid: Array<Array<{
    rowIdx: number
    slotIdx: number
    category: string
    player: Player | null
    x: number
    y: number
  }>> = []

  for (let r = 0; r < totalRows; r++) {
    const count = rows[r] ?? 0
    const category = getRowPositionCategory(r, totalRows)
    const rowSlots = []
    for (let s = 0; s < count; s++) {
      rowSlots.push({
        rowIdx: r,
        slotIdx: s,
        category,
        player: null as Player | null,
        x: getPlayerX(s, count),
        y: getRowY(totalRows - 1 - r, totalRows)
      })
    }
    slotsGrid.push(rowSlots)
  }

  // Distribute active starters into these slots
  const availableStarters = [...starters.value]

  // Pass 1: Match players to exact coordinates (CATEGORY-ROW-SLOT, e.g. "DEF-1-3")
  for (let i = availableStarters.length - 1; i >= 0; i--) {
    const player = availableStarters[i]
    if (player && player.position && player.position.includes('-')) {
      const parts = player.position.split('-')
      const r = parseInt(parts[1] ?? '', 10)
      const s = parseInt(parts[2] ?? '', 10)
      if (!isNaN(r) && !isNaN(s) && slotsGrid[r]?.[s]) {
        const slot = slotsGrid[r][s]
        if (slot && !slot.player) {
          slot.player = player
          availableStarters.splice(i, 1)
        }
      }
    }
  }

  // Pass 2: Match players with legacy categories ("GK", "DEF", "MID", "FWD")
  // to empty slots matching that category
  for (let i = availableStarters.length - 1; i >= 0; i--) {
    const player = availableStarters[i]
    if (player) {
      const baseCategory = player.position ? player.position.split('-')[0] : ''
      if (baseCategory === 'GK' || baseCategory === 'DEF' || baseCategory === 'MID' || baseCategory === 'FWD') {
        let placed = false
        for (let r = 0; r < totalRows; r++) {
          const rowSlots = slotsGrid[r] ?? []
          for (const slot of rowSlots) {
            if (!slot.player && slot.category === baseCategory) {
              slot.player = player
              placed = true
              break
            }
          }
          if (placed) break
        }
        if (placed) {
          availableStarters.splice(i, 1)
        }
      }
    }
  }

  // Pass 3: Distribute leftover starters into any remaining empty slots
  for (let r = 0; r < totalRows; r++) {
    const rowSlots = slotsGrid[r] ?? []
    for (const slot of rowSlots) {
      if (!slot.player && availableStarters.length > 0) {
        slot.player = availableStarters.shift() ?? null
      }
    }
  }

  return slotsGrid
})

// Calculate vertical position for each row (percentage from top)
const getRowY = (rowIndex: number, totalRows: number): number => {
  if (totalRows <= 1) return 50
  const padding = 10
  const range = 100 - 2 * padding
  return padding + (rowIndex / (totalRows - 1)) * range
}

// Calculate horizontal position for each player in a row
const getPlayerX = (playerIndex: number, totalInRow: number): number => {
  if (totalInRow <= 1) return 50
  const padding = 12
  const range = 100 - 2 * padding
  return padding + (playerIndex / (totalInRow - 1)) * range
}

// Drag & Drop States
const activeDragOverSlot = ref<{ rowIdx: number; slotIdx: number } | null>(null)
const activeDragOverBench = ref(false)

const onDragStart = (event: DragEvent, player: Player, source: 'bench' | { rowIdx: number; slotIdx: number }) => {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', JSON.stringify({
      playerId: player.id,
      source
    }))
  }
}

const onDragOverSlot = (event: DragEvent, rowIdx: number, slotIdx: number) => {
  // Required to allow drop
}

const onDragEnterSlot = (rowIdx: number, slotIdx: number) => {
  activeDragOverSlot.value = { rowIdx, slotIdx }
}

const onDragLeaveSlot = () => {
  activeDragOverSlot.value = null
}

const onDropOnSlot = (event: DragEvent, targetRowIdx: number, targetSlotIdx: number, targetCategory: string) => {
  activeDragOverSlot.value = null
  if (!event.dataTransfer) return
  
  try {
    const data = JSON.parse(event.dataTransfer.getData('text/plain'))
    const { playerId, source } = data
    
    const draggedPlayer = props.players.find(p => p.id === playerId)
    if (!draggedPlayer) return

    // Find target player in that slot
    const targetRow = pitchSlots.value[targetRowIdx]
    const targetSlot = targetRow ? targetRow[targetSlotIdx] : null
    const targetPlayer = targetSlot ? targetSlot.player : null

    // Avoid self drops
    if (targetPlayer && targetPlayer.id === playerId) return

    let newLineup = [...props.selectedLineupIds]

    if (source === 'bench') {
      // Add to starting lineup
      if (!newLineup.includes(playerId)) {
        newLineup.push(playerId)
      }
      
      // Set position
      emit('update-player-position', playerId, `${targetCategory}-${targetRowIdx}-${targetSlotIdx}`)

      if (targetPlayer) {
        // Swap: Target player goes to bench
        newLineup = newLineup.filter(id => id !== targetPlayer.id)
      }
    } else {
      // Move from one slot to another
      const sourceRowIdx = source.rowIdx
      const sourceSlotIdx = source.slotIdx
      
      const sourceRow = pitchSlots.value[sourceRowIdx]
      const sourceSlot = sourceRow ? sourceRow[sourceSlotIdx] : null
      const sourceCategory = sourceSlot ? sourceSlot.category : ''

      if (targetPlayer) {
        // Swap positions of both active starters
        emit('update-player-position', playerId, `${targetCategory}-${targetRowIdx}-${targetSlotIdx}`)
        emit('update-player-position', targetPlayer.id, `${sourceCategory}-${sourceRowIdx}-${sourceSlotIdx}`)
      } else {
        // Just move player to new category
        emit('update-player-position', playerId, `${targetCategory}-${targetRowIdx}-${targetSlotIdx}`)
      }
    }

    emit('update:selectedLineupIds', newLineup)
  } catch (e) {
    console.error('Drop on slot failed:', e)
  }
}

const onDropOnBench = (event: DragEvent) => {
  activeDragOverBench.value = false
  if (!event.dataTransfer) return
  
  try {
    const data = JSON.parse(event.dataTransfer.getData('text/plain'))
    const { playerId, source } = data
    
    if (source !== 'bench') {
      // Starter -> Bench: Remove from lineups
      const newLineup = props.selectedLineupIds.filter(id => id !== playerId)
      emit('update:selectedLineupIds', newLineup)
    }
  } catch (e) {
    console.error('Drop on bench failed:', e)
  }
}
</script>

<template>
  <div class="formation-editor" :class="{ 'formation-editor--dark': isDark }">
    <div class="formation-editor__pitch-container">
      <div class="formation-editor__pitch-header">
        <span class="formation-editor__team-name">{{ teamName }} Pitch</span>
        <span class="formation-editor__formation-badge">{{ formation || 'No Formation' }}</span>
      </div>

      <!-- Pitch Box -->
      <div class="formation-editor__field">
        <svg viewBox="0 0 400 560" class="formation-editor__svg" preserveAspectRatio="xMidYMid meet">
          <!-- Pitch Background -->
          <rect x="0" y="0" width="400" height="560" rx="12" fill="url(#pitchEditorGradient)" />

          <!-- Gradients -->
          <defs>
            <linearGradient id="pitchEditorGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#1e5c33" />
              <stop offset="50%" stop-color="#24723f" />
              <stop offset="100%" stop-color="#1e5c33" />
            </linearGradient>
            <!-- Grass stripes -->
            <pattern id="editorGrassStripes" x="0" y="0" width="400" height="80" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="400" height="40" fill="rgba(255,255,255,0.015)" />
              <rect x="0" y="40" width="400" height="40" fill="rgba(0,0,0,0.015)" />
            </pattern>
          </defs>

          <!-- Stripe pattern -->
          <rect x="0" y="0" width="400" height="560" rx="12" fill="url(#editorGrassStripes)" />

          <!-- Field markings -->
          <rect x="20" y="20" width="360" height="520" rx="4" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" />
          <line x1="20" y1="280" x2="380" y2="280" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" />
          <circle cx="200" cy="280" r="50" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" />
          <circle cx="200" cy="280" r="3" fill="rgba(255,255,255,0.25)" />

          <!-- Penalty Areas -->
          <rect x="100" y="20" width="200" height="80" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" />
          <rect x="150" y="20" width="100" height="35" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" />
          <circle cx="200" cy="65" r="2.5" fill="rgba(255,255,255,0.25)" />
          <path d="M 150 100 Q 200 120 250 100" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" />

          <rect x="100" y="460" width="200" height="80" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" />
          <rect x="150" y="505" width="100" height="35" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" />
          <circle cx="200" cy="495" r="2.5" fill="rgba(255,255,255,0.25)" />
          <path d="M 150 460 Q 200 440 250 460" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" />
        </svg>

        <!-- Dynamic Slots Overlay -->
        <div class="formation-editor__slots">
          <div
            v-for="(row, rIdx) in pitchSlots"
            :key="'edit-row-' + rIdx"
            class="formation-editor__row"
            :style="{ top: getRowY(pitchSlots.length - 1 - rIdx, pitchSlots.length) + '%' }"
          >
            <div
              v-for="(slot, sIdx) in row"
              :key="'slot-' + rIdx + '-' + sIdx"
              class="formation-editor__slot"
              :style="{ left: getPlayerX(sIdx, row.length) + '%' }"
              @dragover.prevent="onDragOverSlot($event, rIdx, sIdx)"
              @dragenter="onDragEnterSlot(rIdx, sIdx)"
              @dragleave="onDragLeaveSlot"
              @drop="onDropOnSlot($event, rIdx, sIdx, slot.category)"
              :class="{
                'formation-editor__slot--dragover': activeDragOverSlot?.rowIdx === rIdx && activeDragOverSlot?.slotIdx === sIdx,
                'formation-editor__slot--empty': !slot.player
              }"
            >
              <!-- Slot content: Player node -->
              <div
                v-if="slot.player"
                class="formation-editor__player-node"
                draggable="true"
                @dragstart="onDragStart($event, slot.player, { rowIdx: rIdx, slotIdx: sIdx })"
              >
                <!-- Avatar -->
                <div class="formation-editor__avatar">
                  <img v-if="slot.player.avatarUrl" :src="slot.player.avatarUrl" class="formation-editor__avatar-img" />
                  <span v-else class="formation-editor__avatar-initial">{{ slot.player.name.charAt(0) }}</span>
                  <span v-if="slot.player.number" class="formation-editor__player-number">{{ slot.player.number }}</span>
                </div>
                <!-- Name label -->
                <span class="formation-editor__player-name">{{ slot.player.name.split(' ').pop() }}</span>
                <!-- Position Indicator -->
                <span class="formation-editor__player-pos-badge">{{ slot.category }}</span>
              </div>

              <!-- Slot content: Empty Slot Placeholder -->
              <div v-else class="formation-editor__empty-slot">
                <UIcon name="i-heroicons-plus" class="w-4 h-4 text-white/30" />
                <span class="formation-editor__empty-label">{{ slot.category }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bench / Roster Roster List -->
    <div class="formation-editor__bench-container">
      <div class="formation-editor__bench-header">
        <span class="formation-editor__bench-title">Bench & Roster</span>
        <span class="formation-editor__bench-count">{{ filteredBenchPlayers.length }} players</span>
      </div>

      <!-- Search Box -->
      <div class="formation-editor__search">
        <UInput
          v-model="searchQuery"
          icon="i-heroicons-magnifying-glass"
          placeholder="Search roster players..."
          size="sm"
          class="w-full"
          color="neutral"
          variant="outline"
        />
      </div>

      <!-- Bench Drop Target Box -->
      <div
        class="formation-editor__bench-list-wrap"
        @dragover.prevent
        @dragenter="activeDragOverBench = true"
        @dragleave="activeDragOverBench = false"
        @drop="onDropOnBench"
        :class="{ 'formation-editor__bench-list-wrap--dragover': activeDragOverBench }"
      >
        <div v-if="filteredBenchPlayers.length === 0" class="formation-editor__bench-empty">
          {{ searchQuery ? 'No matching players found' : 'Roster is empty' }}
        </div>
        <div v-else class="formation-editor__bench-list">
          <div
            v-for="player in filteredBenchPlayers"
            :key="'bench-' + player.id"
            class="formation-editor__bench-item"
            draggable="true"
            @dragstart="onDragStart($event, player, 'bench')"
          >
            <div class="formation-editor__bench-item-left">
              <UIcon name="i-heroicons-bars-3" class="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 cursor-grab flex-shrink-0 mr-1" />
              <div class="formation-editor__bench-avatar">
                <img v-if="player.avatarUrl" :src="player.avatarUrl" class="w-full h-full object-cover" />
                <span v-else class="text-[10px] font-bold text-gray-600 dark:text-gray-300">{{ player.name.charAt(0) }}</span>
              </div>
              <div class="min-w-0">
                <div class="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                  {{ player.name }}
                </div>
                <div class="text-[10px] text-gray-500 dark:text-gray-400">
                  {{ player.number ? '#' + player.number : 'No number' }}
                </div>
              </div>
            </div>
            <span
              v-if="player.position"
              class="formation-editor__bench-pos-badge"
              :class="`formation-editor__bench-pos-badge--${player.position.toLowerCase()}`"
            >
              {{ player.position }}
            </span>
          </div>
        </div>

        <div class="formation-editor__bench-drop-hint">
          <UIcon name="i-heroicons-arrow-down-tray" class="w-4 h-4 mr-1 text-emerald-500 animate-bounce" />
          <span>Drag starter here to bench them</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.formation-editor {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  padding: 4px;
}

.formation-editor__pitch-container {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.formation-editor__pitch-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 4px 10px 4px;
  min-width: 0;
}

.formation-editor__team-name {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
}

.formation-editor--dark .formation-editor__team-name {
  color: #f3f4f6;
}

.formation-editor__formation-badge {
  font-size: 10px;
  font-weight: 700;
  color: #059669;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  padding: 2px 8px;
  border-radius: 6px;
  flex-shrink: 0;
}

.formation-editor__field {
  position: relative;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.formation-editor__svg {
  display: block;
  width: 100%;
  height: auto;
}

.formation-editor__slots {
  position: absolute;
  inset: 0;
}

.formation-editor__row {
  position: absolute;
  left: 0;
  right: 0;
  height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.formation-editor__slot {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 2;
}

.formation-editor__slot--empty {
  border: 2px dashed rgba(255, 255, 255, 0.35);
  background: rgba(255, 255, 255, 0.05);
}

.formation-editor__slot--empty:hover {
  border-color: rgba(255, 255, 255, 0.65);
  background: rgba(255, 255, 255, 0.15);
  transform: translate(-50%, -50%) scale(1.08);
}

.formation-editor__slot--dragover {
  border-color: #10b981 !important;
  background: rgba(16, 185, 129, 0.3) !important;
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.6);
  transform: translate(-50%, -50%) scale(1.15) !important;
}

.formation-editor__empty-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.formation-editor__empty-label {
  font-size: 8px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.45);
  margin-top: 1px;
}

.formation-editor__player-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  cursor: grab;
  width: 70px;
  pointer-events: auto;
}

.formation-editor__player-node:active {
  cursor: grabbing;
}

.formation-editor__avatar {
  position: relative;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: white;
  border: 2px solid #10b981;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s ease;
}

.formation-editor__player-node:hover .formation-editor__avatar {
  transform: scale(1.08);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
}

.formation-editor__avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.formation-editor__avatar-initial {
  font-size: 13px;
  font-weight: 800;
  color: #374151;
}

.formation-editor__player-number {
  position: absolute;
  bottom: -4px;
  right: -4px;
  background: #3b82f6;
  color: white;
  font-size: 8px;
  font-weight: 800;
  border-radius: 50%;
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid white;
}

.formation-editor__player-name {
  font-size: 9px;
  font-weight: 700;
  color: white;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
  max-width: 64px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.formation-editor__player-pos-badge {
  font-size: 7px;
  font-weight: 800;
  color: #111827;
  background: rgba(255, 255, 255, 0.85);
  padding: 0 4px;
  border-radius: 4px;
  line-height: 1.1;
  text-shadow: none;
}

/* Bench Container */
.formation-editor__bench-container {
  flex: 2;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 12px;
  min-height: 250px;
  min-width: 0;
}

.formation-editor--dark .formation-editor__bench-container {
  background: rgba(26, 26, 26, 0.6);
  border-color: rgba(255, 255, 255, 0.06);
}

.formation-editor__bench-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.formation-editor__bench-title {
  font-size: 12px;
  font-weight: 700;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.formation-editor--dark .formation-editor__bench-title {
  color: #d1d5db;
}

.formation-editor__bench-count {
  font-size: 10px;
  color: #6b7280;
}

.formation-editor__search {
  margin-bottom: 10px;
}

.formation-editor__bench-list-wrap {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1.5px dashed transparent;
  border-radius: 8px;
  transition: all 0.2s ease;
  min-height: 0;
}

.formation-editor__bench-list-wrap--dragover {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.05);
}

.formation-editor__bench-list-wrap--dragover .formation-editor__bench-drop-hint {
  opacity: 1;
}

.formation-editor__bench-list-wrap--dragover .formation-editor__bench-list {
  opacity: 0.25;
}

.formation-editor__bench-empty {
  font-size: 11px;
  color: #9ca3af;
  text-align: center;
  padding: 24px;
}

.formation-editor__bench-list {
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 8px;
  padding: 4px;
  max-height: 240px;
  min-height: 0;
}

.formation-editor__bench-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  padding: 8px;
  cursor: grab;
  transition: all 0.15s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.formation-editor--dark .formation-editor__bench-item {
  background: rgba(255, 255, 255, 0.02);
  border-color: rgba(255, 255, 255, 0.04);
}

.formation-editor__bench-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  background: rgba(16, 185, 129, 0.02);
  border-color: rgba(16, 185, 129, 0.25);
}

.formation-editor__bench-item:active {
  cursor: grabbing;
}

.formation-editor__bench-item-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.formation-editor__bench-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(0, 0, 0, 0.05);
  overflow: hidden;
  flex-shrink: 0;
}

.formation-editor--dark .formation-editor__bench-avatar {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

.formation-editor__bench-pos-badge {
  font-size: 8px;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 4px;
  line-height: 1;
}

.formation-editor__bench-pos-badge--gk {
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
}

.formation-editor__bench-pos-badge--def {
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
}

.formation-editor__bench-pos-badge--mid {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
}

.formation-editor__bench-pos-badge--fwd {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

/* Bench Drop Hint Overlay */
.formation-editor__bench-drop-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #ef4444;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
  background: rgba(239, 68, 68, 0.03);
  border-radius: 8px;
}

/* Scrollbar Customization */
.formation-editor__bench-list::-webkit-scrollbar {
  width: 4px;
}

.formation-editor__bench-list::-webkit-scrollbar-track {
  background: transparent;
}

.formation-editor__bench-list::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 2px;
}

.formation-editor--dark .formation-editor__bench-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
}

@media (max-width: 480px) {
  .formation-editor__slot {
    width: 38px;
    height: 38px;
  }
  .formation-editor__avatar {
    width: 32px;
    height: 32px;
  }
  .formation-editor__player-name {
    font-size: 8px;
    max-width: 50px;
  }
}
</style>
