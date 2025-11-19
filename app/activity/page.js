import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";

const recent = [
  { id: 1, event: "Sale", item: "Bay Creature #3", price: "1.4 ETH", from: "0x...aa", to: "0x...bb" },
  { id: 2, event: "List", item: "OpenBay Genesis #2", price: "0.2 ETH", from: "0x...cc", to: "Market" },
  { id: 3, event: "Mint", item: "Cyber Sailor #4", price: "0.75 ETH", from: "0x...dd", to: "0x...ee" },
];

export default function ActivityPage() {
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
                {recent.map((r) => (
                  <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: 12 }}>{r.event}</td>
                    <td style={{ padding: 12 }}>{r.item}</td>
                    <td style={{ padding: 12 }}>{r.price}</td>
                    <td style={{ padding: 12 }}>{r.from}</td>
                    <td style={{ padding: 12 }}>{r.to}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}