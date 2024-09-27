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
