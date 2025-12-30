"use client";
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Hook for NextAuth authentication
 */
export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(status === "loading");

  useEffect(() => {
    setIsLoading(status === "loading");
  }, [status]);

  const login = async (provider = "credentials", credentials = {}) => {
    try {
      // For OAuth providers, use redirect
      if (provider === "google") {
        await signIn(provider, {
          callbackUrl: credentials.callbackUrl || "/",
        });
        return { ok: true };
      }
      
      // For credentials, use redirect: false
      const result = await signIn(provider, {
        redirect: false,
        ...credentials,
      });
      return result;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut({ redirect: false });
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  return {
    session,
    user: session?.user || null,
    isAuthenticated: !!session?.user?.id,
    isLoading,
    login,
    logout,
  };
}
