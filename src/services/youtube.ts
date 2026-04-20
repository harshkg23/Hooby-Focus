import { getYoutubeApiKey } from "@/lib/env";
import type { YouTubeVideoItem } from "@/lib/types/learning";
import { getCachedJson, setCachedJson } from "@/services/cache";

const SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";

export async function searchYouTubeVideos(params: {
  query: string;
  maxResults?: number;
}): Promise<YouTubeVideoItem[]> {
  const key = getYoutubeApiKey();
  if (!key) {
    throw new Error("Missing YOUTUBE_API_KEY for video search.");
  }

  const maxResults = Math.min(params.maxResults ?? 4, 5);
  const cacheParts = ["yt-search", params.query, String(maxResults)];
  const cached = await getCachedJson<YouTubeVideoItem[]>("youtube", cacheParts);
  if (cached?.length) return cached;

  const q = new URLSearchParams({
    part: "snippet",
    type: "video",
    maxResults: String(maxResults),
    q: params.query,
    relevanceLanguage: "en",
    safeSearch: "strict",
    key,
  });

  const res = await fetch(`${SEARCH_URL}?${q.toString()}`, { next: { revalidate: 0 } });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`YouTube API error: ${res.status} ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    items?: Array<{
      id?: { videoId?: string };
      snippet?: { title?: string; channelTitle?: string; thumbnails?: { medium?: { url?: string } } };
    }>;
  };

  const items: YouTubeVideoItem[] = (data.items ?? [])
    .map((it) => {
      const id = it.id?.videoId;
      if (!id) return null;
      return {
        videoId: id,
        title: it.snippet?.title ?? "Video",
        channelTitle: it.snippet?.channelTitle ?? "",
        thumbnailUrl:
          it.snippet?.thumbnails?.medium?.url ??
          `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
      };
    })
    .filter((x): x is YouTubeVideoItem => x !== null);

  if (items.length) {
    await setCachedJson("youtube", cacheParts, items);
  }
  return items;
}
