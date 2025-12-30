"use client";
import { useAddress, useMetamask, useCoinbaseWallet, useWalletConnect, useDisconnect, useBalance } from "@thirdweb-dev/react";
import { useState } from "react";

/**
 * Custom hook for wallet connection functionality (thirdweb v4.x)
 */
export function useWalletConnection() {
  const address = useAddress();
  const connectWithMetamask = useMetamask();
  const connectWithCoinbase = useCoinbaseWallet();
  const connectWithWalletConnect = useWalletConnect();
  const disconnect = useDisconnect();
  const { data: balance, isLoading: balanceLoading } = useBalance();
  const [isConnecting, setIsConnecting] = useState(false);

  const connectWallet = async (walletId = "metamask") => {
    try {
      setIsConnecting(true);
      let wallet;
      
      switch (walletId.toLowerCase()) {
        case "metamask":
          wallet = await connectWithMetamask();
          break;
        case "coinbase":
        case "coinbasewallet":
          wallet = await connectWithCoinbase();
          break;
        case "walletconnect":
          wallet = await connectWithWalletConnect();
          break;
        default:
          // Default to MetaMask
          wallet = await connectWithMetamask();
      }
      
      return wallet;
    } catch (error) {
      console.error("Error connecting wallet:", error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
      throw error;
    }
  };

  return {
    address,
    isConnected: !!address,
    connectWallet,
    disconnectWallet,
    balance: balance?.displayValue || "0",
    balanceSymbol: balance?.symbol || "ETH",
    balanceLoading,
    isConnecting,
  };
}

