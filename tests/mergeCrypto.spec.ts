import { mergeDeep, mergeCryptoByKey } from '../src/lib/objects';
import { CryptoPrice } from '../src/types';

describe('mergeCryptoByKey', () => {
  it('replaces entries by provider-id key, not by index', () => {
    const target = [
      { id: 'bitcoin', provider: 'coingecko', rates: { btc: 1 } },
      { id: 'stale', provider: 'livecoinwatch', rates: { btc: 9 } },
    ];
    const source = [
      { id: 'bstock-tslab', provider: 'coingecko', rates: { btc: 0.005 } },
      { id: 'bitcoin', provider: 'coingecko', rates: { btc: 1.0001 } },
    ];
    const merged = mergeCryptoByKey(target, source);
    expect(merged).toHaveLength(2);
    expect(merged.find((e) => e.id === 'bitcoin')!.rates.btc).toBe(1.0001);
    expect(merged.find((e) => e.id === 'stale')).toBeUndefined(); // stale tails dropped
  });
});

/**
 * Regression coverage for the pre-existing positional-merge bug in
 * `mergeDeep`, which `apiServices.ts` used to use for the crypto array too.
 *
 * `processed` in `zelcoreRatesV2.getAll()` is built by concatenating four
 * independent provider blocks (coingecko, cryptocompare, livecoinwatch, and
 * now bstocks), each wrapped in its own try/catch. If any block throws or an
 * upstream API returns a different number of rows than last cycle -- both
 * routine, expected occurrences, not edge cases -- the total array length and
 * the identity of "whatever happens to be at index N" shift between refresh
 * cycles. `mergeDeep` merges purely by array index, so:
 *
 *  1. "Frankenstein" records: entry N from the OLD cycle gets deep-merged
 *     with entry N from the NEW cycle. Fields present on both are correctly
 *     overwritten (id, provider, rates), but fields present only on the OLD
 *     entry's shape (e.g. `rank`/`change7d`, which CoinGecko sends but
 *     CryptoCompare does not) survive untouched -- a CryptoCompare coin ends
 *     up wearing a stale CoinGecko coin's rank.
 *  2. Stale tails: when the NEW array is shorter than the OLD one,
 *     `mergeDeep`'s `source.forEach` never visits the trailing OLD indices,
 *     so those entries -- which the new fetch no longer produced at all --
 *     persist in the output forever with frozen, increasingly stale data.
 */
describe('positional-merge bug (apiServices.ts crypto merge)', () => {
  // Cycle 1 result: three coingecko-shaped entries (has `rank`/`change7d`).
  const target: CryptoPrice[] = [
    {
      id: 'bitcoin', provider: 'coingecko', rates: { btc: 1, usd: 65000 }, supply: 1, volume: 1, change24h: 1, market: 1, rank: 1, total_supply: 21000000, change7d: 1,
    },
    {
      id: 'ethereum', provider: 'coingecko', rates: { btc: 0.05, usd: 3200 }, supply: 1, volume: 1, change24h: 1, market: 1, rank: 2, total_supply: 1, change7d: 1,
    },
    {
      id: 'litecoin', provider: 'coingecko', rates: { btc: 0.002, usd: 130 }, supply: 1, volume: 1, change24h: 1, market: 1, rank: 3, total_supply: 1, change7d: 1,
    },
  ];
  // Cycle 2: CoinGecko's block threw this cycle (ethereum/litecoin absent
  // entirely), leaving only a single CryptoCompare-shaped entry (no
  // `rank`/`change7d`) landing at index 0.
  const source: CryptoPrice[] = [
    {
      id: 'CONI', provider: 'cryptocompare', rates: { btc: 0.00001, usd: 0.5 }, supply: 1, volume: 1, change24h: 1, market: 1, total_supply: 1,
    },
  ];

  it('mergeDeep (pre-existing, still used for fiat/rates/marketsUSD) corrupts: frankenstein fields + stale tail survive', () => {
    const merged = mergeDeep(JSON.parse(JSON.stringify(target)), source) as CryptoPrice[];
    const slot0 = merged.find((e) => e.provider === 'cryptocompare');
    // WRONG: CONI has no rank of its own -- this is bitcoin's stale rank,
    // left over because CryptoCompare's shape doesn't carry a `rank` key for
    // mergeDeep to overwrite it with.
    expect(slot0?.id).toBe('CONI');
    expect(slot0?.rank).toBe(1);
    // WRONG: ethereum/litecoin were not part of this cycle's fetch at all,
    // but the stale tail (indices 1, 2) was never touched by the positional
    // merge, so they survive in the output indefinitely.
    expect(merged).toHaveLength(3);
    expect(merged.find((e) => e.id === 'litecoin')).toBeDefined();
  });

  it('mergeCryptoByKey (fixed) replaces wholesale: no stale fields, no stale tail', () => {
    const merged = mergeCryptoByKey(JSON.parse(JSON.stringify(target)), source);
    expect(merged).toHaveLength(1);
    const [only] = merged;
    expect(only.id).toBe('CONI');
    expect(only.rank).toBeUndefined(); // no bitcoin leftover
    expect(merged.find((e: CryptoPrice) => e.id === 'litecoin')).toBeUndefined(); // dropped, not frozen
  });
});

/**
 * For the common case the merge runs under every 30s -- a fresh cycle with
 * the same providers succeeding, same ids, same order, same shapes -- the
 * key-based merge must produce output identical to the old positional one so
 * existing consumers see no behavioural change.
 */
describe('mergeCryptoByKey vs mergeDeep -- identical for well-ordered input', () => {
  it('produces the same array for a normal, non-corrupting refresh', () => {
    const target: CryptoPrice[] = [
      {
        id: 'bitcoin', provider: 'coingecko', rates: { btc: 1, usd: 64000 }, supply: 1, volume: 1, change24h: 1, market: 1, rank: 1, total_supply: 21000000, change7d: 1,
      },
      {
        id: 'ethereum', provider: 'coingecko', rates: { btc: 0.05, usd: 3100 }, supply: 1, volume: 1, change24h: 1, market: 1, rank: 2, total_supply: 1, change7d: 1,
      },
    ];
    const source: CryptoPrice[] = [
      {
        id: 'bitcoin', provider: 'coingecko', rates: { btc: 1, usd: 65000 }, supply: 1, volume: 1, change24h: 1.2, market: 1, rank: 1, total_supply: 21000000, change7d: 1.2,
      },
      {
        id: 'ethereum', provider: 'coingecko', rates: { btc: 0.05, usd: 3200 }, supply: 1, volume: 1, change24h: 1.2, market: 1, rank: 2, total_supply: 1, change7d: 1.2,
      },
    ];
    const viaMergeDeep = mergeDeep(JSON.parse(JSON.stringify(target)), source);
    const viaKeyMerge = mergeCryptoByKey(JSON.parse(JSON.stringify(target)), source);
    expect(viaKeyMerge).toEqual(viaMergeDeep);
  });
});
