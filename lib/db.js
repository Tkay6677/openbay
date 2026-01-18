import { MongoClient, ObjectId } from "mongodb";
import crypto from "crypto";
import { ethers } from "ethers";

function getMongoUri() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");
  return uri;
}

function getMongoDbName() {
  return process.env.MONGODB_DB || undefined;
}

async function getMongoClient() {
  if (!globalThis.__cosmosMongoClientPromise) {
    const client = new MongoClient(getMongoUri());
    globalThis.__cosmosMongoClientPromise = client.connect();
  }
  return globalThis.__cosmosMongoClientPromise;
}

async function ensureIndexes(db) {
  if (globalThis.__cosmosMongoIndexesReady) return;
  await db.collection("users").createIndex({ email: 1 }, { unique: true, sparse: true });
  await db.collection("users").createIndex({ walletAddress: 1 }, { unique: true, sparse: true });
  await db.collection("users").createIndex({ firebaseUid: 1 }, { unique: true, sparse: true });
  await db.collection("users").createIndex({ supabaseId: 1 }, { unique: true, sparse: true });
  
  // Virtual wallet indexes
  await db.collection("walletTransactions").createIndex({ userId: 1, createdAt: -1 });
  await db.collection("walletTransactions").createIndex({ txHash: 1 }, { unique: true, sparse: true });
  await db.collection("walletTransactions").createIndex({ type: 1, createdAt: -1 });
  await db.collection("walletTransactions").createIndex({ itemId: 1 });
  
  await db.collection("withdrawalRequests").createIndex({ userId: 1, createdAt: -1 });
  await db.collection("withdrawalRequests").createIndex({ status: 1, requestedAt: 1 });
  await db.collection("withdrawalRequests").createIndex({ txHash: 1 }, { unique: true, sparse: true });
  
  await db.collection("platformWallet").createIndex({ address: 1 }, { unique: true });

  await db.collection("featuredAssets").createIndex({ contractAddress: 1, tokenId: 1 }, { unique: true });
  await db.collection("featuredAssets").createIndex({ order: 1, updatedAt: -1 });

  await db.collection("featuredCollections").createIndex({ name: 1 }, { unique: true });
  await db.collection("featuredCollections").createIndex({ order: 1, updatedAt: -1 });

  await db.collection("heroBanners").createIndex({ key: 1 }, { unique: true });
  await db.collection("heroBanners").createIndex({ order: 1, updatedAt: -1 });
  
  globalThis.__cosmosMongoIndexesReady = true;
}

export async function getDb() {
  const client = await getMongoClient();
  const db = client.db(getMongoDbName());
  await ensureIndexes(db);
  return db;
}

function parseEncryptionKey() {
  const raw = process.env.COSMOS_WALLET_ENCRYPTION_KEY || process.env.OPENBAY_WALLET_ENCRYPTION_KEY;
  if (!raw) throw new Error("COSMOS_WALLET_ENCRYPTION_KEY is required");

  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
  const asBase64 = Buffer.from(raw, "base64");
  if (asBase64.length === 32) return asBase64;
  throw new Error("COSMOS_WALLET_ENCRYPTION_KEY must be 32 bytes (hex or base64)");
}

function encryptString(plaintext) {
  const key = parseEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${ciphertext.toString("base64")}`;
}

function decryptString(ciphertext) {
  const key = parseEncryptionKey();
  const [ivB64, tagB64, dataB64] = String(ciphertext || "").split(".");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Invalid encrypted payload");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(data), decipher.final()]);
  return plaintext.toString("utf8");
}

function normalizeEmail(email) {
  return email?.toLowerCase?.().trim?.() || null;
}

function normalizeWalletAddress(walletAddress) {
  return walletAddress?.toLowerCase?.().trim?.() || null;
}

export async function getUserById(userId) {
  if (!userId) return null;
  const db = await getDb();
  const _id = typeof userId === "string" ? new ObjectId(userId) : userId;
  return (await db.collection("users").findOne({ _id })) || null;
}

export async function getUserByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const db = await getDb();
  return (await db.collection("users").findOne({ email: normalized })) || null;
}

export async function getUserByWallet(walletAddress) {
  const normalized = normalizeWalletAddress(walletAddress);
  if (!normalized) return null;
  const db = await getDb();
  return (await db.collection("users").findOne({ walletAddress: normalized })) || null;
}

export async function createEmailPasswordUser({ email, passwordHash, name }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) throw new Error("email is required");
  if (!passwordHash) throw new Error("passwordHash is required");

  const db = await getDb();
  const existing = await db.collection("users").findOne({ email: normalizedEmail });
  if (existing) return existing;

  const now = new Date();
  await db.collection("users").insertOne({
    email: normalizedEmail,
    passwordHash,
    name: name || null,
    provider: "email",
    createdAt: now,
    updatedAt: now,
    welcomeSent: false,
  });

  return await db.collection("users").findOne({ email: normalizedEmail });
}

export async function upsertFirebaseUser({ firebaseUid, email, name }) {
  const normalizedEmail = normalizeEmail(email);
  if (!firebaseUid || !normalizedEmail) throw new Error("firebaseUid and email are required");

  const db = await getDb();
  const now = new Date();
  await db.collection("users").updateOne(
    { $or: [{ firebaseUid }, { email: normalizedEmail }] },
    {
      $set: {
        firebaseUid,
        email: normalizedEmail,
        name: name || null,
        provider: "google",
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now, welcomeSent: false },
    },
    { upsert: true }
  );

  return await db.collection("users").findOne({ email: normalizedEmail });
}

export async function upsertWalletUser({ walletAddress, email, name }) {
  const normalizedWallet = normalizeWalletAddress(walletAddress);
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedWallet) throw new Error("walletAddress is required");

  const db = await getDb();
  const now = new Date();
  await db.collection("users").updateOne(
    { walletAddress: normalizedWallet },
    {
      $set: {
        walletAddress: normalizedWallet,
        provider: "metamask",
        updatedAt: now,
        ...(normalizedEmail ? { email: normalizedEmail } : {}),
        ...(name ? { name } : {}),
      },
      $setOnInsert: { createdAt: now, welcomeSent: false },
    },
    { upsert: true }
  );

  return await db.collection("users").findOne({ walletAddress: normalizedWallet });
}

export async function markWelcomeSentByUserId(userId) {
  const db = await getDb();
  const _id = typeof userId === "string" ? new ObjectId(userId) : userId;
  await db.collection("users").updateOne({ _id }, { $set: { welcomeSent: true, updatedAt: new Date() } });
}

export async function ensureCustodialWalletForUserId(userId, { passphrase } = {}) {
  const db = await getDb();
  const _id = typeof userId === "string" ? new ObjectId(userId) : userId;
  const existing = await db.collection("users").findOne({ _id });
  if (!existing) throw new Error("User not found");

  if (existing.custodialWallet?.address) {
    return { created: false, address: existing.custodialWallet.address };
  }

  const baseWallet = ethers.Wallet.createRandom();
  const mnemonic = baseWallet?.mnemonic?.phrase;
  if (!mnemonic) throw new Error("Unable to generate mnemonic");

  const derivationPath = "m/44'/60'/0'/0/0";
  const hdNode = ethers.utils.HDNode.fromMnemonic(mnemonic, passphrase || undefined).derivePath(derivationPath);
  const wallet = new ethers.Wallet(hdNode.privateKey);

  const encryptedMnemonic = encryptString(mnemonic);
  const encryptedPassphrase = passphrase ? encryptString(passphrase) : null;
  const now = new Date();

  await db.collection("users").updateOne(
    { _id },
    {
      $set: {
        custodialWallet: {
          address: wallet.address,
          encryptedMnemonic,
          encryptedPassphrase,
          derivationPath,
          createdAt: now,
          mnemonicExportedAt: now,
        },
        updatedAt: now,
      },
    }
  );

  return { created: true, address: wallet.address, mnemonic };
}

export async function getCustodialWalletByUserId(userId) {
  const user = await getUserById(userId);
  return user?.custodialWallet || null;
}

export async function getCustodialWalletByWalletAddress(walletAddress) {
  const user = await getUserByWallet(walletAddress);
  return user?.custodialWallet || null;
}

export async function ensureCustodialWalletForWalletAddress(walletAddress, { passphrase } = {}) {
  const normalizedWallet = normalizeWalletAddress(walletAddress);
  if (!normalizedWallet) throw new Error("walletAddress is required");

  const user = (await getUserByWallet(normalizedWallet)) || (await upsertWalletUser({ walletAddress: normalizedWallet }));
  if (!user?._id) throw new Error("User not found");
  return await ensureCustodialWalletForUserId(user._id, { passphrase });
}

export async function getCustodialWalletSignerByUserId(userId, { rpcUrl } = {}) {
  const walletDoc = await getCustodialWalletByUserId(userId);
  if (!walletDoc?.encryptedMnemonic) return null;
  const mnemonic = decryptString(walletDoc.encryptedMnemonic);
  const passphrase = walletDoc.encryptedPassphrase ? decryptString(walletDoc.encryptedPassphrase) : undefined;
  const derivationPath = walletDoc.derivationPath || "m/44'/60'/0'/0/0";
  const hdNode = ethers.utils.HDNode.fromMnemonic(mnemonic, passphrase).derivePath(derivationPath);
  const wallet = new ethers.Wallet(hdNode.privateKey);
  const finalRpcUrl = rpcUrl || process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || null;
  if (!finalRpcUrl) return wallet;
  return wallet.connect(new ethers.providers.JsonRpcProvider(finalRpcUrl));
}

// ============================================================================
// Virtual Wallet Functions
// ============================================================================

/**
 * Initialize or get platform wallet document
 */
export async function getOrCreatePlatformWallet() {
  const db = await getDb();
  const cfg = await db.collection("platformConfig").findOne({ _id: "platform" });
  const address = cfg?.platformWalletAddress || process.env.PLATFORM_WALLET_ADDRESS;
  if (!address) throw new Error("PLATFORM_WALLET_ADDRESS is required");

  const normalized = normalizeWalletAddress(address);
  if (!normalized) throw new Error("Invalid platform wallet address");
  let platformWallet = await db.collection("platformWallet").findOne({ address: normalized });
  
  if (!platformWallet) {
    const now = new Date();
    platformWallet = {
      address: normalized,
      chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "1", 10),
      totalBalance: 0,
      userBalances: 0,
      platformRevenue: 0,
      reservedForWithdrawals: 0,
      lastReconciled: now,
      discrepancy: 0,
      dailyWithdrawalLimit: parseFloat(process.env.DAILY_WITHDRAWAL_LIMIT || "50"),
      dailyWithdrawalUsed: 0,
      lastLimitReset: now,
      minimumBalance: parseFloat(process.env.MINIMUM_PLATFORM_BALANCE || "10"),
      alertEmail: process.env.ADMIN_EMAIL || null,
      lastAlertSent: null,
      createdAt: now,
      updatedAt: now,
    };
    await db.collection("platformWallet").insertOne(platformWallet);
  }
  
  return platformWallet;
}

/**
 * Initialize virtual balance for user (call on user creation/login)
 */
export async function initializeUserVirtualBalance(userId) {
  const db = await getDb();
  const _id = typeof userId === "string" ? new ObjectId(userId) : userId;
  const user = await db.collection("users").findOne({ _id });
  if (!user) throw new Error("User not found");
  
  const now = new Date();
  const update = {
    $setOnInsert: {
      virtualBalance: 0,
      totalDeposited: 0,
      totalWithdrawn: 0,
      totalEarned: 0,
      totalSpent: 0,
      lastWithdrawal: null,
      withdrawalNonce: 0,
      kycVerified: false,
    },
    $set: { updatedAt: now },
  };
  
  await db.collection("users").updateOne({ _id }, update);
  return await db.collection("users").findOne({ _id });
}

/**
 * Get user virtual balance
 */
export async function getUserVirtualBalance(userId) {
  const user = await getUserById(userId);
  if (!user) return null;
  
  return {
    walletAddress: user.walletAddress,
    virtualBalance: user.virtualBalance || 0,
    totalDeposited: user.totalDeposited || 0,
    totalWithdrawn: user.totalWithdrawn || 0,
    totalEarned: user.totalEarned || 0,
    totalSpent: user.totalSpent || 0,
  };
}

/**
 * Create wallet transaction record
 */
export async function createWalletTransaction(transaction, session = null) {
  const db = await getDb();
  const now = new Date();
  
  const tx = {
    type: transaction.type, // "deposit" | "withdrawal" | "purchase" | "sale" | "platform_fee" | "royalty" | "refund"
    userId: normalizeWalletAddress(transaction.userId),
    counterpartyId: transaction.counterpartyId ? normalizeWalletAddress(transaction.counterpartyId) : null,
    amount: parseFloat(transaction.amount),
    platformFee: transaction.platformFee ? parseFloat(transaction.platformFee) : 0,
    royaltyFee: transaction.royaltyFee ? parseFloat(transaction.royaltyFee) : 0,
    netAmount: transaction.netAmount ? parseFloat(transaction.netAmount) : transaction.amount,
    balanceBefore: parseFloat(transaction.balanceBefore),
    balanceAfter: parseFloat(transaction.balanceAfter),
    itemId: transaction.itemId ? (typeof transaction.itemId === "string" ? new ObjectId(transaction.itemId) : transaction.itemId) : null,
    txHash: transaction.txHash || null,
    status: transaction.status || "completed",
    blockNumber: transaction.blockNumber || null,
    gasUsed: transaction.gasUsed || null,
    confirmations: transaction.confirmations || null,
    description: transaction.description || null,
    ipAddress: transaction.ipAddress || null,
    userAgent: transaction.userAgent || null,
    createdAt: transaction.createdAt || now,
    completedAt: transaction.completedAt || (transaction.status === "completed" ? now : null),
    failedAt: transaction.failedAt || null,
    errorMessage: transaction.errorMessage || null,
    retryCount: transaction.retryCount || 0,
  };
  
  if (tx.txHash) {
    // Check for duplicate
    const existing = await db.collection("walletTransactions").findOne({ txHash: tx.txHash }, session ? { session } : undefined);
    if (existing) return existing;
  }
  
  const result = await db.collection("walletTransactions").insertOne(tx, session ? { session } : undefined);
  return await db.collection("walletTransactions").findOne({ _id: result.insertedId }, session ? { session } : undefined);
}

/**
 * Get user wallet transactions
 */
export async function getUserWalletTransactions(userId, { page = 1, limit = 20, type = "all" } = {}) {
  const db = await getDb();
  const user = await getUserById(userId);
  if (!user?.walletAddress) return { transactions: [], pagination: { currentPage: 1, totalPages: 0, totalRecords: 0, hasMore: false } };
  
  const normalizedWallet = normalizeWalletAddress(user.walletAddress);
  const query = { userId: normalizedWallet };
  if (type !== "all") query.type = type;
  
  const skip = (page - 1) * limit;
  const [transactions, totalRecords] = await Promise.all([
    db.collection("walletTransactions")
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection("walletTransactions").countDocuments(query),
  ]);
  
  return {
    transactions,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalRecords / limit),
      totalRecords,
      hasMore: skip + transactions.length < totalRecords,
    },
  };
}

/**
 * Create withdrawal request
 */
export async function createWithdrawalRequest(request) {
  const db = await getDb();
  const user = await getUserById(request.userId);
  if (!user) throw new Error("User not found");
  
  const normalizedWallet = normalizeWalletAddress(user.walletAddress);
  const destinationAddress = normalizeWalletAddress(request.destinationAddress || normalizedWallet);
  
  const now = new Date();
  const withdrawal = {
    userId: normalizedWallet,
    userEmail: user.email || null,
    amount: parseFloat(request.amount),
    destinationAddress,
    status: "pending",
    approvedBy: null,
    approvedAt: null,
    processedAt: null,
    txHash: null,
    gasPrice: null,
    gasCost: null,
    blockNumber: null,
    confirmations: null,
    ipAddress: request.ipAddress || null,
    twoFactorVerified: false,
    securityLevel: request.amount > 10 ? "enhanced" : "standard",
    failureReason: null,
    retryCount: 0,
    maxRetries: 3,
    requestedAt: now,
    completedAt: null,
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24 hours
  };
  
  const result = await db.collection("withdrawalRequests").insertOne(withdrawal);
  return await db.collection("withdrawalRequests").findOne({ _id: result.insertedId });
}

/**
 * Get withdrawal request by ID
 */
export async function getWithdrawalRequest(withdrawalId) {
  const db = await getDb();
  const _id = typeof withdrawalId === "string" ? new ObjectId(withdrawalId) : withdrawalId;
  return await db.collection("withdrawalRequests").findOne({ _id });
}

/**
 * Get pending withdrawals for processing
 */
export async function getPendingWithdrawals({ limit = 10, minWaitMs = 60000 } = {}) {
  const db = await getDb();
  const cutoffTime = new Date(Date.now() - minWaitMs);
  
  return await db
    .collection("withdrawalRequests")
    .find({
      status: "pending",
      requestedAt: { $lt: cutoffTime },
    })
    .sort({ requestedAt: 1 })
    .limit(limit)
    .toArray();
}

/**
 * Update withdrawal request status
 */
export async function updateWithdrawalRequest(withdrawalId, updates) {
  const db = await getDb();
  const _id = typeof withdrawalId === "string" ? new ObjectId(withdrawalId) : withdrawalId;
  
  const updateDoc = {
    $set: {
      ...updates,
      updatedAt: new Date(),
    },
  };
  
  await db.collection("withdrawalRequests").updateOne({ _id }, updateDoc);
  return await db.collection("withdrawalRequests").findOne({ _id });
}

/**
 * Get platform wallet signer (for withdrawals)
 */
export async function getPlatformWalletSigner({ rpcUrl } = {}) {
  const privateKey = process.env.PLATFORM_WALLET_PRIVATE_KEY;
  if (!privateKey) throw new Error("PLATFORM_WALLET_PRIVATE_KEY is required");
  
  const wallet = new ethers.Wallet(privateKey);
  const finalRpcUrl = rpcUrl || process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || null;
  if (!finalRpcUrl) return wallet;
  return wallet.connect(new ethers.providers.JsonRpcProvider(finalRpcUrl));
}

/**
 * Atomic balance update (for purchases/sales)
 */
export async function updateUserBalances(updates, session = null) {
  const db = await getDb();
  const operations = [];
  
  for (const update of updates) {
    const normalizedWallet = normalizeWalletAddress(update.userId);
    const updateDoc = {
      $inc: {},
      $set: { updatedAt: new Date() },
    };
    
    if (update.virtualBalance !== undefined) {
      updateDoc.$inc.virtualBalance = update.virtualBalance;
    }
    if (update.totalDeposited !== undefined) {
      updateDoc.$inc.totalDeposited = update.totalDeposited;
    }
    if (update.totalWithdrawn !== undefined) {
      updateDoc.$inc.totalWithdrawn = update.totalWithdrawn;
    }
    if (update.totalEarned !== undefined) {
      updateDoc.$inc.totalEarned = update.totalEarned;
    }
    if (update.totalSpent !== undefined) {
      updateDoc.$inc.totalSpent = update.totalSpent;
    }
    if (update.lastWithdrawal !== undefined) {
      updateDoc.$set.lastWithdrawal = update.lastWithdrawal;
    }
    if (update.withdrawalNonce !== undefined) {
      updateDoc.$inc.withdrawalNonce = update.withdrawalNonce;
    }
    
    operations.push({
      updateOne: {
        filter: { walletAddress: normalizedWallet },
        update: updateDoc,
        upsert: false,
      },
    });
  }
  
  if (operations.length === 0) return;
  
  if (session) {
    await db.collection("users").bulkWrite(operations, { session });
  } else {
    await db.collection("users").bulkWrite(operations);
  }
}

/**
 * Update platform wallet balance
 */
export async function updatePlatformWalletBalance(updates, session = null) {
  const db = await getDb();
  const platformWallet = await getOrCreatePlatformWallet();
  
  const updateDoc = {
    $inc: {},
    $set: { updatedAt: new Date() },
  };
  
  if (updates.totalBalance !== undefined) {
    updateDoc.$inc.totalBalance = updates.totalBalance;
  }
  if (updates.userBalances !== undefined) {
    updateDoc.$inc.userBalances = updates.userBalances;
  }
  if (updates.platformRevenue !== undefined) {
    updateDoc.$inc.platformRevenue = updates.platformRevenue;
  }
  if (updates.reservedForWithdrawals !== undefined) {
    updateDoc.$inc.reservedForWithdrawals = updates.reservedForWithdrawals;
  }
  if (updates.dailyWithdrawalUsed !== undefined) {
    updateDoc.$inc.dailyWithdrawalUsed = updates.dailyWithdrawalUsed;
  }
  
  if (session) {
    await db.collection("platformWallet").updateOne({ address: platformWallet.address }, updateDoc, { session });
  } else {
    await db.collection("platformWallet").updateOne({ address: platformWallet.address }, updateDoc);
  }
  
  return await db.collection("platformWallet").findOne({ address: platformWallet.address });
}
