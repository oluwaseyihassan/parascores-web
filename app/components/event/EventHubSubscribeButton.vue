<script setup lang="ts">
const { eventSlug } = useHost()
const { supported, subscribed, loading, error, init, subscribe } = useEventPush(eventSlug)

const toast = useToast()

onMounted(init)

const onClick = async () => {
  await subscribe()
  if (subscribed.value) {
    toast.add({ title: 'Subscribed', description: 'You will get live score alerts for this event.', color: 'success' })
  } else if (error.value) {
    toast.add({ title: 'Notifications', description: error.value, color: 'error' })
  }
}
</script>

<template>
  <button
    v-if="supported"
    class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors border"
    :class="subscribed
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      : 'bg-[#f5b32b]/10 text-[#f5b32b] border-[#f5b32b]/40 hover:bg-[#f5b32b]/20'"
    :disabled="loading"
    @click="onClick"
  >
    <UIcon
      :name="subscribed ? 'i-heroicons-bell-alert' : 'i-heroicons-bell'"
      class="w-3.5 h-3.5"
    />
    {{ subscribed ? 'Alerts on' : loading ? 'Enabling…' : 'Get live alerts' }}
  </button>
</template>
