"use client";
import { useVirtualWallet } from "../lib/hooks/useVirtualWallet";
import { useAuth } from "../lib/hooks/useAuth";
import Link from "next/link";

export default function WalletBalanceCard() {
  const { isAuthenticated } = useAuth();
  const { balance, isLoading, error, refetch } = useVirtualWallet();

  if (!isAuthenticated) {
    return (
      <div className="card" style={{ padding: 24 }}>
        <div style={{ textAlign: "center", color: "var(--muted)", marginBottom: 16 }}>
          Sign in to view your virtual wallet balance
        </div>
        <Link href="/login" className="btn primary" style={{ width: "100%" }}>
          Sign In
        </Link>
      </div>
    );
  }

  const safeBalance = balance || {
    walletAddress: null,
    virtualBalance: 0,
    totalDeposited: 0,
    totalWithdrawn: 0,
    totalEarned: 0,
    totalSpent: 0,
    pendingWithdrawals: 0,
    availableToWithdraw: 0,
  };

  if (isLoading) {
    return (
      <div className="card" style={{ padding: 24 }}>
        <div style={{ textAlign: "center", color: "var(--muted)" }}>Loading balance...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ padding: 24, borderColor: "var(--red)" }}>
        <div style={{ color: "var(--red)", marginBottom: 12 }}>Error: {error}</div>
        <button className="btn" onClick={refetch}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Virtual Wallet</h2>
        <button className="btn" onClick={refetch} style={{ padding: "6px 12px" }}>
          Refresh
        </button>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 8 }}>Available Balance</div>
        <div style={{ fontSize: 36, fontWeight: 700, marginBottom: 4 }}>
          {Number(safeBalance.virtualBalance || 0).toFixed(4)} ETH
        </div>
        <div style={{ fontSize: 14, color: "var(--muted)" }}>
          Available to withdraw: {Number(safeBalance.availableToWithdraw || 0).toFixed(4)} ETH
        </div>
        {safeBalance.pendingWithdrawals > 0 && (
          <div style={{ fontSize: 12, color: "var(--yellow)", marginTop: 4 }}>
            {Number(safeBalance.pendingWithdrawals).toFixed(4)} ETH pending withdrawal
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Total Deposited</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{Number(safeBalance.totalDeposited || 0).toFixed(4)} ETH</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Total Withdrawn</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{Number(safeBalance.totalWithdrawn || 0).toFixed(4)} ETH</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Total Earned</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{Number(safeBalance.totalEarned || 0).toFixed(4)} ETH</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Total Spent</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{Number(safeBalance.totalSpent || 0).toFixed(4)} ETH</div>
        </div>
      </div>
    </div>
  );
}
