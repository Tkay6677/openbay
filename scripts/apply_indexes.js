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

    const collections = ["walletTransactions", "withdrawalRequests"];
    for (const collName of collections) {
      console.log(`\nApplying index on ${collName}.txHash`);
      try {
        const idxName = await db.collection(collName).createIndex(
          { txHash: 1 },
          { unique: true, partialFilterExpression: { txHash: { $type: "string" } }, name: "txHash_1" }
        );
        console.log(`Created/verified index: ${idxName}`);
      } catch (err) {
        console.error(`Failed to create index on ${collName}:`, err.message);
      }

      try {
        const current = await db.collection(collName).indexes();
        console.log(`Indexes for ${collName}:`, current);
      } catch (err) {
        console.error(`Failed to list indexes for ${collName}:`, err.message);
      }
    }

    console.log("Done.");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
