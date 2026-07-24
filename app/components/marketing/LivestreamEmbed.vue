<script setup lang="ts">
import type { Fixture } from '~/types'
import { 
  getLivestreamEmbedUrl, 
  getLivestreamWatchUrl, 
  getLivestreamPlatformInfo, 
  isLivestreamEmbedSupported,
  detectLivestreamPlatform
} from '~/utils/livestream'

const props = defineProps<{
  fixture: Fixture
}>()

const detectedPlatform = computed(() => {
  return props.fixture.livestreamPlatform || detectLivestreamPlatform(props.fixture.livestreamUrl || '')
})

const platformInfo = computed(() => {
  return getLivestreamPlatformInfo(detectedPlatform.value)
})

const embedParent = computed(() => {
  if (typeof window === 'undefined') return 'localhost'
  return window.location.hostname || 'localhost'
})

const embedUrl = computed(() => {
  if (!props.fixture.livestreamUrl) return null
  return getLivestreamEmbedUrl(props.fixture.livestreamUrl, props.fixture.livestreamPlatform, embedParent.value)
})

const watchUrl = computed(() => {
  if (!props.fixture.livestreamUrl) return null
  return getLivestreamWatchUrl(props.fixture.livestreamUrl, props.fixture.livestreamPlatform)
})

const supportsEmbed = computed(() => {
  if (!props.fixture.livestreamUrl) return false
  return isLivestreamEmbedSupported(props.fixture.livestreamUrl, props.fixture.livestreamPlatform)
})

const platformLabel = computed(() => {
  return platformInfo.value?.label || 'Livestream'
})

const platformIcon = computed(() => {
  return platformInfo.value?.icon || 'i-heroicons-video-camera'
})

const platformColor = computed(() => {
  return platformInfo.value?.color || 'text-gray-500'
})

const isLive = computed(() => {
  const status = props.fixture.status
  return status === 'LIVE' || status === 'NORMAL_TIME_ENDED' || status === 'EXTRATIME'
})
</script>

<template>
  <div v-if="watchUrl" class="livestream">
    <div class="livestream__header">
      <div class="flex items-center gap-2">
        <UIcon :name="platformIcon" class="w-4 h-4" :class="platformColor" />
        <span class="livestream__title">{{ platformLabel }}</span>
      </div>
      <span v-if="isLive" class="livestream__badge">
        <span class="livestream__pulse" />
        Live
      </span>
    </div>

    <div v-if="supportsEmbed && embedUrl" class="livestream__embed">
      <iframe
        :src="embedUrl"
        title="Livestream"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
        class="livestream__iframe"
      />
    </div>

    <div v-else class="livestream__fallback">
      <div class="livestream__fallback-content">
        <UIcon name="i-heroicons-play-circle" class="w-10 h-10 text-rose-500" />
        <div>
          <p class="livestream__fallback-title">Watch on {{ platformLabel }}</p>
          <p class="livestream__fallback-url">{{ watchUrl }}</p>
        </div>
      </div>
      <UButton
        :to="watchUrl"
        target="_blank"
        rel="noopener noreferrer"
        color="primary"
        variant="solid"
        size="sm"
        icon="i-heroicons-arrow-top-right-on-square"
        trailing
      >
        Open Stream
      </UButton>
    </div>
  </div>
</template>

<style scoped>
.livestream {
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid rgba(244, 63, 94, 0.15);
  background: linear-gradient(135deg, rgba(244, 63, 94, 0.05), rgba(244, 63, 94, 0.02));
}

:root.dark .livestream {
  border-color: rgba(244, 63, 94, 0.22);
  background: linear-gradient(135deg, rgba(244, 63, 94, 0.08), rgba(244, 63, 94, 0.03));
}

.livestream__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(244, 63, 94, 0.10);
}

:root.dark .livestream__header {
  border-color: rgba(244, 63, 94, 0.14);
}

.livestream__title {
  font-size: 0.8125rem;
  font-weight: 700;
  color: #1f2937;
}

:root.dark .livestream__title {
  color: #f3f4f6;
}

.livestream__badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 0.625rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #dc2626;
  background: rgba(239, 68, 68, 0.10);
}

:root.dark .livestream__badge {
  color: #f87171;
  background: rgba(239, 68, 68, 0.14);
}

.livestream__pulse {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #dc2626;
  animation: pulse 1.6s ease-in-out infinite;
}

:root.dark .livestream__pulse {
  background: #f87171;
}

.livestream__embed {
  position: relative;
  width: 100%;
  padding-top: 56.25%;
  background: #000;
}

.livestream__iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}

.livestream__fallback {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.livestream__fallback-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.livestream__fallback-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: #1f2937;
}

:root.dark .livestream__fallback-title {
  color: #f3f4f6;
}

.livestream__fallback-url {
  margin-top: 2px;
  font-size: 0.75rem;
  color: #6b7280;
  word-break: break-all;
}

:root.dark .livestream__fallback-url {
  color: #9ca3af;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
</style>
