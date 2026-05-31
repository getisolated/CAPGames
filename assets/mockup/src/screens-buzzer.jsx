// CAP Games — Buzzer screen (the critical one)
const { useState: useStateB, useEffect: useEffectB, useRef: useRefB } = React;

function BuzzerScreen({ phase, setPhase, buzzerStyle, team, onBuzzed, buzzedAt }) {
  // phase: "waiting" | "live" | "buzzed"
  const [pressed, setPressed] = useStateB(false);
  const [bounce, setBounce] = useStateB(0);

  // simulated countdown when transitioning to live
  const [countdown, setCountdown] = useStateB(null);
  useEffectB(() => {
    if (phase === "countdown") {
      let n = 3;
      setCountdown(n);
      const t = setInterval(() => {
        n -= 1;
        if (n <= 0) {
          clearInterval(t);
          setCountdown(null);
          setPhase("live");
        } else setCountdown(n);
      }, 700);
      return () => clearInterval(t);
    }
  }, [phase]);

  const press = () => {
    if (phase !== "live") return;
    setPressed(true);
    setBounce(b => b + 1);
    onBuzzed();
  };

  return (
    <div className="screen buzzer-screen" data-phase={phase}>
      <StatusBar/>

      <div className="b-head">
        <div className="b-head-left">
          <div className="t-eyebrow">MANCHE 3 · QUIZZ MUSIQUE</div>
          <div className="b-team">
            <div className="b-team-dot" style={{ background: team.color }}/>
            <span>{team.name}</span>
            <span className="chip" style={{ marginLeft: 8 }}>{team.score} PTS</span>
          </div>
        </div>
        <div className="b-head-right">
          {phase === "waiting" && <span className="chip">EN ATTENTE</span>}
          {phase === "countdown" && <span className="chip red">PRÊT</span>}
          {phase === "live" && <span className="chip live">GO</span>}
          {phase === "buzzed" && <span className="chip gold">BUZZÉ</span>}
        </div>
      </div>

      <div className="b-stage">
        {/* atmospheric glow behind buzzer */}
        <div className={"b-aura aura-" + phase}/>
        <div className={"b-aura-2 aura-" + phase}/>

        {/* phase-specific content above buzzer */}
        <div className="b-marquee">
          {phase === "waiting" && (
            <>
              <div className="t-mono b-marquee-eyebrow">
                <span className="b-dot dot-wait"/>
                <span>ADMIN SE PRÉPARE</span>
              </div>
              <div className="b-marquee-title t-display">
                La manche<br/><span className="t-serif-it">va commencer.</span>
              </div>
              <div className="b-wait-dots">
                <span/><span/><span/>
              </div>
            </>
          )}
          {phase === "countdown" && (
            <>
              <div className="t-mono b-marquee-eyebrow">
                <span className="b-dot dot-live"/>
                <span>TENEZ-VOUS PRÊTS</span>
              </div>
              <div className="b-countdown t-display">{countdown}</div>
            </>
          )}
          {phase === "live" && (
            <>
              <div className="t-mono b-marquee-eyebrow">
                <span className="b-dot dot-live"/>
                <span>MANCHE EN COURS</span>
              </div>
              <div className="b-marquee-title t-display">
                Plus vite<br/><span className="t-serif-it">que les autres.</span>
              </div>
            </>
          )}
          {phase === "buzzed" && (
            <>
              <div className="t-mono b-marquee-eyebrow" style={{ color: "var(--tertiary-glow)" }}>
                <span className="b-dot dot-buzzed"/>
                <span>BUZZ ENREGISTRÉ · #{buzzedAt?.rank ?? 1}</span>
              </div>
              <div className="b-marquee-title t-display">
                Pousse-toi<br/><span className="t-serif-it">le micro arrive.</span>
              </div>
              <div className="b-buzz-time t-mono">
                +{buzzedAt?.ms ?? "412"}ms · {buzzedAt?.rank === 1 ? "1ER À AVOIR BUZZÉ" : `RANG ${buzzedAt?.rank}`}
              </div>
            </>
          )}
        </div>

        {/* the buzzer itself */}
        <div className="b-buzzer-wrap">
          <button
            key={bounce}
            className={"b-buzzer style-" + buzzerStyle + " phase-" + phase + (pressed ? " pressed" : "")}
            onPointerDown={press}
            onPointerUp={() => setPressed(false)}
            onPointerLeave={() => setPressed(false)}
            disabled={phase !== "live"}
          >
            <span className="b-buzzer-inner">
              <span className="b-buzzer-ring"/>
              <span className="b-buzzer-shine"/>
              {phase === "waiting" && (
                <span className="b-buzzer-content waiting">
                  <Icon.Lock/>
                  <span className="t-mono lbl">VERROUILLÉ</span>
                </span>
              )}
              {phase === "countdown" && (
                <span className="b-buzzer-content waiting">
                  <span className="t-display big">{countdown}</span>
                </span>
              )}
              {phase === "live" && (
                <span className="b-buzzer-content live">
                  <span className="t-display big">BUZZ</span>
                  <span className="t-mono lbl">TOUCHE POUR RÉPONDRE</span>
                </span>
              )}
              {phase === "buzzed" && (
                <span className="b-buzzer-content buzzed">
                  <Icon.Check/>
                  <span className="t-mono lbl">ENVOYÉ</span>
                </span>
              )}
            </span>
          </button>
        </div>

        <div className="b-foot">
          {phase === "waiting" && (
            <div className="b-foot-line t-mono">
              Reste sur cet écran — il s'active dès que l'admin lance la manche.
            </div>
          )}
          {phase === "live" && !pressed && (
            <div className="b-foot-line t-mono live">
              Le 1er à toucher gagne la main.
            </div>
          )}
          {phase === "buzzed" && (
            <div className="b-foot-list">
              <div className="b-foot-list-title t-mono">ORDRE DES BUZZ</div>
              <ol>
                <li><span className="rank">1</span><span>{team.name}</span><span className="ms">+412ms</span></li>
                <li><span className="rank">2</span><span>Équipe Or</span><span className="ms">+587ms</span></li>
                <li><span className="rank">3</span><span>Équipe Nuit</span><span className="ms">+901ms</span></li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

window.BuzzerScreen = BuzzerScreen;
