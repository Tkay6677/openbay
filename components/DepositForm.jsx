"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { useDeposit } from "../lib/hooks/useVirtualWallet";
import { useAuth } from "../lib/hooks/useAuth";
import { useSigner } from "@thirdweb-dev/react";
import { ethers } from "ethers";

const FALLBACK_METHODS = [
  {
    id: "wallet_send",
    label: "Wallet transfer",
    description: "Send ETH from your connected wallet in this app.",
    requiresSigner: true,
    requiresTxHash: false,
    minDeposit: 0.01,
  },
  {
    id: "tx_hash",
    label: "Submit transaction hash",
    description: "Already sent ETH from elsewhere? Submit your tx hash for verification.",
    requiresSigner: false,
    requiresTxHash: true,
    minDeposit: 0.01,
  },
  {
    id: "direct_proof",
    label: "Direct deposit proof",
    description: "Upload proof for manual/admin review.",
    requiresSigner: false,
    requiresTxHash: false,
    minDeposit: 0.01,
  },
];

function isTxHash(value) {
  return /^0x[a-fA-F0-9]{64}$/.test(String(value || "").trim());
}

export default function DepositForm({ onDepositSuccess }) {
  const { isAuthenticated } = useAuth();
  const { depositAddress, isLoading: addressLoading, error: addressError, fetchDepositAddress } = useDeposit();
  const signer = useSigner();

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("wallet_send");
  const [manualTxHash, setManualTxHash] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [reference, setReference] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [copied, setCopied] = useState({ depositAddress: false, txHash: false });
  const proofInputRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDepositAddress();
    }
  }, [fetchDepositAddress, isAuthenticated]);

  const methods = useMemo(() => {
    const incoming = Array.isArray(depositAddress?.methods) ? depositAddress.methods : [];
    return incoming.length > 0 ? incoming : FALLBACK_METHODS;
  }, [depositAddress?.methods]);

  useEffect(() => {
    if (!methods.find((m) => m.id === method)) {
      setMethod(methods[0]?.id || "wallet_send");
    }
  }, [method, methods]);

  const selectedMethod = methods.find((m) => m.id === method) || methods[0] || FALLBACK_METHODS[0];
  const minDeposit = Number(depositAddress?.minDeposit || selectedMethod?.minDeposit || 0.01);
  const requiresSigner = Boolean(selectedMethod?.requiresSigner);
  const requiresTxHash = Boolean(selectedMethod?.requiresTxHash);
  const isDirectProof = method === "direct_proof";

  const copyText = async (text, key) => {
    try {
      await navigator.clipboard.writeText(String(text || ""));
      setCopied((s) => ({ ...s, [key]: true }));
      window.setTimeout(() => setCopied((s) => ({ ...s, [key]: false })), 1200);
    } catch {
      setCopied((s) => ({ ...s, [key]: false }));
    }
  };

  const resetMethodFields = () => {
    setManualTxHash("");
    setProofFile(null);
    setReference("");
    if (proofInputRef.current) proofInputRef.current.value = "";
  };

  const handleMethodChange = (nextMethod) => {
    setMethod(nextMethod);
    setError(null);
    setSubmitStatus(null);
    setTxHash(null);
    resetMethodFields();
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    setError(null);
    setTxHash(null);
    setSubmitStatus(null);

    const amountValue = parseFloat(String(amount || "").trim());
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    if (amountValue < minDeposit) {
      setError(`Minimum deposit is ${minDeposit} ETH`);
      return;
    }
    if (!depositAddress?.address) {
      setError("Deposit address not available");
      return;
    }
    if (requiresSigner && !signer) {
      setError("Please connect your wallet first");
      return;
    }
    if (requiresTxHash) {
      const normalized = manualTxHash.trim();
      if (!normalized) {
        setError("Please provide the transaction hash");
        return;
      }
      if (!isTxHash(normalized)) {
        setError("Enter a valid transaction hash (0x...)");
        return;
      }
    }

    try {
      setIsSending(true);

      if (method === "wallet_send") {
        const value = ethers.utils.parseEther(amount);
        const tx = await signer.sendTransaction({
          to: depositAddress.address,
          value,
        });
        setTxHash(tx.hash);
        await tx.wait();

        const notifyRes = await fetch("/api/wallet/deposit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ txHash: tx.hash, method }),
        });
        const notifyData = await notifyRes.json().catch(() => ({}));
        if (!notifyRes.ok) {
          throw new Error(notifyData.error || "Failed to submit deposit for admin approval");
        }

        setSubmitStatus({
          type: "success",
          message: "Deposit submitted for admin approval. Your wallet balance will update after approval.",
        });
        if (onDepositSuccess) onDepositSuccess(tx.hash);
        setAmount("");
        return;
      }

      if (method === "tx_hash") {
        const normalizedHash = manualTxHash.trim().toLowerCase();
        const res = await fetch("/api/wallet/deposit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ txHash: normalizedHash, method }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to submit transaction hash");

        setTxHash(data.txHash || normalizedHash);
        setSubmitStatus({
          type: "success",
          message: "Transaction submitted for admin approval.",
        });
        if (onDepositSuccess) onDepositSuccess(data.transactionId || normalizedHash);
        setAmount("");
        setManualTxHash("");
        return;
      }

      const formData = new FormData();
      formData.append("amount", String(amount));
      formData.append("toAddress", depositAddress.address);
      formData.append("method", method);
      if (reference.trim()) formData.append("reference", reference.trim());
      if (proofFile) formData.append("proof", proofFile);

      const res = await fetch("/api/wallet/deposit-direct", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to submit direct deposit");

      setSubmitStatus({ type: "success", message: "Direct deposit submitted for admin review." });
      setAmount("");
      resetMethodFields();
      if (onDepositSuccess) onDepositSuccess(data.transactionId || null);
    } catch (err) {
      setError(err.message || "Failed to submit deposit");
    } finally {
      setIsSending(false);
    }
  };

  const submitButtonLabel =
    method === "wallet_send"
      ? !signer
        ? "Connect Wallet"
        : "Send ETH"
      : method === "tx_hash"
      ? "Submit Tx Hash"
      : "Submit Direct Deposit";

  return (
    <div className="card" style={{ padding: 24 }}>
      <h3 style={{ marginTop: 0, marginBottom: 16 }}>Deposit ETH</h3>

      {addressError ? <div style={{ color: "var(--red)", marginBottom: 12 }}>{addressError}</div> : null}

      {addressLoading && !depositAddress ? (
        <div className="card" style={{ padding: 14, marginBottom: 20 }}>
          <div style={{ color: "var(--muted)" }}>Loading your deposit address...</div>
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

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 14, color: "var(--muted)", marginBottom: 8 }}>
          Deposit method
        </label>
        <div style={{ display: "grid", gap: 8 }}>
          {methods.map((m) => (
            <button
              key={m.id}
              type="button"
              className={method === m.id ? "btn primary" : "btn"}
              onClick={() => handleMethodChange(m.id)}
              style={{ textAlign: "left", whiteSpace: "normal" }}
            >
              <div style={{ fontWeight: 700 }}>{m.label || m.id}</div>
              {m.description ? (
                <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>{m.description}</div>
              ) : null}
            </button>
          ))}
        </div>
      </div>

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
            min={String(minDeposit)}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            disabled={isSending || (requiresSigner && !signer)}
            required
          />
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Minimum: {minDeposit} ETH</div>
        </div>

        {requiresTxHash ? (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 14, color: "var(--muted)", marginBottom: 8 }}>
              Transaction hash
            </label>
            <input
              className="btn"
              style={{ width: "100%", cursor: "text", fontFamily: "monospace" }}
              type="text"
              value={manualTxHash}
              onChange={(e) => setManualTxHash(e.target.value)}
              placeholder="0x..."
              disabled={isSending}
              required
            />
          </div>
        ) : null}

        {isDirectProof ? (
          <div style={{ marginBottom: 16, display: "grid", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 14, color: "var(--muted)", marginBottom: 8 }}>
                Upload payment proof (optional)
              </label>
              <input
                ref={proofInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                disabled={isSending}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 14, color: "var(--muted)", marginBottom: 8 }}>
                Reference note (optional)
              </label>
              <input
                className="btn"
                style={{ width: "100%", cursor: "text" }}
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Bank ref / transfer note"
                disabled={isSending}
              />
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              Admin will manually review this submission before crediting your balance.
            </div>
          </div>
        ) : null}

        {error ? <div style={{ color: "var(--red)", marginBottom: 12, fontSize: 14 }}>{error}</div> : null}

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
              Your balance will update after an admin approves your deposit.
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
          disabled={
            isSending ||
            !depositAddress ||
            addressLoading ||
            (requiresSigner && !signer) ||
            (requiresTxHash && !manualTxHash.trim())
          }
          style={{ width: "100%" }}
        >
          {isSending ? "Processing..." : submitButtonLabel}
        </button>
      </form>
    </div>
  );
}
