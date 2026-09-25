export interface RateLimiter {
  check(key: string): Promise<boolean>;
}

export class InMemoryRateLimiter implements RateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly limit = 10,
    private readonly windowMs = 60_000,
  ) {}

  async check(key: string) {
    const now = Date.now();
    const timestamps = (this.hits.get(key) ?? []).filter((time) => now - time < this.windowMs);

    if (timestamps.length >= this.limit) {
      this.hits.set(key, timestamps);
      return false;
    }

    timestamps.push(now);
    this.hits.set(key, timestamps);

    // Keep stale keys from accumulating on a long-lived local/serverless instance.
    if (this.hits.size > 1_000) {
      for (const [storedKey, storedHits] of this.hits) {
        if (storedHits.every((time) => now - time >= this.windowMs)) {
          this.hits.delete(storedKey);
        }
      }
    }

    return true;
  }
}
