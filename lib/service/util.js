var _defaults = require('lodash.defaults');
var LatLon = require('geodesy').LatLonSpherical;
var polyline = require('code42day-google-polyline');

module.exports = {
  concat: concat,
  decode: decode,
  indexAt: indexAt,
  isFuture: isFuture,
  join: join,
  last: last,
  metersInKm: 1000,
  metersInMile: 1609.34,
  split2object: split2object,
  splitPoints: splitPoints
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

function indexAt(path, distance) {
  var index = 1, p1 = new LatLon(path[0][1], path[0][0]), d = 0, p2;
  while (index < path.length) {
    p2 = new LatLon(path[index][1], path[index][0]);
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
  var i, segments;
  if (!(query.points && query.points.length > 1)) {
    return ;
  }
  if (query.points.length <= maxPoints) {
    return query;
  }
  segments = [];
  for (i = 0; i < query.points.length - 1; i += maxPoints - 1) {
    segments.push(_defaults({
      points: query.points.slice(i, i + maxPoints)
    }, query));
  }
  if (last(segments).points.length === 1) {
    last(segments).points.unshift(segments[segments.length - 2].points.pop());
  }
  return segments;
}
