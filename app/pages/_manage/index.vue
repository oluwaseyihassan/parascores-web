<script setup lang="ts">
definePageMeta({
  layout: 'dashboard' // Should happen automatically, but good to be explicit
})

</script>

<template>
  <div>
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
      <p class="text-gray-500">Welcome back! Here is what's happening today.</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <UCard v-for="i in 4" :key="i">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">Active Tournaments</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">3</p>
          </div>
          <div class="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <UIcon name="i-heroicons-trophy" class="w-6 h-6 text-green-500" />
          </div>
        </div>
      </UCard>
    </div>

    <UCard class="flex flex-col items-center justify-center py-12 text-center">
      <div class="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
        <UIcon name="i-heroicons-plus" class="w-8 h-8 text-gray-400" />
      </div>
      <h3 class="text-lg font-medium text-gray-900 dark:text-white">Create a Tournament</h3>
      <p class="text-gray-500 max-w-sm mx-auto mt-2 mb-6">
        Start by creating your first league or cup. You can add teams and fixtures later.
      </p>
      <UButton label="Create Tournament" color="primary" size="lg" />
    </UCard>
  </div>
</template>