import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { ObjectId } from "mongodb";
import { ethers } from "ethers";
import { getUserById, getUserByWallet, getDb } from "../../../../lib/db";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const walletAddress = url.searchParams.get("walletAddress");

    // If walletAddress provided, get that user's profile (public)
    if (walletAddress) {
      const targetUser = await getUserByWallet(walletAddress);
      if (!targetUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const db = await getDb();
      
      // Get user stats
      const [itemsCreated, itemsOwned, totalSales, totalVolume] = await Promise.all([
        db.collection("items").countDocuments({ creatorId: targetUser.walletAddress?.toLowerCase() }),
        db.collection("items").countDocuments({ ownerId: targetUser.walletAddress?.toLowerCase() }),
        db.collection("walletTransactions").countDocuments({
          userId: targetUser.walletAddress?.toLowerCase(),
          type: "sale",
          status: "completed",
        }),
        db.collection("walletTransactions").aggregate([
          {
            $match: {
              userId: targetUser.walletAddress?.toLowerCase(),
              type: { $in: ["sale", "purchase"] },
              status: "completed",
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$amount" },
            },
          },
        ]).toArray(),
      ]);

      return NextResponse.json({
        walletAddress: targetUser.walletAddress,
        username: targetUser.username || targetUser.name || null,
        profileImage: targetUser.profileImage || null,
        bio: targetUser.bio || null,
        stats: {
          itemsCreated,
          itemsOwned,
          totalSales,
          totalVolume: totalVolume[0]?.total || 0,
          followers: 0, // TODO: Implement followers system
          following: 0, // TODO: Implement following system
        },
        createdAt: targetUser.createdAt,
      });
    }

    // Otherwise, get own profile (includes balance)
    const user = await getUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const db = await getDb();
    
    // Get user stats
    const [itemsCreated, itemsOwned, totalSales, totalVolume] = await Promise.all([
      db.collection("items").countDocuments({ creatorId: user.walletAddress?.toLowerCase() }),
      db.collection("items").countDocuments({ ownerId: user.walletAddress?.toLowerCase() }),
      db.collection("walletTransactions").countDocuments({
        userId: user.walletAddress?.toLowerCase(),
        type: "sale",
        status: "completed",
      }),
      db.collection("walletTransactions").aggregate([
        {
          $match: {
            userId: user.walletAddress?.toLowerCase(),
            type: { $in: ["sale", "purchase"] },
            status: "completed",
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]).toArray(),
    ]);

    return NextResponse.json({
      walletAddress: user.walletAddress,
      username: user.username || user.name || null,
      email: user.email,
      profileImage: user.profileImage || null,
      bio: user.bio || null,
      virtualBalance: user.virtualBalance || 0,
      stats: {
        itemsCreated,
        itemsOwned,
        totalSales,
        totalVolume: totalVolume[0]?.total || 0,
        followers: 0, // TODO: Implement followers system
        following: 0, // TODO: Implement following system
      },
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const updates = {};

    const walletAddress = typeof body.walletAddress === "string" ? body.walletAddress.trim() : null;
    const message = typeof body.message === "string" ? body.message : null;
    const signature = typeof body.signature === "string" ? body.signature : null;

    if (body.username !== undefined) {
      updates.username = body.username?.trim() || null;
    }
    if (body.bio !== undefined) {
      updates.bio = body.bio?.trim() || null;
    }
    if (body.profileImage !== undefined) {
      updates.profileImage = body.profileImage?.trim() || null;
    }

    if (walletAddress) {
      if (!ethers.utils.isAddress(walletAddress)) {
        return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
      }
      if (!message || !signature) {
        return NextResponse.json({ error: "message and signature are required" }, { status: 400 });
      }
      let recovered = null;
      try {
        recovered = ethers.utils.verifyMessage(message, signature);
      } catch {
        recovered = null;
      }
      if (!recovered || recovered.toLowerCase() !== walletAddress.toLowerCase()) {
        return NextResponse.json({ error: "Invalid wallet signature" }, { status: 401 });
      }
      updates.walletAddress = walletAddress.toLowerCase();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const db = await getDb();
    const _id = typeof session.user.id === "string" ? new ObjectId(session.user.id) : session.user.id;

    const existing = await db.collection("users").findOne({ _id });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (updates.walletAddress && existing.walletAddress && existing.walletAddress.toLowerCase() !== updates.walletAddress.toLowerCase()) {
      return NextResponse.json({ error: "This account is already linked to a wallet" }, { status: 409 });
    }

    try {
      await db.collection("users").updateOne(
        { _id },
        {
          $set: {
            ...updates,
            updatedAt: new Date(),
          },
        }
      );
    } catch (e) {
      if (e?.code === 11000) {
        return NextResponse.json({ error: "This wallet is already linked to another user" }, { status: 409 });
      }
      throw e;
    }

    const updatedUser = await db.collection("users").findOne({ _id });

    return NextResponse.json({
      walletAddress: updatedUser.walletAddress,
      username: updatedUser.username || updatedUser.name || null,
      email: updatedUser.email,
      profileImage: updatedUser.profileImage || null,
      bio: updatedUser.bio || null,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update profile" },
      { status: 500 }
    );
  }
}
