export function LoadingState() {
  return (
    <section className="loading-state itinerary-view" aria-live="polite" aria-busy="true">
      <section className="trip-overview skeleton-overview" aria-hidden="true">
        <div className="overview-copy">
          <p className="eyebrow"><i className="skeleton-block skeleton-kicker" /></p>
          <h2 className="skeleton-destination"><i className="skeleton-block skeleton-title" /></h2>
          <p className="trip-summary skeleton-summary"><i className="skeleton-block" /></p>
        </div>
        <div className="trip-stats">
          <div><strong className="skeleton-block skeleton-stat-number" /><span className="skeleton-block skeleton-stat-label" /></div>
          <div><strong className="skeleton-block skeleton-stat-number" /><span className="skeleton-block skeleton-stat-label" /></div>
        </div>
      </section>

      <div className="itinerary-section-heading loading-route-heading" role="status">
        <div>
          <p className="eyebrow"><span className="loading-status-mark" aria-hidden="true" /> GENERATING YOUR TRIP</p>
          <h2>Building your itinerary…</h2>
        </div>
      </div>

      <div className="day-tabs" aria-hidden="true">
        {[0, 1, 2].map((day) => (
          <div className="day-tab skeleton-tab" key={day}>
            <i className="skeleton-block skeleton-day-label" />
            <i className="skeleton-block skeleton-tab-title" />
          </div>
        ))}
      </div>

      <section className="day-panel skeleton-day" aria-hidden="true">
        <div className="day-panel-heading">
          <div>
            <p className="eyebrow"><i className="skeleton-block skeleton-kicker" /></p>
            <h2 className="skeleton-day-title"><i className="skeleton-block" /></h2>
          </div>
        </div>
        <div className="stop-list">
          {[0, 1, 2].map((stop) => (
            <article className="stop-card" key={stop}>
              <div className="stop-index skeleton-block skeleton-index" />
              <div className="stop-main">
                <div className="stop-title-row">
                  <div className="stop-heading">
                    <div className="stop-labels">
                      <i className="skeleton-block skeleton-category" />
                      <i className="skeleton-block skeleton-meta" />
                    </div>
                    <h3 className="skeleton-stop-title"><i className="skeleton-block skeleton-name" /></h3>
                    <div className="skeleton-preview">
                      <i className="skeleton-block" />
                      {stop !== 1 && <i className="skeleton-block skeleton-preview-short" />}
                    </div>
                  </div>
                  <div className="skeleton-controls">
                    <i className="skeleton-block" />
                    <i className="skeleton-block" />
                    <i className="skeleton-block" />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
