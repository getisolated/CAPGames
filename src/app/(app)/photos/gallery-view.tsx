"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import { Icon } from "@/components/cap/icons";
import { PhotoLightbox } from "@/components/cap/photo-lightbox";
import { uploadPhoto } from "./actions";
import type { Photo, PhotoAlbum } from "@/lib/supabase/types";

type PhotoWithUrl = Photo & { url: string | null };

export function GalleryView({
  albums,
  photos,
}: {
  albums: PhotoAlbum[];
  photos: PhotoWithUrl[];
}) {
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
    startTransition(async () => {
      let ok = 0;
      let err = 0;
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await uploadPhoto(fd);
        if (res.ok) ok++;
        else err++;
      }
      if (ok > 0) toast.success(`${ok} photo(s) envoyée(s) pour validation.`);
      if (err > 0) toast.error(`${err} échec(s).`);
      e.target.value = "";
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
          <span className="chip">{photos.length} PHOTOS</span>
          <button
            type="button"
            className="g-icon-btn"
            onClick={() => fileRef.current?.click()}
            aria-label="Envoyer"
            disabled={isPending}
          >
            <Icon.Upload />
          </button>
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
        <div className="g-banner">
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
        </div>

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
