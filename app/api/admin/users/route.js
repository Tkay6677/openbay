import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { isAdminSession } from "../../../../lib/admin";
import { getDb } from "../../../../lib/db";

function escapeRegex(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

