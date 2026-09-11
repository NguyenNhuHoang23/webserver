"use client";

import { useEffect, useState } from "react";
import { AUTH_EVENT, readSession, type AuthSession } from "@/lib/auth";

export function useAuth() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setSession(readSession());
    sync();
    setReady(true);
    window.addEventListener(AUTH_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(AUTH_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { session, ready };
}
