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

// Embedded high-resolution anti-aliased UEFA European Cup silhouette
const trophyImg = 'data:image/png;base64,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'
</script>

<template>
  <div class="champion-showcase flex flex-col items-center select-none text-center py-1">
    <!-- Trophy Silhouette (Authentic UEFA European Cup with Silky Smooth Edges) -->
    <div class="relative flex items-center justify-center">
      <svg
        viewBox="0 0 222 336"
        class="w-11 h-16 sm:w-13 sm:h-18 overflow-visible drop-shadow-md transition-transform duration-300 hover:scale-105"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <clipPath id="trophyBadgeClip">
            <circle cx="111" cy="123" r="23" />
          </clipPath>
        </defs>

        <!-- Silky Smooth Trophy Silhouette (Anti-aliased subpixel rendering directly from vector source) -->
        <image
          :href="trophyImg"
          width="222"
          height="336"
        />

        <!-- ── Center Emblem Aperture ── -->
        <!-- Decided State with Team Badge -->
        <template v-if="isDecided && champion">
          <circle cx="111" cy="123" r="23" class="fill-zinc-900 stroke-zinc-700/60" stroke-width="1.5" />
          <image
            v-if="champion.logoUrl"
            :href="champion.logoUrl"
            x="88"
            y="100"
            width="46"
            height="46"
            preserveAspectRatio="xMidYMid slice"
            clip-path="url(#trophyBadgeClip)"
          />
          <text
            v-else
            x="111"
            y="131"
            text-anchor="middle"
            fill="#ffffff"
            font-size="20"
            font-family="system-ui, -apple-system, sans-serif"
            font-weight="bold"
          >{{ initial }}</text>
        </template>

        <!-- Pending State: Shield outline with question mark inside -->
        <template v-else>
          <circle cx="111" cy="123" r="23" class="fill-zinc-900" />
          <path
            d="M 111 106 C 120 106 125 109 125 115 C 125 128 118 136 111 140 C 104 136 97 128 97 115 C 97 109 102 106 111 106 Z"
            class="fill-zinc-800/90 stroke-zinc-600 dark:stroke-zinc-500"
            stroke-width="1.8"
          />
          <text
            x="111"
            y="128.5"
            text-anchor="middle"
            class="fill-zinc-400 dark:fill-zinc-300"
            font-size="18"
            font-family="system-ui, -apple-system, sans-serif"
            font-weight="bold"
          >?</text>
        </template>
      </svg>
    </div>

    <!-- Team Name (Only rendered when champion is decided) -->
    <div
      v-if="isDecided && champion"
      class="mt-1 text-[11px] sm:text-xs font-bold text-gray-900 dark:text-gray-100 max-w-[140px] truncate leading-tight"
      :title="champion.name"
    >
      {{ champion.name }}
    </div>

    <!-- CHAMPION Label (Always rendered) -->
    <div
      class="text-[8px] font-extrabold tracking-[0.2em] text-[#9ca3af] dark:text-[#a1a1aa] uppercase select-none mt-0.5"
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
