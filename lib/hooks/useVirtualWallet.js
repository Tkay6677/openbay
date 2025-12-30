"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

/**
 * Hook for virtual wallet operations
 */
export function useVirtualWallet() {
  const { data: session, status } = useSession();
  const [balance, setBalance] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const userId = session?.user?.id || null;

  const fetchBalance = useCallback(async () => {
    // Wait for session to load - don't fetch during loading
    if (status === "loading") {
      setIsLoading(true);
      return null;
    }

    // Don't fetch if not authenticated
    if (status === "unauthenticated" || !userId) {
      setBalance(null);
      setError(null);
      setIsLoading(false);
      return null;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/wallet/balance");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const errorMsg = data.error || `Failed to fetch balance (${res.status})`;
        
        if (res.status === 401) {
          if (status === "authenticated" && userId) {
            setError("Session expired. Please sign in again.");
          } else {
            setError(null);
          }
          setBalance(null);
          return null;
        }
        
        setError(errorMsg);
        return null;
      }
      const data = await res.json();
      setBalance(data);
      return data;
    } catch (err) {
      // Only set error if it's not an auth error
      if (!err.message?.includes("Unauthorized") && !err.message?.includes("401")) {
        setError(err.message);
      } else {
        if (status === "authenticated" && userId) {
          setError("Session expired. Please sign in again.");
        } else {
          setError(null);
        }
        setBalance(null);
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [status, userId]);

  useEffect(() => {
    // Only fetch if authenticated, skip during loading or unauthenticated
    if (status === "authenticated" && userId) {
      fetchBalance();
    } else if (status === "unauthenticated") {
      // Explicitly set state when unauthenticated
      setBalance(null);
      setError(null);
      setIsLoading(false);
    } else if (status === "authenticated" && !userId) {
      setBalance(null);
      setError(null);
      setIsLoading(false);
    }
  }, [fetchBalance, status, userId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onRefetch = () => {
      fetchBalance();
    };
    window.addEventListener("cosmos:wallet:refetch", onRefetch);
    return () => {
      window.removeEventListener("cosmos:wallet:refetch", onRefetch);
    };
  }, [fetchBalance]);

  return {
    balance,
    isLoading,
    error,
    refetch: fetchBalance,
  };
}

/**
 * Hook for wallet transactions
 */
export function useWalletTransactions({ page = 1, limit = 20, type = "all" } = {}) {
  const { data: session, status } = useSession();
  const userId = session?.user?.id || null;
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTransactions = useCallback(async () => {
    // Wait for session to load - don't fetch during loading
    if (status === "loading") {
      setIsLoading(true);
      return;
    }

    // Don't fetch if not authenticated
    if (status === "unauthenticated" || !userId) {
      setTransactions([]);
      setPagination(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      if (type !== "all") params.append("type", type);
      
      const res = await fetch(`/api/wallet/transactions?${params}`);
      if (!res.ok) {
        if (res.status === 401) {
          setTransactions([]);
          setPagination(null);
          setError(null);
          return;
        }
        const data = await res.json();
        setError(data.error || "Failed to fetch transactions");
        return;
      }
      const data = await res.json();
      setTransactions(data.transactions);
      setPagination(data.pagination);
      return data;
    } catch (err) {
      if (!err.message?.includes("Unauthorized") && !err.message?.includes("401")) {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, type, status, userId]);

  useEffect(() => {
    // Only fetch if authenticated, skip during loading or unauthenticated
    if (status === "authenticated" && userId) {
      fetchTransactions();
    } else if (status === "unauthenticated") {
      // Explicitly set state when unauthenticated
      setTransactions([]);
      setPagination(null);
      setError(null);
      setIsLoading(false);
    } else if (status === "authenticated" && !userId) {
      setTransactions([]);
      setPagination(null);
      setError(null);
      setIsLoading(false);
    }
  }, [fetchTransactions, status, userId]);

  return {
    transactions,
    pagination,
    isLoading,
    error,
    refetch: fetchTransactions,
  };
}

/**
 * Hook for deposit operations
 */
export function useDeposit() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id || null;
  const [depositAddress, setDepositAddress] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDepositAddress = useCallback(async () => {
    // Wait for session to load - don't fetch during loading
    if (status === "loading") {
      setIsLoading(true);
      return null;
    }

    // Don't fetch if not authenticated
    if (status === "unauthenticated" || !userId) {
      setDepositAddress(null);
      setError(null);
      setIsLoading(false);
      return null;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/wallet/deposit-address");
      if (!res.ok) {
        if (res.status === 401) {
          setDepositAddress(null);
          setError(null);
          return null;
        }
        const data = await res.json();
        setError(data.error || "Failed to fetch deposit address");
        return null;
      }
      const data = await res.json();
      setDepositAddress(data);
      return data;
    } catch (err) {
      if (!err.message?.includes("Unauthorized") && !err.message?.includes("401")) {
        setError(err.message);
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [status, userId]);

  return {
    depositAddress,
    isLoading,
    error,
    fetchDepositAddress,
  };
}

/**
 * Hook for withdrawal operations
 */
export function useWithdrawal() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [withdrawalId, setWithdrawalId] = useState(null);

  const submitWithdrawal = useCallback(async (amount, destinationAddress = null) => {
    setIsSubmitting(true);
    setError(null);
    setWithdrawalId(null);
    try {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, destinationAddress }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to submit withdrawal");
      }
      setWithdrawalId(data.withdrawalId);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const checkWithdrawalStatus = useCallback(async (id) => {
    try {
      const res = await fetch(`/api/wallet/withdrawal/${id}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to check withdrawal status");
      }
      return await res.json();
    } catch (err) {
      throw err;
    }
  }, []);

  return {
    isSubmitting,
    error,
    withdrawalId,
    submitWithdrawal,
    checkWithdrawalStatus,
  };
}
