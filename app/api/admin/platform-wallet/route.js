import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { ethers } from "ethers";
import { authOptions } from "../../auth/[...nextauth]/route";
import { isAdminSession } from "../../../../lib/admin";
import { getDb, getOrCreatePlatformWallet } from "../../../../lib/db";

function normalizeWalletAddress(input) {
  return typeof input === "string" ? input.trim().toLowerCase() : "";
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdminSession(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const platformWallet = await getOrCreatePlatformWallet();

    return NextResponse.json({
      address: platformWallet.address,
      chainId: platformWallet.chainId || 1,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch platform wallet" },
      { status: 500 }
    );
  }
}

export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdminSession(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const nextAddressRaw = body?.platformWalletAddress;
    const nextAddress = normalizeWalletAddress(nextAddressRaw);
    if (!nextAddress) {
      return NextResponse.json({ error: "platformWalletAddress is required" }, { status: 400 });
    }
    if (!ethers.utils.isAddress(nextAddress)) {
      return NextResponse.json({ error: "Invalid Ethereum address" }, { status: 400 });
    }

    const db = await getDb();
    const now = new Date();

    const configCol = db.collection("platformConfig");
    const existingConfig = await configCol.findOne({ _id: "platform" });

    const previousAddressRaw = existingConfig?.platformWalletAddress || process.env.PLATFORM_WALLET_ADDRESS || "";
    const previousAddress = normalizeWalletAddress(previousAddressRaw);
    if (!previousAddress) {
      return NextResponse.json({ error: "PLATFORM_WALLET_ADDRESS is required" }, { status: 500 });
    }

    if (previousAddress !== nextAddress) {
      const oldDoc = await db.collection("platformWallet").findOne({ address: previousAddress });
      const newDoc = await db.collection("platformWallet").findOne({ address: nextAddress });

      if (!newDoc) {
        if (oldDoc) {
          const {
            _id,
            address,
            createdAt,
            updatedAt,
            lastReconciled,
            lastLimitReset,
            lastAlertSent,
            ...rest
          } = oldDoc;
          await db.collection("platformWallet").insertOne({
            ...rest,
            address: nextAddress,
            createdAt: createdAt || now,
            updatedAt: now,
            lastReconciled: lastReconciled || now,
            lastLimitReset: lastLimitReset || now,
            lastAlertSent: lastAlertSent || null,
          });
        } else {
          await db.collection("platformWallet").insertOne({
            address: nextAddress,
            chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "1", 10),
            totalBalance: 0,
            userBalances: 0,
            platformRevenue: 0,
            reservedForWithdrawals: 0,
            lastReconciled: now,
            discrepancy: 0,
            dailyWithdrawalLimit: parseFloat(process.env.DAILY_WITHDRAWAL_LIMIT || "50"),
            dailyWithdrawalUsed: 0,
            lastLimitReset: now,
            minimumBalance: parseFloat(process.env.MINIMUM_PLATFORM_BALANCE || "10"),
            alertEmail: process.env.ADMIN_EMAIL || null,
            lastAlertSent: null,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }

    await configCol.updateOne(
      { _id: "platform" },
      { $set: { platformWalletAddress: nextAddress, updatedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true }
    );

    const platformWallet = await getOrCreatePlatformWallet();
    return NextResponse.json({
      success: true,
      previousAddress,
      address: platformWallet.address,
      chainId: platformWallet.chainId || 1,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to update platform wallet address" },
      { status: 500 }
    );
  }
}

