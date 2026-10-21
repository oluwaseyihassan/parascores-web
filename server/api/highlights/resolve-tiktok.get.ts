export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const rawUrl = typeof query.url === "string" ? query.url.trim() : "";

  if (!rawUrl) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing url parameter",
    });
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid URL",
    });
  }

  const hostname = parsed.hostname.toLowerCase();
  const isTikTok =
    hostname === "tiktok.com" ||
    hostname.endsWith(".tiktok.com") ||
    hostname === "douyin.com" ||
    hostname.endsWith(".douyin.com");

  if (!isTikTok) {
    throw createError({
      statusCode: 400,
      statusMessage: "Not a TikTok URL",
    });
  }

  // 1. Direct video ID in URL path (e.g. /@user/video/7646140013763185953)
  const directMatch = parsed.pathname.match(/\/(?:video|v|player\/v1)\/(\d+)/i);
  if (directMatch) {
    const videoId = directMatch[1];
    return {
      videoId,
      embedUrl: `https://www.tiktok.com/player/v1/${videoId}`,
      canonicalUrl: rawUrl,
    };
  }

  // 2. Try TikTok oEmbed API first (fast & reliable, returns embed_product_id)
  try {
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(rawUrl)}`;
    const oembedRes = await fetch(oembedUrl, {
      signal: AbortSignal.timeout(3500),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (oembedRes.ok) {
      const data: any = await oembedRes.json();
      const videoId =
        data.embed_product_id ||
        (data.html && data.html.match(/player\/v1\/(\d+)/i)?.[1]);

      if (videoId) {
        return {
          videoId,
          embedUrl: `https://www.tiktok.com/player/v1/${videoId}`,
          canonicalUrl: data.provider_url || rawUrl,
        };
      }
    }
  } catch {
    // Continue to redirect fallback
  }

  // 3. Fallback: Try HTTP HEAD/GET with redirect manual to follow 301/302 shortlinks
  for (const method of ["HEAD", "GET"] as const) {
    try {
      const res = await fetch(rawUrl, {
        method,
        redirect: "manual",
        signal: AbortSignal.timeout(3500),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      const location = res.headers.get("location");
      if (location) {
        const idMatch =
          location.match(/\/video\/(\d+)/i) ||
          location.match(/\/v\/(\d+)/i) ||
          location.match(/(\d{15,22})/);
        if (idMatch) {
          const videoId = idMatch[1];
          return {
            videoId,
            embedUrl: `https://www.tiktok.com/player/v1/${videoId}`,
            canonicalUrl: location,
          };
        }
      }
    } catch {
      // Continue
    }
  }

  throw createError({
    statusCode: 404,
    statusMessage: "Could not resolve TikTok video ID",
  });
});
