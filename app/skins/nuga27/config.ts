import type { EventSkinConfig } from '~/composables/useEventSkin'

// NUGA 2027 skin — config-only demo: green theme, no bespoke slots.
// Proves a second event hub needs nothing but this file.
export default {
  colors: {
    primary: '#14532d',
    accent: '#4ade80',
    onAccent: '#04120a',
    pageBg: '#060f09',
    surface: '#0b1a10',
    raised: '#0e2013',
  },
} satisfies EventSkinConfig
