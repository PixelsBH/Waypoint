export function LoadingState() {
  return (
    <section className="loading-state" aria-live="polite" aria-busy="true">
      <div className="loading-orbit" aria-hidden="true"><span /><span /><span /></div>
      <div>
        <p className="eyebrow">MAPPING YOUR WAYPOINTS</p>
        <h2>Finding the shape of your trip…</h2>
        <p className="subtle-copy">Gathering ideas and arranging them into a route that makes sense.</p>
      </div>
      <div className="loading-skeleton" aria-hidden="true"><i /><i /><i /></div>
    </section>
  );
}
