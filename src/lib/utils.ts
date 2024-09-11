export function arraySplit(arr: string[], size: number): string[][] {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

/**
 * Function that combines with commas the elements of a string array till some max length and returns the new array of strings
 * @param {string[]} elements
 * @param {number} maxLength
 * @returns string[]
 */
export function makeRequestStrings(elements: string[], maxLength: number): string[] {
  const result: string[] = [];
  let temp = '';
  elements.forEach((element) => {
    if ((`${temp + element},`).length >= maxLength) {
      result.push(temp.replace(/,\s*$/, '')); // remove last ,
      temp = `${element},`;
    } else if (element === elements[elements.length - 1]) {
      result.push(temp + element);
    } else {
      temp = `${temp + element},`;
    }
  });
  return result;
}