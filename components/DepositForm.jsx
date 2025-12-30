"use client";
import { useState, useEffect } from "react";
import { useDeposit } from "../lib/hooks/useVirtualWallet";
import { useAuth } from "../lib/hooks/useAuth";
import { useSigner } from "@thirdweb-dev/react";
import { ethers } from "ethers";

export default function DepositForm({ onDepositSuccess }) {
  const { isAuthenticated } = useAuth();
  const { depositAddress, isLoading: addressLoading, error: addressError, fetchDepositAddress } = useDeposit();
  const signer = useSigner();
  const [amount, setAmount] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [copied, setCopied] = useState({ depositAddress: false, txHash: false });

  useEffect(() => {
    if (isAuthenticated) {
      fetchDepositAddress();
    }
  }, [fetchDepositAddress, isAuthenticated]);

  const copyText = async (text, key) => {
    try {
      await navigator.clipboard.writeText(String(text || ""));
      setCopied((s) => ({ ...s, [key]: true }));
      window.setTimeout(() => setCopied((s) => ({ ...s, [key]: false })), 1200);
    } catch {
      setCopied((s) => ({ ...s, [key]: false }));
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    setError(null);
    setTxHash(null);
    setSubmitStatus(null);

    if (!signer) {
      setError("Please connect your wallet first");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (!depositAddress?.address) {
      setError("Deposit address not available");
      return;
    }

    try {
      setIsSending(true);
      const value = ethers.utils.parseEther(amount);
      const tx = await signer.sendTransaction({
        to: depositAddress.address,
        value,
      });
      setTxHash(tx.hash);
      
      // Wait for transaction to be mined
      await tx.wait();

      const notifyRes = await fetch("/api/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash: tx.hash }),
      });
      const notifyData = await notifyRes.json().catch(() => ({}));
      if (!notifyRes.ok) {
        throw new Error(notifyData.error || "Failed to submit deposit for admin approval");
      }
      setSubmitStatus({
        type: "success",
        message: "Deposit submitted for admin approval. Your virtual wallet balance will update after approval.",
      });
      
      // Notify parent component
      if (onDepositSuccess) {
        onDepositSuccess(tx.hash);
      }
      
      // Reset form
      setAmount("");
    } catch (err) {
      setError(err.message || "Failed to send transaction");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="card" style={{ padding: 24 }}>
      <h3 style={{ marginTop: 0, marginBottom: 16 }}>Deposit ETH</h3>
      
      {addressError && (
        <div style={{ color: "var(--red)", marginBottom: 12 }}>{addressError}</div>
      )}

      {addressLoading && !depositAddress ? (
        <div className="card" style={{ padding: 14, marginBottom: 20 }}>
          <div style={{ color: "var(--muted)" }}>Loading your deposit address…</div>
        </div>
      ) : null}

      {depositAddress ? (
        <div style={{ marginBottom: 20, padding: 12, background: "var(--bg-secondary)", borderRadius: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Send ETH to:</div>
            <button
              className="btn"
              type="button"
              onClick={() => copyText(depositAddress.address, "depositAddress")}
              style={{ padding: "4px 8px", fontSize: 12 }}
            >
              {copied.depositAddress ? "Copied" : "Copy"}
            </button>
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 13, wordBreak: "break-all" }}>{depositAddress.address}</div>
          {depositAddress.notice ? (
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>{depositAddress.notice}</div>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={handleDeposit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 14, color: "var(--muted)", marginBottom: 8 }}>
            Amount (ETH)
          </label>
          <input
            className="btn"
            style={{ width: "100%", cursor: "text" }}
            type="number"
            step="0.0001"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            disabled={isSending || !signer}
            required
          />
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
            Minimum: {depositAddress?.minDeposit || 0.01} ETH
          </div>
        </div>

        {error && (
          <div style={{ color: "var(--red)", marginBottom: 12, fontSize: 14 }}>{error}</div>
        )}

        {txHash ? (
          <div style={{ marginBottom: 12, padding: 12, background: "rgba(45, 212, 191, 0.1)", borderRadius: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Transaction hash</div>
              <button className="btn" type="button" onClick={() => copyText(txHash, "txHash")} style={{ padding: "4px 8px", fontSize: 12 }}>
                {copied.txHash ? "Copied" : "Copy"}
              </button>
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 12, wordBreak: "break-all", marginTop: 6 }}>{txHash}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>
              Your virtual balance will update after an admin approves your deposit.
            </div>
          </div>
        ) : null}

        {submitStatus?.type === "success" ? (
          <div style={{ marginBottom: 12, padding: 12, background: "rgba(34, 197, 94, 0.12)", borderRadius: 8, fontSize: 13 }}>
            {submitStatus.message}
          </div>
        ) : null}

        <button
          className="btn primary"
          type="submit"
          disabled={isSending || !signer || !depositAddress || addressLoading}
          style={{ width: "100%" }}
        >
          {isSending ? "Sending..." : !signer ? "Connect Wallet" : "Send ETH"}
        </button>
      </form>
    </div>
  );
}
