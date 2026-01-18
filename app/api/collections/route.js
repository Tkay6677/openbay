import { NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSession } from "next-auth/next";
import { ethers } from "ethers";
import { getDb } from "../../../lib/db";
import { authOptions } from "../auth/[...nextauth]/route";
import { getUserById } from "../../../lib/db";

function normalizeAddress(input) {
  return typeof input === "string" ? input.trim().toLowerCase() : "";
}

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const mine = url.searchParams.get("mine") === "true";
    const db = await getDb();

    if (mine) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const user = await getUserById(session.user.id);
      const creatorWallet = normalizeAddress(user?.walletAddress);
      if (!creatorWallet) return NextResponse.json({ error: "Link your wallet to view collections" }, { status: 400 });

      const myCollections = await db.collection("collections").find({ creatorId: creatorWallet }).sort({ createdAt: -1 }).toArray();
      return NextResponse.json({
        collections: myCollections.map((c) => ({
          contractAddress: c.contractAddress,
          name: c.name,
          floor: 0,
          delta: 0,
          image: c.image || null,
          description: c.description || null,
        })),
      });
    }

    const featured = await db.collection("featuredCollections").find({}).sort({ order: 1, updatedAt: -1 }).toArray();
    if (featured.length > 0) {
      return NextResponse.json({
        collections: featured.map((c) => ({
          contractAddress: c.contractAddress || null,
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
  } catch (e) {
    return NextResponse.json({ collections: [], error: e?.message || "Failed to load collections" }, { status: 500 });
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
    const message = typeof body.message === "string" ? body.message : "";
    const signature = typeof body.signature === "string" ? body.signature : "";

    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
    if (!message || !signature) return NextResponse.json({ error: "message and signature are required" }, { status: 400 });

    let recovered = null;
    try {
      recovered = ethers.utils.verifyMessage(message, signature);
    } catch {
      recovered = null;
    }
    if (!recovered || recovered.toLowerCase() !== creatorWallet) {
      return NextResponse.json({ error: "Invalid wallet signature" }, { status: 401 });
    }

    const db = await getDb();
    const now = new Date();

    let contractAddress = null;
    let lastErr = null;
    for (let i = 0; i < 6; i++) {
      try {
        contractAddress = `0x${crypto.randomBytes(20).toString("hex")}`.toLowerCase();
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
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        contractAddress = null;
      }
    }

    if (!contractAddress) throw lastErr || new Error("Failed to create collection");

    return NextResponse.json({ contractAddress, name });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to create collection" }, { status: 500 });
  }
}
