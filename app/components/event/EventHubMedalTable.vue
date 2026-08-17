<script setup lang="ts">
import { medals as mockMedals } from './mock'

const props = withDefaults(defineProps<{
  medals?: typeof mockMedals
  mode?: 'preview' | 'full'
}>(), {
  medals: () => mockMedals,
  mode: 'full',
})

const emit = defineEmits<{
  viewAll: []
}>()

const expanded = ref(false)

const previewRows = computed(() => props.medals.slice(0, 4))
const fullRows = computed(() => expanded.value ? props.medals : props.medals.slice(0, 8))
</script>

<template>
  <section>
    <!-- Preview mode (overview tab) -->
    <template v-if="props.mode === 'preview'">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-xl font-black tracking-tight">🏅 Medal Table</h2>
        <button v-if="props.medals.length" class="text-xs font-bold text-[#f5b32b] hover:underline" @click="emit('viewAll')">
          Full table →
        </button>
      </div>
      <div v-if="!props.medals.length" class="card rounded-2xl p-8 text-center">
        <p class="text-sm text-white/50">No medals decided yet — standings update the moment the first final completes.</p>
      </div>
      <div v-else class="card rounded-2xl overflow-hidden">
        <div
          v-for="(m, i) in previewRows"
          :key="m.u"
          class="flex items-center px-5 py-3 border-b border-white/5 last:border-0"
          :class="{ 'medal-gold': i === 0 }"
        >
          <span class="w-6 font-black text-white/50">{{ i + 1 }}</span>
          <span class="flex-1 font-bold text-sm flex items-center gap-2">
            <img v-if="m.logoUrl" :src="m.logoUrl" :alt="m.u" class="w-5 h-5 rounded object-contain bg-white/5 p-0.5">
            {{ m.u }}<span v-if="m.host" class="text-[10px] text-white/40 ml-1">HOST</span>
          </span>
          <span class="text-xs text-white/50 w-20 text-center">🥇 {{ m.g }}</span>
          <span class="text-xs text-white/50 w-20 text-center">🥈 {{ m.s }}</span>
          <span class="text-xs text-white/50 w-20 text-center">🥉 {{ m.b }}</span>
          <span class="w-12 text-right font-black" :class="{ 'text-[#f5b32b]': i === 0 }">{{ m.g + m.s + m.b }}</span>
        </div>
      </div>
    </template>

    <!-- Full mode (medals tab) -->
    <template v-else>
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-xl font-black tracking-tight">🏅 Live Medal Table</h2>
        <span class="text-[11px] text-white/40 uppercase tracking-wider">Auto-computed from official results</span>
      </div>
      <div v-if="!props.medals.length" class="card rounded-2xl p-10 text-center">
        <div class="text-3xl mb-2">🏅</div>
        <p class="text-sm text-white/50">No medals awarded yet.</p>
        <p class="text-[11px] text-white/40 mt-1">Gold, silver and bronze appear here automatically as finals complete across all disciplines.</p>
      </div>
      <div v-else class="card rounded-2xl overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-[10px] uppercase tracking-wider text-white/40 border-b border-white/10">
              <th class="text-left px-4 py-3">#</th>
              <th class="text-left px-4 py-3">University</th>
              <th class="px-4 py-3">🥇</th>
              <th class="px-4 py-3">🥈</th>
              <th class="px-4 py-3">🥉</th>
              <th class="px-4 py-3 font-bold">Total</th>
            </tr>
          </thead>
          <tbody class="font-medium">
            <tr
              v-for="(m, i) in fullRows"
              :key="m.u"
              class="row-alt"
              :class="{ 'medal-gold': i === 0 }"
            >
              <td class="px-4 py-3 font-bold">{{ i + 1 }}</td>
              <td class="px-4 py-3">
                <span class="flex items-center gap-2" :class="{ 'font-extrabold': m.host }">
                  <img v-if="m.logoUrl" :src="m.logoUrl" :alt="m.u" class="w-5 h-5 rounded object-contain bg-white/5 p-0.5">
                  {{ m.u }}
                </span>
                <span v-if="m.host" class="text-[10px] text-white/40 ml-1">HOST</span>
              </td>
              <td class="text-center px-4 py-3">{{ m.g }}</td>
              <td class="text-center px-4 py-3">{{ m.s }}</td>
              <td class="text-center px-4 py-3">{{ m.b }}</td>
              <td class="text-center px-4 py-3 font-extrabold" :class="{ 'text-[#f5b32b]': i === 0 }">{{ m.g + m.s + m.b }}</td>
            </tr>
          </tbody>
        </table>
        <button
          class="w-full px-4 py-2.5 text-center text-xs text-white/50 hover:text-white border-t border-white/10 transition-colors"
          @click="expanded = !expanded"
        >
          {{ expanded ? 'Show less ↑' : `View all ${props.medals.length} universities ↓` }}
        </button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.row-alt:nth-child(even) {
  background: rgba(255, 255, 255, 0.025);
}
.medal-gold {
  background: linear-gradient(90deg, rgba(245, 179, 43, 0.16), transparent);
}
</style>
