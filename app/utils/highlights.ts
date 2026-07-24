import { HighlightPlatform } from "~/types";

export interface HighlightPlatformInfo {
  value: HighlightPlatform;
  label: string;
  icon: string;
  color: string;
  domains: string[];
  placeholder: string;
  supportsEmbed: boolean;
}

export const HIGHLIGHT_PLATFORMS: HighlightPlatformInfo[] = [
  {
    value: HighlightPlatform.YOUTUBE_SHORTS,
    label: "YouTube Shorts",
    icon: "i-simple-icons-youtube",
    color: "text-red-600",
    domains: ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"],
    placeholder: "https://youtube.com/shorts/...",
    supportsEmbed: true,
  },
  {
    value: HighlightPlatform.INSTAGRAM_REEL,
    label: "Instagram Reel",
    icon: "i-simple-icons-instagram",
    color: "text-pink-500",
    domains: ["instagram.com", "www.instagram.com"],
    placeholder: "https://instagram.com/reel/...",
    supportsEmbed: true,
  },
  {
    value: HighlightPlatform.TIKTOK,
    label: "TikTok",
    icon: "i-simple-icons-tiktok",
    color: "text-black dark:text-white",
    domains: ["tiktok.com", "www.tiktok.com", "vm.tiktok.com"],
    placeholder: "https://tiktok.com/@user/video/...",
    supportsEmbed: true,
  },
];

export function getHighlightPlatformInfo(
  platform?: HighlightPlatform | string | null,
): HighlightPlatformInfo | undefined {
  if (!platform) return undefined;
  return HIGHLIGHT_PLATFORMS.find((p) => p.value === platform);
}

export function detectHighlightPlatform(url: string): HighlightPlatform | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    for (const platform of HIGHLIGHT_PLATFORMS) {
      if (
        platform.domains.some(
          (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
        )
      ) {
        return platform.value;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function getHighlightEmbedUrl(
  url: string,
  platform?: HighlightPlatform | string | null,
): string | null {
  if (!url) return null;

  const detected = platform || detectHighlightPlatform(url);
  if (!detected) return null;

  try {
    const parsed = new URL(url);

    if (detected === HighlightPlatform.YOUTUBE_SHORTS) {
      const segments = parsed.pathname.split("/").filter(Boolean);
      const shortsIdx = segments.indexOf("shorts");
      const videoId =
        shortsIdx !== -1
          ? segments[shortsIdx + 1]
          : parsed.searchParams.get("v");
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`;
      }
    }

    if (detected === HighlightPlatform.INSTAGRAM_REEL) {
      const segments = parsed.pathname.split("/").filter(Boolean);
      const reelIdx = segments.indexOf("reel");
      const reelId = reelIdx !== -1 ? segments[reelIdx + 1] : segments[0];
      if (reelId) {
        return `https://www.instagram.com/reel/${reelId}/embed`;
      }
    }

    if (detected === HighlightPlatform.TIKTOK) {
      const segments = parsed.pathname.split("/").filter(Boolean);
      const videoId = segments[segments.length - 1];
      if (videoId && /^\d+$/.test(videoId)) {
        return `https://www.tiktok.com/embed/${videoId}`;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function getHighlightThumbnailUrl(
  url: string,
  platform?: HighlightPlatform | string | null,
): string | null {
  if (!url) return null;

  const detected = platform || detectHighlightPlatform(url);
  if (!detected) return null;

  try {
    const parsed = new URL(url);

    if (detected === HighlightPlatform.YOUTUBE_SHORTS) {
      const segments = parsed.pathname.split("/").filter(Boolean);
      const shortsIdx = segments.indexOf("shorts");
      const videoId =
        shortsIdx !== -1
          ? segments[shortsIdx + 1]
          : parsed.searchParams.get("v");
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/0.jpg`;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function normalizeHighlightUrl(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed).toString();
  } catch {
    return null;
  }
}

export function isValidHighlightUrl(url: string): boolean {
  return !!normalizeHighlightUrl(url) && !!detectHighlightPlatform(url);
}
