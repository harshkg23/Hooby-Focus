import { NextResponse } from "next/server";
import { searchYouTubeVideos } from "@/services/youtube";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (!q || q.length > 200) {
    return NextResponse.json({ error: "Missing or invalid query." }, { status: 400 });
  }
  try {
    const videos = await searchYouTubeVideos({ query: q, maxResults: 4 });
    return NextResponse.json({ videos });
  } catch (e) {
    const message = e instanceof Error ? e.message : "YouTube search failed.";
    console.error("[youtube/search]", e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
