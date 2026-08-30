<script setup lang="ts">
import { storeToRefs } from 'pinia'

const authStore = useAuthStore()
const { authLoading } = storeToRefs(authStore)

// Skin color overrides cascade to everything under this root. The MatchModal
// teleports to <body>, so it binds cssVars onto its own panel instead.
const skin = useEventSkin()
</script>

<template>
  <div
    class="event-hub min-h-screen text-white font-sans antialiased"
    :style="[{ backgroundColor: 'var(--event-page-bg)' }, skin.cssVars.value]"
  >
    <AuthLoadingOverlay :show="authLoading" />
    <slot />
  </div>
</template>

<!-- Not scoped: defines the built-in theme defaults for the whole event
     layout, including content teleported out of the root (match modal). -->
<style>
:root {
  --event-primary: #1e3a8a;
  --event-accent: #f5b32b;
  --event-on-accent: #0a0f1e;
  --event-page-bg: #070b18;
  --event-surface: #0b1226;
  --event-raised: #0d1530;
}
</style>
