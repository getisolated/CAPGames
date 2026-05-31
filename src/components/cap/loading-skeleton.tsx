export function LoadingSkeleton() {
  return (
    <div className="screen">
      <div className="cg-skel-head">
        <div className="cg-skel-eyebrow cg-shimmer" />
        <div className="cg-skel-title cg-shimmer" />
      </div>
      <div className="cg-skel-list">
        <div className="cg-skel-row cg-shimmer" />
        <div className="cg-skel-row cg-shimmer" />
        <div className="cg-skel-row cg-shimmer" />
        <div className="cg-skel-row cg-shimmer" />
      </div>
    </div>
  );
}
