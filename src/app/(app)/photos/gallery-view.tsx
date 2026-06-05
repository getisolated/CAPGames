"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import { Icon } from "@/components/cap/icons";
import { PhotoLightbox } from "@/components/cap/photo-lightbox";
import { createClient } from "@/lib/supabase/client";
import { usePhotosRealtime, type PhotoWithUrl } from "@/hooks/use-photos-realtime";
import { registerUploadedPhoto } from "./actions";
import type { PhotoAlbum } from "@/lib/supabase/types";

export function GalleryView({
  albums,
  photos: initialPhotos,
}: {
  albums: PhotoAlbum[];
  photos: PhotoWithUrl[];
}) {
  const photos = usePhotosRealtime(initialPhotos);
  const [albumFilter, setAlbumFilter] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const filtered = useMemo(
    () =>
      albumFilter === null
        ? photos
        : photos.filter((p) => p.album_id === albumFilter),
    [photos, albumFilter]
  );

  async function downloadAlbum() {
    if (filtered.length === 0) return;
    const label =
      albumFilter === null
        ? "cap-games-photos.zip"
        : `cap-games-${
            albums.find((a) => a.id === albumFilter)?.name ?? "album"
          }.zip`;
    toast.info(`Préparation de ${filtered.length} photo(s)…`);
    const zip = new JSZip();
    await Promise.all(
      filtered.map(async (p) => {
        if (!p.url) return;
        const res = await fetch(p.url);
        const blob = await res.blob();
        zip.file(p.original_filename ?? `${p.id}.jpg`, blob);
      })
    );
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, label);
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const input = e.target;

    startTransition(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Session expirée, reconnecte-toi.");
        return;
      }

      let ok = 0;
      const errors: string[] = [];

      for (const file of Array.from(files)) {
        try {
          const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
          const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

          // Upload direct vers Supabase Storage (pas de limite Vercel)
          const { error: upErr } = await supabase.storage
            .from("photos")
            .upload(path, file, { contentType: file.type });
          if (upErr) {
            errors.push(`${file.name} : ${upErr.message}`);
            continue;
          }

          // On enregistre la row côté serveur (RLS s'applique)
          const res = await registerUploadedPhoto({
            storage_path: path,
            original_filename: file.name,
          });
          if (!res.ok) {
            errors.push(`${file.name} : ${res.error}`);
            continue;
          }
          ok++;
        } catch (err) {
          errors.push(
            `${file.name} : ${err instanceof Error ? err.message : "Erreur"}`
          );
        }
      }

      if (ok > 0) toast.success(`${ok} photo(s) envoyée(s) pour validation.`);
      if (errors.length > 0) {
        toast.error(
          errors.length === 1
            ? errors[0]
            : `${errors.length} échec(s) — ${errors[0]}`
        );
      }
      input.value = "";
    });
  }

  const lightboxPhotos = useMemo(
    () =>
      filtered.map((p) => ({
        id: p.id,
        url: p.url,
        original_filename: p.original_filename,
      })),
    [filtered]
  );

  return (
    <div className="screen gallery-screen">
      <div className="g-head">
        <div>
          <div className="t-eyebrow">Soirée CAP Vision</div>
          <h1 className="g-title t-display">
            Galerie<span className="g-title-acc">·</span>
          </h1>
        </div>
        <div className="g-head-actions">
          <div className="g-upload">
            <span className="g-upload-text">
              Ajoute tes photos de la soirée pour l&apos;album du week-end&nbsp;!
            </span>
            <button
              type="button"
              className="btn btn-gold g-upload-btn"
              onClick={() => fileRef.current?.click()}
              disabled={isPending}
            >
              <Icon.Upload /> {isPending ? "Envoi…" : "Ajouter"}
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            hidden
            disabled={isPending}
          />
        </div>
      </div>

      <div className="g-filters">
        <button
          type="button"
          className={"g-filter" + (albumFilter === null ? " on" : "")}
          onClick={() => setAlbumFilter(null)}
        >
          Tout
        </button>
        {albums.map((a) => (
          <button
            key={a.id}
            type="button"
            className={"g-filter" + (albumFilter === a.id ? " on" : "")}
            onClick={() => setAlbumFilter(a.id)}
          >
            {a.name}
          </button>
        ))}
      </div>

      <div className="scroll-area">
        {/* <div className="g-banner">
          <div className="g-banner-inner">
            <div>
              <div className="t-eyebrow" style={{ color: "var(--tertiary-glow)" }}>
                EN LIVE
              </div>
              <div className="g-banner-title t-display">
                Le photographe<br />
                <span className="t-serif-it">est dans la salle.</span>
              </div>
              <div className="g-banner-sub">
                Les nouvelles photos apparaissent en temps réel.
              </div>
            </div>
            <div className="g-banner-orb">
              <div className="orb-ring" />
              <div className="orb-ring two" />
              <div className="orb-core" />
            </div>
          </div>
        </div> */}

        {filtered.length === 0 ? (
          <div className="px-6">
            <div className="ad-empty card">
              <div className="t-display">Aucune photo</div>
              <div className="t-mono ad-empty-sub">
                Les premières photos arriveront bientôt.
              </div>
            </div>
          </div>
        ) : (
          <div className="g-grid">
            {filtered.map((p, i) => (
              <button
                key={p.id}
                type="button"
                className="photo-tile"
                onClick={() => setLightboxIndex(i)}
                aria-label={`Voir la photo ${p.original_filename ?? i + 1}`}
              >
                {p.url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={p.url}
                    alt={p.original_filename ?? ""}
                    className="photo-img"
                    loading="lazy"
                  />
                ) : (
                  <div className="photo-img img-ph">?</div>
                )}
              </button>
            ))}
          </div>
        )}

        {filtered.length > 0 && (
          <div className="g-bulk">
            <button
              type="button"
              className="btn btn-gold"
              onClick={downloadAlbum}
            >
              <Icon.Download /> Télécharger
              {albumFilter
                ? ` l’album « ${albums.find((a) => a.id === albumFilter)?.name ?? ""} »`
                : " toutes les photos"}{" "}
              ({filtered.length})
            </button>
            <div className="g-bulk-hint">
              Touche une photo pour l&apos;ouvrir, puis le bouton télécharger en haut.
            </div>
          </div>
        )}
      </div>

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={lightboxPhotos}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}
