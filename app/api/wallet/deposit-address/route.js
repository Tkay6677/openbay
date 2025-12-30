import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getOrCreatePlatformWallet } from "../../../../lib/db";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const platformWallet = await getOrCreatePlatformWallet();

    return NextResponse.json({
      address: platformWallet.address,
      chainId: platformWallet.chainId || 1,
      minDeposit: 0.01,
      notice: "Send ETH to this address. Your balance will update after 12 confirmations (~3 minutes).",
    });
  } catch (error) {
    console.error("Error fetching deposit address:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch deposit address" },
      { status: 500 }
    );
  }
}
