import polyline from '@pirxpilot/google-polyline';
import LatLon from 'geodesy/latlon-spherical.js';

export const metersInKm = 1000;
export const metersInMile = 1609.34;

export function concat(result, path) {
  if (path) {
    Array.prototype.push.apply(result, path);
  }
  return result;
}

export function decode(poly, factor) {
  return poly && polyline.decode(poly, factor);
}

export function defaults(obj, source) {
  return Object.assign({}, source, obj);
}

function toLatLon(p) {
  return new LatLon(p[1], p[0]);
}

export function distance(p1, p2) {
  return toLatLon(p1).distanceTo(toLatLon(p2));
}

export function indexAt(path, distance) {
  let index = 1;
  let p1 = toLatLon(path[0]);
  let d = 0;
  while (index < path.length) {
    const p2 = toLatLon(path[index]);
    d += p1.distanceTo(p2);
    if (d > distance) {
      break;
    }
    p1 = p2;
    index += 1;
  }
  return index;
}

export function isFuture(time) {
  time = time && Date.parse(time);
  return time && time >= Date.now();
}

// like normal join but with optional filter fn
export function join(arr, conn, fn) {
  fn = fn || (it => it);
  return arr.filter(fn).join(conn);
}

export function last(arr) {
  return arr[arr.length - 1];
}

export function split2object(str, conn, obj) {
  return str.split(conn || '-').reduce((result, word) => {
    result[word] = word;
    return result;
  }, obj || {});
}

export function collateResults(results, query) {
  return results.reduce(
    (result, r) => {
      concatArrayProp(result, r, 'segments');
      concatArrayProp(result, r, 'places');
      concatArrayProp(result, r, 'routes');
      if (!result.name && r?.name) {
        result.name = r.name;
      }
      return result;
    },
    {
      query
    }
  );

  function concatArrayProp(to, from, prop) {
    if (!from[prop]) {
      return;
    }
    if (!to[prop]) {
      to[prop] = from[prop];
    } else {
      to[prop].push(...from[prop]);
    }
  }
}

export function withTimeout(promise, millis, signal) {
  let id;
  let resolve;
  let reject;

  signal?.addEventListener('abort', onabort);
  return Promise.race([promise, new Promise(timeoutPromise)]).finally(() => {
    signal?.removeEventListener('abort', onabort);
    clearTimeout(id);
  });

  function onabort() {
    reject(signal.reason);
  }

  function timeoutPromise(_resolve, _reject) {
    resolve = _resolve;
    reject = _reject;
    id = setTimeout(() => resolve(), millis);
  }
}

export function timeout(millis = 0) {
  return new Promise(resolve => setTimeout(resolve, millis));
}
