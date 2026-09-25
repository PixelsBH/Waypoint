export function EmptyState() {
  return (
    <section className="empty-state" aria-label="Your itinerary will appear here">
      <div className="empty-art" aria-hidden="true">
        <span className="empty-sun" />
        <span className="empty-route route-one" />
        <span className="empty-route route-two" />
        <span className="empty-pin">✦</span>
      </div>
      <p className="eyebrow">A LITTLE INSPIRATION, A LOT OF POSSIBILITY</p>
      <h2>Your next story starts with a place.</h2>
      <p>Tell Waypoint what you’re dreaming about. Your itinerary will land here, ready to explore and make your own.</p>
      <div className="empty-tags"><span>Thoughtful pacing</span><span>Local favorites</span><span>Room to wander</span></div>
    </section>
  );
}
