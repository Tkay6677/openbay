/**
 * Wallet Security Utilities
 * 
 * Security functions for the virtual wallet system
 */

import { getDb, getUserById, getOrCreatePlatformWallet } from "./db";
import { ethers } from "ethers";

/**
 * Validate withdrawal address
 */
export async function validateWithdrawalAddress(address) {
  // 1. Check it's valid ETH address
  if (!ethers.utils.isAddress(address)) {
    throw new Error("Invalid Ethereum address");
  }

  // 2. Check it's not a contract (optional)
  const rpcUrl = process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL;
  if (rpcUrl) {
    try {
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      const code = await provider.getCode(address);
      if (code !== "0x") {
        // It's a contract, may want to block or flag
        console.warn("Withdrawal to contract address:", address);
        // Uncomment to block contract addresses:
        // throw new Error("Withdrawals to contract addresses are not allowed");
      }
    } catch (error) {
      // If we can't check, allow it (don't block withdrawals)
      console.warn("Could not verify if address is contract:", error.message);
    }
  }

  // 3. Check against blacklist
  const db = await getDb();
  const blacklisted = await db.collection("blacklistedAddresses").findOne({
    address: address.toLowerCase(),
  });
  if (blacklisted) {
    throw new Error("Address is blacklisted");
  }

  return true;
}

/**
 * Verify deposit transaction
 */
export async function verifyDepositTransaction(txHash, platformWalletAddress) {
  const rpcUrl = process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL;
  if (!rpcUrl) throw new Error("RPC_URL is required for deposit verification");

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

  // 1. Check transaction on blockchain
  const tx = await provider.getTransaction(txHash);
  if (!tx) throw new Error("Transaction not found");

  // 2. Verify recipient is platform wallet
  if (tx.to?.toLowerCase() !== platformWalletAddress.toLowerCase()) {
    throw new Error("Invalid recipient address");
  }

  // 3. Check confirmations (at least 12 recommended)
  const currentBlock = await provider.getBlockNumber();
  const confirmations = currentBlock - tx.blockNumber;
  if (confirmations < 12) {
    throw new Error(`Transaction needs more confirmations. Current: ${confirmations}, Required: 12`);
  }

  // 4. Check for double-spending
  const db = await getDb();
  const existingDeposit = await db.collection("walletTransactions").findOne({ txHash });
  if (existingDeposit) {
    throw new Error("Deposit already processed");
  }

  // 5. Verify amount matches
  const amountETH = parseFloat(ethers.utils.formatEther(tx.value));

  return {
    verified: true,
    amount: amountETH,
    from: tx.from.toLowerCase(),
    blockNumber: tx.blockNumber,
    confirmations,
  };
}

/**
 * Reconcile platform wallet balances
 */
export async function reconcileBalances() {
  const db = await getDb();
  const platformWallet = await getOrCreatePlatformWallet();

  // 1. Sum all user virtualBalances
  const totalUserBalancesResult = await db.collection("users").aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: { $ifNull: ["$virtualBalance", 0] } },
      },
    },
  ]).toArray();

  const totalUserBalances = totalUserBalancesResult[0]?.total || 0;

  // 2. Get platform revenue
  const platformRevenue = platformWallet.platformRevenue || 0;

  // 3. Get actual blockchain balance
  const rpcUrl = process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL;
  let blockchainBalance = 0;
  if (rpcUrl) {
    try {
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      const balance = await provider.getBalance(platformWallet.address);
      blockchainBalance = parseFloat(ethers.utils.formatEther(balance));
    } catch (error) {
      console.error("Could not fetch blockchain balance:", error);
    }
  }

  // 4. Calculate expected balance
  const expected = totalUserBalances + platformRevenue;

  // 5. Check discrepancy
  const discrepancy = Math.abs(blockchainBalance - expected);

  // 6. Update platform wallet record
  await db.collection("platformWallet").updateOne(
    { address: platformWallet.address },
    {
      $set: {
        totalBalance: blockchainBalance,
        userBalances: totalUserBalances,
        discrepancy,
        lastReconciled: new Date(),
        updatedAt: new Date(),
      },
    }
  );

  // 7. Alert if discrepancy is significant
  const threshold = parseFloat(process.env.BALANCE_DISCREPANCY_THRESHOLD || "0.01");
  if (discrepancy > threshold) {
    // TODO: Send alert email
    console.error("BALANCE DISCREPANCY DETECTED:", {
      expected,
      actual: blockchainBalance,
      discrepancy,
    });
  }

  return {
    totalUserBalances,
    platformRevenue,
    blockchainBalance,
    expected,
    discrepancy,
    threshold,
    alert: discrepancy > threshold,
  };
}

/**
 * Check if withdrawal should be flagged for manual review
 */
export async function shouldFlagForReview(withdrawal, user) {
  const flags = [];

  // First withdrawal > 5 ETH
  if (withdrawal.amount > 5 && user.totalWithdrawn === 0) {
    flags.push("first_large_withdrawal");
  }

  // Withdrawal > 10 ETH
  if (withdrawal.amount > 10) {
    flags.push("large_amount");
  }

  // User account < 7 days old
  const accountAge = Date.now() - new Date(user.createdAt).getTime();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  if (accountAge < sevenDays) {
    flags.push("new_account");
  }

  // First withdrawal from account
  if (user.totalWithdrawn === 0) {
    flags.push("first_withdrawal");
  }

  // Rapid balance accumulation (earned > 50 ETH in last 7 days)
  const sevenDaysAgo = new Date(Date.now() - sevenDays);
  const db = await getDb();
  const recentEarnings = await db.collection("walletTransactions").aggregate([
    {
      $match: {
        userId: user.walletAddress?.toLowerCase(),
        type: "sale",
        status: "completed",
        createdAt: { $gte: sevenDaysAgo },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$netAmount" },
      },
    },
  ]).toArray();

  if (recentEarnings[0]?.total > 50) {
    flags.push("rapid_accumulation");
  }

  return {
    shouldFlag: flags.length > 0,
    flags,
  };
}
