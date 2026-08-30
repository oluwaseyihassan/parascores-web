import type { EventSkinConfig } from '~/composables/useEventSkin'

// Default skin: no overrides — the hub renders with the built-in theme
// (see layouts/event.vue :root custom properties) and no bespoke slots.
export default {} satisfies EventSkinConfig
