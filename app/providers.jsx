"use client";

import { SessionProvider } from "next-auth/react";
import { ThirdwebProvider } from "@thirdweb-dev/react";
import { Ethereum, Goerli, Mumbai, Polygon, Sepolia } from "@thirdweb-dev/chains";

export default function Providers({ children }) {
  const rawChain = process.env.NEXT_PUBLIC_CHAIN || "sepolia";
  const chainKey = rawChain.trim().toLowerCase();

  const chain =
    chainKey === "ethereum" || chainKey === "mainnet" || chainKey === "eth"
      ? Ethereum
      : chainKey === "polygon" || chainKey === "matic"
        ? Polygon
        : chainKey === "mumbai"
          ? Mumbai
          : chainKey === "goerli"
            ? Goerli
            : Sepolia;
  const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;

  if (typeof window !== "undefined" && !window.__cosmosThirdwebTelemetryPatched) {
    window.__cosmosThirdwebTelemetryPatched = true;
    const originalFetch = window.fetch?.bind(window);
    if (originalFetch) {
      window.fetch = async (input, init) => {
        const url = typeof input === "string" ? input : input?.url;
        if (url && url.includes("https://c.thirdweb.com/event")) {
          try {
            return await originalFetch(input, init);
          } catch {
            return new Response(null, { status: 204 });
          }
        }
        return await originalFetch(input, init);
      };
    }
  }

  if (typeof window !== "undefined" && !window.__cosmosBrandBridgePatched) {
    window.__cosmosBrandBridgePatched = true;
    try {
      const legacyApproved = window.localStorage?.getItem?.("openbay.marketplaceApproved") === "1";
      const cosmosApproved = window.localStorage?.getItem?.("cosmos.marketplaceApproved") === "1";
      if (legacyApproved && !cosmosApproved) window.localStorage.setItem("cosmos.marketplaceApproved", "1");
    } catch {}

    window.addEventListener("openbay:wallet:refetch", () => {
      window.dispatchEvent(new Event("cosmos:wallet:refetch"));
    });
  }

  return (
    <SessionProvider>
      <ThirdwebProvider
        supportedChains={[chain]}
        activeChain={chain}
        clientId={clientId}
        sdkOptions={rpcUrl ? { rpcUrl } : undefined}
      >
        {children}
      </ThirdwebProvider>
    </SessionProvider>
  );
}
