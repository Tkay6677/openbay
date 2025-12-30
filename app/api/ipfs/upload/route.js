import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

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

    const authHeaders = getPinataAuthHeaders();
    if (!authHeaders) {
      return NextResponse.json(
        { error: "IPFS upload is not configured" },
        { status: 500 }
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!file) return NextResponse.json({ error: "file is required" }, { status: 400 });
    if (typeof file === "string") return NextResponse.json({ error: "Invalid file" }, { status: 400 });

    const pinataForm = new FormData();
    pinataForm.append("file", file, file.name || "upload");

    const fileName = typeof file.name === "string" ? file.name : "upload";
    pinataForm.append("pinataMetadata", JSON.stringify({ name: fileName }));

    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        ...authHeaders,
      },
      body: pinataForm,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error || data?.message || "IPFS upload failed" },
        { status: res.status || 500 }
      );
    }

    const cid = String(data?.IpfsHash || "").trim();
    if (!cid) return NextResponse.json({ error: "IPFS upload failed" }, { status: 500 });

    const uri = `ipfs://${cid}`;
    const url = `${getGatewayPrefix()}${cid}`;

    return NextResponse.json({ cid, uri, url });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "IPFS upload failed" }, { status: 500 });
  }
}
