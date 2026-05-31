import { Icon } from "@/components/cap/icons";

export function NoTeamCard() {
  return (
    <div className="noteam-body" style={{ padding: "8px 22px 0" }}>
      <div className="noteam-art">
        <div className="noteam-avatar">
          <Icon.User />
        </div>
        <span className="noteam-pulse" />
        <span className="noteam-pulse noteam-pulse-2" />
      </div>

      <div className="noteam-eyebrow">En attente d&apos;affectation</div>
      <h2 className="noteam-title t-display">
        Tu n&apos;as pas encore<br />
        <span className="t-serif-it">d&apos;équipe.</span>
      </h2>

      <p className="noteam-sub">
        Rapproche-toi de ton{" "}
        <strong style={{ color: "var(--tertiary-glow)" }}>animateur</strong>{" "}
        pour qu&apos;il te place dans une équipe.
      </p>

      <div className="noteam-card">
        <div className="noteam-card-row">
          <span className="noteam-card-k">Statut</span>
          <span className="chip live">En attente</span>
        </div>
        <div className="noteam-card-row">
          <span className="noteam-card-k">Équipe</span>
          <span className="noteam-card-v">—</span>
        </div>
        <div className="noteam-card-row">
          <span className="noteam-card-k">Animateur</span>
          <span className="noteam-card-v">Cherche le micro doré 🎤</span>
        </div>
      </div>

      <div className="noteam-foot">
        Le buzzer et les sondages se débloquent dès l&apos;affectation.
      </div>
    </div>
  );
}
