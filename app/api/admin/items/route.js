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

function normalizeTokenId(input) {
  if (typeof input === "string") return input.trim();
  if (input == null) return "";
  return String(input).trim();
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdminSession(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const status = (url.searchParams.get("status") || "all").trim();
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "25", 10)));
    const skip = (page - 1) * limit;

    const query = {};
    if (status && status !== "all") query.status = status;

    if (q) {
      const regex = new RegExp(escapeRegex(q), "i");
      query.$or = [{ name: regex }, { collection: regex }, { contractAddress: regex }, { tokenId: regex }, { ownerId: regex }, { owner: regex }];
    }

    const db = await getDb();
    const [items, total] = await Promise.all([
      db.collection("items").find(query).sort({ updatedAt: -1, createdAt: -1 }).skip(skip).limit(limit).toArray(),
      db.collection("items").countDocuments(query),
    ]);

    return NextResponse.json({
      items: items.map((a) => ({
        id: a._id.toString(),
        contractAddress: a.contractAddress,
        tokenId: a.tokenId,
        tokenIdNum: a.tokenIdNum ?? null,
        name: a.name || null,
        collection: a.collection || null,
        image: a.image || null,
        priceEth: a.priceEth ?? 0,
        owner: a.owner || a.ownerId || null,
        ownerId: a.ownerId || null,
        status: a.status || null,
        description: a.description || null,
        traits: Array.isArray(a.traits) ? a.traits : [],
        createdAt: a.createdAt || null,
        updatedAt: a.updatedAt || null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to fetch items" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdminSession(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const contractAddress = normalizeAddress(body.contractAddress);
    const tokenId = normalizeTokenId(body.tokenId);
    const tokenIdNumCandidate = tokenId ? Number(tokenId) : null;
    const tokenIdNum = Number.isFinite(tokenIdNumCandidate) ? tokenIdNumCandidate : null;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const collection = typeof body.collection === "string" ? body.collection.trim() : "";
    const image = typeof body.image === "string" ? body.image.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const status = typeof body.status === "string" ? body.status.trim() : "";
    const priceEth = body.priceEth == null || body.priceEth === "" ? 0 : Number(body.priceEth);
    const ownerId = normalizeAddress(body.ownerId);
    const owner = normalizeAddress(body.owner);
    const traits = Array.isArray(body.traits) ? body.traits : [];

    if (!contractAddress) return NextResponse.json({ error: "contractAddress is required" }, { status: 400 });
    if (!tokenId) return NextResponse.json({ error: "tokenId is required" }, { status: 400 });
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
    if (!Number.isFinite(priceEth) || priceEth < 0) return NextResponse.json({ error: "priceEth must be a number >= 0" }, { status: 400 });

    const now = new Date();
    const db = await getDb();
    await db.collection("items").updateOne(
      { contractAddress, tokenId },
      {
        $set: {
          contractAddress,
          tokenId,
          ...(tokenIdNum != null ? { tokenIdNum } : {}),
          name,
          collection: collection || null,
          image: image || null,
          description: description || null,
          traits,
          status: status || "owned",
          priceEth,
          ownerId: ownerId || null,
          owner: owner || null,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to save item" }, { status: 500 });
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
    await db.collection("items").deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to delete item" }, { status: 500 });
  }
}

