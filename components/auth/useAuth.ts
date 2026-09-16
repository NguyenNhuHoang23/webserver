"use client";

import { useEffect, useState } from "react";
import { AUTH_EVENT, hydrateSession, type AuthSession } from "@/lib/auth";

export function useAuth() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const sync = () => {
      void hydrateSession().then((next) => {
        if (active) setSession(next);
      }).catch(() => {
        if (active) setSession(null);
      });
    };
    sync();
    void hydrateSession().finally(() => {
      if (active) setReady(true);
    });
    window.addEventListener(AUTH_EVENT, sync);
    return () => {
      active = false;
      window.removeEventListener(AUTH_EVENT, sync);
    };
  }, []);

  return { session, ready };
}
