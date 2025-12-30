import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { ethers } from "ethers";
import { getUserById, createWithdrawalRequest, getDb, getOrCreatePlatformWallet } from "../../../../lib/db";

function getClientIp(req) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function getUserAgent(req) {
  return req.headers.get("user-agent") || "unknown";
}

async function validateWithdrawal(userId, amount) {
  const db = await getDb();
  const user = await getUserById(userId);
  if (!user) throw new Error("User not found");

  // 1. Check sufficient balance
  const virtualBalance = user.virtualBalance || 0;
  if (virtualBalance < amount) {
    throw new Error(`Insufficient balance. You have ${virtualBalance} ETH but requested ${amount} ETH`);
  }

  // 2. Check minimum withdrawal
  if (amount < 0.01) {
    throw new Error("Minimum withdrawal is 0.01 ETH");
  }

  // 3. Check daily limit per user
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const todayWithdrawals = await db.collection("withdrawalRequests").aggregate([
    {
      $match: {
        userId: user.walletAddress?.toLowerCase(),
        status: { $in: ["completed", "processing"] },
        requestedAt: { $gte: todayStart },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
      },
    },
  ]).toArray();

  const dailyTotal = todayWithdrawals[0]?.total || 0;
  const userDailyLimit = parseFloat(process.env.USER_DAILY_WITHDRAWAL_LIMIT || "10");
  if (dailyTotal + amount > userDailyLimit) {
    throw new Error(`Daily withdrawal limit exceeded. You can withdraw ${userDailyLimit - dailyTotal} ETH today.`);
  }

  // 4. Check platform daily limit
  const platformWallet = await getOrCreatePlatformWallet();
  const platformDailyLimit = platformWallet.dailyWithdrawalLimit || 50;
  const platformDailyUsed = platformWallet.dailyWithdrawalUsed || 0;
  
  if (platformDailyUsed + amount > platformDailyLimit) {
    throw new Error("Platform daily withdrawal limit reached. Try again tomorrow.");
  }

  // 5. Check for suspicious activity
  const oneHourAgo = new Date(Date.now() - 3600000);
  const recentWithdrawals = await db.collection("withdrawalRequests").countDocuments({
    userId: user.walletAddress?.toLowerCase(),
    requestedAt: { $gte: oneHourAgo },
  });

  if (recentWithdrawals >= 3) {
    throw new Error("Too many withdrawal requests. Please wait before requesting another withdrawal.");
  }

  return true;
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const amount = parseFloat(body.amount);
    const destinationAddress = body.destinationAddress?.trim();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const user = await getUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Validate destination address
    let finalDestination = destinationAddress;
    if (!finalDestination) {
      finalDestination = user.walletAddress;
    }

    if (!ethers.utils.isAddress(finalDestination)) {
      return NextResponse.json({ error: "Invalid destination address" }, { status: 400 });
    }

    // Validate withdrawal
    await validateWithdrawal(session.user.id, amount);

    // Create withdrawal request
    const withdrawal = await createWithdrawalRequest({
      userId: session.user.id,
      amount,
      destinationAddress: finalDestination,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    // Estimate gas fee (rough estimate)
    const estimatedGasFee = 0.000525; // ~21,000 gas * 25 gwei
    const estimatedCompletion = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    return NextResponse.json({
      success: true,
      withdrawalId: withdrawal._id.toString(),
      status: withdrawal.status,
      amount: withdrawal.amount,
      destinationAddress: withdrawal.destinationAddress,
      estimatedGasFee,
      estimatedCompletion: estimatedCompletion.toISOString(),
      message: "Your withdrawal will be processed within 5-10 minutes",
    });
  } catch (error) {
    console.error("Error creating withdrawal:", error);
    
    if (error.message.includes("Insufficient balance")) {
      const user = await getUserById(session?.user?.id);
      return NextResponse.json({
        success: false,
        error: "insufficient_balance",
        message: error.message,
        availableBalance: user?.virtualBalance || 0,
      }, { status: 400 });
    }

    return NextResponse.json(
      { success: false, error: error.message || "Failed to create withdrawal request" },
      { status: 400 }
    );
  }
}
