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
