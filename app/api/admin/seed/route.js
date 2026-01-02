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

    const defaultContractAddress = getSeedContractAddress();
    const now = new Date();

    const seedCollections = [
      {
        contractAddress: "0x1111111111111111111111111111111111111111",
        name: "Cosmos Genesis",
        image: "https://picsum.photos/seed/cosmos-genesis/80/80",
        description: "Genesis-era pieces from the Cosmos universe.",
        floor: 0.12,
        delta: 2.4,
        order: 1,
      },
      {
        contractAddress: "0x2222222222222222222222222222222222222222",
        name: "Bay Creatures",
        image: "https://picsum.photos/seed/bay-creatures/80/80",
        description: "Creatures emerging from the Bay — rare, wild, and collectible.",
        floor: 1.4,
        delta: 12.6,
        order: 2,
      },
      {
        contractAddress: "0x3333333333333333333333333333333333333333",
        name: "Cyber Sailors",
        image: "https://picsum.photos/seed/cyber-sailors/80/80",
        description: "Sailors navigating neon seas of the metaverse.",
        floor: 0.75,
        delta: -1.1,
        order: 3,
      },
      {
        contractAddress: "0x4444444444444444444444444444444444444444",
        name: "Neon Skulls",
        image: "https://picsum.photos/seed/neon-skulls/80/80",
        description: "Electric skull portraits with glowing traits.",
        floor: 0.35,
        delta: 4.2,
        order: 4,
      },
      {
        contractAddress: "0x5555555555555555555555555555555555555555",
        name: "Pixel Pets",
        image: "https://picsum.photos/seed/pixel-pets/80/80",
        description: "Tiny companions rendered in crisp pixel art.",
        floor: 0.06,
        delta: -0.8,
        order: 5,
      },
    ];

    const seedAssets = [
      {
        tokenId: "1",
        contractAddress: seedCollections[0].contractAddress,
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
        contractAddress: seedCollections[0].contractAddress,
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
        contractAddress: seedCollections[1].contractAddress,
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
        contractAddress: seedCollections[2].contractAddress,
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

    const seedItems = [];
    seedCollections.forEach((c, collectionIndex) => {
      const base = 1000 * (collectionIndex + 1);
      for (let i = 1; i <= 48; i += 1) {
        const tokenIdNum = base + i;
        const tokenId = String(tokenIdNum);
        const priceBase = Number(c.floor || 0) || 0.05;
        const variance = ((i % 11) - 5) * 0.02;
        const priceEth = Math.max(0, Number((priceBase + variance).toFixed(4)));
        const listed = i % 6 !== 0;

        seedItems.push({
          contractAddress: c.contractAddress.toLowerCase(),
          tokenId,
          tokenIdNum,
          name: `${c.name} #${tokenIdNum}`,
          collection: c.name,
          image: `https://picsum.photos/seed/${encodeURIComponent(`${c.name}-${tokenIdNum}`)}/600/600`,
          description: c.description || null,
          traits: [
            { type: "Series", value: c.name },
            { type: "Rarity", value: i % 12 === 0 ? "Legendary" : i % 5 === 0 ? "Rare" : "Common" },
          ],
          status: listed ? "listed" : "owned",
          priceEth: listed ? priceEth : 0,
        });
      }
    });

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
              contractAddress: c.contractAddress.toLowerCase(),
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

    const baseCollectionsResult = await db.collection("collections").bulkWrite(
      seedCollections.map((c) => ({
        updateOne: {
          filter: { contractAddress: c.contractAddress.toLowerCase() },
          update: {
            $set: {
              contractAddress: c.contractAddress.toLowerCase(),
              name: c.name,
              description: c.description || null,
              image: c.image || null,
              creatorId: "seed",
              updatedAt: now,
            },
            $setOnInsert: { createdAt: now, nextTokenId: 1 },
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

    const itemsResult = await db.collection("items").bulkWrite(
      seedItems.map((a) => ({
        updateOne: {
          filter: { contractAddress: a.contractAddress, tokenId: a.tokenId },
          update: {
            $setOnInsert: { createdAt: now },
            $set: {
              contractAddress: a.contractAddress,
              tokenId: a.tokenId,
              tokenIdNum: a.tokenIdNum,
              name: a.name,
              collection: a.collection || null,
              image: a.image || null,
              priceEth: a.priceEth ?? 0,
              owner: a.owner || null,
              ownerId: a.ownerId || null,
              description: a.description || null,
              traits: a.traits || [],
              status: a.status || "owned",
              updatedAt: now,
            },
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
      contractAddress: defaultContractAddress,
      collections: {
        matched: collectionsResult.matchedCount,
        upserted: collectionsResult.upsertedCount,
        modified: collectionsResult.modifiedCount,
      },
      baseCollections: {
        matched: baseCollectionsResult.matchedCount,
        upserted: baseCollectionsResult.upsertedCount,
        modified: baseCollectionsResult.modifiedCount,
      },
      assets: {
        matched: assetsResult.matchedCount,
        upserted: assetsResult.upsertedCount,
        modified: assetsResult.modifiedCount,
      },
      items: {
        matched: itemsResult.matchedCount,
        upserted: itemsResult.upsertedCount,
        modified: itemsResult.modifiedCount,
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
