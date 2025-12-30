import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { ethers } from "ethers";
import { authOptions } from "../auth/[...nextauth]/route";
import {
  ensureCustodialWalletForUserId,
  ensureCustodialWalletForWalletAddress,
  getCustodialWalletByUserId,
  getCustodialWalletByWalletAddress,
  getCustodialWalletSignerByUserId,
} from "../../../lib/db";

function getRpcUrl() {
  const rpcUrl = process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || null;
  if (!rpcUrl) return null;
  if (rpcUrl.includes("your-rpc-endpoint")) return null;
  return rpcUrl;
}

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session;
}

function verifyWalletProof({ walletAddress, message, signature }) {
  if (!walletAddress || !message || !signature) return false;
  if (!ethers.utils.isAddress(walletAddress)) return false;
  let recovered = null;
  try {
    recovered = ethers.utils.verifyMessage(message, signature);
  } catch {
    recovered = null;
  }
  if (!recovered) return false;
  return recovered.toLowerCase() === walletAddress.toLowerCase();
}

export async function GET(req) {
  const url = new URL(req.url);
  const walletAddress = url.searchParams.get("walletAddress");

  try {
    let wallet = null;
    if (walletAddress) {
      if (!ethers.utils.isAddress(walletAddress)) {
        return NextResponse.json({ error: "Invalid walletAddress" }, { status: 400 });
      }
      wallet = await getCustodialWalletByWalletAddress(walletAddress);
    } else {
      const session = await requireSession();
      if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      wallet = await getCustodialWalletByUserId(session.user.id);
    }

    if (!wallet?.address) {
      return NextResponse.json({ hasWallet: false });
    }

    const rpcUrl = getRpcUrl();
    let balanceEth = null;
    if (rpcUrl) {
      try {
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        const balance = await provider.getBalance(wallet.address);
        balanceEth = ethers.utils.formatEther(balance);
      } catch {
        balanceEth = null;
      }
    }

    return NextResponse.json({
      hasWallet: true,
      address: wallet.address,
      balanceEth,
    });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to load wallet" }, { status: 500 });
  }
}

export async function POST(req) {
  let body = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  try {
    const session = await requireSession();
    if (session) {
      const passphrase = typeof body?.passphrase === "string" ? body.passphrase : null;
      const created = await ensureCustodialWalletForUserId(session.user.id, { passphrase });
      if (!created?.created) {
        return NextResponse.json({ hasWallet: true, address: created.address }, { status: 409 });
      }

      return NextResponse.json({
        hasWallet: true,
        address: created.address,
        mnemonic: created.mnemonic,
      });
    }

    const walletAddress = typeof body?.walletAddress === "string" ? body.walletAddress.trim() : "";
    const message = typeof body?.message === "string" ? body.message : "";
    const signature = typeof body?.signature === "string" ? body.signature : "";
    const passphrase = typeof body?.passphrase === "string" ? body.passphrase : null;
    if (!verifyWalletProof({ walletAddress, message, signature })) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const created = await ensureCustodialWalletForWalletAddress(walletAddress, { passphrase });
    if (!created?.created) {
      return NextResponse.json({ hasWallet: true, address: created.address }, { status: 409 });
    }

    return NextResponse.json({
      hasWallet: true,
      address: created.address,
      mnemonic: created.mnemonic,
    });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to create wallet" }, { status: 500 });
  }
}

export async function PUT(req) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  try {
    const to = typeof body?.to === "string" ? body.to.trim() : "";
    const amountEthRaw = typeof body?.amountEth === "string" ? body.amountEth.trim() : "";
    if (!to || !ethers.utils.isAddress(to)) {
      return NextResponse.json({ error: "Invalid recipient address" }, { status: 400 });
    }

    const sessionWalletAddress = session?.user?.walletAddress;
    if (sessionWalletAddress && sessionWalletAddress.toLowerCase() !== to.toLowerCase()) {
      return NextResponse.json({ error: "Recipient address not allowed" }, { status: 403 });
    }

    let value = null;
    try {
      value = ethers.utils.parseEther(amountEthRaw || "0");
    } catch {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    if (!value || value.lte(0)) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const signer = await getCustodialWalletSignerByUserId(session.user.id);
    if (!signer?.provider) {
      return NextResponse.json({ error: "RPC_URL is required for withdrawals" }, { status: 500 });
    }

    const tx = await signer.sendTransaction({ to, value });
    return NextResponse.json({ txHash: tx.hash });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to send transaction" }, { status: 500 });
  }
}
