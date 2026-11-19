<template>
  <NuxtLink
    :to="toTournament(edition)"
    class="group flex flex-col justify-between bg-white dark:bg-[#141414] border border-subtle rounded-2xl p-4 sm:p-5 hover:border-emerald-500/40 dark:hover:border-emerald-500/40 transition-all duration-200 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
  >
    <div>
      <!-- Top Row: Logo + Title + Status -->
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-3.5 min-w-0">
          <div
            class="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-neutral-800/90 border border-subtle shrink-0 flex items-center justify-center"
          >
            <img
              v-if="edition.logoUrl"
              :src="edition.logoUrl"
              :alt="editionTitle"
              class="w-full h-full object-cover"
            />
            <span v-else class="text-base font-black text-heading">
              {{ editionTitle.charAt(0).toUpperCase() }}
            </span>
          </div>

          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="text-base font-bold text-heading group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                {{ editionTitle }}
              </h3>
              <span
                v-if="isCurrent"
                class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0"
              >
                Current
              </span>
            </div>
            <p v-if="showFullName" class="text-xs text-body truncate mt-0.5">
              {{ edition.name }}
            </p>
          </div>
        </div>

        <!-- Status Pill -->
        <span
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0"
          :class="statusMeta.badgeClass"
        >
          <span
            v-if="edition.status === 'live'"
            class="w-1.5 h-1.5 rounded-full bg-rose-500 motion-safe:animate-pulse"
          />
          {{ statusMeta.label }}
        </span>
      </div>

      <!-- Meta Row -->
      <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-body tabular-nums">
        <span v-if="dateRange" class="inline-flex items-center gap-1.5">
          <UIcon name="i-heroicons-calendar" class="w-3.5 h-3.5 text-muted shrink-0" />
          {{ dateRange }}
        </span>
        <span v-if="participantCount != null" class="inline-flex items-center gap-1.5">
          <UIcon name="i-heroicons-users" class="w-3.5 h-3.5 text-muted shrink-0" />
          {{ participantCount }} {{ participantCount === 1 ? 'participant' : 'participants' }}
        </span>
        <span v-if="edition.location" class="inline-flex items-center gap-1.5 min-w-0">
          <UIcon name="i-heroicons-map-pin" class="w-3.5 h-3.5 text-muted shrink-0" />
          <span class="truncate">{{ edition.location }}</span>
        </span>
      </div>
    </div>

    <!-- Bottom Row: Champion or Action -->
    <div class="mt-4 pt-3.5 border-t border-subtle flex items-center justify-between gap-3">
      <div
        v-if="edition.champion"
        class="inline-flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400 min-w-0"
      >
        <UIcon name="i-heroicons-trophy" class="w-4 h-4 shrink-0" />
        <img
          v-if="edition.champion.logoUrl"
          :src="edition.champion.logoUrl"
          :alt="edition.champion.name"
          class="w-4 h-4 rounded-full object-cover shrink-0"
        />
        <span class="truncate">Champion: <strong class="font-bold text-amber-700 dark:text-amber-300">{{ edition.champion.name }}</strong></span>
      </div>
      <span v-else class="text-xs font-medium text-muted capitalize">
        {{ formattedType }}
      </span>

      <span class="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:translate-x-0.5 transition-transform">
        View edition
        <UIcon name="i-heroicons-arrow-right" class="w-3.5 h-3.5" />
      </span>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { CompetitionEdition } from '~/types'
import { formatEditionDateRange, getEditionLabel, getEditionStatusMeta } from '~/utils/competition'

const props = defineProps<{
  edition: CompetitionEdition
  isCurrent?: boolean
}>()

const { toTournament } = useHost()

const editionTitle = computed(() => getEditionLabel(props.edition))

const showFullName = computed(() =>
  Boolean(props.edition.name && props.edition.name !== editionTitle.value),
)

const participantCount = computed(() => props.edition._count?.participants ?? null)
const statusMeta = computed(() => getEditionStatusMeta(props.edition.status))
const dateRange = computed(() => formatEditionDateRange(props.edition.start_date, props.edition.end_date))
const formattedType = computed(() =>
  props.edition.type ? props.edition.type.toLowerCase().replaceAll('_', ' ') : 'tournament',
)
</script>
