/**
 * Token bucket on wall-clock time. `waitMs(n)` says how long until `n`
 * tokens are available; callers check every bucket before taking from any,
 * so a refused request never spends budget.
 */
export class TokenBucket {
  private tokens: number;

  private updatedMs: number;

  constructor(private readonly capacity: number, private readonly refillPerMs: number) {
    this.tokens = capacity;
    this.updatedMs = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    this.tokens = Math.min(this.capacity, this.tokens + Math.max(0, now - this.updatedMs) * this.refillPerMs);
    this.updatedMs = now;
  }

  waitMs(n: number): number {
    this.refill();
    const short = n - this.tokens;
    return short <= 1e-9 ? 0 : Math.ceil(short / this.refillPerMs);
  }

  take(n: number): void {
    this.tokens -= n;
  }
}

export default TokenBucket;
