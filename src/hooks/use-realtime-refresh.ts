"use client";

import { useEffect, useRef } from "react";

/**
 * Filet de fiabilité pour les abonnements Supabase Realtime.
 *
 * Les événements `postgres_changes` peuvent être manqués : WebSocket mis en
 * veille par le navigateur mobile (écran verrouillé / onglet en arrière-plan),
 * connexion à moitié morte, reconnexion silencieuse… Sans rattrapage, l'écran
 * reste figé jusqu'à un rafraîchissement manuel de la page.
 *
 * Ce hook rappelle `refresh` :
 *  - au retour au premier plan (visibilitychange / focus)
 *  - à la reconnexion réseau (online)
 *  - périodiquement tant que l'onglet est visible (polling de secours)
 *
 * `intervalMs <= 0` désactive le polling (rattrapage événementiel uniquement).
 */
export function useRealtimeRefresh(refresh: () => void, intervalMs = 3000) {
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  });

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };
    const start = () => {
      if (timer || intervalMs <= 0) return;
      timer = setInterval(() => {
        if (document.visibilityState === "visible") refreshRef.current();
      }, intervalMs);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshRef.current();
        start();
      } else {
        stop();
      }
    };
    const onReconnect = () => refreshRef.current();

    start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onReconnect);
    window.addEventListener("focus", onReconnect);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onReconnect);
      window.removeEventListener("focus", onReconnect);
    };
  }, [intervalMs]);
}
