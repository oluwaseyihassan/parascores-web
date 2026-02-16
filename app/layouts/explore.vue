<script setup lang="ts">
import { storeToRefs } from 'pinia'

const authStore = useAuthStore()
const { authLoading } = storeToRefs(authStore)
</script>

<template>
    <div class="min-h-screen bg-[#0A0F1C] text-white font-sans transition-colors duration-300">
        <AuthLoadingOverlay :show="authLoading" />
        <AppHeader />
        <slot />
        <AppFooter />
    </div>
</template>
