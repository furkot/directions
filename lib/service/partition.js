const util = require('./util');

module.exports = partition;

function distanceSquare(p1, p2) {
  return Math.pow((p1[0] - p2[0]), 2) + Math.pow((p1[1] - p2[1]), 2);
}

function pointOnLine(point, p1, p2) {
  const d = distanceSquare(p1, p2);
  let t;
  let pol;
  if (!d) {
    pol = p1;
  } else {
    t = ((point[0] - p1[0]) * (p2[0] - p1[0]) + (point[1] - p1[1]) * (p2[1] - p1[1])) / d;
    if (t < 0) {
      pol = p1;
    } else if (t > 1) {
      pol = p2;
    } else {
      pol = [p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])];
    }
  }
  return pol;
}

function minDistance(res, p, i, path) {
  let dist = distanceSquare(res.point, p);
  if (dist < res.dist || (dist < res.minDistance && res.pol)) {
    res.dist = dist;
    res.idx = i;
    res.p = p;
    res.pol = undefined;
  }
  if (i > 0) {
    p = pointOnLine(res.point, path[i - 1], p);
    dist = distanceSquare(res.point, p);
    if (dist < res.dist && (res.dist >= res.minDistance || res.pol)) {
      res.dist = dist;
      res.idx = i - 1;
      res.p = p;
      res.pol = true;
    }
  }
  return res;
}

function findPointOnPath(point, path) {
  let result;
  if (point && path) {
    result = path.reduce(minDistance, {
      dist: Number.MAX_VALUE,
      point,
      minDistance: 0.5
    });
    if (result.idx !== undefined) {
      return result;
    }
  }
}

function cut(prev, next) {
  const segments = prev.path.segments;
  const point = findPointOnPath(segments[next.segmentIndex].path[0], prev.path);
  if (point) {
    next.path = prev.path.slice(point.idx + 1);
    prev.path = prev.path.slice(0, point.idx + 1);
    next.path.segments = segments;
  }
}

// divide path into routes
function partition(path, routes, segments) {
  path.segments = segments;
  routes[0].path = path;
  routes.reduce(cut);
  delete util.last(routes).path.segments;
}
