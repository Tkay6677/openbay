"use client";
import { useVirtualWallet, useWalletTransactions } from "../lib/hooks/useVirtualWallet";
import { useAuth } from "../lib/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useState } from "react";

const TYPE_LABELS = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  purchase: "Purchase",
  sale: "Sale",
  platform_fee: "Platform Fee",
  royalty: "Royalty",
  refund: "Refund",
};

export default function WalletBalanceCard({ onSend, onRequest, onSeeMoreTransactions } = {}) {
  const { isAuthenticated } = useAuth();
  const { balance, isLoading, error, refetch } = useVirtualWallet();
  const { transactions, isLoading: txLoading, error: txError } = useWalletTransactions({ page: 1, limit: 4, type: "all" });
  const router = useRouter();
  const [hidden, setHidden] = useState(false);

  if (!isAuthenticated) {
    return (
      <div className="card" style={{ padding: 24 }}>
        <div style={{ textAlign: "center", color: "var(--muted)", marginBottom: 16 }}>
          Sign in to view your virtual wallet balance
        </div>
        <button
          className="btn primary"
          type="button"
          style={{ width: "100%" }}
          onClick={() => {
            const callbackUrl = `${window.location.pathname}${window.location.search || ""}`;
            router.push(`/?login=1&callbackUrl=${encodeURIComponent(callbackUrl)}`);
          }}
        >
          Sign In
        </button>
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

  const balanceText = `${Number(safeBalance.virtualBalance || 0).toFixed(4)} ETH`;
  const withdrawableText = `${Number(safeBalance.availableToWithdraw || 0).toFixed(4)} ETH`;

  return (
    <div className="wallet-balance">
      <div className="wallet-balance-hero">
        <div className="wallet-balance-top">
          <div className="wallet-balance-label">Wallet Balance</div>
          <div className="wallet-balance-top-actions">
            <button className="wallet-icon-btn" type="button" onClick={() => setHidden((v) => !v)} aria-label={hidden ? "Show balance" : "Hide balance"}>
              {hidden ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7Z" stroke="currentColor" strokeWidth="2" />
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7Z" stroke="currentColor" strokeWidth="2" />
                  <path d="M4 4l16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
            </button>
            <button className="wallet-icon-btn" type="button" onClick={refetch} aria-label="Refresh balance">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M21 12a9 9 0 10-3.2 6.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M21 5v7h-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className="wallet-balance-amount">{hidden ? "••••" : balanceText}</div>
        <div className="wallet-balance-sub">{hidden ? "Available to withdraw" : `Available to withdraw: ${withdrawableText}`}</div>
        {safeBalance.pendingWithdrawals > 0 ? (
          <div className="wallet-balance-note">{`${Number(safeBalance.pendingWithdrawals).toFixed(4)} ETH pending withdrawal`}</div>
        ) : null}

        <div className="wallet-balance-actions">
          <button className="wallet-pill-btn" type="button" onClick={onSend}>
            Send
          </button>
          <button className="wallet-pill-btn" type="button" onClick={onRequest}>
            Request
          </button>
        </div>
      </div>

      <div className="wallet-promo">
        <div className="wallet-promo-left">
          <div className="wallet-promo-title">New promo!</div>
          <div className="wallet-promo-sub">Earn more by trading on Cosmos.</div>
        </div>
        <button className="wallet-promo-btn" type="button" onClick={() => router.push("/market")}>
          Get Promo
        </button>
      </div>

      <div className="wallet-section-head">
        <div className="wallet-section-title">Quick Actions</div>
      </div>
      <div className="wallet-quick-actions">
        <button className="wallet-action-card" type="button" onClick={onSend}>
          <span className="wallet-action-icon" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M7 7h14v14H7V7Z" stroke="currentColor" strokeWidth="2" />
              <path d="M3 17V3h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <span className="wallet-action-label">Transfer</span>
        </button>
        <button className="wallet-action-card" type="button" onClick={onRequest}>
          <span className="wallet-action-icon alt" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <span className="wallet-action-label">Top Up</span>
        </button>
        <button className="wallet-action-card" type="button" onClick={onSeeMoreTransactions}>
          <span className="wallet-action-icon green" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M4 7h16v10H4V7Z" stroke="currentColor" strokeWidth="2" />
              <path d="M8 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <span className="wallet-action-label">Payment</span>
        </button>
      </div>

      <div className="wallet-section-head">
        <div className="wallet-section-title">Transactions</div>
        <button className="wallet-section-link" type="button" onClick={onSeeMoreTransactions}>
          See More
        </button>
      </div>

      <div className="wallet-tx-card">
        {txError ? (
          <div className="wallet-empty">Failed to load transactions.</div>
        ) : txLoading && transactions.length === 0 ? (
          <div className="wallet-empty">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="wallet-empty">No transactions yet.</div>
        ) : (
          <div className="wallet-tx-list">
            {transactions.map((tx) => {
              const label = TYPE_LABELS[tx.type] || tx.type;
              const isCredit = tx.type === "deposit" || tx.type === "sale" || tx.type === "refund";
              const amount = `${isCredit ? "+" : "-"}${Number(tx.amount || 0).toFixed(4)} ETH`;
              const createdAtLabel = tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : "";
              return (
                <div key={tx.id} className="wallet-tx-row">
                  <div className="wallet-tx-left">
                    <div className="wallet-tx-avatar" aria-hidden />
                    <div className="wallet-tx-meta">
                      <div className="wallet-tx-title">{tx.description || label}</div>
                      <div className="wallet-tx-sub">{createdAtLabel}</div>
                    </div>
                  </div>
                  <div className={`wallet-tx-amount${isCredit ? " up" : " down"}`}>{amount}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
