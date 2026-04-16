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
    const minDeposit = 0.01;

    return NextResponse.json({
      address: platformWallet.address,
      chainId: platformWallet.chainId || 1,
      minDeposit,
      notice: "Send ETH to this address. Your balance will update after 12 confirmations (~3 minutes).",
      methods: [
        {
          id: "wallet_send",
          label: "Wallet transfer",
          description: "Send ETH from your connected wallet in this app.",
          requiresSigner: true,
          requiresTxHash: false,
          requiresProof: false,
          minDeposit,
        },
        {
          id: "tx_hash",
          label: "Submit transaction hash",
          description: "Already sent ETH externally? Submit your tx hash for verification.",
          requiresSigner: false,
          requiresTxHash: true,
          requiresProof: false,
          minDeposit,
        },
        {
          id: "direct_proof",
          label: "Direct deposit proof",
          description: "Upload evidence for a manual/direct transfer and wait for admin review.",
          requiresSigner: false,
          requiresTxHash: false,
          requiresProof: false,
          minDeposit,
        },
      ],
    });
  } catch (error) {
    console.error("Error fetching deposit address:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch deposit address" },
      { status: 500 }
    );
  }
}
