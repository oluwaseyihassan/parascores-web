<script setup lang="ts">
import type { Player, MatchEvent } from "~/types";

const props = withDefaults(
  defineProps<{
    players: Player[];
    formation: string;
    teamName?: string;
    teamLogoUrl?: string | null;
    isDark?: boolean;
    inverted?: boolean; // away team plays bottom to top
    matchEvents?: MatchEvent[];
    lineupPositions?: Record<string, string> | null;
  }>(),
  {
    teamName: "",
    teamLogoUrl: null,
    isDark: false,
    inverted: false,
    matchEvents: () => [],
    lineupPositions: null,
  },
);

// Parse formation string like "4-2-3-1" into an array of row counts
// Result: [1, 3, 2, 4] for GK=1, then reversed (bottom to top on pitch)
const formationRows = computed(() => {
  const parts = props.formation
    .split("-")
    .map(Number)
    .filter((n) => !isNaN(n) && n > 0);
  // Formation is typically written from defense to attack: "4-3-3" = 4 DEF, 3 MID, 3 FWD
  // On the pitch, GK is at bottom, then defense, then midfield, then attack at top
  // Add GK row (always 1) at the bottom
  return [1, ...parts]; // [GK, DEF, MID, ..., FWD]
});

// Helper to map row index to category name
const getRowPositionCategory = (rowIdx: number, totalRows: number): string => {
  if (rowIdx === 0) return "GK";
  if (rowIdx === 1) return "DEF";
  if (rowIdx === totalRows - 1) return "FWD";
  return "MID";
};

// Calculate vertical position for each row (percentage from top)
const getRowY = (
  slotRowIdx: number,
  totalRows: number,
  inverted: boolean,
): number => {
  if (totalRows <= 1) return 50;

  let finalRowIdx = totalRows - 1 - slotRowIdx;
  if (inverted) {
    finalRowIdx = slotRowIdx;
  }

  const padding = 10; // % from top and bottom
  const range = 100 - 2 * padding;
  let y = padding + (finalRowIdx / (totalRows - 1)) * range;

  // Tweak goalkeeper row (slotRowIdx === 0)
  if (slotRowIdx === 0) {
    y = inverted ? 7 : 93;
  }
  // Tweak striker/top row (slotRowIdx === totalRows - 1)
  else if (slotRowIdx === totalRows - 1) {
    y = inverted ? 85 : 15;
  }

  return y;
};

// Calculate horizontal position for each player in a row
const getPlayerX = (playerIndex: number, totalInRow: number): number => {
  if (totalInRow <= 1) return 50;
  const padding = totalInRow === 2 ? 28 : 12; // % from left and right edges
  const range = 100 - 2 * padding;
  return padding + (playerIndex / (totalInRow - 1)) * range;
};

// Positions starting players on the pitch based on coordinate mappings
const positionedPlayers = computed(() => {
  const rows = formationRows.value;
  const totalRows = rows.length;

  // Initialize slots
  const slots: Array<{
    rowIdx: number;
    slotIdx: number;
    category: string;
    player: Player | null;
  }> = [];

  for (let r = 0; r < totalRows; r++) {
    const count = rows[r] ?? 0;
    const category = getRowPositionCategory(r, totalRows);
    for (let s = 0; s < count; s++) {
      slots.push({
        rowIdx: r,
        slotIdx: s,
        category,
        player: null,
      });
    }
  }

  const availableStarters = [...props.players];

  // Pass 1: Match players to exact coordinates (CATEGORY-ROW-SLOT, e.g. "DEF-1-3")
  for (let i = availableStarters.length - 1; i >= 0; i--) {
    const player = availableStarters[i];
    if (player) {
      const position =
        (props.lineupPositions && props.lineupPositions[player.id]) ||
        player.position;
      if (position && position.includes("-")) {
        const parts = position.split("-");
        const r = parseInt(parts[1] ?? "", 10);
        const s = parseInt(parts[2] ?? "", 10);
        if (!isNaN(r) && !isNaN(s)) {
          const slot = slots.find((sl) => sl.rowIdx === r && sl.slotIdx === s);
          if (slot && !slot.player) {
            slot.player = player;
            availableStarters.splice(i, 1);
          }
        }
      }
    }
  }

  // Pass 2: Match players with legacy categories ("GK", "DEF", "MID", "FWD")
  // to empty slots matching that category
  for (let i = availableStarters.length - 1; i >= 0; i--) {
    const player = availableStarters[i];
    if (player) {
      const position =
        (props.lineupPositions && props.lineupPositions[player.id]) ||
        player.position;
      const baseCategory = position ? position.split("-")[0] : "";
      if (
        baseCategory === "GK" ||
        baseCategory === "DEF" ||
        baseCategory === "MID" ||
        baseCategory === "FWD"
      ) {
        const slot = slots.find(
          (sl) => !sl.player && sl.category === baseCategory,
        );
        if (slot) {
          slot.player = player;
          availableStarters.splice(i, 1);
        }
      }
    }
  }

  // Pass 3: Distribute leftover starters into any remaining empty slots
  for (const slot of slots) {
    if (!slot.player && availableStarters.length > 0) {
      slot.player = availableStarters.shift() ?? null;
    }
  }

  // Calculate coordinates and apply 180 degree rotation if inverted
  const result: Array<{
    player: Player;
    x: number;
    y: number;
  }> = [];

  for (const slot of slots) {
    if (slot.player) {
      const countInRow = rows[slot.rowIdx] ?? 0;

      let finalRowIdx = totalRows - 1 - slot.rowIdx;
      let finalSlotIdx = slot.slotIdx;

      if (props.inverted) {
        finalRowIdx = slot.rowIdx;
        finalSlotIdx = countInRow - 1 - slot.slotIdx;
      }

      result.push({
        player: slot.player,
        x: getPlayerX(finalSlotIdx, countInRow),
        y: getRowY(slot.rowIdx, totalRows, props.inverted),
      });
    }
  }

  return result;
});

// Player match event helpers
function isPenaltyShootoutEvent(e: any): boolean {
  return e.half === "PENALTY_SHOOTOUT";
}

function getPlayerGoals(playerId: string): number {
  return props.matchEvents.filter(
    (e) =>
      !isPenaltyShootoutEvent(e) &&
      ["GOAL", "PENALTY"].includes(e.type) &&
      (e.playerId === playerId || e.player?.id === playerId),
  ).length;
}

function getPlayerAssists(playerId: string): number {
  return props.matchEvents.filter(
    (e) =>
      !isPenaltyShootoutEvent(e) &&
      ["GOAL", "PENALTY"].includes(e.type) &&
      (e.relatedPlayerId === playerId || e.relatedPlayer?.id === playerId),
  ).length;
}

function getPlayerYellowCards(playerId: string): number {
  return props.matchEvents.filter(
    (e) =>
      e.type === "YELLOW_CARD" &&
      (e.playerId === playerId || e.player?.id === playerId),
  ).length;
}

function getPlayerRedCards(playerId: string): number {
  return props.matchEvents.filter(
    (e) =>
      e.type === "RED_CARD" &&
      (e.playerId === playerId || e.player?.id === playerId),
  ).length;
}

const gradientId = computed(() =>
  props.inverted ? "pitchGradient-away" : "pitchGradient-home",
);
const stripesId = computed(() =>
  props.inverted ? "grassStripes-away" : "grassStripes-home",
);
</script>

<template>
  <div
    class="formation-pitch"
    :class="{
      'formation-pitch--dark': isDark,
      'formation-pitch--inverted': inverted,
    }"
  >
    <!-- Team name header -->
    <div v-if="teamName" class="formation-pitch__header">
      <img
        v-if="teamLogoUrl"
        :src="teamLogoUrl"
        class="formation-pitch__team-logo"
      />
      <span class="formation-pitch__team-name">{{ teamName }}</span>
      <span class="formation-pitch__formation-label">{{ formation }}</span>
    </div>

    <!-- Pitch SVG -->
    <div class="formation-pitch__field">
      <svg
        viewBox="0 0 400 560"
        class="formation-pitch__svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <!-- Pitch background -->
        <rect
          x="0"
          y="0"
          width="400"
          height="560"
          rx="12"
          :fill="`url(#${gradientId})`"
        />

        <!-- Gradient definitions -->
        <defs>
          <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#2d8a4e" />
            <stop offset="50%" stop-color="#34a853" />
            <stop offset="100%" stop-color="#2d8a4e" />
          </linearGradient>
          <!-- Grass stripe pattern -->
          <pattern
            :id="stripesId"
            x="0"
            y="0"
            width="400"
            height="80"
            patternUnits="userSpaceOnUse"
          >
            <rect
              x="0"
              y="0"
              width="400"
              height="40"
              fill="rgba(255,255,255,0.02)"
            />
            <rect
              x="0"
              y="40"
              width="400"
              height="40"
              fill="rgba(0,0,0,0.02)"
            />
          </pattern>
        </defs>

        <!-- Grass stripe overlay -->
        <rect
          x="0"
          y="0"
          width="400"
          height="560"
          rx="12"
          :fill="`url(#${stripesId})`"
        />

        <!-- Pitch outline -->
        <rect
          x="20"
          y="20"
          width="360"
          height="520"
          rx="4"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          stroke-width="1.5"
        />

        <!-- Halfway line -->
        <line
          x1="20"
          y1="280"
          x2="380"
          y2="280"
          stroke="rgba(255,255,255,0.35)"
          stroke-width="1.5"
        />

        <!-- Center circle -->
        <circle
          cx="200"
          cy="280"
          r="50"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          stroke-width="1.5"
        />
        <circle cx="200" cy="280" r="3" fill="rgba(255,255,255,0.35)" />

        <!-- Top penalty box -->
        <rect
          x="100"
          y="20"
          width="200"
          height="80"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          stroke-width="1.5"
        />
        <!-- Top goal area (6-yard box) -->
        <rect
          x="150"
          y="20"
          width="100"
          height="35"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          stroke-width="1.5"
        />
        <!-- Top penalty arc -->
        <path
          d="M 150 100 Q 200 120 250 100"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          stroke-width="1.5"
        />
        <!-- Top penalty spot -->
        <circle cx="200" cy="65" r="2.5" fill="rgba(255,255,255,0.35)" />
        <!-- Top goal -->
        <rect
          x="165"
          y="10"
          width="70"
          height="12"
          rx="3"
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          stroke-width="1"
        />

        <!-- Bottom penalty box -->
        <rect
          x="100"
          y="460"
          width="200"
          height="80"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          stroke-width="1.5"
        />
        <!-- Bottom goal area (6-yard box) -->
        <rect
          x="150"
          y="505"
          width="100"
          height="35"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          stroke-width="1.5"
        />
        <!-- Bottom penalty arc -->
        <path
          d="M 150 460 Q 200 440 250 460"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          stroke-width="1.5"
        />
        <!-- Bottom penalty spot -->
        <circle cx="200" cy="495" r="2.5" fill="rgba(255,255,255,0.35)" />
        <!-- Bottom goal -->
        <rect
          x="165"
          y="538"
          width="70"
          height="12"
          rx="3"
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          stroke-width="1"
        />

        <!-- Corner arcs -->
        <path
          d="M 20 28 Q 28 28 28 20"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          stroke-width="1.5"
        />
        <path
          d="M 372 20 Q 372 28 380 28"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          stroke-width="1.5"
        />
        <path
          d="M 20 532 Q 28 532 28 540"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          stroke-width="1.5"
        />
        <path
          d="M 372 540 Q 372 532 380 532"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          stroke-width="1.5"
        />
      </svg>

      <!-- Player nodes (overlaid on the pitch) -->
      <div class="formation-pitch__players">
        <div
          v-for="item in positionedPlayers"
          :key="item.player.id"
          class="formation-pitch__player"
          :style="{
            top: item.y + '%',
            left: item.x + '%',
          }"
        >
          <!-- Player avatar circle -->
          <div class="formation-pitch__avatar-wrapper">
            <div class="formation-pitch__avatar">
              <img
                v-if="item.player.avatarUrl"
                :src="item.player.avatarUrl"
                class="formation-pitch__avatar-img"
              />
              <span v-else class="formation-pitch__avatar-initial">{{
                item.player.name.charAt(0)
              }}</span>
            </div>
            <!-- Goal badges (bottom-right, stacked with offset) -->
            <div
              v-if="getPlayerGoals(item.player.id) > 0"
              class="formation-pitch__badges formation-pitch__badges--bottom-right"
            >
              <div
                class="formation-pitch__badge formation-pitch__badge--goal"
                :style="{ right: '0px', zIndex: 1 }"
              >
                <IconsSoccerBallIcon class="formation-pitch__badge-icon" />
              </div>
              <span
                v-if="getPlayerGoals(item.player.id) > 1"
                class="formation-pitch__badge-overflow formation-pitch__badge-overflow--right"
                :style="{ right: '-8px', zIndex: 2 }"
              >
                x{{ getPlayerGoals(item.player.id) }}
              </span>
            </div>
            <!-- Assist badges (bottom-left, stacked with offset) -->
            <div
              v-if="getPlayerAssists(item.player.id) > 0"
              class="formation-pitch__badges formation-pitch__badges--bottom-left"
            >
              <div
                class="formation-pitch__badge formation-pitch__badge--assist"
                :style="{ left: '0px', zIndex: 1 }"
              >
                <IconsAssistIcon class="formation-pitch__badge-icon" />
              </div>
              <span
                v-if="getPlayerAssists(item.player.id) > 1"
                class="formation-pitch__badge-overflow formation-pitch__badge-overflow--left"
                :style="{ left: '-8px', zIndex: 2 }"
              >
                x{{ getPlayerAssists(item.player.id) }}
              </span>
            </div>
            <!-- Yellow card badges (top-left) -->
            <div
              v-if="getPlayerYellowCards(item.player.id) > 0"
              class="formation-pitch__badges formation-pitch__badges--top-left"
            >
              <div
                v-for="i in getPlayerYellowCards(item.player.id)"
                :key="'yc-' + i"
                class="formation-pitch__badge formation-pitch__badge--yellow"
              ></div>
            </div>
            <!-- Red card badges (top-right) -->
            <div
              v-if="getPlayerRedCards(item.player.id) > 0"
              class="formation-pitch__badges formation-pitch__badges--top-right"
            >
              <div
                v-for="i in getPlayerRedCards(item.player.id)"
                :key="'rc-' + i"
                class="formation-pitch__badge formation-pitch__badge--red"
              ></div>
            </div>
          </div>
          <!-- Player name -->
          <span class="formation-pitch__player-name">{{
            item.player.name.split(" ").pop()
          }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.formation-pitch {
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
}

.formation-pitch__header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px 16px;
  margin-bottom: 4px;
  min-width: 0;
}

.formation-pitch__team-logo {
  width: 16px;
  height: 16px;
  object-fit: contain;
  flex-shrink: 0;
}

.formation-pitch__team-name {
  font-size: 11px;
  font-weight: 700;
  color: #111827;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  max-width: 160px;
}

.formation-pitch--dark .formation-pitch__team-name {
  color: #f3f4f6;
}

.formation-pitch__formation-label {
  font-size: 9px;
  font-weight: 700;
  color: #6b7280;
  background: rgba(107, 114, 128, 0.1);
  padding: 2px 8px;
  border-radius: 6px;
  letter-spacing: 0.05em;
  flex-shrink: 0;
  white-space: nowrap;
}

.formation-pitch--dark .formation-pitch__formation-label {
  color: #9ca3af;
  background: rgba(255, 255, 255, 0.08);
}

.formation-pitch__field {
  position: relative;
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
}

.formation-pitch__svg {
  display: block;
  width: 100%;
  height: auto;
}

.formation-pitch__players {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.formation-pitch__row {
  position: absolute;
  left: 0;
  right: 0;
  height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.formation-pitch__player {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  pointer-events: auto;
  z-index: 1;
}

.formation-pitch__avatar-wrapper {
  position: relative;
  flex-shrink: 0;
}

.formation-pitch__avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.95);
  border: 2.5px solid rgba(255, 255, 255, 0.9);
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.formation-pitch__player:hover .formation-pitch__avatar {
  transform: scale(1.1);
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.35),
    0 0 0 2px rgba(255, 255, 255, 0.6);
}

.formation-pitch__avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.formation-pitch__avatar-initial {
  font-size: 15px;
  font-weight: 800;
  color: #374151;
  text-transform: uppercase;
  line-height: 1;
}

/* Event badges */
.formation-pitch__badges {
  position: absolute;
  display: flex;
  gap: 1px;
  z-index: 5;
}

.formation-pitch__badges--bottom-right {
  bottom: -4px;
  right: -6px;
  position: absolute;
  height: 16px;
  min-width: 16px;
}

.formation-pitch__badges--bottom-left {
  bottom: -4px;
  left: -6px;
  position: absolute;
  height: 16px;
  min-width: 16px;
}

.formation-pitch__badges--top-left {
  top: -4px;
  left: -6px;
  flex-direction: row;
}

.formation-pitch__badges--top-right {
  top: -4px;
  right: -6px;
  flex-direction: row;
}

.formation-pitch__badge {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
  border: 1.5px solid rgba(255, 255, 255, 0.9);
}

.formation-pitch__badge--goal {
  position: absolute;
  bottom: 0;
  border-width: 1px;
  background: #1a1a2e;
}

.formation-pitch__badge--assist {
  position: absolute;
  bottom: 0;
  border-width: 1px;
  background: #065f46;
}

.formation-pitch__badge--yellow {
  background: #fbbf24;
  border-radius: 1.5px;
  width: 11px;
  min-width: 11px;
  max-width: 11px;
  height: 15px;
  border-width: 1px;
  box-sizing: border-box;
}

.formation-pitch__badge--red {
  background: #ef4444;
  border-radius: 1.5px;
  width: 11px;
  min-width: 11px;
  max-width: 11px;
  height: 15px;
  border-width: 1px;
  box-sizing: border-box;
}

.formation-pitch__badge-icon {
  width: 9px;
  height: 9px;
  color: white;
}

.formation-pitch__badge--goal .formation-pitch__badge-icon {
  color: #e5e7eb;
}

.formation-pitch__badge--assist .formation-pitch__badge-icon {
  color: #6ee7b7;
}

.formation-pitch__badge-overflow {
  position: absolute;
  bottom: 0;
  height: 11px;
  min-width: 11px;
  border-radius: 6px;
  padding: 0 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 6px;
  font-weight: 800;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
  box-sizing: border-box;
  line-height: 1;
  white-space: nowrap;
}

.formation-pitch__badge-overflow--right {
  background: #1a1a2e;
}

.formation-pitch__badge-overflow--left {
  background: #065f46;
}

.formation-pitch__player-name {
  font-size: 10px;
  font-weight: 700;
  color: white;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  max-width: 72px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

/* Mobile responsiveness */
@media (max-width: 480px) {
  .formation-pitch__avatar {
    width: 34px;
    height: 34px;
    border-width: 2px;
  }

  .formation-pitch__avatar-initial {
    font-size: 13px;
  }

  .formation-pitch__player-name {
    font-size: 9px;
    max-width: 60px;
  }

  .formation-pitch__team-name {
    max-width: 120px;
  }

  .formation-pitch__team-logo {
    width: 14px;
    height: 14px;
  }

  .formation-pitch__badge {
    width: 14px;
    height: 14px;
  }

  .formation-pitch__badge-overflow {
    height: 9px;
    min-width: 9px;
    font-size: 5px;
    border-radius: 5px;
    bottom: 0;
  }

  .formation-pitch__badge-icon {
    width: 8px;
    height: 8px;
  }

  .formation-pitch__badge--yellow,
  .formation-pitch__badge--red {
    width: 9px;
    height: 12px;
  }

  .formation-pitch__badges--bottom-right {
    bottom: -3px;
    right: -5px;
  }

  .formation-pitch__badges--bottom-left {
    bottom: -3px;
    left: -5px;
  }

  .formation-pitch__badges--top-left {
    top: -3px;
    left: -5px;
  }

  .formation-pitch__badges--top-right {
    top: -3px;
    right: -5px;
  }
}

@media (max-width: 360px) {
  .formation-pitch__avatar {
    width: 28px;
    height: 28px;
  }

  .formation-pitch__avatar-initial {
    font-size: 11px;
  }

  .formation-pitch__player-name {
    font-size: 8px;
    max-width: 50px;
  }

  .formation-pitch__team-name {
    max-width: 90px;
  }

  .formation-pitch__team-logo {
    width: 12px;
    height: 12px;
  }

  .formation-pitch__badge {
    width: 12px;
    height: 12px;
  }

  .formation-pitch__badge-overflow {
    height: 7px;
    min-width: 7px;
    font-size: 4px;
    border-radius: 4px;
    bottom: 0;
  }

  .formation-pitch__badge-icon {
    width: 7px;
    height: 7px;
  }

  .formation-pitch__badge--yellow,
  .formation-pitch__badge--red {
    width: 7px;
    height: 10px;
  }

  .formation-pitch__badges--bottom-right {
    bottom: -2px;
    right: -4px;
  }

  .formation-pitch__badges--bottom-left {
    bottom: -2px;
    left: -4px;
  }

  .formation-pitch__badges--top-left {
    top: -2px;
    left: -4px;
  }

  .formation-pitch__badges--top-right {
    top: -2px;
    right: -4px;
  }
}
</style>
