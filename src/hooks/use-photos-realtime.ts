"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import type { Photo } from "@/lib/supabase/types";

export type PhotoWithUrl = Photo & { url: string | null };

/**
 * Maintient la liste des photos approuvées à jour en temps réel.
 * Re-signe les URLs côté client à chaque changement de la table photos
 * (nouvelle photo approuvée, suppression, déplacement d'album…).
 */
export function usePhotosRealtime(initial: PhotoWithUrl[]) {
  const [supabase] = useState(() => createClient());
  const [photos, setPhotos] = useState<PhotoWithUrl[]>(initial);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("photos")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    const rows = (data ?? []) as Photo[];
    const withUrls = await Promise.all(
      rows.map(async (p) => {
        const { data: signed } = await supabase.storage
          .from("photos")
          .createSignedUrl(p.storage_path, 60 * 60 * 4);
        return { ...p, url: signed?.signedUrl ?? null } as PhotoWithUrl;
      })
    );
    setPhotos(withUrls);
  }, [supabase]);

  useEffect(() => {
    const channel = supabase
      .channel("photos-gallery")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "photos" },
        () => refresh()
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") refresh();
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, refresh]);

  // Rattrapage au réveil/reconnexion seulement (le refresh re-signe toutes les
  // URLs → pas de polling périodique ici).
  useRealtimeRefresh(refresh, 0);

  return photos;
}
