import fs from "fs";
import { MongoClient } from "mongodb";

function loadEnv(path = ".env") {
  try {
    const raw = fs.readFileSync(path, "utf8");
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const eq = trimmed.indexOf("=");
      if (eq === -1) return;
      let key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith("\"") && val.endsWith("\"")) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    });
  } catch (err) {
    console.error("Could not read .env", err.message);
  }
}

async function run() {
  loadEnv();
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || "openbay";
  if (!uri) {
    console.error("MONGODB_URI not found in environment (.env)");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    console.log("Connecting to MongoDB...");
    await client.connect();
    const db = client.db(dbName);
    const coll = db.collection("withdrawalRequests");

    const indexes = await coll.indexes();
    const txIdx = indexes.find(i => i.name === "txHash_1");
    if (!txIdx) {
      console.log("No txHash_1 index found; creating it now.");
    } else {
      console.log("Found existing txHash_1 index:", txIdx);
      if (txIdx.partialFilterExpression && txIdx.partialFilterExpression.txHash && txIdx.partialFilterExpression.txHash.$type === "string") {
        console.log("Index already has desired partialFilterExpression; nothing to do.");
        return;
      }
      console.log("Dropping existing index txHash_1 (may rebuild).\n");
      await coll.dropIndex("txHash_1");
      console.log("Dropped.");
    }

    console.log("Creating txHash_1 with partialFilterExpression...");
    const name = await coll.createIndex(
      { txHash: 1 },
      { unique: true, partialFilterExpression: { txHash: { $type: "string" } }, name: "txHash_1" }
    );
    console.log("Created index:", name);

    const updated = await coll.indexes();
    console.log("Updated indexes:", updated);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

run().catch(e => { console.error(e); process.exit(1); });
