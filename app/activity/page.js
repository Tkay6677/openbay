import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";
import { getDb } from "../../lib/db";

export const dynamic = "force-dynamic";

function formatEth(amount) {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (!Number.isFinite(n)) return "0.0000 ETH";
  return `${n.toFixed(4)} ETH`;
}

function toEventLabel(type) {
  const raw = String(type || "").trim();
  if (!raw) return "Event";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export default async function ActivityPage() {
  let recent = [];
  try {
    const db = await getDb();
    const txs = await db
      .collection("walletTransactions")
      .find({ type: { $in: ["purchase", "sale", "mint", "list"] } })
      .sort({ createdAt: -1 })
      .limit(25)
      .toArray();

    recent = txs.map((tx) => ({
      id: tx._id.toString(),
      event: toEventLabel(tx.type),
      item: tx.description || tx.itemId?.toString?.() || "—",
      price: formatEth(tx.amount),
      from: tx.userId || "—",
      to: tx.counterpartyId || "—",
    }));
  } catch {}

  return (
    <>
      <NavBar />
      <main className="container">
        <div className="section">
          <h2>Activity</h2>
          <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-elev)" }}>
                  <th style={{ textAlign: "left", padding: 12 }}>Event</th>
                  <th style={{ textAlign: "left", padding: 12 }}>Item</th>
                  <th style={{ textAlign: "left", padding: 12 }}>Price</th>
                  <th style={{ textAlign: "left", padding: 12 }}>From</th>
                  <th style={{ textAlign: "left", padding: 12 }}>To</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 ? (
                  <tr style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: 12, color: "var(--muted)" }} colSpan={5}>
                      No activity yet
                    </td>
                  </tr>
                ) : (
                  recent.map((r) => (
                    <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={{ padding: 12 }}>{r.event}</td>
                      <td style={{ padding: 12 }}>{r.item}</td>
                      <td style={{ padding: 12 }}>{r.price}</td>
                      <td style={{ padding: 12 }}>{r.from}</td>
                      <td style={{ padding: 12 }}>{r.to}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
