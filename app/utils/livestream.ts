import { LivestreamPlatform } from '~/types'

export interface LivestreamPlatformInfo {
  value: LivestreamPlatform
  label: string
  icon: string
  color: string
  supportsEmbed: boolean
  placeholder: string
  domains: string[]
}

export const LIVESTREAM_PLATFORMS: LivestreamPlatformInfo[] = [
  {
    value: LivestreamPlatform.YOUTUBE,
    label: 'YouTube',
    icon: 'i-simple-icons-youtube',
    color: 'text-red-600',
    supportsEmbed: true,
    placeholder: 'https://youtube.com/watch?v=...',
    domains: ['youtube.com', 'youtu.be', 'www.youtube.com', 'm.youtube.com']
  },
  {
    value: LivestreamPlatform.TWITCH,
    label: 'Twitch',
    icon: 'i-simple-icons-twitch',
    color: 'text-purple-500',
    supportsEmbed: true,
    placeholder: 'https://twitch.tv/channel',
    domains: ['twitch.tv', 'www.twitch.tv']
  },
  {
    value: LivestreamPlatform.FACEBOOK,
    label: 'Facebook Live',
    icon: 'i-simple-icons-facebook',
    color: 'text-blue-600',
    supportsEmbed: false,
    placeholder: 'https://facebook.com/watch/...',
    domains: ['facebook.com', 'www.facebook.com', 'fb.watch']
  },
  {
    value: LivestreamPlatform.VIMEO,
    label: 'Vimeo',
    icon: 'i-mdi-vimeo',
    color: 'text-sky-500',
    supportsEmbed: true,
    placeholder: 'https://vimeo.com/...',
    domains: ['vimeo.com', 'www.vimeo.com', 'player.vimeo.com']
  },
  {
    value: LivestreamPlatform.TIKTOK,
    label: 'TikTok Live',
    icon: 'i-simple-icons-tiktok',
    color: 'text-black dark:text-white',
    supportsEmbed: false,
    placeholder: 'https://tiktok.com/@...',
    domains: ['tiktok.com', 'www.tiktok.com']
  },
  {
    value: LivestreamPlatform.INSTAGRAM,
    label: 'Instagram Live',
    icon: 'i-simple-icons-instagram',
    color: 'text-pink-500',
    supportsEmbed: false,
    placeholder: 'https://instagram.com/...',
    domains: ['instagram.com', 'www.instagram.com']
  },
  {
    value: LivestreamPlatform.X,
    label: 'X / Twitter',
    icon: 'i-simple-icons-x',
    color: 'text-black dark:text-white',
    supportsEmbed: false,
    placeholder: 'https://x.com/...',
    domains: ['x.com', 'twitter.com', 'www.twitter.com', 'periscope.tv']
  },
  {
    value: LivestreamPlatform.KICK,
    label: 'Kick',
    icon: 'i-mdi-video',
    color: 'text-green-500',
    supportsEmbed: false,
    placeholder: 'https://kick.com/...',
    domains: ['kick.com', 'www.kick.com']
  },
  {
    value: LivestreamPlatform.CUSTOM,
    label: 'Other',
    icon: 'i-heroicons-video-camera',
    color: 'text-gray-500',
    supportsEmbed: false,
    placeholder: 'https://...',
    domains: []
  }
]

export function isLivestreamPlatform(value: string | null | undefined): value is LivestreamPlatform {
  if (!value) return false
  return Object.values(LivestreamPlatform).includes(value as LivestreamPlatform)
}

export function getLivestreamPlatformInfo(platform?: LivestreamPlatform | string | null): LivestreamPlatformInfo | undefined {
  if (!platform) return undefined
  return LIVESTREAM_PLATFORMS.find(p => p.value === platform)
}

export function detectLivestreamPlatform(url: string): LivestreamPlatform | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()

    for (const platform of LIVESTREAM_PLATFORMS) {
      if (platform.domains.some(domain => hostname === domain || hostname.endsWith(`.${domain}`))) {
        return platform.value
      }
    }
  } catch {
    return null
  }
  return null
}

export function getLivestreamWatchUrl(url: string, platform?: LivestreamPlatform | string | null): string | null {
  if (!url) return null
  try {
    return new URL(url).toString()
  } catch {
    return null
  }
}

export function getLivestreamEmbedUrl(url: string, platform?: LivestreamPlatform | string | null, parent?: string): string | null {
  if (!url) return null

  const detected = platform || detectLivestreamPlatform(url)
  if (!detected) return null

  try {
    const parsed = new URL(url)

    if (detected === LivestreamPlatform.YOUTUBE) {
      const videoId = parsed.searchParams.get('v') || parsed.pathname.slice(1)
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`
      }
    }

    if (detected === LivestreamPlatform.TWITCH) {
      const channel = parsed.pathname.split('/').filter(Boolean)[0]
      if (channel) {
        const embedParent = parent || 'localhost'
        return `https://player.twitch.tv/?channel=${channel}&parent=${embedParent}&autoplay=false`
      }
    }

    if (detected === LivestreamPlatform.VIMEO) {
      const segments = parsed.pathname.split('/').filter(Boolean)
      const videoId = segments.length > 1 ? segments[segments.length - 1] : segments[0]
      if (videoId && /^\d+$/.test(videoId)) {
        return `https://player.vimeo.com/video/${videoId}?autoplay=0`
      }
    }
  } catch {
    return null
  }

  return null
}

export function isLivestreamEmbedSupported(url: string, platform?: LivestreamPlatform | string | null): boolean {
  if (!url) return false
  const p = getLivestreamPlatformInfo(platform) || getLivestreamPlatformInfo(detectLivestreamPlatform(url))
  return !!p?.supportsEmbed
}

export function normalizeLivestreamUrl(url: string): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed) return null
  try {
    return new URL(trimmed).toString()
  } catch {
    if (/^[\w\-]+$/i.test(trimmed)) {
      return `https://www.youtube.com/watch?v=${trimmed}`
    }
    return null
  }
}
