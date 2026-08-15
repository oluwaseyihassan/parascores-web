<script setup lang="ts">
import { MatchEventType } from "~/types";
import type { Fixture } from "~/types";
import { PenaltiesKey } from "~/composables/match/usePenalties";
import { MatchEventsKey } from "~/composables/match/useMatchEvents";

const collapsed = defineModel<boolean>("collapsed", { default: false });

defineProps<{
  fixture: Fixture | null;
  updatingMatch: boolean;
}>();

const {
  homePenaltyPlayerId,
  awayPenaltyPlayerId,
  hasPenalties,
  homePenaltyPlayerOptions,
  awayPenaltyPlayerOptions,
  recordPenaltyShot,
  openRemovePenaltiesModal,
} = inject(PenaltiesKey)!;

const {
  penaltyShootoutEvents,
  homePenaltyShootoutEvents,
  awayPenaltyShootoutEvents,
  chronologicalPenaltyEvents,
  maxPenaltyRounds,
  getPlayerName,
  getEventActionItems,
} = inject(MatchEventsKey)!;
</script>

<template>
  <div class="mc-section">
    <div
      class="mc-section__head cursor-pointer"
      @click="collapsed = !collapsed"
    >
      <UIcon name="i-heroicons-bolt" class="w-3.5 h-3.5 text-amber-500" />
      <span>Penalty Shootout</span>
      <span class="mc-tag">Tie Breaker</span>
      <UIcon
        name="i-heroicons-chevron-down"
        class="w-4 h-4 ml-auto transition-transform"
        :class="{ 'rotate-180': collapsed }"
      />
    </div>
    <div v-show="collapsed" class="mc-section__body">
      <!-- Scores -->
      <div class="flex items-center justify-center gap-6 mb-4">
        <div class="flex flex-col items-center gap-2">
          <span class="mc-pen-label">{{
            fixture?.homeTeam?.customShortName ||
            fixture?.homeTeam?.customName ||
            "Home"
          }}</span>
          <span class="text-2xl font-bold text-gray-900 dark:text-white">{{
            fixture?.homePenaltyScore ?? 0
          }}</span>
        </div>
        <span class="text-gray-400 font-medium">–</span>
        <div class="flex flex-col items-center gap-2">
          <span class="mc-pen-label">{{
            fixture?.awayTeam?.customShortName ||
            fixture?.awayTeam?.customName ||
            "Away"
          }}</span>
          <span class="text-2xl font-bold text-gray-900 dark:text-white">{{
            fixture?.awayPenaltyScore ?? 0
          }}</span>
        </div>
      </div>

      <!-- Per-shot buttons -->
      <div class="grid grid-cols-2 gap-4">
        <div class="flex flex-col gap-2">
          <span
            class="text-[10px] font-bold uppercase tracking-wider text-gray-500 text-center"
            >Home</span
          >
          <USelect
            v-if="homePenaltyPlayerOptions.length > 0"
            v-model="homePenaltyPlayerId"
            :items="homePenaltyPlayerOptions"
            placeholder="Select shooter…"
            value-key="value"
            size="xs"
            class="w-full"
          />
          <div class="flex gap-2 justify-center">
            <button
              class="mc-pen-btn mc-pen-btn--scored"
              :disabled="updatingMatch"
              @click="recordPenaltyShot('home', 'scored', homePenaltyPlayerId)"
            >
              Scored
            </button>
            <button
              class="mc-pen-btn mc-pen-btn--missed"
              :disabled="updatingMatch"
              @click="recordPenaltyShot('home', 'missed', homePenaltyPlayerId)"
            >
              Missed
            </button>
            <button
              class="mc-pen-btn mc-pen-btn--saved"
              :disabled="updatingMatch"
              @click="recordPenaltyShot('home', 'saved', homePenaltyPlayerId)"
            >
              Saved
            </button>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <span
            class="text-[10px] font-bold uppercase tracking-wider text-gray-500 text-center"
            >Away</span
          >
          <USelect
            v-if="awayPenaltyPlayerOptions.length > 0"
            v-model="awayPenaltyPlayerId"
            :items="awayPenaltyPlayerOptions"
            placeholder="Select shooter…"
            value-key="value"
            size="xs"
            class="w-full"
          />
          <div class="flex gap-2 justify-center">
            <button
              class="mc-pen-btn mc-pen-btn--scored"
              :disabled="updatingMatch"
              @click="recordPenaltyShot('away', 'scored', awayPenaltyPlayerId)"
            >
              Scored
            </button>
            <button
              class="mc-pen-btn mc-pen-btn--missed"
              :disabled="updatingMatch"
              @click="recordPenaltyShot('away', 'missed', awayPenaltyPlayerId)"
            >
              Missed
            </button>
            <button
              class="mc-pen-btn mc-pen-btn--saved"
              :disabled="updatingMatch"
              @click="recordPenaltyShot('away', 'saved', awayPenaltyPlayerId)"
            >
              Saved
            </button>
          </div>
        </div>
      </div>

      <!-- Recent shootout events -->
      <div v-if="penaltyShootoutEvents.length > 0" class="mt-6 space-y-6">
        <!-- Team round indicators -->
        <div class="flex items-center justify-center gap-4 md:gap-8">
          <div
            class="flex flex-wrap items-center justify-center gap-1.5 md:gap-2 max-w-[45%]"
          >
            <div
              v-for="n in maxPenaltyRounds"
              :key="`home-${n}`"
              class="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold"
              :class="
                homePenaltyShootoutEvents[n - 1]?.type === MatchEventType.PENALTY
                  ? 'bg-emerald-500 text-white'
                  : homePenaltyShootoutEvents[n - 1]
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400'
              "
            >
              <UIcon
                v-if="
                  homePenaltyShootoutEvents[n - 1]?.type ===
                  MatchEventType.PENALTY
                "
                name="i-heroicons-check"
                class="w-3 h-3 sm:w-3.5 sm:h-3.5"
              />
              <UIcon
                v-else-if="homePenaltyShootoutEvents[n - 1]"
                name="i-heroicons-x-mark"
                class="w-3 h-3 sm:w-3.5 sm:h-3.5"
              />
              <span v-else>{{ n }}</span>
            </div>
          </div>
          <div class="w-px h-6 bg-gray-300 dark:bg-white/10" />
          <div
            class="flex flex-wrap items-center justify-center gap-1.5 md:gap-2 max-w-[45%]"
          >
            <div
              v-for="n in maxPenaltyRounds"
              :key="`away-${n}`"
              class="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold"
              :class="
                awayPenaltyShootoutEvents[n - 1]?.type === MatchEventType.PENALTY
                  ? 'bg-emerald-500 text-white'
                  : awayPenaltyShootoutEvents[n - 1]
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400'
              "
            >
              <UIcon
                v-if="
                  awayPenaltyShootoutEvents[n - 1]?.type ===
                  MatchEventType.PENALTY
                "
                name="i-heroicons-check"
                class="w-3 h-3 sm:w-3.5 sm:h-3.5"
              />
              <UIcon
                v-else-if="awayPenaltyShootoutEvents[n - 1]"
                name="i-heroicons-x-mark"
                class="w-3 h-3 sm:w-3.5 sm:h-3.5"
              />
              <span v-else>{{ n }}</span>
            </div>
          </div>
        </div>

        <!-- Chronological shootout list -->
        <div class="space-y-3">
          <div
            v-for="event in chronologicalPenaltyEvents"
            :key="event.id"
            class="flex items-center text-sm"
            :class="event.isHome ? 'flex-row' : 'flex-row-reverse'"
          >
            <div
              class="flex-1 min-w-0"
              :class="event.isHome ? 'pr-3 md:pr-4' : 'pl-3 md:pl-4'"
            >
              <div
                class="flex items-center gap-1.5"
                :class="event.isHome ? 'justify-end' : 'justify-start'"
              >
                <span
                  class="font-semibold text-gray-900 dark:text-white truncate"
                >
                  {{
                    getPlayerName(event.playerId) ||
                    (event.isHome ? "Home" : "Away")
                  }}
                </span>
                <UDropdownMenu
                  :items="getEventActionItems(event)"
                  :content="{ align: event.isHome ? 'end' : 'start' }"
                >
                  <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-ellipsis-vertical"
                    size="xs"
                  />
                </UDropdownMenu>
              </div>
            </div>
            <div
              class="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center flex-shrink-0"
              :class="
                event.isScored
                  ? 'bg-emerald-500/20 text-emerald-500'
                  : 'bg-red-500/20 text-red-500'
              "
            >
              <UIcon
                :name="
                  event.isScored ? 'i-heroicons-check' : 'i-heroicons-x-mark'
                "
                class="w-4 h-4 md:w-5 md:h-5"
              />
            </div>
            <div
              class="flex-1 min-w-0"
              :class="
                event.isHome ? 'text-left pl-3 md:pl-4' : 'text-right pr-3 md:pr-4'
              "
            >
              <span class="font-semibold text-gray-900 dark:text-white">
                ({{ event.homeScore }} - {{ event.awayScore }})
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-center gap-2 mt-4">
        <UButton
          v-if="hasPenalties"
          size="xs"
          color="warning"
          variant="soft"
          icon="i-heroicons-trash"
          label="Remove Penalties"
          :loading="updatingMatch"
          @click="openRemovePenaltiesModal"
        />
      </div>
      <p class="text-xs text-center text-gray-400 dark:text-gray-500 mt-2">
        Record each penalty shootout shot. End the match when the shootout is
        decided.
      </p>
    </div>
  </div>
</template>
