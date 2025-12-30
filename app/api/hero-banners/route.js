import { NextResponse } from "next/server";
import { getDb } from "../../../lib/db";

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const limitRaw = (url.searchParams.get("limit") || "").trim();
    const limit = Math.min(10, Math.max(1, Number(limitRaw || 5) || 5));

    const db = await getDb();
    const banners = await db
      .collection("heroBanners")
      .find({})
      .sort({ order: 1, updatedAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({
      banners: banners.map((b) => ({
        title: b.title,
        by: b.by || null,
        image: b.image || null,
        stats: Array.isArray(b.stats) ? b.stats : [],
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to fetch hero banners" }, { status: 500 });
  }
}

