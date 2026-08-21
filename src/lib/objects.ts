/**
 * Deeply merges two objects or arrays.
 *
 * This function takes a target and a source and recursively merges properties.
 * - For arrays, it merges each item recursively.
 * - For objects, it merges each key recursively.
 *
 * @param target - The target object or array to merge into.
 * @param source - The source object or array to merge from.
 * @returns The merged object or array.
 *
 * @example
 * ```typescript
 * const obj1 = { a: 1, b: { c: 2 } };
 * const obj2 = { b: { d: 3 }, e: 4 };
 * const result = mergeDeep(obj1, obj2);
 * // result: { a: 1, b: { c: 2, d: 3 }, e: 4 }
 * ```
 */
// mergeDeep merges INTO `target` and returns it -- mutating the argument is
// the documented contract callers rely on, not an oversight.
/* eslint-disable no-param-reassign */
export function mergeDeep(target: any, source: any) {
  if (Array.isArray(source)) {
    if (!Array.isArray(target)) {
      target = [];
    }
    source.forEach((item, index) => {
      if (typeof item === 'object') {
        target[index] = mergeDeep(target[index], item);
      } else {
        target[index] = item;
      }
    });
  } else if (source && typeof source === 'object') {
    if (!target || typeof target !== 'object' || Array.isArray(target)) {
      target = {};
    }
    Object.keys(source).forEach((key) => {
      if (typeof source[key] === 'object') {
        target[key] = mergeDeep(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    });
  } else {
    target = source;
  }
  return target;
}
/* eslint-enable no-param-reassign */

/**
 * Rebuilds the crypto array from `source` alone, de-duplicated by
 * `${provider}-${id}`, preserving source order with last-write-wins.
 *
 * This deliberately does NOT merge with the previous array — hence the name.
 * The positional `mergeDeep` it replaced overlaid the new array onto the old
 * one index by index, which is only correct while every provider block returns
 * exactly the same number of rows in the same order. When a block shrank (a
 * provider outage, a delisted coin), two things went wrong: fields from the
 * old entry at that index survived onto a different coin — a CryptoCompare row
 * inheriting CoinGecko's `rank` and `change7d` — and entries past the new
 * length lived on as stale duplicates. Because the ZelCore client re-keys on
 * `${provider}-${id}` with last-write-wins, and the stale duplicates sat after
 * the fresh ones, wallet users were served the STALE price on any cycle where
 * a block's row count shifted.
 *
 * Two behaviour changes a caller should know about:
 *  - entries repeating the same `provider`+`id` collapse to one, keeping the
 *    last value at the first occurrence's position;
 *  - an entry the fetch no longer produces disappears immediately, rather than
 *    persisting from the previous cycle.
 *
 * @param source - The freshly fetched entries.
 * @returns The de-duplicated entries, in source order.
 */
export function replaceCryptoByKey<T extends { id: string; provider: string }>(
  source: T[],
): T[] {
  const byKey = new Map<string, T>();
  for (const entry of source) byKey.set(`${entry.provider}-${entry.id}`, entry);
  return Array.from(byKey.values());
}
