import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { isAdminSession } from "../../../../lib/admin";
import { ObjectId } from "mongodb";
import { ethers } from "ethers";
import { getDb, getOrCreatePlatformWallet, getUserByWallet, updatePlatformWalletBalance, updateUserBalances } from "../../../../lib/db";

function escapeRegex(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getRpcUrl() {
  const rpcUrl = process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || null;
  if (!rpcUrl) return null;
  if (rpcUrl.includes("your-rpc-endpoint")) return null;
  return rpcUrl;
}

async function verifyDepositOnChain({ txHash, platformWalletAddress }) {
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
  const requiredConfirmations = Math.max(
    0,
    parseInt(process.env.DEPOSIT_CONFIRMATIONS || "12", 10)
  );
  if (requiredConfirmations > 0 && (confirmations ?? 0) < requiredConfirmations) {
    throw new Error(
      `Transaction needs more confirmations. Current: ${confirmations ?? 0}, Required: ${requiredConfirmations}`
    );
  }

  return {
    from: tx.from?.toLowerCase?.() || null,
    amount: amountETH,
    blockNumber: receipt.blockNumber,
    confirmations,
    gasUsed: receipt.gasUsed?.toString?.() || null,
  };
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdminSession(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const type = (url.searchParams.get("type") || "").trim();
    const status = (url.searchParams.get("status") || "").trim();
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "25", 10)));
    const skip = (page - 1) * limit;

    const query = {};
    if (type && type !== "all") query.type = type;
    if (status && status !== "all") query.status = status;
    if (q) {
      const regex = new RegExp(escapeRegex(q), "i");
      query.$or = [{ userId: regex }, { txHash: regex }, { counterpartyId: regex }, { description: regex }];
    }

    const db = await getDb();
    const [transactions, total] = await Promise.all([
      db
        .collection("walletTransactions")
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("walletTransactions").countDocuments(query),
    ]);

    return NextResponse.json({
      transactions: transactions.map((tx) => ({
        id: tx._id.toString(),
        type: tx.type,
        userId: tx.userId,
        counterpartyId: tx.counterpartyId || null,
        amount: tx.amount,
        platformFee: tx.platformFee || 0,
        royaltyFee: tx.royaltyFee || 0,
        netAmount: tx.netAmount ?? tx.amount,
        balanceBefore: tx.balanceBefore,
        balanceAfter: tx.balanceAfter,
        itemId: tx.itemId?.toString?.() || null,
        txHash: tx.txHash || null,
        status: tx.status || null,
        description: tx.description || null,
        createdAt: tx.createdAt || null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch transactions" },
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
    if (!isAdminSession(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const transactionId = typeof body?.transactionId === "string" ? body.transactionId.trim() : "";
    if (!transactionId) {
      return NextResponse.json({ error: "transactionId is required" }, { status: 400 });
    }

    const db = await getDb();
    const _id = new ObjectId(transactionId);

    const existing = await db.collection("walletTransactions").findOne({ _id });
    if (!existing) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }
    if (existing.type !== "deposit") {
      return NextResponse.json({ error: "Only deposit transactions can be approved" }, { status: 400 });
    }
    if (existing.status === "completed") {
      return NextResponse.json({ success: true, status: "completed" });
    }
    if (existing.status !== "pending") {
      return NextResponse.json({ error: `Cannot approve deposit in status: ${existing.status}` }, { status: 409 });
    }

    const locked = await db.collection("walletTransactions").findOneAndUpdate(
      { _id, status: "pending" },
      { $set: { status: "processing", updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    const txDoc = locked?.value;
    if (!txDoc) {
      return NextResponse.json({ error: "Deposit is no longer pending" }, { status: 409 });
    }

    if (!txDoc.txHash) {
      await db.collection("walletTransactions").updateOne(
        { _id },
        { $set: { status: "failed", failedAt: new Date(), errorMessage: "Missing txHash", updatedAt: new Date() } }
      );
      return NextResponse.json({ error: "Deposit is missing txHash" }, { status: 400 });
    }

    const normalizedTxHash = txDoc.txHash.toLowerCase();
    const duplicateCompleted = await db.collection("walletTransactions").findOne({
      _id: { $ne: _id },
      type: "deposit",
      status: "completed",
      txHash: { $in: [txDoc.txHash, normalizedTxHash] },
    });
    if (duplicateCompleted) {
      await db.collection("walletTransactions").updateOne(
        { _id },
        { $set: { status: "failed", failedAt: new Date(), errorMessage: "Duplicate txHash", updatedAt: new Date() } }
      );
      return NextResponse.json({ error: "Deposit txHash already approved" }, { status: 409 });
    }

    const platformWallet = await getOrCreatePlatformWallet();
    const verification = await verifyDepositOnChain({
      txHash: normalizedTxHash,
      platformWalletAddress: platformWallet.address,
    });

    const userWallet = txDoc.userId?.toLowerCase?.() || null;
    if (!userWallet || verification.from !== userWallet) {
      await db.collection("walletTransactions").updateOne(
        { _id },
        { $set: { status: "failed", failedAt: new Date(), errorMessage: "Sender mismatch", updatedAt: new Date() } }
      );
      return NextResponse.json({ error: "Deposit sender mismatch" }, { status: 400 });
    }

    const user = await getUserByWallet(userWallet);
    if (!user) {
      await db.collection("walletTransactions").updateOne(
        { _id },
        { $set: { status: "failed", failedAt: new Date(), errorMessage: "User not found", updatedAt: new Date() } }
      );
      return NextResponse.json({ error: "User not found for this deposit" }, { status: 404 });
    }

    const amount = txDoc.amount ?? verification.amount;
    const balanceBefore = user.virtualBalance || 0;
    const balanceAfter = balanceBefore + amount;

    await updateUserBalances([
      {
        userId: userWallet,
        virtualBalance: amount,
        totalDeposited: amount,
      },
    ]);

    await updatePlatformWalletBalance({
      totalBalance: amount,
      userBalances: amount,
    });

    await db.collection("walletTransactions").updateOne(
      { _id },
      {
        $set: {
          status: "completed",
          balanceBefore,
          balanceAfter,
          blockNumber: txDoc.blockNumber ?? verification.blockNumber,
          confirmations: txDoc.confirmations ?? verification.confirmations,
          gasUsed: txDoc.gasUsed ?? verification.gasUsed,
          txHash: normalizedTxHash,
          completedAt: new Date(),
          updatedAt: new Date(),
          description: `Deposited ${amount} ETH`,
        },
        $unset: { errorMessage: "" },
      }
    );

    return NextResponse.json({ success: true, status: "completed", balanceAfter });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to approve deposit" },
      { status: 500 }
    );
  }
}
