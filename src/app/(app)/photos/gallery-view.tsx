"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import { Icon } from "@/components/cap/icons";
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
  const [selectMode, setSelectMode] = useState(false);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [showSheet, setShowSheet] = useState(false);
  const [isPending, startTransition] = useTransition();
  const longRef = useRef<NodeJS.Timeout | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const filtered = useMemo(
    () =>
      albumFilter === null
        ? photos
        : photos.filter((p) => p.album_id === albumFilter),
    [photos, albumFilter]
  );

  function tapTile(id: string) {
    if (selectMode) {
      const next = new Set(selection);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelection(next);
      if (next.size === 0) setSelectMode(false);
    }
  }

  function longPressStart(id: string) {
    longRef.current = setTimeout(() => {
      setSelectMode(true);
      setSelection(new Set([id]));
    }, 420);
  }
  function longPressEnd() {
    if (longRef.current) clearTimeout(longRef.current);
  }

  function cancelSelect() {
    setSelectMode(false);
    setSelection(new Set());
  }

  function selectAll() {
    setSelection(new Set(filtered.map((p) => p.id)));
  }

  async function downloadZip(items: PhotoWithUrl[], filename: string) {
    if (items.length === 0) return;
    toast.info(`Préparation de ${items.length} photo(s)…`);
    const zip = new JSZip();
    await Promise.all(
      items.map(async (p) => {
        if (!p.url) return;
        const res = await fetch(p.url);
        const blob = await res.blob();
        zip.file(p.original_filename ?? `${p.id}.jpg`, blob);
      })
    );
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, filename);
  }

  async function downloadAction() {
    if (selectMode && selection.size > 0) {
      const items = filtered.filter((p) => selection.has(p.id));
      await downloadZip(items, "cap-games-selection.zip");
    } else {
      const label =
        albumFilter === null
          ? "cap-games-photos.zip"
          : `cap-games-${
              albums.find((a) => a.id === albumFilter)?.name ?? "album"
            }.zip`;
      await downloadZip(filtered, label);
    }
    setShowSheet(false);
    cancelSelect();
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
          {selectMode ? (
            <button
              type="button"
              className="g-icon-btn"
              onClick={cancelSelect}
              aria-label="Annuler"
            >
              <Icon.X />
            </button>
          ) : (
            <>
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
            </>
          )}
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
        {!selectMode && (
          <div className="g-banner">
            <div className="g-banner-inner">
              <div>
                <div
                  className="t-eyebrow"
                  style={{ color: "var(--tertiary-glow)" }}
                >
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
        )}

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
            {filtered.map((p) => {
              const selected = selection.has(p.id);
              return (
                <div
                  key={p.id}
                  className={"photo-tile" + (selected ? " selected" : "")}
                  onClick={() => tapTile(p.id)}
                  onMouseDown={() => longPressStart(p.id)}
                  onMouseUp={longPressEnd}
                  onMouseLeave={longPressEnd}
                  onTouchStart={() => longPressStart(p.id)}
                  onTouchEnd={longPressEnd}
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
                  {selectMode && (
                    <div className={"photo-check check" + (selected ? " on" : "")}>
                      {selected && <Icon.Check />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!selectMode && filtered.length > 0 && (
          <div className="g-bulk">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowSheet(true)}
            >
              <Icon.Folder /> Télécharger tout
            </button>
            <div className="g-bulk-hint">
              Appui long sur une photo pour activer la sélection multiple.
            </div>
          </div>
        )}
      </div>

      {selectMode && (
        <div className="g-selectbar">
          <div className="g-selectbar-info">
            <div className="g-selectbar-count">{selection.size}</div>
            <div>
              <div className="g-selectbar-label">
                sélectionnée{selection.size > 1 ? "s" : ""}
              </div>
              <button
                type="button"
                className="g-selectbar-all"
                onClick={selectAll}
              >
                Tout sélectionner
              </button>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-gold"
            style={{ height: 48, fontSize: 14 }}
            disabled={selection.size === 0}
            onClick={() => setShowSheet(true)}
          >
            <Icon.Download /> Télécharger
          </button>
        </div>
      )}

      {showSheet && (
        <div className="sheet">
          <div className="sheet-handle" />
          <div className="t-eyebrow">EXPORT</div>
          <h3 className="sheet-title">Télécharger la sélection</h3>
          <p className="sheet-sub">
            {selection.size > 0
              ? `${selection.size} photo${selection.size > 1 ? "s" : ""} prête${selection.size > 1 ? "s" : ""} au téléchargement.`
              : `Le dossier complet (${filtered.length} photos) sera préparé en .zip.`}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              type="button"
              className="btn btn-gold"
              onClick={downloadAction}
            >
              <Icon.Download /> Démarrer le téléchargement
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowSheet(false)}
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
