import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { ethers } from "ethers";
import { ObjectId } from "mongodb";
import { authOptions } from "../../auth/[...nextauth]/route";
import { createWalletTransaction, getDb, getOrCreatePlatformWallet, getUserById, initializeUserVirtualBalance } from "../../../../lib/db";

function getRpcUrl() {
  const rpcUrl = process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || null;
  if (!rpcUrl) return null;
  if (rpcUrl.includes("your-rpc-endpoint")) return null;
  return rpcUrl;
}

async function verifyDeposit({ txHash, platformWalletAddress }) {
  const rpcUrl = getRpcUrl();
  if (!rpcUrl) throw new Error("RPC_URL is required for deposit verification");

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const tx = await provider.getTransaction(txHash);
  if (!tx) throw new Error("Transaction not found");

  if (tx.to?.toLowerCase() !== platformWalletAddress.toLowerCase()) {
    throw new Error("Invalid recipient address");
  }

  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) throw new Error("Transaction not mined yet");
  if (receipt.status !== 1) throw new Error("Transaction failed on blockchain");

  const amountETH = parseFloat(ethers.utils.formatEther(tx.value));
  if (!Number.isFinite(amountETH) || amountETH <= 0) throw new Error("Invalid deposit amount");

  const currentBlock = await provider.getBlockNumber();
  const confirmations =
    typeof receipt.blockNumber === "number"
      ? Math.max(0, currentBlock - receipt.blockNumber + 1)
      : null;

  return {
    from: tx.from?.toLowerCase?.() || null,
    amount: amountETH,
    blockNumber: receipt.blockNumber,
    confirmations,
    gasUsed: receipt.gasUsed?.toString?.() || null,
  };
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const txHashRaw = typeof body?.txHash === "string" ? body.txHash.trim() : "";
    const txHash = txHashRaw ? txHashRaw.toLowerCase() : "";
    if (!txHash) {
      return NextResponse.json({ error: "txHash is required" }, { status: 400 });
    }

    const db = await getDb();
    const existingTx = await db.collection("walletTransactions").findOne({
      txHash: { $in: [txHashRaw, txHash] },
    });
    if (existingTx) {
      if (existingTx.type !== "deposit") {
        return NextResponse.json({ error: "Transaction hash already used" }, { status: 409 });
      }
      return NextResponse.json({
        success: true,
        transactionId: existingTx._id.toString(),
        status: existingTx.status || null,
        amount: existingTx.amount,
        txHash: existingTx.txHash || txHash,
      });
    }

    const platformWallet = await getOrCreatePlatformWallet();
    const verification = await verifyDeposit({
      txHash,
      platformWalletAddress: platformWallet.address,
    });

    if (!verification.from) {
      return NextResponse.json({ error: "Invalid sender address" }, { status: 400 });
    }

    const user = await getUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.virtualBalance === undefined) {
      await initializeUserVirtualBalance(session.user.id);
    }

    const existingWallet = user.walletAddress?.toLowerCase?.() || null;
    if (existingWallet && existingWallet !== verification.from) {
      return NextResponse.json(
        { error: "Deposit must come from your linked wallet address" },
        { status: 403 }
      );
    }

    if (!existingWallet) {
      try {
        await db.collection("users").updateOne(
          { _id: typeof session.user.id === "string" ? new ObjectId(session.user.id) : session.user.id },
          { $set: { walletAddress: verification.from, updatedAt: new Date() } }
        );
      } catch (e) {
        if (e?.code === 11000) {
          return NextResponse.json(
            { error: "This wallet address is already linked to another user" },
            { status: 409 }
          );
        }
        throw e;
      }
    }

    const currentUser = await getUserById(session.user.id);
    const balanceBefore = currentUser?.virtualBalance || 0;

    const tx = await createWalletTransaction({
      type: "deposit",
      userId: verification.from,
      amount: verification.amount,
      balanceBefore,
      balanceAfter: balanceBefore,
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
      transactionId: tx._id.toString(),
      status: tx.status,
      amount: tx.amount,
      txHash: tx.txHash,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to submit deposit" },
      { status: 500 }
    );
  }
}
