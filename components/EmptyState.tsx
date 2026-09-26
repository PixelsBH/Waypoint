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
      <h2>Your itinerary will land here.</h2>
      <p>Tell Waypoint where you’re dreaming of above — days, pace and the things you love — and it’ll sketch a route you can rearrange, with a map and photos for every stop.</p>
      <div className="empty-tags"><span>Day-by-day route</span><span>Stop photos</span><span>Live map</span></div>
    </section>
  );
}
