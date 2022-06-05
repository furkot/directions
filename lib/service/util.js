const LatLon = require('geodesy/latlon-spherical');
const polyline = require('@pirxpilot/google-polyline');

module.exports = {
  concat,
  decode,
  defaults,
  distance,
  indexAt,
  isFuture,
  join,
  last,
  metersInKm: 1000,
  metersInMile: 1609.34,
  split2object,
  splitPoints
};

function concat(result, path) {
  if (path) {
    Array.prototype.push.apply(result, path);
  }
  return result;
}

function decode(poly, factor) {
  return poly && polyline.decode(poly, factor);
}

function defaults(obj, source) {
  return Object.assign({}, source, obj);
}

function toLatLon(p) {
  return new LatLon(p[1], p[0]);
}

function distance(p1, p2) {
  return toLatLon(p1).distanceTo(toLatLon(p2));
}

function indexAt(path, distance) {
  let index = 1;
  let p1 = toLatLon(path[0]);
  let d = 0;
  let p2;
  while (index < path.length) {
    p2 = toLatLon(path[index]);
    d += p1.distanceTo(p2);
    if (d > distance) {
      break;
    }
    p1 = p2;
    index += 1;
  }
  return index;
}

function isFuture(time) {
  time = time && Date.parse(time);
  return time && time >= Date.now();
}

// like normal join but with optional filter fn
function join(arr, conn, fn) {
    fn = fn || function(it) { return it; };
    return arr.filter(fn).join(conn);
}

function last(arr) {
  return arr[arr.length - 1];
}

function split2object(str, conn, obj) {
  return str.split(conn || '-').reduce(function (result, word) {
    result[word] = word;
    return result;
  }, obj || {});
}

function splitPoints(query, maxPoints) {
  let i;
  let segments;
  if (!(query.points && query.points.length > 1)) {
    return ;
  }
  if (query.points.length <= maxPoints) {
    return query;
  }
  segments = [];
  for (i = 0; i < query.points.length - 1; i += maxPoints - 1) {
    segments.push(defaults({
      points: query.points.slice(i, i + maxPoints),
      stats: []
    }, query));
  }
  if (last(segments).points.length === 1) {
    last(segments).points.unshift(segments[segments.length - 2].points.pop());
  }
  return segments;
}
