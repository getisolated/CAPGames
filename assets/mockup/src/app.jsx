// CAP Games — App shell + state
const { useState: useStateApp, useEffect: useEffectApp, useMemo: useMemoApp } = React;

function NoTeamScreen() {
  return (
    <div className="screen noteam-screen">
      <div className="shell-leak"/>
      <StatusBar/>
      <div className="noteam-body">
        <div className="noteam-art">
          <div className="noteam-avatar">
            <svg viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="24" r="11" stroke="currentColor" strokeWidth="2.2"/>
              <path d="M10 56c2.5-10 11.5-16 22-16s19.5 6 22 16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="noteam-pulse"/>
          <span className="noteam-pulse noteam-pulse-2"/>
        </div>

        <div className="noteam-eyebrow t-mono">EN ATTENTE D'AFFECTATION</div>
        <h1 className="noteam-title t-display">
          Tu n'as pas encore<br/>
          <span className="t-serif-it">d'équipe.</span>
        </h1>

        <p className="noteam-sub">
          Rapproche-toi de ton <strong style={{ color: "var(--tertiary-glow)" }}>administr…&nbsp;euh, animateur</strong> de la soirée pour qu'il te place dans une équipe.
        </p>

        <div className="noteam-card">
          <div className="noteam-card-row">
            <span className="t-mono noteam-card-k">STATUT</span>
            <span className="chip live">EN ATTENTE</span>
          </div>
          <div className="noteam-card-row">
            <span className="t-mono noteam-card-k">ÉQUIPE</span>
            <span className="noteam-card-v">—</span>
          </div>
          <div className="noteam-card-row">
            <span className="t-mono noteam-card-k">ANIMATEUR</span>
            <span className="noteam-card-v">Cherche le micro doré 🎤</span>
          </div>
        </div>

        <div className="noteam-foot t-mono">
          La page se débloque dès que ton équipe est attribuée.
        </div>
      </div>
    </div>
  );
}

const PALETTES = {
  ember: {
    "--primary": "oklch(53.194% 0.20025 28.801)",
    "--secondary": "oklch(32.556% 0.11125 22.926)",
    "--tertiary": "oklch(70.445% 0.15456 57.009)",
    "--tertiary-glow": "oklch(78% 0.15 60)",
    "--primary-glow": "oklch(60% 0.22 28)",
    "--bg": "oklch(8% 0.015 30)",
    "--bg-2": "oklch(11% 0.022 28)",
  },
  noir: {
    "--primary": "oklch(58% 0.21 25)",
    "--secondary": "oklch(28% 0.08 22)",
    "--tertiary": "oklch(74% 0.14 75)",
    "--tertiary-glow": "oklch(82% 0.13 80)",
    "--primary-glow": "oklch(64% 0.22 25)",
    "--bg": "oklch(6% 0.01 30)",
    "--bg-2": "oklch(9% 0.02 28)",
  },
  velvet: {
    "--primary": "oklch(60% 0.2 10)",
    "--secondary": "oklch(30% 0.12 350)",
    "--tertiary": "oklch(76% 0.13 90)",
    "--tertiary-glow": "oklch(84% 0.13 90)",
    "--primary-glow": "oklch(66% 0.21 12)",
    "--bg": "oklch(8% 0.018 350)",
    "--bg-2": "oklch(11% 0.025 350)",
  },
};

const INITIAL_TEAMS = [
  { id: "rouge",  name: "Équipe Rouge",   short: "RG", color: "oklch(55% 0.2 28)",   score: 142, delta: 18, trend: "up",   buzzes: 14, players: 6, pollBlurb: "Le total look bordeaux assumé.",     pollVotes: 18 },
  { id: "or",     name: "Équipe Or",      short: "OR", color: "oklch(70% 0.15 75)",  score: 128, delta: 12, trend: "up",   buzzes: 11, players: 6, pollBlurb: "Cravate dorée et sourires sincères.", pollVotes: 26 },
  { id: "nuit",   name: "Équipe Nuit",    short: "NT", color: "oklch(45% 0.14 280)", score: 96,  delta: 5,  trend: "down", buzzes: 9,  players: 6, pollBlurb: "Costumes nocturnes, lunettes noires.", pollVotes: 14 },
  { id: "braise", name: "Équipe Braise",  short: "BR", color: "oklch(52% 0.18 45)",  score: 84,  delta: 2,  trend: "flat", buzzes: 7,  players: 6, pollBlurb: "Veste cuir, esprit rock'n'roll.",     pollVotes: 9 },
];

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "ember",
  "buzzerStyle": "circle",
  "gridDensity": "3col",
  "showGrain": true,
  "buzzerPhaseDemo": "live",
  "hasTeam": true,
  "role": "admin"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const [route, setRoute] = useStateApp("auth");
  const [teams, setTeams] = useStateApp(INITIAL_TEAMS);
  const myTeamId = "rouge";
  const me = teams.find(x => x.id === myTeamId);

  const [phase, setPhase] = useStateApp(t.buzzerPhaseDemo || "live");
  const [buzzOrder, setBuzzOrder] = useStateApp([]);
  const [myBuzz, setMyBuzz] = useStateApp(null);

  useEffectApp(() => {
    if (t.buzzerPhaseDemo && t.buzzerPhaseDemo !== phase) setPhase(t.buzzerPhaseDemo);
  }, [t.buzzerPhaseDemo]);

  // Keep route consistent with hasTeam / role tweaks.
  useEffectApp(() => {
    if (route === "auth") return;
    if (!t.hasTeam && route !== "noteam") setRoute("noteam");
    if (t.hasTeam && route === "noteam") setRoute("scores");
    if (t.role !== "admin" && route === "admin") setRoute("scores");
  }, [t.hasTeam, t.role]);

  useEffectApp(() => {
    const root = document.documentElement;
    const p = PALETTES[t.palette] || PALETTES.ember;
    Object.entries(p).forEach(([k, v]) => root.style.setProperty(k, v));
  }, [t.palette]);

  const onBuzzed = () => {
    setBuzzOrder([
      { teamId: "rouge",  ms: 412 },
      { teamId: "or",     ms: 587 },
      { teamId: "nuit",   ms: 901 },
    ]);
    setMyBuzz({ rank: 1, ms: 412 });
    setPhase("buzzed");
    setTweak("buzzerPhaseDemo", "buzzed");
  };

  const resetBuzz = () => {
    setBuzzOrder([]);
    setMyBuzz(null);
  };

  return (
    <div className="iphone">
      <span className="iphone-buttons"><span className="action"/><span className="vol-up"/><span className="vol-down"/></span>
      <div className="phone" data-route={route}>
        <IOSChrome/>
        {t.showGrain && <div className="grain"/>}

      {route === "auth" && <AuthScreen onAuth={() => setRoute(t.hasTeam ? "scores" : "noteam")}/>}
      {route === "noteam" && <NoTeamScreen/>}
      {route === "gallery" && <GalleryScreen/>}
      {route === "buzzer" && (
        <BuzzerScreen
          phase={phase}
          setPhase={setPhase}
          buzzerStyle={t.buzzerStyle}
          team={me}
          onBuzzed={onBuzzed}
          buzzedAt={myBuzz}
        />
      )}
      {route === "scores" && <LeaderboardScreen teams={teams} myTeamId={myTeamId} isAdmin={t.role === "admin"}/>}
      {route === "admin" && (
        <AdminScreen
          teams={teams}
          setTeams={setTeams}
          phase={phase}
          setPhase={setPhase}
          buzzOrder={buzzOrder}
          resetBuzz={resetBuzz}
        />
      )}

      {route !== "auth" && (
        <nav className="tabbar">
          {[
            { id: "scores",  label: "Scores",  I: Icon.Trophy },
            { id: "buzzer",  label: "Buzzer",  I: Icon.Buzzer },
            { id: "gallery", label: "Galerie", I: Icon.Photos },
            { id: "admin",   label: "Admin",   I: Icon.Admin, adminOnly: true },
          ]
            .filter(tab => !(tab.adminOnly && t.role !== "admin"))
            .map(tab => {
              const locked = !t.hasTeam;
              return (
                <button
                  key={tab.id}
                  className={"tab" + (route === tab.id ? " active" : "") + (locked ? " locked" : "")}
                  onClick={() => { if (!locked) setRoute(tab.id); }}
                  aria-disabled={locked || undefined}
                >
                  <tab.I/>
                  <span>{tab.label}</span>
                  {locked && <span className="tab-lock" aria-hidden><Icon.Lock/></span>}
                </button>
              );
            })}
        </nav>
      )}

      <TweaksPanel title="Tweaks · CAP Games">
        <TweakSection label="Ambiance">
          <TweakRadio
            label="Rôle"
            value={t.role}
            onChange={v => setTweak("role", v)}
            options={[
              { value: "admin",  label: "Admin"  },
              { value: "player", label: "Joueur" },
            ]}
          />
          <TweakToggle
            label="A une équipe"
            value={t.hasTeam}
            onChange={v => setTweak("hasTeam", v)}
          />
          <TweakRadio
            label="Palette"
            value={t.palette}
            onChange={v => setTweak("palette", v)}
            options={[
              { value: "ember",  label: "Ember"  },
              { value: "noir",   label: "Noir"   },
              { value: "velvet", label: "Velvet" },
            ]}
          />
          <TweakToggle
            label="Grain film"
            value={t.showGrain}
            onChange={v => setTweak("showGrain", v)}
          />
        </TweakSection>

        <TweakSection label="Buzzer">
          <TweakRadio
            label="Style"
            value={t.buzzerStyle}
            onChange={v => setTweak("buzzerStyle", v)}
            options={[
              { value: "circle",   label: "Halo"   },
              { value: "arcade",   label: "Arcade" },
              { value: "physical", label: "3D"     },
            ]}
          />
          <TweakRadio
            label="État"
            value={t.buzzerPhaseDemo}
            onChange={v => { setTweak("buzzerPhaseDemo", v); setPhase(v); if (v === "waiting") resetBuzz(); }}
            options={[
              { value: "waiting", label: "Attente" },
              { value: "live",    label: "GO"      },
              { value: "buzzed",  label: "Buzzé"   },
            ]}
          />
        </TweakSection>

        <TweakSection label="Galerie">
          <TweakRadio
            label="Grille"
            value={t.gridDensity}
            onChange={v => setTweak("gridDensity", v)}
            options={[
              { value: "2col", label: "2" },
              { value: "3col", label: "3" },
              { value: "4col", label: "4" },
            ]}
          />
        </TweakSection>

        <TweakSection label="Navigation rapide">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <TweakButton label="→ Auth"      onClick={() => setRoute("auth")}/>
            <TweakButton label="→ Sans équipe" onClick={() => setRoute("noteam")}/>
            <TweakButton label="→ Galerie"   onClick={() => setRoute("gallery")}/>
            <TweakButton label="→ Buzzer"    onClick={() => setRoute("buzzer")}/>
            <TweakButton label="→ Scores"    onClick={() => setRoute("scores")}/>
            <TweakButton label="→ Admin"     onClick={() => setRoute("admin")}/>
          </div>
        </TweakSection>
      </TweaksPanel>

      <style>{`
        .g-grid { grid-template-columns: repeat(${t.gridDensity === "2col" ? 2 : t.gridDensity === "4col" ? 4 : 3}, 1fr) !important; }
      `}</style>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
