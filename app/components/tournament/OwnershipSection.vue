<script setup lang="ts">
import type { Tournament } from "~/types";

const emit = defineEmits<{
  "start-season": [];
  transfer: [];
}>();

const tournamentStore = useTournamentStore();
const { currentTournament: tournament } = storeToRefs(tournamentStore);
const toast = useToast();
const { handleError } = useErrors();

const settingActiveId = ref<string | null>(null);
const loadingSeasons = ref(false);
const fetchedSeasons = ref<Partial<Tournament>[]>([]);

const fetchSeasons = async () => {
  const id = tournament.value?.id;
  if (!id) return;
  try {
    loadingSeasons.value = true;
    const res = await $api<{ success: boolean; data: any[] }>(`/tournaments/${id}/seasons`);
    if (res.data) {
      fetchedSeasons.value = res.data;
    }
  } catch {
    // fallback to store data
  } finally {
    loadingSeasons.value = false;
  }
};

onMounted(() => {
  fetchSeasons();
});

const seasonsList = computed(() => {
  const t = tournament.value;
  if (!t) return [];

  const source = fetchedSeasons.value.length > 0 ? fetchedSeasons.value : (t.seasons || []);
  const map = new Map<string, any>();

  for (const s of source) {
    if (s.id) {
      map.set(s.id, { ...s });
    }
  }

  // Ensure current tournament is included
  if (!map.has(t.id)) {
    map.set(t.id, {
      id: t.id,
      name: t.name,
      slug: t.slug,
      seasonName: t.seasonName,
      start_date: t.start_date,
      end_date: t.end_date,
      status: t.status,
      isCurrentSeason: t.isCurrentSeason ?? true,
      created_at: t.created_at,
    });
  } else {
    const currentEntry = map.get(t.id);
    if (t.isCurrentSeason !== undefined) {
      currentEntry.isCurrentSeason = t.isCurrentSeason;
    }
  }

  const list = Array.from(map.values());
  return list.sort((a, b) => {
    const dateA = new Date(a.created_at || a.start_date || 0).getTime();
    const dateB = new Date(b.created_at || b.start_date || 0).getTime();
    return dateB - dateA;
  });
});

const handleSetActiveSeason = async (seasonId: string) => {
  if (settingActiveId.value) return;
  settingActiveId.value = seasonId;
  try {
    await tournamentStore.setActiveSeason(seasonId);
    fetchedSeasons.value.forEach((s) => {
      s.isCurrentSeason = s.id === seasonId;
    });
    toast.add({
      title: "Active season updated",
      description: "This edition is now the default public view for this competition series.",
      color: "success",
    });
  } catch (err: any) {
    handleError(err, { title: "Failed to set active season" });
  } finally {
    settingActiveId.value = null;
  }
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
};

const getStatusColor = (status?: string): "success" | "warning" | "neutral" | "info" | "primary" => {
  switch (status) {
    case "ONGOING":
      return "success";
    case "UPCOMING":
      return "info";
    case "COMPLETED":
      return "neutral";
    default:
      return "neutral";
  }
};
</script>

<template>
  <section
    id="ownership"
    class="scroll-mt-28 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden"
  >
    <div
      class="px-4 sm:px-5 py-3.5 border-b border-gray-100 dark:border-white/[0.06]"
    >
      <h2 class="text-sm font-semibold text-gray-900 dark:text-white">
        Season &amp; ownership
      </h2>
      <p class="text-xs text-gray-500 mt-0.5">
        Lifecycle actions and edition management for this competition series.
      </p>
    </div>

    <!-- Competition Series Information Banner -->
    <div
      v-if="tournament?.competition"
      class="m-4 sm:m-5 p-4 rounded-xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent border border-indigo-500/20"
    >
      <div class="flex items-start justify-between gap-3 flex-wrap">
        <div class="flex items-center gap-3">
          <span class="w-10 h-10 rounded-xl bg-indigo-600/15 flex items-center justify-center shrink-0">
            <UIcon name="i-heroicons-sparkles" class="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
          </span>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">Perpetual Competition Series</span>
              <UBadge color="primary" variant="subtle" size="xs" :label="tournament.competition.sport" />
            </div>
            <h3 class="text-base font-bold text-gray-900 dark:text-white mt-0.5">
              {{ tournament.competition.name }}
            </h3>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            size="xs"
            color="neutral"
            variant="outline"
            icon="i-heroicons-arrow-top-right-on-square"
            label="Public Series Link"
            :to="'/t/' + tournament.competition.slug"
            target="_blank"
          />
        </div>
      </div>
      <p class="text-xs text-gray-600 dark:text-gray-400 mt-3 leading-relaxed">
        Followers subscribe to this series perpetually across all seasons. Visitors viewing your public link are automatically served the active default season below.
      </p>
    </div>

    <!-- Season Editions List -->
    <div
      v-if="seasonsList.length > 0"
      class="px-4 sm:px-5 py-4 border-b border-gray-100 dark:border-white/[0.06]"
    >
      <div class="flex items-center justify-between mb-3">
        <div>
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white">
            Season Editions
          </h3>
          <p class="text-xs text-gray-500">
            Manage historical archives and choose which edition is active for public visitors.
          </p>
        </div>
        <UBadge
          color="neutral"
          variant="soft"
          size="sm"
          :label="`${seasonsList.length} ${seasonsList.length === 1 ? 'edition' : 'editions'}`"
        />
      </div>

      <div class="space-y-2">
        <div
          v-for="season in seasonsList"
          :key="season.id"
          class="p-3 sm:p-3.5 rounded-xl border transition-colors flex items-center justify-between gap-3 flex-wrap"
          :class="[
            season.isCurrentSeason
              ? 'bg-emerald-500/[0.04] border-emerald-500/25 dark:border-emerald-500/30'
              : 'bg-gray-50/50 dark:bg-white/[0.02] border-gray-200 dark:border-white/[0.06]',
          ]"
        >
          <div class="flex items-center gap-3 min-w-0">
            <span
              class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              :class="[
                season.isCurrentSeason
                  ? 'bg-emerald-500/15 text-emerald-500'
                  : 'bg-gray-200/60 dark:bg-white/[0.06] text-gray-500',
              ]"
            >
              <UIcon
                :name="season.isCurrentSeason ? 'i-heroicons-check-circle' : 'i-heroicons-calendar'"
                class="w-4 h-4"
              />
            </span>
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {{ season.seasonName || season.name }}
                </span>
                <UBadge
                  v-if="season.isCurrentSeason"
                  color="success"
                  variant="subtle"
                  size="xs"
                  icon="i-heroicons-check"
                  label="Active Season (Default)"
                />
                <UBadge
                  v-if="season.id === tournament?.id"
                  color="neutral"
                  variant="outline"
                  size="xs"
                  label="Currently Managing"
                />
                <UBadge
                  v-if="season.status"
                  :color="getStatusColor(season.status)"
                  variant="soft"
                  size="xs"
                  :label="season.status"
                />
              </div>
              <p class="text-xs text-gray-500 mt-0.5">
                <span v-if="season.start_date || season.end_date">
                  {{ formatDate(season.start_date) }} – {{ formatDate(season.end_date) }}
                </span>
                <span v-else>Date not set</span>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <UButton
              v-if="!season.isCurrentSeason"
              size="xs"
              color="primary"
              variant="subtle"
              icon="i-heroicons-star"
              label="Set as Active"
              :loading="settingActiveId === season.id"
              @click="handleSetActiveSeason(season.id)"
            />
            <UButton
              v-if="season.id !== tournament?.id"
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-heroicons-arrow-top-right-on-square"
              label="Open Edition"
              :to="`/tournaments/${season.id}`"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Actions Section -->
    <div class="px-4 sm:px-5 py-2">
      <div
        class="flex items-center justify-between gap-3 py-3 border-b border-gray-100 dark:border-white/[0.05] flex-wrap"
      >
        <div class="flex items-center gap-3 min-w-0">
          <span
            class="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0"
          >
            <UIcon
              name="i-heroicons-arrow-path"
              class="w-4.5 h-4.5 text-indigo-500 dark:text-indigo-400"
            />
          </span>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-gray-900 dark:text-white">
              Start new season
            </p>
            <p class="text-xs text-gray-500 mt-0.5">
              Clone rules and branding into a new season under this competition series. All followers are preserved.
            </p>
          </div>
        </div>
        <UButton
          type="button"
          color="neutral"
          variant="soft"
          size="sm"
          icon="i-heroicons-document-duplicate"
          label="Start New Season"
          @click="emit('start-season')"
        />
      </div>
      <div
        class="flex items-center justify-between gap-3 py-3 flex-wrap"
      >
        <div class="flex items-center gap-3 min-w-0">
          <span
            class="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0"
          >
            <UIcon
              name="i-heroicons-arrows-right-left"
              class="w-4.5 h-4.5 text-amber-500"
            />
          </span>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-gray-900 dark:text-white">
              Transfer ownership
            </p>
            <p class="text-xs text-gray-500 mt-0.5">
              Move this tournament to another organization you
              admin. You may lose access to it in this
              workspace.
            </p>
          </div>
        </div>
        <UButton
          type="button"
          color="neutral"
          variant="soft"
          size="sm"
          icon="i-heroicons-arrows-right-left"
          label="Transfer Ownership"
          @click="emit('transfer')"
        />
      </div>
    </div>
  </section>
</template>
