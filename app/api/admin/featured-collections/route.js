import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { isAdminSession } from "../../../../lib/admin";
import { getDb } from "../../../../lib/db";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdminSession(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const db = await getDb();
    const collections = await db
      .collection("featuredCollections")
      .find({})
      .sort({ order: 1, updatedAt: -1 })
      .toArray();

    return NextResponse.json({
      collections: collections.map((c) => ({
        id: c._id.toString(),
        name: c.name,
        image: c.image || null,
        floor: c.floor ?? 0,
        delta: c.delta ?? 0,
        order: c.order ?? 0,
        updatedAt: c.updatedAt || null,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to fetch collections" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdminSession(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const image = typeof body.image === "string" ? body.image.trim() : "";
    const floor = body.floor == null ? 0 : Number(body.floor);
    const delta = body.delta == null ? 0 : Number(body.delta);
    const order = body.order == null ? 0 : Number(body.order);

    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
    if (!Number.isFinite(floor) || !Number.isFinite(delta) || !Number.isFinite(order)) {
      return NextResponse.json({ error: "floor, delta, and order must be numbers" }, { status: 400 });
    }

    const db = await getDb();
    const now = new Date();
    await db.collection("featuredCollections").updateOne(
      { name },
      {
        $set: {
          name,
          image: image || null,
          floor,
          delta,
          order,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to save collection" }, { status: 500 });
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
    await db.collection("featuredCollections").deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to delete collection" }, { status: 500 });
  }
}

