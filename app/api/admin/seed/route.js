import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { isAdminSession } from "../../../../lib/admin";
import { getDb } from "../../../../lib/db";

function normalizeAddress(input) {
  return typeof input === "string" ? input.trim().toLowerCase() : "";
}

function getSeedContractAddress() {
  const envAddr =
    process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS ||
    process.env.NFT_COLLECTION_ADDRESS ||
    process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS ||
    process.env.NFT_CONTRACT_ADDRESS ||
    "";
  return normalizeAddress(envAddr) || "0x0000000000000000000000000000000000000000";
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdminSession(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const contractAddress = getSeedContractAddress();
    const now = new Date();

    const seedCollections = [
      {
        name: "Cosmos Genesis",
        image: "https://picsum.photos/seed/cosmos-genesis/80/80",
        floor: 0.12,
        delta: 2.4,
        order: 1,
      },
      {
        name: "Bay Creatures",
        image: "https://picsum.photos/seed/bay-creatures/80/80",
        floor: 1.4,
        delta: 12.6,
        order: 2,
      },
      {
        name: "Cyber Sailors",
        image: "https://picsum.photos/seed/cyber-sailors/80/80",
        floor: 0.75,
        delta: -1.1,
        order: 3,
      },
    ];

    const seedAssets = [
      {
        tokenId: "1",
        contractAddress,
        name: "Cosmos Genesis #1",
        collection: "Cosmos Genesis",
        image: "https://picsum.photos/seed/cosmos1/1200/800",
        priceEth: 0.12,
        owner: null,
        description: "A genesis piece in the Cosmos collection.",
        traits: [
          { type: "Background", value: "Deep Space" },
          { type: "Accent", value: "Cyan" },
        ],
        order: 1,
      },
      {
        tokenId: "2",
        contractAddress,
        name: "Cosmos Genesis #2",
        collection: "Cosmos Genesis",
        image: "https://picsum.photos/seed/cosmos2/1200/800",
        priceEth: 0.2,
        owner: null,
        description: "A genesis piece in the Cosmos collection.",
        traits: [
          { type: "Background", value: "Aurora" },
          { type: "Accent", value: "Purple" },
        ],
        order: 2,
      },
      {
        tokenId: "3",
        contractAddress,
        name: "Bay Creature #3",
        collection: "Bay Creatures",
        image: "https://picsum.photos/seed/cosmos3/1200/800",
        priceEth: 1.4,
        owner: null,
        description: "A rare creature from the Cosmos.",
        traits: [
          { type: "Rarity", value: "Epic" },
          { type: "Element", value: "Water" },
        ],
        order: 3,
      },
      {
        tokenId: "4",
        contractAddress,
        name: "Cyber Sailor #4",
        collection: "Cyber Sailors",
        image: "https://picsum.photos/seed/cosmos4/1200/800",
        priceEth: 0.75,
        owner: null,
        description: "Sailing the metaverse seas.",
        traits: [
          { type: "Class", value: "Captain" },
          { type: "Ship", value: "Neon Cutter" },
        ],
        order: 4,
      },
    ];

    const seedHeroBanners = [
      {
        key: "parallel-alpha",
        title: "Parallel Alpha",
        by: "By Parallel",
        image:
          "https://gam3s.gg/_next/image/?url=https%3A%2F%2Fassets.gam3s.gg%2Fparallel_banner_a00361f2f6%2Fparallel_banner_a00361f2f6.jpg&w=3840&q=75",
        stats: [
          { label: "Floor Price", value: "< 0.0001 ETH" },
          { label: "Items", value: "5,665,623" },
          { label: "Total Volume", value: "78K ETH" },
          { label: "Listed", value: "50.9%" },
        ],
        order: 1,
      },
      {
        key: "pudgy-penguins",
        title: "Pudgy Penguins",
        by: "By Pudgy Penguins",
        image:
          "https://dappradar.com/blog/static/a78e409260dcbc91c29d2ae306ada444/d75ec/dappradar.com-pudgy-penguins-nfts-all-about-the-collectibles-pudgy-penguins-nft-collection.png",
        stats: [
          { label: "Floor Price", value: "5.15 ETH" },
          { label: "Items", value: "8,888" },
          { label: "Total Volume", value: "312K ETH" },
          { label: "Listed", value: "9.8%" },
        ],
        order: 2,
      },
      {
        key: "azuki",
        title: "Azuki",
        by: "By Chiru Labs",
        image:
          "https://dappradar.com/blog/static/934b5bc42c243282988b93e31069be28/dd3f5/dappradar.com-azuki-nfts-all-about-the-brands-past-present-future-azuki-nfts.png",
        stats: [
          { label: "Floor Price", value: "9.2 ETH" },
          { label: "Items", value: "10,000" },
          { label: "Total Volume", value: "420K ETH" },
          { label: "Listed", value: "3.2%" },
        ],
        order: 3,
      },
    ];

    const db = await getDb();

    const collectionsResult = await db.collection("featuredCollections").bulkWrite(
      seedCollections.map((c) => ({
        updateOne: {
          filter: { name: c.name },
          update: {
            $set: {
              name: c.name,
              image: c.image || null,
              floor: c.floor ?? 0,
              delta: c.delta ?? 0,
              order: c.order ?? 0,
              updatedAt: now,
            },
            $setOnInsert: { createdAt: now },
          },
          upsert: true,
        },
      }))
    );

    const assetsResult = await db.collection("featuredAssets").bulkWrite(
      seedAssets.map((a) => ({
        updateOne: {
          filter: { contractAddress: a.contractAddress, tokenId: a.tokenId },
          update: {
            $set: {
              contractAddress: a.contractAddress,
              tokenId: a.tokenId,
              name: a.name,
              collection: a.collection || null,
              image: a.image || null,
              priceEth: a.priceEth ?? null,
              owner: a.owner || null,
              description: a.description || null,
              traits: a.traits || [],
              order: a.order ?? 0,
              updatedAt: now,
            },
            $setOnInsert: { createdAt: now },
          },
          upsert: true,
        },
      }))
    );

    const heroResult = await db.collection("heroBanners").bulkWrite(
      seedHeroBanners.map((b) => ({
        updateOne: {
          filter: { key: b.key },
          update: {
            $set: {
              key: b.key,
              title: b.title,
              by: b.by || null,
              image: b.image || null,
              stats: Array.isArray(b.stats) ? b.stats : [],
              order: b.order ?? 0,
              updatedAt: now,
            },
            $setOnInsert: { createdAt: now },
          },
          upsert: true,
        },
      }))
    );

    return NextResponse.json({
      success: true,
      contractAddress,
      collections: {
        matched: collectionsResult.matchedCount,
        upserted: collectionsResult.upsertedCount,
        modified: collectionsResult.modifiedCount,
      },
      assets: {
        matched: assetsResult.matchedCount,
        upserted: assetsResult.upsertedCount,
        modified: assetsResult.modifiedCount,
      },
      heroBanners: {
        matched: heroResult.matchedCount,
        upserted: heroResult.upsertedCount,
        modified: heroResult.modifiedCount,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to seed database" }, { status: 500 });
  }
}
