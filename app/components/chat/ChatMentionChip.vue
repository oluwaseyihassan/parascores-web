<script setup lang="ts">
/**
 * Interactive @mention in chat text. Resolved members get a hover preview card
 * (teleported to body — the message list's overflow would clip it otherwise)
 * and the mention itself is the profile link. @paragee (bot) gets a card, no link.
 */
const props = withDefaults(
  defineProps<{
    name: string // mention text without the leading @
    members?: { id: string; name: string; teamName?: string | null; href?: string | null }[]
    botEnabled?: boolean
  }>(),
  { members: () => [], botEnabled: false },
)

const { toMain, isManage } = useHost()

const clean = (s: string) => s.toLowerCase().replace(/[.,!?\s]+$/, '').trim()
const member = computed(() =>
  props.members.find((m) => clean(m.name) === clean(props.name)),
)
const isBot = computed(() => ['paragee', 'arena'].includes(clean(props.name)) && props.botEnabled)
const href = computed(() => (member.value?.href ? toMain(member.value.href) : null))

const anchorEl = ref<HTMLElement | null>(null)
const show = ref(false)
const cardStyle = ref<Record<string, string>>({})
let timer: ReturnType<typeof setTimeout> | null = null

function enter() {
  timer = setTimeout(() => {
    const rect = anchorEl.value?.getBoundingClientRect()
    if (!rect) return
    const cardW = 224
    const left = Math.min(Math.max(rect.left + rect.width / 2 - cardW / 2, 10), window.innerWidth - cardW - 10)
    // prefer above the mention; flip below if there's no room
    const openUp = rect.top > 230
    cardStyle.value = {
      position: 'fixed',
      left: `${left}px`,
      width: `${cardW}px`,
      ...(openUp
        ? { bottom: `${window.innerHeight - rect.top + 9}px` }
        : { top: `${rect.bottom + 9}px` }),
    }
    show.value = true
  }, 250)
}
function leave() {
  if (timer) clearTimeout(timer)
  show.value = false
}

const avatarColors = ['#312E81', '#136332', '#0E7490', '#B45309', '#374151', '#7c2d12']
function avatarColor(name: string) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return avatarColors[h % avatarColors.length]
}
const initials = (name: string) =>
  name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
</script>

<template>
  <span ref="anchorEl" class="inline">
    <!-- resolved member with profile page: link + hover preview card -->
    <NuxtLink
      v-if="member && href"
      :to="href"
      :external="isManage"
      class="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline decoration-emerald-500/50 underline-offset-2"
      @mouseenter="enter"
      @mouseleave="leave"
      @focus="enter"
      @blur="leave"
    >@{{ name }}</NuxtLink>

    <!-- resolved member without a profile page: card only -->
    <span
      v-else-if="member"
      class="font-semibold text-emerald-600 dark:text-emerald-400 cursor-default"
      @mouseenter="enter"
      @mouseleave="leave"
    >@{{ name }}</span>

    <!-- paragee bot: card, no link -->
    <span
      v-else-if="isBot"
      class="font-semibold text-indigo-500 dark:text-indigo-300 cursor-help"
      @mouseenter="enter"
      @mouseleave="leave"
      @focus="enter"
      @blur="leave"
    >@{{ name }}</span>

    <!-- unresolved mention: plain colored text, no card -->
    <span v-else class="font-semibold text-emerald-600 dark:text-emerald-400">@{{ name }}</span>
  </span>

  <!-- hover preview card (teleported — survives the list's overflow clipping) -->
  <Teleport to="body">
    <div
      v-if="show && (member || isBot)"
      :style="cardStyle"
      class="rounded-xl border border-gray-200 dark:border-white/[0.12] bg-white dark:bg-gray-800 shadow-xl shadow-black/10 dark:shadow-black/50 p-3 z-[80] pointer-events-none"
    >
      <div class="flex items-center gap-2.5">
        <span
          class="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
          :style="isBot ? { background: 'linear-gradient(135deg,#312E81,#136332)' } : { background: avatarColor(member!.name) }"
        >{{ isBot ? '✨' : initials(member!.name) }}</span>
        <span class="min-w-0">
          <span class="block text-[12.5px] font-bold text-gray-900 dark:text-white truncate">
            {{ isBot ? 'Paragee' : member!.name }}
          </span>
          <span v-if="isBot" class="block text-[10.5px] text-indigo-400">AI · Paragee</span>
          <span v-else-if="member!.teamName" class="block text-[10.5px] text-gray-400 truncate">{{ member!.teamName }}</span>
        </span>
      </div>
      <p v-if="isBot" class="mt-2 text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
        Answers fixture, table, top scorer &amp; rules questions from live tournament data.
      </p>
      <div
        class="mt-2.5 pt-2 border-t border-gray-100 dark:border-white/[0.06] flex items-center justify-between text-[10.5px] font-bold"
        :class="isBot ? 'text-indigo-500 dark:text-indigo-300' : 'text-emerald-600 dark:text-emerald-400'"
      >
        <template v-if="isBot"><span>Ask: @paragee &lt;question&gt;</span><span>✨</span></template>
        <template v-else-if="href"><span>View profile</span><span>→</span></template>
      </div>
    </div>
  </Teleport>
</template>
