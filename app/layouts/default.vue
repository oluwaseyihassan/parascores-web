<script setup lang="ts">
import { storeToRefs } from 'pinia'

const authStore = useAuthStore()
const { authLoading } = storeToRefs(authStore)
</script>

<template>
    <div class="min-h-screen bg-page text-body font-sans transition-colors duration-300">
        <AuthLoadingOverlay :show="authLoading" />
        <AppHeader />
        <slot />
        <AppFooter />
    </div>
</template>