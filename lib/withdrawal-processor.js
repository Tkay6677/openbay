/**
 * Withdrawal Processor
 * 
 * This module handles automatic processing of withdrawal requests.
 * It should be called periodically (e.g., via cron job or scheduled task).
 */

import {
  getPendingWithdrawals,
  updateWithdrawalRequest,
  getUserByWallet,
  createWalletTransaction,
  updateUserBalances,
  updatePlatformWalletBalance,
  getPlatformWalletSigner,
  getOrCreatePlatformWallet,
  getDb,
} from "./db";
import { ethers } from "ethers";

/**
 * Process a single withdrawal request
 */
export async function processWithdrawal(withdrawal) {
  const db = await getDb();
  const session = await db.client.startSession();

  try {
    let result;
    await session.withTransaction(async () => {
      // 1. Mark as processing
      await updateWithdrawalRequest(withdrawal._id, {
        status: "processing",
        processedAt: new Date(),
      });

      // 2. Get platform wallet signer
      const signer = await getPlatformWalletSigner();
      if (!signer.provider) {
        throw new Error("RPC_URL is required for withdrawals");
      }

      // 3. Send ETH from platform wallet
      const value = ethers.utils.parseEther(withdrawal.amount.toString());
      const tx = await signer.sendTransaction({
        to: withdrawal.destinationAddress,
        value,
        gasLimit: 21000,
      });

      // 4. Wait for confirmation (3 confirmations)
      const receipt = await tx.wait(3);

      if (receipt.status === 1) {
        // 5. Get user
        const user = await getUserByWallet(withdrawal.userId);
        if (!user) throw new Error("User not found");

        const balanceBefore = user.virtualBalance || 0;
        const balanceAfter = balanceBefore - withdrawal.amount;

        // 6. Update withdrawal record
        await updateWithdrawalRequest(withdrawal._id, {
          status: "completed",
          txHash: receipt.hash,
          gasPrice: receipt.effectiveGasPrice.toString(),
          gasCost: parseFloat(ethers.utils.formatEther(receipt.gasUsed.mul(receipt.effectiveGasPrice))),
          blockNumber: receipt.blockNumber,
          confirmations: receipt.confirmations,
          completedAt: new Date(),
        });

        // 7. Deduct from user balance
        await updateUserBalances(
          [
            {
              userId: withdrawal.userId,
              virtualBalance: -withdrawal.amount,
              totalWithdrawn: withdrawal.amount,
              lastWithdrawal: new Date(),
            },
          ],
          session
        );

        // 8. Update platform wallet
        await updatePlatformWalletBalance(
          {
            totalBalance: -withdrawal.amount,
            userBalances: -withdrawal.amount,
            dailyWithdrawalUsed: withdrawal.amount,
          },
          session
        );

        // 9. Create transaction record
        await createWalletTransaction({
          type: "withdrawal",
          userId: withdrawal.userId,
          amount: withdrawal.amount,
          balanceBefore,
          balanceAfter,
          txHash: receipt.hash,
          status: "completed",
          blockNumber: receipt.blockNumber,
          confirmations: receipt.confirmations,
          gasUsed: receipt.gasUsed.toString(),
          description: `Withdrew ${withdrawal.amount} ETH to ${withdrawal.destinationAddress}`,
          createdAt: withdrawal.requestedAt,
          completedAt: new Date(),
        });

        result = { success: true, txHash: receipt.hash };
      } else {
        throw new Error("Transaction failed on blockchain");
      }
    });

    return result;
  } catch (error) {
    // Handle failure
    await updateWithdrawalRequest(withdrawal._id, {
      status: "failed",
      failureReason: error.message,
      failedAt: new Date(),
      retryCount: (withdrawal.retryCount || 0) + 1,
    });

    throw error;
  } finally {
    await session.endSession();
  }
}

/**
 * Process all pending withdrawals
 */
export async function processPendingWithdrawals({ limit = 10, minWaitMs = 60000 } = {}) {
  try {
    // Get pending withdrawals
    const pendingWithdrawals = await getPendingWithdrawals({ limit, minWaitMs });

    if (pendingWithdrawals.length === 0) {
      return {
        success: true,
        message: "No pending withdrawals to process",
        processed: 0,
        results: [],
      };
    }

    // Process each withdrawal
    const results = [];
    for (const withdrawal of pendingWithdrawals) {
      try {
        const result = await processWithdrawal(withdrawal);
        results.push({
          withdrawalId: withdrawal._id.toString(),
          status: "completed",
          txHash: result.txHash,
        });
      } catch (error) {
        console.error(`Failed to process withdrawal ${withdrawal._id}:`, error);
        results.push({
          withdrawalId: withdrawal._id.toString(),
          status: "failed",
          error: error.message,
        });
      }
    }

    return {
      success: true,
      processed: results.length,
      results,
    };
  } catch (error) {
    console.error("Error processing withdrawals:", error);
    throw error;
  }
}

/**
 * Reset daily withdrawal limits (call this daily at midnight)
 */
export async function resetDailyWithdrawalLimits() {
  const db = await getDb();
  const platformWallet = await getOrCreatePlatformWallet();

  await db.collection("platformWallet").updateOne(
    { address: platformWallet.address },
    {
      $set: {
        dailyWithdrawalUsed: 0,
        lastLimitReset: new Date(),
        updatedAt: new Date(),
      },
    }
  );

  return { success: true };
}
