<script setup lang="ts">
import { MatchEventsKey } from "~/composables/match/useMatchEvents";
import type { Fixture } from "~/types";

defineProps<{
  fixture: Fixture | null;
}>();

const {
  matchEvents,
  loadingEvents,
  groupedMatchEvents,
  getEventMinuteDisplay,
  getEventIcon,
  getEventColor,
  getPlayerName,
  getEventActionItems,
} = inject(MatchEventsKey)!;
</script>

<template>
  <!-- The event log IS the Events tab content — always expanded, no chevron -->
  <div class="mc-section">
    <div class="mc-section__head mc-section__head--static">
      <UIcon
        name="i-heroicons-clipboard-document-list"
        class="w-3.5 h-3.5 text-indigo-500"
      />
      <span>Match Events</span>
      <span class="mc-tag">{{ matchEvents.length }}</span>
    </div>
    <div class="mc-section__body mc-section__body--flush">
      <div
        v-if="loadingEvents"
        class="flex items-center justify-center gap-2 py-6 text-sm text-gray-400"
      >
        <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
        Loading…
      </div>
      <div
        v-else-if="matchEvents.length === 0"
        class="py-6 text-center text-sm text-gray-400"
      >
        No events recorded yet
      </div>

      <!-- Two-sided timeline: home left / away right around a center minute -->
      <div v-else class="mc-timeline">
        <div
          v-for="group in groupedMatchEvents"
          :key="group.half"
        >
          <div class="mc-timeline__group" role="separator">{{ group.label }}</div>
          <div
            v-for="event in group.events"
            :key="event.id"
            class="mc-tl-row"
          >
            <!-- Home event: content hugs the center, actions on the outer edge -->
            <template v-if="event.participant_id === fixture?.homeTeamId">
              <div class="mc-tl-side mc-tl-side--home">
                <UDropdownMenu
                  :items="getEventActionItems(event)"
                  :content="{ align: 'start' }"
                >
                  <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-ellipsis-vertical"
                    size="xs"
                    aria-label="Event actions"
                  />
                </UDropdownMenu>
                <span class="mc-tl-spacer" />
                <div class="mc-tl-text mc-tl-text--right">
                  <div class="mc-tl-player">
                    {{ getPlayerName(event.playerId) || "Unknown" }}
                    <span v-if="event.type === 'PENALTY'" class="mc-event__tag">(P)</span>
                    <span v-if="event.type === 'OWN_GOAL'" class="mc-event__tag">(OG)</span>
                  </div>
                  <div
                    v-if="
                      event.relatedPlayerId &&
                      event.type !== 'OWN_GOAL' &&
                      event.type !== 'SUBSTITUTION'
                    "
                    class="mc-tl-detail"
                  >
                    assist: {{ getPlayerName(event.relatedPlayerId) }}
                  </div>
                  <div
                    v-if="event.type === 'SUBSTITUTION' && event.relatedPlayerId"
                    class="mc-tl-detail mc-tl-detail--off"
                  >
                    off: {{ getPlayerName(event.relatedPlayerId) }}
                  </div>
                </div>
                <IconsSoccerBallIcon
                  v-if="['GOAL', 'PENALTY', 'OWN_GOAL'].includes(event.type)"
                  class="w-4 h-4 flex-shrink-0"
                  :class="getEventColor(event.type)"
                />
                <UIcon
                  v-else
                  :name="getEventIcon(event.type)"
                  :class="['w-4 h-4 flex-shrink-0', getEventColor(event.type)]"
                />
              </div>
              <span class="mc-tl-min">{{ getEventMinuteDisplay(event) }}</span>
              <div />
            </template>

            <!-- Away event -->
            <template v-else-if="event.participant_id === fixture?.awayTeamId">
              <div />
              <span class="mc-tl-min">{{ getEventMinuteDisplay(event) }}</span>
              <div class="mc-tl-side">
                <IconsSoccerBallIcon
                  v-if="['GOAL', 'PENALTY', 'OWN_GOAL'].includes(event.type)"
                  class="w-4 h-4 flex-shrink-0"
                  :class="getEventColor(event.type)"
                />
                <UIcon
                  v-else
                  :name="getEventIcon(event.type)"
                  :class="['w-4 h-4 flex-shrink-0', getEventColor(event.type)]"
                />
                <div class="mc-tl-text">
                  <div class="mc-tl-player">
                    <span v-if="event.type === 'OWN_GOAL'" class="mc-event__tag">(OG)</span>
                    <span v-if="event.type === 'PENALTY'" class="mc-event__tag">(P)</span>
                    {{ getPlayerName(event.playerId) || "Unknown" }}
                  </div>
                  <div
                    v-if="
                      event.relatedPlayerId &&
                      event.type !== 'OWN_GOAL' &&
                      event.type !== 'SUBSTITUTION'
                    "
                    class="mc-tl-detail"
                  >
                    assist: {{ getPlayerName(event.relatedPlayerId) }}
                  </div>
                  <div
                    v-if="event.type === 'SUBSTITUTION' && event.relatedPlayerId"
                    class="mc-tl-detail mc-tl-detail--off"
                  >
                    off: {{ getPlayerName(event.relatedPlayerId) }}
                  </div>
                </div>
                <span class="mc-tl-spacer" />
                <UDropdownMenu
                  :items="getEventActionItems(event)"
                  :content="{ align: 'end' }"
                >
                  <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-ellipsis-vertical"
                    size="xs"
                    aria-label="Event actions"
                  />
                </UDropdownMenu>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
