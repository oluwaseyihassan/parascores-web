<template>
  <NuxtLink
    :to="toTournament(tournament)"
    class="group bg-[#0A0A0A] border border-white/10 rounded-xl p-5 hover:border-emerald-500/50 transition-all duration-300 card-fade-in flex flex-col h-full"
  >
    <!-- Header Row: Sport, Logo, Type Badge -->
    <div class="flex items-start justify-between mb-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
          <img
            v-if="tournament.logoUrl"
            :src="tournament.logoUrl"
            :alt="tournament.name"
            class="w-full h-full object-cover"
          />
          <span v-else class="text-sm font-bold text-white">
            {{ tournament.name.charAt(0).toUpperCase() }}
          </span>
        </div>
        <div>
          <span class="text-xs font-medium text-emerald-400 uppercase tracking-wide">
            {{ tournament.sport }}
          </span>
        </div>
      </div>
    </div>

    <!-- Title & Desc -->
    <div class="flex-1">
      <h3 class="text-lg font-bold text-white leading-tight group-hover:text-emerald-400 transition-colors line-clamp-2">
        {{ tournament.name }}
      </h3>
    </div>

    <!-- Meta Info (Footer) -->
    <div class="mt-4 pt-4 border-t border-white/5 flex flex-col gap-2.5 text-xs text-gray-400 font-medium">
      <div v-if="tournament.organization" class="flex items-center gap-1.5">
        <span class="text-gray-500">Hosted by</span>
        <button @click.prevent="navigateTo(toMain('/org/' + tournament.organization.slug))" class="flex items-center gap-1 hover:text-emerald-400 transition-colors z-10 relative group/org">
          <span class="text-gray-300 truncate max-w-[150px] group-hover/org:text-white transition-colors">{{ tournament.organization.name }}</span>
          <UIcon
            v-if="tournament.organization.isVerified"
            name="i-heroicons-check-badge-solid"
            class="w-4 h-4 text-blue-400 shrink-0"
            title="Verified Organization"
          />
        </button>
      </div>
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div class="flex items-center gap-1.5">
           <UIcon name="i-heroicons-calendar" class="w-4 h-4 text-gray-500" />
           {{ formatDate(tournament.start_date) }}
        </div>
        <div v-if="tournament.location" class="flex items-center gap-1.5">
           <UIcon name="i-heroicons-map-pin" class="w-4 h-4 text-gray-500" />
           <span class="truncate max-w-[120px]">{{ tournament.location }}</span>
        </div>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { Tournament } from '~/types'

const props = defineProps<{
  tournament: Tournament
}>()

const { toMain, toTournament } = useHost()

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
</script>

<style scoped>
.card-fade-in {
  opacity: 0;
  animation: cardFadeUp 0.5s ease-out forwards;
}

@keyframes cardFadeUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
