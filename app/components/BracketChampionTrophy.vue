<script setup lang="ts">
interface ChampionInfo {
  name: string
  logoUrl?: string | null
  shortName?: string | null
}

interface Props {
  champion?: ChampionInfo | null
  isDecided?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  champion: null,
  isDecided: false
})

const initial = computed(() => {
  if (!props.champion?.name) return 'C'
  return props.champion.name.trim().charAt(0).toUpperCase()
})
</script>

<template>
  <div class="champion-showcase flex flex-col items-center select-none text-center py-2 animate-in fade-in duration-300">
    <!-- Trophy Silhouette -->
    <div class="relative flex items-center justify-center">
      <svg
        viewBox="0 0 100 120"
        class="w-20 h-24 sm:w-24 sm:h-28 overflow-visible drop-shadow-sm transition-transform duration-300 hover:scale-105"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <clipPath id="trophyBadgeClip">
            <circle cx="50" cy="46" r="14" />
          </clipPath>
        </defs>

        <!-- Left Handle (Sweeping European Cup ear) -->
        <path
          d="M 37 31 C 32 23 23 8 16 8 C 8 8 4 18 4 33 C 4 58 15 76 30 84 C 32 85 34 85 35 84 L 35 79 C 23 72 11 56 11 33 C 11 21 14 15 18 15 C 22 15 29 26 33 34 Z"
          class="fill-zinc-500 dark:fill-zinc-400"
        />

        <!-- Right Handle (Symmetric European Cup ear) -->
        <path
          d="M 63 31 C 68 23 77 8 84 8 C 92 8 96 18 96 33 C 96 58 85 76 70 84 C 68 85 66 85 65 84 L 65 79 C 77 72 89 56 89 33 C 89 21 86 15 82 15 C 78 15 71 26 67 34 Z"
          class="fill-zinc-500 dark:fill-zinc-400"
        />

        <!-- Trophy Body & Pedestal with Center Circular Cutout -->
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="
            M 34 18
            C 39 17 44 17 50 17
            C 56 17 61 17 66 18
            C 68 18 69 19 69 21
            C 69 23 68 24 66 25
            L 66 28
            C 66 38 64 59 60 74
            C 56 86 54 94 54 99
            L 60 102
            C 65 105 67 108 67 112
            L 33 112
            C 33 108 35 105 40 102
            L 46 99
            C 46 94 44 86 40 74
            C 36 59 34 38 34 28
            L 34 25
            C 32 24 31 23 31 21
            C 31 19 32 18 34 18 Z

            M 50 32
            A 14.5 14.5 0 1 0 50 61
            A 14.5 14.5 0 1 0 50 32 Z
          "
          class="fill-zinc-500 dark:fill-zinc-400"
        />

        <!-- Top Rim Collar & Lid Knob -->
        <rect x="37" y="14" width="26" height="4" rx="1.5" class="fill-zinc-500 dark:fill-zinc-400" />
        <rect x="47" y="11" width="6" height="3" rx="1" class="fill-zinc-500 dark:fill-zinc-400" />
        <path d="M 36 111 L 64 111 C 64 112 63 113 60 113 L 40 113 C 37 113 36 112 36 111 Z" class="fill-zinc-600 dark:fill-zinc-500" />

        <!-- ── Center Recess ── -->
        <!-- Decided State with Team Badge -->
        <template v-if="isDecided && champion">
          <circle cx="50" cy="46.5" r="14.5" class="fill-zinc-900 stroke-zinc-700/60" stroke-width="1" />
          <image
            v-if="champion.logoUrl"
            :href="champion.logoUrl"
            x="36"
            y="32.5"
            width="28"
            height="28"
            preserveAspectRatio="xMidYMid slice"
            clip-path="url(#trophyBadgeClip)"
          />
          <text
            v-else
            x="50"
            y="51.5"
            text-anchor="middle"
            fill="#ffffff"
            font-size="13"
            font-family="system-ui, -apple-system, sans-serif"
            font-weight="bold"
          >{{ initial }}</text>
        </template>

        <!-- Pending State: Shield outline with question mark inside -->
        <template v-else>
          <!-- Inner circle backdrop -->
          <circle cx="50" cy="46.5" r="14.5" class="fill-zinc-900" />
          <!-- Shield badge -->
          <path
            d="M 50 37 C 55 37 58 39 58 42 C 58 50 54 54 50 56 C 46 54 42 50 42 42 C 42 39 45 37 50 37 Z"
            class="fill-zinc-800/90 stroke-zinc-600 dark:stroke-zinc-500"
            stroke-width="1.2"
          />
          <!-- Question mark -->
          <text
            x="50"
            y="49.5"
            text-anchor="middle"
            class="fill-zinc-400 dark:fill-zinc-300"
            font-size="11"
            font-family="system-ui, -apple-system, sans-serif"
            font-weight="bold"
          >?</text>
        </template>
      </svg>
    </div>

    <!-- Team Name (Only rendered when champion is decided) -->
    <div
      v-if="isDecided && champion"
      class="mt-2 text-sm font-bold text-gray-900 dark:text-gray-100 max-w-[210px] truncate leading-tight"
      :title="champion.name"
    >
      {{ champion.name }}
    </div>

    <!-- CHAMPION Label (Always rendered) -->
    <div
      class="text-[10px] sm:text-[11px] font-extrabold tracking-[0.25em] text-[#9ca3af] dark:text-[#a1a1aa] uppercase select-none"
      :class="isDecided && champion ? 'mt-1' : 'mt-2.5'"
    >
      CHAMPION
    </div>
  </div>
</template>

<style scoped>
.champion-showcase {
  user-select: none;
  -webkit-user-select: none;
}
</style>
