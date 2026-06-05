import { createClient } from "@/lib/supabase/server";
import { GalleryView } from "./gallery-view";
import type { PhotoWithUrl } from "@/hooks/use-photos-realtime";
import type { PhotoAlbum } from "@/lib/supabase/types";

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

  // URL signées (bucket privé) : une vignette légère pour la grille + la
  // pleine résolution pour le lightbox / téléchargement.
  const photosWithUrl: PhotoWithUrl[] = await Promise.all(
    (photos ?? []).map(async (p) => {
      const [{ data: full }, { data: thumb }] = await Promise.all([
        supabase.storage.from("photos").createSignedUrl(p.storage_path, 60 * 60 * 4),
        supabase.storage.from("photos").createSignedUrl(p.storage_path, 60 * 60 * 4, {
          transform: { width: 400, height: 400, resize: "cover", quality: 55 },
        }),
      ]);
      const url = full?.signedUrl ?? null;
      return { ...p, url, thumbUrl: thumb?.signedUrl ?? url } as PhotoWithUrl;
    })
  );

  return (
    <GalleryView albums={(albums ?? []) as PhotoAlbum[]} photos={photosWithUrl} />
  );
}
