import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { ObjectId } from "mongodb";
import { isAdminSession } from "../../../../../lib/admin";
import { ethers } from "ethers";
import { getDb, updatePlatformWalletBalance, createWalletTransaction } from "../../../../../lib/db";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdminSession(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const userId = body.userId || null;
    const amountRaw = body.amount;
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    const mode = typeof body.mode === "string" ? body.mode.trim().toLowerCase() : "delta";

    const amount = typeof amountRaw === "string" ? parseFloat(amountRaw) : amountRaw;
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    if (!Number.isFinite(amount)) {
      return NextResponse.json({ error: "amount must be a number" }, { status: 400 });
    }
    if (mode !== "set" && mode !== "delta") {
      return NextResponse.json({ error: "mode must be 'set' or 'delta'" }, { status: 400 });
    }
    if (mode === "delta" && amount === 0) {
      return NextResponse.json({ error: "amount must be a non-zero number" }, { status: 400 });
    }

    const db = await getDb();
    const identifier = String(userId || "").trim();
    let userQuery = null;
    try {
      userQuery = { _id: new ObjectId(identifier) };
    } catch {
      if (ethers.utils.isAddress(identifier)) {
        userQuery = { walletAddress: identifier.toLowerCase() };
      } else if (identifier.includes("@")) {
        userQuery = { email: new RegExp(`^${identifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") };
      } else {
        return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
      }
    }

    const before = await db.collection("users").findOne(userQuery);
    if (!before) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const balanceBefore = before.virtualBalance || 0;
    const now = new Date();
    const targetBalance = mode === "set" ? amount : null;
    const delta = mode === "set" ? Number(targetBalance) - Number(balanceBefore) : amount;

    const update =
      mode === "set"
        ? { $set: { virtualBalance: Number(targetBalance), updatedAt: now } }
        : { $inc: { virtualBalance: amount }, $set: { updatedAt: now } };

    const updateResult = await db.collection("users").findOneAndUpdate(userQuery, update, { returnDocument: "after" });
    const after = updateResult?.value || null;
    if (!after) {
      return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }

    const balanceAfter = after.virtualBalance || 0;

    if (delta !== 0) {
      await updatePlatformWalletBalance({ userBalances: delta });
    }

    if (after.walletAddress) {
      const type = delta > 0 ? "admin_credit" : "admin_debit";
      const magnitude = Math.abs(delta);
      const base =
        mode === "set"
          ? `Admin set balance: ${Number(balanceAfter)} ETH (${delta > 0 ? "+" : ""}${Number(delta)} ETH)`
          : `Admin adjustment: ${delta > 0 ? "+" : "-"}${magnitude} ETH`;
      const description = reason ? `${base} (${reason})` : base;

      await createWalletTransaction({
        type,
        userId: after.walletAddress,
        amount: magnitude,
        balanceBefore,
        balanceAfter,
        status: "completed",
        description,
        createdAt: now,
        completedAt: now,
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: after._id.toString(),
        email: after.email || null,
        name: after.name || null,
        walletAddress: after.walletAddress || null,
        virtualBalance: after.virtualBalance || 0,
      },
      mode,
      delta,
      balanceBefore,
      balanceAfter,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to adjust balance" },
      { status: 500 }
    );
  }
}
