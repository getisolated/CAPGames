export function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <div className="wordmark" style={{ fontSize: size }}>
      <span style={{ color: "var(--text)" }}>CAP</span>
      <span className="dot" />
      <span className="games">GAMES</span>
    </div>
  );
}
