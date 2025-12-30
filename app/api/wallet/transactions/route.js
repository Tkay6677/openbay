import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getUserById, getUserWalletTransactions } from "../../../../lib/db";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);
    const type = url.searchParams.get("type") || "all";

    const result = await getUserWalletTransactions(session.user.id, { page, limit, type });

    // Format transactions for response
    const formattedTransactions = result.transactions.map((tx) => ({
      id: tx._id.toString(),
      type: tx.type,
      amount: tx.amount,
      counterparty: tx.counterpartyId,
      platformFee: tx.platformFee,
      royaltyFee: tx.royaltyFee,
      netAmount: tx.netAmount,
      balanceBefore: tx.balanceBefore,
      balanceAfter: tx.balanceAfter,
      itemId: tx.itemId?.toString(),
      txHash: tx.txHash,
      status: tx.status,
      description: tx.description,
      createdAt: tx.createdAt,
    }));

    return NextResponse.json({
      transactions: formattedTransactions,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
