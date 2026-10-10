<script setup lang="ts">
import { MatchLineupsKey } from "~/composables/match/useMatchLineups";
import type { Fixture, Player } from "~/types";

defineProps<{
  fixture: Fixture | null;
  homePlayers: Player[];
  awayPlayers: Player[];
  loadingPlayers: boolean;
}>();

const colorMode = useColorMode();
const isDark = computed(() => colorMode.value === "dark");

const {
  selectedLineupIds,
  savingLineups,
  homeFormation,
  awayFormation,
  lineupViewMode,
  lineupPositions,
  activeLineupTeam,
  formationPresets,
  togglePlayerLineup,
  selectAllRoster,
  clearRosterLineup,
  handlePlayerPositionUpdate,
  saveLineups,
} = inject(MatchLineupsKey)!;
</script>

<template>
  <div class="mc-section">
    <div class="mc-section__head mc-section__head--static">
      <UIcon name="i-heroicons-users" class="w-3.5 h-3.5 text-emerald-500" />
      <span>Lineups</span>
      <span class="mc-tag">{{ selectedLineupIds.length }} selected</span>
    </div>
    <div class="mc-section__body">
      <!-- Formation Selection -->
      <div
        class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-100 dark:border-white/[0.06]"
      >
        <UFormField label="Home Formation">
          <select
            v-model="homeFormation"
            class="relative w-full rounded-md border border-gray-300 dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option
              v-for="preset in formationPresets"
              :key="preset.value"
              :value="preset.value"
            >
              {{ preset.label }}
            </option>
          </select>
        </UFormField>
        <UFormField label="Away Formation">
          <select
            v-model="awayFormation"
            class="relative w-full rounded-md border border-gray-300 dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option
              v-for="preset in formationPresets"
              :key="preset.value"
              :value="preset.value"
            >
              {{ preset.label }}
            </option>
          </select>
        </UFormField>
      </div>

      <!-- View Mode Toggle -->
      <div
        class="flex items-center justify-between mb-4 pb-4 border-b border-gray-100 dark:border-white/[0.06]"
      >
        <span class="text-xs font-semibold text-gray-500 dark:text-gray-400"
          >Builder Mode:</span
        >
        <div
          class="flex items-center gap-1.5 bg-gray-100 dark:bg-white/[0.06] p-0.5 rounded-lg border border-gray-200 dark:border-white/[0.04]"
        >
          <button
            type="button"
            class="px-3 py-1 rounded-md text-[11px] font-bold transition-all"
            :class="
              lineupViewMode === 'pitch'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            "
            @click="lineupViewMode = 'pitch'"
          >
            Visual Pitch
          </button>
          <button
            type="button"
            class="px-3 py-1 rounded-md text-[11px] font-bold transition-all"
            :class="
              lineupViewMode === 'list'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            "
            @click="lineupViewMode = 'list'"
          >
            Roster List
          </button>
        </div>
      </div>

      <!-- Team Switcher Tabs -->
      <div class="flex justify-center mb-6">
        <div
          class="inline-flex bg-gray-100 dark:bg-white/[0.06] p-0.5 rounded-lg border border-gray-200 dark:border-white/[0.04] w-full max-w-[320px] sm:max-w-[400px]"
        >
          <button
            type="button"
            class="flex-1 text-center py-1.5 px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer min-w-0"
            :class="
              activeLineupTeam === 'home'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            "
            @click="activeLineupTeam = 'home'"
          >
            <img
              v-if="fixture?.homeTeam?.logoUrl"
              :src="fixture.homeTeam.logoUrl"
              class="w-3.5 h-3.5 object-contain flex-shrink-0"
            />
            <span class="truncate block min-w-0 flex-1 text-center">
              {{
                fixture?.homeTeam?.customShortName ||
                fixture?.homeTeam?.customName ||
                "Home Team"
              }}
            </span>
            <span
              v-if="lineupViewMode === 'pitch' && homeFormation"
              class="text-[10px] opacity-75 font-semibold flex-shrink-0"
              >({{ homeFormation }})</span
            >
          </button>
          <button
            type="button"
            class="flex-1 text-center py-1.5 px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer min-w-0"
            :class="
              activeLineupTeam === 'away'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            "
            @click="activeLineupTeam = 'away'"
          >
            <span
              v-if="lineupViewMode === 'pitch' && awayFormation"
              class="text-[10px] opacity-75 font-semibold flex-shrink-0"
              >({{ awayFormation }})</span
            >
            <span class="truncate block min-w-0 flex-1 text-center">
              {{
                fixture?.awayTeam?.customShortName ||
                fixture?.awayTeam?.customName ||
                "Away Team"
              }}
            </span>
            <img
              v-if="fixture?.awayTeam?.logoUrl"
              :src="fixture.awayTeam.logoUrl"
              class="w-3.5 h-3.5 object-contain flex-shrink-0"
            />
          </button>
        </div>
      </div>

      <!-- Visual Pitch Editor -->
      <div v-if="lineupViewMode === 'pitch'">
        <div
          v-if="!homeFormation && !awayFormation"
          class="border border-dashed border-gray-200 dark:border-white/10 rounded-xl p-8 text-center bg-gray-50/50 dark:bg-white/[0.01]"
        >
          <UIcon
            name="i-heroicons-information-circle"
            class="w-8 h-8 text-gray-400 mb-2 mx-auto"
          />
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Please select a formation for the teams above to use the visual
            pitch builder.
          </p>
        </div>
        <div v-else>
          <!-- Home Team Visual Builder -->
          <div v-if="activeLineupTeam === 'home'" class="w-full">
            <div class="w-full" v-if="homeFormation">
              <FormationPitchEditor
                :players="homePlayers"
                v-model:selectedLineupIds="selectedLineupIds"
                :formation="homeFormation"
                :teamName="
                  fixture?.homeTeam?.customShortName ||
                  fixture?.homeTeam?.customName ||
                  'Home'
                "
                :is-dark="isDark"
                :lineupPositions="lineupPositions"
                @update-player-position="
                  (playerId, pos) =>
                    handlePlayerPositionUpdate('home', playerId, pos)
                "
              />
            </div>
            <div
              v-else
              class="border border-dashed border-gray-200 dark:border-white/10 rounded-xl p-8 text-center bg-gray-50/50 dark:bg-white/[0.01] flex flex-col justify-center items-center"
            >
              <UIcon
                name="i-heroicons-information-circle"
                class="w-6 h-6 text-gray-400 mb-1"
              />
              <p class="text-[11px] text-gray-500">
                Select Home formation to show pitch.
              </p>
            </div>
          </div>

          <!-- Away Team Visual Builder -->
          <div v-if="activeLineupTeam === 'away'" class="w-full">
            <div class="w-full" v-if="awayFormation">
              <FormationPitchEditor
                :players="awayPlayers"
                v-model:selectedLineupIds="selectedLineupIds"
                :formation="awayFormation"
                :teamName="
                  fixture?.awayTeam?.customShortName ||
                  fixture?.awayTeam?.customName ||
                  'Away'
                "
                :is-dark="isDark"
                :lineupPositions="lineupPositions"
                @update-player-position="
                  (playerId, pos) =>
                    handlePlayerPositionUpdate('away', playerId, pos)
                "
              />
            </div>
            <div
              v-else
              class="border border-dashed border-gray-200 dark:border-white/10 rounded-xl p-8 text-center bg-gray-50/50 dark:bg-white/[0.01] flex flex-col justify-center items-center"
            >
              <UIcon
                name="i-heroicons-information-circle"
                class="w-6 h-6 text-gray-400 mb-1"
              />
              <p class="text-[11px] text-gray-500">
                Select Away formation to show pitch.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Roster Checkbox Lists (List Mode) -->
      <div v-else>
        <!-- Home Roster -->
        <div v-if="activeLineupTeam === 'home'" class="mc-roster-box">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2 min-w-0">
              <img
                v-if="fixture?.homeTeam?.logoUrl"
                :src="fixture.homeTeam.logoUrl"
                class="w-4 h-4 object-contain flex-shrink-0"
              />
              <span
                class="text-xs font-bold uppercase tracking-wider text-gray-500 truncate min-w-0"
              >
                {{
                  fixture?.homeTeam?.customShortName ||
                  fixture?.homeTeam?.customName ||
                  "Home Roster"
                }}
              </span>
            </div>
            <div class="flex gap-1.5 flex-shrink-0">
              <UButton
                size="xs"
                variant="ghost"
                color="primary"
                label="All"
                @click="selectAllRoster('home')"
              />
              <UButton
                size="xs"
                variant="ghost"
                color="neutral"
                label="Clear"
                @click="clearRosterLineup('home')"
              />
            </div>
          </div>
          <div v-if="loadingPlayers" class="flex justify-center py-4">
            <UIcon
              name="i-heroicons-arrow-path"
              class="w-4 h-4 animate-spin text-gray-400"
            />
          </div>
          <div
            v-else-if="homePlayers.length === 0"
            class="text-xs text-gray-500 text-center py-4"
          >
            No roster players listed.
          </div>
          <div v-else class="mc-roster-list">
            <div
              v-for="player in homePlayers"
              :key="player.id"
              class="mc-roster-item"
            >
              <UCheckbox
                :model-value="selectedLineupIds.includes(player.id)"
                @update:model-value="
                  (val) => togglePlayerLineup(player.id, !!val)
                "
                :id="`lineup-player-home-${player.id}`"
                :label="`${player.number ? '#' + player.number + ' ' : ''}${player.name} ${player.position ? '(' + player.position.split('-')[0] + ')' : ''}`"
              />
            </div>
          </div>
        </div>

        <!-- Away Roster -->
        <div v-if="activeLineupTeam === 'away'" class="mc-roster-box">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2 min-w-0">
              <img
                v-if="fixture?.awayTeam?.logoUrl"
                :src="fixture.awayTeam.logoUrl"
                class="w-4 h-4 object-contain flex-shrink-0"
              />
              <span
                class="text-xs font-bold uppercase tracking-wider text-gray-500 truncate min-w-0"
              >
                {{
                  fixture?.awayTeam?.customShortName ||
                  fixture?.awayTeam?.customName ||
                  "Away Roster"
                }}
              </span>
            </div>
            <div class="flex gap-1.5 flex-shrink-0">
              <UButton
                size="xs"
                variant="ghost"
                color="primary"
                label="All"
                @click="selectAllRoster('away')"
              />
              <UButton
                size="xs"
                variant="ghost"
                color="neutral"
                label="Clear"
                @click="clearRosterLineup('away')"
              />
            </div>
          </div>
          <div v-if="loadingPlayers" class="flex justify-center py-4">
            <UIcon
              name="i-heroicons-arrow-path"
              class="w-4 h-4 animate-spin text-gray-400"
            />
          </div>
          <div
            v-else-if="awayPlayers.length === 0"
            class="text-xs text-gray-500 text-center py-4"
          >
            No roster players listed.
          </div>
          <div v-else class="mc-roster-list">
            <div
              v-for="player in awayPlayers"
              :key="player.id"
              class="mc-roster-item"
            >
              <UCheckbox
                :model-value="selectedLineupIds.includes(player.id)"
                @update:model-value="
                  (val) => togglePlayerLineup(player.id, !!val)
                "
                :id="`lineup-player-away-${player.id}`"
                :label="`${player.number ? '#' + player.number + ' ' : ''}${player.name} ${player.position ? '(' + player.position.split('-')[0] + ')' : ''}`"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Save button -->
      <div class="mt-6 flex justify-end">
        <UButton
          color="primary"
          variant="solid"
          size="sm"
          icon="i-heroicons-check"
          label="Save Lineups"
          :loading="savingLineups"
          @click="saveLineups"
        />
      </div>
    </div>
  </div>
</template>
