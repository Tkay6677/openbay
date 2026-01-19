import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { ethers } from "ethers";
import crypto from "crypto";
import { getDb, getUserById, createWalletTransaction, updatePlatformWalletBalance, updateUserBalances } from "../../../lib/db";

export async function GET(req) {
  const url = new URL(req.url);
  const contractAddress = (url.searchParams.get("contractAddress") || "").trim().toLowerCase();
  const tokenId = (url.searchParams.get("tokenId") || "").trim();
  const listed = (url.searchParams.get("listed") || "").trim();
  const auctioned = (url.searchParams.get("auctioned") || "").trim();
  const mine = (url.searchParams.get("mine") || "").trim();
  const offers = (url.searchParams.get("offers") || "").trim();
  const limitRaw = (url.searchParams.get("limit") || "").trim();
  const limit = Math.min(50, Math.max(1, Number(limitRaw || 24) || 24));

  try {
    const db = await getDb();
    const isListedQuery = String(listed || "") === "1" || String(listed || "").toLowerCase() === "true";
    const isAuctionedQuery = String(auctioned || "") === "1" || String(auctioned || "").toLowerCase() === "true";
    const isMineQuery = String(mine || "") === "1" || String(mine || "").toLowerCase() === "true";
    const isOffersQuery = String(offers || "") === "1" || String(offers || "").toLowerCase() === "true";

    if (isOffersQuery) {
      if (!contractAddress || !tokenId) return NextResponse.json({ offers: [] });
      const rows = await db
        .collection("offers")
        .find({ contractAddress, tokenId: String(tokenId), status: "active" })
        .sort({ amountEth: -1, createdAt: -1 })
        .limit(25)
        .toArray();
      return NextResponse.json({
        offers: rows.map((o) => ({
          id: o._id.toString(),
          contractAddress: o.contractAddress,
          tokenId: o.tokenId,
          bidder: o.bidder || null,
          amountEth: Number(o.amountEth || 0),
          status: o.status,
          createdAt: o.createdAt || null,
          expiresAt: o.expiresAt || null,
        })),
      });
    }

    if (!isListedQuery && !isMineQuery) {
      if (contractAddress && tokenId) {
        const found = await db.collection("featuredAssets").findOne({ contractAddress, tokenId: String(tokenId) });
        if (found) {
          return NextResponse.json({
            asset: {
              tokenId: found.tokenId,
              contractAddress: found.contractAddress,
              name: found.name,
              collection: found.collection || "Unknown Collection",
              image: found.image || null,
              priceEth: Number(found.priceEth || 0),
              owner: found.owner || null,
              description: found.description || null,
              traits: found.traits || [],
              status: "featured",
              creator: null,
              createdAt: found.createdAt || null,
            },
          });
        }

        const owned = await db.collection("items").findOne({ contractAddress, tokenId: String(tokenId) });
        if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

        const collections = await db.collection("collections").find({}).project({ contractAddress: 1, name: 1 }).toArray();
        const collectionNameByAddress = new Map(collections.map((c) => [String(c.contractAddress || "").toLowerCase(), c.name]));
        const collectionName = owned.collection || collectionNameByAddress.get(contractAddress) || "Unknown Collection";

        return NextResponse.json({
          asset: {
            tokenId: owned.tokenId,
            contractAddress: owned.contractAddress,
            name: owned.name,
            collection: collectionName,
            image: owned.image || null,
            priceEth: owned.status === "listed" ? Number(owned.priceEth || 0) : 0,
            owner: owned.owner || owned.ownerId || null,
            description: owned.description || null,
            traits: owned.traits || [],
            status: owned.status || "owned",
            auction: owned.status === "auction" ? owned.auction || null : null,
            creator: owned.creatorId || null,
            createdAt: owned.createdAt || null,
          },
        });
      }

      const featured = await db
        .collection("featuredAssets")
        .find({})
        .sort({ order: 1, updatedAt: -1 })
        .limit(limit)
        .toArray();

      return NextResponse.json({
        assets: featured.map((a) => ({
          tokenId: a.tokenId,
          contractAddress: a.contractAddress,
          name: a.name,
          collection: a.collection || "Unknown Collection",
          image: a.image || null,
          priceEth: Number(a.priceEth || 0),
          owner: a.owner || null,
          description: a.description || null,
          traits: a.traits || [],
          status: "featured",
        })),
      });
    }

    const query = {};
    if (isListedQuery) query.status = "listed";
    if (isAuctionedQuery) query.status = "auction";

    if (isMineQuery) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const user = await getUserById(session.user.id);
      const wallet = String(user?.walletAddress || "").toLowerCase();
      if (!wallet) return NextResponse.json({ assets: [] });
      query.ownerId = wallet;
    }

    const collections = await db.collection("collections").find({}).project({ contractAddress: 1, name: 1 }).toArray();
    const collectionNameByAddress = new Map(collections.map((c) => [String(c.contractAddress || "").toLowerCase(), c.name]));

    if (contractAddress && tokenId) {
      const found = await db.collection("items").findOne({ contractAddress, tokenId: String(tokenId) });
      if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const collectionName = collectionNameByAddress.get(contractAddress) || "Unknown Collection";
      return NextResponse.json({
        asset: {
          tokenId: found.tokenId,
          contractAddress: found.contractAddress,
          name: found.name,
          collection: found.collection || collectionName,
          image: found.image || null,
          priceEth: found.status === "listed" ? Number(found.priceEth || 0) : 0,
          owner: found.owner || found.ownerId || null,
          description: found.description || null,
          traits: found.traits || [],
          status: found.status || "owned",
          auction: found.status === "auction" ? found.auction || null : null,
          creator: found.creatorId || null,
          createdAt: found.createdAt || null,
        },
      });
    }

    const items = await db
      .collection("items")
      .find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({
      assets: items.map((a) => ({
        tokenId: a.tokenId,
        contractAddress: a.contractAddress,
        name: a.name,
        collection: a.collection || collectionNameByAddress.get(String(a.contractAddress || "").toLowerCase()) || "Unknown Collection",
        image: a.image || null,
        priceEth: a.status === "listed" ? Number(a.priceEth || 0) : 0,
        owner: a.owner || a.ownerId || null,
        description: a.description || null,
        traits: a.traits || [],
        status: a.status || "owned",
        auction: a.status === "auction" ? a.auction || null : null,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await getUserById(session.user.id);
    const creatorWallet = String(user?.walletAddress || "").toLowerCase();
    if (!creatorWallet) {
      return NextResponse.json({ error: "Link your wallet before minting" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const envContractAddress = (process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS || "").trim().toLowerCase();
    const requestedContractAddress = typeof body.contractAddress === "string" ? body.contractAddress.trim().toLowerCase() : "";
    const contractAddress = requestedContractAddress || envContractAddress || "cosmos-virtual";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const image = typeof body.image === "string" ? body.image.trim() : "";
    const category = typeof body.category === "string" ? body.category.trim() : "";
    const rarity = typeof body.rarity === "string" ? body.rarity.trim() : "";
    const message = typeof body.message === "string" ? body.message : "";
    const signature = typeof body.signature === "string" ? body.signature : "";
    const traits = Array.isArray(body.traits) ? body.traits : [];

    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
    if (!description) return NextResponse.json({ error: "description is required" }, { status: 400 });
    if (!image) return NextResponse.json({ error: "image is required" }, { status: 400 });
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

    const mintFeeEth = Number(process.env.MINT_FEE_ETH || "0.01");
    if (!Number.isFinite(mintFeeEth) || mintFeeEth < 0) {
      return NextResponse.json({ error: "Invalid MINT_FEE_ETH" }, { status: 500 });
    }

    const db = await getDb();
    const now = new Date();
    const mongoSession = await db.client.startSession();

    let created = null;
    await mongoSession.withTransaction(async () => {
      const currentUser = await db.collection("users").findOne({ walletAddress: creatorWallet }, { session: mongoSession });
      if (!currentUser) throw new Error("User not found");

      const balanceBefore = Number(currentUser.virtualBalance || 0);
      const mintCost = Number(mintFeeEth || 0);
      if (mintCost > 0 && balanceBefore < mintCost) {
        throw new Error("Insufficient virtual balance to mint");
      }

      const collectionRes = await db.collection("collections").findOneAndUpdate(
        { contractAddress },
        [
          {
            $set: {
              contractAddress: { $ifNull: ["$contractAddress", contractAddress] },
              name: { $ifNull: ["$name", "Cosmos Virtual Collection"] },
              description: { $ifNull: ["$description", null] },
              image: { $ifNull: ["$image", null] },
              creatorId: { $ifNull: ["$creatorId", creatorWallet] },
              createdAt: { $ifNull: ["$createdAt", now] },
              updatedAt: now,
              nextTokenId: { $add: [{ $ifNull: ["$nextTokenId", 1] }, 1] },
            },
          },
        ],
        { upsert: true, returnDocument: "before", session: mongoSession }
      );

      const collectionBefore = collectionRes?.value || null;
      const reservedTokenId =
        collectionBefore && Number.isFinite(Number(collectionBefore.nextTokenId)) ? Number(collectionBefore.nextTokenId) : 1;
      if (!Number.isFinite(reservedTokenId) || reservedTokenId < 1) throw new Error("Failed to reserve token ID");
      const collectionName = collectionBefore?.name || "Cosmos Virtual Collection";

      const tokenId = String(reservedTokenId);
      const tokenIdNum = Number(reservedTokenId);

      const traitsFromForm = [];
      if (category) traitsFromForm.push({ type: "Category", value: category });
      if (rarity) traitsFromForm.push({ type: "Rarity", value: rarity });

      const itemDoc = {
        contractAddress,
        tokenId,
        tokenIdNum,
        name,
        collection: collectionName,
        image,
        description,
        traits: Array.isArray(traits) && traits.length ? traits : traitsFromForm,
        creatorId: creatorWallet,
        ownerId: creatorWallet,
        status: "owned",
        priceEth: 0,
        createdAt: now,
        updatedAt: now,
      };

      const insertRes = await db.collection("items").insertOne(itemDoc, { session: mongoSession });
      const itemId = insertRes.insertedId;

      const balanceAfter = balanceBefore - mintCost;
      if (mintCost > 0) {
        await updateUserBalances([{ userId: creatorWallet, virtualBalance: -mintCost, totalSpent: mintCost }], mongoSession);
        await updatePlatformWalletBalance({ userBalances: -mintCost, platformRevenue: mintCost }, mongoSession);
      }

      await createWalletTransaction(
        {
          type: "mint",
          userId: creatorWallet,
          amount: mintCost,
          balanceBefore,
          balanceAfter,
          itemId,
          status: "completed",
          description: mintCost > 0 ? `Minted ${name} (${mintCost} ETH)` : `Minted ${name}`,
          createdAt: now,
        },
        mongoSession
      );

      created = {
        tokenId,
        contractAddress,
        asset: {
          tokenId,
          contractAddress,
          name,
          collection: collectionName,
          image,
          priceEth: 0,
          owner: creatorWallet,
          description,
          traits: itemDoc.traits || [],
          status: "owned",
          createdAt: now,
        },
      };
    });

    return NextResponse.json(created);
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to mint" }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await getUserById(session.user.id);
    const wallet = String(user?.walletAddress || "").toLowerCase();
    if (!wallet) return NextResponse.json({ error: "Link your wallet first" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === "string" ? body.action.trim().toLowerCase() : "";
    const contractAddress = typeof body.contractAddress === "string" ? body.contractAddress.trim().toLowerCase() : "";
    const tokenId = body.tokenId !== undefined ? String(body.tokenId).trim() : "";

    if (!action) return NextResponse.json({ error: "action is required" }, { status: 400 });
    if (!contractAddress || !tokenId) return NextResponse.json({ error: "contractAddress and tokenId are required" }, { status: 400 });

    const db = await getDb();
    const now = new Date();
    const txHash = `0x${crypto.randomBytes(32).toString("hex")}`;

    const readItem = async (sessionArg = null) =>
      await db.collection("items").findOne({ contractAddress, tokenId }, sessionArg ? { session: sessionArg } : undefined);

    if (action === "list") {
      const priceEth = Number(body.priceEth);
      if (!Number.isFinite(priceEth) || priceEth <= 0) return NextResponse.json({ error: "priceEth must be > 0" }, { status: 400 });

      const item = await readItem();
      if (!item) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
      if (String(item.ownerId || "").toLowerCase() !== wallet) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      await db.collection("items").updateOne(
        { contractAddress, tokenId },
        { $set: { status: "listed", priceEth, updatedAt: now } }
      );

      return NextResponse.json({ success: true, txHash });
    }

    if (action === "unlist") {
      const item = await readItem();
      if (!item) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
      if (String(item.ownerId || "").toLowerCase() !== wallet) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      await db.collection("items").updateOne(
        { contractAddress, tokenId },
        { $set: { status: "owned", priceEth: 0, updatedAt: now }, $unset: { auction: "" } }
      );

      return NextResponse.json({ success: true, txHash });
    }

    if (action === "create_auction") {
      const startingBidEth = Number(body.startingBidEth);
      const buyoutPriceEth = Number(body.buyoutPriceEth);
      const durationHours = Number(body.durationHours);
      if (!Number.isFinite(startingBidEth) || startingBidEth <= 0) {
        return NextResponse.json({ error: "startingBidEth must be > 0" }, { status: 400 });
      }
      if (!Number.isFinite(durationHours) || durationHours <= 0) {
        return NextResponse.json({ error: "durationHours must be > 0" }, { status: 400 });
      }
      const finalBuyout = Number.isFinite(buyoutPriceEth) && buyoutPriceEth > 0 ? buyoutPriceEth : null;

      const item = await readItem();
      if (!item) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
      if (String(item.ownerId || "").toLowerCase() !== wallet) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      const endAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000);
      await db.collection("items").updateOne(
        { contractAddress, tokenId },
        {
          $set: {
            status: "auction",
            priceEth: 0,
            auction: {
              startingBidEth,
              buyoutPriceEth: finalBuyout,
              endAt,
              highestBid: null,
              createdAt: now,
            },
            updatedAt: now,
          },
        }
      );

      return NextResponse.json({ success: true, txHash });
    }

    if (action === "bid") {
      const amountEth = Number(body.amountEth);
      if (!Number.isFinite(amountEth) || amountEth <= 0) return NextResponse.json({ error: "amountEth must be > 0" }, { status: 400 });

      const item = await readItem();
      if (!item) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
      if (String(item.status || "") !== "auction") return NextResponse.json({ error: "Not an auction" }, { status: 400 });
      if (!item.auction?.endAt || new Date(item.auction.endAt) <= now) return NextResponse.json({ error: "Auction ended" }, { status: 400 });
      if (String(item.ownerId || "").toLowerCase() === wallet) return NextResponse.json({ error: "Cannot bid on your own asset" }, { status: 400 });

      const min = Number(item.auction?.startingBidEth || 0);
      const current = Number(item.auction?.highestBid?.amountEth || 0);
      const floor = Math.max(min, current);
      if (amountEth <= floor) return NextResponse.json({ error: `Bid must be greater than ${floor}` }, { status: 400 });

      const bidderDoc = await db.collection("users").findOne({ walletAddress: wallet });
      const bidderBalance = Number(bidderDoc?.virtualBalance || 0);
      if (bidderBalance < amountEth) return NextResponse.json({ error: "Insufficient virtual balance" }, { status: 400 });

      const updateRes = await db.collection("items").updateOne(
        {
          contractAddress,
          tokenId,
          status: "auction",
          "auction.endAt": { $gt: now },
          $or: [
            { "auction.highestBid.amountEth": { $lt: amountEth } },
            { "auction.highestBid": null },
            { "auction.highestBid": { $exists: false } },
          ],
        },
        {
          $set: {
            "auction.highestBid": { bidder: wallet, amountEth, createdAt: now },
            updatedAt: now,
          },
        }
      );
      if (updateRes.modifiedCount !== 1) return NextResponse.json({ error: "Bid rejected" }, { status: 409 });

      await db.collection("auctionBids").insertOne({ contractAddress, tokenId, bidder: wallet, amountEth, createdAt: now, txHash });

      return NextResponse.json({ success: true, txHash });
    }

    if (action === "close_auction") {
      const mongoSession = await db.client.startSession();
      let result = null;
      await mongoSession.withTransaction(async () => {
        const item = await readItem(mongoSession);
        if (!item) throw new Error("Asset not found");
        if (String(item.status || "") !== "auction") throw new Error("Not an auction");

        const endAt = item.auction?.endAt ? new Date(item.auction.endAt) : null;
        const highestBid = item.auction?.highestBid || null;
        const ownerId = String(item.ownerId || "").toLowerCase();
        const isOwner = ownerId === wallet;

        if (!highestBid) throw new Error("No bids");
        if (!isOwner && String(highestBid.bidder || "").toLowerCase() !== wallet) throw new Error("Forbidden");
        if (!endAt || endAt > now) throw new Error("Auction not ended");

        const winner = String(highestBid.bidder || "").toLowerCase();
        const amountEth = Number(highestBid.amountEth || 0);
        if (!winner || !Number.isFinite(amountEth) || amountEth <= 0) throw new Error("Invalid winning bid");

        const buyerDoc = await db.collection("users").findOne({ walletAddress: winner }, { session: mongoSession });
        const sellerDoc = await db.collection("users").findOne({ walletAddress: ownerId }, { session: mongoSession });
        const buyerBalanceBefore = Number(buyerDoc?.virtualBalance || 0);
        const sellerBalanceBefore = Number(sellerDoc?.virtualBalance || 0);
        if (buyerBalanceBefore < amountEth) throw new Error("Insufficient virtual balance");

        await updateUserBalances([{ userId: winner, virtualBalance: -amountEth, totalSpent: amountEth }], mongoSession);
        await updateUserBalances([{ userId: ownerId, virtualBalance: amountEth, totalEarned: amountEth }], mongoSession);
        await updatePlatformWalletBalance({ userBalances: 0 }, mongoSession);

        await db.collection("items").updateOne(
          { contractAddress, tokenId },
          { $set: { ownerId: winner, status: "owned", priceEth: 0, updatedAt: now }, $unset: { auction: "" } },
          { session: mongoSession }
        );

        await createWalletTransaction(
          {
            type: "purchase",
            userId: winner,
            amount: amountEth,
            balanceBefore: buyerBalanceBefore,
            balanceAfter: buyerBalanceBefore - amountEth,
            status: "completed",
            txHash,
            description: `Purchased ${item.name || `NFT #${tokenId}`} (auction)`,
            createdAt: now,
            completedAt: now,
          },
          mongoSession
        );
        await createWalletTransaction(
          {
            type: "sale",
            userId: ownerId,
            amount: amountEth,
            balanceBefore: sellerBalanceBefore,
            balanceAfter: sellerBalanceBefore + amountEth,
            status: "completed",
            txHash,
            description: `Sold ${item.name || `NFT #${tokenId}`} (auction)`,
            createdAt: now,
            completedAt: now,
          },
          mongoSession
        );

        result = { success: true, txHash };
      });
      return NextResponse.json(result || { success: true, txHash });
    }

    if (action === "buy") {
      const mongoSession = await db.client.startSession();
      let result = null;
      await mongoSession.withTransaction(async () => {
        const item = await readItem(mongoSession);
        if (!item) throw new Error("Asset not found");
        if (String(item.status || "") !== "listed") throw new Error("Not listed");

        const seller = String(item.ownerId || "").toLowerCase();
        if (!seller) throw new Error("Seller not found");
        if (seller === wallet) throw new Error("Cannot buy your own asset");

        const priceEth = Number(item.priceEth || 0);
        if (!Number.isFinite(priceEth) || priceEth <= 0) throw new Error("Invalid listing price");

        const buyerDoc = await db.collection("users").findOne({ walletAddress: wallet }, { session: mongoSession });
        const sellerDoc = await db.collection("users").findOne({ walletAddress: seller }, { session: mongoSession });
        const buyerBalanceBefore = Number(buyerDoc?.virtualBalance || 0);
        const sellerBalanceBefore = Number(sellerDoc?.virtualBalance || 0);
        if (buyerBalanceBefore < priceEth) throw new Error("Insufficient virtual balance");

        await updateUserBalances([{ userId: wallet, virtualBalance: -priceEth, totalSpent: priceEth }], mongoSession);
        await updateUserBalances([{ userId: seller, virtualBalance: priceEth, totalEarned: priceEth }], mongoSession);
        await updatePlatformWalletBalance({ userBalances: 0 }, mongoSession);

        await db.collection("items").updateOne(
          { contractAddress, tokenId },
          { $set: { ownerId: wallet, status: "owned", priceEth: 0, updatedAt: now }, $unset: { auction: "" } },
          { session: mongoSession }
        );

        await createWalletTransaction(
          {
            type: "purchase",
            userId: wallet,
            amount: priceEth,
            balanceBefore: buyerBalanceBefore,
            balanceAfter: buyerBalanceBefore - priceEth,
            status: "completed",
            txHash,
            description: `Purchased ${item.name || `NFT #${tokenId}`}`,
            createdAt: now,
            completedAt: now,
          },
          mongoSession
        );
        await createWalletTransaction(
          {
            type: "sale",
            userId: seller,
            amount: priceEth,
            balanceBefore: sellerBalanceBefore,
            balanceAfter: sellerBalanceBefore + priceEth,
            status: "completed",
            txHash,
            description: `Sold ${item.name || `NFT #${tokenId}`}`,
            createdAt: now,
            completedAt: now,
          },
          mongoSession
        );

        result = { success: true, txHash };
      });
      return NextResponse.json(result || { success: true, txHash });
    }

    if (action === "make_offer") {
      const amountEth = Number(body.amountEth);
      const expiresHours = Number(body.expiresHours || 24);
      if (!Number.isFinite(amountEth) || amountEth <= 0) return NextResponse.json({ error: "amountEth must be > 0" }, { status: 400 });
      if (!Number.isFinite(expiresHours) || expiresHours <= 0) return NextResponse.json({ error: "expiresHours must be > 0" }, { status: 400 });

      const item = await readItem();
      if (!item) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
      if (String(item.ownerId || "").toLowerCase() === wallet) return NextResponse.json({ error: "Cannot offer on your own asset" }, { status: 400 });

      const bidderDoc = await db.collection("users").findOne({ walletAddress: wallet });
      const bidderBalance = Number(bidderDoc?.virtualBalance || 0);
      if (bidderBalance < amountEth) return NextResponse.json({ error: "Insufficient virtual balance" }, { status: 400 });

      const expiresAt = new Date(now.getTime() + expiresHours * 60 * 60 * 1000);
      const res = await db.collection("offers").insertOne({
        contractAddress,
        tokenId,
        bidder: wallet,
        amountEth,
        status: "active",
        createdAt: now,
        expiresAt,
        txHash,
      });

      return NextResponse.json({ success: true, txHash, offerId: res.insertedId.toString() });
    }

    if (action === "accept_offer") {
      const offerId = typeof body.offerId === "string" ? body.offerId.trim() : "";
      if (!offerId) return NextResponse.json({ error: "offerId is required" }, { status: 400 });

      const { ObjectId } = await import("mongodb");
      const offerObjectId = new ObjectId(offerId);

      const mongoSession = await db.client.startSession();
      let result = null;
      await mongoSession.withTransaction(async () => {
        const item = await readItem(mongoSession);
        if (!item) throw new Error("Asset not found");

        const ownerId = String(item.ownerId || "").toLowerCase();
        if (ownerId !== wallet) throw new Error("Forbidden");

        const offer = await db.collection("offers").findOne({ _id: offerObjectId }, { session: mongoSession });
        if (!offer) throw new Error("Offer not found");
        if (offer.status !== "active") throw new Error("Offer not active");
        if (offer.contractAddress !== contractAddress || String(offer.tokenId) !== String(tokenId)) throw new Error("Offer mismatch");
        if (offer.expiresAt && new Date(offer.expiresAt) <= now) throw new Error("Offer expired");

        const buyer = String(offer.bidder || "").toLowerCase();
        const amountEth = Number(offer.amountEth || 0);
        if (!buyer || !Number.isFinite(amountEth) || amountEth <= 0) throw new Error("Invalid offer");

        const buyerDoc = await db.collection("users").findOne({ walletAddress: buyer }, { session: mongoSession });
        const sellerDoc = await db.collection("users").findOne({ walletAddress: ownerId }, { session: mongoSession });
        const buyerBalanceBefore = Number(buyerDoc?.virtualBalance || 0);
        const sellerBalanceBefore = Number(sellerDoc?.virtualBalance || 0);
        if (buyerBalanceBefore < amountEth) throw new Error("Insufficient virtual balance");

        await updateUserBalances([{ userId: buyer, virtualBalance: -amountEth, totalSpent: amountEth }], mongoSession);
        await updateUserBalances([{ userId: ownerId, virtualBalance: amountEth, totalEarned: amountEth }], mongoSession);

        await db.collection("items").updateOne(
          { contractAddress, tokenId },
          { $set: { ownerId: buyer, status: "owned", priceEth: 0, updatedAt: now }, $unset: { auction: "" } },
          { session: mongoSession }
        );

        await db.collection("offers").updateOne({ _id: offerObjectId }, { $set: { status: "accepted", updatedAt: now, acceptTxHash: txHash } }, { session: mongoSession });
        await db
          .collection("offers")
          .updateMany(
            { contractAddress, tokenId, status: "active", _id: { $ne: offerObjectId } },
            { $set: { status: "cancelled", updatedAt: now } },
            { session: mongoSession }
          );

        await createWalletTransaction(
          {
            type: "purchase",
            userId: buyer,
            amount: amountEth,
            balanceBefore: buyerBalanceBefore,
            balanceAfter: buyerBalanceBefore - amountEth,
            status: "completed",
            txHash,
            description: `Purchased ${item.name || `NFT #${tokenId}`} (offer)`,
            createdAt: now,
            completedAt: now,
          },
          mongoSession
        );
        await createWalletTransaction(
          {
            type: "sale",
            userId: ownerId,
            amount: amountEth,
            balanceBefore: sellerBalanceBefore,
            balanceAfter: sellerBalanceBefore + amountEth,
            status: "completed",
            txHash,
            description: `Sold ${item.name || `NFT #${tokenId}`} (offer)`,
            createdAt: now,
            completedAt: now,
          },
          mongoSession
        );

        result = { success: true, txHash };
      });

      return NextResponse.json(result || { success: true, txHash });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
