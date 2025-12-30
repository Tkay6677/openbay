import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { isAdminSession } from "../../../../lib/admin";
import { getDb } from "../../../../lib/db";

function normalizeAddress(input) {
  return typeof input === "string" ? input.trim().toLowerCase() : "";
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdminSession(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const db = await getDb();
    const assets = await db
      .collection("featuredAssets")
      .find({})
      .sort({ order: 1, updatedAt: -1 })
      .toArray();

    return NextResponse.json({
      assets: assets.map((a) => ({
        id: a._id.toString(),
        tokenId: a.tokenId,
        contractAddress: a.contractAddress,
        name: a.name,
        collection: a.collection || null,
        image: a.image || null,
        priceEth: a.priceEth ?? null,
        owner: a.owner || null,
        description: a.description || null,
        traits: a.traits || [],
        order: a.order ?? 0,
        updatedAt: a.updatedAt || null,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to fetch assets" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdminSession(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const contractAddress = normalizeAddress(body.contractAddress);
    const tokenId = typeof body.tokenId === "string" ? body.tokenId.trim() : String(body.tokenId || "").trim();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const collection = typeof body.collection === "string" ? body.collection.trim() : "";
    const image = typeof body.image === "string" ? body.image.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const owner = normalizeAddress(body.owner);
    const order = body.order == null ? 0 : Number(body.order);
    const priceEth = body.priceEth == null || body.priceEth === "" ? null : Number(body.priceEth);
    const traits = Array.isArray(body.traits) ? body.traits : [];

    if (!contractAddress) return NextResponse.json({ error: "contractAddress is required" }, { status: 400 });
    if (!tokenId) return NextResponse.json({ error: "tokenId is required" }, { status: 400 });
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
    if (!image) return NextResponse.json({ error: "image is required" }, { status: 400 });
    if (!Number.isFinite(order) || (priceEth != null && !Number.isFinite(priceEth))) {
      return NextResponse.json({ error: "order and priceEth must be numbers" }, { status: 400 });
    }

    const db = await getDb();
    const now = new Date();
    await db.collection("featuredAssets").updateOne(
      { contractAddress, tokenId },
      {
        $set: {
          contractAddress,
          tokenId,
          name,
          collection: collection || null,
          image,
          description: description || null,
          owner: owner || null,
          priceEth,
          traits,
          order,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to save asset" }, { status: 500 });
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
    await db.collection("featuredAssets").deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to delete asset" }, { status: 500 });
  }
}

