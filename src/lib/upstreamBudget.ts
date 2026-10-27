import TokenBucket from './tokenBucket';

/**
 * Admission control for one upstream provider: token buckets, a cap on
 * concurrent calls and a cooldown after the upstream answered 429.
 *
 * `admit()` is all-or-nothing and never queues: it either takes one token
 * from every bucket plus a concurrency slot, or takes nothing and says how
 * long to wait. Callers turn that wait into a 429 + `Retry-After`.
 */
export class UpstreamBudget {
  private active = 0;

  private cooldownUntilMs = 0;

  constructor(private readonly buckets: TokenBucket[], private readonly maxConcurrent: number) {}

  /**
   * Admits one upstream call.
   *
   * @returns 0 when admitted (the caller must `release()` once the call
   * settles), otherwise the whole seconds to wait (at least 1).
   */
  admit(): number {
    const cooldownMs = this.cooldownUntilMs - Date.now();
    if (cooldownMs > 0) return Math.ceil(cooldownMs / 1000);
    if (this.active >= this.maxConcurrent) return 1;
    const waitMs = Math.max(0, ...this.buckets.map((bucket) => bucket.waitMs(1)));
    if (waitMs > 0) return Math.max(1, Math.ceil(waitMs / 1000));
    this.buckets.forEach((bucket) => bucket.take(1));
    this.active += 1;
    return 0;
  }

  /** Frees the concurrency slot of an admitted call. */
  release(): void {
    this.active = Math.max(0, this.active - 1);
  }

  /** Refuses every call for `ms` from now (an earlier end never shortens a running cooldown). */
  coolDown(ms: number): void {
    this.cooldownUntilMs = Math.max(this.cooldownUntilMs, Date.now() + ms);
  }
}

export default UpstreamBudget;
