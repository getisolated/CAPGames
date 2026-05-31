// CAP Games — Gallery screen
const { useState: useStateG, useMemo: useMemoG } = React;

// curated placeholder photo set (gradients so they have distinct identities without real assets)
const PHOTOS = [
  { id: "p01", label: "Cocktail", hue: 28, tag: "21:14", album: "ARRIVÉES" },
  { id: "p02", label: "Discours CEO", hue: 22, tag: "21:30", album: "OUVERTURE" },
  { id: "p03", label: "Team Rouge", hue: 25, tag: "21:42", album: "ÉQUIPES" },
  { id: "p04", label: "Quizz #1", hue: 35, tag: "21:55", album: "QUIZZ" },
  { id: "p05", label: "Buzzer final", hue: 30, tag: "22:02", album: "QUIZZ" },
  { id: "p06", label: "Photobooth", hue: 50, tag: "22:18", album: "PHOTOBOOTH" },
  { id: "p07", label: "Trophée", hue: 60, tag: "22:34", album: "REMISE" },
  { id: "p08", label: "DJ Set", hue: 18, tag: "22:50", album: "DANCEFLOOR" },
  { id: "p09", label: "Confetti", hue: 40, tag: "23:01", album: "DANCEFLOOR" },
  { id: "p10", label: "Selfie collègues", hue: 32, tag: "23:14", album: "PHOTOBOOTH" },
  { id: "p11", label: "Vue salle", hue: 24, tag: "23:22", album: "AMBIANCE" },
  { id: "p12", label: "Toast", hue: 56, tag: "23:40", album: "CLOSING" },
];

function PhotoTile({ photo, selected, selectMode, onTap, onLong }) {
  const longRef = React.useRef(null);
  const start = () => {
    longRef.current = setTimeout(() => onLong(), 420);
  };
  const clear = () => longRef.current && clearTimeout(longRef.current);

  return (
    <div
      className={"photo-tile" + (selected ? " selected" : "")}
      onClick={onTap}
      onMouseDown={start} onMouseUp={clear} onMouseLeave={clear}
      onTouchStart={start} onTouchEnd={clear}
    >
      <div
        className="photo-bg"
        style={{
          background: `
            radial-gradient(circle at 30% 25%, oklch(70% 0.16 ${photo.hue}) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, oklch(40% 0.18 ${photo.hue - 8}) 0%, transparent 55%),
            linear-gradient(160deg, oklch(35% 0.14 ${photo.hue}), oklch(18% 0.06 ${photo.hue - 10}))
          `
        }}
      >
        <div className="photo-grain"/>
        <div className="photo-label t-mono">{photo.label}</div>
        <div className="photo-tag t-mono">{photo.tag}</div>
      </div>
      {selectMode && (
        <div className={"photo-check check" + (selected ? " on" : "")}>
          {selected && <Icon.Check/>}
        </div>
      )}
    </div>
  );
}

function GalleryScreen() {
  const [selectMode, setSelectMode] = useStateG(false);
  const [selected, setSelected] = useStateG(new Set());
  const [filter, setFilter] = useStateG("Tout");
  const [showSheet, setShowSheet] = useStateG(false);

  const albums = ["Tout", "Quizz", "Photobooth", "Dancefloor", "Closing"];
  const filtered = useMemoG(() => {
    if (filter === "Tout") return PHOTOS;
    return PHOTOS.filter(p => p.album.toLowerCase().includes(filter.toLowerCase()));
  }, [filter]);

  const toggle = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
    if (next.size === 0) setSelectMode(false);
  };

  const enterSelect = (id) => {
    setSelectMode(true);
    const next = new Set(selected);
    next.add(id);
    setSelected(next);
  };

  const cancelSelect = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const selectAll = () => {
    setSelected(new Set(filtered.map(p => p.id)));
  };

  return (
    <div className="screen gallery-screen">
      <StatusBar/>

      <div className="g-head">
        <div>
          <div className="t-eyebrow">SOIRÉE CAP VISION · 21 MAI</div>
          <h1 className="g-title t-display">Galerie<span className="g-title-acc">·</span></h1>
        </div>
        <div className="g-head-actions">
          {selectMode ? (
            <button className="g-icon-btn" onClick={cancelSelect}><Icon.X/></button>
          ) : (
            <>
              <span className="chip">{PHOTOS.length} PHOTOS</span>
            </>
          )}
        </div>
      </div>

      <div className="g-filters scroll-x">
        {albums.map(a => (
          <button
            key={a}
            className={"g-filter" + (filter === a ? " on" : "")}
            onClick={() => setFilter(a)}
          >
            {a}
          </button>
        ))}
      </div>

      <div className="scroll-area">
        {!selectMode && (
          <div className="g-banner">
            <div className="g-banner-inner">
              <div className="g-banner-side">
                <div className="t-eyebrow" style={{ color: "var(--tertiary-glow)" }}>EN LIVE</div>
                <div className="g-banner-title t-display">Le photographe<br/><span className="t-serif-it">est dans la salle.</span></div>
                <div className="g-banner-sub">Les nouvelles photos apparaissent en temps réel.</div>
              </div>
              <div className="g-banner-orb">
                <div className="orb-ring"/>
                <div className="orb-ring two"/>
                <div className="orb-core"/>
              </div>
            </div>
          </div>
        )}

        <div className="g-grid">
          {filtered.map((p, i) => (
            <PhotoTile
              key={p.id}
              photo={p}
              selected={selected.has(p.id)}
              selectMode={selectMode}
              onTap={() => {
                if (selectMode) toggle(p.id);
                else {
                  // open detail — for prototype, just enter select mode lightly
                }
              }}
              onLong={() => enterSelect(p.id)}
            />
          ))}
        </div>

        {!selectMode && (
          <div className="g-bulk">
            <button className="btn btn-ghost" onClick={() => setShowSheet(true)}>
              <Icon.Folder/> Télécharger tout le dossier
            </button>
            <div className="g-bulk-hint t-mono">Appui long sur une photo pour activer la sélection multiple</div>
          </div>
        )}
      </div>

      {selectMode && (
        <div className="g-selectbar">
          <div className="g-selectbar-info">
            <div className="g-selectbar-count t-display">{selected.size}</div>
            <div>
              <div className="g-selectbar-label">sélectionnée{selected.size > 1 ? "s" : ""}</div>
              <button className="g-selectbar-all" onClick={selectAll}>Tout sélectionner</button>
            </div>
          </div>
          <button
            className="btn btn-gold"
            style={{ height: 48, fontSize: 14 }}
            disabled={!selected.size}
            onClick={() => setShowSheet(true)}
          >
            <Icon.Download/> Télécharger
          </button>
        </div>
      )}

      {showSheet && (
        <div className="sheet">
          <div className="sheet-handle"/>
          <div className="t-eyebrow">EXPORT</div>
          <h3 className="sheet-title t-display">Télécharger la sélection</h3>
          <p className="sheet-sub">
            {selected.size > 0
              ? `${selected.size} photo${selected.size > 1 ? "s" : ""} prête${selected.size > 1 ? "s" : ""} au téléchargement.`
              : `Le dossier complet (${PHOTOS.length} photos · 248 Mo) sera préparé en .zip.`}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button className="btn btn-gold" onClick={() => { setShowSheet(false); cancelSelect(); }}>
              <Icon.Download/> Démarrer le téléchargement
            </button>
            <button className="btn btn-ghost" onClick={() => setShowSheet(false)}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}

window.GalleryScreen = GalleryScreen;
