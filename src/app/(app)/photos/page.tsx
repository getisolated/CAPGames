import { createClient } from "@/lib/supabase/server";
import { GalleryView } from "./gallery-view";
import type { Photo, PhotoAlbum } from "@/lib/supabase/types";

export default async function PhotosPage() {
  const supabase = await createClient();

  const [{ data: albums }, { data: photos }] = await Promise.all([
    supabase.from("photo_albums").select("*").order("position"),
    supabase
      .from("photos")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
  ]);

  // Génère des URL signées pour chaque photo (bucket privé)
  const photosWithUrl = await Promise.all(
    (photos ?? []).map(async (p) => {
      const { data } = await supabase.storage
        .from("photos")
        .createSignedUrl(p.storage_path, 60 * 60 * 4); // 4h
      return { ...p, url: data?.signedUrl ?? null };
    })
  );

  return (
    <GalleryView
      albums={(albums ?? []) as PhotoAlbum[]}
      photos={photosWithUrl as (Photo & { url: string | null })[]}
    />
  );
}
