// CAP Games — Auth screen + shared shell pieces
const { useState, useEffect, useRef, useMemo } = React;

function IOSChrome() {
  const [time, setTime] = useState(() => {
    const d = new Date();
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  });
  useEffect(() => {
    const t = setInterval(() => {
      const d = new Date();
      setTime(`${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`);
    }, 30000);
    return () => clearInterval(t);
  }, []);
  return (
    <>
      <div className="dynamic-island" />
      <div className="ios-statusbar">
        <div className="ios-time">{time}</div>
        <div className="ios-right">
          {/* signal bars */}
          <svg width="18" height="11" viewBox="0 0 18 11" fill="currentColor">
            <rect x="0" y="7" width="3" height="4" rx="0.5" />
            <rect x="5" y="4" width="3" height="7" rx="0.5" />
            <rect x="10" y="1" width="3" height="10" rx="0.5" />
            <rect x="15" y="-1" width="3" height="12" rx="0.5" />
          </svg>
          {/* wifi */}
          <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
            <path d="M8 11.5a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6z" />
            <path d="M3.1 6.5a7 7 0 0 1 9.8 0l1.1-1.1A8.5 8.5 0 0 0 2 5.4l1.1 1.1z" opacity="0.95" />
            <path d="M5.4 8.7a3.7 3.7 0 0 1 5.2 0l1.1-1.1a5.2 5.2 0 0 0-7.4 0l1.1 1.1z" opacity="0.95" />
          </svg>
          <div className="ios-battery"><i /></div>
        </div>
      </div>
      <div className="home-indicator" />
    </>);

}

function Wordmark({ size = 28 }) {
  return (
    <div className="wordmark" style={{ fontSize: size }}>
      <span style={{ color: "rgb(255, 255, 255)" }}>CAP</span>
      <span className="dot" />
      <span className="games" style={{ fontFamily: "Big Shoulders Display" }}>GAMES</span>
    </div>);

}

function AuthScreen({ onAuth }) {
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState("email"); // email | sent
  const [code, setCode] = useState(["", "", "", ""]);
  const inputsRef = useRef([]);

  const valid = /\S+@\S+\.\S+/.test(email);

  const send = () => {
    if (!valid) return;
    setStage("sent");
  };

  const handleCode = (i, v) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...code];
    next[i] = v;
    setCode(next);
    if (v && i < 3) inputsRef.current[i + 1]?.focus();
    if (next.every((c) => c)) setTimeout(onAuth, 350);
  };

  return (
    <div className="screen auth-screen">
      <div className="shell-leak" />
      <StatusBar />

      <div className="auth-body">
        {/* Top third — logo + wordmark */}
        <div className="auth-hero" style={{ margin: "74px 0px 0px" }}>
          <img
            className="auth-logo"
            src={(typeof window !== "undefined" && window.__resources && window.__resources.authLogo) || "assets/logo-gold.png"}
            alt="CAP Games"
            draggable={false} />
          <Wordmark size={56} />
        </div>

        {/* Bottom — connect form */}
        <div className="auth-form">
          {stage === "email" &&
          <>
              <p className="auth-sub">
                Connecte-toi avec ton e-mail pro pour rejoindre ton équipe, buzzer, voter et récupérer les photos de la soirée.
              </p>

              <div className="auth-field">
                <div className="auth-field-icon"><Icon.Mail /></div>
                <input
                type="email"
                autoComplete="email"
                placeholder="prenom.nom@capvision.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()} />
              
              </div>

              <button
              className="btn btn-primary auth-cta"
              onClick={send}
              disabled={!valid}
              style={{ opacity: valid ? 1 : 0.45, cursor: valid ? "pointer" : "not-allowed" }}>
              
                Recevoir le lien magique
                <Icon.ArrowRight />
              </button>

              <div className="auth-foot">
                <span className="t-mono">Réservé aux collaborateurs.</span>
              </div>
            </>
          }

          {stage === "sent" &&
          <>
              <p className="auth-sub">
                On t'a envoyé un code à <strong style={{ color: "var(--tertiary-glow)" }}>{email}</strong>. Saisis-le pour entrer dans la soirée.
              </p>

              <div className="auth-code">
                {code.map((c, i) =>
              <input
                key={i}
                ref={(el) => inputsRef.current[i] = el}
                value={c}
                onChange={(e) => handleCode(i, e.target.value.slice(-1))}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !c && i > 0) inputsRef.current[i - 1]?.focus();
                }}
                inputMode="numeric"
                maxLength={1} />

              )}
              </div>

              <button className="btn btn-ghost auth-cta" onClick={() => setStage("email")}>
                Changer d'e-mail
              </button>

              <div className="auth-foot">
                <span className="t-mono">Réservé aux collaborateurs.</span>
              </div>
            </>
          }
        </div>
      </div>
    </div>);

}

function StatusBar() {
  return <div className="statusbar" aria-hidden="true" />;
}

window.AuthScreen = AuthScreen;
window.StatusBar = StatusBar;
window.Wordmark = Wordmark;
window.IOSChrome = IOSChrome;