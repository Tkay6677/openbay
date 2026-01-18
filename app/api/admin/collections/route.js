import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { isAdminSession } from "../../../../lib/admin";
import { getDb } from "../../../../lib/db";

function escapeRegex(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeAddress(input) {
  return typeof input === "string" ? input.trim().toLowerCase() : "";
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdminSession(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "25", 10)));
    const skip = (page - 1) * limit;

    const query = {};
    if (q) {
      const regex = new RegExp(escapeRegex(q), "i");
      query.$or = [{ name: regex }, { contractAddress: regex }, { creatorId: regex }];
    }

    const db = await getDb();
    const [collections, total] = await Promise.all([
      db.collection("collections").find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      db.collection("collections").countDocuments(query),
    ]);

    return NextResponse.json({
      collections: collections.map((c) => ({
        id: c._id.toString(),
        contractAddress: c.contractAddress || null,
        name: c.name || null,
        description: c.description || null,
        image: c.image || null,
        creatorId: c.creatorId || null,
        nextTokenId: c.nextTokenId ?? null,
        createdAt: c.createdAt || null,
        updatedAt: c.updatedAt || null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
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
    const contractAddress = normalizeAddress(body.contractAddress);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const image = typeof body.image === "string" ? body.image.trim() : "";
    const creatorId = normalizeAddress(body.creatorId);
    const nextTokenIdRaw = body.nextTokenId == null || body.nextTokenId === "" ? null : Number(body.nextTokenId);

    if (!contractAddress) return NextResponse.json({ error: "contractAddress is required" }, { status: 400 });
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
    if (nextTokenIdRaw != null && (!Number.isFinite(nextTokenIdRaw) || nextTokenIdRaw < 1)) {
      return NextResponse.json({ error: "nextTokenId must be a number >= 1" }, { status: 400 });
    }

    const db = await getDb();
    const now = new Date();
    await db.collection("collections").updateOne(
      { contractAddress },
      {
        $set: {
          contractAddress,
          name,
          description: description || null,
          image: image || null,
          ...(creatorId ? { creatorId } : {}),
          ...(nextTokenIdRaw != null ? { nextTokenId: nextTokenIdRaw } : {}),
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now, ...(nextTokenIdRaw != null ? {} : { nextTokenId: 1 }) },
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
    await db.collection("collections").deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to delete collection" }, { status: 500 });
  }
}

