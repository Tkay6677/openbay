import { NextResponse } from "next/server";
import { getUserByWallet, getDb } from "../../../../../lib/db";

export async function GET(req, { params }) {
  try {
    const { walletAddress } = params;
    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address is required" }, { status: 400 });
    }

    const user = await getUserByWallet(walletAddress);
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
      profileImage: user.profileImage || null,
      bio: user.bio || null,
      stats: {
        itemsCreated,
        itemsOwned,
        totalSales,
        totalVolume: totalVolume[0]?.total || 0,
        followers: 0, // TODO: Implement followers system
        following: 0, // TODO: Implement following system
      },
      createdAt: user.createdAt,
      // virtualBalance NOT included for other users
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
