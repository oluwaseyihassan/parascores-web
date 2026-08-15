<script setup lang="ts">
import { MatchEventsKey } from "~/composables/match/useMatchEvents";
import type { Fixture } from "~/types";

const collapsed = defineModel<boolean>("collapsed", { default: false });

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
  <div class="mc-section">
    <div
      class="mc-section__head cursor-pointer"
      @click="collapsed = !collapsed"
    >
      <UIcon
        name="i-heroicons-clipboard-document-list"
        class="w-3.5 h-3.5 text-indigo-500"
      />
      <span>Match Events</span>
      <span class="mc-tag">{{ matchEvents.length }}</span>
      <UIcon
        name="i-heroicons-chevron-down"
        class="w-4 h-4 ml-auto transition-transform"
        :class="{ 'rotate-180': collapsed }"
      />
    </div>
    <div v-show="collapsed" class="mc-section__body">
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
      <div v-else class="mc-events-list">
        <div
          v-for="group in groupedMatchEvents"
          :key="group.half"
          class="mc-events-group"
        >
          <div class="mc-events-group__header">{{ group.label }}</div>
          <div v-for="event in group.events" :key="event.id">
            <!-- Home event -->
            <div
              v-if="event.participant_id === fixture?.homeTeamId"
              class="mc-event mc-event--home"
            >
              <div class="mc-event__min">
                {{ getEventMinuteDisplay(event) }}
              </div>
              <div class="mc-event__info">
                <div class="flex items-center gap-1.5">
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
                  <span class="mc-event__player">{{
                    getPlayerName(event.playerId) || "Unknown"
                  }}</span>
                  <span v-if="event.type === 'PENALTY'" class="mc-event__tag"
                    >(P)</span
                  >
                  <span v-if="event.type === 'OWN_GOAL'" class="mc-event__tag"
                    >(OG)</span
                  >
                </div>
                <div
                  v-if="
                    event.relatedPlayerId &&
                    event.type !== 'OWN_GOAL' &&
                    event.type !== 'SUBSTITUTION'
                  "
                  class="mc-event__assist"
                >
                  <IconsAssistIcon class="w-2.5 h-2.5 flex-shrink-0" />
                  {{ getPlayerName(event.relatedPlayerId) }}
                </div>
                <div
                  v-if="event.type === 'SUBSTITUTION' && event.relatedPlayerId"
                  class="text-red-500 text-[10px] font-semibold flex items-center gap-1 mt-0.5"
                >
                  <UIcon
                    name="i-heroicons-arrow-down-circle"
                    class="w-3 h-3 text-red-500 flex-shrink-0"
                  />
                  <span>off: {{ getPlayerName(event.relatedPlayerId) }}</span>
                </div>
              </div>
              <UDropdownMenu
                :items="getEventActionItems(event)"
                :content="{ align: 'end' }"
              >
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-ellipsis-vertical"
                  size="xs"
                />
              </UDropdownMenu>
            </div>
            <!-- Away event -->
            <div
              v-else-if="event.participant_id === fixture?.awayTeamId"
              class="mc-event mc-event--away"
            >
              <UDropdownMenu
                :items="getEventActionItems(event)"
                :content="{ align: 'start' }"
              >
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-ellipsis-vertical"
                  size="xs"
                />
              </UDropdownMenu>
              <div class="mc-event__info mc-event__info--right">
                <div class="flex items-center justify-end gap-1.5">
                  <span v-if="event.type === 'OWN_GOAL'" class="mc-event__tag"
                    >(OG)</span
                  >
                  <span v-if="event.type === 'PENALTY'" class="mc-event__tag"
                    >(P)</span
                  >
                  <span class="mc-event__player">{{
                    getPlayerName(event.playerId) || "Unknown"
                  }}</span>
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
                <div
                  v-if="
                    event.relatedPlayerId &&
                    event.type !== 'OWN_GOAL' &&
                    event.type !== 'SUBSTITUTION'
                  "
                  class="mc-event__assist mc-event__assist--right"
                >
                  {{ getPlayerName(event.relatedPlayerId) }}
                  <IconsAssistIcon class="w-2.5 h-2.5 flex-shrink-0" />
                </div>
                <div
                  v-if="event.type === 'SUBSTITUTION' && event.relatedPlayerId"
                  class="text-red-500 text-[10px] font-semibold flex items-center justify-end gap-1 mt-0.5"
                >
                  <span>off: {{ getPlayerName(event.relatedPlayerId) }}</span>
                  <UIcon
                    name="i-heroicons-arrow-down-circle"
                    class="w-3 h-3 text-red-500 flex-shrink-0"
                  />
                </div>
              </div>
              <div class="mc-event__min">
                {{ getEventMinuteDisplay(event) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
