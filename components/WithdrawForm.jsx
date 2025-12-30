"use client";
import { useState, useEffect } from "react";
import { useWithdrawal, useVirtualWallet } from "../lib/hooks/useVirtualWallet";
import { useWalletConnection } from "../lib/hooks/useWallet";
import { truncateAddress } from "../lib/utils";

export default function WithdrawForm({ onWithdrawSuccess }) {
  const { balance, refetch: refetchBalance } = useVirtualWallet();
  const { address } = useWalletConnection();
  const { isSubmitting, error, withdrawalId, submitWithdrawal, checkWithdrawalStatus } = useWithdrawal();
  const [amount, setAmount] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [withdrawalStatus, setWithdrawalStatus] = useState(null);
  const [statusCheckInterval, setStatusCheckInterval] = useState(null);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    // Pre-fill destination with connected wallet address
    if (address && !destinationAddress) {
      setDestinationAddress(address);
    }
  }, [address, destinationAddress]);

  useEffect(() => {
    // Check withdrawal status periodically if withdrawal ID exists
    if (withdrawalId && !statusCheckInterval) {
      const interval = setInterval(async () => {
        try {
          const status = await checkWithdrawalStatus(withdrawalId);
          setWithdrawalStatus(status);
          if (status.status === "completed" || status.status === "failed") {
            clearInterval(interval);
            setStatusCheckInterval(null);
            if (status.status === "completed") {
              refetchBalance();
              if (onWithdrawSuccess) {
                onWithdrawSuccess(status);
              }
            }
          }
        } catch (err) {
          console.error("Error checking withdrawal status:", err);
        }
      }, 5000); // Check every 5 seconds
      setStatusCheckInterval(interval);
    }

    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [withdrawalId, statusCheckInterval, checkWithdrawalStatus, refetchBalance, onWithdrawSuccess]);

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setFormError(null);
    
    if (!amount || parseFloat(amount) <= 0) {
      setFormError("Please enter a valid amount.");
      return;
    }

    const amountNum = parseFloat(amount);
    if (amountNum < 0.01) {
      setFormError("Minimum withdrawal is 0.01 ETH.");
      return;
    }

    if (balance && amountNum > balance.availableToWithdraw) {
      setFormError(`Insufficient balance. Available: ${Number(balance.availableToWithdraw || 0).toFixed(4)} ETH.`);
      return;
    }

    try {
      await submitWithdrawal(amountNum, destinationAddress || undefined);
      setAmount("");
    } catch (err) {
      // Error is handled by the hook
    }
  };

  const maxAmount = balance?.availableToWithdraw || 0;

  return (
    <div className="card" style={{ padding: 24 }}>
      <h3 style={{ marginTop: 0, marginBottom: 16 }}>Withdraw ETH</h3>

      {balance && (
        <div style={{ marginBottom: 16, padding: 12, background: "var(--bg-secondary)", borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Available to withdraw:</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{Number(maxAmount).toFixed(4)} ETH</div>
        </div>
      )}

      <form onSubmit={handleWithdraw}>
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
            max={maxAmount}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            disabled={isSubmitting}
            required
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              type="button"
              className="btn"
              style={{ fontSize: 12, padding: "4px 8px" }}
              onClick={() => setAmount((maxAmount * 0.25).toFixed(4))}
              disabled={isSubmitting}
            >
              25%
            </button>
            <button
              type="button"
              className="btn"
              style={{ fontSize: 12, padding: "4px 8px" }}
              onClick={() => setAmount((maxAmount * 0.5).toFixed(4))}
              disabled={isSubmitting}
            >
              50%
            </button>
            <button
              type="button"
              className="btn"
              style={{ fontSize: 12, padding: "4px 8px" }}
              onClick={() => setAmount((maxAmount * 0.75).toFixed(4))}
              disabled={isSubmitting}
            >
              75%
            </button>
            <button
              type="button"
              className="btn"
              style={{ fontSize: 12, padding: "4px 8px" }}
              onClick={() => setAmount(maxAmount.toFixed(4))}
              disabled={isSubmitting}
            >
              Max
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 14, color: "var(--muted)", marginBottom: 8 }}>
            Destination address (defaults to your connected wallet)
          </label>
          <input
            className="btn"
            style={{ width: "100%", cursor: "text", fontFamily: "monospace", fontSize: 12 }}
            type="text"
            value={destinationAddress}
            onChange={(e) => setDestinationAddress(e.target.value)}
            placeholder={address || "0x..."}
            disabled={isSubmitting}
          />
          <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn" type="button" onClick={() => address && setDestinationAddress(address)} disabled={isSubmitting || !address} style={{ padding: "4px 8px", fontSize: 12 }}>
              Use my wallet
            </button>
            <button className="btn" type="button" onClick={() => setDestinationAddress("")} disabled={isSubmitting} style={{ padding: "4px 8px", fontSize: 12 }}>
              Clear
            </button>
          </div>
        </div>

        {formError && (
          <div style={{ color: "var(--red)", marginBottom: 12, fontSize: 14 }}>{formError}</div>
        )}

        {error && (
          <div style={{ color: "var(--red)", marginBottom: 12, fontSize: 14 }}>{error}</div>
        )}

        {withdrawalId && (
          <div style={{ marginBottom: 12, padding: 12, background: "rgba(45, 212, 191, 0.1)", borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Withdrawal ID:</div>
            <div style={{ fontFamily: "monospace", fontSize: 12, wordBreak: "break-all", marginBottom: 8 }}>
              {withdrawalId}
            </div>
            {withdrawalStatus && (
              <div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  Status: <strong>{withdrawalStatus.status}</strong>
                </div>
                {withdrawalStatus.txHash && (
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                    Tx: {truncateAddress(withdrawalStatus.txHash)}
                  </div>
                )}
              </div>
            )}
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
              Your withdrawal will be processed within 5-10 minutes
            </div>
          </div>
        )}

        <button
          className="btn primary"
          type="submit"
          disabled={isSubmitting || !amount || parseFloat(amount) <= 0}
          style={{ width: "100%" }}
        >
          {isSubmitting ? "Submitting..." : "Request Withdrawal"}
        </button>
      </form>
    </div>
  );
}
