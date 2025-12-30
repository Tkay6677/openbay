import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { isAdminSession } from "../../../../lib/admin";
import { getDb } from "../../../../lib/db";

function normalizeKey(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeStat(value) {
  const label = typeof value?.label === "string" ? value.label.trim() : "";
  const v = typeof value?.value === "string" ? value.value.trim() : "";
  if (!label || !v) return null;
  return { label, value: v };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdminSession(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const db = await getDb();
    const banners = await db.collection("heroBanners").find({}).sort({ order: 1, updatedAt: -1 }).toArray();
    return NextResponse.json({
      banners: banners.map((b) => ({
        id: b._id.toString(),
        key: b.key,
        title: b.title,
        by: b.by || "",
        image: b.image || "",
        order: b.order ?? 0,
        stats: Array.isArray(b.stats) ? b.stats : [],
        updatedAt: b.updatedAt || null,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to fetch hero banners" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdminSession(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const by = typeof body.by === "string" ? body.by.trim() : "";
    const image = typeof body.image === "string" ? body.image.trim() : "";
    const order = body.order == null ? 0 : Number(body.order);

    const providedKey = typeof body.key === "string" ? body.key : "";
    const key = normalizeKey(providedKey || title);

    const statsRaw = Array.isArray(body.stats) ? body.stats : [];
    const stats = statsRaw.map(normalizeStat).filter(Boolean);

    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
    if (!image) return NextResponse.json({ error: "image is required" }, { status: 400 });
    if (!key) return NextResponse.json({ error: "key is required" }, { status: 400 });
    if (!Number.isFinite(order)) return NextResponse.json({ error: "order must be a number" }, { status: 400 });

    const db = await getDb();
    const now = new Date();
    await db.collection("heroBanners").updateOne(
      { key },
      {
        $set: {
          key,
          title,
          by: by || null,
          image,
          stats,
          order,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true, key });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to save hero banner" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdminSession(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const url = new URL(req.url);
    const id = (url.searchParams.get("id") || "").trim();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const db = await getDb();
    const { ObjectId } = await import("mongodb");
    await db.collection("heroBanners").deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to delete hero banner" }, { status: 500 });
  }
}

