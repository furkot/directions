var algorithm = require("code42day-vis-why");
var pathType = require("../model").pathType;
var util = require('./util');

module.exports = simplify;

var endPoints = 25; // how many points keep at ends
var maxPoints = 100; // maximum number of points kept per path

function simplify(type, endDistance, routes, segments) {
  if (type === pathType.none) {
    return;
  }
  endDistance = endDistance || 2000;
  routes.reduceRight(function (result, route) {
    var i, first = [], last = [], path = [], type = result.type, segments = result.segments, seg;
    last.distance = 0;
    for (i = result.segmentIndex - 1; i >= route.segmentIndex; i -= 1) {
      seg = segments[i];
      last.distance += seg.distance;
      result.segmentIndex -= 1;
      if (last.distance >= endDistance) {
        last.split = util.indexAt(seg.path, last.distance - endDistance);
        Array.prototype.unshift.apply(last, seg.path.slice(last.split));
        break;
      }
      Array.prototype.unshift.apply(last, seg.path);
    }
    first.distance = 0;
    for (i = route.segmentIndex; i < result.segmentIndex; i += 1) {
      seg = segments[i];
      first.distance += seg.distance;
      if (first.distance >= endDistance) {
        first.split = util.indexAt(seg.path, endDistance - first.distance + seg.distance);
        util.concat(first, seg.path.slice(0, first.split));
        break;
      }
      util.concat(first, seg.path);
    }
    if (first.split) {
      util.concat(path, segments[i].path.slice(first.split,
          (i === result.segmentIndex - 1 && last.split) ? last.split : undefined));
      i += 1;
    }
    for(; i < result.segmentIndex; i += 1) {
      util.concat(path, segments[i].path);
    }
    if (last.split) {
      util.concat(path, segments[i].path.slice(0, last.split));      
    }
    result.segmentIndex = route.segmentIndex;
    if (type === pathType.full || (first.length + path.length + last.length) <= maxPoints) {
      route.path = util.concat(util.concat(first, path), last);
    }
    else {
      first = algorithm(first, endPoints);
      last = algorithm(last, endPoints);
      route.path = util.concat(util.concat(first, algorithm(path, maxPoints - first.length - last.length)), last);
    }
    return result;
  }, {
   type: type,
   segments: segments,
   segmentIndex: segments.length
  });
}
