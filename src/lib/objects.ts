export function mergeDeep(target: any, source: any) {
  if (source && typeof source === 'object') {
    Object.keys(source).forEach((key) => {
      if (source[key] && typeof source[key] === 'object') {
        if (!target[key]) target[key] = {}; // Ensure the target key exists
        mergeDeep(target[key], source[key]); // Recurse into deeper objects
      } else {
        target[key] = source[key]; // Directly set the value if it's not an object
      }
    });
  }
}
