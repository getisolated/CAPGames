import { createClient } from "@/lib/supabase/server";
import { PhotosAdmin } from "./photos-admin";
import type { Photo, PhotoAlbum } from "@/lib/supabase/types";

export default async function AdminPhotosPage() {
  const supabase = await createClient();

  const [{ data: albums }, { data: photos }] = await Promise.all([
    supabase.from("photo_albums").select("*").order("position"),
    supabase.from("photos").select("*").order("created_at", { ascending: false }),
  ]);

  const photosWithUrl = await Promise.all(
    (photos ?? []).map(async (p) => {
      const { data } = await supabase.storage
        .from("photos")
        .createSignedUrl(p.storage_path, 60 * 60 * 4);
      return { ...p, url: data?.signedUrl ?? null };
    })
  );

  return (
    <div style={{ padding: "0 22px" }}>
      <PhotosAdmin
        albums={(albums ?? []) as PhotoAlbum[]}
        photos={photosWithUrl as (Photo & { url: string | null })[]}
      />
    </div>
  );
}
