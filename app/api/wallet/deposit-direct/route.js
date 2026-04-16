import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { createWalletTransaction, getDb, getUserById } from "../../../../lib/db";

function isPlaceholder(value) {
  const v = String(value || "").trim().toLowerCase();
  if (!v) return true;
  if (v === "your-pinata-jwt") return true;
  if (v.includes("your-pinata-jwt")) return true;
  if (v.includes("your-")) return true;
  return false;
}

function getPinataAuthHeaders() {
  const jwt = process.env.PINATA_JWT;
  if (jwt && !isPlaceholder(jwt)) return { Authorization: `Bearer ${jwt}` };
  const apiKey = process.env.PINATA_API_KEY;
  const apiSecret = process.env.PINATA_API_SECRET;
  if (apiKey && apiSecret && !isPlaceholder(apiKey) && !isPlaceholder(apiSecret)) {
    return { pinata_api_key: apiKey, pinata_secret_api_key: apiSecret };
  }
  return null;
}

function getGatewayPrefix() {
  const raw = (process.env.IPFS_GATEWAY || process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://ipfs.io/ipfs/").trim();
  if (!raw) return "https://ipfs.io/ipfs/";
  return raw.endsWith("/") ? raw : `${raw}/`;
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const form = await req.formData();
    const amountRaw = form.get("amount");
    const toAddress = String(form.get("toAddress") || "").trim();
    const reference = String(form.get("reference") || "").trim();
    const depositMethod = "direct_proof";
    const file = form.get("proof");

    const amount = parseFloat(String(amountRaw || "").trim());
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const user = await getUserById(session.user.id);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Require the user to have a linked wallet address for bookkeeping
    if (!user.walletAddress) {
      return NextResponse.json({ error: "Please link your wallet address in your profile before submitting a direct deposit" }, { status: 400 });
    }

    let proofUrl = null;
    if (file && typeof file !== "string") {
      const authHeaders = getPinataAuthHeaders();
      if (!authHeaders) {
        return NextResponse.json({ error: "IPFS upload is not configured" }, { status: 500 });
      }

      const pinataForm = new FormData();
      pinataForm.append("file", file, file.name || "proof");
      pinataForm.append("pinataMetadata", JSON.stringify({ name: file.name || "proof" }));

      const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
          ...authHeaders,
        },
        body: pinataForm,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) return NextResponse.json({ error: data?.error || data?.message || "IPFS upload failed" }, { status: res.status || 500 });
      const cid = String(data?.IpfsHash || "").trim();
      if (cid) {
        proofUrl = `${getGatewayPrefix()}${cid}`;
      }
    }

    // Create a pending wallet transaction record for admin review
    const db = await getDb();
    const balanceBefore = user.virtualBalance || 0;

    const tx = await createWalletTransaction({
      type: "deposit",
      userId: user.walletAddress,
      amount,
      balanceBefore,
      balanceAfter: balanceBefore,
      txHash: null,
      status: "pending",
      depositMethod,
      externalReference: reference || null,
      description: `Direct deposit submitted by user${toAddress ? ` (to ${toAddress})` : ""}${reference ? ` - Ref: ${reference}` : ""}`,
      proofUrl: proofUrl || null,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      transactionId: tx._id.toString(),
      status: tx.status,
      amount: tx.amount,
      depositMethod: tx.depositMethod || depositMethod,
      proofUrl: tx.proofUrl || null,
    });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to submit direct deposit" }, { status: 500 });
  }
}
