import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { isAdminSession } from "../../../../lib/admin";
import { getDb } from "../../../../lib/db";

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
    const status = (url.searchParams.get("status") || "pending").trim();
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "25", 10)));
    const skip = (page - 1) * limit;

    const query = {};
    if (status && status !== "all") query.status = status;

    const db = await getDb();
    const [withdrawals, total] = await Promise.all([
      db
        .collection("withdrawalRequests")
        .find(query)
        .sort({ requestedAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("withdrawalRequests").countDocuments(query),
    ]);

    return NextResponse.json({
      withdrawals: withdrawals.map((w) => ({
        id: w._id.toString(),
        userId: w.userId,
        userEmail: w.userEmail || null,
        amount: w.amount,
        destinationAddress: w.destinationAddress,
        status: w.status,
        requestedAt: w.requestedAt || null,
        processedAt: w.processedAt || null,
        completedAt: w.completedAt || null,
        txHash: w.txHash || null,
        failureReason: w.failureReason || null,
        securityLevel: w.securityLevel || null,
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
      { error: error.message || "Failed to fetch withdrawals" },
      { status: 500 }
    );
  }
}

