import type { EventSkinConfig } from '~/composables/useEventSkin'

// WAUG 2026 skin — official blue/gold (same as the built-in defaults,
// declared here so WAUG stays unchanged if the defaults ever move).
export default {
  colors: {
    primary: '#1e3a8a',
    accent: '#f5b32b',
    onAccent: '#0a0f1e',
    pageBg: '#070b18',
    surface: '#0b1226',
    raised: '#0d1530',
  },
  slots: {
    afterMedals: 'AfterMedalsSlot',
  },
} satisfies EventSkinConfig
