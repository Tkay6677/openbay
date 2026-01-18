import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { isAdminSession } from "../../../../lib/admin";
import { getDb } from "../../../../lib/db";

function escapeRegex(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeWalletAddress(input) {
  return typeof input === "string" ? input.trim().toLowerCase() : "";
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
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "25", 10)));
    const skip = (page - 1) * limit;

    const db = await getDb();
    const query = {};
    if (q) {
      const regex = new RegExp(escapeRegex(q), "i");
      query.$or = [{ email: regex }, { name: regex }, { walletAddress: regex }];
    }

    const [users, total] = await Promise.all([
      db
        .collection("users")
        .find(query)
        .project({
          email: 1,
          name: 1,
          provider: 1,
          walletAddress: 1,
          createdAt: 1,
          updatedAt: 1,
          virtualBalance: 1,
          totalDeposited: 1,
          totalWithdrawn: 1,
          totalEarned: 1,
          totalSpent: 1,
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("users").countDocuments(query),
    ]);

    return NextResponse.json({
      users: users.map((u) => ({
        id: u._id.toString(),
        email: u.email || null,
        name: u.name || null,
        provider: u.provider || null,
        walletAddress: u.walletAddress || null,
        createdAt: u.createdAt || null,
        updatedAt: u.updatedAt || null,
        virtualBalance: u.virtualBalance || 0,
        totalDeposited: u.totalDeposited || 0,
        totalWithdrawn: u.totalWithdrawn || 0,
        totalEarned: u.totalEarned || 0,
        totalSpent: u.totalSpent || 0,
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
      { error: error.message || "Failed to fetch users" },
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
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : null;
    const walletAddress = body.walletAddress == null ? null : normalizeWalletAddress(body.walletAddress);

    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
    if (name != null && !name) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    if (walletAddress != null && !walletAddress) return NextResponse.json({ error: "walletAddress cannot be empty" }, { status: 400 });

    const { ObjectId } = await import("mongodb");
    const _id = new ObjectId(userId);

    const update = { updatedAt: new Date() };
    if (name != null) update.name = name;
    if (walletAddress != null) update.walletAddress = walletAddress;

    const db = await getDb();
    await db.collection("users").updateOne({ _id }, { $set: update });
    const user = await db.collection("users").findOne({ _id });

    return NextResponse.json({
      success: true,
      user: user
        ? {
            id: user._id.toString(),
            email: user.email || null,
            name: user.name || null,
            provider: user.provider || null,
            walletAddress: user.walletAddress || null,
            createdAt: user.createdAt || null,
            updatedAt: user.updatedAt || null,
            virtualBalance: user.virtualBalance || 0,
            totalDeposited: user.totalDeposited || 0,
            totalWithdrawn: user.totalWithdrawn || 0,
            totalEarned: user.totalEarned || 0,
            totalSpent: user.totalSpent || 0,
          }
        : null,
    });
  } catch (error) {
    const isDuplicateKey = typeof error?.message === "string" && error.message.includes("E11000");
    return NextResponse.json({ error: isDuplicateKey ? "Duplicate value" : error.message || "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdminSession(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const url = new URL(req.url);
    const id = (url.searchParams.get("id") || "").trim();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const db = await getDb();
    const { ObjectId } = await import("mongodb");
    await db.collection("users").deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to delete user" }, { status: 500 });
  }
}

