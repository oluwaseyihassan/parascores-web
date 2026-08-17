<script setup lang="ts">
import { storeToRefs } from 'pinia'

const authStore = useAuthStore()
const { authLoading } = storeToRefs(authStore)
</script>

<template>
  <div class="min-h-screen bg-[#070b18] text-white font-sans antialiased">
    <AuthLoadingOverlay :show="authLoading" />
    <slot />
  </div>
</template>
