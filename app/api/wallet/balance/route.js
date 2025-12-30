import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getUserById, getUserVirtualBalance, getDb } from "../../../../lib/db";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Initialize virtual balance if not exists
    if (user.virtualBalance === undefined) {
      const { initializeUserVirtualBalance } = await import("../../../../lib/db");
      await initializeUserVirtualBalance(session.user.id);
    }

    const balance = await getUserVirtualBalance(session.user.id);
    
    // Get pending withdrawals
    const db = await getDb();
    const pendingWithdrawals = await db.collection("withdrawalRequests").aggregate([
      {
        $match: {
          userId: user.walletAddress?.toLowerCase(),
          status: { $in: ["pending", "processing"] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]).toArray();

    const pendingAmount = pendingWithdrawals[0]?.total || 0;
    const availableToWithdraw = Math.max(0, (balance.virtualBalance || 0) - pendingAmount);

    return NextResponse.json({
      walletAddress: balance.walletAddress,
      virtualBalance: balance.virtualBalance || 0,
      totalDeposited: balance.totalDeposited || 0,
      totalWithdrawn: balance.totalWithdrawn || 0,
      totalEarned: balance.totalEarned || 0,
      totalSpent: balance.totalSpent || 0,
      pendingWithdrawals: pendingAmount,
      availableToWithdraw,
    });
  } catch (error) {
    console.error("Error fetching wallet balance:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch wallet balance" },
      { status: 500 }
    );
  }
}
