import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { getUserByWallet, createWalletTransaction, getDb, getOrCreatePlatformWallet } from "../../../../lib/db";

// Verify webhook secret (optional but recommended)
function verifyWebhookSecret(req) {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return true; // Skip if not configured
  
  const providedSecret = req.headers.get("x-webhook-secret");
  return providedSecret === secret;
}

async function verifyDeposit(txHash, platformWalletAddress) {
  const rpcUrl = process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL;
  if (!rpcUrl) throw new Error("RPC_URL is required for deposit verification");

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  
  // Get transaction
  const tx = await provider.getTransaction(txHash);
  if (!tx) throw new Error("Transaction not found");

  // Verify recipient is platform wallet
  if (tx.to?.toLowerCase() !== platformWalletAddress.toLowerCase()) {
    throw new Error("Invalid recipient address");
  }

  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) throw new Error("Transaction not mined yet");
  if (receipt.status !== 1) throw new Error("Transaction failed on blockchain");

  // Get amount
  const amountETH = parseFloat(ethers.utils.formatEther(tx.value));

  return {
    verified: true,
    amount: amountETH,
    from: tx.from.toLowerCase(),
    blockNumber: receipt.blockNumber,
    confirmations: receipt.confirmations ?? null,
    gasUsed: receipt.gasUsed.toString(),
  };
}

export async function POST(req) {
  try {
    // Verify webhook secret
    if (!verifyWebhookSecret(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { txHash } = body;

    if (!txHash) {
      return NextResponse.json({ error: "txHash is required" }, { status: 400 });
    }

    const platformWallet = await getOrCreatePlatformWallet();
    const platformAddress = platformWallet.address.toLowerCase();

    // Verify the deposit on blockchain
    let verification;
    try {
      verification = await verifyDeposit(txHash, platformAddress);
    } catch (error) {
      console.error("Deposit verification failed:", error);
      return NextResponse.json(
        { error: `Verification failed: ${error.message}` },
        { status: 400 }
      );
    }

    // Check for duplicate processing
    const db = await getDb();
    const existing = await db.collection("walletTransactions").findOne({ txHash });
    if (existing) {
      return NextResponse.json({
        success: true,
        message: "Deposit already processed",
        transactionId: existing._id.toString(),
      });
    }

    // Find user by wallet address
    const user = await getUserByWallet(verification.from);
    if (!user) {
      return NextResponse.json(
        { error: "User not found for deposit address" },
        { status: 404 }
      );
    }

    // Create transaction record
    const transaction = await createWalletTransaction({
      type: "deposit",
      userId: user.walletAddress,
      amount: verification.amount,
      balanceBefore: user.virtualBalance || 0,
      balanceAfter: user.virtualBalance || 0,
      txHash,
      status: "pending",
      blockNumber: verification.blockNumber,
      confirmations: verification.confirmations,
      gasUsed: verification.gasUsed,
      description: `Deposit pending admin approval: ${verification.amount} ETH`,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      transactionId: transaction._id.toString(),
      userId: user.walletAddress,
      amount: verification.amount,
      status: transaction.status,
    });
  } catch (error) {
    console.error("Error processing deposit:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process deposit" },
      { status: 500 }
    );
  }
}
