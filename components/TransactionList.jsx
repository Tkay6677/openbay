"use client";
import { useState } from "react";
import { useWalletTransactions } from "../lib/hooks/useVirtualWallet";
import { truncateAddress } from "../lib/utils";

const TYPE_LABELS = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  purchase: "Purchase",
  sale: "Sale",
  platform_fee: "Platform Fee",
  royalty: "Royalty",
  refund: "Refund",
};

const TYPE_COLORS = {
  deposit: "var(--green)",
  withdrawal: "var(--yellow)",
  purchase: "var(--red)",
  sale: "var(--green)",
  platform_fee: "var(--muted)",
  royalty: "var(--blue)",
  refund: "var(--blue)",
};

export default function TransactionList() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("all");
  const { transactions, pagination, isLoading, error, refetch } = useWalletTransactions({
    page,
    limit: 20,
    type: typeFilter,
  });
  const [copied, setCopied] = useState({});

  const copyText = async (text, key) => {
    try {
      await navigator.clipboard.writeText(String(text || ""));
      setCopied((s) => ({ ...s, [key]: true }));
      window.setTimeout(() => setCopied((s) => ({ ...s, [key]: false })), 1200);
    } catch {
      setCopied((s) => ({ ...s, [key]: false }));
    }
  };

  if (isLoading && transactions.length === 0) {
    return (
      <div className="card" style={{ padding: 24 }}>
        <div style={{ textAlign: "center", color: "var(--muted)" }}>Loading transactions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ padding: 24, borderColor: "var(--red)" }}>
        <div style={{ color: "var(--red)" }}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: 0 }}>Transaction History</h3>
          {isLoading && transactions.length > 0 ? (
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Refreshing…</div>
          ) : null}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn" type="button" onClick={refetch} style={{ padding: "6px 12px" }}>
            Refresh
          </button>
          <select
            className="btn"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            style={{ padding: "6px 12px" }}
          >
            <option value="all">All Types</option>
            <option value="deposit">Deposits</option>
            <option value="withdrawal">Withdrawals</option>
            <option value="purchase">Purchases</option>
            <option value="sale">Sales</option>
          </select>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
          No transactions found
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {transactions.map((tx) => (
              <div
                key={tx.id}
                style={{
                  padding: 16,
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  background: "var(--bg-secondary)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 600,
                          background: TYPE_COLORS[tx.type] || "var(--muted)",
                          color: "white",
                        }}
                      >
                        {TYPE_LABELS[tx.type] || tx.type}
                      </span>
                      {tx.status !== "completed" && (
                        <span style={{ fontSize: 12, color: "var(--muted)" }}>({tx.status})</span>
                      )}
                    </div>
                    <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 4 }}>
                      {tx.description || `${TYPE_LABELS[tx.type] || tx.type} transaction`}
                    </div>
                    {tx.counterparty && (
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                        {tx.type === "purchase" ? "From" : "To"}: {truncateAddress(tx.counterparty)}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 600,
                        color: tx.type === "deposit" || tx.type === "sale" ? "var(--green)" : "var(--red)",
                      }}
                    >
                      {tx.type === "deposit" || tx.type === "sale" ? "+" : "-"}
                      {Number(tx.amount).toFixed(4)} ETH
                    </div>
                    {tx.platformFee > 0 && (
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                        Fee: {Number(tx.platformFee).toFixed(4)} ETH
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
                  <div>
                    Balance: {Number(tx.balanceBefore).toFixed(4)} → {Number(tx.balanceAfter).toFixed(4)} ETH
                  </div>
                  <div>
                    {new Date(tx.createdAt).toLocaleString()}
                  </div>
                </div>
                {tx.txHash && (
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "monospace" }}>{truncateAddress(tx.txHash)}</div>
                    <button
                      className="btn"
                      type="button"
                      onClick={() => copyText(tx.txHash, `${tx.id}:txHash`)}
                      style={{ padding: "4px 8px", fontSize: 12 }}
                    >
                      {copied[`${tx.id}:txHash`] ? "Copied" : "Copy"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
              <button
                className="btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </button>
              <span style={{ display: "flex", alignItems: "center", color: "var(--muted)" }}>
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              <button
                className="btn"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
