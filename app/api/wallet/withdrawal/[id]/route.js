import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { ObjectId } from "mongodb";
import { getUserById, getWithdrawalRequest } from "../../../../../lib/db";

export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "Withdrawal ID is required" }, { status: 400 });
    }

    const withdrawal = await getWithdrawalRequest(id);
    if (!withdrawal) {
      return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
    }

    const user = await getUserById(session.user.id);
    if (!user || withdrawal.userId.toLowerCase() !== user.walletAddress?.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json({
      id: withdrawal._id.toString(),
      status: withdrawal.status,
      amount: withdrawal.amount,
      destinationAddress: withdrawal.destinationAddress,
      txHash: withdrawal.txHash,
      blockNumber: withdrawal.blockNumber,
      confirmations: withdrawal.confirmations,
      gasCost: withdrawal.gasCost,
      requestedAt: withdrawal.requestedAt,
      completedAt: withdrawal.completedAt,
      failureReason: withdrawal.failureReason,
    });
  } catch (error) {
    console.error("Error fetching withdrawal:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch withdrawal" },
      { status: 500 }
    );
  }
}
