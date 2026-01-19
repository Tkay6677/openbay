import Link from "next/link";
import NavBar from "../../../components/NavBar";
import Footer from "../../../components/Footer";
import { getDb } from "../../../lib/db";
import { truncateAddress, NFT_PLACEHOLDER_SRC } from "../../../lib/utils";

export const dynamic = "force-dynamic";

function isHexAddress(input) {
  const s = String(input || "").toLowerCase();
  return s.startsWith("0x") && s.length === 42;
}

function parseSort(input) {
  const s = String(input || "").toLowerCase();
  if (s === "price_asc" || s === "price_desc" || s === "recent") return s;
  return "recent";
}

function normalizeQuery(input) {
  return String(input || "").trim().toLowerCase();
}

export default async function CollectionDetailPage({ params, searchParams }) {
  const routeParams = await params;
  const routeSearchParams = await searchParams;

  const slug = String(routeParams?.slug || "").trim();
  const q = normalizeQuery(routeSearchParams?.q);
  const sort = parseSort(routeSearchParams?.sort);

  const db = await getDb();

  let contractAddress = "";
  let featuredByName = null;

  if (isHexAddress(slug)) {
    contractAddress = slug.toLowerCase();
  } else {
    const decodedName = decodeURIComponent(slug);
    featuredByName = await db.collection("featuredCollections").findOne({ name: decodedName });
    contractAddress = String(featuredByName?.contractAddress || "").toLowerCase();
  }

  const [collectionDoc, featuredDoc] = await Promise.all([
    contractAddress ? db.collection("collections").findOne({ contractAddress }) : null,
    contractAddress ? db.collection("featuredCollections").findOne({ contractAddress }) : null,
  ]);

  const collectionName = collectionDoc?.name || featuredDoc?.name || featuredByName?.name || decodeURIComponent(slug) || "Collection";
  const collectionImage = collectionDoc?.image || featuredDoc?.image || featuredByName?.image || null;

  let items = [];
  if (contractAddress) {
    items = await db
      .collection("items")
      .find({ contractAddress })
      .project({ _id: 0, tokenId: 1, tokenIdNum: 1, name: 1, image: 1, priceEth: 1, status: 1, ownerId: 1, owner: 1, updatedAt: 1, createdAt: 1 })
      .limit(200)
      .toArray();
  }

  const normalizedItems = items.map((a) => ({
    tokenId: String(a.tokenId || ""),
    tokenIdNum: Number.isFinite(Number(a.tokenIdNum)) ? Number(a.tokenIdNum) : Number(a.tokenId),
    name: a.name || `NFT #${a.tokenId}`,
    image: a.image || null,
    priceEth: Number(a.priceEth || 0),
    status: a.status || "owned",
    owner: a.owner || a.ownerId || null,
    updatedAt: a.updatedAt || a.createdAt || null,
  }));

  let filtered = normalizedItems;
  if (q) {
    filtered = filtered.filter((a) => String(a.name || "").toLowerCase().includes(q) || String(a.tokenId || "").toLowerCase().includes(q));
  }

  if (sort === "price_asc") {
    filtered = [...filtered].sort((a, b) => (a.priceEth || 0) - (b.priceEth || 0));
  } else if (sort === "price_desc") {
    filtered = [...filtered].sort((a, b) => (b.priceEth || 0) - (a.priceEth || 0));
  } else {
    filtered = [...filtered].sort((a, b) => {
      const da = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const dbt = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return dbt - da;
    });
  }

  const totalItems = normalizedItems.length;
  const listedItems = normalizedItems.filter((a) => a.status === "listed" && a.priceEth > 0);
  const floor = listedItems.length ? Math.min(...listedItems.map((a) => a.priceEth)) : 0;
  const owners = new Set(normalizedItems.map((a) => String(a.owner || "").toLowerCase()).filter(Boolean)).size;
  const listedPct = totalItems ? (listedItems.length / totalItems) * 100 : 0;

  const metric = (label, value) => (
    <div className="collection-metric">
      <div className="collection-metric-label">{label}</div>
      <div className="collection-metric-value">{value}</div>
    </div>
  );

  return (
    <>
      <NavBar />
      <main className="container">
        <div className="collection-hero">
          <div className="collection-hero-main">
            <div className="collection-avatar">
              {collectionImage ? <img src={collectionImage} alt={collectionName} /> : <div className="collection-avatar-fallback" />}
            </div>
            <div className="collection-hero-text">
              <div className="collection-title">{collectionName}</div>
              <div className="collection-subtitle">{contractAddress ? truncateAddress(contractAddress) : "Unlinked collection"}</div>
            </div>
          </div>

          <div className="collection-hero-stats">
            {metric("Floor Price", floor ? `${floor.toFixed(3)} ETH` : "—")}
            {metric("Items", totalItems.toLocaleString())}
            {metric("Listed / Supply", `${listedItems.length.toLocaleString()} / ${totalItems.toLocaleString()}`)}
            {metric("Owners", owners.toLocaleString())}
            {metric("Listed %", totalItems ? `${listedPct.toFixed(1)}%` : "—")}
          </div>
        </div>

        <div className="collection-tabs">
          <button className="collection-tab active" type="button">
            Items
          </button>
          <button className="collection-tab" type="button" disabled>
            My Items
          </button>
          <button className="collection-tab" type="button" disabled>
            Offers
          </button>
          <button className="collection-tab" type="button" disabled>
            Holders
          </button>
          <button className="collection-tab" type="button" disabled>
            Activity
          </button>
        </div>

        <div className="collection-tools">
          <div className="collection-tools-left">
            <div className="collection-filter-pill">Filters</div>
            <form className="collection-search" action={`/collections/${encodeURIComponent(slug)}`} method="get">
              <input name="q" defaultValue={q} placeholder="Search items" />
              <input type="hidden" name="sort" value={sort} />
            </form>
          </div>
          <div className="collection-tools-right">
            <form action={`/collections/${encodeURIComponent(slug)}`} method="get" className="collection-sort">
              <input type="hidden" name="q" value={q} />
              <select name="sort" defaultValue={sort} aria-label="Sort">
                <option value="recent">Recently updated</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </form>
          </div>
        </div>

        {!contractAddress ? (
          <div className="section">
            <div style={{ color: "var(--muted)" }}>This collection has no contractAddress. Seed it with a contractAddress to show items.</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="section">
            <div style={{ color: "var(--muted)" }}>No items found.</div>
          </div>
        ) : (
          <div className="collection-items-grid">
            {filtered.map((a) => (
              <Link key={`${contractAddress}-${a.tokenId}`} href={`/asset/${contractAddress}/${a.tokenId}`} className="collection-item-card">
                <div className="collection-item-media">
                  <img src={a.image || NFT_PLACEHOLDER_SRC} alt={a.name} loading="lazy" />
                </div>
                <div className="collection-item-meta">
                  <div className="collection-item-title">{a.name}</div>
                  <div className="collection-item-sub">#{a.tokenId}</div>
                  <div className="collection-item-price">
                    <span>{a.priceEth ? a.priceEth.toFixed(3) : "—"} ETH</span>
                    {a.status === "listed" ? <span className="collection-item-badge">Buy</span> : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
