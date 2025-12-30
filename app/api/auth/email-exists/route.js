import { NextResponse } from "next/server";
import { getUserByEmail } from "../../../../lib/db";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = body?.email?.toLowerCase?.().trim?.() || "";
    if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 });

    const user = await getUserByEmail(email);
    return NextResponse.json({
      exists: !!user,
      provider: user?.provider || null,
      hasPassword: !!user?.passwordHash,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
