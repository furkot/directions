const pathType = require("../model").pathType;
const util = require('./util');

module.exports = init;

function init(options) {
  options = options || {};

  const algorithm = options.algorithm || require("vis-why");
  const endPoints = options.endPoints || 25; // how many points keep at ends
  const maxPoints = options.pathPoints || 100; // maximum number of points kept per path
  const ed = maxPoints / endPoints;

  function simplifyRoute(result, route) {
    let i;
    let seg;
    let first = [];
    let last = [];
    const path = [];
    const type = result.type;
    const segments = result.segments;
    let endDistance = result.endDistance;

    if (endDistance > route.distance / ed) {
      endDistance = 0;
    }
    last.distance = 0;
    if (endDistance) {
      for (i = result.segmentIndex - 1; i >= route.segmentIndex; i -= 1) {
        seg = segments[i];
        last.distance += seg.distance;
        if (last.distance >= endDistance) {
          last.split = util.indexAt(seg.path, last.distance - endDistance);
          Array.prototype.unshift.apply(last, seg.path.slice(last.split));
          break;
        }
        result.segmentIndex -= 1;
        Array.prototype.unshift.apply(last, seg.path);
      }
    }
    first.distance = 0;
    i = route.segmentIndex;
    if (endDistance) {
      for (; i < result.segmentIndex; i += 1) {
        seg = segments[i];
        first.distance += seg.distance;
        if (first.distance >= endDistance) {
          first.split = util.indexAt(seg.path, endDistance - first.distance + seg.distance);
          util.concat(first, seg.path.slice(0, first.split));
          break;
        }
        util.concat(first, seg.path);
      }
    }
    if (first.split) {
      util.concat(path, segments[i].path.slice(first.split,
          (i === result.segmentIndex - 1 && last.split) ? last.split : undefined));
      i += 1;
    }
    for(; i < (last.split ? result.segmentIndex - 1 : result.segmentIndex); i += 1) {
      util.concat(path, segments[i].path);
    }
    if (last.split && i < result.segmentIndex) {
      util.concat(path, segments[i].path.slice(0, last.split));
    }
    result.segmentIndex = route.segmentIndex;
    if (type === pathType.full || (first.length + path.length + last.length) <= maxPoints) {
      if (endDistance) {
        route.path = util.concat(util.concat(first, path), last);
      }
      else {
        route.path = path;
      }
    }
    else if (endDistance) {
      first = algorithm(first, endPoints);
      last = algorithm(last, endPoints);
      route.path = util.concat(util.concat(first, algorithm(path, maxPoints - first.length - last.length)), last);
    }
    else {
      route.path = algorithm(path, maxPoints);
    }
    return result;
  }

  function simplify(type, endDistance, routes, segments) {
    if (type === pathType.none) {
      return;
    }
    routes.reduceRight(simplifyRoute, {
     type,
     segments,
     segmentIndex: segments.length,
     endDistance: endDistance || 2000
    });
  }

  return simplify;
}
