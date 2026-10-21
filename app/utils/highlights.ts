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
    domains: ["tiktok.com", "www.tiktok.com", "vm.tiktok.com", "vt.tiktok.com", "m.tiktok.com"],
    placeholder: "https://tiktok.com/@user/video/... or vt.tiktok.com/...",
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
      let videoId =
        shortsIdx !== -1
          ? segments[shortsIdx + 1]
          : parsed.searchParams.get("v");
      if (!videoId && (parsed.hostname === "youtu.be" || parsed.hostname.endsWith(".youtu.be"))) {
        videoId = segments[0];
      }
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
      const videoId = extractTikTokVideoId(url);
      if (videoId) {
        return `https://www.tiktok.com/player/v1/${videoId}`;
      }
      const cached = tiktokResolutionCache.get(url.trim());
      if (cached) {
        return cached.embedUrl;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function formatHighlightEmbedUrl(
  embedUrl?: string | null,
): string | null {
  if (!embedUrl) return null;
  return embedUrl.replace(/tiktok\.com\/embed(?:\/v2)?\//i, "tiktok.com/player/v1/");
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
      let videoId =
        shortsIdx !== -1
          ? segments[shortsIdx + 1]
          : parsed.searchParams.get("v");
      if (!videoId && (parsed.hostname === "youtu.be" || parsed.hostname.endsWith(".youtu.be"))) {
        videoId = segments[0];
      }
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

export function extractTikTokVideoId(url: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(
      /\/(?:video|v|embed(?:|v2)|player\/v1)\/(\d+)/i,
    );
    if (match) return match[1];

    const segments = parsed.pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    if (last && /^\d{15,22}$/.test(last)) {
      return last;
    }

    const itemId =
      parsed.searchParams.get("item_id") ||
      parsed.searchParams.get("video_id");
    if (itemId && /^\d+$/.test(itemId)) {
      return itemId;
    }
  } catch {
    return null;
  }
  return null;
}

export function isTikTokUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    return (
      hostname === "tiktok.com" ||
      hostname.endsWith(".tiktok.com") ||
      hostname === "douyin.com" ||
      hostname.endsWith(".douyin.com")
    );
  } catch {
    return false;
  }
}

export function isTikTokShortUrl(url: string): boolean {
  if (!isTikTokUrl(url)) return false;
  return !extractTikTokVideoId(url);
}

const tiktokResolutionCache = new Map<
  string,
  { videoId: string; embedUrl: string; canonicalUrl?: string }
>();

export async function resolveTikTokShortUrl(
  url: string,
): Promise<{ videoId: string; embedUrl: string; canonicalUrl?: string } | null> {
  if (!url) return null;
  const trimmed = url.trim();

  const directId = extractTikTokVideoId(trimmed);
  if (directId) {
    const res = {
      videoId: directId,
      embedUrl: `https://www.tiktok.com/player/v1/${directId}`,
      canonicalUrl: trimmed,
    };
    tiktokResolutionCache.set(trimmed, res);
    return res;
  }

  if (tiktokResolutionCache.has(trimmed)) {
    return tiktokResolutionCache.get(trimmed)!;
  }

  // 1. Try Nitro server resolver endpoint
  try {
    const res = await $fetch<{
      videoId: string;
      embedUrl: string;
      canonicalUrl?: string;
    }>(`/api/highlights/resolve-tiktok?url=${encodeURIComponent(trimmed)}`);

    if (res?.videoId && res?.embedUrl) {
      tiktokResolutionCache.set(trimmed, res);
      return res;
    }
  } catch {
    // Fallback to client-side oEmbed
  }

  // 2. Direct browser oEmbed fallback (TikTok oEmbed supports CORS: *)
  try {
    const oembedRes = await fetch(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(trimmed)}`,
      { signal: AbortSignal.timeout(3500) },
    );
    if (oembedRes.ok) {
      const data: any = await oembedRes.json();
      const videoId =
        data.embed_product_id ||
        (data.html && data.html.match(/player\/v1\/(\d+)/i)?.[1]);
      if (videoId) {
        const result = {
          videoId,
          embedUrl: `https://www.tiktok.com/player/v1/${videoId}`,
          canonicalUrl: data.provider_url || trimmed,
        };
        tiktokResolutionCache.set(trimmed, result);
        return result;
      }
    }
  } catch {
    // Both failed
  }

  return null;
}

