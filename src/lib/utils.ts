/**
 * Splits an array into chunks of a specified size.
 *
 * @param arr - The array to split.
 * @param size - The maximum size of each chunk.
 * @returns An array of arrays, where each subarray has at most `size` elements.
 *
 * @example
 * ```typescript
 * const array = ['a', 'b', 'c', 'd', 'e'];
 * const chunks = arraySplit(array, 2);
 * // chunks: [['a', 'b'], ['c', 'd'], ['e']]
 * ```
 */
export function arraySplit(arr: string[], size: number): string[][] {
  const result: string[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

/**
 * Combines elements of a string array into comma-separated strings, ensuring that each combined string does not exceed a specified maximum length.
 *
 * This function iterates over the input `elements` and concatenates them with commas.
 * If adding another element would exceed the `maxLength`, it pushes the current string to the result array and starts a new one.
 *
 * @param elements - The array of strings to combine.
 * @param maxLength - The maximum length of each combined string.
 * @returns An array of combined strings.
 *
 * @example
 * ```typescript
 * const elements = ['apple', 'banana', 'cherry', 'date', 'fig'];
 * const maxLength = 15;
 * const result = makeRequestStrings(elements, maxLength);
 * // result: ['apple,banana', 'cherry,date', 'fig']
 * ```
 */
export function makeRequestStrings(elements: string[], maxLength: number): string[] {
  const result: string[] = [];
  let temp = '';
  elements.forEach((element) => {
    if ((`${temp + element},`).length >= maxLength) {
      result.push(temp.replace(/,\s*$/, '')); // remove last comma
      temp = `${element},`;
    } else if (element === elements[elements.length - 1]) {
      temp += element;
      result.push(temp.replace(/,\s*$/, ''));
    } else {
      temp += `${element},`;
    }
  });
  return result;
}