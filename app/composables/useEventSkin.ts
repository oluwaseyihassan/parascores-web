import type { Component } from 'vue'

/**
 * Event Hub skin system: special customer = skin folder + config, never
 * forked code. `app/skins/<slug>/config.ts` holds colors/section toggles/slot
 * picks; optional bespoke blocks live in `app/skins/<slug>/slots/*.vue` and
 * are mounted at named anchors in the hub page. Unknown slug → default skin.
 *
 * Note: the globs are evaluated at build/dev-server start — adding a new skin
 * folder requires a dev-server restart.
 */

export interface EventSkinColors {
  primary?: string
  accent?: string
  /** Text/icon color on top of accent-colored surfaces (e.g. the ticker) */
  onAccent?: string
  pageBg?: string
  surface?: string
  raised?: string
}

export type EventSkinSection = 'ticker' | 'liveNow' | 'medalTable' | 'sportsGrid' | 'schedule'
export type EventSkinSlot = 'hero' | 'afterMedals'

export interface EventSkinConfig {
  colors?: EventSkinColors
  /** Sections render unless explicitly disabled */
  sections?: Partial<Record<EventSkinSection, boolean>>
  /** slot name → component file in ./slots (without .vue) */
  slots?: Partial<Record<EventSkinSlot, string>>
}

const configs = import.meta.glob<EventSkinConfig>('../skins/*/config.ts', {
  eager: true,
  import: 'default',
})
const slotModules = import.meta.glob<{ default: Component }>('../skins/*/slots/*.vue', {
  eager: true,
})

export const useEventSkin = () => {
  const { eventSlug } = useHost()

  const skinKey = computed(() => {
    const slug = eventSlug.value
    return slug && configs[`../skins/${slug}/config.ts`] ? slug : 'default'
  })

  const config = computed<EventSkinConfig>(
    () => configs[`../skins/${skinKey.value}/config.ts`] ?? {},
  )

  const slotComponent = (slot: EventSkinSlot): Component | null => {
    const file = config.value.slots?.[slot]
    if (!file) return null
    return slotModules[`../skins/${skinKey.value}/slots/${file}.vue`]?.default ?? null
  }

  const isEnabled = (section: EventSkinSection) =>
    config.value.sections?.[section] ?? true

  /** Skin color overrides as CSS custom properties (defaults live in layouts/event.vue) */
  const cssVars = computed<Record<string, string>>(() => {
    const c = config.value.colors ?? {}
    const map: Record<string, string | undefined> = {
      '--event-primary': c.primary,
      '--event-accent': c.accent,
      '--event-on-accent': c.onAccent,
      '--event-page-bg': c.pageBg,
      '--event-surface': c.surface,
      '--event-raised': c.raised,
    }
    return Object.fromEntries(
      Object.entries(map).filter((e): e is [string, string] => !!e[1]),
    )
  })

  return { skinKey, config, slotComponent, isEnabled, cssVars }
}
