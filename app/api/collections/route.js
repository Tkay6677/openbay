import { NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSession } from "next-auth/next";
import { getDb } from "../../../lib/db";
import { authOptions } from "../auth/[...nextauth]/route";
import { getUserById } from "../../../lib/db";

function normalizeAddress(input) {
  return typeof input === "string" ? input.trim().toLowerCase() : "";
}

export async function GET() {
  try {
    const db = await getDb();
    const featured = await db.collection("featuredCollections").find({}).sort({ order: 1, updatedAt: -1 }).toArray();
    if (featured.length > 0) {
      return NextResponse.json({
        collections: featured.map((c) => ({
          name: c.name,
          floor: c.floor ?? 0,
          delta: c.delta ?? 0,
          image: c.image || null,
        })),
      });
    }

    const [collections, floors] = await Promise.all([
      db.collection("collections").find({}).sort({ createdAt: -1 }).toArray(),
      db
        .collection("items")
        .aggregate([
          { $match: { status: "listed", priceEth: { $gt: 0 } } },
          { $group: { _id: "$contractAddress", floor: { $min: "$priceEth" } } },
        ])
        .toArray(),
    ]);

    const floorByCollection = new Map(floors.map((f) => [String(f._id || "").toLowerCase(), Number(f.floor || 0)]));

    return NextResponse.json({
      collections: collections.map((c) => ({
        contractAddress: c.contractAddress,
        name: c.name,
        floor: floorByCollection.get(String(c.contractAddress || "").toLowerCase()) || 0,
        delta: 0,
        image: c.image || null,
      })),
    });
  } catch {
    return NextResponse.json({ collections: [] });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await getUserById(session.user.id);
    const creatorWallet = normalizeAddress(user?.walletAddress);
    if (!creatorWallet) {
      return NextResponse.json({ error: "Link your wallet before creating a collection" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const image = typeof body.image === "string" ? body.image.trim() : "";

    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    const db = await getDb();
    const now = new Date();

    const contractAddress = `0x${crypto.randomBytes(20).toString("hex")}`.toLowerCase();

    await db.collection("collections").insertOne({
      contractAddress,
      name,
      description: description || null,
      image: image || null,
      creatorId: creatorWallet,
      nextTokenId: 1,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ contractAddress, name });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to create collection" }, { status: 500 });
  }
}
