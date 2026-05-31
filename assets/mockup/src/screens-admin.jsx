// CAP Games — Admin dashboard
const { useState: useStateA } = React;

function AdminScreen({ teams, setTeams, phase, setPhase, buzzOrder, resetBuzz }) {
  const [section, setSection] = useStateA("quizz"); // quizz | scores | photos

  const bump = (id, n) => {
    setTeams(ts => ts.map(t => t.id === id ? { ...t, score: Math.max(0, t.score + n) } : t));
  };

  return (
    <div className="screen admin-screen">
      <StatusBar/>

      <div className="ad-head">
        <div>
          <div className="t-eyebrow" style={{ color: "var(--tertiary-glow)" }}>MODE ANIMATEUR</div>
          <h1 className="ad-title t-display">
            Cockpit<br/>
            <span className="t-serif-it">de soirée.</span>
          </h1>
        </div>
        <span className="chip gold">ADMIN</span>
      </div>

      <div className="ad-tabs">
        {["quizz", "scores", "photos"].map(s => (
          <button key={s} className={"ad-tab" + (section === s ? " on" : "")} onClick={() => setSection(s)}>
            {s === "quizz" ? "Quizz" : s === "scores" ? "Scores" : "Photos"}
          </button>
        ))}
      </div>

      <div className="scroll-area">
        {section === "quizz" && (
          <div className="ad-quizz">
            <div className="ad-now card">
              <div className="ad-now-head">
                <div className="t-eyebrow">MANCHE ACTIVE</div>
                <span className="chip">MANCHE 3/6</span>
              </div>
              <div className="ad-now-title t-display">Quizz musique<br/><span className="t-serif-it">années 90.</span></div>
              <div className="ad-phase-row">
                <span className={"ad-phase-pill " + phase}>
                  {phase === "waiting" && "EN ATTENTE"}
                  {phase === "countdown" && "COMPTE À REBOURS"}
                  {phase === "live" && "BUZZERS ACTIFS"}
                  {phase === "buzzed" && "1ER BUZZ REÇU"}
                </span>
              </div>
              <div className="ad-phase-actions">
                {phase === "waiting" && (
                  <button className="btn btn-primary" style={{ height: 52, fontSize: 15 }} onClick={() => setPhase("countdown")}>
                    Lancer la manche <Icon.ArrowRight/>
                  </button>
                )}
                {(phase === "live" || phase === "buzzed" || phase === "countdown") && (
                  <button className="btn btn-ghost" style={{ height: 52 }} onClick={() => { resetBuzz(); setPhase("waiting"); }}>
                    <Icon.Refresh/> Réinitialiser les buzzers
                  </button>
                )}
                {phase === "live" && (
                  <button className="btn btn-gold" style={{ height: 52, fontSize: 15 }} onClick={() => setPhase("buzzed")}>
                    Simuler un buzz
                  </button>
                )}
              </div>
            </div>

            <div className="ad-buzzes">
              <div className="ad-section-head">
                <div className="t-eyebrow">ORDRE DES BUZZ</div>
                <span className="t-mono ad-section-sub">{buzzOrder.length} équipe{buzzOrder.length > 1 ? "s" : ""}</span>
              </div>
              {buzzOrder.length === 0 ? (
                <div className="ad-empty card">
                  <div className="t-display">Aucun buzz pour l'instant</div>
                  <div className="t-mono ad-empty-sub">L'ordre apparaîtra ici dès qu'une équipe buzzera.</div>
                </div>
              ) : (
                <div className="ad-buzz-list">
                  {buzzOrder.map((b, i) => {
                    const t = teams.find(t => t.id === b.teamId);
                    return (
                      <div key={i} className={"ad-buzz-row" + (i === 0 ? " first" : "")}>
                        <div className="ad-buzz-rank t-display">{i + 1}</div>
                        <div className="ad-buzz-avatar" style={{ background: t.color }}>{t.short}</div>
                        <div className="ad-buzz-info">
                          <div className="ad-buzz-name">{t.name}</div>
                          <div className="t-mono ad-buzz-time">+{b.ms}ms</div>
                        </div>
                        {i === 0 ? (
                          <div className="ad-buzz-actions">
                            <button className="ad-mini-btn good"><Icon.Check/></button>
                            <button className="ad-mini-btn bad"><Icon.X/></button>
                          </div>
                        ) : (
                          <span className="chip">EN ATTENTE</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {section === "scores" && (
          <div className="ad-scores">
            <div className="ad-section-head">
              <div className="t-eyebrow">AJUSTER LES SCORES</div>
              <span className="t-mono ad-section-sub">+/- 1, 5, 10</span>
            </div>
            {teams.map(t => (
              <div key={t.id} className="ad-score-row card">
                <div className="ad-score-id">
                  <div className="ad-score-avatar" style={{ background: t.color }}>{t.short}</div>
                  <div>
                    <div className="ad-score-name">{t.name}</div>
                    <div className="t-mono ad-score-meta">{t.buzzes} buzz · {t.players} joueurs</div>
                  </div>
                </div>
                <div className="ad-score-val t-display">{t.score}</div>
                <div className="ad-score-actions">
                  <button className="ad-pt-btn neg" onClick={() => bump(t.id, -1)}><Icon.Minus/></button>
                  <div className="ad-score-quick">
                    <button onClick={() => bump(t.id, 5)}>+5</button>
                    <button onClick={() => bump(t.id, 10)}>+10</button>
                  </div>
                  <button className="ad-pt-btn pos" onClick={() => bump(t.id, 1)}><Icon.Plus/></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {section === "photos" && (
          <div className="ad-photos">
            <div className="ad-section-head">
              <div className="t-eyebrow">UPLOAD PHOTOS</div>
              <span className="t-mono ad-section-sub">DRAG · CAMÉRA · ROULEAU</span>
            </div>
            <div className="ad-drop card">
              <div className="ad-drop-icon"><Icon.Upload/></div>
              <div className="ad-drop-title t-display">Dépose les photos ici</div>
              <div className="ad-drop-sub">ou choisis depuis ton téléphone</div>
              <div className="ad-drop-actions">
                <button className="btn btn-gold" style={{ height: 48, fontSize: 14 }}>
                  <Icon.Photos/> Depuis la galerie
                </button>
                <button className="btn btn-ghost" style={{ height: 48 }}>
                  <Icon.Sparkle/> Caméra
                </button>
              </div>
            </div>

            <div className="ad-album-card card">
              <div className="ad-album-head">
                <div>
                  <div className="t-eyebrow">DOSSIER ACTIF</div>
                  <div className="ad-album-name t-display">Quizz · Manche 3</div>
                </div>
                <span className="chip">12 PHOTOS</span>
              </div>
              <div className="ad-album-thumbs">
                {[28, 35, 22, 50, 60, 32].map((h, i) => (
                  <div key={i} className="ad-thumb" style={{ background: `linear-gradient(135deg, oklch(60% 0.16 ${h}), oklch(25% 0.08 ${h - 8}))` }}/>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

window.AdminScreen = AdminScreen;
